import { describe, expect, it } from 'vitest';
import { hitboxToWorld, overlapCentre, rectsOverlap } from './geometry';
import { testFighter } from './testFighter';
import { MOVE_SLOTS } from './types';
import { validateFighterDef } from './validate';
import { withMove } from './testHelpers';

describe('hitbox geometry', () => {
  const box = { x: 20, y: 10, w: 30, h: 40 };

  it('converts a right-facing hitbox to world space', () => {
    expect(hitboxToWorld(box, 100, 0, 1)).toEqual({ x: 120, y: 10, w: 30, h: 40 });
  });

  it('mirrors around the origin when facing left', () => {
    expect(hitboxToWorld(box, 100, 0, -1)).toEqual({ x: 50, y: 10, w: 30, h: 40 });
  });

  it('offsets by the fighter height above ground', () => {
    expect(hitboxToWorld({ ...box, y: -15 }, 100, 60, 1).y).toBe(45);
  });

  it('touching edges do not overlap; the overlap centre is the intersection centre', () => {
    const a = { x: 0, y: 0, w: 10, h: 10 };
    expect(rectsOverlap(a, { x: 10, y: 0, w: 10, h: 10 })).toBe(false);
    expect(rectsOverlap(a, { x: 9, y: 9, w: 10, h: 10 })).toBe(true);
    expect(overlapCentre(a, { x: 6, y: 2, w: 10, h: 4 })).toEqual({ x: 8, y: 4 });
  });
});

describe('testFighter', () => {
  it('is valid and uses every slot with anim ids equal to the slot names', () => {
    expect(validateFighterDef(testFighter)).toEqual([]);
    expect(Object.keys(testFighter.moves).sort()).toEqual([...MOVE_SLOTS].sort());
    for (const slot of MOVE_SLOTS) expect(testFighter.moves[slot].anim).toBe(slot);
  });

  it('has the move kinds the brief asks for', () => {
    const { moves } = testFighter;
    expect(moves.specialN.projectile).toBeDefined();
    expect(moves.specialF.velocity?.length).toBeGreaterThan(0);
    expect(moves.specialD).toMatchObject({ launches: true });
    expect(moves.specialD.invulnerable).toBeDefined();
    expect(moves.crouchHeavy).toMatchObject({ launches: true, level: 'low' });
    expect(new Set(moves.ultimate.hitboxes.map((b) => b.group)).size).toBeGreaterThan(1);
    expect(moves.light.cancels?.into).toContain('heavy');
    expect(moves.heavy.cancels?.into).toContain('specialF');
  });

  it('no normal links into itself (startup is longer than the advantage on hit)', () => {
    for (const slot of ['light', 'heavy', 'crouchLight'] as const) {
      const m = testFighter.moves[slot];
      const advantage = m.hitstun - (m.active + m.recovery);
      expect(advantage, slot).toBeLessThan(m.startup);
    }
  });
});

describe('validateFighterDef', () => {
  it('reports broken data', () => {
    let def = withMove(testFighter, 'airLight', { level: 'mid' });
    def = withMove(def, 'ultimate', { startup: 20 });
    def = withMove(def, 'light', { hitboxes: [{ x: 0, y: 0, w: 0, h: 10, from: 1, to: 99 }] });
    const problems = validateFighterDef(def);
    expect(problems).toContain('airLight: air attacks must be overhead');
    expect(problems.some((p) => p.startsWith('ultimate: startup'))).toBe(true);
    expect(problems).toContain('light: hitbox with non-positive size');
    expect(problems.some((p) => p.startsWith('light: hitbox frames'))).toBe(true);
  });
});
