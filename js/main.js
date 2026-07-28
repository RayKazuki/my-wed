/* ============================================================
   main.js — merakit konten dari config.js lalu menyalakan
   seluruh modul.
   ============================================================ */

(function () {
  'use strict';

  /* ---------------------------------------------------------
     Toast
     --------------------------------------------------------- */
  var Toast = {
    el: null,
    timer: null,

    init: function () {
      this.el = document.getElementById('toast');
    },

    show: function (msg) {
      if (!this.el) return;
      this.el.textContent = msg;
      this.el.classList.add('is-shown');

      clearTimeout(this.timer);
      var self = this;
      this.timer = setTimeout(function () {
        self.el.classList.remove('is-shown');
      }, 2600);
    }
  };
  window.Toast = Toast;

  /* ---------------------------------------------------------
     Isi teks dari config ke elemen [data-bind]
     --------------------------------------------------------- */
  var Content = {
    init: function () {
      var cfg = window.WEDDING;
      if (!cfg) return;

      this.text(cfg);
      this.photos(cfg);
      this.events(cfg.events);
      this.story(cfg.story);
      this.gallery(cfg.gallery);
      this.gifts(cfg);
    },

    text: function (cfg) {
      var map = {
        'groom.name':      cfg.groom.name,
        'groom.full':      cfg.groom.fullName,
        'groom.role':      cfg.groom.role,
        'groom.father':    cfg.groom.father,
        'groom.mother':    cfg.groom.mother,
        'bride.name':      cfg.bride.name,
        'bride.full':      cfg.bride.fullName,
        'bride.role':      cfg.bride.role,
        'bride.father':    cfg.bride.father,
        'bride.mother':    cfg.bride.mother,
        'date.label':      cfg.dateLabel,
        'date.short':      cfg.dateShort,
        'quote.text':      cfg.quote.text,
        'quote.source':    cfg.quote.source,
        'gift.address':    cfg.giftAddress
      };

      for (var key in map) {
        var nodes = document.querySelectorAll('[data-bind="' + key + '"]');
        for (var i = 0; i < nodes.length; i++) {
          nodes[i].textContent = map[key];
        }
      }

      document.title = cfg.groom.name + ' & ' + cfg.bride.name + ' — Undangan Pernikahan';
    },

    photos: function (cfg) {
      this.swap('groomPhoto', cfg.groom.photo);
      this.swap('bridePhoto', cfg.bride.photo);
    },

    /* Pasang src; sembunyikan <img> bila file belum ada */
    swap: function (id, src) {
      var img = document.getElementById(id);
      if (!img || !src) return;
      img.onerror = function () { img.hidden = true; };
      img.src = src;
    },

    events: function (list) {
      var wrap = document.getElementById('eventList');
      if (!wrap || !list) return;

      var html = '';
      for (var i = 0; i < list.length; i++) {
        var ev = list[i];
        html +=
          '<article class="card reveal" data-delay="' + (i * 140) + '">' +
            '<h3 class="card__title">' + ev.name + '</h3>' +
            '<p class="card__row">' + ev.date + '</p>' +
            '<p class="card__row">' + ev.time + '</p>' +
            '<div class="divider" aria-hidden="true"></div>' +
            '<p class="card__venue">' + ev.venue + '</p>' +
            '<p class="card__address">' + ev.address + '</p>' +
            '<a class="btn btn--ghost" href="' + ev.maps + '" target="_blank" rel="noopener">' +
              '<span>Lihat lokasi</span>' +
            '</a>' +
          '</article>';
      }
      wrap.innerHTML = html;
    },

    story: function (list) {
      var wrap = document.getElementById('storyList');
      if (!wrap || !list) return;

      var html = '';
      for (var i = 0; i < list.length; i++) {
        var s = list[i];
        html +=
          '<article class="timeline__item reveal reveal--left" data-delay="' + (i * 140) + '">' +
            '<span class="timeline__dot" aria-hidden="true"></span>' +
            '<span class="timeline__year eyebrow">' + s.year + '</span>' +
            '<h3 class="timeline__title script">' + s.title + '</h3>' +
            '<p class="timeline__text">' + s.text + '</p>' +
          '</article>';
      }
      wrap.innerHTML = html;
    },

    gallery: function (list) {
      var wrap = document.getElementById('galleryGrid');
      if (!wrap || !list) return;

      var html = '';
      for (var i = 0; i < list.length; i++) {
        html +=
          '<figure class="frame frame--tile reveal" ' +
                  'data-delay="' + (i * 90) + '" ' +
                  'data-fallback="' + (i + 1) + '">' +
            '<img src="' + list[i] + '" alt="Momen ' + (i + 1) + '" loading="lazy" ' +
                 'onerror="this.hidden=true">' +
          '</figure>';
      }
      wrap.innerHTML = html;
    },

    gifts: function (cfg) {
      var wrap = document.getElementById('giftList');
      if (!wrap || !cfg.gifts) return;

      var html = '';
      for (var i = 0; i < cfg.gifts.length; i++) {
        var g = cfg.gifts[i];
        html +=
          '<article class="bank reveal" data-delay="' + (i * 130) + '">' +
            '<p class="bank__name">' + g.bank + '</p>' +
            '<p class="bank__number">' + g.number + '</p>' +
            '<p class="bank__holder">a.n. ' + g.holder + '</p>' +
            '<button class="btn btn--ghost" data-copy="' + g.number + '">' +
              '<span>Salin nomor</span>' +
            '</button>' +
          '</article>';
      }
      wrap.innerHTML = html;
    }
  };

  /* ---------------------------------------------------------
     Salin ke clipboard
     --------------------------------------------------------- */
  var Copy = {
    init: function () {
      document.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-copy]');
        if (!btn) return;

        var value = btn.getAttribute('data-copy');

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(value).then(function () {
            Toast.show('Nomor rekening disalin');
          }).catch(function () {
            Toast.show('Salin manual: ' + value);
          });
        } else {
          Toast.show('Salin manual: ' + value);
        }
      });
    }
  };

  /* ---------------------------------------------------------
     Lightbox galeri
     --------------------------------------------------------- */
  var Lightbox = {
    box: null,
    img: null,

    init: function () {
      this.box = document.getElementById('lightbox');
      this.img = document.getElementById('lightboxImg');
      if (!this.box) return;

      var self = this;

      document.addEventListener('click', function (e) {
        var tile = e.target.closest('.frame--tile');
        if (tile) {
          var source = tile.querySelector('img');
          if (source && !source.hidden) self.open(source.src, source.alt);
          return;
        }
        if (e.target.closest('.lightbox__close') || e.target.id === 'lightbox') {
          self.close();
        }
      });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') self.close();
      });
    },

    open: function (src, alt) {
      this.img.src = src;
      this.img.alt = alt || '';
      this.box.classList.add('is-open');
      document.body.classList.add('is-noscroll');
    },

    close: function () {
      this.box.classList.remove('is-open');
      document.body.classList.remove('is-noscroll');
    }
  };

  /* ---------------------------------------------------------
     Musik latar
     --------------------------------------------------------- */
  var Music = {
    audio: null,
    btn: null,

    init: function () {
      var cfg = window.WEDDING;
      this.btn = document.getElementById('musicBtn');
      if (!this.btn || !cfg || !cfg.music) return;

      this.audio = new Audio(cfg.music);
      this.audio.loop = true;
      this.audio.volume = 0.5;

      var self = this;

      this.btn.addEventListener('click', function () { self.toggle(); });

      /* Coba mainkan begitu undangan dibuka (butuh gestur pengguna) */
      document.addEventListener('invitation:opened', function () {
        self.play();
      });
    },

    play: function () {
      var self = this;
      var p = this.audio.play();
      if (p && p.then) {
        p.then(function () {
          self.btn.classList.add('is-playing');
        }).catch(function () {
          /* Browser memblokir autoplay — biarkan tombol tetap mati */
        });
      }
    },

    toggle: function () {
      if (this.audio.paused) {
        this.play();
      } else {
        this.audio.pause();
        this.btn.classList.remove('is-playing');
      }
    }
  };

  /* ---------------------------------------------------------
     Dock: tandai section aktif
     --------------------------------------------------------- */
  var Dock = {
    init: function () {
      var links = document.querySelectorAll('.dock a');
      if (!links.length || !('IntersectionObserver' in window)) return;

      var byId = {};
      var targets = [];

      for (var i = 0; i < links.length; i++) {
        var id = links[i].getAttribute('href').slice(1);
        var section = document.getElementById(id);
        if (!section) continue;
        byId[id] = links[i];
        targets.push(section);
      }

      var obs = new IntersectionObserver(function (entries) {
        for (var j = 0; j < entries.length; j++) {
          if (!entries[j].isIntersecting) continue;
          for (var k = 0; k < links.length; k++) links[k].classList.remove('is-active');
          var active = byId[entries[j].target.id];
          if (active) active.classList.add('is-active');
        }
      }, { threshold: 0.4 });

      for (var t = 0; t < targets.length; t++) obs.observe(targets[t]);
    }
  };

  /* ---------------------------------------------------------
     Boot
     --------------------------------------------------------- */
  function boot() {
    Toast.init();
    Content.init();      /* render dulu, supaya .reveal baru ikut terdaftar */
    window.Cover.init();
    window.Reveal.init();
    window.Countdown.init();
    window.Guestbook.init();
    Copy.init();
    Lightbox.init();
    Music.init();
    Dock.init();
    window.Petals.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
