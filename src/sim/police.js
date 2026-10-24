// Police NPCs: confiscate a visible weapon, break up a fight, stop you when your
// heat is high. They end trouble; they are not a combat arena.

import { ITEMS } from '../data/items.js';
import { scratch, faceToward } from './actors.js';
import { remember, adjustRel } from './memory.js';
import { destroy, spendCash, cashOnBody } from './items.js';
import { clamp } from './util.js';

export class Police {
  constructor(sim) {
    this.sim = sim;
  }

  copsIn(room) {
    const out = [];
    for (const id in this.sim.s.actors) {
      const a = this.sim.s.actors[id];
      if (a.police && a.room === room && a.loaded && !a.downUntil) out.push(a);
    }
    return out;
  }

  // Patrol schedule is a normal schedule; nothing special here yet.
  goal() {
    return null;
  }

  onFight(a, b) {
    const cops = this.copsIn(a.room);
    for (const c of cops) {
      if (c === a || c === b) continue;
      const _ = scratch(c);
      _.job = { kind: 'stop', room: a.room, since: this.sim.time };
      this.sim.say(c, 'copStop');
    }
    if (a.kind === 'player' && cops.length) this.sim.addHeat(6, 'started a fight in front of a cop');
  }

  onKnockdown(a, b) {
    if (a.kind === 'player' && this.copsIn(a.room).length) this.sim.addHeat(8, 'put someone down in front of a cop');
  }

  // Returns true when the cop is busy with police business this tick.
  think(c) {
    const sim = this.sim;
    const p = sim.s.actors.p;
    const _ = scratch(c);
    if (_.job && _.job.kind === 'stop') {
      const fighters = Object.values(sim.s.actors).filter((x) => x.room === c.room && x.loaded && (x.fightWith || (x.kind === 'npc' && x.act === 'fight')));
      if (!fighters.length) {
        _.job = null;
        return false;
      }
      const f = fighters[0];
      _.chase = { x: f.x, y: f.y };
      if (Math.hypot(f.x - c.x, f.y - c.y) < 70 || sim.time - _.job.since > 4) this.breakUp(c, fighters);
      return true;
    }
    if (p.room === c.room && !p.downUntil && p.act !== 'drive') {
      const d = Math.hypot(p.x - c.x, p.y - c.y);
      const h = p.hands && sim.s.items[p.hands];
      const def = h && ITEMS[h.def];
      const illegalGun = def && def.kind === 'firearm' && !p.licenses.firearm;
      if (def && d < 280 && (def.visible || illegalGun) && !(def.kind === 'firearm' && p.licenses.firearm)) {
        _.chase = { x: p.x, y: p.y };
        if (d < 46) this.confiscate(c, p, h);
        return true;
      }
      if (p.heat >= 60 && d < 220 && (!_.stoppedAt || sim.time - _.stoppedAt > 90)) {
        _.chase = { x: p.x, y: p.y };
        if (d < 46) this.stopAndSearch(c, p);
        return true;
      }
    }
    _.chase = null;
    return false;
  }

  breakUp(c, fighters) {
    const sim = this.sim;
    const p = sim.s.actors.p;
    const playerIn = fighters.includes(p) || fighters.some((f) => f.fightWith === 'p');
    sim.fight.stopAll(c.room);
    scratch(c).job = null;
    faceToward(c, p.x, p.y);
    for (const f of fighters) {
      if (f.kind === 'npc' && !f.police) {
        f.recoverUntil = sim.s.t + 120;
        scratch(f).goal = null;
      }
    }
    if (playerIn) {
      const fine = 40;
      const paid = Math.min(fine, cashOnBody(sim, p));
      if (paid > 0) spendCash(sim, p, paid);
      const owed = fine - paid;
      if (owed > 0) p.bank = Math.max(0, p.bank - owed);
      sim.addHeat(12, 'fight broken up by police');
      sim.sayText(c, `That's a $${fine} fine. Don't let me see it again.`);
      sim.log(`Officer ${c.short} broke up the fight. Fined $${fine}.`, 'bad');
      remember(sim, c, { type: 'started', who: sim.s.lastFight?.by || 'p', x: sim.s.lastFight?.on || 'p' });
      if (p.stats.health < 25) sim.sendTo('hospital', 'The officer called an ambulance.');
      else if (p.heat >= 70) sim.sendTo('police', 'The officer walks you to the front desk.');
    }
  }

  confiscate(c, p, it) {
    const sim = this.sim;
    const name = ITEMS[it.def].name.toLowerCase();
    sim.say(c, 'copWeapon', { item: name });
    destroy(sim, it);
    sim.addHeat(6, `carrying a ${name}`);
    sim.log(`Officer ${c.short} took your ${name}.`, 'bad');
    adjustRel(sim, c, 'p', -3);
    scratch(c).chase = null;
  }

  stopAndSearch(c, p) {
    const sim = this.sim;
    const _ = scratch(c);
    _.stoppedAt = sim.time;
    sim.sayText(c, 'Hold up. Hands where I can see them.');
    let found = 0;
    const cont = sim.s.conts[p.pockets];
    for (const u of [...cont.items, p.hands].filter(Boolean)) {
      const it = sim.s.items[u];
      const d = ITEMS[it.def];
      if (d.heat || (d.kind === 'firearm' && !p.licenses.firearm)) {
        destroy(sim, it);
        found++;
      }
    }
    if (found) {
      const fine = 75 * found;
      const paid = Math.min(fine, cashOnBody(sim, p));
      if (paid) spendCash(sim, p, paid);
      sim.addHeat(10, 'caught holding');
      sim.log(`Stopped and searched. ${found} item(s) taken, fined $${fine}.`, 'bad');
    } else {
      p.heat = clamp(p.heat - 15, 0, 100);
      sim.log('Stopped and searched. Clean.', '');
      sim.sayText(c, 'Alright. Move along.');
    }
  }

  update() {}
}
