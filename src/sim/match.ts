// Match creation, the per-frame step and round flow.
import { collectMeleeHits, resolveHits } from './combat';
import {
  DEFAULT_ROUND_SECONDS, DEFAULT_ROUNDS_TO_WIN, FPS, INTRO_FRAMES, OUTRO_FRAMES, ROUND_END_FRAMES,
} from './constants';
import { type Ctx, PLAYERS, other } from './context';
import {
  createFighterState, emitMoveFrameEvents, isGroundNeutral, resetFighterForRound, setState, updateFighter,
} from './fighter';
import { recordInput } from './input';
import { applyPhysics, resolveBodyPush } from './physics';
import {
  clashProjectiles, collectProjectileHits, consumeProjectileHits, moveProjectiles, spawnProjectiles,
} from './projectiles';
import type { InputFrame, Match, MatchConfig, MatchPhase, MatchState, PlayerIndex, SimEvent } from './types';
import { EMPTY_INPUT } from './types';

export function createMatch(config: MatchConfig): Match {
  const [d0, d1] = config.fighters;
  const roundFrames = (config.roundSeconds ?? DEFAULT_ROUND_SECONDS) * FPS;
  const state: MatchState = {
    frame: 0,
    phase: 'intro',
    phaseFrame: 0,
    round: 1,
    roundsToWin: config.roundsToWin ?? DEFAULT_ROUNDS_TO_WIN,
    roundFrames,
    wins: [0, 0],
    timer: roundFrames,
    fighters: [createFighterState(d0, 0), createFighterState(d1, 1)],
    projectiles: [],
    nextProjectileId: 1,
    hitstop: 0,
    superFreeze: null,
    winner: null,
    lastRoundResult: null,
    damageScale: config.damageScale ? [config.damageScale[0], config.damageScale[1]] : [1, 1],
  };
  return { defs: [d0, d1], state };
}

/**
 * Advances the match by exactly one 1/60 s frame, mutating `match.state`.
 * Order: input recording; super freeze or hitstop (frozen frames return
 * early, presses are still buffered); fighter state machines; physics; body
 * push; projectiles; simultaneous hit resolution; round logic.
 * Inputs are ignored outside the 'fight' phase.
 */
export function step(match: Match, inputs: readonly [InputFrame, InputFrame]): SimEvent[] {
  const s = match.state;
  const ctx: Ctx = { defs: match.defs, s, events: [], kos: [] };
  s.frame += 1;

  const live = s.phase === 'fight';
  const frozen = s.superFreeze !== null || s.hitstop > 0;
  for (const i of PLAYERS) recordInput(s.fighters[i].input, inputs[i], live, frozen);

  if (s.superFreeze !== null) {
    tickSuperFreeze(ctx);
    return ctx.events;
  }
  if (s.hitstop > 0) {
    s.hitstop -= 1;
    return ctx.events;
  }

  if (s.phase === 'intro' && s.phaseFrame === 0) ctx.events.push({ type: 'roundIntro', round: s.round });
  simulateFrame(ctx, live);
  s.phaseFrame += 1;
  advancePhase(ctx);
  return ctx.events;
}

/** During a super freeze only the caster's move animation advances. */
function tickSuperFreeze(ctx: Ctx): void {
  const { s } = ctx;
  const sf = s.superFreeze;
  if (sf === null) return;
  const caster = s.fighters[sf.caster];
  if (caster.state === 'attack') {
    caster.moveFrame += 1;
    caster.stateFrame += 1;
    emitMoveFrameEvents(ctx, sf.caster);
  }
  sf.frames -= 1;
  if (sf.frames <= 0) s.superFreeze = null;
}

function simulateFrame(ctx: Ctx, live: boolean): void {
  const { s } = ctx;
  for (const i of PLAYERS) updateFighter(ctx, i, live ? s.fighters[i].input.held : EMPTY_INPUT);
  for (const i of PLAYERS) applyPhysics(ctx, i);
  resolveBodyPush(ctx);

  moveProjectiles(ctx);
  spawnProjectiles(ctx);
  if (live) {
    clashProjectiles(ctx);
    const melee = collectMeleeHits(ctx);
    const shots = collectProjectileHits(ctx);
    const pending = [...melee, ...shots];
    const blocked = resolveHits(ctx, pending);
    consumeProjectileHits(ctx, shots, blocked.slice(melee.length));
  }

  // The attacker's combo ends when the defender leaves hitstun.
  for (const i of PLAYERS) {
    if (s.fighters[i].state !== 'hitstun') s.fighters[other(i)].combo = 0;
  }
}

