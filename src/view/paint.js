// Painted backdrops. Each room is painted once into an offscreen canvas:
// floors, walls, windows (left transparent so the sky can show through),
// decor, sidewalks, roads, roofs. Tall props and people are drawn later.

import {
  makeCanvas, rngFor, shade, mix, alpha, jitter, rrect, fillRR, ellipse, circle, shadowBlob,
  texture, line, vgrad, hgrad, text,
} from './gfx.js';
import { CELL } from '../data/rooms.js';
import { dressInterior, dressStreet } from './dressing.js';
import { ROAD } from '../sim/world.js';

export const RES_IN = 2;
export const RES_ST = 1;

// ============================================================ interiors
export function paintInterior(room) {
  const { w, h, wallH, def } = room;
  const L = def.look;
  const c = makeCanvas(w * RES_IN, h * RES_IN);
  const ctx = c.getContext('2d');
  ctx.scale(RES_IN, RES_IN);
  const rnd = rngFor(room.id);

  paintFloor(ctx, L, 0, wallH, w, h - wallH, rnd);
  for (const d of def.decor || []) if (FLOOR_DECOR.has(d.type)) floorDecor(ctx, d, rnd);
  // window light pooling on the floor
  for (const win of def.windows || []) {
    const g = ctx.createLinearGradient(0, wallH, 0, wallH + 200);
    g.addColorStop(0, 'rgba(255,240,200,0.16)');
    g.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(win.x, wallH);
    ctx.lineTo(win.x + win.w, wallH);
    ctx.lineTo(win.x + win.w + 60, wallH + 200);
    ctx.lineTo(win.x + 30, wallH + 200);
    ctx.closePath();
    ctx.fill();
  }
  // contact shadow under the wall
  vgrad(ctx, 0, wallH, w, 46, [[0, 'rgba(10,6,4,0.42)'], [0.35, 'rgba(10,6,4,0.12)'], [1, 'rgba(10,6,4,0)']]);

  paintWall(ctx, L, 0, 0, w, wallH, rnd);
  for (const win of def.windows || []) paintWindow(ctx, win, L, rnd);
  for (const d of def.decor || []) if (!FLOOR_DECOR.has(d.type)) wallDecor(ctx, d, L, rnd, def);
  for (const p of def.props || []) if (p.wall) wallProp(ctx, p, L, rnd);
  for (const d of def.doors || []) if (d.side === 'N') backDoor(ctx, d, L, wallH);

  dressInterior(ctx, room, L, rnd);

  // ceiling cut along the top
  ctx.fillStyle = shade(L.wallTone, -0.72);
  ctx.fillRect(0, 0, w, 7);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(0, 7, w, 1);

  // side walls and the cutaway front wall
  const cap = shade(L.wallTone, -0.62);
  const capHi = shade(L.wallTone, -0.38);
  ctx.fillStyle = cap;
  ctx.fillRect(0, 0, 16, h);
  ctx.fillRect(w - 16, 0, 16, h);
  ctx.fillStyle = capHi;
  ctx.fillRect(15, 7, 1.5, h - 7);
  ctx.fillRect(w - 16.5, 7, 1.5, h - 7);
  // side walls catch a little wall color where they meet the back wall
  hgrad(ctx, 16, wallH, 18, h - wallH, [[0, 'rgba(0,0,0,0.22)'], [1, 'rgba(0,0,0,0)']]);
  hgrad(ctx, w - 34, wallH, 18, h - wallH, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.22)']]);
  // front wall
  ctx.fillStyle = cap;
  ctx.fillRect(0, h - 16, w, 16);
  ctx.fillStyle = capHi;
  ctx.fillRect(16, h - 16, w - 32, 1.5);
  for (const d of def.doors || []) {
    if (d.side !== 'S') continue;
    // opening + threshold + doormat
    ctx.clearRect(d.x, h - 16, d.w, 16);
    const g = ctx.createLinearGradient(0, h - 16, 0, h);
    g.addColorStop(0, shade(L.floorTone, -0.2));
    g.addColorStop(1, 'rgba(0,0,0,0.9)');
    ctx.fillStyle = g;
    ctx.fillRect(d.x, h - 16, d.w, 16);
    ctx.fillStyle = shade(L.base || '#333', 0.1);
    ctx.fillRect(d.x - 4, h - 17, 4, 17);
    ctx.fillRect(d.x + d.w, h - 17, 4, 17);
    fillRR(ctx, d.x + 8, h - 40, d.w - 16, 22, 3, '#4a3b2f', 'rgba(0,0,0,0.3)');
    texture(ctx, d.x + 8, h - 40, d.w - 16, 22, 'grain', 0.25, 'overlay');
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < 6; i++) ctx.fillRect(d.x + 12 + i * ((d.w - 24) / 6), h - 37, 2, 16);
  }
  // soft vignette
  const vg = ctx.createRadialGradient(w / 2, h * 0.55, Math.min(w, h) * 0.35, w / 2, h * 0.55, Math.max(w, h) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  return c;
}

function paintFloor(ctx, L, x, y, w, h, rnd) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const tone = L.floorTone;
  if (L.floor === 'wood') {
    const ph = 15;
    for (let row = 0; row * ph < h + ph; row++) {
      const py = y + row * ph;
      let px = x - rnd() * 120;
      while (px < x + w) {
        const len = 70 + rnd() * 110;
        const col = jitter(tone, rnd, 0.09);
        ctx.fillStyle = col;
        ctx.fillRect(px, py, len, ph);
        // grain
        ctx.strokeStyle = shade(tone, -0.25, 0.22);
        ctx.lineWidth = 0.6;
        for (let gI = 0; gI < 3; gI++) {
          const gy = py + 2 + rnd() * (ph - 4);
          ctx.beginPath();
          ctx.moveTo(px + 2, gy);
          ctx.bezierCurveTo(px + len * 0.3, gy + (rnd() - 0.5) * 3, px + len * 0.7, gy + (rnd() - 0.5) * 3, px + len - 2, gy);
          ctx.stroke();
        }
        if (rnd() < 0.15) ellipse(ctx, px + rnd() * len, py + ph / 2, 2.5, 1.4, shade(tone, -0.35, 0.5));
        ctx.fillStyle = 'rgba(30,15,5,0.55)';
        ctx.fillRect(px + len - 0.8, py, 0.8, ph);
        px += len;
      }
      ctx.fillStyle = 'rgba(25,12,4,0.5)';
      ctx.fillRect(x, py + ph - 0.9, w, 0.9);
      ctx.fillStyle = 'rgba(255,230,190,0.07)';
      ctx.fillRect(x, py, w, 1);
    }
    texture(ctx, x, y, w, h, 'cloud', 0.25, 'multiply', 2);
  } else if (L.floor === 'checker') {
    const ts = 36;
    for (let ty = 0; ty * ts < h; ty++) for (let tx = 0; tx * ts < w; tx++) {
      const dark = (tx + ty) % 2 === 1;
      const base = dark ? L.floorTone2 : tone;
      ctx.fillStyle = jitter(base, rnd, dark ? 0.06 : 0.035);
      ctx.fillRect(x + tx * ts, y + ty * ts, ts, ts);
      if (!dark) {
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(x + tx * ts + 2, y + ty * ts + 2, ts - 4, 2);
      }
    }
    ctx.strokeStyle = 'rgba(60,55,50,0.35)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= w; gx += ts) line(ctx, x + gx, y, x + gx, y + h, 'rgba(60,55,50,0.35)', 1);
    for (let gy = 0; gy <= h; gy += ts) line(ctx, x, y + gy, x + w, y + gy, 'rgba(60,55,50,0.35)', 1);
    texture(ctx, x, y, w, h, 'cloud', 0.3, 'multiply', 2.5);
    // scuffs
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = `rgba(20,20,20,${0.05 + rnd() * 0.08})`;
      ctx.lineWidth = 1 + rnd() * 2;
      const sx = x + rnd() * w;
      const sy = y + rnd() * h;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(sx + 8, sy + (rnd() - 0.5) * 6, sx + 10 + rnd() * 20, sy + (rnd() - 0.5) * 8);
      ctx.stroke();
    }
  } else if (L.floor === 'rubber') {
    ctx.fillStyle = tone;
    ctx.fillRect(x, y, w, h);
    const ts = 64;
    for (let ty = 0; ty * ts < h; ty++) for (let tx = 0; tx * ts < w; tx++) {
      ctx.fillStyle = jitter(tone, rnd, 0.05);
      ctx.fillRect(x + tx * ts + 1, y + ty * ts + 1, ts - 2, ts - 2);
    }
    for (let i = 0; i < w * h * 0.02; i++) {
      ctx.fillStyle = rnd() < 0.5 ? 'rgba(200,200,210,0.18)' : 'rgba(120,150,190,0.15)';
      ctx.fillRect(x + rnd() * w, y + rnd() * h, 1.2, 1.2);
    }
    texture(ctx, x, y, w, h, 'cloud', 0.25, 'multiply', 2);
  } else if (L.floor === 'tile') {
    const ts = 28;
    ctx.fillStyle = shade(tone, -0.18);
    ctx.fillRect(x, y, w, h);
    for (let ty = 0; ty * ts < h; ty++) for (let tx = 0; tx * ts < w; tx++) {
      ctx.fillStyle = jitter(tone, rnd, 0.04);
      ctx.fillRect(x + tx * ts + 1, y + ty * ts + 1, ts - 2, ts - 2);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(x + tx * ts + 2, y + ty * ts + 2, ts - 6, 1.5);
    }
    texture(ctx, x, y, w, h, 'cloud', 0.2, 'multiply', 2);
  } else if (L.floor === 'linoleum') {
    // old institutional squares, two tones in a scatter
    const ts = 24;
    for (let ty = 0; ty * ts < h; ty++) for (let tx = 0; tx * ts < w; tx++) {
      const alt = rnd() < 0.18;
      ctx.fillStyle = jitter(alt ? L.floorTone2 || shade(tone, -0.2) : tone, rnd, 0.035);
      ctx.fillRect(x + tx * ts, y + ty * ts, ts, ts);
    }
    for (let gx = 0; gx <= w; gx += ts) line(ctx, x + gx, y, x + gx, y + h, 'rgba(0,0,0,0.12)', 1);
    for (let gy = 0; gy <= h; gy += ts) line(ctx, x, y + gy, x + w, y + gy, 'rgba(0,0,0,0.12)', 1);
    texture(ctx, x, y, w, h, 'cloud', 0.28, 'multiply', 2.2);
    // wax sheen
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.08)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  } else if (L.floor === 'marble') {
    const ts = 60;
    for (let ty = 0; ty * ts < h; ty++) for (let tx = 0; tx * ts < w; tx++) {
      const alt = (tx + ty) % 2 === 1;
      ctx.fillStyle = jitter(alt ? L.floorTone2 : tone, rnd, 0.03);
      ctx.fillRect(x + tx * ts, y + ty * ts, ts, ts);
      // veins
      ctx.strokeStyle = alt ? 'rgba(255,255,255,0.18)' : 'rgba(120,105,85,0.18)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      let vx = x + tx * ts + rnd() * ts;
      let vy = y + ty * ts;
      ctx.moveTo(vx, vy);
      for (let k = 0; k < 4; k++) {
        vx += (rnd() - 0.5) * 24;
        vy += ts / 4;
        ctx.lineTo(vx, vy);
      }
      ctx.stroke();
    }
    for (let gx = 0; gx <= w; gx += ts) line(ctx, x + gx, y, x + gx, y + h, 'rgba(90,80,60,0.25)', 1);
    for (let gy = 0; gy <= h; gy += ts) line(ctx, x, y + gy, x + w, y + gy, 'rgba(90,80,60,0.25)', 1);
    const g = ctx.createLinearGradient(x, y, x + w * 0.6, y + h);
    g.addColorStop(0, 'rgba(255,255,255,0.12)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  } else if (L.floor === 'speckle') {
    ctx.fillStyle = tone;
    ctx.fillRect(x, y, w, h);
    for (let i = 0; i < w * h * 0.05; i++) {
      const k = rnd();
      ctx.fillStyle = k < 0.4 ? 'rgba(60,55,50,0.35)' : k < 0.7 ? 'rgba(255,255,255,0.35)' : 'rgba(150,120,90,0.3)';
      ctx.fillRect(x + rnd() * w, y + rnd() * h, 1.4, 1.4);
    }
    const ts = 48;
    for (let gx = 0; gx <= w; gx += ts) line(ctx, x + gx, y, x + gx, y + h, 'rgba(0,0,0,0.1)', 1);
    for (let gy = 0; gy <= h; gy += ts) line(ctx, x, y + gy, x + w, y + gy, 'rgba(0,0,0,0.1)', 1);
    texture(ctx, x, y, w, h, 'cloud', 0.25, 'multiply', 2);
  } else if (L.floor === 'carpet') {
    ctx.fillStyle = tone;
    ctx.fillRect(x, y, w, h);
    for (let i = 0; i < w * h * 0.05; i++) {
      ctx.fillStyle = rnd() < 0.5 ? shade(tone, 0.12, 0.5) : shade(tone, -0.15, 0.5);
      ctx.fillRect(x + rnd() * w, y + rnd() * h, 1, 1);
    }
    texture(ctx, x, y, w, h, 'cloud', 0.3, 'multiply', 2);
  } else {
    // concrete
    ctx.fillStyle = tone;
    ctx.fillRect(x, y, w, h);
    texture(ctx, x, y, w, h, 'cloud', 0.45, 'multiply', 2);
    texture(ctx, x, y, w, h, 'grain', 0.12, 'overlay');
    for (let gx = x; gx < x + w; gx += 120) line(ctx, gx, y, gx, y + h, 'rgba(0,0,0,0.18)', 1);
    for (let gy = y; gy < y + h; gy += 120) line(ctx, x, gy, x + w, gy, 'rgba(0,0,0,0.18)', 1);
    if (L.oil) for (let i = 0; i < 18; i++) ellipse(ctx, x + rnd() * w, y + rnd() * h, 10 + rnd() * 26, 6 + rnd() * 14, `rgba(15,15,20,${0.1 + rnd() * 0.18})`);
    if (L.lanes) {
      ctx.strokeStyle = 'rgba(255,210,63,0.75)';
      ctx.lineWidth = 6;
      ctx.strokeRect(x + 20, y + 120, w - 40, h - 150);
    }
  }
  ctx.restore();
}

