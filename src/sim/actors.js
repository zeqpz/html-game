// Actor records (player and NPCs), derived stats, needs, and body movement.

import { clamp, approach, inWindow, hm, tod } from './util.js';
import { ITEMS } from '../data/items.js';
import { PERSONALITIES } from '../data/personalities.js';
import { ACTOR_R } from './world.js';

export const STAT_KEYS = ['health', 'mind', 'hunger', 'thirst', 'stamina', 'strength', 'agility', 'aim', 'intellect', 'reputation'];

export function makePlayer(name, look) {
  return {
    id: 'p', kind: 'player', name, short: name, personality: 'steady', role: 'You', look,
    stats: { health: 100, mind: 80, hunger: 70, thirst: 70, stamina: 100, strength: 30, agility: 32, aim: 8, intellect: 35, reputation: 25 },
    heat: 0, bank: 0, bankLog: [], weekDeposits: 0, weekKey: 0,
    room: 'apt_2b', x: 300, y: 330, face: 'down',
    hands: null, pockets: 'p:pockets',
    act: 'idle', spot: null, loaded: true, transit: null,
    awakeSince: 0, lastUse: {}, licenses: {},
    rel: {}, mem: [],
  };
}

export function makeNpc(def) {
  const P = PERSONALITIES[def.personality];
  return {
    id: def.id, kind: 'npc', name: def.name, short: def.short, personality: def.personality, role: def.role, look: def.look,
    stats: { health: 100, mind: 70, hunger: 70, thirst: 70, stamina: 100, ...def.stats },
    cash: def.cash || 20, inv: [],
    home: def.home, hangout: def.hangout, sched: def.sched, staffOf: def.staffOf || null, boss: def.boss || null,
    favors: def.favors || [], neighbor: !!def.neighbor, police: !!def.police, sells: def.sells || null,
    crew: def.crew || null, buyer: !!def.buyer, landlord: def.landlord || null,
    room: def.home, x: 0, y: 0, face: 'down',
    hands: null, act: 'idle', spot: null, loaded: false, transit: null,
    downUntil: 0, hospitalUntil: 0, fightWith: null,
    rel: {}, mem: [],
    speed: P ? P.speed : 1,
  };
}

// Transient per-actor scratch (paths, timers, anim). Never saved.
export function scratch(a) {
  if (!a._) a._ = { vx: 0, vy: 0, path: null, goal: null, thinkAt: 0, anim: 0, strikeT: 0, backT: 0, hurtT: 0, cd: 0, staminaWait: 0, bubble: null, walkPhase: 0 };
  return a._;
}

export function carriedWeight(sim, a) {
  let w = 0;
  if (a.hands) w += itemWeight(sim, a.hands);
  if (a.kind === 'player') {
    const c = sim.s.conts[a.pockets];
    if (c) for (const uid of c.items) w += itemWeight(sim, uid);
  }
  return w;
}

function itemWeight(sim, uid) {
  const it = sim.s.items[uid];
  if (!it) return 0;
  const d = ITEMS[it.def];
  return d.stack ? d.wt * Math.ceil((it.n || 1) / 100) : d.wt;
}

export const capacity = (a) => 8 + a.stats.strength * 0.12; // kg before you slow down

export function walkSpeed(sim, a) {
  const st = a.stats;
  let v = 92 + st.agility * 0.55;
  if (a.kind === 'npc') v *= a.speed || 1;
  const over = carriedWeight(sim, a) - capacity(a);
  if (over > 0) v *= clamp(1 - over * 0.06, 0.45, 1);
  if (st.health < 30) v *= 0.75;
  return v;
}

export function sprintMul(a) {
  return 1.55 + a.stats.agility * 0.003;
}

