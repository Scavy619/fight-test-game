// Pure deterministic combat simulation: public API.
export * from './types';
export * from './constants';
export { createMatch, step } from './match';
export { hitboxToWorld, rectsOverlap, overlapCentre, bodyRect, liveWorldHitboxes, projectileRect } from './geometry';
export type { Rect } from './geometry';
export { isActionable, isAirborne, isGroundNeutral, canCancelInto } from './fighter';
export {
  moveTotal, hitboxFrames, liveHitboxes, lastHitboxFrame, velocityAt, inRange,
  moveElement, moveChip, isAirSlot, isCrouchSlot, isSpecialSlot,
} from './moves';
export { validateFighterDef } from './validate';
export { testFighter } from './testFighter';
