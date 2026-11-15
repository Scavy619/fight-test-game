// Ghatotkacha, the Night-Born Guardian. A tall, heavy aerial disruptor: a decoy that vanishes
// when struck, a vault over the opponent, a leap onto a marked area, and an ultimate that fills
// the air with decoys while one marked spot shows where the real slam falls. Indigo, violet and
// silver; shadow.
//
// Frame data (advantage = hitstun minus active + recovery): light 6/3/10 +2 hit, heavy 12/4/18 0,
// crouchLight 6/3/11 0, crouchHeavy 11/3/24 launches. His normals are slow and large; the danger
// is the mix-up between the decoy, the vault and the marked slam.
import { BASE_POSES } from '../../render/anims/base';
import type { VisualSpec } from '../../render/moveVisuals';
import { anim, key, type PoseSpec } from '../../render/pose';
import type { AnimationSet, FighterLook } from '../../render/types';
import type { FighterDef, MoveDef } from '../../sim/types';
import { LIGHT_CHAIN, SPECIALS, attackAnim, idleAnim, info, reversedKeys, tipBox, walkKeys } from '../heroKit';
import type { HeroEntry, HeroProfile } from '../types';

export const GHATOTKACHA_LOOK: FighterLook = {
  accent: '#9D7BFF',
  secondary: '#D8DEFF',
  height: 1.15,
  bulk: 1.25,
  headStyle: 'curls',
  ribbon: 'cape',
  weapon: { type: 'mace', length: 112, color: '#B9A6FF' },
};

const { CROUCH, TUCK } = BASE_POSES;
const look = GHATOTKACHA_LOOK;

// ---- Poses -------------------------------------------------------------------------------

/** Tall and loose, the mace resting on a shoulder, one hand open. */
const GUARD: PoseSpec = {
  y: 76, lean: -8, footF: [36, 0], footB: [-42, 0], handF: [34, 104], handB: [22, 112], weaponDir: 74,
};

const L_WIND: PoseSpec = { y: 78, lean: 0, footF: [38, 0], footB: [-42, 0], handF: [14, 126], handB: [28, 114], weaponDir: 140 };
const L_STRIKE: PoseSpec = { y: 72, lean: -20, footF: [56, 0], footB: [-40, 0], handF: [50, 118], handB: [30, 108], weaponDir: 8 };
const L_FOLLOW: PoseSpec = { ...L_STRIKE, handF: [44, 110], weaponDir: -12 };

const H_WIND: PoseSpec = { y: 90, lean: 12, footF: [30, 0], footB: [-40, 0], handF: [6, 192], handB: [-4, 162], weaponDir: 160 };
const H_STRIKE: PoseSpec = { y: 64, lean: -30, footF: [62, 0], footB: [-42, 0], handF: [50, 108], handB: [40, 110], weaponDir: -24 };
const H_FOLLOW: PoseSpec = { ...H_STRIKE, lean: -26, handF: [46, 96], weaponDir: -48 };

const CL_WIND: PoseSpec = { y: 54, lean: -6, footF: [30, 0], footB: [-32, 0], handF: [26, 84], handB: [16, 78], weaponDir: 40 };
const CL_STRIKE: PoseSpec = { y: 48, lean: -24, footF: [52, 0], footB: [-34, 0], handF: [54, 52], handB: [20, 64], weaponDir: -4 };

const CH_WIND: PoseSpec = { y: 60, lean: -2, footF: [30, 0], footB: [-32, 0], handF: [12, 120], handB: [2, 114], weaponDir: 125 };
const CH_STRIKE: PoseSpec = { y: 40, lean: -36, footF: [64, 0], footB: [-44, 0], handF: [62, 32], handB: [-20, 56], weaponDir: 6 };

