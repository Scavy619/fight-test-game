// Bhima, the Mountain's Strength. Slow close-range bruiser: heavy pressure, a command grab with
// a long tell, big recoveries that can be punished. Forest green, bronze and stone; earth.
//
// Frame data (advantage = hitstun or blockstun minus active + recovery): light 7/3/11 +1 hit,
// heavy 13/4/20 +1, crouchLight 7/3/11 0, crouchHeavy 12/3/26 launches. No normal links into
// itself. Earthsplitter and Iron Grip are slow and clearly telegraphed; Shoulder Rush has armour
// only on its first active frames and can be dodged or grabbed out of.
import { BASE_POSES } from '../../render/anims/base';
import type { VisualSpec } from '../../render/moveVisuals';
import { anim, key, type PoseSpec } from '../../render/pose';
import type { AnimationSet, FighterLook } from '../../render/types';
import type { FighterDef, MoveDef } from '../../sim/types';
import { LIGHT_CHAIN, SPECIALS, attackAnim, idleAnim, info, reversedKeys, tipBox, walkKeys, weaponPoints } from '../heroKit';
import type { HeroEntry, HeroProfile } from '../types';

export const BHIMA_LOOK: FighterLook = {
  accent: '#5FBF6E',
  secondary: '#D1A04A',
  height: 1.08,
  bulk: 1.3,
  headStyle: 'curls',
  ribbon: 'sash',
  weapon: { type: 'mace', length: 104, color: '#D1A04A' },
};

const { CROUCH, TUCK } = BASE_POSES;
const look = BHIMA_LOOK;

// ---- Poses -------------------------------------------------------------------------------

/** Wide grounded stance, the gada shouldered, the free fist forward. */
const GUARD: PoseSpec = {
  y: 72, lean: -10, footF: [38, 0], footB: [-44, 0], handF: [34, 102], handB: [22, 112], weaponDir: 72,
};

const L_WIND: PoseSpec = { y: 74, lean: 0, footF: [36, 0], footB: [-44, 0], handF: [14, 124], handB: [28, 112], weaponDir: 140 };
const L_STRIKE: PoseSpec = { y: 68, lean: -20, footF: [56, 0], footB: [-40, 0], handF: [54, 118], handB: [30, 108], weaponDir: 8 };
const L_FOLLOW: PoseSpec = { ...L_STRIKE, handF: [48, 110], weaponDir: -14 };

const H_WIND: PoseSpec = { y: 86, lean: 12, footF: [30, 0], footB: [-40, 0], handF: [6, 190], handB: [-4, 160], weaponDir: 160 };
const H_STRIKE: PoseSpec = { y: 62, lean: -30, footF: [62, 0], footB: [-42, 0], handF: [54, 108], handB: [42, 110], weaponDir: -22 };
const H_FOLLOW: PoseSpec = { ...H_STRIKE, lean: -26, handF: [48, 96], weaponDir: -48 };

const CL_WIND: PoseSpec = { y: 52, lean: -6, footF: [30, 0], footB: [-32, 0], handF: [26, 82], handB: [16, 76], weaponDir: 40 };
const CL_STRIKE: PoseSpec = { y: 46, lean: -24, footF: [52, 0], footB: [-34, 0], handF: [56, 50], handB: [20, 64], weaponDir: -4 };

const CH_WIND: PoseSpec = { y: 58, lean: -2, footF: [30, 0], footB: [-32, 0], handF: [12, 118], handB: [2, 112], weaponDir: 125 };
const CH_STRIKE: PoseSpec = { y: 38, lean: -36, footF: [64, 0], footB: [-44, 0], handF: [66, 30], handB: [-20, 56], weaponDir: 6 };

const AL_WIND: PoseSpec = { ...TUCK, lean: -6, handF: [24, 140], handB: [14, 132], weaponDir: 120 };
const AL_STRIKE: PoseSpec = { ...TUCK, lean: -18, handF: [56, 112], handB: [44, 110], weaponDir: -14 };
const AH_WIND: PoseSpec = { ...TUCK, lean: 8, handF: [4, 182], handB: [-6, 174], weaponDir: 155 };
const AH_STRIKE: PoseSpec = { ...TUCK, lean: -28, upperLegF: -30, lowerLegF: -100, handF: [48, 96], handB: [40, 100], weaponDir: -36 };

