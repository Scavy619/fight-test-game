import { describe, expect, it } from 'vitest';
import { accumulate, DEFAULT_STEP_MS } from './loop';

const STEP = DEFAULT_STEP_MS;

describe('accumulate', () => {
  it('runs no step for less than one step of time and keeps the remainder', () => {
    const r = accumulate(0, 10);
    expect(r.steps).toBe(0);
    expect(r.acc).toBeCloseTo(10);
  });

  it('runs one step per stepMs and carries the leftover', () => {
    const r = accumulate(0, STEP + 5);
    expect(r.steps).toBe(1);
    expect(r.acc).toBeCloseTo(5);
  });

  it('accumulates across frames', () => {
    let acc = 0;
    let steps = 0;
    for (let i = 0; i < 3; i++) {
      const r = accumulate(acc, 10);
      acc = r.acc;
      steps += r.steps;
    }
    expect(steps).toBe(1);
    expect(acc).toBeCloseTo(30 - STEP);
  });

  it('averages 60 steps per second over a second of uneven frames', () => {
    let acc = 0;
    let steps = 0;
    const frames = [8, 25, 16, 17, 9, 24.333];
    let t = 0;
    while (t < 1000) {
      for (const f of frames) {
        const r = accumulate(acc, f);
        acc = r.acc;
        steps += r.steps;
        t += f;
      }
    }
    expect(Math.abs(steps - Math.floor(t / STEP))).toBeLessThanOrEqual(1);
  });

  it('caps at maxSteps and drops the excess whole steps', () => {
    const r = accumulate(0, STEP * 20 + 3, STEP, 5);
    expect(r.steps).toBe(5);
    expect(r.acc).toBeCloseTo(3);
    expect(r.acc).toBeLessThan(STEP);
  });

  it('runs exactly maxSteps when exactly maxSteps are owed', () => {
    expect(accumulate(0, STEP * 5 + 1, STEP, 5).steps).toBe(5);
  });

  it('ignores negative or non-finite elapsed time', () => {
    expect(accumulate(4, -100)).toEqual({ steps: 0, acc: 4 });
    expect(accumulate(4, Number.NaN)).toEqual({ steps: 0, acc: 4 });
    expect(accumulate(4, Number.POSITIVE_INFINITY)).toEqual({ steps: 0, acc: 4 });
  });

  it('respects a custom step size', () => {
    expect(accumulate(0, 100, 10, 50)).toEqual({ steps: 10, acc: 0 });
  });
});
