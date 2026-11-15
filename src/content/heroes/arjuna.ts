// Arjuna, the Astra-Bound Archer. Precision zoner: patient spacing, charged shots, a lane
// barrage ultimate with a long warning. Indigo, bronze and saffron; wind.
//
// Frame data (advantage = hitstun or blockstun minus active + recovery, hit on the first
// active frame): light 5/2/9 +1 hit, heavy 11/3/16 +1, crouchLight 5/2/10 0, crouchHeavy 9/3/20
// launches. No normal links into itself. Normals are weaker than most heroes: the bow is for
// space, not for trading. Specials are punishable: Arrow Volley 14 startup / 24 recovery,
// Piercing Astra 26 startup (a long visible draw) / 28 recovery.
import { BASE_POSES } from '../../render/anims/base';
import type { VisualSpec } from '../../render/moveVisuals';
import { anim, key, type PoseSpec } from '../../render/pose';
import type { AnimationSet, FighterLook } from '../../render/types';
import type { FighterDef, MoveDef } from '../../sim/types';
import { LIGHT_CHAIN, SPECIALS, attackAnim, idleAnim, info, reversedKeys, tipBox, walkKeys, weaponPoints } from '../heroKit';
import type { HeroEntry, HeroProfile } from '../types';

export const ARJUNA_LOOK: FighterLook = {
  accent: '#7C8CFF',
  secondary: '#FFB347',
  height: 1,
  bulk: 0.9,
  headStyle: 'topknot',
  ribbon: 'quiver',
  weapon: { type: 'bow', length: 112, color: '#E8C27A' },
};

const { CROUCH, TUCK } = BASE_POSES;

// ---- Poses -------------------------------------------------------------------------------

/** Side-on archer's stance: bow arm forward and high, string hand drawn back, bow upright. */
const GUARD: PoseSpec = {
  y: 80, lean: -6, footF: [30, 0], footB: [-34, 0], handF: [46, 126], handB: [12, 120], weaponDir: 86,
};

const L_WIND: PoseSpec = { y: 82, lean: 4, footF: [34, 0], footB: [-34, 0], handF: [26, 118], handB: [-4, 112], weaponDir: 120 };
const L_STRIKE: PoseSpec = { y: 78, lean: -18, footF: [44, 0], footB: [-32, 0], handF: [60, 118], handB: [-16, 108], weaponDir: 10 };
const L_FOLLOW: PoseSpec = { ...L_STRIKE, handF: [54, 112], weaponDir: -14 };

const H_WIND: PoseSpec = { y: 90, lean: 8, head: 84, footF: [28, 0], footB: [-32, 0], handF: [8, 176], handB: [-6, 168], weaponDir: 150 };
const H_STRIKE: PoseSpec = { y: 74, lean: -26, footF: [50, 0], footB: [-32, 0], handF: [56, 110], handB: [44, 112], weaponDir: -28 };
const H_FOLLOW: PoseSpec = { ...H_STRIKE, lean: -22, handF: [50, 96], weaponDir: -50 };

const CL_WIND: PoseSpec = { y: 54, lean: -8, footF: [28, 0], footB: [-28, 0], handF: [28, 78], handB: [16, 74], weaponDir: 40 };
const CL_STRIKE: PoseSpec = { y: 48, lean: -22, footF: [44, 0], footB: [-28, 0], handF: [62, 52], handB: [-4, 66], weaponDir: -4 };

const CH_WIND: PoseSpec = { y: 58, lean: -2, footF: [28, 0], footB: [-30, 0], handF: [14, 116], handB: [4, 112], weaponDir: 125 };
const CH_STRIKE: PoseSpec = { y: 40, lean: -32, footF: [58, 0], footB: [-38, 0], handF: [64, 34], handB: [-22, 58], weaponDir: 8 };

