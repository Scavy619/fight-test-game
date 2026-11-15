// Abhimanyu, the Circle Breaker. The fastest hero: quick sword normals, dashes that pass through
// an opponent and leave him exposed, and an ultimate that rushes three marked paths then needs
// a long, interruptible wind-up for its final cut. Emerald, silver and amber; lightning.
//
// Frame data (advantage = hitstun minus active + recovery): light 4/2/8 +3 hit, heavy 9/3/15 +2,
// crouchLight 4/2/9 +2, crouchHeavy 8/3/20 launches. Every special leaves him open: Breakthrough
// Dash passes through you but ends behind you with 26 recovery frames, and the ultimate's final
// strike has 20 frames of visible wind-up after the third rush with no invulnerability.
import { BASE_POSES } from '../../render/anims/base';
import type { VisualSpec } from '../../render/moveVisuals';
import { anim, key, type PoseSpec } from '../../render/pose';
import type { AnimationSet, FighterLook } from '../../render/types';
import type { FighterDef, MoveDef } from '../../sim/types';
import { LIGHT_CHAIN, SPECIALS, attackAnim, idleAnim, info, reversedKeys, tipBox, walkKeys } from '../heroKit';
import type { HeroEntry, HeroProfile } from '../types';

export const ABHIMANYU_LOOK: FighterLook = {
  accent: '#3DDC97',
  secondary: '#FFC15E',
  height: 0.96,
  bulk: 0.86,
  headStyle: 'circlet',
  ribbon: 'scarf',
  weapon: { type: 'sword', length: 92, color: '#DDE8F0' },
};

const { CROUCH, TUCK } = BASE_POSES;
const look = ABHIMANYU_LOOK;

// ---- Poses -------------------------------------------------------------------------------

/** Forward-leaning ready stance, sword raised, free hand open. */
const GUARD: PoseSpec = {
  y: 78, lean: -14, footF: [36, 0], footB: [-38, 0], handF: [46, 108], handB: [20, 104], weaponDir: 42,
};

const L_WIND: PoseSpec = { y: 80, lean: -4, footF: [38, 0], footB: [-36, 0], handF: [26, 120], handB: [10, 112], weaponDir: 130 };
const L_STRIKE: PoseSpec = { y: 76, lean: -22, footF: [50, 0], footB: [-34, 0], handF: [50, 116], handB: [14, 108], weaponDir: 4 };

const H_WIND: PoseSpec = { y: 86, lean: 8, head: 84, footF: [32, 0], footB: [-36, 0], handF: [14, 166], handB: [4, 158], weaponDir: 150 };
const H_STRIKE: PoseSpec = { y: 70, lean: -30, footF: [58, 0], footB: [-36, 0], handF: [52, 110], handB: [38, 108], weaponDir: -30 };
const H_FOLLOW: PoseSpec = { ...H_STRIKE, handF: [46, 96], weaponDir: -52 };

const CL_WIND: PoseSpec = { y: 54, lean: -8, footF: [30, 0], footB: [-30, 0], handF: [30, 80], handB: [18, 76], weaponDir: 40 };
const CL_STRIKE: PoseSpec = { y: 48, lean: -24, footF: [48, 0], footB: [-30, 0], handF: [56, 52], handB: [10, 66], weaponDir: -4 };

const CH_WIND: PoseSpec = { y: 58, lean: -2, footF: [30, 0], footB: [-30, 0], handF: [14, 118], handB: [4, 112], weaponDir: 125 };
const CH_STRIKE: PoseSpec = { y: 40, lean: -34, footF: [60, 0], footB: [-40, 0], handF: [62, 34], handB: [-18, 58], weaponDir: 6 };

const AL_WIND: PoseSpec = { ...TUCK, lean: -6, handF: [26, 138], handB: [16, 132], weaponDir: 120 };
const AL_STRIKE: PoseSpec = { ...TUCK, lean: -18, handF: [54, 112], handB: [42, 110], weaponDir: -12 };
const AH_WIND: PoseSpec = { ...TUCK, lean: 8, handF: [4, 180], handB: [-6, 172], weaponDir: 150 };
const AH_STRIKE: PoseSpec = { ...TUCK, lean: -28, upperLegF: -30, lowerLegF: -100, handF: [48, 96], handB: [40, 100], weaponDir: -40 };

