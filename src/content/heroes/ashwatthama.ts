// Ashwatthama, the Wounded Veteran. A stance-switching antagonist: a blade stance for close
// pressure and a bow stance for range, an unstable projectile with a long recovery, and an
// ultimate in three telegraphed stages. Charcoal, muted crimson and electric blue; lightning.
//
// Stances (FighterDef.stances): BLADE is the default move set. BOW overrides light, heavy,
// specialD and the Stance Shift itself: light and heavy become arrows, specialD a short volley.
// Stance Shift (Special + forward) switches in either direction and takes 23 frames, so the
// switch itself can be punished. Stance resets every round.
//
// Frame data (advantage = hitstun minus active + recovery): blade light 5/2/9 +3 hit, heavy
// 10/3/16 +1, crouchLight 5/2/10 +2, crouchHeavy 9/3/21 launches.
import { BASE_POSES } from '../../render/anims/base';
import type { VisualSpec } from '../../render/moveVisuals';
import { anim, key, type PoseSpec } from '../../render/pose';
import type { AnimationSet, FighterLook } from '../../render/types';
import type { FighterDef, MoveDef } from '../../sim/types';
import { LIGHT_CHAIN, SPECIALS, attackAnim, idleAnim, info, reversedKeys, tipBox, walkKeys, weaponPoints } from '../heroKit';
import type { HeroEntry, HeroProfile } from '../types';

export const ASHWATTHAMA_LOOK: FighterLook = {
  accent: '#4FA3FF',
  secondary: '#C2334D',
  height: 1.02,
  bulk: 1,
  headStyle: 'wingedHelm',
  ribbon: 'cape',
  weapon: { type: 'sword', length: 108, color: '#B8D4FF' },
};

const { CROUCH, TUCK } = BASE_POSES;
const look = ASHWATTHAMA_LOOK;

// ---- Poses -------------------------------------------------------------------------------

/** Blade stance: upright, sword raised and angled, weight even. */
const GUARD: PoseSpec = {
  y: 76, lean: -14, footF: [36, 0], footB: [-38, 0], handF: [46, 108], handB: [20, 104], weaponDir: 38,
};

const L_WIND: PoseSpec = { y: 78, lean: -4, footF: [38, 0], footB: [-36, 0], handF: [26, 118], handB: [10, 110], weaponDir: 130 };
const L_STRIKE: PoseSpec = { y: 74, lean: -22, footF: [50, 0], footB: [-34, 0], handF: [52, 116], handB: [14, 108], weaponDir: 4 };

const H_WIND: PoseSpec = { y: 86, lean: 8, head: 84, footF: [32, 0], footB: [-36, 0], handF: [12, 166], handB: [2, 158], weaponDir: 150 };
const H_STRIKE: PoseSpec = { y: 68, lean: -30, footF: [58, 0], footB: [-36, 0], handF: [52, 108], handB: [38, 106], weaponDir: -28 };
const H_FOLLOW: PoseSpec = { ...H_STRIKE, handF: [46, 94], weaponDir: -50 };

const CL_WIND: PoseSpec = { y: 54, lean: -8, footF: [30, 0], footB: [-30, 0], handF: [30, 80], handB: [18, 76], weaponDir: 40 };
const CL_STRIKE: PoseSpec = { y: 48, lean: -24, footF: [48, 0], footB: [-30, 0], handF: [56, 52], handB: [10, 66], weaponDir: -4 };

const CH_WIND: PoseSpec = { y: 58, lean: -2, footF: [30, 0], footB: [-30, 0], handF: [14, 118], handB: [4, 112], weaponDir: 125 };
const CH_STRIKE: PoseSpec = { y: 40, lean: -34, footF: [60, 0], footB: [-40, 0], handF: [62, 34], handB: [-18, 58], weaponDir: 6 };

const AL_WIND: PoseSpec = { ...TUCK, lean: -6, handF: [26, 138], handB: [16, 132], weaponDir: 120 };
const AL_STRIKE: PoseSpec = { ...TUCK, lean: -18, handF: [54, 112], handB: [42, 110], weaponDir: -12 };
const AH_WIND: PoseSpec = { ...TUCK, lean: 8, handF: [4, 180], handB: [-6, 172], weaponDir: 150 };
const AH_STRIKE: PoseSpec = { ...TUCK, lean: -28, upperLegF: -30, lowerLegF: -100, handF: [48, 96], handB: [40, 100], weaponDir: -40 };

