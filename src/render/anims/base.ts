import { anim, key, pose, type PoseSpec } from '../pose';
import type { AnimationSet, Keyframe } from '../types';

/*
 * Shared base animations, authored with `pose()` specs: DEGREES, absolute directions
 * (0 forward, 90 up, -90 down), negative lean = forward, IK targets in reference px
 * ([x forward, y up] from the feet centre; a foot target is the sole point).
 * Every pose reads with any weapon: swings drive the front arm and `weaponDir` together,
 * and a back hand posed near the grip is wrapped onto two-handed weapons by the rig.
 * Attack strike keys sit on the frame named in the comment.
 */

// ---- Stances -------------------------------------------------------------------------

const GUARD: PoseSpec = {
  y: 86,
  lean: -7,
  footF: [22, 0],
  footB: [-28, 0],
  handF: [38, 120],
  handB: [28, 110],
  weaponDir: 58,
};

const CROUCH: PoseSpec = {
  y: 58,
  lean: -12,
  footF: [26, 0],
  footB: [-26, 0],
  handF: [46, 94],
  handB: [34, 88],
  weaponDir: 38,
};

const BLOCK: PoseSpec = {
  y: 88,
  lean: 4,
  head: 86,
  footF: [16, 0],
  footB: [-26, 0],
  handF: [30, 132],
  handB: [20, 124],
  weaponDir: 98,
};

const CROUCH_BLOCK: PoseSpec = {
  y: 56,
  lean: 0,
  footF: [24, 0],
  footB: [-28, 0],
  handF: [36, 100],
  handB: [26, 92],
  weaponDir: 72,
};

const AIR_LAUNCH: PoseSpec = {
  y: 96,
  lean: -4,
  upperLegF: -70,
  lowerLegF: -95,
  upperLegB: -112,
  lowerLegB: -118,
  handF: [34, 150],
  handB: [-14, 140],
  weaponDir: 80,
};

const TUCK: PoseSpec = {
  y: 92,
  lean: -12,
  upperLegF: 5,
  lowerLegF: -105,
  upperLegB: -40,
  lowerLegB: -140,
  handF: [40, 126],
  handB: [28, 118],
  weaponDir: 55,
};

const FALL: PoseSpec = {
  y: 96,
  lean: -6,
  upperLegF: -60,
  lowerLegF: -84,
  upperLegB: -100,
  lowerLegB: -112,
  handF: [40, 134],
  handB: [-20, 128],
  weaponDir: 45,
};

const HIT: PoseSpec = {
  y: 86,
  lean: 24,
  head: 110,
  footF: [22, 0],
  footB: [-26, 0],
  handF: [24, 150],
  handB: [-30, 128],
  weaponDir: 130,
};

const LYING: PoseSpec = {
  y: 15,
  lean: 90,
  head: 88,
  upperLegF: 25,
  lowerLegF: -25,
  upperLegB: -10,
  lowerLegB: 0,
  handF: [-104, 16],
  handB: [-6, 6],
  weaponDir: 175,
};

const LYING_KO: PoseSpec = {
  ...LYING,
  head: 95,
  handF: [-20, 6],
  handB: [-96, 10],
  weaponDir: 2,
};

// ---- Helpers -------------------------------------------------------------------------

/** Walk cycle keys (feet slide back while planted). */
function walkKeys(lean: number): Keyframe[] {
  const step = (t: number, footF: [number, number], footB: [number, number], y: number): Keyframe =>
    key(t, { ...GUARD, lean, y, footF, footB }, 'linear');
  return [
    step(0, [8, 0], [-12, 0], 88),
    step(7, [20, 9], [-23, 0], 90),
    step(14, [32, 0], [-34, 0], 84),
    step(21, [20, 0], [-23, 9], 90),
    step(28, [8, 0], [-12, 0], 88),
  ];
}

/** Same keys played backward in time. */
function reversed(keys: Keyframe[]): Keyframe[] {
  const end = keys[keys.length - 1]?.t ?? 0;
  return keys
    .slice()
    .reverse()
    .map((k) => ({ t: end - k.t, pose: k.pose, ease: k.ease }));
}

// ---- Animations ----------------------------------------------------------------------

const idle = anim(
  true,
  key(0, GUARD),
  key(30, { ...GUARD, y: 84.5, lean: -8, handF: [38, 118], handB: [28, 108], weaponDir: 56 }),
  key(60, GUARD),
);

