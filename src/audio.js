// Synthesised sound: effects, ambience and one radio station. Nothing plays
// until the first user gesture unlocks the AudioContext.

export class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicOn = false;
    this.vol = 0.7;
    this.musicVol = 0.6;
    this.amb = null;
    const unlock = () => {
      this.unlock();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock);
  }

  unlock() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.vol;
    this.master.connect(this.ctx.destination);
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.connect(this.master);
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = 0;
    this.musicBus.connect(this.master);
    this.ambBus = this.ctx.createGain();
    this.ambBus.gain.value = 0.0;
    this.ambBus.connect(this.master);
    this.noiseBuf = this.makeNoise();
    this.startAmbience();
    this.nextBeat = 0;
    this.step = 0;
  }

  setVolume(v) {
    this.vol = v;
    if (this.master) this.master.gain.value = v;
  }

  makeNoise() {
    const len = this.ctx.sampleRate * 2;
    const b = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  noise(t, dur, { freq = 1000, q = 1, type = 'bandpass', gain = 0.3, attack = 0.002, out = null, sweep = null } = {}) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(out || this.sfxBus);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  tone(t, dur, { freq = 440, type = 'sine', gain = 0.2, to = null, attack = 0.004, out = null, detune = 0 } = {}) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    o.detune.value = detune;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(out || this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  play(name) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.01;
    switch (name) {
      case 'punch':
        this.tone(t, 0.16, { freq: 150, to: 50, gain: 0.5 });
        this.noise(t, 0.08, { freq: 800, gain: 0.35, type: 'lowpass' });
        break;
      case 'thwack':
        this.tone(t, 0.12, { freq: 320, to: 90, gain: 0.35, type: 'triangle' });
        this.noise(t, 0.1, { freq: 2200, gain: 0.3, q: 2 });
        break;
      case 'swing': this.noise(t, 0.14, { freq: 600, sweep: 2400, gain: 0.12, q: 0.8 }); break;
      case 'whiff': this.noise(t, 0.18, { freq: 1800, sweep: 500, gain: 0.1, q: 0.7 }); break;
      case 'shot':
        // sharp crack, then a boom tail off the buildings
        this.noise(t, 0.05, { freq: 2600, q: 0.6, gain: 0.9, type: 'highpass' });
        this.noise(t, 0.38, { freq: 520, q: 0.5, gain: 0.7, type: 'lowpass', sweep: 120 });
        this.tone(t, 0.18, { freq: 140, to: 40, gain: 0.55 });
        break;
      case 'alert':
        this.tone(t, 0.09, { freq: 520, gain: 0.12, type: 'triangle' });
        this.tone(t + 0.1, 0.14, { freq: 390, gain: 0.12, type: 'triangle' });
        break;
      case 'thud':
        this.tone(t, 0.4, { freq: 90, to: 35, gain: 0.6 });
        this.noise(t, 0.25, { freq: 300, gain: 0.3, type: 'lowpass' });
        break;
      case 'door':
        this.noise(t, 0.35, { freq: 500, sweep: 900, gain: 0.08, q: 6 });
        this.tone(t + 0.25, 0.12, { freq: 110, to: 70, gain: 0.25 });
        break;
      case 'locked':
        this.tone(t, 0.06, { freq: 220, gain: 0.25, type: 'square' });
        this.tone(t + 0.09, 0.06, { freq: 180, gain: 0.25, type: 'square' });
        break;
      case 'pickup': this.tone(t, 0.08, { freq: 660, to: 990, gain: 0.15, type: 'triangle' }); break;
      case 'drop': this.tone(t, 0.1, { freq: 200, to: 90, gain: 0.25 }); break;
      case 'cash':
        this.tone(t, 0.12, { freq: 1318, gain: 0.12, type: 'triangle' });
        this.tone(t + 0.08, 0.25, { freq: 1760, gain: 0.12, type: 'triangle' });
        this.noise(t, 0.05, { freq: 6000, gain: 0.06, q: 3 });
        break;
      case 'coin': this.tone(t, 0.2, { freq: 1567, gain: 0.12, type: 'square' }); break;
      case 'eat':
        for (let i = 0; i < 4; i++) this.noise(t + i * 0.11, 0.06, { freq: 2500, gain: 0.12, q: 1.5 });
        break;
      case 'drink':
        this.tone(t, 0.12, { freq: 320, to: 160, gain: 0.18 });
        this.tone(t + 0.18, 0.12, { freq: 300, to: 150, gain: 0.18 });
        break;
      case 'click': this.tone(t, 0.03, { freq: 1800, gain: 0.1, type: 'square' }); break;
      case 'tick': this.tone(t, 0.06, { freq: 1200, gain: 0.08, type: 'triangle' }); break;
      case 'bell':
        this.tone(t, 0.9, { freq: 880, gain: 0.12 });
        this.tone(t, 0.7, { freq: 1320, gain: 0.06 });
        break;
      case 'plate':
        this.tone(t, 0.18, { freq: 2100, gain: 0.08, type: 'triangle' });
        this.tone(t + 0.02, 0.15, { freq: 2900, gain: 0.05, type: 'triangle' });
        break;
      case 'glass':
        this.noise(t, 0.3, { freq: 5000, gain: 0.25, q: 1, type: 'highpass' });
        for (let i = 0; i < 5; i++) this.tone(t + Math.random() * 0.25, 0.12, { freq: 2500 + Math.random() * 3000, gain: 0.05, type: 'triangle' });
        break;
      case 'crash':
        this.noise(t, 0.6, { freq: 400, gain: 0.6, type: 'lowpass' });
        this.tone(t, 0.4, { freq: 80, to: 30, gain: 0.6 });
        this.noise(t + 0.05, 0.5, { freq: 4000, gain: 0.2, type: 'highpass' });
        break;
      case 'bump':
        this.tone(t, 0.18, { freq: 120, to: 60, gain: 0.35 });
        this.noise(t, 0.12, { freq: 600, gain: 0.2, type: 'lowpass' });
        break;
      case 'card':
        this.noise(t, 0.12, { freq: 3000, gain: 0.08, q: 2 });
        this.tone(t + 0.3, 0.08, { freq: 1046, gain: 0.08, type: 'square' });
        this.tone(t + 0.42, 0.12, { freq: 1568, gain: 0.08, type: 'square' });
        break;
      default: break;
    }
  }

  // ---------------------------------------------------------------- ambience
  startAmbience() {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    this.ambFilter = c.createBiquadFilter();
    this.ambFilter.type = 'lowpass';
    this.ambFilter.frequency.value = 400;
    this.ambGain = c.createGain();
    this.ambGain.gain.value = 0.1;
    src.connect(this.ambFilter).connect(this.ambGain).connect(this.ambBus);
    src.start();
    // rain layer
    const r = c.createBufferSource();
    r.buffer = this.noiseBuf;
    r.loop = true;
    this.rainFilter = c.createBiquadFilter();
    this.rainFilter.type = 'highpass';
    this.rainFilter.frequency.value = 1200;
    this.rainGain = c.createGain();
    this.rainGain.gain.value = 0;
    r.connect(this.rainFilter).connect(this.rainGain).connect(this.ambBus);
    r.start();
  }

  // called each frame with what the listener can hear
  update(state) {
    if (!this.ctx) return;
    const c = this.ctx;
    const t = c.currentTime;
    const outdoors = state.outdoors;
    this.ambBus.gain.setTargetAtTime(0.9, t, 0.5);
    this.ambFilter.frequency.setTargetAtTime(outdoors ? 520 : 220, t, 0.4);
    this.ambGain.gain.setTargetAtTime(outdoors ? 0.18 : 0.07, t, 0.4);
    this.rainGain.gain.setTargetAtTime((state.rain || 0) * (outdoors ? 0.22 : 0.06), t, 0.6);
    const music = state.music;
    this.musicBus.gain.setTargetAtTime(music ? this.musicVol * (state.musicNear ? 0.28 : 0.12) : 0, t, 0.4);
    if (music) this.sequence();
    if (outdoors && Math.random() < 0.002) this.carPass();
    this.engineUpdate(state.engine ?? -1, state.skid || 0);
  }

  engineUpdate(rpm, skid) {
    const c = this.ctx;
    const t = c.currentTime;
    if (rpm >= 0 && !this.eng) {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      const o2 = c.createOscillator();
      o2.type = 'square';
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 500;
      const g = c.createGain();
      g.gain.value = 0;
      o.connect(f);
      o2.connect(f);
      f.connect(g).connect(this.sfxBus);
      o.start();
      o2.start();
      const sk = c.createBufferSource();
      sk.buffer = this.noiseBuf;
      sk.loop = true;
      const sf = c.createBiquadFilter();
      sf.type = 'bandpass';
      sf.frequency.value = 2200;
      sf.Q.value = 3;
      const sg = c.createGain();
      sg.gain.value = 0;
      sk.connect(sf).connect(sg).connect(this.sfxBus);
      sk.start();
      this.eng = { o, o2, f, g, sg };
    }
    if (!this.eng) return;
    const on = rpm >= 0;
    const r = Math.max(0, rpm);
    this.eng.o.frequency.setTargetAtTime(38 + r * 110, t, 0.08);
    this.eng.o2.frequency.setTargetAtTime(19 + r * 55, t, 0.08);
    this.eng.f.frequency.setTargetAtTime(300 + r * 1200, t, 0.1);
    this.eng.g.gain.setTargetAtTime(on ? 0.05 + r * 0.06 : 0, t, 0.15);
    this.eng.sg.gain.setTargetAtTime(on ? skid * 0.18 : 0, t, 0.05);
  }

  carPass() {
    const t = this.ctx.currentTime;
    this.noise(t, 2.5, { freq: 200, sweep: 600, gain: 0.08, type: 'lowpass', attack: 1.2, out: this.ambBus });
  }

  // KBYU 97.3: a slow, low groove. Cm7 - Abmaj7 - Fm7 - G7 at 68 bpm.
  sequence() {
    const c = this.ctx;
    const spb = 60 / 68 / 2; // eighth notes
    if (this.nextBeat < c.currentTime) this.nextBeat = c.currentTime + 0.05;
    const chords = [
      [130.81, 155.56, 196.0, 233.08],
      [103.83, 130.81, 155.56, 196.0],
      [87.31, 103.83, 130.81, 155.56],
      [98.0, 123.47, 146.83, 174.61],
    ];
    const out = this.musicBus;
    while (this.nextBeat < c.currentTime + 0.25) {
      const t = this.nextBeat;
      const s = this.step % 32;
      const bar = Math.floor(this.step / 8) % 4;
      const ch = chords[bar];
      // kick
      if (s % 8 === 0 || s % 8 === 3 || (s % 16 === 10)) this.tone(t, 0.35, { freq: 110, to: 38, gain: 0.55, out });
      // snare
      if (s % 8 === 4) {
        this.noise(t, 0.22, { freq: 1800, gain: 0.25, q: 0.7, out });
        this.tone(t, 0.12, { freq: 190, to: 140, gain: 0.15, type: 'triangle', out });
      }
      // hats
      this.noise(t, 0.04, { freq: 8000, gain: s % 2 ? 0.035 : 0.06, type: 'highpass', out });
      // bass
      if (s % 8 === 0 || s % 8 === 3 || s % 8 === 6) this.tone(t, spb * 2.2, { freq: ch[0] / 2, gain: 0.32, type: 'triangle', attack: 0.01, out });
      // pad
      if (s % 8 === 0) for (const f of ch) this.tone(t, spb * 7.5, { freq: f, gain: 0.03, type: 'sawtooth', attack: 0.3, out, detune: (Math.random() - 0.5) * 12 });
      // keys sprinkle
      if (s % 8 === 6 && Math.random() < 0.6) this.tone(t, 0.6, { freq: ch[1 + Math.floor(Math.random() * 3)] * 2, gain: 0.05, type: 'sine', out });
      this.nextBeat += spb;
      this.step++;
    }
  }
}
