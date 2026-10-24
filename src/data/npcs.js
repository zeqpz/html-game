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

// ---------------------------------------------------------------- stage 1 cast
const UNIFORM = { top: 'uniform', topColor: '#1f3557', bottom: 'slacks', bottomColor: '#1a2638', shoes: '#111', hat: 'police' };

NPCS.push(
  {
    id: 'tran', name: 'Minh Tran', short: 'Mr. Tran', personality: 'steady', role: 'Owner, Quik Stop',
    look: { skin: '#d8ad84', hair: 'short', hairColor: '#2a2420', glasses: true, top: 'button', topColor: '#7a8c6e', bottom: 'slacks', bottomColor: '#3a3a40', shoes: '#222', build: 'slim', height: 0.95 },
    stats: { strength: 30, agility: 35, intellect: 64, reputation: 60, aim: 15 },
    cash: 220, home: 'home_tran', staffOf: 'quikstop', boss: 'store',
    sched: [['05:50', '23:50', 'work', 'quikstop', 'counter'], ['23:50', '05:50', 'sleep', 'home_tran']],
    favors: ['tran_box'],
  },
  {
    id: 'carmen', name: 'Carmen Alvarez', short: 'Carmen', personality: 'proud', role: 'Teller, Gulf Coast Savings',
    look: { skin: '#c99872', hair: 'long', hairColor: '#24140c', top: 'jacket', topColor: '#2b3a55', top2: '#f2efe8', bottom: 'skirt', bottomColor: '#2b3a55', shoes: '#111', build: 'slim', height: 0.98 },
    stats: { strength: 26, agility: 40, intellect: 70, reputation: 64, aim: 12 },
    cash: 160, home: 'home_carmen', staffOf: 'bank', boss: 'courier',
    sched: [['07:50', '18:00', 'work', 'bank', 'teller'], ['18:00', '19:00', 'eat', 'diner'], ['19:00', '07:50', 'sleep', 'home_carmen']],
    favors: ['carmen_coffee'],
  },
  {
    id: 'patrice', name: 'Patrice Gaines', short: 'Patrice', personality: 'tired', role: "Nurse, St. Ann's",
    look: { skin: '#4a2c1c', hair: 'bun', hairColor: '#120c0a', top: 'button', topColor: '#5fa8a0', bottom: 'slacks', bottomColor: '#5fa8a0', shoes: '#f2f2f2', build: 'avg', height: 0.97 },
    stats: { strength: 34, agility: 38, intellect: 68, reputation: 66, aim: 10 },
    cash: 120, home: 'home_patrice', staffOf: 'hospital', boss: 'orderly',
    sched: [['06:45', '19:15', 'work', 'hospital', 'reception'], ['19:15', '20:15', 'eat', 'diner'], ['20:15', '06:45', 'sleep', 'home_patrice']],
    favors: ['patrice_pie'],
  },
  {
    id: 'kevin', name: 'Kevin Doan', short: 'Kevin', personality: 'steady', role: "Night nurse, St. Ann's",
    look: { skin: '#e0b48c', hair: 'short', hairColor: '#15100c', top: 'button', topColor: '#5f86a8', bottom: 'slacks', bottomColor: '#5f86a8', shoes: '#f2f2f2', build: 'slim', height: 1.02 },
    stats: { strength: 36, agility: 44, intellect: 62, reputation: 52, aim: 10 },
    cash: 90, home: 'home_kevin', staffOf: 'hospital',
    sched: [['19:00', '07:00', 'work', 'hospital', 'reception'], ['07:15', '08:15', 'eat', 'diner'], ['08:15', '19:00', 'sleep', 'home_kevin']],
    favors: [],
  },
  {
    id: 'pruitt', name: 'Ray Pruitt', short: 'Officer Pruitt', personality: 'steady', role: 'Beat cop, 5th Precinct', police: true,
    look: { skin: '#e6b991', hair: 'buzz', hairColor: '#7a5a3a', ...UNIFORM, build: 'heavy', height: 1.04 },
    stats: { strength: 58, agility: 46, intellect: 50, reputation: 60, aim: 62 },
    cash: 70, home: 'home_pruitt',
    sched: [
      ['07:30', '10:00', 'patrol', null, 'beat'],
      ['10:00', '10:40', 'eat', 'diner'],
      ['10:40', '15:00', 'patrol', null, 'beat'],
      ['15:00', '15:30', 'hang', 'precinct'],
      ['15:30', '19:30', 'patrol', null, 'beat'],
      ['19:30', '07:30', 'sleep', 'home_pruitt'],
    ],
    favors: [],
  },
  {
    id: 'ochoa', name: 'Linda Ochoa', short: 'Sgt. Ochoa', personality: 'proud', role: 'Desk sergeant, 5th Precinct', police: true,
    look: { skin: '#b9825a', hair: 'bun', hairColor: '#1c120c', ...UNIFORM, hat: null, build: 'avg', height: 0.98 },
    stats: { strength: 48, agility: 40, intellect: 66, reputation: 72, aim: 70 },
    cash: 90, home: 'home_ochoa', staffOf: 'precinct', boss: 'sweeping',
    sched: [['06:00', '22:00', 'work', 'precinct', 'desk'], ['22:00', '06:00', 'sleep', 'home_ochoa']],
    favors: [],
  },
  {
    id: 'hollis', name: 'Dwayne Hollis', short: 'Officer Hollis', personality: 'volatile', role: 'Night desk, 5th Precinct', police: true,
    look: { skin: '#6a422a', hair: 'bald', hairColor: '#111', beard: 'stubble', ...UNIFORM, hat: null, build: 'muscle', height: 1.05 },
    stats: { strength: 66, agility: 44, intellect: 46, reputation: 55, aim: 58 },
    cash: 60, home: 'home_hollis', staffOf: 'precinct',
    sched: [['22:00', '06:00', 'work', 'precinct', 'desk'], ['06:30', '07:30', 'eat', 'diner'], ['07:30', '22:00', 'sleep', 'home_hollis']],
    favors: [],
  },
  {
    id: 'boudreaux', name: 'Gilbert Boudreaux', short: 'Mr. Boudreaux', personality: 'sly', role: 'Building manager, Bayou Arms',
    look: { skin: '#e2b896', hair: 'short', hairColor: '#9a9590', beard: 'full', top: 'button', topColor: '#c9b48a', bottom: 'slacks', bottomColor: '#5a4a3a', shoes: '#3a2a1e', build: 'heavy', height: 1.0 },
    stats: { strength: 40, agility: 25, intellect: 58, reputation: 50, aim: 20 },
    cash: 400, home: 'home_boudreaux', landlord: 'apt_2b',
    sched: [
      ['09:00', '12:00', 'hang', 'bayou_hall', 'lobby'],
      ['12:00', '13:00', 'eat', 'diner'],
      ['13:00', '17:00', 'hang', 'bayou_hall', 'lobby'],
      ['17:00', '09:00', 'rest', 'home_boudreaux'],
    ],
    favors: ['boudreaux_quiet'],
  },
  {
    id: 'reggie', name: 'Reggie Hall', short: 'Coach Reggie', personality: 'proud', role: 'Front desk, Iron Bayou Gym',
    look: { skin: '#3b2416', hair: 'bald', hairColor: '#111', beard: 'full', top: 'tee', topColor: '#ffd23f', bottom: 'shorts', bottomColor: '#1d1d22', shoes: '#ececec', build: 'muscle', height: 1.03, chain: false },
    stats: { strength: 78, agility: 50, intellect: 48, reputation: 70, aim: 20 },
    cash: 100, home: 'home_reggie', staffOf: 'gym', boss: 'gymdesk',
    sched: [['05:30', '14:00', 'work', 'gym', 'desk'], ['14:00', '15:00', 'eat', 'diner'], ['15:00', '17:00', 'workout', 'gym'], ['17:00', '05:30', 'sleep', 'home_reggie']],
    favors: ['reggie_plates'],
  },
);

