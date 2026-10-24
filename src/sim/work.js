// Jobs (walk in, apply, work a shift of real actions) and favors (deadlines on the clock).

import { JOBS, FAVORS } from '../data/work.js';
import { ITEMS } from '../data/items.js';
import { remember, adjustRel, relV, setTag } from './memory.js';
import { newItem, addCash, destroy, placeGround, giveNpc, putInHands } from './items.js';
import { hm, tod, inWindow, clock12, dayOf, DAY } from './util.js';

export class Work {
  constructor(sim) {
    this.sim = sim;
  }

  get s() {
    return this.sim.s;
  }

  jobState(id) {
    const j = this.s.job.jobs;
    if (!j[id]) j[id] = { hired: false, rank: 0, hours: 0, lastShiftDay: -1, shifts: 0 };
    return j[id];
  }

  onShift() {
    return !!this.s.job.shift;
  }

  meetsFloor(floor) {
    const st = this.s.actors.p.stats;
    const miss = [];
    for (const k in floor || {}) if (st[k] < floor[k]) miss.push(`${k} ${floor[k]}`);
    return miss;
  }

  jobFor(boss) {
    return Object.keys(JOBS).find((k) => JOBS[k].boss === boss) || null;
  }

  posting(jobId) {
    const J = JOBS[jobId];
    if (!J) return null;
    const js = this.jobState(jobId);
    const rank = J.ranks[js.rank];
    return {
      id: jobId, title: J.title, text: J.posting, pay: rank.pay, floor: J.floor, hired: js.hired, rank: rank.title,
      hours: js.hours, next: J.ranks[js.rank + 1] || null, miss: this.meetsFloor(J.floor),
      window: `${clock12(hm(J.clockIn[0]))} – ${clock12(hm(J.clockIn[1]))}`,
      boss: this.s.actors[J.boss]?.short,
    };
  }

  apply(jobId) {
    const sim = this.sim;
    const J = JOBS[jobId];
    const js = this.jobState(jobId);
    if (js.hired) return { ok: false, text: 'You already work here.' };
    if (J.license && !this.s.actors.p.licenses[J.license]) return { ok: false, text: 'You need a driver license for this one. Permits window at the 5th Precinct.' };
    const miss = this.meetsFloor(J.floor);
    if (miss.length) return { ok: false, text: `Not yet. Needs ${miss.join(', ')}.` };
    js.hired = true;
    const boss = this.s.actors[J.boss];
    if (boss) {
      setTag(boss, 'p', 'boss');
      adjustRel(sim, boss, 'p', 5);
    }
    sim.log(`Hired: ${J.title} at ${sim.world.room(J.place).name}.`, 'good');
    sim.sfx('cash');
    return { ok: true, text: `You're hired. Clock in between ${clock12(hm(J.clockIn[0]))} and ${clock12(hm(J.clockIn[1]))} — ask ${boss ? boss.short : 'the boss'}.` };
  }

  // Asking a boss for work: hire, or start today's shift.
  askForWork(npc) {
    const sim = this.sim;
    const jobId = this.jobFor(npc.id);
    if (!jobId) return { ok: false, text: pickOne(sim, ["I don't have anything for you.", 'Nothing right now. Check the boards around town.', 'Not hiring, sorry.']) };
    const J = JOBS[jobId];
    const js = this.jobState(jobId);
    if (!js.hired) return this.apply(jobId);
    if (this.s.job.shift) return { ok: false, text: 'You\'re already on the clock somewhere. Finish that first.' };
    const day = dayOf(this.s.t);
    if (js.lastShiftDay === day) return { ok: false, text: 'You already worked today. Come back tomorrow.' };
    const m = tod(this.s.t);
    if (!inWindow(m, hm(J.clockIn[0]), hm(J.clockIn[1]))) return { ok: false, text: `Shifts start between ${clock12(hm(J.clockIn[0]))} and ${clock12(hm(J.clockIn[1]))}.` };
    if (npc.room !== J.place) return { ok: false, text: `Find me at ${sim.world.room(J.place).name}.` };
    if (J.license && !this.s.actors.p.licenses[J.license]) return { ok: false, text: 'Not without a driver license, hon.' };
    this.startShift(jobId);
    return { ok: true, text: pickOne(sim, ["Good timing. Let's go.", 'Alright, here\'s your list. Move.', "Clock's running. Get to it."]) };
  }

