// Vira: Kalaripayattu, vel-shaped spear, fire (patron Kartikeya; see docs/LORE.md).
// Mid-range: slower walk, longest reach, slower but harder hits, weak up close.
//
// Frame data (advantage = hitstun or blockstun minus active + recovery, hit on the
// first active frame):
// - light 6/3/10 +2 on hit / -2 on block; crouchLight 6/3/10 +1 / -3; heavy 11/4/18
//   +1 / -6. No normal links into itself.
// - crouchHeavy (low) and specialD (invulnerable anti-air) launch; launched or air-hit
//   defenders land in an invulnerable knockdown, so juggles end after the cancel chain.
// - Spiral Orb hits twice (8 frames apart) and is slow, so it covers space for a long
//   time; it spawns at the spear tip, so it passes over an opponent standing very close.
// - The ultimate's six columns stand 80 px apart and each hit carries the defender
//   ~67 px, so a defender starting ~125-180 px away is carried through all six; a
//   closer one falls behind the columns after the first one or two.
import { BASE_POSES } from '../../render/anims/base';
import type { VisualSpec } from '../../render/moveVisuals';
import { anim, key, type PoseSpec } from '../../render/pose';
import type { AnimationSet, FighterLook, Keyframe } from '../../render/types';
import type { FighterDef, Hitbox, MoveDef, MoveFx } from '../../sim/types';
import type { FighterEntry } from '../types';

export const VIRA_LOOK: FighterLook = {
  accent: '#FF8A2A',
  secondary: '#FFD23D',
  height: 1,
  bulk: 0.94,
  headStyle: 'braid',
  ribbon: 'sash',
  weapon: { type: 'spear', length: 168, color: '#FFD23D' },
};

// ---- Moves ------------------------------------------------------------------------------

const GROUND_CHAIN = ['heavy', 'crouchHeavy', 'specialN', 'specialF', 'specialD'] as const;
/** Lights also chain into one more light (the sim allows a single light-to-light link). */
const LIGHT_CHAIN = ['light', 'crouchLight', ...GROUND_CHAIN] as const;
const SPECIALS = ['specialN', 'specialF', 'specialD'] as const;

/** Long spear jab. */
const light: MoveDef = {
  anim: 'vira.light', startup: 6, active: 3, recovery: 10,
  damage: 42, level: 'mid', hitstun: 15, blockstun: 11, knockback: { x: 4.5, y: 0 },
  hitboxes: [{ x: 56, y: 98, w: 124, h: 38 }],
  strength: 'light', meterGain: 4,
  cancels: { into: LIGHT_CHAIN, until: 19 },
};

/** Wide spear sweep. */
const heavy: MoveDef = {
  anim: 'vira.heavy', startup: 11, active: 4, recovery: 18,
  damage: 95, level: 'mid', hitstun: 23, blockstun: 16, knockback: { x: 7, y: 0 },
  hitboxes: [{ x: 40, y: 60, w: 132, h: 110 }],
  strength: 'heavy', meterGain: 9,
  cancels: { into: [...SPECIALS, 'ultimate'], until: 33 },
};

/** Low spear poke. */
const crouchLight: MoveDef = {
  anim: 'vira.crouchLight', startup: 6, active: 3, recovery: 10,
  damage: 36, level: 'low', hitstun: 14, blockstun: 10, knockback: { x: 3.5, y: 0 },
  hitboxes: [{ x: 56, y: 30, w: 120, h: 42 }],
  strength: 'light', meterGain: 4,
  cancels: { into: LIGHT_CHAIN, until: 19 },
};

/** Shaft sweep at the legs; launches. */
const crouchHeavy: MoveDef = {
  anim: 'vira.crouchHeavy', startup: 10, active: 3, recovery: 24,
  damage: 85, level: 'low', hitstun: 22, blockstun: 14, knockback: { x: 2, y: 10 },
  hitboxes: [{ x: 20, y: 0, w: 144, h: 44 }],
  strength: 'heavy', meterGain: 8, launches: true,
  cancels: { into: [...SPECIALS, 'ultimate'], until: 37 },
};

