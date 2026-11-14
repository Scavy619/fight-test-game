import { describe, expect, it } from 'vitest';
import { BONES } from '../types';
import { baseAnims } from './base';

const REQUIRED = [
  'idle', 'walk', 'walkBack', 'crouch', 'prejump', 'air', 'block', 'crouchBlock', 'blockstun',
  'hitstun', 'knockdown', 'getup', 'dodge', 'ko', 'win', 'light', 'heavy', 'crouchLight',
  'crouchHeavy', 'airLight', 'airHeavy', 'specialN', 'specialF', 'specialD', 'ultimate',
];

describe('baseAnims', () => {
  it('has every required id', () => {
    for (const id of REQUIRED) expect(baseAnims[id], id).toBeDefined();
  });

  it.each(Object.entries(baseAnims))('%s: keys start at 0, strictly increasing t, all bones finite', (_id, anim) => {
    expect(anim.frames.length).toBeGreaterThan(0);
    expect(anim.frames[0]?.t).toBe(0);
    for (let i = 1; i < anim.frames.length; i++) {
      expect(anim.frames[i]?.t).toBeGreaterThan(anim.frames[i - 1]?.t ?? Infinity);
    }
    for (const k of anim.frames) {
      for (const b of BONES) expect(Number.isFinite(k.pose.angles[b]), b).toBe(true);
      expect(Number.isFinite(k.pose.root.x) && Number.isFinite(k.pose.root.y)).toBe(true);
      expect(Number.isFinite(k.pose.lean) && Number.isFinite(k.pose.weapon)).toBe(true);
    }
  });

  it('loops close on their first pose', () => {
    for (const [id, anim] of Object.entries(baseAnims)) {
      if (!anim.loop) continue;
      const a = anim.frames[0]?.pose;
      const b = anim.frames[anim.frames.length - 1]?.pose;
      expect(b, id).toEqual(a);
    }
  });

  it('attacks reach the strike within the stated window', () => {
    const strike: Record<string, [number, number]> = {
      light: [4, 6],
      heavy: [9, 12],
      crouchLight: [4, 6],
      crouchHeavy: [8, 11],
      airLight: [4, 7],
      airHeavy: [7, 11],
      specialN: [12, 12],
    };
    for (const [id, [lo, hi]] of Object.entries(strike)) {
      const ts = baseAnims[id]?.frames.map((k) => k.t) ?? [];
      expect(ts.some((t) => t >= lo && t <= hi), id).toBe(true);
    }
    const ult = baseAnims.ultimate?.frames ?? [];
    expect(ult[ult.length - 1]?.t).toBeGreaterThanOrEqual(100);
  });
});
