// Fighter state machine: timers, input decisions, move frames, velocities.
import {
  CHARGE_HOLD_FRAMES, CHARGE_MAX_FRAMES,
  DODGE_COOLDOWN_FRAMES, DODGE_FRAMES, DODGE_INVULNERABLE, DODGE_SPEED, DODGE_TRAVEL_FRAMES,
  GETUP_FRAMES, GRAB_CHORD_FRAMES, GUARD_PROXIMITY, KNOCKDOWN_FRAMES, LANDING_RECOVERY_FRAMES, METER_MAX,
  PREJUMP_FRAMES, PROJECTILE_GUARD_RANGE, START_X, SUPER_FREEZE_FRAMES, ULTIMATE_EARLY_FRAMES,
} from './constants';
import { type Ctx, other } from './context';
import { backHeld, buffered, consume, createInputState, emptyBuffer, forwardHeld } from './input';
import {
  inRange, isAirSlot, isCrouchSlot, isLightSlot, isSpecialSlot, lastHitboxFrame, moveElement, moveReach, moveTotal,
  velocityAt,
} from './moves';
import type {
  BufferedButton, FighterDef, FighterState, FighterStateName, InputFrame, MoveSlot, PlayerIndex,
} from './types';

export function createFighterState(def: FighterDef, index: PlayerIndex): FighterState {
  return {
    x: START_X[index], y: 0, vx: 0, vy: 0,
    facing: index === 0 ? 1 : -1,
    state: 'idle', stateFrame: 1, crouching: false,
    move: null, moveFrame: 0, moveConnected: false, hitGroups: [], chainedFrom: null, heavyHeld: 0,
    stunFrames: 0, knockdownOnLand: false,
    pushback: 0, pushbackTransfers: false,
    jumpDir: 0, airAttackUsed: false,
    dodgeForward: false, dodgeCooldown: 0,
    invulnerable: false,
    health: def.stats.health, meter: 0, combo: 0, comboDamage: 0,
    input: createInputState(),
  };
}

/** New round: everything resets except meter and the held buttons (edge detection). */
export function resetFighterForRound(f: FighterState, def: FighterDef, index: PlayerIndex): void {
  const { meter } = f;
  const held = f.input.held;
  Object.assign(f, createFighterState(def, index), { meter, input: { held, buffer: emptyBuffer() } });
}

export function isAirborne(f: FighterState): boolean {
  return f.y > 0 || f.vy > 0;
}

const GROUND_NEUTRAL: readonly FighterStateName[] = ['idle', 'walk', 'crouch', 'block'];

/** Grounded and free to act (move, attack, dodge, jump, block). */
export function isGroundNeutral(f: FighterState): boolean {
  return GROUND_NEUTRAL.includes(f.state) && !isAirborne(f);
}

/** Free to start a new action this frame (ground neutral, or airborne with the air attack unused). */
export function isActionable(f: FighterState): boolean {
  return isGroundNeutral(f) || (f.state === 'air' && !f.airAttackUsed);
}

/** Enters a state; stateFrame restarts at 1 and posture resets to standing. */
export function setState(f: FighterState, state: FighterStateName): void {
  f.state = state;
  f.stateFrame = 1;
  f.crouching = false;
  if (state !== 'attack') {
    f.move = null;
    f.moveFrame = 0;
  }
}

/** Neutral states keep counting frames when re-entered. */
function setNeutral(f: FighterState, state: FighterStateName, crouching: boolean): void {
  if (f.state !== state) setState(f, state);
  f.crouching = crouching;
}

export function startMove(ctx: Ctx, i: PlayerIndex, slot: MoveSlot): void {
  const f = ctx.s.fighters[i];
  const def = ctx.defs[i];
  const m = def.moves[slot];
  f.chainedFrom = f.state === 'attack' ? f.move : null;
  setState(f, 'attack');
  f.move = slot;
  f.moveFrame = 1;
  f.moveConnected = false;
  f.hitGroups = [];
  f.crouching = isCrouchSlot(slot);
  if (isAirSlot(slot)) f.airAttackUsed = true;
  ctx.events.push({
    type: 'moveStart', fighter: i, slot, anim: m.anim, x: f.x, y: f.y,
    element: moveElement(def, m), strength: m.strength,
  });
}

export function canCancelInto(f: FighterState, def: FighterDef, slot: MoveSlot): boolean {
  if (f.state !== 'attack' || f.move === null || !f.moveConnected) return false;
  // Lights chain into one more light, not a third (light -> light -> heavy is the longest light run).
  if (isLightSlot(slot) && isLightSlot(f.move) && f.chainedFrom !== null && isLightSlot(f.chainedFrom)) return false;
  const cancels = def.moves[f.move].cancels;
  return cancels !== undefined && cancels.into.includes(slot) && f.moveFrame <= cancels.until;
}