/** Air thrust, angled down. */
const airLight: MoveDef = {
  anim: 'vira.airLight', startup: 6, active: 4, recovery: 8,
  damage: 42, level: 'overhead', hitstun: 14, blockstun: 10, knockback: { x: 3.5, y: 0 },
  hitboxes: [{ x: 48, y: 44, w: 118, h: 62 }],
  strength: 'light', meterGain: 4,
  cancels: { into: ['airHeavy'], until: 15 },
};

/** Downward plunge. */
const airHeavy: MoveDef = {
  anim: 'vira.airHeavy', startup: 9, active: 5, recovery: 10,
  damage: 80, level: 'overhead', hitstun: 20, blockstun: 14, knockback: { x: 5, y: 2 },
  hitboxes: [{ x: 14, y: -34, w: 92, h: 120 }],
  strength: 'heavy', meterGain: 7,
};

/** Spiral Orb: slow, large, two hits, released from the spear tip on frame 19. */
const specialN: MoveDef = {
  anim: 'vira.specialN', startup: 18, active: 1, recovery: 26,
  damage: 52, level: 'mid', hitstun: 16, blockstun: 12, knockback: { x: 1.5, y: 0 },
  hitboxes: [],
  strength: 'special', meterGain: 8,
  projectile: {
    frame: 19, x: 150, y: 122, vx: 5, vy: 0, w: 62, h: 62,
    damage: 52, hits: 2, lifetime: 200, hitstun: 16, blockstun: 12, knockback: { x: 1.5, y: 0 }, level: 'mid',
  },
  fx: [{ frame: 19, tag: 'orbFlash' }],
};

/** Spear lunge: long thrust with self velocity and big knockback. */
const specialF: MoveDef = {
  anim: 'vira.specialF', startup: 13, active: 5, recovery: 24,
  damage: 110, level: 'mid', hitstun: 22, blockstun: 16, knockback: { x: 11, y: 0 },
  hitboxes: [{ x: 66, y: 98, w: 130, h: 40 }],
  velocity: [{ from: 9, to: 17, vx: 9 }],
  strength: 'special', meterGain: 10,
  cancels: { into: ['ultimate'], until: 24 },
  fx: [{ frame: 9, tag: 'lungeStreak' }],
};

/**
 * Leaping flame arc: invulnerable on frames 1-8, leaps on frame 4 and sweeps the spear
 * up over her head; lands around frame 36 and recovers until 56.
 */
const specialD: MoveDef = {
  anim: 'vira.specialD', startup: 4, active: 8, recovery: 44,
  damage: 105, level: 'mid', hitstun: 24, blockstun: 18, knockback: { x: 3, y: 13 },
  hitboxes: [
    { x: 20, y: 80, w: 100, h: 170, from: 5, to: 7 },
    { x: -10, y: 110, w: 60, h: 180, from: 8, to: 12 },
  ],
  velocity: [{ from: 4, to: 4, vx: 2.5, vy: 13 }],
  invulnerable: { from: 1, to: 8 },
  strength: 'special', meterGain: 10, launches: true,
  fx: [{ frame: 4, tag: 'flameRise' }],
};

/**
 * Vel of the Six Fires: the spear is planted on frame 50; six columns of light strike
 * 80 px apart, 10 frames apart (groups 0..5); the last launches.
 */
const COLUMN_COUNT = 6;
const COLUMN_FIRST = 120;
const COLUMN_STEP = 80;
const COLUMN_WIDTH = 56;
const COLUMN_START = 55;
const COLUMN_EVERY = 10;
const columnBoxes: Hitbox[] = Array.from({ length: COLUMN_COUNT }, (_, k) => ({
  x: COLUMN_FIRST + COLUMN_STEP * k - COLUMN_WIDTH / 2,
  y: 0,
  w: COLUMN_WIDTH,
  h: 300,
  from: COLUMN_START + COLUMN_EVERY * k,
  to: COLUMN_START + COLUMN_EVERY * k + 2,
  group: k,
  ...(k === COLUMN_COUNT - 1 ? { launches: true, knockback: { x: 3, y: 14 } } : {}),
}));
const columnFx: MoveFx[] = Array.from({ length: COLUMN_COUNT }, (_, k) => ({
  frame: COLUMN_START + COLUMN_EVERY * k - 1,
  tag: `fire${k + 1}`,
}));
const ultimate: MoveDef = {
  anim: 'vira.ultimate', startup: 54, active: 53, recovery: 24,
  damage: 64, level: 'mid', hitstun: 18, blockstun: 12, knockback: { x: 9, y: 0 },
  hitboxes: columnBoxes,
  invulnerable: { from: 1, to: 54 },
  strength: 'ultimate', meterGain: 0,
  fx: [{ frame: 2, tag: 'sixCharge' }, { frame: 50, tag: 'plant' }, ...columnFx],
};

