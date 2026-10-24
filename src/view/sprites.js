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
        shadowBlob(c, w / 2 + 4, h / 2 + 6, w * 0.6, h * 0.66, 0.32);
        // chrome-trimmed end panel on the wall side ties the two benches together
        fillRR(c, -4, -26, 10, h + 20, 3, '#7e1a2c', '#3d0b14', 1.5);
        line(c, 1, -22, 1, h - 10, 'rgba(255,255,255,0.18)', 1);
        // back bench: tall tufted backrest + seat
        fillRR(c, 4, -26, w - 4, 28, 7, '#b8283f', '#5c1220', 1.5);
        vgrad(c, 4, -26, w - 4, 7, [[0, 'rgba(255,255,255,0.28)'], [1, 'rgba(255,255,255,0)']]);
        for (let k = 26; k < w - 6; k += 28) line(c, k, -21, k, -2, 'rgba(60,0,10,0.3)', 2);
        fillRR(c, 4, 0, w - 4, 20, 5, '#d03a53', '#5c1220', 1);
        vgrad(c, 4, 14, w - 4, 6, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.25)']]);
        // table on a chrome post
        fillRR(c, w * 0.5 - 3, 40, 6, 16, 1, '#8c949b', null);
        fillRR(c, 10, 24, w - 20, 22, 4, '#efeae0', '#8c949b', 1.5);
        line(c, 12, 44, w - 12, 44, '#c3c9ce', 2.5);
        fillRR(c, w - 34, 28, 5, 9, 2, '#c62828', null);
        fillRR(c, w - 27, 28, 5, 9, 2, '#f9c80e', null);
        fillRR(c, w - 46, 30, 8, 6, 1, '#c0c6cc', null);
        circle(c, 34, 34, 5, '#fbfbf7');
      }),
      part(x, y, w, h, 0, y + h, (c) => {
        fillRR(c, 4, 58, w - 4, 18, 5, '#d03a53', '#5c1220', 1);
        // front backrest faces the camera, lower than the back one
        fillRR(c, 4, 70, w - 4, 16, 6, '#a82238', '#5c1220', 1.5);
        vgrad(c, 4, 70, w - 4, 5, [[0, 'rgba(255,255,255,0.3)'], [1, 'rgba(255,255,255,0)']]);
        for (let k = 26; k < w - 6; k += 28) line(c, k, 74, k, 84, 'rgba(60,0,10,0.3)', 2);
        fillRR(c, -4, 60, 10, 28, 3, '#7e1a2c', '#3d0b14', 1.5);
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
    case 'plant': return [part(x, y, w, h, 54, y + h, (c) => {
      shadowBlob(c, w / 2 + 2, h - 2, w * 0.6, 6, 0.3);
      fillRR(c, w / 2 - 11, h - 22, 22, 22, 3, '#b36a43', '#5a3420', 1);
      ellipse(c, w / 2, h - 22, 11, 3, '#4a2e1c');
      const rnd = rngFor(`plant${x},${y}`);
      for (let k = 0; k < 14; k++) {
        const a = -Math.PI / 2 + (rnd() - 0.5) * 2.6;
        const L = 18 + rnd() * 26;
        c.strokeStyle = k % 2 ? '#3f6e34' : '#558a44';
        c.lineWidth = 5;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(w / 2, h - 22);
        c.quadraticCurveTo(w / 2 + Math.cos(a) * L * 0.5, h - 22 + Math.sin(a) * L * 0.7, w / 2 + Math.cos(a) * L, h - 22 + Math.sin(a) * L);
        c.stroke();
      }
    })];
    case 'shopcounter': return [part(x, y, w, h, 48, y + h, (c) => {
      box(c, 0, 0, w, h, 38, '#d9d4c8', '#6d737a');
      for (let k = 12; k < w; k += 24) line(c, k, h - 34, k, h - 2, 'rgba(255,255,255,0.15)', 2);
      // register + candy rack + lotto sign
      fillRR(c, 30, h - 56, 40, 18, 2, '#2c2c30', '#111', 1);
      fillRR(c, 36, h - 63, 28, 8, 1, '#1d3b2a', null);
      if (prop.plain) {
        fillRR(c, 100, h - 50, 50, 10, 1, '#f4efe2', 'rgba(0,0,0,0.2)', 0.6);
        fillRR(c, w - 40, h - 52, 22, 12, 2, '#c9302c', null);
        return;
      }
      fillRR(c, 110, h - 54, 60, 14, 2, '#c62828', '#5a0f0d', 1);
      for (let k = 0; k < 6; k++) fillRR(c, 113 + k * 9, h - 52, 7, 10, 1, ['#ffd23f', '#3d6db5', '#7cf29a', '#ff8fb4', '#f28c38', '#fff'][k], null);
      fillRR(c, w - 30, h - 70, 24, 30, 2, '#ffd23f', '#7a5d10', 1);
      text(c, 'LOTTO', w - 18, h - 55, { size: 5, color: '#1a1a1a' });
    })];
    case 'shelf': return [part(x, y, w, h, 50, y + h, (c) => {
      box(c, 0, 0, w, h, 46, '#cfd3d6', '#e7e9ea');
      const rnd = rngFor(`shelf${x},${y}`);
      const cols = ['#c62828', '#f9c80e', '#2c5aa0', '#7cb342', '#ff8f00', '#8e24aa', '#ececec', '#6d4c41'];
      for (let row = 0; row < 3; row++) {
        const sy = h - 44 + row * 14;
        line(c, 2, sy + 12, w - 2, sy + 12, '#9aa3ab', 1.5);
        let px = 4;
        while (px < w - 8) {
          const pw = 5 + rnd() * 8;
          const ph = 7 + rnd() * 4;
          c.fillStyle = cols[Math.floor(rnd() * cols.length)];
          c.fillRect(px, sy + 12 - ph, pw, ph);
          c.fillStyle = 'rgba(255,255,255,0.25)';
          c.fillRect(px, sy + 12 - ph, pw, 1.5);
          px += pw + 1;
        }
      }
      // top face products
      for (let px = 6; px < w - 6; px += 12) ellipse(c, px, -40 + h * 0.5, 4, 2.5, cols[Math.floor(rnd() * cols.length)]);
    })];
    case 'cooler': return [part(x, y, w, h, 104, y + h, (c) => {
      box(c, 0, 0, w, h, 100, '#3a3e44', '#2b2e33', { r: 3 });
      const doors = 3;
      const dw = (w - 8) / doors;
      for (let d = 0; d < doors; d++) {
        const dx = 4 + d * dw;
        vgrad(c, dx + 1, h - 96, dw - 2, 90, [[0, '#dff6ff'], [1, '#a8d6ea']]);
        for (let s = 0; s < 4; s++) {
          const sy = h - 90 + s * 22;
          line(c, dx + 2, sy + 18, dx + dw - 2, sy + 18, 'rgba(60,70,80,0.5)', 1);
          for (let b = 0; b < 4; b++) fillRR(c, dx + 4 + b * (dw / 4.3), sy + 4, 5, 14, 1.5, ['#c62828', '#2c5aa0', '#7cb342', '#f9c80e'][(b + s + d) % 4], null);
        }
        line(c, dx + dw - 5, h - 70, dx + dw - 5, h - 40, '#c7ccd1', 2);
        line(c, dx + 4, h - 94, dx + 12, h - 20, 'rgba(255,255,255,0.35)', 2);
      }
      text(c, 'COLD DRINKS', w / 2, h - 100 + 4, { size: 6, color: '#7cf2ff' });
    })];
    case 'magrack': return [part(x, y, w, h, 44, y + h, (c) => {
      box(c, 0, 0, w, h, 38, '#8a5b3c', '#6b4530');
      for (let row = 0; row < 2; row++) for (let k = 0; k < 5; k++) {
        const mx = 4 + k * ((w - 8) / 5);
        fillRR(c, mx, h - 34 + row * 16, (w - 8) / 5 - 2, 14, 1, ['#e57373', '#64b5f6', '#ffd54f', '#81c784', '#ba68c8'][(k + row) % 5], 'rgba(0,0,0,0.3)', 0.6);
      }
    })];
    case 'icechest': return [part(x, y, w, h, 36, y + h, (c) => {
      box(c, 0, 0, w, h, 30, '#e9eef2', '#cfd8de');
      fillRR(c, w / 2 - 18, h - 24, 36, 12, 2, '#2c6fbb', null);
      text(c, 'ICE', w / 2, h - 18, { size: 8, color: '#fff' });
    })];
    case 'tellercounter': return [part(x, y, w, h, 100, y + h, (c) => {
      box(c, 0, 0, w, h, 44, '#e8dcc4', '#6b4a33');
      for (let k = 30; k < w; k += 60) fillRR(c, k, h - 38, 40, 30, 2, null, 'rgba(0,0,0,0.25)', 1.5);
      vgrad(c, 0, h - 44, w, 4, [[0, '#f1dfa3'], [1, '#8a6a2a']]);
      // glass partitions standing on the back edge of the counter
      for (let k = 0; k < 3; k++) {
        const gx = 10 + k * ((w - 20) / 3);
        const gw = (w - 20) / 3 - 10;
        fillRR(c, gx, -92, gw, 50, 2, 'rgba(190,220,235,0.22)', 'rgba(255,255,255,0.6)', 1.2);
        line(c, gx + 6, -88, gx + 22, -48, 'rgba(255,255,255,0.3)', 2.5);
        fillRR(c, gx + gw / 2 - 14, -46, 28, 4, 1, '#3a2718', null);
        text(c, `${k + 1}`, gx + gw / 2, -84, { size: 8, color: '#f1dfa3' });
      }
    })];
    case 'rope': return [part(x, y, w, h, 34, y + h, (c) => {
      const n = Math.max(2, Math.round(w / 70) + 1);
      for (let k = 0; k < n; k++) {
        const px = (k / (n - 1)) * w;
        ellipse(c, px, h - 2, 6, 2.5, '#b58b3e');
        line(c, px, h - 2, px, -24, '#d8b456', 2.5);
        circle(c, px, -25, 3, '#f1dfa3');
        if (k < n - 1) {
          const nx = ((k + 1) / (n - 1)) * w;
          c.strokeStyle = '#8b1a2b';
          c.lineWidth = 3;
          c.beginPath();
          c.moveTo(px, -20);
          c.quadraticCurveTo((px + nx) / 2, -6, nx, -20);
          c.stroke();
        }
      }
    })];
    case 'chairs': return [
      part(x, y, w, h, 6, y, (c) => {
        shadowBlob(c, w / 2 + 2, h / 2 + 4, w * 0.55, h * 0.7, 0.25);
        for (const sp of prop.spots || []) fillRR(c, sp.x - x - 13, 2, 26, h - 6, 3, '#3b6fa0', '#1f3a5a', 1);
        line(c, 2, h - 2, w - 2, h - 2, '#8c949b', 2);
      }),
      part(x, y, w, h, 24, y + h + 1, (c) => {
        for (const sp of prop.spots || []) {
          fillRR(c, sp.x - x - 13, h - 22, 26, 20, 3, '#2f5f8f', '#1f3a5a', 1);
          vgrad(c, sp.x - x - 13, h - 22, 26, 4, [[0, 'rgba(255,255,255,0.25)'], [1, 'rgba(255,255,255,0)']]);
        }
      }),
    ];
    case 'officedesk': return [part(x, y, w, h, 56, y + h, (c) => {
      box(c, 0, 0, w, h, 30, '#7d5338', '#5f3e29');
      fillRR(c, 20, h - 56, 34, 22, 2, '#111', '#000', 1);
      fillRR(c, 23, h - 53, 28, 15, 1, '#2c5a7c', null);
      fillRR(c, 64, h - 42, 30, 10, 1, '#f4efe2', 'rgba(0,0,0,0.2)', 0.6);
      fillRR(c, 98, h - 46, 12, 12, 2, '#f2efe6', null);
      ellipse(c, 104, h - 46, 5, 2, '#3a1f12');
    })];
    case 'kiosk': return [part(x, y, w, h, 64, y + h, (c) => {
      shadowBlob(c, w / 2 + 2, h - 2, w * 0.6, 6, 0.3);
      fillRR(c, w / 2 - 6, h - 30, 12, 30, 2, '#3b3e44', null);
      fillRR(c, 2, h - 64, w - 4, 38, 4, '#2b2e33', '#111', 1.5);
      vgrad(c, 6, h - 60, w - 12, 28, [[0, '#0f2a1d'], [1, '#14402a']]);
      c.strokeStyle = '#5dffb0';
      c.lineWidth = 1.2;
      c.beginPath();
      for (let k = 0; k <= 10; k++) c.lineTo(8 + k * ((w - 16) / 10), h - 40 - Math.sin(k * 1.3) * 6 - k * 0.6);
      c.stroke();
      text(c, 'MARKET', w / 2, h - 56, { size: 5, color: '#5dffb0' });
    })];
    case 'atm': return [part(x, y, w, h, 80, y + h, (c) => {
      box(c, 0, 0, w, h, 74, '#4a5058', '#3a3f46', { r: 4 });
      fillRR(c, 10, h - 70, w - 20, 24, 2, '#0e1d2b', '#000', 1);
      vgrad(c, 12, h - 68, w - 24, 20, [[0, '#1d4f7a'], [1, '#12324e']]);
      text(c, 'WELCOME', w / 2, h - 58, { size: 6, color: '#bfe3ff' });
      for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) fillRR(c, 18 + k * 9, h - 40 + r * 7, 7, 5, 1, '#c7ccd1', null);
      fillRR(c, w - 30, h - 40, 18, 4, 1, '#111', null);
      fillRR(c, w - 30, h - 26, 18, 6, 1, '#111', null);
      fillRR(c, 6, h - 80, w - 12, 8, 2, '#2c6fbb', null);
      text(c, 'ATM', w / 2, h - 76, { size: 6, color: '#fff' });
    })];
    case 'reception': return [part(x, y, w, h, 50, y + h, (c) => {
      box(c, 0, 0, w, h, 42, '#eef2f2', '#3b8fb0');
      fillRR(c, w * 0.25, h - 34, w * 0.5, 14, 2, '#f4f6f6', null);
      text(c, 'RECEPTION', w / 2, h - 27, { size: 8, color: '#2c5a6b' });
      fillRR(c, w - 54, h - 62, 36, 22, 2, '#111', '#000', 1);
      fillRR(c, w - 51, h - 59, 30, 15, 1, '#2c7a6b', null);
      fillRR(c, 20, h - 50, 30, 8, 1, '#f4efe2', null);
    })];
    case 'hbed': return [
      part(x, y, w, h, 64, y, (c) => {
        shadowBlob(c, w / 2 + 4, h / 2 + 6, w * 0.6, h * 0.55, 0.3);
        // monitor on a pole at the head
        line(c, w - 8, 0, w - 8, -56, '#8c949b', 2);
        fillRR(c, w - 30, -64, 28, 18, 2, '#111', '#000', 1);
        c.strokeStyle = '#5dffb0';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(w - 27, -55);
        c.lineTo(w - 20, -55);
        c.lineTo(w - 17, -61);
        c.lineTo(w - 14, -50);
        c.lineTo(w - 11, -55);
        c.lineTo(w - 5, -55);
        c.stroke();
        fillRR(c, 0, -10, w, 16, 3, '#cfd5da', '#6d737a', 1);
        fillRR(c, 2, 4, w - 4, h - 6, 4, '#9aa3ab', '#5d656c', 1);
        fillRR(c, 6, 6, w - 12, h - 14, 5, '#f6f8f8', 'rgba(0,0,0,0.2)', 1);
        fillRR(c, 12, 10, w - 24, 22, 7, '#ffffff', 'rgba(0,0,0,0.2)', 1);
      }),
      part(x, y, w, h, 0, y + h + 0.5, (c) => {
        fillRR(c, 6, 46, w - 12, h - 54, 4, '#8fc1d1', '#4a7f91', 1.2);
        for (let k = 0; k < 3; k++) line(c, 10, 56 + k * 14, w - 10, 58 + k * 14, 'rgba(0,0,0,0.1)', 2);
        fillRR(c, 6, 42, w - 12, 8, 3, '#f6f8f8', null);
        line(c, 0, h - 4, w, h - 4, '#8c949b', 3);
      }),
    ];
    case 'ivstand': return [part(x, y, w, h, 76, y + h, (c) => {
      ellipse(c, w / 2, h - 2, 7, 2.5, '#8c949b');
      line(c, w / 2, h - 2, w / 2, -64, '#c7ccd1', 2);
      line(c, w / 2 - 6, -64, w / 2 + 6, -64, '#c7ccd1', 2);
      fillRR(c, w / 2 + 2, -62, 8, 14, 3, 'rgba(220,240,255,0.8)', '#8c949b', 0.8);
      line(c, w / 2 + 6, -48, w / 2 + 4, -20, 'rgba(200,220,240,0.8)', 1);
    })];
    case 'medcabinet': return [part(x, y, w, h, 74, y + h, (c) => {
      box(c, 0, 0, w, h, 70, '#f2f4f4', '#dfe5e6');
      for (let k = 0; k < 2; k++) {
        const gx = 4 + k * (w / 2);
        fillRR(c, gx, h - 66, w / 2 - 8, 58, 2, 'rgba(200,225,235,0.45)', '#9aa3ab', 1);
        for (let s = 0; s < 3; s++) {
          line(c, gx + 2, h - 50 + s * 16, gx + w / 2 - 10, h - 50 + s * 16, '#9aa3ab', 1);
          for (let b = 0; b < 4; b++) fillRR(c, gx + 4 + b * 9, h - 60 + s * 16, 6, 9, 1, ['#fff', '#ffcc80', '#90caf9', '#ef9a9a'][b], null);
        }
      }
      fillRR(c, w / 2 - 10, h - 72, 20, 8, 1, '#d32f2f', null);
    })];
    case 'vending': return [part(x, y, w, h, 104, y + h, (c) => {
      box(c, 0, 0, w, h, 100, '#c62828', '#a91f1f', { r: 4 });
      fillRR(c, 5, h - 94, w - 20, 70, 2, '#101418', '#000', 1);
      for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++) fillRR(c, 8 + k * 11, h - 90 + r * 13, 8, 9, 1, ['#ffd23f', '#7cf29a', '#64b5f6', '#ff8fb4', '#ffb36b'][(r + k) % 5], null);
      vgrad(c, 5, h - 94, w - 20, 70, [[0, 'rgba(255,255,255,0.18)'], [1, 'rgba(255,255,255,0)']]);
      fillRR(c, w - 13, h - 80, 8, 30, 1, '#2b2b2b', null);
      fillRR(c, 6, h - 18, w - 22, 10, 1, '#111', null);
    })];
    case 'linencart': return [part(x, y, w, h, 40, y + h, (c) => {
      shadowBlob(c, w / 2 + 2, h, w * 0.6, 6, 0.3);
      fillRR(c, 0, h - 30, w, 26, 2, '#9aa3ab', '#5d656c', 1);
      for (let k = 0; k < 3; k++) fillRR(c, 4, h - 38 - k * 6, w - 8, 7, 2, ['#f6f8f8', '#cfe6ee', '#f6f8f8'][k], 'rgba(0,0,0,0.2)', 0.6);
      for (const wx of [6, w - 6]) circle(c, wx, h - 2, 3, '#222');
    })];
    case 'policedesk': return [part(x, y, w, h, 104, y + h, (c) => {
      box(c, 0, 0, w, h, 46, '#8a7a5a', '#5a4c36');
      fillRR(c, 6, -98, w - 12, 52, 2, 'rgba(180,210,230,0.22)', 'rgba(255,255,255,0.6)', 1.5);
      line(c, 12, -92, 34, -50, 'rgba(255,255,255,0.3)', 3);
      fillRR(c, w / 2 - 30, -50, 60, 5, 1, '#2b2e32', null);
      fillRR(c, w / 2 - 40, h - 36, 80, 18, 2, '#1f3557', '#0e1a2b', 1);
      text(c, 'POLICE', w / 2, h - 27, { size: 10, color: '#e8c547' });
      fillRR(c, 16, h - 54, 30, 8, 1, '#f4efe2', null);
    })];
    case 'permitwindow': return [part(x, y, w, h, 110, y + h, (c) => {
      box(c, 0, 0, w, h, 42, '#cfc6ad', '#8a7a5a');
      fillRR(c, 6, -90, w - 12, 48, 2, 'rgba(180,210,230,0.22)', 'rgba(255,255,255,0.6)', 1.5);
      fillRR(c, 10, -108, w - 20, 18, 2, '#2c5aa0', '#16305a', 1);
      text(c, 'PERMITS & TESTS', w / 2, -99, { size: 7, color: '#fff' });
    })];
    case 'bench2': return [part(x, y, w, h, 20, y + h, (c) => {
      box(c, 0, 0, w, h, 16, '#9a6a48', '#7d5338');
      for (let k = 10; k < w; k += 14) line(c, k, -14, k, h - 18, 'rgba(0,0,0,0.12)', 1);
    })];
    case 'watercooler': return [part(x, y, w, h, 56, y + h, (c) => {
      fillRR(c, 2, h - 32, w - 4, 32, 2, '#e8eaec', '#9aa3ab', 1);
      fillRR(c, 4, h - 56, w - 8, 26, 8, 'rgba(120,190,240,0.75)', '#4b7fa0', 1);
      circle(c, w / 2 - 4, h - 20, 2, '#2c6fbb');
      circle(c, w / 2 + 4, h - 20, 2, '#d32f2f');
    })];
    case 'workbench': return [part(x, y, w, h, 46, y + h, (c) => {
      box(c, 0, 0, w, h, 34, '#8a6a48', '#5a4026');
      fillRR(c, 10, h - 46, 40, 10, 2, '#c9302c', null);
      fillRR(c, 60, h - 44, 30, 8, 1, '#9aa3ab', null);
      circle(c, 110, h - 42, 6, '#5d656c');
      line(c, 130, h - 46, 160, h - 40, '#c7ccd1', 3);
      for (let k = 0; k < 3; k++) fillRR(c, 20 + k * 50, h - 20, 30, 12, 1, null, 'rgba(0,0,0,0.3)', 1);
    })];
    case 'toolbox': return [part(x, y, w, h, 52, y + h, (c) => {
      box(c, 0, 0, w, h, 46, '#c9302c', '#a12521', { r: 3 });
      for (let k = 0; k < 4; k++) {
        line(c, 3, h - 40 + k * 10, w - 3, h - 40 + k * 10, 'rgba(0,0,0,0.3)', 1);
        fillRR(c, w / 2 - 8, h - 37 + k * 10, 16, 2, 1, '#c7ccd1', null);
      }
      for (const wx of [5, w - 5]) circle(c, wx, h, 3, '#1d1d1d');
    })];
    case 'carlift': return [part(x, y, w, h, 70, y + h, (c) => {
      shadowBlob(c, w / 2 + 4, h / 2 + 6, w * 0.5, h * 0.45, 0.3);
      for (const px of [10, w - 26]) {
        fillRR(c, px, 10, 16, h - 20, 2, '#3b6fa0', '#1f3a5a', 1);
        fillRR(c, px - 2, -60, 20, 72, 2, '#2f5f8f', '#1f3a5a', 1);
      }
      c.save();
      c.translate(w / 2, h / 2 - 40);
      drawCar(c, -Math.PI / 2, '#5a7a3a', { front: 0.4, rear: 0, left: 0.2, right: 0 }, false, false, { len: 96, wid: 44 });
      c.restore();
    })];
    case 'tirerack': return [part(x, y, w, h, 60, y + h, (c) => {
      fillRR(c, 0, -50, w, h + 46, 2, 'rgba(0,0,0,0.2)', null);
      for (let k = 0; k < 6; k++) {
        ellipse(c, w / 2, -36 + k * ((h + 30) / 6), w / 2 - 4, 9, '#1d1d1d');
        ellipse(c, w / 2, -37 + k * ((h + 30) / 6), w / 4, 4, '#3a3a3a');
      }
    })];
    case 'stallpost': return [part(x, y, w, h, 40, y + h, (c) => {
      fillRR(c, w / 2 - 4, h - 40, 8, 40, 2, '#ffd23f', '#7a5d10', 1);
      for (let k = 0; k < 4; k++) line(c, w / 2 - 4, h - 36 + k * 9, w / 2 + 4, h - 32 + k * 9, '#1d1d1d', 2);
      fillRR(c, -10, h - 52, w + 20, 14, 2, '#1d1d22', null);
      text(c, 'STALL 3', w / 2, h - 45, { size: 6, color: '#ffd23f' });
    })];
    case 'palletrack': return [part(x, y, w, h, 110, y + h, (c) => {
      const rnd = rngFor(`rack${x},${y}`);
      for (const ux of [0, w / 2 - 3, w - 6]) fillRR(c, ux, -100, 6, h + 100, 1, '#3b6fa0', '#1f3a5a', 1);
      for (let lvl = 0; lvl < 3; lvl++) {
        const ly = h - 6 - lvl * 40;
        fillRR(c, 0, ly - 4, w, 6, 1, '#e8862a', null);
        for (let k = 0; k < Math.floor(w / 36); k++) {
          if (rnd() < 0.25) continue;
          const bw = 28 + rnd() * 6;
          const bh = 22 + rnd() * 10;
          fillRR(c, 6 + k * 36, ly - 4 - bh, bw, bh, 1, ['#c8a06a', '#b98f5a', '#d8b47a'][k % 3], 'rgba(0,0,0,0.3)', 0.8);
          line(c, 6 + k * 36, ly - 4 - bh / 2, 6 + k * 36 + bw, ly - 4 - bh / 2, 'rgba(120,80,30,0.4)', 1);
        }
      }
    })];
    case 'pallet': return [part(x, y, w, h, 46, y + h, (c) => {
      shadowBlob(c, w / 2 + 3, h / 2 + 4, w * 0.55, h * 0.5, 0.3);
      fillRR(c, 0, h - 14, w, 12, 1, '#a07a4a', '#5a4026', 1);
      for (let k = 0; k < 3; k++) fillRR(c, 4 + k * (w / 3), h - 12, w / 3 - 8, 8, 0, '#8a6a3a', null);
      for (let r = 0; r < 2; r++) for (let k = 0; k < Math.floor(w / 32); k++) fillRR(c, 4 + k * 32, h - 40 - r * 22, 28, 24, 1, ['#c8a06a', '#d8b47a'][(k + r) % 2], 'rgba(0,0,0,0.3)', 0.8);
      c.fillStyle = 'rgba(200,230,255,0.15)';
      c.fillRect(0, h - 62, w, 50);
    })];
    case 'forklift': return [part(x, y, w, h, 70, y + h, (c) => {
      shadowBlob(c, w / 2 + 3, h / 2 + 6, w * 0.6, h * 0.5, 0.35);
      fillRR(c, 6, 20, w - 12, h - 30, 6, '#e8b923', '#7a5d10', 1.5);
      fillRR(c, 12, -20, w - 24, 46, 4, 'rgba(40,40,40,0.25)', '#1d1d1d', 2);
      fillRR(c, w / 2 - 12, 30, 24, 20, 4, '#1d1d1d', null);
      for (const fx2 of [w / 2 - 14, w / 2 + 10]) fillRR(c, fx2, -36, 4, 40, 1, '#5d656c', null);
      for (const wy of [30, h - 14]) for (const wx of [4, w - 12]) fillRR(c, wx, wy, 8, 14, 2, '#111', null);
    })];
    case 'dispatch': return [part(x, y, w, h, 60, y + h, (c) => {
      box(c, 0, 0, w, h, 40, '#3a3d42', '#e8b923');
      for (let k = 0; k < w; k += 16) {
        c.fillStyle = (k / 16) % 2 ? '#1d1d1d' : '#f4f4f0';
        c.fillRect(k, h - 12, 16, 8);
      }
      fillRR(c, 20, h - 60, 50, 20, 2, '#1d1d1d', '#000', 1);
      for (let k = 0; k < 5; k++) circle(c, 28 + k * 9, h - 50, 2.5, ['#c62828', '#7cf29a', '#ffd23f', '#64b5f6', '#ff8fb4'][k]);
      line(c, 60, h - 60, 66, h - 80, '#9aa3ab', 1.5);
      fillRR(c, w - 70, h - 62, 40, 24, 2, '#111', '#000', 1);
      fillRR(c, w - 67, h - 59, 34, 17, 1, '#1d3b5a', null);
      text(c, 'DISPATCH', w / 2, h - 30, { size: 8, color: '#1d1d1d' });
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
    case 'car': return [carPart(f.x, f.y, f.rot || 0, f.color || '#8a2f2f', f.y + 30, null, f.police, f.cab)];
    case 'truck': return [part(f.x - 66, f.y - 28, 132, 56, 54, f.y + 28, (c) => {
      shadowBlob(c, 70, 52, 72, 14, 0.35);
      // body
      box(c, 0, 0, 132, 40, 46, '#f4efe2', '#e8b923', { r: 6 });
      fillRR(c, 96, -10, 36, 50, 5, '#e8b923', '#7a5d10', 1);
      fillRR(c, 104, -4, 24, 14, 2, '#2a3a48', null);
      // serving window + awning
      fillRR(c, 16, 6, 64, 22, 2, '#2b2b2b', null);
      vgrad(c, 18, 8, 60, 18, [[0, '#ffe2a8'], [1, '#d8a45a']]);
      for (let k = 0; k < 8; k++) {
        c.fillStyle = k % 2 ? '#c62828' : '#fff';
        c.fillRect(12 + k * 9, 0, 9, 7);
      }
      text(c, 'TACOS LUPITA', 48, 34, { size: 7, color: '#c62828' });
      for (const wx of [24, 108]) circle(c, wx, 42, 6, '#111');
    })];
    case 'boxtruck': return [part(f.x - 82, f.y - 30, 164, 60, 60, f.y + 30, (c) => {
      shadowBlob(c, 86, 58, 86, 14, 0.35);
      box(c, 0, 0, 120, 46, 58, '#e8e2d4', '#cfc8b8', { r: 3 });
      text(c, 'BAYOU WAREHOUSE', 60, -2, { size: 7, color: '#2c5aa0' });
      fillRR(c, 118, 6, 44, 40, 5, '#2c5aa0', '#16305a', 1);
      fillRR(c, 130, 12, 26, 14, 2, '#2a3a48', null);
      for (const wx of [24, 96, 140]) circle(c, wx, 50, 7, '#111');
    })];
    case 'pallets': return [part(f.x - 42, f.y - 20, 84, 40, 22, f.y + 20, (c) => {
      for (let r = 0; r < 3; r++) {
        fillRR(c, 2, 26 - r * 10, 80, 9, 1, '#a07a4a', '#5a4026', 1);
        for (let k = 0; k < 5; k++) line(c, 6 + k * 18, 27 - r * 10, 6 + k * 18, 34 - r * 10, 'rgba(60,40,20,0.5)', 1);
      }
    })];
    case 'oilcan': return [part(f.x - 10, f.y - 8, 20, 16, 22, f.y + 8, (c) => {
      fillRR(c, 2, -14, 16, 26, 3, '#2c5aa0', '#16305a', 1);
      ellipse(c, 10, -14, 8, 3, '#3b6fa0');
      line(c, 2, -4, 18, -4, '#16305a', 1);
    })];
    case 'portapotty': return [part(f.x - 20, f.y - 16, 40, 30, 70, f.y + 14, (c) => {
      box(c, 0, 4, 40, 26, 64, '#2c7a4b', '#24683f', { r: 3 });
      fillRR(c, 8, -30, 24, 54, 2, null, 'rgba(0,0,0,0.25)', 1);
      circle(c, 30, -2, 2, '#c7ccd1');
      text(c, 'OCCUPIED', 20, -40, { size: 4, color: '#c62828' });
    })];
    case 'hoop': return [part(f.x - 30, f.y - 6, 60, 12, 110, f.y + 4, (c) => {
      const right = f.face === 'right';
      line(c, 30, 6, 30, -86, '#5d656c', 4);
      const bx = right ? 34 : 10;
      fillRR(c, bx, -110, 16, 30, 1, '#f4f4f0', '#5d656c', 1);
      fillRR(c, bx + 4, -98, 8, 8, 0, null, '#c62828', 1);
      c.strokeStyle = '#ff6a2a';
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(right ? bx + 22 : bx - 6, -88, 8, 3, 0, 0, Math.PI * 2);
      c.stroke();
      for (let k = 0; k < 4; k++) line(c, (right ? bx + 16 : bx - 12) + k * 4, -88, (right ? bx + 18 : bx - 10) + k * 3, -76, 'rgba(255,255,255,0.7)', 0.8);
    })];
    case 'salecar': return [part(f.x - 56, f.y - 56, 112, 112, 0, f.y + 30, (c) => {
      c.translate(56, 56);
      drawCar(c, f.rot || 0, f.color || '#2f4f8a', null, false, false, {});
      c.rotate(0);
      fillRR(c, -22, -10, 44, 20, 3, '#ffeb3b', '#c62828', 1.5);
      text(c, `$${({ sedan: 900, pickup: 1700, coupe: 3200 })[f.model] || 999}`, 0, 0.5, { size: 9, color: '#c62828' });
    }, 0)];
    case 'lumber': return [part(f.x - 36, f.y - 18, 72, 36, 26, f.y + 18, (c) => {
      for (let r = 0; r < 4; r++) for (let k = 0; k < 5; k++) fillRR(c, 4 + k * 13 + (r % 2) * 3, 26 - r * 7, 64 / 5, 6, 1, ['#d8b47a', '#c8a06a', '#e2c08a'][(k + r) % 3], 'rgba(90,60,30,0.5)', 0.6);
      line(c, 2, 4, 70, 4, '#c62828', 1.5);
    })];
    case 'blocks': return [part(f.x - 36, f.y - 18, 72, 36, 30, f.y + 18, (c) => {
      fillRR(c, 0, 26, 72, 8, 1, '#a07a4a', null);
      for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) fillRR(c, 2 + k * 17 + (r % 2) * 4, 18 - r * 9, 16, 9, 1, '#b4ada0', 'rgba(0,0,0,0.3)', 0.8);
    })];
    case 'frame': return [part(f.x, f.y, f.w, f.h, 80, f.y + f.h, (c, w, h) => {
      // a half-built wood frame house: slab, studs, top plates
      fillRR(c, 0, 0, w, h, 2, '#b4ada0', '#7a7468', 1);
      texture(c, 0, 0, w, h, 'grain', 0.2, 'overlay');
      c.strokeStyle = '#d8b47a';
      c.lineWidth = 4;
      const studs = (x0, y0, x1, y1) => {
        const n = Math.round(Math.hypot(x1 - x0, y1 - y0) / 16);
        for (let k = 0; k <= n; k++) {
          const px = x0 + ((x1 - x0) * k) / n;
          const py = y0 + ((y1 - y0) * k) / n;
          line(c, px, py, px, py - 64, '#d8b47a', 3);
        }
        line(c, x0, y0 - 64, x1, y1 - 64, '#c8a06a', 5);
      };
      studs(8, 10, w - 8, 10);
      studs(8, 10, 8, h - 50);
      studs(w - 8, 10, w - 8, h - 50);
      line(c, 8, h - 8, w - 60, h - 8, '#c8a06a', 5);
      for (let k = 8; k < w - 60; k += 16) line(c, k, h - 8, k, h - 70, '#d8b47a', 3);
    })];
    case 'pump': return [part(f.x - 18, f.y - 12, 36, 24, 56, f.y + 12, (c) => {
      fillRR(c, 0, 14, 36, 10, 2, '#9aa3ab', '#5d656c', 1);
      box(c, 6, 12, 24, 10, 50, '#c62828', '#a12521', { r: 3 });
      fillRR(c, 9, -26, 18, 12, 1, '#111', null);
      text(c, '3.29', 18, -20, { size: 5, color: '#7cf29a' });
      line(c, 30, -10, 36, 6, '#1d1d1d', 2);
      fillRR(c, 9, -40, 18, 8, 1, '#ffd23f', null);
    })];
    case 'tires': return [part(f.x - 16, f.y - 10, 32, 20, 18, f.y + 10, (c) => {
      for (let k = 0; k < 3; k++) {
        ellipse(c, 16, 14 - k * 6, 14, 6, '#1d1d1d');
        ellipse(c, 16, 13 - k * 6, 7, 3, '#3a3a3a');
      }
    })];
    case 'icebox': return [part(f.x - 22, f.y - 12, 44, 24, 34, f.y + 12, (c) => {
      box(c, 0, 0, 44, 18, 30, '#e9eef2', '#cfd8de');
      fillRR(c, 6, -6, 32, 10, 2, '#2c6fbb', null);
      text(c, 'ICE', 22, -1, { size: 7, color: '#fff' });
    })];
    case 'flagpole': return [part(f.x - 4, f.y - 4, 60, 8, 160, f.y + 3, (c) => {
      line(c, 4, 4, 4, -150, '#c7ccd1', 3);
      circle(c, 4, -152, 3, '#e8c547');
      const wave = (k) => Math.sin(k * 0.25) * 3;
      c.fillStyle = '#1f3557';
      c.beginPath();
      c.moveTo(6, -146);
      for (let k = 0; k <= 44; k += 4) c.lineTo(6 + k, -146 + wave(k));
      for (let k = 44; k >= 0; k -= 4) c.lineTo(6 + k, -118 + wave(k));
      c.closePath();
      c.fill();
      c.fillStyle = '#e8c547';
      c.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 5;
        const r = k % 2 ? 3 : 7;
        c.lineTo(28 + Math.cos(a) * r, -132 + Math.sin(a) * r);
      }
      c.closePath();
      c.fill();
    })];
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
  if (f.type === 'canopy') {
    return part(f.x, f.y, f.w, f.h, 0, 0, (c, w, h) => {
      fillRR(c, 4, 4, w, h, 4, 'rgba(0,0,0,0.25)', null);
      fillRR(c, 0, 0, w, h, 4, 'rgba(230,232,236,0.88)', '#8d949b', 2);
      c.fillStyle = 'rgba(198,40,40,0.9)';
      c.fillRect(0, 0, w, 10);
      c.fillRect(0, h - 10, w, 10);
      for (let k = 30; k < w; k += 70) circle(c, k, h / 2, 9, 'rgba(255,250,220,0.85)');
      text(c, 'GAS & GO', w / 2, h / 2, { size: 14, color: 'rgba(198,40,40,0.8)' });
    }, 6);
  }
  if (f.type === 'bunting') {
    return part(f.x, f.y - 10, f.w, 20, 0, 0, (c, w) => {
      c.strokeStyle = 'rgba(40,40,40,0.6)';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(0, 0);
      c.quadraticCurveTo(w / 2, 14, w, 0);
      c.stroke();
      for (let k = 6; k < w; k += 14) {
        const t = k / w;
        const yy = 2 * t * (1 - t) * 14;
        c.fillStyle = ['#c62828', '#f4f4f0', '#2c5aa0', '#ffd23f'][Math.floor(k / 14) % 4];
        c.beginPath();
        c.moveTo(k - 5, yy);
        c.lineTo(k + 5, yy);
        c.lineTo(k, yy + 10);
        c.fill();
      }
    }, 4);
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
export function carPart(x, y, rot, color, key, dmg = null, police = false, cab = false) {
  const L = 92;
  const W = 42;
  const R = Math.ceil(Math.hypot(L, W) / 2) + 6;
  return part(x - R, y - R, R * 2, R * 2, 0, key, (c) => {
    c.translate(R, R);
    drawCar(c, rot, color, dmg, false, police, { cab });
  }, 0);
}

export function drawCar(c, rot, color, dmg = null, lights = false, police = false, o = {}) {
  const L = o.len || 92;
  const W = o.wid || 42;
  c.save();
  c.rotate(rot);
  shadowBlob(c, 4, 6, L * 0.58, W * 0.62, 0.38);
  // tires
  for (const [tx, ty] of [[-L * 0.32, -W / 2], [L * 0.3, -W / 2], [-L * 0.32, W / 2], [L * 0.3, W / 2]]) fillRR(c, tx - 9, ty - 4, 18, 8, 2, '#111', null);
  // driver door swinging open (left side = -y)
  if (o.door > 0) {
    c.save();
    c.translate(L * 0.18, -W / 2);
    c.rotate(-o.door * 1.1);
    fillRR(c, -L * 0.26, -3, L * 0.26, 5, 2, shade(color, -0.1), shade(color, -0.5), 1);
    c.restore();
  }
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
  // driver's head through the glass
  if (o.driver) {
    circle(c, L * 0.02, -W * 0.16, 6.5, o.driver.hairColor || '#1a120c');
    circle(c, L * 0.04, -W * 0.16, 5, o.driver.skin);
  }
  // roof
  if (o.pickup) {
    fillRR(c, -L / 2 + 4, -W * 0.4, L * 0.36, W * 0.8, 3, shade(color, -0.35), 'rgba(0,0,0,0.4)', 1);
    for (let k = 1; k < 4; k++) line(c, -L / 2 + 4 + k * L * 0.09, -W * 0.38, -L / 2 + 4 + k * L * 0.09, W * 0.38, 'rgba(0,0,0,0.25)', 1);
  } else fillRR(c, -L * 0.13, -W * 0.33, L * 0.2, W * 0.66, 4, shade(color, 0.08), null);
  if (o.cab) {
    fillRR(c, -L * 0.06, -W * 0.14, L * 0.1, W * 0.28, 2, '#1d1d1d', null);
    text(c, 'TAXI', -L * 0.01, 0.5, { size: 5, color: '#ffd23f' });
    for (let k = -2; k < 3; k++) fillRR(c, L * 0.25, k * 6 - 3, 6, 6, 0, (k + 10) % 2 ? '#1d1d1d' : '#f4f4f0', null);
  }
  // lights
  fillRR(c, L / 2 - 5, -W / 2 + 4, 4, 8, 1, lights ? '#fffbe0' : '#e8e4c9', null);
  fillRR(c, L / 2 - 5, W / 2 - 12, 4, 8, 1, lights ? '#fffbe0' : '#e8e4c9', null);
  fillRR(c, -L / 2 + 1, -W / 2 + 4, 3, 8, 1, o.brake ? '#ff2a1f' : '#b3261e', null);
  fillRR(c, -L / 2 + 1, W / 2 - 12, 3, 8, 1, o.brake ? '#ff2a1f' : '#b3261e', null);
  if (o.brake) {
    circle(c, -L / 2 - 2, -W / 2 + 8, 7, 'rgba(255,40,30,0.35)');
    circle(c, -L / 2 - 2, W / 2 - 8, 7, 'rgba(255,40,30,0.35)');
  }
  // mirrors
  fillRR(c, L * 0.12, -W / 2 - 4, 6, 4, 1, shade(color, -0.3), null);
  fillRR(c, L * 0.12, W / 2, 6, 4, 1, shade(color, -0.3), null);
  if (police) {
    // black-and-white panels and a light bar
    fillRR(c, -L / 2 + 2, -W / 2 + 1, L * 0.24, W - 2, 6, '#1d1f24', null);
    fillRR(c, L / 2 - L * 0.24 - 2, -W / 2 + 1, L * 0.24, W - 2, 6, '#1d1f24', null);
    fillRR(c, -3, -W * 0.32, 8, W * 0.64, 2, '#222', null);
    fillRR(c, -2, -W * 0.3, 6, W * 0.28, 1, '#e53935', null);
    fillRR(c, -2, W * 0.02, 6, W * 0.28, 1, '#1e88e5', null);
  }
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
    case 'envelope': fillRR(c, -10, -7, 20, 14, 1, '#e8dcc0', '#8a7a5a', 1); line(c, -10, -7, 0, 1, '#8a7a5a', 1); line(c, 10, -7, 0, 1, '#8a7a5a', 1); circle(c, 0, 1, 2.2, '#b3261e'); break;
    case 'box': fillRR(c, -11, -9, 22, 18, 1, '#c8a06a', '#7a5a2e', 1); line(c, -11, -3, 11, -3, '#a07a44', 2); line(c, 0, -9, 0, -3, '#a07a44', 2); text(c, 'SODA', 0, 3, { size: 5, color: '#7a2020' }); break;
    case 'linen': fillRR(c, -11, -6, 22, 12, 3, '#f6f8f8', '#9aa3ab', 1); line(c, -9, -1, 9, -1, 'rgba(0,0,0,0.12)', 1); line(c, -9, 2, 9, 2, 'rgba(0,0,0,0.12)', 1); break;
    case 'plates': circle(c, 0, 0, 10, '#1d1d1d'); circle(c, 0, 0, 3, '#5d656c'); circle(c, -3, -3, 2, 'rgba(255,255,255,0.15)'); break;
    case 'lumber': c.rotate(0.5); for (let k = 0; k < 3; k++) fillRR(c, -3 + k * 3 - 3, -13, 3, 26, 0.5, ['#d8b47a', '#c8a06a', '#e2c08a'][k], 'rgba(90,60,30,0.5)', 0.5); break;
    case 'cinder': for (let k = 0; k < 2; k++) fillRR(c, -11 + k * 11, -6, 10, 12, 1, '#b4ada0', 'rgba(0,0,0,0.3)', 0.8); break;
    case 'dumbbell': line(c, -8, 0, 8, 0, '#9aa3ab', 3); fillRR(c, -12, -6, 6, 12, 2, '#1d1d1d', null); fillRR(c, 6, -6, 6, 12, 2, '#1d1d1d', null); break;
    case 'book': case 'manual': fillRR(c, -7, -10, 14, 20, 1.5, def === 'manual' ? '#2c5aa0' : '#8e3b2f', '#222', 1); fillRR(c, 5, -9, 2, 18, 0, '#f2efe6', null); fillRR(c, -4, -6, 8, 3, 0, 'rgba(255,255,255,0.6)', null); break;
    default: circle(c, 0, 0, 7, '#999');
  }
  c.restore();
}

// Item held in a hand, drawn small near the hand position.
export function drawHeld(c, def) {
  drawItem(c, def, 16);
}
