// The persistent cast. Schedules are [from, to, act, room, target?].
// Acts: work, sleep, rest, eat, hang, sit, workout. `target` names a prop or a
// street hangout (see HANGOUTS).

export const NPCS = [
  {
    id: 'rosa', name: 'Rosa Delgado', short: 'Rosa', personality: 'steady', role: 'Owner, Starlite Diner',
    look: { skin: '#c68a5e', hair: 'bun', hairColor: '#2b1a12', top: 'apron', topColor: '#f3eee4', top2: '#3b6fa0', bottom: 'slacks', bottomColor: '#2c2c34', shoes: '#1b1b1e', build: 'avg', height: 0.96 },
    stats: { strength: 38, agility: 34, intellect: 58, reputation: 62, aim: 10 },
    cash: 140, home: 'home_rosa', hangout: 'diner', staffOf: 'diner', boss: 'diner',
    sched: [
      ['05:40', '21:40', 'work', 'diner', 'counter'],
      ['21:40', '05:40', 'sleep', 'home_rosa'],
    ],
    favors: [],
  },
  {
    id: 'dre', name: 'Andre "Dre" Wallace', short: 'Dre', personality: 'proud', role: 'Gym regular',
    look: { skin: '#5a3825', hair: 'buzz', hairColor: '#120c0a', beard: 'goatee', top: 'tank', topColor: '#e9e9e4', bottom: 'shorts', bottomColor: '#1f2a44', shoes: '#d8d8d8', build: 'muscle', height: 1.06, chain: true },
    stats: { strength: 72, agility: 55, intellect: 44, reputation: 58, aim: 22 },
    cash: 60, home: 'home_dre', hangout: 'gym',
    sched: [
      ['06:00', '08:30', 'workout', 'gym'],
      ['08:30', '09:30', 'eat', 'diner'],
      ['09:30', '12:00', 'hang', 'st_pecan', 'corner'],
      ['12:00', '14:30', 'hang', 'st_pecan', 'lot'],
      ['14:30', '15:30', 'eat', 'diner'],
      ['15:30', '19:00', 'workout', 'gym'],
      ['19:00', '23:30', 'hang', 'st_pecan', 'corner'],
      ['23:30', '06:00', 'sleep', 'home_dre'],
    ],
    favors: ['dre_water'],
  },
  {
    id: 'delphine', name: 'Delphine Okoro', short: 'Ms. Okoro', personality: 'tired', role: 'Neighbor, Unit 1A',
    look: { skin: '#3d2618', hair: 'curly', hairColor: '#bdbab4', glasses: true, top: 'cardigan', topColor: '#7a5c8e', top2: '#e8dfcf', bottom: 'skirt', bottomColor: '#4a4a52', shoes: '#4b3226', build: 'slim', height: 0.93 },
    stats: { strength: 18, agility: 22, intellect: 66, reputation: 50, aim: 5 },
    cash: 80, home: 'home_delphine', hangout: 'st_pecan', neighbor: true,
    sched: [
      ['07:00', '08:30', 'eat', 'diner'],
      ['08:30', '09:30', 'hang', 'st_pecan', 'stoop'],
      ['09:30', '13:00', 'rest', 'home_delphine'],
      ['13:00', '16:00', 'sit', 'st_pecan', 'park'],
      ['16:00', '17:00', 'eat', 'diner'],
      ['17:00', '21:00', 'rest', 'home_delphine'],
      ['21:00', '07:00', 'sleep', 'home_delphine'],
    ],
    favors: ['delphine_plate', 'delphine_quiet'],
  },
  {
    id: 'javi', name: 'Javier "Javi" Reyes', short: 'Javi', personality: 'sly', role: 'Corner regular',
    look: { skin: '#a8754f', hair: 'short', hairColor: '#1a120d', hat: 'cap', hatColor: '#b8312f', beard: 'stubble', top: 'hoodie', topColor: '#2f4f3a', bottom: 'jeans', bottomColor: '#3b4a6b', shoes: '#f0f0f0', build: 'slim', height: 1.0 },
    stats: { strength: 42, agility: 64, intellect: 52, reputation: 36, aim: 30 },
    cash: 45, home: 'home_javi', hangout: 'st_pecan',
    sched: [
      ['02:00', '10:00', 'sleep', 'home_javi'],
      ['10:00', '12:30', 'hang', 'st_pecan', 'corner'],
      ['12:30', '13:30', 'eat', 'diner'],
      ['13:30', '17:30', 'hang', 'st_pecan', 'park'],
      ['17:30', '19:00', 'workout', 'gym'],
      ['19:00', '02:00', 'hang', 'st_pecan', 'lot'],
    ],
    favors: ['javi_phone'],
    sells: [['soda', 3], ['snack', 3], ['flashlight', 15]],
  },
];

// Named loiter areas on street cells: [x, y, radius].
export const HANGOUTS = {
  st_pecan: {
    corner: [1010, 572, 46],
    stoop: [250, 506, 40],
    park: [280, 1160, 110],
    lot: [1110, 960, 70],
    bus: [400, 834, 24],
  },
};

// Starting relationships between NPCs (both directions unless noted).
export const NPC_LINKS = [
  ['rosa', 'delphine', 30, 'neighbor'],
  ['rosa', 'dre', 10],
  ['rosa', 'javi', -12],
  ['dre', 'javi', -25, 'rival'],
  ['delphine', 'javi', -8],
];
