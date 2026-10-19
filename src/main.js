/**
 * Gravity Wells — Main Application Entrypoint
 */

import { PLAYFIELD_W, PLAYFIELD_H } from './constants.js';
import { LevelManager } from './level.js';
import { Renderer } from './render.js';
import { ParticleSystem } from './particles.js';
import { AudioManager } from './audio.js';
import { InputManager } from './input.js';
import { UIManager } from './ui.js';
import { LEVELS } from './levels.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const container = document.getElementById('game-container');

  canvas.width = PLAYFIELD_W;
  canvas.height = PLAYFIELD_H;

  // Initialize Systems
  const levelManager = new LevelManager();
  const particleSystem = new ParticleSystem();
  const audioManager = new AudioManager();
  const renderer = new Renderer(canvas);
  const inputManager = new InputManager(canvas, levelManager, audioManager);

  const startLevel = (idx) => {
    const def = LEVELS[idx] || LEVELS[0];
    levelManager.loadLevel(def);
    particleSystem.reset();
    uiManager.renderInventoryTray();
    uiManager.setSpeed(1);
  };

  const uiManager = new UIManager(levelManager, audioManager, startLevel);

  // Hook win / crash events
  levelManager.onWin = (attempts, placedCount) => {
    audioManager.playSfx('win');
    particleSystem.spawnWinBurst(levelManager.portal.x, levelManager.portal.y, 45);
    setTimeout(() => {
      uiManager.showWinModal(attempts, placedCount);
    }, 500);
  };

  levelManager.onCrash = (x, y) => {
    audioManager.playSfx('crash');
    particleSystem.spawnExplosion(x, y, 32);
  };

  // Responsive Letterbox Scaler
  function resize() {
    const windowW = window.innerWidth;
    const windowH = window.innerHeight;
    const scale = Math.min(windowW / PLAYFIELD_W, windowH / PLAYFIELD_H);

    const targetW = Math.floor(PLAYFIELD_W * scale);
    const targetH = Math.floor(PLAYFIELD_H * scale);

    container.style.width = `${targetW}px`;
    container.style.height = `${targetH}px`;
  }

  window.addEventListener('resize', resize);
  resize();

  // Test / Automation Hook
  window.__gw = {
    levelManager,
    renderer,
    uiManager,
    startLevel,
    LEVELS
  };

  // Main Loop
  let lastTime = performance.now();
  let animTime = 0;

  function loop(currentTime) {
    const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;
    animTime += dt;

    // Simulation step
    levelManager.update(dt);
    particleSystem.update(dt);

    // Spawn comet tail particles while in flight
    if (levelManager.comet.active) {
      particleSystem.spawnTailSpark(
        levelManager.comet.x,
        levelManager.comet.y,
        Math.hypot(levelManager.comet.vx, levelManager.comet.vy)
      );
    }

    // Update UI HUD
    uiManager.updateHUD();

    // Render frame
    renderer.draw(levelManager, particleSystem, inputManager, animTime);

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
});
