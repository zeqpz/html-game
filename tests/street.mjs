// Street life, combat controls, backgrounds and permadeath.
//   node tests/street.mjs

import { Sim, STEP } from '../src/sim/sim.js';
import { hm, DAY } from '../src/sim/util.js';
import { cashOnBody } from '../src/sim/items.js';
import { scratch } from '../src/sim/actors.js';
import { MODELS } from '../src/data/cars.js';

let fails = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '  ok ' : 'FAIL '} ${msg}`);
  if (!cond) fails++;
};

console.log('Backgrounds');
const ath = Sim.create({ seed: 5, name: 'Ash', origin: 'athlete', alloc: { aim: 5, strength: 9 } });
ok(ath.player.stats.strength === 30 + 12 + 8 * 3, `athlete + 8 capped points: strength ${ath.player.stats.strength}`);
ok(ath.player.stats.aim === 8 + 2 * 3, `only 10 points total: aim gets the last 2 (${ath.player.stats.aim})`);
ok(ath.s.actors.dre.rel.p.v === 15, 'the gym crowd knows the athlete');
const mech = Sim.create({ seed: 6, name: 'Mo', origin: 'mechanic' });
const mcar = Object.values(mech.s.cars).find((c) => c.owner === 'p');
ok(mcar.dmg.front === 0 && mcar.fuel === MODELS[mcar.model].tank, "mechanic's kid starts with the sedan fixed and full");
ok(cashOnBody(mech, mech.player) === 35, 'mechanic starts with $35');
ok(cashOnBody(Sim.create({ seed: 7, name: 'N' }), Sim.create({ seed: 7, name: 'N' }).player) === 95, 'fresh off the bus starts with $95');

const sim = Sim.create({ seed: 31, name: 'Vic', origin: 'newcomer' });
const p = sim.player;
const run = (sec) => {
  for (let i = 0; i < sec / STEP; i++) {
    sim.step(STEP);
    sim.events.length = 0;
  }
};
const said = [];
const runListen = (sec) => {
  for (let i = 0; i < sec / STEP; i++) {
    sim.step(STEP);
    for (const e of sim.events) if (e.type === 'say') said.push(e);
    sim.events.length = 0;
  }
};
sim.s.t = DAY + hm('12:00');
sim.changeRoom('st_pecan', { x: 420, y: 830 });
run(3);
const strangers = () => Object.values(sim.s.actors).filter((a) => a.extra && !a.dead);

console.log('Crowds');
const here = strangers().filter((a) => a.room === 'st_pecan');
ok(here.length >= 5, `strangers walk the block at noon (${here.length} on Pecan, ${strangers().length} loaded total)`);
run(6);
ok(strangers().some((a) => a.act === 'walk'), 'they move around');

console.log('Bumps');
const v = strangers().find((a) => a.room === 'st_pecan' && a.extra === 'walker' && !a.fightWith) || strangers()[0];
v.extra = 'walker';
v.personality = 'steady';
v.leaveAt = sim.s.t + 999;
const bumpInto = () => {
  if (scratch(v).bumpAt) scratch(v).bumpAt = sim.time - 1;
  p.x = v.x - 12;
  p.y = v.y;
  const _ = scratch(p);
  _.vx = 120;
  _.vy = 0;
  sim.separate();
};
said.length = 0;
bumpInto();
runListen(0.1);
ok(said.some((e) => e.id === v.id), `first bump: "${said.find((e) => e.id === v.id)?.text}"`);
ok(!v.fightWith, 'one bump is an accident');
bumpInto();
bumpInto();
ok(!v.fightWith, 'three bumps: warnings only');
bumpInto();
ok(v.fightWith === 'p', 'keep bumping and they want to fight');
v.fightWith = null;
v.act = 'idle';

console.log('Loose weapons get picked up');
const scav = strangers().find((a) => a.room === 'st_pecan' && a !== v);
scav.extra = 'scavenger';
scav.leaveAt = sim.s.t + 999;
if (scav.hands) sim.items.destroy(sim, sim.s.items[scav.hands]);
const knife = sim.items.newItem(sim, 'knife');
sim.items.placeGround(sim, knife, 'st_pecan', scav.x + 60, scav.y);
p.x = scav.x + 200;
p.y = scav.y;
for (let i = 0; i < 40 && scav.hands !== knife.uid; i++) run(0.25);
ok(scav.hands === knife.uid, `a scrounger picks the knife up and holds it (${scav.hands ? sim.s.items[scav.hands].def : 'nothing'})`);

console.log('Hold-up');
const thug = strangers().find((a) => a.room === 'st_pecan' && a !== v && a !== scav);
thug.extra = 'thug';
thug.leaveAt = sim.s.t + 999;
p.x = thug.x + 30;
p.y = thug.y;
const cashM = cashOnBody(sim, p);
sim.street.startMug(thug);
ok(sim.ui.modal && sim.ui.modal.type === 'mug', 'a mugger demands your pockets');
const tc = thug.cash;
sim.cmd('mug_reply', { choice: 'pay' });
ok(cashOnBody(sim, p) === 0 && thug.cash === tc + cashM, `paying hands over all your cash ($${cashM})`);
ok(!sim.ui.modal, 'the hold-up ends');

console.log('Click to attack');
const tgt = v;
p.x = tgt.x - 20;
p.y = tgt.y;
p.face = 'up';
p.stats.stamina = 100;
tgt.stats.agility = 0;
scratch(tgt).iframe = 0;
const h0 = tgt.stats.health;
let landed = false;
for (let i = 0; i < 6 && !landed; i++) {
  scratch(p).cd = 0;
  sim.edges.strike = true;
  sim.edges.aim = { x: tgt.x, y: tgt.y - 20 };
  run(0.4);
  landed = tgt.stats.health < h0;
}
ok(p.face === 'right', `aiming turns you toward the cursor (facing ${p.face})`);
ok(landed, `the swing lands on whoever you aimed at (${h0} -> ${tgt.stats.health})`);
ok(!scratch(p).backT, 'space no longer hops backward');

console.log('Strangers can die');
tgt.stats.health = 1;
const gun = sim.items.newItem(sim, 'revolver');
gun.ammo = 6;
sim.items.putInHands(sim, p, gun);
p.stats.aim = 100;
scratch(p).cd = 0;
tgt.downUntil = 0;
let tries = 0;
while (!tgt.dead && tries++ < 8) {
  scratch(p).cd = 0;
  sim.fight.strike(p, { x: tgt.x, y: tgt.y - 20 });
}
ok(tgt.dead, `a bullet kills a stranger (${tries} shots)`);
ok(p.heat > 40, `killing brings serious heat (${p.heat.toFixed(0)})`);

console.log('Save skips strangers');
const blob = JSON.parse(sim.serialize());
ok(!Object.values(blob.actors).some((a) => a.extra), 'strangers are not saved');
ok(!blob.items[knife.uid], "what they carry isn't saved either");
const reload = Sim.load(sim.serialize());
ok(!!reload.player, 'save loads');

console.log('Permadeath');
p.stats.health = 5;
const stabber = strangers().find((a) => a.room === 'st_pecan' && !a.dead) || scav;
const blade = sim.items.newItem(sim, 'knife');
if (stabber.hands) sim.items.destroy(sim, sim.s.items[stabber.hands]);
sim.items.putInHands(sim, stabber, blade);
scratch(p).iframe = 0;
p.stats.agility = 0;
let hits = 0;
while (!p.dead && hits++ < 20) sim.fight.hit(stabber, p, sim.fight.weapon(stabber));
ok(p.dead && sim.s.death && sim.s.death.cause === 'stabbed', `a knife can kill you (${sim.s.death && sim.s.death.how})`);
run(1);
ok(p.dead && !p.downUntil, 'no hospital wake-up after dying');
const dead = Sim.load(sim.serialize());
ok(dead.player.dead && dead.s.death.name === 'Vic', 'death survives a reload');
const fists = Sim.create({ seed: 8, name: 'KO' });
fists.player.stats.health = 1;
fists.playerDown(fists.s.actors.dre, 'beaten');
ok(!fists.player.dead && fists.player.downUntil > 0, 'a fistfight knockout still lands you in the ER');

console.log('Leaving a block clears its strangers');
sim.player.dead = false;
sim.changeRoom('apt_2b', { x: 300, y: 330 });
ok(strangers().length === 0, 'indoors, the street crowd is gone');

if (fails) {
  console.error(`\n${fails} failure(s)`);
  process.exit(1);
}
console.log('\nAll street checks passed.');
