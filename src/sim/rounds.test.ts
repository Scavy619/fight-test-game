import { describe, expect, it } from 'vitest';
import { HITSTOP, INTRO_FRAMES, METER_MAX, OUTRO_FRAMES, ROUND_END_FRAMES } from './constants';
import { testFighter } from './testFighter';
import type { FighterDef, Match } from './types';
import { fightMatch, inp, ofType, place, run, runUntil, runUntilEvent, tap } from './testHelpers';

/** Lands a light on P2 from close range. */
function lightHit(m: Match, attacker: 0 | 1 = 0) {
  place(m, 500, 600);
  return runUntilEvent(m, 'hit', 10, attacker === 0 ? tap({ light: true }) : inp(), attacker === 1 ? tap({ light: true }) : inp());
}

describe('KO and round flow', () => {
  it('KO ends the round: ko phase, outro with the winner posing, next round', () => {
    const m = fightMatch();
    const s = m.state;
    s.fighters[1].health = 30;
    const ev = lightHit(m);
    expect(ofType(ev, 'ko')).toMatchObject([{ fighter: 1, by: 0, strength: 'light', element: 'wind' }]);
    expect(ofType(ev, 'finisher')).toHaveLength(0);
    expect(ofType(ev, 'roundEnd')).toEqual([{ type: 'roundEnd', round: 1, winner: 0, reason: 'ko' }]);
    expect(s.phase).toBe('ko');
    expect(s.wins).toEqual([1, 0]);
    expect(s.lastRoundResult).toEqual({ round: 1, winner: 0, reason: 'ko' });
    expect(s.fighters[1]).toMatchObject({ state: 'ko', health: 0 });

    // KO hitstop, then the ko phase; inputs are ignored.
    run(m, HITSTOP.light);
    const x0 = s.fighters[0].x;
    run(m, ROUND_END_FRAMES, inp({ left: true }));
    expect(s.phase).toBe('outro');
    expect(s.fighters[0].x).toBe(x0);
    run(m, 1);
    expect(s.fighters[0].state).toBe('win');
    expect(s.fighters[1].state).toBe('ko');

    const meter = s.fighters[0].meter;
    run(m, OUTRO_FRAMES - 1);
    expect(s.phase).toBe('intro');
    expect(s.round).toBe(2);
    expect(s.timer).toBe(60 * 60);
    expect(s.fighters.map((f) => [f.x, f.health, f.state, f.facing])).toEqual([
      [440, 1000, 'idle', 1],
      [840, 1000, 'idle', -1],
    ]);
    expect(s.fighters[0].meter).toBe(meter);
    expect(meter).toBeGreaterThan(0);
    const intro = run(m, INTRO_FRAMES);
    expect(intro[0]).toEqual({ type: 'roundIntro', round: 2 });
    expect(intro.at(-1)).toEqual({ type: 'roundStart', round: 2 });
    expect(s.phase).toBe('fight');
  });

  it('clears projectiles between rounds', () => {
    const m = fightMatch();
    place(m, 100, 1200);
    run(m, 14, tap({ special: true }));
    expect(m.state.projectiles).toHaveLength(1);
    m.state.timer = 1;
    runUntil(m, (mm) => mm.state.phase === 'intro', 400);
    expect(m.state.projectiles).toHaveLength(0);
  });

  it('the match ends when a fighter reaches roundsToWin', () => {
    const m = fightMatch();
    const s = m.state;
    s.wins = [1, 0];
    s.fighters[1].health = 10;
    lightHit(m);
    expect(s.wins).toEqual([2, 0]);
    const ev = runUntilEvent(m, 'matchEnd', 400);
    expect(ofType(ev, 'matchEnd')).toEqual([{ type: 'matchEnd', winner: 0 }]);
    expect(s.phase).toBe('matchEnd');
    expect(s.winner).toBe(0);
    run(m, 30, inp({ right: true, light: true }));
    expect(s.phase).toBe('matchEnd');
    expect(s.fighters[0].state).toBe('win');
  });

  it('a trade that KOs both is a draw and the round is replayed', () => {
    const m = fightMatch();
    const s = m.state;
    s.fighters[0].health = 30;
    s.fighters[1].health = 30;
    place(m, 500, 600);
    const ev = run(m, 5, tap({ light: true }), tap({ light: true }));
    expect(ofType(ev, 'ko')).toHaveLength(2);
    expect(ofType(ev, 'roundEnd')).toEqual([{ type: 'roundEnd', round: 1, winner: null, reason: 'doubleKo' }]);
    expect(s.wins).toEqual([0, 0]);
    runUntil(m, (mm) => mm.state.phase === 'intro', 400);
    expect(s.round).toBe(2);
    expect(s.wins).toEqual([0, 0]);
    expect(s.fighters.map((f) => f.health)).toEqual([1000, 1000]);
  });
});

