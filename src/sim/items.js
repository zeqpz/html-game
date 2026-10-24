// Items: instances, grid containers, ground items, pickup/drop/use, dawn spawns.

import { ITEMS, SPAWN_TABLES, LOOSE_CASH } from '../data/items.js';
import { remember, adjustRel, witnesses } from './memory.js';
import { clamp } from './util.js';

export function newItem(sim, def, extra = {}) {
  const uid = 'i' + sim.s.uid++;
  const it = { uid, def, where: 'gone', ...extra };
  if (ITEMS[def].stack && !it.n) it.n = 1;
  sim.s.items[uid] = it;
  return it;
}

export const itemName = (it) => {
  const d = ITEMS[it.def];
  if (d.kind === 'cash') return `$${it.n}`;
  return d.name;
};

export function makeCont(sim, id, w, h, owner = null) {
  if (!sim.s.conts[id]) sim.s.conts[id] = { id, w, h, items: [], owner };
  return sim.s.conts[id];
}

function dims(it) {
  const d = ITEMS[it.def];
  return it.rot ? [d.h, d.w] : [d.w, d.h];
}

function occupied(sim, cont, ignoreUid) {
  const g = new Uint8Array(cont.w * cont.h);
  for (const uid of cont.items) {
    if (uid === ignoreUid) continue;
    const it = sim.s.items[uid];
    const [w, h] = dims(it);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const gx = it.gx + x;
      const gy = it.gy + y;
      if (gx < cont.w && gy < cont.h) g[gy * cont.w + gx] = 1;
    }
  }
  return g;
}

export function fitsAt(sim, cont, it, gx, gy, rot, ignoreUid) {
  const d = ITEMS[it.def];
  const [w, h] = rot ? [d.h, d.w] : [d.w, d.h];
  if (gx < 0 || gy < 0 || gx + w > cont.w || gy + h > cont.h) return false;
  const g = occupied(sim, cont, ignoreUid);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (g[(gy + y) * cont.w + gx + x]) return false;
  return true;
}

export function findSlot(sim, cont, it) {
  for (const rot of [0, 1]) {
    for (let gy = 0; gy < cont.h; gy++) for (let gx = 0; gx < cont.w; gx++) {
      if (fitsAt(sim, cont, it, gx, gy, rot, it.uid)) return { gx, gy, rot };
    }
  }
  return null;
}

// Detach an item from wherever it is.
export function detach(sim, it) {
  if (it.where === 'ground') {
    const rs = sim.roomState(it.room);
    rs.items = rs.items.filter((u) => u !== it.uid);
  } else if (it.where === 'cont') {
    const c = sim.s.conts[it.cont];
    if (c) c.items = c.items.filter((u) => u !== it.uid);
  } else if (it.where === 'hands') {
    const a = sim.s.actors[it.actor];
    if (a && a.hands === it.uid) a.hands = null;
  } else if (it.where === 'npc') {
    const a = sim.s.actors[it.actor];
    if (a) a.inv = a.inv.filter((u) => u !== it.uid);
  }
  it.where = 'gone';
  delete it.room; delete it.x; delete it.y; delete it.cont; delete it.gx; delete it.gy; delete it.actor;
}

export function destroy(sim, it) {
  detach(sim, it);
  delete sim.s.items[it.uid];
}

export function placeGround(sim, it, room, x, y) {
  detach(sim, it);
  it.where = 'ground';
  it.room = room;
  it.x = x;
  it.y = y;
  it.droppedAt = sim.s.t;
  sim.roomState(room).items.push(it.uid);
}

// Put into a container. Cash merges with an existing stack.
export function putInCont(sim, it, contId, at = null) {
  const cont = sim.s.conts[contId];
  if (!cont) return false;
  const d = ITEMS[it.def];
  if (d.stack) {
    const same = cont.items.map((u) => sim.s.items[u]).find((o) => o && o.def === it.def && o.uid !== it.uid);
    if (same) {
      same.n += it.n;
      destroy(sim, it);
      return true;
    }
  }
  const slot = at && fitsAt(sim, cont, it, at.gx, at.gy, at.rot, it.uid) ? at : findSlot(sim, cont, it);
  if (!slot) return false;
  detach(sim, it);
  it.where = 'cont';
  it.cont = contId;
  it.gx = slot.gx;
  it.gy = slot.gy;
  it.rot = slot.rot;
  cont.items.push(it.uid);
  return true;
}

