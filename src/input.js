// Keyboard + touch input. Produces a move vector and one-shot action edges
// that the main loop copies into the sim. A is left on screen, D is right.

export class Input {
  constructor(root) {
    this.keys = new Set();
    this.edges = {};
    this.stick = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };
    this.touchSprint = false;
    this.listeners = [];
    this.root = root;
    this.onKey = null; // ui hook: return true to swallow
    window.addEventListener('keydown', (e) => this.down(e));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    this.mouse = null; // last mouse position over the game view, CSS pixels
    const view = document.getElementById('view');
    if (view) {
      view.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'mouse') this.mouse = { x: e.clientX, y: e.clientY };
      });
      // left click attacks toward the cursor (fires a gun if you hold one)
      view.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        this.mouse = { x: e.clientX, y: e.clientY };
        this.edges.strike = true;
        this.edges.aim = { x: e.clientX, y: e.clientY };
        e.preventDefault();
      });
      view.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    this.setupTouch();
  }

  down(e) {
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (this.onKey && this.onKey(e)) {
      e.preventDefault();
      return;
    }
    if (e.repeat) {
      this.keys.add(e.code);
      return;
    }
    this.keys.add(e.code);
    const map = {
      KeyE: 'interact', Enter: 'interact', KeyF: 'strike', KeyJ: 'strike', Space: 'strike', KeyQ: 'drop', KeyR: 'use', KeyG: 'use',
    };
    const a = map[e.code];
    if (a) {
      this.edges[a] = true;
      e.preventDefault();
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
  }

  move() {
    let x = 0;
    let y = 0;
    const k = this.keys;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (k.has('KeyW') || k.has('ArrowUp')) y -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y += 1;
    let sprint = k.has('ShiftLeft') || k.has('ShiftRight');
    if (this.stick.active) {
      const dx = this.stick.x - this.stick.ox;
      const dy = this.stick.y - this.stick.oy;
      const max = 46;
      const d = Math.hypot(dx, dy);
      if (d > 6) {
        const m = Math.min(1, d / max);
        x = (dx / d) * m;
        y = (dy / d) * m;
        if (d > max * 1.05 || this.touchSprint) sprint = true;
      }
    }
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y, sprint, hand: k.has('Space') || this.touchHand };
  }

  take() {
    const e = this.edges;
    this.edges = {};
    return e;
  }

  press(action) {
    this.edges[action] = true;
  }

  setupTouch() {
    const zone = document.getElementById('stickzone');
    const base = document.getElementById('stickbase');
    const knob = document.getElementById('stickknob');
    if (!zone) return;
    const show = () => {
      base.style.display = this.stick.active ? 'block' : 'none';
      if (!this.stick.active) return;
      base.style.left = `${this.stick.ox}px`;
      base.style.top = `${this.stick.oy}px`;
      const dx = this.stick.x - this.stick.ox;
      const dy = this.stick.y - this.stick.oy;
      const d = Math.hypot(dx, dy);
      const m = Math.min(d, 46);
      const kx = d ? (dx / d) * m : 0;
      const ky = d ? (dy / d) * m : 0;
      knob.style.transform = `translate(${kx}px, ${ky}px)`;
    };
    zone.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      document.body.classList.add('touch');
      this.stick = { active: true, id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
      zone.setPointerCapture(e.pointerId);
      show();
      e.preventDefault();
    });
    zone.addEventListener('pointermove', (e) => {
      if (!this.stick.active || e.pointerId !== this.stick.id) return;
      this.stick.x = e.clientX;
      this.stick.y = e.clientY;
      show();
    });
    const end = (e) => {
      if (e.pointerId !== this.stick.id) return;
      this.stick.active = false;
      show();
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
    for (const btn of document.querySelectorAll('[data-act]')) {
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const act = btn.dataset.act;
        if (act === 'back') this.touchHand = true;
        if (act === 'sprint') {
          this.touchSprint = !this.touchSprint;
          btn.classList.toggle('on', this.touchSprint);
        } else this.press(act);
      });
    }
    for (const btn of document.querySelectorAll('[data-act="back"]')) {
      const up = () => (this.touchHand = false);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('pointerleave', up);
    }
    window.addEventListener('touchstart', () => document.body.classList.add('touch'), { once: true, passive: true });
  }
}
