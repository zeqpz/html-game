// The simulation. Owns all game state; the view only reads it and sends
// commands. Fixed-step, deterministic for a given seed + inputs, DOM-free.

import { World, ACTOR_R } from './world.js';
import { RNG } from './rng.js';
import * as items from './items.js';
import * as talk from './talk.js';
import { AI } from './ai.js';
import { Fights } from './fight.js';
import { Work } from './work.js';
import { Police } from './police.js';
import { updateBoard, pin, unpin } from './board.js';
import { Money } from './money.js';
import { Cars } from './cars.js';
import { Licenses } from './licenses.js';
import { MODELS } from '../data/cars.js';
import { Crews } from './crews.js';
import { Economy, coinPrice } from './economy.js';
import { Furniture } from './furniture.js';
import { CREWS } from '../data/crews.js';
import { FURNITURE } from '../data/rooms3.js';
import { LEASE_NAMES, RENT } from './money.js';
import { makePlayer, makeNpc, scratch, playerNeeds, walkSpeed, sprintMul, moveBody, staminaTick, faceToward, FACE_VEC, schedNow } from './actors.js';
import { relV, adjustRel, remember, setTag, displayTag, witnesses, meet } from './memory.js';
import { clamp, hm, tod, dayOf, inWindow, DAY, clock12, rectDist, rectHit, hashStr, weekday } from './util.js';
import { NPCS, NPC_LINKS } from '../data/npcs.js';
import { ROOMS, START_LOOSE, CELL } from '../data/rooms.js';
import { ITEMS } from '../data/items.js';
import { BARK, CHAT } from '../data/lines.js';
import { SHOPS } from '../data/shops.js';
import { JOBS, FAVORS } from '../data/work.js';

export const SAVE_VERSION = 1;
export const STEP = 1 / 30;
const SLEEP_SCALE = 45;

export class Sim {
  constructor(state) {
    this.s = state;
    this.world = new World();
    this.rng = new RNG(1);
    this.rng.s = state.rng >>> 0;
    this.items = items;
    this.ai = new AI(this);
    this.fight = new Fights(this);
    this.work = new Work(this);
    this.police = new Police(this);
    this.money = new Money(this);
    this.cars = new Cars(this);
    this.licenses = new Licenses(this);
    this.crews = new Crews(this);
    this.economy = new Economy(this);
    this.furniture = new Furniture(this);
    this.events = [];
    this.input = { mx: 0, my: 0, sprint: false };
    this.edges = {};
    this.dialog = null;
    this.ui = { menu: null, modal: null };
    this.time = 0;
    this.timers = [];
    this.minAcc = 0;
    this.lastDm = 0;
    this.loaded = new Set();
    this.wantSave = false;
    for (const id in state.actors) state.actors[id].loaded = id === 'p';
    this.refreshLoaded(true);
  }

  // ------------------------------------------------------------ creation
  static create({ seed = (Math.random() * 2 ** 31) | 0, name = 'Marcus', look, dayLen = 600 } = {}) {
    const s = {
      v: SAVE_VERSION, seed, rng: seed >>> 0 || 7, t: DAY + hm('08:30'), dayLen,
      actors: {}, items: {}, conts: {}, rooms: {}, favors: [], favorCooldown: {},
      job: { jobs: {}, shift: null }, log: [], uid: 1, flags: {}, lastFight: null,
      stats: { fightsStarted: 0, fightsWon: 0, shifts: 0, favors: 0, knockouts: 0 },
      lastDawn: 1, lastHour: 0, board: [], leases: {},
    };
    const p = makePlayer(name, look || defaultLook());
    p.x = 110;
    p.y = 300;
    p.face = 'down';
    p.awakeSince = s.t - 60;
    s.actors.p = p;
    const sim = Object.create(Sim.prototype);
    sim.s = s;
    sim.rng = new RNG(s.rng);
    sim.events = [];
    sim.world = new World();
    items.makeCont(sim, p.pockets, 4, 2, 'p');
    for (const def of NPCS) {
      const n = makeNpc(def);
      n.room = schedNow(n, s.t).room || n.home;
      s.actors[n.id] = n;
      if (n.neighbor) setTag(n, 'p', 'neighbor');
    }
    for (const [a, b, v, tag] of NPC_LINKS) {
      const A = s.actors[a];
      const B = s.actors[b];
      if (!A || !B) continue;
      A.rel[b] = { v, tag: tag || null, met: true };
      B.rel[a] = { v, tag: tag || null, met: true };
    }
    for (const id in ROOMS) {
      const def = ROOMS[id];
      if (def.containers) for (const k in def.containers) items.makeCont(sim, `${id}:${k}`, def.containers[k].w, def.containers[k].h, id);
      for (const si of def.startItems || []) items.putInCont(sim, items.newItem(sim, si.def), `${id}:${si.cont}`);
    }
    for (const L of START_LOOSE) {
      const it = items.newItem(sim, L.def, L.n ? { n: L.n } : {});
      sim.s.rooms[L.room] = sim.s.rooms[L.room] || { items: [] };
      items.placeGround(sim, it, L.room, L.x, L.y);
    }
    items.putInCont(sim, items.newItem(sim, 'cash', { n: 35 }), p.pockets);
    s.log.push({ t: s.t, text: `${weekday(s.t)} morning. Rent's paid through Sunday. $35 in your pocket.`, kind: '' });
    s.rng = sim.rng.s;
    const real = new Sim(s);
    real.cars.giveStartCar();
    s.flags.startCar = true;
    s.log.push({ t: s.t, text: "Your old sedan is parked out front on Pecan St. It won't start for you until you get a driver license.", kind: '' });
    return real;
  }

  static load(data) {
    const s = typeof data === 'string' ? JSON.parse(data) : data;
    if (!s || typeof s !== 'object') throw new Error('Bad save');
    if (s.v > SAVE_VERSION) throw new Error(`Save is from a newer version (${s.v})`);
    migrate(s);
    const sim = new Sim(s);
    if (!s.flags.startCar) {
      sim.cars.giveStartCar();
      s.flags.startCar = true;
    }
    return sim;
  }

  serialize() {
    this.s.rng = this.rng.s;
    return JSON.stringify(this.s, (k, v) => (k.startsWith('_') ? undefined : v));
  }

  // ------------------------------------------------------------ helpers
  get player() {
    return this.s.actors.p;
  }

  roomState(id) {
    if (!this.s.rooms[id]) this.s.rooms[id] = { items: [] };
    return this.s.rooms[id];
  }

  emit(type, data = {}) {
    this.events.push({ type, ...data });
    if (this.events.length > 300) this.events.splice(0, this.events.length - 300);
  }

  log(text, kind = '') {
    this.s.log.push({ t: this.s.t, text, kind });
    if (this.s.log.length > 300) this.s.log.splice(0, this.s.log.length - 300);
    this.emit('log', { text, kind });
  }

  toast(text, kind = '') {
    this.emit('toast', { text, kind });
  }

  sfx(name, a = null) {
    if (a && a.room !== this.player.room) return;
    this.emit('sfx', { name, x: a ? a.x : this.player.x, y: a ? a.y : this.player.y });
  }

  say(a, key, vars = {}) {
    const pool = BARK[key];
    if (!pool) return;
    let line = pool[Math.floor(this.rng.next() * pool.length)];
    line = this.fillTime(line.replace(/\{p\}/g, this.player.name).replace(/\{item\}/g, vars.item || 'that'));
    this.sayText(a, line);
  }

  // {greet} and {weather} follow the clock and the sky.
  fillTime(line) {
    if (!line.includes('{')) return line;
    const m = tod(this.s.t);
    const greet = m < 300 ? 'Late one' : m < 720 ? 'Mornin\'' : m < 1050 ? 'Afternoon' : 'Evenin\'';
    const w = this.weather;
    const weather = w.rain > 0.3 ? 'Wet one out there.' : m > 600 && m < 1140 && w.heat > 0.6 ? 'Hot one today.' : m >= 1260 || m < 300 ? 'Quiet night.' : 'Sticky out, huh?';
    return line.replace(/\{greet\}/g, greet).replace(/\{weather\}/g, weather);
  }

  sayText(a, text) {
    if (!a || !a.loaded) return;
    this.emit('say', { id: a.id, text });
  }

  later(sec, fn) {
    this.timers.push({ at: this.time + sec, fn });
  }

  repChange(d, why, room) {
    const p = this.player;
    const before = p.stats.reputation;
    p.stats.reputation = clamp(p.stats.reputation + d, 0, 100);
    if (Math.round(p.stats.reputation) !== Math.round(before)) this.emit('stat', { key: 'reputation', d });
  }

  addHeat(d, why) {
    const p = this.player;
    p.heat = clamp(p.heat + d, 0, 100);
    this.emit('stat', { key: 'heat', d });
    if (why) this.log(`Heat +${d}: ${why}.`, 'bad');
  }

  isOpen(roomId) {
    const def = ROOMS[roomId];
    if (!def || !def.hours) return true;
    return inWindow(tod(this.s.t), hm(def.hours[0]), hm(def.hours[1]));
  }

  policeIn(room) {
    return this.police.copsIn(room).length > 0;
  }

  dynamicSolids() {
    return null;
  }