const walk = anim(true, ...walkKeys(-7));
const walkBack = anim(true, ...reversed(walkKeys(-2)));

const crouch = anim(false, key(0, { ...GUARD, y: 82 }, 'out'), key(5, CROUCH));

const prejump = anim(
  false,
  key(0, GUARD, 'out'),
  key(3, {
    y: 76,
    lean: -10,
    footF: [20, 0],
    footB: [-22, 0],
    handF: [30, 100],
    handB: [-4, 104],
    weaponDir: 20,
  }),
);

const air = anim(false, key(0, AIR_LAUNCH, 'out'), key(12, TUCK), key(30, FALL));
const airUp = anim(false, key(0, AIR_LAUNCH, 'out'), key(12, TUCK));
const airDown = anim(false, key(0, TUCK), key(18, FALL));

const block = anim(false, key(0, GUARD, 'out'), key(4, BLOCK));
const crouchBlock = anim(false, key(0, CROUCH, 'out'), key(4, CROUCH_BLOCK));

const blockstun = anim(
  false,
  key(0, { ...BLOCK, lean: 12, y: 85, handF: [24, 130], handB: [14, 122], weaponDir: 104 }, 'out'),
  key(5, { ...BLOCK, lean: 7 }),
  key(12, BLOCK),
);

const hitstun = anim(
  false,
  key(0, { ...HIT, lean: 16 }, 'out'),
  key(3, HIT),
  key(12, { ...GUARD, lean: 6 }),
  key(22, GUARD),
);

const knockdown = anim(
  false,
  key(
    0,
    {
      y: 92,
      lean: 35,
      head: 110,
      upperLegF: -40,
      lowerLegF: -60,
      upperLegB: -70,
      lowerLegB: -95,
      handF: [30, 160],
      handB: [-30, 150],
      weaponDir: 150,
    },
    'out',
  ),
  key(
    10,
    {
      y: 80,
      lean: 75,
      head: 100,
      upperLegF: -10,
      lowerLegF: -40,
      upperLegB: -30,
      lowerLegB: -70,
      handF: [-20, 150],
      handB: [-50, 120],
      weaponDir: 180,
    },
    'in',
  ),
  key(26, LYING, 'out'),
  key(31, { ...LYING, y: 21, lean: 84 }, 'in'),
  key(37, LYING),
);

const getup = anim(
  false,
  key(0, LYING),
  key(8, {
    y: 22,
    lean: 50,
    head: 50,
    footF: [62, 0],
    footB: [46, 0],
    handF: [10, 50],
    handB: [-40, 4],
    weaponDir: 30,
  }),
  key(16, {
    y: 54,
    lean: -18,
    footF: [28, 0],
    footB: [-14, 0],
    handF: [42, 84],
    handB: [22, 70],
    weaponDir: 30,
  }),
  key(26, GUARD),
);

const DODGE: PoseSpec = {
  y: 60,
  lean: 22,
  head: 80,
  footF: [34, 0],
  footB: [-30, 0],
  handF: [24, 104],
  handB: [-30, 96],
  weaponDir: 165,
};
const dodge = anim(false, key(0, GUARD, 'out'), key(3, DODGE), key(12, { ...DODGE, y: 58 }), key(18, GUARD));

const ko = anim(
  false,
  key(0, { ...HIT, lean: 28, head: 118 }, 'out'),
  key(
    10,
    {
      y: 58,
      lean: 10,
      head: 50,
      footF: [26, 0],
      footB: [-18, 0],
      handF: [20, 70],
      handB: [-20, 66],
      weaponDir: -60,
    },
    'in',
  ),
  key(22, LYING_KO, 'out'),
  key(27, { ...LYING_KO, y: 20, lean: 85 }, 'in'),
  key(33, LYING_KO),
);

const WIN_TOP: PoseSpec = {
  y: 98,
  lean: 6,
  head: 95,
  footF: [10, 0],
  footB: [-16, 0],
  handF: [20, 204],
  handB: [-12, 106],
  weaponDir: 90,
};
const win = anim(
  false,
  key(0, GUARD),
  key(
    10,
    { y: 82, lean: -12, footF: [18, 0], footB: [-20, 0], handF: [20, 100], handB: [10, 94], weaponDir: -40 },
    'out',
  ),
  key(20, WIN_TOP),
  key(40, { ...WIN_TOP, y: 97, lean: 5 }),
);

// ---- Generic attacks -----------------------------------------------------------------

