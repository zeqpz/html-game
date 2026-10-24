// NPC brains. Loaded rooms think a few times a second; unloaded rooms are
// advanced in coarse hops on the game clock (no real-time walking off screen).

import { PERSONALITIES } from '../data/personalities.js';
import { FAVORS } from '../data/work.js';
import { CHAT } from '../data/lines.js';
import { ITEMS } from '../data/items.js';
import { scratch, schedNow, walkSpeed, sprintMul, moveBody, faceToward, npcNeeds, staminaTick } from './actors.js';
import { findPath } from './nav.js';
import { relV, adjustRel, meet, latestAboutPlayer, remember } from './memory.js';
import { feel } from './talk.js';
import { pickUp } from './items.js';
import { rectHit } from './util.js';

const THINK = 0.25;

export class AI {
  constructor(sim) {
    this.sim = sim;
  }

  // ----------------------------------------------------------- goals
  decide(npc) {
    const sim = this.sim;
    const s = sim.s;
    if (npc.recoverUntil && s.t < npc.recoverUntil) return { key: 'recover', room: npc.home, act: 'rest' };
    if (npc.police) {
      const g = sim.police.goal(npc);
      if (g) return g;
    }
    const sc = schedNow(npc, s.t);
    const room = sc.room;
    // staff can't work a closed or empty place; eaters skip a closed diner
    if (sc.act === 'eat' && !sim.isOpen(room)) return { key: 'eat-closed', room: npc.home, act: 'rest' };
    const key = `${sc.act}:${room}:${sc.target || ''}:${sc.from || ''}`;
    return { key, room, act: sc.act, target: sc.target };
  }

  // Pick a concrete place inside the goal room.
  placeFor(npc, goal) {
    const sim = this.sim;
    const r = sim.world.room(goal.room);
    if (!r || r.kind === 'offmap') return null;
    const rng = sim.rng;
    const free = (p, i) => !sim.spotTaken(goal.room, p.id, i, npc.id);
    const pickSpot = (props) => {
      const opts = [];
      for (const p of props) (p.spots || []).forEach((sp, i) => free(p, i) && opts.push({ prop: p.id, i }));
      return opts.length ? rng.pick(opts) : null;
    };
    switch (goal.act) {
      case 'work': {
        const p = r.props.find((q) => q.id === (goal.target || 'counter')) || r.props.find((q) => q.staff);
        if (p && p.staff) return { staff: p.id, x: p.staff.x, y: p.staff.y, face: p.staff.face };
        return { x: r.w / 2, y: r.h / 2 };
      }
      case 'eat': {
        const s = pickSpot(r.props.filter((p) => p.use === 'sit' && p.table)) || pickSpot(r.props.filter((p) => p.use === 'sit'));
        if (s) return s;
        break;
      }
      case 'workout': {
        const s = pickSpot(r.props.filter((p) => ['lift', 'run', 'bag'].includes(p.use)));
        if (s) return s;
        break;
      }
      case 'sit': {
        const area = r.hangouts && r.hangouts[goal.target];
        const benches = r.props.filter((p) => p.use === 'sit' && (!area || Math.hypot(p.x - area[0], p.y - area[1]) < area[2] + 120));
        const s = pickSpot(benches);
        if (s) return s;
        break;
      }
      default:
        break;
    }
    const area = r.hangouts && r.hangouts[goal.target];
    if (area) return sim.world.randomPoint(goal.room, rng, area[0], area[1], area[2]);
    if (goal.act === 'hang' && r.kind === 'interior') {
      const s = pickSpot(r.props.filter((p) => p.use === 'sit'));
      if (s && rng.chance(0.6)) return s;
    }
    return sim.world.randomPoint(goal.room, rng);
  }

  // ----------------------------------------------------------- loaded tick
  update(dt) {
    const sim = this.sim;
    for (const id in sim.s.actors) {
      const npc = sim.s.actors[id];
      if (npc.kind !== 'npc' || !npc.loaded) continue;
      const _ = scratch(npc);
      _.thinkT = (_.thinkT ?? Math.random() * THINK) - dt;
      if (_.thinkT <= 0) {
        _.thinkT = THINK;
        this.think(npc);
      }
      this.move(npc, dt);
    }
  }

