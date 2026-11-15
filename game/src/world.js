// The world: spawning, waves, bosses, bolts, embers, particles and
// every collision. One fixed step of this is one tick of the night.

import { CONFIG, ENEMY_TYPES, spawnBatchAt, spawnIntervalAt, spawnWeightsAt } from './config.js';
import { makeEnemy, spawnPoint } from './enemies.js';
import { range, weightedPick } from './random.js';

export class World {
  constructor(rng, audio) {
    this.rng = rng;
    this.audio = audio;
    this.time = 0;
    this.kills = 0;
    this.score = 0;
    this.enemies = [];
    this.bolts = [];
    this.enemyShots = [];
    this.embers = [];
    this.particles = [];
    this.floats = [];
    this.player = null;
    this.spawnTimer = 1.2;
    this.bossIndex = 0;
    this.bossActive = null;
    this.banner = null;
    this.bannerTimer = 0;
    this.shake = 0;
    this.hitStop = 0;
    this.owned = {};
    /** Decorative ground tufts and stones, fixed per run. */
    this.decor = [];
    for (let i = 0; i < 46; i++) {
      this.decor.push({
        x: range(rng, 20, CONFIG.width - 20),
        y: range(rng, 20, CONFIG.height - 20),
        kind: i % 3,
        s: range(rng, 0.7, 1.4),
      });
    }
  }

  reset(player) {
    this.player = player;
    this.time = 0;
    this.kills = 0;
    this.score = 0;
    this.enemies = [];
    this.bolts = [];
    this.enemyShots = [];
    this.embers = [];
    this.particles = [];
    this.floats = [];
    this.spawnTimer = 1.2;
    this.bossIndex = 0;
    this.bossActive = null;
    this.banner = null;
    this.bannerTimer = 0;
    this.shake = 0;
    this.hitStop = 0;
    this.owned = {};
  }

  get wave() {
    return Math.floor(this.time / 30) + 1;
  }

  get dawnIn() {
    return Math.max(0, CONFIG.gameDuration - this.time);
  }

  addShake(amount) {
    this.shake = Math.min(14, this.shake + amount);
  }