/** Spinning Edge: a high cut and a low cut in one turn. */
const SPIN_A: PoseSpec = { y: 74, lean: -24, footF: [54, 0], footB: [-36, 0], handF: [56, 126], handB: [14, 112], weaponDir: 14 };
const SPIN_B: PoseSpec = { y: 60, lean: -30, footF: [56, 0], footB: [-36, 0], handF: [58, 70], handB: [12, 86], weaponDir: -14 };
const SPIN_WIND: PoseSpec = { y: 78, lean: 6, footF: [34, 0], footB: [-38, 0], handF: [8, 128], handB: [-10, 120], weaponDir: 150 };

/** Breakthrough Dash: low and forward, sword out in front. */
const DASH: PoseSpec = { y: 66, lean: -40, footF: [62, 0], footB: [-50, 0], handF: [64, 100], handB: [20, 100], weaponDir: 0 };
const DASH_WIND: PoseSpec = { y: 70, lean: -22, footF: [44, 0], footB: [-44, 0], handF: [30, 104], handB: [10, 100], weaponDir: 30 };

/** Formation Breaker: three cuts, high, low, mid. */
const F3: PoseSpec = { y: 70, lean: -28, footF: [58, 0], footB: [-38, 0], handF: [60, 104], handB: [16, 100], weaponDir: 8 };

/** Chakravyuha Break. */
const LUNGE: PoseSpec = { y: 64, lean: -38, footF: [60, 0], footB: [-48, 0], handF: [66, 104], handB: [20, 100], weaponDir: 2 };
const FINAL: PoseSpec = { y: 72, lean: -26, footF: [56, 0], footB: [-38, 0], handF: [56, 112], handB: [38, 110], weaponDir: -35 };
const FINAL_WIND: PoseSpec = { y: 80, lean: -4, footF: [34, 0], footB: [-38, 0], handF: [20, 152], handB: [10, 142], weaponDir: 110 };

const P_WIND: PoseSpec = { y: 88, lean: 10, head: 84, footF: [28, 0], footB: [-36, 0], handF: [4, 172], handB: [-6, 164], weaponDir: 152 };
const P_STRIKE: PoseSpec = { y: 68, lean: -32, footF: [60, 0], footB: [-36, 0], handF: [54, 106], handB: [42, 108], weaponDir: -32 };

const T_REACH: PoseSpec = { y: 74, lean: -22, footF: [46, 0], footB: [-32, 0], handF: [62, 114], handB: [54, 106], weaponDir: 80 };
const T_TOSS: PoseSpec = { y: 80, lean: 10, footF: [30, 0], footB: [-40, 0], handF: [10, 170], handB: [-6, 162], weaponDir: 130, elbowF: 1, elbowB: 1 };

// ---- Moves -------------------------------------------------------------------------------

const total = (m: { startup: number; active: number; recovery: number }): number => m.startup + m.active + m.recovery;

const lightBase = { startup: 4, active: 2, recovery: 8 };
const light: MoveDef = {
  anim: 'abhimanyu.light', ...lightBase,
  damage: 28, level: 'mid', hitstun: 13, blockstun: 9, knockback: { x: 3, y: 0 },
  hitboxes: [tipBox(look, L_STRIKE)],
  strength: 'light', meterGain: 4,
  cancels: { into: LIGHT_CHAIN, until: total(lightBase) },
};

const heavyBase = { startup: 9, active: 3, recovery: 15 };
const heavy: MoveDef = {
  anim: 'abhimanyu.heavy', ...heavyBase,
  damage: 60, level: 'mid', hitstun: 20, blockstun: 13, knockback: { x: 5.5, y: 0 },
  hitboxes: [tipBox(look, H_STRIKE)],
  strength: 'heavy', meterGain: 8,
  cancels: { into: [...SPECIALS, 'ultimate'], until: total(heavyBase) },
};

