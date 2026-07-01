/*
 * jeep.js — the isometric pickup truck. It is a static landmark where loaded
 * boars accumulate; drawn with wheels, hood, windshield, roll bar and a bed
 * that fills up with boar humps as the counter grows.
 */
window.BH = window.BH || {};
(function (BH) {
  'use strict';

  const U = BH.util;

  function Jeep(tx, ty) {
    this.tx = tx; this.ty = ty;
    this.radius = 1.1;
    this.loaded = 0;
  }

  Jeep.prototype.draw = function (ctx, x, y) {
    U.shadow(ctx, x, y, 40, 15);
    ctx.save();
    ctx.translate(x, y);

    // ---- wheels (isometric, two visible on the near side) ----
    ctx.fillStyle = '#20232a';
    wheel(ctx, -26, -6);
    wheel(ctx, 20, -6);

    // ---- bed / cargo area (behind cab) ----
    ctx.fillStyle = '#37622f';
    U.roundRect(ctx, -34, -34, 30, 24, 4); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    U.roundRect(ctx, -34, -20, 30, 10, 4); ctx.fill();
    // bed rim
    ctx.fillStyle = '#2c5027';
    U.roundRect(ctx, -34, -36, 30, 5, 2); ctx.fill();

    // loaded boars as humps in the bed
    for (let i = 0; i < this.loaded; i++) {
      const bx = -30 + i * 9;
      ctx.fillStyle = '#5a3d2a';
      ctx.beginPath();
      ctx.ellipse(bx, -32, 6, 4, 0, Math.PI, 0);
      ctx.fill();
    }

    // ---- main body ----
    ctx.fillStyle = '#4a8a3e';
    U.roundRect(ctx, -20, -30, 44, 22, 6); ctx.fill();
    // body shading (lower)
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    U.roundRect(ctx, -20, -16, 44, 8, 6); ctx.fill();

    // ---- cab + windshield ----
    ctx.fillStyle = '#3d7534';
    U.roundRect(ctx, -6, -44, 26, 16, 5); ctx.fill();
    ctx.fillStyle = '#bfe3ef';
    U.roundRect(ctx, -2, -41, 18, 11, 3); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.moveTo(-2, -30); ctx.lineTo(6, -41); ctx.lineTo(10, -41); ctx.lineTo(-2, -33);
    ctx.closePath(); ctx.fill();
    // roll bar
    ctx.strokeStyle = '#2a2f24';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-4, -30); ctx.lineTo(-4, -46); ctx.lineTo(18, -46); ctx.lineTo(18, -30);
    ctx.stroke();

    // ---- hood + headlight ----
    ctx.fillStyle = '#54994a';
    U.roundRect(ctx, 18, -28, 12, 14, 4); ctx.fill();
    ctx.fillStyle = '#f4e07a';
    ctx.beginPath(); ctx.arc(29, -20, 2.6, 0, Math.PI * 2); ctx.fill();
    // bumper
    ctx.fillStyle = '#2f3a2a';
    U.roundRect(ctx, 26, -14, 7, 5, 2); ctx.fill();

    // front fender highlight
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    U.roundRect(ctx, -18, -29, 40, 3, 2); ctx.fill();

    ctx.restore();
  };

  function wheel(ctx, wx, wy) {
    ctx.save();
    ctx.translate(wx, wy);
    ctx.fillStyle = '#20232a';
    ctx.beginPath(); ctx.ellipse(0, 0, 9, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a3f47';
    ctx.beginPath(); ctx.ellipse(0, 0, 4.5, 4.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8b9099';
    ctx.beginPath(); ctx.ellipse(0, 0, 1.8, 1.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  BH.Jeep = Jeep;
})(window.BH);
