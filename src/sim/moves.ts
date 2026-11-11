// Read-only helpers over move frame data.
import { DEFAULT_CHIP } from './constants';
import type { Element, FighterDef, FrameRange, Hitbox, MoveDef, MoveSlot, VelocityStep } from './types';

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
