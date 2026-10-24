// Cars: feel, not a racing sim. Weight, soft steering, speed that takes a
// second to build, a skid if you turn too hard, dents on the panels, and a
// trip through the windshield if you hit something hard enough.

import { MODELS, START_CAR, FUEL_PRICE, REPAIR_PER_PANEL } from '../data/cars.js';
import { CELL } from '../data/rooms.js';
import { clamp, sign } from './util.js';
import { scratch } from './actors.js';
import { remember, adjustRel, witnesses } from './memory.js';
import { newItem, putInCont, putInHands, cashOnBody, spendCash, contItems } from './items.js';

const CIRCLES = [-0.34, 0, 0.34]; // along the length, as fractions
const EJECT_SPEED = 360;

export class Cars {
  constructor(sim) {
    this.sim = sim;
    if (!sim.s.cars) sim.s.cars = {};
  }

  get all() {
    return this.sim.s.cars;
  }

  create(spec) {
    const s = this.sim.s;
    const id = 'c' + s.uid++;
    const M = MODELS[spec.model];
    s.cars[id] = {
      id, model: spec.model, color: spec.color, owner: spec.owner || null, room: spec.room, x: spec.x, y: spec.y, rot: spec.rot || 0,
      vx: 0, vy: 0, steer: 0, fuel: spec.fuel ?? M.tank, dmg: { front: 0, rear: 0, left: 0, right: 0, ...(spec.dmg || {}) },
      stored: null, job: spec.job || null, radio: false, plate: spec.plate || plate(this.sim),
    };
    return s.cars[id];
  }

  // A starting car + its keys (new games and old saves).
  giveStartCar() {
    const sim = this.sim;
    const car = this.create({ ...START_CAR, owner: 'p' });
    const keys = newItem(sim, 'carkeys', { car: car.id, owner: 'p' });
    const p = sim.player;
    if (!putInCont(sim, keys, p.pockets)) putInCont(sim, keys, 'apt_2b:stash');
    return car;
  }

  hasKeys(car) {
    const sim = this.sim;
    const p = sim.player;
    if (car.job && sim.s.job.shift && sim.s.job.shift.job === car.job) return true;
    const mine = [...contItems(sim, p.pockets)];
    if (p.hands) mine.push(sim.s.items[p.hands]);
    return mine.some((it) => it && it.def === 'carkeys' && it.car === car.id);
  }

  driving() {
    const p = this.sim.player;
    return p.car ? this.all[p.car] : null;
  }

  speed(car) {
    return Math.hypot(car.vx, car.vy);
  }

  // Doors are on the left side, toward the front.
  doorPoint(car, side = -1) {
    const M = MODELS[car.model];
    const fx = Math.cos(car.rot);
    const fy = Math.sin(car.rot);
    const rx = -fy;
    const ry = fx;
    return { x: car.x + fx * M.len * 0.08 + rx * side * (M.wid / 2 + 14), y: car.y + fy * M.len * 0.08 + ry * side * (M.wid / 2 + 14) };
  }

  nearDoor(room, x, y, r = 30) {
    let best = null;
    let bd = r;
    for (const id in this.all) {
      const c = this.all[id];
      if (c.stored || c.room !== room) continue;
      const d = this.doorPoint(c);
      const dd = Math.hypot(d.x - x, d.y - y);
      if (dd < bd) {
        bd = dd;
        best = c;
      }
    }
    return best;
  }

  enter(car) {
    const sim = this.sim;
    const p = sim.player;
    if (!this.hasKeys(car)) {
      sim.toast(car.owner === 'p' ? "You don't have the keys on you." : 'Locked.', 'warn');
      sim.sfx('locked');
      return false;
    }
    if (p.spot) sim.leaveSpot(p);
    if (p.hands && sim.s.items[p.hands] && ['pipe', 'bat', 'broom', 'lumber'].includes(sim.s.items[p.hands].def)) {
      sim.toast("That won't fit in the car with you. Drop it first.", 'warn');
      return false;
    }
    p.car = car.id;
    p.act = 'drive';
    car.doorT = 0.45;
    car.driverIn = true;
    scratch(p).vx = scratch(p).vy = 0;
    sim.sfx('door');
    if (!p.licenses.driver) sim.toast('You can sit in it — but it won’t start for you without a driver license.', 'warn');
    else if (car.fuel <= 0) sim.toast('Tank is empty.', 'warn');
    sim.emit('car', { id: car.id, enter: true });
    return true;
  }

