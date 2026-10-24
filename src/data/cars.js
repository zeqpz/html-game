// Vehicle models. Units: px, px/s, px/s^2. 40 px is about a meter.
// mass makes hits hurt more and steering feel heavier.

export const MODELS = {
  sedan: { name: "'98 Bayou Sedan", price: 900, len: 92, wid: 42, top: 520, accel: 190, brake: 520, steer: 0.62, grip: 7.5, mass: 1.0, tank: 100, mpg: 0.004 },
  pickup: { name: 'Ranchero Pickup', price: 1700, len: 100, wid: 46, top: 560, accel: 210, brake: 480, steer: 0.55, grip: 7.0, mass: 1.3, tank: 120, mpg: 0.005, bed: true },
  coupe: { name: 'Gulfstream Coupe', price: 3200, len: 88, wid: 40, top: 700, accel: 300, brake: 600, steer: 0.68, grip: 8.5, mass: 0.9, tank: 90, mpg: 0.005 },
  cab: { name: 'Bayou City Cab', price: 0, len: 94, wid: 43, top: 560, accel: 220, brake: 540, steer: 0.62, grip: 7.8, mass: 1.05, tank: 100, mpg: 0.003, cab: true },
};

export const CAR_COLORS = ['#8a2f2f', '#2f4f8a', '#d8d8d0', '#2b2b2f', '#5a7a3a', '#c9a227', '#7a4a8a', '#3d6b6b'];

// The car you start with, parked on Pecan St outside Bayou Arms.
export const START_CAR = { model: 'sedan', color: '#7b6a4a', room: 'st_pecan', x: 470, y: 628, rot: 0, fuel: 55, dmg: { front: 0.15, rear: 0.3, left: 0.1, right: 0.2 } };

export const FUEL_PRICE = 0.06; // dollars per unit of tank
export const REPAIR_PER_PANEL = 120; // dollars to fix a fully wrecked panel
export const STALL_RENT = 40;
