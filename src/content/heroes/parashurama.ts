// Parashurama, the Axe-Bearing Teacher. A grounded weapon master: a wide axe sweep with a long
// visible wind-up, a thrown axe that returns along its line, a defensive stance that halves one
// hit but breaks on a heavy, and an ultimate of four sweeps with safe gaps between them. Ochre,
// forest green and iron; earth.
//
// Frame data (advantage = hitstun minus active + recovery): light 6/3/10 +2 hit, heavy 12/4/18 0,
// crouchLight 6/3/11 0, crouchHeavy 11/3/24 launches. Slow, deliberate and long-reaching: the axe
// out-reaches most swords, and every big move shows a wind-up before it comes.
import { BASE_POSES } from '../../render/anims/base';
import type { VisualSpec } from '../../render/moveVisuals';
import { anim, key, type PoseSpec } from '../../render/pose';
import type { AnimationSet, FighterLook } from '../../render/types';
import type { FighterDef, MoveDef } from '../../sim/types';
import { LIGHT_CHAIN, SPECIALS, attackAnim, idleAnim, info, reversedKeys, tipBox, walkKeys, weaponPoints } from '../heroKit';
import type { HeroEntry, HeroProfile } from '../types';

export const PARASHURAMA_LOOK: FighterLook = {
  accent: '#D9A441',
  secondary: '#6FA86A',
  height: 1.03,
  bulk: 1.05,
  headStyle: 'hermit',
  ribbon: 'shawl',
  weapon: { type: 'axe', length: 128, color: '#C9CED8' },
};

const { CROUCH, TUCK } = BASE_POSES;
const look = PARASHURAMA_LOOK;

// ---- Poses -------------------------------------------------------------------------------

/** Planted and calm, the axe held low across the body, the free hand open. */
const GUARD: PoseSpec = {
  y: 76, lean: -8, footF: [38, 0], footB: [-42, 0], handF: [32, 100], handB: [20, 108], weaponDir: 66,
};

const L_WIND: PoseSpec = { y: 78, lean: -2, footF: [38, 0], footB: [-42, 0], handF: [14, 122], handB: [26, 112], weaponDir: 140 };
const L_STRIKE: PoseSpec = { y: 72, lean: -20, footF: [54, 0], footB: [-38, 0], handF: [50, 114], handB: [30, 106], weaponDir: 6 };
const L_FOLLOW: PoseSpec = { ...L_STRIKE, handF: [44, 106], weaponDir: -14 };

const H_WIND: PoseSpec = { y: 88, lean: 10, footF: [30, 0], footB: [-40, 0], handF: [6, 186], handB: [-4, 158], weaponDir: 160 };
const H_STRIKE: PoseSpec = { y: 64, lean: -30, footF: [60, 0], footB: [-42, 0], handF: [50, 108], handB: [40, 110], weaponDir: -26 };
const H_FOLLOW: PoseSpec = { ...H_STRIKE, lean: -26, handF: [46, 96], weaponDir: -48 };

const CL_WIND: PoseSpec = { y: 54, lean: -6, footF: [30, 0], footB: [-32, 0], handF: [26, 82], handB: [16, 78], weaponDir: 40 };
const CL_STRIKE: PoseSpec = { y: 48, lean: -24, footF: [50, 0], footB: [-34, 0], handF: [52, 52], handB: [20, 64], weaponDir: -4 };

const CH_WIND: PoseSpec = { y: 58, lean: -2, footF: [30, 0], footB: [-32, 0], handF: [12, 118], handB: [2, 112], weaponDir: 125 };
const CH_STRIKE: PoseSpec = { y: 40, lean: -36, footF: [62, 0], footB: [-44, 0], handF: [60, 32], handB: [-20, 56], weaponDir: 6 };

const AL_WIND: PoseSpec = { ...TUCK, lean: -6, handF: [24, 138], handB: [14, 130], weaponDir: 120 };
const AL_STRIKE: PoseSpec = { ...TUCK, lean: -18, handF: [52, 110], handB: [44, 108], weaponDir: -14 };
const AH_WIND: PoseSpec = { ...TUCK, lean: 8, handF: [4, 180], handB: [-6, 172], weaponDir: 155 };
const AH_STRIKE: PoseSpec = { ...TUCK, lean: -28, upperLegF: -30, lowerLegF: -100, handF: [46, 94], handB: [40, 98], weaponDir: -38 };

