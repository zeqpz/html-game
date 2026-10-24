// Relationships and memory lines. Every NPC keeps a number + tag toward the
// people they've actually met, and up to eight specific lines.

import { MEMORY } from '../data/lines.js';
import { ITEMS } from '../data/items.js';
import { PERSONALITIES } from '../data/personalities.js';
import { clamp, agoText, money } from './util.js';

export const MEM_MAX = 8;

export function rel(a, id) {
  return a.rel[id] || { v: 0, tag: null, met: false };
}

export function relV(a, id) {
  return a.rel[id] ? a.rel[id].v : 0;
}

function ensure(a, id) {
  if (!a.rel[id]) a.rel[id] = { v: 0, tag: null, met: false };
  return a.rel[id];
}

export function meet(a, id) {
  ensure(a, id).met = true;
}

export function adjustRel(sim, a, id, dv) {
  if (!a || a.id === id) return 0;
  const r = ensure(a, id);
  r.met = true;
  const before = r.v;
  r.v = clamp(r.v + dv, -100, 100);
  if (id === 'p' && a.kind === 'npc') {
    const d = Math.round(r.v - before);
    if (d !== 0) sim.emit('rel', { id: a.id, d, v: r.v });
  }
  return r.v - before;
}

export function setTag(a, id, tag) {
  ensure(a, id).tag = tag;
}

// stranger, neighbor, friend, rival, boss, crew
export function displayTag(a, id) {
  const r = a.rel[id];
  if (!r) return 'stranger';
  if (r.tag === 'crew' || r.tag === 'boss') return r.tag;
  if (r.v >= 30) return 'friend';
  if (r.v <= -30) return 'rival';
  if (r.tag === 'neighbor') return 'neighbor';
  return 'stranger';
}

export function tier(v) {
  if (v <= -40) return 'hostile';
  if (v <= -10) return 'cold';
  if (v < 15) return 'neutral';
  if (v < 45) return 'warm';
  return 'close';
}

// Record a line. Same type+subject within half an hour refreshes instead of stacking.
export function remember(sim, a, entry) {
  if (!a || a.kind !== 'npc') return;
  const e = { t: sim.s.t, room: a.room, ...entry };
  const dupe = a.mem.find((m) => m.type === e.type && m.who === e.who && m.x === e.x && e.t - m.t < 30);
  if (dupe) {
    Object.assign(dupe, e);
    a.mem.splice(a.mem.indexOf(dupe), 1);
    a.mem.push(dupe);
    return;
  }
  a.mem.push(e);
  while (a.mem.length > MEM_MAX) a.mem.shift();
  if (e.who === 'p' || e.x === 'p') sim.emit('memory', { id: a.id, type: e.type });
}

// Grudges scale with personality.
export function grudgeMul(a) {
  return PERSONALITIES[a.personality]?.grudge || 1;
}

export function latest(a) {
  return a.mem.length ? a.mem[a.mem.length - 1] : null;
}

// Latest line that involves the player, if any.
export function latestAboutPlayer(a) {
  for (let i = a.mem.length - 1; i >= 0; i--) {
    if (a.mem[i].who === 'p' || a.mem[i].x === 'p') return a.mem[i];
  }
  return null;
}

function nameOf(sim, id, listener) {
  if (id === 'p') return listener === 'p' ? 'you' : sim.s.actors.p.name;
  const a = sim.s.actors[id];
  return a ? a.short : 'somebody';
}

function fill(sim, tmpl, m, listener) {
  const it = m.item ? ITEMS[m.item]?.name.toLowerCase() : 'that';
  return tmpl
    .replace(/\{t\}/g, nameOf(sim, m.who, listener))
    .replace(/\{x\}/g, nameOf(sim, m.x, listener))
    .replace(/\{item\}/g, it)
    .replace(/\{amt\}/g, m.amt ? money(m.amt) : 'some money')
    .replace(/\{task\}/g, m.task || 'help')
    .replace(/\{ago\}/g, agoText(sim.s.t, m.t))
    .replace(/\{p\}/g, sim.s.actors.p.name);
}

// What the NPC says out loud about memory `m` when talking to the player.
export function quote(sim, a, m) {
  const T = MEMORY[m.type];
  if (!T) return '';
  const aboutYou = m.who === 'p';
  let pool = aboutYou ? T.you : T.them;
  // witness lines where the player is the victim read naturally as gossip
  if (!aboutYou && m.x === 'p') pool = T.them;
  const line = pool[Math.floor(sim.rng.next() * pool.length)];
  return fill(sim, line, m, aboutYou ? 'p' : a.id);
}

// Short first-person summary for the People panel.
export function summary(sim, a, m) {
  const T = MEMORY[m.type];
  if (!T) return m.type;
  let s = fill(sim, T.mine, m, null);
  s = s.charAt(0).toUpperCase() + s.slice(1);
  return `${s} · ${agoText(sim.s.t, m.t)}`;
}

// NPCs who can see what happens at (room, x, y).
export function witnesses(sim, room, x, y, exclude = []) {
  const out = [];
  const r = sim.world.room(room);
  const radius = r && r.kind === 'street' ? 520 : 2000;
  for (const id in sim.s.actors) {
    const a = sim.s.actors[id];
    if (a.kind !== 'npc' || a.room !== room || !a.loaded) continue;
    if (exclude.includes(id)) continue;
    if (a.act === 'sleep' || a.downUntil) continue;
    if (Math.hypot(a.x - x, a.y - y) > radius) continue;
    out.push(a);
  }
  return out;
}