  think(npc) {
    const sim = this.sim;
    const s = sim.s;
    const _ = scratch(npc);
    const p = s.actors.p;

    if (npc.downUntil) {
      if (sim.time >= npc.downUntil) {
        npc.downUntil = 0;
        npc.stats.health = Math.max(npc.stats.health, 22);
        npc.act = 'idle';
        npc.recoverUntil = s.t + 300; // limp home and rest it off
        _.goal = null;
      }
      return;
    }
    if (sim.dialog && sim.dialog.npc === npc.id) {
      faceToward(npc, p.x, p.y);
      return;
    }
    if (_.talkUntil && sim.time < _.talkUntil) return;
    if (npc.fightWith) return; // handled per tick in move()
    if (_.fleeing) {
      if (sim.time > _.fleeUntil) {
        _.fleeing = false;
        npc.recoverUntil = s.t + 90;
        _.goal = null;
      }
      return;
    }
    if (npc.police && sim.police.think(npc)) return;

    // reactions to the player
    if (p.room === npc.room && !p.dead && p.act !== 'drive') this.encounter(npc, p);
    if (npc.fightWith) return;

    // NPC to NPC moments
    this.social(npc);

    // grab loose stuff if that's who they are
    if (!_.pickup && !npc.spot && sim.rng.chance(0.08)) this.eyeLoot(npc);
    if (_.pickup) return;

    const goal = this.decide(npc);
    if (!_.goal || _.goal.key !== goal.key) {
      if (npc.spot) sim.leaveSpot(npc);
      _.goal = goal;
      _.place = null;
      _.path = null;
      _.arrived = false;
      _.wanderAt = 0;
    }
    const g = _.goal;
    if (g.room !== npc.room) {
      _.place = null;
      return; // move() walks to the next door
    }
    if (!_.place) {
      _.place = this.placeFor(npc, g);
      _.path = null;
      _.arrived = false;
    }
    // loiterers drift around their hangout now and then
    if (_.arrived && !npc.spot && (g.act === 'hang' || g.act === 'workout' || g.act === 'eat' || g.act === 'sit')) {
      if (!_.wanderAt) _.wanderAt = sim.time + sim.rng.range(8, 22);
      if (sim.time > _.wanderAt) {
        _.place = this.placeFor(npc, g);
        _.path = null;
        _.arrived = false;
        _.wanderAt = 0;
      }
    }
    // workout rotation
    if (npc.spot && g.act === 'workout' && sim.rng.chance(0.012)) {
      sim.leaveSpot(npc);
      _.place = this.placeFor(npc, g);
      _.path = null;
      _.arrived = false;
    }
    // staff: drift between counter and grill, come to the counter when you're waiting
    if (g.act === 'work' && npc.staffOf === npc.room) this.staffThink(npc, g);
  }

  staffThink(npc, g) {
    const sim = this.sim;
    const _ = scratch(npc);
    const r = sim.world.room(npc.room);
    const p = sim.s.actors.p;
    const counter = r.props.find((q) => q.use === 'buy');
    const grill = r.props.find((q) => q.id === 'grill');
    if (!counter || !grill) return;
    const wantsCounter = p.room === npc.room && Math.hypot(p.x - (counter.x + 60), p.y - (counter.y + counter.h)) < 140 && !sim.work.onShift();
    const target = wantsCounter ? counter : (sim.work.onShift() || sim.rng.chance(0.02) ? grill : null);
    if (target && _.place && _.place.staff !== target.id) {
      _.place = { staff: target.id, x: target.staff.x, y: target.staff.y, face: target.staff.face };
      _.path = null;
      _.arrived = false;
    }
  }