const AL_WIND: PoseSpec = { ...TUCK, lean: -6, handF: [24, 142], handB: [14, 134], weaponDir: 120 };
const AL_STRIKE: PoseSpec = { ...TUCK, lean: -18, handF: [52, 112], handB: [44, 110], weaponDir: -14 };
const AH_WIND: PoseSpec = { ...TUCK, lean: 8, handF: [4, 184], handB: [-6, 176], weaponDir: 155 };
const AH_STRIKE: PoseSpec = { ...TUCK, lean: -28, upperLegF: -30, lowerLegF: -100, handF: [46, 96], handB: [40, 100], weaponDir: -36 };

/** Phantom Double: both hands open forward, the mace tucked back. */
const CONJURE: PoseSpec = { y: 74, lean: -10, footF: [40, 0], footB: [-42, 0], handF: [68, 122], handB: [58, 114], weaponDir: 100 };
const CONJURE_WIND: PoseSpec = { y: 78, lean: 4, footF: [34, 0], footB: [-42, 0], handF: [28, 134], handB: [18, 126], weaponDir: 100 };

/** Leaps. */
const COIL: PoseSpec = { y: 58, lean: -24, footF: [38, 0], footB: [-44, 0], handF: [12, 112], handB: [-12, 108], weaponDir: 30 };
const LEAP: PoseSpec = {
  y: 104, lean: -4, upperLegF: -60, lowerLegF: -95, upperLegB: -110, lowerLegB: -122, handF: [30, 176], handB: [10, 154], weaponDir: 130,
};
const APEX: PoseSpec = { ...LEAP, handF: [22, 196], handB: [4, 170], weaponDir: 150 };
const DIVE: PoseSpec = { ...LEAP, handF: [40, 150], handB: [24, 134], weaponDir: 60 };
const VAULT: PoseSpec = { ...LEAP, handF: [46, 130], handB: [30, 124], weaponDir: 20 };
const SLAM: PoseSpec = { y: 58, lean: -34, footF: [62, 0], footB: [-44, 0], handF: [50, 100], handB: [40, 104], weaponDir: -56 };
const SLAM_WIND: PoseSpec = { y: 92, lean: 10, footF: [30, 0], footB: [-40, 0], handF: [8, 190], handB: [-4, 162], weaponDir: 160 };

const P_WIND: PoseSpec = { y: 92, lean: 14, footF: [28, 0], footB: [-40, 0], handF: [4, 196], handB: [-6, 166], weaponDir: 162 };
const P_STRIKE: PoseSpec = { y: 64, lean: -32, footF: [64, 0], footB: [-42, 0], handF: [50, 108], handB: [40, 110], weaponDir: -26 };

const T_REACH: PoseSpec = { y: 72, lean: -22, footF: [48, 0], footB: [-40, 0], handF: [68, 116], handB: [60, 108], weaponDir: 100 };
const T_TOSS: PoseSpec = { y: 80, lean: 12, footF: [32, 0], footB: [-44, 0], handF: [8, 182], handB: [-8, 172], weaponDir: 140, elbowF: 1, elbowB: 1 };

// ---- Moves -------------------------------------------------------------------------------

const total = (m: { startup: number; active: number; recovery: number }): number => m.startup + m.active + m.recovery;

const lightBase = { startup: 6, active: 3, recovery: 10 };
const light: MoveDef = {
  anim: 'ghatotkacha.light', ...lightBase,
  damage: 42, level: 'mid', hitstun: 15, blockstun: 10, knockback: { x: 4, y: 0 },
  hitboxes: [tipBox(look, L_STRIKE)],
  strength: 'light', meterGain: 4,
  cancels: { into: LIGHT_CHAIN, until: total(lightBase) },
};

const heavyBase = { startup: 12, active: 4, recovery: 18 };
const heavy: MoveDef = {
  anim: 'ghatotkacha.heavy', ...heavyBase,
  damage: 88, level: 'mid', hitstun: 22, blockstun: 16, knockback: { x: 6.5, y: 0 },
  hitboxes: [tipBox(look, H_STRIKE)],
  strength: 'heavy', meterGain: 9,
  cancels: { into: [...SPECIALS, 'ultimate'], until: total(heavyBase) },
};

