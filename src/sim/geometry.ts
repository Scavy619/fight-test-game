// Boxes in sim world space.
//
// World rects: `x` is the left edge, `y` the bottom edge (sim y is height above
// ground, up positive), `w`/`h` extend right and up.
//
// Hitbox convention (MoveDef.hitboxes): authored facing right relative to the
// fighter origin (feet centre). (x, y) is the box's lower-left corner facing
// right, so the box covers origin.x + x .. origin.x + x + w and
// origin.y + y .. origin.y + y + h. Facing left mirrors it around the origin:
// origin.x - x - w .. origin.x - x. `hitboxToWorld` does the conversion.
import { liveHitboxes } from './moves';
import type { Facing, FighterDef, FighterState, Hitbox, Projectile, Vec2 } from './types';

export interface Rect { x: number; y: number; w: number; h: number }

export function hitboxToWorld(box: Hitbox, originX: number, originY: number, facing: Facing): Rect {
  const left = facing === 1 ? originX + box.x : originX - box.x - box.w;
  return { x: left, y: originY + box.y, w: box.w, h: box.h };
}

/** Strict overlap: touching edges do not overlap. */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** Centre of the intersection of two overlapping rects (hit spark position). */
export function overlapCentre(a: Rect, b: Rect): Vec2 {
  const left = Math.max(a.x, b.x);
  const right = Math.min(a.x + a.w, b.x + b.w);
  const bottom = Math.max(a.y, b.y);
  const top = Math.min(a.y + a.h, b.y + b.h);
  return { x: (left + right) / 2, y: (bottom + top) / 2 };
}

/** Body box, used both for pushing and as the hurtbox. */
export function bodyRect(f: FighterState, def: FighterDef): Rect {
  const { width, height, crouchHeight } = def.stats;
  let h = f.crouching ? crouchHeight : height;
  if (f.state === 'knockdown' || (f.state === 'ko' && f.y <= 0)) h = crouchHeight / 2;
  return { x: f.x - width / 2, y: f.y, w: width, h };
}

/** World rects of the fighter's hitboxes live this frame, with their hit group. */
export function liveWorldHitboxes(f: FighterState, def: FighterDef): (Rect & { group: number })[] {
  if (f.state !== 'attack' || f.move === null) return [];
  return liveHitboxes(def.moves[f.move], f.moveFrame).map((b) => ({
    ...hitboxToWorld(b, f.x, f.y, f.facing),
    group: b.group ?? 0,
  }));
}

/** Projectile positions are box centres. */
export function projectileRect(p: Projectile): Rect {
  return { x: p.x - p.w / 2, y: p.y - p.h / 2, w: p.w, h: p.h };
}