function enterPhase(s: MatchState, phase: MatchPhase): void {
  s.phase = phase;
  s.phaseFrame = 0;
}

function advancePhase(ctx: Ctx): void {
  const { s } = ctx;
  switch (s.phase) {
    case 'intro':
      if (s.phaseFrame >= INTRO_FRAMES) {
        enterPhase(s, 'fight');
        ctx.events.push({ type: 'roundStart', round: s.round });
      }
      break;
    case 'fight':
      if (ctx.kos.length > 0) {
        endRoundByKo(ctx);
      } else {
        s.timer = Math.max(0, s.timer - 1);
        if (s.timer === 0) endRoundByTimeout(ctx);
      }
      break;
    case 'ko':
    case 'timeout':
      if (s.phaseFrame >= ROUND_END_FRAMES) enterPhase(s, 'outro');
      break;
    case 'outro':
      celebrate(s);
      if (s.phaseFrame >= OUTRO_FRAMES) finishRound(ctx);
      break;
    case 'matchEnd':
      celebrate(s);
      break;
  }
}

function endRoundByKo(ctx: Ctx): void {
  const { s } = ctx;
  const koed = PLAYERS.filter((i) => s.fighters[i].health <= 0);
  const winner: PlayerIndex | null = koed.length === 1 && koed[0] !== undefined ? other(koed[0]) : null;
  if (winner !== null) s.wins[winner] += 1;
  for (const k of ctx.kos) {
    ctx.events.push({ type: 'ko', fighter: k.fighter, by: k.by, element: k.element, strength: k.strength, x: k.x, y: k.y });
  }
  const decisive = winner === null ? undefined : ctx.kos.find((k) => k.by === winner);
  if (decisive && decisive.strength === 'ultimate' && winner !== null && s.wins[winner] >= s.roundsToWin) {
    ctx.events.push({ type: 'finisher', fighter: winner, target: decisive.fighter, element: decisive.element, x: decisive.x, y: decisive.y });
  }
  const reason = winner === null ? 'doubleKo' : 'ko';
  s.lastRoundResult = { round: s.round, winner, reason };
  ctx.events.push({ type: 'roundEnd', round: s.round, winner, reason });
  enterPhase(s, 'ko');
}

function endRoundByTimeout(ctx: Ctx): void {
  const { s, defs } = ctx;
  const [f0, f1] = s.fighters;
  const frac0 = f0.health / defs[0].stats.health;
  const frac1 = f1.health / defs[1].stats.health;
  const winner: PlayerIndex | null = frac0 > frac1 ? 0 : frac1 > frac0 ? 1 : null;
  if (winner !== null) s.wins[winner] += 1;
  s.lastRoundResult = { round: s.round, winner, reason: 'timeout' };
  ctx.events.push({ type: 'roundEnd', round: s.round, winner, reason: 'timeout' });
  enterPhase(s, 'timeout');
}

/** The round winner strikes the win pose once back in a neutral state. */
function celebrate(s: MatchState): void {
  const winner = s.lastRoundResult?.winner;
  if (winner === undefined || winner === null) return;
  const f = s.fighters[winner];
  if (isGroundNeutral(f)) setState(f, 'win');
}

function finishRound(ctx: Ctx): void {
  const { s, defs } = ctx;
  const champion = PLAYERS.find((i) => s.wins[i] >= s.roundsToWin);
  if (champion !== undefined) {
    s.winner = champion;
    enterPhase(s, 'matchEnd');
    ctx.events.push({ type: 'matchEnd', winner: champion });
    return;
  }
  s.round += 1;
  for (const i of PLAYERS) resetFighterForRound(s.fighters[i], defs[i], i);
  s.projectiles = [];
  s.timer = s.roundFrames;
  s.hitstop = 0;
  s.superFreeze = null;
  enterPhase(s, 'intro');
}
