// Randomized combo bounds (pattern from src/sim/determinism.test.ts): random but
// player-like attackers against a passive defender must not find unbounded combos.
import { describe, expect, it } from 'vitest';
import { createMatch, step } from '../../sim/match';
import { EMPTY_INPUT, type FighterDef, type InputFrame } from '../../sim/types';
import { HEROES, HERO_ORDER, type HeroId } from './index';

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
  // Presses are spaced at least GAP frames apart so a light followed by a heavy is a chain,
  // not the staggered light + heavy grab chord (the grab has its own tests).
  const GAP = 6;
  let cooldown = 0;
  for (let k = 0; k < frames; k++) {
    if (k % 12 === 0) {
      const r = rnd();
      dir = { left: r < 0.12, right: r >= 0.12 && r < 0.8, up: rnd() < 0.08, down: rnd() < 0.2 };
    }
    const buttons = { light: false, heavy: false, special: false, dodge: false };
    if (cooldown > 0) cooldown -= 1;
    else {
      const r = rnd();
      if (rnd() < 0.85) {
        if (r < 0.4) buttons.light = true;
        else if (r < 0.62) buttons.heavy = true;
        else if (r < 0.8) buttons.special = true;
        else if (r < 0.92) {
          buttons.heavy = true; // heavy + special together is the ultimate
          buttons.special = true;
        } else buttons.dodge = true;
        cooldown = GAP;
      }
    }
    out.push({ ...dir, block: false, grab: false, power: false, ...buttons });
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

const PAIRS: (readonly [HeroId, HeroId])[] = HERO_ORDER.flatMap((a) => HERO_ORDER.map((d) => [a, d] as const));

describe('combo bounds', () => {
  it.each(PAIRS)('%s attacking %s: max combo <= 10, no combo without an ultimate over 40%% health', (a, d) => {
    const attacker = HEROES[a].def;
    const defender = HEROES[d].def;
    const b = probe(attacker, defender, 12, 3000);
    // The script reaches real combos and ultimates.
    expect(b.maxCombo).toBeGreaterThan(1);
    expect(b.ultimateHits).toBeGreaterThan(0);
    // Light, light, heavy, then a multi-hit ultimate is the longest route.
    expect(b.maxCombo).toBeLessThanOrEqual(12);
    expect(b.maxDamageNoUltimate).toBeLessThanOrEqual(0.4 * defender.stats.health);
  });
});
