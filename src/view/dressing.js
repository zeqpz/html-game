// Set dressing: the small stuff that makes a place feel lived in. Static bits
// are painted once into the cached backdrops; signals, puddles and pigeons are
// drawn live on top.

import { shade, alpha, fillRR, ellipse, circle, line, text, vgrad } from './gfx.js';
import { ROAD } from '../sim/world.js';
import { CELL } from '../data/rooms.js';
import { tod } from '../sim/util.js';

const { c: RC, half: RH, side: SW } = ROAD;
const FLOOR_TYPES = new Set(['rug', 'mat', 'runner', 'carpet', 'stallpaint', 'dancefloor']);

// ------------------------------------------------------------------ interiors
function spans(list, w) {
  // free stretches of back wall between the occupied intervals
  const occ = list.map(([a, b]) => [Math.max(16, a), Math.min(w - 16, b)]).filter(([a, b]) => b > a).sort((p, q) => p[0] - q[0]);
  const out = [];
  let x = 16;
  for (const [a, b] of occ) {
    if (a > x) out.push([x, a]);
    x = Math.max(x, b);
  }
  if (x < w - 16) out.push([x, w - 16]);
  return out;
}

function roomKind(room) {
  const def = room.def;
  const id = room.id;
  if (id.includes('hall')) return 'hall';
  if (def.home || def.spawn === 'home' && !def.staff) return 'home';
  if (['garage', 'warehouse', 'pawn', 'unit'].some((k) => id.includes(k))) return 'work';
  return def.hours || def.staff ? 'shop' : 'home';
}

