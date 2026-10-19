/**
 * Gravity Wells — UI Manager & HUD
 * Controls title screen, in-game header, inventory tray, and level win modal.
 */

import { LEVELS } from './levels.js';
import { PLANET_SIZES } from './constants.js';

export class UIManager {
  constructor(levelManager, audioManager, onLevelSelect) {
    this.level = levelManager;
    this.audio = audioManager;
    this.onLevelSelect = onLevelSelect;

    // DOM Elements
    this.titleScreen = document.getElementById('title-screen');
    this.hud = document.getElementById('hud');
    this.winModal = document.getElementById('win-modal');
    this.levelSelectModal = document.getElementById('level-select-modal');

    // HUD Elements
    this.levelTitleEl = document.getElementById('level-title');
    this.attemptsEl = document.getElementById('stat-attempts');
    this.statusBanner = document.getElementById('status-banner');
    this.inventoryTray = document.getElementById('inventory-tray');

    // Speed buttons
    this.btnSpeed1 = document.getElementById('btn-speed-1');
    this.btnSpeed2 = document.getElementById('btn-speed-2');
    this.btnSpeed4 = document.getElementById('btn-speed-4');

    this.bindEvents();
  }

  bindEvents() {
    document.getElementById('btn-start-game').addEventListener('click', () => {
      this.audio.playSfx('click');
      this.showScreen('game');
      this.onLevelSelect(0);
    });

    document.getElementById('btn-open-levels').addEventListener('click', () => {
      this.audio.playSfx('click');
      this.showLevelSelect();
    });

    document.getElementById('btn-close-levels').addEventListener('click', () => {
      this.audio.playSfx('click');
      this.showScreen('title');
    });

    document.getElementById('btn-retry').addEventListener('click', () => {
      this.audio.playSfx('click');
      this.level.retry();
    });

    document.getElementById('btn-reset-objects').addEventListener('click', () => {
      this.audio.playSfx('click');
      this.level.resetObjects();
      this.renderInventoryTray();
    });

    document.getElementById('btn-launch').addEventListener('click', () => {
      if (this.level.state === 'aiming') {
        this.audio.playSfx('launch');
        this.level.launch();
      }
    });

    // Speed toggles
    this.btnSpeed1.addEventListener('click', () => this.setSpeed(1));
    this.btnSpeed2.addEventListener('click', () => this.setSpeed(2));
    this.btnSpeed4.addEventListener('click', () => this.setSpeed(4));

    // Win Modal
    document.getElementById('btn-next-level').addEventListener('click', () => {
      this.audio.playSfx('click');
      const curIdx = LEVELS.findIndex(l => l.id === this.level.currentLevelDef.id);
      if (curIdx + 1 < LEVELS.length) {
        this.onLevelSelect(curIdx + 1);
      } else {
        this.showScreen('title');
      }
    });

    document.getElementById('btn-replay-level').addEventListener('click', () => {
      this.audio.playSfx('click');
      const curIdx = LEVELS.findIndex(l => l.id === this.level.currentLevelDef.id);
      this.onLevelSelect(curIdx);
    });
  }

  setSpeed(val) {
    this.level.timeScale = val;
    this.btnSpeed1.classList.toggle('active', val === 1);
    this.btnSpeed2.classList.toggle('active', val === 2);
    this.btnSpeed4.classList.toggle('active', val === 4);
  }

  showScreen(screen) {
    this.titleScreen.classList.add('hidden');
    this.hud.classList.add('hidden');
    this.winModal.classList.add('hidden');
    this.levelSelectModal.classList.add('hidden');

    if (screen === 'title') {
      this.titleScreen.classList.remove('hidden');
    } else if (screen === 'game') {
      this.hud.classList.remove('hidden');
    }
  }

  showLevelSelect() {
    this.levelSelectModal.classList.remove('hidden');
    const grid = document.getElementById('level-grid');
    grid.innerHTML = '';

    LEVELS.forEach((lvl, idx) => {
      const btn = document.createElement('button');
      btn.className = 'level-node-btn';
      btn.innerHTML = `<span class="lvl-num">${idx + 1}</span><span class="lvl-name">${lvl.name}</span>`;
      btn.addEventListener('click', () => {
        this.audio.playSfx('click');
        this.showScreen('game');
        this.onLevelSelect(idx);
      });
      grid.appendChild(btn);
    });
  }

  updateHUD() {
    if (!this.level.currentLevelDef) return;

    this.levelTitleEl.textContent = `${this.level.currentLevelDef.name}`;
    this.attemptsEl.textContent = String(this.level.attempts);

    // Status banner when crashed or lost
    if (this.level.state === 'crashed' || this.level.state === 'lost') {
      this.statusBanner.classList.remove('hidden');
      this.statusBanner.textContent = `${this.level.crashReason} — Press [R] or Retry`;
    } else {
      this.statusBanner.classList.add('hidden');
    }

    // Toggle launch button text
    const launchBtn = document.getElementById('btn-launch');
    launchBtn.disabled = this.level.state !== 'aiming';
  }

  renderInventoryTray() {
    const inv = this.level.inventory;
    const counts = {};
    inv.forEach(key => counts[key] = (counts[key] || 0) + 1);

    this.inventoryTray.innerHTML = '';

    if (Object.keys(counts).length === 0) {
      this.inventoryTray.innerHTML = '<span class="empty-tray-label">No Placeable Bodies</span>';
      return;
    }

    for (const sizeKey in counts) {
      const cfg = PLANET_SIZES[sizeKey];
      const count = counts[sizeKey];

      const item = document.createElement('div');
      item.className = 'inventory-item';
      item.innerHTML = `
        <div class="inv-preview" style="background: ${cfg.color}; width: ${cfg.radius * 0.9}px; height: ${cfg.radius * 0.9}px;"></div>
        <div class="inv-info">
          <span class="inv-name">${cfg.name}</span>
          <span class="inv-count">x${count}</span>
        </div>
      `;

      // Click to place automatically in first open spot in zone
      item.addEventListener('click', () => {
        if (this.level.allowedZones.length > 0) {
          const z = this.level.allowedZones[0];
          // Try placing in center of zone
          const px = z.x + z.w / 2;
          const py = z.y + z.h / 2;
          if (this.level.placeObject(sizeKey, px, py)) {
            this.audio.playSfx('click');
            this.renderInventoryTray();
          }
        }
      });

      this.inventoryTray.appendChild(item);
    }
  }

  showWinModal(attempts, placedCount) {
    this.winModal.classList.remove('hidden');
    const par = this.level.currentLevelDef.par;

    // Star 1: Reached portal (always true on win)
    const star1 = true;
    // Star 2: Solved within reasonable attempts (<= 5 attempts)
    const star2 = attempts <= 5;
    // Star 3: Met object par (<= par placed objects)
    const star3 = placedCount <= par;

    document.getElementById('star-1').className = star1 ? 'star-active' : 'star-inactive';
    document.getElementById('star-2').className = star2 ? 'star-active' : 'star-inactive';
    document.getElementById('star-3').className = star3 ? 'star-active' : 'star-inactive';

    document.getElementById('win-attempts').textContent = String(attempts);
    document.getElementById('win-placed').textContent = `${placedCount} (Par: ${par})`;
  }
}
