// DOM overlay: HUD, action menu, talk, modals, panels, title and character
// creation. Reads the sim and sends it commands; never changes rules itself.

import { ITEMS } from '../data/items.js';
import { SHOPS } from '../data/shops.js';
import { JOBS, FAVORS } from '../data/work.js';
import { PERSONALITIES } from '../data/personalities.js';
import { NAMES_PLAYER } from '../data/lines.js';
import { clock12, weekday, dayOf, money, clamp, tod } from '../sim/util.js';
import { cashOnBody, itemName } from '../sim/items.js';
import { capacity, carriedWeight, scratch } from '../sim/actors.js';
import { displayTag, summary, latest } from '../sim/memory.js';
import { odds } from '../sim/talk.js';
import { GOALS, goalText, progress } from '../sim/board.js';
import { drawItem } from '../view/sprites.js';
import { drawPortrait, drawPerson } from '../view/people.js';
import { drawCar } from '../view/sprites.js';
import { MODELS, CAR_COLORS, STALL_RENT } from '../data/cars.js';
import { LICENSES } from '../data/licenses.js';
import { FURNITURE } from '../data/rooms3.js';
import { CREWS } from '../data/crews.js';
import { coinPrice, GROW_MINUTES } from '../sim/economy.js';
import { LEASE_NAMES, RENT } from '../sim/money.js';

const $ = (id) => document.getElementById(id);

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const k in attrs) {
    const v = attrs[k];
    if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'html') e.innerHTML = v;
    else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid === null || kid === undefined || kid === false) continue;
    e.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return e;
}

