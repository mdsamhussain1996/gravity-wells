/**
 * Gravity Wells — Phase 1 Test Suite
 * Validates determinism, symplectic energy conservation, continuous collision tunneling prevention,
 * and 100% reachability of all 5 initial levels with reference solutions.
 */

import assert from 'assert';
import { PhysicsEngine } from '../src/physics.js';
import { LevelManager } from '../src/level.js';
import { Planet, Comet } from '../src/bodies.js';
import { LEVELS } from '../src/levels.js';
import { SUB_DT, GRAVITY_G, SOFTENING_EPS, PLANET_SIZES } from '../src/constants.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    failed++;
  }
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

// -------------------------------------------------------------
// Section 1: Determinism Tests
// -------------------------------------------------------------
section('1. Determinism Tests');

test('Symplectic leapfrog produces bitwise identical trajectories across multiple runs', () => {
  function runSimulation() {
    const bodies = [
      new Planet('MEDIUM', 800, 450, false, 'p1'),
      new Planet('LARGE', 1200, 600, false, 'p2')
    ];
    const comet = {
      x: 200,
      y: 400,
      vx: 320.1234567,
      vy: -150.9876543,
      radius: 6
    };

    // Run 1200 substeps (5.0 seconds of simulation)
    for (let i = 0; i < 1200; i++) {
      PhysicsEngine.step(comet, bodies, SUB_DT);
    }
    return { x: comet.x, y: comet.y, vx: comet.vx, vy: comet.vy };
  }

  const run1 = runSimulation();
  const run2 = runSimulation();
  const run3 = runSimulation();

  assert.equal(run1.x, run2.x, 'Run 1 and 2 X must be bitwise identical');
  assert.equal(run1.y, run2.y, 'Run 1 and 2 Y must be bitwise identical');
  assert.equal(run1.vx, run2.vx, 'Run 1 and 2 Vx must be bitwise identical');
  assert.equal(run1.vy, run2.vy, 'Run 1 and 2 Vy must be bitwise identical');

  assert.equal(run2.x, run3.x, 'Run 2 and 3 X must be bitwise identical');
  assert.equal(run2.y, run3.y, 'Run 2 and 3 Y must be bitwise identical');
  assert.equal(run2.vx, run3.vx, 'Run 2 and 3 Vx must be bitwise identical');
  assert.equal(run2.vy, run3.vy, 'Run 2 and 3 Vy must be bitwise identical');
});

// -------------------------------------------------------------
// Section 2: Symplectic Energy Conservation
// -------------------------------------------------------------
section('2. Symplectic Energy Conservation');

test('Two-body orbital energy drift < 0.5% over 20s (4800 substeps)', () => {
  const centralBody = new Planet('LARGE', 800, 450, false, 'sun');
  centralBody.mass = 20000;

  // Set up an elliptical orbit at distance r = 300
  const r0 = 300;
  const v0 = Math.sqrt((GRAVITY_G * centralBody.mass) / Math.hypot(r0, SOFTENING_EPS)) * 0.95;

  const comet = {
    x: 800,
    y: 450 - r0,
    vx: v0,
    vy: 0,
    radius: 6
  };

  const initialEnergy = PhysicsEngine.computeSpecificEnergy(comet, [centralBody]);

  // Simulate 4800 substeps = 20.0 seconds
  for (let step = 0; step < 4800; step++) {
    PhysicsEngine.step(comet, [centralBody], SUB_DT);
  }

  const finalEnergy = PhysicsEngine.computeSpecificEnergy(comet, [centralBody]);
  const driftPct = Math.abs((finalEnergy - initialEnergy) / initialEnergy) * 100;

  console.log(`    [ORBIT TEST] Energy drift over 20s: ${driftPct.toFixed(4)} % (requirement: < 0.5 %)`);
  assert.ok(driftPct < 0.5, `Energy drift ${driftPct}% exceeds 0.5% limit`);
});

// -------------------------------------------------------------
// Section 3: Continuous Collision & Anti-Tunneling
// -------------------------------------------------------------
section('3. Anti-Tunneling & Continuous Collision');

test('Comet cannot tunnel through small planets at max speed even with large steps', () => {
  const smallPlanet = new Planet('SMALL', 800, 450, false, 'target_planet');

  // Launch comet with extreme speed directly at the small planet
  const comet = {
    x: 750,
    y: 450,
    vx: 650, // Max launch speed
    vy: 0,
    radius: 6
  };

  // Single large time step (1/30 s = 21.6 units displacement)
  const result = PhysicsEngine.step(comet, [smallPlanet], 1 / 30);
  assert.equal(result.collided, true, 'Continuous collision must detect contact with planet');
  assert.equal(result.body, smallPlanet);
});

// -------------------------------------------------------------
// Section 4: Level Reachability & Reference Solutions
// -------------------------------------------------------------
section('4. Level Solvability & Reference Solutions');

LEVELS.forEach((levelDef, idx) => {
  test(`Level ${idx + 1} (${levelDef.name}) reference solution reaches portal and satisfies par`, () => {
    const lm = new LevelManager();
    lm.loadLevel(levelDef);

    const ref = levelDef.referenceSolution;
    assert.ok(ref, `Level ${levelDef.id} must have a reference solution`);

    // Place reference objects
    for (const obj of ref.placedObjects) {
      const placed = lm.placeObject(obj.sizeKey, obj.x, obj.y);
      assert.ok(placed, `Failed to place reference object ${obj.sizeKey} at (${obj.x}, ${obj.y}) in level ${levelDef.name}`);
    }

    // Set reference launcher angle & power
    lm.launcher.angle = ref.angle;
    lm.launcher.power = ref.power;

    // Launch
    lm.launch();
    assert.equal(lm.state, 'flying');

    // Simulate up to 10 seconds of flight (2400 substeps)
    let won = false;
    for (let f = 0; f < 600; f++) {
      lm.update(1 / 60);
      if (lm.state === 'won') {
        won = true;
        break;
      }
      if (lm.state === 'crashed' || lm.state === 'lost') {
        break;
      }
    }

    assert.equal(won, true, `Reference solution for level ${levelDef.name} failed to reach portal. State: ${lm.state} (${lm.crashReason})`);
    assert.ok(ref.placedObjects.length <= levelDef.par, `Reference object count (${ref.placedObjects.length}) exceeds par (${levelDef.par})`);
  });
});

console.log(`\n========================================`);
console.log(`Tests: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) process.exit(1);
