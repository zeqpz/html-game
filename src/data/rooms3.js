// Widening, stage 3: club, gun shop + range, pawn & thrift, storage unit, loft.
// Doors on the stage-2 buildings are added here so the street data stays put.

export const DOORS3 = {
  // street id -> lot key -> doors
  st_canal_main: { nw: [{ id: 'club', side: 'S', at: 210, to: 'club', toDoor: 'out', label: 'Velvet Room' }] },
  st_canal_harbor: {
    nw: [{ id: 'guns', side: 'S', at: 200, to: 'gunshop', toDoor: 'out', label: 'Ranger Arms' }],
    ne: [{ id: 'lofts', side: 'S', at: 230, to: 'loft', toDoor: 'out', label: 'Harbor Lofts · 3C', lease: 'loft' }],
  },
  st_canal_w: { se: [{ id: 'ustor', side: 'S', at: 200, to: 'unit', toDoor: 'out', label: 'U-Stor · Unit 14', lease: 'unit' }] },
  st_harbor: { se: [{ id: 'pawn', side: 'S', at: 210, to: 'pawn', toDoor: 'out', label: 'Harbor Pawn & Thrift' }] },
};

export const ROOMS3 = {
  club: {
    id: 'club', kind: 'interior', name: 'Velvet Room', w: 920, h: 580, wallH: 160,
    look: { floor: 'carpet', floorTone: '#2a1f33', wall: 'paint', wallTone: '#3a2148', trim: '#c792ff', base: '#120a18', club: true },
    hours: ['20:00', '03:00'], spawn: 'diner', staff: ['tasha'], music: true,
    windows: [],
    decor: [
      { type: 'neonsign', x: 330, y: 40, text: 'VELVET ROOM', color: '#c792ff' },
      { type: 'dancefloor', x: 300, y: 300, w: 300, h: 180 },
      { type: 'neonsign', x: 700, y: 60, text: 'H-TOWN', color: '#ff5d8f', small: true },
    ],
    doors: [{ id: 'out', side: 'S', x: 80, w: 80, to: 'st_canal_main', toDoor: 'club', label: 'Out to Canal St' }],
    props: [
      { id: 'bar', type: 'barcounter', x: 620, y: 240, w: 270, h: 40, use: 'buy', label: 'Bar', staff: { x: 755, y: 224, face: 'down' } },
      { id: 'dj', type: 'djbooth', x: 360, y: 170, w: 180, h: 46 },
      { id: 'dance', type: 'dancespot', x: 300, y: 300, w: 300, h: 180, solid: false, use: 'dance', label: 'Dance floor' },
      { id: 'booth1', type: 'booth', x: 34, y: 200, w: 160, h: 82, use: 'sit', label: 'Booth', table: true, velvet: true,
        spots: [{ x: 110, y: 216, pose: 'sit', face: 'down', ax: 210, ay: 216 }, { x: 110, y: 274, pose: 'sit', face: 'up', ax: 210, ay: 274 }] },
      { id: 'booth2', type: 'booth', x: 34, y: 330, w: 160, h: 82, use: 'sit', label: 'Booth', table: true, velvet: true,
        spots: [{ x: 110, y: 346, pose: 'sit', face: 'down', ax: 210, ay: 346 }, { x: 110, y: 404, pose: 'sit', face: 'up', ax: 210, ay: 404 }] },
      { id: 'stool1', type: 'stool', x: 660, y: 290, w: 24, h: 20, solid: false, use: 'sit', label: 'Stool', spots: [{ x: 672, y: 298, pose: 'sit', face: 'up' }] },
      { id: 'stool2', type: 'stool', x: 730, y: 290, w: 24, h: 20, solid: false, use: 'sit', label: 'Stool', spots: [{ x: 742, y: 298, pose: 'sit', face: 'up' }] },
      { id: 'stool3', type: 'stool', x: 800, y: 290, w: 24, h: 20, solid: false, use: 'sit', label: 'Stool', spots: [{ x: 812, y: 298, pose: 'sit', face: 'up' }] },
      { id: 'speaker1', type: 'speaker', x: 290, y: 164, w: 40, h: 40 },
      { id: 'speaker2', type: 'speaker', x: 570, y: 164, w: 40, h: 40 },
    ],
    hangouts: { floor: [450, 390, 110], bar: [740, 330, 60] },
    itemSpawns: [[700, 480], [240, 500], [860, 420]],
  },

  gunshop: {
    id: 'gunshop', kind: 'interior', name: 'Ranger Arms', w: 900, h: 560, wallH: 160,
    look: { floor: 'concrete', floorTone: '#8c877d', wall: 'wood', wallTone: '#5a4632', trim: '#c9a24a', base: '#2a2018' },
    hours: ['10:00', '19:00'], spawn: 'precinct', staff: ['dale'],
    windows: [],
    decor: [
      { type: 'sign', x: 60, y: 30, w: 160, text: 'PERMIT REQUIRED · NO EXCEPTIONS' },
      { type: 'gunrack', x: 260, y: 30, w: 240 },
      { type: 'sign', x: 560, y: 30, w: 120, text: 'RANGE · EARS & EYES' },
    ],
    doors: [{ id: 'out', side: 'S', x: 100, w: 80, to: 'st_canal_harbor', toDoor: 'guns', label: 'Out to Canal St' }],
    props: [
      { id: 'counter', type: 'glasscounter', x: 200, y: 250, w: 280, h: 44, use: 'buy', label: 'Gun counter', staff: { x: 340, y: 234, face: 'down' } },
      { id: 'lane1', type: 'rangelane', x: 560, y: 170, w: 90, h: 300, use: 'range', label: 'Range lane 1', spots: [{ x: 605, y: 440, pose: 'stand', face: 'up' }] },
      { id: 'lane2', type: 'rangelane', x: 670, y: 170, w: 90, h: 300, use: 'range', label: 'Range lane 2', spots: [{ x: 715, y: 440, pose: 'stand', face: 'up' }] },
      { id: 'lane3', type: 'rangelane', x: 780, y: 170, w: 90, h: 300, use: 'range', label: 'Range lane 3', spots: [{ x: 825, y: 440, pose: 'stand', face: 'up' }] },
      { id: 'bench', type: 'bench2', x: 40, y: 430, w: 150, h: 26, use: 'sit', label: 'Bench',
        spots: [{ x: 80, y: 438, pose: 'sit', face: 'up', ax: 80, ay: 414 }, { x: 150, y: 438, pose: 'sit', face: 'up', ax: 150, ay: 414 }] },
    ],
    itemSpawns: [[300, 470]],
  },

  pawn: {
    id: 'pawn', kind: 'interior', name: 'Harbor Pawn & Thrift', w: 820, h: 520, wallH: 150,
    look: { floor: 'wood', floorTone: '#6e4e34', wall: 'paint', wallTone: '#9c8a6a', trim: '#4a3a2a', base: '#2a2018' },
    hours: ['09:00', '20:00'], spawn: 'home', staff: ['sal'],
    windows: [{ x: 540, y: 34, w: 160, h: 80, blinds: false }],
    decor: [
      { type: 'sign', x: 60, y: 30, w: 170, text: 'WE BUY · WE SELL · WE DELIVER' },
      { type: 'shelfwall', x: 260, y: 50, w: 220 },
    ],
    doors: [{ id: 'out', side: 'S', x: 360, w: 80, to: 'st_harbor', toDoor: 'pawn', label: 'Out to Pecan St' }],
    props: [
      { id: 'counter', type: 'glasscounter', x: 470, y: 260, w: 260, h: 44, use: 'pawn', label: 'Counter', staff: { x: 600, y: 244, face: 'down' } },
      { id: 'couchdisp', type: 'couch', x: 60, y: 300, w: 150, h: 52 },
      { id: 'tabledisp', type: 'table', x: 250, y: 330, w: 84, h: 54 },
      { id: 'lampdisp', type: 'lamp', x: 350, y: 300, w: 22, h: 18, light: '#ffd9a0' },
      { id: 'weightsdisp', type: 'homeweights', x: 60, y: 420, w: 110, h: 40 },
      { id: 'tvdisp', type: 'tv', x: 220, y: 160, w: 100, h: 30 },
    ],
    itemSpawns: [[420, 460]],
  },

  unit: {
    id: 'unit', kind: 'interior', name: 'U-Stor · Unit 14', w: 600, h: 420, wallH: 140,
    look: { floor: 'concrete', floorTone: '#8a8780', wall: 'metal', wallTone: '#8d949b', trim: '#ffd23f', base: '#2a2d31' },
    spawn: 'home', lease: 'unit', home: true,
    windows: [],
    decor: [{ type: 'sign', x: 40, y: 30, w: 90, text: 'UNIT 14' }],
    doors: [{ id: 'out', side: 'S', x: 260, w: 80, to: 'st_canal_w', toDoor: 'ustor', label: 'Out to Canal St' }],
    props: [
      { id: 'grow1', type: 'growtable', x: 40, y: 160, w: 140, h: 60, use: 'grow', label: 'Grow table A' },
      { id: 'grow2', type: 'growtable', x: 200, y: 160, w: 140, h: 60, use: 'grow', label: 'Grow table B' },
      { id: 'shelves', type: 'metalshelf', x: 420, y: 150, w: 150, h: 40, use: 'stash', label: 'Shelves', cont: 'shelves' },
      { id: 'sink', type: 'utilitysink', x: 360, y: 150, w: 44, h: 34, use: 'sink', label: 'Utility sink' },
    ],
    containers: { shelves: { w: 7, h: 4 } },
    furnish: true,
    itemSpawns: [],
  },

  loft: {
    id: 'loft', kind: 'interior', name: 'Harbor Lofts · 3C', w: 900, h: 560, wallH: 170,
    look: { floor: 'wood', floorTone: '#a37a52', wall: 'brick', wallTone: '#9a5a44', trim: '#e8e2d4', base: '#3a2a20' },
    spawn: 'home', lease: 'loft', home: true,
    windows: [{ x: 300, y: 30, w: 140, h: 110, blinds: false }, { x: 480, y: 30, w: 140, h: 110, blinds: false }],
    decor: [{ type: 'clock', x: 720, y: 70 }],
    doors: [{ id: 'out', side: 'S', x: 410, w: 80, to: 'st_canal_harbor', toDoor: 'lofts', label: 'Out to Canal St' }],
    props: [
      { id: 'sink', type: 'sink', x: 40, y: 162, w: 62, h: 40, use: 'sink', label: 'Sink' },
      { id: 'stove', type: 'stove', x: 102, y: 162, w: 62, h: 40, label: 'Stove' },
      { id: 'fridge', type: 'fridge', x: 168, y: 160, w: 56, h: 44, use: 'fridge', label: 'Fridge', cont: 'fridge' },
    ],
    containers: { fridge: { w: 4, h: 3 } },
    furnish: true,
    itemSpawns: [],
  },
};