  spotTaken(room, propId, i, exceptId) {
    for (const id in this.s.actors) {
      const a = this.s.actors[id];
      if (id === exceptId || !a.spot) continue;
      if (a.spot.room === room && a.spot.prop === propId && a.spot.i === i) return true;
    }
    return false;
  }

  enterSpot(a, prop, i, goalAct) {
    const sp = prop.spots[i];
    a.x = sp.x;
    a.y = sp.y;
    a.face = sp.face || 'down';
    a.spot = { room: a.room, prop: prop.id, i };
    let act = 'sit';
    if (sp.pose === 'sit') act = goalAct === 'eat' ? 'eat' : 'sit';
    else if (sp.pose === 'lie') act = prop.use === 'sleep' ? (goalAct === 'sleep' ? 'sleep' : 'lie') : prop.use === 'lift' ? 'lift' : 'lie';
    else if (sp.pose === 'run') act = 'run';
    else if (sp.pose === 'bag') act = 'bag';
    else if (sp.pose === 'lift' || sp.pose === 'curl') act = 'lift';
    else act = 'idle';
    a.act = act;
    a.pose = sp.pose;
    const _ = scratch(a);
    _.vx = _.vy = 0;
    _.trainT = 0;
    if (a.kind === 'npc' && act === 'eat' && a.cash >= 9 && this.isOpen(a.room)) a.cash -= 9;
  }

  leaveSpot(a) {
    if (!a.spot) return;
    const prop = this.world.prop(a.spot.room, a.spot.prop);
    const sp = prop && prop.spots[a.spot.i];
    a.spot = null;
    a.pose = null;
    if (sp) {
      a.x = sp.ax ?? sp.x;
      a.y = sp.ay ?? sp.y + 22;
    }
    const p = { x: a.x, y: a.y };
    this.world.collide(a.room, p);
    a.x = p.x;
    a.y = p.y;
    if (a.act !== 'fight') a.act = 'idle';
    if (a.kind === 'player' && this.s.sleepUntil) this.wake('');
  }

  // ------------------------------------------------------------ rooms
  refreshLoaded(initial = false) {
    const p = this.player;
    const want = new Set([p.room]);
    const r = this.world.room(p.room);
    if (r && r.kind === 'street') for (const k in r.edges) if (r.edges[k]) want.add(r.edges[k]);
    for (const id in this.s.actors) {
      const a = this.s.actors[id];
      if (a.kind !== 'npc') continue;
      if (a.loaded && !want.has(a.room)) this.ai.dematerialize(a);
    }
    const before = this.loaded || new Set();
    this.loaded = want;
    for (const id in this.s.actors) {
      const a = this.s.actors[id];
      if (a.kind !== 'npc' || a.transit) continue;
      if (want.has(a.room) && (!a.loaded || initial)) {
        a.loaded = false;
        this.ai.materialize(a, null);
      }
    }
    for (const room of want) {
      if (!before.has(room)) this.roomState(room).lastLoaded = this.s.t;
    }
  }

  // An NPC walks through a door.
  passDoor(npc, door) {
    if (npc.spot) this.leaveSpot(npc);
    const from = npc.room;
    npc.fightWith = null;
    if (this.loaded.has(door.to)) {
      npc.room = door.to;
      const entry = this.world.door(door.to, door.toDoor) || this.world.entryDoor(door.to, from);
      npc.loaded = false;
      this.ai.materialize(npc, entry ? entry.spawn : null);
    } else {
      this.ai.dematerialize(npc);
      npc.saved = null;
      npc.room = door.to;
    }
  }

  canEnter(door) {
    if (door.npcOnly) {
      if (door.vacant) return { ok: false, text: `Unit ${door.plate} is vacant. Ask Mr. Boudreaux about leasing it.` };
      if (door.plate) return { ok: false, text: `Unit ${door.plate}. Somebody else's place.` };
      return { ok: false, quiet: true };
    }
    const def = ROOMS[door.to];
    if (def && def.hours && !this.isOpen(door.to)) {
      const js = this.s.job.jobs[Object.keys(JOBS).find((k) => JOBS[k].place === door.to)];
      if (!(js && js.hired)) return { ok: false, text: `${def.name} is closed. Opens at ${clock12(hm(def.hours[0]))}.` };
    }
    if (door.staffJob) {
      const js = this.s.job.jobs[door.staffJob];
      if (!js || !js.hired || js.rank < 1) return { ok: false, text: 'Staff room. Shift leads and up — earn a promotion first.' };
    }
    if (door.lease && door.lease !== 'apt_2b' && !this.s.leases[door.lease]) return { ok: false, lease: door.lease, text: `${LEASE_NAMES[door.lease]} is for lease — $${RENT[door.lease]} a week.` };
    if (door.lease && !this.leaseOk(door.lease)) return { ok: false, text: `The lock won't turn. Rent is overdue — $${this.money.lease(door.lease).rent} in the drop box.` };
    return { ok: true };
  }

  leaseOk(id) {
    return this.money.leaseOk(id);
  }

  changeRoom(to, spawn, how = 'door') {
    const p = this.player;
    const from = p.room;
    if (p.spot) this.leaveSpot(p);
    if (p.fightWith) p.fightWith = null;
    for (const id in this.s.actors) {
      const a = this.s.actors[id];
      if (a.fightWith === 'p' && a.room === from) {
        a.fightWith = null;
        if (a.act === 'fight') a.act = 'idle';
      }
    }
    this.closeMenus();
    p.room = to;
    p.x = spawn.x;
    p.y = spawn.y;
    const _ = scratch(p);
    _.doorLock = true;
    _.task = null;
    this.refreshLoaded();
    this.emit('room', { from, to, how });
    if (how === 'door') this.sfx('door');
    this.wantSave = true;
  }

  sendTo(roomId, why) {
    const r = this.world.room(roomId);
    if (!r) {
      // fall back to home
      this.changeRoom('apt_2b', { x: 120, y: 300 }, 'fade');
      if (why) this.log(why, 'bad');
      return;
    }
    const spot = r.def.arrive || { x: r.w / 2, y: r.h - 80 };
    this.changeRoom(roomId, spot, 'fade');
    if (why) this.log(why, 'bad');
  }

  closeMenus() {
    this.ui.menu = null;
    this.ui.modal = null;
    if (this.dialog) talk.closeTalk(this);
  }

  // ------------------------------------------------------------ stepping
  step(dt = STEP) {
    const s = this.s;
    this.time += dt;
    const scale = s.sleepUntil ? SLEEP_SCALE : 1;
    const dm = dt * (DAY / s.dayLen) * scale;
    s.t += dm;
    this.lastDm = dm;

    this.updatePlayer(dt);
    this.cars.update(dt);
    this.syncDriver();
    this.work.tick();
    this.ai.update(dt);
    this.fight.update(dt);
    this.separate();
    this.updateTasks(dt);
    for (let i = this.timers.length - 1; i >= 0; i--) {
      if (this.time >= this.timers[i].at) {
        const t = this.timers.splice(i, 1)[0];
        t.fn();
      }
    }
    this.minAcc += dm;
    if (this.minAcc >= 1) {
      const chunk = this.minAcc;
      this.minAcc = 0;
      this.lastDm = chunk;
      this.ai.abstract(chunk);
      playerNeeds(this, this.player, chunk);
      this.work.update();
      this.money.update();
      this.economy.update(chunk);
      this.crews.update();
      updateBoard(this);
      this.clockEvents();
      this.lastDm = dm;
    }
    this.edges = {};
  }

  clockEvents() {
    const s = this.s;
    const day = dayOf(s.t);
    // dawn: loose items appear
    if (tod(s.t) >= hm('06:00') && s.lastDawn < day) {
      s.lastDawn = day;
      for (const id in this.world.rooms) items.spawnInRoom(this, id, this.loaded.has(id) ? 1 : 2);
      this.emit('dawn', {});
    }
    const hour = Math.floor(s.t / 60);
    if (hour !== s.lastHour) {
      s.lastHour = hour;
      // empty rooms sometimes grow a new item
      for (const id in this.world.rooms) if (!this.loaded.has(id) && this.rng.chance(0.12)) items.spawnInRoom(this, id, 1);
      // the radio after midnight carries through the wall
      if (this.roomState('apt_2b').radio) this.work.noise('apt_2b', 0, 0, 'Your radio is still going.');
      this.wantSave = true;
    }
    // mind floor: you snap
    const p = this.player;
    if (p.stats.mind <= 0 && !p.downUntil && !this.snap && (!this.snapCd || this.time > this.snapCd)) {
      this.snap = { until: this.time + 4, done: false };
      this.snapCd = this.time + 60;
      this.closeMenus();
      if (p.spot) this.leaveSpot(p);
      if (s.sleepUntil) this.wake('');
      this.log('Your head goes white. You lose it for a few seconds.', 'bad');
      this.emit('snap', {});
    }
    if (p.stats.health <= 0 && !p.downUntil && !p.dead) this.playerDown(null);
  }

