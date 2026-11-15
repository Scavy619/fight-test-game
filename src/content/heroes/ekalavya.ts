// Ekalavya, the Self-Taught Archer. Mobile archer who controls space with traps: quick low-damage
// arrows, a slow-field snare, a back-step that shoots, and a net of slowing ground plus arrow
// lanes. Moss, bark and copper; wind.
//
// Frame data (advantage = hitstun minus active + recovery): light 4/2/8 +3 hit, heavy 9/3/15 +2,
// crouchLight 4/2/9 +2, crouchHeavy 8/3/19 launches. Faster and lighter than Arjuna: his normals
// are knife-quick pokes, his damage comes from arrows and from traps that make you walk slowly.
import { BASE_POSES } from '../../render/anims/base';
import type { VisualSpec } from '../../render/moveVisuals';
import { anim, key, type PoseSpec } from '../../render/pose';
import type { AnimationSet, FighterLook } from '../../render/types';
import type { FighterDef, MoveDef } from '../../sim/types';
import { LIGHT_CHAIN, SPECIALS, attackAnim, idleAnim, info, reversedKeys, tipBox, walkKeys, weaponPoints } from '../heroKit';
import type { HeroEntry, HeroProfile } from '../types';

export const EKALAVYA_LOOK: FighterLook = {
  accent: '#8FD65A',
  secondary: '#D98C4A',
  height: 0.97,
  bulk: 0.88,
  headStyle: 'braid',
  ribbon: 'quiver',
  weapon: { type: 'bow', length: 106, color: '#C58A52' },
};

const { CROUCH, TUCK } = BASE_POSES;
const look = EKALAVYA_LOOK;

// ---- Poses -------------------------------------------------------------------------------

/** Low hunter's stance: knees bent, bow arm forward, weight ready to spring back. */
const GUARD: PoseSpec = {
  y: 72, lean: -12, footF: [34, 0], footB: [-38, 0], handF: [48, 118], handB: [14, 112], weaponDir: 80,
};

const L_WIND: PoseSpec = { y: 74, lean: -2, footF: [36, 0], footB: [-36, 0], handF: [30, 112], handB: [4, 106], weaponDir: 110 };
const L_STRIKE: PoseSpec = { y: 70, lean: -22, footF: [48, 0], footB: [-34, 0], handF: [56, 112], handB: [4, 102], weaponDir: 6 };

const H_WIND: PoseSpec = { y: 82, lean: 6, head: 84, footF: [32, 0], footB: [-34, 0], handF: [14, 160], handB: [2, 152], weaponDir: 140 };
const H_STRIKE: PoseSpec = { y: 66, lean: -28, footF: [52, 0], footB: [-34, 0], handF: [54, 104], handB: [40, 106], weaponDir: -26 };
const H_FOLLOW: PoseSpec = { ...H_STRIKE, handF: [48, 92], weaponDir: -48 };

const CL_WIND: PoseSpec = { y: 52, lean: -8, footF: [30, 0], footB: [-30, 0], handF: [30, 74], handB: [18, 70], weaponDir: 40 };
const CL_STRIKE: PoseSpec = { y: 46, lean: -24, footF: [46, 0], footB: [-30, 0], handF: [58, 48], handB: [-2, 62], weaponDir: -2 };

const CH_WIND: PoseSpec = { y: 56, lean: -4, footF: [30, 0], footB: [-30, 0], handF: [14, 108], handB: [4, 102], weaponDir: 120 };
const CH_STRIKE: PoseSpec = { y: 38, lean: -34, footF: [58, 0], footB: [-38, 0], handF: [62, 32], handB: [-18, 54], weaponDir: 8 };

const AL_WIND: PoseSpec = { ...TUCK, lean: -6, handF: [26, 134], handB: [16, 128], weaponDir: 110 };
const AL_STRIKE: PoseSpec = { ...TUCK, lean: -18, handF: [54, 108], handB: [42, 106], weaponDir: -14 };
const AH_WIND: PoseSpec = { ...TUCK, lean: 8, handF: [4, 176], handB: [-6, 168], weaponDir: 150 };
const AH_STRIKE: PoseSpec = { ...TUCK, lean: -28, upperLegF: -30, lowerLegF: -100, handF: [48, 90], handB: [38, 96], weaponDir: -40 };

