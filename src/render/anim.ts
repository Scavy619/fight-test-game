import { BONES, type Animation, type Ease, type Pose } from './types';

const TAU = Math.PI * 2;

/** Wraps an angle difference into [-PI, PI). */
export function wrapAngle(a: number): number {
  const w = (((a + Math.PI) % TAU) + TAU) % TAU;
  return w - Math.PI;
}

/** Interpolates from `a` to `b` along the shortest arc. */
export function lerpAngle(a: number, b: number, t: number): number {
  return a + wrapAngle(b - a) * t;
}

export function applyEase(ease: Ease | undefined, t: number): number {
  switch (ease) {
    case 'in':
      return t * t;
    case 'out':
      return 1 - (1 - t) * (1 - t);
    case 'inOut':
      return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
    default:
      return t;
  }
}

export function createPose(): Pose {
  return {
    root: { x: 0, y: 0 },
    lean: 0,
    angles: {
      spine: 0,
      head: 0,
      upperArmF: 0,
      lowerArmF: 0,
      upperArmB: 0,
      lowerArmB: 0,
      upperLegF: 0,
      lowerLegF: 0,
      upperLegB: 0,
      lowerLegB: 0,
    },
    weapon: 0,
  };
}

export function copyPose(src: Pose, out: Pose = createPose()): Pose {
  out.root.x = src.root.x;
  out.root.y = src.root.y;
  out.lean = src.lean;
  out.weapon = src.weapon;
  for (const b of BONES) out.angles[b] = src.angles[b];
  return out;
}

/** Blends two poses; angles take the shortest path, root is linear. */
export function blendPose(a: Pose, b: Pose, t: number, out: Pose = createPose()): Pose {
  out.root.x = a.root.x + (b.root.x - a.root.x) * t;
  out.root.y = a.root.y + (b.root.y - a.root.y) * t;
  out.lean = lerpAngle(a.lean, b.lean, t);
  out.weapon = lerpAngle(a.weapon, b.weapon, t);
  for (const bone of BONES) out.angles[bone] = lerpAngle(a.angles[bone], b.angles[bone], t);
  return out;
}

/** Length of an animation in frames (last keyframe's t). */
export function animDuration(anim: Animation): number {
  const last = anim.frames[anim.frames.length - 1];
  return last ? last.t : 0;
}

/**
 * Samples an animation at a (possibly fractional) sim frame.
 * Looping animations wrap with period = last key's `t`; others clamp to the first and
 * last keys. Pass `out` to avoid allocating.
 */
export function samplePose(anim: Animation, frame: number, out: Pose = createPose()): Pose {
  const frames = anim.frames;
  const first = frames[0];
  if (!first) return out;
  const last = frames[frames.length - 1] ?? first;
  const period = last.t;

  let f = frame;
  if (anim.loop && period > 0) f = ((f % period) + period) % period;

  if (f <= first.t) return copyPose(first.pose, out);
  if (f >= last.t) return copyPose(last.pose, out);

  // Linear scan: animations have a handful of keys.
  for (let i = 0; i < frames.length - 1; i++) {
    const k0 = frames[i];
    const k1 = frames[i + 1];
    if (!k0 || !k1) break;
    if (f < k1.t) {
      const span = k1.t - k0.t;
      const u = span > 0 ? (f - k0.t) / span : 1;
      return blendPose(k0.pose, k1.pose, applyEase(k0.ease, u), out);
    }
  }
  return copyPose(last.pose, out);
}
