// Character art. Every person is drawn from their `look` each frame in
// three-quarter view: front, back and side, with walk, sit, lie, fight,
// work and training poses. Feet sit at (0, 0).

import { shade, alpha, fillRR, ellipse, circle, line, shadowBlob } from './gfx.js';
import { drawHeld } from './sprites.js';

const BUILD = {
  slim: { w: 12, waist: 10.5, leg: 4.4, arm: 3.4 },
  avg: { w: 14, waist: 12.5, leg: 4.8, arm: 3.8 },
  heavy: { w: 18, waist: 17, leg: 5.8, arm: 4.6 },
  muscle: { w: 17.5, waist: 12.5, leg: 5.4, arm: 5.2 },
};

const OUT = 'rgba(20,12,8,0.55)';

function limb(c, x1, y1, x2, y2, w, color) {
  c.lineCap = 'round';
  c.strokeStyle = OUT;
  c.lineWidth = w + 1.4;
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.stroke();
  c.strokeStyle = color;
  c.lineWidth = w;
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.stroke();
}

function sleeveColors(look) {
  const t = look.top;
  const skin = look.skin;
  const main = t === 'apron' ? look.top2 || '#ddd' : look.topColor;
  switch (t) {
    case 'tank': return { upper: skin, lower: skin };
    case 'tee': case 'apron': return { upper: main, lower: skin };
    case 'uniform': return { upper: main, lower: skin };
    default: return { upper: main, lower: main }; // long sleeves
  }
}

// opts: face, pose, phase, moving, t, strike(0..1), hurt(0..1), guard, held, sleeping, eating
export function drawPerson(c, look, o) {
  const pose = o.pose || 'stand';
  if (pose === 'lie' || pose === 'sleep') return drawLying(c, look, o, o.face === 'left' || o.face === 'right');
  if (pose === 'down') return drawLying(c, look, { ...o, sleeping: true, ko: true }, true);
  c.save();
  const hs = look.height || 1;
  c.scale(hs, hs);
  if (!o.noShadow) shadowBlob(c, 0, 0.5, pose === 'sit' ? 11 : 9.5, 3.6, 0.35);
  const face = o.face || 'down';
  if (face === 'left' || face === 'right') {
    if (face === 'left') c.scale(-1, 1);
    drawSide(c, look, o);
  } else drawFrontBack(c, look, o, face === 'up');
  c.restore();
}

