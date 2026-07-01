/*
 * config.js — global constants, isometric math and small utilities.
 * Everything is attached to the global `BH` namespace so the game can be
 * loaded with plain <script> tags and run directly from file:// (no bundler,
 * no ES-module CORS issues on GitHub Pages or when double-clicking index.html).
 */
window.BH = window.BH || {};
(function (BH) {
  'use strict';

  const TILE_W = 64;
  const TILE_H = 32;

  BH.config = {
    version: '0.2.1',
    TILE_W: TILE_W,
    TILE_H: TILE_H,
    HW: TILE_W / 2,
    HH: TILE_H / 2,

    world: { cols: 40, rows: 40 },

    player: {
      speed: 3.4,          // tiles / second
      radius: 0.42,
      maxHealth: 100,
      invuln: 1.0,         // seconds of i-frames after a hit
      magazine: 6,
      reloadTime: 1.3,
      fireCooldown: 0.26,
      pickupRange: 1.5,
    },

    bullet: { speed: 15, life: 0.65, radius: 0.14 },

    boar: {
      count: 8,
      speedWander: 1.1,
      speedFlee: 3.7,
      speedCharge: 4.0,
      detectRange: 5.0,
      health: 2,
      radius: 0.5,
      contactRange: 0.85,
      hitDamage: 20,
    },

    goal: 3,
    // "par" time in seconds used for the completion time bonus
    // (+10 points per second left under this limit). The HUD timer counts up.
    timeLimit: 90,

    colors: {
      uiDark: 'rgba(16,24,18,0.72)',
    },
  };

  // ---- Persistent storage (best score) ----------------------------------
  // Wrapped in try/catch so it degrades gracefully where localStorage is
  // unavailable (private mode, file:// on some browsers, quota errors).
  BH.storage = {
    KEY: 'boarhunter.bestScore',
    getBest: function () {
      try {
        const v = window.localStorage.getItem(this.KEY);
        const n = parseInt(v, 10);
        return isNaN(n) ? 0 : n;
      } catch (e) { return 0; }
    },
    // Save only when it's a new record; returns true if a record was set.
    saveBest: function (score) {
      try {
        if (score > this.getBest()) {
          window.localStorage.setItem(this.KEY, String(score));
          return true;
        }
      } catch (e) { /* ignore */ }
      return false;
    },
  };

  // ---- Isometric projection helpers -------------------------------------
  // Tile (integer) space -> world-screen space (pixels, may be negative).
  BH.iso = {
    toScreen: function (tx, ty) {
      return { x: (tx - ty) * BH.config.HW, y: (tx + ty) * BH.config.HH };
    },
    // Convert a screen-space direction (e.g. joystick / WASD) to tile space,
    // so that "up on screen" moves the player up on screen (feels natural).
    screenDirToTile: function (sx, sy) {
      const hw = BH.config.HW, hh = BH.config.HH;
      return { x: (sx / hw + sy / hh) * 0.5, y: (sy / hh - sx / hw) * 0.5 };
    },
    // Tile-space direction -> screen-space direction (for aiming the rifle).
    tileDirToScreen: function (tx, ty) {
      return { x: (tx - ty) * BH.config.HW, y: (tx + ty) * BH.config.HH };
    },
  };

  // ---- Tiny math / helper toolbox ---------------------------------------
  BH.util = {
    clamp: function (v, a, b) { return v < a ? a : (v > b ? b : v); },
    len: function (x, y) { return Math.hypot(x, y); },
    norm: function (x, y) { const l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l }; },
    dist: function (ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    rand: function (a, b) { return a + Math.random() * (b - a); },
    randInt: function (a, b) { return Math.floor(a + Math.random() * (b - a + 1)); },
    pick: function (arr) { return arr[Math.floor(Math.random() * arr.length)]; },
    // Rounded-rect path helper used across all sprite drawing.
    roundRect: function (ctx, x, y, w, h, r) {
      const rr = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + w, y, x + w, y + h, rr);
      ctx.arcTo(x + w, y + h, x, y + h, rr);
      ctx.arcTo(x, y + h, x, y, rr);
      ctx.arcTo(x, y, x + w, y, rr);
      ctx.closePath();
    },
    // Soft ground shadow used under every entity/object.
    shadow: function (ctx, x, y, w, h) {
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = '#0c1a10';
      ctx.beginPath();
      ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },
  };
})(window.BH);
