// Headless AI-versus-AI match, for tests and the balance runner.
import { createMatch, step, type FighterDef, type Match, type PlayerIndex, type SimEvent } from '../sim';
import type { AiController } from './controller';

export interface AiMatchResult {
  winner: PlayerIndex | null;
  frames: number;
  match: Match;
  /** Counts of a few event types, handy for sanity checks. */
  counts: Partial<Record<SimEvent['type'], number>>;
}

export function runAiMatch(
  fighters: [FighterDef, FighterDef],
  controllers: [AiController, AiController],
  options: { roundsToWin?: number; roundSeconds?: number; maxFrames?: number } = {},
): AiMatchResult {
  const match = createMatch({ fighters, roundsToWin: options.roundsToWin, roundSeconds: options.roundSeconds });
  const max = options.maxFrames ?? 60 * 60 * 6;
  const counts: AiMatchResult['counts'] = {};
  let frames = 0;
  while (match.state.phase !== 'matchEnd' && frames < max) {
    const events = step(match, [controllers[0](match, 0), controllers[1](match, 1)]);
    for (const e of events) counts[e.type] = (counts[e.type] ?? 0) + 1;
    frames += 1;
  }
  return { winner: match.state.winner, frames, match, counts };
}
