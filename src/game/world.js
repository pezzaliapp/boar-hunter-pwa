/*
 * world.js — isometric terrain, static props (trees / rocks / bushes) and
 * collision helpers. The ground is baked once into an offscreen canvas for
 * performance; props are returned as depth-sortable drawables each frame.
 */
window.BH = window.BH || {};
(function (BH) {
  'use strict';

  const cfg = BH.config;
  const iso = BH.iso;
  const U = BH.util;

  function World() {
    this.cols = cfg.world.cols;
    this.rows = cfg.world.rows;
    this.tiles = [];        // 0 grass, 1 path
    this.props = [];        // trees, rocks, bushes
    this.solids = [];       // subset of props that block movement
    this.groundCanvas = null;
    this.offset = { x: 0, y: 0 };
    this._generate();
    this._bake();
  }

  World.prototype._generate = function () {
    const cols = this.cols, rows = this.rows;

    // --- terrain: grass with a gently winding dirt path ---
    for (let j = 0; j < rows; j++) {
      const row = [];
      for (let i = 0; i < cols; i++) {
        const pathCenter = cols * 0.5 + Math.sin(j * 0.35) * (cols * 0.22);
        const onPath = Math.abs(i - pathCenter) < 1.6;
        row.push(onPath ? 1 : 0);
      }
      this.tiles.push(row);
    }

    // --- scatter props, keeping the central spawn area clear ---
    const cx = cols / 2, cy = rows / 2;
    const occupied = [];
    const tryPlace = function (tx, ty, minGap) {
      for (let k = 0; k < occupied.length; k++) {
        if (U.dist(tx, ty, occupied[k].x, occupied[k].y) < minGap) return false;
      }
      occupied.push({ x: tx, y: ty });
      return true;
    };

    const isPath = (tx, ty) => {
      const i = Math.round(tx), j = Math.round(ty);
      return this.tiles[j] && this.tiles[j][i] === 1;
    };

    // trees (solid)
    for (let n = 0; n < 60; n++) {
      const tx = U.rand(1, cols - 1), ty = U.rand(1, rows - 1);
      if (U.dist(tx, ty, cx, cy) < 4) continue;   // keep spawn clear
      if (isPath(tx, ty)) continue;
      if (!tryPlace(tx, ty, 1.8)) continue;
      this.props.push({ type: 'tree', tx: tx, ty: ty, r: 0.55, seed: Math.random(), solid: true });
    }
    // rocks (solid)
    for (let n = 0; n < 16; n++) {
      const tx = U.rand(1, cols - 1), ty = U.rand(1, rows - 1);
      if (U.dist(tx, ty, cx, cy) < 3.5) continue;
      if (isPath(tx, ty)) continue;
      if (!tryPlace(tx, ty, 1.6)) continue;
      this.props.push({ type: 'rock', tx: tx, ty: ty, r: 0.5, seed: Math.random(), solid: true });
    }
    // bushes (decorative, non-blocking)
    for (let n = 0; n < 34; n++) {
      const tx = U.rand(1, cols - 1), ty = U.rand(1, rows - 1);
      if (U.dist(tx, ty, cx, cy) < 2.5) continue;
      if (!tryPlace(tx, ty, 1.2)) continue;
      this.props.push({ type: 'bush', tx: tx, ty: ty, r: 0.3, seed: Math.random(), solid: false });
    }

    this.solids = this.props.filter(function (p) { return p.solid; });
  };

  // --- bake ground tiles into one offscreen canvas ---
  World.prototype._bake = function () {
    const cols = this.cols, rows = this.rows;
    const HW = cfg.HW, HH = cfg.HH, PAD = 40;
    const w = (cols + rows) * HW + PAD * 2;
    const h = (cols + rows) * HH + PAD * 2;
    this.offset = { x: rows * HW + PAD, y: PAD };

    const c = document.createElement('canvas');
    c.width = Math.ceil(w);
    c.height = Math.ceil(h);
    const ctx = c.getContext('2d');
    const off = this.offset;

    // deep backdrop so gaps never flash white
    ctx.fillStyle = '#2c5734';
    ctx.fillRect(0, 0, c.width, c.height);

    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const t = this.tiles[j][i];
        const a = iso.toScreen(i, j);
        const b = iso.toScreen(i + 1, j);
        const d = iso.toScreen(i + 1, j + 1);
        const e = iso.toScreen(i, j + 1);

        let fill;
        if (t === 1) {
          fill = (i + j) % 2 === 0 ? '#9a7748' : '#8f6d40';
        } else {
          // subtle checker so the grass reads as terrain, not a flat sheet
          fill = (i + j) % 2 === 0 ? '#3f7a44' : '#478349';
          if ((i * 7 + j * 3) % 11 === 0) fill = '#4f8c50'; // occasional lighter patch
        }

        ctx.beginPath();
        ctx.moveTo(a.x + off.x, a.y + off.y);
        ctx.lineTo(b.x + off.x, b.y + off.y);
        ctx.lineTo(d.x + off.x, d.y + off.y);
        ctx.lineTo(e.x + off.x, e.y + off.y);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        // faint tile seam for isometric readability
        ctx.strokeStyle = 'rgba(0,0,0,0.05)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    this.groundCanvas = c;
  };

  // Blit the baked ground, offset by the camera.
  World.prototype.drawGround = function (ctx, cam) {
    ctx.drawImage(this.groundCanvas, -cam.x - this.offset.x, -cam.y - this.offset.y);
  };

  // Collision: push a moving circle (tile-space) out of solid props + bounds.
  World.prototype.resolve = function (ent) {
    for (let k = 0; k < this.solids.length; k++) {
      const s = this.solids[k];
      const dx = ent.tx - s.tx, dy = ent.ty - s.ty;
      const d = Math.hypot(dx, dy);
      const min = ent.radius + s.r;
      if (d > 0 && d < min) {
        const n = { x: dx / d, y: dy / d };
        ent.tx = s.tx + n.x * min;
        ent.ty = s.ty + n.y * min;
      }
    }
    const m = 0.6;
    ent.tx = U.clamp(ent.tx, m, this.cols - m);
    ent.ty = U.clamp(ent.ty, m, this.rows - m);
  };

  // Return static props as depth-sortable drawables for the main render pass.
  World.prototype.getDrawables = function () {
    const out = [];
    for (let k = 0; k < this.props.length; k++) {
      const p = this.props[k];
      out.push({
        tx: p.tx, ty: p.ty, depth: p.tx + p.ty,
        draw: (function (prop) {
          return function (ctx, sx, sy) { BH.sprites.prop(ctx, sx, sy, prop); };
        })(p),
      });
    }
    return out;
  };

  // ---- Prop sprites ------------------------------------------------------
  BH.sprites = BH.sprites || {};

  BH.sprites.prop = function (ctx, x, y, p) {
    if (p.type === 'tree') drawTree(ctx, x, y, p.seed);
    else if (p.type === 'rock') drawRock(ctx, x, y, p.seed);
    else drawBush(ctx, x, y, p.seed);
  };

  function drawTree(ctx, x, y, seed) {
    U.shadow(ctx, x, y, 20, 9);
    // trunk
    ctx.fillStyle = '#6b4a2b';
    U.roundRect(ctx, x - 5, y - 34, 10, 34, 4);
    ctx.fill();
    ctx.fillStyle = '#5a3d22';
    U.roundRect(ctx, x - 5, y - 34, 4, 34, 4);
    ctx.fill();
    // layered cartoon foliage
    const tint = seed > 0.5 ? 0 : 8;
    const blobs = [
      { dx: 0, dy: -74, r: 26, c: '#2f6b37' },
      { dx: -16, dy: -58, r: 20, c: '#357a3d' },
      { dx: 16, dy: -58, r: 20, c: '#357a3d' },
      { dx: 0, dy: -52, r: 24, c: '#3d8a45' },
      { dx: -8, dy: -78, r: 16, c: '#49994f' },
    ];
    for (let i = 0; i < blobs.length; i++) {
      const b = blobs[i];
      ctx.fillStyle = shade(b.c, tint);
      ctx.beginPath();
      ctx.ellipse(x + b.dx, y + b.dy, b.r, b.r * 0.92, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // highlight
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.ellipse(x - 8, y - 82, 9, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawRock(ctx, x, y, seed) {
    U.shadow(ctx, x, y, 18, 8);
    const w = 20 + seed * 6;
    ctx.fillStyle = '#8a8f95';
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.lineTo(x - w * 0.6, y - 16);
    ctx.lineTo(x - w * 0.1, y - 22);
    ctx.lineTo(x + w * 0.55, y - 15);
    ctx.lineTo(x + w, y - 2);
    ctx.lineTo(x + w * 0.6, y + 5);
    ctx.lineTo(x - w * 0.6, y + 5);
    ctx.closePath();
    ctx.fill();
    // top light facet
    ctx.fillStyle = '#a7adb3';
    ctx.beginPath();
    ctx.moveTo(x - w * 0.6, y - 16);
    ctx.lineTo(x - w * 0.1, y - 22);
    ctx.lineTo(x + w * 0.55, y - 15);
    ctx.lineTo(x + w * 0.1, y - 8);
    ctx.closePath();
    ctx.fill();
    // shaded facet
    ctx.fillStyle = '#6f757b';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.55, y - 15);
    ctx.lineTo(x + w, y - 2);
    ctx.lineTo(x + w * 0.6, y + 5);
    ctx.lineTo(x + w * 0.1, y - 8);
    ctx.closePath();
    ctx.fill();
  }

  function drawBush(ctx, x, y, seed) {
    U.shadow(ctx, x, y, 16, 7);
    const c = seed > 0.5 ? '#357a3d' : '#3d8a45';
    const lobes = [
      { dx: -10, dy: -6, r: 11 },
      { dx: 10, dy: -6, r: 11 },
      { dx: 0, dy: -12, r: 13 },
    ];
    for (let i = 0; i < lobes.length; i++) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.ellipse(x + lobes[i].dx, y + lobes[i].dy, lobes[i].r, lobes[i].r * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.beginPath();
    ctx.ellipse(x - 3, y - 15, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // a couple of berries for detail
    if (seed > 0.6) {
      ctx.fillStyle = '#d84b4b';
      ctx.beginPath(); ctx.arc(x - 4, y - 6, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 6, y - 9, 1.8, 0, Math.PI * 2); ctx.fill();
    }
  }

  // lighten/darken a #rrggbb color by amount (0..255-ish)
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    r = U.clamp(r, 0, 255); g = U.clamp(g, 0, 255); b = U.clamp(b, 0, 255);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  BH.World = World;
})(window.BH);
