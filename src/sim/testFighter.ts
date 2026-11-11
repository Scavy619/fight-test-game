// A complete, balanced generic fighter using all 10 move slots. Used by the sim
// tests and as the stand-in fighter before the real roster exists.
//
// Frame data notes (hit on the first active frame; advantage = hitstun minus
// the attacker's remaining frames):
// - light +3 on hit / -1 on block, crouchLight +2 / -1, heavy +2 / -4. No
//   normal links into itself (every startup is longer than the advantage), so
//   the only chains are the cancel tiers light -> heavy -> special -> ultimate.
// - crouchHeavy (low) and specialD (invulnerable anti-air) launch; launched or
//   air-hit defenders always land in an invulnerable knockdown, and only a
//   cancel can follow a launch, so juggles end after at most two tiers.
// - specials are unsafe on block; the ultimate is a 5-hit rush (~294 damage
//   unscaled) whose 50-frame startup includes the 45-frame super freeze.
import type { FighterDef, MoveDef } from './types';

const light: MoveDef = {
  anim: 'light', startup: 4, active: 3, recovery: 8,
  damage: 40, level: 'mid', hitstun: 14, blockstun: 10, knockback: { x: 4, y: 0 },
  hitboxes: [{ x: 20, y: 105, w: 70, h: 30 }],
  strength: 'light', meterGain: 4,
  cancels: { into: ['heavy', 'crouchHeavy', 'specialN', 'specialF', 'specialD'], until: 12 },
};

const heavy: MoveDef = {
  anim: 'heavy', startup: 9, active: 4, recovery: 16,
  damage: 90, level: 'mid', hitstun: 22, blockstun: 16, knockback: { x: 6, y: 0 },
  hitboxes: [{ x: 25, y: 85, w: 95, h: 40 }],
  strength: 'heavy', meterGain: 8,
  cancels: { into: ['specialN', 'specialF', 'specialD', 'ultimate'], until: 20 },
};

const crouchLight: MoveDef = {
  anim: 'crouchLight', startup: 4, active: 3, recovery: 9,
  damage: 35, level: 'low', hitstun: 14, blockstun: 10, knockback: { x: 3, y: 0 },
  hitboxes: [{ x: 20, y: 5, w: 75, h: 28 }],
  strength: 'light', meterGain: 4,
  cancels: { into: ['heavy', 'crouchHeavy', 'specialN', 'specialF', 'specialD'], until: 12 },
};

const crouchHeavy: MoveDef = {
  anim: 'crouchHeavy', startup: 8, active: 3, recovery: 22,
  damage: 80, level: 'low', hitstun: 24, blockstun: 14, knockback: { x: 2.5, y: 11 },
  hitboxes: [{ x: 15, y: 0, w: 115, h: 26 }],
  strength: 'heavy', meterGain: 8, launches: true,
  cancels: { into: ['specialN', 'specialF', 'specialD', 'ultimate'], until: 16 },
};

const airLight: MoveDef = {
  anim: 'airLight', startup: 5, active: 4, recovery: 8,
  damage: 40, level: 'overhead', hitstun: 14, blockstun: 10, knockback: { x: 3, y: 0 },
  hitboxes: [{ x: 10, y: 10, w: 70, h: 45 }],
  strength: 'light', meterGain: 4,
  cancels: { into: ['airHeavy'], until: 14 },
};

const airHeavy: MoveDef = {
  anim: 'airHeavy', startup: 7, active: 5, recovery: 10,
  damage: 75, level: 'overhead', hitstun: 20, blockstun: 14, knockback: { x: 5, y: 2 },
  hitboxes: [{ x: 10, y: -15, w: 85, h: 55 }],
  strength: 'heavy', meterGain: 7,
};

/** Energy bolt projectile. */
const specialN: MoveDef = {
  anim: 'specialN', startup: 12, active: 1, recovery: 26,
  damage: 70, level: 'mid', hitstun: 18, blockstun: 14, knockback: { x: 5, y: 0 },
  hitboxes: [],
  strength: 'special', meterGain: 6,
  projectile: {
    frame: 13, x: 55, y: 115, vx: 7, vy: 0, w: 46, h: 36,
    damage: 70, lifetime: 150, hitstun: 18, blockstun: 14, knockback: { x: 5, y: 0 }, level: 'mid',
  },
  fx: [{ frame: 13, tag: 'cast' }],
};

/** Dash strike with self velocity. */
const specialF: MoveDef = {
  anim: 'specialF', startup: 10, active: 6, recovery: 18,
  damage: 100, level: 'mid', hitstun: 20, blockstun: 16, knockback: { x: 7, y: 0 },
  hitboxes: [{ x: 20, y: 60, w: 80, h: 70 }],
  velocity: [{ from: 6, to: 16, vx: 9 }],
  strength: 'special', meterGain: 10,
  cancels: { into: ['ultimate'], until: 22 },
  fx: [{ frame: 6, tag: 'dash' }],
};

/** Rising, invulnerable anti-air that launches. */
const specialD: MoveDef = {
  anim: 'specialD', startup: 5, active: 6, recovery: 28,
  damage: 100, level: 'mid', hitstun: 24, blockstun: 18, knockback: { x: 3, y: 12 },
  hitboxes: [{ x: 0, y: 40, w: 80, h: 160 }],
  velocity: [{ from: 5, to: 5, vx: 2, vy: 10 }],
  invulnerable: { from: 1, to: 9 },
  strength: 'special', meterGain: 10, launches: true,
};

/** Five-hit rush. Frames 2..46 play during the super freeze. */
const ultimateBox = { x: 10, y: 30, w: 110, h: 140 };
const ultimate: MoveDef = {
  anim: 'ultimate', startup: 50, active: 19, recovery: 30,
  damage: 72, level: 'mid', hitstun: 22, blockstun: 16, knockback: { x: 2.5, y: 0 },
  hitboxes: [
    { ...ultimateBox, from: 51, to: 52, group: 0 },
    { ...ultimateBox, from: 55, to: 56, group: 1 },
    { ...ultimateBox, from: 59, to: 60, group: 2 },
    { ...ultimateBox, from: 63, to: 64, group: 3 },
    { ...ultimateBox, from: 67, to: 69, group: 4 },
  ],
  velocity: [{ from: 47, to: 68, vx: 6 }],
  invulnerable: { from: 1, to: 54 },
  strength: 'ultimate', meterGain: 0,
  fx: [{ frame: 2, tag: 'ultimateCharge' }, { frame: 51, tag: 'ultimateRush' }],
};

export const testFighter: FighterDef = {
  id: 'test',
  name: 'Test Fighter',
  element: 'wind',
  stats: {
    health: 1000,
    walkSpeed: 4,
    backSpeed: 3,
    jumpVelocity: 15,
    jumpForwardSpeed: 4.5,
    gravity: 0.8,
    width: 70,
    height: 180,
    crouchHeight: 110,
  },
  moves: { light, heavy, crouchLight, crouchHeavy, airLight, airHeavy, specialN, specialF, specialD, ultimate },
};