/** Grab (light + heavy): spear hooked behind the neck, a kalari sweep-and-throw. Unblockable, 78 px reach. */
const throwMove: MoveDef = {
  anim: 'vira.throw', startup: 6, active: 2, recovery: 22,
  damage: 110, level: 'mid', hitstun: 22, blockstun: 0, knockback: { x: 6, y: 10 },
  hitboxes: [{ x: 0, y: 30, w: 78, h: 130 }],
  strength: 'heavy', meterGain: 8, launches: true, throw: true,
  fx: [{ frame: 7, tag: 'grabFlash' }],
};

/**
 * Power strike (hold heavy, release): the heavy's full sweep after a long armoured wind-up,
 * unblockable, launches. 26 recovery frames on a whiff.
 */
const power: MoveDef = {
  anim: 'vira.power', startup: 20, active: 4, recovery: 26,
  damage: 160, level: 'mid', hitstun: 28, blockstun: 0, knockback: { x: 8, y: 12 },
  hitboxes: [{ x: 40, y: 60, w: 132, h: 110 }],
  strength: 'heavy', meterGain: 12, launches: true, unblockable: true,
  armor: { from: 1, to: 20 },
  fx: [{ frame: 2, tag: 'powerCharge' }, { frame: 21, tag: 'powerStrike' }],
};

export const VIRA_DEF: FighterDef = {
  id: 'vira',
  name: 'Vira',
  element: 'fire',
  stats: {
    health: 1000,
    walkSpeed: 3.4,
    backSpeed: 2.8,
    jumpVelocity: 14.5,
    jumpForwardSpeed: 4.2,
    gravity: 0.8,
    width: 70,
    height: 182,
    crouchHeight: 112,
  },
  moves: {
    light, heavy, crouchLight, crouchHeavy, airLight, airHeavy, specialN, specialF, specialD, ultimate,
    throw: throwMove, power,
  },
};

// ---- Visuals ----------------------------------------------------------------------------

const columnVisuals: Record<string, VisualSpec> = Object.fromEntries(
  Array.from({ length: COLUMN_COUNT }, (_, k) => [
    `fire${k + 1}`,
    { kind: 'column', x: COLUMN_FIRST + COLUMN_STEP * k, width: 70, height: 420 } satisfies VisualSpec,
  ]),
);

export const VIRA_VISUALS: Readonly<Record<string, VisualSpec>> = {
  orbFlash: { kind: 'burst', x: 160, y: 122, radius: 40 },
  grabFlash: { kind: 'burst', x: 56, y: 112, radius: 32, rays: 6, life: 10 },
  powerCharge: { kind: 'burst', x: 0, y: 110, radius: 76, rays: 8, life: 18, color: VIRA_LOOK.secondary },
  powerStrike: { kind: 'streak', x: -10, y: 115, length: 230, spread: 130, lines: 5 },
  lungeStreak: { kind: 'streak', x: -40, y: 112, length: 170, spread: 60, lines: 4 },
  flameRise: { kind: 'burst', x: 20, y: 10, radius: 50, color: VIRA_LOOK.secondary },
  sixCharge: { kind: 'burst', x: 0, y: 120, radius: 90, rays: 6, life: 20 },
  plant: { kind: 'burst', x: 56, y: 0, radius: 70, rays: 6, color: VIRA_LOOK.secondary },
  ...columnVisuals,
};

// ---- Animations -------------------------------------------------------------------------
// Keys are in move frames: the strike key sits on the first active frame. Two-handed
// spear poses put the back hand 36 px behind the front hand along the shaft.

const { CROUCH, TUCK } = BASE_POSES;

