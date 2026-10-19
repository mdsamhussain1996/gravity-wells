/**
 * Gravity Wells — Phase 1 Level Definitions (Galaxy 1: First Orbit)
 * Each level includes geometry, placement zones, inventory, par, and a verified reference solution.
 */

export const LEVELS = [
  // -------------------------------------------------------------
  // Level 1: Orbital Drift
  // -------------------------------------------------------------
  {
    id: 'lvl_1',
    name: 'Orbital Drift',
    galaxy: 1,
    galaxyName: 'First Orbit',
    description: 'Aim and launch the comet directly into the target portal.',
    par: 0,
    launcher: { x: 250, y: 450, angle: 0, power: 340 },
    portal: { x: 1350, y: 450 },
    fixedBodies: [],
    allowedZones: [],
    inventory: [],
    referenceSolution: {
      angle: 0.0,
      power: 340,
      placedObjects: []
    }
  },

  // -------------------------------------------------------------
  // Level 2: Slingshot 101
  // -------------------------------------------------------------
  {
    id: 'lvl_2',
    name: 'Slingshot 101',
    galaxy: 1,
    galaxyName: 'First Orbit',
    description: 'Slingshot around the medium planet to curve into the portal.',
    par: 0,
    launcher: { x: 260, y: 720, angle: 0.58, power: 640 },
    portal: { x: 1350, y: 220 },
    fixedBodies: [
      { sizeKey: 'MEDIUM', x: 800, y: 450 }
    ],
    allowedZones: [],
    inventory: [],
    referenceSolution: {
      angle: 0.58,
      power: 640,
      placedObjects: []
    }
  },

  // -------------------------------------------------------------
  // Level 3: Custom Orbit
  // -------------------------------------------------------------
  {
    id: 'lvl_3',
    name: 'Custom Orbit',
    galaxy: 1,
    galaxyName: 'First Orbit',
    description: 'Place a planet in the marked zone to pull the comet around the barrier.',
    par: 1,
    launcher: { x: 250, y: 350, angle: 0.45, power: 500 },
    portal: { x: 1350, y: 680 },
    fixedBodies: [
      { sizeKey: 'MEDIUM', x: 800, y: 320 } // Barrier planet
    ],
    allowedZones: [
      { x: 600, y: 500, w: 400, h: 280 }
    ],
    inventory: ['SMALL'],
    referenceSolution: {
      angle: 0.45,
      power: 500,
      placedObjects: [
        { sizeKey: 'SMALL', x: 650, y: 550 }
      ]
    }
  },

  // -------------------------------------------------------------
  // Level 4: Binary Pull
  // -------------------------------------------------------------
  {
    id: 'lvl_4',
    name: 'Binary Pull',
    galaxy: 1,
    galaxyName: 'First Orbit',
    description: 'Weave through the gravitational corridor between twin stars.',
    par: 0,
    launcher: { x: 220, y: 450, angle: 0.0, power: 470 },
    portal: { x: 1380, y: 450 },
    fixedBodies: [
      { sizeKey: 'MEDIUM', x: 750, y: 340 },
      { sizeKey: 'MEDIUM', x: 750, y: 560 }
    ],
    allowedZones: [],
    inventory: [],
    referenceSolution: {
      angle: 0.0,
      power: 470,
      placedObjects: []
    }
  },

  // -------------------------------------------------------------
  // Level 5: Precision Transit
  // -------------------------------------------------------------
  {
    id: 'lvl_5',
    name: 'Precision Transit',
    galaxy: 1,
    galaxyName: 'First Orbit',
    description: 'Place a planet to perform a high-speed gravity assist into the portal.',
    par: 1,
    launcher: { x: 220, y: 720, angle: -0.56, power: 640 },
    portal: { x: 1380, y: 240 },
    fixedBodies: [
      { sizeKey: 'LARGE', x: 800, y: 240 } // Distant large body
    ],
    allowedZones: [
      { x: 550, y: 500, w: 450, h: 280 }
    ],
    inventory: ['MEDIUM'],
    referenceSolution: {
      angle: -0.56,
      power: 640,
      placedObjects: [
        { sizeKey: 'MEDIUM', x: 600, y: 650 }
      ]
    }
  }
];
