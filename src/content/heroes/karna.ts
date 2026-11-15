// Karna, the Sun's Chosen. A measured hybrid: a quick arrow from the back hand at range, a spear
// lunge that punishes a careless approach, a one-hit armour, and a leaping crash onto a marked
// landing zone. Gold, carmine and navy; fire.
//
// Frame data (advantage = hitstun minus active + recovery): light 6/3/10 +2 hit, heavy 11/3/17 +1,
// crouchLight 6/3/10 +1, crouchHeavy 10/3/22 launches. Radiant Armor absorbs one light hit for four
// seconds and is broken by heavies, specials and ultimates, so it never covers a big attack.
import { BASE_POSES } from '../../render/anims/base';
import type { VisualSpec } from '../../render/moveVisuals';
import { anim, key, type PoseSpec } from '../../render/pose';
import type { AnimationSet, FighterLook } from '../../render/types';
import type { FighterDef, MoveDef } from '../../sim/types';
import { LIGHT_CHAIN, SPECIALS, attackAnim, idleAnim, info, reversedKeys, tipBox, walkKeys, weaponPoints } from '../heroKit';
import type { HeroEntry, HeroProfile } from '../types';

export const KARNA_LOOK: FighterLook = {
  accent: '#FFC857',
  secondary: '#E0405A',
  height: 1.02,
  bulk: 1,
  headStyle: 'crown',
  ribbon: 'shawl',
  weapon: { type: 'spear', length: 150, color: '#FFD98A' },
};

const { CROUCH, TUCK } = BASE_POSES;
const look = KARNA_LOOK;

// ---- Poses -------------------------------------------------------------------------------

/** Upright, spear levelled forward at chest height, the back hand steady on the shaft. */
const GUARD: PoseSpec = {
  y: 76, lean: -8, footF: [38, 0], footB: [-40, 0], handF: [36, 106], handB: [2, 104], weaponDir: 6,
};

const L_WIND: PoseSpec = { y: 78, lean: -2, footF: [40, 0], footB: [-40, 0], handF: [14, 106], handB: [-22, 104], weaponDir: 4 };
const L_STRIKE: PoseSpec = { y: 72, lean: -18, footF: [52, 0], footB: [-38, 0], handF: [64, 116], handB: [30, 114], weaponDir: 2 };

const H_WIND: PoseSpec = { y: 82, lean: 8, footF: [36, 0], footB: [-40, 0], handF: [16, 166], handB: [-34, 138], weaponDir: 130 };
const H_STRIKE: PoseSpec = { y: 70, lean: -22, footF: [56, 0], footB: [-40, 0], handF: [62, 124], handB: [28, 126], weaponDir: -4 };
const H_FOLLOW: PoseSpec = { ...H_STRIKE, handF: [56, 100], handB: [24, 112], weaponDir: -34 };

const CL_WIND: PoseSpec = { y: 54, lean: -8, footF: [30, 0], footB: [-30, 0], handF: [26, 80], handB: [-6, 78], weaponDir: 20 };
const CL_STRIKE: PoseSpec = { y: 48, lean: -22, footF: [50, 0], footB: [-34, 0], handF: [64, 58], handB: [30, 66], weaponDir: -6 };

const CH_WIND: PoseSpec = { y: 58, lean: -4, footF: [32, 0], footB: [-32, 0], handF: [14, 118], handB: [-4, 112], weaponDir: 110 };
const CH_STRIKE: PoseSpec = { y: 40, lean: -34, footF: [62, 0], footB: [-42, 0], handF: [66, 34], handB: [30, 52], weaponDir: 8 };

const AL_WIND: PoseSpec = { ...TUCK, lean: -6, handF: [30, 126], handB: [10, 120], weaponDir: 60 };
const AL_STRIKE: PoseSpec = { ...TUCK, lean: -20, handF: [60, 108], handB: [27, 122], weaponDir: -22 };
const AH_WIND: PoseSpec = { ...TUCK, lean: 8, handF: [6, 170], handB: [-6, 150], weaponDir: 140 };
const AH_STRIKE: PoseSpec = { ...TUCK, lean: -28, upperLegF: -30, lowerLegF: -100, handF: [52, 100], handB: [34, 112], weaponDir: -46 };

