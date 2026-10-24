// Jobs (places you walk into and apply at) and favors (asked for by people).
//
// Job tasks are generated from `tasks` (weighted):
//   carry: pick up at `from` (a prop id, or a floor spot with fromSpot) and drop at `to`
//   hold:  stand at a prop and work it for `dur` seconds
//   spot:  work a marked spot on the floor (spill, litter) for `dur` seconds
// Targets: a prop id list, { tag } = props with that flag, or { list: [[room, prop, label]] } across town.

export const JOBS = {
  diner: {
    id: 'diner', place: 'diner', title: 'Diner shift', boss: 'rosa', floor: {},
    ranks: [
      { title: 'Server', pay: 42, tasks: 6 },
      { title: 'Shift lead', pay: 64, tasks: 7, floor: { intellect: 35, reputation: 40 }, hours: 20 },
    ],
    hours: 4, clockIn: ['06:30', '18:30'], closeBy: '22:00',
    tasks: [
      { w: 3, kind: 'carry', from: 'pass', to: { tag: 'table' }, item: 'plate', pick: 'Pick up the order for {to}', drop: 'Serve {to}' },
      { w: 2, kind: 'hold', at: { tag: 'table' }, dur: 2.2, label: 'Wipe down {to}' },
      { w: 1, kind: 'spot', dur: 3, label: 'Mop up the spill', mark: 'spill' },
    ],
    posting: 'Now hiring: servers. No experience needed. $42 per shift, paid on the spot. Ask Rosa.',
  },
  store: {
    id: 'store', place: 'quikstop', title: 'Store clerk', boss: 'tran', floor: {},
    ranks: [
      { title: 'Clerk', pay: 38, tasks: 6 },
      { title: 'Assistant manager', pay: 58, tasks: 7, floor: { intellect: 42 }, hours: 24 },
    ],
    hours: 4, clockIn: ['06:00', '19:00'], closeBy: '23:30',
    tasks: [
      { w: 3, kind: 'carry', from: 'stock', to: { tag: 'shelf' }, item: 'box', pick: 'Grab a box from the stockroom', drop: 'Restock the {to}' },
      { w: 2, kind: 'hold', at: ['counter'], dur: 2.5, label: 'Ring up a customer' },
      { w: 1, kind: 'spot', dur: 2.6, label: 'Sweep up by the door', mark: 'litter' },
    ],
    posting: 'Clerk wanted. Stock shelves, work the register, keep it clean. $38 a shift. See Mr. Tran.',
  },
  orderly: {
    id: 'orderly', place: 'hospital', title: 'Hospital orderly', boss: 'patrice', floor: { intellect: 25 },
    ranks: [
      { title: 'Orderly', pay: 46, tasks: 6 },
      { title: 'Senior orderly', pay: 66, tasks: 7, floor: { intellect: 45, strength: 35 }, hours: 24 },
    ],
    hours: 4, clockIn: ['07:00', '17:00'], closeBy: '21:00',
    tasks: [
      { w: 3, kind: 'carry', from: 'linen', to: { tag: 'bed' }, item: 'linen', pick: 'Grab clean linens from the cart', drop: 'Change the sheets on {to}' },
      { w: 2, kind: 'hold', at: { tag: 'bed' }, dur: 2.4, label: 'Sanitize {to}' },
      { w: 1, kind: 'spot', dur: 3, label: 'Mop the ER floor', mark: 'spill' },
    ],
    posting: "Orderlies needed, day shift. Basic reading required. $46 a shift. Talk to Patrice at reception.",
  },
  courier: {
    id: 'courier', place: 'bank', title: 'Bank courier', boss: 'carmen', floor: { intellect: 38, reputation: 30 }, roam: true,
    ranks: [
      { title: 'Courier', pay: 55, tasks: 3 },
      { title: 'Senior courier', pay: 80, tasks: 4, floor: { intellect: 50, reputation: 45 }, hours: 20 },
    ],
    hours: 4, clockIn: ['08:30', '15:00'], closeBy: '18:00',
    tasks: [
      { w: 1, kind: 'carry', from: 'teller', item: 'envelope', pick: 'Pick up an envelope at the teller window', drop: 'Deliver the envelope to {to}',
        to: { list: [['quikstop', 'counter', 'the Quik Stop'], ['hospital', 'reception', "St. Ann's reception"], ['precinct', 'desk', 'the precinct desk'], ['diner', 'counter', 'the Starlite counter']] } },
    ],
    posting: 'Bank courier (on foot). Deliver sealed envelopes around the neighborhood. Must read well and be trusted around here. $55 a shift.',
  },
  sweeping: {
    id: 'sweeping', place: 'precinct', title: 'Street sweeping', boss: 'ochoa', floor: {}, roam: true, gear: 'broom',
    ranks: [
      { title: 'Sweeper', pay: 36, tasks: 6 },
      { title: 'Crew lead', pay: 52, tasks: 7, floor: { agility: 35 }, hours: 20 },
    ],
    hours: 4, clockIn: ['06:00', '16:00'], closeBy: '20:00',
    tasks: [{ w: 1, kind: 'spot', rooms: ['st_pecan', 'st_main', 'st_harbor'], need: 'broom', dur: 2.4, label: 'Sweep litter on {room}', mark: 'litter' }],
    posting: 'CITY OF HARBOR — street sweeping, day labor. Broom provided. $36 a shift. Sign up with the desk sergeant.',
  },
  gymdesk: {
    id: 'gymdesk', place: 'gym', title: 'Gym desk', boss: 'reggie', floor: { strength: 35 },
    ranks: [
      { title: 'Desk attendant', pay: 40, tasks: 6 },
      { title: 'Floor manager', pay: 60, tasks: 7, floor: { strength: 50, reputation: 40 }, hours: 20 },
    ],
    hours: 4, clockIn: ['06:00', '16:00'], closeBy: '21:00',
    tasks: [
      { w: 2, kind: 'carry', fromSpot: true, item: 'plates', to: ['rack', 'dumbbells'], pick: 'Pick up the plate left on the floor', drop: 'Re-rack it at the {to}', mark: 'plate' },
      { w: 2, kind: 'hold', at: ['bench', 'tread1', 'tread2', 'seat'], dur: 2.2, label: 'Wipe down the {to}' },
      { w: 2, kind: 'hold', at: ['desk'], dur: 2.5, label: 'Check in a member at the desk' },
    ],
    posting: 'Desk help wanted. Must be able to re-rack a 45. $40 a shift. Ask Coach Reggie.',
  },
};