const AL_WIND: PoseSpec = { ...TUCK, lean: -6, handF: [26, 138], handB: [16, 132], weaponDir: 110 };
const AL_STRIKE: PoseSpec = { ...TUCK, lean: -18, handF: [56, 112], handB: [44, 110], weaponDir: -16 };
const AH_WIND: PoseSpec = { ...TUCK, lean: 8, handF: [4, 180], handB: [-6, 172], weaponDir: 150 };
const AH_STRIKE: PoseSpec = { ...TUCK, lean: -28, upperLegF: -30, lowerLegF: -100, handF: [50, 92], handB: [40, 98], weaponDir: -40 };

/** Release pose: bow arm extended, string hand snapped forward after the shot. */
const SHOOT: PoseSpec = { y: 80, lean: -8, footF: [34, 0], footB: [-34, 0], handF: [72, 128], handB: [30, 124], weaponDir: 88 };
const DRAW: PoseSpec = { y: 80, lean: -4, footF: [30, 0], footB: [-34, 0], handF: [64, 128], handB: [-6, 124], weaponDir: 88 };
const DRAW_FULL: PoseSpec = { ...DRAW, handB: [-16, 124], y: 79, lean: -2 };
const STEP_BACK: PoseSpec = { y: 70, lean: 8, footF: [8, 0], footB: [-44, 0], handF: [58, 124], handB: [20, 120], weaponDir: 88 };

const P_WIND: PoseSpec = { y: 92, lean: 10, head: 84, footF: [26, 0], footB: [-32, 0], handF: [4, 182], handB: [-6, 174], weaponDir: 150 };
const P_STRIKE: PoseSpec = { y: 72, lean: -28, footF: [52, 0], footB: [-32, 0], handF: [58, 108], handB: [46, 110], weaponDir: -32 };

const T_REACH: PoseSpec = { y: 78, lean: -24, footF: [46, 0], footB: [-30, 0], handF: [62, 118], handB: [54, 110], weaponDir: 96 };
const T_TOSS: PoseSpec = { y: 82, lean: 10, footF: [30, 0], footB: [-40, 0], handF: [10, 176], handB: [-6, 168], weaponDir: 130, elbowF: 1, elbowB: 1 };

const AIM_UP: PoseSpec = { y: 84, lean: 10, head: 80, footF: [26, 0], footB: [-34, 0], handF: [34, 150], handB: [4, 140], weaponDir: 100 };

// ---- Moves -------------------------------------------------------------------------------

const look = ARJUNA_LOOK;
const total = (m: { startup: number; active: number; recovery: number }): number => m.startup + m.active + m.recovery;

const lightBase = { startup: 5, active: 2, recovery: 9 };
const light: MoveDef = {
  anim: 'arjuna.light', ...lightBase,
  damage: 28, level: 'mid', hitstun: 15, blockstun: 10, knockback: { x: 3, y: 0 },
  hitboxes: [tipBox(look, L_STRIKE)],
  strength: 'light', meterGain: 4,
  cancels: { into: LIGHT_CHAIN, until: total(lightBase) },
};

const heavyBase = { startup: 11, active: 3, recovery: 16 };
const heavy: MoveDef = {
  anim: 'arjuna.heavy', ...heavyBase,
  damage: 62, level: 'mid', hitstun: 20, blockstun: 14, knockback: { x: 5, y: 0 },
  hitboxes: [tipBox(look, H_STRIKE)],
  strength: 'heavy', meterGain: 8,
  cancels: { into: [...SPECIALS, 'ultimate'], until: total(heavyBase) },
};

const crouchLightBase = { startup: 5, active: 2, recovery: 10 };
const crouchLight: MoveDef = {
  anim: 'arjuna.crouchLight', ...crouchLightBase,
  damage: 24, level: 'low', hitstun: 14, blockstun: 10, knockback: { x: 2.5, y: 0 },
  hitboxes: [tipBox(look, CL_STRIKE)],
  strength: 'light', meterGain: 4,
  cancels: { into: LIGHT_CHAIN, until: total(crouchLightBase) },
};

