// Helpers for the sim unit tests (not part of the public API).
import { createMatch, step } from './match';
import { testFighter } from './testFighter';
import type {
  FighterDef, InputFrame, Match, MoveDef, MoveSlot, PlayerIndex, SimEvent, SimEventType,
} from './types';
import { EMPTY_INPUT } from './types';

export const NONE: InputFrame = EMPTY_INPUT;

export function inp(buttons: Partial<InputFrame> = {}): InputFrame {
  return { ...EMPTY_INPUT, ...buttons };
}

/** Input per step: a fixed frame, or a function of the step index (0-based). */
export type InputScript = InputFrame | ((k: number) => InputFrame);

function at(script: InputScript, k: number): InputFrame {
  return typeof script === 'function' ? script(k) : script;
}

/** Input pressed on the first step only. */
export function tap(buttons: Partial<InputFrame>, thenHold: Partial<InputFrame> = {}): InputScript {
  return (k) => (k === 0 ? inp({ ...thenHold, ...buttons }) : inp(thenHold));
}

export interface FightOptions {
  p0?: FighterDef;
  p1?: FighterDef;
  roundsToWin?: number;
  roundSeconds?: number;
}

/** A match with the intro already played: phase 'fight'. */
export function fightMatch(opts: FightOptions = {}): Match {
  const m = createMatch({
    fighters: [opts.p0 ?? testFighter, opts.p1 ?? testFighter],
    roundsToWin: opts.roundsToWin,
    roundSeconds: opts.roundSeconds,
  });
  runUntil(m, (mm) => mm.state.phase === 'fight', 200);
  return m;
}

/** Runs `frames` steps, returning all events. */
export function run(m: Match, frames: number, p0: InputScript = NONE, p1: InputScript = NONE): SimEvent[] {
  const events: SimEvent[] = [];
  for (let k = 0; k < frames; k++) events.push(...step(m, [at(p0, k), at(p1, k)]));
  return events;
}

/** Steps until `done` holds after a step; throws if it does not within `max` steps. */
export function runUntil(
  m: Match, done: (m: Match, events: SimEvent[]) => boolean, max: number,
  p0: InputScript = NONE, p1: InputScript = NONE,
): SimEvent[] {
  const events: SimEvent[] = [];
  for (let k = 0; k < max; k++) {
    const ev = step(m, [at(p0, k), at(p1, k)]);
    events.push(...ev);
    if (done(m, ev)) return events;
  }
  throw new Error(`condition not reached within ${max} steps`);
}

/** Steps until an event of the given type occurs; returns all events up to it. */
export function runUntilEvent(
  m: Match, type: SimEventType, max: number, p0: InputScript = NONE, p1: InputScript = NONE,
): SimEvent[] {
  return runUntil(m, (_, ev) => ev.some((e) => e.type === type), max, p0, p1);
}

export function ofType<T extends SimEventType>(events: readonly SimEvent[], type: T): Extract<SimEvent, { type: T }>[] {
  return events.filter((e): e is Extract<SimEvent, { type: T }> => e.type === type);
}

/** Puts both fighters on the ground at the given x, facing each other. */
export function place(m: Match, x0: number, x1: number): void {
  const [a, b] = m.state.fighters;
  a.x = x0;
  b.x = x1;
  a.facing = x0 <= x1 ? 1 : -1;
  b.facing = x0 <= x1 ? -1 : 1;
}

/** Puts a fighter in a neutral jump at height y (falling from rest). */
export function putInAir(m: Match, i: PlayerIndex, y: number): void {
  const f = m.state.fighters[i];
  f.state = 'air';
  f.stateFrame = 1;
  f.y = y;
  f.vy = 0;
  f.vx = 0;
  f.airAttackUsed = false;
}

/** A copy of a fighter with one move replaced or patched. */
export function withMove(def: FighterDef, slot: MoveSlot, patch: Partial<MoveDef>): FighterDef {
  return { ...def, moves: { ...def.moves, [slot]: { ...def.moves[slot], ...patch } } };
}

export function snapshot(m: Match): string {
  return JSON.stringify(m.state);
}