/** Crescent Axe: a long horizontal sweep from far behind to far in front, shoulders turned. */
const CRESCENT_WIND: PoseSpec = { y: 78, lean: 14, footF: [28, 0], footB: [-44, 0], handF: [-10, 130], handB: [-22, 122], weaponDir: 200 };
const CRESCENT: PoseSpec = { y: 66, lean: -34, footF: [64, 0], footB: [-46, 0], handF: [48, 112], handB: [30, 110], weaponDir: 4 };

/** Return Arc: the axe thrown overhand. */
const THROW_WIND: PoseSpec = { y: 82, lean: 12, footF: [32, 0], footB: [-42, 0], handF: [-4, 170], handB: [10, 150], weaponDir: 150 };
const THROW: PoseSpec = { y: 70, lean: -22, footF: [54, 0], footB: [-40, 0], handF: [58, 140], handB: [40, 128], weaponDir: 30 };

/** Tempered Stance: low and wide, the axe held across the chest. */
const STANCE: PoseSpec = { y: 60, lean: -4, footF: [48, 0], footB: [-52, 0], handF: [34, 110], handB: [14, 112], weaponDir: 88 };

/** Storm of the Parashu: four sweeps, high, wide, low and a final rising cut. */
const S1: PoseSpec = { y: 68, lean: -24, footF: [56, 0], footB: [-42, 0], handF: [50, 116], handB: [30, 110], weaponDir: 8 };
const S2: PoseSpec = { y: 66, lean: -28, footF: [58, 0], footB: [-42, 0], handF: [48, 108], handB: [32, 106], weaponDir: -22 };
const S3: PoseSpec = { y: 54, lean: -32, footF: [60, 0], footB: [-44, 0], handF: [56, 66], handB: [24, 80], weaponDir: -6 };
const S4: PoseSpec = { y: 62, lean: -30, footF: [62, 0], footB: [-44, 0], handF: [50, 108], handB: [40, 110], weaponDir: 40 };
const S_WIND: PoseSpec = { y: 80, lean: 12, footF: [30, 0], footB: [-42, 0], handF: [-6, 150], handB: [-16, 134], weaponDir: 175 };

const P_WIND: PoseSpec = { y: 90, lean: 12, footF: [28, 0], footB: [-40, 0], handF: [4, 190], handB: [-6, 162], weaponDir: 162 };
const P_STRIKE: PoseSpec = { y: 64, lean: -32, footF: [62, 0], footB: [-42, 0], handF: [50, 108], handB: [40, 110], weaponDir: -28 };

const T_REACH: PoseSpec = { y: 72, lean: -22, footF: [48, 0], footB: [-40, 0], handF: [64, 114], handB: [56, 106], weaponDir: 100 };
const T_TOSS: PoseSpec = { y: 80, lean: 10, footF: [32, 0], footB: [-44, 0], handF: [8, 178], handB: [-8, 168], weaponDir: 140, elbowF: 1, elbowB: 1 };

// ---- Moves -------------------------------------------------------------------------------

const total = (m: { startup: number; active: number; recovery: number }): number => m.startup + m.active + m.recovery;

const lightBase = { startup: 6, active: 3, recovery: 10 };
const light: MoveDef = {
  anim: 'parashurama.light', ...lightBase,
  damage: 40, level: 'mid', hitstun: 15, blockstun: 10, knockback: { x: 4, y: 0 },
  hitboxes: [tipBox(look, L_STRIKE)],
  strength: 'light', meterGain: 4,
  cancels: { into: LIGHT_CHAIN, until: total(lightBase) },
};

const heavyBase = { startup: 12, active: 4, recovery: 18 };
const heavy: MoveDef = {
  anim: 'parashurama.heavy', ...heavyBase,
  damage: 85, level: 'mid', hitstun: 22, blockstun: 16, knockback: { x: 6.5, y: 0 },
  hitboxes: [tipBox(look, H_STRIKE)],
  strength: 'heavy', meterGain: 9,
  cancels: { into: [...SPECIALS, 'ultimate'], until: total(heavyBase) },
};