/** Rising Cut (anti-air). */
const RISE_WIND: PoseSpec = { y: 64, lean: -22, footF: [40, 0], footB: [-40, 0], handF: [20, 60], handB: [4, 70], weaponDir: 10 };
const RISE: PoseSpec = { y: 86, lean: 4, footF: [34, 0], footB: [-38, 0], handF: [52, 150], handB: [30, 140], weaponDir: 66 };

/** Astra Burst: both hands thrust forward, blue fire gathered between them. */
const BURST_WIND: PoseSpec = { y: 74, lean: 2, footF: [34, 0], footB: [-40, 0], handF: [30, 124], handB: [20, 118], weaponDir: 90 };
const BURST: PoseSpec = { y: 72, lean: -20, footF: [48, 0], footB: [-38, 0], handF: [72, 120], handB: [60, 114], weaponDir: 80 };

/** Stance Shift: the sword swept low, then the other hand raised. */
const SHIFT_WIND: PoseSpec = { y: 70, lean: -8, footF: [36, 0], footB: [-40, 0], handF: [40, 70], handB: [16, 100], weaponDir: -20 };
const SHIFT: PoseSpec = { y: 80, lean: -6, footF: [36, 0], footB: [-38, 0], handF: [34, 112], handB: [56, 128], weaponDir: 76 };

/** Bow stance shots: the sword held up in the front hand, the back hand casts. */
const SHOT_WIND: PoseSpec = { y: 74, lean: -8, footF: [38, 0], footB: [-38, 0], handF: [30, 106], handB: [-8, 126], weaponDir: 76 };
const SHOT: PoseSpec = { y: 72, lean: -12, footF: [40, 0], footB: [-38, 0], handF: [30, 106], handB: [66, 124], weaponDir: 76 };
const SHOT_HEAVY_WIND: PoseSpec = { ...SHOT_WIND, handB: [-18, 128], lean: -4 };

const U_RAISE: PoseSpec = { y: 84, lean: 6, head: 82, footF: [30, 0], footB: [-38, 0], handF: [40, 150], handB: [20, 142], weaponDir: 100 };
const U_CAST: PoseSpec = { y: 78, lean: -14, footF: [38, 0], footB: [-38, 0], handF: [70, 128], handB: [56, 120], weaponDir: 84 };

const P_WIND: PoseSpec = { y: 88, lean: 10, head: 84, footF: [28, 0], footB: [-36, 0], handF: [4, 172], handB: [-6, 164], weaponDir: 152 };
const P_STRIKE: PoseSpec = { y: 70, lean: -32, footF: [60, 0], footB: [-36, 0], handF: [54, 106], handB: [42, 108], weaponDir: -32 };

const T_REACH: PoseSpec = { y: 74, lean: -22, footF: [46, 0], footB: [-32, 0], handF: [62, 114], handB: [54, 106], weaponDir: 80 };
const T_TOSS: PoseSpec = { y: 80, lean: 10, footF: [30, 0], footB: [-40, 0], handF: [10, 170], handB: [-6, 162], weaponDir: 130, elbowF: 1, elbowB: 1 };

// ---- Blade-stance moves ------------------------------------------------------------------

const total = (m: { startup: number; active: number; recovery: number }): number => m.startup + m.active + m.recovery;

const lightBase = { startup: 5, active: 2, recovery: 9 };
const light: MoveDef = {
  anim: 'ashwatthama.light', ...lightBase,
  damage: 34, level: 'mid', hitstun: 14, blockstun: 10, knockback: { x: 3.5, y: 0 },
  hitboxes: [tipBox(look, L_STRIKE)],
  strength: 'light', meterGain: 4,
  cancels: { into: LIGHT_CHAIN, until: total(lightBase) },
};

const heavyBase = { startup: 10, active: 3, recovery: 16 };
const heavy: MoveDef = {
  anim: 'ashwatthama.heavy', ...heavyBase,
  damage: 70, level: 'mid', hitstun: 20, blockstun: 14, knockback: { x: 6, y: 0 },
  hitboxes: [tipBox(look, H_STRIKE)],
  strength: 'heavy', meterGain: 8,
  cancels: { into: [...SPECIALS, 'ultimate'], until: total(heavyBase) },
};

