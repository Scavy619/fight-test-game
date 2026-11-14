// Hit detection and resolution for melee hitboxes and projectiles.
import {
  AIR_HIT_MIN_VY, BLOCK_HITSTOP_FACTOR, BLOCK_METER_FACTOR, COMBO_SCALING, COMBO_SCALING_FLOOR,
  DEFAULT_CHIP, DODGE_COOLDOWN_FRAMES, HITSTOP, KO_VX, KO_VY, METER_MAX, METER_PER_DAMAGE_TAKEN,
} from './constants';
import { type Ctx, PLAYERS, other } from './context';
import { isAirborne, setState } from './fighter';
import { bodyRect, liveWorldHitboxes, overlapCentre, rectsOverlap } from './geometry';
import { moveChip, moveElement } from './moves';
import type {
  AttackLevel, Element, Facing, FighterDef, FighterState, Hitbox, MoveSlot, PlayerIndex, Strength, Vec2,
} from './types';

/** Everything a connecting attack needs, from a move or a projectile. */
export interface HitData {
  slot: MoveSlot;
  damage: number;
  level: AttackLevel;
  hitstun: number;
  blockstun: number;
  knockback: Vec2;
  chip: number;
  launches: boolean;
  throw: boolean;
  strength: Strength;
  element: Element;
  meterGain: number;
}

export interface PendingHit {
  attacker: PlayerIndex;
  defender: PlayerIndex;
  hit: HitData;
  /** Contact point. */
  x: number;
  y: number;
  /** Direction the defender is pushed. */
  pushDir: Facing;
  /** Melee hit group, consumed when it connects. */
  group: number;
  /** Projectile id, or null for melee. */
  projectile: number | null;
}

/** Hit data of a melee move; `box` overrides `launches` and `knockback` when it sets them. */
export function meleeHitData(def: FighterDef, slot: MoveSlot, box?: Hitbox): HitData {
  const m = def.moves[slot];
  return {
    slot, damage: m.damage, level: m.level, hitstun: m.hitstun, blockstun: m.blockstun,
    knockback: box?.knockback ?? m.knockback, chip: moveChip(m),
    launches: box?.launches ?? m.launches ?? false, throw: m.throw ?? false,
    strength: m.strength, element: moveElement(def, m), meterGain: m.meterGain,
  };
}

/** Hit data of a projectile spawned by `slot` (which must define one). */
export function projectileHitData(def: FighterDef, slot: MoveSlot): HitData {
  const m = def.moves[slot];
  const p = m.projectile;
  if (!p) throw new Error(`${def.id}.${slot} has no projectile`);
  const strength = p.strength ?? m.strength;
  return {
    slot, damage: p.damage, level: p.level, hitstun: p.hitstun, blockstun: p.blockstun,
    knockback: p.knockback, chip: p.chip ?? DEFAULT_CHIP[strength], launches: p.launches ?? false,
    throw: false, strength, element: p.element ?? moveElement(def, m), meterGain: p.meterGain ?? m.meterGain,
  };
}

export function canBeHit(f: FighterState): boolean {
  return !f.invulnerable && f.state !== 'ko' && f.state !== 'win';
}

const UNTHROWABLE = new Set(['hitstun', 'blockstun', 'knockdown', 'getup', 'dodge', 'air', 'ko', 'win']);

export function canBeThrown(f: FighterState): boolean {
  return canBeHit(f) && !isAirborne(f) && !UNTHROWABLE.has(f.state);
}

/** Holding block in a state that may block (grounded neutral states become 'block' when block is held). */
export function canBlock(f: FighterState): boolean {
  if (isAirborne(f)) return false;
  return f.state === 'block' || (f.state === 'blockstun' && f.input.held.block);
}

/** Standing block stops mid and overhead; crouching block stops mid and low. */
export function levelBlocked(level: AttackLevel, crouching: boolean): boolean {
  return level === 'mid' || (crouching ? level === 'low' : level === 'overhead');
}

/** At most one new hit group per attacker per frame. */
export function collectMeleeHits(ctx: Ctx): PendingHit[] {
  const pending: PendingHit[] = [];
  for (const i of PLAYERS) {
    const a = ctx.s.fighters[i];
    const def = ctx.defs[i];
    if (a.state !== 'attack' || a.move === null) continue;
    const d = other(i);
    const target = ctx.s.fighters[d];
    const isThrow = def.moves[a.move].throw ?? false;
    if (isThrow ? !canBeThrown(target) : !canBeHit(target)) continue;
    const hurt = bodyRect(target, ctx.defs[d]);
    for (const box of liveWorldHitboxes(a, def)) {
      if (a.hitGroups.includes(box.group) || !rectsOverlap(box, hurt)) continue;
      const c = overlapCentre(box, hurt);
      pending.push({
        attacker: i, defender: d, hit: meleeHitData(def, a.move, box.box), x: c.x, y: c.y,
        pushDir: a.facing, group: box.group, projectile: null,
      });
      break;
    }
  }
  return pending;
}

