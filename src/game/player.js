/*
 * player.js — the hunter: movement, aiming, shooting, ammo/reload, health,
 * and a detailed cartoon sprite (hat, jacket, rifle oriented toward aim).
 */
window.BH = window.BH || {};
(function (BH) {
  'use strict';

  const cfg = BH.config;
  const iso = BH.iso;
  const U = BH.util;

  function Player(tx, ty) {
    this.tx = tx; this.ty = ty;
    this.radius = cfg.player.radius;
    this.health = cfg.player.maxHealth;
    this.ammo = cfg.player.magazine;
    this.reloading = false;
    this.reloadT = 0;
    this.fireT = 0;
    this.invulnT = 0;
    this.facing = { x: 0.7, y: 0.7 };     // tile-space aim direction
    this.facingScreen = { x: 1, y: 0 };   // screen-space (for rifle angle)
    this.walkPhase = 0;
    this.alive = true;
  }

  Player.prototype.update = function (dt, input, world) {
    if (this.fireT > 0) this.fireT -= dt;
    if (this.invulnT > 0) this.invulnT -= dt;

    // reload timer
    if (this.reloading) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) {
        this.reloading = false;
        this.ammo = cfg.player.magazine;
        BH.audio && BH.audio.play('reload');
      }
    }

    // movement: screen-space input -> tile-space velocity
    let moving = false;
    if (input.moveX !== 0 || input.moveY !== 0) {
      const dir = iso.screenDirToTile(input.moveX, input.moveY);
      const n = U.norm(dir.x, dir.y);
      const mag = Math.min(1, U.len(input.moveX, input.moveY));
      this.tx += n.x * cfg.player.speed * mag * dt;
      this.ty += n.y * cfg.player.speed * mag * dt;
      moving = true;
      this.walkPhase += dt * 10 * mag;

      // face movement direction
      this.facing = n;
      const s = iso.tileDirToScreen(n.x, n.y);
      this.facingScreen = U.norm(s.x, s.y);
    }
    if (!moving) this.walkPhase = 0;

    world.resolve(this);
    return moving;
  };

  Player.prototype.canShoot = function () {
    return this.alive && !this.reloading && this.ammo > 0 && this.fireT <= 0;
  };

  Player.prototype.shoot = function () {
    if (this.reloading) return null;
    if (this.ammo <= 0) { this.reload(); return null; }
    if (this.fireT > 0) return null;
    this.ammo--;
    this.fireT = cfg.player.fireCooldown;
    BH.audio && BH.audio.play('shoot');
    // muzzle position ~ in front of the hunter along the aim direction
    const mx = this.tx + this.facing.x * 0.6;
    const my = this.ty + this.facing.y * 0.6;
    return new BH.Bullet(mx, my, this.facing.x, this.facing.y);
  };

  Player.prototype.reload = function () {
    if (this.reloading || this.ammo === cfg.player.magazine) return;
    this.reloading = true;
    this.reloadT = cfg.player.reloadTime;
  };

  Player.prototype.hurt = function (amount) {
    if (this.invulnT > 0 || !this.alive) return false;
    this.health = Math.max(0, this.health - amount);
    this.invulnT = cfg.player.invuln;
    BH.audio && BH.audio.play('hurt');
    if (this.health <= 0) this.alive = false;
    return true;
  };

  // ---- sprite ------------------------------------------------------------
  Player.prototype.draw = function (ctx, x, y) {
    U.shadow(ctx, x, y, 15, 7);

    // hop when walking
    const bob = Math.abs(Math.sin(this.walkPhase)) * 2.5;
    const flip = this.facingScreen.x < 0 ? -1 : 1;
    const blink = this.invulnT > 0 && Math.floor(this.invulnT * 12) % 2 === 0;

    ctx.save();
    ctx.translate(x, y - bob);
    if (blink) ctx.globalAlpha = 0.45;

    // legs
    const legSwing = Math.sin(this.walkPhase) * 3;
    ctx.fillStyle = '#3f5233';
    U.roundRect(ctx, -6, -12, 5, 13 + legSwing, 2); ctx.fill();
    U.roundRect(ctx, 1, -12, 5, 13 - legSwing, 2); ctx.fill();
    // boots
    ctx.fillStyle = '#2a1c12';
    U.roundRect(ctx, -7, -3 + legSwing, 7, 4, 2); ctx.fill();
    U.roundRect(ctx, 0, -3 - legSwing, 7, 4, 2); ctx.fill();

    // torso — khaki hunting jacket
    ctx.fillStyle = '#7a6b3f';
    U.roundRect(ctx, -9, -30, 18, 20, 5); ctx.fill();
    // jacket shading
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    U.roundRect(ctx, 2, -30, 7, 20, 5); ctx.fill();
    // hunter-orange chest band (high visibility)
    ctx.fillStyle = '#e8792b';
    U.roundRect(ctx, -9, -24, 18, 5, 2); ctx.fill();

    // head
    ctx.fillStyle = '#e5b78e';
    ctx.beginPath();
    ctx.ellipse(0, -34, 6.5, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // nose hint
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    ctx.beginPath();
    ctx.ellipse(flip * 4, -33, 1.6, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // hat — brim + orange cap
    ctx.fillStyle = '#c9631f';
    ctx.beginPath();
    ctx.ellipse(0, -39, 11, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8792b';
    U.roundRect(ctx, -7, -46, 14, 8, 4); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    U.roundRect(ctx, -7, -41, 14, 3, 2); ctx.fill();

    // rifle — rotate around the shoulder toward the aim direction
    ctx.save();
    ctx.translate(0, -22);
    let ang = Math.atan2(this.facingScreen.y, this.facingScreen.x);
    ctx.rotate(ang);
    // stock
    ctx.fillStyle = '#5a3b22';
    U.roundRect(ctx, -6, -2.5, 10, 5, 2); ctx.fill();
    // body
    ctx.fillStyle = '#2f2a26';
    U.roundRect(ctx, 2, -2, 12, 4, 1.5); ctx.fill();
    // barrel
    ctx.fillStyle = '#4a4640';
    U.roundRect(ctx, 12, -1.4, 14, 2.8, 1.4); ctx.fill();
    ctx.restore();

    ctx.restore();
  };

  BH.Player = Player;
})(window.BH);