const crouchLightBase = { startup: 4, active: 2, recovery: 9 };
const crouchLight: MoveDef = {
  anim: 'abhimanyu.crouchLight', ...crouchLightBase,
  damage: 24, level: 'low', hitstun: 13, blockstun: 9, knockback: { x: 2.5, y: 0 },
  hitboxes: [tipBox(look, CL_STRIKE)],
  strength: 'light', meterGain: 4,
  cancels: { into: LIGHT_CHAIN, until: total(crouchLightBase) },
};

const crouchHeavyBase = { startup: 8, active: 3, recovery: 20 };
const crouchHeavy: MoveDef = {
  anim: 'abhimanyu.crouchHeavy', ...crouchHeavyBase,
  damage: 56, level: 'low', hitstun: 22, blockstun: 12, knockback: { x: 2.5, y: 10 },
  hitboxes: [tipBox(look, CH_STRIKE)],
  strength: 'heavy', meterGain: 8, launches: true,
  cancels: { into: [...SPECIALS, 'ultimate'], until: total(crouchHeavyBase) },
};

const airLight: MoveDef = {
  anim: 'abhimanyu.airLight', startup: 4, active: 4, recovery: 7,
  damage: 30, level: 'overhead', hitstun: 14, blockstun: 10, knockback: { x: 3, y: 0 },
  hitboxes: [tipBox(look, AL_STRIKE, { air: true })],
  strength: 'light', meterGain: 4,
  cancels: { into: ['airHeavy'], until: 15 },
};

const airHeavy: MoveDef = {
  anim: 'abhimanyu.airHeavy', startup: 7, active: 4, recovery: 9,
  damage: 52, level: 'overhead', hitstun: 19, blockstun: 13, knockback: { x: 4.5, y: 2 },
  hitboxes: [tipBox(look, AH_STRIKE, { air: true })],
  strength: 'heavy', meterGain: 7,
};

/** Spinning Edge: a high cut then a low cut, short range. Block the first high, then crouch. */
const specialN: MoveDef = {
  anim: 'abhimanyu.specialN', startup: 8, active: 6, recovery: 20,
  damage: 40, level: 'mid', hitstun: 16, blockstun: 12, knockback: { x: 4, y: 0 },
  hitboxes: [
    tipBox(look, SPIN_A, { from: 9, to: 11, group: 0 }),
    tipBox(look, SPIN_B, { from: 12, to: 14, group: 1 }),
  ],
  strength: 'special', meterGain: 8,
  fx: [{ frame: 9, tag: 'spinArc' }],
};

/** Breakthrough Dash: passes through the opponent and ends behind them, exposed. */
const specialF: MoveDef = {
  anim: 'abhimanyu.specialF', startup: 7, active: 8, recovery: 26,
  damage: 55, level: 'mid', hitstun: 20, blockstun: 14, knockback: { x: 5, y: 0 },
  hitboxes: [tipBox(look, DASH)],
  velocity: [{ from: 5, to: 13, vx: 12 }],
  passThrough: { from: 4, to: 14 },
  strength: 'special', meterGain: 9,
  fx: [{ frame: 5, tag: 'dashStreak' }],
};

/** Formation Breaker: three cuts that push the opponent away; the last has heavy knockback. */
const specialD: MoveDef = {
  anim: 'abhimanyu.specialD', startup: 9, active: 11, recovery: 22,
  damage: 32, level: 'mid', hitstun: 18, blockstun: 13, knockback: { x: 4, y: 0 },
  hitboxes: [
    tipBox(look, SPIN_A, { from: 10, to: 12, group: 0 }),
    tipBox(look, SPIN_B, { from: 14, to: 16, group: 1 }),
    tipBox(look, F3, { from: 18, to: 20, group: 2, knockback: { x: 9, y: 0 } }),
  ],
  strength: 'special', meterGain: 8,
  fx: [{ frame: 18, tag: 'spinArc' }],
};

const RUSH_BOXES = [
  tipBox(look, LUNGE, { from: 51, to: 54, group: 0 }),
  tipBox(look, LUNGE, { from: 59, to: 62, group: 1 }),
  tipBox(look, LUNGE, { from: 67, to: 70, group: 2 }),
  tipBox(look, FINAL, { from: 92, to: 95, group: 3, launches: true, knockback: { x: 4, y: 13 } }),
];

