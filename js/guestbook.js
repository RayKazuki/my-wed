/* ============================================================
   guestbook.js — ucapan & konfirmasi kehadiran
   Catatan: data disimpan di memori halaman saja. Sambungkan
   submit() ke backend / Google Sheets bila ingin permanen.
   ============================================================ */

(function () {
  'use strict';

  var LABEL = {
    hadir:  'Akan hadir',
    ragu:   'Masih diusahakan',
    absen:  'Berhalangan hadir'
  };

  var Guestbook = {
    entries: [],
    list: null,

    init: function () {
      var form = document.getElementById('wishForm');
      this.list = document.getElementById('wishList');
      if (!form || !this.list) return;

      form.addEventListener('submit', this.submit.bind(this));
      this.render();
    },

    submit: function (e) {
      e.preventDefault();

      var form = e.currentTarget;
      var name = form.elements.name.value.trim();
      var message = form.elements.message.value.trim();
      var attend = form.elements.attend.value;

      if (!name || !message) {
        window.Toast.show('Nama dan ucapan wajib diisi');
        return;
      }

      this.entries.unshift({
        name: name,
        message: message,
        attend: attend,
        time: new Date()
      });

      form.reset();
      this.render();
      window.Toast.show('Terima kasih atas doanya');
    },

    render: function () {
      if (!this.entries.length) {
        this.list.innerHTML =
          '<p class="wishes__empty">Belum ada ucapan. Jadilah yang pertama.</p>';
        return;
      }

      var html = '';
      for (var i = 0; i < this.entries.length; i++) {
        var it = this.entries[i];
        html +=
          '<article class="wish">' +
            '<div class="wish__head">' +
              '<h4 class="wish__name">' + this.esc(it.name) + '</h4>' +
              '<span class="wish__tag">' + (LABEL[it.attend] || '') + '</span>' +
            '</div>' +
            '<p class="wish__body">' + this.esc(it.message) + '</p>' +
          '</article>';
      }
      this.list.innerHTML = html;
    },

    esc: function (str) {
      var d = document.createElement('div');
      d.textContent = str;
      return d.innerHTML;
    }
  };

  window.Guestbook = Guestbook;
})();
