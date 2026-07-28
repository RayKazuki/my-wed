/* ============================================================
   cover.js — layar pembuka & pembukaan undangan
   ============================================================ */

(function () {
  'use strict';

  var Cover = {
    el: null,
    opened: false,

    init: function () {
      this.el = document.getElementById('cover');
      if (!this.el) return;

      document.body.classList.add('is-locked');
      this.fillGuestName();

      var btn = document.getElementById('openBtn');
      if (btn) btn.addEventListener('click', this.open.bind(this));
    },

    /* Ambil nama tamu dari ?to=Nama atau ?kepada=Nama */
    fillGuestName: function () {
      var slot = document.getElementById('guestName');
      if (!slot) return;

      var params = new URLSearchParams(window.location.search);
      var guest = params.get('to') || params.get('kepada') || params.get('nama');

      if (guest) {
        slot.textContent = decodeURIComponent(guest.replace(/\+/g, ' ')).trim();
      }
    },

    open: function () {
      if (this.opened) return;
      this.opened = true;

      this.el.classList.add('is-open');
      document.body.classList.remove('is-locked');
      document.body.classList.add('is-opened');
      window.scrollTo(0, 0);

      /* Sembunyikan cover setelah panel selesai bergeser */
      var self = this;
      setTimeout(function () {
        self.el.classList.add('is-done');
      }, 1700);

      /* Munculkan dock & tombol musik */
      setTimeout(function () {
        var dock = document.getElementById('dock');
        var music = document.getElementById('musicBtn');
        if (dock) dock.classList.add('is-shown');
        if (music) music.classList.add('is-shown');
      }, 1900);

      document.dispatchEvent(new CustomEvent('invitation:opened'));
    }
  };

  window.Cover = Cover;
})();