export function dressInterior(ctx, room, L, rnd) {
  const { w, h, wallH, def } = room;
  const kind = roomKind(room);
  const worn = kind === 'hall' || kind === 'work' || (kind === 'home' && rnd() < 0.7);
  const high = [];
  const low = [];
  for (const win of def.windows || []) high.push([win.x - 8, win.x + win.w + 8]);
  for (const d of def.decor || []) {
    if (FLOOR_TYPES.has(d.type)) continue;
    const dw = d.w || 40;
    const x0 = d.w ? d.x : d.x - dw / 2;
    high.push([x0 - 10, x0 + dw + 10]);
  }
  for (const d of def.doors || []) if (d.side === 'N') high.push([d.x - 14, d.x + d.w + 14]);
  for (const p of def.props || []) {
    if (p.wall) high.push([p.x - 6, p.x + p.w + 6]);
    else if (p.y < wallH + 30) low.push([p.x - 4, p.x + p.w + 4]);
  }
  const freeHigh = spans(high, w);
  const freeLow = spans([...high, ...low], w);
  const wallTone = L.wallTone || '#777';

  // wear: water stains under the ceiling, hairline cracks, scuffs along the base
  if (worn) {
    for (let i = 0; i < 3; i++) {
      const sx = 30 + rnd() * (w - 60);
      const g = ctx.createRadialGradient(sx, 10, 2, sx, 14, 26 + rnd() * 20);
      g.addColorStop(0, 'rgba(90,70,30,0.22)');
      g.addColorStop(1, 'rgba(90,70,30,0)');
      ctx.fillStyle = g;
      ctx.fillRect(sx - 50, 7, 100, 60);
    }
    for (let i = 0; i < 4; i++) {
      let cx = 30 + rnd() * (w - 60);
      let cy = 12 + rnd() * (wallH * 0.6);
      ctx.strokeStyle = shade(wallTone, -0.35, 0.55);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let k = 0; k < 5; k++) {
        cx += (rnd() - 0.5) * 12;
        cy += 4 + rnd() * 7;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
    for (let i = 0; i < 9; i++) {
      const sx = 20 + rnd() * (w - 40);
      line(ctx, sx, wallH - 18 + rnd() * 8, sx + 6 + rnd() * 14, wallH - 16 + rnd() * 8, 'rgba(20,15,10,0.25)', 1.2);
    }
    if (kind === 'hall') {
      // a tag somebody never painted over
      const tx = 60 + rnd() * (w - 160);
      text(ctx, ['KING', 'H-TWN', 'NO LIMIT', '713'][Math.floor(rnd() * 4)], tx, wallH * 0.6, { size: 13, color: 'rgba(40,40,60,0.35)', font: 'Impact, Arial Black, sans-serif' });
    }
  }

  // framed pictures and a calendar in the bigger free stretches of a home
  for (const [a, b] of freeHigh) {
    const span = b - a;
    if (span < 90) continue;
    if (kind === 'home' || kind === 'hall') {
      if (rnd() < 0.75) {
        const fw = 30 + rnd() * 24;
        const fh = 22 + rnd() * 20;
        const fx = a + (span - fw) * (0.3 + rnd() * 0.4);
        const fy = wallH * 0.28 + rnd() * 12;
        frame(ctx, fx, fy, fw, fh, rnd);
      }
    } else if (kind === 'shop' && rnd() < 0.6) {
      // posted notices
      const fx = a + span / 2 - 14;
      const fy = wallH * 0.4;
      fillRR(ctx, fx + 1, fy + 2, 28, 34, 1, 'rgba(0,0,0,0.25)', null);
      fillRR(ctx, fx, fy, 28, 34, 1, '#f4efe2', null);
      for (let k = 0; k < 5; k++) line(ctx, fx + 4, fy + 8 + k * 5, fx + 24 - rnd() * 8, fy + 8 + k * 5, 'rgba(40,40,50,0.45)', 1);
      circle(ctx, fx + 14, fy + 2, 1.4, '#c62828');
    }
  }

  // outlets and switches low on the wall
  for (const [a, b] of freeLow) {
    for (let x = a + 30; x < b - 20; x += 170 + rnd() * 60) outlet(ctx, x, wallH - 22);
  }
  for (const d of def.doors || []) {
    if (d.side !== 'N') continue;
    lightSwitch(ctx, d.x + d.w + 20, wallH - 62);
    if (kind === 'shop' || kind === 'work') exitSign(ctx, d.x + d.w / 2, Math.max(15, wallH - 112 - 15));
  }
  if (!(def.doors || []).some((d) => d.side === 'N') && freeLow.length) {
    const [a] = freeLow[0];
    lightSwitch(ctx, a + 14, wallH - 62);
  }

  // light fixtures up top
  if (kind === 'shop' || kind === 'work' || kind === 'hall') {
    for (let x = 60; x < w - 60; x += 180) {
      fillRR(ctx, x - 34, 9, 68, 7, 2, '#d8dade', 'rgba(0,0,0,0.4)', 1);
      fillRR(ctx, x - 31, 10.5, 62, 3.5, 1, '#fffbe6', null);
      const g = ctx.createRadialGradient(x, 16, 4, x, 22, 70);
      g.addColorStop(0, 'rgba(255,250,225,0.22)');
      g.addColorStop(1, 'rgba(255,250,225,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 80, 8, 160, 80);
    }
  } else {
    for (const [a, b] of freeHigh) {
      if (b - a < 60 || rnd() < 0.4) continue;
      sconce(ctx, a + (b - a) / 2, wallH * 0.22);
    }
  }
  // smoke detector
  const sd = 80 + rnd() * (w - 160);
  circle(ctx, sd, 12, 5, '#e8e6e0');
  circle(ctx, sd, 12, 2.5, '#cfcac0');
  circle(ctx, sd + 2, 11, 0.8, '#c62828');

  // the floor: dust along the base, scuffs by the doors
  for (let i = 0; i < 14; i++) ellipse(ctx, 20 + rnd() * (w - 40), wallH + 4 + rnd() * 6, 3 + rnd() * 6, 1.2, 'rgba(60,50,40,0.18)');
  for (const d of def.doors || []) {
    const cx = d.x + d.w / 2;
    const cy = d.side === 'S' ? h - 50 : wallH + 20;
    const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 70);
    g.addColorStop(0, worn ? 'rgba(30,22,14,0.22)' : 'rgba(30,22,14,0.12)');
    g.addColorStop(1, 'rgba(30,22,14,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - 80, cy - 70, 160, 140);
  }
  if (worn) {
    for (let i = 0; i < 6; i++) {
      const fx = 40 + rnd() * (w - 80);
      const fy = wallH + 30 + rnd() * (h - wallH - 70);
      if (rnd() < 0.5) fillRR(ctx, fx, fy, 7, 5, 0.5, 'rgba(240,236,224,0.5)', null); // scrap of paper
      else ellipse(ctx, fx, fy, 6 + rnd() * 8, 3 + rnd() * 4, 'rgba(40,30,20,0.12)');
    }
  }
}

function frame(ctx, x, y, w, h, rnd) {
  fillRR(ctx, x + 2, y + 3, w, h, 1, 'rgba(0,0,0,0.3)', null);
  const fc = ['#3a2a1e', '#c9a24a', '#1d1d22', '#e8e2d4'][Math.floor(rnd() * 4)];
  fillRR(ctx, x, y, w, h, 1, fc, null);
  const ix = x + 3;
  const iy = y + 3;
  const iw = w - 6;
  const ih = h - 6;
  const art = Math.floor(rnd() * 4);
  if (art === 0) {
    // sunset over water
    vgrad(ctx, ix, iy, iw, ih, [[0, '#f2a65a'], [0.55, '#e86a5a'], [0.56, '#2c5aa0'], [1, '#1f3557']]);
    circle(ctx, ix + iw * 0.6, iy + ih * 0.5, ih * 0.2, '#ffe08a');
  } else if (art === 1) {
    // family photo
    ctx.fillStyle = '#d9cdb4';
    ctx.fillRect(ix, iy, iw, ih);
    for (let k = 0; k < 3; k++) {
      const px = ix + iw * (0.25 + k * 0.25);
      circle(ctx, px, iy + ih * 0.42, ih * 0.13, ['#8d5a3b', '#c68a5e', '#5a3825'][k]);
      fillRR(ctx, px - ih * 0.15, iy + ih * 0.58, ih * 0.3, ih * 0.4, 1, ['#2c5aa0', '#b8283f', '#3d8b4f'][k], null);
    }
  } else if (art === 2) {
    // skyline
    vgrad(ctx, ix, iy, iw, ih, [[0, '#1f2a44'], [1, '#5a4a7a']]);
    ctx.fillStyle = '#0f1424';
    for (let k = 0; k < iw; k += 5) {
      const bh = ih * (0.3 + ((k * 37) % 50) / 100);
      ctx.fillRect(ix + k, iy + ih - bh, 4, bh);
    }
  } else {
    // a print of flowers
    ctx.fillStyle = '#efe6d2';
    ctx.fillRect(ix, iy, iw, ih);
    line(ctx, ix + iw / 2, iy + ih, ix + iw / 2, iy + ih * 0.4, '#3d8b4f', 1.4);
    for (let k = 0; k < 5; k++) circle(ctx, ix + iw / 2 + Math.cos(k * 1.26) * 4, iy + ih * 0.35 + Math.sin(k * 1.26) * 4, 2.6, '#d13b7a');
    circle(ctx, ix + iw / 2, iy + ih * 0.35, 1.8, '#ffd23f');
  }
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.moveTo(ix, iy);
  ctx.lineTo(ix + iw * 0.4, iy);
  ctx.lineTo(ix, iy + ih * 0.6);
  ctx.closePath();
  ctx.fill();
}

function outlet(ctx, x, y) {
  fillRR(ctx, x - 4, y - 6, 8, 12, 1.2, '#efece4', 'rgba(0,0,0,0.3)', 0.6);
  for (const oy of [-2.6, 2.4]) {
    line(ctx, x - 1.4, y + oy - 1, x - 1.4, y + oy + 0.6, '#555', 0.8);
    line(ctx, x + 1.4, y + oy - 1, x + 1.4, y + oy + 0.6, '#555', 0.8);
  }
}

function lightSwitch(ctx, x, y) {
  fillRR(ctx, x - 4, y - 6, 8, 12, 1.2, '#efece4', 'rgba(0,0,0,0.3)', 0.6);
  fillRR(ctx, x - 1.2, y - 3, 2.4, 4, 0.6, '#d9d4c8', 'rgba(0,0,0,0.35)', 0.4);
}

function exitSign(ctx, x, y) {
  fillRR(ctx, x - 13, y - 5, 26, 10, 1.5, '#1d1d22', null);
  text(ctx, 'EXIT', x, y + 0.5, { size: 7, color: '#ff5a4a' });
  const g = ctx.createRadialGradient(x, y, 2, x, y, 24);
  g.addColorStop(0, 'rgba(255,80,60,0.18)');
  g.addColorStop(1, 'rgba(255,80,60,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 26, y - 20, 52, 40);
}

function sconce(ctx, x, y) {
  const g = ctx.createRadialGradient(x, y, 2, x, y + 4, 34);
  g.addColorStop(0, 'rgba(255,225,160,0.32)');
  g.addColorStop(1, 'rgba(255,225,160,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 40, y - 34, 80, 80);
  fillRR(ctx, x - 2, y + 2, 4, 6, 1, '#6b5a43', null);
  ctx.fillStyle = '#f2e2bf';
  ctx.beginPath();
  ctx.moveTo(x - 7, y + 3);
  ctx.lineTo(x + 7, y + 3);
  ctx.lineTo(x + 4, y - 6);
  ctx.lineTo(x - 4, y - 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 0.6;
  ctx.stroke();
}

// ------------------------------------------------------------------ streets
export function dressStreet(ctx, room, rnd) {
  const r0 = RC - RH;
  const r1 = RC + RH;
  // lane arrows on each approach
  const arrow = (x, y, rot) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = 'rgba(235,235,228,0.7)';
    ctx.fillRect(-1.6, -2, 3.2, 16);
    ctx.beginPath();
    ctx.moveTo(-6, -2);
    ctx.lineTo(6, -2);
    ctx.lineTo(0, -10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  arrow(r0 - 120, RC + RH / 2, Math.PI / 2); // eastbound
  arrow(r1 + 120, RC - RH / 2, -Math.PI / 2); // westbound
  arrow(RC - RH / 2, r0 - 120, Math.PI); // southbound
  arrow(RC + RH / 2, r1 + 120, 0); // northbound
  // skid marks near the box
  for (let i = 0; i < 5; i++) {
    const horiz = rnd() < 0.5;
    const along = rnd() < 0.5 ? r0 - 40 - rnd() * 260 : r1 + 40 + rnd() * 260;
    const lane = RC + (rnd() < 0.5 ? -1 : 1) * RH * (0.3 + rnd() * 0.4);
    const len = 30 + rnd() * 70;
    const drift = (rnd() - 0.5) * 12;
    for (const off of [-7, 7]) {
      ctx.strokeStyle = 'rgba(12,12,14,0.32)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (horiz) {
        ctx.moveTo(along, lane + off);
        ctx.quadraticCurveTo(along + len / 2, lane + off + drift, along + len, lane + off + drift * 2);
      } else {
        ctx.moveTo(lane + off, along);
        ctx.quadraticCurveTo(lane + off + drift, along + len / 2, lane + off + drift * 2, along + len);
      }
      ctx.stroke();
    }
  }
  // litter in the gutters and on the sidewalks
  for (let i = 0; i < 40; i++) {
    const horiz = rnd() < 0.5;
    const band = rnd() < 0.5 ? r0 - SW + rnd() * (SW + 6) : r1 - 6 + rnd() * (SW + 6);
    const along = rnd() * CELL;
    if (along > r0 - 10 && along < r1 + 10) continue;
    const x = horiz ? along : band;
    const y = horiz ? band : along;
    const k = rnd();
    if (k < 0.35) fillRR(ctx, x, y, 5 + rnd() * 4, 4 + rnd() * 3, 0.6, `rgba(240,236,224,${0.5 + rnd() * 0.3})`, null);
    else if (k < 0.55) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rnd() * 6.28);
      fillRR(ctx, -4, -2, 8, 4, 2, ['#c62828', '#2c5aa0', '#9aa3ab', '#3d8b4f'][Math.floor(rnd() * 4)], null);
      ctx.restore();
    } else if (k < 0.7) ellipse(ctx, x, y, 3 + rnd() * 4, 2, 'rgba(70,90,40,0.35)'); // leaves
    else circle(ctx, x, y, 1.2, 'rgba(30,25,20,0.4)');
  }
  // utility plates and tree grates on the sidewalks
  for (let i = 0; i < 6; i++) {
    const horiz = i % 2 === 0;
    const band = (i < 3 ? r0 - SW : r1) + SW / 2;
    let along = 60 + rnd() * (CELL - 120);
    if (along > r0 - 70 && along < r1 + 70) along = along < RC ? r0 - 90 : r1 + 90;
    const x = horiz ? along : band;
    const y = horiz ? band : along;
    if (rnd() < 0.5) {
      fillRR(ctx, x - 8, y - 6, 16, 12, 1, '#8c8a84', 'rgba(0,0,0,0.4)', 1);
      text(ctx, 'WATER', x, y + 0.5, { size: 4, color: 'rgba(30,30,30,0.6)', font: 'Arial, sans-serif' });
    } else {
      fillRR(ctx, x - 11, y - 11, 22, 22, 1, '#4a4440', 'rgba(0,0,0,0.5)', 1);
      for (let k = -8; k <= 8; k += 4) line(ctx, x + k, y - 9, x + k, y + 9, 'rgba(20,18,16,0.7)', 1.2);
      circle(ctx, x, y, 5, '#5a4632');
    }
  }
  // street name signs on two corners
  const names = room.def.streets;
  if (names) {
    streetSign(ctx, r0 - SW + 8, r0 - 10, names.h, names.v);
    streetSign(ctx, r1 + SW - 8, r1 + SW - 6, names.h, names.v);
  }
}

function streetSign(ctx, x, y, h, v) {
  ellipse(ctx, x + 6, y + 2, 7, 2.5, 'rgba(0,0,0,0.3)');
  line(ctx, x, y, x, y - 46, '#6d747b', 2.4);
  const blade = (ty, label, wide) => {
    const w = Math.min(96, 8 + label.length * 5.2);
    fillRR(ctx, x - (wide ? w / 2 : 4), ty - 5, wide ? w : 8, 10, 1.5, '#2f6b4a', '#f4f1ea', 0.8);
    if (wide) text(ctx, label.toUpperCase(), x, ty + 0.5, { size: 6, color: '#f4f1ea', font: 'Arial, sans-serif', weight: '700' });
  };
  blade(y - 44, h, true);
  // the cross street blade points away (we see its edge)
  fillRR(ctx, x - 2, y - 36, 4, 9, 1, '#2f6b4a', '#f4f1ea', 0.6);
  text(ctx, v.split(' ')[0].toUpperCase(), x + 22, y - 31, { size: 5, color: 'rgba(244,241,234,0.85)', font: 'Arial, sans-serif', weight: '700' });
}

// ------------------------------------------------------------------ live
// Traffic signals cycle on the game clock; walk lights follow.
function signalPhase(t) {
  const cyc = 6; // game minutes per full cycle
  const p = (t % cyc) / cyc;
  if (p < 0.42) return { ns: 'g', ew: 'r' };
  if (p < 0.5) return { ns: 'y', ew: 'r' };
  if (p < 0.92) return { ns: 'r', ew: 'g' };
  return { ns: 'r', ew: 'y' };
}

const LAMP = { r: '#ff3b30', y: '#ffcc00', g: '#34c759' };

function signalHead(ctx, x, y, state, night) {
  fillRR(ctx, x - 5, y - 15, 10, 30, 2, '#1d1d22', '#000', 1);
  ['r', 'y', 'g'].forEach((k, i) => {
    const on = state === k;
    const cy = y - 9 + i * 9;
    circle(ctx, x, cy, 3.4, on ? LAMP[k] : 'rgba(80,80,80,0.6)');
    if (on) {
      const g = ctx.createRadialGradient(x, cy, 1, x, cy, night ? 22 : 10);
      g.addColorStop(0, alpha(LAMP[k], night ? 0.55 : 0.35));
      g.addColorStop(1, alpha(LAMP[k], 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - 24, cy - 24, 48, 48);
    }
  });
}

// Corner poles: [x, y, axis the signal faces].
export const SIGNAL_POLES = [
  [RC - RH - 10, RC - RH - 10, 'ew'], [RC + RH + 10, RC - RH - 10, 'ns'],
  [RC - RH - 10, RC + RH + 10, 'ns'], [RC + RH + 10, RC + RH + 10, 'ew'],
];

export function drawSignalPole(ctx, sim, x, y, axis, time) {
  const t = sim.s.t;
  const m = tod(t);
  const night = m < 390 || m > 1170;
  const ph = signalPhase(t);
  ellipse(ctx, x + 6, y + 3, 7, 2.5, 'rgba(0,0,0,0.3)');
  line(ctx, x, y, x, y - 54, '#4a4f55', 3);
  line(ctx, x - 1, y, x - 1, y - 54, 'rgba(255,255,255,0.18)', 0.8);
  signalHead(ctx, x, y - 64, ph[axis], night);
  // the walk light for people crossing alongside
  const walk = ph[axis] === 'g';
  fillRR(ctx, x + 4, y - 40, 9, 9, 1.5, '#1d1d22', null);
  if (walk) {
    circle(ctx, x + 8.5, y - 38, 1.1, '#f4f4f0');
    line(ctx, x + 8.5, y - 37, x + 8.5, y - 34.5, '#f4f4f0', 1);
    line(ctx, x + 8.5, y - 34.5, x + 7, y - 32.5, '#f4f4f0', 0.9);
    line(ctx, x + 8.5, y - 34.5, x + 10, y - 32.5, '#f4f4f0', 0.9);
  } else {
    const blink = ph[axis] === 'y' && (time * 2) % 2 < 1;
    fillRR(ctx, x + 6.5, y - 38.5, 4, 5, 1, blink ? '#5a2a10' : '#ff7a2a', null);
  }
}

// Puddles in the rain, with rings where drops land.
export function drawPuddles(ctx, sim, room, ox, oy, time) {
  const rain = sim.weather.rain;
  if (rain <= 0.15) return;
  const spots = room._puddles || (room._puddles = puddleSpots(room.id));
  const a = Math.min(1, (rain - 0.15) * 2);
  for (const [px, py, pr] of spots) {
    ctx.save();
    ctx.translate(px + ox, py + oy);
    ctx.scale(1, 0.5);
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, pr);
    g.addColorStop(0, `rgba(150,170,195,${0.32 * a})`);
    g.addColorStop(0.8, `rgba(110,130,160,${0.22 * a})`);
    g.addColorStop(1, 'rgba(110,130,160,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, pr, 0, Math.PI * 2);
    ctx.fill();
    for (let k = 0; k < 2; k++) {
      const q = (time * 1.4 + k * 0.5 + px * 0.01) % 1;
      ctx.strokeStyle = `rgba(220,230,245,${(1 - q) * 0.45 * a})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(Math.sin(px + k * 3) * pr * 0.4, Math.cos(py + k) * pr * 0.3, 2 + q * 9, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function puddleSpots(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const rnd = () => ((h = (h * 1664525 + 1013904223) >>> 0) / 4294967296);
  const out = [];
  for (let i = 0; i < 9; i++) {
    const horiz = rnd() < 0.5;
    const lane = RC + (rnd() < 0.5 ? -1 : 1) * (RH - 10 - rnd() * 20);
    let along = rnd() * CELL;
    if (along > RC - RH - 60 && along < RC + RH + 60) along += 300;
    out.push(horiz ? [along % CELL, lane, 16 + rnd() * 22] : [lane, along % CELL, 16 + rnd() * 22]);
  }
  return out;
}

// Pigeons peck around the sidewalks and scatter when someone gets close.
export class Pigeons {
  constructor() {
    this.flocks = new Map();
  }

  flock(roomId) {
    let f = this.flocks.get(roomId);
    if (!f) {
      let h = 7;
      for (let i = 0; i < roomId.length; i++) h = (h * 33 + roomId.charCodeAt(i)) >>> 0;
      const rnd = () => ((h = (h * 1664525 + 1013904223) >>> 0) / 4294967296);
      f = [];
      const groups = 2;
      for (let g = 0; g < groups; g++) {
        const horiz = rnd() < 0.5;
        const band = (rnd() < 0.5 ? RC - RH - SW / 2 : RC + RH + SW / 2);
        const along = 80 + rnd() * 400 + (rnd() < 0.5 ? 0 : RC + RH);
        const cx = horiz ? along : band;
        const cy = horiz ? band : along;
        for (let k = 0; k < 5; k++) f.push({ hx: cx + (rnd() - 0.5) * 40, hy: cy + (rnd() - 0.5) * 24, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, fly: 0, ph: rnd() * 6, set: false });
      }
      this.flocks.set(roomId, f);
    }
    return f;
  }

  draw(ctx, sim, room, ox, oy, dt, time) {
    const f = this.flock(room.id);
    const people = [];
    for (const id in sim.s.actors) {
      const a = sim.s.actors[id];
      if (a.room === room.id && a.loaded !== false && !a.dead) people.push(a);
    }
    for (const b of f) {
      if (!b.set) {
        b.x = b.hx;
        b.y = b.hy;
        b.set = true;
      }
      if (b.fly > 0) {
        b.fly -= dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.z = Math.min(60, b.z + b.vz * dt);
        if (b.fly <= 0) {
          // land back home a little later
          b.x = b.hx + (Math.random() - 0.5) * 30;
          b.y = b.hy + (Math.random() - 0.5) * 16;
          b.z = 0;
        }
      } else {
        const near = people.some((a) => Math.hypot(a.x - b.x, a.y - b.y) < 46);
        if (near) {
          const ang = Math.random() * Math.PI * 2;
          b.vx = Math.cos(ang) * 160;
          b.vy = Math.sin(ang) * 90 - 40;
          b.vz = 90;
          b.fly = 2.5 + Math.random() * 2;
        } else if (Math.random() < dt * 0.6) {
          b.x += (Math.random() - 0.5) * 6;
          b.y += (Math.random() - 0.5) * 4;
        }
      }
      if (b.fly > 0 && b.z > 55) continue; // gone over the roofs
      const x = b.x + ox;
      const y = b.y + oy;
      ellipse(ctx, x, y + 1, 3.2, 1.2, 'rgba(0,0,0,0.25)');
      const peck = b.fly > 0 ? 0 : Math.max(0, Math.sin(time * 4 + b.ph)) * 1.4;
      const by = y - b.z;
      ellipse(ctx, x, by - 2.5, 3.4, 2.3, '#8a8f99');
      ellipse(ctx, x - 0.6, by - 2.8, 2.2, 1.4, '#a8adb6');
      circle(ctx, x + 2.6, by - 4 + peck, 1.6, '#6d7480');
      circle(ctx, x + 3, by - 4.3 + peck, 0.4, '#ff8a3a');
      line(ctx, x + 3.6, by - 3.8 + peck, x + 4.8, by - 3.4 + peck, '#c9a24a', 0.7);
      if (b.fly > 0) {
        const flap = Math.sin(time * 30 + b.ph) * 4;
        line(ctx, x - 1, by - 3, x - 5, by - 3 - flap, '#7a7f89', 1.6);
        line(ctx, x + 1, by - 3, x + 4, by - 3 - flap, '#7a7f89', 1.6);
      }
    }
  }
}