const crouchLightBase = { startup: 6, active: 3, recovery: 11 };
const crouchLight: MoveDef = {
  anim: 'ghatotkacha.crouchLight', ...crouchLightBase,
  damage: 36, level: 'low', hitstun: 14, blockstun: 10, knockback: { x: 3, y: 0 },
  hitboxes: [tipBox(look, CL_STRIKE)],
  strength: 'light', meterGain: 4,
  cancels: { into: LIGHT_CHAIN, until: total(crouchLightBase) },
};

const crouchHeavyBase = { startup: 11, active: 3, recovery: 24 };
const crouchHeavy: MoveDef = {
  anim: 'ghatotkacha.crouchHeavy', ...crouchHeavyBase,
  damage: 80, level: 'low', hitstun: 22, blockstun: 14, knockback: { x: 2, y: 10 },
  hitboxes: [tipBox(look, CH_STRIKE)],
  strength: 'heavy', meterGain: 8, launches: true,
  cancels: { into: [...SPECIALS, 'ultimate'], until: total(crouchHeavyBase) },
};

const airLight: MoveDef = {
  anim: 'ghatotkacha.airLight', startup: 5, active: 4, recovery: 9,
  damage: 38, level: 'overhead', hitstun: 14, blockstun: 10, knockback: { x: 3, y: 0 },
  hitboxes: [tipBox(look, AL_STRIKE, { air: true })],
  strength: 'light', meterGain: 4,
  cancels: { into: ['airHeavy'], until: 18 },
};

const airHeavy: MoveDef = {
  anim: 'ghatotkacha.airHeavy', startup: 9, active: 5, recovery: 11,
  damage: 78, level: 'overhead', hitstun: 20, blockstun: 14, knockback: { x: 5, y: 2 },
  hitboxes: [tipBox(look, AH_STRIKE, { air: true })],
  strength: 'heavy', meterGain: 7,
};

/** Phantom Double: a copy of himself stands ahead and vanishes when the opponent strikes it. */
const specialN: MoveDef = {
  anim: 'ghatotkacha.specialN', startup: 14, active: 1, recovery: 24,
  damage: 0, level: 'mid', hitstun: 0, blockstun: 0, knockback: { x: 0, y: 0 },
  hitboxes: [],
  strength: 'special', meterGain: 4,
  zone: { kind: 'decoy', frame: 15, x: 140, w: 74, h: 190, frames: 260, label: 'DOUBLE' },
  fx: [{ frame: 15, tag: 'doubleFlash' }],
};

/** Shadow Leap: a vault forward over the opponent. It does no damage and ends behind them, exposed. */
const specialF: MoveDef = {
  anim: 'ghatotkacha.specialF', startup: 3, active: 1, recovery: 34,
  damage: 0, level: 'mid', hitstun: 0, blockstun: 0, knockback: { x: 0, y: 0 },
  hitboxes: [],
  velocity: [
    { from: 4, to: 4, vx: 9, vy: 12 },
    { from: 5, to: 31, vx: 9 },
  ],
  passThrough: { from: 4, to: 32 },
  strength: 'special', meterGain: 0,
  fx: [{ frame: 4, tag: 'leapTrail' }],
};

/**
 * Nightfall Slam: a leap and a crash on the marked area about 186 px ahead. He is vulnerable in the
 * air. Launch at frame 14 with vy 13 lands at frame 45 (gravity 0.8).
 */
const specialD: MoveDef = {
  anim: 'ghatotkacha.specialD', startup: 44, active: 6, recovery: 26,
  damage: 100, level: 'mid', hitstun: 24, blockstun: 16, knockback: { x: 6, y: 11 },
  hitboxes: [tipBox(look, SLAM, { from: 45, to: 50, group: 0, reach: 20, pad: 40, launches: true })],
  velocity: [
    { from: 14, to: 14, vx: 6, vy: 13 },
    { from: 15, to: 44, vx: 6 },
  ],
  strength: 'special', meterGain: 10, launches: true,
  zone: { kind: 'mark', frame: 2, x: 186, w: 120, frames: 50, label: 'SLAM ZONE' },
  fx: [{ frame: 45, tag: 'slamDust' }],
};

