// Step-by-step character creator: you, body, face, hair, outfit, extras and a
// background. The same screen doubles as the wardrobe at home (look only).

import { $, el, hiCanvas } from './dom.js';
import { drawPerson } from '../view/people.js';
import { SKIN, HAIR_COLORS, EYE_COLORS, CLOTH, DENIM, SHOE_COLORS, LIP_COLORS, OPTIONS, ORIGINS, ALLOC_POINTS, ALLOC_STATS, ALLOC_MAX, ALLOC_STEP, MORE_NAMES, randomLook } from '../data/looks.js';
import { NAMES_PLAYER } from '../data/lines.js';
import { makePlayer } from '../sim/actors.js';

const NAMES = [...NAMES_PLAYER, ...MORE_NAMES];

const pick = (a) => a[Math.floor(Math.random() * a.length)];

const BODY_KEYS = ['skin', 'build', 'height', 'age', 'face', 'eyes', 'eyeColor', 'brows', 'nose', 'mouth', 'freckles', 'scar'];

// Row specs. thumb: 'head' or 'body' draws a little preview for each choice.
const R = {
  age: { label: 'Age', key: 'age', opts: OPTIONS.age },
  skin: { label: 'Skin tone', key: 'skin', colors: SKIN, custom: true },
  build: { label: 'Build', key: 'build', opts: OPTIONS.build, thumb: 'body' },
  height: { label: 'Height', key: 'height', range: [0.9, 1.1, 0.01] },
  face: { label: 'Face shape', key: 'face', opts: OPTIONS.face, thumb: 'head' },
  eyes: { label: 'Eyes', key: 'eyes', opts: OPTIONS.eyes, thumb: 'head' },
  eyeColor: { label: 'Eye color', key: 'eyeColor', colors: EYE_COLORS, custom: true },
  brows: { label: 'Brows', key: 'brows', opts: OPTIONS.brows, thumb: 'head' },
  nose: { label: 'Nose', key: 'nose', opts: OPTIONS.nose, thumb: 'head' },
  mouth: { label: 'Expression', key: 'mouth', opts: OPTIONS.mouth, thumb: 'head' },
  makeup: { label: 'Makeup', key: 'makeup', opts: OPTIONS.makeup },
  lipColor: { label: 'Lip color', key: 'lipColor', colors: LIP_COLORS, custom: true, when: (L) => L.makeup === 'lipstick' || L.makeup === 'both' },
  freckles: { label: 'Freckles', key: 'freckles', opts: OPTIONS.freckles },
  scar: { label: 'Scar', key: 'scar', opts: OPTIONS.scar },
  hair: { label: 'Style', key: 'hair', opts: OPTIONS.hair, thumb: 'head' },
  hairColor: { label: 'Hair color', key: 'hairColor', colors: HAIR_COLORS, custom: true, also: 'beardColor' },
  hair2: { label: 'Highlights', key: 'hair2', colors: [null, ...HAIR_COLORS], custom: true, when: (L) => L.hair !== 'bald' && L.hair !== 'buzz' },
  beard: { label: 'Facial hair', key: 'beard', opts: OPTIONS.beard, thumb: 'head' },
  beardColor: { label: 'Beard color', key: 'beardColor', colors: HAIR_COLORS, custom: true, when: (L) => L.beard !== 'none' },
  top: { label: 'Top', key: 'top', opts: OPTIONS.top, thumb: 'body' },
  topColor: { label: 'Top color', key: 'topColor', colors: CLOTH, custom: true },
  pattern: { label: 'Print', key: 'pattern', opts: OPTIONS.pattern, thumb: 'body' },
  top2: { label: 'Accent color', key: 'top2', colors: CLOTH, custom: true },
  outer: { label: 'Outerwear', key: 'outer', opts: OPTIONS.outer, thumb: 'body' },
  outerColor: { label: 'Outer color', key: 'outerColor', colors: [...CLOTH, ...DENIM.slice(0, 5)], custom: true, when: (L) => L.outer !== 'none' },
  bottom: { label: 'Bottoms', key: 'bottom', opts: OPTIONS.bottom, thumb: 'body', when: (L) => L.top !== 'dress' },
  bottomColor: { label: 'Bottoms color', key: 'bottomColor', colors: [...DENIM, ...CLOTH], custom: true, when: (L) => L.top !== 'dress' },
  shoeStyle: { label: 'Shoes', key: 'shoeStyle', opts: OPTIONS.shoeStyle },
  shoes: { label: 'Shoe color', key: 'shoes', colors: SHOE_COLORS, custom: true },
  hat: { label: 'Hat', key: 'hat', opts: OPTIONS.hat, thumb: 'head' },
  hatColor: { label: 'Hat color', key: 'hatColor', colors: CLOTH, custom: true, when: (L) => !!L.hat },
  glasses: { label: 'Glasses', key: 'glasses', opts: OPTIONS.glasses, thumb: 'head' },
  earrings: { label: 'Earrings', key: 'earrings', opts: OPTIONS.earrings },
  chain: { label: 'Chain', key: 'chain', opts: OPTIONS.chain },
  watch: { label: 'Watch', key: 'watch', opts: OPTIONS.watch },
  backpack: { label: 'Backpack', key: 'backpack', opts: OPTIONS.backpack },
  packColor: { label: 'Pack color', key: 'packColor', colors: CLOTH, custom: true, when: (L) => !!L.backpack },
  tattoo: { label: 'Tattoo', key: 'tattoo', opts: OPTIONS.tattoo },
};