export function putInHands(sim, a, it) {
  if (a.hands) return false;
  detach(sim, it);
  it.where = 'hands';
  it.actor = a.id;
  a.hands = it.uid;
  return true;
}

export function giveNpc(sim, npc, it) {
  detach(sim, it);
  if (ITEMS[it.def].kind === 'cash') {
    npc.cash += it.n;
    delete sim.s.items[it.uid];
    return;
  }
  it.where = 'npc';
  it.actor = npc.id;
  it.lastOwner = it.owner;
  it.owner = npc.id;
  npc.inv.push(it.uid);
}

export function cashOnBody(sim, a) {
  if (a.kind === 'npc') return a.cash;
  let n = 0;
  const h = a.hands && sim.s.items[a.hands];
  if (h && h.def === 'cash') n += h.n;
  const c = sim.s.conts[a.pockets];
  if (c) for (const u of c.items) if (sim.s.items[u].def === 'cash') n += sim.s.items[u].n;
  return n;
}

// Take `amt` cash from the player's body. Returns false if short.
export function spendCash(sim, a, amt) {
  if (a.kind === 'npc') {
    if (a.cash < amt) return false;
    a.cash -= amt;
    return true;
  }
  if (cashOnBody(sim, a) < amt) return false;
  let left = amt;
  const stacks = [];
  if (a.hands && sim.s.items[a.hands].def === 'cash') stacks.push(sim.s.items[a.hands]);
  for (const u of sim.s.conts[a.pockets].items) if (sim.s.items[u].def === 'cash') stacks.push(sim.s.items[u]);
  for (const st of stacks) {
    const take = Math.min(st.n, left);
    st.n -= take;
    left -= take;
    if (st.n <= 0) destroy(sim, st);
    if (left <= 0) break;
  }
  return true;
}

export function addCash(sim, a, amt) {
  if (amt <= 0) return true;
  if (a.kind === 'npc') {
    a.cash += amt;
    return true;
  }
  const it = newItem(sim, 'cash', { n: Math.round(amt) });
  if (putInCont(sim, it, a.pockets)) return true;
  if (putInHands(sim, a, it)) return true;
  placeGround(sim, it, a.room, a.x, a.y + 6);
  sim.toast('Pockets full — the cash fell at your feet.', 'warn');
  return false;
}

// Give an item to the player: pockets first (unless hands-only), then hands.
export function receive(sim, a, it) {
  const d = ITEMS[it.def];
  if (!d.handsOnly && putInCont(sim, it, a.pockets)) return 'pockets';
  if (!a.hands && putInHands(sim, a, it)) return 'hands';
  return null;
}

export function groundNear(sim, room, x, y, r = 34) {
  let best = null;
  let bd = r;
  for (const u of sim.roomState(room).items) {
    const it = sim.s.items[u];
    const d = Math.hypot(it.x - x, it.y - y);
    if (d < bd) {
      bd = d;
      best = it;
    }
  }
  return best;
}

// Someone picks an item off the floor. Ownership is remembered by witnesses.
export function pickUp(sim, a, it) {
  const d = ITEMS[it.def];
  const owner = it.owner;
  const room = it.room;
  const x = it.x;
  const y = it.y;
  let where;
  if (a.kind === 'player') {
    if (d.kind === 'cash') {
      where = putInCont(sim, it, a.pockets) ? 'pockets' : (putInHands(sim, a, it) ? 'hands' : null);
    } else {
      where = !a.hands && (d.handsOnly || d.kind === 'weapon' || d.kind === 'tool') ? (putInHands(sim, a, it) ? 'hands' : null) : receive(sim, a, it);
    }
    if (!where) {
      sim.toast(a.hands ? 'Hands full. Drop or pocket what you\'re holding.' : 'No room for that.', 'warn');
      return false;
    }
    sim.sfx('pickup');
  } else {
    if (d.kind === 'cash') {
      a.cash += it.n;
      if (owner === 'p') a.took = (a.took || 0) + it.n;
      destroy(sim, it);
      where = 'npc';
    } else {
      giveNpc(sim, a, it);
      where = 'npc';
    }
  }
  if (owner && owner !== a.id) {
    const ownerA = sim.s.actors[owner];
    for (const w of witnesses(sim, room, x, y, [a.id])) {
      if (w.id === owner) {
        remember(sim, w, { type: 'took', who: a.id, item: it.def });
        adjustRel(sim, w, a.id, -18);
        sim.say(w, 'takeBack', { item: d.name.toLowerCase() });
      } else {
        remember(sim, w, { type: 'pocketed', who: a.id, x: owner, item: it.def });
        if (ownerA && w.rel[owner] && w.rel[owner].v > 10) adjustRel(sim, w, a.id, -4);
      }
    }
  }
  if (a.kind === 'player') {
    it.owner = 'p';
    sim.log(`Picked up ${itemName(it)}.`);
  }
  return where;
}

