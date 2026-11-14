import { describe, expect, it } from 'vitest';
import { GETUP_FRAMES, HITSTOP, KNOCKDOWN_FRAMES, LANDING_RECOVERY_FRAMES, STAGE_RIGHT } from './constants';
import type { Match, SimEvent } from './types';
import { testFighter } from './testFighter';
import {
  fightMatch, inp, NONE, ofType, place, putInAir, run, runUntil, runUntilEvent, snapshot, tap, withMove,
} from './testHelpers';

/** State without counters and raw input, to detect frozen frames. */
function frozenView(m: Match): string {
  const fighters = m.state.fighters.map((f) => ({ ...f, input: null }));
  return JSON.stringify({ ...m.state, fighters, frame: 0, hitstop: 0 });
}

/** Steps after the current one during which nothing changes (P2 holding `p1`). */
function countFrozenFrames(m: Match, p1 = NONE): number {
  let n = 0;
  for (;;) {
    const before = frozenView(m);
    run(m, 1, NONE, p1);
    if (frozenView(m) !== before) return n;
    n += 1;
  }
}

describe('hits', () => {
  it('light hits on its 5th frame, causes hitstun and is +3', () => {
    const m = fightMatch();
    place(m, 500, 600);
    const [a, b] = m.state.fighters;
    const start = run(m, 4, tap({ light: true }));
    expect(ofType(start, 'moveStart')).toMatchObject([{ fighter: 0, slot: 'light', anim: 'light', element: 'wind', strength: 'light' }]);
    expect(ofType(start, 'hit')).toHaveLength(0);
    const hitStep = run(m, 1);
    expect(ofType(hitStep, 'hit')).toMatchObject([
      { fighter: 0, target: 1, slot: 'light', damage: 40, combo: 1, strength: 'light', element: 'wind', projectile: null, launches: false },
    ]);
    expect(b.health).toBe(960);
    expect(b.state).toBe('hitstun');
    expect(a.combo).toBe(1);
    expect(m.state.hitstop).toBe(HITSTOP.light);

    run(m, HITSTOP.light);
    let attackerFree = -1;
    let defenderFree = -1;
    for (let k = 1; k <= 20; k++) {
      run(m, 1);
      if (attackerFree < 0 && a.state === 'idle') attackerFree = k;
      if (defenderFree < 0 && b.state === 'idle') defenderFree = k;
    }
    expect(defenderFree).toBe(14);
    expect(defenderFree - attackerFree).toBe(3);
  });

  it('reports a whiff when the hitboxes end without connecting', () => {
    const m = fightMatch();
    const events = run(m, 8, tap({ light: true }));
    expect(ofType(events, 'whiff')).toEqual([
      { type: 'whiff', fighter: 0, slot: 'light', x: 440, y: 0, element: 'wind', strength: 'light' },
    ]);
  });

  it('pushes the defender back with friction', () => {
    const m = fightMatch();
    place(m, 500, 590);
    runUntilEvent(m, 'hit', 20, tap({ heavy: true }));
    run(m, 40);
    expect(m.state.fighters[0].x).toBe(500);
    expect(m.state.fighters[1].x).toBe(590 + 39); // 6 + 5.5 + ... + 0.5
  });

  it('in the corner the attacker is pushed back instead', () => {
    const m = fightMatch();
    place(m, 1130, STAGE_RIGHT);
    runUntilEvent(m, 'hit', 20, tap({ heavy: true }));
    run(m, 40);
    expect(m.state.fighters[1].x).toBe(STAGE_RIGHT);
    expect(m.state.fighters[0].x).toBe(1130 - 39);
  });

  it('trades: both hit on the same frame and both take the hit', () => {
    const m = fightMatch();
    place(m, 500, 600);
    const events = run(m, 5, tap({ light: true }), tap({ light: true }));
    expect(ofType(events, 'hit').map((e) => e.fighter).sort()).toEqual([0, 1]);
    expect(m.state.fighters.map((f) => [f.state, f.health])).toEqual([['hitstun', 960], ['hitstun', 960]]);
  });

  it('a multi-hit move hits once per hit group', () => {
    const m = fightMatch();
    place(m, 500, 600);
    m.state.fighters[0].meter = 100;
    const events = run(m, 160, tap({ heavy: true, special: true }));
    const hits = ofType(events, 'hit');
    expect(hits.map((h) => h.combo)).toEqual([1, 2, 3, 4, 5]);
    expect(hits.map((h) => h.damage)).toEqual([72, 65, 58, 52, 47]);
    expect(m.state.fighters[1].health).toBe(1000 - 294);
  });

  it('a hitbox can override launches and knockback (launching last hit)', () => {
    const boxes = testFighter.moves.ultimate.hitboxes.map((b, k, all) =>
      k === all.length - 1 ? { ...b, launches: true, knockback: { x: 3, y: 12 } } : b,
    );
    const def = withMove(testFighter, 'ultimate', { hitboxes: boxes });
    const m = fightMatch({ p0: def });
    place(m, 500, 600);
    m.state.fighters[0].meter = 100;
    const events = run(m, 160, tap({ heavy: true, special: true }));
    const hits = ofType(events, 'hit');
    expect(hits.map((h) => h.launches)).toEqual([false, false, false, false, true]);
    expect(ofType(events, 'land').some((e) => e.fighter === 1 && e.hard)).toBe(true);
  });

  it('a hitbox without overrides uses the move values', () => {
    const def = withMove(testFighter, 'light', {
      hitboxes: [{ ...testFighter.moves.light.hitboxes[0]!, knockback: undefined, launches: undefined }],
    });
    const m = fightMatch({ p0: def });
    place(m, 500, 600);
    const events = runUntilEvent(m, 'hit', 10, tap({ light: true }));
    expect(ofType(events, 'hit')).toMatchObject([{ launches: false }]);
    expect(m.state.fighters[1].pushback).toBe(4);
  });
});