/** Quick snap shot from the hunter's stance. */
const SHOOT: PoseSpec = { y: 72, lean: -14, footF: [36, 0], footB: [-36, 0], handF: [70, 118], handB: [30, 114], weaponDir: 84 };
const DRAW: PoseSpec = { y: 72, lean: -10, footF: [32, 0], footB: [-36, 0], handF: [62, 118], handB: [-4, 114], weaponDir: 84 };
const SNARE: PoseSpec = { y: 48, lean: -26, footF: [50, 0], footB: [-34, 0], handF: [74, 44], handB: [30, 60], weaponDir: -50 };
const STEP_BACK: PoseSpec = { y: 66, lean: 10, footF: [10, 0], footB: [-46, 0], handF: [56, 116], handB: [18, 112], weaponDir: 84 };
const STEP_SHOT: PoseSpec = { y: 70, lean: 4, footF: [20, 0], footB: [-40, 0], handF: [66, 120], handB: [34, 116], weaponDir: 86 };
const NET_UP: PoseSpec = { y: 78, lean: 8, head: 82, footF: [30, 0], footB: [-36, 0], handF: [36, 146], handB: [6, 136], weaponDir: 100 };

const P_WIND: PoseSpec = { y: 86, lean: 8, head: 84, footF: [28, 0], footB: [-34, 0], handF: [4, 170], handB: [-6, 162], weaponDir: 150 };
const P_STRIKE: PoseSpec = { y: 64, lean: -30, footF: [54, 0], footB: [-34, 0], handF: [56, 102], handB: [44, 104], weaponDir: -30 };

const T_REACH: PoseSpec = { y: 70, lean: -22, footF: [46, 0], footB: [-30, 0], handF: [60, 112], handB: [52, 104], weaponDir: 96 };
const T_TOSS: PoseSpec = { y: 76, lean: 10, footF: [30, 0], footB: [-40, 0], handF: [10, 168], handB: [-6, 160], weaponDir: 130, elbowF: 1, elbowB: 1 };

// ---- Moves -------------------------------------------------------------------------------

const total = (m: { startup: number; active: number; recovery: number }): number => m.startup + m.active + m.recovery;

const lightBase = { startup: 4, active: 2, recovery: 8 };
const light: MoveDef = {
  anim: 'ekalavya.light', ...lightBase,
  damage: 24, level: 'mid', hitstun: 13, blockstun: 9, knockback: { x: 3, y: 0 },
  hitboxes: [tipBox(look, L_STRIKE)],
  strength: 'light', meterGain: 4,
  cancels: { into: LIGHT_CHAIN, until: total(lightBase) },
};

const heavyBase = { startup: 9, active: 3, recovery: 15 };
const heavy: MoveDef = {
  anim: 'ekalavya.heavy', ...heavyBase,
  damage: 52, level: 'mid', hitstun: 20, blockstun: 13, knockback: { x: 5, y: 0 },
  hitboxes: [tipBox(look, H_STRIKE)],
  strength: 'heavy', meterGain: 8,
  cancels: { into: [...SPECIALS, 'ultimate'], until: total(heavyBase) },
};

const crouchLightBase = { startup: 4, active: 2, recovery: 9 };
const crouchLight: MoveDef = {
  anim: 'ekalavya.crouchLight', ...crouchLightBase,
  damage: 22, level: 'low', hitstun: 13, blockstun: 9, knockback: { x: 2.5, y: 0 },
  hitboxes: [tipBox(look, CL_STRIKE)],
  strength: 'light', meterGain: 4,
  cancels: { into: LIGHT_CHAIN, until: total(crouchLightBase) },
};

const crouchHeavyBase = { startup: 8, active: 3, recovery: 19 };
const crouchHeavy: MoveDef = {
  anim: 'ekalavya.crouchHeavy', ...crouchHeavyBase,
  damage: 50, level: 'low', hitstun: 22, blockstun: 12, knockback: { x: 2.5, y: 10 },
  hitboxes: [tipBox(look, CH_STRIKE)],
  strength: 'heavy', meterGain: 8, launches: true,
  cancels: { into: [...SPECIALS, 'ultimate'], until: total(crouchHeavyBase) },
};

const airLight: MoveDef = {
  anim: 'ekalavya.airLight', startup: 4, active: 4, recovery: 7,
  damage: 26, level: 'overhead', hitstun: 14, blockstun: 10, knockback: { x: 3, y: 0 },
  hitboxes: [tipBox(look, AL_STRIKE, { air: true })],
  strength: 'light', meterGain: 4,
  cancels: { into: ['airHeavy'], until: 15 },
};

const airHeavy: MoveDef = {
  anim: 'ekalavya.airHeavy', startup: 7, active: 4, recovery: 9,
  damage: 46, level: 'overhead', hitstun: 19, blockstun: 13, knockback: { x: 4.5, y: 2 },
  hitboxes: [tipBox(look, AH_STRIKE, { air: true })],
  strength: 'heavy', meterGain: 7,
};

