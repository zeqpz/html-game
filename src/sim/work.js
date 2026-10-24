// Jobs (walk in, apply, work a shift of real actions) and favors (deadlines on the clock).

import { JOBS, FAVORS } from '../data/work.js';
import { ITEMS } from '../data/items.js';
import { remember, adjustRel, relV, setTag } from './memory.js';
import { newItem, addCash, destroy, placeGround, giveNpc } from './items.js';
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

  posting(jobId) {
    const J = JOBS[jobId];
    if (!J) return null;
    const js = this.jobState(jobId);
    const rank = J.ranks[js.rank];
    return {
      id: jobId, title: J.title, text: J.posting, pay: rank.pay, floor: J.floor, hired: js.hired, rank: rank.title,
      hours: js.hours, next: J.ranks[js.rank + 1] || null, miss: this.meetsFloor(J.floor),
      window: `${clock12(hm(J.clockIn[0]))} – ${clock12(hm(J.clockIn[1]))}`,
    };
  }

  apply(jobId) {
    const sim = this.sim;
    const J = JOBS[jobId];
    const js = this.jobState(jobId);
    if (js.hired) return { ok: false, text: "You already work here." };
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
    return { ok: true, text: `You're hired. Clock in between ${clock12(hm(J.clockIn[0]))} and ${clock12(hm(J.clockIn[1]))}.` };
  }

  // Asking a boss for work: hire, or start today's shift.
  askForWork(npc) {
    const sim = this.sim;
    const jobId = Object.keys(JOBS).find((k) => JOBS[k].boss === npc.id);
    if (!jobId) return { ok: false, text: pickOne(sim, ["I don't have anything for you.", "Nothing right now. Try the boards around town.", 'Not hiring, sorry.']) };
    const J = JOBS[jobId];
    const js = this.jobState(jobId);
    if (!js.hired) return this.apply(jobId);
    if (this.s.job.shift) return { ok: false, text: 'You\'re on the clock. Get to it.' };
    const day = dayOf(this.s.t);
    if (js.lastShiftDay === day) return { ok: false, text: 'You already worked today. Come back tomorrow.' };
    const m = tod(this.s.t);
    if (!inWindow(m, hm(J.clockIn[0]), hm(J.clockIn[1]))) return { ok: false, text: `Shifts start between ${clock12(hm(J.clockIn[0]))} and ${clock12(hm(J.clockIn[1]))}.` };
    if (npc.room !== J.place) return { ok: false, text: 'Talk to me at the diner.' };
    this.startShift(jobId);
    return { ok: true, text: pickOne(sim, ["Apron's on the hook. Orders are stacking up.", "Good timing. Let's go.", 'Tables first, then the floor. Move.']) };
  }

  startShift(jobId) {
    const sim = this.sim;
    const J = JOBS[jobId];
    const js = this.jobState(jobId);
    const rank = J.ranks[js.rank];
    const r = sim.world.room(J.place);
    const tables = r.props.filter((p) => p.table);
    const tasks = [];
    for (let i = 0; i < rank.tasks; i++) {
      const kind = sim.rng.weighted(J.taskKinds);
      const tp = sim.rng.pick(tables);
      if (kind === 'serve') {
        tasks.push({ kind: 'pickup', prop: 'pass', label: `Pick up the order for ${tp.label} ${tp.id.slice(-1)}` });
        tasks.push({ kind: 'serve', prop: tp.id, label: `Serve ${tp.label} ${tp.id.slice(-1)}` });
      } else if (kind === 'wipe') {
        tasks.push({ kind: 'wipe', prop: tp.id, label: `Wipe down ${tp.label} ${tp.id.slice(-1)}`, dur: 2.2 });
      } else {
        const pt = sim.world.randomPoint(J.place, sim.rng);
        tasks.push({ kind: 'mop', x: pt.x, y: pt.y, label: 'Mop up the spill', dur: 3 });
      }
    }
    const start = this.s.t;
    const close = start - tod(start) + hm(J.closeBy);
    this.s.job.shift = { job: jobId, start, due: Math.min(start + 300, close), tasks, i: 0, away: 0 };
    sim.log(`Clocked in at ${r.name}. Finish by ${clock12(this.s.job.shift.due)}.`);
    sim.sfx('bell');
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
    if (!sh || p.room !== JOBS[sh.job].place) return false;
    const task = sh.tasks[sh.i];
    if (!task) return false;
    if (task.kind === 'pickup' && propId === 'pass') {
      if (p.hands) {
        sim.toast('Hands full. Put that down first.', 'warn');
        return true;
      }
      const it = newItem(sim, 'plate', { order: true, owner: JOBS[sh.job].boss });
      it.where = 'gone';
      sim.items.putInHands(sim, p, it);
      const boss = this.s.actors[JOBS[sh.job].boss];
      if (boss && boss.loaded && boss.room === p.room) sim.say(boss, 'orderUp');
      this.advance();
      return true;
    }
    if (task.kind === 'serve' && propId === task.prop) {
      const it = p.hands && this.s.items[p.hands];
      if (!it || !it.order) {
        sim.toast('You need the order from the window.', 'warn');
        return true;
      }
      destroy(sim, it);
      // a customer at that table says thanks
      const prop = sim.world.prop(p.room, propId);
      for (const id in this.s.actors) {
        const a = this.s.actors[id];
        if (a.spot && a.spot.prop === propId && a.room === p.room) {
          sim.say(a, 'thanksFood');
          a.stats.hunger = Math.min(100, a.stats.hunger + 40);
          adjustRel(sim, a, 'p', 2);
          break;
        }
      }
      sim.sfx('plate');
      this.advance();
      return true;
    }
    if (task.kind === 'wipe' && propId === task.prop) {
      sim.startTask(p, { kind: 'shift', dur: task.dur, label: task.label });
      return true;
    }
    if (task.kind === 'mop' && Math.hypot(task.x - x, task.y - y) < 40) {
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

  finishShift() {
    const sim = this.sim;
    const sh = this.s.job.shift;
    const J = JOBS[sh.job];
    const js = this.jobState(sh.job);
    const rank = J.ranks[js.rank];
    const p = this.s.actors.p;
    const boss = this.s.actors[J.boss];
    const tips = sim.rng.int(0, 6) + Math.round(p.stats.reputation / 25);
    addCash(sim, p, rank.pay + tips);
    js.hours += J.hours;
    js.shifts++;
    js.lastShiftDay = dayOf(sh.start);
    this.s.job.shift = null;
    this.s.stats.shifts++;
    p.lastUse.strength = this.s.t;
    p.stats.strength = Math.min(100, p.stats.strength + 0.3);
    if (boss) {
      remember(sim, boss, { type: 'shift', who: 'p' });
      adjustRel(sim, boss, 'p', 5);
      if (boss.loaded && boss.room === p.room) sim.sayText(boss, `Good shift. Here's ${'$' + (rank.pay + tips)}.`);
    }
    sim.repChange(1, 'finished a shift', p.room);
    sim.log(`Shift done. Paid $${rank.pay} + $${tips} tips. ${js.hours} hours on the books.`, 'good');
    sim.sfx('cash');
    // promotion
    const next = J.ranks[js.rank + 1];
    if (next && js.hours >= next.hours && this.meetsFloor(next.floor).length === 0) {
      js.rank++;
      sim.log(`Promoted to ${next.title}. Pay is now $${next.pay} a shift.`, 'good');
      sim.toast(`Promoted: ${next.title}!`, 'good');
      sim.repChange(2, 'got promoted', p.room);
    }
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
    const p = this.s.actors.p;
    if (p.hands && this.s.items[p.hands]?.order) destroy(sim, this.s.items[p.hands]);
    if (boss) {
      remember(sim, boss, { type: 'quit', who: 'p' });
      adjustRel(sim, boss, 'p', -10);
    }
    sim.repChange(-2, 'walked off a shift', p.room);
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
    s.favors.push(rec);
    sim.log(`Favor for ${s.actors[F.giver].short}: ${F.short}${rec.due ? ` (by ${clock12(rec.due)})` : ''}.`);
    sim.sfx('tick');
  }

  // Handing over the item in your hands. Returns a reply or null if not a favor.
  tryDeliver(npc, it) {
    const sim = this.sim;
    const s = this.s;
    const rec = s.favors.find((f) => f.giver === npc.id && f.status === 'active' && FAVORS[f.id].item === it.def);
    if (!rec) return null;
    if (it.order) return null; // diner orders belong to the job
    const F = FAVORS[rec.id];
    giveNpc(sim, npc, it);
    rec.status = 'done';
    s.favorCooldown[rec.id] = s.t + F.cooldown * DAY;
    if (F.reward.cash) {
      npc.cash = Math.max(0, npc.cash - F.reward.cash);
      addCash(sim, s.actors.p, F.reward.cash);
    }
    adjustRel(sim, npc, 'p', F.reward.rel);
    remember(sim, npc, { type: 'brought', who: 'p', item: it.def });
    sim.repChange(1, 'came through on a favor', npc.room);
    s.stats.favors++;
    sim.log(`Favor done for ${npc.short}.${F.reward.cash ? ` +$${F.reward.cash}.` : ''}`, 'good');
    sim.sfx('cash');
    return F.thanks;
  }

  noise(room, x, y, why) {
    const s = this.s;
    const m = tod(s.t);
    if (!inWindow(m, hm('00:00'), hm('06:00'))) return;
    const nearHome = room === 'apt_2b' || (room === 'st_pecan' && y < 640 && x < 560);
    if (!nearHome) return;
    for (const f of s.favors) if (f.status === 'active' && FAVORS[f.id].kind === 'quiet' && s.t >= f.from) f.noisy = true;
    // neighbours at home hear it even without a favor
    const day = dayOf(s.t);
    for (const id in s.actors) {
      const a = s.actors[id];
      if (a.kind !== 'npc' || !a.neighbor || a.room !== a.home) continue;
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
    // shift deadline / walking off
    const sh = s.job.shift;
    if (sh) {
      const p = s.actors.p;
      if (s.t > sh.due) this.failShift('ran past the deadline');
      else if (p.room !== JOBS[sh.job].place) {
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
        remember(sim, giver, { type: 'welched', who: 'p', task: F.short.toLowerCase().replace(/^(bring|find|keep)/, (w) => w) });
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