/** Sunline Shot: the back hand draws and casts a line of light; the spear stays up. */
const SHOT_WIND: PoseSpec = { y: 76, lean: -6, footF: [38, 0], footB: [-40, 0], handF: [26, 104], handB: [-8, 128], weaponDir: 70 };
const SHOT: PoseSpec = { y: 74, lean: -12, footF: [40, 0], footB: [-38, 0], handF: [26, 104], handB: [66, 124], weaponDir: 70 };

/** Spearpoint Lunge. */
const LUNGE_WIND: PoseSpec = { y: 70, lean: -8, footF: [38, 0], footB: [-44, 0], handF: [8, 106], handB: [-28, 104], weaponDir: 4 };
const LUNGE: PoseSpec = { y: 66, lean: -34, footF: [64, 0], footB: [-50, 0], handF: [78, 108], handB: [44, 106], weaponDir: 2 };

/** Radiant Armor: the spear raised overhead, a held breath. */
const ARMOR: PoseSpec = { y: 82, lean: 2, footF: [34, 0], footB: [-38, 0], handF: [30, 150], handB: [10, 142], weaponDir: 100 };

/** Solar Descent. */
const COIL: PoseSpec = { y: 56, lean: -26, footF: [40, 0], footB: [-44, 0], handF: [10, 110], handB: [-22, 108], weaponDir: 20 };
const LEAP: PoseSpec = {
  y: 100, lean: 0, upperLegF: -60, lowerLegF: -95, upperLegB: -110, lowerLegB: -122, handF: [30, 170], handB: [8, 150], weaponDir: 120,
};
const APEX: PoseSpec = { ...LEAP, handF: [24, 190], handB: [4, 168], weaponDir: 140 };
const DIVE: PoseSpec = { ...LEAP, handF: [44, 140], handB: [26, 128], weaponDir: 40 };
const DESCENT: PoseSpec = { y: 70, lean: -30, footF: [50, 0], footB: [-40, 0], handF: [50, 130], handB: [38, 116], weaponDir: -62 };

const P_WIND: PoseSpec = { y: 86, lean: 10, footF: [30, 0], footB: [-40, 0], handF: [10, 170], handB: [-30, 140], weaponDir: 135 };
const P_STRIKE: PoseSpec = { y: 70, lean: -24, footF: [58, 0], footB: [-40, 0], handF: [62, 124], handB: [28, 126], weaponDir: -6 };

const T_REACH: PoseSpec = { y: 72, lean: -22, footF: [48, 0], footB: [-34, 0], handF: [62, 112], handB: [54, 104], weaponDir: 96 };
const T_TOSS: PoseSpec = { y: 78, lean: 10, footF: [32, 0], footB: [-40, 0], handF: [10, 172], handB: [-6, 162], weaponDir: 130, elbowF: 1, elbowB: 1 };

// ---- Moves -------------------------------------------------------------------------------

const total = (m: { startup: number; active: number; recovery: number }): number => m.startup + m.active + m.recovery;

const lightBase = { startup: 6, active: 3, recovery: 10 };
const light: MoveDef = {
  anim: 'karna.light', ...lightBase,
  damage: 36, level: 'mid', hitstun: 15, blockstun: 10, knockback: { x: 4, y: 0 },
  hitboxes: [tipBox(look, L_STRIKE)],
  strength: 'light', meterGain: 4,
  cancels: { into: LIGHT_CHAIN, until: total(lightBase) },
};

