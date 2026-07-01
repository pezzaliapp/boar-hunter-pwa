/*
 * controls.js — unified input for desktop (WASD / arrows + Space/J shoot,
 * R reload, E action) and mobile (left virtual joystick, right shoot button,
 * reload button, contextual action button).
 *
 * Exposes a per-frame snapshot on BH.controls.state:
 *   moveX, moveY : screen-space movement vector (-1..1)
 *   shoot        : held (boolean)
 *   reloadEdge   : true for one frame when reload is requested
 *   actionEdge   : true for one frame when the action button/E is pressed
 */
window.BH = window.BH || {};
(function (BH) {
  'use strict';

  const U = BH.util;

  const state = {
    moveX: 0, moveY: 0,
    shoot: false,
    reloadEdge: false,
    actionEdge: false,
  };

  const keys = {};
  let reloadQueued = false;
  let actionQueued = false;

  // joystick runtime
  const stick = { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0, max: 46 };

  function initKeyboard() {
    window.addEventListener('keydown', function (e) {
      const k = e.key.toLowerCase();
      keys[k] = true;
      if (k === ' ' || k === 'j') { state.shoot = true; e.preventDefault(); }
      if (k === 'r') reloadQueued = true;
      if (k === 'e' || k === 'f') actionQueued = true;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].indexOf(k) >= 0) e.preventDefault();
    });
    window.addEventListener('keyup', function (e) {
      const k = e.key.toLowerCase();
      keys[k] = false;
      if (k === ' ' || k === 'j') state.shoot = false;
    });
    // safety: drop keys when the tab loses focus
    window.addEventListener('blur', function () {
      for (const k in keys) keys[k] = false;
      state.shoot = false;
    });
  }

  function initTouch(els) {
    const zone = els.stickZone;
    const knob = els.stickKnob;
    const base = els.stickBase;

    function setKnob(dx, dy) {
      knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    }

    zone.addEventListener('pointerdown', function (e) {
      stick.active = true;
      stick.id = e.pointerId;
      const r = zone.getBoundingClientRect();
      // anchor the joystick where the finger lands
      stick.ox = e.clientX;
      stick.oy = e.clientY;
      base.style.left = (e.clientX - r.left) + 'px';
      base.style.top = (e.clientY - r.top) + 'px';
      base.style.opacity = '1';
      setKnob(0, 0);
      zone.setPointerCapture(e.pointerId);
    });
    zone.addEventListener('pointermove', function (e) {
      if (!stick.active || e.pointerId !== stick.id) return;
      let dx = e.clientX - stick.ox;
      let dy = e.clientY - stick.oy;
      const len = Math.hypot(dx, dy);
      if (len > stick.max) { dx = dx / len * stick.max; dy = dy / len * stick.max; }
      stick.dx = dx / stick.max;
      stick.dy = dy / stick.max;
      setKnob(dx, dy);
    });
    const end = function (e) {
      if (e.pointerId !== stick.id) return;
      stick.active = false; stick.dx = 0; stick.dy = 0;
      base.style.opacity = '0';
      setKnob(0, 0);
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);

    // shoot button (hold)
    const sb = els.shootBtn;
    sb.addEventListener('pointerdown', function (e) { state.shoot = true; e.preventDefault(); });
    const stopShoot = function (e) { state.shoot = false; e.preventDefault(); };
    sb.addEventListener('pointerup', stopShoot);
    sb.addEventListener('pointercancel', stopShoot);
    sb.addEventListener('pointerleave', stopShoot);

    // reload button
    els.reloadBtn.addEventListener('pointerdown', function (e) { reloadQueued = true; e.preventDefault(); });

    // action button (contextual)
    els.actionBtn.addEventListener('pointerdown', function (e) { actionQueued = true; e.preventDefault(); });
  }

  BH.controls = {
    state: state,
    init: function (els) {
      initKeyboard();
      if (els) initTouch(els);
    },
    // Build the per-frame snapshot; call once at the top of each update.
    sample: function () {
      let mx = 0, my = 0;
      if (keys['a'] || keys['arrowleft']) mx -= 1;
      if (keys['d'] || keys['arrowright']) mx += 1;
      if (keys['w'] || keys['arrowup']) my -= 1;
      if (keys['s'] || keys['arrowdown']) my += 1;
      if (mx !== 0 || my !== 0) {
        const n = U.norm(mx, my); mx = n.x; my = n.y;
      }
      // joystick overrides keyboard when engaged
      if (stick.active && (stick.dx !== 0 || stick.dy !== 0)) {
        mx = stick.dx; my = stick.dy;
      }
      state.moveX = mx;
      state.moveY = my;

      state.reloadEdge = reloadQueued; reloadQueued = false;
      state.actionEdge = actionQueued; actionQueued = false;
      return state;
    },
  };
})(window.BH);
