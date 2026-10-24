// Furniture: bought at the pawn shop, delivered to one of your leases, and
// placed by you. It is saved with the lease. You can only place inside your own.

import { FURNITURE } from '../data/rooms3.js';
import { ROOMS } from '../data/rooms.js';
import { spendCash, makeCont, contItems } from './items.js';
import { rectHit } from './util.js';

export class Furniture {
  constructor(sim) {
    this.sim = sim;
    if (!sim.s.furn) sim.s.furn = {};
    for (const room in sim.s.furn) sim.world.applyFurniture(room, sim.s.furn[room]);
  }

  // Leases that take furniture and are yours right now.
  homes() {
    const s = this.sim.s;
    return Object.keys(ROOMS).filter((id) => {
      const def = ROOMS[id];
      if (id === 'apt_2b') return true;
      return def.furnish && s.leases && s.leases[def.lease];
    });
  }

  canArrangeHere() {
    return this.homes().includes(this.sim.player.room);
  }

  list(room) {
    return this.sim.s.furn[room] || [];
  }

  buy(type, room) {
    const sim = this.sim;
    const F = FURNITURE[type];
    if (!F) return { ok: false, text: 'Not for sale.' };
    if (!this.homes().includes(room)) return { ok: false, text: 'Sal only delivers to places you lease.' };
    if (!spendCash(sim, sim.player, F.price)) return { ok: false, text: `$${F.price}, cash.` };
    const uid = 'f' + sim.s.uid++;
    const rec = { uid, type, placed: false };
    if (F.cont) makeCont(sim, `${room}:f_${uid}`, F.cont.w, F.cont.h, room);
    (sim.s.furn[room] ||= []).push(rec);
    sim.sfx('cash');
    sim.log(`Bought a ${F.name.toLowerCase()} — delivered to ${sim.world.room(room).name}. Arrange it when you're there.`, 'good');
    sim.wantSave = true;
    return { ok: true, text: `Delivered to ${sim.world.room(room).name}.` };
  }

  rectFor(type, x, y) {
    const F = FURNITURE[type];
    return { x, y, w: F.w, h: F.h };
  }

  valid(room, uid, x, y) {
    const sim = this.sim;
    const f = this.list(room).find((q) => q.uid === uid);
    if (!f) return false;
    const r = sim.world.room(room);
    const R = this.rectFor(f.type, x, y);
    const b = r.bounds;
    if (R.x < b.x || R.y < b.y || R.x + R.w > b.x + b.w || R.y + R.h > b.y + b.h - 4) return false;
    for (const s of r.solids) {
      if (s.furn === uid) continue;
      if (R.x < s.x + s.w && R.x + R.w > s.x && R.y < s.y + s.h && R.y + R.h > s.y) return false;
    }
    for (const d of r.doors) {
      const z = d.zone;
      if (R.x < z.x + z.w + 20 && R.x + R.w > z.x - 20 && R.y < z.y + z.h + 30 && R.y + R.h > z.y - 30) return false;
    }
    const p = sim.player;
    if (rectHit({ x: R.x - 9, y: R.y - 9, w: R.w + 18, h: R.h + 18 }, p.x, p.y)) return false;
    return true;
  }

  place(room, uid, x, y) {
    const sim = this.sim;
    const f = this.list(room).find((q) => q.uid === uid);
    if (!f) return { ok: false, text: 'Not here.' };
    if (!this.valid(room, uid, x, y)) return { ok: false, text: "It won't fit there." };
    f.placed = true;
    f.x = Math.round(x);
    f.y = Math.round(y);
    sim.world.applyFurniture(room, this.list(room));
    sim.sfx('drop');
    sim.wantSave = true;
    return { ok: true, text: `Placed the ${FURNITURE[f.type].name.toLowerCase()}.` };
  }

  pickup(room, uid) {
    const sim = this.sim;
    const f = this.list(room).find((q) => q.uid === uid);
    if (!f || !f.placed) return { ok: false, text: 'Nothing to pick up.' };
    if (FURNITURE[f.type].cont && contItems(sim, `${room}:f_${uid}`).length) return { ok: false, text: 'Empty the shelf first.' };
    if (Object.values(sim.s.actors).some((a) => a.spot && a.spot.room === room && a.spot.prop === `f_${uid}`)) return { ok: false, text: 'Somebody is using it.' };
    f.placed = false;
    sim.world.applyFurniture(room, this.list(room));
    sim.wantSave = true;
    return { ok: true, text: 'Picked up.' };
  }
}