function itemCanvas(def, px, it = null) {
  const c = document.createElement('canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = px * dpr;
  c.height = px * dpr;
  c.style.width = `${px}px`;
  c.style.height = `${px}px`;
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.translate(px / 2, px / 2);
  drawItem(ctx, def, px * 0.8, it);
  return c;
}

function portrait(look, px) {
  const c = document.createElement('canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = px * dpr;
  c.height = px * dpr;
  c.style.width = `${px}px`;
  c.style.height = `${px}px`;
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  drawPortrait(ctx, look, px);
  return c;
}

const TAG_COLOR = { friend: '#7be495', rival: '#ff6b5e', boss: '#ffd23f', crew: '#c792ff', neighbor: '#9fd3ff', stranger: '#cfc9bd' };
const BARS = [
  ['health', '❤', '#e05252'], ['mind', '◉', '#9b8cff'], ['stamina', '⚡', '#f2c14e'],
  ['hunger', '🍴', '#f28c38'], ['thirst', '💧', '#4fb3e8'],
];

export class UI {
  constructor(game) {
    this.g = game;
    this.panel = null;
    this.pauseOpen = false;
    this.feedItems = [];
    this.keys = { menu: '', dialog: '', modal: '', panel: '' };
    this.sel = null;
    this.drag = null;
    this.panelT = 0;
    this.hudCache = {};
    for (const b of document.querySelectorAll('[data-panel]')) b.addEventListener('click', () => this.togglePanel(b.dataset.panel));
    $('btn-pause').addEventListener('click', () => this.openPause());
    $('btn-home').addEventListener('click', () => {
      if (this.sim && this.sim.furniture.canArrangeHere()) this.sim.ui.modal = { type: 'home' };
    });
    window.addEventListener('pointermove', (e) => this.dragMove(e));
    window.addEventListener('pointerup', (e) => this.dragEnd(e));
  }

  get sim() {
    return this.g.sim;
  }

  blocking() {
    return !!this.panel || this.pauseOpen;
  }

  // ------------------------------------------------------------ keys
  key(e) {
    const sim = this.sim;
    if (!sim || !this.g.playing) return false;
    const c = e.code;
    if (this.drag && (c === 'KeyR')) {
      this.drag.rot = this.drag.rot ? 0 : 1;
      this.drawGhost();
      return true;
    }
    if (c === 'Escape') {
      if (this.drag) return true;
      if (sim.ui.arrange) {
        sim.cmd('arrange_cancel');
        return true;
      }
      if (this.pauseOpen) this.closePause();
      else if (this.panel) this.closePanel();
      else if (sim.dialog) sim.cmd('talk_close');
      else if (sim.ui.modal) sim.cmd('modal_close');
      else if (sim.ui.menu) sim.cmd('menu_close');
      else this.openPause();
      return true;
    }
    if (this.pauseOpen) return false;
    const panels = { KeyI: 'bag', Tab: 'bag', KeyP: 'people', KeyC: 'me', KeyB: 'board', KeyL: 'log' };
    if (panels[c] && !sim.dialog) {
      this.togglePanel(panels[c]);
      return true;
    }
    const digit = c.startsWith('Digit') ? Number(c.slice(5)) : c.startsWith('Numpad') ? Number(c.slice(6)) : NaN;
    if (!Number.isNaN(digit) && digit > 0) {
      const btns = sim.dialog ? $('dialog').querySelectorAll('.opts button') : sim.ui.menu ? $('menu').querySelectorAll('button.act') : sim.ui.modal ? $('modal').querySelectorAll('button.hot') : [];
      if (btns[digit - 1]) {
        btns[digit - 1].click();
        return true;
      }
    }
    if (sim.dialog && (c === 'KeyE' || c === 'Enter') && sim.dialog.done) {
      sim.cmd('talk_close');
      return true;
    }
    return false;
  }

  // ------------------------------------------------------------ per frame
  consume(sim) {
    for (const e of sim.events) {
      if (e.type === 'toast') this.toast(e.text, e.kind);
      else if (e.type === 'log') this.feed(e.text, e.kind);
      else if (e.type === 'rel' && Math.abs(e.d) >= 1) this.relPop(e);
    }
  }

  frame(dt) {
    const sim = this.sim;
    if (!sim) return;
    this.hud(sim);
    this.renderMenu(sim);
    this.renderDialog(sim);
    this.renderModal(sim);
    if (this.panel) {
      this.panelT += dt;
      if (this.panelT > 0.5) {
        this.panelT = 0;
        this.renderPanel(false);
      }
    }
    // feed fade
    const now = performance.now();
    for (const f of this.feedItems) {
      const age = (now - f.t) / 1000;
      f.el.style.opacity = age > 9 ? Math.max(0, 1 - (age - 9) / 2) : 1;
    }
    this.feedItems = this.feedItems.filter((f) => {
      if ((now - f.t) / 1000 > 11) {
        f.el.remove();
        return false;
      }
      return true;
    });
  }

  set(id, prop, val) {
    const k = id + prop;
    if (this.hudCache[k] === val) return;
    this.hudCache[k] = val;
    const e = $(id);
    if (prop === 'html') e.innerHTML = val;
    else e.textContent = val;
  }

  hud(sim) {
    const p = sim.player;
    const st = p.stats;
    let bars = '';
    for (const [k, icon, col] of BARS) {
      const v = Math.round(st[k]);
      const low = v < 20 ? ' low' : '';
      bars += `<div class="bar${low}" title="${k}"><i>${icon}</i><b><s style="width:${v}%;background:${col}"></s></b><em>${v}</em></div>`;
    }
    this.set('bars', 'html', bars);
    this.set('rep', 'html', `<span title="Reputation">★ ${Math.round(st.reputation)}</span>${p.heat > 0.5 ? `<span class="heat" title="Heat">🔥 ${Math.round(p.heat)}</span>` : ''}`);
    const wx = sim.weather;
    const m = tod(sim.s.t);
    const night = m < 360 || m > 1200;
    const icon = wx.rain > 0.3 ? '🌧' : wx.cloud > 0.62 ? '☁' : night ? '🌙' : '☀';
    const ff = sim.s.sleepUntil ? ' ⏩' : '';
    this.set('clock', 'html', `<b>${weekday(sim.s.t)} ${clock12(sim.s.t)}</b>${ff} <span>${icon}</span><small>Day ${dayOf(sim.s.t)}</small>`);
    this.set('money', 'html', `<b>${money(cashOnBody(sim, p))}</b> cash <small>Bank ${money(p.bank)}</small>`);
    // tracker
    const lines = [];
    const sh = sim.s.job.shift;
    if (sh) {
      const t = sim.work.currentTask();
      lines.push(`<div class="trk shift"><b>SHIFT ${sh.i + 1}/${sh.tasks.length}</b> ${t ? t.label : ''}<small>until ${clock12(sh.due)}</small></div>`);
    }
    for (const f of sim.s.favors) {
      if (f.status !== 'active') continue;
      const F = FAVORS[f.id];
      lines.push(`<div class="trk fav"><b>FAVOR</b> ${F.short}<small>${F.kind === 'quiet' ? 'midnight–6 AM' : 'by ' + clock12(f.due)}</small></div>`);
    }
    for (const g of sim.s.board.filter((q) => !q.done).slice(0, 2)) {
      const pr = progress(sim, g);
      lines.push(`<div class="trk goal"><b>GOAL</b> ${goalText(g)} <small>${Math.floor(pr.v)}/${g.n}</small></div>`);
    }
    this.set('tracker', 'html', lines.join(''));
    // prompt
    const t = sim.dialog || sim.ui.menu || sim.ui.modal ? null : sim.target();
    const touch = document.body.classList.contains('touch');
    let pr = '';
    if (t) {
      const verb = t.type === 'npc' ? `Talk to ${t.label}` : t.label;
      pr = `<kbd>${touch ? 'E' : 'E'}</kbd> ${verb}`;
    } else if (p.spot && !sim.s.sleepUntil) pr = '<kbd>WASD</kbd> stand up';
    this.set('prompt', 'html', pr);
    $('prompt').classList.toggle('show', !!pr);
    // hands
    const hit = p.hands && sim.s.items[p.hands];
    const hk = hit ? `${hit.def}:${hit.n || ''}` : '';
    if (this.hudCache.hands !== hk) {
      this.hudCache.hands = hk;
      const H = $('hands');
      H.innerHTML = '';
      if (hit) {
        const d = ITEMS[hit.def];
        const usable = ['food', 'drink', 'med', 'book'].includes(d.kind);
        H.append(itemCanvas(hit.def, 34, hit), el('div', {}, el('b', {}, itemName(hit)), el('small', {}, `${usable ? 'R use · ' : ''}Q drop`)));
      }
      H.classList.toggle('show', !!hit);
    }
    this.driveHud(sim);
    const canHome = sim.furniture.canArrangeHere();
    if (this.hudCache.home !== canHome) {
      this.hudCache.home = canHome;
      $('btn-home').classList.toggle('hidden', !canHome);
    }
    // task progress
    const task = scratch(p).task;
    const tb = $('taskbar');
    if (task) {
      tb.classList.remove('hidden');
      tb.querySelector('.fill').style.width = `${(task.t / task.dur) * 100}%`;
      tb.querySelector('span').textContent = task.label;
    } else tb.classList.add('hidden');
  }

  toast(text, kind = '') {
    const box = $('toasts');
    const t = el('div', { class: `toast ${kind}` }, text);
    box.append(t);
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3200);
    while (box.children.length > 4) box.firstChild.remove();
  }

  feed(text, kind) {
    const box = $('feed');
    const e = el('div', { class: `line ${kind || ''}` }, text);
    box.append(e);
    this.feedItems.push({ el: e, t: performance.now() });
    while (box.children.length > 5) {
      box.firstChild.remove();
      this.feedItems.shift();
    }
  }

  relPop(e) {
    const sim = this.sim;
    const a = sim.s.actors[e.id];
    if (!a || !this.g.view.toScreen) return;
    const [x, y] = this.g.view.toScreen(a.x, a.y - 70);
    const pop = el('div', { class: `relpop ${e.d > 0 ? 'up' : 'down'}`, style: `left:${x}px;top:${y}px` }, `${e.d > 0 ? '+' : ''}${e.d}`);
    $('game').append(pop);
    setTimeout(() => pop.remove(), 1400);
  }

  // ------------------------------------------------------------ NPC action menu
  renderMenu(sim) {
    const m = sim.ui.menu;
    const box = $('menu');
    const p = sim.player;
    const key = m ? `${m.npc}|${m.actions.map((a) => a.id).join(',')}|${p.hands || ''}` : '';
    if (key !== this.keys.menu) {
      this.keys.menu = key;
      box.innerHTML = '';
      if (!m) {
        box.classList.add('hidden');
        return;
      }
      const npc = sim.s.actors[m.npc];
      const tag = displayTag(npc, 'p');
      box.append(el('div', { class: 'mhead' }, el('b', {}, npc.short), el('span', { class: 'chip', style: `color:${TAG_COLOR[tag]}` }, tag)));
      const hit = p.hands && sim.s.items[p.hands];
      m.actions.forEach((a, i) => {
        if (a.id === 'give' && hit && hit.def === 'cash' && hit.n > 5) {
          const row = el('div', { class: 'cashrow' }, el('span', {}, 'Give'));
          for (const amt of [5, 10, 20].filter((v) => v < hit.n)) row.append(el('button', { onclick: () => sim.cmd('npc_action', { id: m.npc, action: 'give', amount: amt }) }, `$${amt}`));
          row.append(el('button', { onclick: () => sim.cmd('npc_action', { id: m.npc, action: 'give', amount: hit.n }) }, `All $${hit.n}`));
          box.append(row);
          return;
        }
        const danger = a.id === 'swing' || a.id === 'threaten';
        box.append(el('button', { class: `act${danger ? ' danger' : ''}`, onclick: () => sim.cmd('npc_action', { id: m.npc, action: a.id, prop: a.prop }) }, el('kbd', {}, String(i + 1)), a.label));
      });
      box.append(el('button', { class: 'close', onclick: () => sim.cmd('menu_close') }, 'Never mind'));
      box.classList.remove('hidden');
    }
    if (m && this.g.view.toScreen) {
      const npc = sim.s.actors[m.npc];
      const [x, y] = this.g.view.toScreen(npc.x, npc.y);
      const w = box.offsetWidth || 180;
      const hgt = box.offsetHeight || 200;
      box.style.left = `${clamp(x + 30, 8, window.innerWidth - w - 8)}px`;
      box.style.top = `${clamp(y - hgt / 2 - 30, 60, window.innerHeight - hgt - 8)}px`;
    }
  }

  // ------------------------------------------------------------ talk
  renderDialog(sim) {
    const d = sim.dialog;
    const box = $('dialog');
    const key = d ? `${d.npc}|${d.log.length}|${d.done}|${d.options.map((o) => o.tone + o.text).join('/')}` : '';
    if (key === this.keys.dialog) return;
    this.keys.dialog = key;
    box.innerHTML = '';
    if (!d) {
      box.classList.add('hidden');
      return;
    }
    const npc = sim.s.actors[d.npc];
    const P = PERSONALITIES[npc.personality];
    const r = npc.rel.p || { v: 0 };
    const tag = displayTag(npc, 'p');
    const meter = el('div', { class: 'meter' }, el('s', { style: `left:${50 + r.v / 2}%` }));
    const head = el('div', { class: 'dhead' },
      portrait(npc.look, 72),
      el('div', { class: 'who' },
        el('b', {}, npc.name),
        el('small', {}, `${npc.role} · ${P.label}`),
        el('div', { class: 'relrow' }, el('span', { class: 'chip', style: `color:${TAG_COLOR[tag]}` }, tag), meter, el('em', {}, `${Math.round(r.v) > 0 ? '+' : ''}${Math.round(r.v)}`)),
      ),
    );
    const log = el('div', { class: 'dlog' });
    for (const line of d.log.slice(-6)) {
      const mine = line.who === 'p';
      const delta = line.delta ? el('span', { class: `delta ${line.delta > 0 ? 'up' : 'down'}` }, `${line.delta > 0 ? '+' : ''}${line.delta}`) : null;
      log.append(el('p', { class: mine ? 'me' : 'them' }, el('b', {}, mine ? 'You' : npc.short), ' ', line.text, delta));
    }
    const opts = el('div', { class: 'opts' });
    const toneName = { easy: 'Easy', straight: 'Straight', hard: 'Hard', accept: 'Accept', decline: 'Decline' };
    d.options.forEach((o, i) => {
      let hint = '';
      if (['easy', 'straight', 'hard'].includes(o.tone)) {
        const pr = odds(sim, npc, o.tone);
        hint = pr > 0.65 ? 'likely' : pr > 0.45 ? 'even' : 'risky';
      }
      opts.append(el('button', { class: `tone ${o.tone}`, onclick: () => sim.cmd('talk_tone', { tone: o.tone }) },
        el('kbd', {}, String(i + 1)), el('b', {}, toneName[o.tone]), el('span', {}, `“${o.text}”`), hint ? el('i', { class: hint }, hint) : null));
    });
    if (d.done) opts.append(el('button', { class: 'tone leave', onclick: () => sim.cmd('talk_close') }, el('kbd', {}, 'E'), el('b', {}, 'Leave')));
    else opts.append(el('button', { class: 'tone leave', onclick: () => sim.cmd('talk_close') }, el('kbd', {}, 'Esc'), el('b', {}, 'Walk away')));
    box.append(head, log, opts);
    box.classList.remove('hidden');
    log.scrollTop = log.scrollHeight;
  }

  // ------------------------------------------------------------ modals
  renderModal(sim) {
    const m = sim.ui.modal;
    const box = $('modal');
    const p = sim.player;
    let key = '';
    if (m) {
      key = JSON.stringify(m) + '|' + cashOnBody(sim, p) + '|' + (p.hands || '') + '|' + p.bank + '|' + (p.fines || 0) + '|' + (p.bills || 0) + '|' + JSON.stringify(sim.s.leases || {});
      if (m.type === 'cont') key += '|' + this.invSig(sim, [m.cont, p.pockets]);
      if (m.type === 'posting') key += '|' + JSON.stringify(sim.s.job.jobs[m.job] || {});
      if (m.type === 'garage' || m.type === 'fuel') key += '|' + JSON.stringify(Object.values(sim.s.cars).map((c) => [c.stored, Math.round(c.fuel), c.dmg.front + c.dmg.rear + c.dmg.left + c.dmg.right, Math.round(c.x / 50)]));
      if (m.type === 'dealer') key += '|' + this.dealerColor;
      if (m.type === 'license') key += '|' + JSON.stringify(sim.player.licenses);
      if (m.type === 'grow') key += '|' + JSON.stringify((sim.s.grow || {})[`${sim.player.room}:${m.prop}`] || null) + Math.floor(sim.s.t / 10);
      if (m.type === 'home' || m.type === 'pawn') key += '|' + JSON.stringify(sim.s.furn || {}) + m.tab + m.dest + JSON.stringify(sim.s.leases);
      if (m.type === 'terminal') key += '|' + Math.floor(sim.s.t / 30) + sim.economy.coinsHeld().length;
    }
    if (key === this.keys.modal) return;
    this.keys.modal = key;
    box.innerHTML = '';
    if (!m) {
      box.classList.add('hidden');
      return;
    }
    const close = el('button', { class: 'x', onclick: () => sim.cmd('modal_close') }, '✕');
    const card = el('div', { class: 'card' }, close);
    if (m.type === 'shop') {
      const shop = SHOPS[m.shop];
      const npc = m.npc ? sim.s.actors[m.npc] : null;
      card.append(el('h2', {}, shop.name), el('p', { class: 'sub' }, npc ? `${npc.short} is behind the counter.` : 'Self-serve. Leave the money in the jar.'));
      const list = el('div', { class: 'shoplist' });
      for (const sv of shop.services || []) {
        list.append(el('button', { class: 'hot shopitem service', onclick: () => sim.cmd('service', { shop: m.shop, id: sv.id, npc: m.npc }) },
          el('span', { class: 'svicon' }, '✚'), el('span', {}, el('b', {}, sv.label), el('small', {}, sv.desc)), el('em', {}, `$${sv.price}`)));
      }
      shop.items.forEach(([id, price], i) => {
        const d = ITEMS[id];
        list.append(el('button', { class: 'hot shopitem', onclick: () => sim.cmd('buy', { shop: m.shop, item: id, npc: m.npc }) },
          itemCanvas(id, 34), el('span', {}, el('b', {}, d.name), el('small', {}, d.desc)), el('em', {}, `$${price}`)));
      });
      card.append(list, el('p', { class: 'foot' }, `You have ${money(cashOnBody(sim, p))}.`));
      if (m.shop === 'clinic' && (p.bills || 0) > 0) card.append(el('button', { class: 'wide', onclick: () => sim.cmd('pay_bills') }, `Pay toward your bill ($${p.bills} owed)`));
    } else if (m.type === 'bank') {
      card.classList.add('bankcard');
      const atm = m.where === 'atm';
      card.append(el('h2', {}, atm ? 'Gulf Coast Savings · ATM' : 'Gulf Coast Savings'));
      const fresh = atm && this.atmPlayed !== m;
      this.atmPlayed = m;
      if (atm) card.append(el('div', { class: `atmanim${fresh ? ' play' : ''}` }, el('div', { class: 'slot' }), el('div', { class: 'card' }, el('i'), el('b', {}, p.name.toUpperCase())), el('div', { class: 'pin' }, '• • • •')));
      const body = el('div', { class: fresh ? 'bankbody delayed' : 'bankbody' });
      const room = sim.money.depositRoom();
      body.append(el('div', { class: 'kv' },
        el('span', {}, 'Balance'), el('b', { class: 'good' }, money(p.bank)),
        el('span', {}, 'Cash on you'), el('b', {}, money(cashOnBody(sim, p))),
        el('span', {}, 'Deposit room this week'), el('b', {}, `${money(room)} of $1,000`),
      ));
      const amt = el('input', { type: 'number', min: 1, step: 1, placeholder: 'Amount', class: 'amt' });
      const row = (label, kind, vals) => {
        const r = el('div', { class: 'amtrow' }, el('span', {}, label));
        for (const v of vals) r.append(el('button', { class: 'hot', onclick: () => sim.cmd(kind, { amt: v === 'all' ? (kind === 'deposit' ? cashOnBody(sim, p) : p.bank) : v, where: m.where }) }, v === 'all' ? 'All' : `$${v}`));
        r.append(el('button', { onclick: () => sim.cmd(kind, { amt: Number(amt.value) || 0, where: m.where }) }, 'Custom'));
        return r;
      };
      body.append(row('Deposit', 'deposit', [10, 20, 50, 100, 'all']), row('Withdraw', 'withdraw', [10, 20, 50, 100, 'all']), amt);
      const log = p.bankLog.slice(-6).reverse();
      body.append(el('h3', {}, 'Recent activity'), log.length
        ? el('div', { class: 'banklog' }, ...log.map((l) => el('div', {}, el('small', {}, `${weekday(l.t)} ${clock12(l.t)}`), el('span', {}, l.kind), el('b', { class: l.kind === 'deposit' ? 'good' : '' }, `${l.kind === 'deposit' ? '+' : '−'}$${l.amt}`))))
        : el('p', { class: 'sub' }, 'No transactions yet.'));
      card.append(body);
    } else if (m.type === 'rent') {
      const L = sim.money.lease(m.lease || 'apt_2b');
      card.append(el('h2', {}, 'Rent · Bayou Arms Unit 2B'));
      card.append(el('div', { class: 'kv' },
        el('span', {}, 'Weekly rent'), el('b', {}, money(L.rent)),
        el('span', {}, 'Paid through'), el('b', { class: L.overdue ? 'bad' : 'good' }, `${weekday(L.due)} ${clock12(L.due)}${L.overdue ? ' — OVERDUE' : ''}`),
        el('span', {}, 'Cash on you'), el('b', {}, money(cashOnBody(sim, p))),
      ));
      card.append(el('p', { class: 'sub' }, L.overdue ? 'Your door won\'t open until you catch up. Everything inside is still there.' : 'Rent is due every Sunday night. You can pay up to two weeks ahead.'));
      card.append(el('button', { class: 'hot wide primary', onclick: () => sim.cmd('pay_rent', { lease: m.lease || 'apt_2b' }) }, `Pay ${money(L.rent)}`));
    } else if (m.type === 'police') {
      const npc = sim.s.actors[m.npc];
      card.append(el('h2', {}, '5th Precinct · Front desk'), el('p', { class: 'sub' }, `${npc.short} looks up from a stack of reports.`));
      card.append(el('div', { class: 'kv' },
        el('span', {}, 'Fines owed'), el('b', { class: (p.fines || 0) > 0 ? 'bad' : 'good' }, money(p.fines || 0)),
        el('span', {}, 'Heat'), el('b', {}, p.heat < 10 ? 'Nobody\'s looking at you' : p.heat < 40 ? 'Your name has come up' : p.heat < 60 ? 'Officers know your face' : 'You get stopped on sight'),
      ));
      if ((p.fines || 0) > 0) card.append(el('button', { class: 'hot wide primary', onclick: () => sim.cmd('pay_fines') }, `Pay fines (${money(Math.min(p.fines, cashOnBody(sim, p)))})`));
      card.append(el('p', { class: 'sub' }, 'Permits and license tests are at the window on the right.'));
    } else if (m.type === 'license') {
      card.append(el('h2', {}, 'Permits & tests'), el('p', { class: 'sub' }, 'Pay the fee, answer the questions. Fail and you can retake it tomorrow.'));
      for (const id of Object.keys(LICENSES)) {
        const L = LICENSES[id];
        const st = sim.licenses.status(id);
        const row = el('div', { class: 'licrow' }, el('div', {}, el('b', {}, L.name), el('small', {}, L.blurb), el('small', { class: st.ok ? '' : st.have ? 'good' : 'bad' }, st.have ? '✓ Issued' : st.text)));
        if (st.ok) row.append(el('button', { class: 'hot', onclick: () => sim.cmd('test_start', { id }) }, `Take test · $${L.fee}`));
        card.append(row);
      }
      if (sim.player.stats.intellect >= 40) card.append(el('p', { class: 'sub' }, 'Your reading helps: some wrong answers will stand out.'));
    } else if (m.type === 'test') {
      const L = LICENSES[m.id];
      card.append(el('h2', {}, L.name + ' test'));
      if (!m.done) {
        const q = m.items[m.i];
        card.append(el('p', { class: 'sub' }, `Question ${m.i + 1} of ${m.items.length}`), el('p', { class: 'question' }, q.q));
        q.answers.forEach((a, k) => card.append(el('button', { class: `hot wide answer${a.grey ? ' grey' : ''}`, disabled: a.grey ? 'disabled' : null, onclick: () => sim.cmd('test_answer', { choice: a.i }) }, el('kbd', {}, String(k + 1)), a.text)));
      } else {
        card.append(el('p', { class: m.passed ? 'good big' : 'bad big' }, m.passed ? `Passed — ${m.right}/${m.items.length}.` : `Failed — ${m.right}/${m.items.length}. Need ${L.need}.`));
        card.append(el('p', { class: 'sub' }, m.passed ? 'The clerk slides the card under the glass.' : 'Study up and come back tomorrow.'));
        card.append(el('button', { class: 'hot wide', onclick: () => sim.cmd('modal_close') }, 'Done'));
      }
    } else if (m.type === 'fuel') {
      const car = sim.s.cars[m.car];
      const M = MODELS[car.model];
      const cost = Math.ceil((M.tank - car.fuel) * 0.06);
      card.append(el('h2', {}, 'Gas & Go · Pump'), el('div', { class: 'fuelbar' }, el('s', { style: `width:${(car.fuel / M.tank) * 100}%` })));
      card.append(el('p', { class: 'sub' }, `${Math.round((car.fuel / M.tank) * 100)}% full. Regular is $3.29 a gallon.`));
      card.append(el('button', { class: 'hot wide primary', onclick: () => sim.cmd('refuel', { car: car.id }) }, cost > 0 ? `Fill up · $${cost}` : 'Tank is full'));
    } else if (m.type === 'garage') {
      const npc = m.npc ? sim.s.actors[m.npc] : null;
      card.append(el('h2', {}, 'Lone Star Auto'), el('p', { class: 'sub' }, npc ? `${npc.short} wipes his hands on a rag.` : 'Stall 3 — your space, if you rent it.'));
      const apron = sim.apronCar();
      if (npc) {
        if (apron) {
          const cost = sim.cars.repairCost(apron);
          card.append(this.carThumb(apron), el('button', { class: 'hot wide', onclick: () => sim.cmd('repair', { car: apron.id }) }, cost > 0 ? `Fix the dents · $${cost}` : 'Nothing to fix on it'));
        } else card.append(el('p', { class: 'sub' }, 'Park your car on the apron out front for repairs.'));
      }
      const L = sim.s.leases.stall;
      const stored = Object.values(sim.s.cars).find((c) => c.stored === 'stall');
      card.append(el('h3', {}, 'Stall 3'));
      if (!L) card.append(el('p', { class: 'sub' }, `Keep one car safe indoors. $${STALL_RENT} a week.`), el('button', { class: 'hot wide', onclick: () => sim.cmd('stall_lease') }, `Rent Stall 3 · $${STALL_RENT}/week`));
      else {
        card.append(el('div', { class: 'kv' }, el('span', {}, 'Paid through'), el('b', { class: L.overdue ? 'bad' : 'good' }, `${weekday(L.due)} ${clock12(L.due)}${L.overdue ? ' — OVERDUE' : ''}`), el('span', {}, 'In the stall'), el('b', {}, stored ? MODELS[stored.model].name : 'empty')));
        card.append(el('button', { class: 'hot wide', onclick: () => sim.cmd('pay_rent', { lease: 'stall' }) }, `Pay stall rent · $${L.rent}`));
        if (stored) card.append(el('button', { class: 'hot wide primary', onclick: () => sim.cmd('stall_take') }, 'Roll my car out'));
        else if (apron) card.append(el('button', { class: 'hot wide primary', onclick: () => sim.cmd('stall_store', { car: apron.id }) }, `Store the ${MODELS[apron.model].name}`));
        else card.append(el('p', { class: 'sub' }, 'Park on the apron out front to store your car.'));
      }
    } else if (m.type === 'dealer') {
      const npc = sim.s.actors[m.npc];
      card.classList.add('wide');
      card.append(el('h2', {}, 'Big Tex Motors'), el('p', { class: 'sub' }, `${npc.short} leans back. "Everybody rides. Bank or cash, I don't judge."`));
      if (!this.dealerColor) this.dealerColor = CAR_COLORS[0];
      const sw = el('div', { class: 'pick' }, el('span', {}, 'Color'));
      for (const col of CAR_COLORS) sw.append(el('button', { class: `sw${this.dealerColor === col ? ' on' : ''}`, style: `background:${col}`, onclick: () => { this.dealerColor = col; this.keys.modal = ''; } }));
      card.append(sw);
      const grid = el('div', { class: 'cars' });
      for (const id of ['sedan', 'pickup', 'coupe']) {
        const M = MODELS[id];
        const cv = document.createElement('canvas');
        cv.width = 240;
        cv.height = 120;
        cv.style.width = '120px';
        cv.style.height = '60px';
        const c = cv.getContext('2d');
        c.scale(2, 2);
        c.translate(60, 30);
        drawCar(c, 0, this.dealerColor, null, false, false, { len: M.len, wid: M.wid, pickup: M.bed });
        grid.append(el('div', { class: 'carcard' }, cv, el('b', {}, M.name), el('small', {}, `Top ${Math.round((M.top / 40) * 2.237)} mph · ${M.grip > 8 ? 'sharp' : M.grip > 7.2 ? 'steady' : 'loose'} handling`),
          el('button', { class: 'hot primary', onclick: () => sim.cmd('buy_car', { model: id, color: this.dealerColor }) }, `Buy · $${M.price.toLocaleString()}`)));
      }
      card.append(grid, el('p', { class: 'foot' }, `Bank ${money(sim.player.bank)} + cash ${money(cashOnBody(sim, sim.player))}. You'll need a driver license to drive it off.`));
    } else if (m.type === 'terminal') {
      const now = coinPrice(sim.s.t);
      const held = sim.economy.coinsHeld().reduce((a, it) => a + it.n, 0);
      card.append(el('h2', {}, 'Market terminal'), el('p', { class: 'sub' }, 'BayouCoin, priced off the clock. Sales go straight to your account.'));
      const cv = document.createElement('canvas');
      cv.width = 760;
      cv.height = 220;
      cv.style.width = '100%';
      cv.style.height = '110px';
      const c = cv.getContext('2d');
      const pts = [];
      for (let k = 0; k <= 120; k++) pts.push(coinPrice(sim.s.t - (120 - k) * 84));
      const lo = Math.min(...pts) - 4;
      const hi = Math.max(...pts) + 4;
      c.fillStyle = '#0f1a14';
      c.fillRect(0, 0, 760, 220);
      c.strokeStyle = 'rgba(93,255,176,0.15)';
      for (let gy = 0; gy < 220; gy += 44) { c.beginPath(); c.moveTo(0, gy); c.lineTo(760, gy); c.stroke(); }
      c.strokeStyle = '#5dffb0';
      c.lineWidth = 3;
      c.beginPath();
      pts.forEach((v, k) => { const X = (k / 120) * 760; const Y = 210 - ((v - lo) / (hi - lo)) * 200; k ? c.lineTo(X, Y) : c.moveTo(X, Y); });
      c.stroke();
      card.append(cv, el('div', { class: 'kv' },
        el('span', {}, 'Price now'), el('b', { class: 'good' }, `$${now}`),
        el('span', {}, 'Week range'), el('b', {}, `$${Math.round(lo + 4)} – $${Math.round(hi - 4)}`),
        el('span', {}, 'You hold'), el('b', {}, `${held} coin`)));
      card.append(el('button', { class: 'hot wide primary', onclick: () => sim.cmd('coins_sell') }, held ? `Sell ${held} coin · ~$${Math.round(held * now)}` : 'No coin to sell'));
    } else if (m.type === 'phone') {
      card.append(el('h2', {}, 'Phone'), el('p', { class: 'sub' }, 'A cracked screen and a few numbers that matter.'));
      const contacts = Object.values(sim.s.actors).filter((a) => a.kind === 'npc' && a.rel.p && a.rel.p.met && (a.rel.p.v >= 25 || ['crew', 'boss'].includes(a.rel.p.tag)));
      if (!contacts.length) card.append(el('p', { class: 'sub' }, 'Nobody likes you enough to pick up yet.'));
      for (const a of contacts) {
        const tag = displayTag(a, 'p');
        card.append(el('div', { class: 'licrow' }, el('div', {}, el('b', {}, a.name), el('small', { style: `color:${TAG_COLOR[tag]}` }, tag)), el('button', { class: 'hot', onclick: () => sim.cmd('call', { id: a.id }) }, 'Call')));
      }
      const wx = sim.weatherAt(sim.s.t - (sim.s.t % 1440) + 15 * 60);
      card.append(el('div', { class: 'kv' }, el('span', {}, 'Bank'), el('b', {}, money(sim.player.bank)), el('span', {}, 'Forecast'), el('b', {}, wx.rain > 0.2 ? 'Afternoon storms' : wx.cloud > 0.6 ? 'Cloudy and muggy' : 'Hot and sticky')));
    } else if (m.type === 'lease') {
      card.append(el('h2', {}, LEASE_NAMES[m.lease]), el('p', { class: 'sub' }, m.lease === 'loft' ? 'Exposed brick, tall windows, empty floor. Furnish it yourself.' : 'Concrete box, two grow tables, shelves, power and a sink.'));
      card.append(el('div', { class: 'kv' }, el('span', {}, 'Rent'), el('b', {}, `$${RENT[m.lease]} a week`), el('span', {}, 'Due'), el('b', {}, 'Sunday nights'), el('span', {}, 'Cash on you'), el('b', {}, money(cashOnBody(sim, sim.player)))));
      card.append(el('button', { class: 'hot wide primary', onclick: () => sim.cmd('lease_start', { id: m.lease }) }, `Sign — first week $${RENT[m.lease]}`));
    } else if (m.type === 'grow') {
      const g = (sim.s.grow || {})[`${sim.player.room}:${m.prop}`];
      card.append(el('h2', {}, 'Grow table'), el('p', { class: 'sub' }, 'Bayou bloom: plant cuttings, keep the tray wet, harvest in about a day and a half. Good water = better quality.'));
      if (!g) card.append(el('button', { class: 'hot wide primary', onclick: () => sim.cmd('grow_plant', { prop: m.prop }) }, 'Plant cuttings'));
      else if (g.dead) card.append(el('p', { class: 'bad' }, 'Dried out and dead.'), el('button', { class: 'hot wide', onclick: () => sim.cmd('grow_harvest', { prop: m.prop }) }, 'Clear the tray'));
      else {
        card.append(el('div', { class: 'kv' },
          el('span', {}, 'Growth'), el('b', {}, `${Math.round(g.growth * 100)}%${g.growth < 1 ? ` · ~${Math.ceil(((1 - g.growth) * GROW_MINUTES) / 60)}h left` : ' · ready'}`),
          el('span', {}, 'Water'), el('b', { class: g.water < 35 ? 'bad' : 'good' }, `${Math.round(g.water)}%`),
          el('span', {}, 'Quality'), el('b', {}, Math.round(g.quality))));
        card.append(el('button', { class: 'hot wide', onclick: () => sim.cmd('grow_water', { prop: m.prop }) }, 'Water the tray'));
        if (g.growth >= 1) card.append(el('button', { class: 'hot wide primary', onclick: () => sim.cmd('grow_harvest', { prop: m.prop }) }, 'Harvest'));
      }
    } else if (m.type === 'pawn') {
      const npc = sim.s.actors[m.npc];
      card.classList.add('wide');
      card.append(el('h2', {}, 'Harbor Pawn & Thrift'), el('p', { class: 'sub' }, `${npc.short} doesn't look up. "Buy, sell, or browse. Delivery's free inside the loop."`));
      const tabs = el('div', { class: 'ptabs inline' });
      for (const [k, label] of [['furniture', 'Furniture'], ['used', 'Used goods'], ['sell', 'Sell']]) tabs.append(el('button', { class: m.tab === k ? 'on' : '', onclick: () => { m.tab = k; this.keys.modal = ''; } }, label));
      card.append(tabs);
      if (m.tab === 'furniture') {
        const homes = sim.furniture.homes();
        if (!m.dest || !homes.includes(m.dest)) m.dest = homes[0];
        const dest = el('div', { class: 'pick' }, el('span', {}, 'Deliver to'));
        for (const h of homes) dest.append(el('button', { class: `opt${m.dest === h ? ' on' : ''}`, onclick: () => { m.dest = h; this.keys.modal = ''; } }, sim.world.room(h).name));
        card.append(dest);
        const list = el('div', { class: 'shoplist' });
        for (const t in FURNITURE) {
          const F = FURNITURE[t];
          list.append(el('button', { class: 'hot shopitem', onclick: () => sim.cmd('buy_furn', { type: t, room: m.dest }) }, el('span', { class: 'svicon' }, '🛋'), el('span', {}, el('b', {}, F.name), el('small', {}, F.blurb || (F.use ? `Use: ${F.use}` : 'Decor'))), el('em', {}, `$${F.price}`)));
        }
        card.append(list);
      } else if (m.tab === 'used') {
        const stock = { flashlight: 10, phone: 35, bat: 20, medkit: 24, book: 3, wrench: 8 };
        const list = el('div', { class: 'shoplist' });
        for (const id in stock) list.append(el('button', { class: 'hot shopitem', onclick: () => sim.cmd('pawn_buy', { npc: m.npc, item: id }) }, itemCanvas(id, 34), el('span', {}, el('b', {}, ITEMS[id].name), el('small', {}, ITEMS[id].desc)), el('em', {}, `$${stock[id]}`)));
        card.append(list);
      } else {
        const p = sim.player;
        const mine = [...sim.items.contItems(sim, p.pockets), p.hands && sim.s.items[p.hands]].filter((it) => it && !it.job && !it.favor && !['cash', 'coin'].includes(ITEMS[it.def].kind));
        if (!mine.length) card.append(el('p', { class: 'sub' }, 'You have nothing Sal wants.'));
        const list = el('div', { class: 'shoplist' });
        for (const it of mine) {
          const d = ITEMS[it.def];
          const offer = Math.max(1, Math.round((d.value || 1) * (it.def === 'bloom' ? 0.3 : 0.4)));
          list.append(el('button', { class: 'hot shopitem', onclick: () => sim.cmd('pawn_sell', { npc: m.npc, uid: it.uid }) }, itemCanvas(it.def, 34, it), el('span', {}, el('b', {}, d.name), el('small', {}, 'Sal pays 40%.')), el('em', {}, `$${offer}`)));
        }
        card.append(list);
      }
      card.append(el('p', { class: 'foot' }, `Cash on you: ${money(cashOnBody(sim, sim.player))}.`));
    } else if (m.type === 'home') {
      const room = sim.player.room;
      card.append(el('h2', {}, `Arrange · ${sim.world.room(room).name}`), el('p', { class: 'sub' }, 'Furniture you bought for this place. Placed pieces stay with the lease.'));
      const list = sim.furniture.list(room);
      if (!list.length) card.append(el('p', { class: 'sub' }, 'Nothing delivered here yet. Harbor Pawn & Thrift on Pecan & Harbor delivers.'));
      for (const f of list) {
        const F = FURNITURE[f.type];
        const row = el('div', { class: 'licrow' }, el('div', {}, el('b', {}, F.name), el('small', {}, f.placed ? 'Placed' : 'In boxes by the door')));
        row.append(el('button', { class: 'hot', onclick: () => sim.cmd('arrange_start', { uid: f.uid }) }, f.placed ? 'Move' : 'Place'));
        if (f.placed) row.append(el('button', { class: 'hot', onclick: () => sim.cmd('furn_pickup', { uid: f.uid }) }, 'Box up'));
        card.append(row);
      }
    } else if (m.type === 'trade') {
      const npc = sim.s.actors[m.npc];
      card.append(el('h2', {}, `Trade with ${npc.short}`));
      if (npc.sells) {
        const list = el('div', { class: 'shoplist' });
        for (const [id, price] of npc.sells) {
          const d = ITEMS[id];
          list.append(el('button', { class: 'hot shopitem', onclick: () => sim.cmd('buy', { shop: null, item: id, npc: m.npc }) }, itemCanvas(id, 34), el('span', {}, el('b', {}, d.name), el('small', {}, d.desc)), el('em', {}, `$${price}`)));
        }
        card.append(list);
      }
      const hit = p.hands && sim.s.items[p.hands];
      if (hit && hit.def !== 'cash' && !hit.order) {
        const offer = Math.max(1, Math.round((ITEMS[hit.def].value || 1) * 0.45));
        card.append(el('button', { class: 'hot wide', onclick: () => { sim.cmd('sell', { npc: m.npc, uid: hit.uid }); } }, `Sell your ${ITEMS[hit.def].name.toLowerCase()} for $${offer}`));
      } else card.append(el('p', { class: 'sub' }, 'Hold something to offer it.'));
    } else if (m.type === 'sleep') {
      card.append(el('h2', {}, 'Get some sleep'), el('p', { class: 'sub' }, `It's ${clock12(sim.s.t)}. Sleep clears your head and heals you up.`));
      const opts = [['morning', 'Until morning (6:30 AM)'], [2, 'Nap 2 hours'], [4, '4 hours'], [8, '8 hours']];
      opts.forEach(([h, label]) => card.append(el('button', { class: 'hot wide', onclick: () => sim.cmd('sleep', { hours: h }) }, label)));
    } else if (m.type === 'cont') {
      card.classList.add('wide');
      card.append(el('h2', {}, m.label));
      const row = el('div', { class: 'invrow' });
      row.append(el('div', {}, el('h3', {}, m.label), this.grid(sim, m.cont)));
      row.append(el('div', {}, el('h3', {}, 'Pockets'), this.grid(sim, p.pockets), el('h3', {}, 'Hands'), this.handsSlot(sim)));
      card.append(row, el('p', { class: 'foot' }, 'Drag items between grids. R rotates while dragging.'));
    } else if (m.type === 'posting') {
      const info = sim.work.posting(m.job);
      if (!info) {
        card.append(el('h2', {}, 'Notice board'), el('p', {}, 'Flyers for lost cats, a church fish fry, guitar lessons. Nothing hiring.'));
      } else {
        card.append(el('h2', {}, info.title), el('p', {}, info.text));
        const floor = Object.keys(info.floor || {});
        const tbl = el('div', { class: 'kv' },
          el('span', {}, 'Pay'), el('b', {}, `$${info.pay} per shift`),
          el('span', {}, 'Clock in'), el('b', {}, info.window),
          el('span', {}, 'Requires'), el('b', {}, floor.length ? floor.map((k) => `${k} ${info.floor[k]}`).join(', ') : 'Nothing — just show up'),
        );
        card.append(tbl);
        if (info.hired) {
          card.append(el('p', { class: 'good' }, `You work here: ${info.rank}, ${info.hours} hours on the books.`));
          if (info.next) card.append(el('p', { class: 'sub' }, `Next: ${info.next.title} at ${info.next.hours} hours${info.next.floor ? ' + ' + Object.entries(info.next.floor).map(([k, v]) => `${k} ${v}`).join(', ') : ''}.`));
          card.append(el('p', { class: 'sub' }, 'Ask the boss for work to start a shift.'));
        } else card.append(el('button', { class: 'hot wide', onclick: () => sim.cmd('apply', { job: m.job }) }, info.miss.length ? `Apply (missing: ${info.miss.join(', ')})` : 'Apply'));
      }
    }
    box.append(card);
    box.classList.remove('hidden');
  }

  carThumb(car) {
    const M = MODELS[car.model];
    const cv = document.createElement('canvas');
    cv.width = 240;
    cv.height = 120;
    cv.style.width = '120px';
    cv.style.height = '60px';
    const c = cv.getContext('2d');
    c.scale(2, 2);
    c.translate(60, 30);
    drawCar(c, 0, car.color, car.dmg, false, false, { len: M.len, wid: M.wid, pickup: M.bed });
    return el('div', { class: 'carthumb' }, cv, el('small', {}, `${M.name} · ${car.plate}`));
  }

  driveHud(sim) {
    const p = sim.player;
    const box = $('drivehud');
    const car = p.car && sim.s.cars[p.car];
    if (!car) {
      box.classList.add('hidden');
      return;
    }
    box.classList.remove('hidden');
    const M = MODELS[car.model];
    const mph = Math.round((sim.cars.speed(car) / 40) * 2.237);
    const fuel = car.fuel / M.tank;
    const d = car.dmg;
    const col = (v) => (v > 0.66 ? '#ff6b5e' : v > 0.33 ? '#ffb36b' : '#7be495');
    const html = `<div class="mph"><b>${mph}</b><small>MPH</small></div>
      <div class="dmeta"><div class="fuel"><i>⛽</i><b><s style="width:${fuel * 100}%;background:${fuel < 0.15 ? '#ff6b5e' : '#ffd23f'}"></s></b></div>
      <div class="panels"><span style="background:${col(d.front)}">F</span><span style="background:${col(d.left)}">L</span><span style="background:${col(d.right)}">R</span><span style="background:${col(d.rear)}">B</span>
      <em>${car.radio ? '♫ 97.3' : 'radio off'}</em></div>
      <small>${p.licenses.driver ? (document.body.classList.contains('touch') ? 'stick: drive · E exit · R radio' : 'W/S gas & brake · A/D steer · Space handbrake · E exit · R radio') : 'No license — it won’t start'}</small></div>`;
    if (this.hudCache.drive !== html) {
      this.hudCache.drive = html;
      box.innerHTML = html;
    }
  }

  // ------------------------------------------------------------ inventory grids
  invSig(sim, conts) {
    return conts.map((c) => (sim.s.conts[c]?.items || []).map((u) => {
      const it = sim.s.items[u];
      return `${u}${it.gx}${it.gy}${it.rot}${it.n || ''}`;
    }).join(',')).join('|') + (sim.player.hands || '');
  }

  grid(sim, contId) {
    const cont = sim.s.conts[contId];
    const CS = window.innerWidth < 700 ? 40 : 46;
    const g = el('div', { class: 'grid', style: `width:${cont.w * CS}px;height:${cont.h * CS}px;--cs:${CS}px` });
    for (let y = 0; y < cont.h; y++) for (let x = 0; x < cont.w; x++) {
      g.append(el('div', { class: 'cell', 'data-cont': contId, 'data-gx': x, 'data-gy': y, style: `left:${x * CS}px;top:${y * CS}px;width:${CS}px;height:${CS}px` }));
    }
    for (const u of cont.items) {
      const it = sim.s.items[u];
      const d = ITEMS[it.def];
      const w = it.rot ? d.h : d.w;
      const h = it.rot ? d.w : d.h;
      const box = el('div', { class: `item${this.sel === u ? ' sel' : ''}`, 'data-uid': u, style: `left:${it.gx * CS}px;top:${it.gy * CS}px;width:${w * CS}px;height:${h * CS}px` });
      const icon = itemCanvas(it.def, Math.min(w, h) * CS * 0.92, it);
      if (it.rot) icon.style.transform = 'rotate(90deg)';
      box.append(icon);
      if (d.kind === 'cash') box.append(el('span', { class: 'qty' }, `$${it.n}`));
      box.addEventListener('pointerdown', (e) => this.dragStart(e, u));
      g.append(box);
    }
    return g;
  }

  handsSlot(sim) {
    const p = sim.player;
    const CS = window.innerWidth < 700 ? 40 : 46;
    const slot = el('div', { class: 'hands-slot', 'data-hands': '1', style: `--cs:${CS}px` });
    const it = p.hands && sim.s.items[p.hands];
    if (it) {
      const box = el('div', { class: `item${this.sel === it.uid ? ' sel' : ''}`, 'data-uid': it.uid });
      box.append(itemCanvas(it.def, CS * 1.4, it));
      if (it.def === 'cash') box.append(el('span', { class: 'qty' }, `$${it.n}`));
      box.addEventListener('pointerdown', (e) => this.dragStart(e, it.uid));
      slot.append(box);
    } else slot.append(el('span', { class: 'empty' }, 'empty'));
    return slot;
  }

  dragStart(e, uid) {
    e.preventDefault();
    e.stopPropagation();
    const it = this.sim.s.items[uid];
    this.drag = { uid, x0: e.clientX, y0: e.clientY, moved: false, rot: it.rot || 0, x: e.clientX, y: e.clientY };
  }

  drawGhost() {
    const d = this.drag;
    if (!d) return;
    const ghost = $('drag');
    const it = this.sim.s.items[d.uid];
    if (!it) return;
    const D = ITEMS[it.def];
    const CS = window.innerWidth < 700 ? 40 : 46;
    const w = d.rot ? D.h : D.w;
    const h = d.rot ? D.w : D.h;
    ghost.innerHTML = '';
    ghost.style.width = `${w * CS}px`;
    ghost.style.height = `${h * CS}px`;
    const icon = itemCanvas(it.def, Math.min(w, h) * CS * 0.9, it);
    if (d.rot) icon.style.transform = 'rotate(90deg)';
    ghost.append(icon);
    ghost.style.left = `${d.x - (w * CS) / 2}px`;
    ghost.style.top = `${d.y - (h * CS) / 2}px`;
    ghost.classList.remove('hidden');
  }

  dragMove(e) {
    const d = this.drag;
    if (!d) return;
    d.x = e.clientX;
    d.y = e.clientY;
    if (!d.moved && Math.hypot(d.x - d.x0, d.y - d.y0) > 6) d.moved = true;
    if (d.moved) this.drawGhost();
  }

  dragEnd(e) {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    $('drag').classList.add('hidden');
    const sim = this.sim;
    if (!d.moved) {
      this.sel = this.sel === d.uid ? null : d.uid;
      this.keys.modal = '';
      this.renderPanel(true);
      return;
    }
    const it = sim.s.items[d.uid];
    const D = ITEMS[it.def];
    const CS = window.innerWidth < 700 ? 40 : 46;
    const w = d.rot ? D.h : D.w;
    const h = d.rot ? D.w : D.h;
    // drop point = top-left cell under the ghost
    const tx = e.clientX - (w * CS) / 2 + CS / 2;
    const ty = e.clientY - (h * CS) / 2 + CS / 2;
    const under = document.elementsFromPoint(tx, ty);
    const cell = under.find((n) => n.dataset && n.dataset.cont);
    const hands = document.elementsFromPoint(e.clientX, e.clientY).find((n) => n.dataset && n.dataset.hands);
    const dropZone = document.elementsFromPoint(e.clientX, e.clientY).find((n) => n.dataset && n.dataset.dropzone);
    let ok = false;
    if (hands) ok = sim.cmd('move_item', { uid: d.uid, to: 'hands' });
    else if (cell) ok = sim.cmd('move_item', { uid: d.uid, to: cell.dataset.cont, gx: Number(cell.dataset.gx), gy: Number(cell.dataset.gy), rot: d.rot });
    else if (dropZone) ok = sim.cmd('move_item', { uid: d.uid, to: 'ground' });
    if (!ok && (cell || hands)) this.toast("Doesn't fit there.", 'warn');
    this.keys.modal = '';
    this.renderPanel(true);
  }

  // ------------------------------------------------------------ panels
  togglePanel(name) {
    if (this.panel === name) this.closePanel();
    else {
      this.panel = name;
      this.sel = null;
      this.renderPanel(true);
    }
  }

  closePanel() {
    this.panel = null;
    $('panel').classList.add('hidden');
    $('panel').innerHTML = '';
    this.keys.panel = '';
  }

  renderPanel(force) {
    if (!this.panel) return;
    const sim = this.sim;
    const box = $('panel');
    if (this.panel === 'bag' && !force) {
      const sig = this.invSig(sim, [sim.player.pockets]) + this.sel;
      if (sig === this.keys.panel) return;
      this.keys.panel = sig;
    }
    if (this.drag) return;
    const tabs = [['bag', 'Bag'], ['people', 'People'], ['me', 'Me'], ['board', 'Board'], ['log', 'Log']];
    const scroll = box.querySelector('.pbody')?.scrollTop || 0;
    box.innerHTML = '';
    const head = el('div', { class: 'ptabs' }, ...tabs.map(([k, label]) => el('button', { class: this.panel === k ? 'on' : '', onclick: () => this.togglePanel(k) }, label)), el('button', { class: 'x', onclick: () => this.closePanel() }, '✕'));
    const body = el('div', { class: 'pbody' });
    this[`panel_${this.panel}`](sim, body);
    box.append(head, body);
    box.classList.remove('hidden');
    body.scrollTop = scroll;
  }

  panel_bag(sim, body) {
    const p = sim.player;
    const wt = carriedWeight(sim, p);
    const cap = capacity(p);
    const left = el('div', { class: 'bagcol' },
      el('h3', {}, 'Hands'), this.handsSlot(sim),
      el('h3', {}, 'Pockets'), this.grid(sim, p.pockets),
      el('div', { class: `weight${wt > cap ? ' over' : ''}` }, `Carrying ${wt.toFixed(1)} / ${cap.toFixed(1)} kg${wt > cap ? ' — slowed down' : ''}`),
      el('div', { class: 'dropzone', 'data-dropzone': '1' }, 'Drag here to drop on the ground'),
    );
    const right = el('div', { class: 'bagcol detail' });
    const it = this.sel && sim.s.items[this.sel];
    if (it && (it.where === 'cont' && it.cont === p.pockets || it.where === 'hands' && it.actor === 'p')) {
      const d = ITEMS[it.def];
      right.append(itemCanvas(it.def, 72, it), el('h2', {}, itemName(it)), el('p', {}, d.desc), el('p', { class: 'sub' }, `${d.wt} kg · ${d.w}×${d.h}${d.handsOnly ? ' · hands only' : ''}${d.dmg ? ` · hits for ${d.dmg}` : ''}`));
      const acts = el('div', { class: 'acts' });
      if (['food', 'drink', 'med', 'book'].includes(d.kind)) acts.append(el('button', { onclick: () => { sim.cmd('use_item', { uid: it.uid }); this.sel = null; this.renderPanel(true); } }, d.kind === 'food' ? 'Eat' : d.kind === 'drink' ? 'Drink' : d.kind === 'book' ? 'Read' : 'Use'));
      if (it.where !== 'hands') acts.append(el('button', { onclick: () => { sim.cmd('move_item', { uid: it.uid, to: 'hands' }); this.renderPanel(true); } }, 'Hold'));
      else if (!d.handsOnly) acts.append(el('button', { onclick: () => { if (!sim.cmd('move_item', { uid: it.uid, to: p.pockets })) this.toast('No room in your pockets.', 'warn'); this.renderPanel(true); } }, 'Pocket'));
      acts.append(el('button', { class: 'danger', onclick: () => { sim.cmd('drop_item', { uid: it.uid }); this.sel = null; this.renderPanel(true); } }, 'Drop'));
      right.append(acts);
    } else {
      right.append(el('p', { class: 'sub' }, 'Tap an item to see it. Drag to move it. Things in your hands are visible to everyone — including the police.'));
      right.append(el('p', { class: 'sub' }, 'Your apartment closet and fridge keep things safe. What you carry drops where you fall.'));
    }
    body.append(el('div', { class: 'bag' }, left, right));
  }

  panel_people(sim, body) {
    // the street politics, as far as you can tell
    const host = sim.crews.hostility('cottonmouths', 'canalkings');
    body.append(el('div', { class: 'crewbar' },
      el('span', { style: `color:${CREWS.cottonmouths.color}` }, 'Cottonmouths'),
      el('div', { class: 'meter heat' }, el('s', { style: `left:${host}%` })),
      el('span', { style: `color:${CREWS.canalkings.color}` }, 'Canal Kings'),
      el('small', {}, host >= 60 ? 'at war' : host >= 40 ? 'tense' : 'uneasy truce'),
      el('small', {}, sim.player.crew ? `You roll with the ${CREWS[sim.player.crew].name}.` : 'You roll solo.')));
    const npcs = Object.values(sim.s.actors).filter((a) => a.kind === 'npc' && a.rel.p && a.rel.p.met);
    if (!npcs.length) {
      body.append(el('p', { class: 'sub' }, "You haven't really met anyone yet. Walk up to somebody and press E."));
      return;
    }
    npcs.sort((a, b) => (b.rel.p.v || 0) - (a.rel.p.v || 0));
    for (const a of npcs) {
      const r = a.rel.p;
      const tag = displayTag(a, 'p');
      const mems = a.mem.filter((m) => m.who === 'p' || m.x === 'p').slice(-4).reverse();
      const last = latest(a);
      const card = el('div', { class: 'person' },
        portrait(a.look, 64),
        el('div', { class: 'pinfo' },
          el('div', { class: 'pname' }, el('b', {}, a.name), el('span', { class: 'chip', style: `color:${TAG_COLOR[tag]}` }, tag), a.crew ? el('span', { class: 'chip', style: `color:${CREWS[a.crew].color}` }, CREWS[a.crew].name) : null),
          el('small', {}, `${a.role} · ${PERSONALITIES[a.personality].label} · ${PERSONALITIES[a.personality].blurb}`),
          el('div', { class: 'relrow' }, el('div', { class: 'meter' }, el('s', { style: `left:${50 + r.v / 2}%` })), el('em', {}, `${Math.round(r.v) > 0 ? '+' : ''}${Math.round(r.v)}`)),
          mems.length ? el('ul', { class: 'mems' }, ...mems.map((m) => el('li', {}, summary(sim, a, m)))) : el('p', { class: 'sub' }, 'Nothing about you on their mind.'),
          last && !mems.includes(last) ? el('p', { class: 'sub' }, `On their mind: ${summary(sim, a, last)}`) : null,
        ),
      );
      body.append(card);
    }
  }

  panel_me(sim, body) {
    const p = sim.player;
    const st = p.stats;
    const stat = (k, label, col) => el('div', { class: 'statrow' }, el('span', {}, label), el('b', {}, el('s', { style: `width:${st[k]}%;background:${col}` })), el('em', {}, st[k].toFixed(k === 'health' || k === 'mind' ? 0 : 1)));
    const jobs = Object.entries(sim.s.job.jobs).filter(([, j]) => j.hired).map(([k, j]) => `${JOBS[k].title}: ${JOBS[k].ranks[j.rank].title}, ${j.hours} h`);
    body.append(el('div', { class: 'mepanel' },
      el('div', { class: 'mecol' }, portrait(p.look, 120), el('h2', {}, p.name), el('p', { class: 'sub' }, `${weekday(sim.s.t)}, day ${dayOf(sim.s.t)}`)),
      el('div', { class: 'mecol' },
        stat('health', 'Health', '#e05252'), stat('mind', 'Mind', '#9b8cff'), stat('hunger', 'Hunger', '#f28c38'), stat('thirst', 'Thirst', '#4fb3e8'),
        stat('strength', 'Strength', '#ffb36b'), stat('agility', 'Agility', '#7fe0a8'), stat('aim', 'Aim', '#c9d1d9'), stat('intellect', 'Intellect', '#6bc1ff'), stat('reputation', 'Reputation', '#ffd23f'),
        el('div', { class: 'kv' },
          el('span', {}, 'Cash'), el('b', {}, money(cashOnBody(sim, p))),
          el('span', {}, 'Bank'), el('b', {}, money(p.bank)),
          el('span', {}, 'Rent'), el('b', {}, (() => { const L = sim.money.lease('apt_2b'); return L.overdue ? `OVERDUE ($${L.rent})` : `paid through ${weekday(L.due)}`; })()),
          el('span', {}, 'Owed'), el('b', {}, `${money(p.fines || 0)} fines · ${money(p.bills || 0)} hospital`),
          el('span', {}, 'Heat'), el('b', {}, Math.round(p.heat)),
          el('span', {}, 'Licenses'), el('b', {}, Object.keys(p.licenses).filter((k) => p.licenses[k]).join(', ') || 'none'),
          el('span', {}, 'Work'), el('b', {}, jobs.join(' · ') || 'none yet'),
          el('span', {}, 'Record'), el('b', {}, `${sim.s.stats.shifts} shifts · ${sim.s.stats.favors} favors · ${sim.s.stats.fightsWon} fights won · ${sim.s.stats.knockouts} times dropped`),
        ),
      ),
    ));
  }

  panel_board(sim, body) {
    body.append(el('p', { class: 'sub' }, 'Pin your own goals. Nothing here is required — the day happens either way.'));
    const list = el('div', { class: 'goals' });
    sim.s.board.forEach((g, i) => {
      const pr = progress(sim, g);
      list.append(el('div', { class: `goal${g.done ? ' done' : ''}` },
        el('b', {}, goalText(g)),
        el('div', { class: 'gbar' }, el('s', { style: `width:${g.done ? 100 : pr.frac * 100}%` })),
        el('small', {}, g.done ? 'Done' : `${Math.floor(pr.v)} / ${g.n}`),
        el('button', { class: 'x', onclick: () => { sim.cmd('unpin', { i }); this.renderPanel(true); } }, '✕'),
      ));
    });
    body.append(list);
    const add = el('div', { class: 'addgoal' }, el('h3', {}, 'Pin a goal'));
    for (const id in GOALS) {
      const G = GOALS[id];
      const row = el('div', { class: 'grow' }, el('span', {}, G.label.replace('{n}', '…')));
      for (const n of G.targets) row.append(el('button', { onclick: () => { if (!sim.cmd('pin', { id, n })) this.toast('Already pinned, or the board is full.', 'warn'); this.renderPanel(true); } }, String(n)));
      add.append(row);
    }
    body.append(add);
  }

  panel_log(sim, body) {
    const L = sim.s.log.slice(-120).reverse();
    for (const l of L) body.append(el('div', { class: `logline ${l.kind || ''}` }, el('small', {}, `${weekday(l.t)} ${clock12(l.t)}`), l.text));
  }

  // ------------------------------------------------------------ pause
  openPause() {
    this.pauseOpen = true;
    const box = $('pause');
    box.innerHTML = '';
    const card = el('div', { class: 'card' },
      el('h2', {}, 'Paused'),
      el('button', { class: 'wide', onclick: () => this.closePause() }, 'Resume'),
      el('button', { class: 'wide', onclick: () => { this.g.save('manual'); this.toast('Game saved.', 'good'); } }, 'Save'),
      el('button', { class: 'wide', onclick: () => { this.closePause(); this.g.loadLatest(); } }, 'Load last save'),
      el('button', { class: 'wide', onclick: () => this.settings(card) }, 'Settings'),
      el('button', { class: 'wide', onclick: () => this.help(card) }, 'How to play'),
      el('button', { class: 'wide danger', onclick: () => { this.g.save('auto'); this.closePause(); this.g.toTitle(); } }, 'Save & quit to title'),
    );
    box.append(card);
    box.classList.remove('hidden');
  }

  closePause() {
    this.pauseOpen = false;
    $('pause').classList.add('hidden');
  }

  settings(card) {
    const s = this.g.settings;
    card.innerHTML = '';
    const vol = el('input', { type: 'range', min: 0, max: 1, step: 0.05, value: s.volume });
    vol.addEventListener('input', () => { s.volume = Number(vol.value); this.g.applySettings(); });
    const mus = el('input', { type: 'range', min: 0, max: 1, step: 0.05, value: s.music });
    mus.addEventListener('input', () => { s.music = Number(mus.value); this.g.applySettings(); });
    const day = el('select', {}, ...[480, 600, 720].map((v) => el('option', { value: v, selected: (this.sim ? this.sim.s.dayLen : s.dayLen) === v ? 'selected' : null }, `${v / 60} minutes`)));
    day.addEventListener('change', () => { s.dayLen = Number(day.value); if (this.sim) this.sim.s.dayLen = s.dayLen; this.g.applySettings(); });
    card.append(el('h2', {}, 'Settings'),
      el('label', {}, 'Volume', vol), el('label', {}, 'Music', mus), el('label', {}, 'One in-game day lasts', day),
      el('button', { class: 'wide', onclick: () => (this.pauseOpen ? this.openPause() : this.g.toTitle()) }, 'Back'));
  }

  help(card) {
    card.innerHTML = '';
    card.append(el('h2', {}, 'How to play'), el('div', { class: 'help', html: HELP }), el('button', { class: 'wide', onclick: () => (this.pauseOpen ? this.openPause() : this.g.toTitle()) }, 'Back'));
  }

  // ------------------------------------------------------------ title + creation
  showTitle(hasSave, summaryText) {
    $('hud').classList.add('hidden');
    const t = $('title');
    t.innerHTML = '';
    t.classList.remove('hidden');
    const card = el('div', { class: 'titlecard' },
      el('h1', { class: 'logo' }, el('span', {}, 'H-TOWN'), el('em', {}, 'NIGHTS')),
      el('p', { class: 'tag' }, 'One person. A living city. Everyone remembers.'),
      hasSave ? el('button', { class: 'wide primary', onclick: () => this.g.loadLatest() }, 'Continue', el('small', {}, summaryText)) : null,
      el('button', { class: `wide${hasSave ? '' : ' primary'}`, onclick: () => this.showCreate() }, 'New life'),
      el('button', { class: 'wide', onclick: () => this.help(card) }, 'How to play'),
      el('button', { class: 'wide', onclick: () => this.settings(card) }, 'Settings'),
      el('p', { class: 'fine' }, 'Saves stay on this device. WASD / arrows to move, E to act. Touch: left thumb moves.'),
    );
    t.append(card);
  }

  hideTitle() {
    $('title').classList.add('hidden');
    $('create').classList.add('hidden');
    $('hud').classList.remove('hidden');
  }

  showCreate() {
    $('title').classList.add('hidden');
    const box = $('create');
    box.classList.remove('hidden');
    box.innerHTML = '';
    const SK = ['#f1c8a5', '#e0ac85', '#c68a5e', '#a8754f', '#8d5a3b', '#6b4229', '#4f2f1d', '#3a2216'];
    const HC = ['#120c0a', '#3b2416', '#6b4423', '#a8763a', '#d8b06a', '#9e3b26', '#bdbab4', '#2b3b6b'];
    const CC = ['#d4572a', '#2f4f3a', '#2c5aa0', '#e9e9e4', '#1d1d22', '#b8283f', '#7a5c8e', '#e8b923', '#4fb3a0', '#8a6a4a'];
    const PC = ['#34445e', '#1f2a44', '#2c2c34', '#6b5a43', '#3b4a6b', '#55595e', '#7b3b2f', '#1a1a1a'];
    const rnd = (a) => a[Math.floor(Math.random() * a.length)];
    const look = {
      skin: rnd(SK), hair: rnd(['short', 'buzz', 'curly', 'afro', 'braids', 'bun', 'long', 'ponytail']), hairColor: rnd(HC.slice(0, 5)),
      beard: 'none', top: rnd(['tee', 'hoodie', 'button', 'tank']), topColor: rnd(CC), top2: '#e8e2d4', bottom: rnd(['jeans', 'slacks', 'shorts']),
      bottomColor: rnd(PC), shoes: rnd(['#ececec', '#1b1b1e', '#8a5b3c']), build: rnd(['slim', 'avg', 'avg', 'heavy', 'muscle']), height: 1, hat: null, glasses: false,
    };
    const st = { name: rnd(NAMES_PLAYER), dayLen: this.g.settings.dayLen };
    const prev = document.createElement('canvas');
    prev.className = 'preview';
    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      prev.width = 220 * dpr;
      prev.height = 260 * dpr;
      prev.style.width = '220px';
      prev.style.height = '260px';
      const ctx = prev.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, 220, 260);
      const faces = ['down', 'right', 'up', 'left'];
      const f = faces[Math.floor(performance.now() / 1600) % 4];
      ctx.translate(110, 236);
      ctx.scale(4.2, 4.2);
      drawPerson(ctx, look, { face: f, pose: 'stand', t: performance.now() / 1000, moving: true, phase: performance.now() / 160 });
    };
    const anim = () => {
      if (box.classList.contains('hidden')) return;
      draw();
      requestAnimationFrame(anim);
    };
    const picker = (label, key, opts, isColor) => {
      const row = el('div', { class: 'pick' }, el('span', {}, label));
      const btns = [];
      for (const o of opts) {
        const val = Array.isArray(o) ? o[0] : o;
        const txt = Array.isArray(o) ? o[1] : o;
        const b = el('button', { class: `${isColor ? 'sw' : 'opt'}${look[key] === val ? ' on' : ''}`, style: isColor ? `background:${val}` : '', title: txt, onclick: () => {
          look[key] = val;
          if (key === 'top' && val === 'apron') look.top2 = '#3b6fa0';
          for (const x of btns) x.classList.toggle('on', x === b);
        } }, isColor ? '' : txt);
        btns.push(b);
        row.append(b);
      }
      return row;
    };
    const name = el('input', { type: 'text', value: st.name, maxlength: 16 });
    name.addEventListener('input', () => (st.name = name.value));
    const day = el('select', {}, ...[[480, '8 min'], [600, '10 min'], [720, '12 min']].map(([v, l]) => el('option', { value: v, selected: st.dayLen === v ? 'selected' : null }, l)));
    day.addEventListener('change', () => (st.dayLen = Number(day.value)));
    const form = el('div', { class: 'form' },
      el('label', { class: 'name' }, 'Name', name),
      picker('Skin', 'skin', SK, true),
      picker('Hair', 'hair', [['short', 'Short'], ['buzz', 'Buzz'], ['curly', 'Curly'], ['afro', 'Afro'], ['braids', 'Braids'], ['bun', 'Bun'], ['long', 'Long'], ['ponytail', 'Tail'], ['bald', 'Bald']]),
      picker('Hair color', 'hairColor', HC, true),
      picker('Face', 'beard', [['none', 'Clean'], ['stubble', 'Stubble'], ['goatee', 'Goatee'], ['full', 'Beard']]),
      picker('Top', 'top', [['tee', 'Tee'], ['tank', 'Tank'], ['hoodie', 'Hoodie'], ['button', 'Button-up'], ['jacket', 'Jacket']]),
      picker('Top color', 'topColor', CC, true),
      picker('Bottom', 'bottom', [['jeans', 'Jeans'], ['slacks', 'Slacks'], ['shorts', 'Shorts'], ['skirt', 'Skirt']]),
      picker('Bottom color', 'bottomColor', PC, true),
      picker('Build', 'build', [['slim', 'Slim'], ['avg', 'Average'], ['heavy', 'Heavy'], ['muscle', 'Muscular']]),
      picker('Hat', 'hat', [[null, 'None'], ['cap', 'Cap'], ['beanie', 'Beanie']]),
      picker('Glasses', 'glasses', [[false, 'No'], [true, 'Yes']]),
      el('label', { class: 'name' }, 'Day length', day),
    );
    box.append(el('div', { class: 'createcard' },
      el('h2', {}, 'Who are you?'),
      el('div', { class: 'createrow' }, el('div', { class: 'prevwrap' }, prev), form),
      el('div', { class: 'createbtns' },
        el('button', { onclick: () => { box.classList.add('hidden'); this.showTitle(this.g.hasSave(), this.g.saveSummary()); } }, 'Back'),
        el('button', { onclick: () => this.showCreate() }, 'Shuffle'),
        el('button', { class: 'primary', onclick: () => { if (look.hat === 'cap') look.hatColor = look.topColor; this.g.newGame(st.name.trim() || 'Marcus', look, st.dayLen); } }, 'Start your life'),
      ),
    ));
    anim();
  }
}

