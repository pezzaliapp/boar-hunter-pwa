/*
 * boar.js — boar AI (wander / flee / charge / dead) + detailed cartoon sprite.
 * Timid boars run from the hunter; aggressive ones charge and can deal damage.
 * A downed boar stays on the ground and can be picked up for the jeep.
 */
window.BH = window.BH || {};
(function (BH) {
  'use strict';

  const cfg = BH.config;
  const U = BH.util;

  function Boar(tx, ty, aggressive) {
    this.tx = tx; this.ty = ty;
    this.radius = cfg.boar.radius;
    this.health = cfg.boar.health;
    this.aggressive = aggressive;
    this.state = 'wander';
    this.dead = false;
    this.loaded = false;          // picked up onto the jeep
    this.vx = 0; this.vy = 0;
    this.wanderT = 0;
    this.wanderDir = { x: U.rand(-1, 1), y: U.rand(-1, 1) };
    this.facing = 1;              // -1 left, +1 right (screen)
    this.walkPhase = Math.random() * 6;
    this.hitFlash = 0;
    this.deathT = 0;
  }

  Boar.prototype.update = function (dt, player, world) {
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.dead) { this.deathT += dt; return; }

    const dToPlayer = U.dist(this.tx, this.ty, player.tx, player.ty);

    // decide state
    if (player.alive && dToPlayer < cfg.boar.detectRange) {
      this.state = this.aggressive ? 'charge' : 'flee';
    } else {
      this.state = 'wander';
    }

    let speed = cfg.boar.speedWander;
    let dir;
    if (this.state === 'charge') {
      speed = cfg.boar.speedCharge;
      dir = U.norm(player.tx - this.tx, player.ty - this.ty);
    } else if (this.state === 'flee') {
      speed = cfg.boar.speedFlee;
      dir = U.norm(this.tx - player.tx, this.ty - player.ty);
    } else {
      this.wanderT -= dt;
      if (this.wanderT <= 0) {
        this.wanderT = U.rand(1.0, 2.6);
        this.wanderDir = U.norm(U.rand(-1, 1), U.rand(-1, 1));
      }
      dir = this.wanderDir;
    }

    this.tx += dir.x * speed * dt;
    this.ty += dir.y * speed * dt;
    this.walkPhase += dt * (6 + speed);

    // screen-space facing: moving right on screen => (dx - dy) > 0
    const sdx = dir.x - dir.y;
    if (Math.abs(sdx) > 0.02) this.facing = sdx > 0 ? 1 : -1;

    world.resolve(this);
  };

  Boar.prototype.hit = function () {
    if (this.dead) return false;
    this.health -= 1;
    this.hitFlash = 0.12;
    BH.audio && BH.audio.play('thud');
    if (this.health <= 0) {
      this.dead = true;
      this.state = 'dead';
      BH.audio && BH.audio.play('boar');
      return true;   // killed
    }
    return false;
  };

  // ---- sprite ------------------------------------------------------------
  Boar.prototype.draw = function (ctx, x, y) {
    if (this.loaded) return;

    if (this.dead) { drawDead(ctx, x, y, this); return; }

    U.shadow(ctx, x, y, 18, 8);
    const bob = Math.abs(Math.sin(this.walkPhase)) * 1.6;
    ctx.save();
    ctx.translate(x, y - bob);
    ctx.scale(this.facing, 1);

    if (this.hitFlash > 0) ctx.globalAlpha = 0.6;

    const body = this.aggressive ? '#5a3d2a' : '#6d4d34';
    const dark = this.aggressive ? '#432c1e' : '#523a26';

    // legs
    const sw = Math.sin(this.walkPhase) * 2.5;
    ctx.fillStyle = dark;
    U.roundRect(ctx, -12, -8, 4, 9 + sw, 1.5); ctx.fill();
    U.roundRect(ctx, 8, -8, 4, 9 + sw, 1.5); ctx.fill();
    U.roundRect(ctx, -4, -8, 4, 9 - sw, 1.5); ctx.fill();
    U.roundRect(ctx, 2, -8, 4, 9 - sw, 1.5); ctx.fill();

    // body
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(-1, -16, 15, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    // bristly back ridge
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(-12, -22);
    for (let i = -12; i <= 8; i += 4) {
      ctx.lineTo(i + 2, -28);
      ctx.lineTo(i + 4, -22);
    }
    ctx.closePath();
    ctx.fill();

    // head
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(14, -14, 9, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // snout
    ctx.fillStyle = dark;
    U.roundRect(ctx, 20, -15, 8, 7, 3); ctx.fill();
    ctx.fillStyle = '#2a1c12';
    ctx.beginPath(); ctx.arc(26, -12.5, 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(26, -14.5, 1.1, 0, Math.PI * 2); ctx.fill();
    // ear
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(10, -22); ctx.lineTo(14, -28); ctx.lineTo(16, -20);
    ctx.closePath(); ctx.fill();
    // eye
    ctx.fillStyle = '#1a1109';
    ctx.beginPath(); ctx.arc(15, -16, 1.5, 0, Math.PI * 2); ctx.fill();
    if (this.aggressive) {
      // angry brow
      ctx.strokeStyle = '#2a1608';
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(11, -19); ctx.lineTo(17, -17); ctx.stroke();
    }
    // tusks
    ctx.fillStyle = '#efe6cf';
    ctx.beginPath();
    ctx.moveTo(21, -9); ctx.lineTo(24, -13); ctx.lineTo(22, -8);
    ctx.closePath(); ctx.fill();
    // tail
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-15, -18);
    ctx.quadraticCurveTo(-20, -20, -18, -24);
    ctx.stroke();

    ctx.restore();
  };

  function drawDead(ctx, x, y, boar) {
    U.shadow(ctx, x, y, 20, 9);
    ctx.save();
    ctx.translate(x, y - 4);
    ctx.rotate(0.06);
    ctx.scale(boar.facing, 1);
    const body = boar.aggressive ? '#5a3d2a' : '#6d4d34';
    const dark = boar.aggressive ? '#432c1e' : '#523a26';
    // lying body (flatter)
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, 0, 17, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // legs sticking up
    ctx.fillStyle = dark;
    U.roundRect(ctx, -8, -12, 3.5, 8, 1.5); ctx.fill();
    U.roundRect(ctx, -2, -13, 3.5, 9, 1.5); ctx.fill();
    U.roundRect(ctx, 6, -12, 3.5, 8, 1.5); ctx.fill();
    U.roundRect(ctx, 11, -11, 3.5, 7, 1.5); ctx.fill();
    // head
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.ellipse(16, 2, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
    // X eye
    ctx.strokeStyle = '#2a1608';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(14, -1); ctx.lineTo(18, 3);
    ctx.moveTo(18, -1); ctx.lineTo(14, 3);
    ctx.stroke();
    ctx.restore();
  }

  BH.Boar = Boar;
})(window.BH);