/**
 * Chakravyuha Break: three marked paths are rushed in turn, then a long visible wind-up before
 * the final cut. The final cut can be interrupted or avoided: he is not invulnerable after frame 50.
 */
const ultimate: MoveDef = {
  anim: 'abhimanyu.ultimate', startup: 50, active: 45, recovery: 26,
  damage: 55, level: 'mid', hitstun: 20, blockstun: 14, knockback: { x: 2, y: 0 },
  hitboxes: RUSH_BOXES,
  velocity: [
    { from: 51, to: 54, vx: 9 },
    { from: 59, to: 62, vx: 9 },
    { from: 67, to: 70, vx: 9 },
  ],
  invulnerable: { from: 1, to: 50 },
  strength: 'ultimate', meterGain: 0,
  zone: { kind: 'mark', frame: 2, x: 90, offsets: [0, 80, 160], w: 56, frames: 64, label: 'PATH' },
  fx: [{ frame: 2, tag: 'circleCharge' }, { frame: 51, tag: 'dashStreak' }, { frame: 92, tag: 'finalFlash' }],
};

const throwMove: MoveDef = {
  anim: 'abhimanyu.throw', startup: 5, active: 2, recovery: 20,
  damage: 72, level: 'mid', hitstun: 20, blockstun: 0, knockback: { x: 5, y: 9 },
  hitboxes: [{ x: 0, y: 30, w: 62, h: 128 }],
  strength: 'heavy', meterGain: 8, launches: true, throw: true,
  fx: [{ frame: 6, tag: 'grabFlash' }],
};

const power: MoveDef = {
  anim: 'abhimanyu.power', startup: 16, active: 3, recovery: 22,
  damage: 110, level: 'mid', hitstun: 26, blockstun: 0, knockback: { x: 7, y: 11 },
  hitboxes: [tipBox(look, P_STRIKE)],
  strength: 'heavy', meterGain: 12, launches: true, unblockable: true,
  armor: { from: 1, to: 16 },
  fx: [{ frame: 2, tag: 'powerCharge' }, { frame: 17, tag: 'powerStrike' }],
};

export const ABHIMANYU_DEF: FighterDef = {
  id: 'abhimanyu',
  name: 'Abhimanyu',
  element: 'lightning',
  stats: {
    health: 1250, walkSpeed: 5.4, backSpeed: 4.2, jumpVelocity: 16, jumpForwardSpeed: 5.6, gravity: 0.85,
    width: 58, height: 170, crouchHeight: 100, power: 1.22,
  },
  moves: {
    light, heavy, crouchLight, crouchHeavy, airLight, airHeavy, specialN, specialF, specialD, ultimate,
    throw: throwMove, power,
  },
};

// ---- Visuals -----------------------------------------------------------------------------

export const ABHIMANYU_VISUALS: Readonly<Record<string, VisualSpec>> = {
  spinArc: { kind: 'burst', x: 70, y: 100, radius: 46, rays: 5, life: 10 },
  dashStreak: { kind: 'streak', x: -30, y: 100, length: 230, spread: 70, lines: 5, life: 12 },
  circleCharge: { kind: 'burst', x: 0, y: 100, radius: 70, rays: 8, life: 24 },
  finalFlash: { kind: 'burst', x: 90, y: 110, radius: 64, rays: 8, life: 12 },
  grabFlash: { kind: 'burst', x: 48, y: 108, radius: 28, rays: 6, life: 10 },
  powerCharge: { kind: 'burst', x: 0, y: 96, radius: 64, rays: 8, life: 16 },
  powerStrike: { kind: 'streak', x: -20, y: 106, length: 190, spread: 110, lines: 5 },
};

// ---- Animations --------------------------------------------------------------------------