/** Deep kalari stance, spear levelled forward at chest height. */
const GUARD: PoseSpec = {
  y: 72,
  lean: -10,
  footF: [40, 0],
  footB: [-40, 0],
  handF: [36, 104],
  handB: [0, 102],
  weaponDir: 4,
};

// Idle: a slow breath with the spear tip circling (both hands drift together along the shaft).
const idle = anim(
  true,
  key(0, GUARD),
  key(16, { ...GUARD, x: 1, y: 71.5, lean: -10.5, handF: [37, 103], handB: [1, 100.5], weaponDir: 6 }),
  key(32, { ...GUARD, x: 2, y: 70.5, lean: -11, handF: [38, 102], handB: [2, 99], weaponDir: 8 }),
  key(48, { ...GUARD, x: 1, y: 71.5, lean: -10.5, handF: [35, 105.5], handB: [-1, 103.5], weaponDir: 1 }),
  key(64, GUARD),
);

/**
 * Shuffle step: each planted foot slides back 36 px over 22 frames (~1.65 px per
 * animation frame = WALK_STRIDE_SPEED), so playback scaled by walk speed does not slide.
 * `swing` (-1..1) pumps the spear forward with the step and rocks the lean a little.
 */
function walkKeys(lean: number): Keyframe[] {
  const step = (t: number, footF: [number, number], footB: [number, number], y: number, swing: number): Keyframe =>
    key(
      t,
      {
        ...GUARD,
        lean: lean + swing * 2,
        y,
        footF,
        footB,
        handF: [36 + swing * 6, 104 + Math.abs(swing) * 2],
        handB: [0 + swing * 6, 102 - swing * 1.5],
        weaponDir: 4 + swing * 4,
      },
      'linear',
    );
  return [
    step(0, [14, 0], [-22, 0], 74, 0),
    step(11, [32, 9], [-40, 0], 76, 1),
    step(22, [50.3, 0], [-58.3, 0], 70, 0),
    step(33, [32, 0], [-40, 9], 76, -1),
    step(44, [14, 0], [-22, 0], 74, 0),
  ];
}

function reversed(keys: Keyframe[]): Keyframe[] {
  const end = keys[keys.length - 1]?.t ?? 0;
  return keys
    .slice()
    .reverse()
    .map((k) => ({ t: end - k.t, pose: k.pose, ease: k.ease }));
}

const walk = anim(true, ...walkKeys(-12));
const walkBack = anim(true, ...reversed(walkKeys(-6)));

// light 6/3/10: jab, strike at 7.
const L_STRIKE: PoseSpec = {
  y: 70,
  lean: -18,
  footF: [52, 0],
  footB: [-38, 0],
  handF: [70, 116],
  handB: [34, 114],
  weaponDir: 2,
};
const lightAnim = anim(
  false,
  key(0, GUARD, 'out'),
  key(3, { y: 74, lean: -4, footF: [40, 0], footB: [-40, 0], handF: [14, 106], handB: [-22, 104], weaponDir: 4 }, 'in'),
  key(7, L_STRIKE, 'out'),
  key(9, { ...L_STRIKE, handF: [72, 116], handB: [36, 114] }),
  key(12, { ...GUARD, handF: [40, 108], handB: [4, 106] }),
  key(19, GUARD),
);

// heavy 11/4/18: wide sweep from high back to low front, strike at 12.
const H_STRIKE: PoseSpec = {
  y: 70,
  lean: -22,
  footF: [56, 0],
  footB: [-40, 0],
  handF: [64, 124],
  handB: [28, 126],
  weaponDir: -4,
};
const heavyAnim = anim(
  false,
  key(0, GUARD),
  key(7, { y: 80, lean: 8, footF: [36, 0], footB: [-40, 0], handF: [16, 168], handB: [-34, 138], weaponDir: 130 }, 'in'),
  key(9, { y: 78, lean: -4, footF: [44, 0], footB: [-40, 0], handF: [36, 160], handB: [-20, 140], weaponDir: 70 }, 'linear'),
  key(12, H_STRIKE, 'linear'),
  key(14, { ...H_STRIKE, handF: [62, 112], handB: [28, 118], weaponDir: -20 }, 'out'),
  key(16, { ...H_STRIKE, handF: [56, 100], handB: [24, 112], weaponDir: -34 }),
  key(22, { ...H_STRIKE, lean: -20, handF: [50, 94], handB: [18, 106], weaponDir: -40 }),
  key(33, GUARD),
);