/**
 * Holding back blocks (proximity guard): true while the opponent's current strike can still
 * hit and is within reach, or a projectile is heading in.
 */
export function underAttack(ctx: Ctx, i: PlayerIndex): boolean {
  const f = ctx.s.fighters[i];
  const j = other(i);
  const o = ctx.s.fighters[j];
  if (o.state === 'attack' && o.move !== null) {
    const m = ctx.defs[j].moves[o.move];
    if (!m.throw && o.moveFrame <= lastHitboxFrame(m)) {
      const dist = Math.abs(o.x - f.x);
      if (dist <= moveReach(m) + ctx.defs[i].stats.width / 2 + GUARD_PROXIMITY) return true;
    }
  }
  for (const p of ctx.s.projectiles) {
    if (p.owner === j && (p.x < f.x) === (p.vx > 0) && Math.abs(p.x - f.x) <= PROJECTILE_GUARD_RANGE) return true;
  }
  return false;
}

function ultimateReady(ctx: Ctx, f: FighterState, def: FighterDef, held: InputFrame): boolean {
  if (ctx.s.superFreeze !== null) return false; // a same-frame ultimate by P1 wins the tie
  if (!held.heavy || !held.special) return false;
  if (!buffered(f, 'heavy') && !buffered(f, 'special')) return false;
  if (f.meter < METER_MAX || isAirborne(f)) return false;
  if (isGroundNeutral(f)) return true;
  if (f.state !== 'attack' || f.move === null) return false;
  if ((f.move === 'heavy' || isSpecialSlot(f.move)) && f.moveFrame <= ULTIMATE_EARLY_FRAMES) return true;
  return canCancelInto(f, def, 'ultimate');
}

function startUltimate(ctx: Ctx, i: PlayerIndex): void {
  const f = ctx.s.fighters[i];
  consume(f, 'heavy');
  consume(f, 'special');
  f.meter = 0;
  startMove(ctx, i, 'ultimate');
  ctx.s.superFreeze = { frames: SUPER_FREEZE_FRAMES, caster: i };
  ctx.events.push({
    type: 'superFreeze', fighter: i, frames: SUPER_FREEZE_FRAMES, x: f.x, y: f.y,
    element: moveElement(ctx.defs[i], ctx.defs[i].moves.ultimate),
  });
}

interface AttackChoice { button: BufferedButton; slot: MoveSlot }

/** Buffered buttons and the slot each would start, in priority order. */
function attackChoices(f: FighterState, held: InputFrame, airborne: boolean): AttackChoice[] {
  if (airborne) {
    return [{ button: 'heavy', slot: 'airHeavy' }, { button: 'light', slot: 'airLight' }];
  }
  const special: MoveSlot = held.down ? 'specialD' : forwardHeld(f, held) ? 'specialF' : 'specialN';
  return [
    { button: 'special', slot: special },
    { button: 'heavy', slot: held.down ? 'crouchHeavy' : 'heavy' },
    { button: 'light', slot: held.down ? 'crouchLight' : 'light' },
  ];
}

function faceOpponent(f: FighterState, opp: FighterState): void {
  if (opp.x > f.x) f.facing = 1;
  else if (opp.x < f.x) f.facing = -1;
}

function actGround(ctx: Ctx, i: PlayerIndex, held: InputFrame): void {
  const f = ctx.s.fighters[i];
  const def = ctx.defs[i];
  if (ultimateReady(ctx, f, def, held)) return startUltimate(ctx, i);
  if (buffered(f, 'dodge') && f.dodgeCooldown === 0) {
    consume(f, 'dodge');
    setState(f, 'dodge');
    f.dodgeForward = forwardHeld(f, held);
    ctx.events.push({ type: 'dodge', fighter: i, forward: f.dodgeForward, x: f.x, y: f.y });
    return;
  }
  // Grab: the grab button, or light and heavy pressed together (within the buffer window).
  if (buffered(f, 'grab') || (buffered(f, 'light') && buffered(f, 'heavy'))) {
    consume(f, 'grab');
    consume(f, 'light');
    consume(f, 'heavy');
    return startMove(ctx, i, 'throw');
  }
  for (const c of attackChoices(f, held, false)) {
    if (buffered(f, c.button)) {
      consume(f, c.button);
      return startMove(ctx, i, c.slot);
    }
  }
  // Power button held, or heavy kept held: charge the power strike.
  if (held.power || (held.heavy && f.heavyHeld >= CHARGE_HOLD_FRAMES)) return setState(f, 'charge');
  if (held.block || (backHeld(f, held) && underAttack(ctx, i))) return setNeutral(f, 'block', held.down);
  if (held.up) return setState(f, 'prejump');
  if (held.down) return setNeutral(f, 'crouch', true);
  if (forwardHeld(f, held)) {
    setNeutral(f, 'walk', false);
    f.vx = f.facing * def.stats.walkSpeed;
  } else if (backHeld(f, held)) {
    setNeutral(f, 'walk', false);
    f.vx = -f.facing * def.stats.backSpeed;
  } else {
    setNeutral(f, 'idle', false);
  }
}