// ---------------------------------------------------------------- stage 2 cast
NPCS.push(
  {
    id: 'earl', name: 'Earl Pickens', short: 'Earl', personality: 'steady', role: 'Mechanic, Lone Star Auto',
    look: { skin: '#d9a77c', hair: 'short', hairColor: '#8a7a6a', beard: 'full', hat: 'cap', hatColor: '#2b3a55', top: 'button', topColor: '#3b5a7a', bottom: 'jeans', bottomColor: '#2c3a52', shoes: '#3a2a1e', build: 'heavy', height: 1.02 },
    stats: { strength: 60, agility: 30, intellect: 58, reputation: 62, aim: 35 },
    cash: 300, home: 'home_earl', staffOf: 'garage',
    sched: [['06:50', '19:00', 'work', 'garage', 'counter'], ['19:00', '20:00', 'eat', 'diner'], ['20:00', '06:50', 'sleep', 'home_earl']],
    favors: [],
  },
  {
    id: 'lou', name: 'Lou Marchetti', short: 'Lou', personality: 'volatile', role: 'Foreman, Bayou Warehouse',
    look: { skin: '#e8be96', hair: 'buzz', hairColor: '#3a2a1e', beard: 'stubble', top: 'tee', topColor: '#ff8f00', bottom: 'jeans', bottomColor: '#3b4a6b', shoes: '#5a3a1e', build: 'heavy', height: 1.04 },
    stats: { strength: 70, agility: 34, intellect: 44, reputation: 56, aim: 25 },
    cash: 180, home: 'home_lou', staffOf: 'warehouse', boss: 'warehouse',
    sched: [['05:40', '12:00', 'work', 'warehouse', 'desk'], ['12:00', '12:45', 'hang', 'st_main', 'taco'], ['12:45', '17:00', 'work', 'warehouse', 'desk'], ['17:00', '18:30', 'eat', 'diner'], ['18:30', '05:40', 'sleep', 'home_lou']],
    favors: [],
  },
  {
    id: 'hank', name: 'Hank Dalton', short: 'Hank', personality: 'sly', role: 'Salesman, Big Tex Motors',
    look: { skin: '#f0c49e', hair: 'short', hairColor: '#c9a24a', hat: null, top: 'button', topColor: '#f2efe6', bottom: 'slacks', bottomColor: '#4a3a2a', shoes: '#3a2a1e', build: 'avg', height: 1.0, glasses: false, chain: true },
    stats: { strength: 36, agility: 38, intellect: 60, reputation: 48, aim: 20 },
    cash: 500, home: 'home_hank', staffOf: 'carlot',
    sched: [['08:50', '19:00', 'work', 'carlot', 'desk'], ['19:00', '20:30', 'eat', 'diner'], ['20:30', '08:50', 'sleep', 'home_hank']],
    favors: [],
  },
  {
    id: 'lupe', name: 'Guadalupe "Lupe" Rios', short: 'Lupe', personality: 'steady', role: 'Dispatcher, Bayou City Cabs',
    look: { skin: '#b98a62', hair: 'ponytail', hairColor: '#1c120c', top: 'hoodie', topColor: '#e8b923', bottom: 'jeans', bottomColor: '#2c3a52', shoes: '#f0f0f0', build: 'avg', height: 0.97, glasses: true },
    stats: { strength: 34, agility: 42, intellect: 62, reputation: 58, aim: 18 },
    cash: 150, home: 'home_lupe', staffOf: 'depot', boss: 'taxi',
    sched: [['05:30', '22:30', 'work', 'depot', 'counter'], ['22:30', '05:30', 'sleep', 'home_lupe']],
    favors: [],
  },
  {
    id: 'marisol', name: 'Marisol Vega', short: 'Marisol', personality: 'proud', role: 'Foreman, Canal St job site',
    look: { skin: '#a8754f', hair: 'ponytail', hairColor: '#24140c', hat: 'cap', hatColor: '#ffd23f', top: 'tee', topColor: '#ff8f00', bottom: 'jeans', bottomColor: '#3b4a6b', shoes: '#5a3a1e', build: 'muscle', height: 0.98 },
    stats: { strength: 64, agility: 48, intellect: 56, reputation: 60, aim: 20 },
    cash: 160, home: 'home_marisol', boss: 'daylabor',
    sched: [['06:45', '12:00', 'hang', 'st_canal_main', 'site'], ['12:00', '12:45', 'hang', 'st_main', 'taco'], ['12:45', '16:00', 'hang', 'st_canal_main', 'site'], ['16:00', '06:45', 'sleep', 'home_marisol']],
    favors: [],
  },
  {
    id: 'ray', name: 'Raymond Fontenot', short: 'Old Ray', personality: 'tired', role: 'Retired, fishes the bayou',
    look: { skin: '#6b4229', hair: 'short', hairColor: '#e0ddd5', beard: 'full', hat: 'cap', hatColor: '#3d6b3d', top: 'button', topColor: '#7a8c6e', bottom: 'slacks', bottomColor: '#5a4a3a', shoes: '#3a2a1e', build: 'slim', height: 0.96 },
    stats: { strength: 24, agility: 20, intellect: 60, reputation: 64, aim: 40 },
    cash: 60, home: 'home_ray',
    sched: [['07:30', '11:30', 'hang', 'st_canal_harbor', 'fishing'], ['11:30', '12:30', 'eat', 'diner'], ['12:30', '16:30', 'sit', 'st_pecan', 'park'], ['16:30', '07:30', 'rest', 'home_ray']],
    favors: [],
  },
  {
    id: 'keisha', name: 'Keisha Brown', short: 'Keisha', personality: 'steady', role: 'Nursing student, runner',
    look: { skin: '#5a3825', hair: 'braids', hairColor: '#120c0a', top: 'tank', topColor: '#ff5d8f', bottom: 'shorts', bottomColor: '#1d1d22', shoes: '#f0f0f0', build: 'slim', height: 0.99 },
    stats: { strength: 40, agility: 70, intellect: 62, reputation: 50, aim: 10 },
    cash: 40, home: 'home_keisha',
    sched: [['06:00', '07:30', 'patrol', null, 'jog'], ['07:30', '08:30', 'eat', 'diner'], ['08:30', '16:30', 'rest', 'home_keisha'], ['16:30', '18:30', 'workout', 'gym'], ['18:30', '19:30', 'hang', 'st_canal_harbor', 'court'], ['19:30', '06:00', 'sleep', 'home_keisha']],
    favors: [],
  },
);