describe('hitstop', () => {
  it.each([
    ['light', tap({ light: true }), HITSTOP.light],
    ['heavy', tap({ heavy: true }), HITSTOP.heavy],
    ['special', tap({ special: true }, { right: true }), HITSTOP.special],
  ] as const)('freezes everything for the %s hitstop, half on block', (_, input, frames) => {
    const m = fightMatch();
    place(m, 500, 600);
    runUntilEvent(m, 'hit', 40, input);
    expect(countFrozenFrames(m)).toBe(frames);

    const mb = fightMatch();
    place(mb, 500, 600);
    runUntilEvent(mb, 'block', 40, input, inp({ block: true }));
    expect(countFrozenFrames(mb, inp({ block: true }))).toBe(Math.floor(frames / 2));
  });

  it('presses during hitstop are buffered without expiring', () => {
    const m = fightMatch();
    place(m, 500, 600);
    runUntilEvent(m, 'hit', 10, tap({ heavy: true }));
    run(m, 1, tap({ special: true }));
    run(m, HITSTOP.heavy - 1);
    expect(m.state.fighters[0].input.buffer.special).toBe(6);
    const ev = run(m, 1);
    expect(ofType(ev, 'moveStart')).toMatchObject([{ slot: 'specialN' }]);
  });
});