  encounter(npc, p) {
    const sim = this.sim;
    const _ = scratch(npc);
    const d = Math.hypot(p.x - npc.x, p.y - npc.y);
    if (d > 80) return;
    if (_.metAt && sim.time - _.metAt < 30) return;
    _.metAt = sim.time;
    const P = PERSONALITIES[npc.personality];
    const v = feel(sim, npc);
    const busy = npc.act === 'work' || npc.act === 'eat' || npc.act === 'lift' || npc.act === 'run';
    meet(npc, 'p');
    if (v >= 15) {
      const fav = sim.work.availableFavor(npc);
      if (fav && !busy && v >= FAVORS[fav].minRel) sim.say(npc, 'ask');
      else if (sim.rng.chance(0.7)) sim.say(npc, 'greetWarm');
      return;
    }
    if (v > -10) {
      if (sim.rng.chance(P.social)) sim.say(npc, busy ? 'greetNeutral' : sim.rng.chance(0.85) ? 'greetNeutral' : 'ignore');
      return;
    }
    if (v > -40) {
      if ((npc.personality === 'volatile' || npc.personality === 'proud') && npc.stats.mind < 35 && sim.rng.chance(P.temper * 0.5)) {
        sim.fight.squareUp(npc, p, false);
        return;
      }
      sim.say(npc, sim.rng.chance(0.5) ? 'greetCold' : 'squareUp');
      return;
    }
    // hostile
    if (!npc.police && sim.rng.chance(P.temper)) {
      sim.fight.squareUp(npc, p, false);
      return;
    }
    sim.say(npc, 'squareUp');
  }

  social(npc) {
    const sim = this.sim;
    const _ = scratch(npc);
    if (npc.act === 'work' || npc.act === 'sleep') return;
    if (_.chatAt && sim.time - _.chatAt < 25) return;
    const P = PERSONALITIES[npc.personality];
    if (!sim.rng.chance(0.03 * P.social)) return;
    for (const id in sim.s.actors) {
      const o = sim.s.actors[id];
      if (o === npc || o.kind !== 'npc' || o.room !== npc.room || !o.loaded || o.fightWith || o.downUntil) continue;
      if (Math.hypot(o.x - npc.x, o.y - npc.y) > 90) continue;
      const ov = scratch(o);
      if (ov.chatAt && sim.time - ov.chatAt < 25) continue;
      const v = relV(npc, o.id);
      // rivals might start something
      if (v <= -40 && (npc.personality === 'volatile' || npc.personality === 'proud') && sim.rng.chance(P.temper * 0.25) && !sim.policeIn(npc.room)) {
        sim.fight.squareUp(npc, o, true);
        sim.fight.begin(npc, o);
        return;
      }
      if (v < -15) continue;
      _.chatAt = ov.chatAt = sim.time;
      meet(npc, o.id);
      meet(o, npc.id);
      adjustRel(sim, npc, o.id, 1.5);
      adjustRel(sim, o, npc.id, 1.5);
      const pair = sim.rng.pick(CHAT);
      faceToward(npc, o.x, o.y);
      faceToward(o, npc.x, npc.y);
      sim.sayText(npc, pair[0]);
      sim.later(2.4, () => sim.sayText(o, pair[1]));
      // word gets around about the player
      const m = latestAboutPlayer(npc);
      if (m && sim.s.t - m.t < 2880 && relV(o, npc.id) > 0) {
        const sway = { hit: -3, dropped: -3, started: -2, welched: -4, took: -3, talk_bad: -1, brought: 2, paid: 2, helped: 3, shift: 1 }[m.type];
        if (sway) adjustRel(sim, o, 'p', sway);
      }
      return;
    }
  }

  eyeLoot(npc) {
    const sim = this.sim;
    const P = PERSONALITIES[npc.personality];
    if (P.greed < 0.45 || npc.act === 'work' || npc.police) return;
    const rs = sim.roomState(npc.room);
    for (const u of rs.items) {
      const it = sim.s.items[u];
      const d = ITEMS[it.def];
      if (!(d.kind === 'cash' || (d.value || 0) >= 10)) continue;
      if (Math.hypot(it.x - npc.x, it.y - npc.y) > 260) continue;
      const _ = scratch(npc);
      _.pickup = it.uid;
      _.path = null;
      return;
    }
  }

