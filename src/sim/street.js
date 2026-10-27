// Street life: strangers who walk the blocks around you, bump into you, scoop
// up loose stuff, pick fights and sometimes run your pockets. They come and go
// with the blocks that are loaded and are never saved.

import { ITEMS } from '../data/items.js';
import { BARK, STRANGER_FIRST, STRANGER_ROLE } from '../data/lines.js';
import { randomLook } from '../data/looks.js';
import { ROAD } from './world.js';
import { makeNpc, scratch, faceToward } from './actors.js';
import * as items from './items.js';
import { relV, adjustRel, remember, witnesses } from './memory.js';
import { tod, clamp } from './util.js';

// Strangers per street block by hour; neighbouring blocks get a share too.
function crowd(t) {
  const h = tod(t) / 60;
  if (h >= 7 && h < 20) return 7;
  if (h >= 20) return 5;
  return h >= 5 ? 4 : 3;
}

const KIND_ODDS = {
  day: [['walker', 70], ['scavenger', 14], ['hothead', 12], ['thug', 4]],
  night: [['walker', 44], ['scavenger', 14], ['hothead', 16], ['thug', 26]],
};
const PERSONA = { walker: ['steady', 'steady', 'tired', 'proud', 'sly'], hothead: ['volatile', 'proud'], scavenger: ['sly'], thug: ['volatile', 'sly'] };
const THUG_GEAR = [['knife', 4], ['bat', 2], ['pipe', 2], ['crowbar', 2], ['knucks', 2], ['revolver', 1]];
const BUMP_GAP = 0.9; // seconds before the same person counts another bump
const MUG_COOLDOWN = 240; // game minutes between hold-ups

export class StreetLife {
  constructor(sim) {
    this.sim = sim;
    this.acc = 0;
  }

  isNight() {
    const h = tod(this.sim.s.t) / 60;
    return h >= 20 || h < 5;
  }

  strangers(room) {
    const out = [];
    for (const id in this.sim.s.actors) {
      const a = this.sim.s.actors[id];
      if (a.extra && (!room || a.room === room)) out.push(a);
    }
    return out;
  }

  // ------------------------------------------------------------ population
  update(dt) {
    const sim = this.sim;
    this.acc += dt;
    if (this.acc < 0.8) return;
    this.acc = 0;
    const p = sim.player;
    for (const room of sim.loaded) {
      const r = sim.world.room(room);
      if (!r || r.kind !== 'street') continue;
      const here = this.strangers(room);
      const live = here.filter((a) => !a.dead);
      const want = room === p.room ? crowd(sim.s.t) : Math.ceil(crowd(sim.s.t) / 2);
      if (live.length < want) this.spawn(room, live.length === 0 && here.length === 0);
      for (const a of here) {
        const far = room !== p.room || Math.hypot(a.x - p.x, a.y - p.y) > 760;
        // the dead are carted off once nobody is looking; the living move on
        if (a.dead && far && sim.s.t - a.diedAt > 30) this.remove(a);
        else if (!a.dead && !a.fightWith && !a.downUntil && sim.s.t > a.leaveAt && far) this.remove(a);
      }
    }
  }

  // A point on one of the four sidewalk strips, away from the player if possible.
  sidewalkPoint(room, awayFrom = null, minD = 0) {
    const sim = this.sim;
    const rng = sim.rng;
    const { c, half, side } = ROAD;
    let best = null;
    for (let i = 0; i < 14; i++) {
      const along = rng.chance(0.5) ? rng.range(12, c - half - 8) : rng.range(c + half + 8, 1388);
      const across = rng.chance(0.5) ? rng.range(c - half - side + 8, c - half - 8) : rng.range(c + half + 8, c + half + side - 8);
      const horiz = rng.chance(0.5);
      const x = horiz ? along : across;
      const y = horiz ? across : along;
      if (!sim.world.walkable(room, x, y, 11)) continue;
      best = { x, y };
      if (!awayFrom || Math.hypot(x - awayFrom.x, y - awayFrom.y) >= minD) return best;
    }
    return best;
  }