describe('block', () => {
  function blockTest(attack: Parameters<typeof run>[2], defend: Parameters<typeof run>[3], airborne = false): SimEvent[] {
    const m = fightMatch();
    place(m, 500, airborne ? 580 : 600);
    if (airborne) putInAir(m, 0, 60);
    return run(m, 25, attack, defend);
  }
  const standBlock = inp({ block: true });
  const crouchBlock = inp({ block: true, down: true });
  const kinds = (ev: SimEvent[]): string[] => ev.filter((e) => e.type === 'hit' || e.type === 'block').map((e) => e.type);

  it('standing block stops mids and overheads but not lows', () => {
    expect(kinds(blockTest(tap({ light: true }), standBlock))).toEqual(['block']);
    expect(kinds(blockTest(tap({ heavy: true }), standBlock, true))).toEqual(['block']);
    expect(kinds(blockTest(tap({ light: true }, { down: true }), standBlock))).toEqual(['hit']);
  });

  it('crouching block stops mids and lows but not overheads', () => {
    expect(kinds(blockTest(tap({ light: true }), crouchBlock))).toEqual(['block']);
    expect(kinds(blockTest(tap({ light: true }, { down: true }), crouchBlock))).toEqual(['block']);
    expect(kinds(blockTest(tap({ heavy: true }), crouchBlock, true))).toEqual(['hit']);
  });

  it('blockstun returns to block while block is held, to idle otherwise', () => {
    const m = fightMatch();
    place(m, 500, 600);
    const b = m.state.fighters[1];
    runUntilEvent(m, 'block', 10, tap({ light: true }), standBlock);
    expect(b.state).toBe('blockstun');
    expect(b.stunFrames).toBe(10);
    runUntil(m, () => b.state !== 'blockstun', 30, NONE, standBlock);
    expect(b.state).toBe('block');

    const m2 = fightMatch();
    place(m2, 500, 600);
    runUntilEvent(m2, 'block', 10, tap({ light: true }), standBlock);
    const b2 = m2.state.fighters[1];
    runUntil(m2, () => b2.state !== 'blockstun', 30);
    expect(b2.state).toBe('idle');
  });

  it('cannot block while attacking or in the air', () => {
    const m = fightMatch();
    place(m, 500, 600);
    // P2 starts a heavy (slow) and holds block during it.
    const ev = run(m, 6, tap({ light: true }), tap({ heavy: true }, { block: true }));
    expect(kinds(ev)).toEqual(['hit']);

    const m2 = fightMatch();
    place(m2, 500, 580);
    putInAir(m2, 1, 60);
    const ev2 = run(m2, 6, tap({ light: true }), inp({ block: true }));
    expect(kinds(ev2)).toEqual(['hit']);
  });

  it('blocked normals deal no chip, blocked specials do', () => {
    const m = fightMatch();
    place(m, 500, 600);
    const ev = run(m, 20, tap({ heavy: true }), standBlock);
    expect(ofType(ev, 'block')).toMatchObject([{ chip: 0, crouching: false }]);
    expect(m.state.fighters[1].health).toBe(1000);

    const m2 = fightMatch();
    place(m2, 500, 600);
    const ev2 = run(m2, 30, tap({ special: true }, { right: true }), standBlock);
    expect(ofType(ev2, 'block')).toMatchObject([{ slot: 'specialF', chip: 15 }]);
    expect(m2.state.fighters[1].health).toBe(985);
  });

  it('chip damage never KOs', () => {
    const m = fightMatch();
    place(m, 500, 600);
    m.state.fighters[1].health = 10;
    run(m, 30, tap({ special: true }, { right: true }), standBlock);
    expect(m.state.fighters[1].health).toBe(1);
    expect(m.state.phase).toBe('fight');

    const m2 = fightMatch();
    place(m2, 500, 600);
    m2.state.fighters[1].health = 1;
    run(m2, 30, tap({ special: true }, { right: true }), standBlock);
    expect(m2.state.fighters[1].health).toBe(1);
  });
});

describe('state transitions', () => {
  it('launch: air arc, knockdown (invulnerable), getup (invulnerable), idle', () => {
    const m = fightMatch();
    place(m, 500, 600);
    const b = m.state.fighters[1];
    const ev = runUntilEvent(m, 'hit', 20, tap({ heavy: true }, { down: true }));
    expect(ofType(ev, 'hit')[0]).toMatchObject({ slot: 'crouchHeavy', launches: true });
    expect(b).toMatchObject({ state: 'hitstun', knockdownOnLand: true });
    run(m, HITSTOP.heavy + 2);
    expect(b.y).toBeGreaterThan(0);
    const landing = runUntilEvent(m, 'land', 60);
    expect(ofType(landing, 'land')).toMatchObject([{ fighter: 1, hard: true }]);
    expect(b).toMatchObject({ state: 'knockdown', invulnerable: true, y: 0 });
    run(m, KNOCKDOWN_FRAMES);
    expect(b).toMatchObject({ state: 'getup', invulnerable: true });
    run(m, GETUP_FRAMES);
    expect(b).toMatchObject({ state: 'idle', invulnerable: false });
  });

  it('an airborne defender is knocked down even by a non-launching hit', () => {
    const m = fightMatch();
    place(m, 500, 580);
    putInAir(m, 1, 40);
    run(m, 5, tap({ light: true }));
    expect(m.state.fighters[1]).toMatchObject({ state: 'hitstun', knockdownOnLand: true });
    runUntilEvent(m, 'land', 60);
    expect(m.state.fighters[1].state).toBe('knockdown');
  });

  it('knocked-down fighters cannot be hit', () => {
    const m = fightMatch();
    place(m, 500, 600);
    const b = m.state.fighters[1];
    b.state = 'knockdown';
    b.stateFrame = 1;
    const ev = run(m, 10, tap({ light: true }));
    expect(ofType(ev, 'hit')).toHaveLength(0);
  });

  it('air attacks end on landing with 4 frames of landing recovery', () => {
    const m = fightMatch();
    putInAir(m, 0, 60);
    const a = m.state.fighters[0];
    runUntilEvent(m, 'land', 30, tap({ light: true }));
    expect(a).toMatchObject({ state: 'land', move: null, stateFrame: 1 });
    run(m, LANDING_RECOVERY_FRAMES - 1);
    expect(a.state).toBe('land');
    run(m, 1);
    expect(a.state).toBe('idle');
  });

  it('a plain jump lands straight into idle', () => {
    const m = fightMatch();
    putInAir(m, 0, 60);
    runUntilEvent(m, 'land', 30);
    expect(m.state.fighters[0].state).toBe('idle');
  });

  it('allows one air attack per jump', () => {
    const m = fightMatch();
    putInAir(m, 0, 300);
    const ev = run(m, 26, (k) => inp({ light: k === 0 || k === 20 }));
    expect(ofType(ev, 'moveStart')).toHaveLength(1);
    expect(m.state.fighters[0].state).toBe('air');
  });
});

