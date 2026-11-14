// Chains, proximity block and the power strike (the playtest "feel" changes).
import { describe, expect, it } from 'vitest';
import { CHARGE_HOLD_FRAMES, CHARGE_MAX_FRAMES } from './constants';
import { fightMatch, inp, ofType, place, run, runUntil } from './testHelpers';

describe('chains', () => {
  it('light chains into one more light on hit, then into heavy, but not into a third light', () => {
    const m = fightMatch();
    place(m, 500, 560);
    // Light hits on step 5 (startup 4). Press light again at 6, again at 11, heavy at 16.
    const ev = run(m, 40, (k) => inp({ light: k === 0 || k === 6 || k === 11, heavy: k === 16 }));
    const starts = ofType(ev, 'moveStart').map((e) => e.slot);
    expect(starts.slice(0, 2)).toEqual(['light', 'light']);
    expect(starts).not.toEqual(['light', 'light', 'light']);
    expect(starts.filter((s) => s === 'light').length).toBeLessThanOrEqual(2);
    expect(starts).toContain('heavy');
  });

  it('a late press still cancels: the window lasts the whole move after a hit', () => {
    const m = fightMatch();
    place(m, 500, 560);
    // Light total 15; heavy pressed on step 12 (after the old 12-frame window would have closed).
    const ev = run(m, 20, (k) => inp({ light: k === 0, heavy: k === 12 }));
    expect(ofType(ev, 'moveStart').map((e) => e.slot)).toEqual(['light', 'heavy']);
    expect(m.state.fighters[0].move).toBe('heavy');
  });
});

describe('hold back to block', () => {
  it('walking away blocks an incoming strike within reach, and keeps walking otherwise', () => {
    const m = fightMatch();
    place(m, 500, 600);
    // P2 (facing left) attacks; P1 holds left = back.
    const ev = run(m, 12, inp({ left: true }), (k) => inp({ heavy: k === 0 }));
    expect(ofType(ev, 'block')).toHaveLength(1);
    expect(ofType(ev, 'hit')).toHaveLength(0);

    const calm = fightMatch();
    place(calm, 500, 600);
    run(calm, 5, inp({ left: true }));
    expect(calm.state.fighters[0].state).toBe('walk');
  });

  it('back + down blocks low, and holding back keeps the guard up through blockstun', () => {
    const m = fightMatch();
    place(m, 500, 600);
    const ev = run(m, 40, inp({ left: true, down: true }), (k) => inp({ heavy: k === 0, down: k === 0 }));
    expect(ofType(ev, 'block')).toHaveLength(1);
  });

  it('a far-away attack does not freeze the walk', () => {
    const m = fightMatch();
    place(m, 200, 900);
    run(m, 3, inp({ left: true }), (k) => inp({ heavy: k === 0 }));
    expect(m.state.fighters[0].state).toBe('walk');
  });
});

describe('damage scale (difficulty handicap)', () => {
  it('scales the damage of the side it applies to, including chip', () => {
    const full = fightMatch();
    const half = fightMatch();
    half.state.damageScale = [0.5, 1];
    for (const m of [full, half]) place(m, 500, 575);
    const a = ofType(run(full, 12, (k) => inp({ light: k === 0 })), 'hit')[0]?.damage ?? 0;
    const b = ofType(run(half, 12, (k) => inp({ light: k === 0 })), 'hit')[0]?.damage ?? 0;
    expect(a).toBeGreaterThan(0);
    expect(b).toBe(Math.round(a * 0.5));
  });
});

describe('dedicated buttons', () => {
  it('the grab button grabs on its own', () => {
    const m = fightMatch();
    run(m, 1, inp({ grab: true }));
    expect(m.state.fighters[0]).toMatchObject({ state: 'attack', move: 'throw' });
  });

  it('the power button charges at once and releases into the power strike', () => {
    const m = fightMatch();
    run(m, 1, inp({ power: true }));
    expect(m.state.fighters[0].state).toBe('charge');
    run(m, 8, inp({ power: true }));
    expect(m.state.fighters[0].state).toBe('charge');
    run(m, 1, inp({}));
    expect(m.state.fighters[0]).toMatchObject({ state: 'attack', move: 'power' });
  });
});

describe('power strike', () => {
  it('holding heavy after the heavy normal charges, and releasing throws the power strike', () => {
    const m = fightMatch();
    place(m, 300, 900);
    runUntil(m, (mm) => mm.state.fighters[0].state === 'charge', 120, inp({ heavy: true }));
    const f = m.state.fighters[0];
    expect(f.heavyHeld).toBeGreaterThanOrEqual(CHARGE_HOLD_FRAMES);
    run(m, 1, inp({}));
    expect(m.state.fighters[0]).toMatchObject({ state: 'attack', move: 'power', moveFrame: 1 });
  });

  it('releases by itself at maximum charge', () => {
    const m = fightMatch();
    place(m, 300, 900);
    runUntil(m, (mm) => mm.state.fighters[0].state === 'charge', 120, inp({ heavy: true }));
    run(m, CHARGE_MAX_FRAMES, inp({ heavy: true }));
    expect(m.state.fighters[0].move).toBe('power');
  });

  it('is armoured during the wind-up and cannot be blocked', () => {
    const m = fightMatch();
    place(m, 500, 575);
    runUntil(m, (mm) => mm.state.fighters[0].state === 'charge', 120, inp({ heavy: true }), inp({ block: true }));
    run(m, 1, inp({}), inp({ block: true }));
    expect(m.state.fighters[0].move).toBe('power');
    // P2 jabs into the wind-up: damage lands, but the power strike keeps going.
    const health = m.state.fighters[0].health;
    const ev = run(m, 30, inp({}), (k) => inp({ light: k === 0, block: k > 6 }));
    const hits = ofType(ev, 'hit');
    expect(hits.some((h) => h.target === 0 && h.armored)).toBe(true);
    expect(m.state.fighters[0].health).toBeLessThan(health);
    expect(hits.some((h) => h.fighter === 0 && h.slot === 'power')).toBe(true);
    expect(ofType(ev, 'block').some((b) => b.slot === 'power')).toBe(false);
    expect(m.state.fighters[1]).toMatchObject({ knockdownOnLand: true });
  });
});
