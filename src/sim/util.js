// Small math and time helpers shared by the simulation and the view.

export const DAY = 1440; // game minutes in a day

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
export const sign = (v) => (v < 0 ? -1 : v > 0 ? 1 : 0);

export function angDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function approach(v, target, step) {
  if (v < target) return Math.min(target, v + step);
  return Math.max(target, v - step);
}

// "06:30" -> 390
export function hm(s) {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + (m || 0);
}

export const tod = (t) => ((t % DAY) + DAY) % DAY;
export const dayOf = (t) => Math.floor(t / DAY);

// True when time-of-day m is inside [from, to), wrapping past midnight.
export function inWindow(m, from, to) {
  return from <= to ? m >= from && m < to : m >= from || m < to;
}

export function clock12(t) {
  const m = Math.floor(tod(t));
  let h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${mm} ${ap}`;
}

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// Day 1 is a Monday.
export const weekday = (t) => WEEKDAYS[(dayOf(t) + 6) % 7];

// Plain-language "how long ago" used by memory quotes.
export function agoText(now, then) {
  const d = now - then;
  if (d < 60) return 'just now';
  if (d < 240) return 'earlier';
  if (dayOf(now) === dayOf(then)) return 'today';
  if (dayOf(now) - dayOf(then) === 1) return 'yesterday';
  if (dayOf(now) - dayOf(then) < 7) return `on ${weekday(then)}`;
  return 'a while back';
}

export function rectHit(r, x, y) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function rectDist(r, x, y) {
  const cx = clamp(x, r.x, r.x + r.w);
  const cy = clamp(y, r.y, r.y + r.h);
  return Math.hypot(x - cx, y - cy);
}

// Push a circle out of an axis-aligned rect. Returns true if moved.
export function pushOut(p, r, rad) {
  const cx = clamp(p.x, r.x, r.x + r.w);
  const cy = clamp(p.y, r.y, r.y + r.h);
  let dx = p.x - cx;
  let dy = p.y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= rad * rad) return false;
  if (d2 > 1e-6) {
    const d = Math.sqrt(d2);
    p.x = cx + (dx / d) * rad;
    p.y = cy + (dy / d) * rad;
    return true;
  }
  // centre inside the rect: leave by the nearest edge
  const l = p.x - r.x, rr = r.x + r.w - p.x, t = p.y - r.y, b = r.y + r.h - p.y;
  const m = Math.min(l, rr, t, b);
  if (m === l) p.x = r.x - rad;
  else if (m === rr) p.x = r.x + r.w + rad;
  else if (m === t) p.y = r.y - rad;
  else p.y = r.y + r.h + rad;
  return true;
}

export function money(n) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
