// Deterministic shot scenes: the game staged for its screenshots.
// ?shot=title|play|victory|gameover&seed=<n> — a seeded generator, fixed
// simulated time, no wall clock; the caller draws one frame and sets
// window.__shotReady when the scene is fully drawn.

import { CONFIG } from './config.js';
import { makeRng } from './random.js';
import { Player } from './player.js';
import { World } from './world.js';
import { makeEnemy } from './enemies.js';
import { rollChoices, applyUpgrade } from './upgrades.js';
import { AudioEngine } from './audio.js';

/** A silent audio engine: shots never need sound. */
function silentAudio() {
  const audio = new AudioEngine();
  audio.muted = true;
  return audio;
}

/** Simulate `seconds` of play with a scripted keeper (circle walk, auto-pick). */
function simulatePlay(world, player, seconds) {
  const rng = world.rng;
  let simTime = 0;
  const fakeInput = {
    moveVector() {
      const a = simTime * 0.85;
      return { x: Math.cos(a), y: Math.sin(a) * 0.7 };
    },
    wasPressed() {
      return false;
    },
  };
  const steps = Math.round(seconds / CONFIG.step);
  for (let i = 0; i < steps; i++) {
    simTime += CONFIG.step;
    world.update(CONFIG.step, fakeInput);
    // Keep the staged keeper alive and out of the level-up overlay.
    if (player.hp < 45) player.hp = player.maxHp;
    while (player.pendingLevels > 0) {
      const choices = rollChoices(rng, world.owned, 3);
      applyUpgrade(player, world.owned, choices[0]);
      player.pendingLevels -= 1;
    }
    if (!player.alive) break;
  }
}

/** Scatter enemies at fixed seeded spots for an end-screen backdrop. */
function stageBackdrop(world, kinds) {
  const rng = world.rng;
  kinds.forEach((kind) => {
    const x = 80 + rng() * (CONFIG.width - 160);
    const y = 120 + rng() * (CONFIG.height - 240);
    world.enemies.push(makeEnemy(kind, x, y, world.time, rng));
  });
}

/**
 * Build one shot scene. Returns { state, world, player, time } where time
 * is the fixed animation clock the renderer should use.
 */
export function setupShot(scene, seed) {
  const rng = makeRng(seed);
  const audio = silentAudio();
  const world = new World(rng, audio);
  const player = new Player();
  world.reset(player);

  if (scene === 'title') {
    return { state: 'title', world, player, time: 3.2 };
  }

  if (scene === 'play') {
    simulatePlay(world, player, 100);
    return { state: 'playing', world, player, time: world.time };
  }

  if (scene === 'victory') {
    world.time = CONFIG.gameDuration;
    world.kills = 384;
    world.score = 384 * 10 + CONFIG.gameDuration + 14 * 25;
    player.level = 14;
    player.xp = 30;
    player.xpNeed = 64;
    player.hp = 78;
    player.orbiters = 2;
    player.boltsPerVolley = 2;
    stageBackdrop(world, ['drifter', 'drifter', 'spitter', 'brute', 'drifter', 'spitter', 'drifter', 'brute']);
    return { state: 'victory', world, player, time: 600 };
  }

  if (scene === 'gameover') {
    world.time = 342;
    world.kills = 187;
    world.score = 187 * 10 + 342 + 8 * 25;
    player.level = 8;
    player.xp = 12;
    player.xpNeed = 40;
    player.hp = 0;
    stageBackdrop(world, ['drifter', 'drifter', 'spitter', 'brute', 'drifter', 'spitter', 'drifter', 'drifter']);
    return { state: 'gameover', world, player, time: 342 };
  }

  // Unknown scene: fall back to the title.
  return { state: 'title', world, player, time: 3.2 };
}