const HELP = `
<p><b>H-Town Nights</b> is a life sim. No missions, no win screen. Eat, sleep, work, drive, rent, talk, fight and build a name. People keep a memory of what you did — and they bring it up.</p>
<ul>
<li><kbd>WASD</kbd>/<kbd>arrows</kbd> move · <kbd>Shift</kbd> run · <kbd>E</kbd> act / talk / pick up</li>
<li><kbd>F</kbd> strike (or fire) · <kbd>Space</kbd> back off · <kbd>R</kbd> use what you hold · <kbd>Q</kbd> drop it</li>
<li><kbd>I</kbd> bag · <kbd>P</kbd> people · <kbd>C</kbd> you · <kbd>B</kbd> board · <kbd>L</kbd> log · <kbd>Esc</kbd> menu</li>
<li>Driving: <kbd>W</kbd>/<kbd>S</kbd> gas and brake · <kbd>A</kbd>/<kbd>D</kbd> steer · <kbd>Space</kbd> handbrake · <kbd>E</kbd> get out · <kbd>R</kbd> radio</li>
<li>Touch: left thumb is the stick, buttons on the right.</li>
</ul>
<p><b>Talk</b> in three tones: <i>Easy</i>, <i>Straight</i>, <i>Hard</i>. Intellect and reputation shift the odds. Straight talk with someone who likes you can turn into a favor. A hard line can start a fight — or make someone pay up.</p>
<p><b>Work</b> is a place: read the boards, ask the boss. Diner, Quik Stop, the warehouse, the job site, the gym desk, St. Ann's, bank courier, street sweeping, and cabs once you're licensed. Hours lead to promotions, more pay, and a staff room.</p>
<p><b>Money</b> is an item. If you drop, everything you carry lands where you fell. The bank keeps what you deposit (weekly cap). Rent is due Sunday nights — miss it and the door won't open.</p>
<p><b>Paper</b>: driver and firearm permits at the 5th Precinct. Your old sedan is parked outside Bayou Arms — it won't start until you're licensed.</p>
<p><b>The other economy</b>: lease a storage unit, grow bayou bloom, run a mining rig, sell at the bank terminal or to someone who remembers the deal. It all brings heat. High heat gets you stopped and searched.</p>
<p><b>Crews</b>: the Cottonmouths and the Canal Kings. Stay solo, get asked, or ask. Insult a rival in public and the street remembers.</p>
<p><b>Home</b>: Harbor Pawn & Thrift delivers furniture to anywhere you lease. Use the Home button inside to arrange it.</p>`;
