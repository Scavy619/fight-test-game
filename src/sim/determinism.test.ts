import { describe, expect, it } from 'vitest';
import { createMatch, step } from './match';
import { testFighter } from './testFighter';
import type { InputFrame, Match, SimEvent } from './types';
import { EMPTY_INPUT } from './types';

/** Tiny local LCG (Math.random is banned in src/sim). */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/** Pseudo-random but "player-like" input: held directions, short button presses. */
function inputScript(seed: number, frames: number): InputFrame[] {
  const rnd = lcg(seed);
  const out: InputFrame[] = [];
  let dir = { left: false, right: false, up: false, down: false, block: false };
  for (let k = 0; k < frames; k++) {
    if (k % 12 === 0) {
      const r = rnd();
      dir = { left: r < 0.3, right: r >= 0.3 && r < 0.65, up: rnd() < 0.1, down: rnd() < 0.2, block: rnd() < 0.3 };
    }
    // A blocking player does not mash (any buffered press overrides block).
    const mash = dir.block ? 0 : 1;
    out.push({
      ...dir,
      light: rnd() < 0.12 * mash,
      heavy: rnd() < 0.08 * mash,
      special: rnd() < 0.06 * mash,
      dodge: rnd() < 0.02 * mash,
    });
  }
  return out;
}

const FRAMES = 4000;

function play(match: Match, p0: InputFrame[], p1: InputFrame[], from = 0, to = FRAMES): SimEvent[] {
  const events: SimEvent[] = [];
  for (let k = from; k < to; k++) {
    events.push(...step(match, [p0[k] ?? p0[0]!, p1[k] ?? p1[0]!]));
  }
  return events;
}

describe('determinism', () => {
  const p0 = inputScript(12345, FRAMES);
  const p1 = inputScript(67890, FRAMES);

  it('the same inputs give identical state and events', () => {
    const a = createMatch({ fighters: [testFighter, testFighter], roundSeconds: 20 });
    const b = createMatch({ fighters: [testFighter, testFighter], roundSeconds: 20 });
    const ea = play(a, p0, p1);
    const eb = play(b, p0, p1);
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
    expect(JSON.stringify(ea)).toBe(JSON.stringify(eb));
    // The script exercises a real fight.
    const types = new Set(ea.map((e) => e.type));
    for (const t of ['hit', 'block', 'whiff', 'jump', 'land', 'moveStart', 'roundEnd'] as const) {
      expect(types.has(t), t).toBe(true);
    }
  });

  it('a JSON copy of the state mid-match continues identically', () => {
    const a = createMatch({ fighters: [testFighter, testFighter], roundSeconds: 20 });
    play(a, p0, p1, 0, FRAMES / 2);
    const b: Match = { defs: a.defs, state: JSON.parse(JSON.stringify(a.state)) };
    const c: Match = { defs: a.defs, state: structuredClone(a.state) };
    const ea = play(a, p0, p1, FRAMES / 2, FRAMES);
    const eb = play(b, p0, p1, FRAMES / 2, FRAMES);
    const ec = play(c, p0, p1, FRAMES / 2, FRAMES);
    expect(JSON.stringify(b.state)).toBe(JSON.stringify(a.state));
    expect(JSON.stringify(c.state)).toBe(JSON.stringify(a.state));
    expect(eb).toEqual(ea);
    expect(ec).toEqual(ea);
  });

  it('different inputs diverge', () => {
    const a = createMatch({ fighters: [testFighter, testFighter] });
    const b = createMatch({ fighters: [testFighter, testFighter] });
    play(a, p0, p1, 0, 600);
    play(b, p1, p0, 0, 600);
    expect(JSON.stringify(a.state)).not.toBe(JSON.stringify(b.state));
  });

  it('random attackers never find an unbounded combo against a passive defender', () => {
    let maxCombo = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const m = createMatch({ fighters: [testFighter, testFighter], roundSeconds: 99 });
      const attacker = inputScript(seed * 7919, 3000).map((f) => ({ ...f, block: false }));
      for (let k = 0; k < attacker.length; k++) {
        // Keep the meter full so ultimates join the mix, and keep the defender alive.
        m.state.fighters[0].meter = 100;
        m.state.fighters[1].health = 1000;
        step(m, [attacker[k]!, { ...EMPTY_INPUT }]);
        maxCombo = Math.max(maxCombo, m.state.fighters[0].combo);
      }
    }
    // Longest possible chain: light, heavy, special, then the 5-hit ultimate.
    expect(maxCombo).toBeGreaterThan(1);
    expect(maxCombo).toBeLessThanOrEqual(8);
  });

  it('does not mutate the fighter definitions', () => {
    const before = JSON.stringify(testFighter);
    const m = createMatch({ fighters: [testFighter, testFighter] });
    play(m, p0, p1, 0, 1500);
    expect(JSON.stringify(testFighter)).toBe(before);
  });
});
