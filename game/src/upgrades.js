// Level-up upgrades: each choice matters, each with a stack cap.
// The pool is the game's depth — damage, rate, speed, survival, and new
// ways to deal damage (chain bolts, orbiting embers, extra bolts).

import { CONFIG } from './config.js';
import { shuffle } from './random.js';

export const UPGRADES = [
  {
    id: 'damage',
    name: 'Bright Bolts',
    desc: '+25% lantern bolt damage',
    max: 5,
    apply(player) {
      player.boltDamage *= 1.25;
    },
  },
  {
    id: 'rate',
    name: 'Swift Wick',
    desc: '+20% fire rate',
    max: 5,
    apply(player) {
      player.fireInterval = Math.max(0.28, player.fireInterval * 0.83);
    },
  },
  {
    id: 'speed',
    name: 'Long Stride',
    desc: '+12% move speed',
    max: 4,
    apply(player) {
      player.speed *= 1.12;
    },
  },
  {
    id: 'health',
    name: 'Sturdy Lantern',
    desc: '+25 max health and heal 25',
    max: 5,
    apply(player) {
      player.maxHp += 25;
      player.heal(25);
    },
  },
  {
    id: 'dash',
    name: 'Quick Dash',
    desc: 'Dash recharges 25% faster',
    max: 4,
    apply(player) {
      player.dashCooldownMax = Math.max(1.2, player.dashCooldownMax * 0.75);
    },
  },
  {
    id: 'chain',
    name: 'Chain Light',
    desc: 'Bolts jump to +1 nearby wisp',
    max: 3,
    apply(player) {
      player.chainJumps += 1;
    },
  },
  {
    id: 'orbit',
    name: 'Orbiting Embers',
    desc: '+1 ember orbiting you, burning wisps',
    max: 4,
    apply(player) {
      player.orbiters += 1;
    },
  },
  {
    id: 'magnet',
    name: 'Wide Magnet',
    desc: '+60% ember pickup radius',
    max: 3,
    apply(player) {
      player.magnetRadius *= 1.6;
    },
  },
  {
    id: 'twin',
    name: 'Twin Flame',
    desc: '+1 bolt every volley',
    max: 3,
    apply(player) {
      player.boltsPerVolley += 1;
    },
  },
  {
    id: 'armor',
    name: 'Thick Glass',
    desc: 'Take 1 less damage from every hit',
    max: 3,
    apply(player) {
      player.armor += 1;
    },
  },
  {
    id: 'nova',
    name: 'Nova Burst',
    desc: 'Every level-up erupts in a ring of light',
    max: 2,
    apply(player) {
      player.novaOnLevel += 1;
    },
  },
  {
    id: 'crit',
    name: 'Critical Flare',
    desc: 'Bolts have +15% chance to deal double damage',
    max: 3,
    apply(player) {
      player.critChance += 0.15;
    },
  },
  {
    id: 'frost',
    name: 'Frost Wick',
    desc: 'Bolts chill wisps, slowing them by 35%',
    max: 2,
    apply(player) {
      player.slowOnHit += 1;
    },
  },
  {
    id: 'revive',
    name: 'Second Light',
    desc: 'Once per run, return from the dark at half health',
    max: 1,
    apply(player) {
      player.revives += 1;
    },
  },
];

/** Roll `count` distinct upgrades the player has not maxed out. */
export function rollChoices(rng, owned, count = 3) {
  const available = UPGRADES.filter((u) => (owned[u.id] ?? 0) < u.max);
  shuffle(rng, available);
  const choices = available.slice(0, count);
  // If the pool is nearly exhausted, fill with the best repeatable pick.
  while (choices.length < count) {
    const fallback = UPGRADES.find((u) => (owned[u.id] ?? 0) < u.max) ?? UPGRADES[0];
    choices.push(fallback);
  }
  return choices;
}

/** Apply an upgrade and record its stack. */
export function applyUpgrade(player, owned, upgrade) {
  upgrade.apply(player);
  owned[upgrade.id] = (owned[upgrade.id] ?? 0) + 1;
  return owned[upgrade.id];
}

/** XP embers needed is defined in config; this is the level-up helper. */
export function xpNeedFor(level) {
  return CONFIG.xpBase + CONFIG.xpPerLevel * level;
}
