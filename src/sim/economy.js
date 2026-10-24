// The other economy, kept abstract and game-side: a grow table for a
// fictional crop, a mining rig whose coin price is computed from the clock
// (not from a loop), and buyers who remember the deal.

import { ITEMS } from '../data/items.js';
import { newItem, putInCont, putInHands, placeGround, destroy, contItems, addCash } from './items.js';
import { remember, adjustRel } from './memory.js';
import { clamp, DAY } from './util.js';

export const GROW_MINUTES = 36 * 60;
export const COIN_RATE = 0.045; // coins per game hour per rig (about one a day)
export const RIG_CAP = 8;

// Same answer for the same time, everywhere. Roughly $20–$100 per coin.
export function coinPrice(t) {
  const d = t / DAY;
  const v = 60 + 22 * Math.sin(d / 3.3) + 11 * Math.sin(d * 1.9 + 1.3) + 5 * Math.sin(t / 97) + 3 * Math.sin(t / 31.7);
  return Math.max(8, Math.round(v * 10) / 10);
}

export class Economy {
  constructor(sim) {
    this.sim = sim;
    if (!sim.s.grow) sim.s.grow = {};
  }

  key(room, prop) {
    return `${room}:${prop}`;
  }

  plant(room, prop) {
    const sim = this.sim;
    const g = sim.s.grow[this.key(room, prop)];
    if (g && !g.dead) return { ok: false, text: 'Something is already growing here.' };
    const p = sim.player;
    const pool = [...contItems(sim, p.pockets)];
    if (p.hands) pool.push(sim.s.items[p.hands]);
    const cut = pool.find((it) => it && it.def === 'cuttings');
    if (!cut) return { ok: false, text: 'You need bloom cuttings. Ask around — Boo sells them.' };
    destroy(sim, cut);
    sim.s.grow[this.key(room, prop)] = { planted: sim.s.t, growth: 0, water: 70, quality: 50, dead: false };
    sim.log('You set the cuttings in the tray under the lamp. About a day and a half to bloom.');
    sim.sfx('pickup');
    return { ok: true, text: 'Planted.' };
  }

  water(room, prop) {
    const g = this.sim.s.grow[this.key(room, prop)];
    if (!g || g.dead) return { ok: false, text: 'Nothing to water.' };
    g.water = 100;
    this.sim.sfx('drink');
    return { ok: true, text: 'Watered.' };
  }

  harvest(room, prop) {
    const sim = this.sim;
    const k = this.key(room, prop);
    const g = sim.s.grow[k];
    if (!g) return { ok: false, text: 'Empty tray.' };
    if (g.dead) {
      delete sim.s.grow[k];
      return { ok: true, text: 'You clear out the dead stems.' };
    }
    if (g.growth < 1) return { ok: false, text: `Not ready. About ${Math.ceil(((1 - g.growth) * GROW_MINUTES) / 60)} hours left.` };
    const n = 2 + Math.round(g.quality / 25);
    const p = sim.player;
    for (let i = 0; i < n; i++) {
      const it = newItem(sim, 'bloom', { q: Math.round(g.quality), owner: 'p' });
      if (!putInCont(sim, it, p.pockets) && !putInHands(sim, p, it)) placeGround(sim, it, p.room, p.x + sim.rng.range(-12, 12), p.y + 14);
    }
    delete sim.s.grow[k];
    sim.log(`Harvested ${n} bayou blooms (quality ${Math.round(g.quality)}). Holding them puts heat on you.`, 'good');
    sim.sfx('pickup');
    return { ok: true, text: `${n} blooms.` };
  }

  // Rigs and plants advance on the clock even when you're across town.
  update(dm) {
    const sim = this.sim;
    for (const k in sim.s.grow) {
      const g = sim.s.grow[k];
      if (g.dead) continue;
      const lease = k.split(':')[0];
      const powered = sim.money.leaseOk(lease);
      if (!powered) continue;
      g.growth = clamp(g.growth + dm / GROW_MINUTES, 0, 1);
      g.water = clamp(g.water - dm * 0.07, 0, 100);
      if (g.water >= 35 && g.water <= 95) g.quality = clamp(g.quality + dm * 0.012, 0, 100);
      else g.quality = clamp(g.quality - dm * 0.03, 0, 100);
      if (g.water <= 0) {
        g.dry = (g.dry || 0) + dm;
        if (g.dry > 240) {
          g.dead = true;
          sim.log('Your bloom tray dried out and died.', 'bad');
        }
      } else g.dry = 0;
    }
    for (const room in sim.s.furn || {}) {
      if (!sim.money.leaseOk(room)) continue;
      for (const f of sim.s.furn[room]) {
        if (f.type !== 'miner' || !f.placed) continue;
        f.coins = Math.min(RIG_CAP, (f.coins || 0) + (dm / 60) * COIN_RATE);
      }
    }
  }

