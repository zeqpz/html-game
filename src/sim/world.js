// Compiles room data into runtime geometry: walk bounds, solids, doors,
// interactable props, street features and a nav grid. Pure data in, no DOM.

import { ROOMS, CELL } from '../data/rooms.js';
import { HANGOUTS, NPCS } from '../data/npcs.js';
import { rectHit, pushOut, clamp } from './util.js';

export const ACTOR_R = 9;

const LOT_ORIGIN = { nw: [0, 0], ne: [860, 0], sw: [0, 860], se: [860, 860] };
const LOT = 540;
export const ROAD = { c: 700, half: 100, side: 60 };

function rect(x, y, w, h) {
  return { x, y, w, h };
}

function compileInterior(def) {
  const r = {
    id: def.id, kind: 'interior', def, name: def.name, w: def.w, h: def.h, wallH: def.wallH,
    bounds: rect(16, def.wallH + 4, def.w - 32, def.h - def.wallH - 20),
    solids: [], props: [], doors: [], features: [], lights: [],
    hangouts: { ...(def.hangouts || {}), ...(HANGOUTS[def.id] || {}) },
  };
  for (const p of def.props || []) {
    const prop = { ...p, room: def.id };
    if (prop.solid !== false) r.solids.push(rect(p.x, p.y, p.w, p.h));
    r.props.push(prop);
    if (p.light) r.lights.push({ x: p.x + p.w / 2, y: p.y - 30, r: 170, color: p.light });
  }
  for (const d of def.doors || []) {
    const zone = d.side === 'S'
      ? rect(d.x, def.h - 36, d.w, 22)
      : rect(d.x, def.wallH, d.w, 18);
    const spawn = d.side === 'S'
      ? { x: d.x + d.w / 2, y: def.h - 52 }
      : { x: d.x + d.w / 2, y: def.wallH + 34 };
    r.doors.push({ ...d, room: def.id, zone, spawn });
  }
  return r;
}

// Street cell: roads in a cross, sidewalks, four lots.
function compileStreet(def) {
  const { c, half, side } = ROAD;
  const r = {
    id: def.id, kind: 'street', def, name: def.name, w: CELL, h: CELL, grid: def.grid,
    bounds: rect(0, 0, CELL, CELL), solids: [], props: [], doors: [], features: [], lights: [],
    hangouts: HANGOUTS[def.id] || {},
  };
  const solid = (x, y, w, h, tag) => r.solids.push({ ...rect(x, y, w, h), tag });

  for (const key of ['nw', 'ne', 'sw', 'se']) {
    const lot = def.lots[key];
    if (!lot) continue;
    const [ox, oy] = LOT_ORIGIN[key];
    r.features.push({ type: 'lot', key, kind: lot.kind, x: ox, y: oy, w: LOT, h: LOT, lot });
    if (lot.kind === 'building') {
      const [bx, by, bw, bh] = lot.rect;
      const b = { type: 'building', x: ox + bx, y: oy + by, w: bw, h: bh, lot, key };
      r.features.push(b);
      solid(b.x, b.y, b.w, b.h, 'building');
      for (const d of lot.doors || []) {
        let zone, spawn, dx, dy;
        if (d.side === 'S') { dx = b.x + d.at; dy = b.y + b.h; zone = rect(dx - 20, dy, 40, 16); spawn = { x: dx, y: dy + 30 }; }
        else if (d.side === 'N') { dx = b.x + d.at; dy = b.y; zone = rect(dx - 20, dy - 16, 40, 16); spawn = { x: dx, y: dy - 30 }; }
        else if (d.side === 'E') { dx = b.x + b.w; dy = b.y + d.at; zone = rect(dx, dy - 20, 16, 40); spawn = { x: dx + 30, y: dy }; }
        else { dx = b.x; dy = b.y + d.at; zone = rect(dx - 16, dy - 20, 16, 40); spawn = { x: dx - 30, y: dy }; }
        r.doors.push({ ...d, room: def.id, zone, spawn, at: { x: dx, y: dy }, building: lot.name });
      }
    }
    for (const f of lot.feat || []) addFeature(r, f, ox, oy, solid);
  }
  for (const f of def.street || []) addFeature(r, f, 0, 0, solid);

  // City edge: barricade road arms with no neighbour (all four for now; the
  // city map may remove some once more cells exist).
  r.edges = { n: null, s: null, e: null, w: null };
  return r;
}