  spawn(room, burst) {
    const sim = this.sim;
    const rng = sim.rng;
    const p = sim.player;
    const n = burst ? 3 : 1;
    for (let k = 0; k < n; k++) {
      const at = this.sidewalkPoint(room, p.room === room ? p : null, burst ? 0 : 340);
      if (!at) return;
      const kind = rng.weighted(KIND_ODDS[this.isNight() ? 'night' : 'day']);
      const id = `x${sim.s.uid++}`;
      const first = rng.pick(STRANGER_FIRST);
      const a = makeNpc({
        id, name: first, short: first, personality: rng.pick(PERSONA[kind]), role: rng.pick(STRANGER_ROLE[kind]),
        look: randomLook(() => rng.next()), home: room, cash: kind === 'thug' ? rng.int(10, 70) : rng.int(2, 45),
        stats: { strength: rng.int(18, kind === 'thug' || kind === 'hothead' ? 60 : 40), agility: rng.int(18, 50), intellect: rng.int(15, 60), reputation: rng.int(5, 40) },
      });
      a.extra = kind;
      a.room = room;
      a.x = at.x;
      a.y = at.y;
      a.loaded = true;
      a.leaveAt = sim.s.t + rng.range(25, 110);
      sim.s.actors[id] = a;
      if (kind === 'thug' && rng.chance(0.6)) this.arm(a, rng.weighted(THUG_GEAR));
      else if (kind === 'hothead' && rng.chance(0.25)) this.arm(a, rng.pick(['bottle', 'knucks', 'knife']));
    }
  }

  arm(a, def) {
    const sim = this.sim;
    const it = items.newItem(sim, def);
    if (ITEMS[def].kind === 'firearm') it.ammo = sim.rng.int(2, ITEMS[def].ammoMax);
    items.putInHands(sim, a, it);
    it.owner = a.id;
  }

  remove(a) {
    const sim = this.sim;
    if (sim.dialog && sim.dialog.npc === a.id) return;
    if (sim.ui.modal && sim.ui.modal.npc === a.id) return;
    if (a.hands) {
      const it = sim.s.items[a.hands];
      if (it) items.destroy(sim, it);
    }
    for (const u of a.inv) if (sim.s.items[u]) items.destroy(sim, sim.s.items[u]);
    for (const id in sim.s.actors) {
      const o = sim.s.actors[id];
      if (o.rel && o.rel[a.id]) delete o.rel[a.id];
      if (o.fightWith === a.id) o.fightWith = null;
    }
    delete sim.s.actors[a.id];
  }

  // Leaving a block drops its strangers (they were only ever passing through).
  unload(room) {
    for (const a of this.strangers(room)) this.remove(a);
  }

  // Whatever a downed stranger carried spills out.
  dropLoot(a) {
    const sim = this.sim;
    if (!a.extra) return;
    const spill = (it) => {
      const ang = sim.rng.next() * Math.PI * 2;
      const pt = { x: a.x + Math.cos(ang) * 16, y: a.y + Math.sin(ang) * 10 };
      sim.world.collide(a.room, pt, 4);
      items.placeGround(sim, it, a.room, pt.x, pt.y);
      it.owner = null;
    };
    if (a.cash > 0) {
      spill(items.newItem(sim, 'cash', { n: a.cash }));
      a.cash = 0;
    }
    for (const u of [...a.inv]) if (sim.s.items[u]) spill(sim.s.items[u]);
  }

  kill(a, by, cause) {
    const sim = this.sim;
    a.dead = true;
    a.diedAt = sim.s.t;
    a.downUntil = sim.time + 1e9;
    a.act = 'down';
    a.fightWith = null;
    sim.emit('death', { id: a.id, room: a.room, x: a.x, y: a.y });
    if (by && by.kind === 'player') {
      sim.addHeat(55, cause === 'shot' ? 'shooting somebody dead' : 'killing somebody');
      sim.repChange(-6, 'a killing', a.room);
      sim.log(`${a.short} isn't getting up. Ever. Somebody is already calling it in.`, 'bad');
      for (const w of witnesses(sim, a.room, a.x, a.y, [a.id, 'p'])) {
        adjustRel(sim, w, 'p', -25);
        if (!w.police && !w.fightWith) sim.fight.flee(w, by);
      }
    }
  }