/** Swift Arrow: a fast, low-damage arrow with a short wind-up. */
const shotHand = weaponPoints(look, SHOOT).hand;
const specialN: MoveDef = {
  anim: 'ekalavya.specialN', startup: 10, active: 1, recovery: 18,
  damage: 34, level: 'mid', hitstun: 14, blockstun: 10, knockback: { x: 3.5, y: 0 },
  hitboxes: [],
  strength: 'special', meterGain: 6,
  projectile: {
    frame: 11, x: shotHand.x, y: shotHand.y, vx: 19, vy: 0, w: 40, h: 14,
    damage: 34, lifetime: 70, hitstun: 14, blockstun: 10, knockback: { x: 3.5, y: 0 }, level: 'mid',
  },
  fx: [{ frame: 11, tag: 'swiftFlash' }],
};

/** Snare: a handmade trap on the ground ahead. Walking through it is half speed; it does no damage. */
const specialF: MoveDef = {
  anim: 'ekalavya.specialF', startup: 12, active: 1, recovery: 30,
  damage: 0, level: 'mid', hitstun: 0, blockstun: 0, knockback: { x: 0, y: 0 },
  hitboxes: [],
  strength: 'special', meterGain: 4,
  zone: { kind: 'slow', frame: 13, x: 190, w: 170, frames: 170, slowFactor: 0.5, label: 'SNARE' },
  fx: [{ frame: 13, tag: 'snareFlash' }],
};

/** Hunter's Step: a quick back-step that fires an arrow as he lands. */
const stepHand = weaponPoints(look, STEP_SHOT).hand;
const specialD: MoveDef = {
  anim: 'ekalavya.specialD', startup: 3, active: 1, recovery: 24,
  damage: 30, level: 'mid', hitstun: 13, blockstun: 10, knockback: { x: 3, y: 0 },
  hitboxes: [],
  velocity: [{ from: 4, to: 11, vx: -8 }],
  strength: 'special', meterGain: 5,
  projectile: {
    frame: 14, x: stepHand.x, y: stepHand.y, vx: 17, vy: 0, w: 38, h: 14,
    damage: 30, lifetime: 70, hitstun: 13, blockstun: 10, knockback: { x: 3, y: 0 }, level: 'mid',
  },
  fx: [{ frame: 4, tag: 'stepDust' }, { frame: 14, tag: 'swiftFlash' }],
};

/**
 * Warden's Net: the ground around you slows while two arrow lanes warn and fall on either side of
 * you. A stationary opponent is hit by both; walking out of the net (at half speed) or jumping avoids them.
 */
const ultimate: MoveDef = {
  anim: 'ekalavya.ultimate', startup: 52, active: 1, recovery: 58,
  damage: 55, level: 'mid', hitstun: 22, blockstun: 16, knockback: { x: 5, y: 10 },
  hitboxes: [],
  invulnerable: { from: 1, to: 52 },
  strength: 'ultimate', meterGain: 0,
  zone: { kind: 'slow', frame: 54, x: 'opponent', w: 380, frames: 150, slowFactor: 0.45, label: 'NET' },
  extraZones: [
    {
      kind: 'strike', frame: 54, x: 'opponent', offsets: [-50, 50], w: 56, frames: 64, strikeAt: 60,
      damage: 55, hitstun: 22, knockback: { x: 5, y: 10 }, launches: true, strength: 'ultimate', label: 'ARROWS FALL',
    },
  ],
  fx: [{ frame: 2, tag: 'netCharge' }, { frame: 53, tag: 'skyShot' }],
};

const throwMove: MoveDef = {
  anim: 'ekalavya.throw', startup: 5, active: 2, recovery: 20,
  damage: 70, level: 'mid', hitstun: 20, blockstun: 0, knockback: { x: 5, y: 9 },
  hitboxes: [{ x: 0, y: 30, w: 62, h: 128 }],
  strength: 'heavy', meterGain: 8, launches: true, throw: true,
  fx: [{ frame: 6, tag: 'grabFlash' }],
};

const power: MoveDef = {
  anim: 'ekalavya.power', startup: 16, active: 3, recovery: 22,
  damage: 105, level: 'mid', hitstun: 26, blockstun: 0, knockback: { x: 7, y: 11 },
  hitboxes: [tipBox(look, P_STRIKE)],
  strength: 'heavy', meterGain: 12, launches: true, unblockable: true,
  armor: { from: 1, to: 16 },
  fx: [{ frame: 2, tag: 'powerCharge' }, { frame: 17, tag: 'powerStrike' }],
};