  // Resolve a target spec into [{ room, prop, label }].
  targets(J, spec) {
    const r = this.sim.world.room(J.place);
    const named = (p) => `${p.label}${/\d$/.test(p.id) ? ' ' + p.id.slice(-1) : ''}`;
    if (Array.isArray(spec)) return spec.map((id) => r.props.find((p) => p.id === id)).filter(Boolean).map((p) => ({ room: J.place, prop: p.id, label: named(p) }));
    if (spec && spec.tag) return r.props.filter((p) => p[spec.tag]).map((p) => ({ room: J.place, prop: p.id, label: named(p) }));
    if (spec && spec.list) return spec.list.map(([room, prop, label]) => ({ room, prop, label }));
    return [];
  }

  startShift(jobId) {
    const sim = this.sim;
    const J = JOBS[jobId];
    const js = this.jobState(jobId);
    const rank = J.ranks[js.rank];
    const tasks = [];
    let last = null;
    for (let i = 0; i < rank.tasks; i++) {
      const T = sim.rng.weighted(J.tasks.map((t) => [t, t.w]));
      if (T.kind === 'carry') {
        const opts = this.targets(J, T.to).filter((o) => !last || o.prop !== last.prop || o.room !== last.room);
        const to = sim.rng.pick(opts.length ? opts : this.targets(J, T.to));
        const pickup = T.fromSpot
          ? { kind: 'pickup', room: J.place, ...this.spot(J.place), item: T.item, mark: T.mark, label: T.pick.replace('{to}', to.label), dur: 0 }
          : { kind: 'pickup', room: J.place, prop: T.from, item: T.item, label: T.pick.replace('{to}', to.label) };
        tasks.push(pickup);
        tasks.push({ kind: 'deliver', room: to.room, prop: to.prop, item: T.item, label: T.drop.replace('{to}', to.label) });
        last = to;
      } else if (T.kind === 'fare') {
        const pool = J.stops.slice();
        const a = pool.splice(Math.floor(sim.rng.next() * pool.length), 1)[0];
        const b = pool.splice(Math.floor(sim.rng.next() * pool.length), 1)[0];
        tasks.push({ kind: 'goto', room: a[0], x: a[1], y: a[2], label: `Pick up a fare at ${a[3]}`, fare: 'pickup' });
        tasks.push({ kind: 'goto', room: b[0], x: b[1], y: b[2], label: `Drop them at ${b[3]}`, fare: 'drop' });
      } else if (T.kind === 'hold') {
        const at = sim.rng.pick(this.targets(J, T.at));
        tasks.push({ kind: 'hold', room: at.room, prop: at.prop, dur: T.dur, label: T.label.replace('{to}', at.label) });
        last = at;
      } else {
        const room = T.rooms ? sim.rng.pick(T.rooms) : J.place;
        tasks.push({ kind: 'spot', room, ...this.spot(room), dur: T.dur, mark: T.mark, need: T.need, label: T.label.replace('{room}', sim.world.room(room).def.streets?.v || sim.world.room(room).name) });
      }
    }
    const start = this.s.t;
    const close = start - tod(start) + hm(J.closeBy);
    this.s.job.shift = { job: jobId, start, due: Math.min(start + 300, close), tasks, i: 0, away: 0 };
    if (J.vehicle) {
      const sp = sim.world.room('st_canal_main').def.carSpawn.cab;
      const cab = sim.cars.create({ model: J.vehicle, color: '#e8b923', room: 'st_canal_main', x: sp.x, y: sp.y, rot: sp.rot, job: jobId, fuel: 100 });
      this.s.job.shift.car = cab.id;
      sim.log('Your cab is waiting in the lot out back.');
    }
    if (J.gear) {
      const g = newItem(sim, J.gear, { order: true, job: jobId });
      const p = this.s.actors.p;
      if (!putInHands(sim, p, g)) {
        placeGround(sim, g, p.room, p.x, p.y + 14);
        sim.toast(`Your hands are full — the ${ITEMS[J.gear].name.toLowerCase()} is at your feet.`, 'warn');
      }
    }
    sim.log(`Clocked in: ${J.title}. Finish by ${clock12(this.s.job.shift.due)}.`);
    sim.sfx('bell');
  }