describe('time-out', () => {
  it('the round clock only runs during the fight, not during hitstop', () => {
    const m = fightMatch();
    const t0 = m.state.timer;
    run(m, 10);
    expect(m.state.timer).toBe(t0 - 10);
    lightHit(m);
    const t1 = m.state.timer;
    run(m, HITSTOP.light);
    expect(m.state.timer).toBe(t1);
  });

  it('higher health wins at time-out', () => {
    const m = fightMatch({ roundSeconds: 1 });
    m.state.fighters[1].health = 900;
    const ev = runUntilEvent(m, 'roundEnd', 61);
    expect(m.state.frame).toBe(INTRO_FRAMES + 60);
    expect(ofType(ev, 'roundEnd')).toEqual([{ type: 'roundEnd', round: 1, winner: 0, reason: 'timeout' }]);
    expect(m.state.phase).toBe('timeout');
    expect(m.state.wins).toEqual([1, 0]);
    run(m, ROUND_END_FRAMES + 1);
    expect(m.state.fighters[0].state).toBe('win');
    expect(m.state.fighters[1].state).toBe('idle');
  });

  it('compares health fractions, not absolute health', () => {
    const tank: FighterDef = { ...testFighter, stats: { ...testFighter.stats, health: 2000 } };
    const m = fightMatch({ p0: tank, roundSeconds: 1 });
    m.state.fighters[0].health = 1200; // 60%
    m.state.fighters[1].health = 700; // 70%
    const ev = runUntilEvent(m, 'roundEnd', 61);
    expect(ofType(ev, 'roundEnd')[0]?.winner).toBe(1);
  });

  it('equal health is a draw: no point, the round is replayed', () => {
    const m = fightMatch({ roundSeconds: 1 });
    const ev = runUntilEvent(m, 'roundEnd', 61);
    expect(ofType(ev, 'roundEnd')[0]).toMatchObject({ winner: null, reason: 'timeout' });
    runUntil(m, (mm) => mm.state.phase === 'intro', 400);
    expect(m.state.round).toBe(2);
    expect(m.state.wins).toEqual([0, 0]);
    expect(m.state.winner).toBeNull();
  });
});

describe('finisher', () => {
  function ultimateKo(wins: [number, number]) {
    const m = fightMatch();
    m.state.wins = wins;
    m.state.fighters[0].meter = METER_MAX;
    m.state.fighters[1].health = 100;
    place(m, 500, 600);
    return run(m, 120, tap({ heavy: true, special: true }));
  }

  it('an ultimate KO that wins the match emits finisher', () => {
    const ev = ultimateKo([1, 0]);
    expect(ofType(ev, 'ko')).toMatchObject([{ fighter: 1, by: 0, strength: 'ultimate' }]);
    expect(ofType(ev, 'finisher')).toMatchObject([{ fighter: 0, target: 1, element: 'wind' }]);
  });

  it('no finisher when the round does not decide the match', () => {
    const ev = ultimateKo([0, 1]);
    expect(ofType(ev, 'ko')).toHaveLength(1);
    expect(ofType(ev, 'finisher')).toHaveLength(0);
  });

  it('no finisher for a non-ultimate KO on match point', () => {
    const m = fightMatch();
    m.state.wins = [1, 1];
    m.state.fighters[1].health = 10;
    const ev = lightHit(m);
    expect(ofType(ev, 'ko')).toHaveLength(1);
    expect(ofType(ev, 'finisher')).toHaveLength(0);
  });
});
