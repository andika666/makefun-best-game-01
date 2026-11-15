// All drawing: the night field, the lantern-keeper, the wisps, the HUD
// and every screen (title, level-up, pause, victory, game over).

import { CONFIG, PALETTE, ENEMY_TYPES } from './config.js';

function fmtTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPanel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.panel;
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawButton(ctx, rect, label, hovered, sub) {
  ctx.fillStyle = hovered ? '#ffb347' : '#e89b2e';
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
  ctx.fill();
  ctx.fillStyle = '#241505';
  ctx.font = 'bold 24px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 - (sub ? 8 : 0));
  if (sub) {
    ctx.font = '14px Georgia, serif';
    ctx.fillStyle = '#5a3a10';
    ctx.fillText(sub, rect.x + rect.w / 2, rect.y + rect.h / 2 + 16);
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

/** The night field: gradient sky, ground, tufts, stones and vignette. */
export function drawBackground(ctx, world, time) {
  const g = ctx.createLinearGradient(0, 0, 0, CONFIG.height);
  g.addColorStop(0, PALETTE.skyTop);
  g.addColorStop(1, PALETTE.skyBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

  // Faint stars.
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 40; i++) {
    const x = ((i * 173) % CONFIG.width) + ((i * 37) % 50);
    const y = ((i * 97) % 260) + 8;
    const tw = 0.25 + 0.25 * Math.sin(time * 1.3 + i * 2.1);
    ctx.globalAlpha = tw;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;

  // Ground.
  ctx.fillStyle = PALETTE.ground;
  ctx.fillRect(0, CONFIG.height - 120, CONFIG.width, 120);
  ctx.strokeStyle = PALETTE.groundLine;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, CONFIG.height - 120);
  ctx.lineTo(CONFIG.width, CONFIG.height - 120);
  ctx.stroke();

  // Decorative tufts and stones.
  for (const d of world.decor) {
    ctx.strokeStyle = 'rgba(120, 140, 190, 0.35)';
    ctx.lineWidth = 1.5;
    if (d.kind === 0) {
      ctx.beginPath();
      ctx.moveTo(d.x - 5 * d.s, d.y);
      ctx.lineTo(d.x - 2 * d.s, d.y - 9 * d.s);
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x, d.y - 11 * d.s);
      ctx.moveTo(d.x + 5 * d.s, d.y);
      ctx.lineTo(d.x + 2 * d.s, d.y - 9 * d.s);
      ctx.stroke();
    } else if (d.kind === 1) {
      ctx.fillStyle = 'rgba(90, 100, 150, 0.4)';
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, 7 * d.s, 4 * d.s, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(255, 179, 71, 0.10)';
      ctx.beginPath();
      ctx.arc(d.x, d.y, 3 * d.s, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Ground tufts along the field's floor, fixed positions.
  for (let i = 0; i < 26; i++) {
    const x = (i * 197 + 61) % CONFIG.width;
    const y = CONFIG.height - 108 + ((i * 53) % 96);
    const s = 0.8 + (i % 3) * 0.25;
    ctx.strokeStyle = 'rgba(120, 140, 190, 0.30)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 5 * s, y);
    ctx.lineTo(x - 2 * s, y - 9 * s);
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 11 * s);
    ctx.moveTo(x + 5 * s, y);
    ctx.lineTo(x + 2 * s, y - 9 * s);
    ctx.stroke();
  }

  // Vignette.
  const v = ctx.createRadialGradient(
    CONFIG.width / 2, CONFIG.height / 2, 280,
    CONFIG.width / 2, CONFIG.height / 2, 760,
  );
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(2,4,16,0.55)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
}

function drawLantern(ctx, x, y, radius, facing, flicker, glowScale = 1) {
  // Warm glow.
  const glow = ctx.createRadialGradient(x, y, 4, x, y, 120 * glowScale);
  glow.addColorStop(0, PALETTE.lanternGlow);
  glow.addColorStop(1, 'rgba(255, 179, 71, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 130 * glowScale, y - 130 * glowScale, 260 * glowScale, 260 * glowScale);

  // Body: a little keeper with a lantern.
  ctx.fillStyle = '#3a2f5e';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#6b5aa8';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Hood.
  ctx.fillStyle = '#57468f';
  ctx.beginPath();
  ctx.arc(x, y - 4, radius * 0.62, Math.PI, 0);
  ctx.fill();
  // Lantern flame, flickering.
  const fl = 1 + Math.sin(flicker * 9) * 0.12;
  ctx.fillStyle = PALETTE.amberBright;
  ctx.beginPath();
  ctx.ellipse(
    x + Math.cos(facing) * (radius + 7), y + Math.sin(facing) * (radius + 7),
    6 * fl, 8 * fl, facing, 0, Math.PI * 2,
  );
  ctx.fill();
  ctx.fillStyle = '#fff3c9';
  ctx.beginPath();
  ctx.arc(x + Math.cos(facing) * (radius + 7), y + Math.sin(facing) * (radius + 7), 2.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawEnemy(ctx, e, time) {
  const def = e.def;
  const flash = e.flash > 0;
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(e.x, e.y + e.radius * 0.85, e.radius * 0.9, e.radius * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body.
  ctx.fillStyle = flash ? '#ffffff' : def.color;
  ctx.beginPath();
  if (e.kind === 'brute') {
    // Hexagonal brute.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + time * 0.4;
      const px = e.x + Math.cos(a) * e.radius;
      const py = e.y + Math.sin(a) * e.radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else {
    const wob = 1 + Math.sin(time * 5 + e.wobble) * 0.06;
    ctx.arc(e.x, e.y, e.radius * wob, 0, Math.PI * 2);
  }
  ctx.fill();
  // Core eye.
  ctx.fillStyle = flash ? '#ffffff' : def.core;
  ctx.beginPath();
  ctx.arc(e.x, e.y, e.radius * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1030';
  ctx.beginPath();
  ctx.arc(e.x, e.y, e.radius * 0.2, 0, Math.PI * 2);
  ctx.fill();
  // Telegraph ring for spitters about to shoot.
  if (e.telegraph > 0) {
    ctx.strokeStyle = '#ff5d5d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius + 8 + Math.sin(time * 20) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Boss crown and health bar.
  if (e.kind === 'boss') {
    ctx.strokeStyle = '#f0c9ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.42;
      const px = e.x + Math.cos(a) * (e.radius + 10);
      const py = e.y + Math.sin(a) * (e.radius + 10) - 6;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  // Small health bar for hurt enemies.
  if (e.hp < e.maxHp && e.kind !== 'boss') {
    const w = e.radius * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, w, 4);
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, w * (e.hp / e.maxHp), 4);
  }
}

/** The playing field: background, embers, enemies, shots, player, effects. */
export function drawWorld(ctx, world, time) {
  drawBackground(ctx, world, time);

  // XP embers.
  for (const em of world.embers) {
    const bob = Math.sin(em.bob) * 2;
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(em.x, em.y + bob, em.value > 1 ? 7 : 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3c9';
    ctx.beginPath();
    ctx.arc(em.x, em.y + bob, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Enemy shots.
  for (const s of world.enemyShots) {
    ctx.fillStyle = '#ff8a8a';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd2d2';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }

  // Enemies.
  for (const e of world.enemies) drawEnemy(ctx, e, time);

  // Bolts.
  for (const b of world.bolts) {
    ctx.strokeStyle = '#ffd98a';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.fillStyle = '#fff3c9';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Orbiting embers.
  const player = world.player;
  if (player.orbiters > 0) {
    for (let i = 0; i < player.orbiters; i++) {
      const a = player.orbitAngle + (i / player.orbiters) * Math.PI * 2;
      const ox = player.x + Math.cos(a) * player.orbitRadius;
      const oy = player.y + Math.sin(a) * player.orbitRadius;
      ctx.fillStyle = '#ff8a3d';
      ctx.beginPath();
      ctx.arc(ox, oy, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath();
      ctx.arc(ox, oy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Player (blinks while invulnerable).
  if (player.invuln <= 0 || Math.floor(time * 14) % 2 === 0) {
    drawLantern(ctx, player.x, player.y, player.radius, player.facing, time, 1);
  }
  // Dash trail ring.
  if (player.dashTime > 0) {
    ctx.strokeStyle = 'rgba(255, 217, 138, 0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Particles.
  for (const p of world.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Floating damage numbers.
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = 'center';
  for (const f of world.floats) {
    ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

/** The HUD: health, XP, level, timer, score, wave, dash. */
export function drawHUD(ctx, world) {
  const player = world.player;
  const W = CONFIG.width;

  // Top bar.
  ctx.fillStyle = 'rgba(8, 11, 28, 0.72)';
  ctx.fillRect(0, 0, W, 64);

  // Health.
  ctx.fillStyle = '#2a2148';
  roundRect(ctx, 16, 14, 220, 18, 9);
  ctx.fill();
  ctx.fillStyle = player.hp / player.maxHp > 0.35 ? PALETTE.hpGood : PALETTE.hpLow;
  roundRect(ctx, 16, 14, 220 * (player.hp / player.maxHp), 18, 9);
  ctx.fill();
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 14px Georgia, serif';
  ctx.fillText(`HP ${Math.ceil(player.hp)} / ${player.maxHp}`, 20, 47);

  // XP bar + level.
  ctx.fillStyle = '#2a2148';
  roundRect(ctx, 16, 52, 220, 8, 4);
  ctx.fill();
  ctx.fillStyle = PALETTE.xp;
  roundRect(ctx, 16, 52, 220 * Math.min(1, player.xp / player.xpNeed), 8, 4);
  ctx.fill();
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '13px Georgia, serif';
  ctx.fillText(`Level ${player.level}   XP ${player.xp}/${player.xpNeed}`, 244, 47);

  // Timer, centre.
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 30px Georgia, serif';
  ctx.fillText(fmtTime(world.time), W / 2, 34);
  ctx.font = '13px Georgia, serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText(`Dawn in ${fmtTime(world.dawnIn)}  •  survive until ${fmtTime(CONFIG.gameDuration)}`, W / 2, 54);
  // Dawn progress.
  ctx.fillStyle = '#2a2148';
  ctx.fillRect(W / 2 - 110, 58, 220, 4);
  ctx.fillStyle = PALETTE.amber;
  ctx.fillRect(W / 2 - 110, 58, 220 * Math.min(1, world.time / CONFIG.gameDuration), 4);
  ctx.textAlign = 'left';

  // Score, wave, enemies — right side.
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 20px Georgia, serif';
  ctx.fillText(`Score ${world.score}`, W - 16, 28);
  ctx.font = '14px Georgia, serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText(`Wave ${world.wave}   •   ${world.enemies.length} wisps   •   ${world.kills} banished`, W - 16, 50);
  ctx.textAlign = 'left';

  // Dash cooldown, bottom left.
  const dashReady = player.dashCooldown <= 0;
  ctx.fillStyle = 'rgba(8, 11, 28, 0.72)';
  roundRect(ctx, 16, CONFIG.height - 44, 150, 30, 8);
  ctx.fill();
  ctx.fillStyle = dashReady ? PALETTE.amberBright : PALETTE.textDim;
  ctx.font = 'bold 14px Georgia, serif';
  ctx.fillText(dashReady ? 'SPACE — Dash ready' : `Dash ${player.dashCooldown.toFixed(1)}s`, 26, CONFIG.height - 24);

  // Controls hint, bottom right.
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '13px Georgia, serif';
  ctx.fillText('WASD / arrows move   •   P pause   •   M mute', W - 16, CONFIG.height - 24);
  ctx.textAlign = 'left';

  // Boss health bar.
  if (world.bossActive) {
    const boss = world.bossActive;
    const bw = 420;
    const bx = W / 2 - bw / 2;
    const by = 76;
    ctx.fillStyle = 'rgba(8, 11, 28, 0.8)';
    roundRect(ctx, bx - 8, by - 8, bw + 16, 34, 8);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f0c9ff';
    ctx.font = 'bold 14px Georgia, serif';
    ctx.fillText('GLOOMWARDEN', W / 2, by + 2);
    ctx.fillStyle = '#2a2148';
    ctx.fillRect(bx, by + 8, bw, 8);
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(bx, by + 8, bw * Math.max(0, boss.hp / boss.maxHp), 8);
    ctx.textAlign = 'left';
  }

  // Wave banner.
  if (world.bannerTimer > 0 && world.banner) {
    ctx.globalAlpha = Math.min(1, world.bannerTimer);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd98a';
    ctx.font = 'bold 34px Georgia, serif';
    ctx.fillText(world.banner, W / 2, 150);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }
}

function drawTitleBackground(ctx, world, time) {
  drawBackground(ctx, world, time);
  // Drifting lantern embers across the title.
  for (let i = 0; i < 26; i++) {
    const x = ((i * 137 + time * (12 + i * 2)) % (CONFIG.width + 60)) - 30;
    const y = 120 + ((i * 89) % 480) + Math.sin(time + i) * 8;
    ctx.globalAlpha = 0.35 + 0.3 * Math.sin(time * 2 + i);
    ctx.fillStyle = i % 3 === 0 ? '#8b7cff' : '#ffb347';
    ctx.beginPath();
    ctx.arc(x, y, 3 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // The keeper stands in the middle, lantern lit.
  drawLantern(ctx, CONFIG.width / 2, 470, 26, -Math.PI / 2, time, 1.6);
}

/** Title screen. Returns the Start button rect for clicks. */
export function drawTitle(ctx, world, time, best, mouse) {
  drawTitleBackground(ctx, world, time);
  const W = CONFIG.width;
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.amberBright;
  ctx.font = 'bold 64px Georgia, serif';
  ctx.fillText('EMBERFIELD', W / 2, 150);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'italic 26px Georgia, serif';
  ctx.fillText('Hold the Light', W / 2, 190);
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '17px Georgia, serif';
  ctx.fillText('You are the last lantern-keeper. The dark sends its wisps —', W / 2, 232);
  ctx.fillText('survive the night until dawn (10:00) and the light endures.', W / 2, 256);

  // How to play.
  drawPanel(ctx, W / 2 - 300, 292, 600, 108);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 16px Georgia, serif';
  ctx.fillText('HOW TO PLAY', W / 2, 318);
  ctx.font = '15px Georgia, serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText('WASD / arrows — move      SPACE — dash      P — pause      M — mute', W / 2, 344);
  ctx.fillText('Your lantern fires on its own. Gather embers, level up,', W / 2, 368);
  ctx.fillText('choose upgrades — and hold the light until dawn.', W / 2, 388);

  // Best result.
  if (best) {
    ctx.fillStyle = PALETTE.amberBright;
    ctx.font = '15px Georgia, serif';
    ctx.fillText(
      `Best: ${best.score} points — ${best.result === 'victory' ? 'survived the night' : `fell at ${fmtTime(best.time)}`} (Level ${best.level})`,
      W / 2, 428,
    );
  }

  const startRect = { x: W / 2 - 150, y: 520, w: 300, h: 62 };
  const hovered = mouse.mouseInside && mouse.mouseX >= startRect.x && mouse.mouseX <= startRect.x + startRect.w
    && mouse.mouseY >= startRect.y && mouse.mouseY <= startRect.y + startRect.h;
  drawButton(ctx, startRect, 'LIGHT THE LANTERN', hovered, 'or press Enter');
  ctx.textAlign = 'left';
  return { start: startRect };
}

/** Level-up choice screen. Returns the three card rects for clicks. */
export function drawLevelUp(ctx, choices, level, mouse) {
  const W = CONFIG.width;
  const H = CONFIG.height;
  ctx.fillStyle = 'rgba(4, 6, 18, 0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.amberBright;
  ctx.font = 'bold 40px Georgia, serif';
  ctx.fillText(`LEVEL ${level}!`, W / 2, 130);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '19px Georgia, serif';
  ctx.fillText('The lantern grows stronger — choose one:', W / 2, 166);
  const cards = [];
  const cardW = 300;
  const cardH = 190;
  const gap = 28;
  const totalW = cardW * 3 + gap * 2;
  const startX = (W - totalW) / 2;
  const y = 220;
  choices.forEach((choice, i) => {
    const x = startX + i * (cardW + gap);
    const rect = { x, y, w: cardW, h: cardH };
    cards.push(rect);
    const hovered = mouse.mouseInside && mouse.mouseX >= x && mouse.mouseX <= x + cardW
      && mouse.mouseY >= y && mouse.mouseY <= y + cardH;
    ctx.fillStyle = hovered ? 'rgba(58, 42, 96, 0.95)' : PALETTE.panel;
    roundRect(ctx, x, y, cardW, cardH, 14);
    ctx.fill();
    ctx.strokeStyle = hovered ? PALETTE.amber : PALETTE.panelEdge;
    ctx.lineWidth = hovered ? 3 : 2;
    ctx.stroke();
    ctx.fillStyle = PALETTE.amberBright;
    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillText(choice.name, x + cardW / 2, y + 52);
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '15px Georgia, serif';
    // Wrap the description to two lines.
    const words = choice.desc.split(' ');
    let line = '';
    const lines = [];
    for (const word of words) {
      if ((line + ' ' + word).trim().length > 26) {
        lines.push(line.trim());
        line = word;
      } else {
        line += ' ' + word;
      }
    }
    lines.push(line.trim());
    lines.slice(0, 3).forEach((ln, li) => ctx.fillText(ln, x + cardW / 2, y + 92 + li * 22));
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = 'bold 15px Georgia, serif';
    ctx.fillText(`Press ${i + 1} or click`, x + cardW / 2, y + cardH - 20);
  });
  ctx.textAlign = 'left';
  return { cards };
}

/** Pause overlay. Returns Resume / Restart button rects. */
export function drawPaused(ctx, mouse) {
  const W = CONFIG.width;
  const H = CONFIG.height;
  ctx.fillStyle = 'rgba(4, 6, 18, 0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText('PAUSED', W / 2, 250);
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '17px Georgia, serif';
  ctx.fillText('The night waits for no keeper — but it will wait for you.', W / 2, 286);
  const resume = { x: W / 2 - 140, y: 330, w: 280, h: 56 };
  const restart = { x: W / 2 - 140, y: 402, w: 280, h: 56 };
  const inRect = (r) => mouse.mouseInside && mouse.mouseX >= r.x && mouse.mouseX <= r.x + r.w
    && mouse.mouseY >= r.y && mouse.mouseY <= r.y + r.h;
  drawButton(ctx, resume, 'RESUME', inRect(resume), 'or press P');
  drawButton(ctx, restart, 'RESTART', inRect(restart), 'or press R');
  ctx.textAlign = 'left';
  return { resume, restart };
}

function drawEndPanel(ctx, title, titleColor, subtitle, stats, mouse, primaryLabel) {
  const W = CONFIG.width;
  const H = CONFIG.height;
  ctx.fillStyle = 'rgba(4, 6, 18, 0.78)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = titleColor;
  ctx.font = 'bold 52px Georgia, serif';
  ctx.fillText(title, W / 2, 150);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'italic 20px Georgia, serif';
  ctx.fillText(subtitle, W / 2, 188);
  drawPanel(ctx, W / 2 - 260, 224, 520, 190);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 18px Georgia, serif';
  ctx.fillText('THE NIGHT IN NUMBERS', W / 2, 256);
  ctx.font = '17px Georgia, serif';
  ctx.fillStyle = PALETTE.textDim;
  stats.forEach((line, i) => {
    ctx.fillText(line, W / 2, 292 + i * 30);
  });
  const again = { x: W / 2 - 140, y: 452, w: 280, h: 60 };
  const hovered = mouse.mouseInside && mouse.mouseX >= again.x && mouse.mouseX <= again.x + again.w
    && mouse.mouseY >= again.y && mouse.mouseY <= again.y + again.h;
  drawButton(ctx, again, primaryLabel, hovered, 'or press R');
  ctx.textAlign = 'left';
  return { again };
}

/** Victory screen. */
export function drawVictory(ctx, world, mouse) {
  const player = world.player;
  const stats = [
    `Time survived: ${fmtTime(world.time)} of ${fmtTime(CONFIG.gameDuration)}`,
    `Wisps banished: ${world.kills}      •      Level reached: ${player.level}`,
    `Final score: ${world.score + 1000}`,
  ];
  return drawEndPanel(
    ctx, 'DAWN BREAKS', PALETTE.amberBright,
    'You held the light all night. The field is yours again.',
    stats, mouse, 'PLAY AGAIN',
  );
}

/** Game-over screen. */
export function drawGameOver(ctx, world, mouse) {
  const player = world.player;
  const stats = [
    `Time survived: ${fmtTime(world.time)} of ${fmtTime(CONFIG.gameDuration)}`,
    `Wisps banished: ${world.kills}      •      Level reached: ${player.level}`,
    `Final score: ${world.score}`,
  ];
  return drawEndPanel(
    ctx, 'THE LIGHT FADES', '#ff8a8a',
    'The dark took the keeper — but the lantern can be lit again.',
    stats, mouse, 'TRY AGAIN',
  );
}

export { fmtTime, ENEMY_TYPES };