function addFeature(r, f, ox, oy, solid) {
  const x = ox + (f.x || 0);
  const y = oy + (f.y || 0);
  const F = { ...f, x, y };
  if (f.pts) F.pts = f.pts.map(([px, py]) => [ox + px, oy + py]);
  switch (f.type) {
    case 'tree': solid(x - 9, y - 6, 18, 12, 'trunk'); break;
    case 'shrub': solid(x - f.r * 0.8, y - f.r * 0.6, f.r * 1.6, f.r * 1.2, 'shrub'); break;
    case 'lamp': case 'pole': solid(x - 4, y - 3, 8, 6, 'pole'); break;
    case 'hydrant': solid(x - 6, y - 5, 12, 10, 'hydrant'); break;
    case 'trash': solid(x - 9, y - 7, 18, 14, 'trash'); break;
    case 'mailbox': solid(x - 16, y - 8, 32, 14, 'mailbox'); break;
    case 'newsbox': solid(x - 10, y - 7, 20, 14, 'newsbox'); break;
    case 'planter': solid(x - 22, y - 14, 44, 28, 'planter'); break;
    case 'dumpster': solid(x - 34, y - 20, 68, 40, 'dumpster'); break;
    case 'car': {
      const horiz = Math.abs(Math.cos(f.rot || 0)) > 0.7;
      if (horiz) solid(x - 46, y - 21, 92, 42, 'car'); else solid(x - 21, y - 46, 42, 92, 'car');
      break;
    }
    case 'bench': {
      solid(x - 30, y - 8, 60, 16, 'bench');
      const sy = f.face === 'down' ? y - 2 : y + 2;
      r.props.push({
        id: `bench_${x}_${y}`, type: 'parkbench', room: r.id, x: x - 30, y: y - 8, w: 60, h: 16, use: 'sit', label: 'Bench',
        spots: [
          { x: x - 14, y: sy, pose: 'sit', face: f.face, ax: x - 14, ay: f.face === 'down' ? y + 22 : y - 22 },
          { x: x + 14, y: sy, pose: 'sit', face: f.face, ax: x + 14, ay: f.face === 'down' ? y + 22 : y - 22 },
        ],
        street: true,
      });
      break;
    }
    case 'picnic': solid(x - 36, y - 20, 72, 40, 'picnic'); break;
    case 'truck': solid(x - 64, y - 26, 128, 52, 'truck'); break;
    case 'boxtruck': solid(x - 80, y - 28, 160, 56, 'truck'); break;
    case 'pallets': solid(x - 40, y - 18, 80, 36, 'pallets'); break;
    case 'oilcan': solid(x - 10, y - 8, 20, 16, 'oilcan'); break;
    case 'portapotty': solid(x - 18, y - 14, 36, 28, 'portapotty'); break;
    case 'hoop': solid(x - 6, y - 6, 12, 12, 'pole'); break;
    case 'salecar': {
      const horiz = Math.abs(Math.cos(f.rot || 0)) > 0.7;
      if (horiz) solid(x - 46, y - 21, 92, 42, 'car'); else solid(x - 21, y - 46, 42, 92, 'car');
      break;
    }
    case 'lumber': case 'blocks': {
      solid(x - 34, y - 16, 68, 32, f.type);
      r.props.push({ id: f.id, type: f.type, room: r.id, x: x - 34, y: y - 16, w: 68, h: 32, use: 'job', label: f.type === 'lumber' ? 'Lumber pile' : 'Cinder blocks', street: true, feature: true });
      break;
    }
    case 'frame': {
      solid(x, y, f.w, f.h, 'frame');
      r.props.push({ id: f.id, type: 'frame', room: r.id, x, y, w: f.w, h: f.h, use: 'job', label: 'House frame', street: true, feature: true });
      break;
    }
    case 'pump': {
      solid(x - 14, y - 10, 28, 20, 'pump');
      r.props.push({ id: f.id, type: 'pump', room: r.id, x: x - 14, y: y - 10, w: 28, h: 20, use: 'fuel', label: 'Gas pump', street: true, feature: true });
      break;
    }
    case 'bayou': {
      // water you can't walk or drive into, with a footbridge gap
      const [b0, b1] = f.bridge || [0, 0];
      if (b0 > 0) solid(x, y, b0, f.h, 'water');
      if (b1 < f.w) solid(x + b1, y, f.w - b1, f.h, 'water');
      if (f.bridge) {
        solid(x + b0 - 4, y - 4, 4, f.h + 8, 'rail');
        solid(x + b1, y - 4, 4, f.h + 8, 'rail');
      }
      break;
    }
    case 'tires': solid(x - 14, y - 10, 28, 20, 'tires'); break;
    case 'icebox': solid(x - 22, y - 12, 44, 24, 'icebox'); break;
    case 'flagpole': solid(x - 3, y - 3, 6, 6, 'pole'); break;
    case 'fence': {
      for (let i = 0; i < f.pts.length - 1; i++) {
        const [ax, ay] = f.pts[i];
        const [bx, by] = f.pts[i + 1];
        const x0 = ox + Math.min(ax, bx);
        const y0 = oy + Math.min(ay, by);
        solid(x0 - 2, y0 - 2, Math.abs(bx - ax) + 4, Math.abs(by - ay) + 4, 'fence');
      }
      break;
    }
    case 'busstop': {
      solid(x - 46, y + 26, 92, 8, 'shelter');
      if (f.door) {
        const zone = rect(x - 18, y + 6, 36, 18);
        r.doors.push({ ...f.door, room: r.id, zone, spawn: { x, y: y + 12 }, at: { x, y } });
      }
      r.props.push({ id: 'busbench', type: 'busbench', room: r.id, x: x - 40, y: y + 16, w: 80, h: 10, solid: false, label: 'Bus stop', street: true });
      break;
    }
    default: break;
  }
  if (f.type === 'lamp') r.lights.push({ x, y: y - 70, r: 190, color: '#ffd59a', street: true });
  r.features.push(F);
}

