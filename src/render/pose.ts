import { createPose } from './anim';
import { RIG, STAND_Y, solveTwoBone } from './rig';
import type { Animation, Ease, Keyframe, Pose } from './types';

const DEG = Math.PI / 180;

/**
 * Compact pose description for authoring. ALL ANGLES IN DEGREES (the resulting Pose is
 * radians), same convention as `Pose`: absolute directions, 0 forward, 90 up, -90 down,
 * CCW positive; negative `lean` tilts forward. Distances are reference px (height 1).
 *
 * IK targets (`footF`, `handF`, ...) are [x, y] in the fighter frame. A foot target is
 * the SOLE point (y = 0 is planted). When a target is given it wins over the matching
 * bone angles. Legs default to feet planted at the neutral stance unless a leg angle is
 * given; arms default to hanging. `head` defaults to counter part of the lean so the
 * gaze stays level. `weaponDir` (absolute) wins over `weapon` (relative to the forearm).
 */
export interface PoseSpec {
  x?: number;
  y?: number;
  lean?: number;
  spine?: number;
  head?: number;
  upperArmF?: number;
  lowerArmF?: number;
  upperArmB?: number;
  lowerArmB?: number;
  upperLegF?: number;
  lowerLegF?: number;
  upperLegB?: number;
  lowerLegB?: number;
  weapon?: number;
  weaponDir?: number;
  handF?: readonly [number, number];
  handB?: readonly [number, number];
  footF?: readonly [number, number];
  footB?: readonly [number, number];
  /** Elbow bend side for hand IK: -1 (default) elbow down/out, +1 elbow up. */
  elbowF?: 1 | -1;
  elbowB?: 1 | -1;
}

const DEFAULT_FOOT_F: readonly [number, number] = [8, 0];
const DEFAULT_FOOT_B: readonly [number, number] = [-8, 0];
const tmp: [number, number] = [0, 0];

function legIK(pose: Pose, front: boolean, foot: readonly [number, number]): void {
  const hx = pose.root.x + (front ? RIG.hipX : -RIG.hipX);
  const hy = pose.root.y - RIG.hipDrop;
  solveTwoBone(hx, hy, foot[0], foot[1] + RIG.ankle, RIG.upperLeg, RIG.lowerLeg, 1, tmp);
  if (front) {
    pose.angles.upperLegF = tmp[0];
    pose.angles.lowerLegF = tmp[1];
  } else {
    pose.angles.upperLegB = tmp[0];
    pose.angles.lowerLegB = tmp[1];
  }
}

function armIK(pose: Pose, front: boolean, hand: readonly [number, number], bend: number): void {
  const sd = pose.angles.spine + pose.lean;
  const ux = Math.cos(sd);
  const uy = Math.sin(sd);
  const across = front ? RIG.shoulderFAcross : RIG.shoulderBAcross;
  const sx = pose.root.x + ux * RIG.shoulderAlong + uy * across;
  const sy = pose.root.y + uy * RIG.shoulderAlong - ux * across;
  solveTwoBone(sx, sy, hand[0], hand[1], RIG.upperArm, RIG.lowerArm, bend, tmp);
  // Stored angles exclude lean (FK adds it back).
  if (front) {
    pose.angles.upperArmF = tmp[0] - pose.lean;
    pose.angles.lowerArmF = tmp[1] - pose.lean;
  } else {
    pose.angles.upperArmB = tmp[0] - pose.lean;
    pose.angles.lowerArmB = tmp[1] - pose.lean;
  }
}

/** Builds a Pose (radians) from a degree-based spec over a neutral standing pose. */
export function pose(spec: PoseSpec = {}): Pose {
  const p = createPose();
  p.root.x = spec.x ?? 0;
  p.root.y = spec.y ?? STAND_Y - 2;
  const leanDeg = spec.lean ?? 0;
  p.lean = leanDeg * DEG;
  p.angles.spine = (spec.spine ?? 90) * DEG;
  p.angles.head = (spec.head ?? 90 - leanDeg * 0.6) * DEG;
  p.angles.upperArmF = (spec.upperArmF ?? -78) * DEG;
  p.angles.lowerArmF = (spec.lowerArmF ?? -62) * DEG;
  p.angles.upperArmB = (spec.upperArmB ?? -100) * DEG;
  p.angles.lowerArmB = (spec.lowerArmB ?? -92) * DEG;
  p.angles.upperLegF = (spec.upperLegF ?? -90) * DEG;
  p.angles.lowerLegF = (spec.lowerLegF ?? -90) * DEG;
  p.angles.upperLegB = (spec.upperLegB ?? -90) * DEG;
  p.angles.lowerLegB = (spec.lowerLegB ?? -90) * DEG;

  const legFAngles = spec.upperLegF !== undefined || spec.lowerLegF !== undefined;
  const legBAngles = spec.upperLegB !== undefined || spec.lowerLegB !== undefined;
  const footF = spec.footF ?? (legFAngles ? undefined : DEFAULT_FOOT_F);
  const footB = spec.footB ?? (legBAngles ? undefined : DEFAULT_FOOT_B);
  if (footF) legIK(p, true, footF);
  if (footB) legIK(p, false, footB);
  if (spec.handF) armIK(p, true, spec.handF, spec.elbowF ?? -1);
  if (spec.handB) armIK(p, false, spec.handB, spec.elbowB ?? -1);

  if (spec.weaponDir !== undefined) {
    p.weapon = spec.weaponDir * DEG - (p.angles.lowerArmF + p.lean);
  } else {
    p.weapon = (spec.weapon ?? 40) * DEG;
  }
  return p;
}

/** Keyframe shorthand; `ease` shapes the move from this key to the next. */
export function key(t: number, spec: PoseSpec | Pose, ease: Ease = 'inOut'): Keyframe {
  return { t, pose: 'angles' in spec ? spec : pose(spec), ease };
}

export function anim(loop: boolean, ...frames: Keyframe[]): Animation {
  return { loop, frames };
}
