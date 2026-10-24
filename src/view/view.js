// The canvas view. Reads simulation state and draws it; never changes rules.

import { paintInterior, paintStreet, RES_IN, RES_ST } from './paint.js';
import { propParts, featureParts, canopyPart, drawItem, drawCar } from './sprites.js';
import { drawPerson } from './people.js';
import { makeCanvas, shade, alpha, fillRR, circle, ellipse, line, text } from './gfx.js';
import { scratch } from '../sim/actors.js';
import { ITEMS } from '../data/items.js';
import { CELL } from '../data/rooms.js';
import { tod, clamp, lerp } from '../sim/util.js';
import { displayTag } from '../sim/memory.js';
import { JOBS } from '../data/work.js';

// People are drawn a little larger than true scale so faces and clothes read.
export const CHAR_SCALE = 1.36;

const TAG_COLOR = { friend: '#7be495', rival: '#ff6b5e', boss: '#ffd23f', crew: '#c792ff', neighbor: '#9fd3ff', stranger: '#f1ede4' };

export class View {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.backdrops = new Map();
    this.parts = new Map();
    this.cam = { x: 0, y: 0, zoom: 1.5, rot: 0, room: null };
    this.bubbles = new Map();
    this.floats = [];
    this.particles = [];
    this.fade = 0;
    this.shake = 0;
    this.flash = 0;
    this.snapT = 0;
    this.downT = 0;
    this.time = 0;
    this.lightCanvas = null;
    this.dpr = 1;
    this.W = 0;
    this.H = 0;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = this.canvas.clientWidth || window.innerWidth;
    const H = this.canvas.clientHeight || window.innerHeight;
    if (W !== this.W || H !== this.H || dpr !== this.dpr) {
      this.W = W;
      this.H = H;
      this.dpr = dpr;
      this.canvas.width = Math.round(W * dpr);
      this.canvas.height = Math.round(H * dpr);
      this.lightCanvas = makeCanvas(Math.ceil(W / 2), Math.ceil(H / 2));
    }
  }

  backdrop(room) {
    let b = this.backdrops.get(room.id);
    if (!b) {
      b = room.kind === 'street' ? { canvas: paintStreet(room), res: RES_ST } : { canvas: paintInterior(room), res: RES_IN };
      this.backdrops.set(room.id, b);
      // keep memory in check on phones
      if (this.backdrops.size > 8) this.backdrops.delete(this.backdrops.keys().next().value);
    }
    return b;
  }

  roomParts(room) {
    let p = this.parts.get(room.id);
    if (!p) {
      const sprites = [];
      const canopies = [];
      for (const prop of room.props) {
        if (prop.wall || prop.street) {
          if (prop.street) for (const part of propParts(prop)) sprites.push(part);
          continue;
        }
        for (const part of propParts(prop)) sprites.push(part);
      }
      for (const f of room.features || []) {
        if (f.type === 'bench') continue; // drawn via its prop
        for (const part of featureParts(f)) sprites.push(part);
        const cp = canopyPart(f);
        if (cp) canopies.push({ ...cp, f });
      }
      const poles = (room.features || []).filter((f) => f.type === 'pole');
      p = { sprites, canopies, poles };
      this.parts.set(room.id, p);
    }
    return p;
  }

  // ------------------------------------------------------------ events
  consume(sim) {
    for (const e of sim.events) {
      switch (e.type) {
        case 'say': this.bubbles.set(e.id, { text: e.text, t: 0, life: 2.6 + e.text.length * 0.045 }); break;
        case 'float': this.floats.push({ ...e, t: 0 }); break;
        case 'hit':
          for (let i = 0; i < 7; i++) this.particles.push({ room: e.room, x: e.x, y: e.y, vx: (Math.random() - 0.5) * 140, vy: (Math.random() - 0.8) * 120, t: 0, life: 0.35, color: '#fff3c4', r: 1.6 });
          break;
        case 'shake': this.shake = Math.max(this.shake, e.amt); break;
        case 'room':
          if (e.how !== 'edge') this.fade = 1;
          break;
        case 'snap': this.snapT = 4; break;
        case 'down': if (e.id === 'p') this.downT = 3; break;
        case 'respawn': this.fade = 1; this.downT = 0; break;
        default: break;
      }
    }
  }

  // ------------------------------------------------------------ main
  render(sim, dt) {
    this.time += dt;
    this.resize();
    const ctx = this.ctx;
    const p = sim.player;
    const room = sim.world.room(p.room);
    const W = this.W;
    const H = this.H;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#0d0d10';
    ctx.fillRect(0, 0, W, H);
    if (!room || room.kind === 'offmap') return;

    // camera
    const street = room.kind === 'street';
    const fitH = street ? 620 : room.h + 30;
    const fitW = street ? 900 : room.w + 30;
    let zoom = Math.min(H / fitH, W / fitW);
    zoom = clamp(street ? zoom : Math.max(zoom, Math.min(H / 420, 1.25)), 0.55, 2.6);
    if (W < 700) zoom = Math.max(zoom, street ? 0.8 : 0.85);
    if (this.cam.room !== room.id) {
      this.cam.x = p.x;
      this.cam.y = p.y - 20;
      this.cam.room = room.id;
    }
    this.cam.zoom = lerp(this.cam.zoom, zoom, Math.min(1, dt * 6));
    const z = this.cam.zoom;
    const halfW = W / 2 / z;
    const halfH = H / 2 / z;
    let tx = p.x;
    let ty = p.y - 24;
    if (this.demo) {
      // title screen: drift slowly around the intersection
      tx = 700 + Math.cos(this.time * 0.05) * 330;
      ty = 690 + Math.sin(this.time * 0.07) * 260;
    }
    if (!street) {
      tx = room.w <= halfW * 2 ? room.w / 2 : clamp(tx, halfW, room.w - halfW);
      ty = room.h < halfH * 2 ? room.h / 2 : clamp(ty, halfH, room.h - halfH);
    } else {
      if (!room.edges.w) tx = Math.max(tx, halfW - 30);
      if (!room.edges.e) tx = Math.min(tx, CELL - halfW + 30);
      if (!room.edges.n) ty = Math.max(ty, halfH - 30);
      if (!room.edges.s) ty = Math.min(ty, CELL - halfH + 30);
    }
    const k = Math.min(1, dt * 7);
    this.cam.x = lerp(this.cam.x, tx, k);
    this.cam.y = lerp(this.cam.y, ty, k);
    let sx = 0;
    let sy = 0;
    if (this.shake > 0) {
      sx = (Math.random() - 0.5) * this.shake;
      sy = (Math.random() - 0.5) * this.shake;
      this.shake = Math.max(0, this.shake - dt * 40);
    }
    const toScreen = (wx, wy) => [(wx - this.cam.x) * z + W / 2 + sx, (wy - this.cam.y) * z + H / 2 + sy];
    this.toScreen = toScreen;

    ctx.save();
    ctx.translate(W / 2 + sx, H / 2 + sy);
    ctx.scale(z, z);
    ctx.translate(-this.cam.x, -this.cam.y);

    // which rooms are drawn: this one, plus streamed street neighbours
    const visible = [{ room, ox: 0, oy: 0 }];
    if (street) {
      for (const id of sim.loaded) {
        if (id === room.id) continue;
        const r = sim.world.room(id);
        if (r && r.kind === 'street') visible.push({ room: r, ox: (r.grid[0] - room.grid[0]) * CELL, oy: (r.grid[1] - room.grid[1]) * CELL });
      }
    }

    const wx = sim.weather;
    const light = this.lighting(sim, room, wx);

    for (const v of visible) {
      if (v.room.kind === 'interior') this.drawWindows(ctx, v.room, light, wx);
      const b = this.backdrop(v.room);
      ctx.drawImage(b.canvas, v.ox, v.oy, b.canvas.width / b.res, b.canvas.height / b.res);
    }

    // ground layer: items, shift markers
    for (const v of visible) this.drawGround(ctx, sim, v);
    this.drawShiftMarkers(ctx, sim, room);

    // depth-sorted layer
    const list = [];
    for (const v of visible) {
      const parts = this.roomParts(v.room);
      for (const sp of parts.sprites) list.push({ key: sp.key + v.oy, sp, ox: v.ox, oy: v.oy });
    }
    for (const id in sim.s.actors) {
      const a = sim.s.actors[id];
      if (!a.loaded && id !== 'p') continue;
      if (id === 'p' && this.demo) continue;
      const v = visible.find((q) => q.room.id === a.room);
      if (!v) continue;
      if (a.act === 'drive') continue;
      let key = a.y + v.oy;
      if (a.spot) key = a.y + v.oy + 0.2;
      list.push({ key, actor: a, ox: v.ox, oy: v.oy });
    }
    list.sort((A, B) => A.key - B.key);
    const target = this.demo ? null : sim.target();
    for (const d of list) {
      if (d.sp) ctx.drawImage(d.sp.canvas, d.sp.ox + d.ox, d.sp.oy + d.oy, d.sp.w, d.sp.h);
      else this.drawActor(ctx, sim, d.actor, d.ox, d.oy, target);
    }

    this.drawDynamicDecor(ctx, sim, room);
    // particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const q = this.particles[i];
      q.t += dt;
      if (q.t > q.life) {
        this.particles.splice(i, 1);
        continue;
      }
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vy += 300 * dt;
      if (q.room === room.id) circle(ctx, q.x, q.y, q.r * (1 - q.t / q.life), q.color);
    }

    // overhead layer
    for (const v of visible) {
      const parts = this.roomParts(v.room);
      this.drawPowerLines(ctx, parts.poles, v);
      for (const cp of parts.canopies) {
        const under = p.room === v.room.id && Math.abs(p.x - cp.f.x) < (cp.f.r || 50) && p.y < cp.f.y + 30 && p.y > cp.f.y - (cp.f.r || 50) * 1.6;
        ctx.globalAlpha = under ? 0.45 : 0.96;
        ctx.drawImage(cp.canvas, cp.ox + v.ox, cp.oy + v.oy, cp.w, cp.h);
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();

    // screen-space passes
    this.drawLight(ctx, sim, room, visible, light, z, sx, sy);
    if (street && wx.rain > 0.02) this.drawRain(ctx, wx, W, H);
    this.drawLabels(ctx, sim, room, visible, target, dt);
    this.drawFloats(ctx, dt);
    this.drawScreenFx(ctx, sim, dt, W, H);
  }

  // ------------------------------------------------------------ lighting model
  lighting(sim, room, wx) {
    const m = tod(sim.s.t);
    let day;
    if (m < 330) day = 0;
    else if (m < 430) day = (m - 330) / 100;
    else if (m < 1110) day = 1;
    else if (m < 1240) day = 1 - (m - 1110) / 130;
    else day = 0;
    const dusk = (m > 1050 && m < 1260) ? Math.sin(((m - 1050) / 210) * Math.PI) : (m > 320 && m < 450) ? Math.sin(((m - 320) / 130) * Math.PI) * 0.7 : 0;
    const outdoor = room.kind === 'street';
    let dark = outdoor ? (1 - day) * 0.74 + wx.cloud * 0.12 * day + wx.rain * 0.12 : (1 - day) * 0.18;
    const lightsOff = room.def.home && sim.s.sleepUntil;
    if (lightsOff) dark = (1 - day) * 0.62 + 0.1;
    return { day, dusk, dark: clamp(dark, 0, 0.85), outdoor, lightsOff };
  }

  skyColor(L, wx) {
    const night = [16, 26, 52];
    const dayC = [150, 200, 235];
    const duskC = [240, 150, 100];
    const grey = [150, 160, 168];
    let c = dayC.map((v, i) => lerp(night[i], v, L.day));
    c = c.map((v, i) => lerp(v, duskC[i], L.dusk * 0.6));
    c = c.map((v, i) => lerp(v, grey[i] * (0.4 + L.day * 0.6), wx.cloud * 0.55));
    return c;
  }

  drawWindows(ctx, room, L, wx) {
    const sky = this.skyColor(L, wx);
    for (const w of room.def.windows || []) {
      const g = ctx.createLinearGradient(0, w.y, 0, w.y + w.h);
      g.addColorStop(0, `rgb(${sky[0] * 0.85},${sky[1] * 0.85},${sky[2] * 0.95})`);
      g.addColorStop(1, `rgb(${Math.min(255, sky[0] * 1.15)},${Math.min(255, sky[1] * 1.1)},${sky[2]})`);
      ctx.fillStyle = g;
      ctx.fillRect(w.x, w.y, w.w, w.h);
      // skyline across the street
      ctx.fillStyle = `rgba(20,24,32,${0.55 + (1 - L.day) * 0.3})`;
      let bx = w.x;
      let i = 0;
      while (bx < w.x + w.w) {
        const bw = 14 + ((i * 37) % 22);
        const bh = 10 + ((i * 53) % 26);
        ctx.fillRect(bx, w.y + w.h - bh, bw, bh);
        if (L.day < 0.5) {
          ctx.fillStyle = 'rgba(255,214,140,0.7)';
          for (let k = 0; k < 3; k++) if ((i + k) % 2) ctx.fillRect(bx + 3 + k * 4, w.y + w.h - bh + 4, 2, 2);
          ctx.fillStyle = `rgba(20,24,32,${0.55 + (1 - L.day) * 0.3})`;
        }
        bx += bw + 2;
        i++;
      }
      if (wx.rain > 0.05) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(w.x, w.y, w.w, w.h);
        ctx.clip();
        ctx.strokeStyle = `rgba(200,215,230,${0.35 * wx.rain + 0.15})`;
        ctx.lineWidth = 1;
        for (let k = 0; k < w.w * wx.rain * 0.6; k++) {
          const rx = w.x + ((k * 73.13 + this.time * 40) % w.w);
          const ry = w.y + ((k * 41.7 + this.time * 260) % w.h);
          line(ctx, rx, ry, rx - 2, ry + 7, ctx.strokeStyle, 1);
        }
        ctx.restore();
      }
    }
  }

  drawGround(ctx, sim, v) {
    const rs = sim.s.rooms[v.room.id];
    if (!rs) return;
    for (const u of rs.items) {
      const it = sim.s.items[u];
      if (!it) continue;
      const x = it.x + v.ox;
      const y = it.y + v.oy;
      ellipse(ctx, x + 1, y + 3, 9, 3.4, 'rgba(0,0,0,0.3)');
      ctx.save();
      ctx.translate(x, y - 2);
      drawItem(ctx, it.def, 18, it);
      ctx.restore();
      if (ITEMS[it.def].kind === 'cash' || it.favor) {
        const g = 0.5 + 0.5 * Math.sin(this.time * 4 + x);
        circle(ctx, x + 5, y - 7, 1.4 + g, `rgba(255,255,220,${0.4 + g * 0.5})`);
      }
    }
  }

  drawShiftMarkers(ctx, sim, room) {
    const sh = sim.s.job.shift;
    if (!sh) return;
    const task = sim.work.currentTask();
    if (!task) return;
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 5);
    const arrow = (ax, ay) => {
      ctx.fillStyle = '#ffd23f';
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ax - 8, ay - 10);
      ctx.lineTo(ax + 8, ay - 10);
      ctx.lineTo(ax, ay);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };
    if (task.room !== room.id) {
      // point at the way out toward the task
      const door = sim.world.nextDoor(room.id, task.room);
      if (!door) return;
      if (door.edge) {
        const at = door.at;
        arrow(clamp(at.x, 40, room.w - 40), clamp(at.y, 60, room.h - 20) - 30 - pulse * 6);
      } else {
        const z = door.zone;
        ctx.strokeStyle = `rgba(255,210,63,${0.45 + pulse * 0.5})`;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(z.x - 2, z.y - 2, z.w + 4, z.h + 4);
        arrow(z.x + z.w / 2, z.y - 26 - pulse * 6);
      }
      return;
    }
    if (task.x !== undefined) {
      if (task.mark === 'litter') {
        for (let k = 0; k < 6; k++) {
          ctx.fillStyle = ['#d9d4c8', '#c62828', '#3d6db5', '#e8b923', '#7cb342', '#fff'][k];
          ctx.fillRect(task.x - 14 + ((k * 13) % 26), task.y - 6 + ((k * 7) % 12), 5, 3);
        }
        ellipse(ctx, task.x, task.y, 16, 7, 'rgba(90,80,60,0.25)');
      } else if (task.mark === 'plate') {
        ctx.save();
        ctx.translate(task.x, task.y);
        drawItem(ctx, 'plates', 18);
        ctx.restore();
      } else {
        ellipse(ctx, task.x, task.y, 22, 11, 'rgba(120,90,40,0.55)');
        ellipse(ctx, task.x - 5, task.y - 2, 10, 4, 'rgba(255,255,255,0.18)');
      }
      ctx.strokeStyle = `rgba(255,210,63,${0.5 + pulse * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(task.x, task.y, 30 + pulse * 4, 15 + pulse * 2, 0, 0, Math.PI * 2);
      ctx.stroke();
      arrow(task.x, task.y - 30 - pulse * 6);
    } else {
      const prop = sim.world.prop(room.id, task.prop);
      if (prop) {
        ctx.strokeStyle = `rgba(255,210,63,${0.45 + pulse * 0.5})`;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(prop.x - 4, prop.y - 4, prop.w + 8, prop.h + 8);
        ctx.setLineDash([]);
        const ax = prop.x + prop.w / 2;
        const ay = prop.y - 40 - pulse * 6;
        ctx.fillStyle = '#ffd23f';
        ctx.beginPath();
        ctx.moveTo(ax - 7, ay - 8);
        ctx.lineTo(ax + 7, ay - 8);
        ctx.lineTo(ax, ay);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  drawActor(ctx, sim, a, ox, oy, target) {
    const _ = scratch(a);
    let pose = 'stand';
    let face = a.face;
    let bar = false;
    if (a.downUntil) pose = 'down';
    else if (a.act === 'sleep' && a.spot) pose = 'sleep';
    else if (a.spot) {
      const prop = sim.world.prop(a.spot.room, a.spot.prop);
      const sp = prop && prop.spots[a.spot.i];
      const sp0 = sp ? sp.pose : 'sit';
      if (sp0 === 'lie') {
        pose = 'lie';
        if (prop.type === 'benchpress') face = 'right';
      } else if (sp0 === 'lift') {
        pose = 'lift';
        bar = prop.type === 'rack';
      } else pose = sp0;
    } else if (a.act === 'work') pose = 'work';
    const moving = (_.speed || 0) > 14 && !a.spot && !a.downUntil;
    const strike = _.strikeAnim > 0 ? 1 - _.strikeAnim / 0.34 : 0;
    const held = a.hands && sim.s.items[a.hands] ? sim.s.items[a.hands].def : null;
    const blink = (this.time * 0.7 + a.id.length * 0.37) % 4 < 0.12;
    ctx.save();
    ctx.translate(a.x + ox, a.y + oy);
    if (_.hurtT > 0) ctx.translate((Math.random() - 0.5) * 2, 0);
    ctx.scale(CHAR_SCALE, CHAR_SCALE);
    drawPerson(ctx, a.look, {
      face, pose, bar, phase: _.walkPhase || 0, moving, t: this.time + a.id.length, strike, hurt: _.hurtT || 0,
      guard: !!a.fightWith || (a.kind === 'npc' && a.act === 'fight'), held: pose === 'stand' || pose === 'work' ? held : null,
      sleeping: a.act === 'sleep', eating: a.act === 'eat', blink,
    });
    ctx.restore();
    if (a.act === 'sleep' && a.spot) {
      const k = (this.time * 0.6) % 1;
      text(ctx, 'z', a.x + ox + 8 + k * 8, a.y + oy - 40 - k * 18, { size: 7 + k * 5, color: `rgba(255,255,255,${1 - k})` });
    }
    if (a.downUntil) {
      for (let i = 0; i < 3; i++) {
        const ang = this.time * 3 + (i * Math.PI * 2) / 3;
        text(ctx, '✦', a.x + ox + Math.cos(ang) * 10, a.y + oy - 14 + Math.sin(ang) * 4, { size: 6, color: '#ffe66d' });
      }
    }
    if (target && target.type === 'npc' && target.id === a.id) {
      const bob = Math.sin(this.time * 5) * 2;
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      const hy = a.y + oy - 60 * CHAR_SCALE * (a.look.height || 1) + bob;
      ctx.moveTo(a.x + ox - 5, hy - 6);
      ctx.lineTo(a.x + ox + 5, hy - 6);
      ctx.lineTo(a.x + ox, hy);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawDynamicDecor(ctx, sim, room) {
    const def = room.def;
    if (!def) return;
    const rs = sim.s.rooms[room.id] || {};
    const m = tod(sim.s.t);
    for (const d of def.decor || []) {
      if (d.type === 'clock' || d.type === 'neonclock') {
        const ha = ((m / 60) % 12) / 12 * Math.PI * 2 - Math.PI / 2;
        const ma = (m % 60) / 60 * Math.PI * 2 - Math.PI / 2;
        const R = d.type === 'clock' ? 12 : 15;
        line(ctx, d.x, d.y, d.x + Math.cos(ha) * R * 0.5, d.y + Math.sin(ha) * R * 0.5, '#222', 1.6);
        line(ctx, d.x, d.y, d.x + Math.cos(ma) * R * 0.8, d.y + Math.sin(ma) * R * 0.8, '#222', 1);
        circle(ctx, d.x, d.y, 1.2, '#c0392b');
      }
    }
    for (const prop of room.props) {
      if (prop.type === 'tv' && rs.tv) {
        const hue = (Math.sin(this.time * 2.3) * 40 + 200) | 0;
        ctx.fillStyle = `hsla(${hue},60%,${55 + Math.sin(this.time * 9) * 8}%,0.9)`;
        ctx.fillRect(prop.x + 7, prop.y - 61, prop.w - 14, 36);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(prop.x + 12 + ((this.time * 30) % 40), prop.y - 55, 18, 10);
      }
      if ((prop.use === 'radio' && rs.radio) || (prop.use === 'jukebox' && rs.music > sim.s.t)) {
        for (let i = 0; i < 2; i++) {
          const k = (this.time * 0.5 + i * 0.5) % 1;
          text(ctx, i ? '♪' : '♫', prop.x + prop.w / 2 + Math.sin(k * 6 + i) * 8, prop.y - 30 - k * 30, { size: 10, color: `rgba(255,220,140,${1 - k})` });
        }
      }
    }
  }

  drawPowerLines(ctx, poles, v) {
    if (poles.length < 2) return;
    ctx.strokeStyle = 'rgba(20,20,20,0.55)';
    ctx.lineWidth = 1;
    const rows = {};
    for (const pl of poles) (rows[Math.round(pl.y / 50)] ||= []).push(pl);
    for (const k in rows) {
      const row = rows[k].sort((a, b) => a.x - b.x);
      for (let i = 0; i < row.length - 1; i++) {
        const a = row[i];
        const b = row[i + 1];
        for (const dy of [-116, -112]) {
          ctx.beginPath();
          ctx.moveTo(a.x + v.ox - 18, a.y + v.oy + dy);
          ctx.quadraticCurveTo((a.x + b.x) / 2 + v.ox, a.y + v.oy + dy + 26, b.x + v.ox - 18, b.y + v.oy + dy);
          ctx.stroke();
        }
      }
    }
  }

  drawLight(ctx, sim, room, visible, L, z, sx, sy) {
    if (L.dark < 0.02) {
      if (L.dusk > 0.05 && L.outdoor) {
        ctx.fillStyle = `rgba(255,140,60,${L.dusk * 0.12})`;
        ctx.fillRect(0, 0, this.W, this.H);
      }
      return;
    }
    const lc = this.lightCanvas;
    const g = lc.getContext('2d');
    const W = lc.width;
    const H = lc.height;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, W, H);
    g.fillStyle = L.outdoor ? `rgba(8,14,40,${L.dark})` : `rgba(10,8,20,${L.dark})`;
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'destination-out';
    const lights = [];
    for (const v of visible) {
      for (const li of v.room.lights || []) {
        if (L.lightsOff && !li.street) continue;
        lights.push({ x: li.x + v.ox, y: li.y + v.oy + 60, r: li.r, color: li.color, a: 1 });
      }
      if (v.room.kind === 'interior' && !L.lightsOff) {
        // ceiling fixtures
        const n = Math.max(2, Math.round(v.room.w / 300));
        for (let i = 0; i < n; i++) lights.push({ x: ((i + 0.5) * v.room.w) / n, y: v.room.h * 0.55, r: 260, color: '#fff1d6', a: 0.9 });
      }
      if (v.room.kind === 'street') {
        for (const f of v.room.features) {
          if (f.type === 'building' && f.lot.neon) lights.push({ x: f.x + f.w / 2 + v.ox, y: f.y + f.h - 50 + v.oy, r: 180, color: f.lot.signColor, a: 0.8 });
          if (f.type === 'building') {
            for (const d of f.lot.doors || []) lights.push({ x: f.x + d.at + v.ox, y: (d.side === 'N' ? f.y - 10 : f.y + f.h + 12) + v.oy, r: 70, color: '#ffe0a0', a: 0.7 });
          }
        }
      }
      for (const prop of v.room.props) {
        const rs = sim.s.rooms[v.room.id] || {};
        if (prop.type === 'tv' && rs.tv) lights.push({ x: prop.x + prop.w / 2, y: prop.y + 30, r: 150, color: '#9fc8ff', a: 0.8 });
        if (prop.type === 'jukebox') lights.push({ x: prop.x + prop.w / 2, y: prop.y + 10, r: 90, color: '#ff8fb4', a: 0.6 });
      }
    }
    const p = sim.player;
    lights.push({ x: p.x, y: p.y - 10, r: 80, color: null, a: 0.55 });
    const hands = p.hands && sim.s.items[p.hands];
    if (hands && ITEMS[hands.def].light) {
      const dirs = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
      const [fx, fy] = dirs[p.face];
      lights.push({ x: p.x + fx * 90, y: p.y + fy * 90 - 10, r: 140, color: '#fffbe0', a: 1 });
    }
    const ws = (x, y) => [((x - this.cam.x) * z + this.W / 2 + sx) / 2, ((y - this.cam.y) * z + this.H / 2 + sy) / 2];
    for (const li of lights) {
      const [lx, ly] = ws(li.x, li.y);
      const r = (li.r * z) / 2;
      if (lx < -r || ly < -r || lx > W + r || ly > H + r) continue;
      const gr = g.createRadialGradient(lx, ly, 0, lx, ly, r);
      gr.addColorStop(0, `rgba(0,0,0,${li.a})`);
      gr.addColorStop(0.5, `rgba(0,0,0,${li.a * 0.55})`);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(lx - r, ly - r, r * 2, r * 2);
    }
    ctx.drawImage(lc, 0, 0, this.W, this.H);
    // colored glow
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const li of lights) {
      if (!li.color) continue;
      const [lx, ly] = ws(li.x, li.y);
      const X = lx * 2;
      const Y = ly * 2;
      const r = li.r * z * 0.8;
      const gr = ctx.createRadialGradient(X, Y, 0, X, Y, r);
      gr.addColorStop(0, alpha(li.color, 0.16 * L.dark * li.a));
      gr.addColorStop(1, alpha(li.color, 0));
      ctx.fillStyle = gr;
      ctx.fillRect(X - r, Y - r, r * 2, r * 2);
    }
    ctx.restore();
    if (L.dusk > 0.05 && L.outdoor) {
      ctx.fillStyle = `rgba(255,120,60,${L.dusk * 0.1})`;
      ctx.fillRect(0, 0, this.W, this.H);
    }
  }

  drawRain(ctx, wx, W, H) {
    const n = Math.floor(wx.rain * 420);
    ctx.fillStyle = `rgba(60,75,95,${wx.rain * 0.16})`;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = `rgba(190,205,225,${0.25 + wx.rain * 0.3})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = (i * 97.31 + this.time * 90) % (W + 40) - 20;
      const y = (i * 53.17 + this.time * 900 * (0.8 + (i % 5) * 0.08)) % (H + 40) - 20;
      ctx.moveTo(x, y);
      ctx.lineTo(x - 4, y + 14);
    }
    ctx.stroke();
    // splashes
    for (let i = 0; i < n / 6; i++) {
      const x = (i * 131.7 + Math.floor(this.time * 6) * 17) % W;
      const y = (i * 71.3 + Math.floor(this.time * 6) * 29) % H;
      ellipse(ctx, x, y, 2.5, 1, `rgba(200,215,235,${0.25 * wx.rain})`);
    }
    if (wx.storm && Math.random() < 0.004) this.flash = 1;
  }

  drawLabels(ctx, sim, room, visible, target, dt) {
    const p = sim.player;
    for (const [id, b] of this.bubbles) {
      b.t += dt;
      if (b.t > b.life) this.bubbles.delete(id);
    }
    for (const id in sim.s.actors) {
      const a = sim.s.actors[id];
      if (!a.loaded && id !== 'p') continue;
      const v = visible.find((q) => q.room.id === a.room);
      if (!v || a.act === 'drive') continue;
      const [x, y] = this.toScreen(a.x + v.ox, a.y + v.oy);
      const headY = y - 50 * CHAR_SCALE * this.cam.zoom * (a.look.height || 1) + (a.spot ? 8 * this.cam.zoom : 0);
      const b = this.bubbles.get(id);
      const near = a !== p && Math.hypot(a.x - p.x, a.y - p.y) < 140 && a.room === p.room;
      const targeted = target && target.type === 'npc' && target.id === id;
      if ((near || targeted) && a.kind === 'npc') {
        const tag = displayTag(a, 'p');
        ctx.font = '600 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.strokeText(a.short, x, headY - 8);
        ctx.fillStyle = TAG_COLOR[tag] || '#fff';
        ctx.fillText(a.short, x, headY - 8);
      }
      if (b) {
        const fadeIn = Math.min(1, b.t * 6);
        const fadeOut = Math.min(1, (b.life - b.t) * 3);
        ctx.globalAlpha = Math.min(fadeIn, fadeOut);
        this.bubble(ctx, b.text, x, headY - 18, a === p);
        ctx.globalAlpha = 1;
      }
    }
  }

  bubble(ctx, s, x, y, mine) {
    ctx.font = '13px system-ui, sans-serif';
    const words = s.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width > 170 && cur) {
        lines.push(cur);
        cur = w;
      } else cur = t;
    }
    if (cur) lines.push(cur);
    const lh = 16;
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 16;
    const h = lines.length * lh + 10;
    const bx = clamp(x - w / 2, 6, this.W - w - 6);
    const by = Math.max(6, y - h);
    fillRR(ctx, bx, by, w, h, 8, mine ? 'rgba(255,248,225,0.96)' : 'rgba(255,255,255,0.95)', 'rgba(0,0,0,0.35)', 1);
    ctx.fillStyle = mine ? 'rgba(255,248,225,0.96)' : 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.moveTo(clamp(x, bx + 10, bx + w - 10) - 5, by + h - 0.5);
    ctx.lineTo(clamp(x, bx + 10, bx + w - 10) + 5, by + h - 0.5);
    ctx.lineTo(clamp(x, bx + 10, bx + w - 10), by + h + 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1f1d1a';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    lines.forEach((l, i) => ctx.fillText(l, bx + 8, by + 5 + i * lh));
  }

  drawFloats(ctx, dt) {
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.t += dt;
      if (f.t > 1.1) {
        this.floats.splice(i, 1);
        continue;
      }
      if (!this.toScreen) continue;
      const [x, y] = this.toScreen(f.x, f.y);
      ctx.globalAlpha = 1 - f.t / 1.1;
      ctx.font = '800 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.strokeText(f.text, x, y - f.t * 34);
      ctx.fillStyle = f.color || '#fff';
      ctx.fillText(f.text, x, y - f.t * 34);
      ctx.globalAlpha = 1;
    }
  }

  drawScreenFx(ctx, sim, dt, W, H) {
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.flash * 0.7})`;
      ctx.fillRect(0, 0, W, H);
      this.flash = Math.max(0, this.flash - dt * 4);
    }
    if (this.snapT > 0) {
      this.snapT -= dt;
      const k = Math.min(1, this.snapT);
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.7);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(1, `rgba(255,255,255,${0.55 * k + Math.sin(this.time * 20) * 0.1})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    const p = sim.player;
    if (p.stats.health < 30 && !p.downUntil) {
      const k = (30 - p.stats.health) / 30;
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
      g.addColorStop(0, 'rgba(120,0,0,0)');
      g.addColorStop(1, `rgba(120,0,0,${(0.35 + Math.sin(this.time * 4) * 0.1) * k})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    if (this.downT > 0) {
      this.downT -= dt;
      ctx.fillStyle = `rgba(0,0,0,${clamp(1 - this.downT / 3, 0, 1) * 0.95})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (sim.s.sleepUntil) {
      ctx.fillStyle = 'rgba(5,8,20,0.55)';
      ctx.fillRect(0, 0, W, H);
    }
    if (this.fade > 0) {
      ctx.fillStyle = `rgba(0,0,0,${this.fade})`;
      ctx.fillRect(0, 0, W, H);
      this.fade = Math.max(0, this.fade - dt * 3.2);
    }
  }
}
