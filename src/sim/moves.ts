// Read-only helpers over move frame data.
import { DEFAULT_CHIP } from './constants';
import type { Element, FighterDef, FighterState, FrameRange, Hitbox, MoveDef, MoveSlot, VelocityStep } from './types';

/** The move in a slot for the fighter's current stance (stance overrides, else the base move). */
export function moveFor(def: FighterDef, f: Pick<FighterState, 'stance'>, slot: MoveSlot): MoveDef {
  return def.stances?.moves[f.stance]?.[slot] ?? def.moves[slot];
}

/** Same by stance index (projectiles remember the stance they were spawned in). */
export function moveInStance(def: FighterDef, stance: number, slot: MoveSlot): MoveDef {
  return def.stances?.moves[stance]?.[slot] ?? def.moves[slot];
}

export function moveTotal(m: MoveDef): number {
  return m.startup + m.active + m.recovery;
}

export function inRange(r: FrameRange, frame: number): boolean {
  return frame >= r.from && frame <= r.to;
}

/** Move frames on which a hitbox is live (default: the move's active frames). */
export function hitboxFrames(m: MoveDef, box: Hitbox): FrameRange {
  return { from: box.from ?? m.startup + 1, to: box.to ?? m.startup + m.active };
}

export function liveHitboxes(m: MoveDef, frame: number): Hitbox[] {
  return m.hitboxes.filter((b) => inRange(hitboxFrames(m, b), frame));
}

/** Last move frame on which any hitbox is live (0 if the move has none). */
export function lastHitboxFrame(m: MoveDef): number {
  return m.hitboxes.reduce((last, b) => Math.max(last, hitboxFrames(m, b).to), 0);
}

/** How far forward of the fighter origin a move's hitboxes get, including its own travel until the last hitbox frame. */
export function moveReach(m: MoveDef): number {
  const last = lastHitboxFrame(m);
  let travel = 0;
  for (const v of m.velocity ?? []) {
    const to = Math.min(v.to, last);
    if (to >= v.from) travel += v.vx * (to - v.from + 1);
  }
  const box = m.hitboxes.reduce((r, b) => Math.max(r, b.x + b.w), 0);
  return Math.max(0, travel) + box;
}

export function isLightSlot(slot: MoveSlot): boolean {
  return slot === 'light' || slot === 'crouchLight';
}

export function velocityAt(m: MoveDef, frame: number): VelocityStep | undefined {
  return m.velocity?.find((v) => inRange(v, frame));
}

export function moveElement(def: FighterDef, m: MoveDef): Element {
  return m.element ?? def.element;
}

export function moveChip(m: MoveDef): number {
  return m.chip ?? DEFAULT_CHIP[m.strength];
}

export function isAirSlot(slot: MoveSlot): boolean {
  return slot === 'airLight' || slot === 'airHeavy';
}

export function isCrouchSlot(slot: MoveSlot): boolean {
  return slot === 'crouchLight' || slot === 'crouchHeavy';
}

export function isSpecialSlot(slot: MoveSlot): boolean {
  return slot === 'specialN' || slot === 'specialF' || slot === 'specialD';
}