  exit(force = false) {
    const sim = this.sim;
    const p = sim.player;
    const car = this.driving();
    if (!car) return false;
    if (!force && this.speed(car) > 40) {
      sim.toast('Stop the car first.', 'warn');
      return false;
    }
    let pt = null;
    for (const side of [-1, 1]) {
      const d = this.doorPoint(car, side);
      if (sim.world.walkable(car.room, d.x, d.y) && !this.blocked(car, d.x, d.y)) {
        pt = d;
        break;
      }
    }
    if (!pt && !force) {
      sim.toast('No room to open the door.', 'warn');
      return false;
    }
    if (!pt) pt = { x: car.x, y: car.y };
    p.car = null;
    p.act = 'idle';
    p.x = pt.x;
    p.y = pt.y;
    p.room = car.room;
    car.driverIn = false;
    car.doorT = 0.45;
    sim.sfx('door');
    sim.emit('car', { id: car.id, enter: false });
    sim.wantSave = true;
    return true;
  }

  blocked(car, x, y) {
    for (const id in this.all) {
      const o = this.all[id];
      if (o === car || o.stored || o.room !== car.room) continue;
      if (Math.hypot(o.x - x, o.y - y) < 40) return true;
    }
    return false;
  }

  circles(car) {
    const M = MODELS[car.model];
    const fx = Math.cos(car.rot);
    const fy = Math.sin(car.rot);
    return CIRCLES.map((k) => ({ x: car.x + fx * M.len * k, y: car.y + fy * M.len * k, r: M.wid / 2, k }));
  }

  // Walkers get pushed out of parked and moving cars.
  pushActor(a) {
    if (a.act === 'drive') return;
    for (const id in this.all) {
      const c = this.all[id];
      if (c.stored || c.room !== a.room) continue;
      if (Math.abs(c.x - a.x) > 80 || Math.abs(c.y - a.y) > 80) continue;
      for (const q of this.circles(c)) {
        const dx = a.x - q.x;
        const dy = a.y - q.y;
        const d = Math.hypot(dx, dy);
        const min = q.r + 8;
        if (d < min && d > 1e-4) {
          a.x = q.x + (dx / d) * min;
          a.y = q.y + (dy / d) * min;
        }
      }
    }
  }

  // ---------------------------------------------------------------- physics
  update(dt) {
    const sim = this.sim;
    const p = sim.player;
    for (const id in this.all) {
      const car = this.all[id];
      if (car.stored) continue;
      if (car.doorT > 0) car.doorT -= dt;
      const driven = p.car === id;
      const moving = Math.abs(car.vx) + Math.abs(car.vy) > 1;
      if (!driven && !moving) continue;
      if (!sim.loaded.has(car.room)) {
        car.vx = car.vy = 0;
        continue;
      }
      this.step(car, driven ? sim.driveInput || { mx: 0, my: 0 } : null, dt);
    }
  }

  step(car, inp, dt) {
    const sim = this.sim;
    const p = sim.player;
    const M = MODELS[car.model];
    const wet = sim.weather.rain > 0.2;
    let thr = 0;
    let brk = 0;
    let st = 0;
    let hand = false;
    if (inp) {
      thr = Math.max(0, -inp.my);
      brk = Math.max(0, inp.my);
      st = clamp(inp.mx, -1, 1);
      hand = !!inp.hand;
      const canRun = p.licenses.driver && car.fuel > 0;
      if (!canRun && (thr > 0 || brk > 0)) {
        if (!car._nagAt || sim.time - car._nagAt > 4) {
          car._nagAt = sim.time;
          sim.toast(car.fuel <= 0 ? 'The engine coughs. Out of gas.' : 'You turn the key. Nothing — you need a driver license first.', 'warn');
        }
        thr = 0;
        brk = 0;
      }
    }
    const fx = Math.cos(car.rot);
    const fy = Math.sin(car.rot);
    const rx = -fy;
    const ry = fx;
    let u = car.vx * fx + car.vy * fy;
    let w = car.vx * rx + car.vy * ry;
    const health = 1 - (car.dmg.front * 0.35 + car.dmg.rear * 0.15);
    if (thr) u += M.accel * thr * (1 - clamp(u / M.top, 0, 1)) * dt * Math.max(0.35, health);
    if (brk) {
      if (u > 12) u -= M.brake * brk * dt;
      else u = Math.max(-M.top * 0.3, u - M.accel * 0.7 * brk * dt);
    }
    // rolling resistance and air drag
    const drag = (thr || brk ? 18 : 70) + 0.0011 * u * u;
    u -= sign(u) * Math.min(Math.abs(u), drag * dt);
    if (hand) u *= 1 - Math.min(1, 2.2 * dt);
    // soft steering: less lock at speed, eased in
    const target = st * M.steer * (1 - 0.55 * clamp(Math.abs(u) / M.top, 0, 1));
    car.steer += (target - car.steer) * Math.min(1, dt * 4.5);
    const wheelbase = M.len * 0.62;
    const yaw = (u / wheelbase) * Math.tan(car.steer);
    // grip: kill sideways slip unless you're asking too much of the tires
    const demand = Math.abs(u * yaw);
    const limit = 950 * (wet ? 0.65 : 1) * (hand ? 0.35 : 1);
    let grip = M.grip * (wet ? 0.75 : 1) * (hand ? 0.3 : 1);
    car.skid = 0;
    if (demand > limit) {
      car.skid = clamp((demand - limit) / 700, 0, 1);
      grip *= 0.3;
      w += sign(yaw) * sign(u) * (demand - limit) * dt * 0.35; // the rear steps out
    }
    if (hand && Math.abs(u) > 150) car.skid = Math.max(car.skid, 0.5);
    w *= Math.exp(-grip * dt);
    car.rot += yaw * dt * (car.skid > 0 ? 1.15 : 1);
    const nfx = Math.cos(car.rot);
    const nfy = Math.sin(car.rot);
    car.vx = nfx * u + -nfy * w;
    car.vy = nfy * u + nfx * w;
    car.x += car.vx * dt;
    car.y += car.vy * dt;
    car.fuel = Math.max(0, car.fuel - Math.abs(u) * dt * M.mpg);
    car.rpm = clamp(Math.abs(u) / M.top + thr * 0.25, 0, 1.2);
    this.collide(car, dt);
    this.edges(car);
  }