const crouchHeavyBase = { startup: 9, active: 3, recovery: 20 };
const crouchHeavy: MoveDef = {
  anim: 'arjuna.crouchHeavy', ...crouchHeavyBase,
  damage: 56, level: 'low', hitstun: 22, blockstun: 12, knockback: { x: 2.5, y: 10 },
  hitboxes: [tipBox(look, CH_STRIKE)],
  strength: 'heavy', meterGain: 8, launches: true,
  cancels: { into: [...SPECIALS, 'ultimate'], until: total(crouchHeavyBase) },
};

const airLight: MoveDef = {
  anim: 'arjuna.airLight', startup: 5, active: 4, recovery: 8,
  damage: 30, level: 'overhead', hitstun: 14, blockstun: 10, knockback: { x: 3, y: 0 },
  hitboxes: [tipBox(look, AL_STRIKE, { air: true })],
  strength: 'light', meterGain: 4,
  cancels: { into: ['airHeavy'], until: 17 },
};

const airHeavy: MoveDef = {
  anim: 'arjuna.airHeavy', startup: 8, active: 4, recovery: 10,
  damage: 54, level: 'overhead', hitstun: 19, blockstun: 13, knockback: { x: 4.5, y: 2 },
  hitboxes: [tipBox(look, AH_STRIKE, { air: true })],
  strength: 'heavy', meterGain: 7,
};

/** Arrow Volley: a fan of quick arrows (one wide projectile); weak at long range because it expires. */
const volleyHand = weaponPoints(look, SHOOT).hand;
const specialN: MoveDef = {
  anim: 'arjuna.specialN', startup: 14, active: 1, recovery: 24,
  damage: 30, level: 'mid', hitstun: 13, blockstun: 10, knockback: { x: 3.5, y: 0 },
  hitboxes: [],
  strength: 'special', meterGain: 6,
  projectile: {
    frame: 15, x: volleyHand.x, y: volleyHand.y, vx: 15, vy: 0, w: 58, h: 62,
    damage: 30, lifetime: 52, hitstun: 13, blockstun: 10, knockback: { x: 3.5, y: 0 }, level: 'mid',
  },
  fx: [{ frame: 15, tag: 'volleyFan' }],
};

/** Piercing Astra: a long visible draw, then a narrow fast shot that a late guard does not stop. */
const astraHand = weaponPoints(look, SHOOT).hand;
const specialF: MoveDef = {
  anim: 'arjuna.specialF', startup: 26, active: 1, recovery: 28,
  damage: 78, level: 'mid', hitstun: 18, blockstun: 13, knockback: { x: 5, y: 0 },
  hitboxes: [],
  strength: 'special', meterGain: 10,
  piercesLateGuard: 10,
  projectile: {
    frame: 27, x: astraHand.x, y: astraHand.y, vx: 24, vy: 0, w: 76, h: 20,
    damage: 78, lifetime: 46, hitstun: 18, blockstun: 13, knockback: { x: 5, y: 0 }, level: 'mid',
  },
  fx: [{ frame: 4, tag: 'astraCharge' }, { frame: 27, tag: 'astraRelease' }],
};

/** Archer's Step: an invulnerable backward evade that keeps the bow aimed. */
const specialD: MoveDef = {
  anim: 'arjuna.specialD', startup: 2, active: 1, recovery: 21,
  damage: 0, level: 'mid', hitstun: 0, blockstun: 0, knockback: { x: 0, y: 0 },
  hitboxes: [],
  velocity: [{ from: 3, to: 12, vx: -9 }],
  invulnerable: { from: 3, to: 12 },
  strength: 'special', meterGain: 0,
  fx: [{ frame: 3, tag: 'stepTrail' }],
};

/**
 * Celestial Salvo: a skyward shot, then three arrow lanes mark the floor around the opponent's
 * position. The warning lasts 56 frames; the gaps between lanes are wide enough to stand in.
 */
