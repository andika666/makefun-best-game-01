// Emberfield: Hold the Light — game configuration.
// Every number that tunes the game lives here, so balancing is one file.

export const CONFIG = {
  width: 1280,
  height: 720,
  /** Seconds of night to survive for victory. */
  gameDuration: 600,
  /** Fixed simulation step (seconds). */
  step: 1 / 60,
  /** How many enemies may be alive at once. */
  enemyCap: 110,
  /** Pixels the player is kept inside the arena. */
  arenaMargin: 24,
  /** Player base stats. */
  player: {
    radius: 16,
    speed: 235,
    maxHp: 100,
    boltDamage: 15,
    boltSpeed: 580,
    fireInterval: 0.8,
    boltsPerVolley: 1,
    chainJumps: 0,
    magnetRadius: 90,
    pickupRadius: 26,
    dashCooldown: 3.0,
    dashTime: 0.18,
    dashSpeed: 3.1,
    armor: 0,
    orbiters: 0,
    orbitDamage: 10,
    orbitRadius: 74,
  },
  /** XP needed for the next level: base + per-level growth. */
  xpBase: 8,
  xpPerLevel: 4,
  /** Bosses arrive at these times (seconds). */
  bossTimes: [120, 240, 360, 480],
};

/** Enemy kinds: each with its own behaviour, look and feel. */
export const ENEMY_TYPES = {
  drifter: {
    name: 'Drifter',
    radius: 14,
    hp: 15,
    speed: 96,
    damage: 8,
    xp: 1,
    embers: 1,
    color: '#8b7cff',
    core: '#c9bfff',
    behaviour: 'chase',
  },
  spitter: {
    name: 'Spitter',
    radius: 13,
    hp: 12,
    speed: 78,
    damage: 8,
    xp: 1,
    embers: 1,
    color: '#5eead4',
    core: '#d2fff5',
    behaviour: 'skirmish',
    shootInterval: 2.4,
    shotSpeed: 195,
    keepRange: 270,
  },
  brute: {
    name: 'Brute',
    radius: 26,
    hp: 95,
    speed: 52,
    damage: 18,
    xp: 3,
    embers: 4,
    color: '#e05252',
    core: '#ffb3b3',
    behaviour: 'chase',
  },
  /** Telegraphed dasher: winds up, then lunges at the keeper. */
  charger: {
    name: 'Charger',
    radius: 15,
    hp: 22,
    speed: 88,
    damage: 12,
    xp: 2,
    embers: 2,
    color: '#f0a832',
    core: '#ffe9a8',
    behaviour: 'charge',
    chargeSpeed: 520,
    chargeTime: 0.45,
    chargeCooldown: 2.4,
  },
  /** Splits into two fast motes when banished. */
  splitter: {
    name: 'Splitter',
    radius: 18,
    hp: 30,
    speed: 70,
    damage: 10,
    xp: 2,
    embers: 2,
    color: '#7ee787',
    core: '#d2ffd2',
    behaviour: 'chase',
  },
  /** Tiny fast wisp, born only from a splitter. */
  mote: {
    name: 'Mote',
    radius: 8,
    hp: 6,
    speed: 150,
    damage: 5,
    xp: 1,
    embers: 1,
    color: '#b8f5c8',
    core: '#ffffff',
    behaviour: 'chase',
  },
  boss: {
    name: 'Gloomwarden',
    radius: 46,
    hp: 950,
    speed: 54,
    damage: 25,
    xp: 0,
    embers: 24,
    color: '#a855f7',
    core: '#f0c9ff',
    behaviour: 'boss',
    shootInterval: 3.6,
    shotSpeed: 155,
  },
};

/** How the night escalates: spawn interval and batch size over time. */
export function spawnIntervalAt(time) {
  return Math.max(0.42, 1.4 - time * 0.0022);
}
export function spawnBatchAt(time) {
  return 1 + Math.floor(time / 55);
}
/** The three nights: one arena, three escalating runs with their own look. */
export const NIGHTS = [
  {
    id: 0, name: 'Night I', sub: 'First Dark',
    spawnMul: 1, eliteFrom: 90, chargerFrom: 60, spitterFrom: 45, splitterFrom: 120,
    palette: null,
  },
  {
    id: 1, name: 'Night II', sub: 'Thickening Dark',
    spawnMul: 0.85, eliteFrom: 75, chargerFrom: 30, spitterFrom: 30, splitterFrom: 90,
    palette: { skyTop: '#0d0a2e', skyBottom: '#2a1448', ground: '#171230' },
  },
  {
    id: 2, name: 'Night III', sub: 'Blood Moon',
    spawnMul: 0.7, eliteFrom: 45, chargerFrom: 20, spitterFrom: 20, splitterFrom: 60,
    palette: { skyTop: '#160a12', skyBottom: '#3a0f1e', ground: '#1c0f16' },
  },
];

/** Enemy health scales with the night. */
export function hpScaleAt(time) {
  return 1 + (time / 60) * 0.09;
}
/** Enemy speed scales gently with the night. */
export function speedScaleAt(time) {
  return 1 + Math.min(0.35, (time / 60) * 0.02);
}

/** Which kinds may appear at a given time, with weights. */
export function spawnWeightsAt(time, night = NIGHTS[0]) {
  const table = [{ kind: 'drifter', weight: 10 }];
  if (time >= night.spitterFrom) table.push({ kind: 'spitter', weight: 4 + time / 120 });
  if (time >= night.chargerFrom) table.push({ kind: 'charger', weight: 2 + time / 180 });
  if (time >= 90) table.push({ kind: 'brute', weight: 2 + time / 150 });
  if (time >= night.splitterFrom) table.push({ kind: 'splitter', weight: 2 + time / 200 });
  return table;
}

/** Chance (0..1) that a brute or spitter spawns as a golden elite. */
export function eliteChanceAt(time, night = NIGHTS[0]) {
  return time >= night.eliteFrom ? 0.06 : 0;
}

/** Palette: one coherent night-and-lantern look. */
export const PALETTE = {
  skyTop: '#0a0e24',
  skyBottom: '#1c1440',
  ground: '#12172e',
  groundLine: '#232a4d',
  amber: '#ffb347',
  amberBright: '#ffd98a',
  ember: '#ff8a3d',
  lanternGlow: 'rgba(255, 179, 71, 0.28)',
  text: '#f4ead8',
  textDim: '#b9b3d6',
  panel: 'rgba(10, 14, 36, 0.88)',
  panelEdge: '#4a3f7a',
  hpGood: '#7ee787',
  hpLow: '#ff6b6b',
  xp: '#ffd166',
  danger: '#ff5d5d',
};
