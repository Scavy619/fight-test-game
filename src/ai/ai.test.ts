import { describe, expect, it } from 'vitest';
import { FIGHTERS } from '../content/fighters';
import { testFighter, type FighterDef, type MoveDef, type PlayerIndex } from '../sim';
import { createAi, DIFFICULTIES, moveReach, runAiMatch } from './index';
import { createRng } from './rng';

const rei = FIGHTERS.rei.def;
const vira = FIGHTERS.vira.def;

describe('rng', () => {
  it('is reproducible for a seed and stays in [0, 1)', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let k = 0; k < 100; k++) {
      const x = a.next();
      expect(x).toBe(b.next());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });
});

describe('moveReach', () => {
  it('adds the forward travel before the last hitbox frame to the hitbox extent', () => {
    const m: MoveDef = {
      ...testFighter.moves.light,
      startup: 4, active: 2, recovery: 6,
      hitboxes: [{ x: 10, y: 0, w: 50, h: 40 }],
      velocity: [{ from: 1, to: 10, vx: 5 }],
    };
    // Hitboxes live on frames 5..6, so travel counts frames 1..6 = 30 px.
    expect(moveReach(m)).toBe(30 + 60);
  });
});

describe('AI controller', () => {
  it('is deterministic for a seed', () => {
    const run = (): string => {
      const r = runAiMatch([rei, vira], [createAi('normal', 7), createAi('hard', 11)], { roundSeconds: 30 });
      return JSON.stringify([r.frames, r.winner, r.match.state]);
    };
    expect(run()).toBe(run());
  });

  it('attacks, blocks and lands hits in a match', () => {
    const r = runAiMatch([rei, vira], [createAi('normal', 3), createAi('normal', 4)]);
    expect(r.match.state.phase).toBe('matchEnd');
    expect(r.counts.hit ?? 0).toBeGreaterThan(10);
    expect(r.counts.block ?? 0).toBeGreaterThan(3);
    expect(r.counts.moveStart ?? 0).toBeGreaterThan(30);
  });

  it('returns no input outside the fight phase', () => {
    const ai = createAi('hard', 1);
    const m = runAiMatch([testFighter, testFighter], [ai, ai], { maxFrames: 1 }).match;
    expect(m.state.phase).toBe('intro');
    const frame = ai(m, 0);
    expect(Object.values(frame).every((v) => v === false)).toBe(true);
  });

  it('hard beats easy in most of 20 matches (sides alternate)', () => {
    let hardWins = 0;
    for (let k = 0; k < 20; k++) {
      const hardSide: PlayerIndex = k % 2 === 0 ? 0 : 1;
      const defs: [FighterDef, FighterDef] = k % 4 < 2 ? [rei, vira] : [vira, rei];
      const hard = createAi('hard', 1000 + k);
      const easy = createAi('easy', 2000 + k);
      const r = runAiMatch(defs, hardSide === 0 ? [hard, easy] : [easy, hard]);
      if (r.winner === hardSide) hardWins += 1;
    }
    expect(hardWins).toBeGreaterThanOrEqual(14);
  });

  it('difficulties are ordered: harder reacts and thinks faster with fewer mistakes', () => {
    const { easy, normal, hard } = DIFFICULTIES;
    expect(easy.reaction).toBeGreaterThan(normal.reaction);
    expect(normal.reaction).toBeGreaterThan(hard.reaction);
    expect(easy.mistake).toBeGreaterThan(normal.mistake);
    expect(normal.mistake).toBeGreaterThan(hard.mistake);
  });
});
