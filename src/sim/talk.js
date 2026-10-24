// Talk: pick a tone (easy / straight / hard). The reply is assembled from the
// speaker's personality, how they feel about you and the last thing they remember.

import { GREET, SAY, REPLY } from '../data/lines.js';
import { PERSONALITIES } from '../data/personalities.js';
import { ITEMS } from '../data/items.js';
import { FAVORS } from '../data/work.js';
import { relV, adjustRel, remember, tier, latest, quote, meet } from './memory.js';
import { clamp, clock12 } from './util.js';

const BASE = { easy: 0.62, straight: 0.55, hard: 0.38 };

function fillP(sim, s, npc) {
  return sim.fillTime(s.replace(/\{p\}/g, sim.s.actors.p.name).replace(/\{n\}/g, npc.short));
}

function pick(sim, arr) {
  return arr[Math.floor(sim.rng.next() * arr.length)];
}

// Relationship as felt on sight: strangers lean on your reputation.
export function feel(sim, npc) {
  const r = npc.rel.p;
  const v = r ? r.v : 0;
  const rep = sim.s.actors.p.stats.reputation;
  return r && r.met ? v : v + (rep - 50) * 0.25;
}

function band(v) {
  return v < -10 ? 'low' : v < 30 ? 'mid' : 'high';
}

export function openTalk(sim, npcId) {
  const npc = sim.s.actors[npcId];
  const p = sim.s.actors.p;
  const v = feel(sim, npc);
  const T = tier(v);
  const lines = [];
  lines.push(fillP(sim, pick(sim, GREET[T][npc.personality]), npc));
  // they quote the latest thing they remember
  const m = latest(npc);
  if (m && sim.s.t - m.t < 1440 * 10) lines.push(quote(sim, npc, m));
  // a word on the moment
  const remark = contextRemark(sim, npc, p);
  if (remark) lines.push(remark);
  // reminders about open favors
  const fav = sim.s.favors.find((f) => f.giver === npcId && f.status === 'active');
  if (fav) lines.push(reminder(sim, fav));
  meet(npc, 'p');
  sim.dialog = { npc: npcId, log: [{ who: npcId, text: lines.join(' ') }], turn: 0, bad: 0, offer: null, done: false };
  sim.dialog.options = options(sim, npc);
  npc._ && (npc._.talkUntil = Infinity);
  return sim.dialog;
}

function reminder(sim, f) {
  const F = FAVORS[f.id];
  if (F.kind === 'quiet') return 'Remember — quiet tonight.';
  return `Still counting on you: ${F.short.toLowerCase()} — by ${clock12(f.due)}.`;
}

function contextRemark(sim, npc, p) {
  const h = p.hands && sim.s.items[p.hands];
  if (h && ITEMS[h.def].visible) return `What's with the ${ITEMS[h.def].name.toLowerCase()}?`;
  if (p.stats.health < 40) return 'You look rough. You alright?';
  if (sim.weather?.rain > 0.4 && sim.rng.chance(0.4)) return 'Wet enough for you?';
  if (npc.stats.hunger < 25 && sim.rng.chance(0.5)) return "I'm starving, honestly.";
  return '';
}

function options(sim, npc) {
  const d = sim.dialog;
  if (d.offer) {
    const F = FAVORS[d.offer];
    return [
      { tone: 'accept', text: pick(sim, ['I got you.', 'Consider it done.', "Yeah, I'll handle it."]) },
      { tone: 'decline', text: pick(sim, ["Can't right now.", 'Not today, sorry.', 'Pass.']) },
    ];
  }
  const b = band(feel(sim, npc));
  return ['easy', 'straight', 'hard'].map((tone) => ({ tone, text: fillP(sim, pick(sim, SAY[tone][b]), npc) }));
}

export function odds(sim, npc, tone) {
  const p = sim.s.actors.p;
  const P = PERSONALITIES[npc.personality];
  let o = BASE[tone] + P.tone[tone];
  o += (p.stats.intellect - 50) / 180;
  o += (p.stats.reputation - 50) / 220;
  o += feel(sim, npc) / 260;
  if (npc.stats.mind < 30 || npc.stats.hunger < 20) o -= 0.1;
  if (tone === 'hard') {
    if (P.respectsHard && p.stats.reputation > npc.stats.reputation + 5) o += 0.35;
    o += (p.stats.strength - npc.stats.strength) / 250;
  }
  return clamp(o, 0.05, 0.95);
}