const crouchLightBase = { startup: 5, active: 2, recovery: 10 };
const crouchLight: MoveDef = {
  anim: 'ashwatthama.crouchLight', ...crouchLightBase,
  damage: 30, level: 'low', hitstun: 14, blockstun: 10, knockback: { x: 3, y: 0 },
  hitboxes: [tipBox(look, CL_STRIKE)],
  strength: 'light', meterGain: 4,
  cancels: { into: LIGHT_CHAIN, until: total(crouchLightBase) },
};

const crouchHeavyBase = { startup: 9, active: 3, recovery: 21 };
const crouchHeavy: MoveDef = {
  anim: 'ashwatthama.crouchHeavy', ...crouchHeavyBase,
  damage: 64, level: 'low', hitstun: 22, blockstun: 13, knockback: { x: 2.5, y: 10 },
  hitboxes: [tipBox(look, CH_STRIKE)],
  strength: 'heavy', meterGain: 8, launches: true,
  cancels: { into: [...SPECIALS, 'ultimate'], until: total(crouchHeavyBase) },
};

const airLight: MoveDef = {
  anim: 'ashwatthama.airLight', startup: 5, active: 4, recovery: 8,
  damage: 34, level: 'overhead', hitstun: 14, blockstun: 10, knockback: { x: 3, y: 0 },
  hitboxes: [tipBox(look, AL_STRIKE, { air: true })],
  strength: 'light', meterGain: 4,
  cancels: { into: ['airHeavy'], until: 16 },
};

const airHeavy: MoveDef = {
  anim: 'ashwatthama.airHeavy', startup: 8, active: 4, recovery: 10,
  damage: 60, level: 'overhead', hitstun: 19, blockstun: 13, knockback: { x: 5, y: 2 },
  hitboxes: [tipBox(look, AH_STRIKE, { air: true })],
  strength: 'heavy', meterGain: 7,
};

/** Astra Burst: a large, slow, unstable sphere. Long recovery: the burst is risky to throw. */
const burstHand = weaponPoints(look, BURST).hand;
const specialN: MoveDef = {
  anim: 'ashwatthama.specialN', startup: 18, active: 1, recovery: 34,
  damage: 75, level: 'mid', hitstun: 20, blockstun: 14, knockback: { x: 5, y: 0 },
  hitboxes: [],
  strength: 'special', meterGain: 7,
  projectile: {
    frame: 19, x: burstHand.x, y: burstHand.y, vx: 7, vy: 0, w: 96, h: 96,
    damage: 75, lifetime: 90, hitstun: 20, blockstun: 14, knockback: { x: 5, y: 0 }, level: 'mid',
  },
  fx: [{ frame: 19, tag: 'burstFlash' }],
};

/** Stance Shift: swaps blade and bow. No damage; 23 frames in which he can be punished. */
const specialF: MoveDef = {
  anim: 'ashwatthama.specialF', startup: 6, active: 1, recovery: 16,
  damage: 0, level: 'mid', hitstun: 0, blockstun: 0, knockback: { x: 0, y: 0 },
  hitboxes: [],
  strength: 'special', meterGain: 0,
  switchStance: 1,
  fx: [{ frame: 7, tag: 'shiftFlash' }],
};

/** Rising Cut (blade): an invulnerable rising slash that launches. */
const specialD: MoveDef = {
  anim: 'ashwatthama.specialD', startup: 8, active: 4, recovery: 22,
  damage: 70, level: 'mid', hitstun: 24, blockstun: 16, knockback: { x: 3, y: 12 },
  hitboxes: [tipBox(look, RISE, { pad: 24, reach: 14 })],
  invulnerable: { from: 3, to: 10 },
  strength: 'special', meterGain: 9, launches: true,
  fx: [{ frame: 9, tag: 'riseArc' }],
};

/**
 * Unstable Astra: three stages. Stage 1 marks the opponent's spot, stage 2 two lanes either side,
 * stage 3 a wide low lane (jump it). Each strikes 40 frames after it appears, with 14 frames
 * between stages, so there is always a place to stand: stage 1's spot is safe from stage 2.
 */