  // A clear floor spot for a mop / litter task, preferring sidewalks outdoors.
  spot(roomId) {
    const sim = this.sim;
    const r = sim.world.room(roomId);
    const J = this.s.job.shift ? JOBS[this.s.job.shift.job] : null;
    const area = Object.values(JOBS).find((j) => j.place === roomId && j.area)?.area;
    if (area) {
      const pt = sim.world.randomPoint(roomId, sim.rng, area[0], area[1], area[2]);
      return { x: pt.x, y: pt.y };
    }
    if (r.kind === 'street') {
      for (let i = 0; i < 20; i++) {
        const pt = sim.world.randomPoint(roomId, sim.rng);
        const onWalk = Math.abs(pt.y - 570) < 30 || Math.abs(pt.y - 830) < 30 || Math.abs(pt.x - 570) < 30 || Math.abs(pt.x - 830) < 30;
        if (onWalk) return { x: pt.x, y: pt.y };
      }
    }
    const pt = sim.world.randomPoint(roomId, sim.rng);
    return { x: pt.x, y: pt.y };
  }

  currentTask() {
    const sh = this.s.job.shift;
    return sh ? sh.tasks[sh.i] : null;
  }

  // The player interacted with something while on shift. Returns true if it counted.
  shiftInteract(propId, x, y) {
    const sim = this.sim;
    const sh = this.s.job.shift;
    const p = this.s.actors.p;
    if (!sh) return false;
    const task = sh.tasks[sh.i];
    if (!task || task.room !== p.room) return false;
    const atSpot = task.x !== undefined && Math.hypot(task.x - x, task.y - y) < 42;
    const atProp = task.prop && task.prop === propId;
    if (!atSpot && !atProp) return false;
    const J = JOBS[sh.job];
    if (task.kind === 'pickup') {
      if (p.hands && !(this.s.items[p.hands]?.job === sh.job && ITEMS[this.s.items[p.hands].def].kind === 'job')) {
        sim.toast('Hands full. Put that down first.', 'warn');
        return true;
      }
      const it = newItem(sim, task.item, { order: true, job: sh.job, owner: J.boss });
      putInHands(sim, p, it);
      const boss = this.s.actors[J.boss];
      if (boss && boss.loaded && boss.room === p.room && sh.job === 'diner') sim.say(boss, 'orderUp');
      sim.sfx('pickup');
      this.advance();
      return true;
    }
    if (task.kind === 'deliver') {
      const it = p.hands && this.s.items[p.hands];
      if (!it || it.job !== sh.job || it.def !== task.item) {
        sim.toast(`You need the ${ITEMS[task.item].name.toLowerCase()} first.`, 'warn');
        return true;
      }
      destroy(sim, it);
      for (const id in this.s.actors) {
        const a = this.s.actors[id];
        if (a.room !== p.room || !a.loaded) continue;
        if (a.spot && a.spot.prop === propId && sh.job === 'diner') {
          sim.say(a, 'thanksFood');
          a.stats.hunger = Math.min(100, a.stats.hunger + 40);
          adjustRel(sim, a, 'p', 2);
          break;
        }
        if (sh.job === 'courier' && a.staffOf === p.room && sim.onDuty(a)) {
          sim.sayText(a, pickOne(sim, ['Got it, thanks.', 'Sign here. Thanks.', "Tell Carmen I said hi."]));
          adjustRel(sim, a, 'p', 1);
          break;
        }
      }
      sim.sfx(sh.job === 'diner' ? 'plate' : 'tick');
      this.advance();
      return true;
    }
    if (task.kind === 'hold' || task.kind === 'spot') {
      if (task.need) {
        const h = p.hands && this.s.items[p.hands];
        if (!h || h.def !== task.need) {
          sim.toast(`You need a ${ITEMS[task.need].name.toLowerCase()} in your hands.`, 'warn');
          return true;
        }
      }
      sim.startTask(p, { kind: 'shift', dur: task.dur, label: task.label });
      return true;
    }
    return false;
  }

