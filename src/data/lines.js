// Dialogue fragments. Talk replies are assembled from these by tier,
// personality, tone and memory, never as one fixed tree.
// Tokens: {p} player name, {n} speaker, {t} third person, {item}, {ago}, {place}, {due}

export const GREET = {
  hostile: {
    steady: ["I don't have anything to say to you.", "Keep walking, {p}.", "You've got some nerve."],
    volatile: ["You really wanna do this right now?", "Back up. I mean it.", "Oh, it's YOU."],
    sly: ["Well, well. Look who it is.", "You lost, {p}?", "Funny seeing you here."],
    proud: ["Don't talk to me.", "You don't get to just walk up on me.", "We're not cool, {p}."],
    tired: ["Please. Just leave me be.", "Not you. Not today.", "I'm too tired for this."],
  },
  cold: {
    steady: ['What is it.', 'Make it quick.', 'Yeah?'],
    volatile: ['What now?', "Don't start.", 'Make it quick before I lose my patience.'],
    sly: ['What are you selling?', 'Depends who\'s asking.', 'Mm. What.'],
    proud: ['You need something?', 'Talk.', 'Go on.'],
    tired: ['Mm.', 'What do you want, hon.', 'If this is about the noise again...'],
  },
  neutral: {
    steady: ['Hey there.', "How's it going.", '{greet}.', 'Help you with something?'],
    volatile: ["What's up.", 'Hey.', "Yeah? What's good."],
    sly: ["What's the word?", 'Hey, hey. What you need?', 'My guy. Sort of.'],
    proud: ["What's up.", "How you doin'.", 'Sup.'],
    tired: ['Oh. Hello.', 'Hi, sugar.', 'Another hot one, huh?'],
  },
  warm: {
    steady: ['Hey, {p}! Good to see you.', 'There they are.', 'Look who walked in.'],
    volatile: ['{p}! Finally, somebody I like.', "Ayy, there's {p}.", "Yo, what's good, {p}."],
    sly: ['{p}, my friend.', "Just who I wanted to see.", "Talk to me, {p}."],
    proud: ["{p}. What's good.", "My dude {p}.", "Respect, {p}."],
    tired: ['Oh, {p}. Hello, dear.', "It's nice to see a friendly face.", 'Hi, sweetheart.'],
  },
  close: {
    steady: ['{p}! Sit down, sit down.', "You're a sight for sore eyes.", 'My favorite regular.'],
    volatile: ["{p}! You're the only one around here I trust.", "There's my people!"],
    sly: ["{p}! Anything you need, you know who to ask.", "Partner."],
    proud: ["{p}. We family, you know that.", "My brother from the block."],
    tired: ['{p}, you always make my day better.', 'Come here, let me look at you.'],
  },
};

// What the player says for each tone. Picked by how they currently feel about you.
export const SAY = {
  easy: {
    low: ["Hey, let's start over.", 'No trouble. Just saying hi.', "Look, I'm not here to fight."],
    mid: ["How you holding up in this heat?", "What's new with you?", 'Good to see you around.', 'You eat yet?'],
    high: ["Hey, friend. How's life?", "Always good to see you.", "What's the news?"],
  },
  straight: {
    low: ["Let's talk straight. What's the problem?", "I want to clear the air."],
    mid: ["Need anything done? I'm looking for work.", "Straight up — you need a hand with anything?", "I'll be honest with you."],
    high: ["You need anything, just ask.", "Anything I can do for you?", "Tell me straight, what's going on?"],
  },
  hard: {
    low: ['You got a problem with me?', 'Keep my name out your mouth.', "Step to me again and see what happens."],
    mid: ["Don't waste my time.", "I'm not somebody you play with.", 'Remember who you talking to.'],
    high: ["Don't get comfortable.", "You owe me, don't forget it.", "Don't make me ask twice."],
  },
};

