/* ============================================================
   reveal.js — memunculkan elemen saat masuk viewport
   Pakai: <div class="reveal" data-delay="150">
   ============================================================ */

(function () {
  'use strict';

  var Reveal = {
    observer: null,

    init: function () {
      var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (reduced || !('IntersectionObserver' in window)) {
        this.showAll();
        return;
      }

      this.observer = new IntersectionObserver(this.onIntersect.bind(this), {
        threshold: 0.12,
        rootMargin: '0px 0px -8% 0px'
      });

      this.scan();
    },

    /* Daftarkan semua .reveal yang belum diamati */
    scan: function () {
      if (!this.observer) { this.showAll(); return; }

      var nodes = document.querySelectorAll('.reveal:not([data-observed])');
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        el.setAttribute('data-observed', '');
        if (el.dataset.delay) {
          el.style.setProperty('--delay', el.dataset.delay + 'ms');
        }
        this.observer.observe(el);
      }
    },

    onIntersect: function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (!entries[i].isIntersecting) continue;
        entries[i].target.classList.add('is-visible');
        this.observer.unobserve(entries[i].target);
      }
    },

    showAll: function () {
      var nodes = document.querySelectorAll('.reveal');
      for (var i = 0; i < nodes.length; i++) {
        nodes[i].classList.add('is-visible');
      }
    }
  };

  window.Reveal = Reveal;
})();