const walkShape = {
  guard: GUARD,
  lean: -18,
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
  key(10, { y: 80, lean: -6, footF: [34, 0], footB: [-38, 0], handF: [20, 128], handB: [10, 120], weaponDir: 100 }, 'out'),
  key(40, { y: 79, lean: -6, footF: [34, 0], footB: [-38, 0], handF: [20, 128], handB: [10, 120], weaponDir: 100 }),
  key(49, { y: 70, lean: -18, footF: [46, 0], footB: [-42, 0], handF: [26, 108], handB: [12, 104], weaponDir: 20 }, 'in'),
  key(51, LUNGE, 'linear'),
  key(54, LUNGE, 'out'),
  key(57, { y: 74, lean: -16, footF: [48, 0], footB: [-40, 0], handF: [44, 112], handB: [20, 108], weaponDir: 40 }),
  key(59, LUNGE, 'linear'),
  key(62, LUNGE, 'out'),
  key(65, { y: 74, lean: -16, footF: [48, 0], footB: [-40, 0], handF: [44, 112], handB: [20, 108], weaponDir: 40 }),
  key(67, LUNGE, 'linear'),
  key(70, LUNGE, 'out'),
  key(76, FINAL_WIND, 'in'),
  key(88, { ...FINAL_WIND, y: 82 }),
  key(92, FINAL, 'linear'),
  key(95, FINAL, 'out'),
  key(104, { ...FINAL, lean: -20, handF: [48, 96], weaponDir: -55 }),
  key(121, GUARD),
);

const introAnim = anim(
  true,
  key(0, GUARD),
  key(40, { ...GUARD, y: 77, lean: -12, handF: [50, 112], handB: [18, 106], weaponDir: 46 }),
  key(80, GUARD),
);

export const ABHIMANYU_ANIMS: AnimationSet = {
  idle: idleAnim(GUARD, 48, 1.4),
  walk,
  walkBack,
  intro: introAnim,
  'abhimanyu.light': attackAnim(sa(GUARD, L_WIND, L_STRIKE), 4, 2, 8),
  'abhimanyu.heavy': attackAnim(sa(GUARD, H_WIND, H_STRIKE, H_FOLLOW), 9, 3, 15),
  'abhimanyu.crouchLight': attackAnim(sa(CROUCH, CL_WIND, CL_STRIKE), 4, 2, 9),
  'abhimanyu.crouchHeavy': attackAnim(sa(CROUCH, CH_WIND, CH_STRIKE, { ...CH_STRIKE, y: 52, lean: -18, handF: [52, 108], weaponDir: 70 }), 8, 3, 20),
  'abhimanyu.airLight': attackAnim(sa(TUCK, AL_WIND, AL_STRIKE), 4, 4, 7),
  'abhimanyu.airHeavy': attackAnim(sa(TUCK, AH_WIND, AH_STRIKE), 7, 4, 9),
  'abhimanyu.specialN': anim(
    false,
    key(0, GUARD, 'out'),
    key(6, SPIN_WIND, 'in'),
    key(9, SPIN_A, 'linear'),
    key(11, SPIN_A, 'linear'),
    key(12, SPIN_B, 'linear'),
    key(14, SPIN_B, 'out'),
    key(20, { ...SPIN_B, y: 66, lean: -22 }),
    key(34, GUARD),
  ),
  'abhimanyu.specialF': attackAnim(sa(GUARD, DASH_WIND, DASH, { ...DASH, y: 70, lean: -26, footF: [40, 0] }, 4), 7, 8, 26),
  'abhimanyu.specialD': anim(
    false,
    key(0, GUARD, 'out'),
    key(6, SPIN_WIND, 'in'),
    key(10, SPIN_A, 'linear'),
    key(12, SPIN_A, 'linear'),
    key(14, SPIN_B, 'linear'),
    key(16, SPIN_B, 'linear'),
    key(18, F3, 'linear'),
    key(20, F3, 'out'),
    key(28, { ...F3, lean: -20, handF: [48, 100], weaponDir: -20 }),
    key(42, GUARD),
  ),
  'abhimanyu.ultimate': ultimateAnim,
  'abhimanyu.throw': attackAnim(sa(GUARD, { ...T_REACH, lean: -12, handF: [42, 116], handB: [34, 108] }, T_REACH, T_TOSS), 5, 2, 20),
  'abhimanyu.power': attackAnim(sa(GUARD, P_WIND, P_STRIKE, { ...P_STRIKE, lean: -22, handF: [46, 92], weaponDir: -55 }, 9), 16, 3, 22),
};