// Staff rooms: a promotion opens the door in the back of your workplace.
const BREAK = {
  diner: { place: 'diner', x: 240, name: 'Starlite · Back office', look: { floor: 'tile', floorTone: '#d8d2c2', wall: 'paint', wallTone: '#b9a27a', trim: '#a3312c', base: '#3a2a20' } },
  store: { place: 'quikstop', x: 300, name: 'Quik Stop · Stockroom office', look: { floor: 'concrete', floorTone: '#a39f96', wall: 'paint', wallTone: '#c9c2a8', trim: '#2c7a4b', base: '#2c7a4b' } },
  warehouse: { place: 'warehouse', x: 620, name: 'Warehouse · Break room', look: { floor: 'speckle', floorTone: '#b8b2a4', wall: 'block', wallTone: '#7c868e', trim: '#ffd23f', base: '#2a2d31' } },
  gymdesk: { place: 'gym', x: 160, name: 'Iron Bayou · Staff room', look: { floor: 'rubber', floorTone: '#3a3d42', wall: 'block', wallTone: '#5d6f80', trim: '#c9b458', base: '#202227' } },
  taxi: { place: 'depot', x: 245, name: 'Bayou City Cabs · Drivers lounge', look: { floor: 'carpet', floorTone: '#4a4f57', wall: 'paint', wallTone: '#d4c27a', trim: '#1d1d1d', base: '#1d1d1d' } },
};

