# Undangan Pernikahan — Rayhan & Yoland
22 November 2026

## Struktur

```
undangan/
├── index.html          markup
├── css/style.css       seluruh gaya
├── js/app.js           7 modul: Cover, Reveal, Countdown, Petals, Lightbox, Rsvp
└── img/                13 gambar
```

## Menjalankan

Buka `index.html` langsung di browser, atau unggah seluruh folder ke hosting
(Netlify, Vercel, GitHub Pages, cPanel). Semua path bersifat relatif.

## Link personal per tamu

Tambahkan `?to=` di akhir URL:

```
index.html?to=Bapak%20Budi%20Santoso
```

Nama itu akan muncul di halaman sampul.

## Yang perlu diganti

| Berkas | Bagian |
|---|---|
| `index.html` | bagian **Rencana Perjalanan** — masih teks contoh Canva (Uluwatu, 4 hari) |
| `index.html` | bagian **FAQ** — masih menyebut resor dan antar-jemput hotel |
| `index.html` | **Daftar Hadiah** — email `halo@situssupercanggih.co.id` |
| `index.html` | **Kontak** — Pandu Darmawan & Ciara Salsabila, nomor 021 123 456 7890 |
| `index.html` | 3 slot foto kosong di galeri (`Foto 03`–`Foto 05`) |

## Pengaturan cepat

| Apa | Di mana |
|---|---|
| Tanggal & jam akad | `js/app.js` → `CONFIG.akad` |
| Jumlah kelopak | `js/app.js` → `CONFIG.petals` |
| Warna | `css/style.css` → `:root` |
| Lebar latar per bagian | `css/style.css` → `--bg-w`, `--bg-o` |
| Posisi janur | `css/style.css` → `.arch-janur` |
| Bingkai foto lingkaran | `css/style.css` → `.portrait img{object-position}` |
