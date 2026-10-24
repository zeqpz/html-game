// License applications: pay the fee, take a short quiz. Fail and you wait a
// day. Intellect greys out wrong answers.

import { LICENSES } from '../data/licenses.js';
import { dayOf } from './util.js';
import { spendCash, cashOnBody } from './items.js';

export class Licenses {
  constructor(sim) {
    this.sim = sim;
  }

  status(id) {
    const sim = this.sim;
    const L = LICENSES[id];
    const p = sim.player;
    if (p.licenses[id]) return { ok: false, have: true, text: 'You already have this.' };
    const failed = sim.s.flags[`fail_${id}`];
    if (failed !== undefined && failed >= dayOf(sim.s.t)) return { ok: false, text: 'You failed today. Come back tomorrow.' };
    const r = L.req || {};
    if (r.reputation && p.stats.reputation < r.reputation) return { ok: false, text: `Needs reputation ${r.reputation}. They ask around about you.` };
    if (r.heatBelow !== undefined && p.heat >= r.heatBelow) return { ok: false, text: 'Too much heat on your name right now.' };
    if (r.noFines && (p.fines || 0) > 0) return { ok: false, text: 'Pay your outstanding fines first.' };
    if (cashOnBody(sim, p) < L.fee) return { ok: false, text: `The fee is $${L.fee}, cash.` };
    return { ok: true, text: `Fee $${L.fee}. ${L.of} questions, need ${L.need} right.` };
  }

  start(id) {
    const sim = this.sim;
    const L = LICENSES[id];
    const st = this.status(id);
    if (!st.ok) return st;
    spendCash(sim, sim.player, L.fee);
    const pool = L.questions.map((_, i) => i);
    const qs = [];
    while (qs.length < L.of && pool.length) qs.push(pool.splice(Math.floor(sim.rng.next() * pool.length), 1)[0]);
    const int = sim.player.stats.intellect;
    const hints = int >= 60 ? 2 : int >= 40 ? 1 : 0;
    const items = qs.map((qi) => {
      const [q, answers, right] = L.questions[qi];
      const order = answers.map((_, i) => i);
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(sim.rng.next() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      const wrong = order.filter((i) => i !== right);
      const grey = [];
      for (let k = 0; k < hints; k++) grey.push(wrong.splice(Math.floor(sim.rng.next() * wrong.length), 1)[0]);
      return { q, answers: order.map((i) => ({ i, text: answers[i], grey: grey.includes(i) })), right };
    });
    sim.ui.modal = { type: 'test', id, items, i: 0, right: 0, done: false };
    sim.sfx('tick');
    return { ok: true };
  }

  answer(choice) {
    const sim = this.sim;
    const m = sim.ui.modal;
    if (!m || m.type !== 'test' || m.done) return;
    const it = m.items[m.i];
    const ok = choice === it.right;
    it.picked = choice;
    if (ok) m.right++;
    m.i++;
    sim.sfx(ok ? 'tick' : 'click');
    if (m.i >= m.items.length) {
      const L = LICENSES[m.id];
      m.done = true;
      m.passed = m.right >= L.need;
      if (m.passed) {
        sim.player.licenses[m.id] = true;
        sim.log(`Passed: ${L.name} (${m.right}/${L.of}).`, 'good');
        sim.toast(`${L.name} issued!`, 'good');
        sim.repChange(1, 'got licensed', sim.player.room);
        sim.sfx('bell');
      } else {
        sim.s.flags[`fail_${m.id}`] = dayOf(sim.s.t);
        sim.log(`Failed the ${L.name.toLowerCase()} test (${m.right}/${L.of}). Try again tomorrow.`, 'bad');
      }
      sim.wantSave = true;
    }
  }
}