/**
 * Sky of Illusions: the air fills with decoys of him while a marked spot shows where the real
 * slam will fall, directly in front. Decoys vanish when struck; the real slam lands at frame 90.
 */
const ultimate: MoveDef = {
  anim: 'ghatotkacha.ultimate', startup: 50, active: 43, recovery: 30,
  damage: 110, level: 'mid', hitstun: 24, blockstun: 16, knockback: { x: 6, y: 12 },
  hitboxes: [tipBox(look, SLAM, { from: 90, to: 93, group: 0, reach: 20, pad: 40, launches: true })],
  invulnerable: { from: 1, to: 50 },
  strength: 'ultimate', meterGain: 0,
  zone: { kind: 'mark', frame: 52, x: 90, w: 120, frames: 42, label: 'REAL SLAM' },
  extraZones: [{ kind: 'decoy', frame: 52, x: 130, offsets: [0, 100, 200], w: 74, h: 190, frames: 120, label: 'DOUBLE' }],
  fx: [{ frame: 2, tag: 'skyCharge' }, { frame: 90, tag: 'slamDust' }],
};

const throwMove: MoveDef = {
  anim: 'ghatotkacha.throw', startup: 7, active: 2, recovery: 24,
  damage: 105, level: 'mid', hitstun: 22, blockstun: 0, knockback: { x: 6, y: 10 },
  hitboxes: [{ x: 0, y: 30, w: 80, h: 134 }],
  strength: 'heavy', meterGain: 8, launches: true, throw: true,
  fx: [{ frame: 8, tag: 'grabFlash' }],
};

const power: MoveDef = {
  anim: 'ghatotkacha.power', startup: 20, active: 4, recovery: 28,
  damage: 145, level: 'mid', hitstun: 28, blockstun: 0, knockback: { x: 8, y: 12 },
  hitboxes: [tipBox(look, P_STRIKE)],
  strength: 'heavy', meterGain: 12, launches: true, unblockable: true,
  armor: { from: 1, to: 20 },
  fx: [{ frame: 2, tag: 'powerCharge' }, { frame: 21, tag: 'powerStrike' }],
};

export const GHATOTKACHA_DEF: FighterDef = {
  id: 'ghatotkacha',
  name: 'Ghatotkacha',
  element: 'shadow',
  stats: {
    health: 1300, walkSpeed: 3.8, backSpeed: 3.0, jumpVelocity: 16.5, jumpForwardSpeed: 4.6, gravity: 0.8,
    width: 84, height: 202, crouchHeight: 122, power: 1.25,
  },
  moves: {
    light, heavy, crouchLight, crouchHeavy, airLight, airHeavy, specialN, specialF, specialD, ultimate,
    throw: throwMove, power,
  },
};

// ---- Visuals -----------------------------------------------------------------------------

export const GHATOTKACHA_VISUALS: Readonly<Record<string, VisualSpec>> = {
  doubleFlash: { kind: 'burst', x: 140, y: 110, radius: 56, rays: 8, life: 14 },
  leapTrail: { kind: 'streak', x: 0, y: 90, length: 200, spread: 80, lines: 5, life: 12 },
  slamDust: { kind: 'burst', x: 100, y: 14, radius: 70, rays: 8, life: 16 },
  skyCharge: { kind: 'burst', x: 0, y: 120, radius: 90, rays: 10, life: 26 },
  grabFlash: { kind: 'burst', x: 60, y: 112, radius: 34, rays: 6, life: 10 },
  powerCharge: { kind: 'burst', x: 0, y: 110, radius: 76, rays: 8, life: 18 },
  powerStrike: { kind: 'streak', x: -10, y: 114, length: 220, spread: 120, lines: 5 },
};

// ---- Animations --------------------------------------------------------------------------

const walkShape = {
  guard: GUARD,
  lean: -10,
  arms: (swing: number): PoseSpec => ({ handF: [34 + swing * 2, 104], handB: [22 - swing * 5, 112 + Math.abs(swing) * 2] }),
};
const walk = anim(true, ...walkKeys(walkShape));
const walkBack = anim(true, ...reversedKeys(walkKeys({ ...walkShape, lean: -4 })));

