import { describe, expect, it } from 'vitest';
import { ACTION_BUTTONS, BAR_Y, actionAt, actionRect, overActionBar } from './actionBar';

describe('action bar layout', () => {
  it('is centred on 640 and buttons do not overlap', () => {
    const first = actionRect(0);
    const last = actionRect(ACTION_BUTTONS.length - 1);
    expect((first.x + last.x + last.w) / 2).toBeCloseTo(640);
    for (let k = 1; k < ACTION_BUTTONS.length; k++) {
      expect(actionRect(k).x).toBeGreaterThan(actionRect(k - 1).x + actionRect(k - 1).w);
    }
  });

  it('hit-tests each button by its centre and nothing outside the strip', () => {
    ACTION_BUTTONS.forEach((b, k) => {
      const r = actionRect(k);
      expect(actionAt(r.x + r.w / 2, r.y + r.h / 2)?.id).toBe(b.id);
    });
    expect(actionAt(640, 300)).toBeNull();
    expect(overActionBar(640, BAR_Y)).toBe(true);
    expect(overActionBar(100, BAR_Y)).toBe(false);
    expect(overActionBar(640, 500)).toBe(false);
  });

  it('every button drives at least one input and the ultimate drives heavy + special', () => {
    for (const b of ACTION_BUTTONS) expect(b.inputs.length).toBeGreaterThan(0);
    expect(ACTION_BUTTONS.find((b) => b.id === 'ultimate')?.inputs).toEqual(['heavy', 'special']);
  });
});