// Replies by tone -> outcome -> personality.
export const REPLY = {
  easy: {
    good: {
      steady: ['Can\'t complain. Good of you to ask.', 'Doing alright. You?', 'Ha. Same old. Thanks for asking.'],
      volatile: ["Hey, you're alright, you know that?", 'Ha! Yeah, yeah. It\'s a good day.'],
      sly: ['Hah. Smooth. I like it.', "You're alright, {p}. For now."],
      proud: ["Respect. Appreciate that.", "See, that's how you talk to people."],
      tired: ["You're sweet. It's been a long week.", "That's kind of you. Really."],
    },
    ok: {
      steady: ['Sure.', 'Uh-huh.', "Mm-hm. Alright then."],
      volatile: ['Okay. Sure.', "Whatever you say."],
      sly: ["Uh-huh. What do you actually want?", 'Mm. Sure.'],
      proud: ['Yeah, okay.', "Cool."],
      tired: ['Mm. Okay, hon.', 'If you say so.'],
    },
    bad: {
      steady: ["Don't butter me up.", "I've got work to do."],
      volatile: ["Don't play nice with me.", "You think I'm stupid?"],
      sly: ["Nice try. What are you after?", "Save the sweet talk."],
      proud: ["We're not friends like that.", "Nah. Don't do that."],
      tired: ['Not now, please.', "I'm not in the mood."],
    },
  },
  straight: {
    good: {
      steady: ["I appreciate the honesty.", "Straight talk. I like that.", 'Fair enough. Let\'s talk.'],
      volatile: ["Okay. Okay, that's fair.", 'Alright, I hear you.'],
      sly: ['Now we\'re talking business.', "See? Easy when you're straight with me."],
      proud: ['Respect for saying it plain.', "That's real."],
      tired: ["Thank you for being honest with me.", "That's all I ask, honey."],
    },
    ok: {
      steady: ['Noted.', 'Alright.', "I'll think about it."],
      volatile: ['Okay, whatever.', "Fine."],
      sly: ['We\'ll see.', "Maybe."],
      proud: ['Cool.', "Heard."],
      tired: ['Alright, dear.', 'Okay.'],
    },
    bad: {
      steady: ["I don't buy it.", "That's not how I see it."],
      volatile: ["You calling me out? Watch it.", "Nah, man. Nah."],
      sly: ["Sure you will.", "Ha. No."],
      proud: ["Who you think you're talking to?", "Watch your tone."],
      tired: ["I don't want to hear it.", 'Please, not this.'],
    },
  },
  hard: {
    good: {
      steady: ["...Alright. Alright. No trouble.", "Fine. You made your point."],
      volatile: ["...Okay. My bad. We good.", "Alright! Alright. Damn."],
      sly: ['Easy, easy. I hear you.', "No need for all that. We're cool."],
      proud: ["...Respect. I see you.", "Alright. You got heart, I'll give you that."],
      tired: ['Okay, okay. I don\'t want trouble.', 'Fine. Just leave me alone.'],
    },
    ok: {
      steady: ["Don't talk to me like that.", 'Settle down.'],
      volatile: ["You better watch yourself.", "Keep pushing. See what happens."],
      sly: ['Ooh, tough guy.', "Okay, big talk."],
      proud: ["Careful.", "Say that again."],
      tired: ['There\'s no need for that.', "Why are you like this?"],
    },
    bad: {
      steady: ["Get out of my face.", "We're done here."],
      volatile: ["Say that again. I DARE you.", "Oh, you want it? You got it."],
      sly: ["Big mistake, {p}.", "You'll regret that."],
      proud: ["Nah. You don't talk to me like that.", "Now we got a problem."],
      tired: ["How dare you.", "I'm calling somebody."],
    },
  },
};

