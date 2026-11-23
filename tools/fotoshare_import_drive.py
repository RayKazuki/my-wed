#!/usr/bin/env python3
"""
Ambil semua foto & video dari folder Google Drive yang dibagikan publik ("siapa saja
yang memiliki link"), lalu (opsional) kirim ke album gallery/index.html
(Google Drive lewat Apps Script yang sama dengan SCRIPT_URL). Subfolder ikut diambil.

Hanya pakai library bawaan Python 3.8+.

  # 1) lihat isi folder saja
  python3 tools/fotoshare_import_drive.py --list

  # 2) unduh semua file ukuran asli ke ./drive_import (yang sudah ada dilewati)
  python3 tools/fotoshare_import_drive.py

  # 3) unduh + unggah ke album gallery (yang sudah terunggah dilewati, aman diulang)
  python3 tools/fotoshare_import_drive.py --upload

Opsi lain: --folder URL/ID, --only image|video, --limit N, --out DIR, --by "Nama", --workers N
"""
import argparse
import html as htmllib
import json
import mimetypes
import os
import re
import signal
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

FOLDER_URL = 'https://drive.google.com/drive/folders/1eJz-mF2q5_OENykREfsC8CIsqWrr1yB-'
# Sama dengan SCRIPT_URL di gallery/index.html
SCRIPT_URL = ('https://script.google.com/macros/s/'
              'AKfycbwrstZD3DiAFecCgFv982mvW236IV2yHUVT1MUY9mIwEuDF06MloZi5ha2FQoRrLtN7/exec')
UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36'
MANIFEST = 'uploaded.json'  # id file Drive sumber -> id file di album, supaya tidak dobel unggah
IMAGE_EXT = {'jpg', 'jpeg', 'png', 'heic', 'heif', 'webp', 'gif'}
VIDEO_EXT = {'mp4', 'mov', 'm4v', 'webm', '3gp', 'avi', 'mkv'}


def http(url, data=None, method=None, headers=None, timeout=120):
    req = urllib.request.Request(url, data=data, method=method, headers={'User-Agent': UA, **(headers or {})})
    return urllib.request.urlopen(req, timeout=timeout)


def retry(fn, tries=4, what=''):
    for n in range(tries):
        try:
            return fn()
        except Exception as e:  # jaringan putus, 5xx, dsb.
            if n == tries - 1:
                raise
            wait = 2 ** n * 2
            print(f'  ! {what}: {e} — coba lagi dalam {wait}s', file=sys.stderr)
            time.sleep(wait)


def kind(name):
    ext = name.rsplit('.', 1)[-1].lower() if '.' in name else ''
    return 'image' if ext in IMAGE_EXT else 'video' if ext in VIDEO_EXT else ''


# ---------------------------------------------------------------- folder Drive sumber

def folder_id(url_or_id):
    m = re.search(r'/folders/([\w-]+)', url_or_id) or re.search(r'[?&]id=([\w-]+)', url_or_id)
    return m.group(1) if m else url_or_id.strip()


def list_folder(fid, path='', seen=None):
    """Daftar file lewat tampilan embed Drive (halaman folder biasa hanya memuat 50 file pertama)."""
    seen = set() if seen is None else seen
    if fid in seen:
        return '', []
    seen.add(fid)
    url = 'https://drive.google.com/embeddedfolderview?id=' + urllib.parse.quote(fid)
    page = retry(lambda: http(url).read().decode('utf-8', 'replace'), what='buka folder Drive')
    title = re.search(r'<title>([^<]*)', page)
    title = htmllib.unescape(title.group(1)).strip() if title else fid
    if 'flip-entries' not in page:
        raise SystemExit(f'Folder "{title}" tidak bisa dibaca — pastikan dibagikan ke "siapa saja yang memiliki link".')
    items = []
    for eid, href, name in re.findall(
            r'<div class="flip-entry" id="entry-([\w-]+)".*?<a href="([^"]+)".*?flip-entry-title">([^<]*)<', page, re.S):
        name = htmllib.unescape(name).strip()
        if '/folders/' in href:  # subfolder
            items += list_folder(eid, f'{path}{name}/', seen)[1]
        elif kind(name):
            items.append({'id': eid, 'name': name, 'path': path + name, 'type': kind(name)})
    items.sort(key=lambda x: x['path'].lower())  # nama kamera (DSC0xxxx) = urutan pemotretan
    return title, items


def local_name(it):
    """Nama file lokal unik: subfolder jadi awalan, id Drive dipakai bila nama bentrok."""
    return it['path'].replace('/', '__')


def download(it, out_dir):
    path = os.path.join(out_dir, it['local'])
    if os.path.exists(path):  # file hanya dipindah dari .part setelah lengkap
        return path, False
    tmp = path + '.part'
    url = ('https://drive.usercontent.google.com/download?export=download&confirm=t&id='
           + urllib.parse.quote(it['id']))

    def go():
        with http(url, timeout=600) as res, open(tmp, 'wb') as f:
            if 'text/html' in res.headers.get('Content-Type', ''):
                raise IOError('Drive membalas halaman HTML (file tidak dibagikan atau kuota unduh habis)')
            expected = int(res.headers.get('Content-Length') or 0)
            while True:
                chunk = res.read(1 << 20)
                if not chunk:
                    break
                f.write(chunk)
        if expected and os.path.getsize(tmp) != expected:
            raise IOError(f'unduhan terpotong ({os.path.getsize(tmp)} != {expected})')
        os.replace(tmp, path)

    retry(go, what=f'unduh {it["path"]}')
    return path, True