// crouchLight 6/3/10: low poke, strike at 7.
const CL_STRIKE: PoseSpec = {
  y: 48,
  lean: -20,
  footF: [48, 0],
  footB: [-34, 0],
  handF: [66, 60],
  handB: [30, 62],
  weaponDir: -4,
};
const crouchLightAnim = anim(
  false,
  key(0, CROUCH, 'out'),
  key(3, { y: 52, lean: -10, footF: [34, 0], footB: [-34, 0], handF: [20, 70], handB: [-16, 70], weaponDir: 2 }, 'in'),
  key(7, CL_STRIKE, 'out'),
  key(9, { ...CL_STRIKE, handF: [68, 59], handB: [32, 61] }),
  key(12, { y: 52, lean: -12, footF: [40, 0], footB: [-34, 0], handF: [34, 70], handB: [-2, 70], weaponDir: 2 }),
  key(19, CROUCH),
);

// crouchHeavy 10/3/24: spear raised upright, swept down along the legs, strike at 11.
const CH_STRIKE: PoseSpec = {
  y: 44,
  lean: -26,
  footF: [58, 0],
  footB: [-38, 0],
  handF: [52, 38],
  handB: [16, 43],
  weaponDir: -8,
};
const crouchHeavyAnim = anim(
  false,
  key(0, CROUCH),
  key(6, { y: 58, lean: 2, footF: [32, 0], footB: [-36, 0], handF: [16, 110], handB: [22, 74], weaponDir: 100 }, 'in'),
  key(9, { y: 50, lean: -16, footF: [46, 0], footB: [-36, 0], handF: [42, 72], handB: [14, 50], weaponDir: 40 }, 'linear'),
  key(11, CH_STRIKE, 'out'),
  key(13, { ...CH_STRIKE, handF: [54, 37], handB: [18, 41], weaponDir: -6 }),
  key(18, { y: 52, lean: -18, footF: [58, 0], footB: [-38, 0], handF: [44, 100], handB: [26, 69], weaponDir: 60 }),
  key(28, { ...CROUCH, lean: -12 }),
  key(37, CROUCH),
);

// airLight 6/4/8: thrust angled down, strike at 7.
const AL_STRIKE: PoseSpec = { ...TUCK, lean: -20, handF: [60, 108], handB: [27, 122], weaponDir: -22 };
const airLightAnim = anim(
  false,
  key(0, TUCK, 'out'),
  key(3, { ...TUCK, lean: -4, handF: [14, 124], handB: [-22, 128], weaponDir: -8 }, 'in'),
  key(7, AL_STRIKE, 'out'),
  key(9, { ...AL_STRIKE, handF: [62, 106], handB: [29, 120] }),
  key(12, { ...TUCK, handF: [40, 116], handB: [5, 124], weaponDir: -12 }),
  key(18, TUCK),
);

// airHeavy 9/5/10: spear raised upright, then driven down-forward, strike at 10.
const AH_STRIKE: PoseSpec = {
  ...TUCK,
  lean: -24,
  upperLegF: -20,
  lowerLegF: -100,
  handF: [44, 92],
  handB: [29, 125],
  weaponDir: -65,
};
const airHeavyAnim = anim(
  false,
  key(0, TUCK),
  key(5, { ...TUCK, lean: 6, handF: [20, 170], handB: [16, 134], weaponDir: 84 }, 'in'),
  key(8, { ...TUCK, lean: -10, handF: [44, 150], handB: [10, 138], weaponDir: 20 }, 'linear'),
  key(10, AH_STRIKE, 'out'),
  key(12, { ...AH_STRIKE, handF: [42, 86], handB: [28, 119], weaponDir: -68 }),
  key(15, { ...AH_STRIKE, handF: [42, 86], handB: [28, 119], weaponDir: -68 }),
  key(24, TUCK),
);

