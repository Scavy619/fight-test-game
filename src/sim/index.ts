// Pure deterministic combat simulation: public API.
export * from './types';
export * from './constants';
export { createMatch, step } from './match';
export { hitboxToWorld, rectsOverlap, overlapCentre, bodyRect, liveWorldHitboxes, projectileRect, zoneRect } from './geometry';
export { ZONE_DEFAULT_HEIGHT, ZONE_DEFAULT_SLOW } from './zones';
export { RETURNING_RANGE } from './projectiles';
export type { Rect } from './geometry';
export { isActionable, isAirborne, isGroundNeutral, canCancelInto } from './fighter';
export {
  moveFor, moveInStance, moveTotal, hitboxFrames, liveHitboxes, lastHitboxFrame, velocityAt, inRange, moveReach,
  moveElement, moveChip, isAirSlot, isCrouchSlot, isSpecialSlot, isLightSlot,
} from './moves';
export { validateFighterDef } from './validate';
export { testFighter } from './testFighter';
