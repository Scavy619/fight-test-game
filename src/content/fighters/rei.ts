// Rei Kurogane: kenjutsu and ninjutsu, katana, wind (patron Susanoo; see docs/LORE.md).
// Rushdown: fast walk, fast short-range normals, lowest health, weakest single hits.
//
// Frame data (advantage = hitstun or blockstun minus active + recovery, hit on the
// first active frame):
// - light 4/2/8 +3 on hit / 0 on block; crouchLight 4/2/9 +2 / -1; heavy 9/3/15 +3 / -3.
//   No normal links into itself (startup > advantage).
// - crouchHeavy launches (low, -11 on block). Launched or air-hit defenders land in an
//   invulnerable knockdown, so juggles end after the cancel chain.
// - Specials do not cancel into the ultimate: with the 8-hit ultimate, light -> heavy ->
//   ultimate (10 hits) is the longest ground chain.
// - Shadow step has no hitbox; it ends ~320 px ahead with 19 recovery frames facing
//   away, so a ready opponent can punish it.
import type { VisualSpec } from '../../render/moveVisuals';
import { BASE_POSES } from '../../render/anims/base';
import { anim, key, type PoseSpec } from '../../render/pose';
import type { AnimationSet, FighterLook, Keyframe } from '../../render/types';
import type { FighterDef, Hitbox, MoveDef } from '../../sim/types';
import type { FighterEntry } from '../types';

export const REI_LOOK: FighterLook = {
  accent: '#2FF3E0',
  secondary: '#B48CFF',
  height: 1,
  bulk: 0.86,
  headStyle: 'topknot',
  ribbon: 'scarf',
  weapon: { type: 'katana', length: 96, color: '#CFFBFF' },
};

const SHADOW = '#B48CFF';

// ---- Moves ------------------------------------------------------------------------------

const GROUND_CHAIN = ['heavy', 'crouchHeavy', 'specialN', 'specialF', 'specialD'] as const;
const SPECIALS = ['specialN', 'specialF', 'specialD'] as const;

const light: MoveDef = {
  anim: 'rei.light', startup: 4, active: 2, recovery: 8,
  damage: 32, level: 'mid', hitstun: 13, blockstun: 10, knockback: { x: 3.5, y: 0 },
  hitboxes: [{ x: 24, y: 96, w: 118, h: 54 }],
  strength: 'light', meterGain: 4,
  cancels: { into: GROUND_CHAIN, until: 12 },
};

/** Stepping diagonal cut. */
const heavy: MoveDef = {
  anim: 'rei.heavy', startup: 9, active: 3, recovery: 15,
  damage: 75, level: 'mid', hitstun: 21, blockstun: 15, knockback: { x: 5.5, y: 0 },
  hitboxes: [{ x: 30, y: 24, w: 112, h: 146 }],
  velocity: [{ from: 4, to: 9, vx: 3.5 }],
  strength: 'heavy', meterGain: 8,
  cancels: { into: [...SPECIALS, 'ultimate'], until: 20 },
};

const crouchLight: MoveDef = {
  anim: 'rei.crouchLight', startup: 4, active: 2, recovery: 9,
  damage: 28, level: 'low', hitstun: 13, blockstun: 10, knockback: { x: 3, y: 0 },
  hitboxes: [{ x: 36, y: 20, w: 110, h: 50 }],
  strength: 'light', meterGain: 4,
  cancels: { into: GROUND_CHAIN, until: 12 },
};

/** Low sweeping slash that launches. */
const crouchHeavy: MoveDef = {
  anim: 'rei.crouchHeavy', startup: 8, active: 3, recovery: 21,
  damage: 70, level: 'low', hitstun: 22, blockstun: 13, knockback: { x: 2.5, y: 10.5 },
  hitboxes: [{ x: 28, y: 0, w: 124, h: 62 }],
  strength: 'heavy', meterGain: 8, launches: true,
  cancels: { into: [...SPECIALS, 'ultimate'], until: 15 },
};

const airLight: MoveDef = {
  anim: 'rei.airLight', startup: 4, active: 4, recovery: 7,
  damage: 35, level: 'overhead', hitstun: 14, blockstun: 10, knockback: { x: 3, y: 0 },
  hitboxes: [{ x: 20, y: 48, w: 118, h: 80 }],
  strength: 'light', meterGain: 4,
  cancels: { into: ['airHeavy'], until: 13 },
};

