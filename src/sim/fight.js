// Fights: short and physical. Strike, back off. Witnesses remember who started it.

import { ITEMS } from '../data/items.js';
import { PERSONALITIES } from '../data/personalities.js';
import { scratch, FACE_VEC, faceToward } from './actors.js';
import { remember, adjustRel, witnesses, relV, grudgeMul } from './memory.js';
import { destroy, dropHands } from './items.js';
import { clamp } from './util.js';

const REACH = 30;

export class Fights {
  constructor(sim) {
    this.sim = sim;
  }

  weapon(a) {
    const it = a.hands && this.sim.s.items[a.hands];
    if (!it) return null;
    const d = ITEMS[it.def];
    return d.dmg ? { it, d } : null;
  }

  canAct(a) {
    const _ = scratch(a);
    return !a.downUntil && !a.dead && _.cd <= 0 && _.strikeT <= 0 && a.act !== 'sleep';
  }

  // aim: optional world point to swing or fire at (mouse click / auto-target)
  strike(a, aim = null) {
    const sim = this.sim;
    const _ = scratch(a);
    if (!this.canAct(a)) return false;
    _.aim = null;
    if (aim) {
      const dx = aim.x - a.x;
      const dy = aim.y - (a.y - 20);
      const d = Math.hypot(dx, dy);
      if (d > 1) {
        _.aim = { x: dx / d, y: dy / d };
        faceToward(a, a.x + dx, a.y + dy);
      }
    }
    const held = a.hands && sim.s.items[a.hands];
    if (held && ITEMS[held.def].kind === 'firearm') return this.shoot(a, held);
    if (a.stats.stamina < 8) {
      if (a.kind === 'player') sim.toast('Too winded to swing.', 'warn');
      return false;
    }
    if (a.spot) sim.leaveSpot(a);
    _.strikeT = 0.17;
    _.strikeAnim = 0.34;
    a.stats.stamina = Math.max(0, a.stats.stamina - 11);
    sim.sfx('swing', a);
    return true;
  }

