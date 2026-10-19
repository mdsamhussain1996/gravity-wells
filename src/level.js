/**
 * Gravity Wells — Level State & Simulation Manager
 * Manages object placement, short trajectory preview, slingshot launch, and ghost trails.
 */

import { SUB_STEPS, SUB_DT, PREVIEW_DURATION, PLAYFIELD_W, PLAYFIELD_H, MAX_GHOST_TRAILS, PLANET_SIZES } from './constants.js';
import { PhysicsEngine } from './physics.js';
import { Comet, Planet, Launcher, TargetPortal, AllowedZone } from './bodies.js';

export class LevelManager {
  constructor() {
    this.currentLevelDef = null;
    this.launcher = new Launcher();
    this.portal = new TargetPortal();
    this.comet = new Comet();

    this.fixedBodies = [];
    this.placedBodies = [];
    this.allowedZones = [];
    this.inventory = [];
    this.initialInventory = [];

    // Ghost trails (last 3 attempts)
    this.ghostTrails = [];

    // State: 'aiming', 'flying', 'crashed', 'won', 'lost'
    this.state = 'aiming';
    this.timeScale = 1; // 1, 2, or 4
    this.attempts = 0;
    this.crashReason = '';
    this.winDelay = 0;

    // Callbacks
    this.onWin = null;
    this.onCrash = null;
  }

  loadLevel(def) {
    this.currentLevelDef = def;
    this.state = 'aiming';
    this.attempts = 0;
    this.ghostTrails = [];
    this.timeScale = 1;
    this.crashReason = '';

    // Setup Launcher & Portal
    this.launcher = new Launcher(
      def.launcher.x,
      def.launcher.y,
      def.launcher.angle,
      def.launcher.power
    );
    this.portal = new TargetPortal(def.portal.x, def.portal.y);

    // Setup Fixed Bodies
    this.fixedBodies = (def.fixedBodies || []).map((b, i) => {
      return new Planet(b.sizeKey, b.x, b.y, false, `fixed_${i}`);
    });

    // Setup Allowed Placement Zones
    this.allowedZones = (def.allowedZones || []).map((z) => {
      return new AllowedZone(z.x, z.y, z.w, z.h);
    });

    // Setup Inventory
    this.initialInventory = [...(def.inventory || [])];
    this.inventory = [...this.initialInventory];
    this.placedBodies = [];

    this.comet.reset();
  }

  getAllBodies() {
    return [...this.fixedBodies, ...this.placedBodies];
  }

  canPlace(sizeKey, x, y) {
    const config = PLANET_SIZES[sizeKey];
    if (!config) return false;

    // Must be inside at least one allowed zone
    let insideZone = false;
    for (let i = 0; i < this.allowedZones.length; i++) {
      if (this.allowedZones[i].contains(x, y, config.radius)) {
        insideZone = true;
        break;
      }
    }
    if (!insideZone) return false;

    // Must not overlap fixed or already placed bodies
    const bodies = this.getAllBodies();
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      const dist = Math.hypot(b.x - x, b.y - y);
      if (dist < b.radius + config.radius + 10) {
        return false;
      }
    }

    // Must not overlap launcher or portal
    if (Math.hypot(this.launcher.x - x, this.launcher.y - y) < this.launcher.radius + config.radius + 15) return false;
    if (Math.hypot(this.portal.x - x, this.portal.y - y) < this.portal.radius + config.radius + 15) return false;

    return true;
  }

  placeObject(sizeKey, x, y) {
    const invIdx = this.inventory.indexOf(sizeKey);
    if (invIdx === -1) return null;
    if (!this.canPlace(sizeKey, x, y)) return null;

    this.inventory.splice(invIdx, 1);
    const planet = new Planet(sizeKey, x, y, true);
    this.placedBodies.push(planet);
    return planet;
  }

  removePlacedObject(planet) {
    const idx = this.placedBodies.indexOf(planet);
    if (idx !== -1) {
      this.placedBodies.splice(idx, 1);
      this.inventory.push(planet.sizeKey);
    }
  }

  resetObjects() {
    this.placedBodies = [];
    this.inventory = [...this.initialInventory];
    this.retry();
  }

  launch() {
    if (this.state !== 'aiming') return;

    this.attempts++;
    const vel = this.launcher.getLaunchVelocity();
    this.comet.launch(this.launcher.x, this.launcher.y, vel.vx, vel.vy);
    this.state = 'flying';
  }

  retry() {
    // Record current trail as a ghost trail if comet flew
    if (this.comet.trail.length > 5) {
      this.ghostTrails.push([...this.comet.trail]);
      if (this.ghostTrails.length > MAX_GHOST_TRAILS) {
        this.ghostTrails.shift();
      }
    }

    this.comet.reset();
    this.state = 'aiming';
    this.crashReason = '';
  }

  /**
   * Compute a short preview of the first ~0.42s of trajectory (~100 substeps).
   * Does NOT reveal the full path — preserves puzzle deduction.
   * @returns {Array<{x: number, y: number}>}
   */
  computeShortPreview() {
    const points = [];
    const vel = this.launcher.getLaunchVelocity();

    // Virtual clone comet
    const simComet = {
      x: this.launcher.x,
      y: this.launcher.y,
      vx: vel.vx,
      vy: vel.vy,
      radius: this.comet.radius
    };

    const bodies = this.getAllBodies();
    const steps = Math.floor(PREVIEW_DURATION / SUB_DT);

    points.push({ x: simComet.x, y: simComet.y });

    for (let i = 0; i < steps; i++) {
      const result = PhysicsEngine.step(simComet, bodies, SUB_DT);
      if (i % 4 === 0) {
        points.push({ x: simComet.x, y: simComet.y });
      }
      if (result.collided) break;

      // Check portal reach
      const dPortal = Math.hypot(simComet.x - this.portal.x, simComet.y - this.portal.y);
      if (dPortal <= this.portal.radius) break;
    }

    return points;
  }

  update(dt) {
    this.portal.update(dt);

    if (this.state !== 'flying') return;

    const bodies = this.getAllBodies();
    const totalSubsteps = SUB_STEPS * this.timeScale;

    for (let step = 0; step < totalSubsteps; step++) {
      const hit = PhysicsEngine.step(this.comet, bodies, SUB_DT);
      this.comet.recordTrail();

      // 1. Collision with solid planet
      if (hit.collided) {
        this.state = 'crashed';
        this.crashReason = `Crashed into ${hit.body.name}`;
        if (typeof this.onCrash === 'function') this.onCrash(this.comet.x, this.comet.y);
        return;
      }

      // 2. Check portal entry
      const distToPortal = Math.hypot(this.comet.x - this.portal.x, this.comet.y - this.portal.y);
      if (distToPortal <= this.portal.radius) {
        this.state = 'won';
        if (typeof this.onWin === 'function') this.onWin(this.attempts, this.placedBodies.length);
        return;
      }

      // 3. Out of bounds check
      const margin = 160;
      if (
        this.comet.x < -margin ||
        this.comet.x > PLAYFIELD_W + margin ||
        this.comet.y < -margin ||
        this.comet.y > PLAYFIELD_H + margin
      ) {
        this.state = 'lost';
        this.crashReason = 'Lost in deep space';
        return;
      }
    }
  }
}