// ---------------------------------------------------------------- stage 3 cast
const bandana = (color) => ({ hat: 'cap', hatColor: color });
NPCS.push(
  {
    id: 'tasha', name: 'Tasha Greene', short: 'Tasha', personality: 'sly', role: 'Bartender, Velvet Room',
    look: { skin: '#6a422a', hair: 'afro', hairColor: '#1a120c', top: 'tank', topColor: '#1d1d22', bottom: 'slacks', bottomColor: '#1d1d22', shoes: '#c792ff', build: 'slim', height: 1.0, chain: true },
    stats: { strength: 34, agility: 52, intellect: 60, reputation: 62, aim: 15 },
    cash: 220, home: 'home_tasha', staffOf: 'club',
    sched: [['19:45', '03:00', 'work', 'club', 'bar'], ['03:00', '12:00', 'sleep', 'home_tasha'], ['12:30', '13:30', 'eat', 'diner'], ['13:30', '19:45', 'rest', 'home_tasha']],
    favors: [],
  },
  {
    id: 'dale', name: 'Dale Whitaker', short: 'Dale', personality: 'steady', role: 'Owner, Ranger Arms',
    look: { skin: '#e8c19a', hair: 'short', hairColor: '#7a6a5a', beard: 'full', hat: 'cap', hatColor: '#4a5a3a', top: 'button', topColor: '#6b7a4a', bottom: 'jeans', bottomColor: '#3b4a6b', shoes: '#5a3a1e', build: 'heavy', height: 1.05, glasses: true },
    stats: { strength: 55, agility: 34, intellect: 58, reputation: 60, aim: 85 },
    cash: 400, home: 'home_dale', staffOf: 'gunshop',
    sched: [['09:50', '19:00', 'work', 'gunshop', 'counter'], ['19:00', '20:00', 'eat', 'diner'], ['20:00', '09:50', 'sleep', 'home_dale']],
    favors: [],
  },
  {
    id: 'sal', name: 'Salvatore "Sal" Ruiz', short: 'Sal', personality: 'sly', role: 'Owner, Harbor Pawn & Thrift',
    look: { skin: '#c68a5e', hair: 'bald', hairColor: '#333', beard: 'goatee', top: 'button', topColor: '#7a2f45', bottom: 'slacks', bottomColor: '#2c2c34', shoes: '#1b1b1e', build: 'heavy', height: 0.97, chain: true, glasses: true },
    stats: { strength: 40, agility: 30, intellect: 64, reputation: 50, aim: 30 },
    cash: 900, home: 'home_sal', staffOf: 'pawn',
    sched: [['08:50', '20:00', 'work', 'pawn', 'counter'], ['20:00', '08:50', 'sleep', 'home_sal']],
    favors: [],
  },
  // Cottonmouths
  {
    id: 'snake', name: 'Terrence "Snake" Willis', short: 'Snake', personality: 'proud', role: 'Runs the Cottonmouths', crew: 'cottonmouths',
    look: { skin: '#4a2c1c', hair: 'braids', hairColor: '#120c0a', beard: 'goatee', ...bandana('#3d8b4f'), top: 'hoodie', topColor: '#1d1d22', bottom: 'jeans', bottomColor: '#2c3a52', shoes: '#3d8b4f', build: 'muscle', height: 1.04, chain: true },
    stats: { strength: 70, agility: 60, intellect: 55, reputation: 72, aim: 55 },
    cash: 600, home: 'home_snake',
    sched: [['13:00', '19:00', 'hang', 'st_canal_harbor', 'court'], ['19:00', '20:00', 'eat', 'diner'], ['20:00', '22:30', 'hang', 'st_canal_harbor', 'court'], ['22:30', '02:00', 'hang', 'club', 'floor'], ['02:00', '13:00', 'sleep', 'home_snake']],
    favors: ['snake_package', 'snake_watch'],
  },
  {
    id: 'boo', name: 'Brianna "Boo" Lacour', short: 'Boo', personality: 'sly', role: 'Cottonmouths', crew: 'cottonmouths',
    look: { skin: '#a8754f', hair: 'ponytail', hairColor: '#24140c', ...bandana('#3d8b4f'), top: 'tank', topColor: '#3d8b4f', bottom: 'jeans', bottomColor: '#1f2a44', shoes: '#f0f0f0', build: 'slim', height: 0.98 },
    stats: { strength: 40, agility: 66, intellect: 58, reputation: 50, aim: 45 },
    cash: 200, home: 'home_boo',
    sched: [['12:00', '13:00', 'eat', 'diner'], ['13:00', '22:00', 'hang', 'st_canal_harbor', 'court'], ['22:00', '02:30', 'hang', 'club', 'bar'], ['02:30', '12:00', 'sleep', 'home_boo']],
    favors: [],
    sells: [['cuttings', 25]],
  },
  {
    id: 'lilt', name: 'Tavion "Lil T" James', short: 'Lil T', personality: 'volatile', role: 'Cottonmouths', crew: 'cottonmouths',
    look: { skin: '#3b2416', hair: 'short', hairColor: '#120c0a', ...bandana('#3d8b4f'), top: 'tee', topColor: '#f0f0f0', bottom: 'shorts', bottomColor: '#3d8b4f', shoes: '#1d1d1d', build: 'avg', height: 0.96 },
    stats: { strength: 55, agility: 62, intellect: 38, reputation: 44, aim: 40 },
    cash: 80, home: 'home_lilt',
    sched: [['14:00', '23:00', 'hang', 'st_canal_harbor', 'court'], ['23:00', '01:00', 'hang', 'st_canal_main', 'site'], ['01:00', '14:00', 'sleep', 'home_lilt']],
    favors: [],
  },
  // Canal Kings
  {
    id: 'king', name: 'Andrés "King" Salazar', short: 'King', personality: 'steady', role: 'Runs the Canal Kings', crew: 'canalkings',
    look: { skin: '#b98a62', hair: 'short', hairColor: '#120c0a', beard: 'stubble', ...bandana('#8e5ad1'), top: 'jacket', topColor: '#2a1f33', top2: '#8e5ad1', bottom: 'slacks', bottomColor: '#1d1d22', shoes: '#f0f0f0', build: 'avg', height: 1.02, chain: true },
    stats: { strength: 58, agility: 54, intellect: 70, reputation: 76, aim: 60 },
    cash: 900, home: 'home_king',
    sched: [['12:00', '13:00', 'eat', 'diner'], ['13:00', '20:00', 'hang', 'st_main', 'vacant'], ['20:00', '03:00', 'sit', 'club', 'floor'], ['03:00', '12:00', 'sleep', 'home_king']],
    favors: ['king_collect'],
  },
  {
    id: 'vee', name: 'Vanessa "Vee" Ortiz', short: 'Vee', personality: 'sly', role: 'Canal Kings', crew: 'canalkings',
    look: { skin: '#c99872', hair: 'long', hairColor: '#3b2416', ...bandana('#8e5ad1'), top: 'jacket', topColor: '#8e5ad1', top2: '#1d1d22', bottom: 'jeans', bottomColor: '#1d1d22', shoes: '#1d1d1d', build: 'slim', height: 0.99, glasses: false },
    stats: { strength: 38, agility: 58, intellect: 66, reputation: 58, aim: 40 },
    cash: 700, home: 'home_vee', buyer: true,
    sched: [['13:00', '21:00', 'hang', 'st_main', 'taco'], ['21:00', '03:00', 'hang', 'club', 'bar'], ['03:00', '13:00', 'sleep', 'home_vee']],
    favors: [],
  },
  {
    id: 'dash', name: 'Darius "Dash" Coleman', short: 'Dash', personality: 'volatile', role: 'Canal Kings', crew: 'canalkings',
    look: { skin: '#5a3825', hair: 'buzz', hairColor: '#120c0a', ...bandana('#8e5ad1'), top: 'hoodie', topColor: '#8e5ad1', bottom: 'jeans', bottomColor: '#2c3a52', shoes: '#ffd23f', build: 'muscle', height: 1.03 },
    stats: { strength: 66, agility: 58, intellect: 40, reputation: 50, aim: 48 },
    cash: 120, home: 'home_dash',
    sched: [['14:00', '22:00', 'hang', 'st_main', 'vacant'], ['22:00', '02:00', 'hang', 'club', 'floor'], ['02:00', '14:00', 'sleep', 'home_dash']],
    favors: ['dash_watch'],
  },
);