export const EKALAVYA_DEF: FighterDef = {
  id: 'ekalavya',
  name: 'Ekalavya',
  element: 'wind',
  stats: {
    health: 950, walkSpeed: 5.0, backSpeed: 4.0, jumpVelocity: 15, jumpForwardSpeed: 5.2, gravity: 0.85,
    width: 60, height: 172, crouchHeight: 102,
  },
  moves: {
    light, heavy, crouchLight, crouchHeavy, airLight, airHeavy, specialN, specialF, specialD, ultimate,
    throw: throwMove, power,
  },
};

// ---- Visuals -----------------------------------------------------------------------------

export const EKALAVYA_VISUALS: Readonly<Record<string, VisualSpec>> = {
  swiftFlash: { kind: 'burst', x: shotHand.x, y: shotHand.y, radius: 18, rays: 4, life: 8 },
  snareFlash: { kind: 'burst', x: 190, y: 8, radius: 44, rays: 6, life: 14 },
  stepDust: { kind: 'streak', x: 0, y: 30, length: -110, spread: 40, lines: 4, life: 10 },
  netCharge: { kind: 'burst', x: 30, y: 146, radius: 44, rays: 8, life: 24 },
  skyShot: { kind: 'column', x: 36, width: 20, height: 560 },
  grabFlash: { kind: 'burst', x: 48, y: 108, radius: 28, rays: 6, life: 10 },
  powerCharge: { kind: 'burst', x: 0, y: 96, radius: 64, rays: 8, life: 16 },
  powerStrike: { kind: 'streak', x: -20, y: 106, length: 190, spread: 110, lines: 5 },
};

// ---- Animations --------------------------------------------------------------------------

const walkShape = {
  guard: GUARD,
  lean: -14,
  arms: (swing: number): PoseSpec => ({ handF: [48 + swing * 3, 118], handB: [14 - swing * 3, 112] }),
};
const walk = anim(true, ...walkKeys(walkShape));
const walkBack = anim(true, ...reversedKeys(walkKeys({ ...walkShape, lean: -6 })));

const sa = (a: PoseSpec, w: PoseSpec, s: PoseSpec, f?: PoseSpec, wAt?: number) => ({
  guard: a, windup: w, strike: s, follow: f, windupAt: wAt,
});

const ultimateAnim = anim(
  false,
  key(0, GUARD, 'out'),
  key(8, NET_UP, 'out'),
  key(30, { ...NET_UP, y: 77 }),
  key(50, { ...NET_UP, handB: [-12, 142], lean: 12 }, 'in'),
  key(53, { ...NET_UP, lean: 6, handB: [34, 144] }, 'out'),
  key(62, { ...NET_UP, lean: 6, handB: [34, 144] }),
  key(84, { ...GUARD, y: 74 }),
  key(111, GUARD),
);

const introAnim = anim(
  true,
  key(0, GUARD),
  key(40, { ...GUARD, y: 71, lean: -10, handF: [52, 120], handB: [10, 114], weaponDir: 84 }),
  key(80, GUARD),
);

export const EKALAVYA_ANIMS: AnimationSet = {
  idle: idleAnim(GUARD, 52, 1.4),
  walk,
  walkBack,
  intro: introAnim,
  'ekalavya.light': attackAnim(sa(GUARD, L_WIND, L_STRIKE), 4, 2, 8),
  'ekalavya.heavy': attackAnim(sa(GUARD, H_WIND, H_STRIKE, H_FOLLOW), 9, 3, 15),
  'ekalavya.crouchLight': attackAnim(sa(CROUCH, CL_WIND, CL_STRIKE), 4, 2, 9),
  'ekalavya.crouchHeavy': attackAnim(sa(CROUCH, CH_WIND, CH_STRIKE, { ...CH_STRIKE, y: 50, lean: -18, handF: [50, 104], weaponDir: 70 }), 8, 3, 19),
  'ekalavya.airLight': attackAnim(sa(TUCK, AL_WIND, AL_STRIKE), 4, 4, 7),
  'ekalavya.airHeavy': attackAnim(sa(TUCK, AH_WIND, AH_STRIKE), 7, 4, 9),
  'ekalavya.specialN': attackAnim(sa(GUARD, DRAW, SHOOT, { ...SHOOT, lean: -10, handB: [34, 112] }, 5), 10, 1, 18),
  'ekalavya.specialF': attackAnim(sa(GUARD, { ...GUARD, y: 58, lean: -18 }, SNARE, { ...SNARE, y: 52 }, 6), 12, 1, 30),
  'ekalavya.specialD': attackAnim(sa(GUARD, { ...GUARD, y: 68, lean: 4 }, STEP_BACK, STEP_SHOT, 2), 3, 1, 24),
  'ekalavya.ultimate': ultimateAnim,
  'ekalavya.throw': attackAnim(sa(GUARD, { ...T_REACH, lean: -12, handF: [42, 116], handB: [34, 108] }, T_REACH, T_TOSS), 5, 2, 20),
  'ekalavya.power': attackAnim(sa(GUARD, P_WIND, P_STRIKE, { ...P_STRIKE, lean: -22, handF: [46, 90], weaponDir: -52 }, 9), 16, 3, 22),
};