const FLOOR_DECOR = new Set(['rug', 'mat', 'runner', 'carpet', 'stallpaint', 'dancefloor']);

// A door set into the back wall, seen face on.
function backDoor(ctx, d, L, wallH) {
  const x = d.x;
  const w = d.w;
  const top = wallH - 112;
  // light spilling under the door onto the floor
  vgrad(ctx, x + 4, wallH, w - 8, 10, [[0, 'rgba(0,0,0,0.35)'], [1, 'rgba(0,0,0,0)']]);
  fillRR(ctx, x - 7, top - 7, w + 14, 119, 2, shade(L.trim, -0.1), shade(L.trim, -0.5), 1);
  const slab = d.vacant ? '#7d6a55' : '#8a5b3c';
  vgrad(ctx, x, top, w, 112, [[0, shade(slab, 0.08)], [1, shade(slab, -0.12)]]);
  fillRR(ctx, x + 6, top + 8, w - 12, 42, 2, null, 'rgba(0,0,0,0.25)', 1.2);
  fillRR(ctx, x + 6, top + 58, w - 12, 46, 2, null, 'rgba(0,0,0,0.25)', 1.2);
  texture(ctx, x, top, w, 112, 'grain', 0.12, 'overlay');
  circle(ctx, x + w - 10, top + 60, 2.6, '#d9c08a');
  circle(ctx, x + w - 10.6, top + 59.4, 1, '#fff6d0');
  if (d.plate) {
    fillRR(ctx, x + w / 2 - 11, top + 18, 22, 12, 2, '#d9c08a', '#6d5223', 1);
    text(ctx, d.plate, x + w / 2, top + 24.5, { size: 8, color: '#3a2a10' });
  }
  if (d.vacant) {
    ctx.save();
    ctx.translate(x + w / 2, top + 44);
    ctx.rotate(-0.08);
    fillRR(ctx, -20, -7, 40, 14, 1, '#f4efe2', 'rgba(0,0,0,0.3)', 0.8);
    text(ctx, 'VACANT', 0, 0.5, { size: 7, color: '#b3261e' });
    ctx.restore();
  }
  // welcome mat on the floor
  fillRR(ctx, x + 4, wallH + 4, w - 8, 12, 2, '#5a4636', 'rgba(0,0,0,0.3)', 0.8);
}

function floorDecor(ctx, d, rnd) {
  if (d.type === 'dancefloor') {
    // base tiles; the lights are animated by the view
    const ts = 30;
    for (let ty = 0; ty * ts < d.h; ty++) for (let tx = 0; tx * ts < d.w; tx++) {
      ctx.fillStyle = (tx + ty) % 2 ? '#1d1626' : '#2a2036';
      ctx.fillRect(d.x + tx * ts, d.y + ty * ts, ts - 1, ts - 1);
    }
    ctx.strokeStyle = 'rgba(199,146,255,0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(d.x - 2, d.y - 2, d.w + 4, d.h + 4);
    return;
  }
  if (d.type === 'stallpaint') {
    ctx.strokeStyle = 'rgba(255,210,63,0.8)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x, d.y + d.h);
    ctx.moveTo(d.x + d.w, d.y);
    ctx.lineTo(d.x + d.w, d.y + d.h);
    ctx.stroke();
    text(ctx, d.text, d.x + d.w / 2, d.y + d.h - 16, { size: 14, color: 'rgba(255,210,63,0.75)' });
    return;
  }
  if (d.type === 'runner' || d.type === 'carpet') {
    shadowBlob(ctx, d.x + d.w / 2, d.y + d.h / 2 + 2, d.w * 0.52, d.h * 0.6, 0.12);
    fillRR(ctx, d.x, d.y, d.w, d.h, 3, d.tone, shade(d.tone, -0.45), 1.5);
    fillRR(ctx, d.x + 5, d.y + 5, d.w - 10, d.h - 10, 2, null, shade('#d9a441', 0, 0.45), 1.5);
    texture(ctx, d.x, d.y, d.w, d.h, 'grain', 0.2, 'overlay');
    texture(ctx, d.x, d.y, d.w, d.h, 'cloud', 0.25, 'multiply', 1.5);
    return;
  }
  if (d.type === 'rug') {
    shadowBlob(ctx, d.x + d.w / 2, d.y + d.h / 2 + 3, d.w * 0.55, d.h * 0.55, 0.18);
    fillRR(ctx, d.x, d.y, d.w, d.h, 6, d.tone, shade(d.tone, -0.4), 1.5);
    fillRR(ctx, d.x + 10, d.y + 10, d.w - 20, d.h - 20, 4, null, shade(d.tone, 0.35, 0.7), 2);
    fillRR(ctx, d.x + 18, d.y + 18, d.w - 36, d.h - 36, 3, shade(d.tone, -0.12), null);
    // medallion
    ctx.save();
    ctx.translate(d.x + d.w / 2, d.y + d.h / 2);
    ctx.scale(1, 0.62);
    for (let r = 46; r > 6; r -= 10) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.strokeStyle = r % 20 === 6 ? shade(d.tone, 0.4, 0.55) : shade('#d9a441', 0, 0.45);
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
    texture(ctx, d.x, d.y, d.w, d.h, 'grain', 0.18, 'overlay');
    // fringe
    ctx.fillStyle = shade('#e8dcc4', 0, 0.7);
    for (let fx = d.x + 3; fx < d.x + d.w - 3; fx += 4) {
      ctx.fillRect(fx, d.y - 3, 1.2, 3);
      ctx.fillRect(fx, d.y + d.h, 1.2, 3);
    }
  } else if (d.type === 'mat') {
    fillRR(ctx, d.x, d.y, d.w, d.h, 4, '#2f4f8a', 'rgba(0,0,0,0.4)', 1);
    for (let i = 1; i < 4; i++) line(ctx, d.x + (d.w / 4) * i, d.y, d.x + (d.w / 4) * i, d.y + d.h, 'rgba(0,0,0,0.25)', 1);
    texture(ctx, d.x, d.y, d.w, d.h, 'grain', 0.2, 'overlay');
  }
}

