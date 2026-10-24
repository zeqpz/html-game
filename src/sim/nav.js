// A* over a room's walk grid, then string-pulled to a short list of waypoints.

class Heap {
  constructor() {
    this.a = [];
  }
  push(n, f) {
    const a = this.a;
    a.push([f, n]);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p][0] <= a[i][0]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top[1];
  }
  get size() {
    return this.a.length;
  }
}

function nearestOpen(nav, gx, gy) {
  const { gw, gh, grid } = nav;
  if (gx >= 0 && gy >= 0 && gx < gw && gy < gh && grid[gy * gw + gx]) return [gx, gy];
  for (let r = 1; r < 12; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const x = gx + dx;
        const y = gy + dy;
        if (x >= 0 && y >= 0 && x < gw && y < gh && grid[y * gw + x]) return [x, y];
      }
    }
  }
  return null;
}

// With `costCap`, the line also may not cross pricier terrain than its ends
// (keeps people on the sidewalk instead of cutting across the road).
export function lineClear(nav, x0, y0, x1, y1, costCap = false) {
  const { cs, gw, gh, grid, cost } = nav;
  const d = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.ceil(d / (cs * 0.5));
  let cap = Infinity;
  if (costCap) {
    const ci = (x, y) => cost[Math.floor(y / cs) * gw + Math.floor(x / cs)] || 1;
    cap = Math.max(ci(x0, y0), ci(x1, y1)) + 0.01;
  }
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const gx = Math.floor((x0 + (x1 - x0) * t) / cs);
    const gy = Math.floor((y0 + (y1 - y0) * t) / cs);
    if (gx < 0 || gy < 0 || gx >= gw || gy >= gh || !grid[gy * gw + gx]) return false;
    if (cost[gy * gw + gx] > cap) return false;
  }
  return true;
}

export function findPath(nav, sx, sy, tx, ty) {
  const { cs, gw, gh, grid, cost } = nav;
  const s = nearestOpen(nav, Math.floor(sx / cs), Math.floor(sy / cs));
  const t = nearestOpen(nav, Math.floor(tx / cs), Math.floor(ty / cs));
  if (!s || !t) return null;
  const si = s[1] * gw + s[0];
  const ti = t[1] * gw + t[0];
  if (si === ti) return [[tx, ty]];
  const g = new Float32Array(gw * gh).fill(Infinity);
  const from = new Int32Array(gw * gh).fill(-1);
  const closed = new Uint8Array(gw * gh);
  const heap = new Heap();
  g[si] = 0;
  const h = (i) => {
    const dx = Math.abs((i % gw) - t[0]);
    const dy = Math.abs(Math.floor(i / gw) - t[1]);
    return (dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy)) * 1;
  };
  heap.push(si, h(si));
  const N = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
  let found = false;
  let guard = 0;
  while (heap.size && guard++ < 40000) {
    const cur = heap.pop();
    if (cur === ti) {
      found = true;
      break;
    }
    if (closed[cur]) continue;
    closed[cur] = 1;
    const cx = cur % gw;
    const cy = (cur - cx) / gw;
    for (const [dx, dy, w] of N) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
      const ni = ny * gw + nx;
      if (!grid[ni] || closed[ni]) continue;
      if (dx && dy && (!grid[cy * gw + nx] || !grid[ny * gw + cx])) continue; // no corner cutting
      const ng = g[cur] + w * cost[ni];
      if (ng < g[ni]) {
        g[ni] = ng;
        from[ni] = cur;
        heap.push(ni, ng + h(ni));
      }
    }
  }
  if (!found) return null;
  const cells = [];
  for (let i = ti; i !== -1; i = from[i]) cells.push(i);
  cells.reverse();
  const pts = cells.map((i) => [(i % gw) * cs + cs / 2, Math.floor(i / gw) * cs + cs / 2]);
  pts[pts.length - 1] = [tx, ty];
  // string pull
  const out = [];
  let ax = sx;
  let ay = sy;
  let i = 0;
  while (i < pts.length) {
    let j = pts.length - 1;
    while (j > i && !lineClear(nav, ax, ay, pts[j][0], pts[j][1], true)) j--;
    out.push(pts[j]);
    ax = pts[j][0];
    ay = pts[j][1];
    i = j + 1;
  }
  return out;
}