/** Slam: the mace driven into the floor ahead; the tip sits on the ground. */
const SLAM: PoseSpec = { y: 58, lean: -34, footF: [62, 0], footB: [-44, 0], handF: [56, 96], handB: [44, 100], weaponDir: -60 };
const SLAM_WIND: PoseSpec = { y: 88, lean: 10, footF: [30, 0], footB: [-40, 0], handF: [8, 188], handB: [-4, 160], weaponDir: 160 };

const GRIP_REACH: PoseSpec = { y: 66, lean: -24, footF: [52, 0], footB: [-42, 0], handF: [70, 110], handB: [62, 104], weaponDir: 100 };
const GRIP_WIND: PoseSpec = { y: 74, lean: -6, footF: [40, 0], footB: [-44, 0], handF: [40, 118], handB: [34, 112], weaponDir: 100 };
const GRIP_HOLD: PoseSpec = { ...GRIP_REACH, lean: -12, handF: [52, 130], handB: [44, 124] };

const RUSH: PoseSpec = { y: 62, lean: -42, footF: [60, 0], footB: [-52, 0], handF: [60, 96], handB: [54, 100], weaponDir: 150 };

const P_WIND: PoseSpec = { y: 90, lean: 14, footF: [28, 0], footB: [-40, 0], handF: [4, 194], handB: [-6, 164], weaponDir: 162 };
const P_STRIKE: PoseSpec = { y: 62, lean: -32, footF: [64, 0], footB: [-42, 0], handF: [54, 108], handB: [42, 110], weaponDir: -24 };

const T_REACH: PoseSpec = { y: 70, lean: -22, footF: [48, 0], footB: [-40, 0], handF: [68, 116], handB: [60, 108], weaponDir: 100 };
const T_TOSS: PoseSpec = { y: 78, lean: 12, footF: [32, 0], footB: [-44, 0], handF: [8, 180], handB: [-8, 170], weaponDir: 140, elbowF: 1, elbowB: 1 };

// Ultimate blows.
const B1: PoseSpec = L_STRIKE;
const B2: PoseSpec = { y: 66, lean: -26, footF: [58, 0], footB: [-40, 0], handF: [52, 112], handB: [34, 108], weaponDir: -24 };
const B3: PoseSpec = { y: 62, lean: -30, footF: [62, 0], footB: [-42, 0], handF: [54, 108], handB: [42, 110], weaponDir: -40 };

// ---- Moves -------------------------------------------------------------------------------

const total = (m: { startup: number; active: number; recovery: number }): number => m.startup + m.active + m.recovery;

const lightBase = { startup: 7, active: 3, recovery: 11 };
const light: MoveDef = {
  anim: 'bhima.light', ...lightBase,
  damage: 45, level: 'mid', hitstun: 15, blockstun: 11, knockback: { x: 4, y: 0 },
  hitboxes: [tipBox(look, L_STRIKE)],
  strength: 'light', meterGain: 4,
  cancels: { into: LIGHT_CHAIN, until: total(lightBase) },
};

const heavyBase = { startup: 13, active: 4, recovery: 20 };
const heavy: MoveDef = {
  anim: 'bhima.heavy', ...heavyBase,
  damage: 90, level: 'mid', hitstun: 23, blockstun: 16, knockback: { x: 7, y: 0 },
  hitboxes: [tipBox(look, H_STRIKE)],
  strength: 'heavy', meterGain: 9,
  cancels: { into: [...SPECIALS, 'ultimate'], until: total(heavyBase) },
};

const crouchLightBase = { startup: 7, active: 3, recovery: 11 };
const crouchLight: MoveDef = {
  anim: 'bhima.crouchLight', ...crouchLightBase,
  damage: 38, level: 'low', hitstun: 14, blockstun: 10, knockback: { x: 3.5, y: 0 },
  hitboxes: [tipBox(look, CL_STRIKE)],
  strength: 'light', meterGain: 4,
  cancels: { into: LIGHT_CHAIN, until: total(crouchLightBase) },
};