/** Downward cut. */
const airHeavy: MoveDef = {
  anim: 'rei.airHeavy', startup: 7, active: 4, recovery: 9,
  damage: 65, level: 'overhead', hitstun: 19, blockstun: 13, knockback: { x: 4.5, y: 2 },
  hitboxes: [{ x: 8, y: -18, w: 82, h: 116 }],
  strength: 'heavy', meterGain: 7,
};

/** Shuriken: fast small projectile thrown with the back hand on frame 12. */
const specialN: MoveDef = {
  anim: 'rei.specialN', startup: 11, active: 1, recovery: 20,
  damage: 55, level: 'mid', hitstun: 16, blockstun: 12, knockback: { x: 4, y: 0 },
  hitboxes: [],
  strength: 'special', meterGain: 6,
  projectile: {
    frame: 12, x: 56, y: 128, vx: 14, vy: 0, w: 30, h: 18,
    damage: 55, lifetime: 100, hitstun: 16, blockstun: 12, knockback: { x: 4, y: 0 }, level: 'mid',
  },
  fx: [{ frame: 12, tag: 'shurikenFlash' }],
};

/** Wind-slash dash: 240 px lunge with a rising slash; -14 or worse on block. */
const specialF: MoveDef = {
  anim: 'rei.specialF', startup: 10, active: 7, recovery: 22,
  damage: 95, level: 'mid', hitstun: 22, blockstun: 14, knockback: { x: 6, y: 0 },
  hitboxes: [{ x: 20, y: 70, w: 128, h: 112 }],
  velocity: [{ from: 5, to: 14, vx: 24 }],
  strength: 'special', meterGain: 10,
  fx: [{ frame: 5, tag: 'dashStreak' }],
};

/**
 * Shadow step: vanishes, travels 4 x 80 px through the opponent while invulnerable,
 * reappears and recovers facing away. No hitbox.
 */
const specialD: MoveDef = {
  anim: 'rei.specialD', startup: 12, active: 1, recovery: 19,
  damage: 0, level: 'mid', hitstun: 0, blockstun: 0, knockback: { x: 0, y: 0 },
  hitboxes: [],
  velocity: [{ from: 7, to: 10, vx: 80 }],
  invulnerable: { from: 3, to: 14 },
  passThrough: { from: 5, to: 14 },
  element: 'shadow',
  strength: 'special', meterGain: 0,
  fx: [
    { frame: 7, tag: 'vanish' },
    { frame: 7, tag: 'vanishTrail' },
    { frame: 11, tag: 'appear' },
  ],
};

/**
 * Eightfold Storm: rush, then eight slashes (groups 0..7, one box each over the
 * blade's sweep); the last is a rising cut that launches.
 */
const STORM_BOX = { x: 10, y: 40, w: 140, h: 160 };
const STORM_FRAMES: readonly [number, number][] = [
  [51, 56], [60, 61], [64, 65], [68, 69], [72, 73], [76, 77], [80, 81],
];
const stormBoxes: Hitbox[] = [
  ...STORM_FRAMES.map(([from, to], group) => ({ ...STORM_BOX, from, to, group })),
  { x: 10, y: 60, w: 115, h: 200, from: 84, to: 86, group: 7, launches: true, knockback: { x: 4, y: 13 } },
];
const ultimate: MoveDef = {
  anim: 'rei.ultimate', startup: 50, active: 36, recovery: 28,
  damage: 53, level: 'mid', hitstun: 20, blockstun: 12, knockback: { x: 1.5, y: 0 },
  hitboxes: stormBoxes,
  velocity: [{ from: 47, to: 54, vx: 15 }, { from: 55, to: 84, vx: 2.5 }],
  invulnerable: { from: 1, to: 56 },
  strength: 'ultimate', meterGain: 0,
  fx: [
    { frame: 2, tag: 'stormCharge' },
    { frame: 47, tag: 'stormRush' },
    { frame: 84, tag: 'stormFinish' },
  ],
};

