// The lantern-keeper: movement, dash, health, XP and levels.

import { CONFIG } from './config.js';

export class Player {
  constructor() {
    const p = CONFIG.player;
    this.x = CONFIG.width / 2;
    this.y = CONFIG.height / 2;
    this.radius = p.radius;
    this.speed = p.speed;
    this.maxHp = p.maxHp;
    this.hp = p.maxHp;
    this.level = 1;
    this.xp = 0;
    this.xpNeed = CONFIG.xpBase + CONFIG.xpPerLevel * 1;
    this.pendingLevels = 0;
    /** Seconds until the next lantern bolt. */
    this.fireTimer = 0.4;
    this.boltDamage = p.boltDamage;
    this.boltSpeed = p.boltSpeed;
    this.fireInterval = p.fireInterval;
    this.boltsPerVolley = p.boltsPerVolley;
    this.chainJumps = p.chainJumps;
    this.magnetRadius = p.magnetRadius;
    this.pickupRadius = p.pickupRadius;
    this.dashCooldownMax = p.dashCooldown;
    this.dashCooldown = 0;
    this.dashTime = 0;
    this.dashDirX = 0;
    this.dashDirY = -1;
    this.armor = p.armor;
    this.orbiters = p.orbiters;
    this.orbitDamage = p.orbitDamage;
    this.orbitRadius = p.orbitRadius;
    this.orbitAngle = 0;
    /** Seconds of invulnerability left after a hit or a dash. */
    this.invuln = 0;
    /** Facing angle, for the lantern flame. */
    this.facing = -Math.PI / 2;
    this.moveX = 0;
    this.moveY = 0;
    this.moving = false;
  }

  xpNeedFor(level) {
    return CONFIG.xpBase + CONFIG.xpPerLevel * level;
  }

  gainXp(amount) {
    this.xp += amount;
    while (this.xp >= this.xpNeed) {
      this.xp -= this.xpNeed;
      this.level += 1;
      this.xpNeed = this.xpNeedFor(this.level);
      this.pendingLevels += 1;
    }
  }

  /** Damage taken after armor; returns the damage actually dealt. */
  takeDamage(amount) {
    if (this.invuln > 0 || this.dashTime > 0) return 0;
    const dealt = Math.max(1, amount - this.armor);
    this.hp = Math.max(0, this.hp - dealt);
    this.invuln = 0.8;
    return dealt;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  tryDash() {
    if (this.dashCooldown > 0 || this.dashTime > 0) return false;
    if (this.moving) {
      this.dashDirX = this.moveX;
      this.dashDirY = this.moveY;
    } else {
      this.dashDirX = Math.cos(this.facing);
      this.dashDirY = Math.sin(this.facing);
    }
    this.dashTime = CONFIG.player.dashTime;
    this.dashCooldown = this.dashCooldownMax;
    this.invuln = Math.max(this.invuln, CONFIG.player.dashTime + 0.05);
    return true;
  }

  update(dt, input) {
    const mv = input.moveVector();
    this.moveX = mv.x;
    this.moveY = mv.y;
    this.moving = mv.x !== 0 || mv.y !== 0;
    if (this.moving) this.facing = Math.atan2(mv.y, mv.x);
    if (this.invuln > 0) this.invuln -= dt;
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.fireTimer > 0) this.fireTimer -= dt;

    let vx = 0;
    let vy = 0;
    if (this.dashTime > 0) {
      this.dashTime -= dt;
      vx = this.dashDirX * this.speed * CONFIG.player.dashSpeed;
      vy = this.dashDirY * this.speed * CONFIG.player.dashSpeed;
    } else if (this.moving) {
      vx = mv.x * this.speed;
      vy = mv.y * this.speed;
    }
    this.x += vx * dt;
    this.y += vy * dt;
    const m = CONFIG.arenaMargin;
    this.x = Math.max(m + this.radius, Math.min(CONFIG.width - m - this.radius, this.x));
    this.y = Math.max(m + this.radius, Math.min(CONFIG.height - m - this.radius, this.y));
    this.orbitAngle += dt * 3.4;
  }

  get alive() {
    return this.hp > 0;
  }
}