const ultimate: MoveDef = {
  anim: 'arjuna.ultimate', startup: 54, active: 1, recovery: 60,
  damage: 85, level: 'mid', hitstun: 22, blockstun: 16, knockback: { x: 5, y: 10 },
  hitboxes: [],
  invulnerable: { from: 1, to: 54 },
  strength: 'ultimate', meterGain: 0,
  zone: {
    kind: 'strike', frame: 56, x: 'opponent', offsets: [-150, 0, 150], w: 56, frames: 64, strikeAt: 56,
    damage: 85, hitstun: 22, knockback: { x: 5, y: 10 }, launches: true, strength: 'ultimate', label: 'ARROWS FALL',
  },
  fx: [{ frame: 2, tag: 'salvoCharge' }, { frame: 55, tag: 'skyShot' }],
};

/** Grab (light + heavy or the grab button): collar grip and a hip toss, 66 px reach, unblockable. */
const throwMove: MoveDef = {
  anim: 'arjuna.throw', startup: 6, active: 2, recovery: 22,
  damage: 80, level: 'mid', hitstun: 20, blockstun: 0, knockback: { x: 5, y: 9 },
  hitboxes: [{ x: 0, y: 30, w: 66, h: 130 }],
  strength: 'heavy', meterGain: 8, launches: true, throw: true,
  fx: [{ frame: 7, tag: 'grabFlash' }],
};

/** Power strike: the bow swung like a club after an armoured wind-up; unblockable. */
const power: MoveDef = {
  anim: 'arjuna.power', startup: 18, active: 3, recovery: 24,
  damage: 120, level: 'mid', hitstun: 26, blockstun: 0, knockback: { x: 7, y: 11 },
  hitboxes: [tipBox(look, P_STRIKE)],
  strength: 'heavy', meterGain: 12, launches: true, unblockable: true,
  armor: { from: 1, to: 18 },
  fx: [{ frame: 2, tag: 'powerCharge' }, { frame: 19, tag: 'powerStrike' }],
};

export const ARJUNA_DEF: FighterDef = {
  id: 'arjuna',
  name: 'Arjuna',
  element: 'wind',
  stats: {
    health: 900, walkSpeed: 4.6, backSpeed: 3.8, jumpVelocity: 15.5, jumpForwardSpeed: 5.0, gravity: 0.85,
    width: 62, height: 178, crouchHeight: 106,
  },
  moves: {
    light, heavy, crouchLight, crouchHeavy, airLight, airHeavy, specialN, specialF, specialD, ultimate,
    throw: throwMove, power,
  },
};

// ---- Visuals -----------------------------------------------------------------------------

export const ARJUNA_VISUALS: Readonly<Record<string, VisualSpec>> = {
  volleyFan: { kind: 'streak', x: volleyHand.x, y: volleyHand.y, length: 150, spread: 120, lines: 7, life: 10 },
  astraCharge: { kind: 'burst', x: 60, y: 126, radius: 26, rays: 6, life: 22 },
  astraRelease: { kind: 'streak', x: astraHand.x, y: astraHand.y, length: 220, spread: 24, lines: 3, life: 8 },
  stepTrail: { kind: 'streak', x: 0, y: 90, length: -120, spread: 70, lines: 5, life: 10 },
  salvoCharge: { kind: 'burst', x: 34, y: 150, radius: 40, rays: 8, life: 24 },
  skyShot: { kind: 'column', x: 34, width: 22, height: 560 },
  grabFlash: { kind: 'burst', x: 50, y: 110, radius: 30, rays: 6, life: 10 },
  powerCharge: { kind: 'burst', x: 0, y: 100, radius: 70, rays: 8, life: 18 },
  powerStrike: { kind: 'streak', x: -20, y: 110, length: 200, spread: 120, lines: 5 },
};

// ---- Animations --------------------------------------------------------------------------

const walkShape = {
  guard: GUARD,
  lean: -8,
  arms: (swing: number): PoseSpec => ({ handF: [46 + swing * 3, 126], handB: [12 - swing * 3, 120] }),
};
const walk = anim(true, ...walkKeys(walkShape));
const walkBack = anim(true, ...reversedKeys(walkKeys({ ...walkShape, lean: -2 })));

