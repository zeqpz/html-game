// Two crews. Membership is a relationship plus a tag. Hostility between them
// makes members colder and quicker to swing; a public insult raises it.

export const CREWS = {
  cottonmouths: {
    id: 'cottonmouths', name: 'Cottonmouths', color: '#3d8b4f', leader: 'snake',
    members: ['snake', 'boo', 'lilt'],
    blurb: 'Bayou-side crew. They run the courts and anything moving down Canal St.',
    joinRel: 35, joinRep: 35,
  },
  canalkings: {
    id: 'canalkings', name: 'Canal Kings', color: '#8e5ad1', leader: 'king',
    members: ['king', 'vee', 'dash'],
    blurb: 'Main St crew. Business-minded, flashy, never far from the Velvet Room.',
    joinRel: 35, joinRep: 40,
  },
};

export const START_HOSTILITY = { 'canalkings|cottonmouths': 30 };

export const hostKey = (a, b) => [a, b].sort().join('|');