const sa = (a: PoseSpec, w: PoseSpec, s: PoseSpec, f?: PoseSpec, wAt?: number) => ({
  guard: a, windup: w, strike: s, follow: f, windupAt: wAt,
});

const ultimateAnim = anim(
  false,
  key(0, GUARD, 'out'),
  key(12, { ...CONJURE_WIND, y: 90, handF: [20, 160] }, 'out'),
  key(40, { ...CONJURE_WIND, y: 90, handF: [20, 160] }),
  key(52, { ...CONJURE, y: 80 }, 'out'),
  key(68, APEX, 'in'),
  key(84, SLAM_WIND, 'in'),
  key(90, SLAM, 'linear'),
  key(93, SLAM, 'out'),
  key(104, { ...SLAM, lean: -26, handF: [46, 96], weaponDir: -40 }),
  key(123, GUARD),
);

const specialDAnim = anim(
  false,
  key(0, GUARD, 'out'),
  key(8, COIL, 'in'),
  key(14, LEAP, 'out'),
  key(30, APEX),
  key(40, DIVE, 'in'),
  key(45, SLAM, 'linear'),
  key(50, SLAM, 'out'),
  key(60, { ...SLAM, lean: -26, handF: [46, 96], weaponDir: -40 }),
  key(76, GUARD),
);

const introAnim = anim(
  true,
  key(0, GUARD),
  key(40, { ...GUARD, y: 78, lean: -6, handF: [36, 106], handB: [66, 120], weaponDir: 72 }),
  key(80, GUARD),
);

export const GHATOTKACHA_ANIMS: AnimationSet = {
  idle: idleAnim(GUARD, 68, 1.6),
  walk,
  walkBack,
  intro: introAnim,
  'ghatotkacha.light': attackAnim(sa(GUARD, L_WIND, L_STRIKE, L_FOLLOW), 6, 3, 10),
  'ghatotkacha.heavy': attackAnim(sa(GUARD, H_WIND, H_STRIKE, H_FOLLOW), 12, 4, 18),
  'ghatotkacha.crouchLight': attackAnim(sa(CROUCH, CL_WIND, CL_STRIKE), 6, 3, 11),
  'ghatotkacha.crouchHeavy': attackAnim(sa(CROUCH, CH_WIND, CH_STRIKE, { ...CH_STRIKE, y: 52, lean: -20, handF: [52, 108], weaponDir: 70 }), 11, 3, 24),
  'ghatotkacha.airLight': attackAnim(sa(TUCK, AL_WIND, AL_STRIKE), 5, 4, 9),
  'ghatotkacha.airHeavy': attackAnim(sa(TUCK, AH_WIND, AH_STRIKE), 9, 5, 11),
  'ghatotkacha.specialN': attackAnim(sa(GUARD, CONJURE_WIND, CONJURE, { ...CONJURE, lean: -6 }, 7), 14, 1, 24),
  'ghatotkacha.specialF': anim(
    false,
    key(0, GUARD, 'out'),
    key(3, COIL, 'in'),
    key(4, VAULT, 'out'),
    key(16, APEX),
    key(30, DIVE),
    key(34, { ...COIL, y: 60 }),
    key(38, GUARD),
  ),
  'ghatotkacha.specialD': specialDAnim,
  'ghatotkacha.ultimate': ultimateAnim,
  'ghatotkacha.throw': attackAnim(sa(GUARD, { ...T_REACH, lean: -12, handF: [46, 120], handB: [38, 112] }, T_REACH, T_TOSS), 7, 2, 24),
  'ghatotkacha.power': attackAnim(sa(GUARD, P_WIND, P_STRIKE, { ...P_STRIKE, lean: -22, handF: [44, 94], weaponDir: -50 }, 11), 20, 4, 28),
};

// ---- Profile -----------------------------------------------------------------------------