// Strike at frame 5.
const L_STRIKE: PoseSpec = {
  y: 86,
  lean: -14,
  footF: [28, 0],
  footB: [-24, 0],
  handF: [62, 128],
  handB: [30, 118],
  weaponDir: 6,
};
const light = anim(
  false,
  key(0, GUARD, 'out'),
  key(2, { ...GUARD, lean: -2, handF: [26, 132], handB: [18, 124], weaponDir: 100 }, 'in'),
  key(5, L_STRIKE, 'out'),
  key(8, { ...L_STRIKE, lean: -12, handF: [58, 116], handB: [28, 110], weaponDir: -22 }),
  key(15, GUARD),
);

// Strike at frame 10.
const H_STRIKE: PoseSpec = {
  y: 78,
  lean: -26,
  footF: [36, 0],
  footB: [-30, 0],
  handF: [58, 108],
  handB: [44, 116],
  weaponDir: -28,
};
const H_FOLLOW: PoseSpec = { ...H_STRIKE, lean: -30, y: 76, handF: [52, 94], handB: [40, 100], weaponDir: -60 };
const heavy = anim(
  false,
  key(0, GUARD),
  key(
    6,
    { y: 92, lean: 10, head: 84, footF: [20, 0], footB: [-24, 0], handF: [4, 178], handB: [-4, 170], weaponDir: 150 },
    'in',
  ),
  key(
    8,
    { y: 90, lean: -4, footF: [26, 0], footB: [-26, 0], handF: [30, 184], handB: [20, 178], weaponDir: 95 },
    'linear',
  ),
  key(10, H_STRIKE, 'out'),
  key(13, H_FOLLOW),
  key(20, { ...H_FOLLOW, lean: -18, y: 82, handF: [48, 106], handB: [36, 108], weaponDir: -40 }),
  key(29, GUARD),
);

// Generic grab 5/2/20: weapon raised clear, both hands reach (grab at 6), hip toss over the shoulder.
const T_REACH: PoseSpec = {
  y: 82, lean: -22, footF: [44, 0], footB: [-28, 0], handF: [60, 118], handB: [52, 110], weaponDir: 96,
};
const T_TOSS: PoseSpec = {
  y: 86, lean: 10, footF: [28, 0], footB: [-40, 0], handF: [8, 176], handB: [-8, 168], weaponDir: 130, elbowF: 1, elbowB: 1,
};
const throwAnim = anim(
  false,
  key(0, GUARD, 'out'),
  key(3, { ...T_REACH, lean: -12, handF: [42, 122], handB: [34, 114] }, 'in'),
  key(6, T_REACH, 'out'),
  key(8, { ...T_REACH, lean: -8, handF: [38, 150], handB: [28, 142] }, 'in'),
  key(12, T_TOSS),
  key(18, { ...T_TOSS, lean: 4, handF: [-12, 150], handB: [-22, 142] }),
  key(27, GUARD),
);

// Charge (loop): weapon drawn back high, weight on the back foot, a slow bob while heavy is held.
const CHARGE: PoseSpec = {
  y: 88, lean: 6, head: 84, footF: [22, 0], footB: [-28, 0], handF: [2, 176], handB: [-8, 168], weaponDir: 150,
};
const charge = anim(
  true,
  key(0, CHARGE),
  key(14, { ...CHARGE, y: 85, lean: 9, handF: [-2, 172], handB: [-12, 164], weaponDir: 155 }),
  key(28, CHARGE),
);

// Generic power strike 18/3/24: the charge pose held, a slow step in, then the heavy's cut (strike at 19).
const power = anim(
  false,
  key(0, CHARGE),
  key(12, { ...CHARGE, y: 90, lean: 8, footF: [26, 0] }, 'in'),
  key(17, { y: 90, lean: -4, footF: [26, 0], footB: [-26, 0], handF: [30, 184], handB: [20, 178], weaponDir: 95 }, 'linear'),
  key(19, H_STRIKE, 'out'),
  key(22, H_FOLLOW),
  key(30, { ...H_FOLLOW, lean: -18, y: 82, handF: [48, 106], handB: [36, 108], weaponDir: -40 }),
  key(45, GUARD),
);

// Strike at frame 5.
const CL_STRIKE: PoseSpec = {
  y: 54,
  lean: -22,
  footF: [36, 0],
  footB: [-26, 0],
  handF: [66, 82],
  handB: [44, 80],
  weaponDir: -4,
};
const crouchLight = anim(
  false,
  key(0, CROUCH, 'out'),
  key(2, { ...CROUCH, lean: -10, handF: [34, 98], handB: [26, 90], weaponDir: 30 }, 'in'),
  key(5, CL_STRIKE, 'out'),
  key(8, { ...CL_STRIKE, handF: [62, 80], weaponDir: -10 }),
  key(15, CROUCH),
);