// Memory lines as the speaker quotes them. `you` = about the player,
// `them` = about somebody else (gossip), `mine` = first person summary for the People panel.
export const MEMORY = {
  hit: {
    you: ['You hit me {ago}. I haven\'t forgotten.', 'You swung on me {ago}.', 'Last time you put hands on me. {ago}.'],
    them: ['{t} hit me {ago}.', 'Got hit by {t} {ago}.'],
    mine: '{t} hit me',
  },
  dropped: {
    you: ['You put me on the floor {ago}.', 'You dropped me {ago}. Everybody saw.'],
    them: ['{t} put me on the floor {ago}.'],
    mine: '{t} put me on the floor',
  },
  started: {
    you: ['Saw you start that fight with {x} {ago}.', 'You started on {x} {ago}. I was there.'],
    them: ['Saw {t} start something with {x} {ago}.', '{t} went after {x} {ago}. Crazy.'],
    mine: '{t} started a fight with {x}',
  },
  paid: {
    you: ['You paid me {amt} {ago}. Appreciate it.', 'You came through with the money {ago}.'],
    them: ['{t} paid me {ago}.'],
    mine: '{t} paid me {amt}',
  },
  brought: {
    you: ['You brought me that {item} {ago}. That was decent.', 'Still thinking about that {item} you brought me.'],
    them: ['{t} brought me {item} {ago}.'],
    mine: '{t} brought me {item}',
  },
  welched: {
    you: ['You welched on me {ago}. Said you\'d {task}.', "You said you'd {task}. You didn't."],
    them: ['{t} welched on a job {ago}.'],
    mine: '{t} welched: {task}',
  },
  lied: {
    you: ['You lied to me {ago}.', 'Last thing you told me was a lie.'],
    them: ['{t} lied to me.'],
    mine: '{t} lied to me',
  },
  took: {
    you: ['You took my {item}. Don\'t think I didn\'t see.', 'Where\'s my {item}, {p}? I saw you.'],
    them: ['{t} took my {item}.'],
    mine: '{t} took my {item}',
  },
  pocketed: {
    you: ['Saw you scoop that {item} off the ground {ago}.'],
    them: ['Saw {t} pick up {x}\'s {item} off the ground {ago}.', '{t} grabbed {x}\'s {item} off the floor {ago}. Just so you know.'],
    mine: '{t} picked up {x}\'s {item}',
  },
  talk_good: {
    you: ['Good talking with you {ago}.', 'Enjoyed our talk {ago}.'],
    them: ['Had a nice talk with {t} {ago}.'],
    mine: 'Good talk with {t}',
  },
  talk_bad: {
    you: ['You got hard with me {ago}.', "Didn't like how you talked to me {ago}."],
    them: ['{t} got loud with me {ago}.'],
    mine: '{t} talked down to me',
  },
  threatened: {
    you: ['You threatened me {ago}.', "You tried to scare me {ago}. Didn't work."],
    them: ['{t} threatened me {ago}.'],
    mine: '{t} threatened me',
  },
  loud: {
    you: ['You were loud after midnight {ago}. Some of us sleep.', 'Heard you banging around at night {ago}.'],
    them: ['{t} was loud after midnight.'],
    mine: '{t} was loud after midnight',
  },
  quiet: {
    you: ['You kept it quiet like I asked. Thank you.'],
    them: ['{t} kept it quiet.'],
    mine: '{t} kept it quiet',
  },
  shift: {
    you: ['You finished your shift {ago}. Good work.', 'Solid shift {ago}. Keep it up.'],
    them: ['{t} finished a shift {ago}.'],
    mine: '{t} finished a shift',
  },
  quit: {
    you: ['You walked off a shift {ago}. Not cool.', 'You left me short-handed {ago}.'],
    them: ['{t} walked off a shift.'],
    mine: '{t} walked off a shift',
  },
  helped: {
    you: ['You stepped in for me {ago}. I owe you.', 'You had my back {ago}.'],
    them: ['{t} had my back {ago}.'],
    mine: '{t} had my back',
  },
  gave: {
    you: ['You gave me that {item}. Kind of you.'],
    them: ['{t} gave me {item}.'],
    mine: '{t} gave me {item}',
  },
  shot: {
    you: ['You SHOT at me. I will never forget that.', 'You pulled a gun on me {ago}.'],
    them: ['{t} started shooting {ago}. Shooting!', 'I heard {t} fire a gun {ago}.'],
    mine: '{t} fired a gun',
  },
  bought: {
    you: ['Thanks for the business {ago}.'],
    them: ['{t} bought something {ago}.'],
    mine: '{t} bought {item}',
  },
};