  collect(room, uid) {
    const sim = this.sim;
    const f = (sim.s.furn[room] || []).find((q) => q.uid === uid);
    if (!f) return { ok: false, text: 'No rig.' };
    const n = Math.floor(f.coins || 0);
    if (n < 1) return { ok: false, text: `Not even one coin yet (${(f.coins || 0).toFixed(2)}).` };
    f.coins -= n;
    const it = newItem(sim, 'coin', { n, owner: 'p' });
    const p = sim.player;
    if (!putInCont(sim, it, p.pockets) && !putInHands(sim, p, it)) placeGround(sim, it, p.room, p.x, p.y + 12);
    sim.sfx('coin');
    sim.log(`Pulled ${n} BayouCoin off the rig. Market says $${coinPrice(sim.s.t)} each right now.`);
    return { ok: true, text: `${n} coin.` };
  }

  coinsHeld() {
    const sim = this.sim;
    const p = sim.player;
    const pool = [...contItems(sim, p.pockets)];
    if (p.hands) pool.push(sim.s.items[p.hands]);
    return pool.filter((it) => it && it.def === 'coin');
  }

  // At the bank terminal: the sale lands in your account.
  sellCoinsTerminal() {
    const sim = this.sim;
    const stacks = this.coinsHeld();
    const n = stacks.reduce((a, it) => a + it.n, 0);
    if (!n) return { ok: false, text: 'No coin to sell.' };
    const price = coinPrice(sim.s.t);
    const total = Math.round(n * price);
    for (const it of stacks) destroy(sim, it);
    sim.player.bank += total;
    sim.money.logBank('market', total, `${n} coin @ $${price}`);
    sim.sfx('cash');
    sim.log(`Sold ${n} BayouCoin at $${price}. $${total} went to your account.`, 'good');
    sim.wantSave = true;
    return { ok: true, text: `+$${total} to your account.` };
  }

  // To a person: cash in hand, a little better than market, and they remember.
  sellToBuyer(npc, what) {
    const sim = this.sim;
    const p = sim.player;
    if (what === 'coin') {
      const stacks = this.coinsHeld();
      const n = stacks.reduce((a, it) => a + it.n, 0);
      if (!n) return { ok: false, text: 'You got no coin.' };
      const total = Math.round(n * coinPrice(sim.s.t) * 1.08);
      if (npc.cash < total) return { ok: false, text: "I can't cover that right now." };
      for (const it of stacks) destroy(sim, it);
      npc.cash -= total;
      addCash(sim, p, total);
      remember(sim, npc, { type: 'bought', who: 'p', item: 'coin' });
      adjustRel(sim, npc, 'p', 3);
      sim.sfx('cash');
      sim.log(`${npc.short} bought ${n} coin for $${total} cash.`, 'good');
      return { ok: true, text: `$${total}, cash.` };
    }
    const pool = [...contItems(sim, p.pockets)];
    if (p.hands) pool.push(sim.s.items[p.hands]);
    const blooms = pool.filter((it) => it && it.def === 'bloom');
    if (!blooms.length) return { ok: false, text: 'You got nothing I want.' };
    let total = 0;
    for (const it of blooms) total += Math.round(14 + (it.q || 50) * 0.26);
    if (npc.cash < total) return { ok: false, text: "That's more than I'm carrying." };
    for (const it of blooms) destroy(sim, it);
    npc.cash -= total;
    addCash(sim, p, total);
    remember(sim, npc, { type: 'bought', who: 'p', item: 'bloom' });
    adjustRel(sim, npc, 'p', 4);
    sim.addHeat(4 + blooms.length, 'selling under the table');
    sim.sfx('cash');
    sim.log(`${npc.short} took ${blooms.length} blooms off your hands for $${total}.`, 'good');
    return { ok: true, text: `$${total}. Pleasure.` };
  }
}