export const REI_DEF: FighterDef = {
  id: 'rei',
  name: 'Rei Kurogane',
  element: 'wind',
  stats: {
    health: 900,
    walkSpeed: 4.8,
    backSpeed: 3.8,
    jumpVelocity: 15.5,
    jumpForwardSpeed: 5.2,
    gravity: 0.85,
    width: 64,
    height: 176,
    crouchHeight: 106,
  },
  moves: { light, heavy, crouchLight, crouchHeavy, airLight, airHeavy, specialN, specialF, specialD, ultimate },
};

// ---- Visuals ----------------------------------------------------------------------------

export const REI_VISUALS: Readonly<Record<string, VisualSpec>> = {
  shurikenFlash: { kind: 'burst', x: 56, y: 128, radius: 16, rays: 4, life: 8 },
  dashStreak: { kind: 'streak', x: -30, y: 110, length: 270, spread: 90 },
  vanish: { kind: 'burst', x: 0, y: 80, radius: 56, color: SHADOW },
  vanishTrail: { kind: 'streak', x: 0, y: 80, length: 320, spread: 100, lines: 6, color: SHADOW, life: 10 },
  appear: { kind: 'burst', x: 0, y: 80, radius: 56, color: SHADOW },
  stormCharge: { kind: 'burst', x: 0, y: 100, radius: 90, rays: 8, life: 20 },
  stormRush: { kind: 'streak', x: -40, y: 110, length: 220, spread: 110, lines: 7 },
  stormFinish: { kind: 'burst', x: 100, y: 150, radius: 80, rays: 8 },
};

// ---- Animations -------------------------------------------------------------------------
// Keys are in move frames: the strike key sits on the first active frame.

const { CROUCH, TUCK } = BASE_POSES;

/** Low two-handed guard, weight forward, blade angled up at the opponent. */
const GUARD: PoseSpec = {
  y: 80,
  lean: -12,
  footF: [30, 0],
  footB: [-32, 0],
  handF: [34, 106],
  handB: [24, 101],
  weaponDir: 28,
};

const idle = anim(
  true,
  key(0, GUARD),
  key(25, { ...GUARD, y: 78.5, lean: -14, handF: [35, 104], handB: [25, 99], weaponDir: 25 }),
  key(50, GUARD),
);

/**
 * Shuffle step: each planted foot slides back 33 px over 20 frames (1.65 px per
 * animation frame = WALK_STRIDE_SPEED), so playback scaled by walk speed does not slide.
 */
function walkKeys(lean: number): Keyframe[] {
  const step = (t: number, footF: [number, number], footB: [number, number], y: number): Keyframe =>
    key(t, { ...GUARD, lean, y, footF, footB }, 'linear');
  return [
    step(0, [7, 0], [-16, 0], 81),
    step(10, [23.5, 10], [-32.5, 0], 83),
    step(20, [40, 0], [-49, 0], 78),
    step(30, [23.5, 0], [-32.5, 10], 83),
    step(40, [7, 0], [-16, 0], 81),
  ];
}

function reversed(keys: Keyframe[]): Keyframe[] {
  const end = keys[keys.length - 1]?.t ?? 0;
  return keys
    .slice()
    .reverse()
    .map((k) => ({ t: end - k.t, pose: k.pose, ease: k.ease }));
}

const walk = anim(true, ...walkKeys(-14));
const walkBack = anim(true, ...reversed(walkKeys(-6)));

// light 4/2/8: quick horizontal slash, strike at 5.
const L_STRIKE: PoseSpec = {
  y: 78,
  lean: -20,
  footF: [40, 0],
  footB: [-30, 0],
  handF: [54, 124],
  handB: [-14, 112],
  weaponDir: 2,
};
const lightAnim = anim(
  false,
  key(0, GUARD, 'out'),
  key(2, { y: 82, lean: -6, footF: [32, 0], footB: [-32, 0], handF: [20, 134], handB: [10, 128], weaponDir: 150 }, 'in'),
  key(5, L_STRIKE, 'linear'),
  key(6, { ...L_STRIKE, handF: [56, 118], weaponDir: -18 }, 'out'),
  key(9, { ...L_STRIKE, lean: -16, handF: [42, 98], handB: [-10, 104], weaponDir: -56 }),
  key(14, GUARD),
);

