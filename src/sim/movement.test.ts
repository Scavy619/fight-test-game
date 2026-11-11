import { describe, expect, it } from 'vitest';
import { INTRO_FRAMES, STAGE_LEFT, STAGE_RIGHT } from './constants';
import { bodyRect } from './geometry';
import { createMatch, step } from './match';
import { testFighter } from './testFighter';
import { fightMatch, inp, NONE, ofType, place, putInAir, run, runUntil, tap } from './testHelpers';

describe('match creation and intro', () => {
  it('starts in the intro with fighters at their start positions', () => {
    const m = createMatch({ fighters: [testFighter, testFighter] });
    const s = m.state;
    expect(s.phase).toBe('intro');
    expect(s.round).toBe(1);
    expect(s.wins).toEqual([0, 0]);
    expect(s.timer).toBe(60 * 60);
    expect(s.roundsToWin).toBe(2);
    expect(s.fighters.map((f) => [f.x, f.y, f.facing, f.health, f.meter])).toEqual([
      [440, 0, 1, 1000, 0],
      [840, 0, -1, 1000, 0],
    ]);
    expect(s.hitstop).toBe(0);
    expect(s.superFreeze).toBeNull();
    expect(s.winner).toBeNull();
  });

  it('honours roundsToWin and roundSeconds', () => {
    const m = createMatch({ fighters: [testFighter, testFighter], roundsToWin: 3, roundSeconds: 99 });
    expect(m.state.roundsToWin).toBe(3);
    expect(m.state.timer).toBe(99 * 60);
  });

  it('state is plain serialisable data', () => {
    const m = createMatch({ fighters: [testFighter, testFighter] });
    run(m, 120, inp({ right: true, light: true }));
    expect(JSON.parse(JSON.stringify(m.state))).toEqual(m.state);
    expect(structuredClone(m.state)).toEqual(m.state);
  });

  it('ignores input for 90 frames, then starts the fight', () => {
    const m = createMatch({ fighters: [testFighter, testFighter] });
    const first = step(m, [inp({ right: true }), inp({ left: true })]);
    expect(first).toContainEqual({ type: 'roundIntro', round: 1 });
    const events = run(m, INTRO_FRAMES - 1, inp({ right: true, light: true }), inp({ left: true }));
    expect(m.state.fighters[0].x).toBe(440);
    expect(m.state.fighters[1].x).toBe(840);
    expect(ofType(events, 'moveStart')).toHaveLength(0);
    expect(m.state.phase).toBe('fight');
    expect(events.at(-1)).toEqual({ type: 'roundStart', round: 1 });
    // A button held across the start of the fight is not a new press.
    run(m, 5, inp({ light: true }));
    expect(m.state.fighters[0].state).toBe('idle');
  });
});

describe('walking and bounds', () => {
  it('walks forward with walkSpeed and backward with backSpeed', () => {
    const m = fightMatch();
    run(m, 10, inp({ right: true }), inp({ right: true }));
    const [a, b] = m.state.fighters;
    expect(a.state).toBe('walk');
    expect(a.x).toBe(440 + 10 * testFighter.stats.walkSpeed);
    expect(b.x).toBe(840 + 10 * testFighter.stats.backSpeed);
  });

  it('cannot leave the stage', () => {
    const m = fightMatch();
    run(m, 200, inp({ left: true }), inp({ right: true }));
    expect(m.state.fighters[0].x).toBe(STAGE_LEFT);
    expect(m.state.fighters[1].x).toBe(STAGE_RIGHT);
  });

  it('crouches with down, lowering the body box', () => {
    const m = fightMatch();
    run(m, 2, inp({ down: true, right: true }));
    const f = m.state.fighters[0];
    expect(f.state).toBe('crouch');
    expect(f.crouching).toBe(true);
    expect(f.x).toBe(440);
    expect(bodyRect(f, testFighter).h).toBe(testFighter.stats.crouchHeight);
  });
});

