/*
 * main.js — bootstraps the game: canvas + HiDPI sizing, the scene manager and
 * fixed-timestep-ish RAF loop, input/UI wiring, a tiny WebAudio SFX engine,
 * and service-worker registration for offline PWA support.
 */
window.BH = window.BH || {};
(function (BH) {
  'use strict';

  // ---------------------------------------------------------------- canvas
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  BH.isTouch = ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0) ||
    window.matchMedia('(pointer: coarse)').matches;

  const gameApi = {
    canvas: canvas,
    ctx: ctx,
    W: 0, H: 0, dpr: 1,
    current: null,
    setScene: function (name) {
      if (this.current && this.current.exit) this.current.exit();
      this.current = BH.scenes[name];
      if (this.current && this.current.enter) this.current.enter();
    },
  };
  BH.game = gameApi;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = window.innerWidth;
    const h = window.innerHeight;
    gameApi.W = w; gameApi.H = h; gameApi.dpr = dpr;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    if (BH.scenes.game && BH.scenes.game.world) BH.scenes.game._syncCam(true);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  // ---------------------------------------------------------------- audio
  BH.audio = (function () {
    let ac = null, master = null, enabled = true;
    function ensure() {
      if (ac) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { enabled = false; return; }
      ac = new AC();
      master = ac.createGain();
      master.gain.value = 0.22;
      master.connect(ac.destination);
    }
    function blip(freq, freq2, dur, type, vol) {
      if (!enabled) return;
      ensure();
      if (!ac) return;
      const t = ac.currentTime;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(1, freq2), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + dur + 0.02);
    }
    function noise(dur, vol) {
      if (!enabled) return;
      ensure();
      if (!ac) return;
      const t = ac.currentTime;
      const n = Math.floor(ac.sampleRate * dur);
      const buf = ac.createBuffer(1, n, ac.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = ac.createBufferSource();
      src.buffer = buf;
      const g = ac.createGain();
      g.gain.value = vol || 0.3;
      const f = ac.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = 900;
      src.connect(f); f.connect(g); g.connect(master);
      src.start(t);
    }
    const sounds = {
      shoot: function () { noise(0.12, 0.35); blip(320, 90, 0.10, 'square', 0.18); },
      thud: function () { blip(180, 80, 0.08, 'sawtooth', 0.2); },
      boar: function () { blip(140, 60, 0.28, 'sawtooth', 0.3); },
      hurt: function () { blip(240, 70, 0.22, 'square', 0.3); },
      load: function () { blip(420, 720, 0.14, 'triangle', 0.3); },
      reload: function () { blip(600, 300, 0.07, 'square', 0.2); },
      win: function () { blip(523, 523, 0.12, 'triangle', 0.3); setTimeout(function () { blip(659, 659, 0.12, 'triangle', 0.3); }, 130); setTimeout(function () { blip(784, 784, 0.2, 'triangle', 0.3); }, 260); },
      gameover: function () { blip(300, 120, 0.4, 'sawtooth', 0.3); },
    };
    return {
      unlock: function () { ensure(); if (ac && ac.state === 'suspended') ac.resume(); },
      play: function (name) { if (sounds[name]) sounds[name](); },
    };
  })();

  // ---------------------------------------------------------------- UI refs
  const $ = function (id) { return document.getElementById(id); };
  BH.ui.init({
    hud: $('hud'),
    healthFill: $('healthFill'),
    ammo: $('ammo'),
    counter: $('counter'),
    score: $('score'),
    timer: $('timer'),
    touch: $('touch'),
    menu: $('menu'),
    gameover: $('gameover'),
    levelcomplete: $('levelcomplete'),
    goStats: $('goStats'),
    lcStats: $('lcStats'),
    actionBtn: $('actionBtn'),
    toast: $('toast'),
  });

  BH.controls.init({
    stickZone: $('stickZone'),
    stickBase: $('stickBase'),
    stickKnob: $('stickKnob'),
    shootBtn: $('shootBtn'),
    reloadBtn: $('reloadBtn'),
    actionBtn: $('actionBtn'),
  });

  // ---------------------------------------------------------------- buttons
  $('playBtn').addEventListener('click', function () {
    BH.audio.unlock();
    BH.game.setScene('game');
  });
  $('restartBtn').addEventListener('click', function () {
    BH.audio.unlock();
    BH.scenes.game.restart();
  });
  $('replayBtn').addEventListener('click', function () {
    BH.audio.unlock();
    BH.scenes.game.restart();
  });
  const menuBtns = document.querySelectorAll('[data-menu]');
  for (let i = 0; i < menuBtns.length; i++) {
    menuBtns[i].addEventListener('click', function () { BH.game.setScene('menu'); });
  }

  // ---------------------------------------------------------------- loop
  let last = 0;
  function frame(now) {
    if (!last) last = now;
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05;   // clamp after tab-switches / long frames
    const scene = gameApi.current;
    if (scene) {
      if (scene.update) scene.update(dt);
      if (scene.render) scene.render(ctx);
    }
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- start
  resize();
  BH.game.setScene('boot');
  requestAnimationFrame(frame);

  // ---------------------------------------------------------------- PWA / SW
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function (err) {
        console.warn('SW registration failed:', err);
      });
    });
  }
})(window.BH);
