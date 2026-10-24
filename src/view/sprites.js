// Prop, street-furniture, car and item art. Props become one or more cached
// "parts", each with its own depth key so people can sit inside booths,
// lie under blankets and stand behind counters.

import { makeCanvas, rngFor, shade, alpha, fillRR, rrect, ellipse, circle, shadowBlob, texture, line, vgrad, hgrad, text } from './gfx.js';

const RES = 2;

function part(x, y, w, h, up, key, draw, pad = 8) {
  const cw = w + pad * 2;
  const ch = h + up + pad * 2;
  const c = makeCanvas(cw * RES, ch * RES);
  const ctx = c.getContext('2d');
  ctx.scale(RES, RES);
  ctx.translate(pad, up + pad);
  draw(ctx, w, h);
  return { canvas: c, ox: x - pad, oy: y - up - pad, w: cw, h: ch, key };
}

// Box with a lit top face and a front face: the basic 3/4 furniture shape.
function box(ctx, x, y, w, d, hgt, top, front, opts = {}) {
  // d = depth of the top face, hgt = height of the front face
  const r = opts.r ?? 2;
  shadowBlob(ctx, x + w / 2 + 3, y + d + hgt * 0 + 2, w * 0.62, Math.max(6, d * 0.5), 0.22);
  fillRR(ctx, x, y - hgt + d, w, hgt, r, front, 'rgba(0,0,0,0.45)', 1);
  fillRR(ctx, x, y - hgt, w, d, r, top, 'rgba(0,0,0,0.4)', 1);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(x + 1.5, y - hgt + 1, w - 3, 1.5);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(x + 1, y - hgt + d, w - 2, 2);
}

