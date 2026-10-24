// Headless run: no DOM, no canvas. Simulates several in-game days with a
// wandering player bot and checks invariants plus a save/load round trip.
//   node tests/headless.mjs [days] [seed]

import { Sim, STEP } from '../src/sim/sim.js';
import { ITEMS } from '../src/data/items.js';

const days = Number(process.argv[2] || 3);
const seed = Number(process.argv[3] || 12345);
const sim = Sim.create({ seed, name: 'Tester', dayLen: 600 });
let fails = 0;
const fail = (msg) => {
  fails++;
  if (fails < 25) console.error('FAIL:', msg);
};

function check(label) {
  const s = sim.s;
  for (const id in s.actors) {
    const a = s.actors[id];
    if (!sim.world.room(a.room)) fail(`${label}: ${id} in unknown room ${a.room}`);
    if (a.loaded && (!Number.isFinite(a.x) || !Number.isFinite(a.y))) fail(`${label}: ${id} bad pos ${a.x},${a.y}`);
    for (const k in a.stats) if (!Number.isFinite(a.stats[k])) fail(`${label}: ${id}.${k} = ${a.stats[k]}`);
    if (a.mem.length > 8) fail(`${label}: ${id} has ${a.mem.length} memories`);
    if (a.loaded && a.kind === 'npc' && !sim.loaded.has(a.room)) fail(`${label}: ${id} loaded in unloaded room ${a.room}`);
  }
  for (const uid in s.items) {
    const it = s.items[uid];
    if (!ITEMS[it.def]) fail(`${label}: item ${uid} bad def ${it.def}`);
    if (it.where === 'ground' && !s.rooms[it.room].items.includes(uid)) fail(`${label}: ground item ${uid} missing from room list`);
    if (it.where === 'cont' && !s.conts[it.cont].items.includes(uid)) fail(`${label}: cont item ${uid} missing from ${it.cont}`);
    if (it.where === 'gone') fail(`${label}: orphan item ${uid} (${it.def})`);
  }
  for (const r in s.rooms) for (const u of s.rooms[r].items) if (!s.items[u] || s.items[u].where !== 'ground') fail(`${label}: room ${r} lists stale ${u}`);
}

// bot: wander, interact sometimes, follow a loose plan between rooms
let botT = 0;
const steps = Math.round((days * sim.s.dayLen) / STEP);
const t0 = Date.now();
const roomsSeen = new Set();
let talks = 0;
for (let i = 0; i < steps; i++) {
  botT -= STEP;
  if (botT <= 0) {
    botT = 0.5 + Math.random() * 2.5;
    const a = Math.random() * Math.PI * 2;
    sim.input.mx = Math.random() < 0.15 ? 0 : Math.cos(a);
    sim.input.my = Math.random() < 0.15 ? 0 : Math.sin(a);
    sim.input.sprint = Math.random() < 0.3;
    if (Math.random() < 0.3) sim.edges.interact = true;
    if (Math.random() < 0.05) sim.edges.strike = true;
  }
  if (sim.ui.menu) {
    const acts = sim.ui.menu.actions;
    const pick = acts[Math.floor(Math.random() * Math.min(3, acts.length))];
    sim.cmd('npc_action', { id: sim.ui.menu.npc, action: pick.id, prop: pick.prop });
  }
  if (sim.dialog) {
    talks++;
    if (sim.dialog.options.length) sim.cmd('talk_tone', { tone: sim.dialog.options[Math.floor(Math.random() * sim.dialog.options.length)].tone });
    else sim.cmd('talk_close');
  }
  if (sim.ui.modal) {
    if (sim.ui.modal.type === 'sleep') sim.cmd('sleep', { hours: 'morning' });
    else if (sim.ui.modal.type === 'shop') sim.cmd('buy', { shop: sim.ui.modal.shop, item: 'coffee', npc: sim.ui.modal.npc });
    sim.cmd('modal_close');
  }
  sim.step(STEP);
  roomsSeen.add(sim.player.room);
  sim.events.length = 0;
  if (i % 3000 === 0) check(`step ${i}`);
}
check('end');

// save / load round trip
const blob = sim.serialize();
const sim2 = Sim.load(blob);
const blob2 = sim2.serialize();
const a = JSON.parse(blob);
const b = JSON.parse(blob2);
if (a.t !== b.t) fail('round trip: clock differs');
if (Object.keys(a.items).length !== Object.keys(b.items).length) fail('round trip: item count differs');
for (const id in a.actors) {
  if (JSON.stringify(a.actors[id].mem) !== JSON.stringify(b.actors[id].mem)) fail(`round trip: ${id} memories differ`);
  if (JSON.stringify(a.actors[id].rel) !== JSON.stringify(b.actors[id].rel)) fail(`round trip: ${id} relationships differ`);
}
for (let i = 0; i < 600; i++) sim2.step(STEP);

const p = sim.player;
const ms = Date.now() - t0;
console.log(`Simulated ${days} day(s) in ${ms} ms (${(steps / (ms / 1000)).toFixed(0)} steps/s). Save ${(blob.length / 1024).toFixed(1)} KB.`);
console.log(`Rooms visited: ${[...roomsSeen].join(', ')}. Talk turns: ${talks}.`);
console.log(`Player: hp ${p.stats.health.toFixed(0)} mind ${p.stats.mind.toFixed(0)} hunger ${p.stats.hunger.toFixed(0)} rep ${p.stats.reputation.toFixed(0)} room ${p.room}`);
for (const id in sim.s.actors) {
  const n = sim.s.actors[id];
  if (n.kind !== 'npc') continue;
  console.log(`  ${n.short.padEnd(9)} room=${n.room.padEnd(14)} act=${String(n.act).padEnd(6)} rel->p=${(n.rel.p?.v ?? 0).toFixed(0).padStart(4)} mem=${n.mem.length}`);
}
console.log('Log tail:');
for (const l of sim.s.log.slice(-12)) console.log('  -', l.text);
if (fails) {
  console.error(`${fails} failure(s)`);
  process.exit(1);
}
console.log('OK');
