// Boot + main loop. Fixed simulation steps (frame-rate independent), one
// canvas view, a DOM overlay, local saves as versioned JSON blobs.

import { Sim, STEP, SAVE_VERSION } from './sim/sim.js';
import { View } from './view/view.js';
import { UI } from './ui/ui.js';
import { Input } from './input.js';
import { Audio } from './audio.js';
import { clock12, weekday, dayOf, hm, DAY, money } from './sim/util.js';
import { cashOnBody } from './sim/items.js';

const KEYS = { auto: 'htown-nights.auto', manual: 'htown-nights.save', settings: 'htown-nights.settings' };

function store() {
  try {
    const k = '__t';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return localStorage;
  } catch {
    return null;
  }
}

class Game {
  constructor() {
    this.canvas = document.getElementById('view');
    this.view = new View(this.canvas);
    this.input = new Input();
    this.audio = new Audio();
    this.ls = store();
    this.settings = { volume: 0.7, music: 0.6, dayLen: 600, ...this.readJSON(KEYS.settings) };
    this.ui = new UI(this);
    this.input.onKey = (e) => this.ui.key(e);
    this.sim = null;
    this.playing = false;
    this.acc = 0;
    this.last = performance.now();
    this.lastSave = 0;
    this.demo = this.makeDemo();
    this.applySettings();
    this.ui.showTitle(this.hasSave(), this.saveSummary());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.playing) this.save('auto');
    });
    window.addEventListener('pagehide', () => {
      if (this.playing) this.save('auto');
    });
    requestAnimationFrame((t) => this.loop(t));
  }

  readJSON(key) {
    if (!this.ls) return null;
    try {
      return JSON.parse(this.ls.getItem(key) || 'null');
    } catch {
      return null;
    }
  }

  applySettings() {
    this.audio.setVolume(this.settings.volume);
    this.audio.musicVol = this.settings.music;
    if (this.ls) this.ls.setItem(KEYS.settings, JSON.stringify(this.settings));
  }

  makeDemo() {
    const d = Sim.create({ seed: 4242, name: 'Demo' });
    d.s.t = DAY + hm('20:40');
    const p = d.player;
    p.room = 'st_pecan';
    p.x = 720;
    p.y = 640;
    p.stats.mind = 100;
    d.refreshLoaded(true);
    return d;
  }

  // ------------------------------------------------------------ saves
  save(kind = 'auto') {
    if (!this.sim || !this.ls) return false;
    const p = this.sim.player;
    const blob = {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      summary: { name: p.name, t: this.sim.s.t, cash: cashOnBody(this.sim, p) },
      data: this.sim.serialize(),
    };
    try {
      this.ls.setItem(kind === 'manual' ? KEYS.manual : KEYS.auto, JSON.stringify(blob));
      this.lastSave = performance.now();
      return true;
    } catch (e) {
      this.ui.toast('Could not save (storage full or blocked).', 'bad');
      return false;
    }
  }

  saves() {
    return [KEYS.auto, KEYS.manual].map((k) => ({ k, b: this.readJSON(k) })).filter((x) => x.b && x.b.data);
  }

  hasSave() {
    return this.saves().length > 0;
  }

  saveSummary() {
    const s = this.saves().sort((a, b) => b.b.savedAt - a.b.savedAt)[0];
    if (!s) return '';
    const m = s.b.summary;
    return `${m.name} · ${weekday(m.t)} ${clock12(m.t)}, day ${dayOf(m.t)} · ${money(m.cash)}`;
  }

  loadLatest() {
    const s = this.saves().sort((a, b) => b.b.savedAt - a.b.savedAt)[0];
    if (!s) return;
    try {
      this.start(Sim.load(s.b.data));
      this.ui.toast('Welcome back.', 'good');
    } catch (e) {
      console.error(e);
      this.ui.toast(`Save could not be loaded: ${e.message}`, 'bad');
    }
  }

  newGame(name, look, dayLen) {
    this.settings.dayLen = dayLen;
    this.applySettings();
    const sim = Sim.create({ name, look, dayLen });
    this.start(sim);
    this.ui.toast('Your apartment. Your life. Press E near things.', '');
    this.save('auto');
  }

  start(sim) {
    this.sim = sim;
    this.playing = true;
    this.acc = 0;
    this.view.cam.room = null;
    this.ui.closePanel();
    this.ui.closePause();
    this.ui.hideTitle();
    this.view.demo = false;
  }

  toTitle() {
    this.playing = false;
    this.sim = null;
    this.ui.closePanel();
    this.ui.showTitle(this.hasSave(), this.saveSummary());
  }

  // ------------------------------------------------------------ loop
  loop(now) {
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const sim = this.playing ? this.sim : this.demo;
    this.view.demo = !this.playing;
    if (this.playing) {
      const blocked = this.ui.blocking();
      const mv = this.input.move();
      const edges = this.input.take();
      if (!blocked) {
        sim.input.mx = mv.x;
        sim.input.my = mv.y;
        sim.input.sprint = mv.sprint;
        sim.input.hand = mv.hand;
        Object.assign(sim.edges, edges);
        this.acc += dt;
        let n = 0;
        while (this.acc >= STEP && n < 8) {
          sim.step(STEP);
          this.acc -= STEP;
          n++;
        }
        if (n === 8) this.acc = 0;
      }
    } else {
      this.acc += dt;
      while (this.acc >= STEP) {
        sim.step(STEP);
        this.acc -= STEP;
      }
    }
    this.view.consume(sim);
    if (this.playing) {
      this.ui.consume(sim);
      for (const e of sim.events) if (e.type === 'sfx') this.audio.play(e.name);
    }
    sim.events.length = 0;
    this.view.render(sim, dt);
    if (this.playing) this.ui.frame(dt);
    const room = sim.world.room(sim.player.room);
    const rs = sim.s.rooms[sim.player.room] || {};
    const car = this.playing && sim.player.car ? sim.s.cars[sim.player.car] : null;
    this.audio.update({
      outdoors: room && room.kind === 'street',
      rain: sim.weather.rain,
      music: !this.playing || rs.radio || (rs.music && rs.music > sim.s.t) || (car && car.radio),
      musicNear: this.playing,
      engine: car && sim.player.licenses.driver && car.fuel > 0 ? car.rpm || 0 : -1,
      skid: car ? car.skid || 0 : 0,
    });
    if (this.playing && sim.wantSave && now - this.lastSave > 20000) {
      sim.wantSave = false;
      this.save('auto');
    }
    requestAnimationFrame((t) => this.loop(t));
  }
}

window.game = new Game();
