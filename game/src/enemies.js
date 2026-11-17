// Enemies: drifters chase, spitters keep their distance and shoot,
// brutes lumber in heavy, and the Gloomwarden boss fires radial bursts.

import { CONFIG, ENEMY_TYPES, hpScaleAt, speedScaleAt } from './config.js';
import { range } from './random.js';

let nextId = 1;

export class Enemy {
  constructor(kind, x, y, time, rng, elite = false) {
    const def = ENEMY_TYPES[kind];
    this.id = nextId++;
    this.kind = kind;
    this.def = def;
    this.x = x;
    this.y = y;
    this.radius = def.radius;
    const hpScale = hpScaleAt(time);
    this.maxHp = Math.round(def.hp * hpScale);
    this.hp = this.maxHp;
    this.speed = def.speed * speedScaleAt(time) * range(rng, 0.92, 1.08);
    this.damage = def.damage;
    this.xp = def.xp;
    this.embers = def.embers;
    /** Golden elite: tougher, richer, ringed in gold. */
    this.elite = elite;
    if (elite) {
      this.maxHp = Math.round(this.maxHp * 3);
      this.hp = this.maxHp;
      this.radius = Math.round(this.radius * 1.25);
      this.speed *= 0.95;
      this.damage += 4;
      this.embers += 4;
      this.xp += 2;
    }
    this.shootTimer = range(rng, 1.0, def.shootInterval ?? 2);
    /** Seconds of flash after taking a hit. */
    this.flash = 0;
    /** Seconds since this enemy last damaged an orbiter-hit target. */
    this.orbitHitAt = -10;
    this.telegraph = 0;
    this.summoned = false;
    this.wobble = range(rng, 0, Math.PI * 2);
    /** Frost-slow: world time until which this enemy moves at 65%. */
    this.slowUntil = -10;
    /** Charger state machine: 'stalk' | 'windup' | 'lunge' | 'rest'. */
    this.chargeState = 'stalk';
    this.chargeTimer = range(rng, 0.5, 1.5);
    this.chargeDirX = 0;
    this.chargeDirY = 0;
  }

  get alive() {
    return this.hp > 0;
  }

  hurt(amount) {
    this.hp -= amount;
    this.flash = 0.09;
    return this.hp <= 0;
  }

  /** Steer toward (tx, ty) at this enemy's speed (frost-slowed when set). */
  chase(dt, tx, ty) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy) || 1;
    const speed = this.effSpeed ?? this.speed;
    this.x += (dx / d) * speed * dt;
    this.y += (dy / d) * speed * dt;
  }

  update(dt, world) {
    if (this.flash > 0) this.flash -= dt;
    const player = world.player;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const behaviour = this.def.behaviour;
    // Frost-slowed enemies move at 65% until slowUntil passes.
    const slow = world.time < this.slowUntil ? 0.65 : 1;
    const speed = this.speed * slow;
    this.effSpeed = speed;

    if (behaviour === 'chase') {
      this.wobble += dt * 3;
      const wob = Math.sin(this.wobble) * 0.25;
      const nx = dx / dist;
      const ny = dy / dist;
      this.x += (nx + -ny * wob) * speed * dt;
      this.y += (ny + nx * wob) * speed * dt;
    } else if (behaviour === 'charge') {
      // Stalk until close, wind up with a telegraph, lunge, rest, repeat.
      this.chargeTimer -= dt;
      if (this.chargeState === 'stalk') {
        this.chase(dt, player.x, player.y);
        if (dist < 280 && this.chargeTimer <= 0) {
          this.chargeState = 'windup';
          this.chargeTimer = 0.6;
          this.telegraph = 0.6;
        }
      } else if (this.chargeState === 'windup') {
        this.telegraph = Math.max(0, this.chargeTimer);
        if (this.chargeTimer <= 0) {
          this.chargeState = 'lunge';
          this.chargeTimer = this.def.chargeTime;
          this.chargeDirX = dx / dist;
          this.chargeDirY = dy / dist;
          this.telegraph = 0;
        }
      } else if (this.chargeState === 'lunge') {
        this.x += this.chargeDirX * this.def.chargeSpeed * dt;
        this.y += this.chargeDirY * this.def.chargeSpeed * dt;
        if (this.chargeTimer <= 0) {
          this.chargeState = 'rest';
          this.chargeTimer = this.def.chargeCooldown;
        }
      } else {
        if (this.chargeTimer <= 0) {
          this.chargeState = 'stalk';
          this.chargeTimer = 0.4;
        }
      }
    } else if (behaviour === 'skirmish') {
      const keep = this.def.keepRange;
      if (dist > keep + 40) {
        this.chase(dt, player.x, player.y);
      } else if (dist < keep - 60) {
        this.x -= (dx / dist) * speed * dt;
        this.y -= (dy / dist) * speed * dt;
      } else {
        // Strafe sideways while holding range.
        const nx = dx / dist;
        const ny = dy / dist;
        const dir = Math.sin(this.wobble + world.time) > 0 ? 1 : -1;
        this.x += -ny * dir * speed * 0.6 * dt;
        this.y += nx * dir * speed * 0.6 * dt;
      }
      this.shootTimer -= dt;
      if (this.shootTimer <= 0 && dist < 560) {
        this.telegraph = 0.35;
        this.shootTimer = this.def.shootInterval;
        world.queueEnemyShot(this, dx / dist, dy / dist, this.def.shotSpeed, this.damage);
      }
      if (this.telegraph > 0) this.telegraph -= dt;
    } else if (behaviour === 'boss') {
      this.chase(dt, player.x, player.y);
      this.shootTimer -= dt;
      if (this.shootTimer <= 0) {
        this.shootTimer = this.def.shootInterval;
        world.queueBossBurst(this);
      }
      // At half health the boss calls for help, once.
      if (!this.summoned && this.hp < this.maxHp * 0.5) {
        this.summoned = true;
        world.spawnMinions(this, 4);
      }
    }
  }
}

/** Create an enemy of a kind at a position, scaled to the night's time. */
export function makeEnemy(kind, x, y, time, rng, elite = false) {
  return new Enemy(kind, x, y, time, rng, elite);
}

/** A point just outside a random arena edge, for spawning. */
export function spawnPoint(rng) {
  const edge = Math.floor(rng() * 4);
  const m = 30;
  if (edge === 0) return { x: range(rng, 0, CONFIG.width), y: -m };
  if (edge === 1) return { x: CONFIG.width + m, y: range(rng, 0, CONFIG.height) };
  if (edge === 2) return { x: range(rng, 0, CONFIG.width), y: CONFIG.height + m };
  return { x: -m, y: range(rng, 0, CONFIG.height) };
}
