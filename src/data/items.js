// Item definitions. Sizes are inventory grid cells (w x h); weight in kg.
// handsOnly items never fit in pockets. `visible` weapons draw police attention.

export const ITEMS = {
  cash: { name: 'Cash', kind: 'cash', w: 1, h: 1, wt: 0.05, stack: true, desc: 'Bills. Spend it, hand it over, or lose it.' },

  pipe: { name: 'Pipe', kind: 'weapon', w: 1, h: 3, wt: 2.2, handsOnly: true, dmg: 15, reach: 12, visible: true, value: 4, desc: 'A length of galvanized pipe. Heavy and obvious.' },
  bottle: { name: 'Bottle', kind: 'weapon', w: 1, h: 2, wt: 0.5, dmg: 9, reach: 4, breaks: 0.35, value: 0, desc: 'An empty glass bottle.' },
  bat: { name: 'Bat', kind: 'weapon', w: 1, h: 3, wt: 1.0, handsOnly: true, dmg: 17, reach: 16, visible: true, value: 25, desc: 'Aluminum softball bat.' },
  flashlight: { name: 'Flashlight', kind: 'tool', w: 1, h: 2, wt: 0.4, dmg: 6, light: true, value: 12, desc: 'A heavy-duty flashlight. Lights the way at night.' },
  broom: { name: 'Broom', kind: 'tool', w: 1, h: 3, wt: 0.8, handsOnly: true, dmg: 5, reach: 18, tool: 'sweep', value: 6, desc: 'A push broom.' },
  wrench: { name: 'Wrench', kind: 'tool', w: 1, h: 2, wt: 0.9, dmg: 11, reach: 4, value: 10, desc: 'Adjustable wrench.' },
  screwdriver: { name: 'Screwdriver', kind: 'tool', w: 1, h: 1, wt: 0.2, dmg: 7, value: 4, desc: 'Flathead screwdriver.' },
  phone: { name: 'Phone', kind: 'phone', w: 1, h: 1, wt: 0.2, value: 60, desc: 'A cracked-screen phone. Somebody wants it back.' },
  carkeys: { name: 'Car keys', kind: 'key', w: 1, h: 1, wt: 0.1, value: 0, desc: 'Keys on a ring with a bottle opener.' },

  plate: { name: 'Plate lunch', kind: 'food', w: 2, h: 1, wt: 0.7, handsOnly: true, hunger: 48, mind: 6, value: 9, desc: 'Brisket, rice, beans and a roll.' },
  kolache: { name: 'Kolache', kind: 'food', w: 1, h: 1, wt: 0.2, hunger: 20, mind: 3, value: 3, desc: 'Sausage in a sweet roll.' },
  taco: { name: 'Breakfast taco', kind: 'food', w: 1, h: 1, wt: 0.2, hunger: 24, mind: 3, value: 3, desc: 'Egg, potato, salsa verde.' },
  pie: { name: 'Pecan pie slice', kind: 'food', w: 1, h: 1, wt: 0.2, hunger: 14, mind: 8, value: 4, desc: 'Sweet enough to fix a bad mood.' },
  snack: { name: 'Chips', kind: 'food', w: 1, h: 1, wt: 0.1, hunger: 10, mind: 1, value: 2, desc: 'A bag of chips.' },

  water: { name: 'Water', kind: 'drink', w: 1, h: 1, wt: 0.5, thirst: 40, value: 1, desc: 'Cold bottled water.' },
  soda: { name: 'Soda', kind: 'drink', w: 1, h: 1, wt: 0.4, thirst: 28, mind: 2, value: 2, desc: 'Red soda, extra sweet.' },
  coffee: { name: 'Coffee', kind: 'drink', w: 1, h: 1, wt: 0.3, thirst: 18, mind: 5, value: 2, desc: 'Diner coffee. Hot, black, bottomless.' },
  tea: { name: 'Iced tea', kind: 'drink', w: 1, h: 1, wt: 0.5, thirst: 38, mind: 2, value: 2, desc: 'Sweet tea, lots of ice.' },

  medkit: { name: 'Medkit', kind: 'med', w: 2, h: 1, wt: 0.6, health: 35, value: 30, desc: 'Gauze, tape, antiseptic. Patches you up.' },
  bandage: { name: 'Bandage', kind: 'med', w: 1, h: 1, wt: 0.1, health: 12, value: 6, desc: 'A roll of gauze.' },

  book: { name: 'Paperback', kind: 'book', w: 1, h: 2, wt: 0.3, intellect: 1.4, mind: 7, value: 5, desc: 'A dog-eared paperback. Reading takes a minute.' },
  manual: { name: 'Driver handbook', kind: 'book', w: 1, h: 2, wt: 0.3, intellect: 2.0, mind: 2, value: 8, desc: 'State driver handbook. Dry, but it helps on the test.' },
};

// What a room can spawn at dawn. Weighted.
export const SPAWN_TABLES = {
  street: [['bottle', 5], ['pipe', 2], ['snack', 2], ['soda', 2], ['cash', 2], ['phone', 0.6], ['flashlight', 1], ['screwdriver', 1]],
  park: [['bottle', 4], ['book', 2], ['soda', 2], ['cash', 2], ['water', 2], ['phone', 0.5], ['bat', 0.6]],
  diner: [['coffee', 1], ['bottle', 1], ['book', 1], ['cash', 1]],
  gym: [['water', 3], ['bottle', 1], ['cash', 1], ['bandage', 1]],
  home: [['book', 2], ['snack', 2], ['soda', 2], ['water', 1]],
};

// Cash wads that spawn loose are small.
export const LOOSE_CASH = [4, 22];
