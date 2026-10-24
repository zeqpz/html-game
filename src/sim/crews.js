// Crews: you can stay solo, join, or be asked. Membership is a relationship
// plus a tag. Hostility between the crews cools their members toward rivals
// and makes them quicker to swing. A public insult raises it.

import { CREWS, START_HOSTILITY, hostKey } from '../data/crews.js';
import { setTag, adjustRel, relV, witnesses } from './memory.js';
import { clamp, dayOf } from './util.js';

export class Crews {
  constructor(sim) {
    this.sim = sim;
    if (!sim.s.crews) sim.s.crews = { hostility: { ...START_HOSTILITY }, day: dayOf(sim.s.t) };
  }

  get st() {
    return this.sim.s.crews;
  }

  of(actor) {
    return actor ? actor.crew || null : null;
  }

  hostility(a, b) {
    if (!a || !b || a === b) return 0;
    return this.st.hostility[hostKey(a, b)] || 0;
  }

  raise(a, b, amt, why) {
    if (!a || !b || a === b) return;
    const k = hostKey(a, b);
    const before = this.st.hostility[k] || 0;
    this.st.hostility[k] = clamp(before + amt, 0, 100);
    if (Math.floor(before / 20) !== Math.floor(this.st.hostility[k] / 20)) {
      this.sim.log(`Tension between the ${CREWS[a].name} and the ${CREWS[b].name} is ${this.st.hostility[k] >= 60 ? 'boiling over' : this.st.hostility[k] >= 40 ? 'rising' : 'simmering'}${why ? ` (${why})` : ''}.`, 'bad');
    }
  }

  // How much a crew member warms or cools to you because of crew politics.
  feelMod(npc) {
    const mine = this.sim.player.crew;
    const theirs = npc.crew;
    if (!theirs || !mine) return 0;
    if (mine === theirs) return 15;
    return -this.hostility(mine, theirs) / 2.5;
  }

  temperMod(npc) {
    const mine = this.sim.player.crew;
    if (!npc.crew || !mine || mine === npc.crew) return 0;
    return this.hostility(mine, npc.crew) / 150;
  }

  canJoin(crewId) {
    const sim = this.sim;
    const C = CREWS[crewId];
    const p = sim.player;
    if (p.crew === crewId) return { ok: false, text: "You're already one of us." };
    if (p.crew) return { ok: false, text: `You roll with the ${CREWS[p.crew].name}. Can't have it both ways.` };
    const leader = sim.s.actors[C.leader];
    if (relV(leader, 'p') < C.joinRel) return { ok: false, text: "I don't know you like that yet." };
    if (p.stats.reputation < C.joinRep) return { ok: false, text: 'Nobody out here knows your name. Build one first.' };
    return { ok: true };
  }

  join(crewId) {
    const sim = this.sim;
    const r = this.canJoin(crewId);
    if (!r.ok) return r;
    const C = CREWS[crewId];
    const p = sim.player;
    p.crew = crewId;
    for (const id of C.members) {
      const m = sim.s.actors[id];
      if (!m) continue;
      setTag(m, 'p', 'crew');
      adjustRel(sim, m, 'p', 10);
    }
    for (const other in CREWS) {
      if (other === crewId) continue;
      for (const id of CREWS[other].members) adjustRel(sim, sim.s.actors[id], 'p', -15);
    }
    sim.repChange(3, `joined the ${C.name}`, p.room);
    sim.log(`You're with the ${C.name} now. Their people have your back — and their rivals know your face.`, 'good');
    sim.toast(`Joined the ${C.name}`, 'good');
    sim.wantSave = true;
    return { ok: true, text: `Welcome to the ${C.name}.` };
  }

  leave() {
    const sim = this.sim;
    const p = sim.player;
    const crewId = p.crew;
    if (!crewId) return { ok: false, text: "You're not in a crew." };
    const C = CREWS[crewId];
    p.crew = null;
    for (const id of C.members) {
      const m = sim.s.actors[id];
      if (!m) continue;
      setTag(m, 'p', null);
      adjustRel(sim, m, 'p', -20);
    }
    sim.log(`You walked away from the ${C.name}. They won't forget it.`, 'bad');
    sim.wantSave = true;
    return { ok: true, text: 'You\'re on your own now.' };
  }

  // You did something hostile to a crew member where people could see.
  onHostile(npc, amt, what) {
    const sim = this.sim;
    if (!npc.crew) return;
    const mine = sim.player.crew;
    const seen = witnesses(sim, npc.room, npc.x, npc.y, [npc.id]).length > 0;
    if (!seen) return;
    for (const id of CREWS[npc.crew].members) {
      if (id === npc.id) continue;
      adjustRel(sim, sim.s.actors[id], 'p', -amt / 2);
    }
    if (mine && mine !== npc.crew) this.raise(mine, npc.crew, amt, what);
  }

  // NPC crews clash on their own, too.
  onNpcFight(a, b) {
    if (a.crew && b.crew && a.crew !== b.crew) this.raise(a.crew, b.crew, 6, `${a.short} and ${b.short} got into it`);
  }

  update() {
    const day = dayOf(this.sim.s.t);
    if (day !== this.st.day) {
      this.st.day = day;
      for (const k in this.st.hostility) this.st.hostility[k] = Math.max(10, this.st.hostility[k] - 3);
    }
  }
}