  // ----------------------------------------------------------- movement
  move(npc, dt) {
    const sim = this.sim;
    const _ = scratch(npc);
    let dx = 0;
    let dy = 0;
    let speed = walkSpeed(sim, npc);
    let spending = false;

    if (npc.downUntil || npc.spot || (sim.dialog && sim.dialog.npc === npc.id) || (_.talkUntil && sim.time < _.talkUntil)) {
      moveBody(sim, npc, 0, 0, 0, dt);
      staminaTick(npc, dt, false);
      return;
    }
    if (npc.fightWith) {
      const m = sim.fight.think(npc, dt);
      dx = m.dx;
      dy = m.dy;
      if (m.run && npc.stats.stamina > 15) {
        speed *= sprintMul(npc);
        npc.stats.stamina -= 10 * dt;
        spending = true;
      }
      moveBody(sim, npc, dx, dy, speed, dt);
      staminaTick(npc, dt, spending);
      return;
    }
    if (npc.police && _.chase) {
      this.steer(npc, _.chase.x, _.chase.y, dt, speed * 1.35);
      return;
    }
    if (_.fleeing) {
      const f = sim.s.actors[_.fleeFrom];
      if (f && f.room === npc.room) {
        const ex = npc.x - f.x;
        const ey = npc.y - f.y;
        const d = Math.hypot(ex, ey) || 1;
        dx = ex / d;
        dy = ey / d;
        speed *= 1.4;
      }
      moveBody(sim, npc, dx, dy, speed, dt);
      return;
    }
    if (_.pickup) {
      const it = sim.s.items[_.pickup];
      if (!it || it.where !== 'ground' || it.room !== npc.room) {
        _.pickup = null;
      } else if (Math.hypot(it.x - npc.x, it.y - npc.y) < 16) {
        pickUp(sim, npc, it);
        sim.say(npc, 'pickup');
        _.pickup = null;
      } else {
        this.steer(npc, it.x, it.y, dt, speed);
        return;
      }
    }
    const g = _.goal;
    if (!g) {
      moveBody(sim, npc, 0, 0, speed, dt);
      return;
    }
    if (g.room !== npc.room) {
      const door = sim.world.nextDoor(npc.room, g.room);
      if (!door) {
        moveBody(sim, npc, 0, 0, speed, dt);
        return;
      }
      const tx = door.edge ? door.at.x : door.zone.x + door.zone.w / 2;
      const ty = door.edge ? door.at.y : door.zone.y + door.zone.h / 2;
      const near = door.edge ? false : rectHit(door.zone, npc.x, npc.y) || Math.hypot(tx - npc.x, ty - npc.y) < 10;
      if (near) {
        sim.passDoor(npc, door);
        return;
      }
      this.steer(npc, tx, ty, dt, speed);
      return;
    }
    const pl = _.place;
    if (!pl) {
      moveBody(sim, npc, 0, 0, speed, dt);
      return;
    }
    let tx, ty;
    let spot = null;
    let prop = null;
    if (pl.prop) {
      prop = sim.world.prop(npc.room, pl.prop);
      spot = prop && prop.spots[pl.i];
      if (!spot) {
        _.place = null;
        return;
      }
      tx = spot.ax ?? spot.x;
      ty = spot.ay ?? spot.y;
    } else {
      tx = pl.x;
      ty = pl.y;
    }
    if (Math.hypot(tx - npc.x, ty - npc.y) < 10) {
      if (!_.arrived) {
        _.arrived = true;
        _.path = null;
        if (spot) {
          if (sim.spotTaken(npc.room, pl.prop, pl.i, npc.id)) {
            _.place = null;
            _.arrived = false;
          } else {
            sim.enterSpot(npc, prop, pl.i, g.act);
          }
        } else if (pl.staff) {
          npc.x = tx;
          npc.y = ty;
          npc.face = pl.face;
          npc.act = 'work';
        } else {
          npc.act = 'idle';
        }
      }
      moveBody(sim, npc, 0, 0, speed, dt);
      return;
    }
    this.steer(npc, tx, ty, dt, speed);
  }

  steer(npc, tx, ty, dt, speed) {
    const sim = this.sim;
    const _ = scratch(npc);
    if (npc.act !== 'fight') npc.act = 'walk';
    if (!_.path || _.pathTo !== `${Math.round(tx)},${Math.round(ty)}` || sim.time > _.repathAt) {
      const nav = sim.world.nav(npc.room);
      _.path = findPath(nav, npc.x, npc.y, tx, ty) || [[tx, ty]];
      _.pathI = 0;
      _.pathTo = `${Math.round(tx)},${Math.round(ty)}`;
      _.repathAt = sim.time + 6;
    }
    const wp = _.path[_.pathI] || [tx, ty];
    let dx = wp[0] - npc.x;
    let dy = wp[1] - npc.y;
    const d = Math.hypot(dx, dy);
    if (d < 8 && _.pathI < _.path.length - 1) _.pathI++;
    const sp = moveBody(sim, npc, dx, dy, speed, dt);
    // stuck: nudge and repath
    if (sp < 8) {
      _.stuck = (_.stuck || 0) + dt;
      if (_.stuck > 1.2) {
        _.stuck = 0;
        _.repathAt = 0;
        const sk = scratch(npc);
        sk.kx = (sim.rng.next() - 0.5) * 160;
        sk.ky = (sim.rng.next() - 0.5) * 160;
      }
    } else _.stuck = 0;
  }

