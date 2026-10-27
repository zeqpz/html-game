// Character art. Every person is drawn from their `look` each frame in
// three-quarter view (front, back, side) with walk, sit, lie, fight, work,
// dance and training poses. Feet sit at (0, 0). Looks only need a few fields;
// fullLook() fills in the rest (eye color, face shape...) so every NPC differs.

import { shade, alpha, fillRR, ellipse, circle, line, shadowBlob, hexRgb, rrect } from './gfx.js';
import { drawHeld } from './sprites.js';
import { hashStr } from '../sim/util.js';

const BUILD = {
  slim: { w: 12, waist: 10.5, hip: 11, leg: 4.4, arm: 3.4 },
  avg: { w: 14, waist: 12.5, hip: 13, leg: 4.8, arm: 3.8 },
  curvy: { w: 13, waist: 10.6, hip: 15, leg: 5.2, arm: 3.6 },
  heavy: { w: 18, waist: 17, hip: 17.5, leg: 5.8, arm: 4.6 },
  muscle: { w: 17.5, waist: 12.5, hip: 13.5, leg: 5.4, arm: 5.2 },
};

const OUT = 'rgba(20,12,8,0.55)';
const HY = -38.5; // head centre
const SHY = -29.5; // shoulder line
const WAIST = -18.5;

const DEF = {
  skin: '#c68a5e', hair: 'short', hairColor: '#1b120c', hair2: null, beard: 'none', build: 'avg', height: 1, age: 'adult',
  face: 'oval', eyes: 'round', eyeColor: '#3b2416', brows: 'straight', nose: 'small', mouth: 'neutral',
  freckles: false, scar: 'none', tattoo: 'none', makeup: 'none', lipColor: '#b0444f',
  top: 'tee', topColor: '#888888', top2: '#e8e2d4', pattern: 'none', outer: 'none', outerColor: '#3a3d44',
  bottom: 'jeans', bottomColor: '#34445e', shoes: '#ececec', shoeStyle: 'sneakers',
  hat: null, hatColor: '#b8312f', glasses: false, earrings: false, chain: false, watch: false, backpack: false, packColor: '#2c5aa0',
};

const cache = new WeakMap();

function lum(hex) {
  const [r, g, b] = hexRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// Fill in everything a look leaves out, deterministically from what it has.
export function fullLook(look) {
  let L = cache.get(look);
  if (L) return L;
  const h = hashStr(`${look.skin}|${look.hair}|${look.topColor}|${look.bottomColor}|${look.build}`);
  const pick = (arr, k) => arr[(h >>> k) % arr.length];
  const dark = lum(look.skin || DEF.skin) < 0.42;
  const derived = {
    eyeColor: dark ? pick(['#2b1a10', '#3b2416', '#4a2e1a'], 3) : pick(['#3b2416', '#5a3a1e', '#4a5a2a', '#2c5aa0', '#5a7a9a', '#3d6b4a'], 5),
    face: pick(['oval', 'oval', 'round', 'square', 'long'], 7),
    nose: pick(['small', 'small', 'button', 'wide', 'long'], 9),
    brows: pick(['straight', 'arched', 'thick', 'straight'], 11),
    eyes: pick(['round', 'round', 'narrow', 'wide', 'sleepy'], 13),
    packColor: pick(['#2c5aa0', '#c62828', '#1d1d22', '#3d8b4f'], 15),
  };
  L = { ...DEF, ...derived, ...look };
  if (L.glasses === true) L.glasses = 'square';
  if (!L.beardColor) L.beardColor = L.hairColor;
  L._hash = h;
  cache.set(look, L);
  return L;
}

// ---------------------------------------------------------------- primitives
function limb(c, x1, y1, x2, y2, w, color, hi = true) {
  c.lineCap = 'round';
  c.strokeStyle = OUT;
  c.lineWidth = w + 1.3;
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.stroke();
  c.strokeStyle = color;
  c.lineWidth = w;
  c.stroke();
  if (hi) {
    // a strip of light down the lit side
    c.strokeStyle = shade(color, 0.18, 0.55);
    c.lineWidth = w * 0.32;
    c.beginPath();
    c.moveTo(x1 - w * 0.22, y1);
    c.lineTo(x2 - w * 0.22, y2);
    c.stroke();
  }
}

function hgradFill(c, x0, x1, col, hi = 0.13, lo = -0.24) {
  const g = c.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, shade(col, hi));
  g.addColorStop(0.45, col);
  g.addColorStop(1, shade(col, lo));
  return g;
}

function sleeves(L) {
  // [upper color, lower color] for the arms: what covers the skin
  const outerSleeve = L.outer !== 'none' && L.outer !== 'vest';
  if (outerSleeve) return [L.outerColor, L.outerColor];
  const main = L.top === 'apron' ? L.top2 : L.topColor;
  switch (L.top) {
    case 'tank': case 'jersey': case 'dress': return [L.skin, L.skin];
    case 'tee': case 'polo': case 'apron': case 'uniform': return [main, L.skin];
    default: return [main, main];
  }
}

function torsoPath(c, B, W) {
  c.beginPath();
  c.moveTo(-W / 2, SHY + 2.5);
  c.quadraticCurveTo(-W / 2, SHY, -W / 2 + 3, SHY - 0.6);
  c.lineTo(W / 2 - 3, SHY - 0.6);
  c.quadraticCurveTo(W / 2, SHY, W / 2, SHY + 2.5);
  if (B.hip > B.waist + 1.5) {
    c.quadraticCurveTo(B.waist / 2 - 0.5, SHY + 7, B.waist / 2, WAIST - 2);
    c.quadraticCurveTo(B.hip / 2 + 0.5, WAIST, B.hip / 2, WAIST + 0.5);
    c.lineTo(-B.hip / 2, WAIST + 0.5);
    c.quadraticCurveTo(-B.hip / 2 - 0.5, WAIST, -B.waist / 2, WAIST - 2);
    c.quadraticCurveTo(-B.waist / 2 + 0.5, SHY + 7, -W / 2, SHY + 2.5);
  } else {
    c.lineTo(B.waist / 2, WAIST + 0.5);
    c.lineTo(-B.waist / 2, WAIST + 0.5);
  }
  c.closePath();
}

// ---------------------------------------------------------------- entry
// opts: face, pose, phase, moving, t, strike(0..1), hurt(0..1), guard, held, sleeping, eating, bar
export function drawPerson(c, look, o) {
  const L = fullLook(look);
  const pose = o.pose || 'stand';
  if (pose === 'lie' || pose === 'sleep') return drawLying(c, L, o, o.face === 'left' || o.face === 'right');
  if (pose === 'down') return drawLying(c, L, { ...o, sleeping: true, ko: true }, true);
  c.save();
  const hs = L.height || 1;
  c.scale(hs, hs);
  if (!o.noShadow) shadowBlob(c, 0, 0.5, pose === 'sit' ? 11 : 9.5 + (L.build === 'heavy' ? 1.5 : 0), 3.6, 0.36);
  const face = o.face || 'down';
  if (face === 'left' || face === 'right') {
    if (face === 'left') c.scale(-1, 1);
    drawSide(c, L, o);
  } else drawFrontBack(c, L, o, face === 'up');
  c.restore();
}

// ---------------------------------------------------------------- front / back
function drawFrontBack(c, L, o, back) {
  const B = BUILD[L.build] || BUILD.avg;
  const pose = o.pose || 'stand';
  const sit = pose === 'sit';
  const ph = o.phase || 0;
  const mv = o.moving ? 1 : 0;
  const run = pose === 'run';
  const t = o.t || 0;
  const swing = run ? Math.sin(t * 14) : pose === 'dance' ? Math.sin(t * 6) * 0.8 : Math.sin(ph) * mv;
  let lift = 0;
  if (pose === 'lift' && o.bar) lift = (Math.sin(t * 2.4) * 0.5 + 0.5) * 4;
  const breathe = !mv && !run ? Math.sin(t * 1.6) * 0.25 : 0;
  const dy = (sit ? 7 : 0) + lift + (o.hurt > 0 ? 1 : 0);
  const bob = mv || run ? Math.abs(Math.sin(ph)) * -1 : pose === 'dance' ? Math.abs(Math.sin(t * 6)) * -1.2 : 0;
  c.save();
  c.translate(0, dy + bob);
  const W = B.w;
  const legX = Math.max(2.6, B.hip * 0.2);

  // long hair hangs behind the shoulders when you face the camera
  if (!back) drawHairBack(c, L, 'front');

  drawLegsFront(c, L, B, legX, swing, sit, back);

  // arms & hands, decided before drawing so held items know where to go
  const shL = { x: -W / 2 - 0.8, y: SHY + 1.5 };
  const shR = { x: W / 2 + 0.8, y: SHY + 1.5 };
  let hL = { x: shL.x - 0.8, y: -15.5 - swing * 1.4 };
  let hR = { x: shR.x + 0.8, y: -15.5 + swing * 1.4 };
  if (sit) {
    hL = { x: shL.x + 2, y: -16 };
    hR = { x: shR.x - 2, y: -16 };
  }
  if (o.guard) {
    hL = { x: -4, y: -33 };
    hR = { x: 4, y: -32 };
  }
  if (pose === 'work') {
    hL = { x: -5 + Math.sin(t * 5) * 2, y: -22 };
    hR = { x: 5 + Math.cos(t * 6) * 2.5, y: -21 + Math.sin(t * 6) };
  }
  if (pose === 'curl') {
    const a = Math.sin(t * 3);
    hL = { x: shL.x - 0.5, y: a > 0 ? -26 : -16 };
    hR = { x: shR.x + 0.5, y: a > 0 ? -16 : -26 };
  }
  if (pose === 'lift' && o.bar) {
    hL = { x: -W / 2 - 3, y: -31 };
    hR = { x: W / 2 + 3, y: -31 };
  }
  if (pose === 'bag') {
    const a = Math.sin(t * 7);
    hL = { x: -3, y: a > 0.3 ? -40 : -32 };
    hR = { x: 3, y: a < -0.3 ? -40 : -32 };
  }
  if (pose === 'dance') {
    const a = Math.sin(t * 6);
    hL = { x: -W / 2 - 3, y: a > 0 ? -42 : -30 };
    hR = { x: W / 2 + 3, y: a > 0 ? -30 : -42 };
  }
  if (o.eating && Math.sin(t * 1.3) > 0.6) hR = { x: 2, y: -33 };
  if (o.strike > 0) {
    const k = Math.sin(o.strike * Math.PI);
    hR = back ? { x: 3, y: -30 - k * 9 } : { x: 2, y: -24 + k * 6 };
  }

  // skirt / dress skirt sits behind the torso hem
  drawSkirt(c, L, B, sit);

  c.save();
  c.translate(0, breathe * 0.4);
  drawTorso(c, L, B, W, back);
  if (back && L.backpack) drawPack(c, L, W, true);
  c.restore();

  drawArm(c, L, B, shL, hL, back, false, o);
  drawArm(c, L, B, shR, hR, back, true, o);
  if (!back && L.backpack) drawPackStraps(c, L, W);

  if (pose === 'lift' && o.bar) {
    line(c, -W / 2 - 9, -31.5, W / 2 + 9, -31.5, '#c7ccd1', 2);
    fillRR(c, -W / 2 - 12, -36, 4, 9, 1, '#1d1d1d', null);
    fillRR(c, W / 2 + 8, -36, 4, 9, 1, '#1d1d1d', null);
  }
  if (pose === 'curl') {
    for (const h of [hL, hR]) {
      line(c, h.x - 3, h.y, h.x + 3, h.y, '#9aa3ab', 1.6);
      fillRR(c, h.x - 4.5, h.y - 2, 2, 4, 0.5, '#1d1d1d', null);
      fillRR(c, h.x + 2.5, h.y - 2, 2, 4, 0.5, '#1d1d1d', null);
    }
  }
  if (o.held) {
    c.save();
    c.translate(hR.x + 1.5, hR.y + 1);
    if (o.held === 'plate') c.translate(-hR.x - 1, -4);
    drawHeld(c, o.held);
    c.restore();
  }
  drawHead(c, L, o, back ? 'back' : 'front');
  c.restore();
}