  advance() {
    const sim = this.sim;
    const sh = this.s.job.shift;
    if (!sh) return;
    sh.i++;
    if (sh.i >= sh.tasks.length) this.finishShift();
    else sim.sfx('tick');
  }

  clearJobItems(jobId) {
    for (const uid in this.s.items) {
      const it = this.s.items[uid];
      if (it.job === jobId) destroy(this.sim, it);
    }
    const sim = this.sim;
    for (const id in this.s.cars) {
      const car = this.s.cars[id];
      if (car.job !== jobId) continue;
      if (sim.player.car === id) sim.cars.exit(true);
      delete this.s.cars[id];
    }
  }

  // Every step: fares complete when you pull up in the cab and slow down.
  tick() {
    const sim = this.sim;
    const sh = this.s.job.shift;
    if (!sh) return;
    const task = sh.tasks[sh.i];
    if (!task || task.kind !== 'goto') return;
    const p = this.s.actors.p;
    const car = p.car && this.s.cars[p.car];
    if (!car || car.job !== sh.job || car.room !== task.room) return;
    if (Math.hypot(car.x - task.x, car.y - task.y) > 80 || sim.cars.speed(car) > 70) return;
    if (task.fare === 'pickup') {
      sim.toast('Fare in. "Hey. Thanks for stopping."', 'good');
      sim.sfx('door');
    } else {
      const tip = sim.rng.int(1, 6) + Math.round(p.stats.reputation / 30);
      sh.tips = (sh.tips || 0) + tip;
      sim.toast(`Dropped off. +$${tip} tip at the end of the shift.`, 'good');
      sim.sfx('cash');
    }
    this.advance();
  }

  finishShift() {
    const sim = this.sim;
    const sh = this.s.job.shift;
    const J = JOBS[sh.job];
    const js = this.jobState(sh.job);
    const rank = J.ranks[js.rank];
    const p = this.s.actors.p;
    const boss = this.s.actors[J.boss];
    const tips = sim.rng.int(0, 6) + Math.round(p.stats.reputation / 25) + (sh.tips || 0);
    this.clearJobItems(sh.job);
    addCash(sim, p, rank.pay + tips);
    js.hours += J.hours;
    js.shifts++;
    js.lastShiftDay = dayOf(sh.start);
    this.s.job.shift = null;
    this.s.stats.shifts++;
    p.lastUse.strength = this.s.t;
    p.stats.strength = Math.min(100, p.stats.strength + 0.3);
    if (J.roam) {
      p.lastUse.agility = this.s.t;
      p.stats.agility = Math.min(100, p.stats.agility + 0.3);
    }
    if (boss) {
      remember(sim, boss, { type: 'shift', who: 'p' });
      adjustRel(sim, boss, 'p', 5);
      if (boss.loaded && boss.room === p.room) sim.sayText(boss, `Good shift. Here's $${rank.pay + tips}.`);
    }
    sim.repChange(1, 'finished a shift', p.room);
    sim.log(`Shift done (${J.title}). Paid $${rank.pay} + $${tips} tips. ${js.hours} hours on the books.`, 'good');
    sim.sfx('cash');
    const next = J.ranks[js.rank + 1];
    if (next && js.hours >= next.hours && this.meetsFloor(next.floor).length === 0) {
      js.rank++;
      sim.log(`Promoted to ${next.title}. Pay is now $${next.pay} a shift.`, 'good');
      sim.toast(`Promoted: ${next.title}!`, 'good');
      sim.repChange(2, 'got promoted', p.room);
    } else if (next && js.hours >= next.hours) {
      sim.log(`${boss ? boss.short : 'The boss'} would promote you, but you need ${this.meetsFloor(next.floor).join(', ')}.`);
    }
    sim.wantSave = true;
  }

