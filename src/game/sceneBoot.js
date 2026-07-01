/*
 * sceneBoot.js — brief boot/splash while the world warms up, then hands off
 * to the menu. All art is procedural, so there is nothing heavy to preload;
 * the short delay just gives a clean startup beat.
 */
window.BH = window.BH || {};
(function (BH) {
  'use strict';

  BH.scenes = BH.scenes || {};

  BH.scenes.boot = {
    t: 0,
    enter: function () {
      this.t = 0;
      BH.ui.showHud(false);
      BH.ui.showTouch(false);
      BH.ui.showMenu(false);
      BH.ui.showGameOver(false);
      BH.ui.showLevelComplete(false);
    },
    update: function (dt) {
      this.t += dt;
      if (this.t > 0.6) BH.game.setScene('menu');
    },
    render: function (ctx) {
      const W = BH.game.W, H = BH.game.H;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#20402a');
      g.addColorStop(1, '#12241a');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = '#e8792b';
      ctx.font = '600 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Boar Hunter', W / 2, H / 2 - 6);

      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '13px system-ui, sans-serif';
      const dots = '.'.repeat(1 + (Math.floor(this.t * 4) % 3));
      ctx.fillText('Caricamento' + dots, W / 2, H / 2 + 18);
      ctx.textAlign = 'left';
    },
  };
})(window.BH);
