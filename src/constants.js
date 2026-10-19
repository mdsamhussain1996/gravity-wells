/**
 * Gravity Wells — Constants & Configuration
 * Logical playfield: 1600x900 units
 * Fixed deterministic physics: dt = 1/240s, 4 substeps per 1/60s frame
 */

export const PLAYFIELD_W = 1600;
export const PLAYFIELD_H = 900;

// Physics Settings
export const GRAVITY_G = 14000;       // Gravitational constant
export const SOFTENING_EPS = 18;     // Softening parameter ε to prevent singularities
export const SUB_STEPS = 4;          // 4 substeps per frame
export const SUB_DT = 1 / 240;       // 1/240 s per substep (1/60s frame dt)
export const MAX_LAUNCH_SPEED = 650; // Maximum slingshot impulse speed
export const MIN_LAUNCH_SPEED = 80;  // Minimum launch speed
export const PREVIEW_DURATION = 0.42; // Short preview duration in seconds (~100 substeps)

// Planet Types & Sizes
export const PLANET_SIZES = {
  SMALL: { type: 'planet_s', name: 'Small Planet', radius: 26, mass: 4500, color: '#38bdf8', rimColor: '#7dd3fc' },
  MEDIUM: { type: 'planet_m', name: 'Medium Planet', radius: 42, mass: 13000, color: '#34d399', rimColor: '#6ee7b7' },
  LARGE: { type: 'planet_l', name: 'Large Planet', radius: 62, mass: 32000, color: '#fb923c', rimColor: '#fdba74' }
};

export const PORTAL_RADIUS = 34;
export const COMET_RADIUS = 6;
export const MAX_GHOST_TRAILS = 3;

// Credits & Branding
export const CREDITS_TEXT = 'Made by Dr. Md Samshad Hussain Ansari';
