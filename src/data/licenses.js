// License tests: a short multiple-choice quiz. Intellect greys out wrong answers.

export const LICENSES = {
  driver: {
    name: 'Driver license', fee: 25, need: 4, of: 5,
    blurb: 'Required before a car will start for you.',
    req: {},
    questions: [
      ['A light turns yellow as you reach the line. You should…', ['Stop if you safely can', 'Speed up to beat it', 'Honk and go', 'Stop in the crosswalk'], 0],
      ['On a two-lane road, the double yellow line means…', ['No passing either way', 'Pass whenever clear', 'Bike lane', 'Parking allowed'], 0],
      ['Rain just started. The road is slickest…', ['In the first half hour', 'After two hours', 'Only at night', 'Never in summer'], 0],
      ['A pedestrian is in the crosswalk ahead. You…', ['Stop and wait', 'Drive around them', 'Flash your lights', 'Speed through'], 0],
      ['Water is over the road after a storm. You…', ['Turn around, don’t drown', 'Drive through slowly', 'Drive through fast', 'Follow the car ahead'], 0],
      ['When an ambulance comes up behind you…', ['Pull right and stop', 'Speed up', 'Stop in the lane', 'Ignore it'], 0],
      ['Following distance in good weather is at least…', ['Three seconds', 'One car length', 'Half a second', 'Whatever feels right'], 0],
      ['Your car starts to skid. You should…', ['Ease off and steer where you want to go', 'Slam the brakes', 'Floor it', 'Let go of the wheel'], 0],
      ['A solid white line at an intersection is…', ['Where you stop', 'A parking space', 'A bike lane', 'Decoration'], 0],
      ['Before changing lanes you…', ['Signal and check your mirror and blind spot', 'Honk', 'Speed up', 'Just go'], 0],
      ['Legal blood alcohol limit for a new driver here is…', ['Zero — don’t drink and drive', '0.15', 'Two beers', 'No limit'], 0],
      ['At a four-way stop, who goes first?', ['Whoever stopped first', 'The bigger car', 'Whoever honks', 'Nobody'], 0],
    ],
  },
  firearm: {
    name: 'Firearm permit', fee: 75, need: 5, of: 5,
    blurb: 'Required before a shop will sell you a gun — and before police ignore a legal carry.',
    req: { reputation: 30, heatBelow: 30, noFines: true, driver: false },
    questions: [
      ['Treat every firearm as if it is…', ['Loaded', 'Unloaded', 'A toy', 'Someone else’s problem'], 0],
      ['Keep your finger off the trigger until…', ['You’re ready to fire', 'You pick it up', 'You feel nervous', 'Someone looks at you'], 0],
      ['A permitted handgun in public must be…', ['Holstered and kept out of hand', 'Held at all times', 'Shown to everyone', 'Left in plain view on tables'], 0],
      ['An officer stops you while you’re carrying. You…', ['Tell them you have a permit and keep hands visible', 'Reach for it to show them', 'Run', 'Say nothing and move'], 0],
      ['Store a firearm at home…', ['Locked and away from kids', 'Under the pillow', 'On the counter', 'In the car overnight'], 0],
      ['Before you pull a trigger, you must know…', ['Your target and what’s beyond it', 'Only your target', 'Nothing', 'The brand of ammo'], 0],
      ['Carrying in a bar or club is…', ['Not allowed', 'Encouraged', 'Fine after midnight', 'Required'], 0],
      ['A permit lets you…', ['Carry legally — it doesn’t make you a better shot', 'Shoot anyone who insults you', 'Skip the range', 'Ignore police'], 0],
    ],
  },
};
