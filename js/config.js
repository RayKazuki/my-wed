/* ============================================================
   config.js — Satu-satunya file yang perlu diedit untuk
   mengganti nama, tanggal, lokasi, dan rekening.
   ============================================================ */

window.WEDDING = {
  /* ---------- Mempelai ---------- */
  groom: {
    name: 'Rayhan',
    fullName: 'Huda Nur Rayhan',
    role: 'Putra Pertama',
    father: 'Bapak Mohammad Holil',
    mother: 'Ibu Tri Asih Suhartinah',
    photo: 'assets/img/groom.jpg',
    instagram: 'hudanur'
  },
  bride: {
    name: 'Yoland',
    fullName: 'Yoland Alifia Az Zahra',
    role: 'Putri Kedua',
    father: 'Bapak Aris Munandar',
    mother: 'Ibu Lasmini S',
    photo: 'assets/img/bride.jpg',
    instagram: 'yolandalifia'
  },

  /* ---------- Tanggal utama (dipakai countdown) ---------- */
  /* Format: 'YYYY-MM-DDTHH:mm:ss+07:00' (WIB) */
  date: '2026-12-12T08:00:00+07:00',
  dateLabel: 'Sabtu, 12 Desember 2026',
  dateShort: '12 . 12 . 2026',

  /* ---------- Rangkaian acara ---------- */
  events: [
    {
      name: 'Akad Nikah',
      date: 'Sabtu, 12 Desember 2026',
      time: '08.00 — 10.00 WIB',
      venue: 'Masjid Raya Bintaro Jaya',
      address: 'Jl. Maleo Raya No. 1, Bintaro Jaya Sektor 9, Tangerang Selatan',
      maps: 'https://maps.google.com/?q=Masjid+Raya+Bintaro+Jaya'
    },
    {
      name: 'Resepsi',
      date: 'Sabtu, 12 Desember 2026',
      time: '11.00 — 14.00 WIB',
      venue: 'Graha Bintaro Ballroom',
      address: 'Jl. Bintaro Utama Sektor 3A, Tangerang Selatan, Banten',
      maps: 'https://maps.google.com/?q=Bintaro+Jaya+Tangerang+Selatan'
    }
  ],

  /* ---------- Kisah kami ---------- */
  story: [
    {
      year: '2018',
      title: 'Pertama Bertemu',
      text: 'Dipertemukan lewat teman kuliah, obrolan singkat itu ternyata menjadi awal dari banyak percakapan panjang setelahnya.'
    },
    {
      year: '2020',
      title: 'Semakin Dekat',
      text: 'Melewati suka dan duka bersama, rasa nyaman itu perlahan tumbuh menjadi sesuatu yang lebih serius.'
    },
    {
      year: '2024',
      title: 'Restu Kedua Keluarga',
      text: 'Dengan restu orang tua, hubungan ini melangkah ke tahap yang lebih serius menuju pernikahan.'
    },
    {
      year: '2026',
      title: 'Menuju Hari Bahagia',
      text: 'Dan pada 12 Desember 2026, kami akan mengikat janji suci di hadapan Allah SWT dan orang-orang tersayang.'
    }
  ],

  /* ---------- Galeri (taruh file di assets/img/) ---------- */
  gallery: [
    'assets/img/gallery-1.jpg',
    'assets/img/gallery-2.jpg',
    'assets/img/gallery-3.jpg',
    'assets/img/gallery-4.jpg',
    'assets/img/gallery-5.jpg',
    'assets/img/gallery-6.jpg'
  ],

  /* ---------- Amplop digital ---------- */
  gifts: [
    { bank: 'Bank Mandiri', number: '1370012345678', holder: 'Huda Nur Rayhan' },
    { bank: 'Bank BCA',     number: '5271234567',    holder: 'Yoland Alifia Az Zahra' }
  ],
  giftAddress: 'Jl. Melati Indah No. 24, Pondok Aren, Tangerang Selatan 15224',

  /* ---------- Musik latar (opsional) ---------- */
  music: 'assets/audio/backsound.mp3',

  /* ---------- Kelopak bunga jatuh ---------- */
  petals: {
    enabled: true,
    /* Makin KECIL angkanya, makin banyak kelopak. 34 = sedang. */
    density: 34,
    colors: ['#D9BFB0', '#C9A18C', '#BFA090', '#A88B5C', '#9AA588']
  },

  /* ---------- Ayat pembuka ---------- */
  quote: {
    text: 'Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan untukmu pasangan hidup dari jenismu sendiri, supaya kamu cenderung dan merasa tenteram kepadanya, dan dijadikan-Nya di antaramu rasa kasih dan sayang.',
    source: 'QS. Ar-Rum : 21'
  }
};
