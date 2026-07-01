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
    setScore: function (score) {
      el.score.textContent = String(score).padStart(5, '0');
    },
    setTimer: function (elapsed, limit) {
      el.timer.textContent = fmtTime(elapsed);
      // turn amber then red as the time bonus window closes
      if (limit && elapsed > limit) el.timer.style.color = '#e05b5b';
      else if (limit && elapsed > limit * 0.75) el.timer.style.color = '#e0a63a';
      else el.timer.style.color = '#eef3ea';
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

    // ---- menu best score ----
    setMenuBest: function (best) {
      el.menuBest.textContent = best > 0
        ? '🏆 Record: ' + String(best).padStart(5, '0')
        : '';
    },

    // ---- overlays ----
    showHud: function (show) { el.hud.style.display = show ? 'flex' : 'none'; },
    showTouch: function (show) { el.touch.style.display = show ? 'block' : 'none'; },
    showMenu: function (show) { el.menu.style.display = show ? 'flex' : 'none'; },
    showGameOver: function (show) { el.gameover.style.display = show ? 'flex' : 'none'; },
    showLevelComplete: function (show) { el.levelcomplete.style.display = show ? 'flex' : 'none'; },

    // ---- result screen (win or lose) ----
    // Fills the stats block inside the matching overlay, then shows it.
    showResult: function (kind, data) {
      const win = kind === 'win';
      const box = win ? el.lcStats : el.goStats;
      const rows = [
        ['Punteggio finale', String(data.score).padStart(5, '0'), true],
        ['Tempo impiegato', fmtTime(data.time)],
        ['Cinghiali abbattuti', data.kills],
        ['Cinghiali caricati', data.loaded + ' / ' + data.goal],
        ['Precisione tiro', data.accuracy + '%'],
      ];
      if (win && data.timeBonus > 0) rows.push(['Bonus tempo', '+' + data.timeBonus]);
      rows.push(['🏆 Record', String(data.best || 0).padStart(5, '0')]);

      let html = '';
      if (data.isRecord) html += '<div class="record-badge">🏆 NUOVO RECORD!</div>';
      for (let i = 0; i < rows.length; i++) {
        const cls = rows[i][2] ? ' stat-row big' : ' stat-row';
        html += '<div class="' + cls + '"><span>' + rows[i][0] +
          '</span><b>' + rows[i][1] + '</b></div>';
      }
      box.innerHTML = html;

      if (win) this.showLevelComplete(true); else this.showGameOver(true);
    },
  };

  function fmtTime(s) {
    s = Math.max(0, Math.floor(s));
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return m + ':' + (ss < 10 ? '0' : '') + ss;
  }
})(window.BH);