function drawFrontBack(c, look, o, back) {
  const B = BUILD[look.build] || BUILD.avg;
  const pose = o.pose || 'stand';
  const sit = pose === 'sit';
  const ph = o.phase || 0;
  const mv = o.moving ? 1 : 0;
  const run = pose === 'run';
  const swing = run ? Math.sin(o.t * 14) : pose === 'dance' ? Math.sin(o.t * 6) * 0.8 : Math.sin(ph) * mv;
  let lift = 0;
  if (pose === 'lift' && o.bar) lift = (Math.sin(o.t * 2.4) * 0.5 + 0.5) * 4; // squat bob
  const dy = (sit ? 7 : 0) + lift + (o.hurt > 0 ? 1 : 0);
  const bob = (mv || run) ? Math.abs(Math.sin(ph * (run ? 1 : 1))) * -1 : 0;
  c.save();
  c.translate(0, dy + bob);

  const W = B.w;
  const legX = W * 0.22;
  const pants = look.bottomColor;
  const shoes = look.shoes || '#222';
  const skin = look.skin;

  // ---- legs
  if (sit && !back) {
    // thighs toward the camera, shins down
    for (const s of [-1, 1]) {
      const lx = s * legX * 1.15;
      limb(c, lx, -12, lx, -6, B.leg + 1.5, look.bottom === 'skirt' ? look.bottomColor : pants);
      const shin = look.bottom === 'shorts' || look.bottom === 'skirt' ? skin : pants;
      limb(c, lx, -6, lx, -1, B.leg, shin);
      fillRR(c, lx - 3, -2, 6, 3.4, 1.5, shoes, OUT, 0.8);
    }
  } else if (!sit) {
    for (const s of [-1, 1]) {
      const up = Math.max(0, s * swing) * 2.6;
      const lx = s * legX;
      const kneeY = -9 - up * 0.5;
      const footY = -2.5 - up;
      if (look.bottom === 'skirt') {
        limb(c, lx, -9, lx, footY, B.leg - 0.6, skin);
      } else if (look.bottom === 'shorts') {
        limb(c, lx, -16, lx, kneeY, B.leg + 0.6, pants);
        limb(c, lx, kneeY, lx, footY, B.leg - 0.4, skin);
      } else {
        limb(c, lx, -16, lx, footY, B.leg, pants);
      }
      fillRR(c, lx - 3.2, footY - 0.6, 6.4, 3.6, 1.6, shoes, OUT, 0.8);
    }
  }

  // ---- arms behind (back view draws arms before torso edges anyway)
  const SC = sleeveColors(look);
  const shY = -29.5;
  const armL = { x: -W / 2 - 0.8, y: shY + 1.5 };
  const armR = { x: W / 2 + 0.8, y: shY + 1.5 };
  let handL = { x: armL.x - 0.8, y: -15.5 - swing * 1.4 };
  let handR = { x: armR.x + 0.8, y: -15.5 + swing * 1.4 };
  if (sit) {
    handL = { x: armL.x + 2, y: -16 };
    handR = { x: armR.x - 2, y: -16 };
  }
  const guard = o.guard;
  if (guard) {
    handL = { x: -4, y: -33 };
    handR = { x: 4, y: -32 };
  }
  if (pose === 'work') {
    handL = { x: -5 + Math.sin(o.t * 5) * 2, y: -22 };
    handR = { x: 5 + Math.cos(o.t * 6) * 2.5, y: -21 + Math.sin(o.t * 6) };
  }
  if (pose === 'curl') {
    const a = Math.sin(o.t * 3);
    handL = { x: armL.x - 0.5, y: a > 0 ? -26 : -16 };
    handR = { x: armR.x + 0.5, y: a > 0 ? -16 : -26 };
  }
  if (pose === 'lift' && o.bar) {
    handL = { x: -W / 2 - 3, y: -31 };
    handR = { x: W / 2 + 3, y: -31 };
  }
  if (pose === 'bag') {
    const a = Math.sin(o.t * 7);
    handL = { x: -3, y: a > 0.3 ? -40 : -32 };
    handR = { x: 3, y: a < -0.3 ? -40 : -32 };
  }
  if (o.eating && Math.sin(o.t * 1.3) > 0.6) handR = { x: 2, y: -33 };
  if (pose === 'dance') {
    const a = Math.sin(o.t * 6);
    handL = { x: -W / 2 - 3, y: a > 0 ? -42 : -30 };
    handR = { x: W / 2 + 3, y: a > 0 ? -30 : -42 };
  }
  if (o.strike > 0) {
    // punch: right hand drives out toward the facing direction
    const k = Math.sin(o.strike * Math.PI);
    if (back) handR = { x: 3, y: -30 - k * 9 };
    else handR = { x: 2, y: -24 + k * 6 };
  }

  const drawArm = (sh, hand) => {
    const ex = (sh.x + hand.x) / 2 + (hand.x < 0 ? -0.6 : 0.6);
    const ey = (sh.y + hand.y) / 2;
    limb(c, sh.x, sh.y, ex, ey, B.arm, SC.upper);
    limb(c, ex, ey, hand.x, hand.y, B.arm - 0.4, SC.lower);
    const big = o.strike > 0 && hand === handR && !back ? 1 + Math.sin(o.strike * Math.PI) * 0.6 : 1;
    circle(c, hand.x, hand.y, 2.3 * big, OUT);
    circle(c, hand.x, hand.y, 1.8 * big, skin);
  };

  // ---- torso
  const topMain = look.top === 'apron' ? look.top2 || '#ddd' : look.topColor;
  const torso = () => {
    c.beginPath();
    c.moveTo(-W / 2, shY + 2.5);
    c.quadraticCurveTo(-W / 2, shY, -W / 2 + 3, shY - 0.6);
    c.lineTo(W / 2 - 3, shY - 0.6);
    c.quadraticCurveTo(W / 2, shY, W / 2, shY + 2.5);
    c.lineTo(B.waist / 2, -18);
    c.lineTo(-B.waist / 2, -18);
    c.closePath();
  };
  // hips / belt
  if (look.bottom === 'skirt') {
    c.beginPath();
    c.moveTo(-B.waist / 2, -19);
    c.lineTo(B.waist / 2, -19);
    c.lineTo(B.waist / 2 + 3, sit ? -8 : -9);
    c.lineTo(-B.waist / 2 - 3, sit ? -8 : -9);
    c.closePath();
    c.fillStyle = look.bottomColor;
    c.fill();
    c.strokeStyle = OUT;
    c.lineWidth = 0.8;
    c.stroke();
  } else {
    fillRR(c, -B.waist / 2 - 0.3, -19.5, B.waist + 0.6, 5, 1.5, pants, OUT, 0.8);
    if (look.bottom === 'jeans' && !back) line(c, 0, -19, 0, -15, shade(pants, -0.3), 0.8);
  }

  if (look.top === 'hoodie' && back) {
    // hood on the back
    ellipse(c, 0, shY + 1.5, 6, 4, shade(topMain, -0.15));
  }

  torso();
  c.fillStyle = topMain;
  c.fill();
  c.strokeStyle = OUT;
  c.lineWidth = 0.9;
  c.stroke();
  // shading
  c.save();
  torso();
  c.clip();
  c.fillStyle = 'rgba(0,0,0,0.16)';
  c.fillRect(W * 0.12, shY - 2, W, 16);
  c.fillStyle = 'rgba(255,255,255,0.12)';
  c.fillRect(-W / 2, shY - 1, W * 0.25, 13);
  if (!back) {
    switch (look.top) {
      case 'tee':
        c.fillStyle = shade(topMain, -0.3);
        c.beginPath();
        c.arc(0, shY - 0.5, 2.6, 0, Math.PI);
        c.fill();
        break;
      case 'tank':
        c.fillStyle = skin;
        c.beginPath();
        c.moveTo(-W / 2, shY - 1);
        c.lineTo(-W / 2 + 3, shY - 1);
        c.lineTo(-W / 2 + 3.5, shY + 5);
        c.lineTo(-W / 2, shY + 6);
        c.closePath();
        c.fill();
        c.beginPath();
        c.moveTo(W / 2, shY - 1);
        c.lineTo(W / 2 - 3, shY - 1);
        c.lineTo(W / 2 - 3.5, shY + 5);
        c.lineTo(W / 2, shY + 6);
        c.closePath();
        c.fill();
        c.beginPath();
        c.arc(0, shY - 1, 3, 0, Math.PI);
        c.fill();
        break;
      case 'hoodie':
        line(c, -1.5, shY + 0.5, -1.8, shY + 5, '#eee', 0.7);
        line(c, 1.5, shY + 0.5, 1.8, shY + 5, '#eee', 0.7);
        fillRR(c, -W / 2 + 2.5, -24, W - 5, 4.5, 1.5, shade(topMain, -0.12), null);
        c.fillStyle = shade(topMain, -0.25);
        c.beginPath();
        c.arc(0, shY - 0.5, 3.4, 0, Math.PI);
        c.fill();
        break;
      case 'cardigan': case 'jacket':
        c.fillStyle = look.top2 || '#ddd';
        c.beginPath();
        c.moveTo(-2.5, shY - 0.6);
        c.lineTo(2.5, shY - 0.6);
        c.lineTo(1.6, -18);
        c.lineTo(-1.6, -18);
        c.closePath();
        c.fill();
        for (let k = 0; k < 3; k++) circle(c, -2.3, shY + 3 + k * 3.4, 0.6, shade(topMain, -0.4));
        break;
      case 'button':
        line(c, 0, shY, 0, -18, shade(topMain, -0.25), 0.7);
        for (let k = 0; k < 3; k++) circle(c, 0.8, shY + 3 + k * 3.2, 0.45, '#eee');
        c.fillStyle = shade(topMain, 0.2);
        c.beginPath();
        c.moveTo(-3, shY - 0.6);
        c.lineTo(0, shY + 2);
        c.lineTo(3, shY - 0.6);
        c.closePath();
        c.fill();
        break;
      case 'uniform':
        line(c, 0, shY, 0, -18, shade(topMain, -0.35), 0.7);
        fillRR(c, -W / 2 + 2, shY + 2.5, 3, 3.5, 0.8, '#e8c547', null);
        fillRR(c, W / 2 - 4.5, shY + 2, 3, 2, 0.5, shade(topMain, 0.25), null);
        break;
      case 'apron':
        // apron over the shirt
        c.fillStyle = look.topColor;
        c.beginPath();
        c.moveTo(-W / 2 + 2.2, shY + 3);
        c.lineTo(W / 2 - 2.2, shY + 3);
        c.lineTo(B.waist / 2 + 0.5, -18);
        c.lineTo(-B.waist / 2 - 0.5, -18);
        c.closePath();
        c.fill();
        line(c, -W / 2 + 2.5, shY + 3, -2, shY - 0.5, look.topColor, 1);
        line(c, W / 2 - 2.5, shY + 3, 2, shY - 0.5, look.topColor, 1);
        break;
      default: break;
    }
  } else if (look.top === 'apron') {
    line(c, -W / 2 + 2, shY, W / 2 - 3, -19, look.topColor, 1.2);
    line(c, W / 2 - 2, shY, -W / 2 + 3, -19, look.topColor, 1.2);
    fillRR(c, -2, -20, 4, 2.5, 0.8, look.topColor, null);
  }
  c.restore();
  if (look.top === 'apron' && !back) {
    // apron skirt over the hips
    fillRR(c, -B.waist / 2 - 1, -19, B.waist + 2, sit ? 8 : 10, 1.5, look.topColor, OUT, 0.7);
    line(c, -B.waist / 2 - 1, -18.5, B.waist / 2 + 1, -18.5, shade(look.topColor, -0.2), 1);
  }
  if (look.top === 'uniform') fillRR(c, -B.waist / 2 - 0.4, -20, B.waist + 0.8, 2.2, 0.6, '#1a1a1a', null);
  if (look.chain && !back) {
    c.beginPath();
    c.arc(0, shY - 1, 3.6, 0.2, Math.PI - 0.2);
    c.strokeStyle = '#e6c04a';
    c.lineWidth = 0.9;
    c.stroke();
  }

  drawArm(armL, handL);
  drawArm(armR, handR);
  if (pose === 'lift' && o.bar) {
    line(c, -W / 2 - 9, -31.5, W / 2 + 9, -31.5, '#c7ccd1', 2);
    fillRR(c, -W / 2 - 12, -36, 4, 9, 1, '#1d1d1d', null);
    fillRR(c, W / 2 + 8, -36, 4, 9, 1, '#1d1d1d', null);
  }
  if (pose === 'curl') {
    for (const h of [handL, handR]) {
      line(c, h.x - 3, h.y, h.x + 3, h.y, '#9aa3ab', 1.6);
      fillRR(c, h.x - 4.5, h.y - 2, 2, 4, 0.5, '#1d1d1d', null);
      fillRR(c, h.x + 2.5, h.y - 2, 2, 4, 0.5, '#1d1d1d', null);
    }
  }
  if (o.held) {
    c.save();
    c.translate(handR.x + 1.5, handR.y + 1);
    if (o.held === 'plate') c.translate(-handR.x - 1, -4);
    drawHeld(c, o.held);
    c.restore();
  }

  // ---- head
  drawHead(c, look, o, back ? 'back' : 'front');
  c.restore();
}