// Beat routes: [room, x, y, pause seconds].
export const ROUTES = {
  jog: [
    ['st_pecan', 830, 570, 0.2], ['st_main', 300, 570, 0.2], ['st_main', 830, 830, 0.2], ['st_canal_main', 830, 300, 0.2],
    ['st_canal_main', 570, 830, 0.2], ['st_canal_w', 830, 570, 0.2], ['st_canal_w', 570, 300, 0.2], ['st_pecan', 570, 1100, 0.2],
  ],
  beat: [
    ['st_pecan', 830, 570, 6], ['st_pecan', 570, 840, 8], ['st_pecan', 300, 1150, 6], ['st_pecan', 1110, 960, 6],
    ['st_pecan', 1100, 570, 5],
    ['st_main', 300, 570, 6], ['st_main', 900, 830, 6], ['st_main', 250, 1100, 6],
    ['st_harbor', 400, 570, 6], ['st_harbor', 880, 840, 8], ['st_harbor', 270, 1000, 5],
    ['st_main', 700, 830, 5],
  ],
};

// Named loiter areas: [x, y, radius].
export const HANGOUTS = {
  st_pecan: {
    corner: [1010, 572, 46],
    stoop: [250, 506, 40],
    park: [280, 1160, 110],
    lot: [1110, 960, 70],
    bus: [400, 834, 24],
  },
  st_main: {
    taco: [260, 1180, 70],
    bankstep: [1080, 520, 40],
    vacant: [1150, 1150, 90],
    corner: [500, 570, 40],
  },
  st_harbor: {
    bus: [1000, 834, 24],
    steps: [480, 520, 40],
    lot: [300, 1100, 80],
  },
  st_canal_main: { site: [1080, 300, 60] },
  st_canal_harbor: { fishing: [180, 1080, 30], court: [1130, 1080, 110] },
};