const crouchLightBase = { startup: 6, active: 3, recovery: 11 };
const crouchLight: MoveDef = {
  anim: 'parashurama.crouchLight', ...crouchLightBase,
  damage: 34, level: 'low', hitstun: 14, blockstun: 10, knockback: { x: 3, y: 0 },
  hitboxes: [tipBox(look, CL_STRIKE)],
  strength: 'light', meterGain: 4,
  cancels: { into: LIGHT_CHAIN, until: total(crouchLightBase) },
};

const crouchHeavyBase = { startup: 11, active: 3, recovery: 24 };
const crouchHeavy: MoveDef = {
  anim: 'parashurama.crouchHeavy', ...crouchHeavyBase,
  damage: 76, level: 'low', hitstun: 22, blockstun: 14, knockback: { x: 2.5, y: 10 },
  hitboxes: [tipBox(look, CH_STRIKE)],
  strength: 'heavy', meterGain: 8, launches: true,
  cancels: { into: [...SPECIALS, 'ultimate'], until: total(crouchHeavyBase) },
};

const airLight: MoveDef = {
  anim: 'parashurama.airLight', startup: 5, active: 4, recovery: 9,
  damage: 36, level: 'overhead', hitstun: 14, blockstun: 10, knockback: { x: 3, y: 0 },
  hitboxes: [tipBox(look, AL_STRIKE, { air: true })],
  strength: 'light', meterGain: 4,
  cancels: { into: ['airHeavy'], until: 18 },
};

const airHeavy: MoveDef = {
  anim: 'parashurama.airHeavy', startup: 9, active: 4, recovery: 11,
  damage: 70, level: 'overhead', hitstun: 20, blockstun: 14, knockback: { x: 5, y: 2 },
  hitboxes: [tipBox(look, AH_STRIKE, { air: true })],
  strength: 'heavy', meterGain: 7,
};

/**
 * Return Arc: the axe is thrown, hits on the way out and again on the way back, and returns to
 * his hand. While it is away the axe is not drawn in his hand. It travels along its line.
 */
const throwHand = weaponPoints(look, THROW).hand;
const specialN: MoveDef = {
  anim: 'parashurama.specialN', startup: 14, active: 1, recovery: 38,
  damage: 42, level: 'mid', hitstun: 18, blockstun: 12, knockback: { x: 4, y: 0 },
  hitboxes: [],
  strength: 'special', meterGain: 7,
  hideWeapon: true,
  projectile: {
    frame: 15, x: throwHand.x, y: throwHand.y, vx: 11, vy: 0, w: 70, h: 64,
    damage: 42, lifetime: 140, hitstun: 18, blockstun: 12, knockback: { x: 4, y: 0 }, level: 'mid',
    behavior: 'returning', range: 300, hits: 2,
  },
  fx: [{ frame: 15, tag: 'throwFlash' }],
};

/** Crescent Axe: a wide sweep with a long, visible wind-up. */
const specialF: MoveDef = {
  anim: 'parashurama.specialF', startup: 16, active: 4, recovery: 24,
  damage: 90, level: 'mid', hitstun: 22, blockstun: 15, knockback: { x: 7, y: 0 },
  hitboxes: [tipBox(look, CRESCENT, { pad: 40, reach: 14 })],
  strength: 'special', meterGain: 10,
  fx: [{ frame: 17, tag: 'crescentArc' }],
};

/** Tempered Stance: halves the next hit. A heavy or an ultimate breaks it and lands in full. */
const specialD: MoveDef = {
  anim: 'parashurama.specialD', startup: 12, active: 1, recovery: 30,
  damage: 0, level: 'mid', hitstun: 0, blockstun: 0, knockback: { x: 0, y: 0 },
  hitboxes: [],
  grants: { shield: 'halve', frames: 150, breaksOn: ['heavy', 'ultimate'], label: 'TEMPERED STANCE' },
  strength: 'special', meterGain: 0,
  fx: [{ frame: 13, tag: 'stanceGlow' }],
};

