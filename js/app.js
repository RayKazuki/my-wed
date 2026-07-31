/* ══════════════════════════════════════════════════════════════════
   UNDANGAN · RAYHAN & YOLAND
   ──────────────────────────────────────────────────────────────────
   0 · config & helpers
   1 · Cover       envelope open, personalised guest name
   2 · Reveal      scroll-in animation
   3 · Countdown   live timer to the akad
   4 · Petals      drifting petal generator
   5 · Lightbox    gallery viewer
   6 · Rsvp        form, storage, wishes wall
   7 · boot
   ══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── 0 · CONFIG & HELPERS ─────────────────────────────────────── */

  const CONFIG = {
    akad:       '2026-11-22T07:00:00+07:00',
    storageKey: 'rsvp:rayhan-yoland',
    revealStep: 80,
    petals: {
      countDesktop: 18,
      countMobile:  10,
      mobileUpTo:   640,
      width:  [7, 18],
      fall:   [12, 25],
      tints:  ['#E9B4AC', '#D4897F', '#F0DCD6', '#E2A69E', '#C87C72']
    }
  };

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const pad2   = n => String(n).padStart(2, '0');
  const rand   = (min, max) => min + Math.random() * (max - min);
  const calmed = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  const escapeHtml = str => str.replace(/[&<>"]/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]
  ));


  /* ── 1 · COVER ────────────────────────────────────────────────── */

  const Cover = {
    init() {
      this.gate = $('#gate');
      const button = $('#btnOpen');
      if (!this.gate || !button) return;

      this.showGuestName();
      button.addEventListener('click', () => this.open());
    },

    // personalised links: ?to=Nama%20Tamu
    showGuestName() {
      const guest = new URLSearchParams(location.search).get('to');
      if (guest) $('#guestName').textContent = guest;
    },

    open() {
      this.gate.classList.add('open');
      document.body.classList.remove('locked');
      window.scrollTo(0, 0);
      setTimeout(() => this.gate.remove(), 1600);
    }
  };


  /* ── 2 · REVEAL ───────────────────────────────────────────────── */

  const Reveal = {
    init() {
      const items = $$('.rv');
      if (!items.length) return;

      const observer = new IntersectionObserver(
        (entries, obs) => entries.forEach((entry, i) => {
          if (!entry.isIntersecting) return;
          setTimeout(() => entry.target.classList.add('in'), i * CONFIG.revealStep);
          obs.unobserve(entry.target);
        }),
        { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
      );

      items.forEach(el => observer.observe(el));
    }
  };


  /* ── 3 · COUNTDOWN ────────────────────────────────────────────── */

  const Countdown = {
    init() {
      this.boxes   = $('.cd-boxes');
      this.digital = $('#cdDigital');
      this.done    = $('#cdDone');
      if (!this.boxes) return;

      this.target = new Date(CONFIG.akad).getTime();
      this.tick();
      this.timer = setInterval(() => this.tick(), 1000);
    },

    tick() {
      const remaining = this.target - Date.now();
      if (remaining <= 0) return this.finish();

      const total   = Math.floor(remaining / 1000);
      const days    = Math.floor(total / 86400);
      const hours   = Math.floor(total / 3600) % 24;
      const minutes = Math.floor(total / 60) % 60;
      const seconds = total % 60;

      $('#cd-d').textContent = pad2(days);
      $('#cd-h').textContent = pad2(hours);
      $('#cd-m').textContent = pad2(minutes);

      this.digital.textContent =
        days + ' : ' + pad2(hours) + ' : ' + pad2(minutes) + ' : ' + pad2(seconds);
    },

    finish() {
      clearInterval(this.timer);
      this.boxes.hidden   = true;
      this.digital.hidden = true;
      this.done.hidden    = false;
    }
  };


  /* ── 4 · PETALS ───────────────────────────────────────────────── */

  const Petals = {
    init() {
      const stage = $('#petals');
      if (!stage || calmed()) return;

      const { countDesktop, countMobile, mobileUpTo } = CONFIG.petals;
      const total = innerWidth < mobileUpTo ? countMobile : countDesktop;

      for (let i = 0; i < total; i++) stage.appendChild(this.build(i));
    },

    build(index) {
      const { width, fall, tints } = CONFIG.petals;
      const size = rand(width[0], width[1]);

      const petal = document.createElement('div');
      petal.className = 'petal';
      petal.style.left = (Math.random() * 100) + '%';
      petal.style.setProperty('--dur', rand(fall[0], fall[1]).toFixed(1) + 's');
      // negative delay so petals are already mid-flight on load
      petal.style.animationDelay = (-Math.random() * 25).toFixed(1) + 's';

      const swing = document.createElement('i');
      swing.style.color = tints[index % tints.length];
      swing.innerHTML =
        '<svg viewBox="0 0 24 32" width="' + size.toFixed(1) +
        '" height="' + (size * 1.33).toFixed(1) + '"><use href="#petal"/></svg>';

      petal.appendChild(swing);
      return petal;
    }
  };


  /* ── 5 · LIGHTBOX ─────────────────────────────────────────────── */

  const Lightbox = {
    sources: ['#gal', '#pola'],

    init() {
      this.box = $('#lightbox');
      if (!this.box) return;
      this.image = $('img', this.box);

      this.sources.forEach(selector => {
        const scope = $(selector);
        if (scope) scope.addEventListener('click', event => this.openFrom(event));
      });

      this.box.addEventListener('click', () => this.close());
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape') this.close();
      });
    },

    openFrom(event) {
      const button = event.target.closest('button');
      const source = button && button.querySelector('img');
      if (!source) return;                 // empty photo slot — ignore

      this.image.src = source.src;
      this.image.alt = source.alt;
      this.box.classList.add('on');
    },

    close() {
      this.box.classList.remove('on');
    }
  };


  /* ── 6 · RSVP ─────────────────────────────────────────────────── */

  const Rsvp = {
    init() {
      const button = $('#btnSend');
      if (!button) return;

      this.wishes = $('#wishes');
      this.notice = $('#formMsg');

      button.addEventListener('click', () => this.submit());
      this.render(this.load());
    },

    load() {
      try {
        const stored = localStorage.getItem(CONFIG.storageKey);
        return stored ? JSON.parse(stored) : [];
      } catch (err) {
        return [];
      }
    },

    save(list) {
      try {
        localStorage.setItem(CONFIG.storageKey, JSON.stringify(list));
      } catch (err) {
        // storage unavailable (private mode / quota) — wishes won't persist past this session
      }
    },

    submit() {
      const name = $('#rsvpName').value.trim();
      if (!name) return this.notify('Isi nama Anda dulu.');

      const list = this.load();
      list.push({
        name:   name,
        attend: $('#rsvpAttend').value,
        guests: $('#rsvpCount').value,
        msg:    $('#rsvpMsg').value.trim(),
        at:     Date.now()
      });

      this.save(list);
      this.render(list);

      $('#rsvpName').value = '';
      $('#rsvpMsg').value  = '';
      this.notify('Terima kasih — konfirmasi Anda tercatat.');
    },

    render(list) {
      if (!list.length) {
        this.wishes.innerHTML =
          '<p class="wishes-empty">Belum ada ucapan. Jadilah yang pertama.</p>';
        return;
      }

      this.wishes.innerHTML = list.slice().reverse().map(entry => {
        const who  = escapeHtml(entry.name);
        const tag  = escapeHtml(entry.attend);
        const text = entry.msg
          ? '<p class="wish-txt">' + escapeHtml(entry.msg) + '</p>'
          : '';
        return '<div class="wish">' +
                 '<p class="wish-who">' + who +
                   '<span class="wish-tag">' + tag + '</span>' +
                 '</p>' + text +
               '</div>';
      }).join('');
    },

    notify(text) {
      this.notice.textContent = text;
      clearTimeout(this.noticeTimer);
      this.noticeTimer = setTimeout(() => { this.notice.textContent = ''; }, 4000);
    }
  };


  /* ── 7 · BOOT ─────────────────────────────────────────────────── */

  [Cover, Reveal, Countdown, Petals, Lightbox, Rsvp].forEach(module => module.init());
})();