# ---------------------------------------------------------------- album gallery (Apps Script)

def api(payload):
    """POST ke Apps Script; redirect 302 ke googleusercontent diikuti urllib sebagai GET."""
    body = json.dumps(payload).encode()
    res = http(SCRIPT_URL, data=body, method='POST', headers={'Content-Type': 'text/plain;charset=utf-8'})
    text = res.read().decode('utf-8', 'replace')
    try:
        data = json.loads(text)
    except ValueError:
        raise RuntimeError('Balasan Apps Script bukan JSON: ' + text[:200])
    if not data.get('ok'):
        raise RuntimeError(data.get('error') or 'Apps Script menolak permintaan.')
    return data


def upload(path, it, by):
    size = os.path.getsize(path)
    mime = mimetypes.guess_type(it['name'].lower())[0] or ('video/mp4' if it['type'] == 'video' else 'image/jpeg')

    def go():
        start = api({'action': 'start', 'name': it['name'], 'type': mime, 'size': size, 'by': by})
        with open(path, 'rb') as f:
            data = f.read()
        res = http(start['uploadUrl'], data=data, method='PUT', timeout=900,
                   headers={'Content-Type': mime, 'Content-Length': str(size)})
        file_id = json.loads(res.read().decode())['id']
        api({'action': 'finish', 'id': file_id})
        return file_id

    return retry(go, what=f'unggah {it["path"]}')


def load_manifest(out_dir):
    try:
        with open(os.path.join(out_dir, MANIFEST)) as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def save_manifest(out_dir, manifest):
    tmp = os.path.join(out_dir, MANIFEST + '.tmp')
    with open(tmp, 'w') as f:
        json.dump(manifest, f, indent=1)
    os.replace(tmp, os.path.join(out_dir, MANIFEST))


# ---------------------------------------------------------------- main

def main():
    if hasattr(signal, 'SIGPIPE'):  # mis. `--list | head` tanpa traceback
        signal.signal(signal.SIGPIPE, signal.SIG_DFL)
    ap = argparse.ArgumentParser(description='Impor folder Google Drive publik ke gallery.')
    ap.add_argument('--folder', default=FOLDER_URL, help='URL atau ID folder Drive sumber')
    ap.add_argument('--out', default='drive_import', help='folder unduhan (default: ./drive_import)')
    ap.add_argument('--list', action='store_true', help='tampilkan daftar file saja, tanpa unduh')
    ap.add_argument('--upload', action='store_true', help='unggah ke album gallery setelah unduh')
    ap.add_argument('--by', default='Fotografer', help='nama pengirim yang tampil di album (default: Fotografer)')
    ap.add_argument('--only', choices=['image', 'video'], help='hanya foto atau hanya video')
    ap.add_argument('--limit', type=int, help='batasi jumlah file (untuk uji coba)')
    ap.add_argument('--workers', type=int, default=4, help='unduhan paralel (default: 4)')
    a = ap.parse_args()

    title, items = list_folder(folder_id(a.folder))
    if a.only:
        items = [it for it in items if it['type'] == a.only]
    if a.limit:
        items = items[:a.limit]
    names = {}
    for it in items:
        it['local'] = local_name(it)
        if it['local'].lower() in names:  # nama sama di folder yang sama
            base, dot, ext = it['local'].rpartition('.')
            it['local'] = f'{base}_{it["id"][:8]}{dot}{ext}'
        names[it['local'].lower()] = it
    n_img = sum(it['type'] == 'image' for it in items)
    print(f'{title}\n{len(items)} file: {n_img} foto, {len(items) - n_img} video')

    if a.list:
        for it in items:
            print(f'{it["type"]:>5}  {it["path"]}  https://drive.google.com/file/d/{it["id"]}/view')
        return

    os.makedirs(a.out, exist_ok=True)
    paths, failed, total = {}, [], 0
    with ThreadPoolExecutor(max(1, a.workers)) as pool:
        jobs = {pool.submit(download, it, a.out): it for it in items}
        for i, job in enumerate(as_completed(jobs), 1):
            it = jobs[job]
            try:
                path, fresh = job.result()
                paths[it['id']] = path
                total += os.path.getsize(path)
                print(f'[{i}/{len(items)}] {"unduh " if fresh else "ada   "} {it["path"]}')
            except Exception as e:
                failed.append(it['path'])
                print(f'[{i}/{len(items)}] GAGAL  {it["path"]}: {e}', file=sys.stderr)
    print(f'Unduhan selesai di {os.path.abspath(a.out)} ({len(paths)} ok, {total / 1e6:.0f} MB, {len(failed)} gagal)')

    if a.upload:
        manifest = load_manifest(a.out)
        todo = [it for it in items if it['id'] in paths and it['id'] not in manifest]
        print(f'Unggah ke album: {len(todo)} baru, {len(manifest)} sudah pernah terunggah')
        # berurutan & lama -> baru, supaya urutan "terbaru dulu" di album tetap rapi
        for i, it in enumerate(todo, 1):
            try:
                manifest[it['id']] = upload(paths[it['id']], it, a.by)
                save_manifest(a.out, manifest)
                print(f'[{i}/{len(todo)}] terunggah {it["path"]}')
            except Exception as e:
                failed.append(it['path'])
                print(f'[{i}/{len(todo)}] GAGAL unggah {it["path"]}: {e}', file=sys.stderr)

    if failed:
        print(f'\n{len(failed)} file gagal — jalankan ulang perintah yang sama untuk mencoba lagi.')
        sys.exit(1)


if __name__ == '__main__':
    main()
