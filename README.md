# H-Town Nights

A freeform life sim in the spirit of *Hard Time*: one person in a living, Houston-inspired city.
No missions, no win screen. Eat, sleep, work, drive, rent, talk, fight and build a name. Everyone
you meet keeps a memory of what you did — and they bring it up.

Pure HTML5 Canvas + vanilla JS modules. No build step, no dependencies, all art and sound made in code.

## Play

ES modules need a local web server (opening `index.html` straight from disk won't load them):

```bash
python tools/serve.py
```

Then open http://localhost:5791. Any static server works (`npx http-server`, GitHub Pages, …).

**Controls** — `WASD`/arrows move · `Shift` run · `E` act/talk/pick up · `F` strike (or fire) ·
`Space` back off · `R` use what you hold · `Q` drop · `I` bag · `P` people · `C` you · `B` board ·
`L` log · `Esc` menu. Driving: `W`/`S` gas/brake, `A`/`D` steer, `Space` handbrake, `E` get out,
`R` radio. On touch screens the left thumb is a stick and the action buttons sit on the right.

## The city

Six streamed street blocks (walk or drive straight across them) and 25+ interiors:

| Block | What's there |
|---|---|
| Pecan & Bayou | Bayou Arms (hallway, your Unit 2B), Starlite Diner, Iron Bayou Gym, Live Oak Park |
| Pecan & Main | Quik Stop, Gulf Coast Savings + 24h ATM, taco lot, vacant lot |
| Pecan & Harbor | 5th Precinct (fines, permits & license tests), St. Ann's ER, Harbor Pawn & Thrift |
| Canal & Bayou | Lone Star Auto (repairs, Stall 3), Bayou Warehouse, Big Tex Motors, U-Stor |
| Canal & Main | Velvet Room club, job site, Gas & Go, Bayou City Cabs |
| Canal & Harbor | Ranger Arms (gun counter + range), Harbor Lofts, bayou trail, courts |

## Systems

- **You**: health, mind, hunger, thirst, stamina, strength, agility, aim, intellect, reputation, heat,
  cash (an item), bank balance. Stats drift down unused and rise through use (gym, running, books, range).
- **29 persistent people** with schedules, five personalities, relationships with you *and each other*,
  and eight memory lines each. They quote the latest thing they remember; gossip moves opinions.
- **Talk** in three tones (Easy / Straight / Hard), odds from intellect, reputation and relationship.
  Favors with deadlines; welching is remembered.
- **Work**: nine jobs made of real tasks (serve, restock, carry, wipe, mop, deliver across town, drive
  fares). Hours → promotions → more pay and a staff room.
- **Money**: grid inventory, apartment stash, car trunks; bank deposits with a weekly cap and a
  transaction log; ATM with a card animation; weekly rent with lockout; fines and hospital bills.
- **Fights**: strike and back off; witnesses remember who started it. Drop to zero and you wake in
  St. Ann's with everything you carried left where you fell. Police break up fights, confiscate
  visible weapons, and stop you when your heat is high.
- **Cars**: weight, soft steering, skids (worse in the rain), handbrake, panel damage, crash ejection,
  fuel, one radio station, chase camera; repairs and a garage stall at Lone Star Auto; buy at Big Tex.
- **Licenses**: driver and firearm tests at the precinct (intellect greys out wrong answers).
- **Crews**: Cottonmouths and Canal Kings — join, be asked, or stay solo; hostility rises with public
  insults and cools members toward rivals; under-the-table favors pay cash and add heat.
- **The other economy** (abstract): a storage-unit grow table for a fictional crop, a mining rig whose
  coin price is computed from the clock, a bank market terminal, buyers who remember the deal.
- **Home**: lease a loft and a storage unit; buy furniture and place it yourself.
- Day/night, Gulf-coast afternoon storms, synthesized audio, local autosave (versioned JSON).

## Layout

```
src/sim/    simulation (DOM-free, runs headless): world, nav, actors, memory, talk, fight, ai,
            work, police, money, cars, licenses, crews, economy, furniture, board
src/data/   rooms (3 stages), items, people, personalities, jobs & favors, shops, cars, licenses,
            crews, dialogue fragments
src/view/   canvas view: painted backdrops, props, characters, cars, lighting, weather
src/ui/     DOM overlay: HUD, talk, menus, panels, title and character creation
tests/      node tests/headless.mjs [days] (soak)  ·  node tests/scenario.mjs (scripted walkthrough)
tools/      serve.py (no-cache dev server)
```

Rendering never decides rules; the view only reads sim state and sends commands. Only rooms near
you tick in real time — everyone else advances on the clock. Saves migrate forward as the city grows.
