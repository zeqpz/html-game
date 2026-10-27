// Everything the character creator offers, plus the backgrounds you can pick.
// The renderer (view/people.js) understands every option listed here.

export const SKIN = ['#f6d3b5', '#f1c8a5', '#e8b98f', '#e0ac85', '#d29a6f', '#c68a5e', '#b47a52', '#a8754f', '#8d5a3b', '#7a4a2e', '#6b4229', '#5a3825', '#4f2f1d', '#3a2216'];
export const HAIR_COLORS = ['#0f0b09', '#1b120c', '#2b1a12', '#3b2416', '#5a3a22', '#6b4423', '#8a5a2e', '#a8763a', '#c9a24a', '#d8b06a', '#e8d29a', '#9e3b26', '#c25a2a', '#bdbab4', '#e8e6e0', '#2b3b6b', '#7a3bd1', '#d13b7a', '#2c8a6b'];
export const EYE_COLORS = ['#2b1a10', '#3b2416', '#5a3a1e', '#6b4a2a', '#4a5a2a', '#3d6b4a', '#2c5aa0', '#5a7a9a', '#7a8a9a'];
export const CLOTH = ['#f4f1ea', '#d9d4c8', '#9aa3ab', '#4a4f57', '#1d1d22', '#c62828', '#b8283f', '#e8862a', '#ffd23f', '#7cb342', '#2f6b4a', '#3d8b4f', '#4fb3a0', '#2c5aa0', '#1f3557', '#7a5c8e', '#8e5ad1', '#d13b7a', '#8a6a4a', '#5a3a22', '#c9b48a'];
export const DENIM = ['#34445e', '#3b4a6b', '#2c3a52', '#1f2a44', '#5a6f8f', '#2c2c34', '#1d1d22', '#55595e', '#6b5a43', '#8a7a5a', '#7b3b2f', '#3d5a3a', '#e8e2d4'];
export const SHOE_COLORS = ['#f0f0f0', '#1b1b1e', '#3a2a1e', '#8a5b3c', '#c62828', '#2c5aa0', '#ffd23f', '#7cf29a', '#c792ff'];
export const LIP_COLORS = ['#b0444f', '#8e2a3a', '#d4577a', '#6b2a2a', '#c96a5a'];

// [value, label]
export const OPTIONS = {
  build: [['slim', 'Slim'], ['avg', 'Average'], ['curvy', 'Curvy'], ['heavy', 'Heavy'], ['muscle', 'Muscular']],
  age: [['young', 'Young'], ['adult', 'Adult'], ['older', 'Older']],
  face: [['oval', 'Oval'], ['round', 'Round'], ['square', 'Square'], ['long', 'Long']],
  eyes: [['round', 'Round'], ['narrow', 'Narrow'], ['wide', 'Wide'], ['sleepy', 'Heavy-lidded']],
  brows: [['straight', 'Straight'], ['arched', 'Arched'], ['thick', 'Thick'], ['thin', 'Thin']],
  nose: [['small', 'Small'], ['button', 'Button'], ['wide', 'Wide'], ['long', 'Long']],
  mouth: [['neutral', 'Neutral'], ['smile', 'Smile'], ['smirk', 'Smirk'], ['frown', 'Serious']],
  hair: [
    ['short', 'Short'], ['buzz', 'Buzz'], ['fade', 'Fade'], ['slick', 'Slicked'], ['undercut', 'Undercut'], ['mohawk', 'Mohawk'],
    ['curly', 'Curly'], ['afro', 'Afro'], ['cornrows', 'Cornrows'], ['braids', 'Braids'], ['locs', 'Locs'], ['bun', 'Bun'],
    ['ponytail', 'Ponytail'], ['pigtails', 'Pigtails'], ['bob', 'Bob'], ['long', 'Long'], ['bald', 'Bald'],
  ],
  beard: [['none', 'Clean'], ['stubble', 'Stubble'], ['mustache', 'Mustache'], ['goatee', 'Goatee'], ['chinstrap', 'Chinstrap'], ['full', 'Full beard']],
  top: [
    ['tee', 'T-shirt'], ['tank', 'Tank'], ['polo', 'Polo'], ['button', 'Button-up'], ['hoodie', 'Hoodie'],
    ['jersey', 'Jersey'], ['cardigan', 'Cardigan'], ['dress', 'Dress'],
  ],
  pattern: [['none', 'Plain'], ['stripes', 'Stripes'], ['plaid', 'Plaid'], ['floral', 'Floral'], ['logo', 'Logo'], ['number', 'Number']],
  outer: [['none', 'None'], ['jacket', 'Bomber'], ['denim', 'Denim jacket'], ['leather', 'Leather'], ['windbreaker', 'Windbreaker'], ['vest', 'Vest']],
  bottom: [['jeans', 'Jeans'], ['slacks', 'Slacks'], ['cargo', 'Cargos'], ['sweats', 'Sweats'], ['shorts', 'Shorts'], ['skirt', 'Skirt']],
  shoeStyle: [['sneakers', 'Sneakers'], ['boots', 'Boots'], ['dress', 'Dress shoes'], ['sandals', 'Slides']],
  hat: [[null, 'None'], ['cap', 'Cap'], ['backcap', 'Cap (back)'], ['beanie', 'Beanie'], ['bucket', 'Bucket'], ['cowboy', 'Cowboy']],
  glasses: [[false, 'None'], ['square', 'Square'], ['round', 'Round'], ['shades', 'Shades']],
  makeup: [['none', 'None'], ['lipstick', 'Lipstick'], ['eyeliner', 'Eyeliner'], ['both', 'Both']],
  freckles: [[false, 'No'], [true, 'Yes']],
  scar: [['none', 'None'], ['cheek', 'Cheek'], ['brow', 'Eyebrow']],
  tattoo: [['none', 'None'], ['arm', 'Arm sleeve'], ['neck', 'Neck'], ['tear', 'Teardrop']],
  earrings: [[false, 'None'], ['studs', 'Studs'], ['hoops', 'Hoops']],
  chain: [[false, 'No'], [true, 'Gold chain']],
  watch: [[false, 'No'], [true, 'Watch']],
  backpack: [[false, 'No'], [true, 'Backpack']],
};