  // ----------------------------------------------------------- off-screen
  abstract(dm) {
    const sim = this.sim;
    const s = sim.s;
    for (const id in s.actors) {
      const npc = s.actors[id];
      if (npc.kind !== 'npc') continue;
      if (npc.loaded) {
        npcNeeds(sim, npc, dm);
        continue;
      }
      npcNeeds(sim, npc, dm);
      if (npc.downUntil) {
        npc.downUntil = 0;
        npc.recoverUntil = s.t + 240;
      }
      if (npc.fightWith) npc.fightWith = null;
      if (npc.transit) {
        if (s.t >= npc.transit.eta) this.arrive(npc, npc.transit.to, npc.transit.from);
        continue;
      }
      const goal = this.decide(npc);
      if (goal.room !== npc.room) {
        const door = sim.world.nextDoor(npc.room, goal.room);
        if (door) {
          const far = sim.world.isOffmap(npc.room) && sim.world.isOffmap(door.to);
          npc.transit = { from: npc.room, to: door.to, eta: s.t + (far ? 18 : 2) };
          if (npc.spot) npc.spot = null;
          npc.act = 'walk';
        }
      } else {
        npc.act = ({ sleep: 'sleep', rest: 'rest', eat: 'eat', work: 'work', workout: 'lift' })[goal.act] || 'idle';
      }
    }
  }

  arrive(npc, room, from) {
    const sim = this.sim;
    npc.transit = null;
    npc.room = room;
    npc.spot = null;
    if (sim.loaded.has(room)) {
      const d = sim.world.entryDoor(room, from);
      this.materialize(npc, d ? d.spawn : null);
    }
  }

  materialize(npc, at) {
    const sim = this.sim;
    const r = sim.world.room(npc.room);
    if (!r || r.kind === 'offmap') return;
    npc.loaded = true;
    npc._ = null;
    const _ = scratch(npc);
    if (at) {
      npc.x = at.x;
      npc.y = at.y;
    } else if (npc.saved && npc.saved.room === npc.room && sim.s.t - npc.saved.t < 45 && sim.world.walkable(npc.room, npc.saved.x, npc.saved.y)) {
      npc.x = npc.saved.x;
      npc.y = npc.saved.y;
    } else {
      // already settled here: put them where their schedule says
      const goal = this.decide(npc);
      const pl = goal.room === npc.room ? this.placeFor(npc, goal) : null;
      if (pl && pl.prop) {
        const prop = sim.world.prop(npc.room, pl.prop);
        const sp = prop.spots[pl.i];
        npc.x = sp.ax ?? sp.x;
        npc.y = sp.ay ?? sp.y;
        _.goal = goal;
        _.place = pl;
        sim.enterSpot(npc, prop, pl.i, goal.act);
        _.arrived = true;
        return;
      }
      if (pl && pl.staff) {
        npc.x = pl.x;
        npc.y = pl.y;
        npc.face = pl.face;
        npc.act = 'work';
        _.goal = goal;
        _.place = pl;
        _.arrived = true;
        return;
      }
      const pt = pl || sim.world.randomPoint(npc.room, sim.rng);
      npc.x = pt.x;
      npc.y = pt.y;
    }
    npc.act = 'idle';
  }

  dematerialize(npc) {
    // seated folks get re-seated by schedule; walkers keep their spot for a while
    npc.saved = npc.spot ? null : { room: npc.room, x: npc.x, y: npc.y, t: this.sim.s.t };
    npc.spot = null;
    npc.loaded = false;
    npc.fightWith = null;
    if (npc.downUntil) {
      npc.downUntil = 0;
      npc.recoverUntil = this.sim.s.t + 240;
    }
    npc._ = null;
  }
}