const heavyBase = { startup: 11, active: 3, recovery: 17 };
const heavy: MoveDef = {
  anim: 'karna.heavy', ...heavyBase,
  damage: 78, level: 'mid', hitstun: 21, blockstun: 15, knockback: { x: 6, y: 0 },
  hitboxes: [tipBox(look, H_STRIKE)],
  strength: 'heavy', meterGain: 9,
  cancels: { into: [...SPECIALS, 'ultimate'], until: total(heavyBase) },
};

const crouchLightBase = { startup: 6, active: 3, recovery: 10 };
const crouchLight: MoveDef = {
  anim: 'karna.crouchLight', ...crouchLightBase,
  damage: 30, level: 'low', hitstun: 14, blockstun: 10, knockback: { x: 3, y: 0 },
  hitboxes: [tipBox(look, CL_STRIKE)],
  strength: 'light', meterGain: 4,
  cancels: { into: LIGHT_CHAIN, until: total(crouchLightBase) },
};

const crouchHeavyBase = { startup: 10, active: 3, recovery: 22 };
const crouchHeavy: MoveDef = {
  anim: 'karna.crouchHeavy', ...crouchHeavyBase,
  damage: 70, level: 'low', hitstun: 22, blockstun: 13, knockback: { x: 2.5, y: 10 },
  hitboxes: [tipBox(look, CH_STRIKE)],
  strength: 'heavy', meterGain: 8, launches: true,
  cancels: { into: [...SPECIALS, 'ultimate'], until: total(crouchHeavyBase) },
};

const airLight: MoveDef = {
  anim: 'karna.airLight', startup: 5, active: 4, recovery: 8,
  damage: 34, level: 'overhead', hitstun: 14, blockstun: 10, knockback: { x: 3, y: 0 },
  hitboxes: [tipBox(look, AL_STRIKE, { air: true })],
  strength: 'light', meterGain: 4,
  cancels: { into: ['airHeavy'], until: 17 },
};

const airHeavy: MoveDef = {
  anim: 'karna.airHeavy', startup: 9, active: 4, recovery: 11,
  damage: 64, level: 'overhead', hitstun: 20, blockstun: 14, knockback: { x: 5, y: 2 },
  hitboxes: [tipBox(look, AH_STRIKE, { air: true })],
  strength: 'heavy', meterGain: 7,
};

/** Sunline Shot: a fast straight arrow of light from the back hand. Moderate damage. */
const shotHand = weaponPoints(look, SHOT).handB;
const specialN: MoveDef = {
  anim: 'karna.specialN', startup: 9, active: 1, recovery: 20,
  damage: 40, level: 'mid', hitstun: 15, blockstun: 11, knockback: { x: 4, y: 0 },
  hitboxes: [],
  strength: 'special', meterGain: 6,
  projectile: {
    frame: 10, x: shotHand.x, y: shotHand.y, vx: 22, vy: 0, w: 52, h: 14,
    damage: 40, lifetime: 60, hitstun: 15, blockstun: 11, knockback: { x: 4, y: 0 }, level: 'mid',
  },
  fx: [{ frame: 10, tag: 'sunlineFlash' }],
};

/** Spearpoint Lunge: a long thrust that covers about 110 px and punishes a careless approach. */
const specialF: MoveDef = {
  anim: 'karna.specialF', startup: 12, active: 6, recovery: 24,
  damage: 70, level: 'mid', hitstun: 21, blockstun: 14, knockback: { x: 6, y: 0 },
  hitboxes: [tipBox(look, LUNGE, { reach: 12 })],
  velocity: [{ from: 8, to: 16, vx: 12 }],
  strength: 'special', meterGain: 9,
  fx: [{ frame: 8, tag: 'lungeStreak' }],
};

/** Radiant Armor: absorbs one light hit for four seconds. Heavies, specials and ultimates break it. */
const specialD: MoveDef = {
  anim: 'karna.specialD', startup: 14, active: 1, recovery: 22,
  damage: 0, level: 'mid', hitstun: 0, blockstun: 0, knockback: { x: 0, y: 0 },
  hitboxes: [],
  grants: { shield: 'absorb', frames: 240, breaksOn: ['heavy', 'special', 'ultimate'], label: 'RADIANT ARMOR' },
  strength: 'special', meterGain: 0,
  fx: [{ frame: 15, tag: 'armorGlow' }],
};