// heavy 9/3/15: stepping diagonal cut, strike at 10.
const H_STRIKE: PoseSpec = {
  y: 74,
  lean: -26,
  footF: [48, 0],
  footB: [-30, 0],
  handF: [60, 122],
  handB: [48, 124],
  weaponDir: -26,
};
const heavyAnim = anim(
  false,
  key(0, GUARD),
  key(
    6,
    { y: 90, lean: 8, head: 84, footF: [26, 0], footB: [-30, 0], handF: [6, 178], handB: [-4, 172], weaponDir: 140 },
    'in',
  ),
  key(8, { y: 86, lean: -6, footF: [36, 0], footB: [-30, 0], handF: [34, 176], handB: [24, 172], weaponDir: 78 }, 'linear'),
  key(10, H_STRIKE, 'linear'),
  key(11, { ...H_STRIKE, handF: [60, 110], handB: [48, 113], weaponDir: -44 }, 'out'),
  key(13, { ...H_STRIKE, lean: -28, y: 72, handF: [52, 92], handB: [42, 96], weaponDir: -66 }),
  key(19, { ...H_STRIKE, lean: -20, handF: [44, 92], handB: [34, 92], weaponDir: -50 }),
  key(27, GUARD),
);

// crouchLight 4/2/9: low sword poke, strike at 5.
const CL_STRIKE: PoseSpec = {
  y: 48,
  lean: -24,
  footF: [42, 0],
  footB: [-28, 0],
  handF: [60, 56],
  handB: [-6, 70],
  weaponDir: -12,
};
const crouchLightAnim = anim(
  false,
  key(0, CROUCH, 'out'),
  key(2, { y: 54, lean: -10, footF: [28, 0], footB: [-28, 0], handF: [26, 80], handB: [16, 76], weaponDir: 14 }, 'in'),
  key(5, CL_STRIKE, 'out'),
  key(6, { ...CL_STRIKE, handF: [62, 55] }),
  key(9, { ...CL_STRIKE, handF: [48, 62], weaponDir: -6 }),
  key(15, CROUCH),
);

// crouchHeavy 8/3/21: descending low sweep that rises into a launch, strike at 9.
const CH_STRIKE: PoseSpec = {
  y: 40,
  lean: -34,
  footF: [62, 0],
  footB: [-40, 0],
  handF: [62, 34],
  handB: [-24, 60],
  weaponDir: -10,
};
const crouchHeavyAnim = anim(
  false,
  key(0, CROUCH),
  key(5, { y: 58, lean: -2, footF: [28, 0], footB: [-30, 0], handF: [14, 116], handB: [4, 112], weaponDir: 125 }, 'in'),
  key(7, { y: 52, lean: -16, footF: [40, 0], footB: [-30, 0], handF: [44, 98], handB: [34, 96], weaponDir: 50 }, 'linear'),
  key(9, CH_STRIKE, 'linear'),
  key(11, { ...CH_STRIKE, handF: [64, 42], weaponDir: 10 }, 'out'),
  key(15, { ...CH_STRIKE, y: 52, lean: -18, handF: [52, 108], handB: [40, 104], weaponDir: 70 }),
  key(24, { ...CROUCH, lean: -16, weaponDir: 50 }),
  key(32, CROUCH),
);

// airLight 4/4/7: quick air slash, strike at 5.
const AL_STRIKE: PoseSpec = { ...TUCK, lean: -18, handF: [56, 112], handB: [44, 110], weaponDir: -16 };
const airLightAnim = anim(
  false,
  key(0, TUCK, 'out'),
  key(2, { ...TUCK, lean: -6, handF: [26, 138], handB: [16, 132], weaponDir: 110 }, 'in'),
  key(5, AL_STRIKE, 'out'),
  key(7, { ...AL_STRIKE, handF: [52, 102], handB: [40, 102], weaponDir: -36 }),
  key(10, { ...TUCK, handF: [44, 112], handB: [32, 108], weaponDir: -20 }),
  key(15, TUCK),
);

// airHeavy 7/4/9: downward cut, strike at 8.
const AH_STRIKE: PoseSpec = {
  ...TUCK,
  lean: -28,
  upperLegF: -30,
  lowerLegF: -100,
  handF: [50, 92],
  handB: [40, 98],
  weaponDir: -62,
};
const airHeavyAnim = anim(
  false,
  key(0, TUCK),
  key(5, { ...TUCK, lean: 8, handF: [4, 180], handB: [-6, 172], weaponDir: 140 }, 'in'),
  key(7, { ...TUCK, lean: -8, handF: [36, 170], handB: [26, 166], weaponDir: 70 }, 'linear'),
  key(8, AH_STRIKE, 'out'),
  key(10, { ...AH_STRIKE, handF: [44, 82], handB: [34, 88], weaponDir: -80 }),
  key(13, { ...AH_STRIKE, handF: [40, 88], handB: [30, 92], weaponDir: -76 }),
  key(20, TUCK),
);