/** Storm of the Parashu: four sweeps with gaps of nine to thirteen frames between them. */
const ultimate: MoveDef = {
  anim: 'parashurama.ultimate', startup: 50, active: 45, recovery: 28,
  damage: 62, level: 'mid', hitstun: 22, blockstun: 14, knockback: { x: 2, y: 0 },
  hitboxes: [
    tipBox(look, S1, { from: 52, to: 54, group: 0, pad: 30 }),
    tipBox(look, S2, { from: 64, to: 66, group: 1, pad: 30 }),
    tipBox(look, S3, { from: 76, to: 78, group: 2, pad: 30 }),
    tipBox(look, S4, { from: 92, to: 95, group: 3, pad: 30, launches: true, knockback: { x: 4, y: 13 } }),
  ],
  invulnerable: { from: 1, to: 50 },
  strength: 'ultimate', meterGain: 0,
  fx: [{ frame: 2, tag: 'stormCharge' }, { frame: 92, tag: 'stormFinish' }],
};

const throwMove: MoveDef = {
  anim: 'parashurama.throw', startup: 6, active: 2, recovery: 24,
  damage: 100, level: 'mid', hitstun: 22, blockstun: 0, knockback: { x: 6, y: 10 },
  hitboxes: [{ x: 0, y: 30, w: 76, h: 130 }],
  strength: 'heavy', meterGain: 8, launches: true, throw: true,
  fx: [{ frame: 7, tag: 'grabFlash' }],
};

const power: MoveDef = {
  anim: 'parashurama.power', startup: 20, active: 4, recovery: 28,
  damage: 140, level: 'mid', hitstun: 28, blockstun: 0, knockback: { x: 8, y: 12 },
  hitboxes: [tipBox(look, P_STRIKE)],
  strength: 'heavy', meterGain: 12, launches: true, unblockable: true,
  armor: { from: 1, to: 20 },
  fx: [{ frame: 2, tag: 'powerCharge' }, { frame: 21, tag: 'powerStrike' }],
};

export const PARASHURAMA_DEF: FighterDef = {
  id: 'parashurama',
  name: 'Parashurama',
  element: 'earth',
  stats: {
    health: 800, walkSpeed: 4.0, backSpeed: 3.2, jumpVelocity: 14.5, jumpForwardSpeed: 4.2, gravity: 0.85,
    width: 70, height: 186, crouchHeight: 110, power: 0.8,
  },
  moves: {
    light, heavy, crouchLight, crouchHeavy, airLight, airHeavy, specialN, specialF, specialD, ultimate,
    throw: throwMove, power,
  },
};

// ---- Visuals -----------------------------------------------------------------------------

export const PARASHURAMA_VISUALS: Readonly<Record<string, VisualSpec>> = {
  throwFlash: { kind: 'burst', x: throwHand.x, y: throwHand.y, radius: 26, rays: 6, life: 10 },
  crescentArc: { kind: 'streak', x: 20, y: 112, length: 220, spread: 90, lines: 5, life: 12 },
  stanceGlow: { kind: 'burst', x: 0, y: 100, radius: 74, rays: 8, life: 20 },
  stormCharge: { kind: 'burst', x: 0, y: 110, radius: 84, rays: 8, life: 24 },
  stormFinish: { kind: 'burst', x: 100, y: 120, radius: 76, rays: 8, life: 14 },
  grabFlash: { kind: 'burst', x: 56, y: 110, radius: 30, rays: 6, life: 10 },
  powerCharge: { kind: 'burst', x: 0, y: 100, radius: 72, rays: 8, life: 18 },
  powerStrike: { kind: 'streak', x: -10, y: 112, length: 210, spread: 120, lines: 5 },
};

// ---- Animations --------------------------------------------------------------------------

const walkShape = {
  guard: GUARD,
  lean: -10,
  arms: (swing: number): PoseSpec => ({ handF: [32 + swing * 2, 100], handB: [20 - swing * 4, 108 + Math.abs(swing)] }),
};
const walk = anim(true, ...walkKeys(walkShape));
const walkBack = anim(true, ...reversedKeys(walkKeys({ ...walkShape, lean: -4 })));

