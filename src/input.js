/**
 * Gravity Wells — Unified Input Controller
 * Handles mouse and touch interactions: slingshot aiming, planet placement, and shortcuts.
 */

import { PLAYFIELD_W, PLAYFIELD_H } from './constants.js';

export class InputManager {
  constructor(canvas, levelManager, audioManager) {
    this.canvas = canvas;
    this.level = levelManager;
    this.audio = audioManager;

    // Interaction states
    this.isDraggingSlingshot = false;
    this.draggedPlanet = null; // Placed planet being repositioned
    this.trayDragSizeKey = null; // Planet being dragged from inventory tray
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragCurrX = 0;
    this.dragCurrY = 0;

    this.bindEvents();
  }

  getLogicalCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const scaleX = PLAYFIELD_W / rect.width;
    const scaleY = PLAYFIELD_H / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  bindEvents() {
    const onStart = (e) => {
      const { x, y } = this.getLogicalCoords(e);
      this.dragStartX = x;
      this.dragStartY = y;
      this.dragCurrX = x;
      this.dragCurrY = y;

      if (this.level.state === 'aiming') {
        // 1. Check if clicking launcher
        const dLauncher = Math.hypot(x - this.level.launcher.x, y - this.level.launcher.y);
        if (dLauncher < this.level.launcher.radius + 35) {
          this.isDraggingSlingshot = true;
          this.audio.playSfx('pull');
          e.preventDefault();
          return;
        }

        // 2. Check if clicking an already placed planet
        const placed = this.level.placedBodies;
        for (let i = placed.length - 1; i >= 0; i--) {
          const p = placed[i];
          const dPlanet = Math.hypot(x - p.x, y - p.y);
          if (dPlanet <= p.radius + 15) {
            this.draggedPlanet = p;
            p.isDragging = true;
            this.audio.playSfx('click');
            e.preventDefault();
            return;
          }
        }
      }
    };

    const onMove = (e) => {
      if (!this.isDraggingSlingshot && !this.draggedPlanet && !this.trayDragSizeKey) return;

      const { x, y } = this.getLogicalCoords(e);
      this.dragCurrX = x;
      this.dragCurrY = y;

      if (this.isDraggingSlingshot) {
        this.level.launcher.aimTowards(x, y);
      } else if (this.draggedPlanet) {
        this.draggedPlanet.x = x;
        this.draggedPlanet.y = y;
      }
      e.preventDefault();
    };

    const onEnd = () => {
      if (this.isDraggingSlingshot) {
        this.isDraggingSlingshot = false;
        // Slingshot release triggers launch!
        this.audio.playSfx('launch');
        this.level.launch();
      }

      if (this.draggedPlanet) {
        const p = this.draggedPlanet;
        p.isDragging = false;

        // If dropped outside allowed zone, return to inventory
        if (!this.level.canPlace(p.sizeKey, p.x, p.y)) {
          this.level.removePlacedObject(p);
          this.audio.playSfx('click');
        }
        this.draggedPlanet = null;
      }

      if (this.trayDragSizeKey) {
        // Try placing from tray
        this.level.placeObject(this.trayDragSizeKey, this.dragCurrX, this.dragCurrY);
        this.trayDragSizeKey = null;
      }
    };

    // Mouse
    this.canvas.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);

    // Touch
    this.canvas.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyR') {
        this.level.retry();
      } else if (e.code === 'Space') {
        if (this.level.state === 'aiming') {
          this.audio.playSfx('launch');
          this.level.launch();
        }
      } else if (e.code === 'Digit1') {
        this.level.timeScale = 1;
      } else if (e.code === 'Digit2') {
        this.level.timeScale = 2;
      } else if (e.code === 'Digit3') {
        this.level.timeScale = 4;
      }
    });
  }
}
