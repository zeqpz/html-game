// Backgrounds from the character creator: stat nudges, spent points, starting
// cash, people who already know you. Used for new games and new lives.

import { ORIGINS, ALLOC_STATS, ALLOC_POINTS, ALLOC_MAX, ALLOC_STEP } from '../data/looks.js';
import { MODELS } from '../data/cars.js';
import * as items from './items.js';
import { clamp } from './util.js';

export function applyOrigin(sim, p, id, alloc) {
  const O = ORIGINS[id] || ORIGINS.newcomer;
  p.origin = ORIGINS[id] ? id : 'newcomer';
  for (const k in O.stats || {}) p.stats[k] = clamp(p.stats[k] + O.stats[k], 1, 100);
  let left = ALLOC_POINTS;
  for (const [k] of ALLOC_STATS) {
    const n = Math.min(ALLOC_MAX, left, Math.max(0, Math.floor((alloc && alloc[k]) || 0)));
    left -= n;
    p.stats[k] = clamp(p.stats[k] + n * ALLOC_STEP, 1, 100);
  }
  p.heat = clamp((p.heat || 0) + (O.heat || 0), 0, 100);
  for (const npc in O.knows || {}) {
    const n = sim.s.actors[npc];
    if (n) n.rel.p = { v: O.knows[npc], tag: (n.rel.p && n.rel.p.tag) || null, met: true };
  }
  for (const [def, where] of O.items || []) {
    const it = items.newItem(sim, def);
    if (where === 'pockets') items.putInCont(sim, it, p.pockets);
  }
  items.putInCont(sim, items.newItem(sim, 'cash', { n: O.cash ?? 35 }), p.pockets);
  return O;
}

export function fixUpCar(car) {
  car.dmg = { front: 0, rear: 0, left: 0, right: 0 };
  car.fuel = MODELS[car.model].tank;
}