const ultimate: MoveDef = {
  anim: 'ashwatthama.ultimate', startup: 50, active: 1, recovery: 73,
  damage: 70, level: 'mid', hitstun: 20, blockstun: 14, knockback: { x: 4, y: 0 },
  hitboxes: [],
  invulnerable: { from: 1, to: 50 },
  strength: 'ultimate', meterGain: 0,
  zone: {
    kind: 'strike', frame: 52, x: 'opponent', w: 70, frames: 44, strikeAt: 40,
    damage: 70, hitstun: 20, knockback: { x: 4, y: 0 }, strength: 'ultimate', label: 'STAGE 1',
  },
  extraZones: [
    {
      kind: 'strike', frame: 66, x: 'opponent', offsets: [-110, 110], w: 64, frames: 44, strikeAt: 40,
      damage: 70, hitstun: 20, knockback: { x: 4, y: 0 }, strength: 'ultimate', label: 'STAGE 2',
    },
    {
      kind: 'strike', frame: 80, x: 'opponent', w: 240, h: 30, frames: 44, strikeAt: 40,
      damage: 90, hitstun: 24, knockback: { x: 5, y: 11 }, launches: true, strength: 'ultimate', label: 'STAGE 3: JUMP',
    },
  ],
  fx: [
    { frame: 2, tag: 'unstableCharge' },
    { frame: 52, tag: 'stageFlash' },
    { frame: 66, tag: 'stageFlash' },
    { frame: 80, tag: 'stageFlash' },
  ],
};

const throwMove: MoveDef = {
  anim: 'ashwatthama.throw', startup: 6, active: 2, recovery: 22,
  damage: 86, level: 'mid', hitstun: 20, blockstun: 0, knockback: { x: 5, y: 9 },
  hitboxes: [{ x: 0, y: 30, w: 66, h: 128 }],
  strength: 'heavy', meterGain: 8, launches: true, throw: true,
  fx: [{ frame: 7, tag: 'grabFlash' }],
};

const power: MoveDef = {
  anim: 'ashwatthama.power', startup: 18, active: 3, recovery: 24,
  damage: 125, level: 'mid', hitstun: 26, blockstun: 0, knockback: { x: 7, y: 11 },
  hitboxes: [tipBox(look, P_STRIKE)],
  strength: 'heavy', meterGain: 12, launches: true, unblockable: true,
  armor: { from: 1, to: 18 },
  fx: [{ frame: 2, tag: 'powerCharge' }, { frame: 19, tag: 'powerStrike' }],
};

// ---- Bow-stance overrides ----------------------------------------------------------------

const casterHand = weaponPoints(look, SHOT).handB;

/** Quick Shot (bow light): a small fast arrow. */
const bowLight: MoveDef = {
  anim: 'ashwatthama.light.s1', startup: 6, active: 1, recovery: 10,
  damage: 22, level: 'mid', hitstun: 12, blockstun: 9, knockback: { x: 3, y: 0 },
  hitboxes: [],
  strength: 'light', meterGain: 3,
  projectile: {
    frame: 7, x: casterHand.x, y: casterHand.y, vx: 20, vy: 0, w: 40, h: 12,
    damage: 22, lifetime: 50, hitstun: 12, blockstun: 9, knockback: { x: 3, y: 0 }, level: 'mid',
  },
  fx: [{ frame: 7, tag: 'castFlash' }],
};

/** Charged Shot (bow heavy): a slower, harder arrow. */
const bowHeavy: MoveDef = {
  anim: 'ashwatthama.heavy.s1', startup: 14, active: 1, recovery: 20,
  damage: 55, level: 'mid', hitstun: 18, blockstun: 12, knockback: { x: 5, y: 0 },
  hitboxes: [],
  strength: 'heavy', meterGain: 6,
  projectile: {
    frame: 15, x: casterHand.x, y: casterHand.y, vx: 16, vy: 0, w: 70, h: 18,
    damage: 55, lifetime: 60, hitstun: 18, blockstun: 12, knockback: { x: 5, y: 0 }, level: 'mid',
  },
  fx: [{ frame: 15, tag: 'castFlash' }],
};