// ---- Profile -----------------------------------------------------------------------------

export const ABHIMANYU_PROFILE: HeroProfile = {
  title: 'The Circle Breaker',
  identity: 'A fast, aggressive fighter who excels at entering danger and escaping it.',
  bio:
    'Abhimanyu is young, courageous and gifted, and he knows it is a heavy thing to be all three. ' +
    'When allies are trapped inside a shifting ring of warriors, he reads the pattern and signals a coordinated escape. ' +
    'He wants to prove himself, but he learns to trust the team and to plan the way back out as carefully as the way in. ' +
    'In a fight he is the fastest hero: quick sword cuts, dashes that carry him through an opponent, and a rush along three marked paths. ' +
    'Every dash leaves him exposed, because courage without preparation has a cost. His story is told with gravity, never as spectacle.',
  weapons: {
    primary: 'Sword',
    secondary: 'Bow and a round shield',
    note: 'Only the sword is drawn; the shield and bow are part of his profile, not his moves.',
  },
  motif: 'Emerald and silver armour with amber trim, a flowing scarf, wheel-like arcs behind each cut',
  palette: ['emerald', 'silver', 'amber'],
  rhythm: 'Explosive: dash in, a short string, then he must get out',
  poses: {
    intro: 'Points the sword toward the opponent, then glances over his shoulder at his allies',
    victory: 'Sheathes the sword and signals his allies that the way is clear',
  },
  moves: {
    light: info('Quick Cut', 'Light', 'A fast horizontal cut. Short and safe.', 'Block it; he is quick but not strong.'),
    heavy: info('Diagonal Cut', 'Heavy', 'A diagonal cut with a short wind-up.', 'Block the wind-up; he recovers in 15 frames.'),
    crouchLight: info('Low Cut', 'Down + Light', 'A fast low cut. Must be blocked crouching.'),
    crouchHeavy: info('Rising Sweep', 'Down + Heavy', 'A low sweep that launches.', 'Jump it or block crouching.'),
    airLight: info('Air Cut', 'Light in the air', 'A quick cut from a jump.'),
    airHeavy: info('Diving Cut', 'Heavy in the air', 'A downward cut from above. Block standing.'),
    specialN: info('Spinning Edge', 'Special', 'A high cut and then a low cut in one turn. Short range.', 'Block the high cut, then crouch for the low one; he is open afterwards.'),
    specialF: info('Breakthrough Dash', 'Special + forward', 'Dashes through you and ends behind you. Hits on the way through.', 'Block the dash, then punish: he needs 26 frames to recover and faces away.'),
    specialD: info('Formation Breaker', 'Special + down', 'Three quick cuts, high, low, mid; the last pushes you far away.', 'Block all three; the gap before the last cut is short.'),
    ultimate: info('Chakravyuha Break', 'Heavy + Special, full meter', 'Three rushes along marked paths on the floor, then a long wind-up before the final cut.', 'Block the rushes, then hit him during the wind-up or dodge the final cut.'),
    throw: info('Shield Throw', 'Grab, or Light + Heavy', 'A close grab and toss. Cannot be blocked.', 'Jump or dodge when he steps in.'),
    power: info('Charging Cut', 'Hold Power, then release', 'A charged cut with armour during its wind-up. Cannot be blocked.', 'Grab him or dodge; it is slow if it misses.'),
  },
  campaignRole: 'The lead of chapter three, The Broken Formation, where the player learns spacing and escape.',
  relationships: [
    { id: 'arjuna', text: 'Looks up to him and listens when he says to wait for the others.' },
    { id: 'bhima', text: 'Spars with him and learns what it means to hold a line.' },
  ],
  unlock: { kind: 'start', text: 'Available from the start' },
};

export const ABHIMANYU: HeroEntry = {
  def: ABHIMANYU_DEF,
  look: ABHIMANYU_LOOK,
  anims: ABHIMANYU_ANIMS,
  visuals: ABHIMANYU_VISUALS,
  profile: ABHIMANYU_PROFILE,
};