// Integrate one body: desired velocity -> velocity -> position -> collision.
export function moveBody(sim, a, dx, dy, speed, dt) {
  const _ = scratch(a);
  const len = Math.hypot(dx, dy);
  let tx = 0;
  let ty = 0;
  if (len > 0.01) {
    tx = (dx / len) * speed * Math.min(1, len);
    ty = (dy / len) * speed * Math.min(1, len);
  }
  const k = Math.min(1, dt * 14);
  _.vx += (tx - _.vx) * k;
  _.vy += (ty - _.vy) * k;
  // knockback impulse rides on top and decays on its own
  let kx = 0;
  let ky = 0;
  if (_.kx || _.ky) {
    kx = _.kx;
    ky = _.ky;
    _.kx *= Math.max(0, 1 - dt * 9);
    _.ky *= Math.max(0, 1 - dt * 9);
    if (Math.abs(_.kx) + Math.abs(_.ky) < 4) _.kx = _.ky = 0;
  }
  const nx = a.x + (_.vx + kx) * dt;
  const ny = a.y + (_.vy + ky) * dt;
  const p = { x: nx, y: ny };
  sim.world.collide(a.room, p, ACTOR_R, sim.dynamicSolids(a.room));
  a.x = p.x;
  a.y = p.y;
  if (sim.cars) sim.cars.pushActor(a);
  const sp = Math.hypot(_.vx, _.vy);
  if (sp > 12) {
    _.walkPhase += sp * dt * 0.09;
    if (Math.abs(_.vx) > Math.abs(_.vy) * 1.1) a.face = _.vx < 0 ? 'left' : 'right';
    else a.face = _.vy < 0 ? 'up' : 'down';
  }
  _.speed = sp;
  return sp;
}

export function faceToward(a, x, y) {
  const dx = x - a.x;
  const dy = y - a.y;
  if (Math.abs(dx) > Math.abs(dy)) a.face = dx < 0 ? 'left' : 'right';
  else a.face = dy < 0 ? 'up' : 'down';
}

export const FACE_VEC = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

// Needs drift for the player, per elapsed game minutes.
export function playerNeeds(sim, a, dm) {
  const st = a.stats;
  const h = dm / 60;
  const sleeping = a.act === 'sleep';
  const resting = a.act === 'sit' || a.act === 'lie';
  st.hunger = clamp(st.hunger - (sleeping ? 2.4 : 5) * h, 0, 100);
  st.thirst = clamp(st.thirst - (sleeping ? 3 : 6.5) * h, 0, 100);
  const awakeH = (sim.s.t - a.awakeSince) / 60;
  let dMind = -1.4;
  if (!sleeping && awakeH > 16) dMind -= 2.2;
  if (st.hunger <= 0) dMind -= 4;
  if (st.thirst <= 0) dMind -= 5;
  if (resting) dMind += 2.5;
  if (sleeping) dMind = 9;
  st.mind = clamp(st.mind + dMind * h, 0, 100);
  let dHp = 0;
  if (st.hunger > 35 && st.thirst > 35) dHp += 1.2;
  if (sleeping) dHp += 4;
  if (st.hunger <= 0) dHp -= 6;
  if (st.thirst <= 0) dHp -= 8;
  if (!a.dead) st.health = clamp(st.health + dHp * h, 0, 100);
  // skills fade a little when unused
  for (const k of ['strength', 'agility', 'aim', 'intellect']) {
    const last = a.lastUse[k] || 0;
    if (sim.s.t - last > 1440) st[k] = Math.max(5, st[k] - 0.3 * (dm / 1440));
  }
  // heat cools off when you stay clean
  if (a.heat > 0) a.heat = Math.max(0, a.heat - 1.6 * h);
}

export function npcNeeds(sim, a, dm) {
  const st = a.stats;
  const h = dm / 60;
  const sleeping = a.act === 'sleep';
  st.hunger = clamp(st.hunger - (sleeping ? 2 : 4.5) * h, 0, 100);
  st.thirst = clamp(st.thirst - (sleeping ? 2 : 5) * h, 0, 100);
  if (a.act === 'eat') {
    st.hunger = clamp(st.hunger + 70 * h, 0, 100);
    st.thirst = clamp(st.thirst + 60 * h, 0, 100);
  }
  if (sleeping || a.act === 'rest') st.mind = clamp(st.mind + 6 * h, 0, 100);
  else st.mind = clamp(st.mind - 0.8 * h + (st.hunger < 20 ? -2 * h : 0), 0, 100);
  if (!a.downUntil) st.health = clamp(st.health + (sleeping ? 6 : 2) * h, 0, 100);
}

// Current schedule block for an NPC: { act, room, target }.
export function schedNow(a, t) {
  const m = tod(t);
  for (const [from, to, act, room, target] of a.sched || []) {
    if (inWindow(m, hm(from), hm(to))) return { act, room, target: target || null, from, to };
  }
  return { act: 'rest', room: a.home, target: null };
}

export function staminaTick(a, dt, spending) {
  const _ = scratch(a);
  if (spending) {
    _.staminaWait = 0.7;
    return;
  }
  if (_.staminaWait > 0) {
    _.staminaWait -= dt;
    return;
  }
  const st = a.stats;
  const rate = 16 + st.agility * 0.12;
  st.stamina = approach(st.stamina, 100, rate * dt);
}
