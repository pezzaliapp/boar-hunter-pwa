/*
 * ui.js — thin wrapper over the DOM HUD and full-screen overlays
 * (menu, game over, level complete) plus the contextual action prompt
 * and transient toast messages. Keeping UI in the DOM makes it crisp and
 * tappable on iPhone instead of hit-testing rectangles on the canvas.
 */
window.BH = window.BH || {};
(function (BH) {
  'use strict';

  const cfg = BH.config;
  let el = {};
  let toastT = 0;

  BH.ui = {
    init: function (refs) { el = refs; },

    // ---- HUD ----
    setHealth: function (hp) {
      const pct = Math.max(0, hp) / cfg.player.maxHealth * 100;
      el.healthFill.style.width = pct + '%';
      el.healthFill.style.background =
        pct > 50 ? '#5fbf5a' : (pct > 25 ? '#e0a63a' : '#d84b4b');
    },
    setAmmo: function (ammo, mag, reloading) {
      if (reloading) { el.ammo.textContent = '⟳ ...'; return; }
      let s = '';
      for (let i = 0; i < mag; i++) s += i < ammo ? '▮' : '▯';
      el.ammo.textContent = s;
    },
    setCounter: function (loaded, goal) {
      el.counter.textContent = '🐗 ' + loaded + ' / ' + goal;
    },

    // ---- contextual action button ("Carica sulla jeep", ecc.) ----
    showPrompt: function (label) {
      el.actionBtn.textContent = label;
      el.actionBtn.classList.add('show');
    },
    hidePrompt: function () {
      el.actionBtn.classList.remove('show');
    },

    // ---- toast ----
    toast: function (msg) {
      el.toast.textContent = msg;
      el.toast.classList.add('show');
      toastT = 1.8;
    },
    tick: function (dt) {
      if (toastT > 0) {
        toastT -= dt;
        if (toastT <= 0) el.toast.classList.remove('show');
      }
    },

    // ---- overlays ----
    showHud: function (show) { el.hud.style.display = show ? 'flex' : 'none'; },
    showTouch: function (show) { el.touch.style.display = show ? 'block' : 'none'; },
    showMenu: function (show) { el.menu.style.display = show ? 'flex' : 'none'; },
    showGameOver: function (show) { el.gameover.style.display = show ? 'flex' : 'none'; },
    showLevelComplete: function (show) { el.levelcomplete.style.display = show ? 'flex' : 'none'; },
  };
})(window.BH);
