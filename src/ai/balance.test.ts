// Balance guard: a small hard-versus-hard round robin over every hero. It keeps the roster from
// drifting into one hero beating everyone (or losing to everyone) when moves or stats change.
// The full tool is `npm run balance`; tune with `npx tsx scripts/tune.ts`.
import { describe, expect, it } from 'vitest';
import { HERO_ORDER, HEROES } from '../content/heroes';
import { createAi } from './controller';
import { runAiMatch } from './simulate';

describe('hero balance (hard AI round robin)', () => {
  it('every hero wins between 25% and 75% of its matches', () => {
    const wins: Record<string, number> = {};
    const games: Record<string, number> = {};
    for (const a of HERO_ORDER) {
      for (const b of HERO_ORDER) {
        if (a >= b) continue;
        for (let k = 0; k < 3; k++) {
          for (const side of [0, 1] as const) {
            const seed = 3000 + k * 2 + side;
            const defs = side === 0 ? ([HEROES[a].def, HEROES[b].def] as const) : ([HEROES[b].def, HEROES[a].def] as const);
            const ai = side === 0 ? [createAi('hard', seed), createAi('hard', seed + 500)] as const : [createAi('hard', seed + 500), createAi('hard', seed)] as const;
            const r = runAiMatch([defs[0], defs[1]], [ai[0], ai[1]]);
            const winner = r.winner === null ? null : r.winner === side ? a : b;
            for (const id of [a, b]) games[id] = (games[id] ?? 0) + 1;
            if (winner) wins[winner] = (wins[winner] ?? 0) + 1;
          }
        }
      }
    }
    for (const id of HERO_ORDER) {
      const rate = (wins[id] ?? 0) / (games[id] ?? 1);
      expect(rate, `${id} wins ${(rate * 100).toFixed(0)}%`).toBeGreaterThanOrEqual(0.25);
      expect(rate, `${id} wins ${(rate * 100).toFixed(0)}%`).toBeLessThanOrEqual(0.75);
    }
  }, 120000);
});