const crouchHeavyBase = { startup: 12, active: 3, recovery: 26 };
const crouchHeavy: MoveDef = {
  anim: 'bhima.crouchHeavy', ...crouchHeavyBase,
  damage: 85, level: 'low', hitstun: 22, blockstun: 14, knockback: { x: 2, y: 10 },
  hitboxes: [tipBox(look, CH_STRIKE)],
  strength: 'heavy', meterGain: 8, launches: true,
  cancels: { into: [...SPECIALS, 'ultimate'], until: total(crouchHeavyBase) },
};

const airLight: MoveDef = {
  anim: 'bhima.airLight', startup: 6, active: 4, recovery: 9,
  damage: 40, level: 'overhead', hitstun: 14, blockstun: 10, knockback: { x: 3, y: 0 },
  hitboxes: [tipBox(look, AL_STRIKE, { air: true })],
  strength: 'light', meterGain: 4,
  cancels: { into: ['airHeavy'], until: 19 },
};

const airHeavy: MoveDef = {
  anim: 'bhima.airHeavy', startup: 10, active: 5, recovery: 12,
  damage: 82, level: 'overhead', hitstun: 20, blockstun: 14, knockback: { x: 5, y: 2 },
  hitboxes: [tipBox(look, AH_STRIKE, { air: true })],
  strength: 'heavy', meterGain: 7,
};

/** Earthsplitter: the mace hits the floor and a low shockwave runs forward. Jump it. */
const slamTip = weaponPoints(look, SLAM).tip;
const specialN: MoveDef = {
  anim: 'bhima.specialN', startup: 20, active: 1, recovery: 30,
  damage: 70, level: 'low', hitstun: 20, blockstun: 14, knockback: { x: 4, y: 0 },
  hitboxes: [],
  strength: 'special', meterGain: 8,
  projectile: {
    frame: 21, x: slamTip.x, y: 20, vx: 9, vy: 0, w: 90, h: 34,
    damage: 70, lifetime: 38, hitstun: 20, blockstun: 14, knockback: { x: 4, y: 0 }, level: 'low',
  },
  fx: [{ frame: 21, tag: 'slamDust' }],
};

/** Iron Grip: a command grab with a long, visible reach. Unblockable; whiffs on jumpers and dodgers. */
const specialF: MoveDef = {
  anim: 'bhima.specialF', startup: 14, active: 2, recovery: 34,
  damage: 130, level: 'mid', hitstun: 24, blockstun: 0, knockback: { x: 6, y: 10 },
  hitboxes: [{ x: 0, y: 30, w: 86, h: 130 }],
  strength: 'special', meterGain: 10, launches: true, throw: true,
  fx: [{ frame: 3, tag: 'gripTell' }, { frame: 15, tag: 'grabFlash' }],
};

/** Shoulder Rush: a committed advance, armoured on its first active frames, evadable. */
const specialD: MoveDef = {
  anim: 'bhima.specialD', startup: 12, active: 8, recovery: 28,
  damage: 85, level: 'mid', hitstun: 22, blockstun: 15, knockback: { x: 7, y: 0 },
  hitboxes: [{ x: 14, y: 20, w: 96, h: 140 }],
  velocity: [{ from: 5, to: 12, vx: 10 }],
  armor: { from: 6, to: 14 },
  strength: 'special', meterGain: 9,
  fx: [{ frame: 5, tag: 'rushDust' }],
};

