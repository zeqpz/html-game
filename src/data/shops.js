// Fixed-price menus. Prices are stable on purpose.

export const SHOPS = {
  diner: {
    name: 'Starlite Diner', place: 'diner',
    items: [['plate', 9], ['taco', 3], ['kolache', 3], ['pie', 4], ['coffee', 2], ['tea', 2], ['water', 1]],
  },
  gymdesk: {
    name: 'Iron Bayou front desk', place: 'gym',
    items: [['water', 2], ['bandage', 6], ['soda', 2]],
  },
  quikstop: {
    name: 'Quik Stop', place: 'quikstop',
    items: [['water', 1], ['soda', 2], ['snack', 2], ['kolache', 3], ['taco', 3], ['coffee', 2], ['bandage', 6], ['flashlight', 14], ['book', 6], ['manual', 9], ['phone', 45]],
  },
  clinic: {
    name: "St. Ann's reception", place: 'hospital',
    items: [['bandage', 6], ['medkit', 30]],
    services: [{ id: 'treat', label: 'Get patched up', desc: 'A nurse cleans you up and you rest a while. Back to full health.', price: 40 }],
  },
  vending: {
    name: 'Vending machine', place: 'hospital', self: true,
    items: [['water', 2], ['soda', 2], ['snack', 2]],
  },
};
