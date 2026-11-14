import { lerpAngle, wrapAngle } from './anim';
import type { FighterLook, Point, Pose, WeaponType } from './types';

/**
 * Skeleton dimensions in reference pixels (look.height = 1). Standing straight:
 * hip at STAND_Y, shoulders ~50 above it, head top at 190.
 */
export const RIG = {
  spine: 56,
  neck: 7,
  headRx: 11,
  headRy: 14,
  shoulderAlong: 49,
  shoulderFAcross: 3,
  shoulderBAcross: -4,
  upperArm: 33,
  lowerArm: 31,
  hipX: 3,
  hipDrop: 3,
  upperLeg: 46,
  lowerLeg: 44,
  /** Ankle joint height above the sole. */
  ankle: 6,
} as const;

/** Root height with straight legs and feet on the ground. */
export const STAND_Y = RIG.ankle + RIG.upperLeg + RIG.lowerLeg + RIG.hipDrop;

export interface WeaponSpec {
  /** Grip position along the weapon from the butt, as a fraction of length. */
  grip: number;
  /** Back hand grips this far behind the front hand (reference px); 0 = one-handed. */
  twoHandGap: number;
  /** Trail starts at this fraction of the length (from the butt). */
  trailInner: number;
}

export const WEAPON_SPECS: Record<WeaponType, WeaponSpec> = {
  katana: { grip: 0.1, twoHandGap: 13, trailInner: 0.34 },
  spear: { grip: 0.36, twoHandGap: 36, trailInner: 0.6 },
  staff: { grip: 0.42, twoHandGap: 34, trailInner: 0.62 },
  hammer: { grip: 0.14, twoHandGap: 0, trailInner: 0.62 },
};

/**
 * Solved skeleton in the fighter's local frame: px (already scaled by look.height),
 * origin at the feet centre, x forward (facing right), y up. Directions are absolute
 * angles in that frame (lean already applied).
 */
export interface RigState {
  scale: number;
  hip: Point;
  chest: Point;
  neck: Point;
  head: Point;
  shoulderF: Point;
  elbowF: Point;
  handF: Point;
  shoulderB: Point;
  elbowB: Point;
  handB: Point;
  hipF: Point;
  kneeF: Point;
  ankleF: Point;
  hipB: Point;
  kneeB: Point;
  ankleB: Point;
  weaponBase: Point;
  weaponTip: Point;
  spineDir: number;
  headDir: number;
  upperArmF: number;
  lowerArmF: number;
  upperArmB: number;
  lowerArmB: number;
  upperLegF: number;
  lowerLegF: number;
  upperLegB: number;
  lowerLegB: number;
  weaponDir: number;
  /** 0..1: how much the back hand is wrapped onto the weapon shaft. */
  backGrip: number;
}

const pt = (): Point => ({ x: 0, y: 0 });

export function createRigState(): RigState {
  return {
    scale: 1,
    hip: pt(),
    chest: pt(),
    neck: pt(),
    head: pt(),
    shoulderF: pt(),
    elbowF: pt(),
    handF: pt(),
    shoulderB: pt(),
    elbowB: pt(),
    handB: pt(),
    hipF: pt(),
    kneeF: pt(),
    ankleF: pt(),
    hipB: pt(),
    kneeB: pt(),
    ankleB: pt(),
    weaponBase: pt(),
    weaponTip: pt(),
    spineDir: 0,
    headDir: 0,
    upperArmF: 0,
    lowerArmF: 0,
    upperArmB: 0,
    lowerArmB: 0,
    upperLegF: 0,
    lowerLegF: 0,
    upperLegB: 0,
    lowerLegB: 0,
    weaponDir: 0,
    backGrip: 0,
  };
}

function along(out: Point, from: Point, dir: number, len: number): void {
  out.x = from.x + Math.cos(dir) * len;
  out.y = from.y + Math.sin(dir) * len;
}

/**
 * Two-bone IK from (ax, ay) to (tx, ty). Returns absolute directions [upper, lower].
 * `bend` +1 puts the middle joint on the counter-clockwise side of the a->t line
 * (knees forward for a downward leg), -1 on the clockwise side (elbow down for an arm
 * reaching forward). Unreachable targets give a straight limb pointing at them.
 */
export function solveTwoBone(
  ax: number,
  ay: number,
  tx: number,
  ty: number,
  l1: number,
  l2: number,
  bend: number,
  out: [number, number] = [0, 0],
): [number, number] {
  const dx = tx - ax;
  const dy = ty - ay;
  const minD = Math.abs(l1 - l2) + 1e-4;
  const maxD = l1 + l2 - 1e-4;
  const d = Math.min(maxD, Math.max(minD, Math.hypot(dx, dy)));
  const base = Math.atan2(dy, dx);
  const cosA = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const cosB = (l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2);
  const A = Math.acos(Math.max(-1, Math.min(1, cosA)));
  const B = Math.acos(Math.max(-1, Math.min(1, cosB)));
  const a1 = base + bend * A;
  out[0] = a1;
  out[1] = a1 - bend * (Math.PI - B);
  return out;
}

