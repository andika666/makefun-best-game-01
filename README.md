[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/andika666/makefun-best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/andika666/makefun-best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

# Emberfield: Hold the Light

A 2D canvas survivors-like, built for make.fun's [best-game-01](https://make.fun/bounty/best-game-01) bounty. You are the last lantern-keeper; the dark sends its wisps. Survive the night until dawn (10:00) and the light endures.

## How to play

- **Move:** WASD or arrow keys
- **Dash:** Space (brief invulnerability, 3 s cooldown)
- **Pause:** P or Esc — **Mute:** M
- Your lantern fires bolts on its own at the nearest wisp.
- Banished wisps drop **embers**. Gather them to level up, then pick one of three upgrades: more damage, faster fire, chain lightning, orbiting embers, extra bolts, thicker glass, nova bursts, critical flares, frost wick, a second light, and more. Choices matter — they stack into very different builds.
- **Enemies:** Drifters chase you, Spitters keep their distance and shoot, Brutes lumber in heavy, Chargers telegraph a lunge, Splitters burst into fast motes, and golden **elites** drop hearts, magnets and novas. Every 2 minutes the **Gloomwarden** boss wakes, fires radial bursts and calls its wisps.
- **Streaks:** banish wisps within 3 s of each other to build a combo multiplier on your score.
- **Three nights:** Night I (First Dark), Night II (Thickening Dark) and Night III (Blood Moon) — each night brings chargers, spitters, splitters and elites earlier, spawns faster, and tints the whole field its own palette. Pick your night on the title screen.
- **Lantern Upgrades:** embers you gather are banked between runs and buy permanent upgrades in the shop on the title screen — Bright Wick (+10% bolt damage), Sturdy Frame (+25 max health), Wide Net (+20% ember magnet), three levels each.
- **Win:** survive until 10:00 — with a 1–3 star rating for how much light you kept. **Lose:** your lantern goes out. Your best result is kept in localStorage.

## Feel

Particles on every hit and kill, screen shake, hit-stop on heavy kills, floating damage numbers, a dash trail, and fully synthesized WebAudio sound (no audio files): bolt blips, pickup chimes, a level-up arpeggio, boss roars, a title jingle and victory fanfare.

## Run it

Serve `game/` with any static file server and open `index.html` in desktop Chrome. No network requests, no build step, plain ES modules, Canvas 2D only.

```sh
cd game && python3 -m http.server 8080
# open http://localhost:8080
```

Deterministic screenshots: `index.html?shot=title|play|victory|gameover&seed=7` stages a fixed scene and sets `window.__shotReady` when drawn.

## Structure

- `game/src/config.js` — tuning, enemy kinds, palette, the three nights
- `game/src/meta.js` — the ember bank and the Lantern Upgrades shop
- `game/src/random.js` — seeded RNG
- `game/src/input.js` — keyboard + mouse
- `game/src/audio.js` — WebAudio synth effects and jingle
- `game/src/player.js` — the lantern-keeper
- `game/src/enemies.js` — drifter, spitter, brute, charger, splitter, mote, elite, boss
- `game/src/pickups.js` — heart, magnet and nova drops
- `game/src/upgrades.js` — the level-up pool
- `game/src/world.js` — spawning, waves, bolts, collisions, streaks
- `game/src/render.js` — field, HUD and every screen
- `game/src/shots.js` — deterministic shot scenes
- `game/src/main.js` — boot, state machine, main loop

`main.ts` hands the game in: it copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the kit's `vendor/makefun-game.ts`.
