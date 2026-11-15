// Headless AI-versus-AI balance run: every pairing of the registered heroes, both sides, printing
// the win rate of the row hero against the column hero. Usage:
//   npx tsx scripts/balance.ts [matchesPerSide=10] [difficulty=hard] [baseSeed=1]
import { createAi, runAiMatch, type Difficulty } from '../src/ai/index.ts';
import { HERO_ORDER, HEROES, type HeroId } from '../src/content/heroes/index.ts';

const perSide = Number(process.argv[2] ?? 10);
const difficulty = (process.argv[3] ?? 'hard') as Difficulty;
const baseSeed = Number(process.argv[4] ?? 1);

interface Cell { wins: number; games: number; frames: number }
const cells = new Map<string, Cell>();
const key = (a: HeroId, b: HeroId): string => `${a}>${b}`;

const t0 = Date.now();
for (const a of HERO_ORDER) {
  for (const b of HERO_ORDER) {
    if (a >= b) continue; // each unordered pair once; fill both cells below
    const ab: Cell = { wins: 0, games: 0, frames: 0 };
    for (let k = 0; k < perSide; k++) {
      for (const aSide of [0, 1] as const) {
        const seedA = baseSeed * 1000 + k * 2 + aSide;
        const ai = [createAi(difficulty, seedA), createAi(difficulty, seedA + 500)] as const;
        const defs = aSide === 0 ? [HEROES[a].def, HEROES[b].def] as const : [HEROES[b].def, HEROES[a].def] as const;
        const ctrl = aSide === 0 ? [ai[0], ai[1]] as const : [ai[1], ai[0]] as const;
        const r = runAiMatch([defs[0], defs[1]], [ctrl[0], ctrl[1]]);
        ab.games += 1;
        ab.frames += r.frames;
        if (r.winner === aSide) ab.wins += 1;
      }
    }
    cells.set(key(a, b), ab);
    cells.set(key(b, a), { wins: ab.games - ab.wins, games: ab.games, frames: ab.frames });
  }
}

const pad = (s: string, n: number): string => s.padEnd(n).slice(0, n);
const names = HERO_ORDER.map((h) => h.slice(0, 7));
const seconds = ((Date.now() - t0) / 1000).toFixed(0);
console.log('');
console.log(`Win rate of the row hero versus the column hero, ${difficulty}, ${perSide * 2} matches per pairing (${seconds} s)`);
console.log('');
console.log(pad('', 12) + names.map((n) => pad(n, 9)).join(''));
const overall: Record<string, number> = {};
for (const a of HERO_ORDER) {
  let w = 0;
  let g = 0;
  const row = HERO_ORDER.map((b) => {
    if (a === b) return pad('-', 9);
    const c = cells.get(key(a, b));
    if (!c) return pad('?', 9);
    w += c.wins;
    g += c.games;
    return pad(`${Math.round((100 * c.wins) / c.games)}%`, 9);
  }).join('');
  overall[a] = g > 0 ? (100 * w) / g : 0;
  console.log(pad(a, 12) + row);
}
console.log('');
console.log('Overall win rate:');
for (const [h, v] of Object.entries(overall).sort((x, y) => y[1] - x[1])) console.log(`  ${pad(h, 12)} ${v.toFixed(0)}%`);
let worst = { pair: '', skew: 0 };
for (const a of HERO_ORDER) {
  for (const b of HERO_ORDER) {
    const c = cells.get(key(a, b));
    if (a < b && c) {
      const skew = Math.abs(c.wins / c.games - 0.5);
      if (skew > worst.skew) worst = { pair: `${a} v ${b}`, skew };
    }
  }
}
console.log('');
console.log(`Most lopsided pairing: ${worst.pair} (${(50 + worst.skew * 100).toFixed(0)}/${(50 - worst.skew * 100).toFixed(0)})`);