  // ------------------------------------------------------------ brains
  // Called from the AI tick for strangers. Returns true when it took over.
  think(a) {
    const sim = this.sim;
    const _ = scratch(a);
    const p = sim.player;
    if (a.dead) return true;
    const near = p.room === a.room && !p.dead && !p.downUntil && p.act !== 'drive' && !p.car;
    const d = near ? Math.hypot(p.x - a.x, p.y - a.y) : 1e9;

    // a challenge in progress: stay close and they swing
    if (_.challenge) {
      if (!near || d > 95) {
        sim.say(a, 'challengeOff');
        _.challenge = null;
      } else if (sim.time > _.challenge.at) {
        _.challenge = null;
        sim.say(a, 'bump4');
        sim.fight.squareUp(a, p, true);
        return true;
      } else {
        faceToward(a, p.x, p.y);
        return true;
      }
    }
    // mugging: walk up, then make the demand
    if (_.mug) {
      if (!near || sim.policeIn(a.room) || sim.time > _.mug.giveUp) {
        _.mug = null;
      } else if (d < 46 && !sim.dialog && !sim.ui.modal && !sim.ui.menu) {
        _.mug = null;
        this.startMug(a);
        return true;
      } else return true; // move() handles the approach
    }
    if (!near) return false;

    // scroungers and the greedy go for anything loose nearby
    if (!_.pickup && !a.spot && sim.rng.chance(a.extra === 'scavenger' ? 0.6 : 0.12)) this.eyeLoot(a, a.extra === 'scavenger' ? 520 : 260);
    if (_.pickup) return false;

    // hold-ups
    if (a.extra === 'thug' && this.canMug(a, d)) {
      _.mug = { giveUp: sim.time + 25 };
      _.path = null;
      return true;
    }
    // a hothead passing close picks a fight now and then
    if (a.extra === 'hothead' && d < 60 && !_.challengedAt && sim.rng.chance(0.18)) {
      _.challengedAt = sim.time;
      _.challenge = { at: sim.time + 2.6 };
      faceToward(a, p.x, p.y);
      sim.say(a, 'challenge');
      return true;
    }
    if (a.extra === 'walker' && d < 70 && sim.rng.chance(0.04)) sim.sayText(a, sim.fillTime(sim.rng.pick(BARK.stranger)));
    return false;
  }

  canMug(a, d) {
    const sim = this.sim;
    const p = sim.player;
    if (d > 420 || a.fightWith || a.downUntil) return false;
    if (sim.s.lastMug && sim.s.t - sim.s.lastMug < MUG_COOLDOWN) return false;
    if (sim.policeIn(a.room)) return false;
    const held = p.hands && sim.s.items[p.hands];
    const armed = held && (ITEMS[held.def].kind === 'firearm' || (ITEMS[held.def].dmg || 0) >= 13);
    if (armed && !(a.hands && ITEMS[sim.s.items[a.hands]?.def]?.kind === 'firearm')) return false;
    const cash = items.cashOnBody(sim, p);
    const chance = (this.isNight() ? 0.05 : 0.012) + (cash > 80 ? 0.03 : 0);
    return sim.rng.chance(chance);
  }

  eyeLoot(a, radius) {
    const sim = this.sim;
    const rs = sim.roomState(a.room);
    let best = null;
    let bd = radius;
    for (const u of rs.items) {
      const it = sim.s.items[u];
      if (!it || it.job || it.favor) continue;
      const D = ITEMS[it.def];
      if (D.kind === 'job') continue;
      const want = D.kind === 'cash' || D.kind === 'valuable' || D.kind === 'wallet' || D.dmg || (D.value || 0) >= 4;
      if (!want) continue;
      const dd = Math.hypot(it.x - a.x, it.y - a.y);
      if (dd < bd) {
        bd = dd;
        best = it;
      }
    }
    if (!best) return;
    const _ = scratch(a);
    _.pickup = best.uid;
    _.path = null;
  }

  // NPC hands: weapons go in the hand where everybody can see them.
  pickUpNpc(a, it) {
    const sim = this.sim;
    const D = ITEMS[it.def];
    if ((D.dmg || D.kind === 'firearm') && !a.hands && !a.police) {
      const owner = it.owner;
      items.putInHands(sim, a, it);
      it.lastOwner = owner;
      it.owner = a.id;
      if (D.kind === 'firearm' && it.ammo === undefined) it.ammo = sim.rng.int(1, D.ammoMax);
      sim.say(a, 'pickupWeapon');
      return true;
    }
    return false;
  }