function drawSide(c, look, o) {
  const B = BUILD[look.build] || BUILD.avg;
  const pose = o.pose || 'stand';
  const sit = pose === 'sit';
  const ph = o.phase || 0;
  const mv = o.moving ? 1 : 0;
  const swing = Math.sin(ph) * mv;
  const dy = sit ? 7 : 0;
  const bob = mv ? Math.abs(Math.sin(ph)) * -1 : 0;
  c.save();
  c.translate(0, dy + bob);
  const D = B.w * 0.62; // body depth seen from the side
  const pants = look.bottomColor;
  const shoes = look.shoes || '#222';
  const skin = look.skin;
  const SC = sleeveColors(look);
  const shY = -29.5;
  const topMain = look.top === 'apron' ? look.top2 || '#ddd' : look.topColor;

  // far arm (behind body)
  const farHand = { x: -swing * 4.5, y: -16 };
  if (!o.guard && o.strike <= 0) limb(c, 0, shY + 2, farHand.x * 0.9, farHand.y, B.arm - 0.4, shade(SC.upper, -0.25));

  // legs
  if (sit) {
    limb(c, -1, -12, 7, -12, B.leg + 1, look.bottom === 'skirt' ? look.bottomColor : pants);
    const shin = look.bottom === 'shorts' || look.bottom === 'skirt' ? skin : pants;
    limb(c, 7.5, -12, 7.5, -2, B.leg, shin);
    fillRR(c, 6, -2.5, 6.5, 3.4, 1.5, shoes, OUT, 0.8);
  } else {
    for (const s of [-1, 1]) {
      const sw = s * swing;
      const fx = sw * 5.5;
      const kx = sw * 3 + (sw > 0 ? 1 : 0);
      const col = s < 0 ? shade(pants, -0.18) : pants;
      const skinC = s < 0 ? shade(skin, -0.18) : skin;
      if (look.bottom === 'shorts') {
        limb(c, 0, -16, kx, -9, B.leg + 0.6, col);
        limb(c, kx, -9, fx, -2.5, B.leg - 0.4, skinC);
      } else if (look.bottom === 'skirt') {
        limb(c, kx * 0.6, -9, fx, -2.5, B.leg - 0.6, skinC);
      } else {
        limb(c, 0, -16, kx, -9, B.leg, col);
        limb(c, kx, -9, fx, -2.5, B.leg, col);
      }
      fillRR(c, fx - 2.2, -3.2, 7, 3.6, 1.6, s < 0 ? shade(shoes, -0.2) : shoes, OUT, 0.8);
    }
  }

  // torso
  if (look.bottom === 'skirt') {
    c.beginPath();
    c.moveTo(-D / 2, -19);
    c.lineTo(D / 2, -19);
    c.lineTo(D / 2 + 3, -9);
    c.lineTo(-D / 2 - 2, -9);
    c.closePath();
    c.fillStyle = look.bottomColor;
    c.fill();
    c.strokeStyle = OUT;
    c.lineWidth = 0.8;
    c.stroke();
  } else fillRR(c, -D / 2, -19.5, D, 5, 1.5, pants, OUT, 0.8);
  if (look.top === 'hoodie') ellipse(c, -D / 2 + 0.5, shY + 1, 2.5, 3.5, shade(topMain, -0.15));
  fillRR(c, -D / 2, shY - 0.8, D, 12.6, 3, topMain, OUT, 0.9);
  c.fillStyle = 'rgba(0,0,0,0.15)';
  c.fillRect(-D / 2 + 0.5, shY + 6, D - 1, 5);
  if (look.top === 'apron') {
    fillRR(c, D / 2 - 2, shY + 3, 2.5, 18, 1, look.topColor, null);
    line(c, D / 2 - 1, shY + 3, 0, shY - 0.5, look.topColor, 1);
  }
  if (look.top === 'uniform') fillRR(c, -D / 2, -20, D, 2.2, 0.6, '#1a1a1a', null);
  if (look.top === 'tank') fillRR(c, -D / 2 + 1.5, shY - 1, D - 3, 3, 1, skin, null);

  // near arm
  let hand = { x: swing * 5, y: -15.5 };
  if (sit) hand = { x: 5, y: -16 };
  if (o.guard) hand = { x: 6, y: -32 };
  if (pose === 'work') hand = { x: 6 + Math.sin(o.t * 5) * 2, y: -22 };
  if (o.eating && Math.sin(o.t * 1.3) > 0.6) hand = { x: 4, y: -33 };
  if (o.strike > 0) {
    const k = Math.sin(o.strike * Math.PI);
    hand = { x: 6 + k * 9, y: -27 };
  }
  const ex = (hand.x) / 2 - 0.5;
  const ey = (shY + 2 + hand.y) / 2 + 1;
  limb(c, 0, shY + 2, ex, ey, B.arm, SC.upper);
  limb(c, ex, ey, hand.x, hand.y, B.arm - 0.4, SC.lower);
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
  drawHead(c, look, o, 'side');
  c.restore();
}