describe('throws', () => {
  const thrower = withMove(testFighter, 'light', {
    throw: true, startup: 1, active: 1, recovery: 20, damage: 100, launches: true,
    knockback: { x: 3, y: 8 }, hitboxes: [{ x: 0, y: 40, w: 50, h: 100 }], cancels: undefined,
  });
  const throwVariants = (setup: (m: Match) => void, defend = NONE): { throwHits: number; strikeHits: number } => {
    const result = [thrower, withMove(thrower, 'light', { throw: false })].map((def) => {
      const m = fightMatch({ p0: def });
      place(m, 500, 575);
      setup(m);
      return ofType(run(m, 4, tap({ light: true }), defend), 'hit').length;
    });
    return { throwHits: result[0] ?? -1, strikeHits: result[1] ?? -1 };
  };

  it('ignores block', () => {
    expect(throwVariants(() => {}, inp({ block: true }))).toEqual({ throwHits: 1, strikeHits: 0 });
  });

  it('knocks down', () => {
    const m = fightMatch({ p0: thrower });
    place(m, 500, 575);
    run(m, 3, tap({ light: true }));
    expect(m.state.fighters[1]).toMatchObject({ state: 'hitstun', knockdownOnLand: true, health: 900 });
  });

  it('whiffs on airborne, stunned and dodging opponents', () => {
    expect(throwVariants((m) => putInAir(m, 1, 30))).toEqual({ throwHits: 0, strikeHits: 1 });
    for (const state of ['hitstun', 'blockstun'] as const) {
      expect(throwVariants((m) => {
        Object.assign(m.state.fighters[1], { state, stateFrame: 1, stunFrames: 30 });
      })).toEqual({ throwHits: 0, strikeHits: 1 });
    }
    // Late dodge frames are vulnerable to strikes but not throwable.
    expect(throwVariants((m) => {
      Object.assign(m.state.fighters[1], { state: 'dodge', stateFrame: 15 });
    })).toEqual({ throwHits: 0, strikeHits: 1 });
  });

  it('whiffs on invulnerable opponents', () => {
    expect(throwVariants((m) => {
      Object.assign(m.state.fighters[1], { state: 'getup', stateFrame: 1 });
    })).toEqual({ throwHits: 0, strikeHits: 0 });
  });
});

