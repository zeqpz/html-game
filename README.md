# H-Town Nights

A freeform life sim in the spirit of *Hard Time*: one person in a living, Houston-inspired city.
No missions, no win screen. Eat, sleep, work, talk, fight and build a name. Everyone you meet keeps
a memory of what you did — and they bring it up.

Pure HTML5 Canvas + vanilla JS modules. No build step, no dependencies, all art drawn in code.

## Play

ES modules need a local web server (opening `index.html` from disk won't load them):

```bash
python tools/serve.py
```

Then open http://localhost:5791. Any static server works (`npx http-server`, GitHub Pages, …).

**Controls** — `WASD`/arrows move · `Shift` run · `E` act/talk/pick up · `F` strike · `Space` back off ·
`R` use what you hold · `Q` drop · `I` bag · `P` people · `C` you · `B` board · `L` log · `Esc` menu.
On touch screens the left thumb is a stick and the action buttons sit on the right.

## What's in the first slice

- Four connected spaces: your apartment (Bayou Arms 2B), the Pecan St & Bayou Rd street block, the
  Starlite Diner and the Iron Bayou Gym — all painted procedurally, with day/night and Gulf-coast
  afternoon storms computed from the clock.
- You: health, mind, hunger, thirst, stamina, strength, agility, aim, intellect, reputation, cash and a bank balance.
- Four persistent people with schedules, personalities (steady, volatile, sly, proud, tired),
  relationships and up to eight memory lines each. They quote the latest thing they remember.
- Talk in three tones (Easy / Straight / Hard). Odds use intellect, reputation and how they feel about you.
- Favors with deadlines (bring Ms. Okoro a plate, keep it quiet after midnight, find Javi's phone…).
- A paid diner shift made of real tasks: pick up orders, serve tables, wipe down, mop.
- Grid inventory (hands + pockets), apartment closet and fridge, loose items that spawn at dawn.
- Fights: strike, back off. Witnesses remember who started it. Drop to zero and everything you carried
  lands where you fell — and somebody might pick it up.
- Sleep fast-forwards the night. Local autosave (versioned JSON in `localStorage`).

## Layout

```
src/sim/    simulation (DOM-free, runs headless): world, nav, actors, memory, talk, fight, ai, work, police, board
src/data/   rooms, items, people, personalities, jobs, favors, shops, dialogue fragments
src/view/   canvas view: painted backdrops, props, characters, lighting, weather
src/ui/     DOM overlay: HUD, talk, menus, panels, title and character creation
tests/      node tests/headless.mjs (multi-day soak) · node tests/scenario.mjs (slice walkthrough)
```

Rendering never decides rules; the view only reads sim state and sends commands.
Only rooms near you tick in real time — everyone else advances on the clock.