// Low sweeping slash, strike at frame 9.
const CH_STRIKE: PoseSpec = {
  y: 50,
  lean: -30,
  footF: [50, 0],
  footB: [-34, 0],
  handF: [66, 62],
  handB: [50, 66],
  weaponDir: -8,
};
const crouchHeavy = anim(
  false,
  key(0, CROUCH),
  key(
    5,
    { y: 56, lean: -6, footF: [26, 0], footB: [-28, 0], handF: [4, 112], handB: [-6, 106], weaponDir: 150 },
    'in',
  ),
  key(
    7,
    { y: 52, lean: -14, footF: [32, 0], footB: [-30, 0], handF: [30, 104], handB: [20, 100], weaponDir: 70 },
    'linear',
  ),
  key(9, CH_STRIKE, 'out'),
  key(12, { ...CH_STRIKE, lean: -32, handF: [68, 60], weaponDir: -14 }),
  key(20, { ...CROUCH, lean: -16 }),
  key(28, CROUCH),
);

// Strike at frame 5.
const AL_STRIKE: PoseSpec = { ...TUCK, lean: -16, handF: [58, 118], handB: [36, 116], weaponDir: -30 };
const airLight = anim(
  false,
  key(0, TUCK, 'out'),
  key(2, { ...TUCK, handF: [30, 136], handB: [22, 128], weaponDir: 95 }, 'in'),
  key(5, AL_STRIKE, 'out'),
  key(9, { ...AL_STRIKE, handF: [54, 108], weaponDir: -48 }),
  key(16, TUCK),
);

// Downward swing, strike at frame 9.
const AH_STRIKE: PoseSpec = {
  ...TUCK,
  lean: -28,
  upperLegF: -30,
  lowerLegF: -100,
  handF: [52, 100],
  handB: [38, 108],
  weaponDir: -62,
};
const airHeavy = anim(
  false,
  key(0, TUCK),
  key(5, { ...TUCK, lean: 8, handF: [2, 182], handB: [-6, 174], weaponDir: 145 }, 'in'),
  key(7, { ...TUCK, lean: -6, handF: [34, 176], handB: [24, 170], weaponDir: 80 }, 'linear'),
  key(9, AH_STRIKE, 'out'),
  key(12, { ...AH_STRIKE, handF: [46, 92], weaponDir: -84 }),
  key(24, TUCK),
);

// Throw / cast, release at frame 12.
const SN_RELEASE: PoseSpec = {
  y: 84,
  lean: -18,
  footF: [34, 0],
  footB: [-28, 0],
  handF: [66, 140],
  handB: [-26, 118],
  weaponDir: 8,
};
const specialN = anim(
  false,
  key(0, GUARD),
  key(
    8,
    {
      y: 88,
      lean: 12,
      head: 86,
      footF: [26, 0],
      footB: [-26, 0],
      handF: [-34, 160],
      handB: [36, 134],
      weaponDir: 165,
    },
    'in',
  ),
  key(12, SN_RELEASE, 'out'),
  key(16, { ...SN_RELEASE, lean: -20, handF: [62, 124], weaponDir: -18 }),
  key(24, { ...GUARD, lean: -10 }),
  key(32, GUARD),
);

// Lunging thrust, full extension at frame 9.
const SF_THRUST: PoseSpec = {
  y: 70,
  lean: -26,
  footF: [50, 0],
  footB: [-36, 0],
  handF: [74, 120],
  handB: [-30, 112],
  weaponDir: 2,
};
const specialF = anim(
  false,
  key(0, GUARD),
  key(
    6,
    { y: 86, lean: 8, footF: [20, 0], footB: [-26, 0], handF: [-22, 108], handB: [-34, 116], weaponDir: 4 },
    'in',
  ),
  key(9, SF_THRUST, 'out'),
  key(20, { ...SF_THRUST, y: 72, lean: -22, handF: [70, 118] }),
  key(32, GUARD),
);