// specialN 18/1/26: one-handed twirl, then a thrust that releases the orb at 19.
const TWIRL: PoseSpec = { y: 76, lean: -6, footF: [40, 0], footB: [-40, 0], handF: [30, 128], handB: [-44, 120] };
const SN_THRUST: PoseSpec = {
  y: 70,
  lean: -20,
  footF: [52, 0],
  footB: [-40, 0],
  handF: [68, 122],
  handB: [32, 122],
  weaponDir: 0,
};
const specialNAnim = anim(
  false,
  key(0, GUARD),
  key(3, { ...TWIRL, weaponDir: 60 }, 'linear'),
  key(6, { ...TWIRL, weaponDir: 150 }, 'linear'),
  key(9, { ...TWIRL, weaponDir: 240 }, 'linear'),
  key(12, { ...TWIRL, weaponDir: 330 }, 'linear'),
  key(15, { ...TWIRL, weaponDir: 60 }, 'in'),
  key(19, SN_THRUST, 'out'),
  key(22, { ...SN_THRUST, handF: [64, 120], handB: [28, 120] }),
  key(32, { ...GUARD, lean: -12 }),
  key(45, GUARD),
);

// specialF 13/5/24: coil back, long lunging thrust (moves on 9-17), strike at 14.
const SF_THRUST: PoseSpec = {
  y: 62,
  lean: -30,
  footF: [66, 0],
  footB: [-52, 0],
  handF: [86, 116],
  handB: [50, 114],
  weaponDir: 2,
};
const specialFAnim = anim(
  false,
  key(0, GUARD),
  key(8, { y: 74, lean: 10, footF: [34, 0], footB: [-44, 0], handF: [-12, 108], handB: [-48, 106], weaponDir: 3 }, 'in'),
  key(14, SF_THRUST, 'out'),
  key(18, { ...SF_THRUST, handF: [88, 116], handB: [52, 114] }),
  key(26, { ...SF_THRUST, lean: -24, y: 66, handF: [66, 112], handB: [30, 112] }),
  key(42, GUARD),
);

// specialD 4/8/44: crouch, leap with the spear sweeping up over the head (strike 5-12),
// tuck at the apex, land around frame 36 and recover from a deep crouch.
const SD_AIR = { upperLegF: -60, lowerLegF: -100, upperLegB: -110, lowerLegB: -125 } as const;
const SD_LAND: PoseSpec = {
  y: 50,
  lean: -16,
  footF: [40, 0],
  footB: [-38, 0],
  handF: [40, 72],
  handB: [5, 80],
  weaponDir: -14,
};
const specialDAnim = anim(
  false,
  key(0, GUARD),
  key(3, { y: 56, lean: -18, footF: [36, 0], footB: [-36, 0], handF: [40, 70], handB: [6, 82], weaponDir: -20 }, 'in'),
  key(5, { y: 100, lean: -2, ...SD_AIR, handF: [50, 150], handB: [31, 119], weaponDir: 58 }, 'linear'),
  key(9, { y: 104, lean: 6, ...SD_AIR, handF: [34, 170], handB: [30, 134], weaponDir: 84 }, 'out'),
  key(12, { y: 104, lean: 10, ...SD_AIR, handF: [22, 176], handB: [28, 140], weaponDir: 100 }),
  key(22, { ...TUCK, handF: [40, 130], handB: [8, 113], weaponDir: 28 }),
  key(33, { y: 96, lean: -6, ...SD_AIR, handF: [40, 110], handB: [5, 117], weaponDir: -10 }, 'in'),
  key(36, SD_LAND, 'out'),
  key(48, { ...SD_LAND, y: 54, lean: -14 }),
  key(56, GUARD),
);

