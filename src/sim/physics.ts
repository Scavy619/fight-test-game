// Motion, gravity, landing, pushback (with corner transfer), stage bounds and body push.
import { PUSHBACK_FRICTION, STAGE_LEFT, STAGE_RIGHT } from './constants';
import { type Ctx, other } from './context';
import { isAirborne, landFighter } from './fighter';
import { bodyRect, rectsOverlap } from './geometry';
import { inRange } from './moves';
import type { FighterDef, FighterState, PlayerIndex } from './types';

export function clampToStage(x: number): number {
  return Math.min(STAGE_RIGHT, Math.max(STAGE_LEFT, x));
}

export function applyPhysics(ctx: Ctx, i: PlayerIndex): void {
  const f = ctx.s.fighters[i];
  if (isAirborne(f)) {
    f.vy -= ctx.defs[i].stats.gravity;
    f.x += f.vx;
    f.y += f.vy;
    if (f.y <= 0) {
      f.y = 0;
      f.vy = 0;
      f.x = clampToStage(f.x);
      landFighter(ctx, i);
    }
  } else {
    f.x += f.vx;
  }
  f.x = clampToStage(f.x);
  applyPushback(ctx, i);
}

/**
 * Ground pushback from hits and blocks. The part a fighter cannot travel
 * because of the wall pushes the opponent away instead (melee only), so
 * corner pressure is not infinite.
 */
function applyPushback(ctx: Ctx, i: PlayerIndex): void {
  const f = ctx.s.fighters[i];
  if (f.pushback === 0) return;
  if (isAirborne(f)) {
    f.pushback = 0;
    return;
  }
  const desired = f.x + f.pushback;
  f.x = clampToStage(desired);
  const overflow = desired - f.x;
  if (overflow !== 0 && f.pushbackTransfers) {
    const opp = ctx.s.fighters[other(i)];
    if (!isAirborne(opp)) opp.x = clampToStage(opp.x - overflow);
  }
  const speed = Math.max(0, Math.abs(f.pushback) - PUSHBACK_FRICTION);
  f.pushback = Math.sign(f.pushback) * speed;
}

function passesThrough(f: FighterState, def: FighterDef): boolean {
  if (f.state === 'ko') return true;
  if (f.state === 'dodge') return f.dodgeForward;
  if (f.state === 'attack' && f.move !== null) {
    const r = def.moves[f.move].passThrough;
    return r !== undefined && inRange(r, f.moveFrame);
  }
  return false;
}

/** Separates overlapping bodies horizontally, half each, the full amount against a wall. */
export function resolveBodyPush(ctx: Ctx): void {
  const [a, b] = ctx.s.fighters;
  const [defA, defB] = ctx.defs;
  if (passesThrough(a, defA) || passesThrough(b, defB)) return;
  if (!rectsOverlap(bodyRect(a, defA), bodyRect(b, defB))) return;
  const minDist = (defA.stats.width + defB.stats.width) / 2;
  // Direction fighter 0 moves; exact overlap is broken by fighter 0's facing.
  const dir = a.x < b.x ? -1 : a.x > b.x ? 1 : -a.facing;
  const half = (minDist - Math.abs(a.x - b.x)) / 2;
  a.x = clampToStage(a.x + dir * half);
  b.x = clampToStage(b.x - dir * half);
  // Against a wall one side could not move: the other takes the rest.
  let rest = minDist - Math.abs(a.x - b.x);
  if (rest > 0) b.x = clampToStage(b.x - dir * rest);
  rest = minDist - Math.abs(a.x - b.x);
  if (rest > 0) a.x = clampToStage(a.x + dir * rest);
}
