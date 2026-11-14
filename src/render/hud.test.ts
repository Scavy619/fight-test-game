import { describe, expect, it } from 'vitest';
import { INTRO_FRAMES, createMatch, testFighter, type FighterState, type MatchState } from '../sim';
import {
  COMBO_FADE_FRAMES,
  COMBO_POP_FRAMES,
  COMBO_POP_SCALE,
  GHOST_HOLD,
  HudState,
  REMATCH_PROMPT,
  announceScale,
  announcement,
  timerSeconds,
} from './hud';

function pair(): [FighterState, FighterState] {
  const s = createMatch({ fighters: [testFighter, testFighter] }).state;
  return s.fighters;
}

describe('HudState damage ghost', () => {
  it('holds after a hit, then shrinks by 1% of max per frame to the real value', () => {
    const fs = pair();
    const hud = new HudState([1000, 1000]);
    hud.update(fs);
    fs[1].health = 900;
    hud.update(fs);
    expect(hud.sides[1].ghost).toBe(1000);
    for (let k = 0; k < GHOST_HOLD; k++) hud.update(fs);
    expect(hud.sides[1].ghost).toBe(1000);
    hud.update(fs);
    expect(hud.sides[1].ghost).toBe(990);
    for (let k = 0; k < 20; k++) hud.update(fs);
    expect(hud.sides[1].ghost).toBe(900);
    expect(hud.sides[0].ghost).toBe(1000);
  });

  it('restarts the hold on every new hit', () => {
    const fs = pair();
    const hud = new HudState([1000, 1000]);
    fs[0].health = 950;
    hud.update(fs);
    for (let k = 0; k < GHOST_HOLD - 5; k++) hud.update(fs);
    fs[0].health = 900;
    hud.update(fs);
    for (let k = 0; k < GHOST_HOLD; k++) hud.update(fs);
    expect(hud.sides[0].ghost).toBe(1000);
  });

  it('snaps up when health rises (new round) and on reset', () => {
    const fs = pair();
    const hud = new HudState([1000, 1000]);
    fs[0].health = 100;
    hud.update(fs);
    fs[0].health = 1000;
    hud.update(fs);
    expect(hud.sides[0].ghost).toBe(1000);
    fs[0].health = 500;
    hud.update(fs);
    hud.reset(fs);
    expect(hud.sides[0].ghost).toBe(500);
  });
});

describe('HudState combo', () => {
  it('pops on each increment and fades after the combo ends', () => {
    const fs = pair();
    const hud = new HudState([1000, 1000]);
    fs[0].combo = 1;
    hud.update(fs);
    expect(hud.comboView(0).alpha).toBe(0);
    fs[0].combo = 2;
    hud.update(fs);
    expect(hud.comboView(0)).toEqual({ count: 2, scale: COMBO_POP_SCALE, alpha: 1 });
    for (let k = 0; k < COMBO_POP_FRAMES; k++) hud.update(fs);
    expect(hud.comboView(0).scale).toBe(1);
    fs[0].combo = 3;
    hud.update(fs);
    expect(hud.comboView(0).scale).toBe(COMBO_POP_SCALE);
    fs[0].combo = 0;
    hud.update(fs);
    expect(hud.comboView(0).count).toBe(3);
    expect(hud.comboView(0).alpha).toBe(1);
    for (let k = 0; k < COMBO_FADE_FRAMES / 2; k++) hud.update(fs);
    expect(hud.comboView(0).alpha).toBeCloseTo(0.5);
    for (let k = 0; k < COMBO_FADE_FRAMES; k++) hud.update(fs);
    expect(hud.comboView(0).alpha).toBe(0);
    // A new combo with the same count pops again.
    fs[0].combo = 3;
    hud.update(fs);
    expect(hud.comboView(0)).toEqual({ count: 3, scale: COMBO_POP_SCALE, alpha: 1 });
    expect(hud.comboView(1).alpha).toBe(0);
  });
});

describe('announcement', () => {
  const names: [string, string] = ['AKA', 'AO'];
  function state(patch: Partial<MatchState>): MatchState {
    return { ...createMatch({ fighters: [testFighter, testFighter] }).state, ...patch };
  }

  it('follows the round intro and fight start', () => {
    expect(announcement(state({ phase: 'intro', phaseFrame: 0, round: 2 }), names)?.text).toBe('ROUND 2');
    expect(announcement(state({ phase: 'intro', phaseFrame: 59 }), names)?.text).toBe('ROUND 1');
    const f = announcement(state({ phase: 'intro', phaseFrame: 60 }), names);
    expect(f).toMatchObject({ text: 'FIGHT', age: 0, size: 96 });
    expect(announcement(state({ phase: 'fight', phaseFrame: 0 }), names)).toMatchObject({
      text: 'FIGHT', age: INTRO_FRAMES - 60,
    });
    expect(announcement(state({ phase: 'fight', phaseFrame: 19 }), names)?.text).toBe('FIGHT');
    expect(announcement(state({ phase: 'fight', phaseFrame: 20 }), names)).toBeNull();
  });

  it('covers round and match endings', () => {
    expect(announcement(state({ phase: 'ko', phaseFrame: 3 }), names)).toMatchObject({ text: 'K.O.', size: 120 });
    const dko = state({ phase: 'ko', lastRoundResult: { round: 1, winner: null, reason: 'doubleKo' } });
    expect(announcement(dko, names)?.text).toBe('DOUBLE K.O.');
    expect(announcement(state({ phase: 'timeout' }), names)?.text).toBe('TIME UP');
    const won = state({ phase: 'outro', lastRoundResult: { round: 1, winner: 1, reason: 'ko' } });
    expect(announcement(won, names)).toMatchObject({ text: 'AO WINS', size: 64 });
    const draw = state({ phase: 'outro', lastRoundResult: { round: 1, winner: null, reason: 'timeout' } });
    expect(announcement(draw, names)?.text).toBe('DRAW');
    const end = announcement(state({ phase: 'matchEnd', winner: 0 }), names);
    expect(end).toMatchObject({ text: 'AKA WINS THE MATCH', prompt: REMATCH_PROMPT });
  });

  it('scales in from 1.6 to 1 over 10 frames', () => {
    expect(announceScale(0)).toBeCloseTo(1.6);
    expect(announceScale(5)).toBeLessThan(1.6);
    expect(announceScale(5)).toBeGreaterThan(1);
    expect(announceScale(10)).toBe(1);
    expect(announceScale(50)).toBe(1);
  });
});

describe('timerSeconds', () => {
  it('rounds up to whole seconds', () => {
    expect(timerSeconds(3600)).toBe(60);
    expect(timerSeconds(3599)).toBe(60);
    expect(timerSeconds(601)).toBe(11);
    expect(timerSeconds(600)).toBe(10);
    expect(timerSeconds(1)).toBe(1);
    expect(timerSeconds(0)).toBe(0);
  });
});