// ultimate 54/53/24: spear raised through the freeze, planted on 50; the planted pose
// pulses with each column (55, 65, ..., 105), then she pulls the spear free.
const U_PLANT: PoseSpec = {
  y: 58,
  lean: -14,
  footF: [40, 0],
  footB: [-30, 0],
  handF: [56, 100],
  handB: [56, 136],
  weaponDir: -90,
};
const U_PRESS: PoseSpec = { ...U_PLANT, y: 55, lean: -17, handF: [56, 98], handB: [56, 134] };
const ultimateAnim = anim(
  false,
  key(0, GUARD),
  key(10, { y: 92, lean: 2, footF: [20, 0], footB: [-22, 0], handF: [16, 160], handB: [15, 124], weaponDir: 88 }, 'out'),
  key(30, { y: 94, lean: 2, footF: [20, 0], footB: [-22, 0], handF: [16, 166], handB: [15, 130], weaponDir: 88 }),
  key(44, { y: 96, lean: 4, footF: [22, 0], footB: [-24, 0], handF: [18, 196], handB: [17, 160], weaponDir: 92 }, 'in'),
  key(50, U_PLANT, 'out'),
  ...Array.from({ length: COLUMN_COUNT }, (_, k) => [
    key(COLUMN_START + COLUMN_EVERY * k, U_PRESS, 'out'),
    key(COLUMN_START + COLUMN_EVERY * k + 5, U_PLANT),
  ]).flat(),
  key(112, U_PLANT),
  key(120, { y: 74, lean: -6, footF: [40, 0], footB: [-36, 0], handF: [40, 120], handB: [35, 84], weaponDir: 80 }),
  key(131, GUARD),
);

// throw 6/2/22: spear hooked high and forward (grab at 7), then swept back over the
// shoulder as the hips turn, throwing the opponent.
const VT_REACH: PoseSpec = {
  y: 70,
  lean: -22,
  footF: [54, 0],
  footB: [-36, 0],
  handF: [66, 124],
  handB: [34, 110],
  weaponDir: 70,
};
const VT_TOSS: PoseSpec = {
  y: 76,
  lean: 12,
  footF: [34, 0],
  footB: [-48, 0],
  handF: [16, 178],
  handB: [-22, 158],
  weaponDir: 125,
  elbowF: 1,
  elbowB: 1,
};
const throwAnim = anim(
  false,
  key(0, GUARD, 'out'),
  key(4, { ...VT_REACH, lean: -12, handF: [48, 126], handB: [16, 112] }, 'in'),
  key(7, VT_REACH, 'out'),
  key(10, { ...VT_REACH, lean: -6, handF: [48, 160], handB: [14, 140] }, 'in'),
  key(14, VT_TOSS),
  key(20, { ...VT_TOSS, lean: 4, handF: [-6, 150], handB: [-36, 134] }),
  key(30, GUARD),
);

// power 20/4/26: spear drawn high behind through the armoured wind-up, then the heavy's
// sweep from high back to low front (strike at 21) with a longer follow-through.
const VP_WINDUP: PoseSpec = {
  y: 80, lean: 8, footF: [36, 0], footB: [-40, 0], handF: [16, 168], handB: [-34, 138], weaponDir: 130,
};
const powerAnim = anim(
  false,
  key(0, GUARD),
  key(7, VP_WINDUP, 'out'),
  key(15, { ...VP_WINDUP, y: 82, lean: 12, handF: [10, 172], handB: [-40, 140], weaponDir: 138 }),
  key(18, { y: 78, lean: -4, footF: [44, 0], footB: [-40, 0], handF: [36, 160], handB: [-20, 140], weaponDir: 70 }, 'linear'),
  key(21, H_STRIKE, 'linear'),
  key(23, { ...H_STRIKE, handF: [62, 112], handB: [28, 118], weaponDir: -20 }, 'out'),
  key(26, { ...H_STRIKE, handF: [56, 100], handB: [24, 112], weaponDir: -34 }),
  key(34, { ...H_STRIKE, lean: -20, handF: [50, 94], handB: [18, 106], weaponDir: -40 }),
  key(50, GUARD),
);

export const VIRA_ANIMS: AnimationSet = {
  'vira.power': powerAnim,
  'vira.throw': throwAnim,
  idle,
  walk,
  walkBack,
  'vira.light': lightAnim,
  'vira.heavy': heavyAnim,
  'vira.crouchLight': crouchLightAnim,
  'vira.crouchHeavy': crouchHeavyAnim,
  'vira.airLight': airLightAnim,
  'vira.airHeavy': airHeavyAnim,
  'vira.specialN': specialNAnim,
  'vira.specialF': specialFAnim,
  'vira.specialD': specialDAnim,
  'vira.ultimate': ultimateAnim,
};

export const VIRA: FighterEntry = { def: VIRA_DEF, look: VIRA_LOOK, anims: VIRA_ANIMS, visuals: VIRA_VISUALS };