// Starting relationships between NPCs (both directions unless noted).
export const NPC_LINKS = [
  ['rosa', 'delphine', 30, 'neighbor'],
  ['rosa', 'dre', 10],
  ['rosa', 'javi', -12],
  ['dre', 'javi', -25, 'rival'],
  ['delphine', 'javi', -8],
  ['delphine', 'boudreaux', 15, 'neighbor'],
  ['tran', 'rosa', 25],
  ['tran', 'javi', -20],
  ['carmen', 'rosa', 20],
  ['patrice', 'kevin', 35],
  ['pruitt', 'ochoa', 30],
  ['pruitt', 'javi', -18],
  ['hollis', 'pruitt', 10],
  ['reggie', 'dre', 40],
  ['reggie', 'javi', -10],
  ['boudreaux', 'javi', -15],
  ['earl', 'lou', 25],
  ['earl', 'ray', 30],
  ['lou', 'marisol', -10],
  ['hank', 'javi', 15],
  ['lupe', 'carmen', 20],
  ['ray', 'delphine', 35],
  ['keisha', 'patrice', 40],
  ['keisha', 'dre', 15],
  ['snake', 'boo', 60, 'crew'], ['snake', 'lilt', 55, 'crew'], ['boo', 'lilt', 45, 'crew'],
  ['king', 'vee', 60, 'crew'], ['king', 'dash', 50, 'crew'], ['vee', 'dash', 40, 'crew'],
  ['snake', 'king', -35, 'rival'], ['lilt', 'dash', -50, 'rival'], ['boo', 'vee', -25],
  ['javi', 'vee', 25], ['javi', 'boo', 15], ['tasha', 'king', 30], ['tasha', 'snake', 10],
  ['pruitt', 'snake', -30], ['pruitt', 'king', -25], ['dre', 'lilt', -20],
];