const slamHit = tipBox(look, SLAM, { from: 90, to: 93, group: 3, launches: true, knockback: { x: 4, y: 13 } });
/** Mountain's Wrath: three heavy blows, then a ground slam that launches and sends a shockwave. */
const ultimate: MoveDef = {
  anim: 'bhima.ultimate', startup: 52, active: 41, recovery: 30,
  damage: 70, level: 'mid', hitstun: 22, blockstun: 14, knockback: { x: 2, y: 0 },
  hitboxes: [
    tipBox(look, B1, { from: 56, to: 58, group: 0 }),
    tipBox(look, B2, { from: 66, to: 68, group: 1 }),
    tipBox(look, B3, { from: 76, to: 78, group: 2 }),
    slamHit,
  ],
  projectile: {
    frame: 91, x: slamTip.x, y: 20, vx: 8, vy: 0, w: 100, h: 36,
    damage: 60, lifetime: 36, hitstun: 22, blockstun: 14, knockback: { x: 4, y: 0 }, level: 'low',
  },
  invulnerable: { from: 1, to: 52 },
  strength: 'ultimate', meterGain: 0,
  fx: [{ frame: 2, tag: 'wrathCharge' }, { frame: 91, tag: 'slamDust' }],
};

const throwMove: MoveDef = {
  anim: 'bhima.throw', startup: 7, active: 2, recovery: 24,
  damage: 110, level: 'mid', hitstun: 22, blockstun: 0, knockback: { x: 6, y: 10 },
  hitboxes: [{ x: 0, y: 30, w: 80, h: 130 }],
  strength: 'heavy', meterGain: 8, launches: true, throw: true,
  fx: [{ frame: 8, tag: 'grabFlash' }],
};

const power: MoveDef = {
  anim: 'bhima.power', startup: 20, active: 4, recovery: 28,
  damage: 150, level: 'mid', hitstun: 28, blockstun: 0, knockback: { x: 8, y: 12 },
  hitboxes: [tipBox(look, P_STRIKE)],
  strength: 'heavy', meterGain: 12, launches: true, unblockable: true,
  armor: { from: 1, to: 20 },
  fx: [{ frame: 2, tag: 'powerCharge' }, { frame: 21, tag: 'powerStrike' }],
};

export const BHIMA_DEF: FighterDef = {
  id: 'bhima',
  name: 'Bhima',
  element: 'earth',
  stats: {
    health: 1000, walkSpeed: 3.4, backSpeed: 2.6, jumpVelocity: 13.5, jumpForwardSpeed: 3.6, gravity: 0.8,
    width: 78, height: 188, crouchHeight: 112, power: 0.86,
  },
  moves: {
    light, heavy, crouchLight, crouchHeavy, airLight, airHeavy, specialN, specialF, specialD, ultimate,
    throw: throwMove, power,
  },
};

/** Moves whose hitboxes are the body, not the weapon (the weapon-tip content test skips them). */
export const BHIMA_BODY_STRIKES: readonly string[] = ['bhima.specialD'];

// ---- Visuals -----------------------------------------------------------------------------

export const BHIMA_VISUALS: Readonly<Record<string, VisualSpec>> = {
  slamDust: { kind: 'burst', x: slamTip.x, y: 12, radius: 54, rays: 7, life: 14 },
  gripTell: { kind: 'burst', x: 70, y: 112, radius: 40, rays: 5, life: 16 },
  grabFlash: { kind: 'burst', x: 60, y: 112, radius: 34, rays: 6, life: 10 },
  rushDust: { kind: 'streak', x: -20, y: 40, length: 160, spread: 60, lines: 5, life: 12 },
  wrathCharge: { kind: 'burst', x: 0, y: 100, radius: 80, rays: 8, life: 24 },
  powerCharge: { kind: 'burst', x: 0, y: 100, radius: 76, rays: 8, life: 18 },
  powerStrike: { kind: 'streak', x: -10, y: 110, length: 210, spread: 120, lines: 5 },
};

// ---- Animations --------------------------------------------------------------------------

const walkShape = {
  guard: GUARD,
  lean: -12,
  arms: (swing: number): PoseSpec => ({ handF: [34 + swing * 2, 102], handB: [22 - swing * 5, 112 + Math.abs(swing) * 2] }),
};
const walk = anim(true, ...walkKeys(walkShape));
const walkBack = anim(true, ...reversedKeys(walkKeys({ ...walkShape, lean: -6 })));