// specialN 11/1/20: shuriken from the back hand, release at 12.
const SN_RELEASE: PoseSpec = {
  y: 80,
  lean: -18,
  footF: [40, 0],
  footB: [-30, 0],
  handF: [12, 100],
  handB: [58, 130],
  weaponDir: -110,
};
const specialNAnim = anim(
  false,
  key(0, GUARD),
  key(4, { y: 82, lean: 4, footF: [28, 0], footB: [-34, 0], handF: [20, 92], handB: [-30, 150], weaponDir: -40 }, 'in'),
  key(
    9,
    { y: 84, lean: 10, head: 86, footF: [28, 0], footB: [-34, 0], handF: [14, 96], handB: [-40, 142], weaponDir: -60 },
    'in',
  ),
  key(12, SN_RELEASE, 'out'),
  key(16, { ...SN_RELEASE, lean: -16, handB: [52, 118] }),
  key(24, { ...GUARD, lean: -8 }),
  key(32, GUARD),
);

// specialF 10/7/22: iai crouch, dash (frames 5-14), rising slash on 11-17.
const SF_DASH: PoseSpec = {
  y: 68,
  lean: -38,
  footF: [50, 0],
  footB: [-56, 0],
  handF: [10, 98],
  handB: [-30, 112],
  weaponDir: 200,
};
const SF_SLASH: PoseSpec = {
  y: 72,
  lean: -30,
  footF: [52, 0],
  footB: [-46, 0],
  handF: [58, 110],
  handB: [-30, 116],
  weaponDir: -30,
};
const specialFAnim = anim(
  false,
  key(0, GUARD),
  key(4, { y: 66, lean: -24, footF: [40, 0], footB: [-40, 0], handF: [8, 96], handB: [-20, 110], weaponDir: 192 }, 'in'),
  key(6, SF_DASH),
  key(10, SF_DASH, 'linear'),
  key(11, SF_SLASH, 'linear'),
  key(13, { ...SF_SLASH, handF: [62, 128], weaponDir: 8 }, 'out'),
  key(17, { ...SF_SLASH, lean: -24, handF: [52, 148], weaponDir: 40 }),
  key(22, { ...SF_SLASH, lean: -14, y: 78, handF: [32, 162], handB: [-20, 120], weaponDir: 110 }),
  key(30, { ...GUARD, lean: -8, y: 82 }),
  key(39, GUARD),
);

// specialD 12/1/19: shadow step. Sign, vanish (travel 7-10), reappear low facing away.
const SD_DASH: PoseSpec = {
  y: 56,
  lean: -50,
  footF: [56, 0],
  footB: [-60, 0],
  handF: [10, 80],
  handB: [-40, 96],
  weaponDir: 195,
};
const SD_LAND: PoseSpec = {
  y: 50,
  lean: -18,
  footF: [36, 0],
  footB: [-38, 0],
  handF: [40, 70],
  handB: [-26, 56],
  weaponDir: 190,
};
const specialDAnim = anim(
  false,
  key(0, GUARD),
  key(5, { y: 60, lean: -20, footF: [30, 0], footB: [-30, 0], handF: [30, 70], handB: [20, 130], weaponDir: 200 }, 'in'),
  key(7, SD_DASH),
  key(10, SD_DASH, 'out'),
  key(12, SD_LAND),
  key(22, { ...SD_LAND, y: 56, lean: -14 }),
  key(32, GUARD),
);

