// Randomized combo bounds (pattern from src/sim/determinism.test.ts): random but
// player-like attackers against a passive defender must not find unbounded combos.
import { describe, expect, it } from 'vitest';
import { createMatch, step } from '../../sim/match';
import { EMPTY_INPUT, type FighterDef, type InputFrame } from '../../sim/types';
import { FIGHTERS } from './index';

/** Tiny local LCG (deterministic test input). */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/** Held directions changing every 12 frames, short random button presses; never blocks. */
function attackerScript(seed: number, frames: number): InputFrame[] {
  const rnd = lcg(seed);
  const out: InputFrame[] = [];
  let dir = { left: false, right: false, up: false, down: false };
  for (let k = 0; k < frames; k++) {
    if (k % 12 === 0) {
      const r = rnd();
      dir = { left: r < 0.25, right: r >= 0.25 && r < 0.7, up: rnd() < 0.1, down: rnd() < 0.25 };
    }
    out.push({
      ...dir,
      block: false,
      grab: false,
      power: false,
      light: rnd() < 0.14,
      heavy: rnd() < 0.1,
      special: rnd() < 0.08,
      dodge: rnd() < 0.01,
    });
  }
  return out;
}

interface Bounds {
  maxCombo: number;
  /** Most damage dealt by one combo that contained no ultimate hit. */
  maxDamageNoUltimate: number;
  ultimateHits: number;
}

function probe(attacker: FighterDef, defender: FighterDef, seeds: number, frames: number): Bounds {
  const out: Bounds = { maxCombo: 0, maxDamageNoUltimate: 0, ultimateHits: 0 };
  for (let seed = 1; seed <= seeds; seed++) {
    const m = createMatch({ fighters: [attacker, defender], roundSeconds: 99 });
    const script = attackerScript(seed * 7919, frames);
    let comboHasUltimate = false;
    for (let k = 0; k < script.length; k++) {
      // Keep the meter full so ultimates join the mix, and keep the defender alive.
      m.state.fighters[0].meter = 100;
      m.state.fighters[1].health = defender.stats.health;
      m.state.timer = m.state.roundFrames;
      const events = step(m, [script[k] ?? EMPTY_INPUT, EMPTY_INPUT]);
      for (const e of events) {
        if (e.type !== 'hit' || e.fighter !== 0) continue;
        if (e.combo === 1) comboHasUltimate = false;
        if (e.slot === 'ultimate') {
          comboHasUltimate = true;
          out.ultimateHits += 1;
        }
      }
      const a = m.state.fighters[0];
      out.maxCombo = Math.max(out.maxCombo, a.combo);
      if (!comboHasUltimate) out.maxDamageNoUltimate = Math.max(out.maxDamageNoUltimate, a.comboDamage);
    }
  }
  return out;
}

const PAIRS = [
  ['rei', 'rei'],
  ['vira', 'vira'],
  ['rei', 'vira'],
  ['vira', 'rei'],
] as const;

describe('combo bounds', () => {
  it.each(PAIRS)('%s attacking %s: max combo <= 10, no combo without an ultimate over 40%% health', (a, d) => {
    const attacker = FIGHTERS[a].def;
    const defender = FIGHTERS[d].def;
    const b = probe(attacker, defender, 12, 3000);
    // The script reaches real combos and ultimates.
    expect(b.maxCombo).toBeGreaterThan(2);
    expect(b.ultimateHits).toBeGreaterThan(0);
    // Light, light, heavy, then Rei's 8-hit ultimate is the longest route (11).
    expect(b.maxCombo).toBeLessThanOrEqual(12);
    expect(b.maxDamageNoUltimate).toBeLessThanOrEqual(0.4 * defender.stats.health);
  });
});
