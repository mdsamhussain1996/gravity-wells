/**
 * Gravity Wells — Game Bodies & Celestial Entities
 */

import { COMET_RADIUS, PORTAL_RADIUS, PLANET_SIZES, MAX_LAUNCH_SPEED, MIN_LAUNCH_SPEED } from './constants.js';

export class Comet {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = COMET_RADIUS;
    this.active = false;
    this.trail = []; // Array of { x, y, speed }
    this.maxTrailLength = 180;
  }

  launch(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.active = true;
    this.trail = [{ x, y, speed: Math.hypot(vx, vy) }];
  }

  recordTrail() {
    this.trail.push({
      x: this.x,
      y: this.y,
      speed: Math.hypot(this.vx, this.vy)
    });
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }
  }

  reset() {
    this.active = false;
    this.trail = [];
    this.vx = 0;
    this.vy = 0;
  }
}

export class Planet {
  constructor(sizeKey = 'MEDIUM', x = 0, y = 0, placeable = false, id = '') {
    const config = PLANET_SIZES[sizeKey] || PLANET_SIZES.MEDIUM;
    this.id = id || `planet_${Math.random().toString(36).substring(2, 9)}`;
    this.sizeKey = sizeKey;
    this.type = config.type;
    this.name = config.name;
    this.x = x;
    this.y = y;
    this.radius = config.radius;
    this.mass = config.mass;
    this.color = config.color;
    this.rimColor = config.rimColor;
    this.solid = true;
    this.active = true;
    this.placeable = placeable;
    this.isDragging = false;
  }
}

export class Launcher {
  constructor(x = 200, y = 450, angle = 0, power = 300) {
    this.x = x;
    this.y = y;
    this.angle = angle; // Radians
    this.power = power; // Speed magnitude
    this.minPower = MIN_LAUNCH_SPEED;
    this.maxPower = MAX_LAUNCH_SPEED;
    this.lockedAngle = false;
    this.lockedPower = false;
    this.radius = 28;
  }

  getLaunchVelocity() {
    return {
      vx: Math.cos(this.angle) * this.power,
      vy: Math.sin(this.angle) * this.power
    };
  }

  aimTowards(targetX, targetY) {
    if (!this.lockedAngle) {
      // Slingshot: aim vector is opposite of pull drag
      this.angle = Math.atan2(this.y - targetY, this.x - targetX);
    }
    if (!this.lockedPower) {
      const dist = Math.hypot(targetX - this.x, targetY - this.y);
      // Map drag distance (0 to 180) to power range
      const ratio = Math.min(1.0, dist / 180);
      this.power = this.minPower + ratio * (this.maxPower - this.minPower);
    }
  }
}

export class TargetPortal {
  constructor(x = 1400, y = 450) {
    this.x = x;
    this.y = y;
    this.radius = PORTAL_RADIUS;
    this.spinAngle = 0;
    this.active = true;
  }

  update(dt) {
    this.spinAngle += dt * 2.2;
    if (this.spinAngle > Math.PI * 2) {
      this.spinAngle -= Math.PI * 2;
    }
  }
}

export class AllowedZone {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  contains(px, py, radius = 0) {
    return (
      px - radius >= this.x &&
      px + radius <= this.x + this.w &&
      py - radius >= this.y &&
      py + radius <= this.y + this.h
    );
  }
}