export class World {
  constructor() {
    this.rooms = {};
    const defs = { ...ROOMS };
    // homes for people who ride the bus: generated, not hand-written
    const elsewhere = { ...defs.elsewhere, doors: [...defs.elsewhere.doors] };
    defs.elsewhere = elsewhere;
    for (const n of NPCS) {
      if (defs[n.home]) continue;
      defs[n.home] = { id: n.home, kind: 'offmap', name: `${n.short}'s place`, doors: [{ id: 'door', to: 'elsewhere', toDoor: n.home }] };
      elsewhere.doors.push({ id: n.home, to: n.home, toDoor: 'door' });
    }
    for (const id in defs) {
      const def = defs[id];
      if (def.kind === 'interior') this.rooms[id] = compileInterior(def);
      else if (def.kind === 'street') this.rooms[id] = compileStreet(def);
      else this.rooms[id] = { id, kind: 'offmap', def, name: def.name, doors: (def.doors || []).map((d) => ({ ...d, room: id })), props: [], solids: [], features: [], lights: [] };
    }
    this.linkStreets();
    this.buildGraph();
    this.navCache = {};
  }

  linkStreets() {
    const byGrid = {};
    for (const id in this.rooms) {
      const r = this.rooms[id];
      if (r.kind === 'street') byGrid[r.grid.join(',')] = r;
    }
    const { c, half, side } = ROAD;
    for (const id in this.rooms) {
      const r = this.rooms[id];
      if (r.kind !== 'street') continue;
      const [gx, gy] = r.grid;
      const nb = { n: byGrid[`${gx},${gy - 1}`], s: byGrid[`${gx},${gy + 1}`], w: byGrid[`${gx - 1},${gy}`], e: byGrid[`${gx + 1},${gy}`] };
      for (const k in nb) r.edges[k] = nb[k] ? nb[k].id : null;
      // Barricades where a road arm hits the city limit.
      const bw = 22;
      if (!nb.w) r.solids.push({ x: 0, y: c - half, w: bw, h: half * 2, tag: 'barricade' });
      if (!nb.e) r.solids.push({ x: CELL - bw, y: c - half, w: bw, h: half * 2, tag: 'barricade' });
      if (!nb.n) r.solids.push({ x: c - half, y: 0, w: half * 2, h: bw, tag: 'barricade' });
      if (!nb.s) r.solids.push({ x: c - half, y: CELL - bw, w: half * 2, h: bw, tag: 'barricade' });
      // Edge doors let the room graph route between neighbouring cells.
      const mid = c;
      if (nb.e) r.doors.push({ id: 'edge_e', room: r.id, to: nb.e.id, toDoor: 'edge_w', edge: 'e', zone: rect(CELL - 4, 0, 8, CELL), spawn: { x: CELL - 30, y: mid - half - side / 2 }, at: { x: CELL, y: mid - half - side / 2 } });
      if (nb.w) r.doors.push({ id: 'edge_w', room: r.id, to: nb.w.id, toDoor: 'edge_e', edge: 'w', zone: rect(-4, 0, 8, CELL), spawn: { x: 30, y: mid - half - side / 2 }, at: { x: 0, y: mid - half - side / 2 } });
      if (nb.s) r.doors.push({ id: 'edge_s', room: r.id, to: nb.s.id, toDoor: 'edge_n', edge: 's', zone: rect(0, CELL - 4, CELL, 8), spawn: { x: mid + half + side / 2, y: CELL - 30 }, at: { x: mid + half + side / 2, y: CELL } });
      if (nb.n) r.doors.push({ id: 'edge_n', room: r.id, to: nb.n.id, toDoor: 'edge_s', edge: 'n', zone: rect(0, -4, CELL, 8), spawn: { x: mid + half + side / 2, y: 30 }, at: { x: mid + half + side / 2, y: 0 } });
    }
  }