const ikTmp: [number, number] = [0, 0];

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/**
 * Forward kinematics for `pose` scaled to `look`, written into `out` (no allocation).
 * Also wraps the back hand onto two-handed weapons when the pose puts it near the grip.
 */
export function computeRig(pose: Pose, look: FighterLook, out: RigState): RigState {
  const s = look.height;
  const a = pose.angles;
  const lean = pose.lean;
  out.scale = s;

  out.hip.x = pose.root.x * s;
  out.hip.y = pose.root.y * s;

  const sd = a.spine + lean;
  out.spineDir = sd;
  const ux = Math.cos(sd);
  const uy = Math.sin(sd);
  // Across-the-torso axis pointing to the chest side (forward when upright).
  const nx = uy;
  const ny = -ux;

  out.neck.x = out.hip.x + ux * RIG.spine * s;
  out.neck.y = out.hip.y + uy * RIG.spine * s;
  out.chest.x = out.hip.x + (ux * 36 + nx * 6) * s;
  out.chest.y = out.hip.y + (uy * 36 + ny * 6) * s;

  out.headDir = a.head + lean;
  along(out.head, out.neck, out.headDir, (RIG.neck + RIG.headRy) * s);

  out.shoulderF.x = out.hip.x + (ux * RIG.shoulderAlong + nx * RIG.shoulderFAcross) * s;
  out.shoulderF.y = out.hip.y + (uy * RIG.shoulderAlong + ny * RIG.shoulderFAcross) * s;
  out.shoulderB.x = out.hip.x + (ux * RIG.shoulderAlong + nx * RIG.shoulderBAcross) * s;
  out.shoulderB.y = out.hip.y + (uy * RIG.shoulderAlong + ny * RIG.shoulderBAcross) * s;

  out.upperArmF = a.upperArmF + lean;
  out.lowerArmF = a.lowerArmF + lean;
  out.upperArmB = a.upperArmB + lean;
  out.lowerArmB = a.lowerArmB + lean;
  along(out.elbowF, out.shoulderF, out.upperArmF, RIG.upperArm * s);
  along(out.handF, out.elbowF, out.lowerArmF, RIG.lowerArm * s);
  along(out.elbowB, out.shoulderB, out.upperArmB, RIG.upperArm * s);
  along(out.handB, out.elbowB, out.lowerArmB, RIG.lowerArm * s);

  out.hipF.x = out.hip.x + RIG.hipX * s;
  out.hipF.y = out.hip.y - RIG.hipDrop * s;
  out.hipB.x = out.hip.x - RIG.hipX * s;
  out.hipB.y = out.hipF.y;
  out.upperLegF = a.upperLegF;
  out.lowerLegF = a.lowerLegF;
  out.upperLegB = a.upperLegB;
  out.lowerLegB = a.lowerLegB;
  along(out.kneeF, out.hipF, a.upperLegF, RIG.upperLeg * s);
  along(out.ankleF, out.kneeF, a.lowerLegF, RIG.lowerLeg * s);
  along(out.kneeB, out.hipB, a.upperLegB, RIG.upperLeg * s);
  along(out.ankleB, out.kneeB, a.lowerLegB, RIG.lowerLeg * s);

  const spec = WEAPON_SPECS[look.weapon.type];
  const wl = look.weapon.length * s;
  const wd = out.lowerArmF + pose.weapon;
  out.weaponDir = wd;
  along(out.weaponBase, out.handF, wd, -spec.grip * wl);
  along(out.weaponTip, out.weaponBase, wd, wl);

  // Two-handed grip: pull the back hand onto the shaft when it is posed near it.
  out.backGrip = 0;
  if (spec.twoHandGap > 0) {
    const gx = out.handF.x - Math.cos(wd) * spec.twoHandGap * s;
    const gy = out.handF.y - Math.sin(wd) * spec.twoHandGap * s;
    const dist = Math.hypot(out.handB.x - gx, out.handB.y - gy);
    const w = 1 - smoothstep(24 * s, 46 * s, dist);
    if (w > 0) {
      solveTwoBone(out.shoulderB.x, out.shoulderB.y, gx, gy, RIG.upperArm * s, RIG.lowerArm * s, -1, ikTmp);
      out.upperArmB = lerpAngle(out.upperArmB, ikTmp[0], w);
      out.lowerArmB = lerpAngle(out.lowerArmB, ikTmp[1], w);
      along(out.elbowB, out.shoulderB, out.upperArmB, RIG.upperArm * s);
      along(out.handB, out.elbowB, out.lowerArmB, RIG.lowerArm * s);
      out.backGrip = w;
    }
  }
  return out;
}

/** Absolute world direction of a local direction for the given facing. */
export function worldDir(localDir: number, facing: 1 | -1): number {
  return facing === 1 ? localDir : wrapAngle(Math.PI - localDir);
}
