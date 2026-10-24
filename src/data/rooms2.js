// Widening, stage 2: the Canal St row south of Pecan St, plus the garage,
// warehouse, car lot office and cab depot interiors.

export const ROOMS2 = {
  // ---------------------------------------------------------------- streets
  st_canal_w: {
    id: 'st_canal_w', kind: 'street', name: 'Canal St & Bayou Rd', grid: [0, 1],
    streets: { h: 'CANAL ST', v: 'BAYOU RD' },
    spawn: 'street',
    carSpawn: { stall: { x: 200, y: 470, rot: 1.5708 } },
    lots: {
      nw: {
        kind: 'building', name: 'Lone Star Auto', style: 'garage', rect: [40, 70, 400, 290], sign: 'LONE STAR AUTO', signColor: '#ffb36b',
        doors: [{ id: 'garage', side: 'S', at: 330, to: 'garage', toDoor: 'out', label: 'Lone Star Auto' }],
        rollup: [60, 200],
        feat: [
          { type: 'apron', x: 40, y: 360, w: 400, h: 180 },
          { type: 'tires', x: 470, y: 120 }, { type: 'tires', x: 480, y: 160 },
          { type: 'oilcan', x: 470, y: 230 },
        ],
      },
      ne: {
        kind: 'building', name: 'Bayou Warehouse Co.', style: 'metal', rect: [30, 40, 480, 330], sign: 'BAYOU WAREHOUSE CO.', signColor: '#e8e2d4',
        doors: [{ id: 'warehouse', side: 'S', at: 90, to: 'warehouse', toDoor: 'out', label: 'Bayou Warehouse Co.' }],
        rollup: [220, 360],
        feat: [
          { type: 'apron', x: 0, y: 370, w: 540, h: 170 },
          { type: 'boxtruck', x: 400, y: 450 },
          { type: 'pallets', x: 230, y: 470 },
        ],
      },
      sw: {
        kind: 'building', name: 'Big Tex Motors', style: 'trailer', rect: [360, 330, 150, 110], sign: 'BIG TEX MOTORS', signColor: '#ff5d5d',
        doors: [{ id: 'carlot', side: 'N', at: 75, to: 'carlot', toDoor: 'out', label: 'Big Tex Motors · Sales' }],
        feat: [
          { type: 'parking', x: 20, y: 20, w: 330, h: 500, stalls: 'N' },
          { type: 'apron', x: 350, y: 20, w: 170, h: 300 },
          { type: 'salecar', x: 90, y: 100, rot: 1.5708, color: '#2f4f8a', model: 'sedan' },
          { type: 'salecar', x: 210, y: 100, rot: 1.5708, color: '#5a7a3a', model: 'pickup' },
          { type: 'salecar', x: 300, y: 330, rot: 0, color: '#c62828', model: 'coupe' },
          { type: 'bunting', x: 20, y: 18, w: 500 },
          { type: 'lamp', x: 30, y: 500 },
        ],
      },
      se: {
        kind: 'building', name: 'U-Stor', style: 'metal', rect: [70, 140, 400, 300], sign: 'U-STOR SELF STORAGE', signColor: '#ffd23f',
        doors: [],
        feat: [{ type: 'soon', x: 270, y: 470 }, { type: 'apron', x: 40, y: 20, w: 460, h: 110 }],
      },
    },
    street: [
      { type: 'lamp', x: 300, y: 590 }, { type: 'lamp', x: 1100, y: 590 }, { type: 'lamp', x: 300, y: 810 }, { type: 'lamp', x: 1100, y: 810 },
      { type: 'lamp', x: 590, y: 300 }, { type: 'lamp', x: 810, y: 1100 },
      { type: 'hydrant', x: 520, y: 590 }, { type: 'trash', x: 880, y: 820 },
      { type: 'pole', x: 160, y: 590 }, { type: 'pole', x: 1240, y: 590 }, { type: 'pole', x: 160, y: 810 }, { type: 'pole', x: 1240, y: 810 },
    ],
    itemSpawns: [[480, 300], [1300, 500], [200, 1250], [1200, 1300], [940, 1040], [80, 520]],
  },

  st_canal_main: {
    id: 'st_canal_main', kind: 'street', name: 'Canal St & Main St', grid: [1, 1],
    streets: { h: 'CANAL ST', v: 'MAIN ST' },
    spawn: 'street',
    carSpawn: { cab: { x: 1100, y: 940, rot: 0 } },
    lots: {
      nw: {
        kind: 'building', name: 'Velvet Room', style: 'club', rect: [50, 160, 420, 300], sign: 'VELVET ROOM', signColor: '#c792ff', neon: true,
        doors: [],
        feat: [{ type: 'alley', x: 0, y: 0, w: 540, h: 160 }, { type: 'dumpster', x: 300, y: 80 }, { type: 'soon', x: 260, y: 500 }],
      },
      ne: {
        kind: 'site', name: 'Canal St job site',
        feat: [
          { type: 'fence', pts: [[20, 300], [20, 20], [520, 20], [520, 520], [20, 520], [20, 420]] },
          { type: 'lumber', id: 'lumber1', x: 130, y: 120 },
          { type: 'lumber', id: 'lumber2', x: 130, y: 220 },
          { type: 'frame', id: 'frame', x: 280, y: 140, w: 210, h: 170 },
          { type: 'blocks', id: 'blocks', x: 360, y: 440 },
          { type: 'portapotty', x: 480, y: 470 },
          { type: 'sitesign', x: 120, y: 470 },
        ],
      },
      sw: {
        kind: 'building', name: 'Gas & Go', style: 'store', rect: [330, 380, 180, 130], sign: 'GAS & GO', signColor: '#ffd23f',
        doors: [],
        feat: [
          { type: 'apron', x: 0, y: 0, w: 540, h: 540 },
          { type: 'canopy', x: 90, y: 110, w: 330, h: 190 },
          { type: 'pump', id: 'pump1', x: 180, y: 205 },
          { type: 'pump', id: 'pump2', x: 330, y: 205 },
          { type: 'icebox', x: 300, y: 400 },
        ],
      },
      se: {
        kind: 'building', name: 'Bayou City Cabs', style: 'depot', rect: [60, 230, 400, 240], sign: 'BAYOU CITY CABS', signColor: '#ffd23f',
        doors: [{ id: 'depot', side: 'N', at: 200, to: 'depot', toDoor: 'out', label: 'Bayou City Cabs · Dispatch' }],
        feat: [
          { type: 'parking', x: 20, y: 20, w: 500, h: 180, stalls: 'N' },
          { type: 'car', x: 90, y: 72, rot: 1.5708, color: '#e8b923', cab: true },
          { type: 'car', x: 400, y: 72, rot: 1.5708, color: '#e8b923', cab: true },
        ],
      },
    },
    street: [
      { type: 'lamp', x: 300, y: 590 }, { type: 'lamp', x: 1100, y: 590 }, { type: 'lamp', x: 300, y: 810 }, { type: 'lamp', x: 1100, y: 810 },
      { type: 'lamp', x: 810, y: 300 }, { type: 'lamp', x: 590, y: 1100 },
      { type: 'hydrant', x: 880, y: 590 }, { type: 'newsbox', x: 520, y: 820 },
      { type: 'pole', x: 160, y: 590 }, { type: 'pole', x: 1240, y: 590 }, { type: 'pole', x: 160, y: 810 }, { type: 'pole', x: 1240, y: 810 },
    ],
    hangouts: { site: [1000, 400, 70] },
    itemSpawns: [[200, 60], [480, 120], [1300, 1300], [940, 1000], [100, 1000], [600, 1300]],
  },

  st_canal_harbor: {
    id: 'st_canal_harbor', kind: 'street', name: 'Canal St & Harbor Blvd', grid: [2, 1],
    streets: { h: 'CANAL ST', v: 'HARBOR BLVD' },
    spawn: 'park',
    lots: {
      nw: {
        kind: 'building', name: 'Ranger Arms', style: 'brick', rect: [60, 150, 400, 300], sign: 'RANGER ARMS · RANGE', signColor: '#e8e2d4',
        doors: [],
        feat: [{ type: 'soon', x: 260, y: 500 }],
      },
      ne: {
        kind: 'building', name: 'Harbor Lofts', style: 'lofts', rect: [40, 60, 460, 400], sign: 'HARBOR LOFTS', signColor: '#cfe3ff', floors: 3,
        doors: [],
        feat: [{ type: 'lawn', x: 40, y: 460, w: 460, h: 80 }, { type: 'shrub', x: 90, y: 500, r: 16 }, { type: 'shrub', x: 440, y: 500, r: 16 }, { type: 'soon', x: 260, y: 500 }],
      },
      sw: {
        kind: 'park', name: 'Canal Bayou Trail',
        feat: [
          { type: 'bayou', x: 0, y: 230, w: 540, h: 84, bridge: [230, 300] },
          { type: 'path', pts: [[540, 0], [265, 120], [265, 420], [540, 540]], w: 28 },
          { type: 'tree', x: 90, y: 110, r: 70 },
          { type: 'tree', x: 430, y: 130, r: 60 },
          { type: 'tree', x: 110, y: 430, r: 66 },
          { type: 'tree', x: 440, y: 440, r: 58 },
          { type: 'bench', x: 160, y: 190, face: 'down' },
          { type: 'bench', x: 380, y: 360, face: 'up' },
          { type: 'reeds', x: 60, y: 226 }, { type: 'reeds', x: 470, y: 318 }, { type: 'reeds', x: 330, y: 226 },
          { type: 'lamp', x: 300, y: 100 },
        ],
      },
      se: {
        kind: 'park', name: 'Canal Courts',
        feat: [
          { type: 'court', x: 70, y: 80, w: 400, h: 250 },
          { type: 'hoop', x: 80, y: 205, face: 'right' },
          { type: 'hoop', x: 460, y: 205, face: 'left' },
          { type: 'bench', x: 270, y: 380, face: 'up' },
          { type: 'tree', x: 470, y: 460, r: 58 },
          { type: 'trash', x: 160, y: 380 },
        ],
      },
    },
    street: [
      { type: 'lamp', x: 300, y: 590 }, { type: 'lamp', x: 1100, y: 590 }, { type: 'lamp', x: 300, y: 810 }, { type: 'lamp', x: 1100, y: 810 },
      { type: 'lamp', x: 590, y: 300 }, { type: 'lamp', x: 810, y: 1100 },
      { type: 'hydrant', x: 520, y: 812 },
      { type: 'pole', x: 160, y: 590 }, { type: 'pole', x: 1240, y: 590 }, { type: 'pole', x: 160, y: 810 }, { type: 'pole', x: 1240, y: 810 },
    ],
    itemSpawns: [[140, 980], [420, 1000], [120, 1300], [420, 1320], [1000, 1300], [1300, 1250], [960, 1100]],
  },

  // ---------------------------------------------------------------- interiors
  garage: {
    id: 'garage', kind: 'interior', name: 'Lone Star Auto', w: 900, h: 560, wallH: 160,
    look: { floor: 'concrete', floorTone: '#8b8780', wall: 'block', wallTone: '#6f7a84', trim: '#c9302c', base: '#2a2d31', oil: true },
    hours: ['07:00', '19:00'], spawn: 'garage', staff: ['earl'],
    windows: [{ x: 560, y: 34, w: 110, h: 60, blinds: false }],
    decor: [
      { type: 'pegboard', x: 40, y: 30, w: 220 },
      { type: 'sign', x: 300, y: 30, w: 120, text: 'STATE INSPECTIONS · TIRES · BRAKES' },
      { type: 'clock', x: 720, y: 60 },
      { type: 'stallpaint', x: 120, y: 260, w: 230, h: 250, text: 'STALL 3' },
    ],
    doors: [{ id: 'out', side: 'S', x: 720, w: 80, to: 'st_canal_w', toDoor: 'garage', label: 'Out to Canal St' }],
    props: [
      { id: 'bench', type: 'workbench', x: 40, y: 168, w: 200, h: 40 },
      { id: 'toolbox', type: 'toolbox', x: 270, y: 172, w: 50, h: 34 },
      { id: 'lift', type: 'carlift', x: 420, y: 200, w: 220, h: 240 },
      { id: 'tires', type: 'tirerack', x: 30, y: 300, w: 50, h: 150 },
      { id: 'counter', type: 'shopcounter', x: 680, y: 380, w: 180, h: 42, use: 'garage', label: 'Service counter', plain: true, staff: { x: 770, y: 364, face: 'down' } },
      { id: 'stall', type: 'stallpost', x: 330, y: 470, w: 20, h: 20, use: 'stall', label: 'Stall 3' },
    ],
    itemSpawns: [[700, 260], [380, 500], [100, 500]],
  },

  warehouse: {
    id: 'warehouse', kind: 'interior', name: 'Bayou Warehouse Co.', w: 960, h: 600, wallH: 170,
    look: { floor: 'concrete', floorTone: '#9a968e', wall: 'metal', wallTone: '#8d949b', trim: '#ffd23f', base: '#2a2d31', lanes: true },
    hours: ['05:30', '20:00'], spawn: 'warehouse', staff: ['lou'],
    windows: [{ x: 300, y: 26, w: 300, h: 40, blinds: false }],
    decor: [{ type: 'rollup', x: 690, y: 30, w: 200 }, { type: 'sign', x: 60, y: 30, w: 140, text: 'SAFETY FIRST · 41 DAYS' }],
    doors: [{ id: 'out', side: 'S', x: 110, w: 80, to: 'st_canal_w', toDoor: 'warehouse', label: 'Out to Canal St' }],
    props: [
      { id: 'rackA', type: 'palletrack', x: 40, y: 176, w: 280, h: 48, use: 'job', label: 'Rack A', rack: true },
      { id: 'rackB', type: 'palletrack', x: 340, y: 176, w: 280, h: 48, use: 'job', label: 'Rack B', rack: true },
      { id: 'rackC', type: 'palletrack', x: 160, y: 350, w: 320, h: 48, use: 'job', label: 'Rack C', rack: true },
      { id: 'dock', type: 'pallet', x: 720, y: 196, w: 140, h: 56, use: 'job', label: 'Loading dock' },
      { id: 'wrap', type: 'pallet', x: 560, y: 470, w: 110, h: 50, use: 'job', label: 'Outbound pallet' },
      { id: 'forklift', type: 'forklift', x: 560, y: 300, w: 70, h: 100 },
      { id: 'desk', type: 'officedesk', x: 760, y: 430, w: 150, h: 50, use: 'job', label: 'Foreman desk', staff: { x: 835, y: 414, face: 'down' } },
      { id: 'board', type: 'board', x: 240, y: 168, w: 48, h: 8, solid: false, wall: true, use: 'posting', label: 'Now hiring', job: 'warehouse' },
    ],
    itemSpawns: [[300, 520], [700, 540], [100, 300]],
  },

  carlot: {
    id: 'carlot', kind: 'interior', name: 'Big Tex Motors · Sales', w: 620, h: 430, wallH: 140,
    look: { floor: 'carpet', floorTone: '#5a5f66', wall: 'paint', wallTone: '#cdbf9e', trim: '#8a6a4a', base: '#4a3a2a', panel: true },
    hours: ['09:00', '19:00'], spawn: 'home', staff: ['hank'],
    windows: [{ x: 240, y: 30, w: 140, h: 70, blinds: true }],
    decor: [
      { type: 'poster', x: 60, y: 30, w: 70, h: 80, tone: '#c62828', art: 'car' },
      { type: 'sign', x: 420, y: 40, w: 150, text: '0% DOWN · EVERYBODY RIDES' },
    ],
    doors: [{ id: 'out', side: 'S', x: 270, w: 80, to: 'st_canal_w', toDoor: 'carlot', label: 'Out to the lot' }],
    props: [
      { id: 'desk', type: 'officedesk', x: 220, y: 200, w: 180, h: 54, use: 'dealer', label: 'Sales desk', staff: { x: 310, y: 186, face: 'down' } },
      { id: 'chairs', type: 'chairs', x: 230, y: 300, w: 110, h: 26, use: 'sit', label: 'Chairs',
        spots: [{ x: 258, y: 308, pose: 'sit', face: 'up', ax: 258, ay: 284 }, { x: 310, y: 308, pose: 'sit', face: 'up', ax: 310, ay: 284 }] },
      { id: 'coffee', type: 'coffeemaker', x: 480, y: 146, w: 60, h: 30 },
      { id: 'plant', type: 'plant', x: 540, y: 340, w: 30, h: 26 },
    ],
    itemSpawns: [[500, 360]],
  },

  depot: {
    id: 'depot', kind: 'interior', name: 'Bayou City Cabs · Dispatch', w: 720, h: 460, wallH: 150,
    look: { floor: 'speckle', floorTone: '#b8b2a4', wall: 'paint', wallTone: '#d4c27a', trim: '#1d1d1d', base: '#1d1d1d', checker: true },
    hours: ['05:30', '23:30'], spawn: 'precinct', staff: ['lupe'],
    windows: [{ x: 470, y: 34, w: 140, h: 70, blinds: true }],
    decor: [{ type: 'citymap', x: 60, y: 26, w: 200 }, { type: 'clock', x: 330, y: 60 }],
    doors: [{ id: 'out', side: 'S', x: 320, w: 80, to: 'st_canal_main', toDoor: 'depot', label: 'Out to the cab lot' }],
    props: [
      { id: 'counter', type: 'dispatch', x: 240, y: 220, w: 240, h: 46, use: 'job', label: 'Dispatch', staff: { x: 360, y: 204, face: 'down' } },
      { id: 'lockers', type: 'lockers', x: 20, y: 240, w: 38, h: 170 },
      { id: 'bench', type: 'bench2', x: 520, y: 380, w: 160, h: 26, use: 'sit', label: 'Bench',
        spots: [{ x: 560, y: 388, pose: 'sit', face: 'up', ax: 560, ay: 364 }, { x: 640, y: 388, pose: 'sit', face: 'up', ax: 640, ay: 364 }] },
      { id: 'coffee', type: 'coffeemaker', x: 600, y: 152, w: 60, h: 30 },
      { id: 'board', type: 'board', x: 380, y: 148, w: 48, h: 8, solid: false, wall: true, use: 'posting', label: 'Drivers wanted', job: 'taxi' },
    ],
    itemSpawns: [[150, 380], [600, 300]],
  },
};