function actAir(ctx: Ctx, i: PlayerIndex, held: InputFrame): void {
  const f = ctx.s.fighters[i];
  for (const c of attackChoices(f, held, true)) {
    if (buffered(f, c.button)) {
      consume(f, c.button);
      return startMove(ctx, i, c.slot);
    }
  }
}

/** The button that turns a just-started normal into the grab (null for other moves). */
function grabPartner(move: MoveSlot | null): BufferedButton | null {
  if (move === 'light' || move === 'crouchLight') return 'heavy';
  if (move === 'heavy' || move === 'crouchHeavy') return 'light';
  return null;
}

function tryCancel(ctx: Ctx, i: PlayerIndex, held: InputFrame): void {
  const f = ctx.s.fighters[i];
  const def = ctx.defs[i];
  if (ultimateReady(ctx, f, def, held)) return startUltimate(ctx, i);
  // Staggered grab chord: the other button within the first frames of a ground normal.
  const partner = grabPartner(f.move);
  if (partner && f.moveFrame <= GRAB_CHORD_FRAMES && !isAirborne(f) && buffered(f, partner)) {
    consume(f, partner);
    return startMove(ctx, i, 'throw');
  }
  for (const c of attackChoices(f, held, isAirborne(f))) {
    if (buffered(f, c.button) && canCancelInto(f, def, c.slot)) {
      consume(f, c.button);
      return startMove(ctx, i, c.slot);
    }
  }
}

function takeoff(ctx: Ctx, i: PlayerIndex, held: InputFrame): void {
  const f = ctx.s.fighters[i];
  const { stats } = ctx.defs[i];
  f.jumpDir = forwardHeld(f, held) ? 1 : backHeld(f, held) ? -1 : 0;
  setState(f, 'air');
  f.airAttackUsed = false;
  f.vx = f.jumpDir * f.facing * stats.jumpForwardSpeed;
  f.vy = stats.jumpVelocity;
  ctx.events.push({ type: 'jump', fighter: i, dir: f.jumpDir, x: f.x, y: f.y });
}

/** Timed transitions: states that end after a number of frames. */
function advanceTimedState(ctx: Ctx, i: PlayerIndex, held: InputFrame): void {
  const f = ctx.s.fighters[i];
  switch (f.state) {
    case 'prejump':
      if (f.stateFrame > PREJUMP_FRAMES) takeoff(ctx, i, held);
      break;
    case 'attack': {
      if (f.move === null || f.moveFrame <= moveTotal(ctx.defs[i].moves[f.move])) break;
      if (isAirborne(f)) {
        setState(f, 'air');
        f.airAttackUsed = true;
      } else {
        setState(f, 'idle');
      }
      break;
    }
    case 'land':
      if (f.stateFrame > LANDING_RECOVERY_FRAMES) setState(f, 'idle');
      break;
    case 'hitstun':
      if (!f.knockdownOnLand && f.stateFrame > f.stunFrames) setState(f, 'idle');
      break;
    case 'blockstun':
      if (f.stateFrame > f.stunFrames) setState(f, 'idle');
      break;
    case 'knockdown':
      if (f.stateFrame > KNOCKDOWN_FRAMES) setState(f, 'getup');
      break;
    case 'getup':
      if (f.stateFrame > GETUP_FRAMES) setState(f, 'idle');
      break;
    case 'dodge':
      if (f.stateFrame > DODGE_FRAMES) {
        setState(f, 'idle');
        f.dodgeForward = false;
        f.dodgeCooldown = DODGE_COOLDOWN_FRAMES;
      }
      break;
    default:
      break;
  }
}

