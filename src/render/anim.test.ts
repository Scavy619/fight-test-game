import { describe, expect, it } from 'vitest';
import { applyEase, createPose, lerpAngle, samplePose, wrapAngle } from './anim';
import type { Animation, Pose } from './types';

function p(spine: number, rootY = 0): Pose {
  const pose = createPose();
  pose.angles.spine = spine;
  pose.root.y = rootY;
  return pose;
}

const lin: Animation = {
  loop: false,
  frames: [
    { t: 0, pose: p(0, 0) },
    { t: 10, pose: p(1, 100) },
  ],
};

describe('samplePose', () => {
  it('interpolates linearly between keys', () => {
    const s = samplePose(lin, 5);
    expect(s.angles.spine).toBeCloseTo(0.5);
    expect(s.root.y).toBeCloseTo(50);
    expect(samplePose(lin, 2.5).root.y).toBeCloseTo(25);
  });

  it('clamps before the first and after the last key when not looping', () => {
    expect(samplePose(lin, -5).root.y).toBe(0);
    expect(samplePose(lin, 10).root.y).toBe(100);
    expect(samplePose(lin, 999).angles.spine).toBe(1);
  });

  it('loops with period equal to the last key time', () => {
    const loop: Animation = {
      loop: true,
      frames: [
        { t: 0, pose: p(0, 0) },
        { t: 10, pose: p(0, 100) },
        { t: 20, pose: p(0, 0) },
      ],
    };
    expect(samplePose(loop, 25).root.y).toBeCloseTo(50);
    expect(samplePose(loop, 40).root.y).toBeCloseTo(0);
    expect(samplePose(loop, 30).root.y).toBeCloseTo(100);
    expect(samplePose(loop, -5).root.y).toBeCloseTo(50);
  });

  it('applies the easing of the segment start key', () => {
    const eased: Animation = {
      loop: false,
      frames: [
        { t: 0, pose: p(0, 0), ease: 'in' },
        { t: 10, pose: p(0, 100), ease: 'out' },
        { t: 20, pose: p(0, 200) },
      ],
    };
    expect(samplePose(eased, 5).root.y).toBeCloseTo(25); // in: t^2
    expect(samplePose(eased, 15).root.y).toBeCloseTo(175); // out: 1-(1-t)^2
    expect(applyEase('inOut', 0.25)).toBeCloseTo(0.125);
    expect(applyEase('inOut', 0.5)).toBeCloseTo(0.5);
    expect(applyEase('inOut', 0.75)).toBeCloseTo(0.875);
    expect(applyEase('linear', 0.3)).toBeCloseTo(0.3);
  });

  it('takes the shortest path for angles across the wrap', () => {
    const deg = Math.PI / 180;
    const wrap: Animation = {
      loop: false,
      frames: [
        { t: 0, pose: p(170 * deg) },
        { t: 10, pose: p(-170 * deg) },
      ],
    };
    const mid = samplePose(wrap, 5).angles.spine;
    expect(Math.abs(wrapAngle(mid - Math.PI))).toBeLessThan(1e-9);
    const quarter = samplePose(wrap, 2.5).angles.spine;
    expect(wrapAngle(quarter - 175 * deg)).toBeCloseTo(0);
    expect(lerpAngle(-3, 3, 0.5)).toBeCloseTo(-Math.PI, 5);
  });

  it('writes into the provided output pose without changing keys', () => {
    const out = createPose();
    const r = samplePose(lin, 5, out);
    expect(r).toBe(out);
    expect(lin.frames[0]?.pose.root.y).toBe(0);
    r.root.y = 1234;
    expect(samplePose(lin, 0).root.y).toBe(0);
  });
});