export function chooseTone(sim, tone) {
  const d = sim.dialog;
  if (!d || d.done) return;
  const npc = sim.s.actors[d.npc];
  const p = sim.s.actors.p;
  const opt = d.options.find((o) => o.tone === tone);
  if (opt) d.log.push({ who: 'p', text: opt.text });

  if (d.offer) {
    const F = FAVORS[d.offer];
    if (tone === 'accept') {
      sim.work.startFavor(d.offer);
      d.log.push({ who: d.npc, text: pick(sim, ['Thank you. Really.', 'Good. Don\'t let me down.', "Appreciate you."]) });
    } else {
      adjustRel(sim, npc, 'p', -1);
      d.log.push({ who: d.npc, text: pick(sim, ['Alright. Maybe next time.', 'Mm. Okay.', 'Figures.']) });
    }
    d.offer = null;
    d.turn++;
    return afterTurn(sim, d, npc);
  }

  const o = odds(sim, npc, tone);
  const r = sim.rng.next();
  const outcome = r < o ? 'good' : r < o + (1 - o) * 0.5 ? 'ok' : 'bad';
  let reply = fillP(sim, pick(sim, REPLY[tone][outcome][npc.personality]), npc);
  const P = PERSONALITIES[npc.personality];
  const before = Math.round(relV(npc, 'p'));
  const today = Math.floor(sim.s.t / 1440);

  if (tone === 'easy' || tone === 'straight') {
    const dv = outcome === 'good' ? (tone === 'easy' ? 4 : 5) : outcome === 'ok' ? 1 : -3;
    adjustRel(sim, npc, 'p', dv);
    if (outcome === 'good') {
      p.stats.mind = clamp(p.stats.mind + 3, 0, 100);
      npc.stats.mind = clamp(npc.stats.mind + 2, 0, 100);
      if (npc._goodTalkDay !== today) {
        npc._goodTalkDay = today;
        remember(sim, npc, { type: 'talk_good', who: 'p' });
      }
    } else if (outcome === 'bad') d.bad++;
    // a favor comes from straight talk once they like you enough
    if (tone === 'straight' && outcome === 'good') {
      const fav = sim.work.availableFavor(npc);
      if (fav) {
        d.offer = fav;
        const F = FAVORS[fav];
        const due = F.dueHours ? clock12(sim.s.t + F.dueHours * 60) : 'morning';
        reply += ' ' + F.ask.replace('{due}', due);
      }
    }
  } else {
    // hard
    if (outcome === 'good') {
      adjustRel(sim, npc, 'p', -2);
      sim.repChange(+1, 'held your ground', npc.room);
      remember(sim, npc, { type: 'threatened', who: 'p' });
    } else {
      const dv = outcome === 'ok' ? -6 : -11;
      adjustRel(sim, npc, 'p', dv * (P.grudge || 1));
      remember(sim, npc, { type: 'talk_bad', who: 'p' });
      d.bad++;
      if (outcome === 'bad') {
        const dislikes = relV(npc, 'p') < -10;
        const volatile = npc.personality === 'volatile';
        if ((dislikes || volatile) && sim.rng.chance(P.temper * (dislikes ? 1.3 : 1))) {
          d.log.push({ who: d.npc, text: reply });
          d.done = true;
          d.fight = true;
          sim.dialog = null;
          sim.fight.squareUp(npc, p, true);
          return;
        }
      }
    }
  }
  d.log.push({ who: d.npc, text: reply, delta: Math.round(relV(npc, 'p')) - before });
  d.turn++;
  afterTurn(sim, d, npc);
}

function afterTurn(sim, d, npc) {
  if (!d.offer && (d.turn >= 3 || d.bad >= 2)) {
    const bye = d.bad >= 2
      ? pick(sim, ["We're done here.", 'I got nothing else to say.', 'Bye.'])
      : pick(sim, ['Anyway, I gotta get back to it.', 'Alright, take care.', 'Catch you later.', 'Stay cool out there.']);
    d.log.push({ who: d.npc, text: bye });
    d.done = true;
    d.options = [];
    return;
  }
  d.options = options(sim, npc);
}

export function closeTalk(sim) {
  const d = sim.dialog;
  if (d) {
    const npc = sim.s.actors[d.npc];
    if (npc && npc._) npc._.talkUntil = sim.time + 1.5;
  }
  sim.dialog = null;
}