function drawHead(c, look, o, view) {
  const hy = -38.5;
  const R = 6.6;
  const skin = look.skin;
  const hair = look.hairColor || '#1a120c';
  const style = look.hair || 'short';
  // neck
  fillRR(c, -2, hy + 4, 4, 4, 1, shade(skin, -0.15), null);
  // hair behind the head
  if (view !== 'side') {
    if (style === 'afro') circle(c, 0, hy - 2, R + 3.5, hair);
    if (style === 'long' || style === 'braids') fillRR(c, -R - 0.8, hy - 3, R * 2 + 1.6, view === 'back' ? 15 : 12, 4, hair, null);
  } else {
    if (style === 'afro') circle(c, -1, hy - 2, R + 3.2, hair);
    if (style === 'long') fillRR(c, -R - 0.6, hy - 2, R + 2, 13, 4, hair, null);
    if (style === 'ponytail' || style === 'bun') circle(c, -R + 0.5, hy - (style === 'bun' ? 5 : 1), 3, hair);
  }
  // head
  ellipse(c, 0, hy, R + 0.7, R + 1.1, OUT);
  ellipse(c, 0, hy, R, R + 0.4, skin);
  c.save();
  c.beginPath();
  c.ellipse(0, hy, R, R + 0.4, 0, 0, Math.PI * 2);
  c.clip();
  c.fillStyle = 'rgba(0,0,0,0.13)';
  c.fillRect(view === 'side' ? -R : R * 0.25, hy - R, R, R * 2.2);
  c.restore();

  if (view === 'front') {
    // ears
    circle(c, -R, hy + 0.5, 1.4, shade(skin, -0.1));
    circle(c, R, hy + 0.5, 1.4, shade(skin, -0.15));
    const closed = o.sleeping || o.blink;
    if (closed) {
      line(c, -3.4, hy + 0.3, -1.4, hy + 0.3, 'rgba(30,15,10,0.8)', 0.8);
      line(c, 1.4, hy + 0.3, 3.4, hy + 0.3, 'rgba(30,15,10,0.8)', 0.8);
    } else {
      ellipse(c, -2.4, hy + 0.2, 0.95, 1.25, '#1b120d');
      ellipse(c, 2.4, hy + 0.2, 0.95, 1.25, '#1b120d');
      circle(c, -2.1, hy - 0.2, 0.35, 'rgba(255,255,255,0.8)');
      circle(c, 2.7, hy - 0.2, 0.35, 'rgba(255,255,255,0.8)');
    }
    line(c, -3.6, hy - 2.2, -1.4, hy - 2.5, shade(hair, 0.05, 0.85), 0.9);
    line(c, 1.4, hy - 2.5, 3.6, hy - 2.2, shade(hair, 0.05, 0.85), 0.9);
    ellipse(c, 0.5, hy + 2.3, 0.9, 0.6, shade(skin, -0.25));
    if (o.hurt > 0) ellipse(c, 0, hy + 4.4, 1.3, 1, '#4a1a12');
    else line(c, -1.5, hy + 4.2, 1.5, hy + 4.2, 'rgba(70,25,20,0.7)', 0.8);
    if (look.beard === 'stubble') {
      c.save();
      c.beginPath();
      c.ellipse(0, hy + 3.5, R - 0.8, 3.4, 0, 0, Math.PI);
      c.fillStyle = alpha(hair, 0.28);
      c.fill();
      c.restore();
    } else if (look.beard === 'goatee') {
      fillRR(c, -1.8, hy + 4.4, 3.6, 3.2, 1.4, hair, null);
      line(c, -2.2, hy + 3.4, 2.2, hy + 3.4, hair, 0.9);
    } else if (look.beard === 'full') {
      c.beginPath();
      c.moveTo(-R + 0.4, hy + 0.5);
      c.quadraticCurveTo(0, hy + 10.5, R - 0.4, hy + 0.5);
      c.quadraticCurveTo(0, hy + 5, -R + 0.4, hy + 0.5);
      c.fillStyle = hair;
      c.fill();
    }
    if (look.glasses) {
      c.strokeStyle = '#2a2a2a';
      c.lineWidth = 0.8;
      c.strokeRect(-4.4, hy - 1.3, 3.4, 2.8);
      c.strokeRect(1, hy - 1.3, 3.4, 2.8);
      line(c, -1, hy - 0.2, 1, hy - 0.2, '#2a2a2a', 0.7);
    }
  } else if (view === 'side') {
    circle(c, -0.8, hy + 0.6, 1.5, shade(skin, -0.12));
    // nose
    c.fillStyle = skin;
    c.beginPath();
    c.moveTo(R - 0.6, hy - 0.6);
    c.lineTo(R + 1.6, hy + 1.8);
    c.lineTo(R - 0.4, hy + 2.4);
    c.closePath();
    c.fill();
    if (o.sleeping || o.blink) line(c, 2.4, hy + 0.2, 4.2, hy + 0.2, 'rgba(30,15,10,0.8)', 0.8);
    else ellipse(c, 3.4, hy + 0.1, 0.8, 1.2, '#1b120d');
    line(c, 2.2, hy - 2.3, 4.6, hy - 2.4, shade(hair, 0.05, 0.85), 0.9);
    line(c, 3.2, hy + 4.2, 5.2, hy + 4, 'rgba(70,25,20,0.7)', 0.8);
    if (look.beard === 'goatee') fillRR(c, 3.4, hy + 4.3, 2.6, 3, 1.2, hair, null);
    if (look.beard === 'full') fillRR(c, -1, hy + 1.5, 7, 6, 3, hair, null);
    if (look.beard === 'stubble') fillRR(c, -0.5, hy + 2, 6.5, 4, 2, alpha(hair, 0.28), null);
    if (look.glasses) {
      c.strokeStyle = '#2a2a2a';
      c.lineWidth = 0.8;
      c.strokeRect(2.1, hy - 1.3, 3.4, 2.8);
      line(c, -0.6, hy - 0.2, 2.1, hy - 0.2, '#2a2a2a', 0.7);
    }
  }

  // hair on top
  drawHair(c, look, view, hy, R, hair, style);
  // hats
  if (look.hat === 'cap') {
    const hc = look.hatColor || '#b8312f';
    c.save();
    c.beginPath();
    c.ellipse(0, hy - 2.4, R + 0.6, R * 0.82, 0, Math.PI, 0);
    c.closePath();
    c.fillStyle = hc;
    c.fill();
    c.strokeStyle = OUT;
    c.lineWidth = 0.8;
    c.stroke();
    if (view === 'front') ellipse(c, 0, hy - 2.3, R + 1.8, 2.2, shade(hc, -0.2));
    else if (view === 'side') fillRR(c, R - 2, hy - 3.6, 6, 2.2, 1, shade(hc, -0.2), null);
    else ellipse(c, 0, hy - 3, 2, 1, shade(hc, 0.3));
    circle(c, 0, hy - R * 0.82 - 1.6, 0.8, shade(hc, -0.3));
    c.restore();
  } else if (look.hat === 'beanie') {
    const hc = look.hatColor || '#2b2b2b';
    c.beginPath();
    c.ellipse(0, hy - 2, R + 0.8, R + 0.5, 0, Math.PI, 0);
    c.closePath();
    c.fillStyle = hc;
    c.fill();
    fillRR(c, -R - 0.8, hy - 3.2, R * 2 + 1.6, 2.8, 1, shade(hc, -0.2), null);
  } else if (look.hat === 'police') {
    const hc = '#1b2a44';
    c.beginPath();
    c.ellipse(0, hy - 3, R + 0.8, R * 0.7, 0, Math.PI, 0);
    c.closePath();
    c.fillStyle = hc;
    c.fill();
    fillRR(c, -R - 1, hy - 4, R * 2 + 2, 2.4, 1, '#111', null);
    if (view === 'front') {
      ellipse(c, 0, hy - 2.6, R + 2.2, 2, '#111');
      circle(c, 0, hy - 6.3, 1.2, '#e8c547');
    }
  }
}