export const GHATOTKACHA_PROFILE: HeroProfile = {
  title: 'The Night-Born Guardian',
  identity: 'An unpredictable aerial fighter who mixes decoys, vaults and large, slow impacts.',
  bio:
    'Ghatotkacha is tall and powerful, and has spent his life being looked at warily for it. Under a moonlit sky he shields forest families while illusions draw their pursuers away, ' +
    'and he measures strength by whom it protects. In a fight he is hard to read: a decoy of himself that vanishes when struck, a vault over his opponent, and a crash onto a spot the opponent can see marked on the floor. ' +
    'His story is about family, sacrifice and the price of turning the tide for others. He is steady, gentle with children and calm in the dark, and the heroes learn to trust him because he never asks for more than he gives.',
  weapons: {
    primary: 'Heavy gada',
    secondary: 'Illusion magic',
    note: 'The decoys are fictional game abilities; the gada is the one weapon drawn.',
  },
  motif: 'Indigo and violet armour with star-like silver inlays, a swirling cape, faint afterimages',
  palette: ['indigo', 'violet', 'silver'],
  rhythm: 'Unpredictable: feint with a decoy, vault, then one big impact',
  poses: {
    intro: 'Rises from a towering silhouette to a gentle open hand, guiding people to safety',
    victory: 'Kneels and lays the gada down, then helps the opponent up',
  },
  moves: {
    light: info('Mace Swing', 'Light', 'A wide swing of the gada. Long reach for a light.', 'Block it; he is slow to follow up.'),
    heavy: info('Gada Smash', 'Heavy', 'An overhead smash after a visible wind-up.', 'Block or step back; he is open for 18 frames.'),
    crouchLight: info('Low Swing', 'Down + Light', 'A low swing. Must be blocked crouching.'),
    crouchHeavy: info('Ground Sweep', 'Down + Heavy', 'A slow low sweep that launches.', 'Jump it or block crouching.'),
    airLight: info('Aerial Swing', 'Light in the air', 'A swing from a jump.'),
    airHeavy: info('Dropping Smash', 'Heavy in the air', 'A heavy overhead from above. Block standing.'),
    specialN: info('Phantom Double', 'Special', 'A copy of himself stands ahead. It vanishes the moment you strike it, and it blocks one attack for him.', 'Strike the double with something cheap, or ignore it and look for the real one.'),
    specialF: info('Shadow Leap', 'Special + forward', 'A vault forward over the opponent. It does no damage and he lands exposed behind you.', 'Turn and punish the landing; it has 34 recovery frames.'),
    specialD: info('Nightfall Slam', 'Special + down', 'A leap and a crash onto the marked zone ahead of him.', 'The zone is marked: walk out of it, or hit him while he is in the air.'),
    ultimate: info('Sky of Illusions', 'Heavy + Special, full meter', 'The air fills with decoys of him while one marked spot shows where the real slam lands.', 'Watch the REAL SLAM mark and step out of it; hitting a decoy does nothing to him.'),
    throw: info('Giant\'s Throw', 'Grab, or Light + Heavy', 'A close grab and heavy throw. Cannot be blocked.', 'Jump or dodge when he steps in.'),
    power: info('Night Strike', 'Hold Power, then release', 'A charged gada strike with armour during its wind-up. Cannot be blocked.', 'Grab him or dodge; it is very slow if it misses.'),
  },
  campaignRole: 'The decoy duel of chapter five, The Night of Illusions, where the player learns to read visual tells.',
  relationships: [
    { id: 'bhima', text: 'Looks to him as a protector and teacher.' },
    { id: 'arjuna', text: 'Trusts him with the forest and the people in it.' },
  ],
  unlock: { kind: 'chapter', chapter: 5, text: 'Finish chapter 5: The Night of Illusions' },
};

export const GHATOTKACHA: HeroEntry = {
  def: GHATOTKACHA_DEF,
  look: GHATOTKACHA_LOOK,
  anims: GHATOTKACHA_ANIMS,
  visuals: GHATOTKACHA_VISUALS,
  profile: GHATOTKACHA_PROFILE,
};
