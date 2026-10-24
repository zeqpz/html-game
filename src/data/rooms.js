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

import { ROOMS2 } from './rooms2.js';

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
          { id: 'bayou', side: 'S', at: 150, to: 'bayou_hall', toDoor: 'out', label: 'Bayou Arms' },
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
    doors: [{ id: 'out', side: 'S', x: 610, w: 70, to: 'bayou_hall', toDoor: '2B', label: 'Hallway' }],
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
  // Homes of people who live in Bayou Arms open off the hallway.
  home_delphine: { id: 'home_delphine', kind: 'offmap', name: 'Unit 1A', doors: [{ id: 'door', to: 'bayou_hall', toDoor: '1A' }] },
  home_boudreaux: { id: 'home_boudreaux', kind: 'offmap', name: 'Unit 1B', doors: [{ id: 'door', to: 'bayou_hall', toDoor: '1B' }] },
  vacant_2a: { id: 'vacant_2a', kind: 'offmap', name: 'Unit 2A', doors: [{ id: 'door', to: 'bayou_hall', toDoor: '2A' }] },
  // Everyone else rides the bus home. Their homes hang off "elsewhere"
  // (generated in world.js from the cast list).
  elsewhere: {
    id: 'elsewhere', kind: 'offmap', name: 'Across town',
    doors: [
      { id: 'bus', to: 'st_pecan', toDoor: 'bus' },
      { id: 'bus2', to: 'st_harbor', toDoor: 'bus' },
    ],
  },

  // ================================================================ widening, stage 1
  bayou_hall: {
    id: 'bayou_hall', kind: 'interior', name: 'Bayou Arms · Hallway', w: 760, h: 420, wallH: 156,
    look: { floor: 'linoleum', floorTone: '#c9bfa6', floorTone2: '#8f7f62', wall: 'paint', wallTone: '#8fa287', trim: '#ece4cf', base: '#4b3a2a' },
    spawn: 'home',
    windows: [],
    decor: [
      { type: 'mailwall', x: 280, y: 52, w: 64 },
      { type: 'stairs', x: 372, y: 14, w: 104 },
      { type: 'sign', x: 286, y: 30, text: 'QUIET HOURS 12–6 AM', w: 56 },
      { type: 'runner', x: 30, y: 168, w: 700, h: 40, tone: '#6b3b3b' },
    ],
    doors: [
      { id: 'out', side: 'S', x: 340, w: 80, to: 'st_pecan', toDoor: 'bayou', label: 'Out to Pecan St' },
      { id: '1A', side: 'N', x: 54, w: 56, to: 'home_delphine', toDoor: 'door', label: '1A', npcOnly: true, plate: '1A' },
      { id: '1B', side: 'N', x: 176, w: 56, to: 'home_boudreaux', toDoor: 'door', label: '1B · Manager', npcOnly: true, plate: '1B' },
      { id: '2A', side: 'N', x: 518, w: 56, to: 'vacant_2a', toDoor: 'door', label: '2A', npcOnly: true, plate: '2A', vacant: true },
      { id: '2B', side: 'N', x: 646, w: 56, to: 'apt_2b', toDoor: 'out', label: 'Unit 2B · home', plate: '2B', lease: 'apt_2b' },
    ],
    props: [
      { id: 'rentbox', type: 'rentbox', x: 296, y: 150, w: 32, h: 10, solid: false, wall: true, use: 'rent', label: 'Rent drop box' },
      { id: 'bench', type: 'gymbench', x: 40, y: 336, w: 130, h: 24, use: 'sit', label: 'Bench',
        spots: [{ x: 78, y: 344, pose: 'sit', face: 'up', ax: 78, ay: 322 }, { x: 132, y: 344, pose: 'sit', face: 'up', ax: 132, ay: 322 }] },
      { id: 'plant', type: 'plant', x: 690, y: 340, w: 34, h: 30 },
      { id: 'plant2', type: 'plant', x: 250, y: 352, w: 30, h: 26 },
    ],
    hangouts: { lobby: [210, 300, 60] },
    itemSpawns: [[560, 330], [200, 260]],
  },

  quikstop: {
    id: 'quikstop', kind: 'interior', name: 'Quik Stop', w: 780, h: 500, wallH: 150,
    look: { floor: 'tile', floorTone: '#dedcd2', wall: 'paint', wallTone: '#e3dccb', trim: '#2c7a4b', base: '#2c7a4b', stripe: '#2c7a4b' },
    hours: ['06:00', '23:59'], spawn: 'store', staff: ['tran'],
    windows: [{ x: 470, y: 34, w: 150, h: 80, blinds: false }],
    decor: [
      { type: 'storesign', x: 40, y: 30, w: 160, text: 'COLD DRINKS · SNACKS · ICE' },
      { type: 'clock', x: 680, y: 56 },
    ],
    doors: [{ id: 'out', side: 'S', x: 120, w: 80, to: 'st_main', toDoor: 'store', label: 'Out to Pecan St' }],
    props: [
      { id: 'counter', type: 'shopcounter', x: 260, y: 360, w: 200, h: 40, use: 'buy', label: 'Register', staff: { x: 312, y: 344, face: 'down' } },
      { id: 'shelf1', type: 'shelf', x: 230, y: 196, w: 330, h: 34, use: 'job', label: 'Shelf', shelf: true },
      { id: 'shelf2', type: 'shelf', x: 230, y: 276, w: 330, h: 34, use: 'job', label: 'Shelf', shelf: true },
      { id: 'cooler', type: 'cooler', x: 630, y: 150, w: 130, h: 36, use: 'job', label: 'Drink cooler', shelf: true },
      { id: 'magrack', type: 'magrack', x: 30, y: 154, w: 90, h: 30, use: 'job', label: 'Magazine rack', shelf: true },
      { id: 'stock', type: 'staffdoor', x: 140, y: 148, w: 58, h: 8, solid: false, wall: true, use: 'job', label: 'Stockroom' },
      { id: 'icechest', type: 'icechest', x: 660, y: 420, w: 80, h: 40 },
      { id: 'board', type: 'board', x: 220, y: 150, w: 48, h: 8, solid: false, wall: true, use: 'posting', label: 'Help wanted', job: 'store' },
    ],
    itemSpawns: [[620, 360], [180, 440], [600, 250]],
  },

  bank: {
    id: 'bank', kind: 'interior', name: 'Gulf Coast Savings', w: 820, h: 520, wallH: 170,
    look: { floor: 'marble', floorTone: '#ddd6c8', floorTone2: '#b9ae9a', wall: 'wood', wallTone: '#6b4a33', trim: '#d8c08a', base: '#3a2718' },
    hours: ['08:00', '18:00'], spawn: 'bank', staff: ['carmen'],
    windows: [],
    decor: [
      { type: 'vault', x: 30, y: 26, w: 140 },
      { type: 'banksign', x: 300, y: 30, w: 220, text: 'GULF COAST SAVINGS' },
      { type: 'clock', x: 620, y: 66 },
      { type: 'carpet', x: 230, y: 290, w: 360, h: 170, tone: '#2c4a6b' },
    ],
    doors: [{ id: 'out', side: 'S', x: 370, w: 80, to: 'st_main', toDoor: 'bank', label: 'Out to Pecan St' }],
    props: [
      { id: 'teller', type: 'tellercounter', x: 200, y: 232, w: 420, h: 44, use: 'bank', label: 'Teller window', staff: { x: 320, y: 216, face: 'down' } },
      { id: 'rope', type: 'rope', x: 300, y: 320, w: 220, h: 10, solid: false },
      { id: 'chairs', type: 'chairs', x: 40, y: 420, w: 150, h: 26, use: 'sit', label: 'Chairs',
        spots: [{ x: 66, y: 428, pose: 'sit', face: 'up', ax: 66, ay: 404 }, { x: 115, y: 428, pose: 'sit', face: 'up', ax: 115, ay: 404 }, { x: 164, y: 428, pose: 'sit', face: 'up', ax: 164, ay: 404 }] },
      { id: 'plantL', type: 'plant', x: 186, y: 182, w: 30, h: 26 },
      { id: 'plantR', type: 'plant', x: 630, y: 182, w: 30, h: 26 },
      { id: 'desk', type: 'officedesk', x: 640, y: 370, w: 130, h: 50 },
      { id: 'kiosk', type: 'kiosk', x: 720, y: 176, w: 46, h: 30, use: 'terminal', label: 'Market terminal' },
      { id: 'board', type: 'board', x: 220, y: 150, w: 48, h: 8, solid: false, wall: true, use: 'posting', label: 'Notices', job: 'courier' },
    ],
    itemSpawns: [[700, 470], [120, 330]],
  },

  atm: {
    id: 'atm', kind: 'interior', name: 'ATM Alcove', w: 360, h: 320, wallH: 140,
    look: { floor: 'concrete', floorTone: '#8e8b84', wall: 'block', wallTone: '#7c828a', trim: '#3b6fa0', base: '#2a2d31' },
    spawn: 'street',
    windows: [],
    decor: [{ type: 'graffiti', x: 30, y: 40 }, { type: 'sign', x: 250, y: 34, w: 70, text: '24 HR' }],
    doors: [{ id: 'out', side: 'S', x: 140, w: 80, to: 'st_main', toDoor: 'atm', label: 'Out to Pecan St' }],
    props: [{ id: 'atm', type: 'atm', x: 142, y: 136, w: 76, h: 34, use: 'atm', label: 'ATM' }],
    itemSpawns: [[90, 260], [280, 250]],
  },

  hospital: {
    id: 'hospital', kind: 'interior', name: "St. Ann's Hospital · ER", w: 920, h: 560, wallH: 160,
    look: { floor: 'linoleum', floorTone: '#dfe8e4', floorTone2: '#b9cfc8', wall: 'tiled', wallTone: '#c6dce4', trim: '#3b8fb0', base: '#2c5a6b' },
    spawn: 'clinic', staff: ['patrice', 'kevin'],
    arrive: { x: 650, y: 310 },
    windows: [{ x: 300, y: 40, w: 120, h: 70, blinds: true }],
    decor: [
      { type: 'redcross', x: 470, y: 40 },
      { type: 'clock', x: 560, y: 70 },
      { type: 'curtainrail', x: 586, y: 18, w: 320 },
    ],
    doors: [{ id: 'out', side: 'S', x: 420, w: 90, to: 'st_harbor', toDoor: 'hospital', label: 'Out to Harbor Blvd' }],
    props: [
      { id: 'reception', type: 'reception', x: 340, y: 258, w: 210, h: 46, use: 'clinic', label: 'Reception', staff: { x: 446, y: 242, face: 'down' } },
      { id: 'bed1', type: 'hbed', x: 600, y: 164, w: 86, h: 120, use: 'sit', label: 'Bed', bed: true, spots: [{ x: 643, y: 222, pose: 'lie', face: 'down', ax: 643, ay: 300 }] },
      { id: 'bed2', type: 'hbed', x: 706, y: 164, w: 86, h: 120, use: 'sit', label: 'Bed', bed: true, spots: [{ x: 749, y: 222, pose: 'lie', face: 'down', ax: 749, ay: 300 }] },
      { id: 'bed3', type: 'hbed', x: 812, y: 164, w: 86, h: 120, use: 'sit', label: 'Bed', bed: true, spots: [{ x: 855, y: 222, pose: 'lie', face: 'down', ax: 855, ay: 300 }] },
      { id: 'iv1', type: 'ivstand', x: 690, y: 170, w: 12, h: 12 },
      { id: 'iv2', type: 'ivstand', x: 796, y: 170, w: 12, h: 12 },
      { id: 'cabinet', type: 'medcabinet', x: 30, y: 152, w: 96, h: 32 },
      { id: 'vending', type: 'vending', x: 150, y: 154, w: 58, h: 40, use: 'vending', label: 'Vending machine' },
      { id: 'linen', type: 'linencart', x: 236, y: 176, w: 56, h: 34, use: 'job', label: 'Linen cart' },
      { id: 'chairs1', type: 'chairs', x: 60, y: 430, w: 200, h: 26, use: 'sit', label: 'Chairs',
        spots: [{ x: 85, y: 438, pose: 'sit', face: 'up', ax: 85, ay: 414 }, { x: 135, y: 438, pose: 'sit', face: 'up', ax: 135, ay: 414 }, { x: 185, y: 438, pose: 'sit', face: 'up', ax: 185, ay: 414 }, { x: 235, y: 438, pose: 'sit', face: 'up', ax: 235, ay: 414 }] },
      { id: 'plant', type: 'plant', x: 300, y: 440, w: 30, h: 26 },
      { id: 'board', type: 'board', x: 232, y: 150, w: 48, h: 8, solid: false, wall: true, use: 'posting', label: 'Staff notices', job: 'orderly' },
    ],
    itemSpawns: [[560, 470], [120, 330], [780, 400]],
  },

  precinct: {
    id: 'precinct', kind: 'interior', name: '5th Precinct · Front Desk', w: 820, h: 520, wallH: 160,
    look: { floor: 'speckle', floorTone: '#c1bcb0', wall: 'paint', wallTone: '#d9cfa2', trim: '#6b5a43', base: '#3d3326', wainscot: '#8a7a5a' },
    spawn: 'precinct', staff: ['ochoa', 'hollis'],
    arrive: { x: 420, y: 390 },
    windows: [{ x: 640, y: 40, w: 120, h: 70, blinds: true }],
    decor: [
      { type: 'seal', x: 410, y: 70 },
      { type: 'wanted', x: 452, y: 44 },
      { type: 'staffonly', x: 210, y: 50 },
      { type: 'clock', x: 612, y: 70 },
    ],
    doors: [{ id: 'out', side: 'S', x: 370, w: 80, to: 'st_harbor', toDoor: 'precinct', label: 'Out to Harbor Blvd' }],
    props: [
      { id: 'desk', type: 'policedesk', x: 290, y: 240, w: 260, h: 50, use: 'police', label: 'Front desk', staff: { x: 420, y: 224, face: 'down' } },
      { id: 'permits', type: 'permitwindow', x: 610, y: 240, w: 130, h: 46, use: 'license', label: 'Permits window' },
      { id: 'bench1', type: 'bench2', x: 40, y: 410, w: 160, h: 26, use: 'sit', label: 'Bench',
        spots: [{ x: 80, y: 418, pose: 'sit', face: 'up', ax: 80, ay: 394 }, { x: 160, y: 418, pose: 'sit', face: 'up', ax: 160, ay: 394 }] },
      { id: 'bench2', type: 'bench2', x: 620, y: 410, w: 160, h: 26, use: 'sit', label: 'Bench',
        spots: [{ x: 660, y: 418, pose: 'sit', face: 'up', ax: 660, ay: 394 }, { x: 740, y: 418, pose: 'sit', face: 'up', ax: 740, ay: 394 }] },
      { id: 'cooler', type: 'watercooler', x: 150, y: 156, w: 30, h: 26, use: 'fountain', label: 'Water cooler' },
      { id: 'board', type: 'board', x: 100, y: 150, w: 48, h: 8, solid: false, wall: true, use: 'posting', label: 'City jobs', job: 'sweeping' },
    ],
    itemSpawns: [[700, 360], [120, 330]],
  },

  // ---------------------------------------------------------------- streets, stage 1
  st_main: {
    id: 'st_main', kind: 'street', name: 'Pecan St & Main St', grid: [1, 0],
    streets: { h: 'PECAN ST', v: 'MAIN ST' },
    spawn: 'street',
    lots: {
      nw: {
        kind: 'building', name: 'Quik Stop', style: 'store', rect: [60, 200, 400, 270], sign: 'QUIK STOP', signColor: '#7cf29a', neon: true,
        doors: [{ id: 'store', side: 'S', at: 120, to: 'quikstop', toDoor: 'out', label: 'Quik Stop' }],
        feat: [
          { type: 'alley', x: 0, y: 0, w: 540, h: 200 },
          { type: 'dumpster', x: 120, y: 90 },
          { type: 'dumpster', x: 220, y: 90 },
          { type: 'icebox', x: 400, y: 494 },
          { type: 'trash', x: 40, y: 500 },
        ],
      },
      ne: {
        kind: 'building', name: 'Gulf Coast Savings', style: 'bank', rect: [40, 140, 460, 330], sign: 'GULF COAST SAVINGS', signColor: '#e8d9a8',
        doors: [
          { id: 'bank', side: 'S', at: 170, to: 'bank', toDoor: 'out', label: 'Gulf Coast Savings' },
          { id: 'atm', side: 'S', at: 400, to: 'atm', toDoor: 'out', label: 'ATM · 24 hr', plaque: 'ATM' },
        ],
        feat: [
          { type: 'lawn', x: 40, y: 20, w: 460, h: 110 },
          { type: 'shrub', x: 90, y: 70, r: 18 }, { type: 'shrub', x: 250, y: 60, r: 16 }, { type: 'shrub', x: 420, y: 74, r: 18 },
          { type: 'planter', x: 70, y: 500 }, { type: 'planter', x: 300, y: 500 },
        ],
      },
      sw: {
        kind: 'open', name: 'Taco lot',
        feat: [
          { type: 'parking', x: 20, y: 20, w: 500, h: 500, stalls: 'N' },
          { type: 'truck', x: 260, y: 280 },
          { type: 'picnic', x: 140, y: 380 },
          { type: 'picnic', x: 380, y: 400 },
          { type: 'lamp', x: 60, y: 480 },
          { type: 'car', x: 90, y: 72, rot: 1.5708, color: '#3d5a80' },
        ],
      },
      se: {
        kind: 'vacant', name: 'Vacant lot',
        feat: [
          { type: 'fence', pts: [[20, 20], [520, 20], [520, 520], [20, 520], [20, 200]] },
          { type: 'tires', x: 380, y: 360 },
          { type: 'tires', x: 140, y: 150 },
          { type: 'forlease', x: 70, y: 46 },
          { type: 'shrub', x: 300, y: 250, r: 22 }, { type: 'shrub', x: 450, y: 120, r: 18 }, { type: 'shrub', x: 210, y: 430, r: 20 },
          { type: 'tree', x: 440, y: 450, r: 58 },
        ],
      },
    },
    street: [
      { type: 'lamp', x: 300, y: 590 }, { type: 'lamp', x: 1100, y: 590 },
      { type: 'lamp', x: 300, y: 810 }, { type: 'lamp', x: 1100, y: 810 },
      { type: 'lamp', x: 590, y: 300 }, { type: 'lamp', x: 810, y: 1100 },
      { type: 'hydrant', x: 520, y: 812 }, { type: 'newsbox', x: 1240, y: 560 },
      { type: 'trash', x: 460, y: 560 },
      { type: 'pole', x: 160, y: 590 }, { type: 'pole', x: 1240, y: 590 },
      { type: 'pole', x: 160, y: 810 }, { type: 'pole', x: 1240, y: 810 },
    ],
    itemSpawns: [[1100, 1100], [1250, 1300], [940, 1000], [300, 1200], [120, 1000], [200, 60], [460, 120], [700, 1300]],
  },

  st_harbor: {
    id: 'st_harbor', kind: 'street', name: 'Pecan St & Harbor Blvd', grid: [2, 0],
    streets: { h: 'PECAN ST', v: 'HARBOR BLVD' },
    spawn: 'street',
    lots: {
      nw: {
        kind: 'building', name: '5th Precinct', style: 'civic', rect: [40, 120, 440, 350], sign: '5TH PRECINCT', signColor: '#cfe3ff',
        doors: [{ id: 'precinct', side: 'S', at: 220, to: 'precinct', toDoor: 'out', label: '5th Precinct' }],
        feat: [
          { type: 'parking', x: 30, y: 10, w: 470, h: 100, stalls: 'N' },
          { type: 'car', x: 110, y: 58, rot: 1.5708, color: '#e8eaee', police: true },
          { type: 'car', x: 300, y: 58, rot: 1.5708, color: '#e8eaee', police: true },
          { type: 'flagpole', x: 470, y: 500 },
        ],
      },
      ne: {
        kind: 'building', name: "St. Ann's Hospital", style: 'hospital', rect: [30, 60, 480, 410], sign: "ST. ANN'S HOSPITAL", signColor: '#ff6b6b',
        doors: [{ id: 'hospital', side: 'S', at: 240, to: 'hospital', toDoor: 'out', label: "St. Ann's · Emergency" }],
        feat: [{ type: 'planter', x: 90, y: 500 }, { type: 'planter', x: 410, y: 500 }],
      },
      sw: {
        kind: 'open', name: 'Hospital parking',
        feat: [
          { type: 'parking', x: 20, y: 20, w: 500, h: 500, stalls: 'N' },
          { type: 'car', x: 152, y: 72, rot: 1.5708, color: '#c9a227' },
          { type: 'car', x: 338, y: 72, rot: 1.5708, color: '#4a4f57' },
          { type: 'car', x: 90, y: 300, rot: 0, color: '#7a2f45' },
          { type: 'lamp', x: 270, y: 260 },
        ],
      },
      se: {
        kind: 'building', name: 'Harbor Pawn', style: 'brick', rect: [60, 180, 420, 300], sign: 'HARBOR PAWN & LOAN', signColor: '#ffcc66',
        doors: [],
        feat: [{ type: 'forlease', x: 240, y: 120 }, { type: 'alley', x: 0, y: 480, w: 540, h: 60 }],
      },
    },
    street: [
      { type: 'lamp', x: 300, y: 590 }, { type: 'lamp', x: 1100, y: 590 },
      { type: 'lamp', x: 300, y: 810 }, { type: 'lamp', x: 1100, y: 810 },
      { type: 'lamp', x: 810, y: 300 }, { type: 'lamp', x: 590, y: 1100 },
      { type: 'hydrant', x: 880, y: 590 }, { type: 'trash', x: 980, y: 820 },
      { type: 'busstop', x: 1000, y: 814, door: { id: 'bus', to: 'elsewhere', toDoor: 'bus2', label: 'Bus stop', npcOnly: true } },
      { type: 'pole', x: 160, y: 590 }, { type: 'pole', x: 1240, y: 590 },
      { type: 'pole', x: 160, y: 810 }, { type: 'pole', x: 1240, y: 810 },
    ],
    itemSpawns: [[300, 1100], [460, 1300], [1100, 1000], [1300, 1250], [620, 300], [200, 40]],
  },
};

Object.assign(ROOMS, ROOMS2);

// Items placed loose when a new game starts (slice: three on the floor + cash).
export const START_LOOSE = [
  { room: 'st_pecan', def: 'pipe', x: 1270, y: 92 },
  { room: 'st_pecan', def: 'bottle', x: 236, y: 1150 },
  { room: 'apt_2b', def: 'book', x: 300, y: 296 },
  { room: 'st_pecan', def: 'cash', n: 15, x: 400, y: 1290 },
];