  separate() {
    const list = [];
    for (const id in this.s.actors) {
      const a = this.s.actors[id];
      if (a.loaded && !a.spot && !a.downUntil && a.act !== 'drive' && this.world.room(a.room)?.kind !== 'offmap') list.push(a);
    }
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (a.room !== b.room) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        const min = ACTOR_R * 2;
        if (d2 >= min * min || d2 < 1e-6) continue;
        const d = Math.sqrt(d2);
        const push = (min - d) / 2;
        const ux = dx / d;
        const uy = dy / d;
        a.x -= ux * push;
        a.y -= uy * push;
        b.x += ux * push;
        b.y += uy * push;
      }
    }
  }

  // The driver rides along with the car.
  syncDriver() {
    const p = this.player;
    if (!p.car) return;
    const car = this.s.cars[p.car];
    if (!car) return;
    p.x = car.x;
    p.y = car.y;
    if (p.room !== car.room) this.changeRoom(car.room, { x: car.x, y: car.y }, 'edge');
  }

  // ------------------------------------------------------------ player
  updatePlayer(dt) {
    const p = this.player;
    const _ = scratch(p);
    const inp = this.input;
    const e = this.edges;

    if (p.downUntil) {
      moveBody(this, p, 0, 0, 0, dt);
      if (this.time >= p.downUntil) this.respawn();
      return;
    }
    if (this.s.sleepUntil) {
      if (this.s.t >= this.s.sleepUntil) this.wake('You wake up.');
      return;
    }
    // losing it: walk to the nearest person and shove them
    if (this.snap) {
      if (this.time > this.snap.until) {
        this.snap = null;
        p.stats.mind = Math.max(p.stats.mind, 12);
        this.log('You come back to yourself.', '');
      } else {
        let best = null;
        let bd = 400;
        for (const id in this.s.actors) {
          const a = this.s.actors[id];
          if (a === p || a.room !== p.room || !a.loaded || a.downUntil) continue;
          const d = Math.hypot(a.x - p.x, a.y - p.y);
          if (d < bd) {
            bd = d;
            best = a;
          }
        }
        if (best) {
          faceToward(p, best.x, best.y);
          if (bd < 30 && !this.snap.done) {
            this.snap.done = this.fight.strike(p);
          }
          moveBody(this, p, best.x - p.x, best.y - p.y, walkSpeed(this, p) * 1.2, dt);
        } else moveBody(this, p, Math.sin(this.time * 3), Math.cos(this.time * 2), 60, dt);
        return;
      }
    }

    const frozen = this.dialog || this.ui.modal;
    // behind the wheel: the car module reads driveInput
    if (p.car) {
      const car = this.s.cars[p.car];
      if (!car || car.stored) {
        p.car = null;
        p.act = 'idle';
      } else {
        this.driveInput = frozen ? { mx: 0, my: 0, hand: true } : { mx: inp.mx, my: inp.my, hand: !!inp.hand };
        if (frozen) return;
        if (e.interact) {
          const t = this.target();
          if (t && t.type === 'pump') this.ui.modal = { type: 'fuel', car: car.id };
          else this.cars.exit();
        }
        if (e.use) {
          car.radio = !car.radio;
          this.toast(car.radio ? 'Radio: KBYU 97.3 — slow and low.' : 'Radio off.', '');
          this.sfx('click');
        }
        return;
      }
    }
    // arranging furniture: the controls move the piece, not you
    if (this.ui.arrange) {
      const A = this.ui.arrange;
      A.x += inp.mx * 260 * dt;
      A.y += inp.my * 260 * dt;
      const r = this.world.room(p.room);
      A.x = clamp(A.x, r.bounds.x, r.bounds.x + r.bounds.w - A.w);
      A.y = clamp(A.y, r.bounds.y, r.bounds.y + r.bounds.h - A.h);
      A.ok = this.furniture.valid(p.room, A.uid, A.x, A.y);
      if (e.interact) {
        const res = this.furniture.place(p.room, A.uid, A.x, A.y);
        this.toast(res.text, res.ok ? 'good' : 'warn');
        if (res.ok) this.ui.arrange = null;
      }
      if (e.back) this.ui.arrange = null;
      return;
    }
    if (p.act === 'dance') {
      if (Math.hypot(inp.mx, inp.my) > 0.15 || frozen) p.act = 'idle';
      else this.dance(p, dt);
    }
    let mx = frozen ? 0 : inp.mx;
    let my = frozen ? 0 : inp.my;
    const moving = Math.hypot(mx, my) > 0.15;

    if (moving && p.spot) this.leaveSpot(p);
    if (moving && _.task) {
      _.task = null;
      this.toast('Stopped.', '');
    }
    if (moving && this.ui.menu) this.ui.menu = null;

    let speed = walkSpeed(this, p);
    let spending = false;
    if (inp.sprint && moving && p.stats.stamina > 1) {
      speed *= sprintMul(p);
      p.stats.stamina = Math.max(0, p.stats.stamina - 13 * dt);
      spending = true;
      _.runT = (_.runT || 0) + dt;
      if (_.runT > 6) {
        _.runT = 0;
        p.stats.agility = clamp(p.stats.agility + 0.06 * (1 - p.stats.agility / 120), 0, 100);
        p.lastUse.agility = this.s.t;
      }
    }
    if (!p.spot) moveBody(this, p, mx, my, speed, dt);
    if (_.strikeT > 0 || _.backT > 0) spending = true;
    staminaTick(p, dt, spending);

    // training on gym props
    if (p.spot && ['lift', 'run', 'bag', 'range'].includes(p.act)) this.train(p, dt);
    if (p.spot && p.act === 'sit') p.stats.mind = clamp(p.stats.mind + dt * 0.02, 0, 100);

    // doors and street edges
    this.checkDoors(p);

    if (frozen) return;
    if (e.interact) this.interact();
    if (e.strike) this.fight.strike(p);
    if (e.back) this.fight.backOff(p);
    if (e.drop) {
      const it = items.dropHands(this, p);
      if (it) this.log(`Dropped ${items.itemName(it)}.`);
    }
    if (e.use && p.hands) this.useHands();
  }

  checkDoors(p) {
    const _ = scratch(p);
    const r = this.world.room(p.room);
    if (r.kind === 'street') {
      let to = null;
      let nx = p.x;
      let ny = p.y;
      if (p.x < 0 && r.edges.w) { to = r.edges.w; nx += CELL; }
      else if (p.x > CELL && r.edges.e) { to = r.edges.e; nx -= CELL; }
      else if (p.y < 0 && r.edges.n) { to = r.edges.n; ny += CELL; }
      else if (p.y > CELL && r.edges.s) { to = r.edges.s; ny -= CELL; }
      if (to) {
        this.changeRoom(to, { x: nx, y: ny }, 'edge');
        return;
      }
    }
    const d = this.world.doorAt(p.room, p.x, p.y);
    if (!d) {
      _.doorLock = false;
      _.doorMsgAt = 0;
      return;
    }
    if (_.doorLock) return;
    const ok = this.canEnter(d);
    if (!ok.ok) {
      if (ok.lease && !this.ui.modal && (!_.doorMsgAt || this.time - _.doorMsgAt > 3)) {
        _.doorMsgAt = this.time;
        this.ui.modal = { type: 'lease', lease: ok.lease };
        return;
      }
      if (!ok.quiet && (!_.doorMsgAt || this.time - _.doorMsgAt > 3)) {
        _.doorMsgAt = this.time;
        this.toast(ok.text, 'warn');
        this.sfx('locked');
      }
      return;
    }
    const target = this.world.door(d.to, d.toDoor) || this.world.entryDoor(d.to, p.room);
    if (!target) return;
    this.changeRoom(d.to, target.spawn);
  }

  train(p, dt) {
    const _ = scratch(p);
    _.trainT = (_.trainT || 0) + dt;
    if (_.trainT < 2.6) return;
    _.trainT = 0;
    if (p.stats.stamina < 12) {
      this.toast('Too gassed. Take a breather.', 'warn');
      this.leaveSpot(p);
      return;
    }
    p.stats.stamina -= 14;
    const gain = (stat, base) => {
      const g = base * (1 - p.stats[stat] / 125);
      p.stats[stat] = clamp(p.stats[stat] + g, 0, 100);
      p.lastUse[stat] = this.s.t;
      return g;
    };
    p.stats.thirst = clamp(p.stats.thirst - 1.2, 0, 100);
    if (p.act === 'range') {
      const h = p.hands && this.s.items[p.hands];
      const rs = this.roomState(p.room);
      const paid = rs.rangeUntil && rs.rangeUntil > this.s.t;
      if (!h || h.def !== 'pistol') {
        this.toast('You need a pistol in your hands.', 'warn');
        this.leaveSpot(p);
        return;
      }
      if (!paid && (h.ammo || 0) < 2) {
        this.toast('Out of rounds. Buy range time or ammo at the counter.', 'warn');
        this.leaveSpot(p);
        return;
      }
      if (!paid) h.ammo -= 2;
      p.stats.stamina += 10;
      const g = gain('aim', 0.35);
      this.emit('float', { room: p.room, x: p.x, y: p.y - 60, text: `+${g.toFixed(2)} AIM`, color: '#cfe3ff' });
      this.emit('muzzle', { room: p.room, x: p.x, y: p.y - 30, dir: 'up' });
      this.sfx('shot', p);
      return;
    }
    if (p.act === 'lift') {
      const g = gain('strength', 0.32);
      this.emit('float', { room: p.room, x: p.x, y: p.y - 60, text: `+${g.toFixed(2)} STR`, color: '#ffd23f' });
    } else if (p.act === 'run') {
      const g = gain('agility', 0.3);
      this.emit('float', { room: p.room, x: p.x, y: p.y - 60, text: `+${g.toFixed(2)} AGI`, color: '#7fe0a8' });
    } else if (p.act === 'bag') {
      const g1 = gain('strength', 0.16);
      gain('agility', 0.14);
      this.emit('float', { room: p.room, x: p.x, y: p.y - 60, text: `+${g1.toFixed(2)} STR/AGI`, color: '#ffb36b' });
      this.sfx('punch', p);
    }
    p.stats.mind = clamp(p.stats.mind + 0.6, 0, 100);
  }

  startTask(a, task) {
    const _ = scratch(a);
    _.task = { ...task, t: 0 };
  }

  updateTasks(dt) {
    const p = this.player;
    const _ = scratch(p);
    if (!_.task) return;
    _.task.t += dt;
    if (_.task.t >= _.task.dur) {
      const t = _.task;
      _.task = null;
      if (t.kind === 'read') items.finishRead(this, p, t.item);
      else if (t.kind === 'shift') this.work.advance();
    }
  }

  // ------------------------------------------------------------ interaction
  // What pressing interact would do right now (also drives the prompt).
  target() {
    const p = this.player;
    if (p.downUntil || this.s.sleepUntil) return null;
    if (p.car) {
      // behind the wheel: a pump if you're stopped at one, else the door
      const car = this.s.cars[p.car];
      if (car && this.cars.speed(car) < 25) {
        const pump = this.world.room(car.room).props.find((q) => q.use === 'fuel' && rectDist(q, car.x, car.y) < 70);
        if (pump) return { type: 'pump', id: pump.id, label: 'Pump gas' };
      }
      return { type: 'car', id: p.car, label: 'Get out' };
    }
    const [fx, fy] = FACE_VEC[p.face];
    let best = null;
    let bs = Infinity;
    const consider = (score, t) => {
      if (score < bs) {
        bs = score;
        best = t;
      }
    };
    // a car door, or the trunk
    const trunk = this.cars.nearTrunk(p.room, p.x, p.y, 30);
    if (trunk && this.cars.hasKeys(trunk) && !trunk.job) consider(12, { type: 'trunk', id: trunk.id, label: 'Open trunk' });
    const car = this.cars.nearDoor(p.room, p.x, p.y, 34);
    if (car) consider(10, { type: 'car', id: car.id, label: this.cars.hasKeys(car) ? `Get in · ${MODELS[car.model].name}` : car.owner === 'p' ? 'Your car (no keys on you)' : 'Locked car' });
    // loose items under you
    for (const u of this.roomState(p.room).items) {
      const it = this.s.items[u];
      const d = Math.hypot(it.x - p.x, it.y - p.y);
      if (d < 30) consider(d - 12, { type: 'item', uid: u, label: `Pick up ${items.itemName(it)}` });
    }
    // people (staff can be reached across their counter)
    for (const id in this.s.actors) {
      const a = this.s.actors[id];
      if (a === p || a.room !== p.room || !a.loaded || a.downUntil) continue;
      const dx = a.x - p.x;
      const dy = a.y - p.y;
      const d = Math.hypot(dx, dy);
      const reach = a.act === 'work' && a.staffOf === a.room ? 92 : 54;
      if (d > reach) continue;
      const dot = d > 0 ? (dx * fx + dy * fy) / d : 1;
      if (dot < 0.1 && d > 22) continue;
      consider(d * 0.6 - dot * 18, { type: 'npc', id, label: a.short });
    }
    // shift tasks marked on the floor (spills, litter, a dropped plate)
    const task = this.work.currentTask();
    if (task && task.x !== undefined && task.room === p.room) {
      const d = Math.hypot(task.x - p.x, task.y - p.y);
      if (d < 40) consider(d - 15, { type: 'task', label: task.label });
    }
    // props
    const r = this.world.room(p.room);
    for (const prop of r.props) {
      const isTaskProp = task && task.room === p.room && task.prop === prop.id;
      if (!prop.use && !isTaskProp) continue;
      if (prop.use === 'job' && !isTaskProp) continue;
      if (p.spot && p.spot.prop === prop.id) continue;
      const d = rectDist(prop, p.x, p.y);
      const lim = prop.wall ? 30 : 26;
      if (d > lim) continue;
      const cx = prop.x + prop.w / 2;
      const cy = prop.y + prop.h / 2;
      const dx = cx - p.x;
      const dy = cy - p.y;
      const dd = Math.hypot(dx, dy) || 1;
      const dot = (dx * fx + dy * fy) / dd;
      consider(d + 8 - dot * 6 + (prop.use === 'sit' && !isTaskProp ? 26 : 0) - (isTaskProp ? 20 : 0), { type: 'prop', id: prop.id, label: this.propLabel(prop) });
    }
    return best;
  }

  propLabel(prop) {
    const task = this.work.currentTask();
    if (task && task.room === this.player.room && task.prop === prop.id) return task.label;
    switch (prop.use) {
      case 'sleep': return 'Sleep';
      case 'sit': return `Sit · ${prop.label}`;
      case 'buy': return 'Order at the counter';
      case 'radio': return this.roomState(this.player.room).radio ? 'Turn off radio' : 'Turn on radio';
      case 'tv': return this.roomState(this.player.room).tv ? 'Turn off TV' : 'Turn on TV';
      case 'sink': return 'Drink from the sink';
      case 'fountain': return 'Drink';
      case 'fridge': case 'stash': return `Open ${prop.label.toLowerCase()}`;
      case 'lift': return `Lift · ${prop.label}`;
      case 'run': return 'Run on the treadmill';
      case 'bag': return 'Hit the heavy bag';
      case 'jukebox': return 'Jukebox ($1)';
      case 'posting': return `Read: ${prop.label}`;
      case 'desk': return 'Front desk';
      case 'rent': return `Rent drop box`;
      case 'bank': return 'Teller window';
      case 'atm': return 'Use the ATM';
      case 'clinic': return 'Reception';
      case 'vending': return 'Vending machine';
      case 'police': return 'Front desk';
      case 'license': return 'Permits window';
      case 'terminal': return 'Market terminal';
      case 'job': return prop.label;
      default: return prop.label || prop.use;
    }
  }

  interact() {
    const t = this.target();
    if (!t) return;
    const p = this.player;
    if (t.type === 'item') {
      const it = this.s.items[t.uid];
      if (it) items.pickUp(this, p, it);
    } else if (t.type === 'npc') {
      const npc = this.s.actors[t.id];
      faceToward(p, npc.x, npc.y);
      this.ui.menu = { npc: t.id, actions: this.npcActions(npc) };
    } else if (t.type === 'task') {
      this.work.shiftInteract(null, p.x, p.y);
    } else if (t.type === 'prop') {
      this.useProp(this.world.prop(p.room, t.id));
    } else if (t.type === 'car') {
      this.cars.enter(this.s.cars[t.id]);
    } else if (t.type === 'trunk') {
      const car = this.s.cars[t.id];
      const cid = this.cars.trunk(car);
      this.ui.modal = { type: 'cont', cont: cid, label: `Trunk · ${car.plate}` };
      this.sfx('door');
    }
  }

  npcActions(npc) {
    const p = this.player;
    const acts = [{ id: 'talk', label: 'Talk' }];
    const h = p.hands && this.s.items[p.hands];
    if (h) acts.push({ id: 'give', label: `Give ${items.itemName(h)}` });
    if (Object.values(JOBS).some((j) => j.boss === npc.id)) acts.push({ id: 'work', label: 'Ask for work' });
    const shop = this.shopFor(npc);
    if (shop) acts.push({ id: 'buy', label: 'Buy' });
    if (npc.sells || npc.personality === 'sly') acts.push({ id: 'trade', label: 'Trade' });
    if (npc.landlord) acts.push({ id: 'rent', label: 'Pay rent' });
    if (npc.staffOf === 'bank' && this.onDuty(npc)) acts.push({ id: 'banking', label: 'Banking' });
    if (npc.staffOf === 'precinct' && this.onDuty(npc)) acts.push({ id: 'desk', label: 'Fines & paperwork' });
    for (const cid in CREWS) {
      if (CREWS[cid].leader !== npc.id) continue;
      if (p.crew === cid) acts.push({ id: 'crewleave', label: `Leave the ${CREWS[cid].name}` });
      else if (!p.crew) acts.push({ id: 'crewjoin', label: `Ask to join the ${CREWS[cid].name}` });
    }
    if (npc.buyer || npc.id === 'javi') {
      const held = [...items.contItems(this, p.pockets), p.hands && this.s.items[p.hands]].filter(Boolean);
      if (held.some((it) => it.def === 'bloom') && npc.buyer) acts.push({ id: 'sellbloom', label: 'Sell bayou bloom' });
      if (held.some((it) => it.def === 'coin')) acts.push({ id: 'sellcoin', label: 'Sell BayouCoin' });
    }
    const col = this.s.favors.find((f) => f.status === 'active' && f.giver === npc.id && f.collected);
    if (col) acts.push({ id: 'collectpay', label: `Hand over $${FAVORS[col.id].amount}` });
    const prop = this.propBehind(npc);
    if (prop) acts.push({ id: 'useprop', label: this.propLabel(prop), prop: prop.id });
    acts.push({ id: 'threaten', label: 'Threaten' });
    acts.push({ id: 'swing', label: 'Swing' });
    return acts;
  }

  onDuty(npc) {
    return !!npc.staffOf && npc.room === npc.staffOf && npc.loaded && !npc.downUntil && !npc.fightWith && schedNow(npc, this.s.t).act === 'work';
  }

  shopFor(npc) {
    if (this.onDuty(npc)) {
      const k = Object.keys(SHOPS).find((s) => SHOPS[s].place === npc.room);
      if (k) return k;
    }
    return null;
  }

  propBehind(npc) {
    const r = this.world.room(npc.room);
    let best = null;
    let bd = 46;
    for (const prop of r.props) {
      if (!prop.use || ['buy', 'posting', 'job', 'bank', 'clinic', 'police', 'license', 'rent'].includes(prop.use)) continue;
      if (npc.spot && npc.spot.prop === prop.id) continue;
      const d = rectDist(prop, npc.x, npc.y);
      if (d < bd) {
        bd = d;
        best = prop;
      }
    }
    return best;
  }

  useHands() {
    const p = this.player;
    const it = this.s.items[p.hands];
    if (!it) return;
    if (it.job || it.favor) {
      this.toast("That's not yours to use — it's for somebody.", 'warn');
      return;
    }
    if (ITEMS[it.def].kind === 'phone') {
      this.ui.modal = { type: 'phone' };
      return;
    }
    if (!items.useItem(this, p, it)) this.toast(`Can't use the ${ITEMS[it.def].name.toLowerCase()} like that.`, 'warn');
  }

  staffHere(room) {
    return Object.values(this.s.actors).find((a) => a.staffOf === room && this.onDuty(a)) || null;
  }

  useProp(prop) {
    const p = this.player;
    if (!prop) return;
    // shift work takes priority
    if (this.work.onShift() && this.work.shiftInteract(prop.id, p.x, p.y)) return;
    const rs = this.roomState(p.room);
    switch (prop.use) {
      case 'sleep': {
        this.ui.modal = { type: 'sleep', prop: prop.id };
        break;
      }
      case 'sit': case 'lift': case 'run': case 'bag': {
        const i = (prop.spots || []).findIndex((sp, k) => !this.spotTaken(p.room, prop.id, k, 'p'));
        if (i < 0) {
          this.toast('Somebody\'s using that.', 'warn');
          return;
        }
        if (prop.use !== 'sit' && p.hands && ITEMS[this.s.items[p.hands].def].handsOnly) {
          this.toast('Put down what you\'re holding first.', 'warn');
          return;
        }
        this.enterSpot(p, prop, i, prop.use);
        if (prop.use === 'lift' || prop.use === 'run' || prop.use === 'bag') this.toast('Training. Move to stop.', '');
        break;
      }
      case 'buy': {
        const staff = Object.values(this.s.actors).find((a) => a.staffOf === p.room && this.onDuty(a));
        if (!staff) {
          this.toast('Nobody\'s behind the counter.', 'warn');
          return;
        }
        const k = Object.keys(SHOPS).find((s) => SHOPS[s].place === p.room);
        this.ui.modal = { type: 'shop', shop: k, npc: staff.id };
        break;
      }
      case 'radio': {
        rs.radio = !rs.radio;
        this.sfx('click');
        this.toast(rs.radio ? 'Radio on: KBYU 97.3, slow and low.' : 'Radio off.', '');
        if (rs.radio) this.work.noise(p.room, p.x, p.y, 'Your radio carries through the wall.');
        break;
      }
      case 'tv': {
        rs.tv = !rs.tv;
        this.sfx('click');
        break;
      }
      case 'sink': case 'fountain': {
        p.stats.thirst = clamp(p.stats.thirst + 30, 0, 100);
        this.sfx('drink');
        this.toast('You drink some water.', '');
        break;
      }
      case 'fridge': case 'stash': {
        this.ui.modal = { type: 'cont', cont: `${p.room}:${prop.cont}`, label: prop.label };
        break;
      }
      case 'jukebox': {
        if (!items.spendCash(this, p, 1)) {
          this.toast('You need a dollar.', 'warn');
          return;
        }
        rs.music = this.s.t + 40;
        this.sfx('coin');
        this.toast('The jukebox kicks on.', '');
        break;
      }
      case 'posting': {
        this.ui.modal = { type: 'posting', job: prop.job };
        break;
      }
      case 'desk': {
        const staff = Object.values(this.s.actors).find((a) => a.staffOf === p.room && a.room === p.room && a.loaded);
        if (!staff) {
          // self-serve cooler for now
          this.ui.modal = { type: 'shop', shop: 'gymdesk', npc: null };
        } else this.ui.modal = { type: 'shop', shop: 'gymdesk', npc: staff.id };
        break;
      }
      case 'job': {
        this.toast('That\'s for staff on shift.', 'warn');
        break;
      }
      case 'rent': {
        this.ui.modal = { type: 'rent', lease: 'apt_2b' };
        break;
      }
      case 'bank': {
        const staff = this.staffHere(p.room);
        if (!staff) {
          this.toast('The window is closed. Try the ATM next door.', 'warn');
          return;
        }
        this.ui.modal = { type: 'bank', where: 'teller', npc: staff.id };
        break;
      }
      case 'atm': {
        this.ui.modal = { type: 'bank', where: 'atm', card: true };
        this.sfx('card');
        break;
      }
      case 'clinic': {
        const staff = this.staffHere(p.room);
        if (!staff) {
          this.toast('Nobody at reception.', 'warn');
          return;
        }
        this.ui.modal = { type: 'shop', shop: 'clinic', npc: staff.id };
        break;
      }
      case 'vending': {
        this.ui.modal = { type: 'shop', shop: 'vending', npc: null };
        break;
      }
      case 'police': {
        const staff = this.staffHere(p.room);
        if (!staff) {
          this.toast('Nobody at the desk.', 'warn');
          return;
        }
        this.ui.modal = { type: 'police', npc: staff.id };
        break;
      }
      case 'license': {
        this.ui.modal = { type: 'license' };
        break;
      }
      case 'garage': {
        const staff = this.staffHere(p.room);
        if (!staff) return this.toast('Nobody at the counter.', 'warn');
        this.ui.modal = { type: 'garage', npc: staff.id };
        break;
      }
      case 'stall': {
        this.ui.modal = { type: 'garage', npc: null, stall: true };
        break;
      }
      case 'dealer': {
        const staff = this.staffHere(p.room);
        if (!staff) return this.toast('Nobody at the desk.', 'warn');
        this.ui.modal = { type: 'dealer', npc: staff.id };
        break;
      }
      case 'terminal': {
        this.ui.modal = { type: 'terminal' };
        break;
      }
      case 'freecoffee': {
        p.stats.thirst = clamp(p.stats.thirst + 18, 0, 100);
        p.stats.mind = clamp(p.stats.mind + 4, 0, 100);
        this.sfx('drink');
        this.toast('Free staff coffee. Perks of the job.', 'good');
        break;
      }
      case 'dance': {
        if (p.hands && ITEMS[this.s.items[p.hands].def].handsOnly) return this.toast('Put that down first.', 'warn');
        p.act = 'dance';
        scratch(p).danceT = 0;
        this.toast('Dancing. Move to stop.', '');
        break;
      }
      case 'range': {
        const i = (prop.spots || []).findIndex((sp, k) => !this.spotTaken(p.room, prop.id, k, 'p'));
        if (i < 0) return this.toast('Lane taken.', 'warn');
        const h = p.hands && this.s.items[p.hands];
        if (!h || h.def !== 'pistol') return this.toast('Bring your own pistol. Dale sells them — with a permit.', 'warn');
        this.enterSpot(p, prop, i, 'range');
        p.act = 'range';
        this.toast('On the line. Ears on. Move to step back.', '');
        break;
      }
      case 'grow': {
        this.ui.modal = { type: 'grow', prop: prop.id };
        break;
      }
      case 'miner': {
        this.cmdResult(this.economy.collect(p.room, prop.furn));
        break;
      }
      case 'pawn': {
        const staff = this.staffHere(p.room);
        if (!staff) return this.toast('Nobody at the counter.', 'warn');
        this.ui.modal = { type: 'pawn', npc: staff.id, tab: 'furniture' };
        break;
      }
      default:
        break;
    }
  }

  // ------------------------------------------------------------ commands from the UI
  cmd(name, a = {}) {
    const p = this.player;
    switch (name) {
      case 'menu_close': this.ui.menu = null; return;
      case 'modal_close': this.ui.modal = null; return;
      case 'npc_action': return this.npcAction(a.id, a.action, a);
      case 'talk_tone': talk.chooseTone(this, a.tone); return;
      case 'talk_close': talk.closeTalk(this); return;
      case 'buy': return this.buy(a.shop, a.item, a.npc);
      case 'sell': return this.sellToNpc(a.npc, a.uid);
      case 'pin': return pin(this, a.id, a.n);
      case 'unpin': return unpin(this, a.i);
      case 'deposit': return this.cmdResult(this.money.deposit(a.amt, a.where));
      case 'withdraw': return this.cmdResult(this.money.withdraw(a.amt, a.where));
      case 'pay_rent': return this.cmdResult(this.money.payRent(a.lease || 'apt_2b'));
      case 'pay_fines': return this.cmdResult(this.money.payFines());
      case 'pay_bills': return this.cmdResult(this.money.payBills());
      case 'service': return this.service(a.shop, a.id, a.npc);
      case 'test_start': {
        const r = this.licenses.start(a.id);
        if (r && !r.ok) this.toast(r.text, 'warn');
        return r;
      }
      case 'test_answer': return this.licenses.answer(a.choice);
      case 'refuel': {
        const car = this.s.cars[a.car];
        return car ? this.cmdResult(this.cars.refuel(car)) : null;
      }
      case 'repair': {
        const car = this.s.cars[a.car];
        return car ? this.cmdResult(this.cars.repair(car)) : null;
      }
      case 'buy_car': return this.cmdResult(this.cars.buy(a.model, a.color));
      case 'stall_lease': return this.cmdResult(this.money.startLease('stall'));
      case 'stall_store': return this.cmdResult(this.storeCar(a.car));
      case 'stall_take': return this.cmdResult(this.takeCar());
      case 'lease_start': {
        const r = this.money.startLease(a.id);
        this.cmdResult(r);
        if (r.ok) this.ui.modal = null;
        return r;
      }
      case 'crew_join': return this.cmdResult(this.crews.join(a.crew));
      case 'crew_leave': return this.cmdResult(this.crews.leave());
      case 'grow_plant': return this.cmdResult(this.economy.plant(p.room, a.prop));
      case 'grow_water': return this.cmdResult(this.economy.water(p.room, a.prop));
      case 'grow_harvest': return this.cmdResult(this.economy.harvest(p.room, a.prop));
      case 'coins_sell': return this.cmdResult(this.economy.sellCoinsTerminal());
      case 'buyer_sell': return this.cmdResult(this.economy.sellToBuyer(this.s.actors[a.npc], a.what));
      case 'buy_furn': return this.cmdResult(this.furniture.buy(a.type, a.room));
      case 'furn_pickup': return this.cmdResult(this.furniture.pickup(p.room, a.uid));
      case 'arrange_start': {
        const f = this.furniture.list(p.room).find((q) => q.uid === a.uid);
        if (!f) return;
        if (f.placed) {
          const r = this.furniture.pickup(p.room, a.uid);
          if (!r.ok) return this.cmdResult(r);
        }
        const F = FURNITURE[f.type];
        const [fx, fy] = FACE_VEC[p.face];
        this.ui.modal = null;
        this.ui.arrange = { uid: a.uid, type: f.type, w: F.w, h: F.h, x: p.x + fx * 60 - F.w / 2, y: p.y + fy * 50 - F.h / 2, ok: false };
        this.toast('Move it with WASD / the stick. E to place, Space to cancel.', '');
        return;
      }
      case 'arrange_cancel': this.ui.arrange = null; return;
      case 'collect_deliver': return this.cmdResult(this.deliverCollect(a.npc));
      case 'call': return this.cmdResult(this.call(a.id));
      case 'pawn_sell': return this.cmdResult(this.pawnSell(a.npc, a.uid));
      case 'pawn_buy': return this.cmdResult(this.pawnBuy(a.npc, a.item));
      case 'sleep': return this.sleep(a.hours);
      case 'apply': {
        const r = this.work.apply(a.job);
        this.toast(r.text, r.ok ? 'good' : 'warn');
        return r;
      }
      case 'move_item': return this.moveItem(a);
      case 'use_item': {
        const it = this.s.items[a.uid];
        if (!it) return;
        if (it.job || it.favor) return this.toast("That's not yours to use — it's for somebody.", 'warn');
        if (ITEMS[it.def].kind === 'phone') {
          this.ui.modal = { type: 'phone' };
          return;
        }
        if (!items.useItem(this, p, it)) this.toast("Can't use that here.", 'warn');
        return;
      }
      case 'drop_item': {
        const it = this.s.items[a.uid];
        if (!it) return;
        items.placeGround(this, it, p.room, p.x + this.rng.range(-10, 10), p.y + 10);
        it.owner = 'p';
        this.sfx('drop');
        return;
      }
      default: return;
    }
  }

  moveItem({ uid, to, gx, gy, rot }) {
    const p = this.player;
    const it = this.s.items[uid];
    if (!it) return false;
    // only touch containers you can reach: your pockets/hands, or the open modal
    const reach = [p.pockets];
    if (this.ui.modal && this.ui.modal.type === 'cont') reach.push(this.ui.modal.cont);
    const from = it.where === 'cont' ? it.cont : it.where === 'hands' && it.actor === 'p' ? 'hands' : null;
    if (!from || (from !== 'hands' && !reach.includes(from))) return false;
    if (to === 'hands') {
      if (p.hands && p.hands !== uid) {
        // swap: held item goes where this one was
        const held = this.s.items[p.hands];
        const prev = from === 'hands' ? null : { cont: it.cont, gx: it.gx, gy: it.gy, rot: it.rot };
        items.detach(this, it);
        items.detach(this, held);
        items.putInHands(this, p, it);
        if (prev && !items.putInCont(this, held, prev.cont, prev)) {
          if (!items.putInCont(this, held, prev.cont)) items.placeGround(this, held, p.room, p.x, p.y + 10);
        }
        return true;
      }
      return items.putInHands(this, p, it);
    }
    if (to === 'ground') {
      items.placeGround(this, it, p.room, p.x + this.rng.range(-10, 10), p.y + 10);
      it.owner = 'p';
      return true;
    }
    if (!reach.includes(to)) return false;
    if (ITEMS[it.def].handsOnly && to === p.pockets) {
      this.toast(`The ${ITEMS[it.def].name.toLowerCase()} won't fit in a pocket.`, 'warn');
      return false;
    }
    const at = gx !== undefined ? { gx, gy, rot: rot ? 1 : 0 } : null;
    if (at && !items.fitsAt(this, this.s.conts[to], it, at.gx, at.gy, at.rot, uid)) {
      // stacking cash onto cash is fine
      if (ITEMS[it.def].stack) return items.putInCont(this, it, to);
      return false;
    }
    return items.putInCont(this, it, to, at);
  }

  npcAction(id, action, a) {
    const p = this.player;
    const npc = this.s.actors[id];
    this.ui.menu = null;
    if (!npc || npc.room !== p.room) return;
    switch (action) {
      case 'talk':
        talk.openTalk(this, id);
        return;
      case 'give': return this.give(npc, a.amount);
      case 'work': {
        const r = this.work.askForWork(npc);
        this.sayText(npc, r.text);
        if (!r.ok) this.toast(r.text, 'warn');
        return;
      }
      case 'buy': {
        const shop = this.shopFor(npc);
        if (shop) this.ui.modal = { type: 'shop', shop, npc: id };
        return;
      }
      case 'trade':
        this.ui.modal = { type: 'trade', npc: id };
        return;
      case 'rent':
        this.ui.modal = { type: 'rent', lease: npc.landlord, npc: id };
        return;
      case 'banking':
        this.ui.modal = { type: 'bank', where: 'teller', npc: id };
        return;
      case 'desk':
        this.ui.modal = { type: 'police', npc: id };
        return;
      case 'crewjoin': {
        const cid = Object.keys(CREWS).find((k) => CREWS[k].leader === id);
        const r = this.crews.join(cid);
        this.sayText(npc, r.text);
        return r;
      }
      case 'crewleave': {
        const r = this.crews.leave();
        this.sayText(npc, r.ok ? 'Then get gone.' : r.text);
        return r;
      }
      case 'sellbloom': return this.cmdResult(this.economy.sellToBuyer(npc, 'bloom'));
      case 'sellcoin': return this.cmdResult(this.economy.sellToBuyer(npc, 'coin'));
      case 'collectpay': return this.cmdResult(this.deliverCollect(id));
      case 'useprop': {
        const prop = this.world.prop(p.room, a.prop);
        this.useProp(prop);
        return;
      }
      case 'threaten': return this.threaten(npc);
      case 'swing': {
        faceToward(p, npc.x, npc.y);
        this.fight.strike(p);
        return;
      }
      default: return;
    }
  }

  give(npc, amount) {
    const p = this.player;
    const it = p.hands && this.s.items[p.hands];
    if (!it) return;
    const d = ITEMS[it.def];
    // favor delivery?
    const thanks = this.work.tryDeliver(npc, it);
    if (thanks) {
      this.sayText(npc, thanks);
      return;
    }
    if (it.order) {
      this.toast('That order is for a table.', 'warn');
      return;
    }
    if (d.kind === 'cash' && this.s.favors.some((f) => f.status === 'active' && f.giver === npc.id && f.collected)) {
      return this.cmdResult(this.deliverCollect(npc.id));
    }
    if (d.kind === 'cash') {
      const amt = Math.min(it.n, amount || it.n);
      it.n -= amt;
      if (it.n <= 0) items.destroy(this, it);
      npc.cash += amt;
      const dv = clamp(amt / 3, 1, 15);
      adjustRel(this, npc, 'p', dv);
      remember(this, npc, { type: 'paid', who: 'p', amt });
      this.sayText(npc, amt >= 20 ? 'For real? Thank you.' : 'Appreciate it.');
      this.log(`Gave ${npc.short} $${amt}.`);
      return;
    }
    items.giveNpc(this, npc, it);
    let dv = 2 + Math.min(8, (d.value || 0) / 3);
    if ((d.kind === 'food' && npc.stats.hunger < 50) || (d.kind === 'drink' && npc.stats.thirst < 50)) dv += 5;
    if (d.kind === 'weapon' && npc.personality !== 'sly') dv -= 3;
    adjustRel(this, npc, 'p', dv);
    remember(this, npc, { type: 'gave', who: 'p', item: it.def });
    this.sayText(npc, dv > 5 ? 'Oh, thank you!' : 'Uh, thanks.');
    this.log(`Gave ${npc.short} the ${d.name.toLowerCase()}.`);
  }

  threaten(npc) {
    const p = this.player;
    const o = talk.odds(this, npc, 'hard') + (p.hands && ITEMS[this.s.items[p.hands].def].visible ? 0.2 : 0);
    faceToward(p, npc.x, npc.y);
    if (npc.police) {
      this.sayText(npc, 'Are you threatening an officer? Walk away.');
      this.addHeat(10, 'threatened a cop');
      return;
    }
    remember(this, npc, { type: 'threatened', who: 'p' });
    adjustRel(this, npc, 'p', -14);
    for (const w of witnesses(this, npc.room, npc.x, npc.y, [npc.id])) adjustRel(this, w, 'p', -3);
    if (this.policeIn(npc.room)) this.addHeat(5, 'threatened someone in front of a cop');
    if (this.rng.chance(o)) {
      // they back down; anything they took from you comes back
      const mine = npc.inv.map((u) => this.s.items[u]).filter((i) => i && i.lastOwner === 'p');
      const cash = Math.min(npc.took || 0, npc.cash);
      this.repChange(1, 'backed someone down', npc.room);
      if (mine.length || cash > 0) {
        for (const i of mine) {
          items.placeGround(this, i, npc.room, npc.x + this.rng.range(-10, 10), npc.y + 14);
          i.owner = 'p';
        }
        if (cash > 0) {
          npc.cash -= cash;
          npc.took = 0;
          items.placeGround(this, items.newItem(this, 'cash', { n: cash, owner: 'p' }), npc.room, npc.x, npc.y + 16);
        }
        this.sayText(npc, 'Okay! Okay. Take it.');
      } else {
        this.say(npc, 'flee');
        this.fight.flee(npc, p);
      }
    } else {
      const P = npc.personality;
      this.sayText(npc, P === 'tired' ? 'Leave me alone!' : 'You don\'t scare me.');
      if (relV(npc, 'p') < -20 && this.rng.chance(0.5)) this.fight.squareUp(npc, p, true);
    }
  }

  // Cars parked on the apron in front of Lone Star Auto can go in the stall.
  apronCar() {
    return this.cars.near('st_canal_w', 240, 470, 230);
  }

  storeCar(id) {
    const car = this.s.cars[id];
    const L = this.s.leases.stall;
    if (!L) return { ok: false, text: 'You don\'t lease a stall.' };
    if (L.overdue) return { ok: false, text: 'Stall rent is overdue.' };
    if (Object.values(this.s.cars).some((c) => c.stored === 'stall')) return { ok: false, text: 'The stall already has a car in it.' };
    if (!car || car.owner !== 'p') return { ok: false, text: 'Park your car on the apron out front first.' };
    if (this.player.car === car.id) return { ok: false, text: 'Get out of the car first.' };
    car.stored = 'stall';
    car.vx = car.vy = 0;
    this.log(`Your ${MODELS[car.model].name} is in Stall 3.`);
    this.wantSave = true;
    return { ok: true, text: 'Stored in Stall 3.' };
  }

  takeCar() {
    const L = this.s.leases.stall;
    const car = Object.values(this.s.cars).find((c) => c.stored === 'stall');
    if (!car) return { ok: false, text: 'The stall is empty.' };
    if (L && L.overdue) return { ok: false, text: 'Stall rent is overdue. Earl won\'t open it.' };
    const sp = ROOMS.st_canal_w.carSpawn.stall;
    car.stored = null;
    car.room = 'st_canal_w';
    car.x = sp.x;
    car.y = sp.y;
    car.rot = sp.rot;
    car.vx = car.vy = 0;
    this.log('Earl rolls your car out onto the apron.');
    this.wantSave = true;
    return { ok: true, text: 'Your car is out front.' };
  }

  // A phone call: a normal conversation, once a day per person.
  call(id) {
    const npc = this.s.actors[id];
    if (!npc) return { ok: false, text: 'No answer.' };
    const day = Math.floor(this.s.t / DAY);
    this.s.flags.calls = this.s.flags.calls || {};
    if (this.s.flags.calls[id] === day) return { ok: false, text: `You already talked to ${npc.short} today.` };
    if (npc.act === 'sleep' || npc.downUntil) return { ok: false, text: 'Straight to voicemail.' };
    this.s.flags.calls[id] = day;
    adjustRel(this, npc, 'p', 3);
    this.player.stats.mind = clamp(this.player.stats.mind + 5, 0, 100);
    const pair = CHAT[Math.floor(this.rng.next() * CHAT.length)];
    this.log(`You call ${npc.short}. "${pair[0]}" — "${pair[1]}" Good to hear a friendly voice.`, 'good');
    this.sfx('tick');
    return { ok: true, text: `Talked to ${npc.short}.` };
  }

  dance(p, dt) {
    const _ = scratch(p);
    _.danceT = (_.danceT || 0) + dt;
    if (_.danceT < 3) return;
    _.danceT = 0;
    p.stats.mind = clamp(p.stats.mind + 1.6, 0, 100);
    p.stats.stamina = Math.max(0, p.stats.stamina - 4);
    for (const id in this.s.actors) {
      const a = this.s.actors[id];
      if (a.kind === 'npc' && a.room === p.room && a.act === 'dance' && Math.hypot(a.x - p.x, a.y - p.y) < 120) {
        adjustRel(this, a, 'p', 0.8);
        meet(a, 'p');
      }
    }
  }

  // King's collection: Javi paid you; now hand it over.
  deliverCollect(npcId) {
    const rec = this.s.favors.find((f) => f.status === 'active' && f.giver === npcId && f.collected);
    if (!rec) return { ok: false, text: 'Nothing to hand over.' };
    const F = FAVORS[rec.id];
    if (!items.spendCash(this, this.player, F.amount)) return { ok: false, text: `You need $${F.amount} on you. Spent it already?` };
    const npc = this.s.actors[npcId];
    npc.cash += F.amount;
    return this.work.completeFavor(rec, npc, 'paid');
  }

  pawnSell(npcId, uid) {
    const p = this.player;
    const it = this.s.items[uid];
    if (!it || it.job || it.favor) return { ok: false, text: "Sal won't touch that." };
    const d = ITEMS[it.def];
    if (d.kind === 'cash' || d.kind === 'coin') return { ok: false, text: "That's money, genius." };
    const offer = Math.max(1, Math.round((d.value || 1) * (it.def === 'bloom' ? 0.3 : 0.4)));
    const npc = this.s.actors[npcId];
    if (npc.cash < offer) return { ok: false, text: "I'm short today." };
    items.giveNpc(this, npc, it);
    npc.cash -= offer;
    items.addCash(this, p, offer);
    this.sfx('cash');
    this.log(`Pawned the ${d.name.toLowerCase()} for $${offer}.`);
    return { ok: true, text: `$${offer}.` };
  }

  pawnBuy(npcId, itemId) {
    const stock = { flashlight: 10, phone: 35, bat: 20, medkit: 24, book: 3, wrench: 8 };
    const price = stock[itemId];
    if (price === undefined) return { ok: false, text: 'Not in stock.' };
    const p = this.player;
    if (items.cashOnBody(this, p) < price) return { ok: false, text: `$${price}.` };
    const it = items.newItem(this, itemId);
    if (!items.receive(this, p, it)) {
      items.destroy(this, it);
      return { ok: false, text: 'No room on you.' };
    }
    items.spendCash(this, p, price);
    it.owner = 'p';
    const npc = this.s.actors[npcId];
    if (npc) npc.cash += price;
    this.sfx('cash');
    return { ok: true, text: `Bought a ${ITEMS[itemId].name.toLowerCase()}.` };
  }

  cmdResult(r) {
    if (r && r.text) this.toast(r.text, r.ok ? 'good' : 'warn');
    return r;
  }

  service(shopId, id, npcId) {
    const p = this.player;
    const shop = SHOPS[shopId];
    const sv = shop && (shop.services || []).find((x) => x.id === id);
    if (!sv) return;
    if (id === 'range') {
      if (!items.spendCash(this, p, sv.price)) return this.cmdResult({ ok: false, text: `Range time is $${sv.price}.` });
      this.roomState(p.room).rangeUntil = this.s.t + 30;
      this.ui.modal = null;
      this.sfx('cash');
      return this.cmdResult({ ok: true, text: 'Lane rounds are on the house for thirty minutes.' });
    }
    if (id === 'treat') {
      if (p.stats.health >= 98) return this.cmdResult({ ok: false, text: "You're fine. Go home." });
      if (!items.spendCash(this, p, sv.price)) return this.cmdResult({ ok: false, text: `Treatment is $${sv.price}.` });
      this.ui.modal = null;
      this.s.t += 60;
      this.ai.abstract(60);
      p.stats.health = 100;
      p.stats.mind = clamp(p.stats.mind + 6, 0, 100);
      const n = npcId && this.s.actors[npcId];
      if (n) adjustRel(this, n, 'p', 2);
      this.emit('respawn', {});
      this.sfx('cash');
      this.log(`${n ? n.short : 'A nurse'} cleans you up. An hour later you walk out feeling human. (-$${sv.price})`, 'good');
    }
  }

  buy(shopId, itemId, npcId) {
    const p = this.player;
    const shop = SHOPS[shopId] || null;
    let price;
    if (shop) price = (shop.items.find((x) => x[0] === itemId) || [])[1];
    const npc = npcId ? this.s.actors[npcId] : null;
    if (!shop && npc && npc.sells) price = (npc.sells.find((x) => x[0] === itemId) || [])[1];
    if (price === undefined) return;
    const permit = shop && shop.permit && shop.permit[itemId];
    if (permit && !p.licenses[permit]) {
      this.toast('No permit, no sale. Permits window at the 5th Precinct.', 'warn');
      if (npc) this.sayText(npc, "Can't sell you that without a permit. State law.");
      return;
    }
    if (items.cashOnBody(this, p) < price) {
      this.toast(`You need $${price}.`, 'warn');
      return;
    }
    const it = items.newItem(this, itemId);
    if (itemId === 'ammo') it.n = (shop && shop.ammoPack) || 24;
    if (itemId === 'pistol') it.ammo = 0;
    const where = items.receive(this, p, it);
    if (!where) {
      items.destroy(this, it);
      this.toast('No room. Free up your hands or pockets.', 'warn');
      return;
    }
    items.spendCash(this, p, price);
    it.owner = 'p';
    if (npc) {
      npc.cash += price;
      adjustRel(this, npc, 'p', 0.5);
    }
    this.sfx('cash');
    this.log(`Bought ${ITEMS[itemId].name.toLowerCase()} for $${price}.`);
  }

  sellToNpc(npcId, uid) {
    const p = this.player;
    const npc = this.s.actors[npcId];
    const it = this.s.items[uid];
    if (!npc || !it) return;
    const d = ITEMS[it.def];
    const offer = Math.max(1, Math.round((d.value || 1) * 0.45));
    if (npc.cash < offer) {
      this.sayText(npc, "I'm tapped out.");
      return;
    }
    items.giveNpc(this, npc, it);
    npc.cash -= offer;
    items.addCash(this, p, offer);
    adjustRel(this, npc, 'p', 1);
    this.sfx('cash');
    this.log(`Sold the ${d.name.toLowerCase()} to ${npc.short} for $${offer}.`);
  }

  // ------------------------------------------------------------ sleep, down, respawn
  sleep(hours) {
    const p = this.player;
    const r = this.world.room(p.room);
    const bed = r.props.find((q) => q.use === 'sleep');
    if (!bed) return;
    if (this.work.onShift()) {
      this.toast('You\'re on the clock.', 'warn');
      return;
    }
    this.ui.modal = null;
    this.enterSpot(p, bed, 0, 'sleep');
    p.act = 'sleep';
    let until;
    if (hours === 'morning') {
      const m = tod(this.s.t);
      until = this.s.t - m + hm('06:30') + (m >= hm('06:30') ? DAY : 0);
    } else until = this.s.t + hours * 60;
    this.s.sleepUntil = until;
    this.emit('sleep', { until });
    this.log(`You lie down. (until ${clock12(until)})`);
  }

  wake(msg) {
    const p = this.player;
    this.s.sleepUntil = 0;
    p.awakeSince = this.s.t;
    if (p.spot) {
      const was = p.spot;
      this.leaveSpot(p);
    }
    p.act = 'idle';
    if (msg) this.log(`${msg} ${weekday(this.s.t)}, ${clock12(this.s.t)}.`);
    this.emit('wake', {});
    this.wantSave = true;
  }

  playerDown(by) {
    const p = this.player;
    if (p.downUntil) return;
    this.closeMenus();
    if (p.spot) this.leaveSpot(p);
    if (this.s.sleepUntil) this.s.sleepUntil = 0;
    p.downUntil = this.time + 3;
    p.act = 'down';
    p.fightWith = null;
    this.fight.stopAll(p.room);
    // everything you carry ends up on the floor where you fell
    const dropped = [];
    const all = [...this.s.conts[p.pockets].items];
    if (p.hands) all.push(p.hands);
    for (const u of all) {
      const it = this.s.items[u];
      if (!it) continue;
      if (it.order) {
        items.destroy(this, it);
        continue;
      }
      const a = this.rng.next() * Math.PI * 2;
      const r = 8 + this.rng.next() * 22;
      const pt = { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r * 0.6 };
      this.world.collide(p.room, pt, 4);
      items.placeGround(this, it, p.room, pt.x, pt.y);
      it.owner = 'p';
      it.lastOwner = 'p';
      dropped.push(items.itemName(it));
    }
    this.s.stats.knockouts++;
    this.s.flags.fellAt = { room: p.room, x: p.x, y: p.y, t: this.s.t, items: dropped };
    this.emit('down', { id: 'p', room: p.room });
    this.emit('shake', { amt: 14 });
    this.sfx('thud');
    this.log(by ? `${by.short} put you on the floor. Everything goes black.` : 'Everything goes black.', 'bad');
    if (this.work.onShift()) this.work.failShift('you got knocked out');
  }

  respawn() {
    const p = this.player;
    const fell = this.s.flags.fellAt;
    p.downUntil = 0;
    const hospital = this.world.room('hospital');
    const roomId = hospital ? 'hospital' : 'apt_2b';
    const r = this.world.room(roomId);
    const spot = r.def.arrive || { x: 110, y: 300 };
    // a few hours pass
    const skip = 180;
    this.s.t += skip;
    this.ai.abstract(skip);
    p.stats.health = 45;
    p.stats.hunger = Math.max(p.stats.hunger, 35);
    p.stats.thirst = Math.max(p.stats.thirst, 35);
    p.stats.mind = Math.max(5, p.stats.mind - 20);
    p.stats.stamina = 60;
    p.act = 'idle';
    p.awakeSince = this.s.t;
    this.repChange(-5, 'got dropped', p.room);
    this.changeRoom(roomId, spot, 'fade');
    let bill = '';
    if (hospital) {
      const b = this.money.bill(120, "St. Ann's ER");
      if (b.fromBank) bill += ` $${b.fromBank} of the $120 bill came out of the bank.`;
      if (b.left) bill += ` You owe St. Ann's $${b.left}.`;
    }
    const where = hospital ? 'a hospital bed' : 'your own bed somehow';
    const lost = fell && fell.items.length ? ` Whatever you carried (${fell.items.join(', ')}) is on the ground where you fell${fell.room ? ` — ${this.world.room(fell.room).name}` : ''}.` : '';
    this.log(`You wake up in ${where}, ${clock12(this.s.t)}. Mind and reputation took a hit.${lost}${bill}`, 'bad');
    this.emit('respawn', {});
    this.wantSave = true;
  }

  // ------------------------------------------------------------ queries for the view
  weatherAt(t = this.s.t) {
    // computed from the clock: afternoon storms are common, like the Gulf coast
    const day = dayOf(t);
    const h = tod(t) / 60;
    const seed = hashStr('wx' + day);
    const stormy = (seed % 100) / 100;
    const startH = 13 + (seed >> 8) % 5;
    const len = 1 + ((seed >> 12) % 3);
    let rain = 0;
    if (stormy > 0.45 && h >= startH && h < startH + len) {
      const k = (h - startH) / len;
      rain = Math.sin(k * Math.PI) * (0.5 + stormy * 0.5);
    }
    const cloud = clamp(0.2 + stormy * 0.4 + rain, 0, 1);
    const heat = 0.5 + 0.5 * Math.sin(((h - 9) / 24) * Math.PI * 2);
    return { rain, cloud, heat, storm: stormy > 0.8 && rain > 0.5 };
  }

  get weather() {
    return this.weatherAt();
  }
}

