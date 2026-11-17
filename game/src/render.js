// All drawing: the night field, the lantern-keeper, the wisps, the HUD
// and every screen (title, level-up, pause, victory, game over).

import { CONFIG, PALETTE, ENEMY_TYPES, NIGHTS } from './config.js';
import { SHOP_ITEMS, loadBank, loadMeta, shopCost } from './meta.js';

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
  // Each night tints the sky and ground; Night I uses the base palette.
  const pal = world.night && world.night.palette
    ? { ...PALETTE, ...world.night.palette }
    : PALETTE;
  const g = ctx.createLinearGradient(0, 0, 0, CONFIG.height);
  g.addColorStop(0, pal.skyTop);
  g.addColorStop(1, pal.skyBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

  // Nebula blobs: large, soft, fixed by index so the field stays stable.
  const nebulae = [
    { x: 180, y: 130, r: 190, c: 'rgba(88, 60, 180, 0.16)' },
    { x: 1080, y: 110, r: 170, c: 'rgba(46, 140, 150, 0.13)' },
    { x: 640, y: 300, r: 230, c: 'rgba(150, 60, 140, 0.10)' },
    { x: 90, y: 480, r: 150, c: 'rgba(46, 140, 150, 0.10)' },
    { x: 1150, y: 520, r: 170, c: 'rgba(88, 60, 180, 0.12)' },
  ];
  for (const nb of nebulae) {
    const ng = ctx.createRadialGradient(nb.x, nb.y, 0, nb.x, nb.y, nb.r);
    ng.addColorStop(0, nb.c);
    ng.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ng;
    ctx.fillRect(nb.x - nb.r, nb.y - nb.r, nb.r * 2, nb.r * 2);
  }

  // A pale moon, high on the right.
  const mg = ctx.createRadialGradient(1120, 92, 4, 1120, 92, 64);
  mg.addColorStop(0, 'rgba(240, 235, 255, 0.20)');
  mg.addColorStop(1, 'rgba(240, 235, 255, 0)');
  ctx.fillStyle = mg;
  ctx.fillRect(1056, 28, 128, 128);
  ctx.fillStyle = 'rgba(235, 230, 255, 0.85)';
  ctx.beginPath();
  ctx.arc(1120, 92, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(190, 185, 220, 0.5)';
  ctx.beginPath();
  ctx.arc(1112, 86, 5, 0, Math.PI * 2);
  ctx.arc(1128, 100, 7, 0, Math.PI * 2);
  ctx.arc(1120, 80, 3, 0, Math.PI * 2);
  ctx.fill();

  // Stars, varied in size and twinkle.
  for (let i = 0; i < 90; i++) {
    const x = ((i * 173) % CONFIG.width) + ((i * 37) % 50);
    const y = ((i * 97) % 260) + 8;
    const tw = 0.25 + 0.25 * Math.sin(time * 1.3 + i * 2.1);
    const s = i % 7 === 0 ? 3 : 2;
    ctx.globalAlpha = tw;
    ctx.fillStyle = i % 9 === 0 ? '#ffd98a' : '#ffffff';
    ctx.fillRect(x, y, s, s);
  }
  ctx.globalAlpha = 1;

  // Ground.
  ctx.fillStyle = pal.ground;
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
      // A glowing ember-cap mushroom: stem, cap and a soft halo.
      const glow = ctx.createRadialGradient(d.x, d.y - 4 * d.s, 0, d.x, d.y - 4 * d.s, 10 * d.s);
      glow.addColorStop(0, 'rgba(255, 179, 71, 0.30)');
      glow.addColorStop(1, 'rgba(255, 179, 71, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(d.x - 10 * d.s, d.y - 14 * d.s, 20 * d.s, 20 * d.s);
      ctx.fillStyle = 'rgba(220, 200, 160, 0.8)';
      ctx.fillRect(d.x - 1.5 * d.s, d.y - 5 * d.s, 3 * d.s, 5 * d.s);
      ctx.fillStyle = 'rgba(255, 138, 61, 0.85)';
      ctx.beginPath();
      ctx.arc(d.x, d.y - 5 * d.s, 4.5 * d.s, Math.PI, 0);
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

  // Body: a little keeper in a cloak, holding the lantern out.
  ctx.fillStyle = '#3a2f5e';
  ctx.beginPath();
  ctx.moveTo(x, y - radius - 6);
  ctx.quadraticCurveTo(x + radius + 6, y - radius * 0.2, x + radius * 0.9, y + radius * 0.9);
  ctx.quadraticCurveTo(x, y + radius * 0.5, x - radius * 0.9, y + radius * 0.9);
  ctx.quadraticCurveTo(x - radius - 6, y - radius * 0.2, x, y - radius - 6);
  ctx.fill();
  ctx.strokeStyle = '#6b5aa8';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Face: two eyes under the hood, watching where the keeper faces.
  ctx.fillStyle = '#ffe9a8';
  const ex = Math.cos(facing);
  const ey = Math.sin(facing);
  ctx.beginPath();
  ctx.arc(x + ex * 4 - ey * 4, y + ey * 4 - ex * 4 - 2, 2.2, 0, Math.PI * 2);
  ctx.arc(x + ex * 4 + ey * 4, y + ey * 4 + ex * 4 - 2, 2.2, 0, Math.PI * 2);
  ctx.fill();
  // Hood.
  ctx.fillStyle = '#57468f';
  ctx.beginPath();
  ctx.arc(x, y - 4, radius * 0.62, Math.PI, 0);
  ctx.fill();
  // Lantern: handle, frame and a flickering flame.
  const lx = x + Math.cos(facing) * (radius + 10);
  const ly = y + Math.sin(facing) * (radius + 10);
  ctx.strokeStyle = '#8a7a4a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(lx, ly, 8, Math.PI * 0.9, Math.PI * 2.1);
  ctx.stroke();
  const fl = 1 + Math.sin(flicker * 9) * 0.12;
  ctx.fillStyle = PALETTE.amberBright;
  ctx.beginPath();
  ctx.ellipse(lx, ly, 6 * fl, 8 * fl, facing, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff3c9';
  ctx.beginPath();
  ctx.arc(lx, ly, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawEnemy(ctx, e, time, player) {
  const def = e.def;
  const flash = e.flash > 0;
  // Where the enemy looks: at the keeper.
  const look = player ? Math.atan2(player.y - e.y, player.x - e.x) : 0;
  const lx = Math.cos(look);
  const ly = Math.sin(look);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(e.x, e.y + e.radius * 0.85, e.radius * 0.9, e.radius * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  // A faint aura so each wisp reads at a glance.
  const aura = ctx.createRadialGradient(e.x, e.y, e.radius * 0.4, e.x, e.y, e.radius * 2.1);
  aura.addColorStop(0, flash ? 'rgba(255,255,255,0.25)' : def.color + '44');
  aura.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = aura;
  ctx.fillRect(e.x - e.radius * 2.2, e.y - e.radius * 2.2, e.radius * 4.4, e.radius * 4.4);
  // Body, shaped by kind.
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
  } else if (e.kind === 'spitter') {
    // A diamond, point first.
    const r = e.radius * 1.15;
    ctx.moveTo(e.x + lx * r, e.y + ly * r);
    ctx.lineTo(e.x - ly * r * 0.8, e.y + lx * r * 0.8);
    ctx.lineTo(e.x - lx * r, e.y - ly * r);
    ctx.lineTo(e.x + ly * r * 0.8, e.y - lx * r * 0.8);
    ctx.closePath();
  } else if (e.kind === 'charger') {
    // An arrowhead aimed at the keeper.
    const r = e.radius * 1.25;
    const a = Math.atan2(ly, lx);
    for (let i = 0; i < 3; i++) {
      const ang = a + (i - 1) * (Math.PI * 0.72);
      const rr = i === 1 ? r : r * 0.62;
      const px = e.x + Math.cos(ang) * rr;
      const py = e.y + Math.sin(ang) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else if (e.kind === 'splitter') {
    // A blob with two inner orbs, ready to burst.
    const wob = 1 + Math.sin(time * 5 + e.wobble) * 0.08;
    ctx.arc(e.x, e.y, e.radius * wob, 0, Math.PI * 2);
  } else if (e.kind === 'mote') {
    const wob = 1 + Math.sin(time * 7 + e.wobble) * 0.1;
    ctx.arc(e.x, e.y, e.radius * wob, 0, Math.PI * 2);
  } else if (e.kind === 'boss') {
    // A large wisp with a ragged, flame-like rim.
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const rr = e.radius * (1 + 0.14 * Math.sin(a * 3 + time * 2));
      const px = e.x + Math.cos(a) * rr;
      const py = e.y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else {
    // Drifter: a teardrop wisp with a trailing tail.
    const wob = 1 + Math.sin(time * 5 + e.wobble) * 0.06;
    ctx.arc(e.x, e.y, e.radius * wob, 0, Math.PI * 2);
  }
  ctx.fill();
  // Drifter tail.
  if (e.kind === 'drifter') {
    ctx.fillStyle = flash ? '#ffffff' : def.color;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.moveTo(e.x - lx * e.radius * 0.7, e.y - ly * e.radius * 0.7);
    ctx.quadraticCurveTo(
      e.x - lx * e.radius * 1.9 + Math.sin(time * 6 + e.wobble) * 6,
      e.y - ly * e.radius * 1.9,
      e.x - lx * e.radius * 1.5, e.y - ly * e.radius * 1.5,
    );
    ctx.quadraticCurveTo(e.x - lx * e.radius * 1.2, e.y - ly * e.radius * 1.2, e.x - lx * e.radius * 0.7, e.y - ly * e.radius * 0.7);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // Splitter's inner orbs.
  if (e.kind === 'splitter') {
    ctx.fillStyle = flash ? '#ffffff' : def.core;
    ctx.beginPath();
    ctx.arc(e.x - e.radius * 0.38, e.y - e.radius * 0.2, e.radius * 0.3, 0, Math.PI * 2);
    ctx.arc(e.x + e.radius * 0.38, e.y + e.radius * 0.2, e.radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Eyes that watch the keeper (all kinds but the mote, which gets one).
  const eyeR = e.kind === 'mote' ? e.radius * 0.42 : e.radius * 0.24;
  const eyeOff = e.radius * 0.34;
  const eyeFwd = e.radius * 0.12;
  ctx.fillStyle = '#ffffff';
  if (e.kind === 'mote') {
    ctx.beginPath();
    ctx.arc(e.x + lx * eyeFwd, e.y + ly * eyeFwd, eyeR, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(e.x + lx * eyeFwd - ly * eyeOff, e.y + ly * eyeFwd + lx * eyeOff, eyeR, 0, Math.PI * 2);
    ctx.arc(e.x + lx * eyeFwd + ly * eyeOff, e.y + ly * eyeFwd - lx * eyeOff, eyeR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#1a1030';
  if (e.kind === 'mote') {
    ctx.beginPath();
    ctx.arc(e.x + lx * (eyeFwd + 1), e.y + ly * (eyeFwd + 1), eyeR * 0.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(e.x + lx * (eyeFwd + 1) - ly * eyeOff, e.y + ly * (eyeFwd + 1) + lx * eyeOff, eyeR * 0.5, 0, Math.PI * 2);
    ctx.arc(e.x + lx * (eyeFwd + 1) + ly * eyeOff, e.y + ly * (eyeFwd + 1) - lx * eyeOff, eyeR * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Angry brows for brutes and chargers.
  if (e.kind === 'brute' || e.kind === 'charger') {
    ctx.strokeStyle = '#1a1030';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(e.x + lx * eyeFwd - ly * eyeOff - 3, e.y + ly * eyeFwd + lx * eyeOff - eyeR - 2);
    ctx.lineTo(e.x + lx * eyeFwd - ly * eyeOff + 4, e.y + ly * eyeFwd + lx * eyeOff - eyeR + 2);
    ctx.moveTo(e.x + lx * eyeFwd + ly * eyeOff + 3, e.y + ly * eyeFwd - lx * eyeOff - eyeR - 2);
    ctx.lineTo(e.x + lx * eyeFwd + ly * eyeOff - 4, e.y + ly * eyeFwd - lx * eyeOff - eyeR + 2);
    ctx.stroke();
  }
  // Charger telegraph: a line to its target while it winds up.
  if (e.kind === 'charger' && e.chargeState === 'windup') {
    ctx.strokeStyle = 'rgba(255, 93, 93, 0.8)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(e.x, e.y);
    ctx.lineTo(e.x + lx * 260, e.y + ly * 260);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // Frost ring on chilled wisps.
  if (e.slowUntil > time) {
    ctx.strokeStyle = 'rgba(126, 231, 255, 0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius + 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Golden ring on elites.
  if (e.elite) {
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.font = `bold ${Math.round(e.radius * 0.9)}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.fillText('★', e.x, e.y - e.radius - 12);
    ctx.textAlign = 'left';
  }
  // Telegraph ring for spitters about to shoot.
  if (e.telegraph > 0 && e.kind === 'spitter') {
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
  for (const e of world.enemies) drawEnemy(ctx, e, time, world.player);

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

  // Pickups: heart, magnet, nova.
  for (const pk of world.pickups) {
    const bob = Math.sin(pk.bob) * 3;
    const fade = pk.life < 3 ? 0.4 + 0.6 * Math.abs(Math.sin(time * 6)) : 1;
    ctx.globalAlpha = fade;
    const halo = ctx.createRadialGradient(pk.x, pk.y + bob, 2, pk.x, pk.y + bob, 30);
    halo.addColorStop(0, pk.kind === 'heart' ? 'rgba(255,107,129,0.35)' : pk.kind === 'magnet' ? 'rgba(126,231,255,0.35)' : 'rgba(255,209,102,0.35)');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(pk.x - 30, pk.y + bob - 30, 60, 60);
    if (pk.kind === 'heart') {
      ctx.fillStyle = '#ff6b81';
      ctx.beginPath();
      ctx.moveTo(pk.x, pk.y + bob + 9);
      ctx.bezierCurveTo(pk.x - 12, pk.y + bob - 2, pk.x - 8, pk.y + bob - 11, pk.x, pk.y + bob - 4);
      ctx.bezierCurveTo(pk.x + 8, pk.y + bob - 11, pk.x + 12, pk.y + bob - 2, pk.x, pk.y + bob + 9);
      ctx.fill();
    } else if (pk.kind === 'magnet') {
      ctx.strokeStyle = '#7ee7ff';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(pk.x, pk.y + bob, 9, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pk.x - 9, pk.y + bob);
      ctx.lineTo(pk.x - 9, pk.y + bob + 7);
      ctx.moveTo(pk.x + 9, pk.y + bob);
      ctx.lineTo(pk.x + 9, pk.y + bob + 7);
      ctx.stroke();
      ctx.fillStyle = '#e8fbff';
      ctx.fillRect(pk.x - 11, pk.y + bob + 5, 4, 4);
      ctx.fillRect(pk.x + 7, pk.y + bob + 5, 4, 4);
    } else {
      // Nova: an eight-point star.
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
        const rr = i % 2 === 0 ? 13 : 5;
        const px = pk.x + Math.cos(a) * rr;
        const py = pk.y + bob + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff3c9';
      ctx.beginPath();
      ctx.arc(pk.x, pk.y + bob, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Player dash ghosts: fading lanterns along the trail.
  if (player.dashTime > 0 || player.trail.length > 1) {
    for (let i = 2; i < Math.min(player.trail.length, 6); i += 2) {
      const t = player.trail[i];
      ctx.globalAlpha = 0.25 * (1 - i / 7);
      drawLantern(ctx, t.x, t.y, player.radius * 0.85, player.facing, time, 0.7);
    }
    ctx.globalAlpha = 1;
  }
  // Player (blinks while invulnerable) — a wide glow and a gold ring
  // so the keeper reads at a glance, even in a crowd of wisps.
  if (player.invuln <= 0 || Math.floor(time * 14) % 2 === 0) {
    drawLantern(ctx, player.x, player.y, player.radius, player.facing, time, 1.25);
    ctx.strokeStyle = 'rgba(255, 217, 138, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 7, 0, Math.PI * 2);
    ctx.stroke();
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

  // Darkness beyond the lantern's light: the field fades into night
  // away from the keeper, so the lantern always feels central.
  const dg = ctx.createRadialGradient(
    player.x, player.y, 170,
    player.x, player.y, 560,
  );
  dg.addColorStop(0, 'rgba(2,4,16,0)');
  dg.addColorStop(1, 'rgba(2,4,16,0.42)');
  ctx.fillStyle = dg;
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

  // Nova flash: a white bloom that fades fast.
  if (world.novaFlash > 0) {
    ctx.fillStyle = `rgba(255, 243, 201, ${world.novaFlash * 0.55})`;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  }

  // Low health: the edges of the night pulse red.
  if (player.hp / player.maxHp < 0.3) {
    const pulse = 0.16 + 0.1 * Math.sin(time * 5);
    const lg = ctx.createRadialGradient(
      CONFIG.width / 2, CONFIG.height / 2, 260,
      CONFIG.width / 2, CONFIG.height / 2, 720,
    );
    lg.addColorStop(0, 'rgba(255,0,0,0)');
    lg.addColorStop(1, `rgba(255, 40, 40, ${pulse})`);
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  }
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
  ctx.fillText(`${world.night.name}  •  Dawn in ${fmtTime(world.dawnIn)}  •  survive until ${fmtTime(CONFIG.gameDuration)}`, W / 2, 54);
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
  // Kill streak, when it matters.
  if (world.combo >= 3) {
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 16px Georgia, serif';
    ctx.fillText(`STREAK x${world.combo}`, W - 16, 72);
  }
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
  // The keeper stands at the field's edge, lantern lit.
  drawLantern(ctx, 1140, 636, 20, -Math.PI / 2, time, 1.2);
}

/** Title screen. Returns the Start, night and shop button rects. */
export function drawTitle(ctx, world, time, best, mouse, selectedNight = 0) {
  drawTitleBackground(ctx, world, time);
  const W = CONFIG.width;
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.amberBright;
  ctx.font = 'bold 60px Georgia, serif';
  ctx.fillText('EMBERFIELD', W / 2, 132);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'italic 24px Georgia, serif';
  ctx.fillText('Hold the Light', W / 2, 170);
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '16px Georgia, serif';
  ctx.fillText('You are the last lantern-keeper. The dark sends its wisps —', W / 2, 206);
  ctx.fillText('survive the night until dawn (10:00) and the light endures.', W / 2, 228);

  // How to play.
  drawPanel(ctx, W / 2 - 300, 246, 600, 116);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 15px Georgia, serif';
  ctx.fillText('HOW TO PLAY', W / 2, 270);
  ctx.font = '14px Georgia, serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText('WASD / arrows — move      SPACE — dash      P — pause      M — mute', W / 2, 292);
  ctx.fillText('Your lantern fires on its own. Gather embers, level up,', W / 2, 312);
  ctx.fillText('chain kills into streaks — and hold the light until dawn.', W / 2, 332);
  ctx.fillText('Beware lunging chargers and golden elites: they drop hearts, magnets and novas.', W / 2, 352);

  // Night select: three escalating runs.
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = 'bold 13px Georgia, serif';
  ctx.fillText('CHOOSE YOUR NIGHT', W / 2, 386);
  const nights = [];
  const pillW = 180;
  const pillH = 34;
  const pillGap = 14;
  const pillY = 394;
  const pillX0 = (W - (pillW * 3 + pillGap * 2)) / 2;
  NIGHTS.forEach((night, i) => {
    const x = pillX0 + i * (pillW + pillGap);
    const rect = { x, y: pillY, w: pillW, h: pillH };
    nights.push(rect);
    const selected = i === selectedNight;
    const hovered = mouse.mouseInside && mouse.mouseX >= x && mouse.mouseX <= x + pillW
      && mouse.mouseY >= pillY && mouse.mouseY <= pillY + pillH;
    ctx.fillStyle = selected ? '#ffb347' : hovered ? 'rgba(58, 42, 96, 0.95)' : PALETTE.panel;
    roundRect(ctx, x, pillY, pillW, pillH, 9);
    ctx.fill();
    ctx.strokeStyle = selected ? '#ffd98a' : PALETTE.panelEdge;
    ctx.lineWidth = selected ? 3 : 2;
    ctx.stroke();
    ctx.fillStyle = selected ? '#241505' : PALETTE.text;
    ctx.font = 'bold 14px Georgia, serif';
    ctx.fillText(night.name, x + pillW / 2, pillY + 14);
    ctx.fillStyle = selected ? '#5a3a10' : PALETTE.textDim;
    ctx.font = '11px Georgia, serif';
    ctx.fillText(night.sub, x + pillW / 2, pillY + 28);
  });

  // Lantern Upgrades shop: banked embers buy permanent power.
  const bank = loadBank();
  const meta = loadMeta();
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = 'bold 13px Georgia, serif';
  ctx.fillText(`LANTERN UPGRADES  —  EMBER BANK: ${bank}`, W / 2, 448);
  const shop = [];
  const shopW = 200;
  const shopH = 44;
  const shopGap = 14;
  const shopY = 456;
  const shopX0 = (W - (shopW * 3 + shopGap * 2)) / 2;
  SHOP_ITEMS.forEach((item, i) => {
    const x = shopX0 + i * (shopW + shopGap);
    const rect = { x, y: shopY, w: shopW, h: shopH, id: item.id };
    shop.push(rect);
    const level = meta[item.id];
    const maxed = level >= item.max;
    const cost = maxed ? 0 : shopCost(item, level);
    const afford = maxed || bank >= cost;
    const hovered = mouse.mouseInside && mouse.mouseX >= x && mouse.mouseX <= x + shopW
      && mouse.mouseY >= shopY && mouse.mouseY <= shopY + shopH;
    ctx.fillStyle = hovered && afford ? 'rgba(58, 42, 96, 0.95)' : PALETTE.panel;
    roundRect(ctx, x, shopY, shopW, shopH, 9);
    ctx.fill();
    ctx.strokeStyle = afford ? PALETTE.panelEdge : 'rgba(74, 63, 122, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = afford ? PALETTE.text : PALETTE.textDim;
    ctx.font = 'bold 14px Georgia, serif';
    ctx.fillText(`${item.name}  Lv ${level}/${item.max}`, x + shopW / 2, shopY + 18);
    ctx.fillStyle = afford ? PALETTE.amberBright : PALETTE.textDim;
    ctx.font = '12px Georgia, serif';
    ctx.fillText(maxed ? 'MAXED OUT' : `${cost} embers — ${item.desc}`, x + shopW / 2, shopY + 35);
  });

  // Best result.
  if (best) {
    ctx.fillStyle = PALETTE.amberBright;
    ctx.font = '15px Georgia, serif';
    ctx.fillText(
      `Best: ${best.score} points — ${best.result === 'victory' ? 'survived the night' : `fell at ${fmtTime(best.time)}`} (Level ${best.level})`,
      W / 2, 522,
    );
  }

  const startRect = { x: W / 2 - 150, y: 536, w: 300, h: 58 };
  const hovered = mouse.mouseInside && mouse.mouseX >= startRect.x && mouse.mouseX <= startRect.x + startRect.w
    && mouse.mouseY >= startRect.y && mouse.mouseY <= startRect.y + startRect.h;
  drawButton(ctx, startRect, 'LIGHT THE LANTERN', hovered, 'or press Enter');
  ctx.textAlign = 'left';
  return { start: startRect, nights, shop };
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

function drawEndPanel(ctx, title, titleColor, subtitle, stats, mouse, primaryLabel, stars = 0) {
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
  // Star rating, earned by how much light is left.
  if (stars > 0) {
    ctx.font = '36px Georgia, serif';
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < stars ? '#ffd166' : 'rgba(255, 209, 102, 0.25)';
      ctx.fillText('★', W / 2 + (i - 1) * 52, 228);
    }
  }
  drawPanel(ctx, W / 2 - 260, 248, 520, 190);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 18px Georgia, serif';
  ctx.fillText('THE NIGHT IN NUMBERS', W / 2, 280);
  ctx.font = '17px Georgia, serif';
  ctx.fillStyle = PALETTE.textDim;
  stats.forEach((line, i) => {
    ctx.fillText(line, W / 2, 314 + i * 30);
  });
  const again = { x: W / 2 - 140, y: 452, w: 280, h: 60 };
  const hovered = mouse.mouseInside && mouse.mouseX >= again.x && mouse.mouseX <= again.x + again.w
    && mouse.mouseY >= again.y && mouse.mouseY <= again.y + again.h;
  drawButton(ctx, again, primaryLabel, hovered, 'or press R');
  ctx.textAlign = 'left';
  return { again };
}

/** Victory screen. Stars: 3 when more than 60% of the light is left. */
export function drawVictory(ctx, world, mouse) {
  const player = world.player;
  const hpFrac = player.hp / player.maxHp;
  const stars = hpFrac >= 0.6 ? 3 : hpFrac >= 0.3 ? 2 : 1;
  const stats = [
    `Time survived: ${fmtTime(world.time)} of ${fmtTime(CONFIG.gameDuration)}`,
    `Wisps banished: ${world.kills}      •      Level reached: ${player.level}`,
    `Best streak: x${world.maxCombo}      •      Elites banished: ${world.elitesBanished}`,
    `Final score: ${world.score + 1000}`,
  ];
  return drawEndPanel(
    ctx, 'DAWN BREAKS', PALETTE.amberBright,
    'You held the light all night. The field is yours again.',
    stats, mouse, 'PLAY AGAIN', stars,
  );
}

/** Game-over screen. */
export function drawGameOver(ctx, world, mouse) {
  const player = world.player;
  const stats = [
    `Time survived: ${fmtTime(world.time)} of ${fmtTime(CONFIG.gameDuration)}`,
    `Wisps banished: ${world.kills}      •      Level reached: ${player.level}`,
    `Best streak: x${world.maxCombo}      •      Elites banished: ${world.elitesBanished}`,
    `Final score: ${world.score}`,
  ];
  return drawEndPanel(
    ctx, 'THE LIGHT FADES', '#ff8a8a',
    'The dark took the keeper — but the lantern can be lit again.',
    stats, mouse, 'TRY AGAIN',
  );
}

export { fmtTime, ENEMY_TYPES };