  collide(car, dt) {
    const sim = this.sim;
    const r = sim.world.room(car.room);
    const M = MODELS[car.model];
    const fx = Math.cos(car.rot);
    const fy = Math.sin(car.rot);
    let worst = 0;
    let worstN = null;
    for (const q of this.circles(car)) {
      // static solids
      for (const s of r.solids) {
        const cx = clamp(q.x, s.x, s.x + s.w);
        const cy = clamp(q.y, s.y, s.y + s.h);
        let dx = q.x - cx;
        let dy = q.y - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 >= q.r * q.r) continue;
        let d = Math.sqrt(d2);
        if (d < 1e-4) {
          dx = q.x - (s.x + s.w / 2);
          dy = q.y - (s.y + s.h / 2);
          d = Math.hypot(dx, dy) || 1;
        }
        const nx = dx / d;
        const ny = dy / d;
        const pen = q.r - Math.min(d, q.r);
        car.x += nx * pen;
        car.y += ny * pen;
        q.x += nx * pen;
        q.y += ny * pen;
        const vn = car.vx * nx + car.vy * ny;
        if (vn < 0) {
          car.vx -= nx * vn * 1.3;
          car.vy -= ny * vn * 1.3;
          if (-vn > worst) {
            worst = -vn;
            worstN = [nx, ny];
          }
        }
      }
      // other cars
      for (const id in this.all) {
        const o = this.all[id];
        if (o === car || o.stored || o.room !== car.room) continue;
        if (Math.abs(o.x - car.x) > 140 || Math.abs(o.y - car.y) > 140) continue;
        for (const oq of this.circles(o)) {
          const dx = q.x - oq.x;
          const dy = q.y - oq.y;
          const d = Math.hypot(dx, dy);
          const min = q.r + oq.r;
          if (d >= min || d < 1e-4) continue;
          const nx = dx / d;
          const ny = dy / d;
          const pen = min - d;
          const Mo = MODELS[o.model];
          const share = Mo.mass / (Mo.mass + M.mass);
          car.x += nx * pen * share;
          car.y += ny * pen * share;
          o.x -= nx * pen * (1 - share);
          o.y -= ny * pen * (1 - share);
          const rv = (car.vx - o.vx) * nx + (car.vy - o.vy) * ny;
          if (rv < 0) {
            const imp = -rv;
            car.vx += nx * imp * share * 1.1;
            car.vy += ny * imp * share * 1.1;
            o.vx -= nx * imp * (1 - share) * 1.1;
            o.vy -= ny * imp * (1 - share) * 1.1;
            this.dent(o, -nx, -ny, imp * 0.8);
            if (imp > worst) {
              worst = imp;
              worstN = [nx, ny];
            }
          }
        }
      }
    }
    if (worst > 70 && worstN) this.crash(car, worstN[0], worstN[1], worst);
    this.hitPeople(car);
  }

  dent(car, nx, ny, impact) {
    if (impact < 70) return;
    const fx = Math.cos(car.rot);
    const fy = Math.sin(car.rot);
    const along = nx * fx + ny * fy;
    const side = nx * -fy + ny * fx;
    let panel;
    if (Math.abs(along) > Math.abs(side)) panel = along < 0 ? 'front' : 'rear';
    else panel = side < 0 ? 'right' : 'left';
    car.dmg[panel] = clamp(car.dmg[panel] + (impact - 60) / 650 / MODELS[car.model].mass, 0, 1);
    return panel;
  }

  crash(car, nx, ny, impact) {
    const sim = this.sim;
    const p = sim.player;
    this.dent(car, nx, ny, impact);
    const driven = p.car === car.id;
    sim.emit('crash', { room: car.room, x: car.x, y: car.y, amt: impact });
    if (driven || car.room === p.room) sim.sfx(impact > 220 ? 'crash' : 'bump', p);
    if (driven) {
      sim.emit('shake', { amt: Math.min(16, impact / 22) });
      p.stats.health = Math.max(0, p.stats.health - Math.max(0, impact - 160) * 0.04);
      if (impact > EJECT_SPEED) this.eject(car, impact);
      else if (p.stats.health <= 0) sim.playerDown(null);
    }
  }

  // Through the windshield and into the street.
  eject(car, impact) {
    const sim = this.sim;
    const p = sim.player;
    const fx = Math.cos(car.rot);
    const fy = Math.sin(car.rot);
    this.exit(true);
    let pt = { x: car.x + fx * 70, y: car.y + fy * 70 };
    if (!sim.world.walkable(car.room, pt.x, pt.y)) pt = { x: car.x - fx * 70, y: car.y - fy * 70 };
    const q = { x: pt.x, y: pt.y };
    sim.world.collide(car.room, q);
    p.x = q.x;
    p.y = q.y;
    const _ = scratch(p);
    _.kx = fx * 300;
    _.ky = fy * 300;
    car.vx *= 0.1;
    car.vy *= 0.1;
    const hurt = 18 + (impact - EJECT_SPEED) * 0.08;
    p.stats.health = Math.max(0, p.stats.health - hurt);
    sim.log(`You hit hard and go out through the windshield. (-${Math.round(hurt)} health)`, 'bad');
    sim.emit('shake', { amt: 18 });
    sim.sfx('thud');
    for (const w of witnesses(sim, car.room, car.x, car.y, [])) adjustRel(sim, w, 'p', -2);
    if (p.stats.health <= 0) sim.playerDown(null);
  }

  hitPeople(car) {
    const sim = this.sim;
    const v = this.speed(car);
    for (const id in sim.s.actors) {
      const a = sim.s.actors[id];
      if (a.room !== car.room || !a.loaded || a.act === 'drive' || a.downUntil) continue;
      if (Math.abs(a.x - car.x) > 70 || Math.abs(a.y - car.y) > 70) continue;
      for (const q of this.circles(car)) {
        const dx = a.x - q.x;
        const dy = a.y - q.y;
        const d = Math.hypot(dx, dy);
        if (d > q.r + 9) continue;
        if (v > 110 && sim.player.car === car.id && a.kind === 'npc') {
          const dmg = Math.round(v * 0.09);
          a.stats.health = Math.max(0, a.stats.health - dmg);
          const _ = scratch(a);
          _.kx = car.vx * 0.9;
          _.ky = car.vy * 0.9;
          car.vx *= 0.7;
          car.vy *= 0.7;
          sim.emit('hit', { room: a.room, x: a.x, y: a.y - 30, dmg, by: 'p', on: a.id });
          sim.emit('float', { room: a.room, x: a.x, y: a.y - 54, text: `-${dmg}`, color: '#ff6b5e' });
          sim.sfx('thud', a);
          remember(sim, a, { type: 'hit', who: 'p' });
          adjustRel(sim, a, 'p', -35);
          for (const w of witnesses(sim, a.room, a.x, a.y, [a.id])) {
            remember(sim, w, { type: 'started', who: 'p', x: a.id });
            adjustRel(sim, w, 'p', -12);
          }
          sim.addHeat(sim.policeIn(a.room) ? 30 : 12, 'hit someone with your car');
          sim.repChange(-4, 'ran someone down', a.room);
          if (a.stats.health <= 0) sim.fight.knockDown(a, sim.player);
          else sim.fight.flee(a, sim.player);
        } else if (d < q.r + 9) {
          a.x = q.x + (dx / (d || 1)) * (q.r + 9);
          a.y = q.y + (dy / (d || 1)) * (q.r + 9);
          if (v > 40 && a.kind === 'npc' && sim.rng.chance(0.02)) sim.sayText(a, 'Watch it!');
        }
      }
    }
  }

  edges(car) {
    const sim = this.sim;
    const r = sim.world.room(car.room);
    if (r.kind !== 'street') return;
    let to = null;
    let nx = car.x;
    let ny = car.y;
    if (car.x < 0 && r.edges.w) { to = r.edges.w; nx += CELL; }
    else if (car.x > CELL && r.edges.e) { to = r.edges.e; nx -= CELL; }
    else if (car.y < 0 && r.edges.n) { to = r.edges.n; ny += CELL; }
    else if (car.y > CELL && r.edges.s) { to = r.edges.s; ny -= CELL; }
    else {
      car.x = clamp(car.x, 20, CELL - 20);
      car.y = clamp(car.y, 20, CELL - 20);
      return;
    }
    car.room = to;
    car.x = nx;
    car.y = ny;
    if (sim.player.car === car.id) sim.changeRoom(to, { x: nx, y: ny }, 'edge');
  }

  // ---------------------------------------------------------------- services
  repairCost(car) {
    const d = car.dmg;
    return Math.round((d.front + d.rear + d.left + d.right) * REPAIR_PER_PANEL);
  }

  fuelCost(car) {
    const M = MODELS[car.model];
    return Math.ceil((M.tank - car.fuel) * FUEL_PRICE * 10) / 10 * 10 / 10;
  }

  refuel(car) {
    const sim = this.sim;
    const M = MODELS[car.model];
    const missing = M.tank - car.fuel;
    if (missing < 1) return { ok: false, text: 'Tank is full.' };
    const cost = Math.ceil(missing * FUEL_PRICE);
    const cash = cashOnBody(sim, sim.player);
    if (cash <= 0) return { ok: false, text: 'Pay at the pump — you need cash.' };
    const pay = Math.min(cost, cash);
    spendCash(sim, sim.player, pay);
    car.fuel = Math.min(M.tank, car.fuel + pay / FUEL_PRICE);
    sim.sfx('cash');
    sim.log(`Pumped $${pay} of gas.`);
    return { ok: true, text: pay < cost ? `$${pay} — that's all you had.` : `Filled up for $${pay}.` };
  }

  repair(car) {
    const sim = this.sim;
    const cost = this.repairCost(car);
    if (cost <= 0) return { ok: false, text: 'Nothing to fix.' };
    if (!spendCash(sim, sim.player, cost)) return { ok: false, text: `That's $${cost}. Cash only.` };
    car.dmg = { front: 0, rear: 0, left: 0, right: 0 };
    sim.sfx('cash');
    sim.log(`Earl knocks the dents out. $${cost}.`, 'good');
    return { ok: true, text: `Fixed up for $${cost}.` };
  }

  buy(model, color) {
    const sim = this.sim;
    const M = MODELS[model];
    const p = sim.player;
    const cash = cashOnBody(sim, p);
    if (p.bank + cash < M.price) return { ok: false, text: `$${M.price}. You've got $${p.bank + cash} between bank and pocket.` };
    let left = M.price;
    const fromBank = Math.min(p.bank, left);
    p.bank -= fromBank;
    left -= fromBank;
    if (fromBank) sim.money.logBank('withdraw', fromBank, 'Big Tex Motors');
    if (left > 0) spendCash(sim, p, left);
    const car = this.create({ model, color, owner: 'p', room: 'st_canal_w', x: 300, y: 1180, rot: -Math.PI / 2, fuel: M.tank * 0.5 });
    const keys = newItem(sim, 'carkeys', { car: car.id, owner: 'p' });
    if (!putInCont(sim, keys, p.pockets) && !putInHands(sim, p, keys)) sim.items.placeGround(sim, keys, p.room, p.x, p.y + 12);
    sim.sfx('cash');
    sim.log(`Bought a ${M.name} (plate ${car.plate}). It's out front on the lot.`, 'good');
    sim.repChange(2, 'drove off the lot', p.room);
    sim.wantSave = true;
    return { ok: true, text: `Keys are yours. It's parked on the lot.` };
  }

  near(room, x, y, r) {
    for (const id in this.all) {
      const c = this.all[id];
      if (!c.stored && c.room === room && c.owner === 'p' && Math.hypot(c.x - x, c.y - y) < r) return c;
    }
    return null;
  }
}

function plate(sim) {
  const L = 'ABCDEFGHJKLMNPRSTVWXYZ';
  let s = '';
  for (let i = 0; i < 3; i++) s += L[Math.floor(sim.rng.next() * L.length)];
  return `${s}-${sim.rng.int(1000, 9999)}`;
}