function paintWall(ctx, L, x, y, w, h, rnd) {
  const tone = L.wallTone;
  if (L.wall === 'diner') {
    const split = h * 0.58;
    vgrad(ctx, x, y, w, split, [[0, '#e9dcbf'], [1, '#f3e9d2']]);
    texture(ctx, x, y, w, split, 'cloud', 0.15, 'multiply', 2);
    // lower vinyl paneling
    vgrad(ctx, x, split, w, h - split, [[0, shade(tone, 0.08)], [1, shade(tone, -0.18)]]);
    for (let px = x; px < x + w; px += 22) {
      line(ctx, px, split + 6, px, h - 12, shade(tone, -0.3, 0.6), 1);
      line(ctx, px + 1, split + 6, px + 1, h - 12, shade(tone, 0.25, 0.25), 1);
    }
    // chrome strip
    vgrad(ctx, x, split - 3, w, 8, [[0, '#f4f6f8'], [0.45, '#9ba3ab'], [0.55, '#e8ecef'], [1, '#6c737a']]);
    // checker baseboard
    const bs = 8;
    for (let px = 0; px < w; px += bs) {
      ctx.fillStyle = (px / bs) % 2 ? '#111' : '#eee';
      ctx.fillRect(x + px, h - 12, bs, 6);
      ctx.fillStyle = (px / bs) % 2 ? '#eee' : '#111';
      ctx.fillRect(x + px, h - 6, bs, 6);
    }
  } else if (L.wall === 'block') {
    vgrad(ctx, x, y, w, h, [[0, shade(tone, -0.1)], [1, shade(tone, 0.06)]]);
    const bw = 40;
    const bh = 18;
    for (let row = 0; row * bh < h; row++) {
      const off = row % 2 ? bw / 2 : 0;
      for (let bx = -off; bx < w; bx += bw) {
        ctx.fillStyle = jitter(tone, rnd, 0.04);
        ctx.fillRect(x + bx + 1, y + row * bh + 1, bw - 2, bh - 2);
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(x + bx + 1, y + row * bh + 1, bw - 2, 1.5);
      }
    }
    texture(ctx, x, y, w, h, 'grain', 0.1, 'overlay');
    // painted stripe
    ctx.fillStyle = L.trim;
    ctx.fillRect(x, h * 0.72, w, 10);
    ctx.fillStyle = shade(L.trim, -0.3);
    ctx.fillRect(x, h * 0.72 + 10, w, 2);
    ctx.fillStyle = L.base || '#222';
    ctx.fillRect(x, h - 9, w, 9);
  } else if (L.wall === 'brick') {
    ctx.fillStyle = '#5b4a40';
    ctx.fillRect(x, y, w, h);
    const bw = 22;
    const bh = 9;
    for (let row = 0; row * bh < h; row++) {
      const off = row % 2 ? bw / 2 : 0;
      for (let bx = -off; bx < w; bx += bw) {
        ctx.fillStyle = jitter(tone, rnd, 0.1);
        ctx.fillRect(x + bx + 1, y + row * bh + 1, bw - 2, bh - 2);
      }
    }
    texture(ctx, x, y, w, h, 'cloud', 0.25, 'multiply', 1.5);
    ctx.fillStyle = L.base || '#222';
    ctx.fillRect(x, h - 9, w, 9);
  } else if (L.wall === 'wood') {
    // dark wood paneling, brass rail
    vgrad(ctx, x, y, w, h, [[0, shade(tone, -0.2)], [1, shade(tone, 0.05)]]);
    for (let px = x; px < x + w; px += 56) {
      fillRR(ctx, px + 4, y + 14, 48, h * 0.5 - 18, 2, null, shade(tone, -0.4, 0.6), 1.2);
      fillRR(ctx, px + 4, y + h * 0.5 + 6, 48, h * 0.5 - 22, 2, null, shade(tone, -0.4, 0.6), 1.2);
      line(ctx, px + 5, y + 15, px + 51, y + 15, shade(tone, 0.25, 0.4), 1);
    }
    texture(ctx, x, y, w, h, 'grain', 0.14, 'overlay');
    vgrad(ctx, x, h * 0.5 - 3, w, 6, [[0, '#f1dfa3'], [0.5, '#b58b3e'], [1, '#6d5223']]);
    ctx.fillStyle = L.base || '#222';
    ctx.fillRect(x, h - 10, w, 10);
  } else if (L.wall === 'metal') {
    vgrad(ctx, x, y, w, h, [[0, shade(tone, -0.15)], [1, shade(tone, 0.05)]]);
    for (let k = 0; k < w; k += 9) {
      line(ctx, x + k, y, x + k, y + h, 'rgba(255,255,255,0.12)', 2);
      line(ctx, x + k + 4, y, x + k + 4, y + h, 'rgba(0,0,0,0.16)', 2);
    }
    texture(ctx, x, y, w, h, 'cloud', 0.3, 'multiply', 1.6);
    ctx.fillStyle = L.trim;
    ctx.fillRect(x, h * 0.78, w, 7);
    for (let k = 0; k < w; k += 28) {
      ctx.fillStyle = '#1d1d1d';
      ctx.beginPath();
      ctx.moveTo(x + k, h * 0.78);
      ctx.lineTo(x + k + 10, h * 0.78);
      ctx.lineTo(x + k + 3, h * 0.78 + 7);
      ctx.lineTo(x + k - 7, h * 0.78 + 7);
      ctx.fill();
    }
    ctx.fillStyle = L.base || '#222';
    ctx.fillRect(x, h - 10, w, 10);
  } else if (L.wall === 'tiled') {
    vgrad(ctx, x, y, w, h, [[0, shade(tone, -0.05)], [1, shade(tone, 0.08)]]);
    for (let gx = 0; gx < w; gx += 20) line(ctx, x + gx, y, x + gx, y + h, 'rgba(0,0,0,0.12)', 1);
    for (let gy = 0; gy < h; gy += 20) line(ctx, x, y + gy, x + w, y + gy, 'rgba(0,0,0,0.12)', 1);
    ctx.fillStyle = L.trim;
    ctx.fillRect(x, h * 0.55, w, 6);
    ctx.fillStyle = L.base || '#222';
    ctx.fillRect(x, h - 9, w, 9);
  } else {
    // painted drywall
    vgrad(ctx, x, y, w, h, [[0, shade(tone, -0.12)], [0.6, tone], [1, shade(tone, 0.05)]]);
    texture(ctx, x, y, w, h, 'cloud', 0.18, 'multiply', 2);
    texture(ctx, x, y, w, h, 'grain', 0.05, 'overlay');
    if (L.wainscot) {
      // lower wall in a darker institutional paint with a chair rail
      ctx.fillStyle = L.wainscot;
      ctx.fillRect(x, h * 0.62, w, h * 0.38);
      texture(ctx, x, h * 0.62, w, h * 0.38, 'cloud', 0.18, 'multiply', 2);
      vgrad(ctx, x, h * 0.62 - 3, w, 6, [[0, shade(L.trim, 0.2)], [1, shade(L.trim, -0.2)]]);
    }
    if (L.panel) {
      ctx.fillStyle = '#7a5a3a';
      ctx.fillRect(x, h * 0.5, w, h * 0.5);
      for (let k = 0; k < w; k += 18) line(ctx, x + k, h * 0.5, x + k, h, 'rgba(0,0,0,0.22)', 1);
      texture(ctx, x, h * 0.5, w, h * 0.5, 'grain', 0.15, 'overlay');
      ctx.fillStyle = L.trim;
      ctx.fillRect(x, h * 0.5 - 3, w, 5);
    }
    if (L.checker) {
      for (let k = 0; k < w; k += 12) {
        ctx.fillStyle = (k / 12) % 2 ? '#1d1d1d' : '#f4f4f0';
        ctx.fillRect(x + k, h * 0.6, 12, 8);
        ctx.fillStyle = (k / 12) % 2 ? '#f4f4f0' : '#1d1d1d';
        ctx.fillRect(x + k, h * 0.6 + 8, 12, 8);
      }
    }
    if (L.stripe) {
      ctx.fillStyle = L.stripe;
      ctx.fillRect(x, h * 0.66, w, 8);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(x, h * 0.66, w, 1.5);
    }
    // crown molding + baseboard
    vgrad(ctx, x, 7, w, 6, [[0, shade(L.trim, -0.2)], [1, L.trim]]);
    ctx.fillStyle = L.trim;
    ctx.fillRect(x, h - 13, w, 13);
    ctx.fillStyle = shade(L.trim, -0.25);
    ctx.fillRect(x, h - 13, w, 1.5);
    ctx.fillStyle = shade(L.trim, -0.45);
    ctx.fillRect(x, h - 2, w, 2);
    // outlet
    fillRR(ctx, x + w * 0.62, h - 34, 8, 12, 1.5, '#f4f0e6', 'rgba(0,0,0,0.3)');
  }
  // wall shading toward the corners
  hgrad(ctx, x, y, 60, h, [[0, 'rgba(0,0,0,0.25)'], [1, 'rgba(0,0,0,0)']]);
  hgrad(ctx, x + w - 60, y, 60, h, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.25)']]);
}

function paintWindow(ctx, win, L, rnd) {
  const { x, y, w, h } = win;
  const frame = L.wall === 'diner' ? '#c9ced3' : L.trim;
  // outer frame shadow
  fillRR(ctx, x - 7, y - 7, w + 14, h + 16, 3, 'rgba(0,0,0,0.25)', null);
  fillRR(ctx, x - 6, y - 6, w + 12, h + 12, 2, frame, shade(frame, -0.45), 1);
  ctx.clearRect(x, y, w, h);
  // mullions
  ctx.fillStyle = shade(frame, -0.08);
  if (w > 140) {
    ctx.fillRect(x + w / 3 - 2, y, 4, h);
    ctx.fillRect(x + (2 * w) / 3 - 2, y, 4, h);
  } else {
    ctx.fillRect(x + w / 2 - 2, y, 4, h);
  }
  ctx.fillRect(x, y + h * 0.5 - 2, w, 4);
  // inner shading
  vgrad(ctx, x, y, w, 6, [[0, 'rgba(0,0,0,0.3)'], [1, 'rgba(0,0,0,0)']]);
  // sill
  fillRR(ctx, x - 10, y + h + 4, w + 20, 6, 1.5, shade(frame, 0.12), shade(frame, -0.4), 1);
  if (win.blinds) {
    for (let by = y + 2; by < y + h * 0.55; by += 6) {
      ctx.fillStyle = 'rgba(240,232,214,0.92)';
      ctx.fillRect(x, by, w, 3.6);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(x, by + 3.6, w, 0.8);
    }
    line(ctx, x + w * 0.2, y, x + w * 0.2, y + h * 0.55, 'rgba(255,255,255,0.4)', 0.7);
    line(ctx, x + w * 0.8, y, x + w * 0.8, y + h * 0.55, 'rgba(255,255,255,0.4)', 0.7);
    fillRR(ctx, x - 4, y - 2, w + 8, 5, 1, shade(frame, -0.05), null);
  }
  if (L.wall === 'diner') {
    // window decal: STARLITE reversed reads from outside
    ctx.save();
    ctx.translate(x + w / 2, y + h * 0.3);
    ctx.scale(-1, 1);
    text(ctx, 'STARLITE', 0, 0, { size: 16, color: 'rgba(255,90,140,0.55)' });
    ctx.restore();
  }
}

