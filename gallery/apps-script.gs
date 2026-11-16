/**
 * Backend album foto & video — Google Apps Script (Code.gs).
 *
 * Cara pasang:
 * 1. Buka project Apps Script yang dipakai SCRIPT_URL di gallery/index.html.
 * 2. Ganti seluruh isi Code.gs dengan file ini, lalu isi FOLDER_ID.
 * 3. Deploy > Manage deployments > (edit deployment lama) > Version: New version > Deploy.
 *    Execute as: Me, Who has access: Anyone. URL /exec tetap sama.
 * 4. Izinkan akses baru saat diminta (Drive + "connect to an external service").
 *
 * Upload memakai resumable upload Google Drive per potongan, jadi tidak ada batas ukuran file.
 * Nama pengirim disimpan di deskripsi file Drive.
 */

var FOLDER_ID = '16hW-Yrn6zkAphxP1Jw9xASkYqzq21C4b';
var UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';
var MEDIA_TYPE = /^(image|video)\/[\w.+-]+$/;

function doGet() {
  try {
    var files = DriveApp.getFolderById(FOLDER_ID).getFiles(), items = [];
    while (files.hasNext()) {
      var f = files.next(), type = f.getMimeType();
      if (!/^(image|video)\//.test(type)) continue;
      items.push(toItem(f));
    }
    items.sort(function (a, b) { return b.time - a.time; });
    return json({ ok: true, items: items });
  } catch (err) {
    return json({ ok: false, error: 'Album tidak bisa dimuat: ' + (err.message || err) });
  }
}

function doPost(e) {
  try {
    var p = JSON.parse(e.postData.contents);
    if (p.website) return json({ ok: false, error: 'Ditolak.' }); // honeypot anti-bot
    if (p.action === 'start') return json(startUpload(p));
    if (p.action === 'chunk') return json(sendChunk(p));
    if (p.action === 'finish') return json(finishUpload(p));
    return json({ ok: false, error: 'Aksi tidak dikenal.' });
  } catch (err) {
    return json({ ok: false, error: String(err.message || err) });
  }
}

/** Buat sesi resumable upload di folder album, kembalikan URL upload-nya. */
function startUpload(p) {
  var type = String(p.type || '').toLowerCase();
  var size = Number(p.size);
  if (!MEDIA_TYPE.test(type)) throw new Error('Hanya foto atau video yang bisa dikirim.');
  if (!(size > 0) || size % 1) throw new Error('Ukuran file tidak valid.');

  var name = String(p.name || 'file').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 150);
  var by = String(p.by || '').trim().slice(0, 40);
  var headers = {
    Authorization: 'Bearer ' + ScriptApp.getOAuthToken(),
    'X-Upload-Content-Type': type,
    'X-Upload-Content-Length': String(size)
  };
  // Mengikat sesi ke origin situs supaya browser boleh mengunggah langsung ke Drive.
  var origin = String(p.origin || '');
  if (/^https?:\/\/[^\/\s]+$/.test(origin)) headers.Origin = origin;

  var res = UrlFetchApp.fetch(UPLOAD_API + '?uploadType=resumable&fields=id&supportsAllDrives=true', {
    method: 'post',
    contentType: 'application/json; charset=UTF-8',
    headers: headers,
    payload: JSON.stringify({ name: name, mimeType: type, parents: [FOLDER_ID], description: by }),
    muteHttpExceptions: true
  });
  var location = header(res, 'location');
  if (res.getResponseCode() !== 200 || !location) {
    throw new Error('Gagal memulai upload (' + res.getResponseCode() + ').');
  }
  return { ok: true, uploadUrl: location };
}

/**
 * Cadangan bila browser tidak bisa mengunggah langsung: teruskan satu potongan
 * (base64) ke sesi upload. Tanpa data = tanyakan posisi terakhir yang tersimpan.
 */
function sendChunk(p) {
  var url = String(p.url || '');
  if (url.indexOf(UPLOAD_API + '?') !== 0 || !/[?&]upload_id=/.test(url)) throw new Error('URL upload tidak valid.');
  var total = Number(p.total), start = Number(p.start);
  var opts = { method: 'put', muteHttpExceptions: true, followRedirects: false, headers: {} };
  if (p.data) {
    var data = Utilities.base64Decode(p.data);
    opts.payload = data;
    opts.contentType = 'application/octet-stream';
    opts.headers['Content-Range'] = 'bytes ' + start + '-' + (start + data.length - 1) + '/' + total;
  } else {
    opts.headers['Content-Range'] = 'bytes */' + total;
  }
  var res = UrlFetchApp.fetch(url, opts), code = res.getResponseCode();
  if (code === 200 || code === 201) return { ok: true, id: JSON.parse(res.getContentText()).id };
  if (code === 308) {
    var m = /-(\d+)$/.exec(header(res, 'range') || '');
    return { ok: true, next: m ? Number(m[1]) + 1 : 0 };
  }
  throw new Error('Upload ditolak Google Drive (' + code + ').');
}

/** Setelah upload selesai: pastikan file ada di album, buka akses lihat via link. */
function finishUpload(p) {
  var file = DriveApp.getFileById(String(p.id || ''));
  var parents = file.getParents(), inAlbum = false;
  while (parents.hasNext()) if (parents.next().getId() === FOLDER_ID) inAlbum = true;
  if (!inAlbum) throw new Error('File tidak ditemukan di album.');
  if (!/^(image|video)\//.test(file.getMimeType())) {
    file.setTrashed(true);
    throw new Error('Hanya foto atau video yang bisa dikirim.');
  }
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
  return { ok: true, item: toItem(file) };
}

function toItem(f) {
  return { id: f.getId(), by: f.getDescription() || '', time: f.getDateCreated().getTime(), type: f.getMimeType() };
}

function header(res, name) {
  var all = res.getAllHeaders();
  for (var k in all) if (k.toLowerCase() === name) return [].concat(all[k])[0];
  return '';
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