function drawLegsFront(c, L, B, legX, swing, sit, back) {
  const pants = L.bottomColor;
  const skin = L.skin;
  const dress = L.top === 'dress';
  const bare = dress || L.bottom === 'skirt';
  if (sit && !back) {
    for (const s of [-1, 1]) {
      const lx = s * legX * 1.15;
      limb(c, lx, -12, lx, -6, B.leg + 1.5, bare ? (dress ? L.topColor : pants) : pants);
      limb(c, lx, -6, lx, -1, B.leg, L.bottom === 'shorts' || bare ? skin : pants);
      drawShoe(c, L, lx, -1.5, false);
    }
    return;
  }
  if (sit) return;
  for (const s of [-1, 1]) {
    const up = Math.max(0, s * swing) * 2.6;
    const lx = s * legX;
    const kneeY = -9 - up * 0.5;
    const footY = -2.5 - up;
    const lw = B.leg;
    if (bare) {
      limb(c, lx, -9, lx, footY, lw - 0.6, skin);
    } else if (L.bottom === 'shorts') {
      // thigh in fabric, knee down in skin
      legShape(c, lx, -17, kneeY + 1, lw + 1.2, pants);
      limb(c, lx, kneeY, lx, footY, lw - 0.5, skin);
      line(c, lx - lw / 2 - 0.4, kneeY + 0.6, lx + lw / 2 + 0.4, kneeY + 0.6, shade(pants, -0.3), 1);
    } else {
      const col = L.bottom === 'sweats' ? pants : pants;
      legShape(c, lx, -17, footY + 0.5, lw + (L.bottom === 'cargo' || L.bottom === 'sweats' ? 0.8 : 0), col);
      // details
      if (L.bottom === 'jeans') {
        line(c, lx + s * -1.2, -16, lx + s * -1, footY, shade(pants, 0.25, 0.6), 0.5);
        fillRR(c, lx - lw / 2, footY - 1.4, lw, 1.4, 0.5, shade(pants, 0.2), null);
      } else if (L.bottom === 'slacks') {
        line(c, lx, -15, lx, footY, shade(pants, -0.25, 0.7), 0.6);
      } else if (L.bottom === 'cargo') {
        fillRR(c, lx + s * (lw / 2 - 0.4) - 1.2, -12.5, 2.4, 3.4, 0.5, shade(pants, -0.12), shade(pants, -0.35), 0.5);
      } else if (L.bottom === 'sweats') {
        line(c, lx + s * (lw / 2 + 0.2), -16, lx + s * (lw / 2 + 0.2), footY, shade(pants, 0.45), 0.8);
        fillRR(c, lx - lw / 2 - 0.2, footY - 1.2, lw + 0.4, 1.4, 0.6, shade(pants, -0.2), null);
      }
    }
    drawShoe(c, L, lx, footY, false);
  }
}

function legShape(c, x, y0, y1, w, col) {
  c.beginPath();
  c.moveTo(x - w / 2, y0);
  c.lineTo(x + w / 2, y0);
  c.lineTo(x + w * 0.42, y1);
  c.lineTo(x - w * 0.42, y1);
  c.closePath();
  c.fillStyle = hgradFill(c, x - w / 2, x + w / 2, col, 0.14, -0.22);
  c.fill();
  c.strokeStyle = OUT;
  c.lineWidth = 0.8;
  c.stroke();
}

function drawShoe(c, L, x, y, side) {
  const col = L.shoes;
  const st = L.shoeStyle;
  if (st === 'sandals') {
    fillRR(c, x - 3.2, y - 0.6, 6.4, 3.2, 1.4, shade(L.skin, -0.05), OUT, 0.7);
    fillRR(c, x - 3.2, y + 0.4, 6.4, 1.2, 0.6, col, null);
    fillRR(c, x - 3.4, y + 2.1, 6.8, 0.9, 0.4, '#2b2b2b', null);
    return;
  }
  if (st === 'boots') {
    fillRR(c, x - 3.1, y - 3.6, 6.2, 4.4, 1.2, shade(col, -0.05), OUT, 0.8);
    fillRR(c, x - 3.5, y - 0.2, 7, 3.6, 1.5, col, OUT, 0.8);
    fillRR(c, x - 3.6, y + 2.4, 7.2, 1.1, 0.5, '#1d1712', null);
    line(c, x - 1.2, y - 3, x + 1.2, y - 2, 'rgba(255,255,255,0.25)', 0.5);
    return;
  }
  if (st === 'dress') {
    fillRR(c, x - 3.2, y - 0.6, 6.4, 3.6, 1.8, col, OUT, 0.8);
    ellipse(c, x - 1, y + 0.4, 1.6, 0.7, 'rgba(255,255,255,0.35)');
    return;
  }
  // sneakers
  fillRR(c, x - 3.3, y - 0.7, 6.6, 3.7, 1.7, col, OUT, 0.8);
  fillRR(c, x - 3.4, y + 1.9, 6.8, 1.2, 0.6, lum(col) > 0.8 ? '#cfcfcf' : '#f2f2f2', null);
  line(c, x - 1.6, y + 0.3, x + 1.6, y + 0.3, lum(col) > 0.6 ? '#9aa3ab' : 'rgba(255,255,255,0.6)', 0.5);
  if (!side) circle(c, x + 1.8, y + 0.9, 0.5, lum(col) > 0.6 ? '#c62828' : '#ffffff');
}

function drawSkirt(c, L, B, sit) {
  const dress = L.top === 'dress';
  if (!dress && L.bottom !== 'skirt') return;
  const col = dress ? L.topColor : L.bottomColor;
  const hw = B.hip / 2;
  const bot = sit ? -8 : -8.5;
  c.beginPath();
  c.moveTo(-hw + 0.5, WAIST);
  c.lineTo(hw - 0.5, WAIST);
  c.lineTo(hw + 3.2, bot);
  c.quadraticCurveTo(0, bot + 1.6, -hw - 3.2, bot);
  c.closePath();
  c.fillStyle = hgradFill(c, -hw - 3, hw + 3, col);
  c.fill();
  c.strokeStyle = OUT;
  c.lineWidth = 0.8;
  c.stroke();
  for (const k of [-0.5, 0, 0.5]) line(c, k * hw, WAIST + 1, k * (hw + 3), bot, shade(col, -0.22, 0.6), 0.6);
  if (dress && L.pattern !== 'none') {
    c.save();
    c.clip();
    drawPattern(c, L, -hw - 4, WAIST, (hw + 4) * 2, bot - WAIST + 2, col);
    c.restore();
  }
}

function drawPattern(c, L, x, y, w, h, base) {
  const p = L.pattern;
  const a = L.top2;
  if (p === 'stripes') {
    for (let k = y; k < y + h; k += 3) {
      c.fillStyle = alpha(a, 0.85);
      c.fillRect(x, k, w, 1.2);
    }
  } else if (p === 'plaid') {
    for (let k = x; k < x + w; k += 3.2) {
      c.fillStyle = alpha(a, 0.4);
      c.fillRect(k, y, 1.1, h);
    }
    for (let k = y; k < y + h; k += 3.2) {
      c.fillStyle = shade(base, -0.3, 0.35);
      c.fillRect(x, k, w, 1.1);
    }
  } else if (p === 'floral') {
    const h0 = L._hash || 1;
    for (let k = 0; k < 14; k++) {
      const fx = x + ((h0 >>> (k % 16)) % 100) / 100 * w;
      const fy = y + (((h0 * (k + 3)) >>> 4) % 100) / 100 * h;
      for (let pt = 0; pt < 4; pt++) circle(c, fx + Math.cos(pt * 1.57) * 0.9, fy + Math.sin(pt * 1.57) * 0.9, 0.75, a);
      circle(c, fx, fy, 0.5, '#fff6a8');
    }
  }
}