// ultimate 50/36/28: iai charge through the super freeze, rush at 47, eight slashes
// on frames 51, 60, 64, 68, 72, 76, 80, 84 (the last a rising launcher).
const U_IAI: PoseSpec = {
  y: 66,
  lean: -16,
  footF: [40, 0],
  footB: [-44, 0],
  handF: [2, 90],
  handB: [-2, 94],
  weaponDir: 192,
};
const U_LOW = { y: 76, lean: -24, footF: [50, 0], footB: [-40, 0] } as const;
const U_HIGH = { y: 88, lean: 2, footF: [40, 0], footB: [-36, 0] } as const;
const ultimateAnim = anim(
  false,
  key(0, GUARD),
  key(8, { ...U_IAI, y: 70, lean: -10, weaponDir: 196 }, 'out'),
  key(30, U_IAI),
  key(46, { ...U_IAI, y: 62, lean: -22, footF: [44, 0], footB: [-48, 0] }, 'in'),
  key(48, { y: 66, lean: -42, footF: [56, 0], footB: [-62, 0], handF: [10, 90], handB: [-30, 104], weaponDir: 205 }, 'linear'),
  // 1: horizontal slash out of the rush.
  key(51, { ...U_LOW, handF: [60, 122], handB: [-24, 110], weaponDir: 4 }, 'out'),
  key(56, { ...U_LOW, handF: [52, 140], handB: [-20, 112], weaponDir: 50 }),
  key(58, { ...U_HIGH, handF: [22, 176], handB: [12, 170], weaponDir: 120 }, 'in'),
  // 2: diagonal down.
  key(60, { ...U_LOW, handF: [60, 112], handB: [48, 114], weaponDir: -36 }, 'out'),
  key(62, { ...U_LOW, handF: [48, 86], handB: [38, 90], weaponDir: -80 }, 'in'),
  // 3: rising.
  key(64, { ...U_LOW, handF: [62, 132], handB: [50, 128], weaponDir: 24 }, 'out'),
  key(66, { ...U_HIGH, handF: [40, 170], handB: [30, 166], weaponDir: 100 }, 'in'),
  // 4: horizontal.
  key(68, { ...U_LOW, handF: [64, 128], handB: [-20, 112], weaponDir: 0 }, 'out'),
  key(70, { ...U_LOW, handF: [42, 96], handB: [-20, 104], weaponDir: -70 }, 'in'),
  // 5: rising.
  key(72, { ...U_LOW, handF: [60, 140], handB: [48, 136], weaponDir: 30 }, 'out'),
  key(74, { ...U_HIGH, handF: [16, 178], handB: [6, 172], weaponDir: 135 }, 'in'),
  // 6: big down cut.
  key(76, { ...U_LOW, lean: -30, handF: [62, 104], handB: [50, 108], weaponDir: -40 }, 'out'),
  key(78, { ...U_LOW, handF: [44, 80], handB: [34, 84], weaponDir: -85 }, 'in'),
  // 7: rising.
  key(80, { ...U_LOW, handF: [62, 136], handB: [50, 132], weaponDir: 26 }, 'out'),
  key(82, { y: 58, lean: -26, footF: [48, 0], footB: [-44, 0], handF: [40, 70], handB: [30, 74], weaponDir: -100 }, 'in'),
  // 8: rising launcher.
  key(
    84,
    {
      y: 100, lean: -4, upperLegF: -60, lowerLegF: -95, upperLegB: -110, lowerLegB: -122,
      handF: [60, 160], handB: [50, 154], weaponDir: 48,
    },
    'out',
  ),
  key(
    88,
    {
      y: 102, lean: 6, upperLegF: -60, lowerLegF: -95, upperLegB: -110, lowerLegB: -122,
      handF: [44, 196], handB: [36, 188], weaponDir: 85,
    },
  ),
  key(100, { ...GUARD, y: 76, lean: -18, handF: [44, 96], handB: [34, 94], weaponDir: -30 }),
  key(114, GUARD),
);

export const REI_ANIMS: AnimationSet = {
  idle,
  walk,
  walkBack,
  'rei.light': lightAnim,
  'rei.heavy': heavyAnim,
  'rei.crouchLight': crouchLightAnim,
  'rei.crouchHeavy': crouchHeavyAnim,
  'rei.airLight': airLightAnim,
  'rei.airHeavy': airHeavyAnim,
  'rei.specialN': specialNAnim,
  'rei.specialF': specialFAnim,
  'rei.specialD': specialDAnim,
  'rei.ultimate': ultimateAnim,
};

export const REI: FighterEntry = { def: REI_DEF, look: REI_LOOK, anims: REI_ANIMS, visuals: REI_VISUALS };