const sa = (a: PoseSpec, w: PoseSpec, s: PoseSpec, f?: PoseSpec, wAt?: number) => ({
  guard: a, windup: w, strike: s, follow: f, windupAt: wAt,
});

const ultimateAnim = anim(
  false,
  key(0, GUARD, 'out'),
  key(10, S_WIND, 'out'),
  key(40, { ...S_WIND, y: 79 }),
  key(50, { ...S_WIND, y: 76, lean: 6 }, 'in'),
  key(52, S1, 'linear'),
  key(54, S1, 'out'),
  key(59, { ...S_WIND, y: 74, lean: 8, handF: [0, 140], weaponDir: 190 }, 'in'),
  key(64, S2, 'linear'),
  key(66, S2, 'out'),
  key(71, { ...S_WIND, y: 72, lean: 6, handF: [4, 120], weaponDir: 195 }, 'in'),
  key(76, S3, 'linear'),
  key(78, S3, 'out'),
  key(86, { ...S_WIND, y: 84, lean: 10, handF: [0, 150], handB: [-10, 134], weaponDir: -20 }, 'in'),
  key(92, S4, 'linear'),
  key(95, S4, 'out'),
  key(104, { ...S4, lean: -22, weaponDir: 70 }),
  key(123, GUARD),
);

const introAnim = anim(
  true,
  key(0, GUARD),
  key(40, { ...GUARD, y: 75, lean: -6, handF: [34, 102], handB: [22, 110], weaponDir: 70 }),
  key(80, GUARD),
);

export const PARASHURAMA_ANIMS: AnimationSet = {
  idle: idleAnim(GUARD, 72, 1.5),
  walk,
  walkBack,
  intro: introAnim,
  'parashurama.light': attackAnim(sa(GUARD, L_WIND, L_STRIKE, L_FOLLOW), 6, 3, 10),
  'parashurama.heavy': attackAnim(sa(GUARD, H_WIND, H_STRIKE, H_FOLLOW), 12, 4, 18),
  'parashurama.crouchLight': attackAnim(sa(CROUCH, CL_WIND, CL_STRIKE), 6, 3, 11),
  'parashurama.crouchHeavy': attackAnim(sa(CROUCH, CH_WIND, CH_STRIKE, { ...CH_STRIKE, y: 52, lean: -20, handF: [50, 108], weaponDir: 70 }), 11, 3, 24),
  'parashurama.airLight': attackAnim(sa(TUCK, AL_WIND, AL_STRIKE), 5, 4, 9),
  'parashurama.airHeavy': attackAnim(sa(TUCK, AH_WIND, AH_STRIKE), 9, 4, 11),
  'parashurama.specialN': attackAnim(sa(GUARD, THROW_WIND, THROW, { ...THROW, lean: -14, handF: [50, 120] }, 9), 14, 1, 38),
  'parashurama.specialF': attackAnim(sa(GUARD, CRESCENT_WIND, CRESCENT, { ...CRESCENT, lean: -26, handF: [42, 100], weaponDir: -30 }, 9), 16, 4, 24),
  'parashurama.specialD': attackAnim(sa(GUARD, { ...STANCE, y: 70, lean: -6 }, STANCE, { ...STANCE, y: 62 }, 6), 12, 1, 30),
  'parashurama.ultimate': ultimateAnim,
  'parashurama.throw': attackAnim(sa(GUARD, { ...T_REACH, lean: -12, handF: [44, 118], handB: [36, 110] }, T_REACH, T_TOSS), 6, 2, 24),
  'parashurama.power': attackAnim(sa(GUARD, P_WIND, P_STRIKE, { ...P_STRIKE, lean: -22, handF: [44, 94], weaponDir: -50 }, 11), 20, 4, 28),
};

// ---- Profile -----------------------------------------------------------------------------