function drawTorso(c, L, B, W, back) {
  const main = L.top === 'apron' ? L.top2 : L.topColor;
  const skin = L.skin;
  if (L.top === 'hoodie' && back) ellipse(c, 0, SHY + 1.5, 6, 4, shade(main, -0.15));
  // belt line / waistband
  if (L.top !== 'dress' && L.bottom !== 'skirt') {
    fillRR(c, -B.hip / 2 - 0.3, WAIST - 1, B.hip + 0.6, 4.5, 1.5, L.bottomColor, OUT, 0.8);
    if (L.bottom === 'jeans' || L.bottom === 'slacks' || L.bottom === 'cargo') {
      fillRR(c, -B.hip / 2, WAIST - 1, B.hip, 1.4, 0.4, '#2a1c12', null);
      if (!back) fillRR(c, -1, WAIST - 1.3, 2, 2, 0.4, '#c9a24a', null);
    }
  }
  torsoPath(c, B, W);
  c.fillStyle = hgradFill(c, -W / 2, W / 2, main);
  c.fill();
  c.strokeStyle = OUT;
  c.lineWidth = 0.9;
  c.stroke();
  c.save();
  torsoPath(c, B, W);
  c.clip();
  if (L.pattern !== 'none' && L.top !== 'apron' && L.top !== 'uniform') {
    if (L.pattern === 'logo' && !back) {
      circle(c, -W * 0.2, SHY + 4, 1.6, L.top2);
      circle(c, -W * 0.2, SHY + 4, 0.7, main);
    } else if (L.pattern === 'number') {
      const n = String(((L._hash || 7) % 45) + 1);
      c.font = `900 ${back ? 7 : 5}px Arial Black, sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = L.top2;
      c.fillText(n, back ? 0 : W * 0.15, SHY + (back ? 6 : 5));
    } else drawPattern(c, L, -W / 2, SHY - 1, W, 14, main);
  }
  // fold shading under the chest
  c.fillStyle = 'rgba(0,0,0,0.1)';
  c.beginPath();
  c.ellipse(0, WAIST - 1, W * 0.45, 2.2, 0, Math.PI, 0);
  c.fill();
  if (!back) {
    switch (L.top) {
      case 'tee':
        c.fillStyle = shade(main, -0.32);
        c.beginPath();
        c.arc(0, SHY - 0.5, 2.6, 0, Math.PI);
        c.fill();
        break;
      case 'tank': case 'jersey': {
        c.fillStyle = skin;
        const sw = L.top === 'jersey' ? 3.6 : 3;
        for (const s of [-1, 1]) {
          c.beginPath();
          c.moveTo(s * W / 2, SHY - 1);
          c.lineTo(s * (W / 2 - sw), SHY - 1);
          c.lineTo(s * (W / 2 - sw - 0.5), SHY + 5.5);
          c.lineTo(s * W / 2, SHY + 6.5);
          c.closePath();
          c.fill();
        }
        if (L.top === 'jersey') {
          c.fillStyle = L.top2;
          c.beginPath();
          c.moveTo(-2.6, SHY - 1);
          c.lineTo(0, SHY + 3);
          c.lineTo(2.6, SHY - 1);
          c.lineTo(1.6, SHY - 1);
          c.lineTo(0, SHY + 1.6);
          c.lineTo(-1.6, SHY - 1);
          c.closePath();
          c.fill();
          for (const s of [-1, 1]) c.fillRect(s > 0 ? W / 2 - sw - 1.2 : -W / 2 + sw + 0.2, SHY + 5, 1, 9);
          c.fillStyle = skin;
        } else {
          c.beginPath();
          c.arc(0, SHY - 1, 3, 0, Math.PI);
          c.fill();
        }
        break;
      }
      case 'polo':
        c.fillStyle = shade(main, 0.18);
        c.beginPath();
        c.moveTo(-3.4, SHY - 0.8);
        c.lineTo(-0.2, SHY + 1.6);
        c.lineTo(-1.2, SHY + 2.4);
        c.lineTo(-3.8, SHY + 0.6);
        c.closePath();
        c.fill();
        c.beginPath();
        c.moveTo(3.4, SHY - 0.8);
        c.lineTo(0.2, SHY + 1.6);
        c.lineTo(1.2, SHY + 2.4);
        c.lineTo(3.8, SHY + 0.6);
        c.closePath();
        c.fill();
        line(c, 0, SHY + 1.4, 0, SHY + 5, shade(main, -0.3), 0.6);
        circle(c, 0.6, SHY + 2.8, 0.35, '#f4f4f0');
        circle(c, 0.6, SHY + 4.2, 0.35, '#f4f4f0');
        break;
      case 'button':
        line(c, 0, SHY, 0, WAIST, shade(main, -0.25), 0.7);
        for (let k = 0; k < 4; k++) circle(c, 0.8, SHY + 2.6 + k * 2.8, 0.42, '#f4f0e6');
        c.fillStyle = shade(main, 0.2);
        c.beginPath();
        c.moveTo(-3.2, SHY - 0.6);
        c.lineTo(0, SHY + 2.2);
        c.lineTo(3.2, SHY - 0.6);
        c.lineTo(2.2, SHY + 0.9);
        c.lineTo(0, SHY + 1.2);
        c.lineTo(-2.2, SHY + 0.9);
        c.closePath();
        c.fill();
        fillRR(c, -W / 2 + 2.2, SHY + 3.5, 3, 2.6, 0.4, null, shade(main, -0.3), 0.5);
        break;
      case 'hoodie':
        line(c, -1.5, SHY + 0.5, -1.8, SHY + 5, '#eee', 0.7);
        line(c, 1.5, SHY + 0.5, 1.8, SHY + 5, '#eee', 0.7);
        circle(c, -1.8, SHY + 5.2, 0.4, '#ddd');
        circle(c, 1.8, SHY + 5.2, 0.4, '#ddd');
        fillRR(c, -W / 2 + 2.5, WAIST - 6, W - 5, 4.5, 1.5, shade(main, -0.12), shade(main, -0.3), 0.5);
        c.fillStyle = shade(main, -0.25);
        c.beginPath();
        c.arc(0, SHY - 0.5, 3.6, 0, Math.PI);
        c.fill();
        fillRR(c, -B.waist / 2, WAIST - 1.4, B.waist, 1.6, 0.6, shade(main, -0.18), null);
        break;
      case 'cardigan': case 'jacket':
        c.fillStyle = L.top2;
        c.beginPath();
        c.moveTo(-2.5, SHY - 0.6);
        c.lineTo(2.5, SHY - 0.6);
        c.lineTo(1.6, WAIST);
        c.lineTo(-1.6, WAIST);
        c.closePath();
        c.fill();
        for (let k = 0; k < 3; k++) circle(c, -2.3, SHY + 3 + k * 3.4, 0.6, shade(main, -0.4));
        break;
      case 'uniform':
        line(c, 0, SHY, 0, WAIST, shade(main, -0.35), 0.7);
        fillRR(c, -W / 2 + 2, SHY + 2.5, 3, 3.5, 0.8, '#e8c547', '#8a6a10', 0.4);
        fillRR(c, W / 2 - 5, SHY + 2.4, 3.4, 1.2, 0.3, '#e8e2d4', null);
        fillRR(c, -W / 2 + 1.4, SHY + 6.6, 3.6, 2.6, 0.4, null, shade(main, -0.4), 0.5);
        fillRR(c, W / 2 - 5, SHY + 6.6, 3.6, 2.6, 0.4, null, shade(main, -0.4), 0.5);
        c.fillStyle = '#e8c547';
        c.fillRect(-W / 2, SHY + 0.8, 1.6, 2.2);
        c.fillRect(W / 2 - 1.6, SHY + 0.8, 1.6, 2.2);
        break;
      case 'apron':
        c.fillStyle = L.topColor;
        c.beginPath();
        c.moveTo(-W / 2 + 2.2, SHY + 3);
        c.lineTo(W / 2 - 2.2, SHY + 3);
        c.lineTo(B.waist / 2 + 0.5, WAIST);
        c.lineTo(-B.waist / 2 - 0.5, WAIST);
        c.closePath();
        c.fill();
        line(c, -W / 2 + 2.5, SHY + 3, -2, SHY - 0.5, L.topColor, 1);
        line(c, W / 2 - 2.5, SHY + 3, 2, SHY - 0.5, L.topColor, 1);
        fillRR(c, -2.5, SHY + 7, 5, 3, 0.5, null, shade(L.topColor, -0.2), 0.5);
        break;
      case 'dress':
        c.fillStyle = skin;
        c.beginPath();
        c.moveTo(-W / 2, SHY - 1);
        c.lineTo(-2.6, SHY - 1);
        c.quadraticCurveTo(0, SHY + 4, 2.6, SHY - 1);
        c.lineTo(W / 2, SHY - 1);
        c.lineTo(W / 2, SHY + 1.5);
        c.quadraticCurveTo(0, SHY + 6, -W / 2, SHY + 1.5);
        c.closePath();
        c.fill();
        line(c, -W / 2 + 2.5, SHY + 1.5, -W / 2 + 2.5, SHY - 1, L.topColor, 1);
        line(c, W / 2 - 2.5, SHY + 1.5, W / 2 - 2.5, SHY - 1, L.topColor, 1);
        break;
      default:
        break;
    }
  } else if (L.top === 'apron') {
    line(c, -W / 2 + 2, SHY, W / 2 - 3, WAIST, L.topColor, 1.2);
    line(c, W / 2 - 2, SHY, -W / 2 + 3, WAIST, L.topColor, 1.2);
    fillRR(c, -2, WAIST - 1.5, 4, 2.5, 0.8, L.topColor, null);
  }
  // tattoo on the neck shows above the collar
  c.restore();
  if (L.top === 'apron' && !back) {
    fillRR(c, -B.waist / 2 - 1, WAIST - 0.5, B.waist + 2, 10, 1.5, L.topColor, OUT, 0.7);
    line(c, -B.waist / 2 - 1, WAIST, B.waist / 2 + 1, WAIST, shade(L.topColor, -0.2), 1);
  }
  if (L.top === 'uniform') {
    fillRR(c, -B.waist / 2 - 0.4, WAIST - 1.5, B.waist + 0.8, 2.4, 0.6, '#1a1a1a', null);
    if (!back) {
      fillRR(c, B.waist / 2 - 1.5, WAIST - 2, 2.6, 4, 0.6, '#2b2b2b', null);
      fillRR(c, -B.waist / 2 - 0.5, WAIST - 2.6, 2, 3, 0.4, '#333', null);
    }
  }
  drawOuter(c, L, B, W, back);
  if (L.chain && !back && L.outer === 'none') {
    c.beginPath();
    c.arc(0, SHY - 1, 3.6, 0.2, Math.PI - 0.2);
    c.strokeStyle = '#e6c04a';
    c.lineWidth = 0.9;
    c.stroke();
    circle(c, 0, SHY + 2.6, 0.8, '#f2d36b');
  }
}

function drawOuter(c, L, B, W, back) {
  const o = L.outer;
  if (o === 'none') return;
  const col = L.outerColor;
  const OW = W + 1.2;
  const path = () => {
    c.beginPath();
    c.moveTo(-OW / 2, SHY + 2.5);
    c.quadraticCurveTo(-OW / 2, SHY - 0.4, -OW / 2 + 3, SHY - 1);
    c.lineTo(OW / 2 - 3, SHY - 1);
    c.quadraticCurveTo(OW / 2, SHY - 0.4, OW / 2, SHY + 2.5);
    c.lineTo(B.waist / 2 + 1.2, WAIST + 0.6);
    c.lineTo(-B.waist / 2 - 1.2, WAIST + 0.6);
    c.closePath();
  };
  path();
  c.fillStyle = hgradFill(c, -OW / 2, OW / 2, col, o === 'leather' ? 0.3 : 0.12, -0.3);
  c.fill();
  c.strokeStyle = OUT;
  c.lineWidth = 0.9;
  c.stroke();
  if (!back) {
    // open front showing what's underneath
    c.fillStyle = L.top === 'dress' ? L.topColor : L.top === 'tank' ? L.skin : L.topColor;
    c.beginPath();
    c.moveTo(-2.4, SHY - 0.8);
    c.lineTo(2.4, SHY - 0.8);
    c.lineTo(1.4, WAIST + 0.4);
    c.lineTo(-1.4, WAIST + 0.4);
    c.closePath();
    c.fill();
    if (L.chain) {
      c.beginPath();
      c.arc(0, SHY - 1, 2.2, 0.3, Math.PI - 0.3);
      c.strokeStyle = '#e6c04a';
      c.lineWidth = 0.8;
      c.stroke();
    }
    // lapels / collar
    const lap = shade(col, o === 'leather' ? 0.25 : -0.12);
    for (const s of [-1, 1]) {
      c.fillStyle = lap;
      c.beginPath();
      c.moveTo(s * 2.4, SHY - 0.8);
      c.lineTo(s * 4.6, SHY - 1.2);
      c.lineTo(s * 2.2, SHY + 4.5);
      c.closePath();
      c.fill();
    }
    if (o === 'denim') {
      for (const s of [-1, 1]) {
        fillRR(c, s * (OW / 4) - 1.6, SHY + 3.5, 3.2, 2.4, 0.4, null, shade(col, 0.3, 0.8), 0.5);
        line(c, s * (OW / 2 - 0.5), SHY + 3, s * (B.waist / 2 + 1), WAIST, shade(col, 0.3, 0.7), 0.4);
      }
    }
    if (o === 'jacket') fillRR(c, -B.waist / 2 - 1.2, WAIST - 1.2, B.waist + 2.4, 1.8, 0.6, shade(col, -0.25), null);
    if (o === 'windbreaker') {
      c.save();
      path();
      c.clip();
      c.fillStyle = L.top2;
      c.fillRect(-OW / 2, SHY + 4, OW, 2.4);
      c.restore();
    }
    if (o === 'vest') {
      for (let k = 0; k < 4; k++) line(c, -OW / 2 + 1, SHY + 2.5 + k * 3, OW / 2 - 1, SHY + 2.5 + k * 3, shade(col, -0.22, 0.7), 0.5);
      c.fillStyle = L.topColor;
      c.beginPath();
      c.moveTo(-2.4, SHY - 0.8);
      c.lineTo(2.4, SHY - 0.8);
      c.lineTo(1.4, WAIST + 0.4);
      c.lineTo(-1.4, WAIST + 0.4);
      c.closePath();
      c.fill();
    }
    if (o === 'leather') line(c, -OW / 2 + 2, SHY + 2, -OW / 2 + 3, WAIST - 1, 'rgba(255,255,255,0.3)', 0.8);
  } else {
    if (o === 'jacket' || o === 'windbreaker') fillRR(c, -B.waist / 2 - 1.2, WAIST - 1.2, B.waist + 2.4, 1.8, 0.6, shade(col, -0.25), null);
    line(c, 0, SHY + 1, 0, WAIST, shade(col, -0.25, 0.5), 0.5);
  }
}

function drawArm(c, L, B, sh, hand, back, right, o) {
  const [up, low] = sleeves(L);
  const skin = L.skin;
  const ex = (sh.x + hand.x) / 2 + (hand.x < 0 ? -0.6 : 0.6);
  const ey = (sh.y + hand.y) / 2;
  const mx = (sh.x + ex) / 2;
  const my = (sh.y + ey) / 2;
  // upper arm: sleeve cap, then whatever is under it
  const shortSleeve = up !== skin && low === skin;
  if (shortSleeve) {
    limb(c, mx, my, ex, ey, B.arm - 0.2, skin);
    limb(c, sh.x, sh.y, mx + (mx - sh.x) * 0.1, my + (my - sh.y) * 0.1, B.arm + 0.4, up);
  } else limb(c, sh.x, sh.y, ex, ey, B.arm, up);
  limb(c, ex, ey, hand.x, hand.y, B.arm - 0.4, low);
  // cuffs on long sleeves
  if (low !== skin) {
    const fx = hand.x + (ex - hand.x) * 0.22;
    const fy = hand.y + (ey - hand.y) * 0.22;
    limb(c, fx, fy, hand.x + (ex - hand.x) * 0.08, hand.y + (ey - hand.y) * 0.08, B.arm - 0.2, shade(low, -0.2), false);
  }
  // ink on bare skin
  if (L.tattoo === 'arm' && !right && low === skin) {
    c.strokeStyle = 'rgba(30,40,60,0.7)';
    c.lineWidth = 0.6;
    for (let k = 0.2; k < 0.9; k += 0.22) {
      const tx = ex + (hand.x - ex) * k;
      const ty = ey + (hand.y - ey) * k;
      c.beginPath();
      c.moveTo(tx - 1, ty);
      c.lineTo(tx, ty - 0.8);
      c.lineTo(tx + 1, ty);
      c.lineTo(tx, ty + 0.8);
      c.closePath();
      c.stroke();
    }
  }
  if (L.watch && !right) {
    const wx = hand.x + (ex - hand.x) * 0.2;
    const wy = hand.y + (ey - hand.y) * 0.2;
    fillRR(c, wx - 1.6, wy - 0.7, 3.2, 1.4, 0.5, '#2b2b2b', null);
    circle(c, wx, wy, 0.7, '#e6c04a');
  }
  const big = o.strike > 0 && right && !back ? 1 + Math.sin(o.strike * Math.PI) * 0.6 : 1;
  circle(c, hand.x, hand.y, 2.3 * big, OUT);
  circle(c, hand.x, hand.y, 1.8 * big, skin);
  circle(c, hand.x + (right ? -1 : 1) * 1.2 * big, hand.y - 0.6 * big, 0.8 * big, shade(skin, 0.06));
}

function drawPack(c, L, W) {
  fillRR(c, -W / 2 + 1.5, SHY + 0.5, W - 3, 11, 2.5, L.packColor, OUT, 0.9);
  fillRR(c, -W / 2 + 3, SHY + 6, W - 6, 4.5, 1.5, shade(L.packColor, -0.15), null);
  line(c, -W / 2 + 3, SHY + 3, W / 2 - 3, SHY + 3, shade(L.packColor, 0.25), 0.6);
}

function drawPackStraps(c, L, W) {
  for (const s of [-1, 1]) line(c, s * (W / 2 - 2.5), SHY - 0.5, s * (W / 2 - 3.2), SHY + 8, shade(L.packColor, -0.2), 1.3);
}

// ---------------------------------------------------------------- side
function drawSide(c, L, o) {
  const B = BUILD[L.build] || BUILD.avg;
  const pose = o.pose || 'stand';
  const sit = pose === 'sit';
  const ph = o.phase || 0;
  const mv = o.moving ? 1 : 0;
  const t = o.t || 0;
  const swing = pose === 'dance' ? Math.sin(t * 6) * 0.6 : Math.sin(ph) * mv;
  const dy = sit ? 7 : 0;
  const bob = mv ? Math.abs(Math.sin(ph)) * -1 : 0;
  c.save();
  c.translate(0, dy + bob);
  if (mv) c.rotate(0.04); // lean into the walk
  const D = B.w * 0.62;
  const pants = L.bottomColor;
  const skin = L.skin;
  const [upC, lowC] = sleeves(L);
  const topMain = L.top === 'apron' ? L.top2 : L.topColor;
  const bare = L.top === 'dress' || L.bottom === 'skirt';

  drawHairBack(c, L, 'side');
  if (L.backpack) fillRR(c, -D / 2 - 3.5, SHY + 1, 4, 10, 1.5, L.packColor, OUT, 0.8);

  // far arm
  const farHand = { x: -swing * 4.5, y: -16 };
  if (!o.guard && !(o.strike > 0)) limb(c, 0, SHY + 2, farHand.x * 0.9, farHand.y, B.arm - 0.4, shade(upC, -0.25), false);

  // legs
  if (sit) {
    limb(c, -1, -12, 7, -12, B.leg + 1, bare ? (L.top === 'dress' ? L.topColor : pants) : pants);
    limb(c, 7.5, -12, 7.5, -2, B.leg, L.bottom === 'shorts' || bare ? skin : pants);
    drawShoe(c, L, 8.5, -2.5, true);
  } else {
    for (const s of [-1, 1]) {
      const sw = s * swing;
      const fx = sw * 5.5;
      const kx = sw * 3 + (sw > 0 ? 1 : 0);
      const col = s < 0 ? shade(pants, -0.18) : pants;
      const skinC = s < 0 ? shade(skin, -0.18) : skin;
      if (L.bottom === 'shorts' && !bare) {
        limb(c, 0, -16, kx, -9, B.leg + 0.6, col);
        limb(c, kx, -9, fx, -2.5, B.leg - 0.4, skinC);
      } else if (bare) {
        limb(c, kx * 0.6, -9, fx, -2.5, B.leg - 0.6, skinC);
      } else {
        limb(c, 0, -16, kx, -9, B.leg, col);
        limb(c, kx, -9, fx, -2.5, B.leg, col);
      }
      c.save();
      c.translate(fx + 1.2, 0);
      if (s < 0) c.globalAlpha = 0.85;
      drawShoe(c, L, 0, -3, true);
      c.restore();
    }
  }
  // skirt / torso
  if (bare) {
    const col = L.top === 'dress' ? L.topColor : L.bottomColor;
    c.beginPath();
    c.moveTo(-D / 2, -19);
    c.lineTo(D / 2, -19);
    c.lineTo(D / 2 + 3, -9);
    c.lineTo(-D / 2 - 2, -9);
    c.closePath();
    c.fillStyle = col;
    c.fill();
    c.strokeStyle = OUT;
    c.lineWidth = 0.8;
    c.stroke();
  } else fillRR(c, -D / 2, -19.5, D, 5, 1.5, pants, OUT, 0.8);
  if (L.top === 'hoodie') ellipse(c, -D / 2 + 0.5, SHY + 1, 2.5, 3.5, shade(topMain, -0.15));
  fillRR(c, -D / 2, SHY - 0.8, D, 12.6, 3, topMain, OUT, 0.9);
  if (L.pattern === 'stripes' || L.pattern === 'plaid' || L.pattern === 'floral') {
    c.save();
    rrect(c, -D / 2, SHY - 0.8, D, 12.6, 3);
    c.clip();
    drawPattern(c, L, -D / 2, SHY - 1, D, 13, topMain);
    c.restore();
  }
  c.fillStyle = 'rgba(0,0,0,0.15)';
  c.fillRect(-D / 2 + 0.5, SHY + 6, D - 1, 5);
  if (L.outer !== 'none') {
    fillRR(c, -D / 2 - 0.6, SHY - 1, D + 1.2, 13, 3, L.outerColor, OUT, 0.9);
    line(c, D / 2 - 1, SHY, D / 2 - 0.4, WAIST, shade(L.outerColor, -0.25), 0.6);
  }
  if (L.top === 'apron') {
    fillRR(c, D / 2 - 2, SHY + 3, 2.5, 18, 1, L.topColor, null);
    line(c, D / 2 - 1, SHY + 3, 0, SHY - 0.5, L.topColor, 1);
  }
  if (L.top === 'uniform') fillRR(c, -D / 2, -20, D, 2.2, 0.6, '#1a1a1a', null);
  if (L.top === 'tank' || L.top === 'jersey') fillRR(c, -D / 2 + 1.5, SHY - 1, D - 3, 3, 1, skin, null);

  // near arm
  let hand = { x: swing * 5, y: -15.5 };
  if (sit) hand = { x: 5, y: -16 };
  if (o.guard) hand = { x: 6, y: -32 };
  if (pose === 'work') hand = { x: 6 + Math.sin(t * 5) * 2, y: -22 };
  if (pose === 'dance') hand = { x: 3, y: Math.sin(t * 6) > 0 ? -42 : -30 };
  if (o.eating && Math.sin(t * 1.3) > 0.6) hand = { x: 4, y: -33 };
  if (o.strike > 0) {
    const k = Math.sin(o.strike * Math.PI);
    hand = { x: 6 + k * 9, y: -27 };
  }
  const ex = hand.x / 2 - 0.5;
  const ey = (SHY + 2 + hand.y) / 2 + 1;
  limb(c, 0, SHY + 2, ex, ey, B.arm, upC);
  limb(c, ex, ey, hand.x, hand.y, B.arm - 0.4, lowC);
  if (L.watch) {
    const wx = hand.x + (ex - hand.x) * 0.2;
    const wy = hand.y + (ey - hand.y) * 0.2;
    fillRR(c, wx - 1.4, wy - 0.7, 2.8, 1.4, 0.5, '#2b2b2b', null);
  }
  circle(c, hand.x, hand.y, 2.3, OUT);
  circle(c, hand.x, hand.y, 1.8, skin);
  if (o.strike > 0.3) {
    line(c, hand.x - 9, hand.y - 2, hand.x - 3, hand.y - 2, 'rgba(255,255,255,0.6)', 1);
    line(c, hand.x - 8, hand.y + 2, hand.x - 3, hand.y + 2, 'rgba(255,255,255,0.4)', 1);
  }
  if (o.held) {
    c.save();
    c.translate(hand.x + 2, hand.y + 1);
    drawHeld(c, o.held);
    c.restore();
  }
  drawHead(c, L, o, 'side');
  c.restore();
}

// ---------------------------------------------------------------- head
function headShape(L) {
  switch (L.face) {
    case 'round': return { rx: 7.0, ry: 6.9, jaw: 0 };
    case 'square': return { rx: 6.8, ry: 7.0, jaw: 1 };
    case 'long': return { rx: 6.1, ry: 7.7, jaw: 0 };
    default: return { rx: 6.5, ry: 7.1, jaw: 0 };
  }
}

function headPath(c, S, view) {
  c.beginPath();
  if (S.jaw && view !== 'back') {
    rrect(c, -S.rx, HY - S.ry, S.rx * 2, S.ry * 2, S.rx * 0.75);
  } else c.ellipse(0, HY, S.rx, S.ry, 0, 0, Math.PI * 2);
}

function drawHead(c, L, o, view) {
  const S = headShape(L);
  const skin = L.skin;
  // neck with a shadow under the jaw
  fillRR(c, -2.1, HY + 4, 4.2, 4.5, 1, shade(skin, -0.12), null);
  c.fillStyle = 'rgba(0,0,0,0.18)';
  c.fillRect(-2.1, HY + 4.5, 4.2, 1.6);
  if (L.tattoo === 'neck' && view !== 'back') {
    c.strokeStyle = 'rgba(30,40,60,0.7)';
    c.lineWidth = 0.5;
    c.beginPath();
    c.arc(view === 'side' ? -0.5 : 1.2, HY + 6.2, 1.2, 0, Math.PI * 2);
    c.stroke();
  }
  drawHairBack(c, L, view, true);
  // ears
  if (view === 'front' || view === 'back') {
    for (const s of [-1, 1]) {
      circle(c, s * S.rx, HY + 0.6, 1.55, OUT);
      circle(c, s * S.rx, HY + 0.6, 1.3, shade(skin, s > 0 ? -0.12 : -0.04));
      if (view === 'front') circle(c, s * (S.rx - 0.2), HY + 0.6, 0.6, shade(skin, -0.25));
      if (L.earrings) {
        if (L.earrings === 'hoops') {
          c.beginPath();
          c.arc(s * S.rx, HY + 2.9, 1.1, 0, Math.PI * 2);
          c.strokeStyle = '#e6c04a';
          c.lineWidth = 0.55;
          c.stroke();
        } else circle(c, s * S.rx, HY + 1.9, 0.5, '#f2e6a8');
      }
    }
  }
  // skull and skin shading
  headPath(c, { rx: S.rx + 0.7, ry: S.ry + 0.7, jaw: S.jaw }, view);
  c.fillStyle = OUT;
  c.fill();
  headPath(c, S, view);
  const g = c.createRadialGradient(-S.rx * 0.35, HY - S.ry * 0.35, 1, 0, HY, S.ry * 1.25);
  g.addColorStop(0, shade(skin, 0.12));
  g.addColorStop(0.6, skin);
  g.addColorStop(1, shade(skin, -0.2));
  c.fillStyle = g;
  c.fill();

  if (view === 'front') drawFace(c, L, o, S);
  else if (view === 'side') drawProfile(c, L, o, S);
  drawHair(c, L, view, S);
  drawHat(c, L, view, S);
  if (L.glasses && view !== 'back') drawGlasses(c, L, view);
  if (view === 'side' && L.earrings) {
    if (L.earrings === 'hoops') {
      c.beginPath();
      c.arc(-0.8, HY + 2.9, 1.1, 0, Math.PI * 2);
      c.strokeStyle = '#e6c04a';
      c.lineWidth = 0.55;
      c.stroke();
    } else circle(c, -0.8, HY + 2, 0.5, '#f2e6a8');
  }
}

function drawFace(c, L, o, S) {
  const skin = L.skin;
  const hy = HY;
  const closed = o.sleeping || o.blink;
  const older = L.age === 'older';
  // cheeks
  if (L.age === 'young' || L.makeup !== 'none') {
    ellipse(c, -3.6, hy + 2.6, 1.6, 0.9, 'rgba(230,100,100,0.14)');
    ellipse(c, 3.6, hy + 2.6, 1.6, 0.9, 'rgba(230,100,100,0.14)');
  }
  // eyes
  const shapes = { round: [1.35, 1.1], narrow: [1.5, 0.72], wide: [1.6, 1.25], sleepy: [1.45, 0.95] };
  const [ew, eh] = shapes[L.eyes] || shapes.round;
  for (const s of [-1, 1]) {
    const ex = s * 2.45;
    const ey = hy + 0.3;
    if (closed) {
      c.strokeStyle = 'rgba(30,15,10,0.85)';
      c.lineWidth = 0.75;
      c.beginPath();
      c.moveTo(ex - ew, ey);
      c.quadraticCurveTo(ex, ey + 0.8, ex + ew, ey);
      c.stroke();
      continue;
    }
    ellipse(c, ex, ey, ew + 0.3, eh + 0.3, 'rgba(40,20,15,0.55)');
    ellipse(c, ex, ey, ew, eh, '#f7f3ec');
    circle(c, ex + s * 0.1, ey + 0.05, Math.min(eh, 0.85), L.eyeColor);
    circle(c, ex + s * 0.1, ey + 0.05, Math.min(eh, 0.85) * 0.45, '#0d0806');
    circle(c, ex - 0.3, ey - 0.35, 0.28, 'rgba(255,255,255,0.9)');
    if (L.eyes === 'sleepy') {
      c.fillStyle = shade(skin, -0.06);
      c.beginPath();
      c.ellipse(ex, ey - eh * 0.45, ew + 0.2, eh * 0.6, 0, Math.PI, 0);
      c.fill();
    }
    // lid line + eyeliner
    const liner = L.makeup === 'eyeliner' || L.makeup === 'both';
    c.strokeStyle = liner ? '#120a08' : 'rgba(40,20,15,0.7)';
    c.lineWidth = liner ? 0.75 : 0.45;
    c.beginPath();
    c.ellipse(ex, ey, ew + 0.05, eh + 0.05, 0, Math.PI * 1.05, Math.PI * 1.95);
    c.stroke();
    if (liner) {
      c.beginPath();
      c.moveTo(ex + s * ew, ey - 0.2);
      c.lineTo(ex + s * (ew + 0.9), ey - 0.9);
      c.stroke();
    }
    if (older) line(c, ex + s * (ew + 0.4), ey + 0.2, ex + s * (ew + 1.2), ey + 0.6, shade(skin, -0.22, 0.8), 0.4);
  }
  // brows
  const bc = older ? shade(L.hairColor, 0.35, 0.9) : shade(L.hairColor, 0.05, 0.92);
  const bw = { thick: 1.3, thin: 0.55 }[L.brows] || 0.9;
  for (const s of [-1, 1]) {
    c.strokeStyle = bc;
    c.lineWidth = bw;
    c.lineCap = 'round';
    c.beginPath();
    if (L.brows === 'arched') {
      c.moveTo(s * 1.3, hy - 2.1);
      c.quadraticCurveTo(s * 2.6, hy - 3.4, s * 3.8, hy - 2.2);
    } else {
      c.moveTo(s * 1.3, hy - 2.5);
      c.lineTo(s * 3.7, hy - 2.25);
    }
    c.stroke();
    if (L.scar === 'brow' && s > 0) {
      c.strokeStyle = skin;
      c.lineWidth = 0.6;
      c.beginPath();
      c.moveTo(s * 2.5, hy - 3.2);
      c.lineTo(s * 2.9, hy - 1.6);
      c.stroke();
    }
  }
  // nose
  const nc = shade(skin, -0.28);
  if (L.nose === 'wide') {
    ellipse(c, 0, hy + 2.4, 1.6, 0.8, alpha(nc, 0.7));
    circle(c, -0.9, hy + 2.6, 0.35, shade(skin, -0.45));
    circle(c, 0.9, hy + 2.6, 0.35, shade(skin, -0.45));
  } else if (L.nose === 'long') {
    line(c, 0.4, hy - 0.4, 0.8, hy + 2.3, alpha(nc, 0.6), 0.6);
    ellipse(c, 0.4, hy + 2.6, 1, 0.6, alpha(nc, 0.8));
  } else if (L.nose === 'button') {
    circle(c, 0.3, hy + 2.2, 0.85, alpha(nc, 0.55));
    circle(c, 0.1, hy + 1.9, 0.35, 'rgba(255,255,255,0.25)');
  } else ellipse(c, 0.5, hy + 2.3, 0.9, 0.6, alpha(nc, 0.75));
  // freckles, scars, tears
  if (L.freckles) {
    for (const [fx, fy] of [[-3.2, 1.8], [-2.4, 2.4], [-3.8, 2.6], [3.2, 1.8], [2.4, 2.4], [3.8, 2.6], [-1.2, 1.6], [1.2, 1.6]]) circle(c, fx, hy + fy, 0.28, shade(skin, -0.32, 0.8));
  }
  if (L.scar === 'cheek') line(c, 2.6, hy + 1.5, 4.3, hy + 3.6, shade(skin, 0.25), 0.55);
  if (L.tattoo === 'tear') {
    c.fillStyle = 'rgba(30,40,60,0.85)';
    c.beginPath();
    c.moveTo(2.7, hy + 1.6);
    c.quadraticCurveTo(3.3, hy + 2.6, 2.7, hy + 2.9);
    c.quadraticCurveTo(2.1, hy + 2.6, 2.7, hy + 1.6);
    c.fill();
  }
  if (older) {
    line(c, -2.5, hy - 4.4, 2.5, hy - 4.4, shade(skin, -0.2, 0.6), 0.4);
    line(c, -2.2, hy + 3.4, -2.8, hy + 4.6, shade(skin, -0.2, 0.6), 0.4);
    line(c, 2.2, hy + 3.4, 2.8, hy + 4.6, shade(skin, -0.2, 0.6), 0.4);
  }
  // mouth
  const my = hy + 4.3;
  const lip = L.makeup === 'lipstick' || L.makeup === 'both' ? L.lipColor : null;
  if (o.hurt > 0) ellipse(c, 0, my + 0.2, 1.3, 1, '#4a1a12');
  else {
    c.lineCap = 'round';
    c.strokeStyle = lip || 'rgba(80,30,25,0.75)';
    c.lineWidth = lip ? 1.1 : 0.75;
    c.beginPath();
    if (L.mouth === 'smile' || o.happy) {
      c.moveTo(-1.8, my - 0.3);
      c.quadraticCurveTo(0, my + 1.3, 1.8, my - 0.3);
    } else if (L.mouth === 'smirk') {
      c.moveTo(-1.6, my + 0.2);
      c.quadraticCurveTo(0.4, my + 0.4, 1.9, my - 0.6);
    } else if (L.mouth === 'frown') {
      c.moveTo(-1.6, my + 0.5);
      c.quadraticCurveTo(0, my - 0.4, 1.6, my + 0.5);
    } else {
      c.moveTo(-1.5, my);
      c.lineTo(1.5, my);
    }
    c.stroke();
    if (lip) ellipse(c, 0, my + 0.7, 1.2, 0.45, alpha(lip, 0.8));
  }
  drawBeard(c, L, 'front', S);
}

function drawBeard(c, L, view, S) {
  const b = L.beard;
  if (!b || b === 'none') return;
  const col = L.beardColor;
  const hy = HY;
  if (view === 'side') {
    if (b === 'goatee') fillRR(c, 3.4, hy + 4.3, 2.6, 3, 1.2, col, null);
    else if (b === 'full') fillRR(c, -1, hy + 1.5, 7, 6, 3, col, null);
    else if (b === 'stubble' || b === 'chinstrap') fillRR(c, -0.5, hy + 2, 6.5, 4, 2, alpha(col, b === 'stubble' ? 0.3 : 0.75), null);
    else if (b === 'mustache') fillRR(c, 3.6, hy + 3.2, 2.4, 1.1, 0.5, col, null);
    return;
  }
  if (b === 'stubble') {
    c.save();
    c.beginPath();
    c.ellipse(0, hy + 3.4, S.rx - 0.8, 3.6, 0, 0, Math.PI);
    c.fillStyle = alpha(col, 0.28);
    c.fill();
    c.restore();
    for (let k = 0; k < 18; k++) circle(c, -4 + ((k * 7) % 80) / 10, hy + 4 + ((k * 13) % 25) / 10, 0.18, alpha(col, 0.6));
  } else if (b === 'goatee') {
    fillRR(c, -1.8, hy + 4.6, 3.6, 3.2, 1.4, col, null);
    line(c, -2.2, hy + 3.5, 2.2, hy + 3.5, col, 0.9);
  } else if (b === 'mustache') {
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(-2.3, hy + 3.9);
    c.quadraticCurveTo(0, hy + 2.8, 2.3, hy + 3.9);
    c.quadraticCurveTo(0, hy + 3.6, -2.3, hy + 3.9);
    c.fill();
  } else if (b === 'chinstrap') {
    c.strokeStyle = col;
    c.lineWidth = 1.2;
    c.beginPath();
    c.ellipse(0, hy + 1.2, S.rx - 0.6, S.ry - 0.6, 0, 0.15, Math.PI - 0.15);
    c.stroke();
  } else if (b === 'full') {
    c.beginPath();
    c.moveTo(-S.rx + 0.4, hy + 0.5);
    c.quadraticCurveTo(0, hy + 11, S.rx - 0.4, hy + 0.5);
    c.quadraticCurveTo(0, hy + 5, -S.rx + 0.4, hy + 0.5);
    c.fillStyle = col;
    c.fill();
    for (let k = 0; k < 6; k++) line(c, -3 + k * 1.2, hy + 5, -3.2 + k * 1.25, hy + 7.5, shade(col, 0.2, 0.5), 0.4);
    c.strokeStyle = shade(col, -0.2);
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(-2, hy + 3.9);
    c.quadraticCurveTo(0, hy + 3.1, 2, hy + 3.9);
    c.stroke();
  }
}

function drawProfile(c, L, o, S) {
  const skin = L.skin;
  const hy = HY;
  circle(c, -0.8, hy + 0.6, 1.5, shade(skin, -0.12));
  circle(c, -0.6, hy + 0.6, 0.6, shade(skin, -0.28));
  // nose
  const nl = { long: 2.2, wide: 1.8, button: 1.2, small: 1.5 }[L.nose] || 1.5;
  c.fillStyle = skin;
  c.beginPath();
  c.moveTo(S.rx - 0.6, hy - 0.6);
  c.lineTo(S.rx + nl, hy + 1.9);
  c.lineTo(S.rx - 0.4, hy + 2.5);
  c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(40,20,15,0.35)';
  c.lineWidth = 0.4;
  c.stroke();
  if (o.sleeping || o.blink) line(c, 2.4, hy + 0.2, 4.2, hy + 0.2, 'rgba(30,15,10,0.8)', 0.8);
  else {
    ellipse(c, 3.5, hy + 0.1, 0.95, 1.1, '#f7f3ec');
    circle(c, 3.9, hy + 0.15, 0.7, L.eyeColor);
    circle(c, 4.0, hy + 0.15, 0.32, '#0d0806');
    if (L.makeup === 'eyeliner' || L.makeup === 'both') line(c, 2.6, hy - 0.8, 4.8, hy - 1.2, '#120a08', 0.6);
  }
  line(c, 2.2, hy - 2.3, 4.6, hy - 2.4, shade(L.hairColor, 0.05, 0.9), { thick: 1.3, thin: 0.55 }[L.brows] || 0.9);
  const lip = L.makeup === 'lipstick' || L.makeup === 'both' ? L.lipColor : null;
  line(c, 3.4, hy + 4.2, 5.4, hy + (L.mouth === 'smile' ? 3.6 : 4.0), lip || 'rgba(70,25,20,0.7)', lip ? 1 : 0.8);
  if (L.freckles) for (const fx of [3, 3.8, 4.5]) circle(c, fx, hy + 2.4, 0.28, shade(skin, -0.3, 0.8));
  if (L.tattoo === 'tear') circle(c, 3.5, hy + 2.2, 0.45, 'rgba(30,40,60,0.85)');
  drawBeard(c, L, 'side', S);
}

// ---------------------------------------------------------------- hair
const HAIR = {
  bald: null,
  buzz: { cap: 0.42, alpha: 0.72 },
  fade: { cap: 0.62, vol: 1.4, fade: true, tex: 'kink' },
  short: { cap: 0.72, vol: 0.9, fringe: true },
  slick: { cap: 0.68, vol: 1.1, shine: true },
  undercut: { cap: 0.66, vol: 2.4, shaved: true, swoop: true },
  mohawk: { cap: 0.1, shaved: true, crest: 5 },
  curly: { cap: 0.78, vol: 2.6, tex: 'curl', sides: 3.5 },
  afro: { cap: 0.72, puff: 4.2, tex: 'kink' },
  cornrows: { cap: 0.8, rows: 5 },
  braids: { cap: 0.82, rows: 5, long: 14, strands: 'braid' },
  locs: { cap: 0.82, vol: 1.2, long: 12, strands: 'loc' },
  bun: { cap: 0.8, bun: true },
  ponytail: { cap: 0.8, tail: true },
  pigtails: { cap: 0.8, pigtails: true },
  bob: { cap: 0.86, long: 7, fringe: true },
  long: { cap: 0.86, long: 14, part: true },
};

function hairTone(L, k = 0) {
  return k ? shade(L.hairColor, k) : L.hairColor;
}

// Everything that sits behind the head (or the shoulders).
function drawHairBack(c, L, view, atHead = false) {
  const H = HAIR[L.hair];
  if (!H) return;
  const hair = L.hairColor;
  const R = 6.6;
  const hy = HY;
  if (view === 'front' && !atHead) {
    // long hair down the back, visible past the shoulders
    if (H.long && !(L.hat && H.long < 10)) {
      fillRR(c, -R - 1.2, hy - 3, R * 2 + 2.4, H.long + 2, 4, shade(hair, -0.12), null);
      if (H.strands) for (let k = -R; k <= R; k += 2.2) fillRR(c, k - 0.8, hy + 2, 1.6, H.long - 2, 0.8, shade(hair, H.strands === 'loc' ? -0.05 : 0.08), null);
    }
    if (H.pigtails) for (const s of [-1, 1]) fillRR(c, s * (R + 1.5) - 1.8, hy - 1, 3.6, 10, 1.8, hair, OUT, 0.6);
    return;
  }
  if (!atHead) return;
  if (view === 'front') {
    if (H.puff) {
      const g = c.createRadialGradient(-2, hy - 4, 1, 0, hy - 2, R + H.puff);
      g.addColorStop(0, shade(hair, 0.15));
      g.addColorStop(1, shade(hair, -0.15));
      circle(c, 0, hy - 2, R + H.puff + 0.6, OUT);
      circle(c, 0, hy - 2, R + H.puff, g);
    }
    if (H.bun) {
      circle(c, 0, hy - R - 2, 3.6, OUT);
      circle(c, 0, hy - R - 2, 3.2, hair);
      circle(c, -1, hy - R - 2.8, 1.2, shade(hair, 0.2, 0.6));
    }
  } else if (view === 'back') {
    if (H.puff) circle(c, 0, hy - 2, R + H.puff, hair);
    if (H.long) {
      fillRR(c, -R - 0.8, hy - 3, R * 2 + 1.6, H.long + 3, 4, hair, OUT, 0.6);
      if (H.strands) for (let k = -R; k <= R; k += 2.2) fillRR(c, k - 0.8, hy, 1.6, H.long, 0.8, shade(hair, 0.1), null);
    }
  } else if (view === 'side') {
    if (H.puff) circle(c, -1, hy - 2, R + H.puff - 0.4, hair);
    if (H.long) fillRR(c, -R - 0.8, hy - 2, R + 2, H.long + 1, 4, shade(hair, -0.1), null);
    if (H.tail) fillRR(c, -R - 2.5, hy - 1, 3.2, 10, 1.6, hair, OUT, 0.6);
    if (H.bun) circle(c, -R + 0.5, hy - 5, 3, hair);
    if (H.pigtails) fillRR(c, -R - 1, hy, 3.4, 9, 1.6, hair, OUT, 0.6);
  }
}

function drawHair(c, L, view, S) {
  const H = HAIR[L.hair];
  const R = S.rx;
  const hy = HY;
  const hair = L.hairColor;
  const hatOn = !!L.hat;
  if (!H) {
    if (!hatOn && view !== 'back') ellipse(c, -2, hy - 4.5, 2, 1.1, 'rgba(255,255,255,0.22)');
    return;
  }
  const clipHead = () => {
    c.beginPath();
    c.ellipse(0, hy, R + 0.6, S.ry + 0.8, 0, 0, Math.PI * 2);
    c.clip();
  };
  if (view === 'back') {
    c.save();
    clipHead();
    if (H.shaved || H.fade) {
      c.fillStyle = alpha(hair, 0.35);
      c.fillRect(-R - 2, hy - S.ry - 2, R * 2 + 4, S.ry * 2 + 4);
      c.fillStyle = hair;
      c.fillRect(-R * (H.crest ? 0.18 : 0.6), hy - S.ry - 2, R * (H.crest ? 0.36 : 1.2), S.ry * 1.2);
    } else {
      c.fillStyle = H.alpha ? alpha(hair, H.alpha) : hair;
      c.fillRect(-R - 2, hy - S.ry - 2, R * 2 + 4, S.ry * 2 + 2.5);
      if (H.rows) for (let k = -R; k < R; k += R / H.rows * 2) line(c, k, hy - S.ry, k + 0.5, hy + S.ry * 0.6, shade(hair, 0.25, 0.7), 0.6);
      if (H.tex === 'curl' || H.tex === 'kink') for (let k = 0; k < 16; k++) circle(c, -R + ((k * 37) % 100) / 100 * R * 2, hy - S.ry + ((k * 53) % 100) / 100 * S.ry * 1.6, H.tex === 'curl' ? 1 : 0.6, shade(hair, 0.18, 0.6));
    }
    c.restore();
    if (H.crest && !hatOn) fillRR(c, -1.4, hy - S.ry - H.crest, 2.8, H.crest + 3, 1.2, hair, OUT, 0.6);
    if (H.bun && !hatOn) {
      circle(c, 0, hy - R - 1.8, 3.4, OUT);
      circle(c, 0, hy - R - 1.8, 3, hair);
    }
    if (H.tail) fillRR(c, -1.6, hy + 2, 3.2, 10, 1.6, hair, OUT, 0.6);
    if (H.pigtails) for (const s of [-1, 1]) fillRR(c, s * (R + 0.8) - 1.6, hy - 1, 3.2, 9, 1.6, hair, OUT, 0.6);
    return;
  }
  if (hatOn && L.hat !== 'cowboy' && L.hat !== 'bucket') {
    // only the bits that poke out under a cap or beanie
    if (view === 'front' && !H.shaved) {
      fillRR(c, -R - 0.4, hy - 2.6, 2, H.long ? 9 : 4, 1, hair, null);
      fillRR(c, R - 1.6, hy - 2.6, 2, H.long ? 9 : 4, 1, hair, null);
    }
    return;
  }
  if (view === 'side') {
    c.save();
    clipHead();
    c.fillStyle = H.alpha ? alpha(hair, H.alpha) : hair;
    const top = R * (H.cap + 0.25);
    c.fillRect(-R - 2, hy - S.ry - 2, R * 2 + 4, top);
    // back of the head: a curved hairline behind the ear
    if (H.shaved || H.fade) c.fillStyle = alpha(hair, H.fade ? 0.45 : 0.3);
    c.beginPath();
    c.ellipse(-R * 0.55, hy - S.ry * 0.25, R * 0.95, S.ry * (H.long ? 1.4 : 1.02), 0, 0, Math.PI * 2);
    c.fill();
    if (H.rows) for (let k = -3; k < 6; k += 1.6) line(c, -R, hy - S.ry + 3 + k * 0.6, R, hy - S.ry + 1 + k * 0.6, shade(hair, 0.25, 0.7), 0.5);
    c.restore();
    if (H.vol) ellipse(c, -0.5, hy - S.ry + 0.8, R * 0.85, 1.2 + H.vol * 0.6, hair);
    if (H.crest) fillRR(c, -R + 1, hy - S.ry - H.crest, R * 1.5, H.crest + 2, 2, hair, OUT, 0.6);
    if (H.tex === 'curl') for (let k = 0; k < 7; k++) circle(c, -2 + Math.cos(k * 0.9) * 4, hy - 4 + Math.sin(k * 0.9) * 2.5, 2.4, hair);
    if (H.shine) line(c, -R + 1.5, hy - S.ry + 1.5, R - 2, hy - S.ry + 0.8, shade(hair, 0.35, 0.6), 0.9);
    hairHighlight(c, L, view, S, H);
    return;
  }
  // ---- front
  c.save();
  clipHead();
  const capY = hy - S.ry - 2;
  const capH = S.ry * H.cap * 0.72 + 2;
  if (H.shaved || H.fade) {
    // shaved or faded sides: stubble at the temples, hair kept on top
    const sideA = H.fade ? 0.5 : 0.28;
    for (const sx of [-1, 1]) {
      const g = c.createLinearGradient(0, capY + 2, 0, hy + 1.5);
      g.addColorStop(0, alpha(hair, sideA));
      g.addColorStop(1, alpha(hair, H.fade ? 0.08 : sideA * 0.6));
      c.fillStyle = g;
      c.fillRect(sx < 0 ? -R - 2 : R - 2.4, capY, 4.4, hy + 1.5 - capY);
    }
    c.fillStyle = alpha(hair, sideA);
    c.fillRect(-R - 2, capY, R * 2 + 4, capH - 0.6);
    c.fillStyle = hair;
    if (!H.crest) {
      c.beginPath();
      c.ellipse(0, capY + capH * 0.35, R * (H.fade ? 0.9 : 0.66), capH * 0.72, 0, 0, Math.PI * 2);
      c.fill();
    }
  } else {
    c.fillStyle = H.alpha ? alpha(hair, H.alpha) : hair;
    c.fillRect(-R - 2, capY, R * 2 + 4, capH);
    // temples hug the face a bit lower
    if (!H.alpha) {
      c.fillRect(-R - 2, capY, 2.2, capH + 3);
      c.fillRect(R - 0.2, capY, 2.2, capH + 3);
    }
  }
  if (H.rows) for (let k = -R; k <= R; k += (R * 2) / H.rows) line(c, k * 0.9, capY + capH, k * 0.4, capY, shade(hair, 0.28, 0.75), 0.6);
  if (H.tex === 'kink') for (let k = 0; k < 14; k++) circle(c, -R + ((k * 37) % 100) / 100 * R * 2, capY + ((k * 53) % 100) / 100 * capH, 0.5, shade(hair, 0.22, 0.6));
  // fringe teeth
  if (H.fringe) {
    c.fillStyle = hair;
    for (let k = 0; k < 4; k++) {
      c.beginPath();
      c.moveTo(-R + k * 3.4, capY + capH);
      c.lineTo(-R + k * 3.4 + 3.4, capY + capH);
      c.lineTo(-R + k * 3.4 + 1.2, capY + capH + 1.7);
      c.fill();
    }
  }
  c.restore();
  // volume on top of the head
  if (H.vol) {
    const v = H.vol;
    c.fillStyle = hair;
    c.beginPath();
    c.ellipse(0, capY + 2.4, R * (H.shaved ? 0.7 : 0.98), 1.6 + v * 0.7, 0, Math.PI, 0);
    c.fill();
    c.strokeStyle = OUT;
    c.lineWidth = 0.6;
    c.stroke();
  }
  if (H.swoop) {
    c.fillStyle = hair;
    c.beginPath();
    c.moveTo(-R * 0.6, capY + 1);
    c.quadraticCurveTo(R * 0.2, capY - 3.5, R * 0.9, capY + 2.5);
    c.quadraticCurveTo(R * 0.2, capY + 1, -R * 0.6, capY + 3);
    c.fill();
  }
  if (H.crest) {
    fillRR(c, -1.6, capY - H.crest + 2, 3.2, H.crest + 4, 1.4, hair, OUT, 0.6);
    for (let k = 0; k < 4; k++) line(c, -1.2 + k * 0.8, capY - H.crest + 3, -1.2 + k * 0.8, capY + 3, shade(hair, 0.25, 0.7), 0.4);
  }
  if (H.tex === 'curl') {
    for (let k = 0; k < 11; k++) {
      const cx = -R + 0.6 + k * ((R * 2 - 1.2) / 10);
      const cy = capY + 2.6 + Math.abs(k - 5) * 0.55;
      circle(c, cx, cy, 2.3, hair);
      circle(c, cx - 0.5, cy - 0.6, 0.7, shade(hair, 0.22, 0.7));
    }
    if (H.sides) for (const s of [-1, 1]) for (let k = 0; k < 3; k++) circle(c, s * (R - 0.2), hy - 2 + k * 2, 1.8, hair);
  }
  if (H.long) {
    for (const s of [-1, 1]) {
      fillRR(c, s > 0 ? R - 1.7 : -R - 0.9, hy - 3, 2.6, H.long - 1, 1.2, hair, null);
      if (H.strands === 'braid') for (let k = 0; k < H.long - 2; k += 2) line(c, s * (R - 0.4) - 0.8, hy - 2 + k, s * (R - 0.4) + 0.8, hy - 1 + k, shade(hair, 0.3, 0.7), 0.5);
    }
  }
  if (H.part) line(c, 1.2, capY + 0.5, 0.6, capY + capH - 0.5, shade(hair, -0.3, 0.8), 0.6);
  if (H.shine) line(c, -R * 0.6, capY + 2, R * 0.4, capY + 1.2, shade(hair, 0.4, 0.55), 1);
  hairHighlight(c, L, view, S, H);
}

function hairHighlight(c, L, view, S, H) {
  if (!L.hair2 || L.hat) return;
  const hy = HY;
  c.fillStyle = alpha(L.hair2, 0.85);
  if (view === 'side') {
    c.fillRect(-S.rx + 1, hy - S.ry - 0.5, S.rx * 1.2, 1.6);
    return;
  }
  if (H.long) {
    for (const s of [-1, 1]) fillRR(c, s > 0 ? S.rx - 1.7 : -S.rx - 0.9, hy + H.long - 7, 2.6, 4, 1, alpha(L.hair2, 0.9), null);
  }
  fillRR(c, -S.rx * 0.5, hy - S.ry - 0.5, 2.2, 3.4, 1, alpha(L.hair2, 0.9), null);
}

// ---------------------------------------------------------------- hats & glasses
function drawHat(c, L, view, S) {
  const hc = L.hatColor || '#b8312f';
  const R = S.rx;
  const hy = HY;
  switch (L.hat) {
    case 'cap': case 'backcap': {
      const backwards = L.hat === 'backcap';
      c.beginPath();
      c.ellipse(0, hy - 2.4, R + 0.6, R * 0.82, 0, Math.PI, 0);
      c.closePath();
      c.fillStyle = hgradFill(c, -R, R, hc);
      c.fill();
      c.strokeStyle = OUT;
      c.lineWidth = 0.8;
      c.stroke();
      line(c, 0, hy - 2.4 - R * 0.8, 0, hy - 2.6, shade(hc, -0.2, 0.7), 0.5);
      circle(c, 0, hy - R * 0.82 - 1.6, 0.8, shade(hc, -0.3));
      const brimFront = (view === 'front' && !backwards) || (view === 'back' && backwards);
      if (view === 'side') fillRR(c, backwards ? -R - 4 : R - 2, hy - 3.6, 6, 2.2, 1, shade(hc, -0.2), OUT, 0.5);
      else if (brimFront) ellipse(c, 0, hy - 2.3, R + 1.8, 2.2, shade(hc, -0.2));
      else {
        fillRR(c, -2.4, hy - 3.4, 4.8, 1.6, 0.6, shade(hc, -0.35), null);
        if (backwards && view === 'front') ellipse(c, 0, hy - 5.8, R * 0.7, 1.2, shade(hc, -0.2));
      }
      break;
    }
    case 'beanie': {
      c.beginPath();
      c.ellipse(0, hy - 2, R + 0.8, R + 0.8, 0, Math.PI, 0);
      c.closePath();
      c.fillStyle = hgradFill(c, -R, R, hc);
      c.fill();
      for (let k = -R; k < R; k += 1.4) line(c, k, hy - 2.5, k * 0.9, hy - R - 1, shade(hc, -0.15, 0.6), 0.4);
      fillRR(c, -R - 0.8, hy - 3.4, R * 2 + 1.6, 3, 1, shade(hc, -0.2), OUT, 0.5);
      circle(c, 0, hy - R - 2.4, 1.6, shade(hc, 0.2));
      break;
    }
    case 'bucket': {
      ellipse(c, 0, hy - 2.6, R + 3.2, 2.6, shade(hc, -0.2));
      c.beginPath();
      c.ellipse(0, hy - 3.2, R + 0.6, R * 0.75, 0, Math.PI, 0);
      c.closePath();
      c.fillStyle = hgradFill(c, -R, R, hc);
      c.fill();
      c.strokeStyle = OUT;
      c.lineWidth = 0.7;
      c.stroke();
      break;
    }
    case 'cowboy': {
      const w = view === 'side' ? R + 4.5 : R + 5;
      c.fillStyle = shade(hc, -0.15);
      c.beginPath();
      c.ellipse(0, hy - 3, w, view === 'side' ? 1.6 : 2.8, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = OUT;
      c.lineWidth = 0.7;
      c.stroke();
      c.fillStyle = hgradFill(c, -R, R, hc);
      c.beginPath();
      c.moveTo(-R * 0.75, hy - 3);
      c.quadraticCurveTo(-R * 0.8, hy - 10, -1.5, hy - 9.5);
      c.lineTo(0, hy - 8.4);
      c.lineTo(1.5, hy - 9.5);
      c.quadraticCurveTo(R * 0.8, hy - 10, R * 0.75, hy - 3);
      c.closePath();
      c.fill();
      c.stroke();
      fillRR(c, -R * 0.75, hy - 4.6, R * 1.5, 1.4, 0.4, '#3a2418', null);
      break;
    }
    case 'police': {
      const pc = '#1b2a44';
      c.beginPath();
      c.ellipse(0, hy - 3, R + 0.8, R * 0.7, 0, Math.PI, 0);
      c.closePath();
      c.fillStyle = pc;
      c.fill();
      fillRR(c, -R - 1, hy - 4, R * 2 + 2, 2.4, 1, '#111', null);
      if (view === 'front') {
        ellipse(c, 0, hy - 2.6, R + 2.2, 2, '#111');
        circle(c, 0, hy - 6.3, 1.2, '#e8c547');
      }
      break;
    }
    default:
      break;
  }
}

function drawGlasses(c, L, view) {
  const hy = HY;
  const st = L.glasses;
  const frame = st === 'shades' ? '#111' : '#2a2a2a';
  c.strokeStyle = frame;
  c.lineWidth = 0.8;
  if (view === 'side') {
    if (st === 'shades') fillRR(c, 2.1, hy - 1.2, 3.6, 2.6, 0.8, 'rgba(15,15,20,0.9)', null);
    else c.strokeRect(2.1, hy - 1.3, 3.4, 2.8);
    line(c, -0.6, hy - 0.2, 2.1, hy - 0.2, frame, 0.7);
    return;
  }
  for (const s of [-1, 1]) {
    const x = s * 2.45;
    if (st === 'round') {
      c.beginPath();
      c.arc(x, hy + 0.2, 1.75, 0, Math.PI * 2);
      c.stroke();
    } else if (st === 'shades') {
      fillRR(c, x - 2, hy - 1.2, 4, 2.7, 1, 'rgba(15,15,20,0.92)', frame, 0.6);
      line(c, x - 1.2, hy - 0.6, x - 0.3, hy - 0.9, 'rgba(255,255,255,0.45)', 0.5);
    } else c.strokeRect(x - 1.75, hy - 1.2, 3.5, 2.8);
  }
  line(c, -0.7, hy - 0.1, 0.7, hy - 0.1, frame, 0.7);
}

// ---------------------------------------------------------------- lying / portrait
function drawLying(c, L, o, sideways) {
  c.save();
  if (sideways) {
    c.rotate(o.face === 'right' ? Math.PI / 2 : -Math.PI / 2);
    if (o.ko) shadowBlob(c, 0, 0, 7, 22, 0.35);
  }
  c.translate(0, 22);
  const hs = L.height || 1;
  c.scale(hs, hs);
  drawFrontBack(c, L, { ...o, pose: 'stand', moving: false, guard: false, strike: 0, held: null, noShadow: true, sleeping: o.sleeping || o.ko }, false);
  c.restore();
}

// Head-and-shoulders portrait for dialogs and the people panel.
export function drawPortrait(c, look, size) {
  const L = fullLook(look);
  c.save();
  c.translate(size / 2, size * 0.98);
  const k = size / 30;
  c.scale(k, k);
  c.translate(0, 18);
  drawFrontBack(c, L, { face: 'down', pose: 'stand', t: 0, noShadow: true }, false);
  c.restore();
}
