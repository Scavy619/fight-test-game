// Balance tuner (development aid, not part of the game): nudges each hero's health and power by
// a coordinate search so overall AI-versus-AI win rates converge toward 50%, then prints the
// numbers to copy into the hero files. Usage: npx tsx scripts/tune.ts [iterations=12] [matchesPerSide=5]
import { createAi, runAiMatch } from '../src/ai/index.ts';
import { HERO_ORDER, HEROES, type HeroId } from '../src/content/heroes/index.ts';
import type { FighterDef } from '../src/sim/index.ts';

const iterations = Number(process.argv[2] ?? 12);
const perSide = Number(process.argv[3] ?? 5);

const baseHealth: Record<string, number> = {};
const knobs: Record<string, { health: number; power: number }> = {};
for (const id of HERO_ORDER) {
  baseHealth[id] = HEROES[id].def.stats.health;
  knobs[id] = { health: HEROES[id].def.stats.health, power: HEROES[id].def.stats.power ?? 1 };
}
const defOf = (id: HeroId): FighterDef => ({ ...HEROES[id].def, stats: { ...HEROES[id].def.stats, ...knobs[id] } });

function overall(seed: number): { rate: Record<string, number>; worst: number } {
  const wins: Record<string, number> = {};
  const games: Record<string, number> = {};
  let worst = 0;
  for (const a of HERO_ORDER) {
    for (const b of HERO_ORDER) {
      if (a >= b) continue;
      let aw = 0;
      let n = 0;
      for (let k = 0; k < perSide; k++) {
        for (const side of [0, 1] as const) {
          const s = seed * 1000 + k * 2 + side;
          const da = defOf(a);
          const db = defOf(b);
          const defs = side === 0 ? ([da, db] as const) : ([db, da] as const);
          const ai = side === 0 ? [createAi('hard', s), createAi('hard', s + 500)] as const : [createAi('hard', s + 500), createAi('hard', s)] as const;
          const r = runAiMatch([defs[0], defs[1]], [ai[0], ai[1]]);
          n += 1;
          if (r.winner === side) aw += 1;
        }
      }
      wins[a] = (wins[a] ?? 0) + aw;
      wins[b] = (wins[b] ?? 0) + (n - aw);
      games[a] = (games[a] ?? 0) + n;
      games[b] = (games[b] ?? 0) + n;
      worst = Math.max(worst, Math.abs(aw / n - 0.5));
    }
  }
  const rate: Record<string, number> = {};
  for (const id of HERO_ORDER) rate[id] = (wins[id] ?? 0) / (games[id] ?? 1);
  return { rate, worst };
}

for (let it = 0; it < iterations; it++) {
  const { rate, worst } = overall(1 + (it % 3));
  const spread = Math.max(...Object.values(rate)) - Math.min(...Object.values(rate));
  console.log(`iter ${it}: spread ${(spread * 100).toFixed(0)} pts, worst pair ${(50 + worst * 100).toFixed(0)}/${(50 - worst * 100).toFixed(0)}  ` + HERO_ORDER.map((h) => `${h.slice(0, 4)} ${(100 * (rate[h] ?? 0)).toFixed(0)}`).join('  '));
  for (const id of HERO_ORDER) {
    const w = rate[id] ?? 0.5;
    const k = knobs[id];
    if (!k) continue;
    const d = (w - 0.5) * 0.35; // positive: too strong
    k.health = Math.min(1300, Math.max(800, k.health * (1 - d * 0.6)));
    k.power = Math.min(1.25, Math.max(0.8, k.power * (1 - d * 0.6)));
  }
}
console.log('');
console.log('Suggested numbers (health, power):');
for (const id of HERO_ORDER) console.log(`  ${id.padEnd(12)} health ${Math.round(knobs[id]?.health ?? 0)}  power ${(knobs[id]?.power ?? 1).toFixed(2)}  (was ${baseHealth[id]}, 1.00)`);