const sa = (a: PoseSpec, w: PoseSpec, s: PoseSpec, f?: PoseSpec, wAt?: number) => ({
  guard: a, windup: w, strike: s, follow: f, windupAt: wAt,
});

const ultimateAnim = anim(
  false,
  key(0, GUARD, 'out'),
  key(10, SLAM_WIND, 'out'),
  key(40, { ...SLAM_WIND, y: 87 }),
  key(52, { y: 78, lean: 0, footF: [36, 0], footB: [-44, 0], handF: [20, 130], handB: [28, 116], weaponDir: 120 }, 'in'),
  key(56, B1, 'linear'),
  key(58, B1, 'out'),
  key(62, { y: 76, lean: 4, footF: [40, 0], footB: [-42, 0], handF: [14, 150], handB: [24, 130], weaponDir: 150 }, 'in'),
  key(66, B2, 'linear'),
  key(68, B2, 'out'),
  key(72, { y: 88, lean: 8, footF: [34, 0], footB: [-42, 0], handF: [8, 176], handB: [-2, 150], weaponDir: 160 }, 'in'),
  key(76, B3, 'linear'),
  key(78, B3, 'out'),
  key(84, SLAM_WIND, 'in'),
  key(90, SLAM, 'linear'),
  key(93, SLAM, 'out'),
  key(102, { ...SLAM, lean: -26, handF: [50, 100], weaponDir: -40 }),
  key(123, GUARD),
);

const introAnim = anim(
  true,
  key(0, GUARD),
  key(40, { ...GUARD, y: 70, lean: -8, handF: [36, 104], handB: [24, 116], weaponDir: 70 }),
  key(80, GUARD),
);

export const BHIMA_ANIMS: AnimationSet = {
  idle: idleAnim(GUARD, 64, 1.6),
  walk,
  walkBack,
  intro: introAnim,
  'bhima.light': attackAnim(sa(GUARD, L_WIND, L_STRIKE, L_FOLLOW), 7, 3, 11),
  'bhima.heavy': attackAnim(sa(GUARD, H_WIND, H_STRIKE, H_FOLLOW), 13, 4, 20),
  'bhima.crouchLight': attackAnim(sa(CROUCH, CL_WIND, CL_STRIKE), 7, 3, 11),
  'bhima.crouchHeavy': attackAnim(sa(CROUCH, CH_WIND, CH_STRIKE, { ...CH_STRIKE, y: 50, lean: -20, handF: [52, 108], weaponDir: 70 }), 12, 3, 26),
  'bhima.airLight': attackAnim(sa(TUCK, AL_WIND, AL_STRIKE), 6, 4, 9),
  'bhima.airHeavy': attackAnim(sa(TUCK, AH_WIND, AH_STRIKE), 10, 5, 12),
  'bhima.specialN': attackAnim(sa(GUARD, SLAM_WIND, SLAM, { ...SLAM, lean: -26, handF: [50, 100], weaponDir: -40 }, 12), 20, 1, 30),
  'bhima.specialF': attackAnim(sa(GUARD, GRIP_WIND, GRIP_REACH, GRIP_HOLD, 6), 14, 2, 34),
  'bhima.specialD': attackAnim(sa(GUARD, { ...GUARD, y: 66, lean: -22, footF: [44, 0] }, RUSH, { ...RUSH, lean: -30, footF: [40, 0] }, 8), 12, 8, 28),
  'bhima.ultimate': ultimateAnim,
  'bhima.throw': attackAnim(sa(GUARD, { ...T_REACH, lean: -12, handF: [44, 120], handB: [36, 114] }, T_REACH, T_TOSS), 7, 2, 24),
  'bhima.power': attackAnim(sa(GUARD, P_WIND, P_STRIKE, { ...P_STRIKE, lean: -22, handF: [48, 94], weaponDir: -50 }, 11), 20, 4, 28),
};

// ---- Profile -----------------------------------------------------------------------------

