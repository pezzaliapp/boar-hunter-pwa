/*
 * sceneMenu.js — animated forest backdrop behind the DOM title/menu overlay.
 * Draws a layered, parallax-ish scene (sky, sun, hills, tree silhouettes,
 * a strolling boar) so the start screen never looks like an empty grid.
 */
window.BH = window.BH || {};
(function (BH) {
  'use strict';

  BH.scenes = BH.scenes || {};

  BH.scenes.menu = {
    t: 0,
    enter: function () {
      this.t = 0;
      BH.ui.setMenuBest(BH.storage.getBest());
      BH.ui.showMenu(true);
      BH.ui.showHud(false);
      BH.ui.showTouch(false);
    },
    exit: function () { BH.ui.showMenu(false); },
    update: function (dt) { this.t += dt; },
    render: function (ctx) {
      const W = BH.game.W, H = BH.game.H, t = this.t;

      // sky
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#8fc4d6');
      g.addColorStop(0.55, '#cfe6c9');
      g.addColorStop(1, '#8bbf7a');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // sun
      ctx.fillStyle = 'rgba(255,239,180,0.9)';
      ctx.beginPath();
      ctx.arc(W * 0.78, H * 0.22, 42, 0, Math.PI * 2);
      ctx.fill();

      // rolling hills (three layers)
      hill(ctx, W, H, H * 0.62, '#5a9a56', 0.9, t * 6);
      hill(ctx, W, H, H * 0.72, '#458047', 1.3, t * 10 + 40);
      hill(ctx, W, H, H * 0.82, '#356b3b', 1.7, t * 14 + 90);

      // tree silhouettes along the mid hill
      for (let i = 0; i < 7; i++) {
        const x = ((i * 140 + t * 8) % (W + 160)) - 80;
        tree(ctx, x, H * 0.7, 0.8 + (i % 3) * 0.15);
      }

      // a boar ambling across the foreground
      const bx = ((t * 40) % (W + 120)) - 60;
      boar(ctx, bx, H * 0.9, t);

      // ground band
      ctx.fillStyle = '#2c5730';
      ctx.fillRect(0, H * 0.9, W, H * 0.1);
    },
  };

  function hill(ctx, W, H, base, color, freq, phase) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 12) {
      const y = base + Math.sin((x * 0.004 * freq) + phase * 0.02) * 18;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
  }

  function tree(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = '#5a3d22';
    ctx.fillRect(-3, -18, 6, 20);
    ctx.fillStyle = '#2f6b37';
    ctx.beginPath(); ctx.arc(0, -26, 16, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-10, -20, 12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(10, -20, 12, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function boar(ctx, x, y, t) {
    ctx.save();
    ctx.translate(x, y);
    const bob = Math.abs(Math.sin(t * 6)) * 2;
    ctx.translate(0, -bob);
    ctx.fillStyle = '#4a3122';
    ctx.beginPath(); ctx.ellipse(0, -12, 20, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(18, -14, 10, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2f2013';
    ctx.fillRect(-14, -4, 5, 10);
    ctx.fillRect(10, -4, 5, 10);
    ctx.fillStyle = '#efe6cf';
    ctx.beginPath(); ctx.moveTo(24, -8); ctx.lineTo(28, -13); ctx.lineTo(26, -6); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
})(window.BH);