describe('jumping', () => {
  it('has 3 prejump frames, then a ballistic arc back to the same spot', () => {
    const m = fightMatch();
    const events = run(m, 3, tap({ up: true }));
    expect(m.state.fighters[0].state).toBe('prejump');
    expect(ofType(events, 'jump')).toHaveLength(0);
    const takeoff = run(m, 1);
    expect(ofType(takeoff, 'jump')).toEqual([{ type: 'jump', fighter: 0, dir: 0, x: 440, y: 0 }]);
    expect(m.state.fighters[0].state).toBe('air');
    const rest = runUntil(m, (_, ev) => ev.some((e) => e.type === 'land'), 60);
    // 15 px/f up, 0.8 gravity: lands on the 37th airborne frame.
    expect(rest).toHaveLength(1);
    expect(m.state.fighters[0]).toMatchObject({ state: 'idle', x: 440, y: 0, vy: 0 });
    expect(m.state.frame).toBe(INTRO_FRAMES + 3 + 1 + 36);
  });

  it('fixes the jump direction at takeoff (no air control)', () => {
    const m = fightMatch();
    run(m, 4, (k) => inp({ up: k === 0, right: true }));
    const f = m.state.fighters[0];
    expect(f.jumpDir).toBe(1);
    expect(f.vx).toBe(testFighter.stats.jumpForwardSpeed);
    const x0 = f.x;
    run(m, 10, inp({ left: true }));
    expect(f.x).toBeCloseTo(x0 + 10 * testFighter.stats.jumpForwardSpeed);
  });

  it('jumps backward when back is held at takeoff', () => {
    const m = fightMatch();
    run(m, 4, (k) => inp({ up: k === 0, left: true }));
    expect(m.state.fighters[0].jumpDir).toBe(-1);
    expect(m.state.fighters[0].vx).toBe(-testFighter.stats.jumpForwardSpeed);
  });

  it('has no double jump', () => {
    const m = fightMatch();
    const events = run(m, 30, inp({ up: true }));
    expect(ofType(events, 'jump')).toHaveLength(1);
  });
});

describe('facing', () => {
  it('turns to face the opponent when grounded and neutral', () => {
    const m = fightMatch();
    const [a] = m.state.fighters;
    a.x = 900; // now right of the opponent but still facing right
    run(m, 1);
    expect(a.facing).toBe(-1);
  });

  it('does not turn during an attack or in the air', () => {
    const m = fightMatch();
    const [a] = m.state.fighters;
    run(m, 1, tap({ light: true }));
    a.x = 900;
    run(m, 3);
    expect(a.state).toBe('attack');
    expect(a.facing).toBe(1);

    const m2 = fightMatch();
    putInAir(m2, 0, 100);
    m2.state.fighters[0].x = 900;
    run(m2, 3);
    expect(m2.state.fighters[0].facing).toBe(1);
    runUntil(m2, (mm) => mm.state.fighters[0].state === 'idle', 40);
    run(m2, 1);
    expect(m2.state.fighters[0].facing).toBe(-1);
  });
});

describe('body push', () => {
  it('bodies never overlap: walking into an idle opponent pushes it at half speed', () => {
    const m = fightMatch();
    place(m, 440, 540);
    const [a, b] = m.state.fighters;
    for (let k = 0; k < 40; k++) {
      run(m, 1, inp({ right: true }));
      expect(b.x - a.x).toBeGreaterThanOrEqual(testFighter.stats.width - 1e-9);
    }
    expect(b.x - a.x).toBe(testFighter.stats.width);
    expect(b.x).toBe(540 + (40 * 4 - 30) / 2);
  });

  it('a fighter against the wall cannot be pushed through it', () => {
    const m = fightMatch();
    place(m, 1100, 1180);
    run(m, 60, inp({ right: true }));
    expect(m.state.fighters[1].x).toBe(STAGE_RIGHT);
    expect(m.state.fighters[0].x).toBe(STAGE_RIGHT - testFighter.stats.width);
  });

  it('a forward dodge passes through the opponent', () => {
    const m = fightMatch();
    place(m, 500, 580);
    const [a, b] = m.state.fighters;
    let minDist = Infinity;
    runUntil(m, () => {
      minDist = Math.min(minDist, Math.abs(b.x - a.x));
      return a.state !== 'dodge';
    }, 30, tap({ dodge: true }, { right: true }));
    expect(minDist).toBeLessThan(testFighter.stats.width);
    run(m, 2);
    expect(a.x).toBeGreaterThan(b.x);
    expect(a.x - b.x).toBe(testFighter.stats.width);
    expect(a.facing).toBe(-1);
  });

  it('jumping fighters only push when the bodies overlap vertically', () => {
    const m = fightMatch();
    place(m, 500, 560); // closer than the body width
    putInAir(m, 0, 200); // above the opponent's head
    m.state.fighters[0].vy = 2;
    run(m, 1, NONE, inp({ down: true }));
    expect(m.state.fighters[1].x).toBe(560);
  });
});