export const BHIMA_PROFILE: HeroProfile = {
  title: 'The Mountain\'s Strength',
  identity: 'A slow, powerful close-range bruiser with heavy pressure and punishable recovery.',
  bio:
    'Bhima\'s strength is direct, but it is never cruel. At a collapsing mountain gate he braces the beams long enough ' +
    'for the villagers to escape, then turns to face whatever drove them there. With the gada in hand and wrestler\'s wraps ' +
    'on his forearms, he fights close and heavy, trading speed for pressure, and every recovery he leaves open is a real risk. ' +
    'His campaign asks whether he can protect the people he loves without letting anger dictate each blow. ' +
    'Warm, loyal and quick to laugh, he steadies the heroes around him; the strength is the least interesting thing about him.',
  weapons: {
    primary: 'Gada (mace)',
    secondary: 'Fists and wrestling holds',
    note: 'The grab and the shoulder rush use his body; the gada is the one weapon drawn.',
  },
  motif: 'Green and bronze armour, a broad frame, a heavy ribbed mace, stone-dust on every slam',
  palette: ['forest green', 'bronze', 'stone gray'],
  rhythm: 'Heavy and deliberate: walk in, one big hit, then he must recover',
  poses: {
    intro: 'Plants the gada on the ground and rolls his shoulders with a small grin',
    victory: 'Offers a hand to the opponent to help them up',
  },
  moves: {
    light: info('Mace Backhand', 'Light', 'A quick sideways swing of the gada. Long for a light, but he is close to you.', 'Block it; he has little speed to follow up.'),
    heavy: info('Gada Smash', 'Heavy', 'An overhead smash with a very visible wind-up.', 'Block or step back from the wind-up; he is open for 20 frames after.'),
    crouchLight: info('Low Sweep', 'Down + Light', 'A short low swing. Must be blocked crouching.'),
    crouchHeavy: info('Ground Sweep', 'Down + Heavy', 'A slow low sweep that launches.', 'Jump it; punish its long recovery.'),
    airLight: info('Falling Swing', 'Light in the air', 'A swing from a jump.'),
    airHeavy: info('Dropping Smash', 'Heavy in the air', 'A heavy overhead from above. Block standing.'),
    specialN: info('Earthsplitter', 'Special', 'He drives the gada into the floor and a low shockwave runs ahead. It must be blocked crouching.', 'Jump over the wave; he is slow to recover.'),
    specialF: info('Iron Grip', 'Special + forward', 'A long-reaching command grab with a clear wind-up. Cannot be blocked.', 'Jump or dodge when you see his hands come up.'),
    specialD: info('Shoulder Rush', 'Special + down', 'A committed charge forward that shrugs off one hit while it starts. It can be dodged.', 'Dodge or grab him; he is very exposed afterwards.'),
    ultimate: info('Mountain\'s Wrath', 'Heavy + Special, full meter', 'Three heavy blows, then a ground slam that launches and sends a shockwave.', 'The gaps between blows are wide; block, then jump the final wave.'),
    throw: info('Wrestler\'s Throw', 'Grab, or Light + Heavy', 'A close grab and heavy throw. Cannot be blocked.', 'Jump or dodge when he steps in.'),
    power: info('Mountain Strike', 'Hold Power, then release', 'A charged gada smash with armour during its wind-up. Cannot be blocked.', 'Grab him or dodge; it is very slow if it misses.'),
  },
  campaignRole: 'A sparring partner and tutorial opponent in chapter one, and the lead of the Night of Illusions.',
  relationships: [
    { id: 'arjuna', text: 'Trains beside him and trusts his aim completely.' },
    { id: 'ghatotkacha', text: 'Looks after him and learns what protecting someone younger asks of him.' },
  ],
  unlock: { kind: 'start', text: 'Available from the start' },
};

export const BHIMA: HeroEntry = {
  def: BHIMA_DEF,
  look: BHIMA_LOOK,
  anims: BHIMA_ANIMS,
  visuals: BHIMA_VISUALS,
  profile: BHIMA_PROFILE,
  projectiles: {
    specialN: { kind: 'shockwave' },
    ultimate: { kind: 'shockwave' },
  },
};