// Favor templates. {due} is replaced with the deadline time.
// kinds: deliver (bring them an item), fetch (find their lost item), quiet
// (no noise after midnight), courier (carry their item to someone else).
export const FAVORS = {
  delphine_plate: {
    giver: 'delphine', kind: 'deliver', item: 'plate', minRel: 6, dueHours: 6, cooldown: 2,
    ask: "Could you bring me a plate from the Starlite? My knees won't do the walk today. Before {due}, if you can.",
    short: 'Bring Ms. Okoro a plate lunch',
    reward: { cash: 14, rel: 14 }, fail: { rel: -16 },
    thanks: 'Oh, bless you. Here, take this for your trouble.',
  },
  delphine_quiet: {
    giver: 'delphine', kind: 'quiet', minRel: 12, cooldown: 3,
    ask: 'These walls are paper. Keep it down after midnight tonight, would you?',
    short: 'Keep it quiet after midnight',
    window: ['00:00', '06:00'],
    reward: { cash: 0, rel: 10 }, fail: { rel: -14 },
    thanks: 'Slept like a baby. Thank you, really.',
  },
  dre_water: {
    giver: 'dre', kind: 'deliver', item: 'water', minRel: 8, dueHours: 3, cooldown: 1,
    ask: "Grab me a water? Fountain's warm and I'm not walking. Before {due}.",
    short: 'Bring Dre a bottled water',
    reward: { cash: 6, rel: 8 }, fail: { rel: -8 },
    thanks: 'That\'s what I\'m talking about. Here.',
  },
  javi_phone: {
    giver: 'javi', kind: 'fetch', item: 'phone', minRel: 10, dueHours: 8, cooldown: 3,
    ask: 'Dropped my phone somewhere in the park last night. Bring it back before {due} and I got you.',
    short: 'Find Javi\'s phone in the park',
    spawn: { room: 'st_pecan', area: 'park' },
    reward: { cash: 25, rel: 12 }, fail: { rel: -10 },
    thanks: 'My phone! Okay, okay. You\'re alright.',
  },
  tran_box: {
    giver: 'tran', kind: 'courier', item: 'box', to: 'rosa', minRel: 8, dueHours: 4, cooldown: 2,
    ask: "Rosa's order of sweet bread came here by mistake. Carry it over to the Starlite before {due}? I'll pay you now.",
    short: 'Carry Mr. Tran\'s box to Rosa',
    reward: { cash: 12, rel: 10 }, fail: { rel: -14 },
    thanks: 'From Minh? He\'s a sweetheart. Thank you, hon.',
  },
  carmen_coffee: {
    giver: 'carmen', kind: 'deliver', item: 'coffee', minRel: 8, dueHours: 3, cooldown: 1,
    ask: "I can't leave the window. Bring me a coffee from the Starlite before {due}? Black.",
    short: 'Bring Carmen a coffee',
    reward: { cash: 8, rel: 9 }, fail: { rel: -9 },
    thanks: 'You\'re a lifesaver. Seriously.',
  },
  patrice_pie: {
    giver: 'patrice', kind: 'deliver', item: 'pie', minRel: 10, dueHours: 5, cooldown: 2,
    ask: "Twelve hours on my feet. I would kill for a slice of Rosa's pecan pie. Before {due}?",
    short: 'Bring Patrice a slice of pie',
    reward: { cash: 10, rel: 12 }, fail: { rel: -10 },
    thanks: 'Oh, you angel. Don\'t tell the doctors.',
  },
  reggie_plates: {
    giver: 'reggie', kind: 'fetch', item: 'dumbbell', minRel: 10, dueHours: 6, cooldown: 2,
    ask: 'Some fool walked off with one of my dumbbells. I saw it out on the vacant lot on Main. Bring it back before {due}.',
    short: 'Return Reggie\'s dumbbell from the vacant lot',
    spawn: { room: 'st_main', area: 'vacant' },
    reward: { cash: 15, rel: 12 }, fail: { rel: -8 },
    thanks: 'There it is. Respect. Here.',
  },
  boudreaux_quiet: {
    giver: 'boudreaux', kind: 'quiet', minRel: 5, cooldown: 4,
    ask: 'Tenants been complaining about noise. Keep it down after midnight tonight and we\'re square.',
    short: 'No noise at Bayou Arms after midnight',
    window: ['00:00', '06:00'],
    reward: { cash: 0, rel: 12 }, fail: { rel: -15 },
    thanks: 'Quiet night. That\'s what I like to see.',
  },
};