/**
 * Solar Descent: a crouch, a long leap (about 217 px) and an overhead crash on the marked landing
 * zone. He is vulnerable in the air; the mark shows the zone from the start of the leap.
 * Launch at frame 52 with vy 14 lands at frame 83 (gravity 0.85).
 */
const ultimate: MoveDef = {
  anim: 'karna.ultimate', startup: 82, active: 6, recovery: 24,
  damage: 110, level: 'overhead', hitstun: 24, blockstun: 16, knockback: { x: 6, y: 12 },
  hitboxes: [tipBox(look, DESCENT, { from: 83, to: 88, group: 0, reach: 20, pad: 40, launches: true })],
  velocity: [
    { from: 52, to: 52, vx: 7, vy: 14 },
    { from: 53, to: 82, vx: 7 },
  ],
  invulnerable: { from: 1, to: 51 },
  strength: 'ultimate', meterGain: 0,
  zone: { kind: 'mark', frame: 4, x: 217, w: 120, frames: 88, label: 'LANDING' },
  fx: [{ frame: 2, tag: 'solarCharge' }, { frame: 83, tag: 'descentBurst' }],
};

const throwMove: MoveDef = {
  anim: 'karna.throw', startup: 6, active: 2, recovery: 22,
  damage: 90, level: 'mid', hitstun: 20, blockstun: 0, knockback: { x: 5, y: 9 },
  hitboxes: [{ x: 0, y: 30, w: 70, h: 128 }],
  strength: 'heavy', meterGain: 8, launches: true, throw: true,
  fx: [{ frame: 7, tag: 'grabFlash' }],
};

const power: MoveDef = {
  anim: 'karna.power', startup: 18, active: 3, recovery: 24,
  damage: 125, level: 'mid', hitstun: 26, blockstun: 0, knockback: { x: 7, y: 11 },
  hitboxes: [tipBox(look, P_STRIKE)],
  strength: 'heavy', meterGain: 12, launches: true, unblockable: true,
  armor: { from: 1, to: 18 },
  fx: [{ frame: 2, tag: 'powerCharge' }, { frame: 19, tag: 'powerStrike' }],
};

export const KARNA_DEF: FighterDef = {
  id: 'karna',
  name: 'Karna',
  element: 'fire',
  stats: {
    health: 1000, walkSpeed: 4.4, backSpeed: 3.6, jumpVelocity: 15, jumpForwardSpeed: 4.8, gravity: 0.85,
    width: 64, height: 182, crouchHeight: 108,
  },
  moves: {
    light, heavy, crouchLight, crouchHeavy, airLight, airHeavy, specialN, specialF, specialD, ultimate,
    throw: throwMove, power,
  },
};

// ---- Visuals -----------------------------------------------------------------------------

export const KARNA_VISUALS: Readonly<Record<string, VisualSpec>> = {
  sunlineFlash: { kind: 'burst', x: shotHand.x, y: shotHand.y, radius: 22, rays: 6, life: 8 },
  lungeStreak: { kind: 'streak', x: -30, y: 108, length: 250, spread: 60, lines: 4, life: 12 },
  armorGlow: { kind: 'burst', x: 0, y: 110, radius: 70, rays: 10, life: 20 },
  solarCharge: { kind: 'burst', x: 0, y: 100, radius: 90, rays: 10, life: 26 },
  descentBurst: { kind: 'burst', x: 90, y: 30, radius: 90, rays: 10, life: 16 },
  grabFlash: { kind: 'burst', x: 56, y: 110, radius: 30, rays: 6, life: 10 },
  powerCharge: { kind: 'burst', x: 0, y: 100, radius: 72, rays: 8, life: 18 },
  powerStrike: { kind: 'streak', x: -10, y: 112, length: 210, spread: 120, lines: 5 },
};

