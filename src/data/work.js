// Jobs (places you walk into and apply at) and favors (asked for by people).

export const JOBS = {
  diner: {
    id: 'diner', place: 'diner', title: 'Diner shift', boss: 'rosa',
    floor: {}, // stat floor to be hired
    ranks: [
      { title: 'Server', pay: 42, tasks: 6 },
      { title: 'Shift lead', pay: 64, tasks: 7, floor: { intellect: 35, reputation: 40 }, hours: 20 },
    ],
    hours: 4, // hours credited per finished shift
    clockIn: ['06:30', '18:30'], // when you can start a shift
    closeBy: '22:00', // shift must be finished before this
    taskKinds: [['serve', 3], ['wipe', 2], ['mop', 1]],
    posting: 'Now hiring: servers. No experience needed. $42 per shift, paid on the spot. Ask Rosa.',
  },
};

// Favor templates. {due} is replaced with the deadline time.
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
};