/** Velocity for states that drive their own movement (walk sets its own in actGround). */
function applyStateVelocity(ctx: Ctx, i: PlayerIndex): void {
  const f = ctx.s.fighters[i];
  const airborne = isAirborne(f);
  switch (f.state) {
    case 'attack': {
      const step = f.move === null ? undefined : velocityAt(ctx.defs[i].moves[f.move], f.moveFrame);
      if (step) {
        f.vx = step.vx * f.facing;
        if (step.vy !== undefined) f.vy = step.vy;
      } else if (!airborne) {
        f.vx = 0;
      }
      break;
    }
    case 'dodge': {
      const speed = f.stateFrame <= DODGE_TRAVEL_FRAMES ? DODGE_SPEED : 0;
      f.vx = speed * (f.dodgeForward ? f.facing : -f.facing);
      break;
    }
    case 'walk':
    case 'air':
    case 'ko':
      break;
    default:
      if (!airborne) f.vx = 0;
      break;
  }
}

/** Emits timed fx tags of the current move frame, and `whiff` when the hitboxes ended without connecting. */
export function emitMoveFrameEvents(ctx: Ctx, i: PlayerIndex): void {
  const f = ctx.s.fighters[i];
  if (f.state !== 'attack' || f.move === null) return;
  const def = ctx.defs[i];
  const m = def.moves[f.move];
  for (const fx of m.fx ?? []) {
    if (fx.frame === f.moveFrame) {
      ctx.events.push({ type: 'fx', fighter: i, tag: fx.tag, slot: f.move, x: f.x, y: f.y });
    }
  }
  if (m.hitboxes.length > 0 && !f.moveConnected && f.moveFrame === lastHitboxFrame(m) + 1) {
    ctx.events.push({
      type: 'whiff', fighter: i, slot: f.move, x: f.x, y: f.y,
      element: moveElement(def, m), strength: m.strength,
    });
  }
}

function computeInvulnerable(f: FighterState, def: FighterDef): boolean {
  switch (f.state) {
    case 'dodge':
      return inRange(DODGE_INVULNERABLE, f.stateFrame);
    case 'knockdown':
    case 'getup':
    case 'ko':
    case 'win':
      return true;
    case 'attack': {
      const inv = f.move === null ? undefined : def.moves[f.move].invulnerable;
      return inv !== undefined && inRange(inv, f.moveFrame);
    }
    default:
      return false;
  }
}

/**
 * Advances one fighter by one frame: counters, timed transitions, decisions
 * from `held` (the effective input; empty outside the fight phase) and the
 * press buffer, velocities, move frame events and invulnerability.
 * Physics is applied afterwards for both fighters.
 */
export function updateFighter(ctx: Ctx, i: PlayerIndex, held: InputFrame): void {
  const f = ctx.s.fighters[i];
  const opp = ctx.s.fighters[other(i)];
  if (f.dodgeCooldown > 0) f.dodgeCooldown -= 1;
  f.heavyHeld = held.heavy ? f.heavyHeld + 1 : 0;
  f.stateFrame += 1;
  if (f.state === 'attack') f.moveFrame += 1;

  advanceTimedState(ctx, i, held);

  if (isGroundNeutral(f)) {
    faceOpponent(f, opp);
    actGround(ctx, i, held);
  } else if (f.state === 'charge') {
    faceOpponent(f, opp);
    if (!(held.power || held.heavy) || f.stateFrame >= CHARGE_MAX_FRAMES) startMove(ctx, i, 'power');
  } else if (f.state === 'air' && !f.airAttackUsed) {
    actAir(ctx, i, held);
  } else if (f.state === 'attack') {
    tryCancel(ctx, i, held);
  } else if (f.state === 'blockstun') {
    f.crouching = held.down;
  }

  applyStateVelocity(ctx, i);
  emitMoveFrameEvents(ctx, i);
  f.invulnerable = computeInvulnerable(f, ctx.defs[i]);
}

/**
 * Called by physics when an airborne fighter touches the ground.
 */
export function landFighter(ctx: Ctx, i: PlayerIndex): void {
  const f = ctx.s.fighters[i];
  f.vx = 0;
  f.airAttackUsed = false;
  let hard = false;
  switch (f.state) {
    case 'air':
      setState(f, 'idle');
      break;
    case 'attack':
      // Air attacks end on landing; grounded moves that left the ground carry on.
      if (f.move !== null && isAirSlot(f.move)) setState(f, 'land');
      break;
    case 'hitstun':
      setState(f, 'knockdown');
      f.knockdownOnLand = false;
      f.invulnerable = true; // already this frame: hits are resolved after physics
      hard = true;
      break;
    case 'ko':
      hard = true;
      break;
    default:
      break;
  }
  ctx.events.push({ type: 'land', fighter: i, hard, x: f.x, y: f.y });
}