// One-liners shown in speech bubbles.
export const BARK = {
  greetWarm: ['Hey, {p}!', '{p}! What\'s good?', 'Hey there, {p}.', 'Ayy, {p}.'],
  greetNeutral: ['Hey.', "How's it going.", '{greet}.', '{greet}.', '{weather}', "'Sup."],
  greetCold: ['...', 'Hm.', 'Mm-hm.'],
  ignore: ['...', '*looks away*'],
  ask: ['Hey — got a second?', '{p}! Come here a minute.', 'Can I ask you something?'],
  squareUp: ['You lookin\' at me?', 'Keep walking.', 'We got a problem?', 'Back up off me.'],
  swing: ['That\'s it!', 'You asked for it!', 'Come on then!', 'Oh, you\'re done!'],
  hurt: ['Ugh!', 'Agh!', 'Oof!', 'Hey!'],
  flee: ['Okay! Okay! I\'m done!', 'Forget this!', 'Not worth it!'],
  win: ['Stay down.', "Don't get up.", 'Next time think first.'],
  copStop: ['Hey! Break it up!', 'Police! Knock it off!', 'That\'s enough! Both of you!'],
  copWeapon: ['Drop the {item}. Now.', "I'll take that {item}.", 'That {item} is coming with me.'],
  copHello: ['{greet}.', 'Stay out of trouble.', 'Keep it moving.', '{weather}'],
  pickup: ['Finders keepers.', 'Ooh, don\'t mind if I do.', 'Mine now.', 'Oh, nice.', "Somebody's loss.", 'Ha. My lucky day.'],
  pickupWeapon: ["This'll come in handy.", 'Now who wants some?', "Oh, I'm keeping this.", 'Heh. Look what I found.'],
  bump1: ['Watch it.', 'Excuse me.', 'Hey — careful.', 'Whoa, sorry.', 'Pardon me.', 'Easy there.'],
  bump2: ["Watch where you're going!", 'Do you mind?', 'Seriously? Again?', 'Back up, man.', 'You blind or something?'],
  bump3: ['Bump me one more time. I dare you.', 'You looking for trouble?', 'Last warning.', 'Touch me again and see what happens.'],
  bump4: ["That's it!", 'Okay, you asked for it!', "You wanna go? Let's go!"],
  copBump: ['Watch it, citizen.', 'Move along.', 'Mind your step.'],
  challenge: ['What you looking at?', 'You got a problem with me?', 'Something funny?', 'You lost or something?', "Nice shoes. Shame if something happened to 'em."],
  challengeOff: ['Yeah. Keep walking.', "That's what I thought.", 'Smart.'],
  mugStart: ['Hey. Run your pockets.', "Don't make this hard. Wallet. Now.", 'Empty your pockets, slow.', 'You know what this is. Hand it over.'],
  mugTook: ['Pleasure doing business.', 'Smart choice.', "Don't follow me."],
  mugOff: ['...Aight. My bad. Wrong person.', 'Tch. Fine. Get outta here.', 'Whatever. Not worth it.'],
  mugAngry: ['Wrong answer.', "Oh, you think you're tough?", 'Then we do it the hard way.'],
  mugChase: ['Get back here!', "You can't outrun me!"],
  stranger: ['Hot one.', 'Mm-hm.', '*hums*', 'Bus is late again.', 'Gotta get to work.', 'Who parks like that?', 'Smells like rain.', "*on the phone* Yeah, I'm almost there."],
  takeBack: ['Hey! That\'s mine!', 'Put that down!', 'That\'s MY {item}!'],
  orderUp: ['Order up!', 'Plate\'s ready!', 'Table\'s waiting, hon!'],
  thanksFood: ['Thanks, hon.', 'Finally! Thank you.', 'Smells great.'],
  sleepy: ['*yawn*', 'Long day...'],
  hungry: ['I could eat.', 'Starving...'],
  rain: ['Here comes the rain.', 'Bayou\'s gonna flood again.', 'Of course it\'s raining.'],
  noise: ['Keep it DOWN!', 'Some of us are sleeping!'],
};

// NPC to NPC small talk, alternating speakers.
export const CHAT = [
  ['You see the rain coming?', 'Every afternoon, like clockwork.'],
  ['Traffic on the loop was a nightmare.', "When isn't it?"],
  ['Rosa\'s brisket today?', 'Best in the ward, don\'t tell her I said that.'],
  ["It's so humid I'm swimming.", "Ninety-six and it feels like a hundred and ten."],
  ['Heard they\'re fixing the bayou trail.', "I'll believe it when I see it."],
  ['You working tomorrow?', 'Always working.'],
  ["Power flickered last night.", 'Whole block went dark for a minute.'],
  ['Kolaches or tacos?', 'Why not both?'],
  ['That storm last year...', "Don't remind me. Water up to the porch."],
  ['How\'s your mama?', 'Hanging in there. Thanks for asking.'],
];

export const NAMES_PLAYER = ['Marcus', 'Tasha', 'Luis', 'Kendra', 'Quan', 'Bianca', 'Darnell', 'Lupe', 'Travis', 'Nia', 'Hector', 'Jade'];

// Strangers on the street (generated, never saved).
export const STRANGER_FIRST = ['Big Mike', 'Tre', 'Lorenzo', 'Dee', 'Shorty', 'Manny', 'Rico', 'Pam', 'Tanya', 'Jo', 'Earl Jr.', 'Bubba', 'Lil Ray', 'Yolanda', 'Cesar', 'Duke', 'Kiki', 'Rudy', 'Sonny', 'Marquis', 'Gloria', 'Tito', 'Nina', 'Beto', 'Junior', 'Crystal', 'Pete', 'Ramon', 'Tiny', 'Dot'];
export const STRANGER_ROLE = {
  walker: ['Passerby', 'Commuter', 'Neighbor from down the block', 'Night owl', 'Delivery driver', 'Dog walker'],
  hothead: ['Loudmouth', 'Hothead', 'Somebody with a chip on their shoulder'],
  scavenger: ['Scrounger', 'Can collector', 'Pickpocket type'],
  thug: ['Corner hustler', 'Stick-up kid', 'Mugger'],
};