const TABS = [
  { id: 'who', name: 'You', zoom: 0, rows: ['name', 'day', R.age] },
  { id: 'body', name: 'Body', zoom: 0, rows: [R.skin, R.build, R.height] },
  { id: 'face', name: 'Face', zoom: 1, rows: [R.face, R.eyes, R.eyeColor, R.brows, R.nose, R.mouth, R.makeup, R.lipColor, R.freckles, R.scar] },
  { id: 'hair', name: 'Hair', zoom: 1, rows: [R.hair, R.hairColor, R.hair2, R.beard, R.beardColor] },
  { id: 'outfit', name: 'Outfit', zoom: 0, rows: [R.top, R.topColor, R.pattern, R.top2, R.outer, R.outerColor, R.bottom, R.bottomColor, R.shoeStyle, R.shoes] },
  { id: 'extras', name: 'Extras', zoom: 0.55, rows: [R.hat, R.hatColor, R.glasses, R.earrings, R.chain, R.watch, R.backpack, R.packColor, R.tattoo] },
  { id: 'story', name: 'Background', zoom: 0, rows: ['origin', 'alloc'] },
];
const WARDROBE_TABS = ['hair', 'outfit', 'extras'];

const POSES = [['stand', 'Idle'], ['walk', 'Walk'], ['run', 'Run'], ['sit', 'Sit'], ['guard', 'Fight']];
const FACES = ['down', 'right', 'up', 'left'];

function clean(look) {
  const out = {};
  for (const k in look) if (k[0] !== '_') out[k] = look[k];
  return out;
}

function backdrop(w, h) {
  const [c, x] = hiCanvas(w, h);
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#2a2030');
  g.addColorStop(0.68, '#3b2b30');
  g.addColorStop(0.68, '#4a4448');
  g.addColorStop(1, '#2b282c');
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  // brick courses on the wall
  x.strokeStyle = 'rgba(0,0,0,0.18)';
  x.lineWidth = 1;
  for (let y = 8, row = 0; y < h * 0.68; y += 12, row++) {
    x.beginPath();
    x.moveTo(0, y);
    x.lineTo(w, y);
    x.stroke();
    for (let bx = (row % 2) * 14; bx < w; bx += 28) {
      x.beginPath();
      x.moveTo(bx, y);
      x.lineTo(bx, y + 12);
      x.stroke();
    }
  }
  // neon glow and a sidewalk seam
  const n = x.createRadialGradient(w * 0.5, h * 0.18, 4, w * 0.5, h * 0.2, w * 0.7);
  n.addColorStop(0, 'rgba(255,93,143,0.38)');
  n.addColorStop(1, 'rgba(255,93,143,0)');
  x.fillStyle = n;
  x.fillRect(0, 0, w, h);
  x.font = '900 22px Impact, Arial Black, sans-serif';
  x.textAlign = 'center';
  x.shadowColor = '#ff5d8f';
  x.shadowBlur = 14;
  x.fillStyle = '#ffe3ec';
  x.fillText('H-TOWN', w * 0.5, h * 0.17);
  x.shadowBlur = 0;
  x.fillStyle = 'rgba(255,255,255,0.06)';
  for (let sx = -20; sx < w; sx += 64) x.fillRect(sx, h * 0.68, 2, h);
  const v = x.createRadialGradient(w / 2, h * 0.6, h * 0.2, w / 2, h * 0.6, h * 0.8);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.55)');
  x.fillStyle = v;
  x.fillRect(0, 0, w, h);
  return c;
}