const sa = (a: PoseSpec, w: PoseSpec, s: PoseSpec, f?: PoseSpec, wAt?: number) => ({
  guard: a, windup: w, strike: s, follow: f, windupAt: wAt,
});

const ultimateAnim = anim(
  false,
  key(0, GUARD, 'out'),
  key(8, AIM_UP, 'out'),
  key(30, { ...AIM_UP, y: 83 }),
  key(50, { ...AIM_UP, handB: [-14, 146], lean: 12 }, 'in'),
  key(55, { ...AIM_UP, lean: 6, handB: [34, 150] }, 'out'),
  key(62, { ...AIM_UP, lean: 6, handB: [34, 150] }),
  key(80, { ...GUARD, y: 82 }),
  key(115, GUARD),
);

const introAnim = anim(
  true,
  key(0, { ...GUARD, handF: [50, 128], weaponDir: 88 }),
  key(40, { ...GUARD, y: 79, lean: -4, handF: [54, 132], handB: [6, 126], weaponDir: 92 }),
  key(80, { ...GUARD, handF: [50, 128], weaponDir: 88 }),
);

export const ARJUNA_ANIMS: AnimationSet = {
  idle: idleAnim(GUARD),
  walk,
  walkBack,
  intro: introAnim,
  'arjuna.light': attackAnim(sa(GUARD, L_WIND, L_STRIKE, L_FOLLOW), 5, 2, 9),
  'arjuna.heavy': attackAnim(sa(GUARD, H_WIND, H_STRIKE, H_FOLLOW), 11, 3, 16),
  'arjuna.crouchLight': attackAnim(sa(CROUCH, CL_WIND, CL_STRIKE), 5, 2, 10),
  'arjuna.crouchHeavy': attackAnim(sa(CROUCH, CH_WIND, CH_STRIKE, { ...CH_STRIKE, y: 52, lean: -18, handF: [52, 108], weaponDir: 70 }), 9, 3, 20),
  'arjuna.airLight': attackAnim(sa(TUCK, AL_WIND, AL_STRIKE), 5, 4, 8),
  'arjuna.airHeavy': attackAnim(sa(TUCK, AH_WIND, AH_STRIKE), 8, 4, 10),
  'arjuna.specialN': attackAnim(sa(GUARD, DRAW, SHOOT, { ...SHOOT, lean: -4, handB: [34, 120] }, 7), 14, 1, 24),
  'arjuna.specialF': attackAnim(sa(GUARD, DRAW_FULL, SHOOT, { ...SHOOT, lean: -4, handB: [34, 120] }, 14), 26, 1, 28),
  'arjuna.specialD': attackAnim(sa(GUARD, { ...GUARD, y: 74, lean: 2 }, STEP_BACK, { ...STEP_BACK, y: 72 }, 1), 2, 1, 21),
  'arjuna.ultimate': ultimateAnim,
  'arjuna.throw': attackAnim(sa(GUARD, { ...T_REACH, lean: -14, handF: [44, 122], handB: [36, 114] }, T_REACH, T_TOSS), 6, 2, 22),
  'arjuna.power': attackAnim(sa(GUARD, P_WIND, P_STRIKE, { ...P_STRIKE, lean: -20, handF: [48, 94], weaponDir: -55 }, 10), 18, 3, 24),
};

// ---- Profile -----------------------------------------------------------------------------