function wallDecor(ctx, d, L, rnd, def) {
  switch (d.type) {
    case 'poster': {
      fillRR(ctx, d.x + 2, d.y + 3, d.w, d.h, 1, 'rgba(0,0,0,0.25)', null);
      fillRR(ctx, d.x, d.y, d.w, d.h, 1, '#f1e9d8', null);
      const ix = d.x + 4;
      const iy = d.y + 4;
      const iw = d.w - 8;
      const ih = d.h - 18;
      vgrad(ctx, ix, iy, iw, ih, [[0, shade(d.tone, 0.2)], [1, shade(d.tone, -0.25)]]);
      if (d.art === 'sun') {
        circle(ctx, ix + iw / 2, iy + ih * 0.62, iw * 0.28, '#ffe39a');
        ctx.fillStyle = shade(d.tone, -0.5);
        ctx.fillRect(ix, iy + ih * 0.7, iw, ih * 0.3);
        // palm
        line(ctx, ix + iw * 0.25, iy + ih, ix + iw * 0.3, iy + ih * 0.35, '#2a1f1a', 2);
        for (let k = 0; k < 5; k++) {
          const a = -Math.PI + k * 0.6 + 0.3;
          line(ctx, ix + iw * 0.3, iy + ih * 0.35, ix + iw * 0.3 + Math.cos(a) * 12, iy + ih * 0.35 + Math.sin(a) * 7 + 3, '#2a1f1a', 1.6);
        }
      } else if (d.art === 'fist') {
        fillRR(ctx, ix + iw * 0.3, iy + ih * 0.3, iw * 0.4, ih * 0.38, 4, '#2a2a2a', null);
        for (let k = 0; k < 4; k++) line(ctx, ix + iw * 0.36 + k * iw * 0.08, iy + ih * 0.32, ix + iw * 0.36 + k * iw * 0.08, iy + ih * 0.45, '#555', 1);
      } else if (d.art === 'car') {
        fillRR(ctx, ix + 6, iy + ih * 0.45, iw - 12, ih * 0.25, 6, '#f4f4f0', null);
        fillRR(ctx, ix + 16, iy + ih * 0.3, iw - 32, ih * 0.2, 5, '#f4f4f0', null);
        circle(ctx, ix + 16, iy + ih * 0.72, 5, '#1d1d1d');
        circle(ctx, ix + iw - 16, iy + ih * 0.72, 5, '#1d1d1d');
        text(ctx, '$0 DOWN', ix + iw / 2, iy + 10, { size: 8, color: '#fff' });
      } else if (d.art === 'bolt') {
        ctx.fillStyle = '#ffe14d';
        ctx.beginPath();
        ctx.moveTo(ix + iw * 0.55, iy + 6);
        ctx.lineTo(ix + iw * 0.3, iy + ih * 0.55);
        ctx.lineTo(ix + iw * 0.5, iy + ih * 0.55);
        ctx.lineTo(ix + iw * 0.4, iy + ih - 4);
        ctx.lineTo(ix + iw * 0.72, iy + ih * 0.42);
        ctx.lineTo(ix + iw * 0.52, iy + ih * 0.42);
        ctx.closePath();
        ctx.fill();
      }
      texture(ctx, d.x, d.y, d.w, d.h, 'grain', 0.12, 'overlay');
      ctx.fillStyle = '#333';
      ctx.fillRect(d.x + 6, d.y + d.h - 11, d.w - 12, 2);
      ctx.fillRect(d.x + 10, d.y + d.h - 7, d.w - 20, 1.5);
      ctx.fillStyle = 'rgba(255,255,230,0.6)';
      ctx.fillRect(d.x - 2, d.y - 2, 8, 4);
      ctx.fillRect(d.x + d.w - 6, d.y - 2, 8, 4);
      break;
    }
    case 'clock': {
      circle(ctx, d.x + 1, d.y + 2, 15, 'rgba(0,0,0,0.25)');
      circle(ctx, d.x, d.y, 15, '#2b2b2b');
      circle(ctx, d.x, d.y, 12.5, '#f6f2e8');
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        line(ctx, d.x + Math.cos(a) * 10, d.y + Math.sin(a) * 10, d.x + Math.cos(a) * 11.8, d.y + Math.sin(a) * 11.8, '#333', 1);
      }
      break;
    }
    case 'neonclock': {
      circle(ctx, d.x, d.y, 22, 'rgba(255,60,140,0.18)');
      circle(ctx, d.x, d.y, 17, '#1d1d24');
      circle(ctx, d.x, d.y, 15, '#f5f1e6');
      ctx.beginPath();
      ctx.arc(d.x, d.y, 18.5, 0, Math.PI * 2);
      ctx.strokeStyle = '#ff5d8f';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      break;
    }
    case 'shelfwall': {
      fillRR(ctx, d.x, d.y + 26, d.w, 5, 1, '#6b4a33', 'rgba(0,0,0,0.4)');
      vgrad(ctx, d.x, d.y + 31, d.w, 8, [[0, 'rgba(0,0,0,0.25)'], [1, 'rgba(0,0,0,0)']]);
      let bx = d.x + 6;
      const cols = ['#b5462f', '#3e6d8f', '#d4a33b', '#5a7d47', '#7a4b8c', '#d8d0c0'];
      while (bx < d.x + d.w - 30) {
        const bw = 4 + rnd() * 4;
        const bh = 14 + rnd() * 9;
        ctx.fillStyle = cols[Math.floor(rnd() * cols.length)];
        ctx.fillRect(bx, d.y + 26 - bh, bw, bh);
        bx += bw + 0.6;
      }
      // plant
      fillRR(ctx, d.x + d.w - 24, d.y + 14, 16, 12, 2, '#b36a43', null);
      for (let k = 0; k < 7; k++) ellipse(ctx, d.x + d.w - 16 + (rnd() - 0.5) * 18, d.y + 8 + (rnd() - 0.5) * 10, 5, 3, k % 2 ? '#4f7d3a' : '#6c9a4a');
      break;
    }
    case 'menu': {
      fillRR(ctx, d.x + 3, d.y + 4, d.w, d.h, 3, 'rgba(0,0,0,0.3)', null);
      fillRR(ctx, d.x, d.y, d.w, d.h, 3, '#1c1e1d', '#6b4a33', 3);
      text(ctx, '★ STARLITE ★', d.x + d.w / 2, d.y + 13, { size: 11, color: '#ff8fb4' });
      const items = [['Plate lunch', '9'], ['Breakfast taco', '3'], ['Kolache', '3'], ['Pecan pie', '4'], ['Coffee / Tea', '2']];
      items.forEach(([n, pr], i) => {
        text(ctx, n, d.x + 10, d.y + 28 + i * 9.5, { size: 8, color: '#f0ece0', align: 'left', font: 'Georgia, serif' });
        text(ctx, '$' + pr, d.x + d.w - 10, d.y + 28 + i * 9.5, { size: 8, color: '#ffe08a', align: 'right', font: 'Georgia, serif' });
      });
      texture(ctx, d.x, d.y, d.w, d.h, 'grain', 0.08, 'overlay');
      break;
    }
    case 'restroom': {
      fillRR(ctx, d.x - 2, d.y - 2, 44, def.wallH - d.y - 8, 2, shade(L.trim, -0.2), null);
      fillRR(ctx, d.x, d.y, 40, def.wallH - d.y - 10, 1, '#8c6a4d', 'rgba(0,0,0,0.4)');
      circle(ctx, d.x + 33, d.y + 46, 2, '#d9c08a');
      fillRR(ctx, d.x + 10, d.y + 10, 20, 14, 2, '#2b5ea8', null);
      text(ctx, 'WC', d.x + 20, d.y + 17, { size: 8, color: '#fff' });
      break;
    }
    case 'pass': {
      fillRR(ctx, d.x - 5, d.y - 5, d.w + 10, d.h + 12, 2, '#9ba3ab', '#555', 1);
      vgrad(ctx, d.x, d.y, d.w, d.h, [[0, '#2a2522'], [1, '#4a3d33']]);
      // heat lamps
      for (let k = 0; k < 3; k++) {
        ellipse(ctx, d.x + 18 + k * 30, d.y + 6, 9, 4, '#ff9a4a');
        ellipse(ctx, d.x + 18 + k * 30, d.y + 12, 14, 6, 'rgba(255,150,60,0.25)');
      }
      ctx.fillStyle = '#c9ced3';
      ctx.fillRect(d.x - 6, d.y + d.h, d.w + 12, 6);
      text(ctx, 'ORDER UP', d.x + d.w / 2, d.y - 12, { size: 8, color: '#333' });
      break;
    }
    case 'mailwall': {
      fillRR(ctx, d.x - 2, d.y - 2, d.w + 4, 56, 2, '#6d737a', '#2b2e32', 1);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        const bx = d.x + 2 + c * (d.w / 4);
        const by = d.y + 2 + r * 13;
        fillRR(ctx, bx, by, d.w / 4 - 3, 11, 1, '#a9b0b7', 'rgba(0,0,0,0.35)', 0.8);
        circle(ctx, bx + d.w / 4 - 7, by + 5.5, 1, '#3a3d42');
      }
      break;
    }
    case 'stairs': {
      // a stairwell going up, seen through an opening
      fillRR(ctx, d.x - 6, d.y - 2, d.w + 12, def.wallH - d.y, 2, shade(L.trim, -0.15), null);
      vgrad(ctx, d.x, d.y + 4, d.w, def.wallH - d.y - 4, [[0, '#2d2622'], [1, '#4a3d33']]);
      for (let k = 0; k < 8; k++) {
        const sy = def.wallH - 14 - k * 15;
        ctx.fillStyle = shade('#8a5b3c', -k * 0.05);
        ctx.fillRect(d.x + 4, sy, d.w - 8, 6);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(d.x + 4, sy + 6, d.w - 8, 9);
      }
      line(ctx, d.x + 8, def.wallH - 30, d.x + d.w - 14, d.y + 20, '#c9b48a', 2.5);
      text(ctx, 'UP ▲', d.x + d.w / 2, d.y + 12, { size: 8, color: '#e8dcc4' });
      break;
    }
    case 'sign': case 'storesign': case 'banksign': {
      const big = d.type !== 'sign';
      const sw = d.w || 80;
      const sh = big ? 26 : 16;
      const col = d.type === 'banksign' ? '#d8c08a' : d.type === 'storesign' ? '#2c7a4b' : '#f3eee2';
      fillRR(ctx, d.x + 2, d.y + 2, sw, sh, 2, 'rgba(0,0,0,0.25)', null);
      fillRR(ctx, d.x, d.y, sw, sh, 2, col, 'rgba(0,0,0,0.35)', 1);
      text(ctx, d.text, d.x + sw / 2, d.y + sh / 2 + 0.5, { size: big ? 11 : 6.5, color: d.type === 'sign' ? '#2b2b2b' : d.type === 'banksign' ? '#2a1c0e' : '#f4f0e6' });
      break;
    }
    case 'vault': {
      fillRR(ctx, d.x, d.y, d.w, d.w * 0.9, 6, '#4a4f55', '#1d1f22', 2);
      circle(ctx, d.x + d.w / 2, d.y + d.w * 0.45, d.w * 0.36, '#9aa3ab');
      circle(ctx, d.x + d.w / 2, d.y + d.w * 0.45, d.w * 0.3, '#b9c2c9');
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        line(ctx, d.x + d.w / 2, d.y + d.w * 0.45, d.x + d.w / 2 + Math.cos(a) * d.w * 0.2, d.y + d.w * 0.45 + Math.sin(a) * d.w * 0.2, '#5d656c', 3);
      }
      circle(ctx, d.x + d.w / 2, d.y + d.w * 0.45, 7, '#5d656c');
      for (let k = 0; k < 10; k++) circle(ctx, d.x + d.w / 2 + Math.cos(k * 0.63) * d.w * 0.4, d.y + d.w * 0.45 + Math.sin(k * 0.63) * d.w * 0.4, 2, '#3a3e43');
      break;
    }
    case 'graffiti': {
      ctx.save();
      ctx.translate(d.x, d.y + 40);
      ctx.rotate(-0.08);
      ctx.font = '900 30px Impact, Arial Black, sans-serif';
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#1d1d1d';
      ctx.strokeText('H-TOWN', 0, 0);
      const g = ctx.createLinearGradient(0, -28, 0, 0);
      g.addColorStop(0, '#ff5d8f');
      g.addColorStop(1, '#ffd23f');
      ctx.fillStyle = g;
      ctx.fillText('H-TOWN', 0, 0);
      ctx.restore();
      line(ctx, d.x + 150, d.y + 20, d.x + 200, d.y + 70, 'rgba(80,200,255,0.6)', 3);
      break;
    }
    case 'redcross': {
      fillRR(ctx, d.x - 30, d.y - 6, 60, 60, 6, '#f6f6f2', 'rgba(0,0,0,0.25)', 1);
      ctx.fillStyle = '#d32f2f';
      ctx.fillRect(d.x - 8, d.y + 4, 16, 40);
      ctx.fillRect(d.x - 20, d.y + 16, 40, 16);
      text(ctx, 'EMERGENCY', d.x, d.y + 66, { size: 8, color: '#b3261e' });
      break;
    }
    case 'curtainrail': {
      line(ctx, d.x, d.y, d.x + d.w, d.y, '#8c949b', 2);
      for (let k = 0; k < 3; k++) {
        const cx = d.x + 10 + k * 106;
        for (let f = 0; f < 6; f++) {
          ctx.fillStyle = f % 2 ? '#a8d1c8' : '#93c0b6';
          ctx.fillRect(cx + f * 5, d.y + 2, 5, 100);
        }
        vgrad(ctx, cx, d.y + 2, 30, 100, [[0, 'rgba(255,255,255,0.15)'], [1, 'rgba(0,0,0,0.12)']]);
      }
      break;
    }
    case 'seal': {
      circle(ctx, d.x + 2, d.y + 3, 30, 'rgba(0,0,0,0.25)');
      circle(ctx, d.x, d.y, 30, '#1f3557');
      circle(ctx, d.x, d.y, 25, '#e8c547');
      circle(ctx, d.x, d.y, 21, '#1f3557');
      ctx.fillStyle = '#e8c547';
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 5;
        const r = k % 2 ? 6 : 15;
        ctx.lineTo(d.x + Math.cos(a) * r, d.y + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      text(ctx, 'HARBOR PD', d.x, d.y + 42, { size: 9, color: '#1f3557' });
      break;
    }
    case 'wanted': {
      for (let k = 0; k < 3; k++) {
        const px = d.x + k * 42;
        fillRR(ctx, px, d.y + (k % 2) * 6, 34, 46, 1, '#f1e9d2', 'rgba(0,0,0,0.3)', 0.8);
        text(ctx, 'WANTED', px + 17, d.y + 8 + (k % 2) * 6, { size: 6, color: '#7a1f1f' });
        circle(ctx, px + 17, d.y + 22 + (k % 2) * 6, 7, '#8a7a6a');
        ctx.fillStyle = '#555';
        ctx.fillRect(px + 6, d.y + 34 + (k % 2) * 6, 22, 1.5);
        ctx.fillRect(px + 8, d.y + 38 + (k % 2) * 6, 18, 1.5);
      }
      break;
    }
    case 'staffonly': {
      fillRR(ctx, d.x - 4, d.y - 4, 56, def.wallH - d.y, 2, shade(L.trim, -0.1), null);
      fillRR(ctx, d.x, d.y, 48, def.wallH - d.y - 4, 1, '#5d656c', '#2b2e32', 1);
      fillRR(ctx, d.x + 12, d.y + 10, 24, 14, 1, 'rgba(160,190,210,0.6)', '#2b2e32', 1);
      fillRR(ctx, d.x + 6, d.y + 34, 36, 12, 1, '#b3261e', null);
      text(ctx, 'STAFF ONLY', d.x + 24, d.y + 40, { size: 5.5, color: '#fff' });
      circle(ctx, d.x + 40, d.y + 60, 2, '#c7ccd1');
      break;
    }
    case 'neonsign': {
      ctx.save();
      ctx.font = `900 ${d.small ? 18 : 30}px Impact, Arial Black, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = d.color;
      ctx.shadowBlur = 16;
      ctx.lineWidth = 3;
      ctx.strokeStyle = d.color;
      ctx.strokeText(d.text, d.x, d.y + 20);
      ctx.shadowBlur = 6;
      ctx.fillStyle = '#fff4ff';
      ctx.fillText(d.text, d.x, d.y + 20);
      ctx.restore();
      break;
    }
    case 'gunrack': {
      fillRR(ctx, d.x, d.y, d.w, 96, 2, '#3a2a1c', '#1d140c', 2);
      for (let k = 0; k < 6; k++) {
        const gx = d.x + 16 + k * ((d.w - 30) / 6);
        fillRR(ctx, gx, d.y + 10, 6, 76, 2, '#2b2b2b', null);
        fillRR(ctx, gx - 2, d.y + 54, 10, 28, 2, '#6b4a2a', null);
      }
      line(ctx, d.x + 6, d.y + 50, d.x + d.w - 6, d.y + 50, '#c9a24a', 2);
      break;
    }
    case 'pegboard': {
      fillRR(ctx, d.x, d.y, d.w, 90, 2, '#b08a5a', '#5a4026', 1.5);
      for (let gy = d.y + 6; gy < d.y + 88; gy += 8) for (let gx = d.x + 6; gx < d.x + d.w - 4; gx += 8) circle(ctx, gx, gy, 0.8, 'rgba(60,40,20,0.55)');
      const tools = [['#c9302c', 34, 12], ['#9aa3ab', 50, 8], ['#e8b923', 26, 10], ['#2c5aa0', 40, 9], ['#9aa3ab', 30, 14], ['#1d1d1d', 44, 10]];
      tools.forEach(([col, len, wd], k) => {
        const tx = d.x + 16 + k * ((d.w - 30) / tools.length);
        fillRR(ctx, tx, d.y + 14, wd, len, 2, col, 'rgba(0,0,0,0.4)', 0.8);
      });
      break;
    }
    case 'rollup': {
      fillRR(ctx, d.x - 6, d.y - 4, d.w + 12, def.wallH - d.y, 2, '#3a3d42', null);
      vgrad(ctx, d.x, d.y, d.w, def.wallH - d.y - 6, [[0, '#c7ccd1'], [1, '#8d949b']]);
      for (let k = d.y + 6; k < def.wallH - 8; k += 7) line(ctx, d.x, k, d.x + d.w, k, 'rgba(0,0,0,0.2)', 1.2);
      fillRR(ctx, d.x + d.w / 2 - 14, def.wallH - 20, 28, 6, 2, '#3a3d42', null);
      text(ctx, 'DOCK 2', d.x + d.w / 2, d.y + 16, { size: 9, color: '#1d1d1d' });
      break;
    }
    case 'citymap': {
      fillRR(ctx, d.x, d.y, d.w, 100, 2, '#efe9d8', '#6b5a43', 2);
      ctx.save();
      ctx.beginPath();
      ctx.rect(d.x + 6, d.y + 6, d.w - 12, 88);
      ctx.clip();
      for (let k = 0; k < 4; k++) line(ctx, d.x + 6, d.y + 16 + k * 24, d.x + d.w - 6, d.y + 16 + k * 24, '#e8b923', 3);
      for (let k = 0; k < 5; k++) line(ctx, d.x + 16 + k * 44, d.y + 6, d.x + 16 + k * 44, d.y + 94, '#e8b923', 3);
      ctx.strokeStyle = '#4f9fd0';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(d.x + 6, d.y + 70);
      ctx.bezierCurveTo(d.x + 60, d.y + 60, d.x + 120, d.y + 90, d.x + d.w, d.y + 76);
      ctx.stroke();
      for (let k = 0; k < 6; k++) circle(ctx, d.x + 30 + ((k * 53) % (d.w - 50)), d.y + 20 + ((k * 31) % 60), 3, '#c62828');
      ctx.restore();
      text(ctx, 'SERVICE AREA', d.x + d.w / 2, d.y + 108, { size: 7, color: '#3a2a10' });
      break;
    }
    case 'mirror': {
      fillRR(ctx, d.x - 4, d.y - 4, d.w + 8, d.h + 8, 2, '#c7ccd1', 'rgba(0,0,0,0.4)');
      vgrad(ctx, d.x, d.y, d.w, d.h, [[0, '#9fb0bf'], [0.5, '#c9d6df'], [1, '#7f8f9c']]);
      ctx.save();
      ctx.beginPath();
      ctx.rect(d.x, d.y, d.w, d.h);
      ctx.clip();
      for (let k = 0; k < 6; k++) {
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath();
        const sx = d.x + 30 + k * 50;
        ctx.moveTo(sx, d.y);
        ctx.lineTo(sx + 16, d.y);
        ctx.lineTo(sx - 30, d.y + d.h);
        ctx.lineTo(sx - 46, d.y + d.h);
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    default:
      break;
  }
}

function wallProp(ctx, p, L, rnd) {
  if (p.type === 'rentbox') {
    fillRR(ctx, p.x + 2, 116, p.w, 28, 2, 'rgba(0,0,0,0.3)', null);
    fillRR(ctx, p.x, 114, p.w, 28, 2, '#2f4f3a', '#15241a', 1);
    fillRR(ctx, p.x + 6, 119, p.w - 12, 3, 1, '#0b120d', null);
    text(ctx, 'RENT', p.x + p.w / 2, 132, { size: 7, color: '#e8d9a8' });
    return;
  }
  if (p.type === 'staffdoor') {
    const top = p.y + 8 - 112;
    fillRR(ctx, p.x - 5, top - 5, p.w + 10, 117, 2, shade(L.trim, -0.15), null);
    fillRR(ctx, p.x, top, p.w, 112, 1, '#6d737a', '#2b2e32', 1);
    fillRR(ctx, p.x + 8, top + 30, p.w - 16, 12, 1, '#ffd23f', null);
    text(ctx, 'EMPLOYEES', p.x + p.w / 2, top + 36, { size: 5.5, color: '#1a1a1a' });
    circle(ctx, p.x + p.w - 8, top + 62, 2, '#c7ccd1');
    return;
  }
  if (p.type === 'board') {
    const bx = p.x;
    const by = 58;
    fillRR(ctx, bx + 2, by + 3, p.w, 64, 2, 'rgba(0,0,0,0.3)', null);
    fillRR(ctx, bx, by, p.w, 64, 2, '#a5764a', '#5b3d24', 2);
    texture(ctx, bx, by, p.w, 64, 'grain', 0.3, 'overlay');
    const cols = ['#fff6d5', '#f2f2f2', '#ffd6e0', '#d9ecff'];
    for (let k = 0; k < 4; k++) {
      const nx = bx + 5 + (k % 2) * (p.w / 2 - 2);
      const ny = by + 6 + Math.floor(k / 2) * 28;
      ctx.save();
      ctx.translate(nx + 10, ny + 11);
      ctx.rotate((rnd() - 0.5) * 0.2);
      fillRR(ctx, -10, -11, 20, 22, 1, cols[k], null);
      for (let l = 0; l < 4; l++) ctx.fillRect(-7, -7 + l * 4, 14 - (l % 2) * 4, 1);
      circle(ctx, 0, -9, 1.6, '#c0392b');
      ctx.restore();
    }
    text(ctx, (p.label || 'Notices').toUpperCase(), bx + p.w / 2, by - 8, { size: 7, color: '#2b2b2b' });
  }
}

// ============================================================ streets
const { c: RC, half: RH, side: SW } = ROAD;

export function paintStreet(room) {
  const def = room.def;
  const W = CELL;
  const c = makeCanvas(W * RES_ST, W * RES_ST);
  const ctx = c.getContext('2d');
  ctx.scale(RES_ST, RES_ST);
  const rnd = rngFor(room.id);

  // lots
  for (const f of room.features) if (f.type === 'lot') paintLot(ctx, f, rnd);
  // lot detail features under everything else
  for (const f of room.features) groundFeature(ctx, f, rnd, 0);

  paintSidewalks(ctx, rnd);
  paintRoads(ctx, room, rnd);

  for (const f of room.features) groundFeature(ctx, f, rnd, 1);
  for (const f of room.features) if (f.type === 'building') paintBuilding(ctx, f, rnd);
  for (const f of room.features) groundFeature(ctx, f, rnd, 2);
  dressStreet(ctx, room, rnd);

  // city limit barricades
  for (const s of room.solids) if (s.tag === 'barricade') barricade(ctx, s);
  // fences at the outer edge
  if (!room.edges.n) fenceLine(ctx, 0, 2, W, 2);
  if (!room.edges.s) fenceLine(ctx, 0, W - 3, W, W - 3);
  if (!room.edges.w) fenceLine(ctx, 2, 0, 2, W, true);
  if (!room.edges.e) fenceLine(ctx, W - 3, 0, W - 3, W, true);
  return c;
}

function paintLot(ctx, f, rnd) {
  const { x, y, w, h } = f;
  if (f.kind === 'park') paintGrass(ctx, x, y, w, h, rnd, '#5d7c38');
  else if (f.kind === 'site') {
    ctx.fillStyle = '#9a7f5e';
    ctx.fillRect(x, y, w, h);
    texture(ctx, x, y, w, h, 'cloud', 0.5, 'multiply', 1.6);
    texture(ctx, x, y, w, h, 'grain', 0.2, 'overlay');
    for (let i = 0; i < 40; i++) ellipse(ctx, x + rnd() * w, y + rnd() * h, 8 + rnd() * 20, 4 + rnd() * 10, `rgba(80,60,40,${0.15 + rnd() * 0.2})`);
    for (let i = 0; i < 12; i++) {
      const ty = y + rnd() * h;
      ctx.strokeStyle = 'rgba(60,45,30,0.25)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x, ty);
      ctx.quadraticCurveTo(x + w / 2, ty + (rnd() - 0.5) * 80, x + w, ty + (rnd() - 0.5) * 40);
      ctx.stroke();
    }
  } else if (f.kind === 'vacant') {
    paintGrass(ctx, x, y, w, h, rnd, '#7b7d48');
    texture(ctx, x, y, w, h, 'cloud', 0.4, 'multiply', 1.2);
    for (let i = 0; i < 70; i++) ellipse(ctx, x + rnd() * w, y + rnd() * h, 6 + rnd() * 18, 4 + rnd() * 10, `rgba(120,100,70,${0.2 + rnd() * 0.3})`);
    for (let i = 0; i < 30; i++) {
      // litter
      ctx.fillStyle = ['#d9d4c8', '#c62828', '#3d6db5', '#e8b923'][Math.floor(rnd() * 4)];
      ctx.fillRect(x + rnd() * w, y + rnd() * h, 3, 2);
    }
  }
  else {
    // packed dirt + patchy weeds under building lots
    ctx.fillStyle = '#9b927f';
    ctx.fillRect(x, y, w, h);
    texture(ctx, x, y, w, h, 'cloud', 0.45, 'multiply', 2);
    texture(ctx, x, y, w, h, 'grain', 0.12, 'overlay');
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = `rgba(${70 + rnd() * 40},${95 + rnd() * 40},${40 + rnd() * 20},${0.25 + rnd() * 0.35})`;
      ctx.beginPath();
      ctx.ellipse(x + rnd() * w, y + rnd() * h, 2 + rnd() * 6, 1.5 + rnd() * 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function paintGrass(ctx, x, y, w, h, rnd, base) {
  ctx.fillStyle = base;
  ctx.fillRect(x, y, w, h);
  texture(ctx, x, y, w, h, 'cloud', 0.5, 'multiply', 2.5);
  texture(ctx, x, y, w, h, 'cloud', 0.25, 'screen', 1.3);
  const n = (w * h) / 22;
  for (let i = 0; i < n; i++) {
    const gx = x + rnd() * w;
    const gy = y + rnd() * h;
    const k = rnd();
    ctx.strokeStyle = k < 0.33 ? 'rgba(130,165,80,0.55)' : k < 0.66 ? 'rgba(60,90,35,0.5)' : 'rgba(160,180,90,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + (rnd() - 0.5) * 3, gy - 2 - rnd() * 3);
    ctx.stroke();
  }
  // a few clover / dandelion dots
  for (let i = 0; i < (w * h) / 1800; i++) circle(ctx, x + rnd() * w, y + rnd() * h, 1.2, rnd() < 0.5 ? 'rgba(255,240,150,0.7)' : 'rgba(255,255,255,0.6)');
}

function paintSidewalks(ctx, rnd) {
  const W = CELL;
  const a0 = RC - RH - SW;
  const a1 = RC + RH;
  const bands = [
    [0, a0, W, SW, 'h'], [0, a1, W, SW, 'h'],
    [a0, 0, SW, W, 'v'], [a1, 0, SW, W, 'v'],
  ];
  for (const [x, y, w, h, dir] of bands) {
    ctx.fillStyle = '#bdb6a6';
    ctx.fillRect(x, y, w, h);
  }
  for (const [x, y, w, h, dir] of bands) {
    texture(ctx, x, y, w, h, 'cloud', 0.32, 'multiply', 1.6);
    texture(ctx, x, y, w, h, 'grain', 0.1, 'overlay');
    // slabs
    const step = 40;
    if (dir === 'h') {
      for (let sx = x; sx < x + w; sx += step) {
        ctx.fillStyle = `rgba(0,0,0,${rnd() * 0.05})`;
        ctx.fillRect(sx, y, step, h);
        line(ctx, sx, y, sx, y + h, 'rgba(60,55,45,0.45)', 1);
      }
      line(ctx, x, y + h / 2, x + w, y + h / 2, 'rgba(60,55,45,0.2)', 1);
    } else {
      for (let sy = y; sy < y + h; sy += step) {
        ctx.fillStyle = `rgba(0,0,0,${rnd() * 0.05})`;
        ctx.fillRect(x, sy, w, step);
        line(ctx, x, sy, x + w, sy, 'rgba(60,55,45,0.45)', 1);
      }
      line(ctx, x + w / 2, y, x + w / 2, y + h, 'rgba(60,55,45,0.2)', 1);
    }
    // gum and stains
    for (let i = 0; i < (w * h) / 900; i++) circle(ctx, x + rnd() * w, y + rnd() * h, 0.8 + rnd() * 1.5, `rgba(40,35,30,${0.15 + rnd() * 0.2})`);
    // cracks
    for (let i = 0; i < (w * h) / 9000; i++) crack(ctx, x + rnd() * w, y + rnd() * h, rnd, 'rgba(50,45,38,0.45)', 14);
  }
}

function paintRoads(ctx, room, rnd) {
  const W = CELL;
  const r0 = RC - RH;
  ctx.fillStyle = '#3d3f43';
  ctx.fillRect(0, r0, W, RH * 2);
  ctx.fillRect(r0, 0, RH * 2, W);
  texture(ctx, 0, r0, W, RH * 2, 'cloud', 0.4, 'multiply', 2);
  texture(ctx, r0, 0, RH * 2, W, 'cloud', 0.4, 'multiply', 2);
  texture(ctx, 0, r0, W, RH * 2, 'grain', 0.18, 'overlay');
  texture(ctx, r0, 0, RH * 2, W, 'grain', 0.18, 'overlay');
  // patches
  for (let i = 0; i < 14; i++) {
    const horiz = rnd() < 0.5;
    const px = horiz ? rnd() * W : r0 + rnd() * RH * 2;
    const py = horiz ? r0 + rnd() * RH * 2 : rnd() * W;
    ctx.fillStyle = rnd() < 0.5 ? 'rgba(25,26,28,0.45)' : 'rgba(85,86,88,0.28)';
    ctx.fillRect(px - 20, py - 12, 30 + rnd() * 50, 18 + rnd() * 30);
  }
  // oil stains down the lane middles
  for (let i = 0; i < 40; i++) {
    const lane = [RC - RH * 0.75, RC - RH * 0.25, RC + RH * 0.25, RC + RH * 0.75][Math.floor(rnd() * 4)];
    const along = rnd() * W;
    const horiz = rnd() < 0.5;
    const ox = horiz ? along : lane;
    const oy = horiz ? lane : along;
    if (Math.abs(ox - RC) < RH && Math.abs(oy - RC) < RH) continue;
    ellipse(ctx, ox, oy, 6 + rnd() * 10, 4 + rnd() * 6, `rgba(10,10,12,${0.12 + rnd() * 0.15})`);
  }
  for (let i = 0; i < 26; i++) {
    const horiz = rnd() < 0.5;
    crack(ctx, horiz ? rnd() * W : r0 + rnd() * RH * 2, horiz ? r0 + rnd() * RH * 2 : rnd() * W, rnd, 'rgba(15,15,15,0.5)', 30);
  }
  // curbs
  const curb = (x, y, w, h) => {
    ctx.fillStyle = '#d1cbbd';
    ctx.fillRect(x, y, w, h);
  };
  curb(0, r0 - 4, r0, 4); curb(RC + RH, r0 - 4, W - RC - RH, 4);
  curb(0, RC + RH, r0, 4); curb(RC + RH, RC + RH, W - RC - RH, 4);
  curb(r0 - 4, 0, 4, r0); curb(r0 - 4, RC + RH, 4, W - RC - RH);
  curb(RC + RH, 0, 4, r0); curb(RC + RH, RC + RH, 4, W - RC - RH);
  // gutter shadows
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(0, r0, r0, 3); ctx.fillRect(RC + RH, r0, W, 3);
  ctx.fillRect(r0, 0, 3, r0); ctx.fillRect(r0, RC + RH, 3, W);

  // markings (outside the intersection box)
  const paint = (x, y, w, h, col) => {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w, h);
  };
  const yellow = 'rgba(232,190,60,0.88)';
  const white = 'rgba(235,235,228,0.85)';
  const box0 = r0 - 70;
  const box1 = RC + RH + 70;
  // center double yellow
  paint(0, RC - 4, box0, 2.5, yellow); paint(0, RC + 1.5, box0, 2.5, yellow);
  paint(box1, RC - 4, W - box1, 2.5, yellow); paint(box1, RC + 1.5, W - box1, 2.5, yellow);
  paint(RC - 4, 0, 2.5, box0, yellow); paint(RC + 1.5, 0, 2.5, box0, yellow);
  paint(RC - 4, box1, 2.5, W - box1, yellow); paint(RC + 1.5, box1, 2.5, W - box1, yellow);
  // lane dashes
  for (const lane of [RC - RH / 2, RC + RH / 2]) {
    for (let a = 0; a < W; a += 60) {
      if (a + 30 > box0 && a < box1) continue;
      paint(a, lane - 1.5, 30, 3, white);
      paint(lane - 1.5, a, 3, 30, white);
    }
  }
  // crosswalks + stop bars
  const zebra = (x, y, w, h, vertical) => {
    for (let k = 0; vertical ? k < h : k < w; k += 18) {
      if (vertical) paint(x, y + k + 3, w, 10, white);
      else paint(x + k + 3, y, 10, h, white);
    }
  };
  zebra(r0 - 52, r0, 40, RH * 2, true);
  zebra(RC + RH + 12, r0, 40, RH * 2, true);
  zebra(r0, r0 - 52, RH * 2, 40, false);
  zebra(r0, RC + RH + 12, RH * 2, 40, false);
  paint(r0 - 66, RC, 6, RH, white);
  paint(RC + RH + 60, r0, 6, RH, white);
  paint(r0, r0 - 66, RH, 6, white);
  paint(RC, RC + RH + 60, RH, 6, white);
  // wear on the paint
  texture(ctx, 0, r0, W, RH * 2, 'grain', 0.25, 'multiply');
  texture(ctx, r0, 0, RH * 2, W, 'grain', 0.25, 'multiply');
  // manholes and storm drains
  manhole(ctx, RC + 40, RC - 50);
  manhole(ctx, 280, RC + 52);
  manhole(ctx, RC - 52, 1150);
  for (const [dx, dy, v] of [[440, r0 + 2, 0], [980, RC + RH - 8, 0], [r0 + 2, 300, 1], [RC + RH - 8, 1000, 1]]) drain(ctx, dx, dy, v);
  // street names painted near the stop bars
  if (room.def.streets) {
    ctx.save();
    text(ctx, room.def.streets.h, 300, RC - RH / 2, { size: 14, color: 'rgba(235,235,228,0.18)' });
    ctx.translate(RC + RH / 2, 300);
    ctx.rotate(Math.PI / 2);
    text(ctx, room.def.streets.v, 0, 0, { size: 14, color: 'rgba(235,235,228,0.18)' });
    ctx.restore();
  }
}

function manhole(ctx, x, y) {
  circle(ctx, x, y + 1, 13, 'rgba(0,0,0,0.35)');
  circle(ctx, x, y, 12, '#2c2d30');
  ctx.strokeStyle = 'rgba(120,120,125,0.45)';
  ctx.lineWidth = 1;
  for (let r = 3; r < 12; r += 3) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drain(ctx, x, y, vertical) {
  const w = vertical ? 8 : 36;
  const h = vertical ? 36 : 8;
  fillRR(ctx, x, y, w, h, 1, '#1c1d1f', 'rgba(150,150,150,0.4)', 1);
  for (let k = 3; k < (vertical ? h : w); k += 4) {
    if (vertical) line(ctx, x + 1, y + k, x + w - 1, y + k, 'rgba(120,120,120,0.5)', 1);
    else line(ctx, x + k, y + 1, x + k, y + h - 1, 'rgba(120,120,120,0.5)', 1);
  }
}

function crack(ctx, x, y, rnd, col, len) {
  ctx.strokeStyle = col;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x, y);
  let a = rnd() * Math.PI * 2;
  for (let i = 0; i < 5; i++) {
    a += (rnd() - 0.5) * 1.2;
    x += Math.cos(a) * len * (0.3 + rnd() * 0.4);
    y += Math.sin(a) * len * (0.3 + rnd() * 0.4);
    ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function groundFeature(ctx, f, rnd, pass) {
  switch (f.type) {
    case 'lawn':
      if (pass === 0) {
        paintGrass(ctx, f.x, f.y, f.w, f.h, rnd, '#617f3c');
        ctx.strokeStyle = 'rgba(40,35,25,0.35)';
        ctx.strokeRect(f.x + 0.5, f.y + 0.5, f.w - 1, f.h - 1);
      }
      break;
    case 'walk':
      if (pass === 0) {
        ctx.fillStyle = '#c4bdae';
        ctx.fillRect(f.x, f.y, f.w, f.h);
        texture(ctx, f.x, f.y, f.w, f.h, 'cloud', 0.3, 'multiply', 1.5);
        for (let k = f.y; k < f.y + f.h; k += 20) line(ctx, f.x, k, f.x + f.w, k, 'rgba(60,55,45,0.35)', 1);
      }
      break;
    case 'alley':
      if (pass === 0) {
        ctx.fillStyle = '#4a4b4e';
        ctx.fillRect(f.x, f.y, f.w, f.h);
        texture(ctx, f.x, f.y, f.w, f.h, 'cloud', 0.45, 'multiply', 2);
        texture(ctx, f.x, f.y, f.w, f.h, 'grain', 0.15, 'overlay');
        for (let i = 0; i < 8; i++) crack(ctx, f.x + rnd() * f.w, f.y + rnd() * f.h, rnd, 'rgba(15,15,15,0.5)', 22);
        for (let i = 0; i < 5; i++) ellipse(ctx, f.x + rnd() * f.w, f.y + rnd() * f.h, 10 + rnd() * 16, 5 + rnd() * 8, 'rgba(20,30,40,0.25)');
      }
      break;
    case 'parking':
      if (pass === 0) {
        ctx.fillStyle = '#45474b';
        ctx.fillRect(f.x, f.y, f.w, f.h);
        texture(ctx, f.x, f.y, f.w, f.h, 'cloud', 0.4, 'multiply', 2);
        texture(ctx, f.x, f.y, f.w, f.h, 'grain', 0.15, 'overlay');
        for (let i = 0; i < 6; i++) crack(ctx, f.x + rnd() * f.w, f.y + rnd() * f.h, rnd, 'rgba(15,15,15,0.5)', 24);
        // stalls along the far side
        for (let sx = f.x + 20; sx < f.x + f.w - 20; sx += 62) {
          line(ctx, sx, f.y + 6, sx, f.y + 96, 'rgba(235,235,228,0.75)', 3);
          fillRR(ctx, sx + 14, f.y + 10, 34, 6, 2, '#8d8a82', null);
        }
        ctx.strokeStyle = 'rgba(200,200,190,0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(f.x + 1, f.y + 1, f.w - 2, f.h - 2);
      }
      break;
    case 'path':
      if (pass === 0) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#a89878';
        ctx.lineWidth = f.w + 6;
        ctx.beginPath();
        f.pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
        ctx.stroke();
        ctx.strokeStyle = '#c9b994';
        ctx.lineWidth = f.w;
        ctx.stroke();
        ctx.lineCap = 'butt';
        for (let i = 0; i < 160; i++) {
          const k = Math.floor(rnd() * (f.pts.length - 1));
          const t = rnd();
          const px = f.pts[k][0] + (f.pts[k + 1][0] - f.pts[k][0]) * t + (rnd() - 0.5) * f.w;
          const py = f.pts[k][1] + (f.pts[k + 1][1] - f.pts[k][1]) * t + (rnd() - 0.5) * f.w;
          circle(ctx, px, py, 0.8 + rnd(), `rgba(100,85,60,${0.3 + rnd() * 0.3})`);
        }
      }
      break;
    case 'tree':
      if (pass === 2) shadowBlob(ctx, f.x + 14, f.y + 10, f.r * 1.05, f.r * 0.75, 0.32);
      break;
    case 'fence':
      if (pass === 2) {
        // chain-link: posts and a hatched line
        for (let i = 0; i < f.pts.length - 1; i++) {
          const [ax, ay] = f.pts[i];
          const [bx, by] = f.pts[i + 1];
          ctx.strokeStyle = 'rgba(170,175,180,0.85)';
          ctx.lineWidth = 2;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
          ctx.setLineDash([]);
          const len = Math.hypot(bx - ax, by - ay);
          for (let s = 0; s <= len; s += 40) {
            const px = ax + ((bx - ax) * s) / len;
            const py = ay + ((by - ay) * s) / len;
            circle(ctx, px, py, 2.5, '#7d8389');
          }
        }
      }
      break;
    case 'apron':
      if (pass === 0) {
        ctx.fillStyle = '#b2aca0';
        ctx.fillRect(f.x, f.y, f.w, f.h);
        texture(ctx, f.x, f.y, f.w, f.h, 'cloud', 0.4, 'multiply', 1.8);
        for (let k = f.x; k < f.x + f.w; k += 60) line(ctx, k, f.y, k, f.y + f.h, 'rgba(60,55,45,0.3)', 1);
        for (let k = f.y; k < f.y + f.h; k += 60) line(ctx, f.x, k, f.x + f.w, k, 'rgba(60,55,45,0.3)', 1);
        for (let i = 0; i < (f.w * f.h) / 9000; i++) ellipse(ctx, f.x + rnd() * f.w, f.y + rnd() * f.h, 8 + rnd() * 16, 5 + rnd() * 9, `rgba(20,20,25,${0.08 + rnd() * 0.14})`);
      }
      break;
    case 'court':
      if (pass === 0) {
        fillRR(ctx, f.x - 10, f.y - 10, f.w + 20, f.h + 20, 4, '#3d6b5a', null);
        fillRR(ctx, f.x, f.y, f.w, f.h, 2, '#4f8a6e', null);
        texture(ctx, f.x, f.y, f.w, f.h, 'cloud', 0.25, 'multiply', 1.6);
        ctx.strokeStyle = 'rgba(245,245,235,0.85)';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(f.x + 4, f.y + 4, f.w - 8, f.h - 8);
        line(ctx, f.x + f.w / 2, f.y + 4, f.x + f.w / 2, f.y + f.h - 4, 'rgba(245,245,235,0.85)', 2.5);
        ctx.beginPath();
        ctx.arc(f.x + f.w / 2, f.y + f.h / 2, 32, 0, Math.PI * 2);
        ctx.stroke();
        for (const side of [0, 1]) {
          const kx = side ? f.x + f.w - 4 : f.x + 4;
          ctx.fillStyle = 'rgba(200,90,60,0.55)';
          ctx.fillRect(side ? kx - 70 : kx, f.y + f.h / 2 - 30, 70, 60);
          ctx.beginPath();
          if (side) ctx.arc(kx, f.y + f.h / 2, 100, Math.PI / 2, Math.PI * 1.5);
          else ctx.arc(kx, f.y + f.h / 2, 100, -Math.PI / 2, Math.PI / 2);
          ctx.stroke();
        }
      }
      break;
    case 'bayou':
      if (pass === 0) {
        fillRR(ctx, f.x, f.y - 12, f.w, f.h + 24, 10, '#6b5a3e', null);
        texture(ctx, f.x, f.y - 12, f.w, f.h + 24, 'cloud', 0.35, 'multiply', 1.5);
        const g = ctx.createLinearGradient(0, f.y, 0, f.y + f.h);
        g.addColorStop(0, '#3e5a52');
        g.addColorStop(0.5, '#4f6f63');
        g.addColorStop(1, '#3a554c');
        ctx.fillStyle = g;
        ctx.fillRect(f.x, f.y, f.w, f.h);
        texture(ctx, f.x, f.y, f.w, f.h, 'cloud', 0.3, 'overlay', 1.2);
        for (let i = 0; i < 40; i++) {
          const rx = f.x + rnd() * f.w;
          const ry = f.y + 8 + rnd() * (f.h - 16);
          line(ctx, rx, ry, rx + 10 + rnd() * 18, ry, 'rgba(220,235,225,0.22)', 1.2);
        }
        if (f.bridge) {
          const [b0, b1] = f.bridge;
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillRect(f.x + b0 + 4, f.y - 8, b1 - b0, f.h + 20);
          ctx.fillStyle = '#8a6a48';
          ctx.fillRect(f.x + b0, f.y - 12, b1 - b0, f.h + 24);
          for (let k = f.y - 12; k < f.y + f.h + 12; k += 7) line(ctx, f.x + b0, k, f.x + b1, k, 'rgba(60,40,20,0.45)', 1.5);
          ctx.fillStyle = '#5a4230';
          ctx.fillRect(f.x + b0 - 4, f.y - 14, 5, f.h + 28);
          ctx.fillRect(f.x + b1 - 1, f.y - 14, 5, f.h + 28);
        }
      }
      break;
    case 'reeds':
      if (pass === 2) {
        for (let k = 0; k < 14; k++) {
          const rx = f.x + (rnd() - 0.5) * 50;
          line(ctx, rx, f.y + 6, rx + (rnd() - 0.5) * 6, f.y - 10 - rnd() * 12, k % 2 ? '#6f8a3e' : '#8aa04c', 1.5);
        }
        for (let k = 0; k < 3; k++) ellipse(ctx, f.x + (rnd() - 0.5) * 40, f.y - 14 - rnd() * 8, 2, 5, '#6b4a2a');
      }
      break;
    case 'soon':
      if (pass === 2) {
        fillRR(ctx, f.x - 50, f.y - 12, 100, 24, 3, '#1d1d22', '#ffd23f', 1.5);
        text(ctx, 'OPENING SOON', f.x, f.y + 0.5, { size: 9, color: '#ffd23f' });
      }
      break;
    case 'sitesign':
      if (pass === 2) {
        line(ctx, f.x - 24, f.y + 10, f.x - 24, f.y - 16, '#5a4a3a', 2);
        line(ctx, f.x + 24, f.y + 10, f.x + 24, f.y - 16, '#5a4a3a', 2);
        fillRR(ctx, f.x - 36, f.y - 36, 72, 26, 2, '#ff8f00', '#7a4400', 1.5);
        text(ctx, 'HARD HATS', f.x, f.y - 28, { size: 7, color: '#1a1a1a' });
        text(ctx, 'REQUIRED', f.x, f.y - 18, { size: 7, color: '#1a1a1a' });
      }
      break;
    case 'forlease':
      if (pass === 2) {
        line(ctx, f.x - 18, f.y + 10, f.x - 18, f.y - 20, '#5a4a3a', 2);
        line(ctx, f.x + 18, f.y + 10, f.x + 18, f.y - 20, '#5a4a3a', 2);
        fillRR(ctx, f.x - 26, f.y - 30, 52, 22, 2, '#f4efe2', '#8a1f1f', 1.5);
        text(ctx, 'FOR LEASE', f.x, f.y - 23, { size: 7, color: '#8a1f1f' });
        text(ctx, '555-0188', f.x, f.y - 14, { size: 6, color: '#333' });
      }
      break;
    case 'flagpole':
      if (pass === 2) {
        shadowBlob(ctx, f.x + 20, f.y + 4, 30, 4, 0.25);
        circle(ctx, f.x, f.y, 4, '#c7ccd1');
      }
      break;
    case 'picnic':
      if (pass === 2) shadowBlob(ctx, f.x + 4, f.y + 6, 44, 26, 0.25);
      break;
    default:
      break;
  }
}

// Buildings: flat roof seen from above plus a sliver of south facade.
function paintBuilding(ctx, b, rnd) {
  const lot = b.lot;
  const { x, y, w, h } = b;
  const F = 46; // facade height shown on the south side
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.moveTo(x + w, y + 8);
  ctx.lineTo(x + w + 18, y + 22);
  ctx.lineTo(x + w + 18, y + h + 14);
  ctx.lineTo(x + 18, y + h + 14);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();

  const style = lot.style;
  const roof = { metal: '#8b9198', diner: '#6c6f76', hospital: '#b9bec2', civic: '#6f7276', bank: '#7a756c', store: '#66646a', garage: '#5f6166', trailer: '#c9c4b8', club: '#2f2836', depot: '#5d5c60', lofts: '#6b7078' }[style] || '#5d5c60';
  const ry = y;
  const rh = h - F;
  // roof
  ctx.fillStyle = roof;
  ctx.fillRect(x, ry, w, rh);
  if (style === 'metal') {
    for (let k = x; k < x + w; k += 10) {
      line(ctx, k, ry, k, ry + rh, 'rgba(255,255,255,0.12)', 1.5);
      line(ctx, k + 5, ry, k + 5, ry + rh, 'rgba(0,0,0,0.18)', 1.5);
    }
    texture(ctx, x, ry, w, rh, 'cloud', 0.35, 'multiply', 2);
  } else {
    texture(ctx, x, ry, w, rh, 'grain', 0.35, 'overlay');
    texture(ctx, x, ry, w, rh, 'cloud', 0.45, 'multiply', 2);
    for (let i = 0; i < 6; i++) ellipse(ctx, x + rnd() * w, ry + rnd() * rh, 20 + rnd() * 40, 10 + rnd() * 20, 'rgba(30,25,20,0.12)');
  }
  // parapet
  ctx.strokeStyle = shade(roof, 0.25);
  ctx.lineWidth = 6;
  ctx.strokeRect(x + 3, ry + 3, w - 6, rh - 6);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 6.5, ry + 6.5, w - 13, rh - 13);
  // roof clutter
  const units = 2 + Math.floor(rnd() * 3);
  for (let i = 0; i < units; i++) acUnit(ctx, x + 30 + rnd() * (w - 90), ry + 24 + rnd() * (rh - 80), rnd);
  for (let i = 0; i < 5; i++) {
    const vx = x + 20 + rnd() * (w - 40);
    const vy = ry + 20 + rnd() * (rh - 40);
    circle(ctx, vx + 1, vy + 2, 4, 'rgba(0,0,0,0.3)');
    circle(ctx, vx, vy, 4, '#9a9ea3');
    circle(ctx, vx, vy, 2, '#4a4d52');
  }
  if (style !== 'metal') {
    for (let i = 0; i < 2; i++) {
      const sx = x + 40 + rnd() * (w - 120);
      const sy = ry + 40 + rnd() * (rh - 100);
      fillRR(ctx, sx, sy, 46, 30, 2, '#9ec3d6', '#5a5d62', 3);
      line(ctx, sx + 6, sy + 24, sx + 22, sy + 6, 'rgba(255,255,255,0.5)', 2);
    }
  }
  // facade
  const fy = y + h - F;
  if (style === 'brick') {
    ctx.fillStyle = '#5a3b2e';
    ctx.fillRect(x, fy, w, F);
    for (let row = 0; row * 7 < F; row++) {
      const off = row % 2 ? 9 : 0;
      for (let bx = -off; bx < w; bx += 18) {
        ctx.fillStyle = jitter('#9a4f38', rnd, 0.12);
        ctx.fillRect(x + bx + 1, fy + row * 7 + 1, 16, 5.5);
      }
    }
    texture(ctx, x, fy, w, F, 'cloud', 0.3, 'multiply', 1.5);
    for (let wx = x + 24; wx < x + w - 50; wx += 72) {
      if ((lot.doors || []).some((d) => d.side === 'S' && Math.abs(x + d.at - (wx + 18)) < 40)) continue;
      facadeWindow(ctx, wx, fy + 8, 36, 22, '#e7dcc4');
    }
  } else if (style === 'diner') {
    vgrad(ctx, x, fy, w, F, [[0, '#e6e9ec'], [0.5, '#b8bfc6'], [1, '#7e868e']]);
    for (let k = 0; k < w; k += 6) line(ctx, x + k, fy + F * 0.62, x + k, fy + F, 'rgba(255,255,255,0.25)', 1);
    // ribbon of windows
    ctx.fillStyle = '#1f2a33';
    ctx.fillRect(x + 12, fy + 6, w - 24, F * 0.5);
    for (let k = x + 12; k < x + w - 12; k += 46) {
      vgrad(ctx, k + 2, fy + 8, 42, F * 0.5 - 4, [[0, '#ffe2a8'], [1, '#d8a45a']]);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(k + 6, fy + 9, 6, F * 0.5 - 6);
    }
    ctx.fillStyle = '#d13b5f';
    ctx.fillRect(x, fy + F * 0.56, w, 4);
  } else if (style === 'garage') {
    vgrad(ctx, x, fy, w, F, [[0, '#d9cdb4'], [1, '#b9ad94']]);
    texture(ctx, x, fy, w, F, 'cloud', 0.3, 'multiply', 1.5);
    ctx.fillStyle = '#c9302c';
    ctx.fillRect(x, fy, w, 6);
  } else if (style === 'trailer') {
    vgrad(ctx, x, fy, w, F, [[0, '#f0ece2'], [1, '#cfc8b8']]);
    for (let k = 0; k < w; k += 8) line(ctx, x + k, fy, x + k, fy + F, 'rgba(0,0,0,0.08)', 1);
    facadeWindow(ctx, x + 20, fy + 10, 40, 20, '#cfc8b8');
    facadeWindow(ctx, x + w - 60, fy + 10, 40, 20, '#cfc8b8');
  } else if (style === 'club') {
    vgrad(ctx, x, fy, w, F, [[0, '#2a1f33'], [1, '#170f1f']]);
    for (let k = x + 20; k < x + w - 20; k += 50) {
      ctx.strokeStyle = 'rgba(199,146,255,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(k + 15, fy + F / 2, 9, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#c792ff';
    ctx.fillRect(x, fy + F - 4, w, 2);
  } else if (style === 'depot') {
    vgrad(ctx, x, fy, w, F, [[0, '#e8b923'], [1, '#b98f12']]);
    for (let k = 0; k < w; k += 16) {
      ctx.fillStyle = (k / 16) % 2 ? '#1d1d1d' : '#f4f4f0';
      ctx.fillRect(x + k, fy + F - 10, 16, 8);
    }
  } else if (style === 'lofts') {
    vgrad(ctx, x, fy, w, F, [[0, '#8a9aa8'], [1, '#6a7a88']]);
    for (let k = x + 14; k < x + w - 30; k += 46) facadeWindow(ctx, k, fy + 8, 32, 24, '#c9d3dc');
  } else if (style === 'store') {
    // stucco with a big lit storefront window and a green band
    ctx.fillStyle = '#d9cdb4';
    ctx.fillRect(x, fy, w, F);
    texture(ctx, x, fy, w, F, 'cloud', 0.3, 'multiply', 1.5);
    ctx.fillStyle = '#2c7a4b';
    ctx.fillRect(x, fy, w, 8);
    for (let k = x + 70; k < x + w - 20; k += 64) {
      vgrad(ctx, k, fy + 12, 56, F - 14, [[0, '#fff2c4'], [1, '#e2b765']]);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      for (let s = 0; s < 3; s++) ctx.fillRect(k + 4 + s * 18, fy + 18, 14, 3);
      fillRR(ctx, k + 6, fy + 26, 18, 10, 1, '#c62828', null);
      text(ctx, 'ICE', k + 15, fy + 31.5, { size: 5, color: '#fff' });
    }
  } else if (style === 'bank') {
    // pale stone with columns
    vgrad(ctx, x, fy, w, F, [[0, '#ece5d4'], [1, '#c9bfa6']]);
    for (let k = x + 20; k < x + w - 10; k += 46) {
      fillRR(ctx, k, fy + 4, 12, F - 4, 1, '#f6f1e4', 'rgba(0,0,0,0.2)', 1);
      line(ctx, k + 4, fy + 6, k + 4, fy + F, 'rgba(0,0,0,0.1)', 1);
    }
    ctx.fillStyle = '#b9ae95';
    ctx.fillRect(x, fy, w, 5);
  } else if (style === 'civic') {
    // concrete civic block with slot windows
    vgrad(ctx, x, fy, w, F, [[0, '#b8b3a8'], [1, '#8f8a80']]);
    texture(ctx, x, fy, w, F, 'cloud', 0.3, 'multiply', 1.5);
    for (let k = x + 16; k < x + w - 20; k += 30) {
      if ((lot.doors || []).some((d) => Math.abs(x + d.at - k - 6) < 34)) continue;
      fillRR(ctx, k, fy + 10, 12, F - 20, 1, '#2a3b4a', 'rgba(0,0,0,0.3)', 1);
    }
    ctx.fillStyle = '#1f3557';
    ctx.fillRect(x, fy + F - 6, w, 6);
  } else if (style === 'hospital') {
    vgrad(ctx, x, fy, w, F, [[0, '#f4f6f6'], [1, '#d3dadb']]);
    for (let k = x + 10; k < x + w - 10; k += 40) {
      vgrad(ctx, k, fy + 8, 30, F - 20, [[0, '#a9cfe0'], [1, '#6f9fb6']]);
      line(ctx, k + 4, fy + F - 14, k + 12, fy + 10, 'rgba(255,255,255,0.4)', 1.5);
    }
    ctx.fillStyle = '#d32f2f';
    ctx.fillRect(x, fy + F - 8, w, 4);
  } else {
    // corrugated metal
    vgrad(ctx, x, fy, w, F, [[0, '#9aa1a8'], [1, '#6b7178']]);
    for (let k = 0; k < w; k += 7) line(ctx, x + k, fy, x + k, fy + F, 'rgba(0,0,0,0.2)', 2);
    texture(ctx, x, fy, w, F, 'cloud', 0.3, 'multiply', 1.5);
  }
  if (style === 'garage' || style === 'metal') {
    for (const at of lot.rollup || []) {
      const rx0 = x + at - 60;
      fillRR(ctx, rx0 - 3, fy + 4, 126, F - 4, 1, '#3a3d42', null);
      vgrad(ctx, rx0, fy + 7, 120, F - 7, [[0, '#b9bec4'], [1, '#8a9097']]);
      for (let k = fy + 10; k < fy + F; k += 5) line(ctx, rx0, k, rx0 + 120, k, 'rgba(0,0,0,0.18)', 1);
      fillRR(ctx, rx0 + 52, fy + F - 8, 16, 4, 1, '#3a3d42', null);
    }
  }
  if (style === 'hospital') {
    // red cross on the roof
    const cx = x + w * 0.72;
    const cy = ry + rh * 0.4;
    circle(ctx, cx, cy, 40, '#f4f4f0');
    ctx.fillStyle = '#d32f2f';
    ctx.fillRect(cx - 9, cy - 28, 18, 56);
    ctx.fillRect(cx - 28, cy - 9, 56, 18);
  }
  if (style === 'civic') {
    // helipad-style roof marking
    ctx.strokeStyle = 'rgba(240,240,230,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x + w * 0.7, ry + rh * 0.45, 40, 0, Math.PI * 2);
    ctx.stroke();
  }
  // top edge of the facade (roof lip)
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(x, fy, w, 3);
  ctx.fillStyle = shade(roof, 0.35);
  ctx.fillRect(x, fy - 3, w, 3);

  // doors
  for (const d of lot.doors || []) {
    if (d.side === 'S') {
      const dx = x + d.at;
      fillRR(ctx, dx - 16, fy + 6, 32, F - 6, 1, '#2b2522', '#1a1512', 1);
      vgrad(ctx, dx - 13, fy + 9, 26, F - 9, [[0, d.npcOnly ? '#6e5240' : '#5c7d8f'], [1, d.npcOnly ? '#4b382c' : '#2f4552']]);
      if (!d.npcOnly) line(ctx, dx - 9, fy + 12, dx - 9, fy + F - 4, 'rgba(255,255,255,0.35)', 2);
      circle(ctx, dx + 9, fy + F * 0.6, 1.6, '#d9c08a');
      // stoop
      fillRR(ctx, dx - 22, y + h, 44, 8, 2, '#a9a397', 'rgba(0,0,0,0.3)');
      // light over the door
      circle(ctx, dx, fy + 3, 3, '#fff3c4');
      // little plaque
      if (d.plaque) {
        fillRR(ctx, dx + 18, fy + 12, 24, 12, 2, '#2c6fbb', '#16305a', 1);
        text(ctx, d.plaque, dx + 30, fy + 18.5, { size: 7, color: '#fff' });
      }
    } else if (d.side === 'N') {
      const dx = x + d.at;
      // door slab in the north wall
      ctx.fillStyle = '#22262b';
      ctx.fillRect(dx - 20, y, 40, 8);
      // striped awning out over the walk
      const aw = 70;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(dx - aw / 2 + 6, y - 22 + 6, aw, 22);
      for (let k = 0; k < aw; k += 10) {
        ctx.fillStyle = (k / 10) % 2 ? '#1d1d1d' : lot.signColor || '#ffd23f';
        ctx.fillRect(dx - aw / 2 + k, y - 22, 10, 22);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(dx - aw / 2, y - 22, aw, 4);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(dx - aw / 2, y - 3, aw, 3);
    }
  }
  // sign
  if (lot.sign) {
    const north = (lot.doors || []).some((d) => d.side === 'N');
    const sw = Math.min(w - 40, lot.sign.length * 15 + 40);
    const sx = x + w / 2 - sw / 2;
    const sy = north ? y + 16 : fy - 30;
    fillRR(ctx, sx + 3, sy + 4, sw, 24, 3, 'rgba(0,0,0,0.35)', null);
    fillRR(ctx, sx, sy, sw, 24, 3, lot.neon ? '#1c1c24' : '#2a2a2e', shade(lot.signColor || '#fff', -0.3), 2);
    text(ctx, lot.sign, sx + sw / 2, sy + 12.5, { size: 15, color: lot.signColor || '#fff' });
  }
}

function facadeWindow(ctx, x, y, w, h, frame) {
  fillRR(ctx, x - 2, y - 2, w + 4, h + 5, 1, frame, 'rgba(0,0,0,0.3)');
  vgrad(ctx, x, y, w, h, [[0, '#3c5566'], [1, '#22313b']]);
  ctx.fillStyle = 'rgba(240,232,214,0.75)';
  for (let k = y + 1; k < y + h * 0.5; k += 3) ctx.fillRect(x, k, w, 1.8);
  line(ctx, x + 4, y + h - 2, x + 12, y + 3, 'rgba(255,255,255,0.25)', 1.5);
}

function acUnit(ctx, x, y, rnd) {
  fillRR(ctx, x + 3, y + 4, 40, 30, 2, 'rgba(0,0,0,0.35)', null);
  fillRR(ctx, x, y, 40, 30, 2, '#b9bdc1', '#6d7176', 1);
  circle(ctx, x + 20, y + 15, 10, '#55595e');
  for (let k = 0; k < 4; k++) {
    const a = k * (Math.PI / 2) + rnd();
    line(ctx, x + 20, y + 15, x + 20 + Math.cos(a) * 9, y + 15 + Math.sin(a) * 9, '#8d9196', 2);
  }
}

function barricade(ctx, s) {
  const vertical = s.h > s.w;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(s.x + 4, s.y + 4, s.w, s.h);
  ctx.fillStyle = '#d8d4cc';
  ctx.fillRect(s.x, s.y, s.w, s.h);
  const len = vertical ? s.h : s.w;
  for (let k = 0; k < len; k += 20) {
    ctx.fillStyle = '#e8661c';
    if (vertical) ctx.fillRect(s.x, s.y + k, s.w, 10);
    else ctx.fillRect(s.x + k, s.y, 10, s.h);
  }
  texture(ctx, s.x, s.y, s.w, s.h, 'grain', 0.25, 'overlay');
}

function fenceLine(ctx, x1, y1, x2, y2) {
  ctx.strokeStyle = 'rgba(120,125,130,0.9)';
  ctx.lineWidth = 2;
  ctx.setLineDash([3, 3]);
  line(ctx, x1, y1, x2, y2, 'rgba(150,155,160,0.8)', 3);
  ctx.setLineDash([]);
}
