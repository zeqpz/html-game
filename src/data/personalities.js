// Personality data. Every behaviour knob the AI and talk code read lives here,
// not in scattered conditions.
//
// tone:    how well each talk tone lands (added to success odds)
// temper:  chance a hard line or a slight turns into squaring up
// greed:   how keen they are on cash / loose items
// social:  how often they greet or chat
// flee:    health fraction where they back out of a fight
// grudge:  how hard bad memories hit the relationship
// speed:   walk speed multiplier

export const PERSONALITIES = {
  steady: {
    label: 'Steady',
    blurb: 'Even-keeled. Likes it straight.',
    tone: { easy: 0.05, straight: 0.15, hard: -0.15 },
    temper: 0.12, greed: 0.15, social: 0.55, flee: 0.35, grudge: 0.8, speed: 1.0,
    respectsHard: false,
  },
  volatile: {
    label: 'Volatile',
    blurb: 'Short fuse. Mood swings.',
    tone: { easy: 0.05, straight: -0.02, hard: -0.3 },
    temper: 0.75, greed: 0.35, social: 0.5, flee: 0.12, grudge: 1.3, speed: 1.05,
    respectsHard: false,
  },
  sly: {
    label: 'Sly',
    blurb: 'Always working an angle.',
    tone: { easy: -0.06, straight: 0.1, hard: -0.08 },
    temper: 0.25, greed: 0.85, social: 0.6, flee: 0.5, grudge: 1.0, speed: 1.0,
    respectsHard: false,
  },
  proud: {
    label: 'Proud',
    blurb: 'Respect first. Hates being talked down to.',
    tone: { easy: 0.14, straight: 0.02, hard: -0.24 },
    temper: 0.5, greed: 0.3, social: 0.45, flee: 0.18, grudge: 1.15, speed: 1.0,
    respectsHard: true, // a hard line lands if your reputation beats theirs
  },
  tired: {
    label: 'Tired',
    blurb: 'Worn down. Wants peace and quiet.',
    tone: { easy: 0.12, straight: 0.06, hard: -0.1 },
    temper: 0.08, greed: 0.2, social: 0.3, flee: 0.6, grudge: 0.9, speed: 0.82,
    respectsHard: false,
  },
};