function addMeter(f: FighterState, amount: number): void {
  f.meter = Math.min(METER_MAX, f.meter + amount);
}

function interruptDefender(d: FighterState): void {
  if (d.state === 'dodge') d.dodgeCooldown = DODGE_COOLDOWN_FRAMES;
  d.dodgeForward = false;
}

function applyBlock(ctx: Ctx, p: PendingHit, crouching: boolean): void {
  const { s } = ctx;
  const a = s.fighters[p.attacker];
  const d = s.fighters[p.defender];
  const { hit } = p;
  const before = d.health;
  // Chip never takes the last point of health.
  if (d.health > 1) d.health = Math.max(1, d.health - Math.round(hit.damage * hit.chip));
  const chip = before - d.health;

  interruptDefender(d);
  setState(d, 'blockstun');
  d.crouching = crouching;
  d.stunFrames = hit.blockstun;
  d.vx = 0;
  d.pushback = p.pushDir * hit.knockback.x;
  d.pushbackTransfers = p.projectile === null;

  addMeter(a, hit.meterGain * BLOCK_METER_FACTOR);
  addMeter(d, chip * METER_PER_DAMAGE_TAKEN);
  s.hitstop = Math.max(s.hitstop, Math.floor(HITSTOP[hit.strength] * BLOCK_HITSTOP_FACTOR));
  if (p.projectile === null) {
    a.moveConnected = true;
    a.hitGroups.push(p.group);
  }
  ctx.events.push({
    type: 'block', fighter: p.attacker, target: p.defender, slot: hit.slot, x: p.x, y: p.y,
    element: hit.element, strength: hit.strength, chip, crouching, projectile: p.projectile,
  });
}

function applyHit(ctx: Ctx, p: PendingHit, wasAirborne: boolean, wasCrouching: boolean): void {
  const { s } = ctx;
  const a = s.fighters[p.attacker];
  const d = s.fighters[p.defender];
  const { hit } = p;

  // Combo: continues while the defender is still in hitstun (including from a hit earlier this frame).
  const continues = d.state === 'hitstun';
  a.combo = continues ? a.combo + 1 : 1;
  if (!continues) a.comboDamage = 0;
  const scale = Math.max(COMBO_SCALING_FLOOR, COMBO_SCALING ** (a.combo - 1));
  const damage = Math.round(hit.damage * scale);
  const before = d.health;
  d.health = Math.max(0, d.health - damage);
  a.comboDamage += before - d.health;

  addMeter(a, hit.meterGain);
  addMeter(d, (before - d.health) * METER_PER_DAMAGE_TAKEN);

  interruptDefender(d);
  d.pushback = 0;
  d.pushbackTransfers = false;
  if (d.health <= 0) {
    setState(d, 'ko');
    d.knockdownOnLand = false;
    d.vx = p.pushDir * Math.max(hit.knockback.x, KO_VX);
    d.vy = Math.max(hit.knockback.y, KO_VY);
    if (before > 0) {
      ctx.kos.push({ fighter: p.defender, by: p.attacker, element: hit.element, strength: hit.strength, x: p.x, y: p.y });
    }
  } else if (hit.launches || hit.throw || wasAirborne) {
    setState(d, 'hitstun');
    d.knockdownOnLand = true;
    d.stunFrames = 0;
    d.vx = p.pushDir * hit.knockback.x;
    d.vy = Math.max(hit.knockback.y, AIR_HIT_MIN_VY);
  } else {
    setState(d, 'hitstun');
    d.crouching = wasCrouching;
    d.knockdownOnLand = false;
    d.stunFrames = hit.hitstun;
    d.vx = 0;
    d.pushback = p.pushDir * hit.knockback.x;
    d.pushbackTransfers = p.projectile === null;
  }

  s.hitstop = Math.max(s.hitstop, HITSTOP[hit.strength]);
  if (p.projectile === null) {
    a.moveConnected = true;
    a.hitGroups.push(p.group);
  }
  ctx.events.push({
    type: 'hit', fighter: p.attacker, target: p.defender, slot: hit.slot, x: p.x, y: p.y,
    element: hit.element, strength: hit.strength, damage: before - d.health, combo: a.combo,
    launches: d.knockdownOnLand, projectile: p.projectile,
  });
}

/**
 * Applies all hits found this frame. Block decisions use each defender's
 * state from before any of this frame's hits, so trades are simultaneous.
 * Returns, per pending hit, whether it was blocked.
 */
export function resolveHits(ctx: Ctx, pending: readonly PendingHit[]): boolean[] {
  const before = ctx.s.fighters.map((f) => ({
    canBlock: canBlock(f), crouching: f.crouching, airborne: isAirborne(f),
  }));
  return pending.map((p) => {
    const snap = before[p.defender];
    if (!snap) return false;
    const blocked = !p.hit.throw && snap.canBlock && levelBlocked(p.hit.level, snap.crouching);
    if (blocked) applyBlock(ctx, p, snap.crouching);
    else applyHit(ctx, p, snap.airborne, snap.crouching);
    return blocked;
  });
}