function migrate(s) {
  // v1 is current; future versions upgrade older blobs here.
  s.v = SAVE_VERSION;
  // The city grows between builds: add people, containers and fields that
  // older saves don't have yet, without touching anything they do have.
  s.leases = s.leases || {};
  s.favorCooldown = s.favorCooldown || {};
  for (const def of NPCS) {
    if (s.actors[def.id]) continue;
    const n = makeNpc(def);
    n.room = schedNow(n, s.t).room || n.home;
    s.actors[def.id] = n;
    if (n.neighbor) setTag(n, 'p', 'neighbor');
  }
  for (const id in ROOMS) {
    const def = ROOMS[id];
    if (!def.containers) continue;
    for (const k in def.containers) {
      const cid = `${id}:${k}`;
      if (!s.conts[cid]) s.conts[cid] = { id: cid, w: def.containers[k].w, h: def.containers[k].h, items: [], owner: id };
    }
  }
  const p = s.actors.p;
  if (p.room === 'st_pecan' && p.y < 480 && p.x < 520) p.y = 520; // old Bayou Arms side door is gone
}

export function defaultLook() {
  return { skin: '#8d5a3b', hair: 'short', hairColor: '#1b120c', top: 'tee', topColor: '#d4572a', bottom: 'jeans', bottomColor: '#34445e', shoes: '#ececec', build: 'avg', height: 1 };
}