for (const job in BREAK) {
  const B = BREAK[job];
  const id = `break_${job}`;
  ROOMS3[id] = {
    id, kind: 'interior', name: B.name, w: 540, h: 400, wallH: 140, look: B.look, spawn: 'home', staffRoom: job,
    windows: [], decor: [{ type: 'sign', x: 40, y: 30, w: 110, text: 'STAFF ONLY' }, { type: 'clock', x: 420, y: 60 }],
    doors: [{ id: 'out', side: 'S', x: 230, w: 80, to: B.place, toDoor: 'staff', label: 'Back to work' }],
    props: [
      { id: 'cot', type: 'cot', x: 30, y: 150, w: 120, h: 70, use: 'sleep', label: 'Cot', spots: [{ x: 90, y: 182, pose: 'lie', face: 'down', ax: 90, ay: 238 }] },
      { id: 'lockers', type: 'lockers', x: 490, y: 160, w: 38, h: 170, use: 'stash', label: 'Your locker', cont: 'locker' },
      { id: 'coffee', type: 'coffeemaker', x: 300, y: 146, w: 60, h: 30, use: 'freecoffee', label: 'Staff coffee' },
      { id: 'table', type: 'table4', x: 220, y: 260, w: 84, h: 56, use: 'sit', label: 'Table', table: true,
        spots: [{ x: 204, y: 288, pose: 'sit', face: 'right' }, { x: 320, y: 288, pose: 'sit', face: 'left' }] },
    ],
    containers: { locker: { w: 4, h: 3 } },
    itemSpawns: [[400, 330]],
  };
}
export const BREAK_DOORS = Object.fromEntries(Object.entries(BREAK).map(([job, B]) => [B.place, { id: 'staff', side: 'N', x: B.x, w: 56, to: `break_${job}`, toDoor: 'out', label: 'Staff room', plate: 'STAFF', staffJob: job }]));