// ---- Animations --------------------------------------------------------------------------

const walkShape = {
  guard: GUARD,
  lean: -10,
  arms: (swing: number): PoseSpec => ({ handF: [36 + swing * 5, 106], handB: [2 + swing * 5, 104 - swing] }),
};
const walk = anim(true, ...walkKeys(walkShape));
const walkBack = anim(true, ...reversedKeys(walkKeys({ ...walkShape, lean: -4 })));

const sa = (a: PoseSpec, w: PoseSpec, s: PoseSpec, f?: PoseSpec, wAt?: number) => ({
  guard: a, windup: w, strike: s, follow: f, windupAt: wAt,
});

const ultimateAnim = anim(
  false,
  key(0, GUARD, 'out'),
  key(10, COIL, 'in'),
  key(40, { ...COIL, y: 55 }),
  key(51, { ...COIL, y: 52, lean: -30 }, 'in'),
  key(52, LEAP, 'out'),
  key(66, APEX),
  key(78, DIVE, 'in'),
  key(83, DESCENT, 'linear'),
  key(88, DESCENT, 'out'),
  key(98, { ...DESCENT, y: 62, lean: -26, handF: [46, 100], weaponDir: -40 }),
  key(112, GUARD),
);

const introAnim = anim(
  true,
  key(0, GUARD),
  key(40, { ...GUARD, y: 75, lean: -6, handF: [38, 108], handB: [4, 106], weaponDir: 10 }),
  key(80, GUARD),
);

export const KARNA_ANIMS: AnimationSet = {
  idle: idleAnim(GUARD, 60, 1.3),
  walk,
  walkBack,
  intro: introAnim,
  'karna.light': attackAnim(sa(GUARD, L_WIND, L_STRIKE), 6, 3, 10),
  'karna.heavy': attackAnim(sa(GUARD, H_WIND, H_STRIKE, H_FOLLOW), 11, 3, 17),
  'karna.crouchLight': attackAnim(sa(CROUCH, CL_WIND, CL_STRIKE), 6, 3, 10),
  'karna.crouchHeavy': attackAnim(sa(CROUCH, CH_WIND, CH_STRIKE, { ...CH_STRIKE, y: 52, lean: -18, handF: [54, 108], weaponDir: 60 }), 10, 3, 22),
  'karna.airLight': attackAnim(sa(TUCK, AL_WIND, AL_STRIKE), 5, 4, 8),
  'karna.airHeavy': attackAnim(sa(TUCK, AH_WIND, AH_STRIKE), 9, 4, 11),
  'karna.specialN': attackAnim(sa(GUARD, SHOT_WIND, SHOT, { ...SHOT, lean: -8, handB: [40, 118] }, 5), 9, 1, 20),
  'karna.specialF': attackAnim(sa(GUARD, LUNGE_WIND, LUNGE, { ...LUNGE, y: 70, lean: -24, footF: [50, 0] }, 7), 12, 6, 24),
  'karna.specialD': attackAnim(sa(GUARD, { ...GUARD, y: 80, handF: [30, 130], weaponDir: 70 }, ARMOR, { ...ARMOR, y: 80 }, 7), 14, 1, 22),
  'karna.ultimate': ultimateAnim,
  'karna.throw': attackAnim(sa(GUARD, { ...T_REACH, lean: -12, handF: [42, 116], handB: [34, 108] }, T_REACH, T_TOSS), 6, 2, 22),
  'karna.power': attackAnim(sa(GUARD, P_WIND, P_STRIKE, { ...P_STRIKE, lean: -18, handF: [52, 100], weaponDir: -30 }, 10), 18, 3, 24),
};

// ---- Profile -----------------------------------------------------------------------------