/** Short Volley (bow special + down): a fan of arrows that fades quickly. */
const bowVolley: MoveDef = {
  anim: 'ashwatthama.specialD.s1', startup: 10, active: 1, recovery: 26,
  damage: 40, level: 'mid', hitstun: 15, blockstun: 11, knockback: { x: 4, y: 0 },
  hitboxes: [],
  strength: 'special', meterGain: 6,
  projectile: {
    frame: 11, x: casterHand.x, y: casterHand.y, vx: 13, vy: 0, w: 56, h: 76,
    damage: 40, lifetime: 38, hitstun: 15, blockstun: 11, knockback: { x: 4, y: 0 }, level: 'mid',
  },
  fx: [{ frame: 11, tag: 'castFlash' }],
};

/** Stance Shift (bow): back to the blade. */
const bowShift: MoveDef = {
  anim: 'ashwatthama.specialF.s1', startup: 6, active: 1, recovery: 16,
  damage: 0, level: 'mid', hitstun: 0, blockstun: 0, knockback: { x: 0, y: 0 },
  hitboxes: [],
  strength: 'special', meterGain: 0,
  switchStance: 0,
  fx: [{ frame: 7, tag: 'shiftFlash' }],
};

export const ASHWATTHAMA_DEF: FighterDef = {
  id: 'ashwatthama',
  name: 'Ashwatthama',
  element: 'lightning',
  stats: {
    health: 810, walkSpeed: 4.6, backSpeed: 3.8, jumpVelocity: 15.5, jumpForwardSpeed: 5.0, gravity: 0.85,
    width: 64, height: 180, crouchHeight: 106, power: 0.81,
  },
  moves: {
    light, heavy, crouchLight, crouchHeavy, airLight, airHeavy, specialN, specialF, specialD, ultimate,
    throw: throwMove, power,
  },
  stances: {
    names: ['BLADE', 'BOW'],
    moves: [{}, { light: bowLight, heavy: bowHeavy, specialD: bowVolley, specialF: bowShift }],
  },
};

// ---- Visuals -----------------------------------------------------------------------------

export const ASHWATTHAMA_VISUALS: Readonly<Record<string, VisualSpec>> = {
  burstFlash: { kind: 'burst', x: burstHand.x, y: burstHand.y, radius: 44, rays: 8, life: 12 },
  shiftFlash: { kind: 'burst', x: 40, y: 110, radius: 60, rays: 8, life: 16 },
  riseArc: { kind: 'streak', x: 30, y: 100, length: 140, spread: 80, lines: 5, life: 10 },
  unstableCharge: { kind: 'burst', x: 20, y: 130, radius: 80, rays: 10, life: 26 },
  stageFlash: { kind: 'burst', x: 64, y: 124, radius: 50, rays: 8, life: 12 },
  castFlash: { kind: 'burst', x: casterHand.x, y: casterHand.y, radius: 18, rays: 4, life: 8 },
  grabFlash: { kind: 'burst', x: 50, y: 110, radius: 30, rays: 6, life: 10 },
  powerCharge: { kind: 'burst', x: 0, y: 100, radius: 70, rays: 8, life: 18 },
  powerStrike: { kind: 'streak', x: -10, y: 110, length: 200, spread: 120, lines: 5 },
};

// ---- Animations --------------------------------------------------------------------------

const walkShape = {
  guard: GUARD,
  lean: -16,
  arms: (swing: number): PoseSpec => ({ handF: [46 + swing * 3, 108], handB: [20 - swing * 4, 104 + Math.abs(swing)] }),
};
const walk = anim(true, ...walkKeys(walkShape));
const walkBack = anim(true, ...reversedKeys(walkKeys({ ...walkShape, lean: -8 })));

const sa = (a: PoseSpec, w: PoseSpec, s: PoseSpec, f?: PoseSpec, wAt?: number) => ({
  guard: a, windup: w, strike: s, follow: f, windupAt: wAt,
});

const ultimateAnim = anim(
  false,
  key(0, GUARD, 'out'),
  key(10, U_RAISE, 'out'),
  key(40, { ...U_RAISE, y: 83 }),
  key(50, { ...U_RAISE, lean: 10, handF: [36, 160] }, 'in'),
  key(52, U_CAST, 'out'),
  key(60, { ...U_CAST, lean: -10 }),
  key(66, { ...U_CAST, y: 80, handF: [74, 132] }, 'out'),
  key(74, { ...U_CAST, lean: -10 }),
  key(80, { ...U_CAST, y: 82, handF: [78, 138], handB: [62, 126] }, 'out'),
  key(100, { ...U_CAST, lean: -8 }),
  key(124, GUARD),
);

