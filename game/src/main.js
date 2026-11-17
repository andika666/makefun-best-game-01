// Emberfield: Hold the Light — boot, state machine and main loop.
// One fixed 1/60 s step of simulation per tick; rendering every frame.

import { CONFIG } from './config.js';
import { makeRng } from './random.js';
import { Input } from './input.js';
import { AudioEngine } from './audio.js';
import { Player } from './player.js';
import { World } from './world.js';
import { rollChoices, applyUpgrade } from './upgrades.js';
import { bankEmbers, buyItem } from './meta.js';
import { drawWorld, drawHUD, drawTitle, drawLevelUp, drawPaused, drawVictory, drawGameOver } from './render.js';
import { setupShot } from './shots.js';

const BEST_KEY = 'emberfield-best';

function loadBest() {
  try {
    const raw = window.localStorage.getItem(BEST_KEY);
    if (!raw) return null;
    const best = JSON.parse(raw);
    if (typeof best.score !== 'number') return null;
    return best;
  } catch {
    return null;
  }
}

function saveBest(entry) {
  try {
    window.localStorage.setItem(BEST_KEY, JSON.stringify(entry));
  } catch {
    /* storage unavailable; the best score is session-only then */
  }
}

function main() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const input = new Input(canvas);
  const audio = new AudioEngine();
  const params = new URLSearchParams(window.location.search);
  const shotScene = params.get('shot');
  const seed = Number(params.get('seed') || '7') >>> 0;

  let best = loadBest();
  let state = 'title';
  let rng = makeRng((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
  let world = new World(rng, audio);
  let player = new Player();
  world.reset(player);
  let choices = [];
  let rects = {};
  let animTime = 0;
  let lastNow = 0;
  let accumulator = 0;
  /** The night picked on the title screen (0, 1 or 2). */
  let selectedNight = 0;

  /** Fit the 1280x720 canvas into the window, keeping its aspect. */
  function fitCanvas() {
    const scale = Math.min(window.innerWidth / CONFIG.width, window.innerHeight / CONFIG.height);
    canvas.style.width = `${Math.floor(CONFIG.width * scale)}px`;
    canvas.style.height = `${Math.floor(CONFIG.height * scale)}px`;
  }
  window.addEventListener('resize', fitCanvas);
  fitCanvas();

  function startGame() {
    rng = makeRng((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
    world = new World(rng, audio, selectedNight);
    player = new Player();
    world.reset(player);
    choices = [];
    state = 'playing';
    audio.stopJingle();
  }

  function recordResult(result) {
    const entry = {
      score: result === 'victory' ? world.score + 1000 : world.score,
      time: Math.floor(world.time),
      level: player.level,
      result,
    };
    // Embers gathered this run bank into the Lantern Upgrades shop.
    bankEmbers(world.embersGathered);
    if (!best || entry.score > best.score) {
      best = entry;
      saveBest(entry);
    }
    return entry;
  }

  function openLevelUp() {
    choices = rollChoices(rng, world.owned, 3);
    state = 'levelup';
    audio.levelUp();
  }

  function pickUpgrade(index) {
    const choice = choices[index];
    if (!choice) return;
    applyUpgrade(player, world.owned, choice);
    audio.click();
    if (player.novaOnLevel > 0) {
      world.novaBurst(player.x, player.y, 260, 40 * player.novaOnLevel);
    }
    player.pendingLevels -= 1;
    if (player.pendingLevels > 0) {
      openLevelUp();
    } else {
      state = 'playing';
    }
  }

  function inRect(rect, x, y) {
    return rect && x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

  function handleClicks() {
    const clicks = input.takeClicks();
    if (clicks.length === 0) return;
    audio.ensure();
    for (const c of clicks) {
      if (state === 'title' && inRect(rects.start, c.x, c.y)) {
        audio.click();
        startGame();
      } else if (state === 'title' && rects.nights) {
        rects.nights.forEach((rect, i) => {
          if (inRect(rect, c.x, c.y)) {
            selectedNight = i;
            audio.click();
          }
        });
        rects.shop?.forEach((rect) => {
          if (inRect(rect, c.x, c.y)) {
            if (buyItem(rect.id)) audio.powerup();
            else audio.click();
          }
        });
      } else if (state === 'levelup') {
        rects.cards?.forEach((rect, i) => {
          if (inRect(rect, c.x, c.y)) pickUpgrade(i);
        });
      } else if (state === 'paused') {
        if (inRect(rects.resume, c.x, c.y)) {
          audio.click();
          state = 'playing';
        } else if (inRect(rects.restart, c.x, c.y)) {
          audio.click();
          startGame();
        }
      } else if ((state === 'victory' || state === 'gameover') && inRect(rects.again, c.x, c.y)) {
        audio.click();
        startGame();
      }
    }
  }

  function handleKeys() {
    if (input.wasPressed('KeyM')) audio.toggleMute();
    if (state === 'title') {
      if (input.wasPressed('Enter') || input.wasPressed('Space')) {
        audio.ensure();
        audio.click();
        startGame();
      }
      return;
    }
    if (state === 'playing') {
      if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
        state = 'paused';
        audio.click();
      }
      return;
    }
    if (state === 'levelup') {
      if (input.wasPressed('Digit1')) pickUpgrade(0);
      else if (input.wasPressed('Digit2')) pickUpgrade(1);
      else if (input.wasPressed('Digit3')) pickUpgrade(2);
      return;
    }
    if (state === 'paused') {
      if (input.wasPressed('KeyP') || input.wasPressed('Escape') || input.wasPressed('Enter')) {
        state = 'playing';
        audio.click();
      } else if (input.wasPressed('KeyR')) {
        startGame();
      }
      return;
    }
    if (state === 'victory' || state === 'gameover') {
      if (input.wasPressed('KeyR') || input.wasPressed('Enter') || input.wasPressed('Space')) {
        audio.click();
        startGame();
      }
    }
  }

  function step(dt) {
    if (state !== 'playing') return;
    world.update(dt, input);
    if (!player.alive) {
      state = 'gameover';
      audio.gameOver();
      recordResult('defeat');
      return;
    }
    if (world.time >= CONFIG.gameDuration) {
      state = 'victory';
      audio.victory();
      recordResult('victory');
      return;
    }
    if (player.pendingLevels > 0) openLevelUp();
  }

  function render() {
    ctx.save();
    if (world.shake > 0.2 && state === 'playing') {
      const s = world.shake * world.shake * 0.06;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }
    const mouse = { mouseX: input.mouseX, mouseY: input.mouseY, mouseInside: input.mouseInside };
    if (state === 'title') {
      rects = drawTitle(ctx, world, animTime, best, mouse, selectedNight);
    } else if (state === 'playing' || state === 'paused' || state === 'levelup') {
      drawWorld(ctx, world, animTime);
      drawHUD(ctx, world);
      if (state === 'levelup') rects = drawLevelUp(ctx, choices, player.level, mouse);
      else if (state === 'paused') rects = drawPaused(ctx, mouse);
    } else if (state === 'victory') {
      drawWorld(ctx, world, animTime);
      rects = drawVictory(ctx, world, mouse);
    } else if (state === 'gameover') {
      drawWorld(ctx, world, animTime);
      rects = drawGameOver(ctx, world, mouse);
    }
    ctx.restore();
  }

  function frame(now) {
    const dt = Math.min(0.1, (now - lastNow) / 1000 || 0);
    lastNow = now;
    animTime += dt;
    handleClicks();
    handleKeys();
    accumulator += dt;
    let steps = 0;
    while (accumulator >= CONFIG.step && steps < 5) {
      step(CONFIG.step);
      accumulator -= CONFIG.step;
      steps += 1;
    }
    if (steps === 5) accumulator = 0;
    render();
    input.endFrame();
    window.requestAnimationFrame(frame);
  }

  // First gesture unlocks audio (browsers require one).
  function unlockAudio() {
    audio.ensure();
    if (state === 'title') audio.startJingle();
  }
  window.addEventListener('keydown', unlockAudio, { once: true });
  window.addEventListener('mousedown', unlockAudio, { once: true });

  // A handle for scripted play-tests (never used by the game itself).
  window.__game = {
    get state() {
      return state;
    },
    get world() {
      return world;
    },
    get player() {
      return player;
    },
    startGame,
  };

  if (shotScene) {
    // Deterministic shot: build the scene, draw one frame, signal readiness.
    const setup = setupShot(shotScene, seed);
    state = setup.state;
    world = setup.world;
    player = setup.player;
    animTime = setup.time;
    const noMouse = { mouseX: -1, mouseY: -1, mouseInside: false };
    ctx.save();
    if (state === 'title') {
      rects = drawTitle(ctx, world, animTime, best, noMouse);
    } else if (state === 'playing') {
      drawWorld(ctx, world, animTime);
      drawHUD(ctx, world);
    } else if (state === 'victory') {
      drawWorld(ctx, world, animTime);
      rects = drawVictory(ctx, world, noMouse);
    } else if (state === 'gameover') {
      drawWorld(ctx, world, animTime);
      rects = drawGameOver(ctx, world, noMouse);
    }
    ctx.restore();
    window.__shotReady = true;
    return;
  }

  audio.ensure();
  lastNow = performance.now();
  window.requestAnimationFrame(frame);
}

main();