describe('cancels and combos', () => {
  it('light cancels into heavy on hit, with combo scaling', () => {
    const m = fightMatch();
    place(m, 500, 600);
    const [a, b] = m.state.fighters;
    runUntilEvent(m, 'hit', 10, tap({ light: true }));
    const ev = runUntilEvent(m, 'hit', 30, tap({ heavy: true }));
    const start = ofType(ev, 'moveStart')[0];
    expect(start).toMatchObject({ slot: 'heavy' });
    expect(ofType(ev, 'hit')).toMatchObject([{ slot: 'heavy', combo: 2, damage: 81 }]);
    expect(b.health).toBe(1000 - 40 - 81);
    expect(a.combo).toBe(2);
    expect(a.comboDamage).toBe(121);
  });

  it('light -> heavy -> special chain scales 1, 0.9, 0.81', () => {
    const m = fightMatch();
    place(m, 500, 600);
    const all = [
      ...runUntilEvent(m, 'hit', 10, tap({ light: true })),
      ...runUntilEvent(m, 'hit', 30, tap({ heavy: true })),
      ...runUntilEvent(m, 'hit', 40, tap({ special: true }, { right: true })),
    ];
    expect(ofType(all, 'hit').map((h) => [h.slot, h.combo, h.damage])).toEqual([
      ['light', 1, 40], ['heavy', 2, 81], ['specialF', 3, 81],
    ]);
  });

  it('scaling floors at 0.4', () => {
    const multi = withMove(testFighter, 'ultimate', {
      hitboxes: Array.from({ length: 12 }, (_, g) => ({ x: 10, y: 30, w: 110, h: 140, from: 51 + 2 * g, to: 51 + 2 * g, group: g })),
      damage: 100, active: 24,
    });
    const m = fightMatch({ p0: multi });
    place(m, 500, 600);
    m.state.fighters[0].meter = 100;
    const ev = run(m, 250, tap({ heavy: true, special: true }));
    const dmg = ofType(ev, 'hit').map((h) => h.damage);
    expect(dmg.slice(0, 3)).toEqual([100, 90, 81]);
    expect(dmg.slice(9)).toEqual([40, 40, 40]);
  });

  it('the combo resets when the defender leaves hitstun', () => {
    const m = fightMatch();
    place(m, 500, 600);
    const [a, b] = m.state.fighters;
    runUntilEvent(m, 'hit', 10, tap({ light: true }));
    runUntil(m, () => b.state !== 'hitstun', 40);
    expect(a.combo).toBe(0);
    place(m, a.x, a.x + 100);
    const ev = runUntilEvent(m, 'hit', 10, tap({ light: true }));
    expect(ofType(ev, 'hit')).toMatchObject([{ combo: 1, damage: 40 }]);
  });

  it('no cancel on whiff: the press waits in the buffer and expires', () => {
    const m = fightMatch();
    const ev = run(m, 30, (k) => inp({ light: k === 0, heavy: k === 2 }));
    expect(ofType(ev, 'moveStart').map((e) => e.slot)).toEqual(['light']);
  });

  it('a buffered press fires on the first actionable frame (6-frame buffer)', () => {
    // Light (15 frames) is actionable again on step 16 (k = 15).
    const late = fightMatch();
    const ev = run(late, 30, (k) => inp({ light: k === 0, heavy: k === 10 }));
    expect(ofType(ev, 'moveStart').map((e) => e.slot)).toEqual(['light', 'heavy']);
    const tooEarly = fightMatch();
    const ev2 = run(tooEarly, 30, (k) => inp({ light: k === 0, heavy: k === 9 }));
    expect(ofType(ev2, 'moveStart').map((e) => e.slot)).toEqual(['light']);
  });

  it('a move cannot cancel into a slot it does not list (light into light)', () => {
    const m = fightMatch();
    place(m, 500, 600);
    runUntilEvent(m, 'hit', 10, tap({ light: true }));
    run(m, 1, tap({ light: true }));
    run(m, HITSTOP.light);
    expect(m.state.fighters[0]).toMatchObject({ move: 'light', moveFrame: 6 });
  });

  it('no cancel after the cancel window', () => {
    const m = fightMatch();
    place(m, 500, 600);
    runUntilEvent(m, 'hit', 10, tap({ light: true }));
    run(m, HITSTOP.light);
    runUntil(m, (mm) => mm.state.fighters[0].moveFrame === 12, 20);
    run(m, 1, tap({ heavy: true }));
    expect(m.state.fighters[0]).toMatchObject({ move: 'light', moveFrame: 13 });
  });

  it('light does not link into light: the defender blocks the second one', () => {
    // The attacker presses light again as early as the buffer allows; the
    // defender starts holding block once hit.
    const m = fightMatch();
    place(m, 500, 600);
    let blocking = false;
    const all: SimEvent[] = [];
    for (let k = 0; k < 40; k++) {
      const evs = run(m, 1, inp({ light: k === 0 || k === 20 }), inp({ block: blocking }));
      if (evs.some((e) => e.type === 'hit')) blocking = true;
      all.push(...evs);
    }
    expect(all.filter((e) => e.type === 'hit' || e.type === 'block').map((e) => e.type)).toEqual(['hit', 'block']);
  });

  it('every match state stays deterministic through a combo', () => {
    const a = fightMatch();
    const b = fightMatch();
    for (const m of [a, b]) {
      place(m, 500, 600);
      runUntilEvent(m, 'hit', 10, tap({ light: true }));
      runUntilEvent(m, 'hit', 30, tap({ heavy: true }));
    }
    expect(snapshot(a)).toBe(snapshot(b));
  });
});