const introAnim = anim(
  true,
  key(0, GUARD),
  key(40, { ...GUARD, y: 75, lean: -12, handF: [48, 110], handB: [18, 104], weaponDir: 34 }),
  key(80, GUARD),
);

export const ASHWATTHAMA_ANIMS: AnimationSet = {
  idle: idleAnim(GUARD, 54, 1.4),
  walk,
  walkBack,
  intro: introAnim,
  'ashwatthama.light': attackAnim(sa(GUARD, L_WIND, L_STRIKE), 5, 2, 9),
  'ashwatthama.heavy': attackAnim(sa(GUARD, H_WIND, H_STRIKE, H_FOLLOW), 10, 3, 16),
  'ashwatthama.crouchLight': attackAnim(sa(CROUCH, CL_WIND, CL_STRIKE), 5, 2, 10),
  'ashwatthama.crouchHeavy': attackAnim(sa(CROUCH, CH_WIND, CH_STRIKE, { ...CH_STRIKE, y: 52, lean: -18, handF: [52, 108], weaponDir: 70 }), 9, 3, 21),
  'ashwatthama.airLight': attackAnim(sa(TUCK, AL_WIND, AL_STRIKE), 5, 4, 8),
  'ashwatthama.airHeavy': attackAnim(sa(TUCK, AH_WIND, AH_STRIKE), 8, 4, 10),
  'ashwatthama.specialN': attackAnim(sa(GUARD, BURST_WIND, BURST, { ...BURST, lean: -14, handF: [64, 116] }, 10), 18, 1, 34),
  'ashwatthama.specialF': attackAnim(sa(GUARD, SHIFT_WIND, SHIFT, { ...SHIFT, lean: -10 }, 3), 6, 1, 16),
  'ashwatthama.specialD': attackAnim(sa(GUARD, RISE_WIND, RISE, { ...RISE, y: 80, lean: 0 }, 5), 8, 4, 22),
  'ashwatthama.ultimate': ultimateAnim,
  'ashwatthama.throw': attackAnim(sa(GUARD, { ...T_REACH, lean: -12, handF: [42, 116], handB: [34, 108] }, T_REACH, T_TOSS), 6, 2, 22),
  'ashwatthama.power': attackAnim(sa(GUARD, P_WIND, P_STRIKE, { ...P_STRIKE, lean: -22, handF: [46, 92], weaponDir: -55 }, 10), 18, 3, 24),
  // Bow-stance overrides.
  'ashwatthama.light.s1': attackAnim(sa(GUARD, SHOT_WIND, SHOT, { ...SHOT, handB: [40, 118] }, 3), 6, 1, 10),
  'ashwatthama.heavy.s1': attackAnim(sa(GUARD, SHOT_HEAVY_WIND, SHOT, { ...SHOT, handB: [40, 118] }, 8), 14, 1, 20),
  'ashwatthama.specialD.s1': attackAnim(sa(GUARD, SHOT_WIND, { ...SHOT, handF: [34, 112] }, { ...SHOT, handB: [44, 118] }, 5), 10, 1, 26),
  'ashwatthama.specialF.s1': attackAnim(sa(GUARD, SHIFT_WIND, { ...GUARD, y: 78, lean: -14 }, { ...GUARD, lean: -10 }, 3), 6, 1, 16),
};

// ---- Profile -----------------------------------------------------------------------------

