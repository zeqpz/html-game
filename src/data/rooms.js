// Rooms and lots. All geometry is data; the sim compiles it into collision,
// doors and nav, and the view paints it. Interior rooms are drawn in
// three-quarter view: a back wall `wallH` tall, then floor down to the front edge.
//
// Prop fields: type (art + defaults), x/y/w/h footprint, use (action id),
// spots (where a body sits/lies/works: x,y pose face, ax/ay = approach point),
// cont (container id suffix), solid (default true).
//
// Street cells are 1400 x 1400 with a four-way intersection in the middle.
// Lots are 540 x 540 and use lot-relative coordinates.

export const CELL = 1400;

export const ROOMS = {
  // ---------------------------------------------------------------- street
  st_pecan: {
    id: 'st_pecan', kind: 'street', name: 'Pecan St & Bayou Rd', grid: [0, 0],
    streets: { h: 'PECAN ST', v: 'BAYOU RD' },
    spawn: 'street',
    lots: {
      nw: {
        kind: 'building', name: 'Bayou Arms', style: 'brick', rect: [30, 60, 470, 400], floors: 2,
        sign: 'BAYOU ARMS', signColor: '#f1e3c2',
        doors: [
          { id: 'bayou_2b', side: 'S', at: 150, to: 'apt_2b', toDoor: 'out', label: 'Bayou Arms · Unit 2B' },
          { id: 'bayou_1a', side: 'S', at: 330, to: 'home_delphine', toDoor: 'door', label: 'Unit 1A', npcOnly: true },
        ],
        feat: [
          { type: 'lawn', x: 30, y: 460, w: 470, h: 80 },
          { type: 'walk', x: 130, y: 460, w: 40, h: 80 },
          { type: 'walk', x: 310, y: 460, w: 40, h: 80 },
          { type: 'shrub', x: 60, y: 500, r: 14 },
          { type: 'shrub', x: 240, y: 498, r: 12 },
          { type: 'shrub', x: 430, y: 502, r: 15 },
          { type: 'mailbox', x: 400, y: 486 },
          { type: 'acunit', x: 0, y: 0, roof: true },
        ],
      },
      ne: {
        kind: 'building', name: 'Starlite Diner', style: 'diner', rect: [50, 150, 440, 320],
        sign: 'STARLITE DINER', signColor: '#ff5d8f', neon: true,
        doors: [{ id: 'diner', side: 'S', at: 210, to: 'diner', toDoor: 'front', label: 'Starlite Diner' }],
        feat: [
          { type: 'alley', x: 0, y: 0, w: 540, h: 150 },
          { type: 'dumpster', x: 410, y: 60 },
          { type: 'planter', x: 70, y: 490 },
          { type: 'planter', x: 400, y: 490 },
          { type: 'newsbox', x: 330, y: 500 },
        ],
      },
      se: {
        kind: 'building', name: 'Iron Bayou Gym', style: 'metal', rect: [60, 180, 430, 330],
        sign: 'IRON BAYOU GYM', signColor: '#ffd23f',
        doors: [{ id: 'gym', side: 'N', at: 200, to: 'gym', toDoor: 'front', label: 'Iron Bayou Gym' }],
        feat: [
          { type: 'parking', x: 20, y: 14, w: 500, h: 150, stalls: 'N' },
          { type: 'car', x: 90, y: 70, rot: 1.5708, color: '#9c2f2f' },
          { type: 'car', x: 400, y: 72, rot: 1.5708, color: '#d8d8d0' },
          { type: 'lamp', x: 250, y: 30 },
        ],
      },
      sw: {
        kind: 'park', name: 'Live Oak Park',
        feat: [
          { type: 'path', pts: [[540, 0], [300, 230], [270, 290], [0, 540]], w: 34 },
          { type: 'path', pts: [[540, 540], [300, 330], [270, 290]], w: 30 },
          { type: 'tree', x: 110, y: 120, r: 74 },
          { type: 'tree', x: 420, y: 150, r: 66 },
          { type: 'tree', x: 120, y: 410, r: 70 },
          { type: 'tree', x: 430, y: 430, r: 62 },
          { type: 'bench', x: 210, y: 236, face: 'down' },
          { type: 'bench', x: 340, y: 360, face: 'up' },
          { type: 'picnic', x: 290, y: 462 },
          { type: 'trash', x: 330, y: 220 },
          { type: 'lamp', x: 250, y: 300 },
        ],
      },
    },
    street: [
      { type: 'lamp', x: 300, y: 590 }, { type: 'lamp', x: 1100, y: 590 },
      { type: 'lamp', x: 300, y: 810 }, { type: 'lamp', x: 1100, y: 810 },
      { type: 'lamp', x: 590, y: 300 }, { type: 'lamp', x: 810, y: 300 },
      { type: 'lamp', x: 590, y: 1100 }, { type: 'lamp', x: 810, y: 1100 },
      { type: 'hydrant', x: 520, y: 590 },
      { type: 'hydrant', x: 880, y: 812 },
      { type: 'trash', x: 980, y: 560 },
      { type: 'busstop', x: 380, y: 814, door: { id: 'bus', to: 'elsewhere', toDoor: 'bus', label: 'Bus stop', npcOnly: true } },
      { type: 'pole', x: 160, y: 590 }, { type: 'pole', x: 1240, y: 590 },
      { type: 'pole', x: 160, y: 810 }, { type: 'pole', x: 1240, y: 810 },
    ],
    itemSpawns: [
      [210, 1080], [380, 1180], [300, 1330], [470, 980], [90, 900],
      [1000, 60], [1300, 100], [700, 530], [480, 560], [1220, 880],
    ],
  },

  // ---------------------------------------------------------------- apartment
  apt_2b: {
    id: 'apt_2b', kind: 'interior', name: 'Unit 2B · Bayou Arms', w: 760, h: 520, wallH: 150,
    look: { floor: 'wood', floorTone: '#8a5b3c', wall: 'paint', wallTone: '#507c78', trim: '#e7dcc6', base: '#3a2a20' },
    home: true, owner: 'p', spawn: 'home',
    windows: [{ x: 310, y: 30, w: 112, h: 80, blinds: true }],
    decor: [
      { type: 'rug', x: 330, y: 226, w: 300, h: 200, tone: '#8d3b3b' },
      { type: 'poster', x: 70, y: 34, w: 56, h: 76, tone: '#d79c3c', art: 'sun' },
      { type: 'clock', x: 486, y: 64 },
      { type: 'shelfwall', x: 560, y: 54, w: 120 },
    ],
    doors: [{ id: 'out', side: 'S', x: 610, w: 70, to: 'st_pecan', toDoor: 'bayou_2b', label: 'Out to Pecan St' }],
    props: [
      { id: 'bed', type: 'bed', x: 28, y: 152, w: 138, h: 116, use: 'sleep', label: 'Bed', spots: [{ x: 97, y: 212, pose: 'lie', face: 'down', ax: 97, ay: 286 }] },
      { id: 'nightstand', type: 'nightstand', x: 172, y: 154, w: 40, h: 34, use: 'radio', label: 'Radio' },
      { id: 'wardrobe', type: 'wardrobe', x: 224, y: 150, w: 66, h: 40, use: 'stash', label: 'Closet', cont: 'stash' },
      { id: 'tv', type: 'tv', x: 440, y: 154, w: 100, h: 30, use: 'tv', label: 'TV' },
      { id: 'sink', type: 'sink', x: 556, y: 152, w: 62, h: 40, use: 'sink', label: 'Sink' },
      { id: 'stove', type: 'stove', x: 618, y: 152, w: 62, h: 40, label: 'Stove' },
      { id: 'fridge', type: 'fridge', x: 684, y: 150, w: 56, h: 44, use: 'fridge', label: 'Fridge', cont: 'fridge' },
      { id: 'couch', type: 'couch', x: 420, y: 338, w: 150, h: 52, use: 'sit', label: 'Couch',
        spots: [{ x: 465, y: 358, pose: 'sit', face: 'up', ax: 465, ay: 412 }, { x: 525, y: 358, pose: 'sit', face: 'up', ax: 525, ay: 412 }] },
      { id: 'lamp', type: 'lamp', x: 592, y: 344, w: 22, h: 18, light: '#ffd9a0' },
      { id: 'table', type: 'table', x: 86, y: 370, w: 84, h: 54 },
      { id: 'chair1', type: 'chair', x: 52, y: 384, w: 26, h: 26, solid: false, use: 'sit', label: 'Chair', spots: [{ x: 65, y: 402, pose: 'sit', face: 'right' }] },
      { id: 'chair2', type: 'chair', x: 178, y: 384, w: 26, h: 26, solid: false, use: 'sit', label: 'Chair', spots: [{ x: 191, y: 402, pose: 'sit', face: 'left' }] },
    ],
    containers: { stash: { w: 6, h: 4 }, fridge: { w: 4, h: 3 } },
    itemSpawns: [[300, 300], [140, 330], [520, 470], [380, 460]],
    startItems: [
      { cont: 'fridge', def: 'water' }, { cont: 'fridge', def: 'kolache' },
      { cont: 'stash', def: 'manual' },
    ],
  },

  // ---------------------------------------------------------------- diner
  diner: {
    id: 'diner', kind: 'interior', name: 'Starlite Diner', w: 900, h: 580, wallH: 160,
    look: { floor: 'checker', floorTone: '#ece4d2', floorTone2: '#2a2a30', wall: 'diner', wallTone: '#a3312c', trim: '#d8dde0', base: '#1d1d22' },
    hours: ['06:00', '23:00'], spawn: 'diner', staff: ['rosa'],
    windows: [{ x: 40, y: 34, w: 180, h: 84, blinds: false }],
    decor: [
      { type: 'menu', x: 372, y: 34, w: 190, h: 74 },
      { type: 'neonclock', x: 600, y: 52 },
      { type: 'restroom', x: 248, y: 64 },
      { type: 'pass', x: 646, y: 50, w: 96, h: 56 },
    ],
    doors: [{ id: 'front', side: 'S', x: 410, w: 80, to: 'st_pecan', toDoor: 'diner', label: 'Out to Pecan St' }],
    props: [
      { id: 'grill', type: 'grill', x: 590, y: 160, w: 150, h: 42, label: 'Grill', staff: { x: 664, y: 222, face: 'up' } },
      { id: 'coffee', type: 'coffeemaker', x: 318, y: 162, w: 62, h: 34, label: 'Coffee' },
      { id: 'counter', type: 'counter', x: 290, y: 244, w: 390, h: 38, use: 'buy', label: 'Counter', staff: { x: 334, y: 230, face: 'down' } },
      { id: 'pass', type: 'passcounter', x: 680, y: 244, w: 40, h: 38, use: 'job', label: 'Order window' },
      { id: 'stool1', type: 'stool', x: 328, y: 292, w: 24, h: 20, solid: false, use: 'sit', label: 'Stool', spots: [{ x: 340, y: 300, pose: 'sit', face: 'up' }] },
      { id: 'stool2', type: 'stool', x: 398, y: 292, w: 24, h: 20, solid: false, use: 'sit', label: 'Stool', spots: [{ x: 410, y: 300, pose: 'sit', face: 'up' }] },
      { id: 'stool3', type: 'stool', x: 468, y: 292, w: 24, h: 20, solid: false, use: 'sit', label: 'Stool', spots: [{ x: 480, y: 300, pose: 'sit', face: 'up' }] },
      { id: 'stool4', type: 'stool', x: 538, y: 292, w: 24, h: 20, solid: false, use: 'sit', label: 'Stool', spots: [{ x: 550, y: 300, pose: 'sit', face: 'up' }] },
      { id: 'stool5', type: 'stool', x: 608, y: 292, w: 24, h: 20, solid: false, use: 'sit', label: 'Stool', spots: [{ x: 620, y: 300, pose: 'sit', face: 'up' }] },
      { id: 'booth1', type: 'booth', x: 34, y: 180, w: 160, h: 82, use: 'sit', label: 'Booth', table: true,
        spots: [{ x: 110, y: 196, pose: 'sit', face: 'down', ax: 210, ay: 196 }, { x: 110, y: 254, pose: 'sit', face: 'up', ax: 210, ay: 254 }] },
      { id: 'booth2', type: 'booth', x: 34, y: 292, w: 160, h: 82, use: 'sit', label: 'Booth', table: true,
        spots: [{ x: 110, y: 308, pose: 'sit', face: 'down', ax: 210, ay: 308 }, { x: 110, y: 366, pose: 'sit', face: 'up', ax: 210, ay: 366 }] },
      { id: 'booth3', type: 'booth', x: 34, y: 404, w: 160, h: 82, use: 'sit', label: 'Booth', table: true,
        spots: [{ x: 110, y: 420, pose: 'sit', face: 'down', ax: 210, ay: 420 }, { x: 110, y: 478, pose: 'sit', face: 'up', ax: 210, ay: 478 }] },
      { id: 'table1', type: 'table4', x: 594, y: 404, w: 84, h: 56, use: 'sit', label: 'Table', table: true,
        spots: [{ x: 578, y: 432, pose: 'sit', face: 'right' }, { x: 694, y: 432, pose: 'sit', face: 'left' }] },
      { id: 'table2', type: 'table4', x: 764, y: 404, w: 84, h: 56, use: 'sit', label: 'Table', table: true,
        spots: [{ x: 748, y: 432, pose: 'sit', face: 'right' }, { x: 864, y: 432, pose: 'sit', face: 'left' }] },
      { id: 'jukebox', type: 'jukebox', x: 826, y: 162, w: 52, h: 40, use: 'jukebox', label: 'Jukebox' },
      { id: 'board', type: 'board', x: 764, y: 156, w: 52, h: 8, solid: false, wall: true, use: 'posting', label: 'Help wanted', job: 'diner' },
    ],
    itemSpawns: [[250, 340], [520, 360], [760, 520], [230, 520]],
  },

  // ---------------------------------------------------------------- gym
  gym: {
    id: 'gym', kind: 'interior', name: 'Iron Bayou Gym', w: 880, h: 560, wallH: 150,
    look: { floor: 'rubber', floorTone: '#34363b', wall: 'block', wallTone: '#5d6f80', trim: '#c9b458', base: '#202227' },
    hours: ['05:00', '23:59'], spawn: 'gym',
    windows: [{ x: 40, y: 26, w: 96, h: 50, blinds: false }],
    decor: [
      { type: 'mirror', x: 300, y: 30, w: 270, h: 100 },
      { type: 'poster', x: 600, y: 36, w: 54, h: 74, tone: '#ffd23f', art: 'fist' },
      { type: 'poster', x: 680, y: 36, w: 54, h: 74, tone: '#c63d3d', art: 'bolt' },
      { type: 'clock', x: 780, y: 60 },
      { type: 'mat', x: 720, y: 200, w: 140, h: 140 },
    ],
    doors: [{ id: 'front', side: 'S', x: 500, w: 80, to: 'st_pecan', toDoor: 'gym', label: 'Out to Pecan St' }],
    props: [
      { id: 'tread1', type: 'treadmill', x: 40, y: 176, w: 52, h: 104, use: 'run', label: 'Treadmill', spots: [{ x: 66, y: 236, pose: 'run', face: 'up', ax: 66, ay: 296 }] },
      { id: 'tread2', type: 'treadmill', x: 108, y: 176, w: 52, h: 104, use: 'run', label: 'Treadmill', spots: [{ x: 134, y: 236, pose: 'run', face: 'up', ax: 134, ay: 296 }] },
      { id: 'bench', type: 'benchpress', x: 300, y: 196, w: 116, h: 54, use: 'lift', label: 'Bench press', spots: [{ x: 352, y: 224, pose: 'lie', face: 'up', ax: 358, ay: 268 }] },
      { id: 'rack', type: 'rack', x: 456, y: 158, w: 92, h: 62, use: 'lift', label: 'Squat rack', spots: [{ x: 502, y: 214, pose: 'lift', face: 'down', ax: 502, ay: 240 }] },
      { id: 'dumbbells', type: 'dumbbells', x: 590, y: 152, w: 110, h: 30, use: 'lift', label: 'Dumbbells',
        spots: [{ x: 620, y: 206, pose: 'curl', face: 'down' }, { x: 676, y: 206, pose: 'curl', face: 'down' }] },
      { id: 'bag', type: 'heavybag', x: 770, y: 222, w: 40, h: 40, use: 'bag', label: 'Heavy bag', spots: [{ x: 790, y: 290, pose: 'bag', face: 'up' }] },
      { id: 'fountain', type: 'fountain', x: 236, y: 152, w: 32, h: 22, use: 'fountain', label: 'Water fountain' },
      { id: 'desk', type: 'desk', x: 610, y: 414, w: 200, h: 46, use: 'desk', label: 'Front desk', staff: { x: 710, y: 402, face: 'down' } },
      { id: 'seat', type: 'gymbench', x: 290, y: 486, w: 160, h: 26, use: 'sit', label: 'Bench',
        spots: [{ x: 336, y: 494, pose: 'sit', face: 'up', ax: 336, ay: 472 }, { x: 404, y: 494, pose: 'sit', face: 'up', ax: 404, ay: 472 }] },
      { id: 'lockers', type: 'lockers', x: 18, y: 330, w: 38, h: 170 },
      { id: 'board', type: 'board', x: 160, y: 150, w: 52, h: 8, solid: false, wall: true, use: 'posting', label: 'Notice board', job: 'gymdesk' },
    ],
    itemSpawns: [[220, 380], [560, 320], [480, 500], [150, 470]],
  },

  // ---------------------------------------------------------------- off-map homes
  // NPC homes that are not visitable yet. They have no geometry; NPCs there are abstract.
  home_delphine: { id: 'home_delphine', kind: 'offmap', name: 'Unit 1A', doors: [{ id: 'door', to: 'st_pecan', toDoor: 'bayou_1a' }] },
  elsewhere: {
    id: 'elsewhere', kind: 'offmap', name: 'Across town',
    doors: [
      { id: 'bus', to: 'st_pecan', toDoor: 'bus' },
      { id: 'rosa', to: 'home_rosa', toDoor: 'door' },
      { id: 'dre', to: 'home_dre', toDoor: 'door' },
      { id: 'javi', to: 'home_javi', toDoor: 'door' },
    ],
  },
  home_rosa: { id: 'home_rosa', kind: 'offmap', name: "Rosa's place", doors: [{ id: 'door', to: 'elsewhere', toDoor: 'rosa' }] },
  home_dre: { id: 'home_dre', kind: 'offmap', name: "Dre's place", doors: [{ id: 'door', to: 'elsewhere', toDoor: 'dre' }] },
  home_javi: { id: 'home_javi', kind: 'offmap', name: "Javi's place", doors: [{ id: 'door', to: 'elsewhere', toDoor: 'javi' }] },
};

// Items placed loose when a new game starts (slice: three on the floor + cash).
export const START_LOOSE = [
  { room: 'st_pecan', def: 'pipe', x: 1270, y: 92 },
  { room: 'st_pecan', def: 'bottle', x: 236, y: 1150 },
  { room: 'apt_2b', def: 'book', x: 300, y: 296 },
  { room: 'st_pecan', def: 'cash', n: 15, x: 400, y: 1290 },
];