export function propParts(prop) {
  const { x, y, w, h } = prop;
  switch (prop.type) {
    case 'bed': return [
      part(x, y, w, h, 46, y, (c) => {
        shadowBlob(c, w / 2 + 4, h / 2 + 6, w * 0.6, h * 0.55, 0.3);
        // headboard
        fillRR(c, 4, -42, w - 8, 52, 4, '#6b4630', '#3a2418', 1.5);
        fillRR(c, 10, -36, w - 20, 38, 3, '#7d5338', null);
        for (let k = 18; k < w - 14; k += 16) line(c, k, -34, k, 0, 'rgba(0,0,0,0.18)', 1.5);
        // frame + mattress
        fillRR(c, 2, 4, w - 4, h - 4, 4, '#5a3a28', '#2d1c12', 1);
        fillRR(c, 6, 6, w - 12, h - 14, 6, '#ece8df', 'rgba(0,0,0,0.25)', 1);
        // pillows
        fillRR(c, 14, 10, w / 2 - 20, 26, 8, '#fbf9f4', 'rgba(0,0,0,0.25)', 1);
        fillRR(c, w / 2 + 6, 10, w / 2 - 20, 26, 8, '#fbf9f4', 'rgba(0,0,0,0.25)', 1);
        line(c, 22, 22, w / 2 - 12, 20, 'rgba(0,0,0,0.08)', 2);
      }),
      part(x, y, w, h, 0, y + h + 0.5, (c) => {
        // blanket over the lower part
        const by = 48;
        fillRR(c, 4, by, w - 8, h - by - 6, 6, '#3f6a8a', '#22394b', 1.5);
        vgrad(c, 4, by, w - 8, 10, [[0, 'rgba(255,255,255,0.25)'], [1, 'rgba(255,255,255,0)']]);
        for (let k = 0; k < 4; k++) line(c, 12, by + 14 + k * 12, w - 12, by + 16 + k * 12, 'rgba(0,0,0,0.12)', 2);
        fillRR(c, 4, by - 6, w - 8, 10, 4, '#e9e4d8', 'rgba(0,0,0,0.2)', 1);
        texture(c, 4, by, w - 8, h - by - 6, 'grain', 0.12, 'overlay');
      }),
    ];
    case 'nightstand': return [part(x, y, w, h, 40, y + h, (c) => {
      box(c, 0, 0, w, h, 26, '#7d5338', '#5f3e29');
      line(c, 4, h - 14, w - 4, h - 14, 'rgba(0,0,0,0.35)', 1);
      circle(c, w / 2, h - 8, 1.6, '#d9c08a');
      // radio on top
      fillRR(c, 6, -24, w - 12, 15, 3, '#2c2c30', '#111', 1);
      circle(c, 12, -16.5, 4, '#555');
      circle(c, w - 12, -16.5, 4, '#555');
      fillRR(c, w / 2 - 5, -21, 10, 5, 1, '#89c9a8', null);
      line(c, w - 10, -24, w - 2, -36, '#999', 1);
    })];
    case 'wardrobe': return [part(x, y, w, h, 110, y + h, (c) => {
      box(c, 0, 0, w, h, 104, '#6e4a32', '#80573b', { r: 3 });
      line(c, w / 2, h - 100, w / 2, h - 4, 'rgba(0,0,0,0.4)', 1.5);
      fillRR(c, 5, h - 98, w / 2 - 8, 90, 2, null, 'rgba(0,0,0,0.2)', 1);
      fillRR(c, w / 2 + 3, h - 98, w / 2 - 8, 90, 2, null, 'rgba(0,0,0,0.2)', 1);
      circle(c, w / 2 - 4, h - 52, 2, '#d9c08a');
      circle(c, w / 2 + 4, h - 52, 2, '#d9c08a');
      texture(c, 0, h - 104, w, 104, 'grain', 0.12, 'overlay');
    })];
    case 'tv': return [part(x, y, w, h, 64, y + h, (c) => {
      box(c, 0, 0, w, h, 18, '#3a2c24', '#2b201a');
      // flat screen on a stand
      fillRR(c, w / 2 - 6, -26, 12, 10, 1, '#1a1a1a', null);
      fillRR(c, 4, -64, w - 8, 42, 3, '#111214', '#000', 1.5);
      fillRR(c, 7, -61, w - 14, 36, 1, '#1d2730', null);
      line(c, 12, -58, 30, -40, 'rgba(255,255,255,0.08)', 4);
    })];
    case 'sink': return [part(x, y, w, h, 46, y + h, (c) => {
      fillRR(c, -2, -46, w + 4, 18, 1, '#d9e3e6', 'rgba(0,0,0,0.25)', 1); // backsplash
      for (let k = 0; k < w; k += 9) line(c, k, -46, k, -28, 'rgba(0,0,0,0.08)', 1);
      box(c, 0, 0, w, h, 34, '#d4cdbd', '#9b7a58');
      fillRR(c, 10, h - 32, w - 20, 16, 5, '#b9c2c6', '#7c868b', 1);
      fillRR(c, 13, h - 30, w - 26, 12, 4, '#8e999f', null);
      line(c, w / 2, h - 38, w / 2, h - 30, '#aab3b8', 3);
      line(c, w / 2, h - 38, w / 2 + 6, h - 38, '#aab3b8', 3);
      line(c, w / 2, 4, w / 2, h - 2, 'rgba(0,0,0,0.3)', 1);
    })];
    case 'stove': return [part(x, y, w, h, 40, y + h, (c) => {
      box(c, 0, 0, w, h, 34, '#ebe7de', '#d8d3c7');
      for (const [bx, by] of [[14, h - 30], [w - 14, h - 30], [14, h - 20], [w - 14, h - 20]]) {
        circle(c, bx, by, 5.5, '#2b2b2b');
        circle(c, bx, by, 3, '#555');
      }
      fillRR(c, 6, h - 8, w - 12, 6, 1, '#2b2b2b', null);
      for (let k = 0; k < 4; k++) circle(c, 10 + k * ((w - 20) / 3), 6, 2, '#333');
    })];
    case 'fridge': return [part(x, y, w, h, 104, y + h, (c) => {
      box(c, 0, 0, w, h, 100, '#f1efe9', '#e2dfd6', { r: 5 });
      line(c, 2, h - 64, w - 2, h - 64, 'rgba(0,0,0,0.3)', 1.5);
      fillRR(c, w - 10, h - 92, 4, 22, 2, '#b7b2a6', null);
      fillRR(c, w - 10, h - 58, 4, 30, 2, '#b7b2a6', null);
      // magnets + a photo
      fillRR(c, 8, h - 86, 14, 10, 1, '#fff', 'rgba(0,0,0,0.2)', 0.5);
      circle(c, 12, h - 40, 2.5, '#e74c3c');
      circle(c, 24, h - 46, 2.5, '#3498db');
      hgrad(c, 0, h - 100, 10, 100, [[0, 'rgba(0,0,0,0.12)'], [1, 'rgba(0,0,0,0)']]);
    })];
    case 'couch': return [
      part(x, y, w, h, 20, y, (c) => {
        shadowBlob(c, w / 2 + 3, h / 2 + 4, w * 0.6, h * 0.6, 0.3);
        fillRR(c, 0, 0, w, h, 8, '#7b5a8a', '#3e2b47', 1.5);
        fillRR(c, 10, 4, w / 2 - 12, h - 20, 6, '#8d6b9c', 'rgba(0,0,0,0.25)', 1);
        fillRR(c, w / 2 + 2, 4, w / 2 - 12, h - 20, 6, '#8d6b9c', 'rgba(0,0,0,0.25)', 1);
      }),
      part(x, y, w, h, 30, y + h, (c) => {
        // backrest faces the camera
        fillRR(c, -2, h - 30, w + 4, 34, 8, '#6a4c78', '#3e2b47', 1.5);
        vgrad(c, 0, h - 28, w, 8, [[0, 'rgba(255,255,255,0.2)'], [1, 'rgba(255,255,255,0)']]);
        fillRR(c, -6, 6, 14, h - 2, 6, '#6a4c78', '#3e2b47', 1.5);
        fillRR(c, w - 8, 6, 14, h - 2, 6, '#6a4c78', '#3e2b47', 1.5);
        texture(c, -2, h - 30, w + 4, 34, 'grain', 0.12, 'overlay');
      }),
    ];
    case 'lamp': return [part(x, y, w, h, 96, y + h, (c) => {
      shadowBlob(c, w / 2, h - 2, 12, 5, 0.3);
      ellipse(c, w / 2, h - 3, 10, 4, '#2b2b2b');
      line(c, w / 2, h - 4, w / 2, -60, '#3a3a3a', 2.5);
      c.fillStyle = '#f2dfb2';
      c.beginPath();
      c.moveTo(w / 2 - 9, -92);
      c.lineTo(w / 2 + 9, -92);
      c.lineTo(w / 2 + 15, -66);
      c.lineTo(w / 2 - 15, -66);
      c.closePath();
      c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.3)';
      c.stroke();
    })];
    case 'table': return [part(x, y, w, h, 30, y + h, (c) => {
      shadowBlob(c, w / 2 + 3, h / 2 + 6, w * 0.6, h * 0.5, 0.28);
      for (const lx of [6, w - 10]) fillRR(c, lx, h - 26, 4, 26, 1, '#4b3021', null);
      fillRR(c, 0, -2, w, h - 22, 3, '#8a5b3c', '#4b3021', 1);
      fillRR(c, 0, h - 26, w, 5, 1, '#6b4530', null);
      texture(c, 0, -2, w, h - 22, 'grain', 0.15, 'overlay');
      circle(c, w * 0.65, 10, 6, '#e8e4d9');
    })];
    case 'chair': return [part(x, y, w, h, 34, y, (c) => {
      const facingRight = prop.spots?.[0]?.face === 'right';
      fillRR(c, 2, h - 10, w - 4, 6, 1, '#6b4530', 'rgba(0,0,0,0.3)', 1);
      const bx = facingRight ? 1 : w - 6;
      fillRR(c, bx, -10, 5, h + 2, 1, '#5a3a28', 'rgba(0,0,0,0.3)', 1);
      for (const lx of [3, w - 6]) line(c, lx, h - 4, lx, h + 6, '#4b3021', 2);
    })];
    case 'grill': return [part(x, y, w, h, 56, y + h, (c) => {
      // hood
      fillRR(c, -4, -56, w + 8, 18, 2, '#aab2b9', '#5d656c', 1);
      vgrad(c, -4, -56, w + 8, 18, [[0, 'rgba(255,255,255,0.35)'], [1, 'rgba(0,0,0,0.1)']]);
      box(c, 0, 0, w, h, 32, '#2f3236', '#9aa3ab');
      fillRR(c, 6, h - 30, w * 0.55, h - 16, 1, '#3c3f43', null);
      for (let k = 0; k < 3; k++) ellipse(c, 20 + k * 22, h - 22, 7, 3.5, '#7a4a2a');
      for (let k = 0; k < 4; k++) circle(c, w * 0.7 + k * 9, h - 24, 4, '#1a1a1a');
      for (let k = 0; k < 6; k++) circle(c, 10 + k * ((w - 20) / 5), h - 6, 2, '#333');
    })];
    case 'coffeemaker': return [part(x, y, w, h, 44, y + h, (c) => {
      box(c, 0, 0, w, h, 14, '#3d3d40', '#2a2a2d');
      fillRR(c, 6, -36, w - 12, 26, 3, '#1f1f22', '#000', 1);
      for (let k = 0; k < 2; k++) {
        fillRR(c, 9 + k * 24, -18, 14, 14, 3, 'rgba(120,180,200,0.35)', '#555', 1);
        fillRR(c, 10 + k * 24, -11, 12, 6, 2, '#3a1f12', null);
      }
      circle(c, w - 9, -30, 1.8, '#ff4d4d');
    })];
    case 'counter': return [part(x, y, w, h, 42, y + h, (c) => {
      box(c, 0, 0, w, h, 40, '#e8e2d4', '#b8283f', { r: 2 });
      // chrome edges and vertical trim
      vgrad(c, 0, h - 40 + h - 2, w, 4, [[0, '#f5f7f9'], [1, '#8c949b']]);
      fillRR(c, 0, -40 + h - 4, w, 4, 1, '#cfd5da', null);
      for (let k = 14; k < w; k += 28) line(c, k, h - 34, k, h - 2, 'rgba(255,255,255,0.35)', 2);
      // speckled formica
      for (let k = 0; k < 120; k++) circle(c, (k * 37) % w, -40 + 2 + ((k * 17) % (h - 4)), 0.7, 'rgba(180,40,60,0.35)');
      // register
      fillRR(c, 12, -58 + h, 40, 18, 2, '#2c2c30', '#111', 1);
      fillRR(c, 18, -64 + h, 28, 8, 1, '#1d3b2a', '#111', 1);
      text(c, '$', 32, -60 + h, { size: 6, color: '#7cffb0' });
      // pie case
      fillRR(c, 150, -62 + h, 54, 24, 4, 'rgba(200,230,240,0.35)', 'rgba(255,255,255,0.6)', 1);
      for (let k = 0; k < 3; k++) {
        ellipse(c, 162 + k * 15, -46 + h, 6, 3, '#c98a3b');
        ellipse(c, 162 + k * 15, -47 + h, 5, 2, '#8a4f1e');
      }
      // napkins + ketchup
      fillRR(c, 260, -50 + h, 10, 9, 1, '#c0c6cc', null);
      fillRR(c, 300, -52 + h, 5, 11, 2, '#c62828', null);
      fillRR(c, 308, -52 + h, 5, 11, 2, '#f9c80e', null);
    })];
    case 'passcounter': return [part(x, y, w, h, 46, y + h, (c) => {
      box(c, 0, 0, w, h, 40, '#cfd5da', '#9aa3ab');
      line(c, -2, -46 + h, w + 2, -46 + h, '#777', 2);
      for (let k = 0; k < 3; k++) fillRR(c, 4 + k * 12, -46 + h, 8, 12, 1, '#fffbe6', 'rgba(0,0,0,0.2)', 0.5);
    })];
    case 'stool': return [part(x, y, w, h, 26, y, (c) => {
      shadowBlob(c, w / 2, h - 2, 10, 4, 0.3);
      line(c, w / 2, h - 2, w / 2, -10, '#aab2b9', 3);
      ellipse(c, w / 2, h - 2, 8, 3, '#7c868b');
      ellipse(c, w / 2, -12, 11, 5.5, '#b8283f');
      ellipse(c, w / 2, -13, 9, 4, '#d43a55');
    })];
    case 'booth': return [
      part(x, y, w, h, 30, y + 54, (c) => {
        shadowBlob(c, w / 2 + 4, h / 2 + 4, w * 0.6, h * 0.62, 0.3);
        // back bench with its tall backrest against the wall side
        fillRR(c, 0, -28, w, 30, 6, '#b8283f', '#5c1220', 1.5);
        vgrad(c, 0, -28, w, 8, [[0, 'rgba(255,255,255,0.25)'], [1, 'rgba(255,255,255,0)']]);
        for (let k = 20; k < w; k += 30) line(c, k, -24, k, 0, 'rgba(0,0,0,0.15)', 2);
        fillRR(c, 0, 0, w, 22, 5, '#c9334c', '#5c1220', 1);
        // table
        fillRR(c, w * 0.42 - 4, 30, 8, 22, 1, '#8c949b', null);
        fillRR(c, 6, 24, w - 12, 24, 3, '#ece7dc', '#8c949b', 1.5);
        line(c, 6, 46, w - 6, 46, '#c3c9ce', 2);
        fillRR(c, w - 30, 28, 5, 9, 2, '#c62828', null);
        fillRR(c, w - 23, 28, 5, 9, 2, '#f9c80e', null);
        fillRR(c, w - 40, 30, 7, 6, 1, '#c0c6cc', null);
      }),
      part(x, y, w, h, 0, y + h, (c) => {
        fillRR(c, 0, 58, w, 22, 5, '#c9334c', '#5c1220', 1);
        // front backrest faces camera
        fillRR(c, 0, 66, w, 22, 6, '#b8283f', '#5c1220', 1.5);
        vgrad(c, 0, 66, w, 6, [[0, 'rgba(255,255,255,0.25)'], [1, 'rgba(255,255,255,0)']]);
        for (let k = 20; k < w; k += 30) line(c, k, 70, k, 86, 'rgba(0,0,0,0.15)', 2);
      }),
    ];
    case 'table4': return [
      part(x, y, w, h, 34, y, (c) => {
        for (const sp of prop.spots || []) {
          const lx = sp.x - x;
          const ly = sp.y - y;
          const backLeft = sp.face === 'right';
          shadowBlob(c, lx, ly + 6, 12, 5, 0.25);
          fillRR(c, lx - 10, ly - 2, 20, 10, 2, '#b8283f', '#5c1220', 1);
          fillRR(c, backLeft ? lx - 12 : lx + 7, ly - 24, 5, 30, 2, '#aab2b9', '#5d656c', 1);
        }
      }),
      part(x, y, w, h, 30, y + h, (c) => {
        shadowBlob(c, w / 2 + 3, h / 2 + 4, w * 0.55, h * 0.5, 0.25);
        line(c, w / 2, h - 4, w / 2, h - 26, '#8c949b', 4);
        ellipse(c, w / 2, h - 2, 14, 4, '#7c868b');
        fillRR(c, 0, -4, w, h - 22, 4, '#ece7dc', '#8c949b', 1.5);
        line(c, 2, h - 26, w - 2, h - 26, '#c3c9ce', 2);
        circle(c, w * 0.3, 6, 3.5, '#f5f5f5');
      }),
    ];
    case 'jukebox': return [part(x, y, w, h, 74, y + h, (c) => {
      shadowBlob(c, w / 2 + 3, h, w * 0.6, 8, 0.3);
      c.fillStyle = '#5a2b1a';
      c.beginPath();
      c.moveTo(0, h);
      c.lineTo(0, -40);
      c.arc(w / 2, -40, w / 2, Math.PI, 0);
      c.lineTo(w, h);
      c.closePath();
      c.fill();
      c.strokeStyle = '#2a120a';
      c.stroke();
      const g = c.createLinearGradient(0, -70, 0, h);
      g.addColorStop(0, '#ff5d8f');
      g.addColorStop(0.5, '#ffd23f');
      g.addColorStop(1, '#4fc3f7');
      c.strokeStyle = g;
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(5, h - 4);
      c.lineTo(5, -40);
      c.arc(w / 2, -40, w / 2 - 5, Math.PI, 0);
      c.lineTo(w - 5, h - 4);
      c.stroke();
      fillRR(c, 12, -30, w - 24, 26, 3, '#f6e7c8', '#2a120a', 1);
      for (let k = 0; k < 4; k++) line(c, 15, -25 + k * 6, w - 15, -25 + k * 6, 'rgba(0,0,0,0.25)', 1);
      fillRR(c, 12, 2, w - 24, h - 8, 2, '#3a1a10', null);
      for (let k = 0; k < 5; k++) line(c, 15 + k * ((w - 30) / 4), 4, 15 + k * ((w - 30) / 4), h - 8, 'rgba(255,200,120,0.4)', 1.5);
    })];
    case 'treadmill': return [part(x, y, w, h, 40, y, (c) => {
      shadowBlob(c, w / 2 + 3, h / 2 + 4, w * 0.55, h * 0.55, 0.3);
      fillRR(c, 4, 18, w - 8, h - 18, 4, '#2b2d31', '#111', 1);
      fillRR(c, 9, 24, w - 18, h - 30, 2, '#17181b', null);
      for (let k = 30; k < h - 8; k += 8) line(c, 10, k, w - 10, k, 'rgba(255,255,255,0.05)', 1);
      // uprights + console at the front (top)
      line(c, 6, 20, 6, -18, '#8c949b', 3);
      line(c, w - 6, 20, w - 6, -18, '#8c949b', 3);
      fillRR(c, 2, -30, w - 4, 16, 3, '#3b3e44', '#111', 1);
      fillRR(c, 10, -27, w - 20, 8, 1, '#14322a', null);
      text(c, '6.2', w / 2, -23, { size: 6, color: '#5dffb0' });
    })];
    case 'benchpress': return [
      part(x, y, w, h, 20, y, (c) => {
        shadowBlob(c, w / 2 + 3, h / 2 + 4, w * 0.55, h * 0.5, 0.3);
        fillRR(c, 10, h / 2 - 9, w - 20, 18, 6, '#1f1f22', '#000', 1);
        fillRR(c, 14, h / 2 - 7, w - 28, 12, 5, '#b8283f', null);
        for (const lx of [16, w - 20]) fillRR(c, lx, h / 2 + 6, 4, 14, 1, '#5d656c', null);
      }),
      part(x, y, w, h, 44, y + h, (c) => {
        for (const ux of [w * 0.2, w * 0.8]) {
          fillRR(c, ux - 3, -36, 6, h / 2 + 34, 2, '#5d656c', '#222', 1);
          ellipse(c, ux, h / 2 - 2, 8, 3, '#3b3e44');
        }
        line(c, -6, -32, w + 6, -32, '#c7ccd1', 3);
        for (const px of [-6, w + 2]) fillRR(c, px - 3, -44, 8, 24, 2, '#222', '#000', 1);
      }),
    ];
    case 'rack': return [
      part(x, y, w, h, 96, y, (c) => {
        shadowBlob(c, w / 2 + 4, h / 2 + 4, w * 0.6, h * 0.55, 0.3);
        fillRR(c, 0, 0, w, h, 2, 'rgba(0,0,0,0.25)', null);
        for (const ux of [6, w - 12]) fillRR(c, ux, -90, 6, 92, 1, '#4a4f55', '#1a1a1a', 1);
        line(c, 6, -88, w - 6, -88, '#4a4f55', 5);
        // plates on pegs
        for (const px of [-2, w - 6]) for (let k = 0; k < 3; k++) fillRR(c, px, -40 + k * 12, 8, 10, 2, '#1d1d1d', '#000', 1);
      }),
      part(x, y, w, h, 96, y + h, (c) => {
        for (const ux of [6, w - 12]) fillRR(c, ux, h - 90, 6, 92, 1, '#5d656c', '#1a1a1a', 1);
        for (const ux of [6, w - 12]) for (let k = 0; k < 6; k++) circle(c, ux + 3, h - 80 + k * 12, 1.2, '#222');
      }),
    ];
    case 'dumbbells': return [part(x, y, w, h, 36, y + h, (c) => {
      box(c, 0, 0, w, h, 26, '#3b3e44', '#2b2d31');
      for (let row = 0; row < 2; row++) {
        for (let k = 0; k < 6; k++) {
          const dx = 10 + k * ((w - 20) / 5);
          const dy = h - 34 + row * 12;
          line(c, dx - 5, dy, dx + 5, dy, '#9aa3ab', 2);
          fillRR(c, dx - 8, dy - 4, 4, 8, 1, '#1a1a1a', null);
          fillRR(c, dx + 4, dy - 4, 4, 8, 1, '#1a1a1a', null);
        }
      }
    })];
    case 'heavybag': return [part(x, y, w, h, 96, y + h, (c) => {
      shadowBlob(c, w / 2 + 3, h - 2, w * 0.6, 7, 0.3);
      line(c, w / 2, -96, w / 2, -78, '#777', 1.5);
      line(c, w / 2 - 8, -78, w / 2, -86, '#777', 1);
      line(c, w / 2 + 8, -78, w / 2, -86, '#777', 1);
      fillRR(c, 2, -80, w - 4, 76, 10, '#7a2626', '#2a0b0b', 1.5);
      hgrad(c, 2, -80, w - 4, 76, [[0, 'rgba(255,255,255,0.18)'], [0.4, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,0.35)']]);
      fillRR(c, 2, -60, w - 4, 6, 1, '#111', null);
      fillRR(c, 2, -24, w - 4, 6, 1, '#111', null);
    })];
    case 'fountain': return [part(x, y, w, h, 34, y + h, (c) => {
      fillRR(c, 2, -30, w - 4, 26, 4, '#b9c2c6', '#5d656c', 1);
      fillRR(c, 6, -26, w - 12, 8, 3, '#8e999f', null);
      circle(c, w / 2, -22, 1.5, '#cfe8ff');
    })];
    case 'desk': return [part(x, y, w, h, 64, y + h, (c) => {
      box(c, 0, 0, w, h, 40, '#2b2d31', '#3d4148');
      fillRR(c, w * 0.18, h - 32, w * 0.64, 18, 2, '#ffd23f', null);
      text(c, 'MEMBERS', w / 2, h - 23, { size: 10, color: '#1a1a1a' });
      // monitor
      fillRR(c, w - 60, -26, 40, 26, 2, '#111', '#000', 1);
      fillRR(c, w - 57, -23, 34, 18, 1, '#1d3b5a', null);
      fillRR(c, w - 44, -2, 8, 4, 1, '#222', null);
      fillRR(c, 20, -10, 26, 10, 2, '#e8e4d9', null);
    })];
    case 'gymbench': return [part(x, y, w, h, 18, y + h, (c) => {
      box(c, 0, 0, w, h, 14, '#3b3e44', '#2b2d31');
    })];
    case 'lockers': return [part(x, y, w, h, 104, y + h, (c) => {
      shadowBlob(c, w / 2 + 6, h / 2, w * 0.8, h * 0.55, 0.3);
      fillRR(c, 0, -100, w, h, 2, '#4f6b84', '#22303c', 1.5);
      for (let k = -100; k < h - 104; k += 30) line(c, 2, k, w - 2, k, 'rgba(0,0,0,0.3)', 1.5);
      fillRR(c, 0, h - 104, w, 104, 2, '#5d7b96', '#22303c', 1.5);
      for (let k = 0; k < 3; k++) {
        for (let v = 0; v < 6; v++) line(c, 4, h - 96 + v * 4, w / 3 - 2 + (k * w) / 3, h - 96 + v * 4, 'rgba(0,0,0,0.15)', 1);
      }
      line(c, w / 2, h - 102, w / 2, h - 2, 'rgba(0,0,0,0.35)', 1);
    })];
    case 'parkbench': return parkBench(prop);
    case 'busbench': return [part(x, y, w, h, 16, y, (c) => {
      fillRR(c, 0, 0, w, h, 2, '#7d8b94', '#3b444a', 1);
      for (let k = 6; k < w; k += 10) line(c, k, 1, k, h - 1, 'rgba(0,0,0,0.2)', 1);
    })];
    default:
      return [];
  }
}

function parkBench(prop) {
  const { x, y, w, h } = prop;
  const down = prop.spots?.[0]?.face === 'down';
  const seat = (c) => {
    shadowBlob(c, w / 2 + 2, h / 2 + 4, w * 0.55, h * 0.7, 0.28);
    for (let k = 0; k < 3; k++) fillRR(c, 0, 2 + k * 4.5, w, 3.5, 1, '#8a5b3c', '#4b3021', 0.8);
    for (const lx of [4, w - 8]) fillRR(c, lx, h - 4, 4, 8, 1, '#2b2b2b', null);
  };
  const back = (c, by) => {
    for (let k = 0; k < 3; k++) fillRR(c, 0, by + k * 5, w, 4, 1, '#7a4f33', '#4b3021', 0.8);
    for (const lx of [4, w - 8]) fillRR(c, lx, by, 4, 18, 1, '#2b2b2b', null);
  };
  if (down) return [part(x, y, w, h, 26, y - 6, (c) => { back(c, -22); seat(c); })];
  return [part(x, y, w, h, 4, y - 6, seat), part(x, y, w, h, 18, y + h + 6, (c) => back(c, h - 6))];
}

// ---------------------------------------------------------------- street props
export function featureParts(f) {
  switch (f.type) {
    case 'tree': return [part(f.x - 16, f.y - 8, 32, 14, 46, f.y + 6, (c) => {
      shadowBlob(c, 18, 8, 18, 7, 0.35);
      c.fillStyle = '#4a3423';
      c.beginPath();
      c.moveTo(4, 12);
      c.quadraticCurveTo(10, 4, 11, -30);
      c.lineTo(21, -30);
      c.quadraticCurveTo(22, 4, 30, 12);
      c.closePath();
      c.fill();
      hgrad(c, 8, -30, 18, 42, [[0, 'rgba(255,255,255,0.12)'], [1, 'rgba(0,0,0,0.3)']]);
      line(c, 14, -10, 13, -26, 'rgba(0,0,0,0.25)', 1);
    })];
    case 'shrub': return [part(f.x - f.r, f.y - f.r, f.r * 2, f.r * 2, 10, f.y + f.r * 0.6, (c, w) => {
      const r = f.r;
      const rnd = rngFor(`${f.x},${f.y}`);
      shadowBlob(c, r + 3, r * 1.5, r * 1.1, r * 0.55, 0.3);
      for (let k = 0; k < 9; k++) circle(c, r + (rnd() - 0.5) * r, r * 0.6 + (rnd() - 0.5) * r * 0.8, r * (0.45 + rnd() * 0.3), k % 3 === 0 ? '#3d5e2a' : k % 3 === 1 ? '#4f7536' : '#628a44');
      circle(c, r * 0.7, r * 0.3, r * 0.3, 'rgba(160,200,110,0.35)');
    })];
    case 'lamp': return [part(f.x - 20, f.y - 4, 40, 8, 96, f.y + 3, (c) => {
      shadowBlob(c, 20, 4, 8, 3, 0.35);
      line(c, 20, 4, 20, -84, '#4a4f55', 3);
      line(c, 20, -84, 32, -88, '#4a4f55', 2.5);
      fillRR(c, 28, -92, 12, 6, 2, '#2b2d31', null);
      ellipse(c, 34, -86, 4, 1.5, '#fff6d8');
    })];
    case 'pole': return [part(f.x - 26, f.y - 4, 52, 8, 128, f.y + 3, (c) => {
      shadowBlob(c, 26, 4, 7, 3, 0.35);
      fillRR(c, 23, -124, 6, 128, 2, '#6b4f36', '#3a2a1c', 1);
      fillRR(c, 4, -114, 44, 5, 1, '#5a4230', null);
      for (const ix of [8, 26, 44]) circle(c, ix, -116, 2, '#cfd8dc');
      fillRR(c, 16, -96, 20, 14, 3, '#7b8187', null);
    })];
    case 'hydrant': return [part(f.x - 8, f.y - 6, 16, 12, 18, f.y + 5, (c) => {
      shadowBlob(c, 8, 8, 8, 3, 0.3);
      fillRR(c, 3, -12, 10, 20, 3, '#c9302c', '#5a0f0d', 1);
      ellipse(c, 8, -12, 6, 3, '#e8b923');
      fillRR(c, 0, -4, 16, 4, 2, '#c9302c', '#5a0f0d', 0.8);
    })];
    case 'trash': return [part(f.x - 10, f.y - 7, 20, 14, 22, f.y + 7, (c) => {
      shadowBlob(c, 10, 8, 11, 4, 0.3);
      fillRR(c, 1, -14, 18, 22, 3, '#3a5a45', '#1a2a20', 1);
      for (let k = 4; k < 18; k += 4) line(c, k, -12, k, 6, 'rgba(0,0,0,0.25)', 1);
      ellipse(c, 10, -14, 9, 3, '#2b4535');
    })];
    case 'mailbox': return [part(f.x - 18, f.y - 9, 36, 16, 26, f.y + 7, (c) => {
      box(c, 0, 4, 36, 12, 26, '#9aa3ab', '#7c868b');
      for (let k = 0; k < 4; k++) for (let v = 0; v < 2; v++) fillRR(c, 3 + k * 8, -14 + v * 9, 6, 6, 1, null, 'rgba(0,0,0,0.3)', 0.8);
    })];
    case 'newsbox': return [part(f.x - 10, f.y - 7, 20, 14, 26, f.y + 7, (c) => {
      box(c, 0, 2, 20, 12, 24, '#2c5aa0', '#1f4682');
      fillRR(c, 3, -12, 14, 9, 1, 'rgba(220,230,240,0.6)', null);
      text(c, 'NEWS', 10, 4, { size: 5, color: '#fff' });
    })];
    case 'planter': return [part(f.x - 22, f.y - 14, 44, 28, 26, f.y + 14, (c) => {
      box(c, 0, 0, 44, 22, 16, '#bfb8a8', '#a39c8c');
      const rnd = rngFor(`p${f.x}`);
      for (let k = 0; k < 7; k++) circle(c, 8 + rnd() * 28, -12 + rnd() * 10, 5 + rnd() * 3, k % 2 ? '#4f7536' : '#628a44');
      for (let k = 0; k < 3; k++) circle(c, 10 + rnd() * 24, -14 + rnd() * 8, 2, '#ff6f91');
    })];
    case 'dumpster': return [part(f.x - 34, f.y - 20, 68, 40, 30, f.y + 20, (c) => {
      box(c, 0, 0, 68, 26, 30, '#2f6b4a', '#25563b');
      line(c, 34, -28, 34, 0, 'rgba(0,0,0,0.3)', 1.5);
      fillRR(c, 8, -4, 52, 3, 1, 'rgba(0,0,0,0.3)', null);
      text(c, 'NO DUMPING', 34, 12, { size: 6, color: 'rgba(255,255,255,0.7)' });
    })];
    case 'picnic': return [part(f.x - 36, f.y - 20, 72, 40, 16, f.y + 20, (c) => {
      for (const by of [0, 32]) fillRR(c, 4, by, 64, 7, 1, '#8a5b3c', '#4b3021', 1);
      fillRR(c, 0, 10, 72, 18, 2, '#9a6a48', '#4b3021', 1);
      for (let k = 6; k < 72; k += 12) line(c, k, 11, k, 27, 'rgba(0,0,0,0.15)', 1);
    })];
    case 'busstop': return [part(f.x - 50, f.y + 4, 100, 34, 56, f.y + 34, (c) => {
      // back glass panel
      fillRR(c, 0, -30, 100, 56, 2, 'rgba(160,200,220,0.35)', '#5d656c', 2);
      line(c, 0, -30, 0, 30, '#5d656c', 3);
      line(c, 100, -30, 100, 30, '#5d656c', 3);
      fillRR(c, 8, -24, 34, 40, 1, '#f2efe6', '#888', 1);
      text(c, 'METRO', 25, -14, { size: 7, color: '#c0392b' });
      text(c, 'Route 9', 25, -4, { size: 6, color: '#333' });
      // sign pole
      line(c, 96, 30, 96, -52, '#5d656c', 2);
      circle(c, 96, -52, 7, '#c0392b');
      text(c, 'BUS', 96, -52, { size: 5, color: '#fff' });
    })];
    case 'car': return [carPart(f.x, f.y, f.rot || 0, f.color || '#8a2f2f', f.y + 30)];
    default:
      return [];
  }
}

// Overhead layer: tree canopies and shelter roofs.
export function canopyPart(f) {
  if (f.type === 'tree') {
    const r = f.r;
    return part(f.x - r * 1.15, f.y - r * 1.9, r * 2.3, r * 2.0, 0, 0, (c, w, h) => {
      const rnd = rngFor(`tree${f.x},${f.y}`);
      const cx = w / 2;
      const cy = h * 0.52;
      // dark mass then light clusters: a live oak's lumpy dome
      for (let k = 0; k < 26; k++) {
        const a = rnd() * Math.PI * 2;
        const d = Math.sqrt(rnd()) * r * 0.75;
        circle(c, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, r * (0.32 + rnd() * 0.22), k % 2 ? '#2f4a22' : '#35532a');
      }
      for (let k = 0; k < 34; k++) {
        const a = rnd() * Math.PI * 2;
        const d = Math.sqrt(rnd()) * r * 0.7;
        const px = cx + Math.cos(a) * d - r * 0.12;
        const py = cy + Math.sin(a) * d * 0.8 - r * 0.12;
        circle(c, px, py, r * (0.12 + rnd() * 0.14), ['#47693a', '#557a44', '#3e5f31', '#62874c'][k % 4]);
      }
      for (let k = 0; k < 18; k++) {
        const a = rnd() * Math.PI * 2;
        const d = Math.sqrt(rnd()) * r * 0.55;
        circle(c, cx + Math.cos(a) * d - r * 0.25, cy + Math.sin(a) * d * 0.7 - r * 0.25, r * (0.05 + rnd() * 0.07), 'rgba(160,190,110,0.45)');
      }
      // Spanish moss strands
      for (let k = 0; k < 10; k++) {
        const a = rnd() * Math.PI * 2;
        const px = cx + Math.cos(a) * r * 0.7;
        const py = cy + Math.sin(a) * r * 0.55;
        line(c, px, py, px + (rnd() - 0.5) * 3, py + 6 + rnd() * 8, 'rgba(170,180,150,0.6)', 1.5);
      }
    }, 0);
  }
  if (f.type === 'busstop') {
    return part(f.x - 54, f.y - 2, 108, 40, 0, 0, (c) => {
      fillRR(c, 0, -46, 108, 40, 3, 'rgba(90,100,110,0.82)', '#3b444a', 2);
      line(c, 4, -42, 104, -42, 'rgba(255,255,255,0.25)', 1.5);
    }, 4);
  }
  return null;
}

// Top-down car. rot = heading (0 = facing +x).
export function carPart(x, y, rot, color, key, dmg = null) {
  const L = 92;
  const W = 42;
  const R = Math.ceil(Math.hypot(L, W) / 2) + 6;
  return part(x - R, y - R, R * 2, R * 2, 0, key, (c) => {
    c.translate(R, R);
    drawCar(c, rot, color, dmg);
  }, 0);
}

export function drawCar(c, rot, color, dmg = null, lights = false) {
  const L = 92;
  const W = 42;
  c.save();
  c.rotate(rot);
  shadowBlob(c, 4, 6, L * 0.58, W * 0.62, 0.38);
  // tires
  for (const [tx, ty] of [[-L * 0.32, -W / 2], [L * 0.3, -W / 2], [-L * 0.32, W / 2], [L * 0.3, W / 2]]) fillRR(c, tx - 9, ty - 4, 18, 8, 2, '#111', null);
  // body
  fillRR(c, -L / 2, -W / 2, L, W, 10, color, shade(color, -0.5), 1.5);
  hgrad(c, -L / 2, -W / 2, L, W, [[0, 'rgba(0,0,0,0.15)'], [0.5, 'rgba(255,255,255,0.08)'], [1, 'rgba(0,0,0,0.2)']]);
  vgrad(c, -L / 2, -W / 2, L, W, [[0, 'rgba(255,255,255,0.22)'], [0.5, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,0.25)']]);
  // cabin
  fillRR(c, -L * 0.2, -W * 0.38, L * 0.46, W * 0.76, 7, shade(color, -0.15), null);
  // windshield + rear glass
  fillRR(c, L * 0.08, -W * 0.36, L * 0.16, W * 0.72, 4, '#2a3a48', null);
  fillRR(c, -L * 0.24, -W * 0.34, L * 0.1, W * 0.68, 3, '#2a3a48', null);
  line(c, L * 0.1, -W * 0.3, L * 0.2, W * 0.1, 'rgba(255,255,255,0.25)', 2);
  // roof
  fillRR(c, -L * 0.13, -W * 0.33, L * 0.2, W * 0.66, 4, shade(color, 0.08), null);
  // lights
  fillRR(c, L / 2 - 5, -W / 2 + 4, 4, 8, 1, lights ? '#fffbe0' : '#e8e4c9', null);
  fillRR(c, L / 2 - 5, W / 2 - 12, 4, 8, 1, lights ? '#fffbe0' : '#e8e4c9', null);
  fillRR(c, -L / 2 + 1, -W / 2 + 4, 3, 8, 1, '#b3261e', null);
  fillRR(c, -L / 2 + 1, W / 2 - 12, 3, 8, 1, '#b3261e', null);
  // mirrors
  fillRR(c, L * 0.12, -W / 2 - 4, 6, 4, 1, shade(color, -0.3), null);
  fillRR(c, L * 0.12, W / 2, 6, 4, 1, shade(color, -0.3), null);
  if (dmg) {
    // dented panels: front, rear, left, right
    const dent = (px, py, amt) => {
      if (amt < 0.08) return;
      for (let k = 0; k < 4 + amt * 6; k++) {
        ellipse(c, px + Math.sin(k * 7.3) * 8, py + Math.cos(k * 3.1) * 5, 4 + amt * 5, 2 + amt * 3, `rgba(0,0,0,${0.15 + amt * 0.25})`);
      }
      line(c, px - 8, py - 3, px + 6, py + 4, 'rgba(255,255,255,0.35)', 1);
    };
    dent(L * 0.42, 0, dmg.front || 0);
    dent(-L * 0.42, 0, dmg.rear || 0);
    dent(0, -W * 0.42, dmg.left || 0);
    dent(0, W * 0.42, dmg.right || 0);
  }
  c.restore();
}

// ---------------------------------------------------------------- items
// Drawn centered at (0,0), roughly `s` px across.
export function drawItem(c, def, s = 24, it = null) {
  c.save();
  const k = s / 24;
  c.scale(k, k);
  switch (def) {
    case 'cash': {
      for (let i = 0; i < 3; i++) {
        c.save();
        c.rotate(-0.25 + i * 0.18);
        fillRR(c, -10, -5 + i * 1.5, 20, 10, 1.5, '#6c9a55', '#2f4d26', 1);
        fillRR(c, -7, -2.5 + i * 1.5, 14, 5, 1, null, 'rgba(255,255,255,0.35)', 0.8);
        circle(c, 0, i * 1.5, 2.2, '#4d7a3c');
        c.restore();
      }
      break;
    }
    case 'pipe': fillRR(c, -2.5, -13, 5, 26, 2, '#8c949b', '#4a4f55', 1); hgrad(c, -2.5, -13, 5, 26, [[0, 'rgba(255,255,255,0.4)'], [1, 'rgba(0,0,0,0.3)']]); fillRR(c, -3.5, -13, 7, 4, 1, '#6d747b', null); break;
    case 'bat': c.rotate(0.3); fillRR(c, -2, -13, 4, 10, 2, '#222', null); fillRR(c, -3.5, -4, 7, 18, 3.5, '#b9c2c9', '#5d656c', 1); break;
    case 'bottle': fillRR(c, -4, -4, 8, 14, 3, '#3c7a4a', '#1d3d24', 1); fillRR(c, -1.8, -11, 3.6, 8, 1, '#3c7a4a', '#1d3d24', 1); line(c, -2, -2, -2, 8, 'rgba(255,255,255,0.4)', 1.5); break;
    case 'flashlight': c.rotate(-0.6); fillRR(c, -3, -10, 6, 16, 2, '#2b2b2b', '#000', 1); fillRR(c, -4.5, 5, 9, 6, 2, '#555', null); circle(c, 0, 10, 3, '#fff6c2'); break;
    case 'broom': c.rotate(0.4); line(c, 0, -13, 0, 6, '#9a6a48', 2.5); fillRR(c, -7, 5, 14, 8, 2, '#d9b45a', '#8a6a2a', 1); break;
    case 'wrench': c.rotate(0.6); fillRR(c, -2, -8, 4, 18, 1.5, '#9aa3ab', '#4a4f55', 1); circle(c, 0, -9, 5, '#9aa3ab'); circle(c, 1.5, -11, 2.5, 'rgba(0,0,0,0.6)'); break;
    case 'screwdriver': c.rotate(0.7); fillRR(c, -2.5, -10, 5, 9, 2, '#e8b923', '#7a5d10', 1); line(c, 0, -1, 0, 10, '#9aa3ab', 1.5); break;
    case 'phone': fillRR(c, -5, -9, 10, 18, 2, '#1d1d22', '#000', 1); fillRR(c, -4, -7, 8, 13, 1, '#2f5d7c', null); line(c, -3, -5, 2, 2, 'rgba(255,255,255,0.4)', 1); break;
    case 'carkeys': c.beginPath(); c.arc(-3, -3, 5, 0, Math.PI * 2); c.strokeStyle = '#c7ccd1'; c.lineWidth = 1.8; c.stroke(); fillRR(c, 0, 0, 3, 11, 1, '#d9c08a', null); fillRR(c, -7, 1, 6, 8, 2, '#222', null); break;
    case 'plate': ellipse(c, 0, 1, 12, 8, '#f5f5f0'); ellipse(c, 0, 1, 9, 6, '#e6e3d8'); ellipse(c, -3, 0, 4, 3, '#7a3b1e'); ellipse(c, 3, 2, 3.5, 2.5, '#f2ead0'); ellipse(c, 2, -2, 2.5, 2, '#5a3a1e'); break;
    case 'kolache': ellipse(c, 0, 0, 9, 6, '#e3b25c'); ellipse(c, 0, -1, 6, 3.5, '#f0c878'); ellipse(c, 0, -1, 5, 1.8, '#9a3b2a'); break;
    case 'taco': c.beginPath(); c.moveTo(-10, 4); c.quadraticCurveTo(0, -12, 10, 4); c.closePath(); c.fillStyle = '#f0d58c'; c.fill(); c.strokeStyle = '#b8923a'; c.stroke(); circle(c, -2, 1, 2, '#f7e36b'); circle(c, 3, 0, 2, '#7fb069'); break;
    case 'pie': c.beginPath(); c.moveTo(0, 8); c.lineTo(-9, -6); c.quadraticCurveTo(0, -10, 9, -6); c.closePath(); c.fillStyle = '#c98a3b'; c.fill(); c.strokeStyle = '#7a4a1a'; c.stroke(); for (let i = 0; i < 4; i++) ellipse(c, -4 + i * 2.5, -4 + i * 2.5, 2, 1.2, '#6a3b14'); break;
    case 'snack': fillRR(c, -7, -9, 14, 18, 2, '#e03b3b', '#7a1a1a', 1); fillRR(c, -5, -3, 10, 6, 1, '#ffd23f', null); break;
    case 'water': fillRR(c, -4.5, -8, 9, 17, 3, 'rgba(160,210,240,0.85)', '#4b7fa0', 1); fillRR(c, -2, -11, 4, 3, 1, '#2c6fbb', null); fillRR(c, -4.5, -2, 9, 5, 0, '#2c6fbb', null); break;
    case 'soda': fillRR(c, -5, -8, 10, 16, 2, '#c62828', '#5a0f0d', 1); ellipse(c, 0, -8, 5, 1.8, '#c7ccd1'); line(c, -2, -5, -2, 6, 'rgba(255,255,255,0.4)', 1.5); break;
    case 'coffee': fillRR(c, -5, -6, 10, 13, 2, '#f2efe6', '#888', 1); ellipse(c, 0, -6, 5, 2, '#3a1f12'); c.beginPath(); c.arc(6, 0, 3, -1.2, 1.2); c.strokeStyle = '#888'; c.lineWidth = 1.5; c.stroke(); break;
    case 'tea': fillRR(c, -5, -8, 10, 16, 2, 'rgba(180,110,40,0.75)', '#7a5020', 1); circle(c, -1, -4, 1.6, 'rgba(255,255,255,0.7)'); circle(c, 2, 0, 1.6, 'rgba(255,255,255,0.7)'); break;
    case 'medkit': fillRR(c, -11, -7, 22, 14, 2, '#f2efe6', '#888', 1); fillRR(c, -2, -5, 4, 10, 0, '#d32f2f', null); fillRR(c, -5, -2, 10, 4, 0, '#d32f2f', null); break;
    case 'bandage': circle(c, 0, 0, 7, '#f5f0e6'); circle(c, 0, 0, 3, '#d9d2c2'); break;
    case 'book': case 'manual': fillRR(c, -7, -10, 14, 20, 1.5, def === 'manual' ? '#2c5aa0' : '#8e3b2f', '#222', 1); fillRR(c, 5, -9, 2, 18, 0, '#f2efe6', null); fillRR(c, -4, -6, 8, 3, 0, 'rgba(255,255,255,0.6)', null); break;
    default: circle(c, 0, 0, 7, '#999');
  }
  c.restore();
}

// Item held in a hand, drawn small near the hand position.
export function drawHeld(c, def) {
  drawItem(c, def, 16);
}