  // ------------------------------------------------------------ mugging
  startMug(a) {
    const sim = this.sim;
    const p = sim.player;
    faceToward(a, p.x, p.y);
    if (p.spot) sim.leaveSpot(p);
    sim.closeMenus();
    sim.say(a, 'mugStart');
    const gun = a.hands && sim.s.items[a.hands];
    sim.ui.modal = { type: 'mug', npc: a.id, weapon: gun ? gun.def : null };
    sim.s.lastMug = sim.s.t;
    sim.sfx('alert');
  }

  mugReply(choice) {
    const sim = this.sim;
    const m = sim.ui.modal;
    if (!m || m.type !== 'mug') return null;
    const a = sim.s.actors[m.npc];
    const p = sim.player;
    sim.ui.modal = null;
    if (!a || a.downUntil) return null;
    const _ = scratch(a);
    if (choice === 'pay') {
      const cash = items.cashOnBody(sim, p);
      if (cash > 0) items.spendCash(sim, p, cash);
      a.cash += cash;
      sim.say(a, 'mugTook');
      remember(sim, a, { type: 'took', who: 'p', amt: cash });
      sim.log(cash > 0 ? `${a.short} took your $${cash} and walked off.` : `${a.short} pats you down, finds nothing and shoves you.`, 'bad');
      sim.repChange(-2, 'got robbed', a.room);
      p.stats.mind = clamp(p.stats.mind - 6, 0, 100);
      a.leaveAt = sim.s.t;
      _.fleeing = true;
      _.fleeFrom = 'p';
      _.fleeUntil = sim.time + 8;
      return { ok: true };
    }
    if (choice === 'talk') {
      const odds = clamp(0.22 + p.stats.intellect / 260 + p.stats.reputation / 240 + relV(a, 'p') / 200, 0.08, 0.85);
      if (sim.rng.chance(odds)) {
        sim.say(a, 'mugOff');
        sim.log(`You talk ${a.short} down. They back off.`, 'good');
        sim.repChange(1, 'talked down a mugger', a.room);
        a.leaveAt = sim.s.t;
        return { ok: true };
      }
      sim.say(a, 'mugAngry');
      sim.fight.squareUp(a, p, true);
      return { ok: false };
    }
    if (choice === 'run') {
      sim.say(a, 'mugChase');
      sim.later(1.1, () => {
        if (sim.s.actors[a.id] && !a.downUntil) sim.fight.squareUp(a, p, false);
      });
      return { ok: true };
    }
    // fight: you get the first move
    sim.say(a, 'mugAngry');
    sim.fight.squareUp(a, p, false);
    return { ok: true };
  }

  // ------------------------------------------------------------ bumps
  // Someone walks into you (or you into them). Once is an accident.
  bump(npc) {
    const sim = this.sim;
    const p = sim.player;
    if (npc.fightWith || npc.downUntil || npc.dead || npc.spot || npc.act === 'work' || npc.act === 'sleep') return;
    const _ = scratch(npc);
    if (_.bumpAt && sim.time - _.bumpAt < BUMP_GAP) return;
    // old bumps are forgiven after a while
    if (_.bumpAt && sim.time - _.bumpAt > 45) _.bumps = 0;
    _.bumpAt = sim.time;
    _.bumps = (_.bumps || 0) + 1;
    faceToward(npc, p.x, p.y);
    if (npc.police) {
      sim.say(npc, 'copBump');
      return;
    }
    const short = npc.personality === 'volatile' || npc.extra === 'hothead' || npc.extra === 'thug';
    const step = _.bumps + (short ? 1 : 0) - (relV(npc, 'p') > 30 ? 1 : 0);
    if (step >= 4) {
      sim.say(npc, 'bump4');
      adjustRel(sim, npc, 'p', -8);
      remember(sim, npc, { type: 'hit', who: 'p' });
      sim.fight.squareUp(npc, p, true);
      _.bumps = 0;
      return;
    }
    sim.say(npc, step >= 3 ? 'bump3' : step >= 2 ? 'bump2' : 'bump1');
    if (step >= 2) adjustRel(sim, npc, 'p', -2);
    _.talkUntil = sim.time + 0.6; // they stop for a beat
  }
}
