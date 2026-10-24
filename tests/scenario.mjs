// Scripted walk through the first playable slice using only sim commands.
//   node tests/scenario.mjs

import { Sim, STEP } from '../src/sim/sim.js';
import { hm, DAY, tod } from '../src/sim/util.js';
import { cashOnBody } from '../src/sim/items.js';
import { relV } from '../src/sim/memory.js';

let fails = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '  ok ' : 'FAIL '} ${msg}`);
  if (!cond) fails++;
};

const sim = Sim.create({ seed: 99, name: 'Tess', dayLen: 600 });
const p = sim.player;
const run = (sec) => {
  for (let i = 0; i < sec / STEP; i++) {
    sim.step(STEP);
    sim.events.length = 0;
  }
};
const setTime = (hhmm) => {
  const day = Math.floor(sim.s.t / DAY);
  sim.s.t = day * DAY + hm(hhmm);
  sim.ai.abstract(1);
};
const goTo = (room, x, y) => {
  if (p.room !== room) sim.changeRoom(room, { x, y });
  else {
    p.x = x;
    p.y = y;
  }
};
const npc = (id) => sim.s.actors[id];

console.log('Rooms + doors');
ok(sim.world.nextDoor('apt_2b', 'diner')?.to === 'bayou_hall' && sim.world.hops('apt_2b', 'diner') === 3, 'apartment routes to the diner via the hallway and street');
goTo('apt_2b', 645, 470);
run(0.2);
p.x = 645;
p.y = 495;
run(0.2);
ok(p.room === 'bayou_hall', `walking into the apartment door leads to the hallway (now ${p.room})`);

console.log('Diner: buy and eat');
setTime('09:00');
goTo('diner', 450, 500);
run(3);
const rosa = npc('rosa');
ok(rosa.loaded && rosa.room === 'diner', `Rosa is at work in the diner (${rosa.room}, act ${rosa.act})`);
const cash0 = cashOnBody(sim, p);
sim.cmd('buy', { shop: 'diner', item: 'plate', npc: 'rosa' });
ok(cashOnBody(sim, p) === cash0 - 9, `plate costs $9 (cash ${cash0} -> ${cashOnBody(sim, p)})`);
ok(p.hands && sim.s.items[p.hands].def === 'plate', 'plate is in your hands');
p.stats.hunger = 20;
sim.edges.use = true;
run(0.1);
ok(p.stats.hunger > 60 && !p.hands, `eating fills hunger (${p.stats.hunger.toFixed(0)})`);

console.log('Talk tones move the number and get quoted');
const del = npc('delphine');
setTime('13:30');
goTo('st_pecan', 280, 1100);
run(4);
ok(del.loaded && del.room === 'st_pecan', `Ms. Okoro is out at the park (${del.room})`);
goTo('st_pecan', del.x + 20, del.y);
const r0 = relV(del, 'p');
for (let i = 0; i < 6; i++) {
  sim.cmd('npc_action', { id: 'delphine', action: 'talk' });
  if (!sim.dialog) break;
  let n = 0;
  while (sim.dialog && !sim.dialog.done && n++ < 4) sim.cmd('talk_tone', { tone: sim.dialog.offer ? 'accept' : 'easy' });
  sim.cmd('talk_close');
  run(2);
}
ok(relV(del, 'p') !== r0, `relationship moved: ${r0} -> ${relV(del, 'p').toFixed(0)}`);
ok(del.mem.some((m) => m.who === 'p'), `she remembers you: ${del.mem.map((m) => m.type).join(', ')}`);
sim.cmd('npc_action', { id: 'delphine', action: 'talk' });
const opener = sim.dialog && sim.dialog.log[0].text;
console.log('     opener:', opener);
sim.cmd('talk_close');

console.log('Favor: bring Ms. Okoro a plate');
del.rel.p.v = 20;
sim.work.startFavor('delphine_plate');
const fav = sim.s.favors.find((f) => f.id === 'delphine_plate');
ok(fav && fav.status === 'active', 'favor is active with a deadline');
sim.items.putInHands(sim, p, sim.items.newItem(sim, 'plate'));
const cashF = cashOnBody(sim, p);
sim.cmd('npc_action', { id: 'delphine', action: 'give' });
ok(fav.status === 'done', 'handing over the plate completes it');
ok(cashOnBody(sim, p) === cashF + 14, 'she paid $14');
ok(del.mem.some((m) => m.type === 'brought'), 'she remembers who brought the plate');

console.log('Diner shift');
setTime('10:00');
goTo('diner', 450, 400);
run(3);
let r = sim.work.askForWork(rosa);
ok(r.ok && sim.s.job.jobs.diner.hired, `hired: "${r.text}"`);
r = sim.work.askForWork(rosa);
ok(r.ok && sim.work.onShift(), `shift started: "${r.text}"`);
const cashS = cashOnBody(sim, p);
const workShift = () => {
  let guard = 0;
  while (sim.work.onShift() && guard++ < 60) {
    const t = sim.work.currentTask();
    if (t.room !== p.room) goTo(t.room, 400, 400);
    if (t.x !== undefined) {
      p.x = t.x;
      p.y = t.y;
      sim.work.shiftInteract(null, t.x, t.y);
    } else sim.work.shiftInteract(t.prop, p.x, p.y);
    run(3.5);
  }
};
workShift();
ok(!sim.work.onShift() && cashOnBody(sim, p) > cashS, `shift paid: $${cashS} -> $${cashOnBody(sim, p)}`);
ok(rosa.mem.some((m) => m.type === 'shift'), 'Rosa remembers the finished shift');

console.log('Fight: Dre drops you and your cash stays on the floor');
setTime('16:00');
goTo('gym', 400, 400);
run(4);
const dre = npc('dre');
ok(dre.loaded && dre.room === 'gym', `Dre is at the gym (${dre.room})`);
const cashBefore = cashOnBody(sim, p);
p.stats.health = 12;
goTo('gym', dre.x + 24, dre.y);
sim.fight.squareUp(dre, p, true);
let g2 = 0;
while (!p.downUntil && g2++ < 900) run(0.1);
ok(!!p.downUntil, 'player went down');
const fell = sim.s.flags.fellAt;
const loose = sim.s.rooms.gym.items.map((u) => sim.s.items[u]).filter((it) => it.def === 'cash' && it.lastOwner === 'p');
ok(loose.length && loose[0].n === cashBefore, `cash wad on the gym floor ($${loose[0]?.n}, had $${cashBefore})`);
run(4);
ok(!p.downUntil && cashOnBody(sim, p) === 0, `woke up elsewhere (${p.room}) with empty pockets`);
ok(dre.mem.length >= 0 && relV(dre, 'p') <= 0, 'Dre remembers the fight');

console.log('Bank, rent, courier, hospital');
setTime('10:00');
goTo('bank', 410, 420);
run(3);
const carmen = npc('carmen');
ok(carmen.loaded && sim.onDuty(carmen), `Carmen is at the teller window (${carmen.room}, ${carmen.act}, loaded=${carmen.loaded}, fight=${carmen.fightWith}, down=${carmen.downUntil})`);
sim.items.addCash(sim, p, 300);
const before = p.bank;
sim.cmd('deposit', { amt: 250, where: 'teller' });
ok(p.bank === before + 250 && p.bankLog.length > 0, `deposit lands in the bank ($${p.bank}) with a log entry`);
sim.cmd('deposit', { amt: 900, where: 'teller' });
ok(p.weekDeposits <= 1000, `weekly deposit cap holds (${p.weekDeposits})`);
sim.cmd('withdraw', { amt: 40, where: 'atm' });
ok(cashOnBody(sim, p) >= 40, 'withdraw puts cash back in your pocket');
p.stats.intellect = 60;
p.stats.reputation = 50;
let rr = sim.work.askForWork(carmen);
rr = sim.work.askForWork(carmen);
ok(sim.work.onShift() && sim.s.job.shift.job === 'courier', `courier shift started: "${rr.text}"`);
const crossRooms = new Set(sim.s.job.shift.tasks.map((t) => t.room));
ok(crossRooms.size > 1, `courier tasks cross town: ${[...crossRooms].join(', ')}`);
const cashC = cashOnBody(sim, p);
workShift();
ok(!sim.work.onShift() && cashOnBody(sim, p) > cashC, `courier shift paid ($${cashC} -> $${cashOnBody(sim, p)})`);
const L = sim.money.lease('apt_2b');
sim.s.t = L.due + 5;
run(1);
ok(L.overdue, 'rent goes overdue after Sunday night');
const hallDoor = sim.world.door('bayou_hall', '2B');
ok(!sim.canEnter(hallDoor).ok, `locked out: "${sim.canEnter(hallDoor).text}"`);
sim.items.addCash(sim, p, 200);
sim.cmd('pay_rent', { lease: 'apt_2b' });
ok(!L.overdue && sim.canEnter(hallDoor).ok, 'paying rent unlocks the door');
p.stats.health = 1;
goTo('st_main', 700, 570);
sim.playerDown(null);
run(4);
ok(p.room === 'hospital', `knocked out on the street, woke up in ${p.room}`);

console.log('Cars + licenses');
p.stats.health = 100;
const car = Object.values(sim.s.cars).find((c) => c.owner === 'p');
ok(!!car, `you start with a car (${car && car.plate})`);
const keys = sim.items.newItem(sim, 'carkeys', { car: car.id });
sim.items.putInCont(sim, keys, p.pockets);
goTo(car.room, car.x, car.y - 40);
ok(sim.cars.enter(car) && p.car === car.id, 'you can get in with the keys');
sim.driveInput = null;
sim.input.mx = 0;
sim.input.my = -1;
run(1.5);
ok(sim.cars.speed(car) < 5, `no license, no start (speed ${sim.cars.speed(car).toFixed(0)})`);
sim.input.my = 0;
sim.cars.exit(true);
goTo('precinct', 675, 300);
sim.items.addCash(sim, p, 100);
sim.cmd('test_start', { id: 'driver' });
const tm = sim.ui.modal;
ok(tm && tm.type === 'test' && tm.items.length === 5, 'driver test starts with 5 questions');
for (const q of tm.items) sim.cmd('test_answer', { choice: q.right });
ok(p.licenses.driver, 'answering right gets you a license');
sim.ui.modal = null;
goTo(car.room, car.x, car.y - 40);
sim.cars.enter(car);
car.rot = Math.PI;
car.x = 300; car.y = 640;
sim.input.my = -1;
run(1.2);
const sp1 = sim.cars.speed(car);
ok(sp1 > 120, `with a license it drives (speed ${sp1.toFixed(0)})`);
const front0 = car.dmg.front;
run(3);
ok(car.dmg.front > front0, `driving into the barricade dents the front (${front0.toFixed(2)} -> ${car.dmg.front.toFixed(2)})`);
sim.input.my = 0;
run(1);
const f0 = car.fuel;
car.fuel = 10;
const cashB = cashOnBody(sim, p);
sim.cmd('refuel', { car: car.id });
ok(car.fuel > 10 && cashOnBody(sim, p) < cashB, `refuel costs cash (${cashB} -> ${cashOnBody(sim, p)})`);
sim.cars.exit(true);
setTime('09:00');
const lupe = npc('lupe');
lupe.room = 'depot';
lupe.transit = null;
lupe.loaded = false;
goTo('depot', 360, 300);
run(3);
p.stats.intellect = 60;
sim.work.askForWork(lupe);
const rt = sim.work.askForWork(lupe);
ok(sim.work.onShift() && sim.s.job.shift.job === 'taxi', `cab shift started: "${rt.text}"`);
const cab = sim.s.cars[sim.s.job.shift.car];
ok(cab && cab.job === 'taxi', 'a company cab is waiting');
goTo(cab.room, cab.x, cab.y - 40);
sim.cars.enter(cab);
let g3 = 0;
const cashT = cashOnBody(sim, p);
while (sim.work.onShift() && g3++ < 30) {
  const t = sim.work.currentTask();
  cab.room = t.room; cab.x = t.x; cab.y = t.y; cab.vx = cab.vy = 0;
  sim.syncDriver();
  run(0.3);
}
ok(!sim.work.onShift() && cashOnBody(sim, p) > cashT && !sim.s.cars[cab.id], `cab shift paid and cab returned ($${cashT} -> $${cashOnBody(sim, p)})`);

console.log('Save / load');
const blob = sim.serialize();
const sim2 = Sim.load(blob);
ok(sim2.s.t === sim.s.t, 'clock restored');
ok(JSON.stringify(sim2.s.actors.delphine.mem) === JSON.stringify(del.mem), 'memories restored');
ok(sim2.s.rooms.gym.items.length === sim.s.rooms.gym.items.length, 'item positions restored');

if (fails) {
  console.error(`\n${fails} failure(s)`);
  process.exit(1);
}
console.log('\nAll scenario checks passed.');
