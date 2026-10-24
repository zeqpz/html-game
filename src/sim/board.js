// The personal board: goals you pin yourself. Nothing on it is required.

import { displayTag } from './memory.js';
import { cashOnBody } from './items.js';
import { clamp } from './util.js';

export const GOALS = {
  strength: { label: 'Reach Strength {n}', targets: [40, 50, 65, 80], value: (sim) => sim.player.stats.strength },
  agility: { label: 'Reach Agility {n}', targets: [40, 50, 65, 80], value: (sim) => sim.player.stats.agility },
  intellect: { label: 'Reach Intellect {n}', targets: [45, 55, 70, 85], value: (sim) => sim.player.stats.intellect },
  bank: { label: 'Bank balance ${n}', targets: [100, 500, 1500, 5000], value: (sim) => sim.player.bank },
  cash: { label: 'Have ${n} on you', targets: [100, 250, 500], value: (sim) => cashOnBody(sim, sim.player) },
  shifts: { label: 'Work {n} shifts', targets: [3, 7, 15, 30], value: (sim) => sim.s.stats.shifts },
  friends: { label: 'Make {n} friends', targets: [1, 2, 4], value: (sim) => Object.values(sim.s.actors).filter((a) => a.kind === 'npc' && displayTag(a, 'p') === 'friend').length },
  rep: { label: 'Reputation {n}', targets: [40, 55, 70, 85], value: (sim) => sim.player.stats.reputation },
  clean: { label: 'A clean week (7 days, no fights, heat 0)', targets: [7], value: (sim) => cleanDays(sim) },
};

function cleanDays(sim) {
  const f = sim.s.flags;
  return f.cleanSince === undefined ? 0 : Math.floor((sim.s.t - f.cleanSince) / 1440);
}

export function goalText(g) {
  return GOALS[g.id].label.replace('{n}', g.n);
}

export function pin(sim, id, n) {
  if (sim.s.board.some((g) => g.id === id && !g.done)) return false;
  if (sim.s.board.filter((g) => !g.done).length >= 6) return false;
  sim.s.board.push({ id, n, t: sim.s.t, done: false });
  if (id === 'clean') sim.s.flags.cleanSince = sim.s.t;
  return true;
}

export function unpin(sim, i) {
  sim.s.board.splice(i, 1);
}

export function progress(sim, g) {
  const v = GOALS[g.id].value(sim);
  return { v, frac: clamp(v / g.n, 0, 1) };
}

export function updateBoard(sim) {
  const f = sim.s.flags;
  // clean streak resets on fights or heat
  if (f.cleanSince === undefined) f.cleanSince = sim.s.t;
  if (sim.player.heat > 0.5 || (sim.s.lastFight && sim.s.lastFight.t > f.cleanSince && (sim.s.lastFight.by === 'p' || sim.s.lastFight.on === 'p'))) f.cleanSince = sim.s.t;
  for (const g of sim.s.board) {
    if (g.done) continue;
    if (GOALS[g.id].value(sim) >= g.n) {
      g.done = true;
      g.doneAt = sim.s.t;
      sim.player.stats.mind = Math.min(100, sim.player.stats.mind + 10);
      sim.log(`Board goal done: ${goalText(g)}.`, 'good');
      sim.toast(`Goal done: ${goalText(g)}`, 'good');
      sim.sfx('bell');
    }
  }
}