export const PARASHURAMA_PROFILE: HeroProfile = {
  title: 'The Axe-Bearing Teacher',
  identity: 'A grounded weapon master with broad axe reach and strong counters.',
  bio:
    'Parashurama is austere, patient and formidable. He returns from his hermitage to train the younger heroes after recognising the signs of a power he once believed contained, ' +
    'and he warns that mastery without judgment can destroy what it intends to protect. His intro shows a teacher choosing to guide before he draws the axe. ' +
    'In a fight he is deliberate: a wide sweep with a long visible wind-up, a thrown axe that returns along its line, a tempered stance that halves one blow but breaks on a heavy one, ' +
    'and a storm of four sweeps with safe gaps between them. He is concerned rather than angry, and he teaches by letting others find the opening.',
  weapons: {
    primary: 'Parashu (battle axe)',
    secondary: 'Bow and disciplined martial skill',
    note: 'The bow is part of his profile; the axe is the one weapon drawn, and it is not in his hand while it is thrown.',
  },
  motif: 'Ochre robes and iron-banded armour, a long beard and tied hair, earth-coloured dust trails',
  palette: ['ochre', 'forest green', 'iron'],
  rhythm: 'Deliberate: a wind-up you can read, then one broad, committed stroke',
  poses: {
    intro: 'Stands with the axe grounded, one hand raised in a calm, teaching gesture',
    victory: 'Rests the axe against his shoulder and nods to the opponent as a teacher would',
  },
  moves: {
    light: info('Axe Chop', 'Light', 'A short chop with good reach.', 'Block it; he is slow to follow up.'),
    heavy: info('Haft Smash', 'Heavy', 'An overhead smash after a visible wind-up.', 'Block or step back; he is open for 18 frames.'),
    crouchLight: info('Low Chop', 'Down + Light', 'A low chop. Must be blocked crouching.'),
    crouchHeavy: info('Ground Sweep', 'Down + Heavy', 'A slow low sweep that launches.', 'Jump it or block crouching.'),
    airLight: info('Air Chop', 'Light in the air', 'A chop from a jump.'),
    airHeavy: info('Diving Chop', 'Heavy in the air', 'A steep chop from above. Block standing.'),
    specialN: info('Return Arc', 'Special', 'He throws the axe. It hits on the way out and again on the way back, and he is unarmed while it is away.', 'Jump it on the way out, then rush him while he waits for it to return.'),
    specialF: info('Crescent Axe', 'Special + forward', 'A very wide sweep with a long, visible wind-up.', 'Step back out of its reach during the wind-up and punish the recovery.'),
    specialD: info('Tempered Stance', 'Special + down', 'A low stance that halves the next hit. A heavy or an ultimate breaks it and lands in full.', 'Hit him with a heavy; a light or a projectile is wasted.'),
    ultimate: info('Storm of the Parashu', 'Heavy + Special, full meter', 'Four sweeps: high, wide, low, then a launching rising cut, with a gap of ten frames or more between them.', 'Block the first, then use each gap to step away or jump the low sweep.'),
    throw: info('Teacher\'s Throw', 'Grab, or Light + Heavy', 'A close grab and toss. Cannot be blocked.', 'Jump or dodge when he steps in.'),
    power: info('Parashu Strike', 'Hold Power, then release', 'A charged axe strike with armour during its wind-up. Cannot be blocked.', 'Grab him or dodge; it is very slow if it misses.'),
  },
  campaignRole: 'The lead of chapter six, The Vow and the Weapon, and a teacher who returns to train the younger heroes.',
  relationships: [
    { id: 'karna', text: 'Once taught him, and carries that history with him.' },
    { id: 'arjuna', text: 'Warns him that mastery without judgment can destroy what it protects.' },
  ],
  unlock: { kind: 'start', text: 'Available from the start' },
};

export const PARASHURAMA: HeroEntry = {
  def: PARASHURAMA_DEF,
  look: PARASHURAMA_LOOK,
  anims: PARASHURAMA_ANIMS,
  visuals: PARASHURAMA_VISUALS,
  profile: PARASHURAMA_PROFILE,
  projectiles: {
    specialN: { kind: 'axe', length: 52 },
  },
  hideWeaponWhileProjectile: ['specialN'],
};
