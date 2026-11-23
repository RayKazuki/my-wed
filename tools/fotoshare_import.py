#!/usr/bin/env python3
"""
Ambil semua foto & video dari album fotoshare.co lalu (opsional) kirim ke album
gallery/index.html (Google Drive lewat Apps Script yang sama dengan SCRIPT_URL).

Hanya pakai library bawaan Python 3.8+.

  # 1) lihat isi album saja
  python3 tools/fotoshare_import.py --list

  # 2) unduh semua file ukuran asli ke ./fotoshare (yang sudah ada dilewati)
  python3 tools/fotoshare_import.py

  # 3) unduh + unggah ke album gallery (yang sudah terunggah dilewati, aman diulang)
  python3 tools/fotoshare_import.py --upload

Opsi lain: --only jpg|mp4, --limit N, --out DIR, --by "Nama pengirim", --workers N
"""
import argparse
import json
import mimetypes
import os
import re
import signal
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

EVENT_URL = 'https://fotoshare.co/e/s8piP5_-vRZ5fC5K4dcO3'
# Sama dengan SCRIPT_URL di gallery/index.html
SCRIPT_URL = ('https://script.google.com/macros/s/'
              'AKfycbwrstZD3DiAFecCgFv982mvW236IV2yHUVT1MUY9mIwEuDF06MloZi5ha2FQoRrLtN7/exec')
UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36'
MANIFEST = 'uploaded.json'  # hash fotoshare -> id file Drive, supaya tidak dobel unggah


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


# ---------------------------------------------------------------- fotoshare

def fetch_items(event_url):
    """Semua item album: halaman event menyimpan seluruh sesi di `let sessionImages = {...};`."""
    html = retry(lambda: http(event_url).read().decode('utf-8', 'replace'), what='buka halaman event')
    title = re.search(r'<title>([^<]*)', html)
    m = re.search(r'let\s+sessionImages\s*=\s*(\{.*?\});\s*\n', html)
    if not m:
        raise SystemExit('sessionImages tidak ditemukan — tampilan fotoshare mungkin berubah.')
    sessions = json.loads(m.group(1))
    items, seen = [], set()
    for sess in sessions.values():
        for it in sess.values():
            url = it.get('img') or ''
            if not url.startswith('http') or it['hash'] in seen:
                continue
            seen.add(it['hash'])
            items.append({
                'hash': it['hash'],
                'url': url,
                'name': url.rsplit('/', 1)[-1].split('?')[0],
                'type': (it.get('fileType') or url.rsplit('.', 1)[-1]).lower(),
                'size': int(it.get('fileSize') or 0),
                'created': it.get('fileCreated') or it.get('date_added') or '',
                'session': it.get('session_id', ''),
            })
    items.sort(key=lambda x: (x['created'], x['name']))  # urutan kronologis (lama -> baru)
    return (title.group(1).replace('&amp;', '&').strip() if title else 'fotoshare'), items


def download(it, out_dir):
    path = os.path.join(out_dir, it['name'])
    if os.path.exists(path) and (not it['size'] or os.path.getsize(path) == it['size']):
        return path, False
    tmp = path + '.part'

    def go():
        with http(it['url'], timeout=300) as res, open(tmp, 'wb') as f:
            while True:
                chunk = res.read(1 << 20)
                if not chunk:
                    break
                f.write(chunk)
        if it['size'] and os.path.getsize(tmp) != it['size']:
            raise IOError(f'ukuran tidak cocok ({os.path.getsize(tmp)} != {it["size"]})')
        os.replace(tmp, path)

    retry(go, what=f'unduh {it["name"]}')
    return path, True


# ---------------------------------------------------------------- album Drive (Apps Script)

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
    mime = mimetypes.guess_type(path)[0] or ('video/mp4' if it['type'] == 'mp4' else 'image/jpeg')

    def go():
        start = api({'action': 'start', 'name': it['name'], 'type': mime, 'size': size, 'by': by})
        with open(path, 'rb') as f:
            data = f.read()
        res = http(start['uploadUrl'], data=data, method='PUT', timeout=600,
                   headers={'Content-Type': mime, 'Content-Length': str(size)})
        file_id = json.loads(res.read().decode())['id']
        api({'action': 'finish', 'id': file_id})
        return file_id

    return retry(go, what=f'unggah {it["name"]}')


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
    ap = argparse.ArgumentParser(description='Impor album fotoshare.co ke gallery.')
    ap.add_argument('--event', default=EVENT_URL, help='URL album fotoshare (default: album pernikahan)')
    ap.add_argument('--out', default='fotoshare', help='folder unduhan (default: ./fotoshare)')
    ap.add_argument('--list', action='store_true', help='tampilkan daftar file saja, tanpa unduh')
    ap.add_argument('--upload', action='store_true', help='unggah ke album gallery (Google Drive) setelah unduh')
    ap.add_argument('--by', default='Photobooth', help='nama pengirim yang tampil di album (default: Photobooth)')
    ap.add_argument('--only', choices=['jpg', 'mp4'], help='hanya foto (jpg) atau video (mp4)')
    ap.add_argument('--limit', type=int, help='batasi jumlah file (untuk uji coba)')
    ap.add_argument('--workers', type=int, default=4, help='unduhan paralel (default: 4)')
    a = ap.parse_args()

    title, items = fetch_items(a.event)
    if a.only:
        items = [it for it in items if it['type'] == a.only]
    if a.limit:
        items = items[:a.limit]
    n_img = sum(it['type'] != 'mp4' for it in items)
    total = sum(it['size'] for it in items)
    print(f'{title}\n{len(items)} file: {n_img} foto, {len(items) - n_img} video, {total / 1e6:.0f} MB')

    if a.list:
        for it in items:
            print(f'{it["created"]}  {it["type"]:>4}  {it["size"] / 1e6:6.1f} MB  {it["url"]}')
        return

    os.makedirs(a.out, exist_ok=True)
    paths, failed = {}, []
    with ThreadPoolExecutor(max(1, a.workers)) as pool:
        jobs = {pool.submit(download, it, a.out): it for it in items}
        for i, job in enumerate(as_completed(jobs), 1):
            it = jobs[job]
            try:
                path, fresh = job.result()
                paths[it['hash']] = path
                print(f'[{i}/{len(items)}] {"unduh " if fresh else "ada   "} {it["name"]}')
            except Exception as e:
                failed.append(it['name'])
                print(f'[{i}/{len(items)}] GAGAL  {it["name"]}: {e}', file=sys.stderr)
    print(f'Unduhan selesai di {os.path.abspath(a.out)} ({len(paths)} ok, {len(failed)} gagal)')

    if a.upload:
        manifest = load_manifest(a.out)
        todo = [it for it in items if it['hash'] in paths and it['hash'] not in manifest]
        print(f'Unggah ke album: {len(todo)} baru, {len(manifest)} sudah pernah terunggah')
        # berurutan & lama -> baru, supaya urutan "terbaru dulu" di album tetap rapi
        for i, it in enumerate(todo, 1):
            try:
                manifest[it['hash']] = upload(paths[it['hash']], it, a.by)
                save_manifest(a.out, manifest)
                print(f'[{i}/{len(todo)}] terunggah {it["name"]}')
            except Exception as e:
                failed.append(it['name'])
                print(f'[{i}/{len(todo)}] GAGAL unggah {it["name"]}: {e}', file=sys.stderr)

    if failed:
        print(f'\n{len(failed)} file gagal — jalankan ulang perintah yang sama untuk mencoba lagi.')
        sys.exit(1)


if __name__ == '__main__':
    main()