  failShift(why) {
    const sim = this.sim;
    const sh = this.s.job.shift;
    if (!sh) return;
    const J = JOBS[sh.job];
    const boss = this.s.actors[J.boss];
    this.s.job.shift = null;
    const js = this.jobState(sh.job);
    js.lastShiftDay = dayOf(sh.start);
    this.clearJobItems(sh.job);
    if (boss) {
      remember(sim, boss, { type: 'quit', who: 'p' });
      adjustRel(sim, boss, 'p', -10);
    }
    sim.repChange(-2, 'walked off a shift', sim.player.room);
    sim.log(`Shift lost: ${why}`, 'bad');
    sim.toast(`Shift lost — ${why}`, 'bad');
  }

  // ------------------------------------------------------------------ favors
  availableFavor(npc) {
    const s = this.s;
    if (!npc.favors || !npc.favors.length) return null;
    if (s.favors.some((f) => f.giver === npc.id && f.status === 'active')) return null;
    for (const id of npc.favors) {
      const F = FAVORS[id];
      if (relV(npc, 'p') < F.minRel) continue;
      if ((s.favorCooldown[id] || 0) > s.t) continue;
      if (F.kind === 'quiet' && !inWindow(tod(s.t), hm('17:00'), hm('23:59'))) continue;
      return id;
    }
    return null;
  }

  startFavor(id) {
    const sim = this.sim;
    const s = this.s;
    const F = FAVORS[id];
    const rec = { id, giver: F.giver, status: 'active', start: s.t };
    const p = s.actors.p;
    if (F.kind === 'quiet') {
      const nextMidnight = s.t - tod(s.t) + DAY;
      rec.from = nextMidnight + hm(F.window[0]);
      rec.due = nextMidnight + hm(F.window[1]);
      rec.noisy = false;
    } else {
      rec.due = s.t + F.dueHours * 60;
    }
    if (F.kind === 'fetch' && F.spawn) {
      const r = sim.world.room(F.spawn.room);
      const area = r.hangouts?.[F.spawn.area];
      const pt = area ? sim.world.randomPoint(F.spawn.room, sim.rng, area[0], area[1], area[2] * 1.4) : sim.world.randomPoint(F.spawn.room, sim.rng);
      const it = newItem(sim, F.item, { owner: F.giver, favor: id });
      placeGround(sim, it, F.spawn.room, pt.x, pt.y);
      rec.uid = it.uid;
    }
    if (F.kind === 'courier') {
      const it = newItem(sim, F.item, { owner: F.giver, favor: id });
      if (!putInHands(sim, p, it)) placeGround(sim, it, p.room, p.x, p.y + 14);
      rec.uid = it.uid;
      if (F.reward.cash) {
        const giver = s.actors[F.giver];
        giver.cash = Math.max(0, giver.cash - F.reward.cash);
        addCash(sim, p, F.reward.cash);
      }
    }
    s.favors.push(rec);
    sim.log(`Favor for ${s.actors[F.giver].short}: ${F.short}${F.kind !== 'quiet' ? ` (by ${clock12(rec.due)})` : ''}.`);
    sim.sfx('tick');
  }

  // Handing over the item in your hands. Returns a reply or null if not a favor.
  tryDeliver(npc, it) {
    const sim = this.sim;
    const s = this.s;
    if (it.job) return null;
    const rec = s.favors.find((f) => {
      if (f.status !== 'active') return false;
      const F = FAVORS[f.id];
      if (F.kind === 'courier') return F.to === npc.id && it.favor === f.id;
      return f.giver === npc.id && F.item === it.def && (F.kind !== 'fetch' || it.favor === f.id || true);
    });
    if (!rec) return null;
    const F = FAVORS[rec.id];
    giveNpc(sim, npc, it);
    rec.status = 'done';
    s.favorCooldown[rec.id] = s.t + F.cooldown * DAY;
    const giver = s.actors[F.giver];
    if (F.kind === 'courier') {
      adjustRel(sim, npc, 'p', 4);
      remember(sim, npc, { type: 'brought', who: 'p', item: it.def });
      adjustRel(sim, giver, 'p', F.reward.rel);
      remember(sim, giver, { type: 'helped', who: 'p' });
    } else {
      if (F.reward.cash) {
        npc.cash = Math.max(0, npc.cash - F.reward.cash);
        addCash(sim, s.actors.p, F.reward.cash);
      }
      adjustRel(sim, npc, 'p', F.reward.rel);
      remember(sim, npc, { type: 'brought', who: 'p', item: it.def });
    }
    sim.repChange(1, 'came through on a favor', npc.room);
    s.stats.favors++;
    sim.log(`Favor done for ${giver.short}.${F.reward.cash && F.kind !== 'courier' ? ` +$${F.reward.cash}.` : ''}`, 'good');
    sim.sfx('cash');
    sim.wantSave = true;
    return F.thanks;
  }

