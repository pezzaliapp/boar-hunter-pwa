/*
 * sceneGame.js — the playable level: spawns the world/player/boars/jeep,
 * runs the simulation, handles shooting, collisions, damage, pickups,
 * win/lose conditions and the depth-sorted isometric render.
 */
window.BH = window.BH || {};
(function (BH) {
  'use strict';

  const cfg = BH.config;
  const iso = BH.iso;
  const U = BH.util;

  // ---- Bullet ------------------------------------------------------------
  function Bullet(tx, ty, dx, dy) {
    this.tx = tx; this.ty = ty;
    this.dx = dx; this.dy = dy;
    this.radius = cfg.bullet.radius;
    this.life = cfg.bullet.life;
    this.dead = false;
    // trail tail position for the tracer look
    this.px = tx; this.py = ty;
  }
  Bullet.prototype.update = function (dt, world) {
    this.px = this.tx; this.py = this.ty;
    this.tx += this.dx * cfg.bullet.speed * dt;
    this.ty += this.dy * cfg.bullet.speed * dt;
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    // stop on solid props
    for (let k = 0; k < world.solids.length; k++) {
      const s = world.solids[k];
      if (U.dist(this.tx, this.ty, s.tx, s.ty) < s.r) { this.dead = true; return; }
    }
    if (this.tx < 0 || this.ty < 0 || this.tx > world.cols || this.ty > world.rows) this.dead = true;
  };
  Bullet.prototype.draw = function (ctx, x, y) {
    const tail = iso.toScreen(this.px, this.py);
    const head = iso.toScreen(this.tx, this.ty);
    const cam = BH.scenes.game.cam;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,220,120,0.9)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tail.x - cam.x, tail.y - cam.y - 22);
    ctx.lineTo(head.x - cam.x, head.y - cam.y - 22);
    ctx.stroke();
    ctx.fillStyle = '#fff4c0';
    ctx.beginPath();
    ctx.arc(x, y - 22, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  BH.Bullet = Bullet;

  // ---- Scene -------------------------------------------------------------
  BH.scenes = BH.scenes || {};

  const game = {
    world: null,
    player: null,
    boars: [],
    bullets: [],
    jeep: null,
    cam: { x: 0, y: 0 },
    loaded: 0,
    state: 'play',      // play | gameover | complete
    promptBoar: null,

    enter: function () {
      this.reset();
      BH.ui.showHud(true);
      BH.ui.showTouch(BH.isTouch);
      BH.ui.showGameOver(false);
      BH.ui.showLevelComplete(false);
    },
    exit: function () {
      BH.ui.hidePrompt();
      BH.ui.showTouch(false);
    },

    reset: function () {
      const w = new BH.World();
      this.world = w;
      const cx = w.cols / 2, cy = w.rows / 2;

      this.player = new BH.Player(cx, cy);

      // jeep near spawn; clear any solids around it
      this.jeep = new BH.Jeep(cx + 4, cy - 5);
      const jp = this.jeep;
      w.solids = w.solids.filter(function (s) { return U.dist(s.tx, s.ty, jp.tx, jp.ty) > 2.2; });
      w.props = w.props.filter(function (p) {
        return !(p.solid && U.dist(p.tx, p.ty, jp.tx, jp.ty) <= 2.2);
      });

      // boars, spawned away from the player, half aggressive
      this.boars = [];
      let placed = 0, guard = 0;
      while (placed < cfg.boar.count && guard < 400) {
        guard++;
        const tx = U.rand(2, w.cols - 2), ty = U.rand(2, w.rows - 2);
        if (U.dist(tx, ty, cx, cy) < 7) continue;
        let onSolid = false;
        for (let k = 0; k < w.solids.length; k++) {
          if (U.dist(tx, ty, w.solids[k].tx, w.solids[k].ty) < 1) { onSolid = true; break; }
        }
        if (onSolid) continue;
        this.boars.push(new BH.Boar(tx, ty, placed % 2 === 0));
        placed++;
      }

      this.bullets = [];
      this.loaded = 0;
      this.state = 'play';
      this.promptBoar = null;

      // run stats / scoring
      this.score = 0;
      this.elapsed = 0;         // seconds since "Gioca"
      this.kills = 0;
      this.shotsFired = 0;
      this.shotsHit = 0;
      this.timeBonus = 0;

      this._syncCam(true);
      this._syncHud();
    },

    restart: function () {
      this.reset();
      BH.ui.showGameOver(false);
      BH.ui.showLevelComplete(false);
    },

    _syncCam: function (snap) {
      const p = iso.toScreen(this.player.tx, this.player.ty);
      const tx = p.x - BH.game.W / 2;
      const ty = p.y - BH.game.H / 2;
      if (snap) { this.cam.x = tx; this.cam.y = ty; }
      else {
        this.cam.x += (tx - this.cam.x) * 0.14;
        this.cam.y += (ty - this.cam.y) * 0.14;
      }
    },

    _syncHud: function () {
      BH.ui.setHealth(this.player.health);
      BH.ui.setAmmo(this.player.ammo, cfg.player.magazine, this.player.reloading);
      BH.ui.setCounter(this.loaded, cfg.goal);
      BH.ui.setScore(this.score);
      BH.ui.setTimer(this.elapsed, cfg.timeLimit);
    },

    // Build the result payload and show the matching final screen.
    _finish: function (kind) {
      const acc = this.shotsFired > 0
        ? Math.round(this.shotsHit / this.shotsFired * 100) : 0;
      BH.ui.showResult(kind, {
        score: this.score,
        time: this.elapsed,
        kills: this.kills,
        loaded: this.loaded,
        goal: cfg.goal,
        accuracy: acc,
        timeBonus: this.timeBonus,
      });
    },

    update: function (dt) {
      BH.ui.tick(dt);
      if (this.state !== 'play') { this._syncCam(false); return; }

      this.elapsed += dt;

      const input = BH.controls.sample();
      const p = this.player;

      p.update(dt, input, this.world);

      // shooting (auto-repeat while held; cooldown gated inside shoot())
      if (input.shoot) {
        const b = p.shoot();
        if (b) { this.bullets.push(b); this.shotsFired++; }
      }
      if (input.reloadEdge) p.reload();

      // bullets
      for (let i = 0; i < this.bullets.length; i++) {
        const b = this.bullets[i];
        b.update(dt, this.world);
        if (b.dead) continue;
        // vs boars
        for (let k = 0; k < this.boars.length; k++) {
          const bo = this.boars[k];
          if (bo.dead) continue;
          if (U.dist(b.tx, b.ty, bo.tx, bo.ty) < bo.radius + b.radius) {
            b.dead = true;
            this.shotsHit++;
            const killed = bo.hit();
            if (killed) {
              this.kills++;
              this.score += 100;
              BH.ui.toast('Cinghiale abbattuto! +100');
            }
            break;
          }
        }
      }
      this.bullets = this.bullets.filter(function (b) { return !b.dead; });

      // boars
      for (let k = 0; k < this.boars.length; k++) {
        const bo = this.boars[k];
        bo.update(dt, p, this.world);
        if (bo.dead || bo.loaded) continue;
        // contact damage from charging boars
        if (U.dist(bo.tx, bo.ty, p.tx, p.ty) < cfg.boar.contactRange) {
          const hurt = p.hurt(cfg.boar.hitDamage);
          if (hurt) {
            // knock both apart
            const n = U.norm(p.tx - bo.tx, p.ty - bo.ty);
            p.tx += n.x * 0.6; p.ty += n.y * 0.6;
            bo.tx -= n.x * 0.8; bo.ty -= n.y * 0.8;
            this.world.resolve(p); this.world.resolve(bo);
          }
        }
      }

      // player death
      if (!p.alive) {
        this.state = 'gameover';
        BH.ui.hidePrompt();
        this._finish('lose');
        BH.audio && BH.audio.play('gameover');
        this._syncCam(false);
        this._syncHud();
        return;
      }

      // pickup prompt: nearest downed, un-loaded boar in range
      this.promptBoar = null;
      let best = cfg.player.pickupRange;
      for (let k = 0; k < this.boars.length; k++) {
        const bo = this.boars[k];
        if (!bo.dead || bo.loaded) continue;
        const d = U.dist(bo.tx, bo.ty, p.tx, p.ty);
        if (d < best) { best = d; this.promptBoar = bo; }
      }
      if (this.promptBoar) {
        BH.ui.showPrompt('Carica sulla jeep 🛻');
        if (input.actionEdge) {
          this.promptBoar.loaded = true;
          this.loaded++;
          this.score += 250;
          this.jeep.loaded = Math.min(this.loaded, cfg.goal + 2);
          BH.ui.hidePrompt();
          BH.ui.toast('Caricato! +250  (' + this.loaded + '/' + cfg.goal + ')');
          BH.audio && BH.audio.play('load');
          this.promptBoar = null;
        }
      } else {
        BH.ui.hidePrompt();
      }

      // win
      if (this.loaded >= cfg.goal) {
        this.state = 'complete';
        // completion bonus + time bonus (+10 per second left under the time limit)
        this.timeBonus = Math.max(0, Math.floor(cfg.timeLimit - this.elapsed)) * 10;
        this.score += 500 + this.timeBonus;
        BH.ui.hidePrompt();
        this._finish('win');
        BH.audio && BH.audio.play('win');
        this._syncCam(false);
        this._syncHud();
        return;
      }

      this._syncCam(false);
      this._syncHud();
    },

    render: function (ctx) {
      const W = BH.game.W, H = BH.game.H;
      const cam = this.cam;

      ctx.clearRect(0, 0, W, H);
      this.world.drawGround(ctx, cam);

      // collect depth-sortable drawables
      const list = this.world.getDrawables();

      const jeep = this.jeep;
      list.push({ tx: jeep.tx, ty: jeep.ty, depth: jeep.tx + jeep.ty,
        draw: function (c, x, y) { jeep.draw(c, x, y); } });

      for (let k = 0; k < this.boars.length; k++) {
        const bo = this.boars[k];
        if (bo.loaded) continue;
        // downed boars sit slightly lower in the sort so the hunter can stand over them
        const depth = bo.tx + bo.ty - (bo.dead ? 0.3 : 0);
        list.push({ tx: bo.tx, ty: bo.ty, depth: depth,
          draw: (function (b) { return function (c, x, y) { b.draw(c, x, y); }; })(bo) });
      }

      const pl = this.player;
      list.push({ tx: pl.tx, ty: pl.ty, depth: pl.tx + pl.ty + 0.01,
        draw: function (c, x, y) { pl.draw(c, x, y); } });

      list.sort(function (a, b) { return a.depth - b.depth; });
      for (let i = 0; i < list.length; i++) {
        const d = list[i];
        const s = iso.toScreen(d.tx, d.ty);
        d.draw(ctx, s.x - cam.x, s.y - cam.y);
      }

      // bullets on top
      for (let i = 0; i < this.bullets.length; i++) {
        const b = this.bullets[i];
        const s = iso.toScreen(b.tx, b.ty);
        b.draw(ctx, s.x - cam.x, s.y - cam.y);
      }

      // gentle vignette for focus
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.75);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.25)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
    },
  };

  BH.scenes.game = game;
})(window.BH);