export const ARJUNA_PROFILE: HeroProfile = {
  title: 'The Astra-Bound Archer',
  identity: 'A mobile ranged specialist who rewards spacing, aim and patience.',
  bio:
    'Arjuna is a gifted archer who has trained until the Gandiva feels like an extension of his own judgment. ' +
    'When a corrupted weapon blast threatens an ancient forest, he refuses to fire blindly: he traces the disturbance, ' +
    'weighs skill against responsibility, and lowers his bow to shield the trees before pursuing the source. ' +
    'He fights from a distance, rewarding patience and clean spacing, and keeps a short blade for the moments his guard is breached. ' +
    'His chapter tests whether he can act with resolve without losing compassion. Quiet doubts surface before each duel, ' +
    'and he answers them with focus and humility, never with boasting.',
  weapons: {
    primary: 'Gandiva bow',
    secondary: 'Celestial arrows and a short blade',
    note: 'Close normals are drawn as bow-limb strikes; the arrows are projectiles and the blade is described rather than drawn.',
  },
  motif: 'Indigo and bronze armour, saffron sash, a quiver on the back, faint wind-lines on every shot',
  palette: ['indigo', 'bronze', 'saffron'],
  rhythm: 'Patient: step back, draw, release; short bursts then space again',
  poses: {
    intro: 'Stands side-on with the bow upright, head turned toward the opponent, one slow breath',
    victory: 'Lowers the bow and bows his head to the opponent',
  },
  moves: {
    light: info('Bow Strike', 'Light', 'A quick backhand with the bow limb. Short reach, fast recovery.', 'Block it; it is weak and leaves him close to you.'),
    heavy: info('Limb Chop', 'Heavy', 'A downward chop with a visible wind-up above his head.', 'Dodge or block the wind-up; he is open for 16 frames after.'),
    crouchLight: info('Low Tap', 'Down + Light', 'A low poke at the shins. It must be blocked crouching.'),
    crouchHeavy: info('Sweep', 'Down + Heavy', 'A low sweep that launches. Slow to start.', 'Jump over it or block crouching.'),
    airLight: info('Air Smack', 'Light in the air', 'A quick overhead smack from a jump.'),
    airHeavy: info('Diving Chop', 'Heavy in the air', 'A downward chop from above. Overhead: block standing.'),
    specialN: info('Arrow Volley', 'Special', 'A fan of quick arrows that fades after a short distance, so it is strongest up close.', 'Block it, jump it, or stay far away; he recovers slowly.'),
    specialF: info('Piercing Astra', 'Special + forward', 'He draws for almost half a second, then fires one narrow, fast arrow. A guard raised only at the last moment does not stop it.', 'Raise your guard early, jump it, or step out during the long draw.'),
    specialD: info('Archer\'s Step', 'Special + down', 'An invulnerable backward evade that keeps the bow aimed. It does no damage.', 'He lands in the open; punish the recovery.'),
    ultimate: info('Celestial Salvo', 'Heavy + Special, full meter', 'A skyward shot, then three arrow lanes mark the floor around you. The strike lands after a long visible warning.', 'Walk into the gap between two lanes, or jump or dodge as they land.'),
    throw: info('Collar Throw', 'Grab, or Light + Heavy', 'A close grab and hip toss. Cannot be blocked.', 'Jump or dodge when he steps in.'),
    power: info('Bow Bash', 'Hold Power, then release', 'A charged bow-limb smash with armour during its wind-up. Cannot be blocked.', 'Grab him or hit him with a heavy to break the rhythm; it is very slow if it misses.'),
  },
  campaignRole: 'The lead of the campaign. His doubts and choices frame the story; his rival is Karna.',
  relationships: [
    { id: 'karna', text: 'Rival with a shared past; each sees what the other was denied.' },
    { id: 'bhima', text: 'A trusted sparring partner and the hero he trains beside.' },
    { id: 'ekalavya', text: 'Meets him in the forest and has to decide whether to challenge him or listen first.' },
  ],
  unlock: { kind: 'start', text: 'Available from the start' },
};

export const ARJUNA: HeroEntry = {
  def: ARJUNA_DEF,
  look: ARJUNA_LOOK,
  anims: ARJUNA_ANIMS,
  visuals: ARJUNA_VISUALS,
  profile: ARJUNA_PROFILE,
  projectiles: {
    specialN: { kind: 'arrow', length: 46 },
    specialF: { kind: 'arrow', length: 84, color: '#FFFFFF' },
  },
};