export const KARNA_PROFILE: HeroProfile = {
  title: 'The Sun\'s Chosen',
  identity: 'A measured fighter who alternates precise ranged shots with committed spear strikes.',
  bio:
    'Karna is generous, proud and carries more questions than he shows. At dawn he stands between a threatened village and the force pursuing him: ' +
    'a promise to one side pulls against his instinct to protect the people in front of him, and he chooses the village, knowing it will bring him to Arjuna. ' +
    'He fights with a measured rhythm, a quick line of light from the back hand, a long spear lunge for anyone who rushes in, and a golden armour that takes one small blow. ' +
    'His story is about identity, loyalty and recognition, and the wish to be seen for what he does rather than where he comes from.',
  weapons: {
    primary: 'Spear',
    secondary: 'Vijaya bow and protective celestial armour',
    note: 'The bow appears as the line of light he casts from his back hand; the armour is the Radiant Armor technique.',
  },
  motif: 'Gold and carmine armour with sun-disc fittings, a draped shawl, warm light on every shot',
  palette: ['gold', 'carmine', 'deep navy'],
  rhythm: 'Measured: a shot, a step, then a committed thrust',
  poses: {
    intro: 'Squares to the opponent with the spear levelled and the sun at his back',
    victory: 'Plants the spear and bows his head, then looks toward the village',
  },
  moves: {
    light: info('Spear Jab', 'Light', 'A quick thrust with good reach.', 'Block it; he has little follow-up speed.'),
    heavy: info('Sweeping Thrust', 'Heavy', 'A long sweep with a clear wind-up.', 'Block the wind-up; he is open for 17 frames.'),
    crouchLight: info('Low Thrust', 'Down + Light', 'A low poke at the shins. Must be blocked crouching.'),
    crouchHeavy: info('Spear Sweep', 'Down + Heavy', 'A low sweep that launches.', 'Jump it or block crouching.'),
    airLight: info('Falling Jab', 'Light in the air', 'A quick downward thrust from a jump.'),
    airHeavy: info('Diving Thrust', 'Heavy in the air', 'A steep thrust from above. Block standing.'),
    specialN: info('Sunline Shot', 'Special', 'A fast straight line of light from his back hand. Moderate damage.', 'Block it or jump it; he is slow to recover.'),
    specialF: info('Spearpoint Lunge', 'Special + forward', 'A long lunge that covers about 110 pixels and punishes anyone approaching carelessly.', 'Step back out of its range, then punish its 24 recovery frames.'),
    specialD: info('Radiant Armor', 'Special + down', 'Golden armour that absorbs one light hit for four seconds. Heavies, specials and ultimates break it and land in full.', 'Hit him with a heavy or special; a light is wasted on it.'),
    ultimate: info('Solar Descent', 'Heavy + Special, full meter', 'A crouch, a long leap, and an overhead crash on a marked landing zone.', 'The zone is marked from the start of the leap: walk out of it, or hit him in the air.'),
    throw: info('Spear Throw', 'Grab, or Light + Heavy', 'A close grab and toss. Cannot be blocked.', 'Jump or dodge when he steps in.'),
    power: info('Gilded Thrust', 'Hold Power, then release', 'A charged thrust with armour during its wind-up. Cannot be blocked.', 'Grab him or dodge; it is slow if it misses.'),
  },
  campaignRole: 'Arjuna\'s rival in chapter four, The Rival\'s Trial, and a boss of the late campaign.',
  relationships: [
    { id: 'arjuna', text: 'A rival whose motives the player is meant to understand, not just defeat.' },
    { id: 'ekalavya', text: 'Shares a quiet understanding about earning a place rather than being given one.' },
  ],
  unlock: { kind: 'chapter', chapter: 4, text: 'Finish chapter 4: The Rival\'s Trial' },
};

export const KARNA: HeroEntry = {
  def: KARNA_DEF,
  look: KARNA_LOOK,
  anims: KARNA_ANIMS,
  visuals: KARNA_VISUALS,
  profile: KARNA_PROFILE,
  projectiles: {
    specialN: { kind: 'arrow', length: 54, color: '#FFE9A8' },
  },
};