export function dropHands(sim, a) {
  if (!a.hands) return null;
  const it = sim.s.items[a.hands];
  placeGround(sim, it, a.room, a.x + (a.face === 'left' ? -14 : a.face === 'right' ? 14 : 0), a.y + (a.face === 'up' ? -10 : 10));
  if (a.kind === 'player') {
    it.owner = 'p';
    sim.sfx('drop');
  }
  return it;
}

// Use a consumable / book from hands or pockets.
export function useItem(sim, a, it) {
  const d = ITEMS[it.def];
  const st = a.stats;
  const parts = [];
  if (d.kind === 'food' || d.kind === 'drink') {
    if (d.hunger) { st.hunger = clamp(st.hunger + d.hunger, 0, 100); parts.push('hunger'); }
    if (d.thirst) { st.thirst = clamp(st.thirst + d.thirst, 0, 100); parts.push('thirst'); }
    if (d.mind) st.mind = clamp(st.mind + d.mind + (a.act === 'sit' ? 4 : 0), 0, 100);
    sim.sfx(d.kind === 'food' ? 'eat' : 'drink');
    sim.log(`${d.kind === 'food' ? 'Ate' : 'Drank'} the ${d.name.toLowerCase()}.`);
    destroy(sim, it);
    return true;
  }
  if (d.kind === 'med') {
    st.health = clamp(st.health + d.health, 0, 100);
    sim.sfx('pickup');
    sim.log(`Patched up with the ${d.name.toLowerCase()}.`);
    destroy(sim, it);
    return true;
  }
  if (d.kind === 'book') {
    sim.startTask(a, { kind: 'read', dur: 6, label: `Reading ${d.name}`, item: it.uid });
    return true;
  }
  return false;
}

// Finish a reading session: intellect ticks up, with diminishing returns per day.
export function finishRead(sim, a, uid) {
  const it = sim.s.items[uid];
  if (!it) return;
  const d = ITEMS[it.def];
  const key = 'read_' + Math.floor(sim.s.t / 1440);
  a.lastUse.intellect = sim.s.t;
  const count = (sim.s.flags[key] = (sim.s.flags[key] || 0) + 1);
  const gain = d.intellect / count;
  a.stats.intellect = clamp(a.stats.intellect + gain, 0, 100);
  a.stats.mind = clamp(a.stats.mind + d.mind, 0, 100);
  sim.log(`Read some of the ${d.name.toLowerCase()}. Intellect +${gain.toFixed(1)}.`);
  if (it.def === 'manual') sim.s.flags.readManual = (sim.s.flags.readManual || 0) + 1;
}

// Dawn and empty-room spawns.
export function spawnInRoom(sim, roomId, count) {
  const r = sim.world.room(roomId);
  if (!r || r.kind === 'offmap') return;
  const def = r.def;
  const table = SPAWN_TABLES[def.spawn];
  if (!table || !def.itemSpawns || !def.itemSpawns.length) return;
  const rs = sim.roomState(roomId);
  const cap = r.kind === 'street' ? 8 : 4;
  for (let i = 0; i < count; i++) {
    if (rs.items.length >= cap) return;
    const [sx, sy] = sim.rng.pick(def.itemSpawns);
    const taken = rs.items.some((u) => Math.hypot(sim.s.items[u].x - sx, sim.s.items[u].y - sy) < 30);
    if (taken) continue;
    const kind = sim.rng.weighted(table);
    const it = newItem(sim, kind);
    if (kind === 'cash') it.n = sim.rng.int(LOOSE_CASH[0], LOOSE_CASH[1]);
    placeGround(sim, it, roomId, sx + sim.rng.range(-8, 8), sy + sim.rng.range(-6, 6));
  }
}

export function contItems(sim, contId) {
  const c = sim.s.conts[contId];
  return c ? c.items.map((u) => sim.s.items[u]) : [];
}