// Rising strike, top at frame 11.
const SD_TOP: PoseSpec = {
  y: 104,
  lean: 10,
  head: 96,
  upperLegF: -60,
  lowerLegF: -95,
  upperLegB: -110,
  lowerLegB: -120,
  handF: [26, 206],
  handB: [16, 196],
  weaponDir: 92,
};
const specialD = anim(
  false,
  key(0, GUARD),
  key(
    5,
    { y: 62, lean: -16, footF: [26, 0], footB: [-24, 0], handF: [40, 80], handB: [28, 76], weaponDir: -40 },
    'in',
  ),
  key(
    8,
    { y: 84, lean: -6, footF: [20, 0], footB: [-18, 0], handF: [50, 120], handB: [36, 114], weaponDir: 30 },
    'linear',
  ),
  key(11, SD_TOP, 'out'),
  key(16, { ...SD_TOP, y: 100, handF: [22, 200], weaponDir: 100 }),
  key(30, GUARD),
);

// 45-frame power wind-up (super freeze), then a 60-frame multi-swing combo.
const U_CHARGE: PoseSpec = {
  y: 96,
  lean: 4,
  head: 92,
  footF: [16, 0],
  footB: [-18, 0],
  handF: [12, 200],
  handB: [30, 150],
  weaponDir: 92,
};
const U_RISE: PoseSpec = {
  y: 104,
  lean: 6,
  upperLegF: -55,
  lowerLegF: -95,
  upperLegB: -108,
  lowerLegB: -125,
  handF: [30, 204],
  handB: [20, 196],
  weaponDir: 86,
};
const U_SLAM: PoseSpec = {
  y: 62,
  lean: -36,
  footF: [48, 0],
  footB: [-40, 0],
  handF: [60, 86],
  handB: [46, 94],
  weaponDir: -55,
};
const ultimate = anim(
  false,
  key(0, GUARD),
  key(
    10,
    { y: 76, lean: -6, footF: [32, 0], footB: [-34, 0], handF: [-24, 120], handB: [46, 134], weaponDir: 178 },
    'out',
  ),
  key(30, U_CHARGE),
  key(38, { ...U_CHARGE, y: 94, lean: 2 }),
  key(45, { ...U_CHARGE, y: 97 }, 'in'),
  // Swing 1: diagonal down.
  key(
    49,
    { y: 80, lean: -22, footF: [38, 0], footB: [-30, 0], handF: [60, 112], handB: [46, 118], weaponDir: -32 },
    'out',
  ),
  // Swing 2: rising.
  key(53, { y: 92, lean: -2, footF: [30, 0], footB: [-26, 0], handF: [44, 172], handB: [34, 164], weaponDir: 70 }),
  // Swing 3: horizontal.
  key(
    57,
    { y: 84, lean: -18, footF: [40, 0], footB: [-28, 0], handF: [68, 132], handB: [52, 128], weaponDir: 4 },
  ),
  key(
    61,
    { y: 90, lean: 10, footF: [30, 0], footB: [-30, 0], handF: [2, 172], handB: [-6, 166], weaponDir: 130 },
    'in',
  ),
  // Swing 4: big overhead.
  key(
    66,
    { y: 72, lean: -28, footF: [44, 0], footB: [-34, 0], handF: [56, 102], handB: [42, 110], weaponDir: -40 },
    'out',
  ),
  // Swing 5: rising launcher.
  key(72, U_RISE, 'out'),
  key(78, { ...U_RISE, y: 106, lean: 10, handF: [16, 206], weaponDir: 115 }, 'in'),
  // Finale: ground slam.
  key(84, U_SLAM, 'out'),
  key(96, { ...U_SLAM, y: 64, lean: -32 }),
  key(106, GUARD),
);

export const baseAnims: AnimationSet = {
  idle,
  walk,
  walkBack,
  crouch,
  prejump,
  air,
  airUp,
  airDown,
  block,
  crouchBlock,
  blockstun,
  hitstun,
  knockdown,
  getup,
  dodge,
  ko,
  win,
  light,
  heavy,
  crouchLight,
  crouchHeavy,
  airLight,
  airHeavy,
  specialN,
  specialF,
  specialD,
  ultimate,
  throw: throwAnim,
  charge,
  power,
};

/** Display order for galleries and tooling. */
export const BASE_ANIM_IDS: readonly string[] = Object.keys(baseAnims);

/** Exposed so content can derive poses from the shared stance. */
export const BASE_POSES = { GUARD, CROUCH, BLOCK, TUCK, LYING } as const;

/** Convenience for content files: the neutral guard pose as a resolved Pose. */
export const GUARD_POSE = pose(GUARD);