  buildGraph() {
    this.adj = {};
    for (const id in this.rooms) {
      this.adj[id] = [];
      for (const d of this.rooms[id].doors) {
        if (this.rooms[d.to]) this.adj[id].push({ to: d.to, door: d });
      }
    }
    // next-hop table via BFS from every room
    this.hop = {};
    for (const src in this.rooms) {
      const prev = { [src]: null };
      const q = [src];
      while (q.length) {
        const cur = q.shift();
        for (const e of this.adj[cur]) {
          if (e.to in prev) continue;
          prev[e.to] = { from: cur, door: e.door };
          q.push(e.to);
        }
      }
      this.hop[src] = {};
      for (const dst in prev) {
        if (dst === src) continue;
        let node = dst;
        let step = prev[node];
        while (step && step.from !== src) {
          node = step.from;
          step = prev[node];
        }
        if (step) this.hop[src][dst] = step.door;
      }
    }
  }

  room(id) {
    return this.rooms[id];
  }

  door(roomId, doorId) {
    return this.rooms[roomId]?.doors.find((d) => d.id === doorId);
  }

  // The door to walk through from `from` to get closer to `to`.
  nextDoor(from, to) {
    return this.hop[from]?.[to] || null;
  }

  hops(from, to) {
    let n = 0;
    let cur = from;
    while (cur !== to && n < 20) {
      const d = this.nextDoor(cur, to);
      if (!d) return 99;
      cur = d.to;
      n++;
    }
    return n;
  }

  // Door into `room` from neighbouring room `from` (where you appear).
  entryDoor(room, from) {
    const r = this.rooms[room];
    return r?.doors.find((d) => d.to === from) || null;
  }

  isOffmap(id) {
    return this.rooms[id]?.kind === 'offmap';
  }

  // Resolve a circle against a room's bounds and solids.
  collide(roomId, p, rad = ACTOR_R, extra = null) {
    const r = this.rooms[roomId];
    if (!r || r.kind === 'offmap') return;
    for (const s of r.solids) pushOut(p, s, rad);
    if (extra) for (const s of extra) pushOut(p, s, rad);
    const b = r.bounds;
    if (r.kind === 'street') {
      // allow leaving through edges that have neighbours; the sim handles the hop
      if (!r.edges.w) p.x = Math.max(b.x + rad, p.x);
      if (!r.edges.e) p.x = Math.min(b.x + b.w - rad, p.x);
      if (!r.edges.n) p.y = Math.max(b.y + rad, p.y);
      if (!r.edges.s) p.y = Math.min(b.y + b.h - rad, p.y);
    } else {
      p.x = clamp(p.x, b.x + rad, b.x + b.w - rad);
      p.y = clamp(p.y, b.y + 2, b.y + b.h - 2);
    }
  }