function drawHair(c, look, view, hy, R, hair, style) {
  if (style === 'bald' || look.hat === 'cap' || look.hat === 'beanie' || look.hat === 'police') {
    if (style === 'bald' && !look.hat) ellipse(c, -2, hy - 4, 2, 1.2, 'rgba(255,255,255,0.25)');
    if (look.hat && style === 'long' && view === 'back') fillRR(c, -R, hy - 1, R * 2, 10, 3, hair, null);
    if (!(look.hat && (style === 'long' || style === 'braids' || style === 'curly' || style === 'short' || style === 'buzz'))) return;
    // only the bits poking out under a hat
    if (view === 'front') {
      fillRR(c, -R - 0.4, hy - 2.6, 2, 4, 1, hair, null);
      fillRR(c, R - 1.6, hy - 2.6, 2, 4, 1, hair, null);
    }
    return;
  }
  const top = (yCut) => {
    c.save();
    c.beginPath();
    c.ellipse(0, hy, R + 0.6, R + 1, 0, 0, Math.PI * 2);
    c.clip();
    c.fillStyle = hair;
    c.fillRect(-R - 2, hy - R - 2, R * 2 + 4, yCut);
    c.restore();
  };
  if (view === 'back') {
    switch (style) {
      case 'buzz': top(R * 2 + 3); c.fillStyle = alpha(look.skin, 0.35); c.beginPath(); c.ellipse(0, hy + 1, R, R, 0, 0, Math.PI * 2); c.fill(); break;
      case 'afro': circle(c, 0, hy - 2, R + 3.4, hair); break;
      case 'bun': top(R * 2 + 2); circle(c, 0, hy - R - 1.5, 3.2, hair); break;
      case 'ponytail': top(R * 2 + 2); fillRR(c, -1.6, hy + 2, 3.2, 10, 1.6, hair, null); break;
      case 'braids': top(R * 2 + 2); for (const s of [-2.5, 0, 2.5]) fillRR(c, s - 0.9, hy + 2, 1.8, 11, 0.9, shade(hair, 0.1), null); break;
      case 'curly': for (let k = 0; k < 9; k++) circle(c, Math.cos(k * 0.8) * (R - 1), hy - 1 + Math.sin(k * 0.8) * (R - 1), 2.6, hair); top(R * 2 + 1); break;
      default: top(R * 2 + 2.5);
    }
    return;
  }
  if (view === 'side') {
    switch (style) {
      case 'buzz': top(R * 1.0); break;
      case 'afro': break;
      case 'curly': for (let k = 0; k < 7; k++) circle(c, -2 + Math.cos(k * 0.9) * 4, hy - 4 + Math.sin(k * 0.9) * 2.5, 2.6, hair); break;
      default:
        top(R * 0.95);
        c.save();
        c.beginPath();
        c.ellipse(0, hy, R + 0.6, R + 1, 0, 0, Math.PI * 2);
        c.clip();
        c.fillStyle = hair;
        c.fillRect(-R - 2, hy - R, R + 1.5, R * 1.6);
        c.restore();
    }
    return;
  }
  switch (style) {
    case 'buzz':
      c.save();
      c.beginPath();
      c.ellipse(0, hy, R + 0.4, R + 0.8, 0, 0, Math.PI * 2);
      c.clip();
      c.fillStyle = alpha(hair, 0.75);
      c.fillRect(-R - 2, hy - R - 2, R * 2 + 4, R * 0.75);
      c.restore();
      break;
    case 'afro':
      c.save();
      c.beginPath();
      c.ellipse(0, hy - 2, R + 3.4, R + 3, 0, 0, Math.PI * 2);
      c.ellipse(0, hy + 1.5, R - 0.8, R - 1.4, 0, 0, Math.PI * 2, true);
      c.fillStyle = hair;
      c.fill('evenodd');
      c.restore();
      break;
    case 'curly':
      for (let k = 0; k < 9; k++) circle(c, -R + 1 + k * ((R * 2 - 2) / 8), hy - R + 1.5 + Math.abs(k - 4) * 0.55, 2.4, hair);
      top(R * 0.55);
      break;
    case 'bun':
      top(R * 0.8);
      circle(c, 0, hy - R - 1.8, 3.2, hair);
      break;
    case 'long': case 'braids':
      top(R * 0.85);
      fillRR(c, -R - 0.9, hy - 3, 2.6, style === 'braids' ? 13 : 11, 1.2, hair, null);
      fillRR(c, R - 1.7, hy - 3, 2.6, style === 'braids' ? 13 : 11, 1.2, hair, null);
      break;
    case 'ponytail':
      top(R * 0.8);
      break;
    default:
      top(R * 0.8);
      // fringe edge
      c.save();
      c.beginPath();
      c.ellipse(0, hy, R + 0.6, R + 1, 0, 0, Math.PI * 2);
      c.clip();
      c.fillStyle = hair;
      for (let k = 0; k < 4; k++) {
        c.beginPath();
        c.moveTo(-R + k * 3.4, hy - R * 0.25);
        c.lineTo(-R + k * 3.4 + 3.4, hy - R * 0.25);
        c.lineTo(-R + k * 3.4 + 1.2, hy - R * 0.25 + 1.6);
        c.fill();
      }
      c.restore();
  }
}

// Lying down: on a bed (vertical, head at the top) or on the floor (sideways).
function drawLying(c, look, o, sideways) {
  c.save();
  if (sideways) {
    c.rotate(o.face === 'right' ? Math.PI / 2 : -Math.PI / 2);
    if (o.ko) shadowBlob(c, 0, 0, 7, 22, 0.35);
  }
  // body centred on the spot: shift the standing drawing down by half its height
  c.translate(0, 22);
  const hs = look.height || 1;
  c.scale(hs, hs);
  drawFrontBack(c, look, { ...o, pose: 'stand', moving: false, guard: false, strike: 0, held: null, noShadow: true, sleeping: o.sleeping || o.ko }, false);
  c.restore();
}

// Portrait for dialogs and the people panel.
export function drawPortrait(c, look, size) {
  c.save();
  c.translate(size / 2, size * 0.98);
  const k = size / 30;
  c.scale(k, k);
  c.translate(0, 18);
  drawFrontBack(c, look, { face: 'down', pose: 'stand', t: 0, noShadow: true }, false);
  c.restore();
}
