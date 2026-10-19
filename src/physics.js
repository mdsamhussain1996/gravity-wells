/**
 * Gravity Wells — Deterministic Physics Engine
 * Newtonian gravity with Plummer softening and Symplectic Velocity-Verlet integrator.
 * Continuous collision detection prevents tunneling at all velocities.
 */

import { GRAVITY_G, SOFTENING_EPS, SUB_DT } from './constants.js';

export class PhysicsEngine {
  /**
   * Compute gravitational acceleration on a test particle at (px, py).
   * a = Σ G · m_i · (r_i - r) / (|r_i - r|² + ε²)^(3/2)
   * @param {number} px
   * @param {number} py
   * @param {Array} bodies Array of gravitational bodies with { x, y, mass }
   * @returns {{ ax: number, ay: number }}
   */
  static computeGravity(px, py, bodies) {
    let ax = 0;
    let ay = 0;
    const epsSq = SOFTENING_EPS * SOFTENING_EPS;

    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      if (!b.active || b.mass === 0) continue;

      const dx = b.x - px;
      const dy = b.y - py;
      const r2 = dx * dx + dy * dy;
      const denom = Math.pow(r2 + epsSq, 1.5);

      if (denom > 0.000001) {
        const factor = (GRAVITY_G * b.mass) / denom;
        ax += dx * factor;
        ay += dy * factor;
      }
    }

    return { ax, ay };
  }

  /**
   * Perform a single fixed substep (dt = 1/240 s) using symplectic Velocity-Verlet.
   * Continuous collision detection evaluates the trajectory segment to prevent tunneling.
   * @param {Object} comet { x, y, vx, vy, radius }
   * @param {Array} bodies
   * @param {number} [dt=SUB_DT]
   * @returns {{ collided: boolean, body: Object|null, hitPoint: {x: number, y: number}|null }}
   */
  static step(comet, bodies, dt = SUB_DT) {
    // 1. Initial acceleration at current position
    const a0 = this.computeGravity(comet.x, comet.y, bodies);

    // 2. Half-step velocity update
    const vHalfX = comet.vx + 0.5 * a0.ax * dt;
    const vHalfY = comet.vy + 0.5 * a0.ay * dt;

    // 3. Position update
    const x0 = comet.x;
    const y0 = comet.y;
    const x1 = x0 + vHalfX * dt;
    const y1 = y0 + vHalfY * dt;

    // 4. Continuous Collision Check along segment (x0, y0) -> (x1, y1)
    let collision = null;
    let earliestT = 1.000001;

    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      if (!b.active || !b.solid) continue;

      const hit = this.checkSegmentCircle(x0, y0, x1, y1, b.x, b.y, b.radius + comet.radius);
      if (hit.collided && hit.t <= earliestT) {
        earliestT = hit.t;
        collision = {
          collided: true,
          body: b,
          hitPoint: {
            x: x0 + (x1 - x0) * hit.t,
            y: y0 + (y1 - y0) * hit.t
          }
        };
      }
    }

    if (collision) {
      comet.x = collision.hitPoint.x;
      comet.y = collision.hitPoint.y;
      return collision;
    }

    // Apply new position
    comet.x = x1;
    comet.y = y1;

    // 5. New acceleration at x(t + dt)
    const a1 = this.computeGravity(comet.x, comet.y, bodies);

    // 6. Complete velocity update
    comet.vx = vHalfX + 0.5 * a1.ax * dt;
    comet.vy = vHalfY + 0.5 * a1.ay * dt;

    return { collided: false, body: null, hitPoint: null };
  }

  /**
   * Continuous line segment to circle collision test.
   * Uses exact quadratic ray-circle intersection to find the exact entry point t in [0, 1].
   * Completely prevents tunneling even at extreme velocities.
   */
  static checkSegmentCircle(x0, y0, x1, y1, cx, cy, radius) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const a = dx * dx + dy * dy;

    // Vector from circle center to segment start
    const fx = x0 - cx;
    const fy = y0 - cy;
    const c = fx * fx + fy * fy - radius * radius;

    // Already inside or on boundary at start of step
    if (c <= 0) {
      return { collided: true, t: 0 };
    }

    // Barely moved
    if (a < 0.000001) {
      return { collided: false, t: 0 };
    }

    const b = 2 * (fx * dx + fy * dy);
    const discriminant = b * b - 4 * a * c;

    if (discriminant < 0) {
      return { collided: false, t: 0 };
    }

    const sqrtDisc = Math.sqrt(discriminant);
    const t1 = (-b - sqrtDisc) / (2 * a);

    // Earliest intersection point along the directed segment [0, 1]
    if (t1 >= 0 && t1 <= 1) {
      return { collided: true, t: t1 };
    }

    // Segment passes through or ends inside
    const t2 = (-b + sqrtDisc) / (2 * a);
    if (t2 >= 0 && t1 <= 0 && t2 <= 1) {
      return { collided: true, t: Math.max(0, t1) };
    }

    return { collided: false, t: 0 };
  }

  /**
   * Compute specific orbital energy of the comet (kinetic + gravitational potential).
   * Used for energy conservation verification tests.
   * @param {Object} comet
   * @param {Array} bodies
   * @returns {number}
   */
  static computeSpecificEnergy(comet, bodies) {
    const vSq = comet.vx * comet.vx + comet.vy * comet.vy;
    const kinetic = 0.5 * vSq;

    let potential = 0;
    const epsSq = SOFTENING_EPS * SOFTENING_EPS;

    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      if (!b.active || b.mass === 0) continue;

      const r = Math.hypot(comet.x - b.x, comet.y - b.y);
      potential -= (GRAVITY_G * b.mass) / Math.sqrt(r * r + epsSq);
    }

    return kinetic + potential;
  }
}