  noise(room, x, y, why) {
    const s = this.s;
    const m = tod(s.t);
    if (!inWindow(m, hm('00:00'), hm('06:00'))) return;
    const nearHome = room === 'apt_2b' || room === 'bayou_hall' || (room === 'st_pecan' && y < 640 && x < 560);
    if (!nearHome) return;
    for (const f of s.favors) if (f.status === 'active' && FAVORS[f.id].kind === 'quiet' && s.t >= f.from) f.noisy = true;
    // neighbours at home hear it even without a favor
    const day = dayOf(s.t);
    for (const id in s.actors) {
      const a = s.actors[id];
      if (a.kind !== 'npc' || !(a.neighbor || a.landlord) || a.room !== a.home) continue;
      if (a._loudDay === day) continue;
      a._loudDay = day;
      remember(this.sim, a, { type: 'loud', who: 'p' });
      adjustRel(this.sim, a, 'p', -4);
      this.sim.log(`Somebody bangs on the wall. ${why}`, 'bad');
    }
  }

  update() {
    const sim = this.sim;
    const s = this.s;
    const sh = s.job.shift;
    if (sh) {
      const p = s.actors.p;
      const J = JOBS[sh.job];
      if (s.t > sh.due) this.failShift('ran past the deadline');
      else if (!J.roam && p.room !== J.place) {
        sh.away += sim.lastDm;
        if (sh.away > 25) this.failShift('walked out mid-shift');
      } else sh.away = 0;
    }
    for (const f of s.favors) {
      if (f.status !== 'active') continue;
      const F = FAVORS[f.id];
      const giver = s.actors[f.giver];
      if (F.kind === 'quiet') {
        if (s.t >= f.due) {
          f.status = f.noisy ? 'failed' : 'done';
          s.favorCooldown[f.id] = s.t + F.cooldown * DAY;
          if (f.noisy) {
            remember(sim, giver, { type: 'loud', who: 'p' });
            adjustRel(sim, giver, 'p', F.fail.rel);
            sim.log(`${giver.short} heard you last night.`, 'bad');
          } else {
            remember(sim, giver, { type: 'quiet', who: 'p' });
            adjustRel(sim, giver, 'p', F.reward.rel);
            sim.log(`You kept it quiet for ${giver.short}.`, 'good');
            s.stats.favors++;
          }
        }
        continue;
      }
      if (s.t > f.due) {
        f.status = 'failed';
        s.favorCooldown[f.id] = s.t + F.cooldown * DAY;
        remember(sim, giver, { type: 'welched', who: 'p', task: F.short.charAt(0).toLowerCase() + F.short.slice(1) });
        adjustRel(sim, giver, 'p', F.fail.rel);
        sim.repChange(-2, 'welched on a favor', giver.room);
        sim.log(`You welched on ${giver.short}: ${F.short.toLowerCase()}.`, 'bad');
        sim.toast(`Favor failed: ${F.short}`, 'bad');
        if (f.uid && s.items[f.uid] && s.items[f.uid].where === 'ground') destroy(sim, s.items[f.uid]);
      }
    }
  }
}

function pickOne(sim, arr) {
  return arr[Math.floor(sim.rng.next() * arr.length)];
}
