// Per-step working context shared by the sim modules (internal).
import type { Element, FighterDef, MatchState, PlayerIndex, SimEvent, Strength } from './types';

/** A hit that took a fighter from above 0 health to 0 this step. */
export interface KoRecord {
  fighter: PlayerIndex;
  by: PlayerIndex;
  element: Element;
  strength: Strength;
  x: number;
  y: number;
}

export interface Ctx {
  readonly defs: readonly [FighterDef, FighterDef];
  readonly s: MatchState;
  readonly events: SimEvent[];
  readonly kos: KoRecord[];
}

export const PLAYERS: readonly PlayerIndex[] = [0, 1];

export function other(i: PlayerIndex): PlayerIndex {
  return i === 0 ? 1 : 0;
}