// Backgrounds: where you're coming from. Stat nudges, a little cash, someone who already knows you.
export const ORIGINS = {
  newcomer: {
    name: 'Fresh off the bus', blurb: 'New in town. No history, no favors owed — and a little saved up.',
    stats: {}, cash: 95, perks: ['+$60 starting cash'],
  },
  cook: {
    name: 'Line cook', blurb: 'Years behind a flat-top. Rosa has heard of you; the Starlite feels like home.',
    stats: { strength: 4, reputation: 4 }, cash: 35, knows: { rosa: 18 }, perks: ['Rosa already likes you', '+Strength, +Reputation'],
  },
  athlete: {
    name: 'Ex-athlete', blurb: 'Played ball until your knee said no. Still strong, still quick, not much of a reader.',
    stats: { strength: 12, agility: 10, intellect: -6 }, cash: 35, knows: { dre: 15, reggie: 15 }, perks: ['Big Strength & Agility', 'The gym crowd respects you', '−Intellect'],
  },
  bookworm: {
    name: 'Bookworm', blurb: 'Library card, night classes, big plans. Talk your way in; avoid the fights.',
    stats: { intellect: 16, strength: -6 }, cash: 35, items: [['book', 'pockets']], perks: ['Big Intellect: better talk & test odds', 'Starts with a paperback', '−Strength'],
  },
  streetwise: {
    name: 'Street-smart', blurb: 'Grew up two blocks over. People know your face — for better and worse.',
    stats: { reputation: 14, agility: 6, intellect: -4 }, cash: 25, knows: { javi: 20, boo: 12, dash: 10 }, heat: 8, perks: ['Big Reputation', 'Javi and the corner kids know you', 'A little heat already'],
  },
  mechanic: {
    name: "Mechanic's kid", blurb: 'Raised under a hood. Earl owes your old man a favor; your sedan runs right.',
    stats: { intellect: 6, strength: 4 }, cash: 35, knows: { earl: 25 }, carFixed: true, perks: ['Earl already likes you', 'Your car starts fixed up with a full tank'],
  },
};

export const ALLOC_POINTS = 10;
export const ALLOC_STATS = [['strength', 'Strength'], ['agility', 'Agility'], ['intellect', 'Intellect'], ['aim', 'Aim']];
export const ALLOC_MAX = 8;
export const ALLOC_STEP = 3; // each point adds this much to the stat

export const MORE_NAMES = ['Andre', 'Yesenia', 'DeShawn', 'Marisol', 'Cedric', 'Imani', 'Rudy', 'Paloma', 'Terrence', 'Keisha', 'Omar', 'Brenda', 'Jalen', 'Rosie', 'Victor', 'Aaliyah', 'Tomas', 'Shay', 'Curtis', 'Lena'];

