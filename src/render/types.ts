/**
 * Rig, pose and look types shared by the renderer and content.
 *
 * ANGLE CONVENTION (the only one used anywhere in a Pose):
 * - Radians, in the fighter's own frame authored FACING RIGHT: x forward (toward the
 *   opponent), y up. Positive angles turn counter-clockwise in that frame.
 * - `angles[bone]` is the bone's absolute direction in that frame before `lean`:
 *   0 = pointing forward, PI/2 = up, -PI/2 = down, PI = backward.
 *   Rest directions: spine and head up (PI/2), all limbs down (-PI/2).
 * - `lean` rotates the whole upper body (spine, head, both arms, weapon) about the hip
 *   by `lean`, so a NEGATIVE lean tilts the torso FORWARD and a positive one backward.
 *   Legs are not affected by lean.
 * - `weapon` is the weapon's direction relative to the front forearm
 *   (0 = continuing the forearm line past the hand, PI/2 = turned 90 degrees CCW).
 * - `root` is the hip (pelvis centre) offset from the fighter origin (feet centre on the
 *   ground) in reference pixels for a `look.height = 1` fighter: x forward, y up.
 *   The view scales it by `look.height`, so one pose fits every fighter.
 *
 * Facing -1 mirrors everything about the fighter's x; poses never change for it.
 */

export type Bone =
  | 'spine'
  | 'head'
  | 'upperArmF'
  | 'lowerArmF'
  | 'upperArmB'
  | 'lowerArmB'
  | 'upperLegF'
  | 'lowerLegF'
  | 'upperLegB'
  | 'lowerLegB';

/** All bones, in a stable order. F = front (weapon side), B = back. */
export const BONES: readonly Bone[] = [
  'spine',
  'head',
  'upperArmF',
  'lowerArmF',
  'upperArmB',
  'lowerArmB',
  'upperLegF',
  'lowerLegF',
  'upperLegB',
  'lowerLegB',
];

export interface Pose {
  root: { x: number; y: number };
  lean: number;
  angles: Record<Bone, number>;
  weapon: number;
}

export type Ease = 'linear' | 'in' | 'out' | 'inOut';

/** `ease` shapes the transition FROM this keyframe to the next one (default linear). */
export interface Keyframe {
  t: number;
  pose: Pose;
  ease?: Ease;
}

/**
 * `t` is in sim frames (60 per second), ascending, starting at 0.
 * Looping animations repeat with period = last keyframe's `t`; author the last key
 * equal to the first for a seamless loop. Non-looping ones hold the last pose.
 */
export interface Animation {
  frames: Keyframe[];
  loop: boolean;
}

export type AnimationSet = Record<string, Animation>;

/** `crown`: diadem with sun points; `curls`: bushy hair mass and headband; `hermit`: high bun, forehead mark and long beard. */
export type HeadStyle = 'topknot' | 'braid' | 'circlet' | 'wingedHelm' | 'crown' | 'curls' | 'hermit';
/** `shawl`: wide draped cloth from the shoulder; `quiver`: stiff tube on the back (archers). */
export type RibbonStyle = 'scarf' | 'sash' | 'tail' | 'cape' | 'shawl' | 'quiver';
/** `bow` is held at its middle (grip 0.5); `mace`, `axe` and `sword` are one-handed. */
export type WeaponType = 'katana' | 'spear' | 'staff' | 'hammer' | 'bow' | 'mace' | 'axe' | 'sword';

export interface FighterLook {
  /** Neon rim colour, CSS hex `#RRGGBB`. */
  accent: string;
  /** Visor, trim and highlight colour, CSS hex `#RRGGBB`. */
  secondary: string;
  /** Overall scale; 1 = about 190 px from head top to feet. */
  height: number;
  /** Width multiplier for limbs and torso; 1 = average. */
  bulk: number;
  headStyle: HeadStyle;
  ribbon: RibbonStyle;
  /** `length` in px at height 1 (whole weapon, butt to tip); `color` CSS hex. */
  weapon: { type: WeaponType; length: number; color: string };
}

/** Named points effects can spawn from; see `FighterView.getJointWorld`. */
export type JointName =
  | 'hip'
  | 'chest'
  | 'neck'
  | 'head'
  | 'shoulderF'
  | 'elbowF'
  | 'handF'
  | 'shoulderB'
  | 'elbowB'
  | 'handB'
  | 'kneeF'
  | 'footF'
  | 'kneeB'
  | 'footB'
  | 'weaponBase'
  | 'weaponTip'
  | 'ribbonEnd';

export interface Point {
  x: number;
  y: number;
}
