// Drawing helpers shared by the painters: colors, noise textures, shapes.

import { seeded } from '../sim/rng.js';
import { hashStr } from '../sim/util.js';

export function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined' && typeof document === 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

export function rngFor(key) {
  return seeded(hashStr(String(key)));
}

export function hexRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgb(r, g, b, a = 1) {
  return a >= 1 ? `rgb(${r | 0},${g | 0},${b | 0})` : `rgba(${r | 0},${g | 0},${b | 0},${a})`;
}

// shade(hex, +0.2) lightens, -0.2 darkens
export function shade(hex, amt, a = 1) {
  const [r, g, b] = hexRgb(hex);
  const t = amt < 0 ? 0 : 255;
  const k = Math.abs(amt);
  return rgb(r + (t - r) * k, g + (t - g) * k, b + (t - b) * k, a);
}

export function mix(h1, h2, t, a = 1) {
  const A = hexRgb(h1);
  const B = hexRgb(h2);
  return rgb(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t, a);
}

export function alpha(hex, a) {
  const [r, g, b] = hexRgb(hex);
  return rgb(r, g, b, a);
}

export function jitter(hex, rnd, amt) {
  return shade(hex, (rnd() - 0.5) * 2 * amt);
}

export function rrect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function fillRR(ctx, x, y, w, h, r, fill, stroke, lw = 1) {
  rrect(ctx, x, y, w, h, r);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

export function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

export function circle(ctx, x, y, r, fill) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

// Soft drop shadow blob
export function shadowBlob(ctx, x, y, rx, ry, a = 0.28) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
  g.addColorStop(0, `rgba(0,0,0,${a})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  ctx.translate(-x, -y);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// --- noise textures -------------------------------------------------------
let _grain = null;
let _cloud = null;

export function grain() {
  if (_grain) return _grain;
  const c = makeCanvas(256, 256);
  const g = c.getContext('2d');
  const img = g.createImageData(256, 256);
  const rnd = rngFor('grain');
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (rnd() - 0.5) * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  _grain = c;
  return c;
}

export function cloud() {
  if (_cloud) return _cloud;
  const size = 256;
  const c = makeCanvas(size, size);
  const g = c.getContext('2d');
  const rnd = rngFor('cloud');
  g.fillStyle = '#808080';
  g.fillRect(0, 0, size, size);
  // layered soft blobs = cheap value noise, tileable by wrapping
  for (let oct = 0; oct < 4; oct++) {
    const n = 18 * (oct + 1) * (oct + 1);
    const r = 60 / (oct + 1);
    for (let i = 0; i < n; i++) {
      const x = rnd() * size;
      const y = rnd() * size;
      const v = rnd() > 0.5 ? 255 : 0;
      const a = 0.05 + rnd() * 0.07;
      for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
        const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
        gr.addColorStop(0, `rgba(${v},${v},${v},${a})`);
        gr.addColorStop(1, `rgba(${v},${v},${v},0)`);
        g.fillStyle = gr;
        g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
      }
    }
  }
  _cloud = c;
  return c;
}

// Overlay a noise pattern on a region (multiply/overlay style tinting).
export function texture(ctx, x, y, w, h, kind = 'grain', a = 0.08, op = 'overlay', scale = 1) {
  const src = kind === 'grain' ? grain() : cloud();
  ctx.save();
  ctx.globalAlpha = a;
  ctx.globalCompositeOperation = op;
  const pat = ctx.createPattern(src, 'repeat');
  ctx.translate(x, y);
  if (scale !== 1) ctx.scale(scale, scale);
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, w / scale, h / scale);
  ctx.restore();
}

export function line(ctx, x1, y1, x2, y2, color, w = 1) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
}

export function vgrad(ctx, x, y, w, h, stops) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  for (const [t, c] of stops) g.addColorStop(t, c);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

export function hgrad(ctx, x, y, w, h, stops) {
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  for (const [t, c] of stops) g.addColorStop(t, c);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

export function text(ctx, s, x, y, { size = 12, color = '#fff', font = 'Arial Black, Impact, sans-serif', align = 'center', base = 'middle', weight = '' } = {}) {
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = base;
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}