const NATURAL_HAIR = HAIR_COLORS.slice(0, 14);

// A complete look with every field set, so nothing is derived behind your back.
// rnd: the dice (Math.random in the creator, the sim's seeded RNG for strangers).
export function randomLook(rnd = Math.random, keepBody = null) {
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const chance = (p) => rnd() < p;
  const alt = chance(0.5); // only steers the dice; any option is open to anyone
  const L = {
    skin: pick(SKIN), build: alt ? pick(['slim', 'avg', 'curvy', 'curvy', 'heavy']) : pick(['slim', 'avg', 'avg', 'heavy', 'muscle']),
    height: Math.round((0.94 + rnd() * 0.12) * 100) / 100, age: pick(['young', 'adult', 'adult', 'adult', 'older']),
    face: pick(OPTIONS.face)[0], eyes: pick(OPTIONS.eyes)[0], eyeColor: pick(EYE_COLORS), brows: pick(OPTIONS.brows)[0],
    nose: pick(OPTIONS.nose)[0], mouth: pick(['neutral', 'neutral', 'smile', 'smirk', 'frown']),
    freckles: chance(0.12), scar: chance(0.1) ? pick(['cheek', 'brow']) : 'none',
    makeup: alt && chance(0.6) ? pick(['lipstick', 'eyeliner', 'both']) : 'none', lipColor: pick(LIP_COLORS),
  };
  if (keepBody) Object.assign(L, keepBody);
  L.hair = alt ? pick(['long', 'bob', 'ponytail', 'bun', 'braids', 'curly', 'afro', 'locs', 'pigtails', 'short']) : pick(['short', 'buzz', 'fade', 'slick', 'undercut', 'curly', 'afro', 'cornrows', 'locs', 'braids', 'bald', 'mohawk']);
  L.hairColor = L.age === 'older' && chance(0.6) ? pick(['#bdbab4', '#e8e6e0']) : chance(0.08) ? pick(HAIR_COLORS.slice(14)) : pick(NATURAL_HAIR.slice(0, 11));
  L.hair2 = chance(0.12) ? pick(HAIR_COLORS) : null;
  L.beard = alt ? 'none' : pick(['none', 'none', 'stubble', 'goatee', 'mustache', 'chinstrap', 'full']);
  L.beardColor = L.hairColor;
  L.top = alt ? pick(['tee', 'tank', 'polo', 'button', 'hoodie', 'cardigan', 'dress', 'jersey']) : pick(['tee', 'tee', 'tank', 'polo', 'button', 'hoodie', 'jersey']);
  L.topColor = pick(CLOTH);
  L.top2 = pick(CLOTH.filter((c) => c !== L.topColor));
  L.pattern = chance(0.3) ? pick(['stripes', 'plaid', 'floral', 'logo', 'number']) : 'none';
  if (L.top === 'jersey') L.pattern = 'number';
  L.outer = chance(0.3) ? pick(['jacket', 'denim', 'leather', 'windbreaker', 'vest']) : 'none';
  L.outerColor = L.outer === 'denim' ? pick(DENIM.slice(0, 5)) : pick(['#1d1d22', '#3a2a1e', '#4a4f57', '#2f6b4a', '#1f3557', '#8a6a4a', '#b8283f']);
  L.bottom = L.top === 'dress' ? 'jeans' : alt ? pick(['jeans', 'slacks', 'shorts', 'skirt', 'sweats', 'cargo']) : pick(['jeans', 'jeans', 'slacks', 'cargo', 'sweats', 'shorts']);
  L.bottomColor = L.bottom === 'jeans' ? pick(DENIM.slice(0, 6)) : pick([...DENIM, ...CLOTH.slice(2, 5)]);
  L.shoeStyle = pick(['sneakers', 'sneakers', 'sneakers', 'boots', 'dress', 'sandals']);
  L.shoes = pick(SHOE_COLORS);
  L.hat = chance(0.25) ? pick(['cap', 'backcap', 'beanie', 'bucket', 'cowboy']) : null;
  L.hatColor = pick(CLOTH);
  L.glasses = chance(0.18) ? pick(['square', 'round', 'shades']) : false;
  L.earrings = alt ? pick([false, 'studs', 'hoops']) : pick([false, false, false, 'studs']);
  L.chain = chance(0.15);
  L.watch = chance(0.25);
  L.backpack = chance(0.12);
  L.packColor = pick(CLOTH);
  L.tattoo = chance(0.15) ? pick(['arm', 'neck', 'tear']) : 'none';
  return L;
}