  // Firearms: rare, licensed, loud. Hit chance comes from aim and distance.
  shoot(a, gun) {
    const sim = this.sim;
    const _ = scratch(a);
    if (a.spot) sim.leaveSpot(a);
    if ((gun.ammo || 0) <= 0) {
      // reload from an ammo box if you have one
      const box = [...sim.items.contItems(sim, a.pockets || '')].find((it) => it.def === 'ammo');
      if (box) {
        const n = Math.min(ITEMS[gun.def].ammoMax || 12, box.n);
        box.n -= n;
        if (box.n <= 0) sim.items.destroy(sim, box);
        gun.ammo = n;
        _.cd = 1.2;
        sim.toast(`Reloaded (${n}).`, '');
        sim.sfx('click', a);
      } else if (a.kind === 'npc' && a.fightWith) {
        // out of bullets: the gun becomes a club
        gun.ammo = 0;
        _.cd = 0.6;
        a.hands = null;
        dropHands(sim, a);
        sim.say(a, 'swing');
      } else {
        if (a.kind === 'player') sim.toast('Click. Empty.', 'warn');
        sim.sfx('click', a);
        _.cd = 0.4;
      }
      return false;
    }
    gun.ammo--;
    const G = ITEMS[gun.def];
    _.cd = a.kind === 'npc' ? 0.9 : 0.45;
    _.strikeAnim = 0.2;
    const [fx, fy] = _.aim ? [_.aim.x, _.aim.y] : FACE_VEC[a.face];
    sim.emit('muzzle', { room: a.room, x: a.x + fx * 14, y: a.y - 26 + fy * 8, dir: a.face, ax: fx, ay: fy });
    sim.sfx('shot', a);
    // the closest person in a narrow cone ahead
    let best = null;
    let bd = G.range || 520;
    for (const id in sim.s.actors) {
      const b = sim.s.actors[id];
      if (b === a || b.room !== a.room || !b.loaded || b.downUntil || b.act === 'drive') continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d > bd || d < 1) continue;
      if ((dx * fx + dy * fy) / d < (_.aim ? 0.94 : 0.9)) continue;
      bd = d;
      best = b;
    }
    sim.emit('tracer', { room: a.room, x: a.x + fx * 14, y: a.y - 26, tx: best ? best.x : a.x + fx * bd, ty: best ? best.y - 28 : a.y - 26 + fy * bd });
    // everybody heard that
    for (const w of witnesses(sim, a.room, a.x, a.y, [a.id])) {
      if (w.police) continue;
      remember(sim, w, { type: 'shot', who: a.id, x: best ? best.id : null });
      adjustRel(sim, w, a.id, -20);
      if (w !== best && w.fightWith !== a.id && w.id !== a.fightWith) this.flee(w, a);
    }
    if (a.kind === 'player') {
      sim.addHeat(best ? 45 : 25, best ? 'firing at someone' : 'firing a gun in public');
      sim.repChange(best ? -6 : -3, 'gunfire', a.room);
      sim.police.onShots(a);
    }
    if (!best) return true;
    const p = clamp(0.2 + a.stats.aim / 110 - bd / 1600 + (bd < 60 ? 0.15 : 0), 0.08, 0.95);
    if (!sim.rng.chance(p)) {
      sim.emit('float', { room: best.room, x: best.x, y: best.y - 50, text: 'miss', color: '#cfd8e3' });
      return true;
    }
    const dmg = Math.round(gun.dmgOverride || G.dmg * sim.rng.range(0.8, 1.2));
    best.stats.health = Math.max(0, best.stats.health - dmg);
    const _b = scratch(best);
    _b.hurtT = 0.35;
    _b.kx = fx * 220;
    _b.ky = fy * 220;
    sim.emit('hit', { room: best.room, x: best.x, y: best.y - 30, dmg, by: a.id, on: best.id });
    sim.emit('float', { room: best.room, x: best.x, y: best.y - 54, text: `-${dmg}`, color: '#ff6b5e' });
    if (best.kind === 'npc') {
      remember(sim, best, { type: 'shot', who: a.id });
      adjustRel(sim, best, a.id, -70);
      if (best.stats.health > 0 && best.fightWith !== a.id) this.flee(best, a);
    }
    if (best.kind === 'player' && a.kind === 'npc') sim.emit('shake', { amt: 12 });
    if (best.stats.health <= 0) this.knockDown(best, a, 'shot');
    return true;
  }

  // Keyboard swings: turn toward whoever is closest (no mouse needed).
  autoAim(a) {
    const sim = this.sim;
    const held = a.hands && sim.s.items[a.hands];
    const gun = held && ITEMS[held.def].kind === 'firearm';
    const reach = gun ? 420 : REACH + 40;
    let best = null;
    let bd = reach;
    for (const id in sim.s.actors) {
      const b = sim.s.actors[id];
      if (b === a || b.room !== a.room || !b.loaded || b.downUntil || b.dead || b.act === 'drive') continue;
      let d = Math.hypot(b.x - a.x, b.y - a.y);
      if (b.fightWith === a.id || a.fightWith === b.id) d *= 0.5; // whoever you're fighting comes first
      if (d < bd) {
        bd = d;
        best = b;
      }
    }
    return best ? { x: best.x, y: best.y - 20 } : null;
  }

  backOff(a) {
    const sim = this.sim;
    const _ = scratch(a);
    if (a.downUntil || _.backT > 0 || a.stats.stamina < 10) return false;
    if (a.spot) sim.leaveSpot(a);
    const [fx, fy] = FACE_VEC[a.face];
    _.kx = -fx * 330;
    _.ky = -fy * 330;
    _.backT = 0.22;
    _.iframe = 0.2;
    _.cd = Math.max(_.cd, 0.18);
    a.stats.stamina = Math.max(0, a.stats.stamina - 13);
    return true;
  }

  update(dt) {
    const sim = this.sim;
    for (const id in sim.s.actors) {
      const a = sim.s.actors[id];
      if (!a.loaded) continue;
      const _ = scratch(a);
      if (_.cd > 0) _.cd -= dt;
      if (_.backT > 0) _.backT -= dt;
      if (_.iframe > 0) _.iframe -= dt;
      if (_.hurtT > 0) _.hurtT -= dt;
      if (_.strikeAnim > 0) _.strikeAnim -= dt;
      if (_.strikeT > 0) {
        _.strikeT -= dt;
        if (_.strikeT <= 0) this.resolve(a);
      }
    }
  }

  resolve(a) {
    const sim = this.sim;
    const _ = scratch(a);
    const w = this.weapon(a);
    const reach = REACH + (w ? w.d.reach || 0 : 0);
    const [fx, fy] = _.aim ? [_.aim.x, _.aim.y] : FACE_VEC[a.face];
    let best = null;
    let bd = Infinity;
    for (const id in sim.s.actors) {
      const b = sim.s.actors[id];
      if (b === a || b.room !== a.room || !b.loaded || b.downUntil || b.dead || b.act === 'drive') continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d > reach + 10) continue;
      const dot = d > 0 ? (dx * fx + dy * fy) / d : 1;
      if (dot < 0.35) continue;
      if (d < bd) {
        bd = d;
        best = b;
      }
    }
    _.cd = clamp(0.52 - a.stats.agility * 0.0022, 0.28, 0.6);
    if (!best) return;
    this.hit(a, best, w);
  }

  hit(a, b, w) {
    const sim = this.sim;
    const _b = scratch(b);
    const firstContact = b.fightWith !== a.id && a.fightWith !== b.id;
    if (firstContact) this.begin(a, b);
    if (b.kind === 'player' && sim.s.sleepUntil) sim.wake('You wake up to a fist.');
    // dodge chance from agility; backing off gives i-frames
    const dodge = clamp(0.14 + (b.stats.agility - a.stats.agility) / 260, 0.04, 0.45);
    if (_b.iframe > 0 || sim.rng.chance(dodge)) {
      sim.emit('float', { room: b.room, x: b.x, y: b.y - 50, text: 'miss', color: '#cfd8e3' });
      sim.sfx('whiff', b);
      return;
    }
    const base = 7 + (w ? w.d.dmg : 0);
    let dmg = base * (0.55 + a.stats.strength / 110) * sim.rng.range(0.85, 1.15);
    if (b.act === 'sit' || b.act === 'lie' || b.act === 'sleep') dmg *= 1.25;
    dmg = Math.round(dmg);
    b.stats.health = Math.max(0, b.stats.health - dmg);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1;
    _b.kx = (dx / d) * (150 + dmg * 6);
    _b.ky = (dy / d) * (150 + dmg * 6);
    _b.hurtT = 0.28;
    if (b.spot) sim.leaveSpot(b);
    a.lastUse && (a.lastUse.strength = sim.s.t);
    if (a.kind === 'player') a.stats.strength = clamp(a.stats.strength + 0.04, 0, 100);
    sim.emit('hit', { room: b.room, x: b.x, y: b.y - 30, dmg, by: a.id, on: b.id });
    sim.emit('float', { room: b.room, x: b.x, y: b.y - 54, text: `-${dmg}`, color: '#ff6b5e' });
    if (a.kind === 'player' || b.kind === 'player') sim.emit('shake', { amt: Math.min(10, 3 + dmg * 0.35) });
    sim.sfx(w ? 'thwack' : 'punch', b);
    if (b.kind === 'npc' && sim.rng.chance(0.35)) sim.say(b, 'hurt');
    if (w && w.d.breaks && sim.rng.chance(w.d.breaks)) {
      sim.emit('float', { room: a.room, x: a.x, y: a.y - 60, text: 'crash!', color: '#9fd8ff' });
      sim.sfx('glass', a);
      destroy(sim, w.it);
    }
    if (b.kind === 'npc') {
      remember(sim, b, { type: 'hit', who: a.id });
      adjustRel(sim, b, a.id, -6 * grudgeMul(b));
      if (b.fightWith !== a.id) this.respond(b, a);
    }
    if (b.stats.health <= 0) this.knockDown(b, a, w && w.d.lethal ? 'stabbed' : 'beaten');
  }

  // First blow between two people: witnesses note who started it.
  begin(a, b) {
    const sim = this.sim;
    a.fightWith = b.id;
    if (a.kind === 'npc' && b.kind === 'npc') sim.crews.onNpcFight(a, b);
    if (a.kind === 'player' && b.kind === 'npc') sim.crews.onHostile(b, 10, 'a fight');
    const rec = { by: a.id, on: b.id, room: a.room, t: sim.s.t, at: sim.time };
    sim.s.lastFight = rec;
    if (b.kind === 'npc') {
      adjustRel(sim, b, a.id, -18 * grudgeMul(b));
    }
    for (const w of witnesses(sim, a.room, a.x, a.y, [a.id, b.id])) {
      remember(sim, w, { type: 'started', who: a.id, x: b.id });
      const likesB = relV(w, b.id);
      adjustRel(sim, w, a.id, likesB > 20 ? -12 : -5);
      // friends may jump in
      const P = PERSONALITIES[w.personality];
      if (likesB >= 45 && relV(w, a.id) < 20 && P.temper >= 0.3 && !w.police && sim.rng.chance(0.6)) {
        this.squareUp(w, a, false);
        remember(sim, b.kind === 'npc' ? b : w, { type: 'helped', who: w.id });
      }
    }
    if (a.kind === 'player') {
      sim.log(`You started a fight with ${b.short}.`, 'bad');
      sim.s.stats.fightsStarted++;
    } else if (b.kind === 'player') {
      sim.log(`${a.short} came at you.`, 'bad');
    }
    sim.police.onFight(a, b);
  }

  respond(b, a) {
    const P = PERSONALITIES[b.personality];
    if (b.police) {
      this.squareUp(b, a, false);
      return;
    }
    // tired / weak folks bail
    if (b.stats.health < 100 * P.flee || (b.personality === 'tired' && this.sim.rng.chance(0.6))) {
      this.flee(b, a);
      return;
    }
    this.squareUp(b, a, false);
  }

  squareUp(npc, target, swingNow) {
    const sim = this.sim;
    if (npc.kind !== 'npc' || npc.downUntil) return;
    if (npc.spot) sim.leaveSpot(npc);
    npc.fightWith = target.id;
    npc.act = 'fight';
    const _ = scratch(npc);
    _.path = null;
    _.goal = null;
    _.fleeing = false;
    _.squareAt = sim.time;
    _.swingNow = swingNow;
    if (swingNow) sim.say(npc, 'swing');
    else if (sim.rng.chance(0.5)) sim.say(npc, 'squareUp');
  }

  flee(npc, from) {
    const sim = this.sim;
    if (npc.kind !== 'npc') return;
    npc.fightWith = null;
    npc.act = 'idle';
    const _ = scratch(npc);
    _.fleeing = true;
    _.fleeFrom = from.id;
    _.fleeUntil = sim.time + 6;
    _.path = null;
    _.goal = null;
    sim.say(npc, 'flee');
  }

  stopAll(room) {
    const sim = this.sim;
    for (const id in sim.s.actors) {
      const a = sim.s.actors[id];
      if (a.room !== room) continue;
      if (a.fightWith) a.fightWith = null;
      if (a.act === 'fight') a.act = 'idle';
    }
  }

  // cause: 'beaten' (fists, clubs), 'stabbed' or 'shot'. The last two can kill.
  knockDown(b, a, cause = 'beaten') {
    const sim = this.sim;
    b.fightWith = null;
    a.fightWith = null;
    if (a.kind === 'npc' && a.act === 'fight') a.act = 'idle';
    const wa = this.weapon(a);
    const wb = this.weapon(b);
    const fair = (wa ? wa.d.dmg : 0) - (wb ? wb.d.dmg : 0) < 6;
    const started = sim.s.lastFight && sim.s.lastFight.by;
    for (const w of witnesses(sim, b.room, b.x, b.y, [a.id, b.id])) {
      if (started === b.id && fair) adjustRel(sim, w, a.id, 3);
    }
    if (b.kind === 'npc') remember(sim, b, { type: 'dropped', who: a.id });
    if (a.kind === 'npc' && b.kind === 'player') sim.say(a, 'win');
    if (a.kind === 'player') {
      sim.s.stats.fightsWon++;
      if (fair) sim.repChange(started === 'p' ? 2 : 5, `dropped ${b.short} in a fair fight`, b.room);
      else sim.repChange(-2, `dropped ${b.short} with a weapon`, b.room);
      sim.log(`${b.short} hit the floor.`, fair ? 'good' : 'bad');
    }
    if (b.kind === 'npc') {
      b.downUntil = sim.time + 7;
      b.act = 'down';
      if (b.spot) sim.leaveSpot(b);
      dropHands(sim, b);
      sim.street.dropLoot(b);
      sim.emit('down', { id: b.id, room: b.room });
      sim.police.onKnockdown(a, b);
      // strangers on the street don't get back up from a bullet or a blade
      if (b.extra && cause !== 'beaten') sim.street.kill(b, a, cause);
    } else {
      sim.playerDown(a, cause);
    }
  }

  // NPC fight brain, run from the AI tick.
  think(npc, dt) {
    const sim = this.sim;
    const t = sim.s.actors[npc.fightWith];
    const _ = scratch(npc);
    if (!t || t.room !== npc.room || t.downUntil || t.dead || !t.loaded || t.act === 'drive') {
      npc.fightWith = null;
      npc.act = 'idle';
      return { dx: 0, dy: 0 };
    }
    const P = PERSONALITIES[npc.personality];
    const dx = t.x - npc.x;
    const dy = t.y - npc.y;
    const d = Math.hypot(dx, dy);
    if (npc.stats.health < 100 * P.flee && !npc.police && sim.rng.chance(dt * 1.5)) {
      this.flee(npc, t);
      return { dx: 0, dy: 0 };
    }
    if (d > 700) {
      npc.fightWith = null;
      npc.act = 'idle';
      return { dx: 0, dy: 0 };
    }
    faceToward(npc, t.x, t.y);
    const w = this.weapon(npc);
    const reach = REACH + (w ? w.d.reach || 0 : 0) - 4;
    // circle in, strike, sometimes step back
    if (_.strikeT > 0 || _.backT > 0) return { dx: 0, dy: 0 };
    if (d < reach) {
      const wait = sim.time - (_.squareAt || 0) < (_.swingNow ? 0.1 : 0.6);
      if (!wait && _.cd <= 0 && npc.stats.stamina > 10) {
        this.strike(npc);
        return { dx: 0, dy: 0 };
      }
      if (npc.stats.stamina < 25 && sim.rng.chance(dt * 2)) this.backOff(npc);
      // shuffle sideways
      return { dx: -dy / d * 0.3, dy: dx / d * 0.3 };
    }
    return { dx: dx / d, dy: dy / d, run: d > 90 };
  }
}
