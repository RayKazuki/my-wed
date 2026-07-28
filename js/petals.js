/* ============================================================
   petals.js — kelopak bunga jatuh (canvas)

   Tiga lapis kedalaman meniru depth of field: lapis jauh kecil
   dan lambat, lapis dekat besar dan sangat buram.

   PENTING: blur dipanggang sekali ke sprite offscreen saat init.
   Memakai ctx.filter di dalam loop memicu satu operasi blur untuk
   SETIAP fill() dan menjatuhkan frame rate ke satuan digit.
   Di loop kita hanya drawImage, yang murah.
   ============================================================ */

(function () {
  'use strict';

  /* scale = pengali ukuran, blur = px, speed = pengali kecepatan */
  var LAYERS = [
    { scale: 0.55, blur: 1.5, speed: 0.40, alpha: 0.30 },  /* jauh   */
    { scale: 0.95, blur: 0,   speed: 0.70, alpha: 0.42 },  /* tengah */
    { scale: 1.75, blur: 7,   speed: 1.15, alpha: 0.26 }   /* dekat  */
  ];

  var Petals = {
    canvas: null,
    ctx: null,
    dpr: 1,
    w: 0,
    h: 0,
    items: [],
    raf: null,
    running: false,
    canBlur: false,
    sprites: {},
    wind: 0,
    windPhase: 0,
    opts: null,

    init: function () {
      var cfg = (window.WEDDING && window.WEDDING.petals) || {};
      this.opts = {
        enabled: cfg.enabled !== false,
        density: cfg.density || 34,
        colors: cfg.colors || ['#D9BFB0', '#C9A18C', '#BFA090', '#A88B5C', '#9AA588']
      };

      if (!this.opts.enabled) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      this.canvas = document.getElementById('petals');
      if (!this.canvas || !this.canvas.getContext) return;

      this.ctx = this.canvas.getContext('2d');
      this.canBlur = typeof this.ctx.filter === 'string';

      this.resize();
      this.build();

      var self = this;

      var t;
      window.addEventListener('resize', function () {
        clearTimeout(t);
        t = setTimeout(function () { self.resize(); self.build(); }, 200);
      });

      /* Jangan bakar CPU saat tab tidak terlihat */
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) self.stop();
        else if (self.wasRunning) self.start();
      });

      /* Mulai bersamaan dengan terbukanya undangan */
      document.addEventListener('invitation:opened', function () {
        self.canvas.classList.add('is-shown');
        self.start();
      });
    },

    resize: function () {
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = window.innerWidth;
      this.h = window.innerHeight;

      this.canvas.width = Math.floor(this.w * this.dpr);
      this.canvas.height = Math.floor(this.h * this.dpr);
      this.canvas.style.width = this.w + 'px';
      this.canvas.style.height = this.h + 'px';

      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    },

    /* Jumlah kelopak mengikuti lebar layar: sedikit di ponsel */
    count: function () {
      return Math.round(Math.min(this.w, 1600) / this.opts.density);
    },

    /* Panggang satu bitmap per (warna x lapis). Blur ikut di sini. */
    buildSprites: function () {
      this.sprites = {};
      var colors = this.opts.colors;

      for (var li = 0; li < LAYERS.length; li++) {
        for (var ci = 0; ci < colors.length; ci++) {
          this.sprites[li + ':' + ci] =
            this.makeSprite(colors[ci], LAYERS[li].blur);
        }
      }
    },

    makeSprite: function (color, blur) {
      var CANON = 26;                          /* radius kanonik sprite */
      var pad = (this.canBlur ? blur * 3 : 0) + 2;
      var dim = Math.ceil(CANON * 2 + pad * 2);
      var dpr = this.dpr;

      var c = document.createElement('canvas');
      c.width = Math.ceil(dim * dpr);
      c.height = Math.ceil(dim * dpr);

      var x = c.getContext('2d');
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (blur && this.canBlur) x.filter = 'blur(' + blur + 'px)';

      x.translate(dim / 2, dim / 2);
      var s = CANON;
      x.beginPath();
      x.moveTo(0, -s);
      x.bezierCurveTo( s * 0.88, -s * 0.55,  s * 0.72,  s * 0.68, 0, s);
      x.bezierCurveTo(-s * 0.72,  s * 0.68, -s * 0.88, -s * 0.55, 0, -s);
      x.closePath();
      x.fillStyle = color;
      x.fill();

      return { canvas: c, dim: dim, canon: CANON };
    },

    build: function () {
      this.buildSprites();
      var n = this.count();
      this.items = [];
      for (var i = 0; i < n; i++) {
        this.items.push(this.spawn(true));
      }
    },

    spawn: function (scatter) {
      var li = Math.floor(Math.random() * LAYERS.length);
      var L = LAYERS[li];
      var ci = Math.floor(Math.random() * this.opts.colors.length);

      return {
        layer: li,
        sprite: this.sprites[li + ':' + ci],
        x: Math.random() * this.w,
        y: scatter ? Math.random() * this.h : -30,
        size: (7 + Math.random() * 6) * L.scale,
        vy: (0.35 + Math.random() * 0.55) * L.speed,
        vx: (Math.random() - 0.5) * 0.22,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.018,
        phase: Math.random() * Math.PI * 2,
        swaySpeed: 0.006 + Math.random() * 0.012,
        swayAmp: 0.35 + Math.random() * 0.85,
        flip: 1,
        alpha: L.alpha * (0.7 + Math.random() * 0.5)
      };
    },

    step: function () {
      /* Angin pelan yang berubah arah, memberi kesan alami */
      this.windPhase += 0.0016;
      this.wind = Math.sin(this.windPhase) * 0.32;

      for (var i = 0; i < this.items.length; i++) {
        var p = this.items[i];

        p.phase += p.swaySpeed;
        p.y += p.vy;
        p.x += p.vx + this.wind + Math.sin(p.phase) * p.swayAmp * 0.35;
        p.rot += p.vrot;

        /* Kelopak berputar pada sumbunya: lebar menyempit lalu melebar */
        var f = Math.cos(p.phase * 0.7);
        p.flip = (f < 0 ? -1 : 1) * Math.max(0.15, Math.abs(f));

        /* Daur ulang saat keluar layar */
        if (p.y - p.size > this.h) {
          p.y = -p.size * 2;
          p.x = Math.random() * this.w;
        }
        if (p.x < -40) p.x = this.w + 30;
        else if (p.x > this.w + 40) p.x = -30;
      }
    },

    draw: function () {
      var ctx = this.ctx;
      ctx.clearRect(0, 0, this.w, this.h);

      for (var i = 0; i < this.items.length; i++) {
        var p = this.items[i];
        var sp = p.sprite;
        if (!sp) continue;

        var k = p.size / sp.canon;     /* pengali dari ukuran kanonik */

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(p.flip * k, k);
        ctx.globalAlpha = p.alpha;
        ctx.drawImage(sp.canvas, -sp.dim / 2, -sp.dim / 2, sp.dim, sp.dim);
        ctx.restore();
      }

      ctx.globalAlpha = 1;
    },

    loop: function () {
      this.step();
      this.draw();
      this.raf = requestAnimationFrame(this.loop.bind(this));
    },

    start: function () {
      if (this.running) return;
      this.running = true;
      this.wasRunning = true;
      this.loop();
    },

    stop: function () {
      this.running = false;
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = null;
    }
  };

  window.Petals = Petals;
})();