// Furniture you can buy at the pawn shop and place inside your own lease.
export const FURNITURE = {
  bed: { name: 'Bed', price: 120, w: 130, h: 110, use: 'sleep', spots: [{ dx: 65, dy: 58, pose: 'lie', face: 'down', adx: 65, ady: 130 }] },
  couch: { name: 'Couch', price: 90, w: 150, h: 52, use: 'sit', spots: [{ dx: 45, dy: 20, pose: 'sit', face: 'up', adx: 45, ady: 74 }, { dx: 105, dy: 20, pose: 'sit', face: 'up', adx: 105, ady: 74 }] },
  table: { name: 'Table', price: 40, w: 84, h: 54 },
  homeweights: { name: 'Weight bench', price: 140, w: 110, h: 40, use: 'lift', spots: [{ dx: 55, dy: 60, pose: 'curl', face: 'up', adx: 55, ady: 60 }] },
  shelf: { name: 'Shelf', price: 60, w: 100, h: 34, use: 'stash', cont: { w: 5, h: 3 } },
  lamp: { name: 'Floor lamp', price: 30, w: 22, h: 18, light: '#ffd9a0' },
  plant: { name: 'Potted plant', price: 20, w: 30, h: 26 },
  tv: { name: 'TV', price: 110, w: 100, h: 30, use: 'tv' },
  miner: { name: 'Mining rig', price: 380, w: 60, h: 40, use: 'miner', blurb: 'Hums all day. Earns BayouCoin while the power stays on.' },
};
