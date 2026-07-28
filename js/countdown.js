/* ============================================================
   countdown.js — hitung mundur ke tanggal acara
   ============================================================ */

(function () {
  'use strict';

  var Countdown = {
    target: null,
    cells: {},
    prev: {},
    timer: null,

    init: function () {
      var cfg = window.WEDDING;
      if (!cfg || !cfg.date) return;

      this.target = new Date(cfg.date).getTime();
      if (isNaN(this.target)) return;

      var keys = ['days', 'hours', 'minutes', 'seconds'];
      for (var i = 0; i < keys.length; i++) {
        this.cells[keys[i]] = document.querySelector('[data-cd="' + keys[i] + '"]');
      }

      this.tick();
      this.timer = setInterval(this.tick.bind(this), 1000);
    },

    tick: function () {
      var diff = this.target - Date.now();

      if (diff <= 0) {
        this.render({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(this.timer);
        this.announce();
        return;
      }

      var s = Math.floor(diff / 1000);
      this.render({
        days:    Math.floor(s / 86400),
        hours:   Math.floor(s % 86400 / 3600),
        minutes: Math.floor(s % 3600 / 60),
        seconds: s % 60
      });
    },

    render: function (v) {
      for (var key in v) {
        if (!this.cells[key]) continue;

        var text = String(v[key]).padStart(2, '0');
        if (this.prev[key] === text) continue;

        var cell = this.cells[key];
        cell.textContent = text;
        cell.classList.remove('is-ticking');
        void cell.offsetWidth;        /* paksa reflow agar animasi terulang */
        cell.classList.add('is-ticking');

        this.prev[key] = text;
      }
    },

    announce: function () {
      var note = document.getElementById('cdNote');
      if (note) note.textContent = 'Hari bahagia telah tiba.';
    }
  };

  window.Countdown = Countdown;
})();