// opts: { mode: 'new' | 'rebirth' | 'wardrobe', look, name, dayLen, onDone(result), onBack }
export function openCreator(ui, opts) {
  const box = $('create');
  box.classList.remove('hidden');
  box.innerHTML = '';
  const wardrobe = opts.mode === 'wardrobe';
  const tabs = wardrobe ? TABS.filter((t) => WARDROBE_TABS.includes(t.id)) : TABS;
  const st = {
    look: opts.look ? { ...randomLook(), ...clean(opts.look) } : randomLook(),
    name: opts.name || pick(NAMES), dayLen: opts.dayLen || 600, origin: 'newcomer',
    alloc: Object.fromEntries(ALLOC_STATS.map(([k]) => [k, 0])), tab: 0,
    pose: 'stand', angle: 0, zoom: tabs[0].zoom, open: true,
  };
  if (st.look.glasses === true) st.look.glasses = 'square';
  const before = JSON.stringify(st.look);

  // ---- preview
  const PW = 300;
  const PH = 380;
  const [prev, pc] = hiCanvas(PW, PH, 'cprev');
  const bg = backdrop(PW, PH);
  let drag = null;
  prev.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, a: st.angle };
    prev.setPointerCapture(e.pointerId);
  });
  prev.addEventListener('pointermove', (e) => {
    if (drag) st.angle = drag.a - (e.clientX - drag.x) / 60;
  });
  prev.addEventListener('pointerup', () => {
    if (drag) st.angle = Math.round(st.angle);
    drag = null;
  });
  const turn = (d) => () => (st.angle = Math.round(st.angle) + d);
  const poseBtns = POSES.map(([id, label]) => el('button', { class: `chip${st.pose === id ? ' on' : ''}`, onclick: () => {
    st.pose = id;
    for (const b of poseBtns) b.classList.toggle('on', b.dataset.p === id);
  }, 'data-p': id }, label));

  const draw = (now) => {
    const t = now / 1000;
    const ctx = pc;
    ctx.save();
    ctx.clearRect(0, 0, PW, PH);
    ctx.drawImage(bg, 0, 0, PW, PH);
    const target = tabs[st.tab].zoom;
    const dt = Math.min(0.5, Math.max(0, t - (st.lastT || t)));
    st.lastT = t;
    st.zoom += (target - st.zoom) * Math.min(1, dt * 9);
    const z = st.zoom;
    const scale = 4.4 + z * 5.2;
    const feetY = 352 + z * (175 + 38.5 * 9.6 - 352);
    const face = FACES[((Math.round(st.angle) % 4) + 4) % 4];
    const pose = st.pose;
    const moving = pose === 'walk' || pose === 'run';
    ctx.translate(PW / 2, feetY);
    ctx.scale(scale, scale);
    if (pose === 'sit') {
      ctx.fillStyle = '#5a4030';
      ctx.fillRect(-11, -8.5, 22, 3);
      ctx.fillStyle = '#3a2a1e';
      ctx.fillRect(-10, -5.5, 2, 5.5);
      ctx.fillRect(8, -5.5, 2, 5.5);
    }
    drawPerson(ctx, st.look, {
      face, pose: pose === 'walk' || pose === 'guard' ? 'stand' : pose, t, moving, phase: t * (pose === 'run' ? 14 : 8),
      guard: pose === 'guard', blink: t % 4 < 0.12,
    });
    ctx.restore();
  };

  // ---- panel
  const panel = el('div', { class: 'cpanel' });
  const tabBar = el('div', { class: 'ctabs' });
  let updaters = [];
  const changed = () => {
    for (const u of updaters) u();
  };
  const setVal = (row, v) => {
    if (row.also && st.look[row.also] === st.look[row.key]) st.look[row.also] = v;
    st.look[row.key] = v;
    if (row.key === 'top' && v === 'jersey' && st.look.pattern === 'none') st.look.pattern = 'number';
    changed();
  };

  const thumbFor = (row, val) => {
    const head = row.thumb === 'head';
    const w = 50;
    const h = head ? 50 : 66;
    const [c, x] = hiCanvas(w, h, 'cthumb');
    const paint = () => {
      x.clearRect(0, 0, w, h);
      const look = { ...st.look, [row.key]: val };
      if (row.key === 'beard' && val !== 'none' && look.beardColor === look.skin) look.beardColor = look.hairColor;
      x.save();
      if (head) {
        x.translate(w / 2, h / 2 + 38.5 * 2.9 + 3);
        x.scale(2.9, 2.9);
      } else {
        x.translate(w / 2, h - 3);
        x.scale(1.38, 1.38);
      }
      drawPerson(x, look, { face: 'down', pose: 'stand', t: 0, noShadow: !head ? false : true });
      x.restore();
    };
    paint();
    return [c, paint];
  };

  const optRow = (row) => {
    const wrap = el('div', { class: `crow${row.thumb ? ' thumbs' : ''}` }, el('div', { class: 'clabel' }, row.label));
    const list = el('div', { class: 'copts' });
    const items = [];
    for (const [val, label] of row.opts) {
      let paint = null;
      const b = el('button', { class: row.thumb ? 'ctile' : 'copt', title: label, onclick: () => setVal(row, val) });
      if (row.thumb) {
        const [cv, p] = thumbFor(row, val);
        paint = p;
        b.append(cv, el('span', {}, label));
      } else b.append(label);
      items.push({ b, val, paint });
      list.append(b);
    }
    wrap.append(list);
    let lastSig = '';
    updaters.push(() => {
      for (const it of items) it.b.classList.toggle('on', st.look[row.key] === it.val);
      if (row.when) wrap.classList.toggle('hidden', !row.when(st.look));
      if (row.thumb) {
        const sig = JSON.stringify(st.look);
        if (sig !== lastSig) {
          lastSig = sig;
          for (const it of items) it.paint();
        }
      }
    });
    return wrap;
  };

  const colorRow = (row) => {
    const wrap = el('div', { class: 'crow' }, el('div', { class: 'clabel' }, row.label));
    const list = el('div', { class: 'copts' });
    const items = [];
    for (const col of row.colors) {
      const b = el('button', { class: `csw${col ? '' : ' none'}`, style: col ? `background:${col}` : '', title: col || 'None', onclick: () => setVal(row, col) });
      items.push({ b, col });
      list.append(b);
    }
    let custom = null;
    if (row.custom) {
      custom = el('input', { type: 'color', class: 'ccustom', title: 'Pick any color' });
      custom.addEventListener('input', () => setVal(row, custom.value));
      list.append(custom);
    }
    wrap.append(list);
    updaters.push(() => {
      const v = st.look[row.key];
      let hit = false;
      for (const it of items) {
        const on = it.col === v || (it.col && v && it.col.toLowerCase() === String(v).toLowerCase());
        it.b.classList.toggle('on', on);
        hit = hit || on;
      }
      if (custom) {
        custom.classList.toggle('on', !hit && !!v);
        if (v && /^#[0-9a-f]{6}$/i.test(v) && document.activeElement !== custom) custom.value = v;
      }
      if (row.when) wrap.classList.toggle('hidden', !row.when(st.look));
    });
    return wrap;
  };

  const rangeRow = (row) => {
    const [lo, hi, step] = row.range;
    const input = el('input', { type: 'range', min: lo, max: hi, step, value: st.look[row.key] ?? 1 });
    const out = el('span', { class: 'cval' });
    input.addEventListener('input', () => setVal(row, Number(input.value)));
    updaters.push(() => {
      const v = st.look[row.key] ?? 1;
      input.value = v;
      const inches = Math.round(67 * v);
      out.textContent = `${Math.floor(inches / 12)}′${inches % 12}″`;
    });
    return el('div', { class: 'crow' }, el('div', { class: 'clabel' }, row.label), el('div', { class: 'copts range' }, input, out));
  };

  const nameRow = () => {
    const input = el('input', { type: 'text', value: st.name, maxlength: 16, class: 'cname', placeholder: 'Name' });
    input.addEventListener('input', () => (st.name = input.value));
    const dice = el('button', { class: 'copt', title: 'Random name', onclick: () => {
      st.name = pick(NAMES);
      input.value = st.name;
    } }, '🎲');
    return el('div', { class: 'crow' }, el('div', { class: 'clabel' }, 'Name'), el('div', { class: 'copts' }, input, dice));
  };

  const dayRow = () => {
    const sel = el('select', { class: 'csel' }, ...[[480, '8 min — fast'], [600, '10 min'], [720, '12 min — relaxed']].map(([v, l]) => el('option', { value: v, selected: st.dayLen === v ? 'selected' : null }, l)));
    sel.addEventListener('change', () => (st.dayLen = Number(sel.value)));
    return el('div', { class: 'crow' }, el('div', { class: 'clabel' }, 'One day lasts'), el('div', { class: 'copts' }, sel));
  };

  const BASE = makePlayer('x', {}).stats;
  const finalStat = (k) => {
    const O = ORIGINS[st.origin];
    return Math.max(1, Math.min(100, BASE[k] + ((O.stats && O.stats[k]) || 0) + (st.alloc[k] || 0) * ALLOC_STEP));
  };
  const originRow = () => {
    const grid = el('div', { class: 'origins' });
    const cards = [];
    for (const id in ORIGINS) {
      const O = ORIGINS[id];
      const b = el('button', { class: 'origin', onclick: () => {
        st.origin = id;
        changed();
      } }, el('b', {}, O.name), el('p', {}, O.blurb), el('ul', {}, ...O.perks.map((x) => el('li', {}, x))), el('small', {}, `Starts with $${O.cash}`));
      cards.push({ b, id });
      grid.append(b);
    }
    updaters.push(() => {
      for (const c of cards) c.b.classList.toggle('on', c.id === st.origin);
    });
    return el('div', { class: 'crow col' }, el('div', { class: 'clabel' }, 'Where you come from'), grid);
  };
  const allocRow = () => {
    const left = el('b', {});
    const rows = [];
    const list = el('div', { class: 'alloc' });
    const used = () => Object.values(st.alloc).reduce((a, b) => a + b, 0);
    for (const [k, label] of [...ALLOC_STATS, ['reputation', 'Reputation']]) {
      const fixed = k === 'reputation';
      const pips = el('div', { class: 'pips' });
      for (let i = 0; i < ALLOC_MAX; i++) pips.append(el('i', {}));
      const val = el('span', { class: 'cval' });
      const minus = el('button', { class: 'copt', onclick: () => {
        if (st.alloc[k] > 0) st.alloc[k]--;
        changed();
      } }, '−');
      const plus = el('button', { class: 'copt', onclick: () => {
        if (st.alloc[k] < ALLOC_MAX && used() < ALLOC_POINTS) st.alloc[k]++;
        changed();
      } }, '+');
      list.append(el('div', { class: 'arow' }, el('span', { class: 'aname' }, label), fixed ? el('span', { class: 'afixed' }, 'from your background') : el('span', { class: 'actl' }, minus, pips, plus), val));
      rows.push({ k, pips, val, fixed });
    }
    updaters.push(() => {
      left.textContent = String(ALLOC_POINTS - used());
      for (const r of rows) {
        r.val.textContent = String(finalStat(r.k));
        if (!r.fixed) [...r.pips.children].forEach((p, i) => p.classList.toggle('on', i < st.alloc[r.k]));
      }
    });
    return el('div', { class: 'crow col' }, el('div', { class: 'clabel' }, 'Points to spend: ', left, ` (each adds ${ALLOC_STEP})`), list);
  };

  const renderTab = () => {
    updaters = [];
    panel.innerHTML = '';
    const tab = tabs[st.tab];
    for (const row of tab.rows) {
      if (row === 'name') panel.append(nameRow());
      else if (row === 'day') panel.append(dayRow());
      else if (row === 'origin') panel.append(originRow());
      else if (row === 'alloc') panel.append(allocRow());
      else if (row.opts) panel.append(optRow(row));
      else if (row.colors) panel.append(colorRow(row));
      else if (row.range) panel.append(rangeRow(row));
    }
    tabs.forEach((t, i) => tabBtns[i].classList.toggle('on', i === st.tab));
    nextBtn.classList.toggle('hidden', st.tab === tabs.length - 1);
    panel.scrollTop = 0;
    changed();
  };
  const tabBtns = tabs.map((t, i) => el('button', { class: 'ctab', onclick: () => {
    st.tab = i;
    renderTab();
  } }, el('i', {}, String(i + 1)), t.name));
  tabBar.append(...tabBtns);

  const close = () => {
    st.open = false;
    box.classList.add('hidden');
    box.innerHTML = '';
  };
  const finish = () => {
    const look = clean(st.look);
    if (!look.hair2) delete look.hair2;
    close();
    if (wardrobe) opts.onDone({ look, changed: JSON.stringify(st.look) !== before });
    else opts.onDone({ name: st.name.trim() || 'Marcus', look, dayLen: st.dayLen, origin: st.origin, alloc: { ...st.alloc } });
  };
  const nextBtn = el('button', { onclick: () => {
    st.tab = Math.min(tabs.length - 1, st.tab + 1);
    renderTab();
  } }, 'Next →');
  const dice = el('button', { onclick: () => {
    const keep = wardrobe ? Object.fromEntries(BODY_KEYS.map((k) => [k, st.look[k]])) : null;
    const fresh = randomLook(Math.random, keep);
    if (wardrobe) for (const k of ['makeup', 'lipColor']) fresh[k] = st.look[k];
    st.look = fresh;
    changed();
  } }, '🎲 Randomize');
  const backBtn = opts.onBack ? el('button', { onclick: () => {
    close();
    opts.onBack();
  } }, wardrobe ? 'Cancel' : 'Back') : null;
  const title = wardrobe ? 'Get dressed' : opts.mode === 'rebirth' ? 'A new life' : 'Who are you?';
  const sub = wardrobe ? 'Change your hair, clothes and extras. Free — it\'s your closet.'
    : opts.mode === 'rebirth' ? 'That life is over. The city keeps going — make someone new.'
      : 'Build your person step by step. Drag the preview to turn them around.';

  box.append(el('div', { class: 'creator' },
    el('div', { class: 'chead' }, el('div', {}, el('h2', {}, title), el('p', {}, sub)), tabBar),
    el('div', { class: 'cbody' },
      el('div', { class: 'cleft' }, prev,
        el('div', { class: 'cturn' }, el('button', { class: 'chip', onclick: turn(-1), title: 'Turn left' }, '⟲'), ...poseBtns, el('button', { class: 'chip', onclick: turn(1), title: 'Turn right' }, '⟳'))),
      panel),
    el('div', { class: 'cfoot' }, backBtn, dice, el('span', { class: 'grow' }), nextBtn,
      el('button', { class: 'primary', onclick: finish }, wardrobe ? 'Done' : 'Start your life')),
  ));
  renderTab();
  const anim = (now) => {
    if (!st.open) return;
    draw(now);
    requestAnimationFrame(anim);
  };
  requestAnimationFrame(anim);
  return { close };
}