  burst(x, y, color, count, speed = 160, life = 0.5, size = 3) {
    for (let i = 0; i < count; i++) {
      const a = this.rng() * Math.PI * 2;
      const v = range(this.rng, speed * 0.3, speed);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: range(this.rng, life * 0.5, life),
        maxLife: life,
        size: range(this.rng, size * 0.5, size * 1.4),
        color,
      });
    }
  }

  floatText(x, y, text, color) {
    this.floats.push({ x, y, text, color, life: 0.8, maxLife: 0.8 });
  }

  queueEnemyShot(enemy, dx, dy, speed, damage) {
    this.enemyShots.push({
      x: enemy.x + dx * (enemy.radius + 6),
      y: enemy.y + dy * (enemy.radius + 6),
      vx: dx * speed,
      vy: dy * speed,
      radius: 6,
      damage,
      life: 4,
    });
  }

  queueBossBurst(boss) {
    const n = 10;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + this.time * 0.3;
      this.enemyShots.push({
        x: boss.x + Math.cos(a) * (boss.radius + 8),
        y: boss.y + Math.sin(a) * (boss.radius + 8),
        vx: Math.cos(a) * 155,
        vy: Math.sin(a) * 155,
        radius: 7,
        damage: boss.damage - 13,
        life: 5,
      });
    }
    this.addShake(4);
    this.audio.bossRoar();
  }

  spawnMinions(boss, count) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      this.enemies.push(makeEnemy('drifter', boss.x + Math.cos(a) * 70, boss.y + Math.sin(a) * 70, this.time, this.rng));
    }
    this.banner = 'The Gloomwarden calls its wisps!';
    this.bannerTimer = 2.2;
  }

  spawnBoss() {
    const point = spawnPoint(this.rng);
    const boss = makeEnemy('boss', point.x, point.y, this.time, this.rng);
    boss.maxHp = 950 + this.bossIndex * 450;
    boss.hp = boss.maxHp;
    this.enemies.push(boss);
    this.bossActive = boss;
    this.bossIndex += 1;
    this.banner = 'THE GLOOMWARDEN AWAKENS';
    this.bannerTimer = 2.6;
    this.audio.bossRoar();
  }

  spawnWave(dt) {
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    this.spawnTimer = spawnIntervalAt(this.time);
    if (this.enemies.length >= CONFIG.enemyCap) return;
    const batch = spawnBatchAt(this.time);
    const weights = spawnWeightsAt(this.time);
    for (let i = 0; i < batch; i++) {
      const kind = weightedPick(this.rng, weights);
      const point = spawnPoint(this.rng);
      this.enemies.push(makeEnemy(kind, point.x, point.y, this.time, this.rng));
    }
  }

  /** The lantern fires a volley at the nearest enemy. */
  autoFire() {
    const player = this.player;
    if (this.enemies.length === 0) return;
    let best = null;
    let bestD = Infinity;
    for (const e of this.enemies) {
      const d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    if (!best || bestD > 620) return;
    const baseAngle = Math.atan2(best.y - player.y, best.x - player.x);
    const spread = 0.16;
    const n = player.boltsPerVolley;
    for (let i = 0; i < n; i++) {
      const off = n === 1 ? 0 : (i - (n - 1) / 2) * spread;
      const a = baseAngle + off;
      this.bolts.push({
        x: player.x + Math.cos(a) * (player.radius + 8),
        y: player.y + Math.sin(a) * (player.radius + 8),
        vx: Math.cos(a) * player.boltSpeed,
        vy: Math.sin(a) * player.boltSpeed,
        radius: 5,
        damage: player.boltDamage,
        chainLeft: player.chainJumps,
        life: 1.6,
      });
    }
    this.audio.shoot();
    this.burst(player.x, player.y, '#ffd98a', 2, 60, 0.25, 2);
  }

  damageEnemy(enemy, amount, fromBolt) {
    const died = enemy.hurt(amount);
    this.floatText(enemy.x, enemy.y - enemy.radius - 6, String(Math.round(amount)), '#ffe9a8');
    this.burst(enemy.x, enemy.y, enemy.def.color, 4, 130, 0.35, 2.5);
    if (died) {
      this.killEnemy(enemy);
      return true;
    }
    this.audio.hitEnemy();
    if (fromBolt && fromBolt.chainLeft > 0) {
      // Chain lightning: jump to the nearest other wisp in range.
      let next = null;
      let nextD = 200;
      for (const e of this.enemies) {
        if (e === enemy || !e.alive) continue;
        const d = Math.hypot(e.x - enemy.x, e.y - enemy.y);
        if (d < nextD) {
          nextD = d;
          next = e;
        }
      }
      if (next) {
        const a = Math.atan2(next.y - enemy.y, next.x - enemy.x);
        this.bolts.push({
          x: enemy.x,
          y: enemy.y,
          vx: Math.cos(a) * 700,
          vy: Math.sin(a) * 700,
          radius: 4,
          damage: amount * 0.8,
          chainLeft: fromBolt.chainLeft - 1,
          life: 0.5,
        });
      }
    }
    return false;
  }

  killEnemy(enemy) {
    this.kills += 1;
    this.score += 10;
    this.burst(enemy.x, enemy.y, enemy.def.color, 16, 220, 0.6, 3.5);
    this.burst(enemy.x, enemy.y, '#ffd98a', 6, 120, 0.4, 2.5);
    const n = enemy.embers;
    for (let i = 0; i < n; i++) {
      const a = this.rng() * Math.PI * 2;
      const d = range(this.rng, 6, 30);
      this.embers.push({
        x: enemy.x + Math.cos(a) * d,
        y: enemy.y + Math.sin(a) * d,
        value: enemy.kind === 'boss' ? 5 : 1,
        bob: this.rng() * Math.PI * 2,
      });
    }
    this.audio.killEnemy();
    if (enemy.kind === 'brute') {
      this.hitStop = 0.06;
      this.addShake(5);
    }
    if (enemy.kind === 'boss') {
      this.hitStop = 0.12;
      this.addShake(12);
      this.player.heal(20);
      this.floatText(this.player.x, this.player.y - 30, '+20 HP', '#7ee787');
      this.bossActive = null;
    }
  }

  update(dt, input) {
    const player = this.player;
    this.time += dt;
    if (this.bannerTimer > 0) this.bannerTimer -= dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 26);
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      return;
    }

    // Boss schedule.
    if (this.bossIndex < CONFIG.bossTimes.length && this.time >= CONFIG.bossTimes[this.bossIndex] && !this.bossActive) {
      this.spawnBoss();
    }

    player.update(dt, input);
    if (input.wasPressed('Space')) {
      if (player.tryDash()) {
        this.audio.dash();
        this.burst(player.x, player.y, '#ffd98a', 8, 140, 0.3, 2.5);
      }
    }

    // Auto-fire.
    if (player.fireTimer <= 0) {
      player.fireTimer = player.fireInterval;
      this.autoFire();
    }

    this.spawnWave(dt);

    // Enemies.
    for (const e of this.enemies) {
      if (e.alive) e.update(dt, this);
    }

    // Bolts.
    for (const b of this.bolts) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
    }
    // Bolt hits.
    for (const b of this.bolts) {
      if (b.life <= 0) continue;
      for (const e of this.enemies) {
        if (!e.alive) continue;
        const d = Math.hypot(e.x - b.x, e.y - b.y);
        if (d < e.radius + b.radius) {
          b.life = 0;
          this.damageEnemy(e, b.damage, b);
          break;
        }
      }
    }
    this.bolts = this.bolts.filter((b) => b.life > 0 && b.x > -40 && b.x < CONFIG.width + 40 && b.y > -40 && b.y < CONFIG.height + 40);

    // Orbiting embers.
    if (player.orbiters > 0) {
      for (let i = 0; i < player.orbiters; i++) {
        const a = player.orbitAngle + (i / player.orbiters) * Math.PI * 2;
        const ox = player.x + Math.cos(a) * player.orbitRadius;
        const oy = player.y + Math.sin(a) * player.orbitRadius;
        for (const e of this.enemies) {
          if (!e.alive) continue;
          if (this.time - e.orbitHitAt < 0.4) continue;
          const d = Math.hypot(e.x - ox, e.y - oy);
          if (d < e.radius + 10) {
            e.orbitHitAt = this.time;
            this.damageEnemy(e, player.orbitDamage, null);
          }
        }
      }
    }

    // Enemy shots.
    for (const s of this.enemyShots) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
    }
    for (const s of this.enemyShots) {
      if (s.life <= 0) continue;
      const d = Math.hypot(player.x - s.x, player.y - s.y);
      if (d < player.radius + s.radius) {
        s.life = 0;
        const dealt = player.takeDamage(s.damage);
        if (dealt > 0) {
          this.audio.hurt();
          this.addShake(7);
          this.burst(player.x, player.y, '#ff6b6b', 10, 180, 0.4, 3);
        }
      }
    }
    this.enemyShots = this.enemyShots.filter((s) => s.life > 0 && s.x > -40 && s.x < CONFIG.width + 40 && s.y > -40 && s.y < CONFIG.height + 40);

    // Enemy contact damage.
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d < e.radius + player.radius - 2) {
        const dealt = player.takeDamage(e.damage);
        if (dealt > 0) {
          this.audio.hurt();
          this.addShake(8);
          this.burst(player.x, player.y, '#ff6b6b', 10, 180, 0.4, 3);
          // Shove the enemy back a little so it cannot stick.
          const nx = (e.x - player.x) / (d || 1);
          const ny = (e.y - player.y) / (d || 1);
          e.x += nx * 14;
          e.y += ny * 14;
        }
      }
    }
    this.enemies = this.enemies.filter((e) => e.alive);

    // XP embers: magnet, pickup.
    for (const em of this.embers) {
      em.bob += dt * 4;
      const d = Math.hypot(player.x - em.x, player.y - em.y);
      if (d < player.magnetRadius) {
        const pull = 520 * (1 - d / (player.magnetRadius + 1)) + 120;
        em.x += ((player.x - em.x) / (d || 1)) * pull * dt;
        em.y += ((player.y - em.y) / (d || 1)) * pull * dt;
      }
      if (d < player.pickupRadius + 8) {
        em.taken = true;
        player.gainXp(em.value);
        this.score += em.value;
        this.audio.pickup();
        this.burst(em.x, em.y, '#ffd166', 3, 80, 0.3, 2);
      }
    }
    this.embers = this.embers.filter((em) => !em.taken);

    // Particles and floating text.
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - 2.4 * dt;
      p.vy *= 1 - 2.4 * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const f of this.floats) {
      f.y -= 42 * dt;
      f.life -= dt;
    }
    this.floats = this.floats.filter((f) => f.life > 0);

    this.score = Math.max(this.score, this.kills * 10 + Math.floor(this.time) + player.level * 25);
  }
}