  walkable(roomId, x, y, rad = ACTOR_R) {
    const r = this.rooms[roomId];
    if (!r || r.kind === 'offmap') return false;
    const b = r.bounds;
    if (x < b.x + rad || x > b.x + b.w - rad || y < b.y || y > b.y + b.h) return false;
    for (const s of r.solids) {
      if (x > s.x - rad && x < s.x + s.w + rad && y > s.y - rad && y < s.y + s.h + rad) {
        // rounded-corner test
        const cx = clamp(x, s.x, s.x + s.w);
        const cy = clamp(y, s.y, s.y + s.h);
        if ((x - cx) ** 2 + (y - cy) ** 2 < rad * rad) return false;
      }
    }
    return true;
  }

  // Grid for A*. Street cells use coarser cells.
  nav(roomId) {
    if (this.navCache[roomId]) return this.navCache[roomId];
    const r = this.rooms[roomId];
    const cs = r.kind === 'street' ? 20 : 12;
    const gw = Math.ceil(r.w / cs);
    const gh = Math.ceil(r.h / cs);
    const grid = new Uint8Array(gw * gh);
    const cost = new Float32Array(gw * gh);
    for (let gy = 0; gy < gh; gy++) {
      for (let gx = 0; gx < gw; gx++) {
        const x = gx * cs + cs / 2;
        const y = gy * cs + cs / 2;
        const ok = this.walkable(roomId, x, y, ACTOR_R + 1);
        grid[gy * gw + gx] = ok ? 1 : 0;
        cost[gy * gw + gx] = ok ? this.terrainCost(r, x, y) : 0;
      }
    }
    const nav = { cs, gw, gh, grid, cost };
    this.navCache[roomId] = nav;
    return nav;
  }

  // Pedestrians prefer sidewalks and paths over the road and grass.
  terrainCost(r, x, y) {
    if (r.kind !== 'street') return 1;
    const { c, half } = ROAD;
    const onRoadH = y > c - half && y < c + half;
    const onRoadV = x > c - half && x < c + half;
    if (onRoadH || onRoadV) {
      // crosswalks are cheap
      const nearX = Math.abs(x - c) < half + 50 && Math.abs(x - c) > half - 10;
      const nearY = Math.abs(y - c) < half + 50 && Math.abs(y - c) > half - 10;
      if ((onRoadH && nearX) || (onRoadV && nearY)) return 1.2;
      return 4;
    }
    return 1.4;
  }

  doorAt(roomId, x, y) {
    const r = this.rooms[roomId];
    if (!r) return null;
    for (const d of r.doors) if (!d.edge && rectHit(d.zone, x, y)) return d;
    return null;
  }

  // Random walkable point in a circle (hangouts) or anywhere in the room.
  randomPoint(roomId, rng, cx, cy, rad) {
    const r = this.rooms[roomId];
    for (let i = 0; i < 30; i++) {
      let x, y;
      if (cx !== undefined) {
        const a = rng.next() * Math.PI * 2;
        const d = Math.sqrt(rng.next()) * rad;
        x = cx + Math.cos(a) * d;
        y = cy + Math.sin(a) * d;
      } else {
        x = r.bounds.x + rng.next() * r.bounds.w;
        y = r.bounds.y + rng.next() * r.bounds.h;
      }
      if (this.walkable(roomId, x, y, ACTOR_R + 2) && !this.doorAt(roomId, x, y)) return { x, y };
    }
    return { x: cx ?? r.w / 2, y: cy ?? r.h / 2 };
  }

  prop(roomId, propId) {
    return this.rooms[roomId]?.props.find((p) => p.id === propId) || null;
  }
}
