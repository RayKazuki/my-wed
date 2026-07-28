# Undangan Pernikahan — Huda Nur & Yoland Alifia

Halaman undangan statis. Tanpa framework, tanpa build step.
Buka `index.html` di browser, selesai.

---

## Struktur

```
wedding-huda-yoland/
├── index.html              Seluruh markup + sprite SVG (ornamen & ikon)
├── css/
│   ├── base.css            Token warna, reset, tipografi
│   ├── layout.css          Kerangka section & grid
│   ├── components.css      Tombol, kartu, bingkai, form, dock
│   └── animations.css      Keyframes & state transisi
├── js/
│   ├── config.js           ← SATU-SATUNYA file yang perlu diedit
│   ├── cover.js            Layar pembuka
│   ├── reveal.js           Reveal saat scroll
│   ├── countdown.js        Hitung mundur
│   ├── guestbook.js        Ucapan & RSVP
│   └── main.js             Perakit konten + lightbox, musik, dock
└── assets/
    ├── img/                Foto (lihat di bawah)
    └── audio/              backsound.mp3 (opsional)
```

Urutan muat CSS penting: `base → layout → components → animations`.
Jangan ditukar, sebagian override bergantung pada urutan itu.

---

## Cara mengganti isi

Semua data ada di **`js/config.js`**: nama, tanggal, jam, lokasi,
link Google Maps, nomor rekening, dan teks ayat. Tidak perlu
menyentuh HTML sama sekali.

Tanggal countdown memakai format ISO dengan zona WIB:

```js
date: '2026-12-12T08:00:00+07:00'
```

## Foto

Taruh di `assets/img/` dengan nama persis:

| Berkas             | Dipakai di       | Rasio ideal |
|--------------------|------------------|-------------|
| `groom.jpg`        | Mempelai pria    | 3:4 potret  |
| `bride.jpg`        | Mempelai wanita  | 3:4 potret  |
| `gallery-1.jpg`    | Galeri, tile tinggi | 1:2 potret |
| `gallery-2..5.jpg` | Galeri, tile kotak  | 1:1        |
| `gallery-6.jpg`    | Galeri, tile lebar  | 2:1 lanskap |

Kalau file belum ada, bingkainya menampilkan placeholder — halaman
tetap jalan normal, tidak error.

## Nama tamu di undangan

Tambahkan parameter `to` pada URL:

```
index.html?to=Keluarga%20Besar%20Wijaya
```

Bisa juga `?kepada=` atau `?nama=`. Kalau kosong, tampil
"Bapak / Ibu / Saudara/i".

## Kelopak bunga

Diatur di `config.js` bagian `petals`:

```js
petals: {
  enabled: true,
  density: 34,   // makin KECIL angkanya, makin banyak kelopak
  colors: ['#D9BFB0', '#C9A18C', '#BFA090', '#A88B5C', '#9AA588']
}
```

Kelopak baru mulai jatuh setelah tombol "Buka Undangan" ditekan —
layar cover sengaja dibiarkan bersih. Jumlahnya menyesuaikan lebar
layar (±11 di ponsel, ±38 di desktop), dan animasi berhenti otomatis
saat tab tidak aktif.

Blur pada lapis terdepan dipanggang ke sprite offscreen sekali di
awal. Jangan memindahkan `ctx.filter` ke dalam loop gambar —
itu menjatuhkan frame rate dari 60 fps ke sekitar 2 fps.

## Musik latar

Taruh `assets/audio/backsound.mp3`, lalu sesuaikan path di
`config.js`. Browser memblokir autoplay tanpa interaksi, jadi musik
baru mulai setelah tombol "Buka Undangan" ditekan — itu dihitung
sebagai gestur pengguna.

---

## Yang masih perlu dikerjakan

**Form ucapan belum permanen.** Data disimpan di memori halaman saja
dan hilang saat refresh. Untuk menyimpan sungguhan, sambungkan
`Guestbook.submit()` di `js/guestbook.js` ke backend Anda atau ke
Google Apps Script / Sheets. Titik sambungnya sudah ditandai di
komentar file tersebut.

---

## Catatan teknis

- Font dari Google Fonts (Cormorant Garamond, Jost, Parisienne),
  butuh koneksi internet. Untuk offline, unduh dan host sendiri.
- `prefers-reduced-motion` dihormati: semua animasi dimatikan.
- Sudah diuji bebas horizontal scroll di 390px, 768px, dan 1280px.
- Tanpa `localStorage`, aman dijalankan di lingkungan yang membatasi
  penyimpanan browser.