export const ASHWATTHAMA_PROFILE: HeroProfile = {
  title: 'The Wounded Veteran',
  identity: 'A stance-switching fighter with strong pressure and risky bursts of power.',
  bio:
    'Ashwatthama is a veteran who pursues the corrupted power because he believes it could undo an old loss. ' +
    'A quiet moment reveals doubt beneath his anger, and the heroes must stop his escalating choices while understanding his grief. ' +
    'He is written as a complex antagonist, never a monster: his harmful choices are plain, and so is the pain behind them. ' +
    'In a fight he switches between a blade stance for close pressure and a bow stance for range, hurls an unstable sphere that costs him dearly to throw, ' +
    'and can call a three-stage Astra with clear warnings and room to move. His story asks what the heroes owe someone who is hurting, and what they owe those he endangers.',
  weapons: {
    primary: 'Sword',
    secondary: 'Bow and an unstable fictional astric aura',
    note: 'In bow stance the sword stays in his front hand and the arrows are cast from his back hand.',
  },
  motif: 'Dark charcoal armour with muted crimson trim, a crackling blue aura, a winged helm, storm-dark ruins',
  palette: ['charcoal', 'muted crimson', 'electric blue'],
  rhythm: 'Pressure and switches: close in with the blade, back off with the bow, burst when it is safe',
  poses: {
    intro: 'Stands with the sword lowered and the blue aura flickering, then looks up',
    victory: 'Sinks to one knee and lowers the sword; the aura goes quiet',
  },
  moves: {
    light: info('Blade Cut / Quick Shot', 'Light', 'Blade stance: a fast cut. Bow stance: a small fast arrow.', 'Block it; in bow stance step in, since the arrow is weak.'),
    heavy: info('Heavy Cut / Charged Shot', 'Heavy', 'Blade stance: a diagonal cut with a wind-up. Bow stance: a slower, harder arrow.', 'Block the wind-up; both versions leave him open.'),
    crouchLight: info('Low Cut', 'Down + Light', 'A fast low cut. Must be blocked crouching.'),
    crouchHeavy: info('Rising Sweep', 'Down + Heavy', 'A low sweep that launches.', 'Jump it or block crouching.'),
    airLight: info('Air Cut', 'Light in the air', 'A quick cut from a jump.'),
    airHeavy: info('Diving Cut', 'Heavy in the air', 'A downward cut from above. Block standing.'),
    specialN: info('Astra Burst', 'Special', 'A large, slow, unstable sphere. He needs 34 frames to recover from throwing it.', 'Jump it or walk around it, then punish the recovery.'),
    specialF: info('Stance Shift', 'Special + forward', 'Switches between blade and bow stance. It does no damage and takes 23 frames.', 'Hit him during the switch; it is the best time to punish him.'),
    specialD: info('Rising Cut / Short Volley', 'Special + down', 'Blade stance: an invulnerable rising cut that launches. Bow stance: a short volley of arrows.', 'Do not jump in on the blade; block the volley or close in on the bow.'),
    ultimate: info('Unstable Astra', 'Heavy + Special, full meter', 'Three stages, each marked on the floor and striking 40 frames later: the spot you stand on, two lanes either side, then a wide low lane you can jump.', 'Move after stage 1 appears, stay between the stage 2 lanes, and jump stage 3.'),
    throw: info('Veteran\'s Throw', 'Grab, or Light + Heavy', 'A close grab and toss. Cannot be blocked.', 'Jump or dodge when he steps in.'),
    power: info('Astric Strike', 'Hold Power, then release', 'A charged cut with armour during its wind-up. Cannot be blocked.', 'Grab him or dodge; it is slow if it misses.'),
  },
  campaignRole: 'The antagonist of the campaign and the final duel of chapter eight, a rival whose grief the story takes seriously.',
  relationships: [
    { id: 'arjuna', text: 'The hero who has to stop him, and who has to decide what that means.' },
    { id: 'parashurama', text: 'Remembers a teacher\'s warnings about power without judgment.' },
  ],
  unlock: { kind: 'campaign', text: 'Finish the campaign, or clear Arcade with any hero' },
};

export const ASHWATTHAMA: HeroEntry = {
  def: ASHWATTHAMA_DEF,
  look: ASHWATTHAMA_LOOK,
  anims: ASHWATTHAMA_ANIMS,
  visuals: ASHWATTHAMA_VISUALS,
  profile: ASHWATTHAMA_PROFILE,
  projectiles: {
    light: { kind: 'arrow', length: 38, color: '#BFE0FF' },
    heavy: { kind: 'arrow', length: 60, color: '#FFFFFF' },
    specialD: { kind: 'arrow', length: 44, color: '#BFE0FF' },
    specialN: { kind: 'orb', color: '#4FA3FF' },
  },
};