// ---- Profile -----------------------------------------------------------------------------

export const EKALAVYA_PROFILE: HeroProfile = {
  title: 'The Self-Taught Archer',
  identity: 'A mobile archer who controls the ground with traps and quick arrows.',
  bio:
    'Ekalavya taught himself the bow in the deep forest, one patient season at a time, and trusts what his own hands have made. ' +
    'When he sees that weapon corruption is poisoning the woodland communities around him, he marks a safe route and organises an evacuation before he joins the heroes. ' +
    'In a fight he keeps moving: quick arrows, a snare that slows the ground, a back-step that shoots as it lands, and a net that closes the arena around his opponent. ' +
    'His story is about discipline, protecting a community, and the right of the people affected to decide what happens next.',
  weapons: {
    primary: 'Handmade bow',
    secondary: 'Crafted arrows and a utility knife',
    note: 'Close normals are drawn as quick bow-limb pokes; arrows are projectiles and the knife is described, not drawn.',
  },
  motif: 'Moss and bark layers with copper fittings, a woven quiver, leaf-green wind trails',
  palette: ['moss green', 'bark brown', 'copper'],
  rhythm: 'Mobile: step, shoot, set a trap, step away',
  poses: {
    intro: 'Crouches low with the bow ready and checks the ground ahead before he looks up',
    victory: 'Kneels to unstring his bow, then offers the opponent water',
  },
  moves: {
    light: info('Quick Poke', 'Light', 'A fast poke with the bow limb. Short reach.', 'Block it; it does little damage.'),
    heavy: info('Limb Strike', 'Heavy', 'A downward strike with a short wind-up.', 'Block the wind-up; he recovers in 15 frames.'),
    crouchLight: info('Low Poke', 'Down + Light', 'A fast low poke. Must be blocked crouching.'),
    crouchHeavy: info('Trip Sweep', 'Down + Heavy', 'A low sweep that launches.', 'Jump it or block crouching.'),
    airLight: info('Air Poke', 'Light in the air', 'A quick poke from a jump.'),
    airHeavy: info('Air Strike', 'Heavy in the air', 'A downward strike from above. Block standing.'),
    specialN: info('Swift Arrow', 'Special', 'A fast, low-damage arrow with a short wind-up and a quick recovery.', 'Block it, jump it, or close the distance.'),
    specialF: info('Snare', 'Special + forward', 'Sets a trap on the ground ahead. Anyone inside walks at half speed for a few seconds. It does no damage.', 'Jump over it or walk around it; the real danger is the arrow that follows.'),
    specialD: info('Hunter\'s Step', 'Special + down', 'A quick back-step that fires an arrow as he lands.', 'Block the arrow; he is exposed during the step.'),
    ultimate: info('Warden\'s Net', 'Heavy + Special, full meter', 'The ground around you slows, and two arrow lanes warn before they strike.', 'Stand between the lanes, or jump as they land.'),
    throw: info('Forester\'s Throw', 'Grab, or Light + Heavy', 'A close grab and toss. Cannot be blocked.', 'Jump or dodge when he steps in.'),
    power: info('Bow Bash', 'Hold Power, then release', 'A charged bow-limb strike with armour during its wind-up. Cannot be blocked.', 'Grab him or dodge; it is slow if it misses.'),
  },
  campaignRole: 'Met in the forest in chapter two; the player chooses whether to challenge him or listen first.',
  relationships: [
    { id: 'arjuna', text: 'Meets him on the forest path; their first exchange is a test of trust.' },
    { id: 'karna', text: 'Shares a quiet understanding with him about earning a place rather than being given one.' },
  ],
  unlock: { kind: 'chapter', chapter: 2, text: 'Finish chapter 2: The Forest Path' },
};

export const EKALAVYA: HeroEntry = {
  def: EKALAVYA_DEF,
  look: EKALAVYA_LOOK,
  anims: EKALAVYA_ANIMS,
  visuals: EKALAVYA_VISUALS,
  profile: EKALAVYA_PROFILE,
  projectiles: {
    specialN: { kind: 'arrow', length: 40 },
    specialD: { kind: 'arrow', length: 38 },
  },
};
