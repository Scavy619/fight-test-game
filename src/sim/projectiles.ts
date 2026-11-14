// Projectile spawning, motion, clashes and hits.
import { PROJECTILE_REHIT_FRAMES, STAGE_LEFT, STAGE_RIGHT, STAGE_WIDTH } from './constants';
import { type Ctx, PLAYERS, other } from './context';
import { canBeHit, type PendingHit, projectileHitData } from './combat';
import { bodyRect, overlapCentre, projectileRect, rectsOverlap } from './geometry';
import { moveElement, moveFor } from './moves';
import type { Facing, Projectile } from './types';

export const RETURNING_RANGE = 320;

/** Moves existing projectiles and removes expired, off-stage or returned ones. */
export function moveProjectiles(ctx: Ctx): void {
  const { s } = ctx;
  const done = new Set<number>();
  for (const p of s.projectiles) {
    p.age += 1;
    p.x += p.vx;
    p.y += p.vy;
    if (p.rehit > 0) p.rehit -= 1;
    if (p.behavior === 'returning') {
      const owner = s.fighters[p.owner];
      const range = moveFor(ctx.defs[p.owner], { stance: p.stance }, p.slot).projectile?.range ?? RETURNING_RANGE;
      if (!p.returning && (Math.abs(p.x - p.startX) >= range || p.x <= STAGE_LEFT || p.x >= STAGE_RIGHT)) {
        p.returning = true;
        p.vx = Math.sign(owner.x - p.x || -p.vx) * Math.abs(p.vx);
        p.rehit = 0;
      } else if (p.returning) {
        // Home on the owner and vanish once it reaches them.
        p.vx = Math.sign(owner.x - p.x || p.vx) * Math.abs(p.vx);
        if (Math.abs(owner.x - p.x) <= Math.abs(p.vx) + 4) done.add(p.id);
      }
    }
  }
  s.projectiles = s.projectiles.filter(
    (p) => !done.has(p.id) && p.age <= p.lifetime && p.x > -p.w && p.x < STAGE_WIDTH + p.w && p.y > -p.h,
  );
}

/** Spawns projectiles of moves reaching their spawn frame. One live projectile per owner per move. */
export function spawnProjectiles(ctx: Ctx): void {
  const { s } = ctx;
  for (const i of PLAYERS) {
    const f = s.fighters[i];
    if (f.state !== 'attack' || f.move === null) continue;
    const def = ctx.defs[i];
    const m = moveFor(def, f, f.move);
    const pd = m.projectile;
    if (!pd || f.moveFrame !== pd.frame) continue;
    const slot = f.move;
    if (s.projectiles.some((p) => p.owner === i && p.slot === slot)) continue;
    const p: Projectile = {
      id: s.nextProjectileId,
      owner: i,
      slot,
      x: f.x + f.facing * pd.x,
      y: f.y + pd.y,
      vx: f.facing * pd.vx,
      vy: pd.vy,
      w: pd.w,
      h: pd.h,
      facing: f.facing,
      age: 0,
      lifetime: pd.lifetime,
      hitsLeft: pd.hits ?? 1,
      rehit: 0,
      element: pd.element ?? moveElement(def, m),
      strength: pd.strength ?? m.strength,
      behavior: pd.behavior ?? 'linear',
      anim: pd.anim ?? m.anim,
      stance: f.stance,
      startX: f.x + f.facing * pd.x,
      returning: false,
    };
    s.nextProjectileId += 1;
    s.projectiles.push(p);
    ctx.events.push({
      type: 'projectileSpawn', fighter: i, id: p.id, slot, anim: p.anim, x: p.x, y: p.y,
      element: p.element, strength: p.strength,
    });
  }
}

function useHit(p: Projectile): void {
  p.hitsLeft -= 1;
  p.rehit = PROJECTILE_REHIT_FRAMES;
}

/** Opposing projectiles that touch cancel each other (one hit each). */
export function clashProjectiles(ctx: Ctx): void {
  const { s } = ctx;
  const list = s.projectiles;
  for (let a = 0; a < list.length; a++) {
    for (let b = a + 1; b < list.length; b++) {
      const p = list[a];
      const q = list[b];
      if (!p || !q || p.owner === q.owner) continue;
      if (p.hitsLeft <= 0 || q.hitsLeft <= 0 || p.rehit > 0 || q.rehit > 0) continue;
      const rp = projectileRect(p);
      const rq = projectileRect(q);
      if (!rectsOverlap(rp, rq)) continue;
      useHit(p);
      useHit(q);
      const c = overlapCentre(rp, rq);
      ctx.events.push({
        type: 'projectileClash', ids: [p.id, q.id], fighters: [p.owner, q.owner],
        elements: [p.element, q.element], x: c.x, y: c.y,
      });
    }
  }
  s.projectiles = list.filter((p) => p.hitsLeft > 0);
}

export function collectProjectileHits(ctx: Ctx): PendingHit[] {
  const { s } = ctx;
  const pending: PendingHit[] = [];
  for (const p of s.projectiles) {
    if (p.rehit > 0 || p.hitsLeft <= 0) continue;
    const d = other(p.owner);
    const target = s.fighters[d];
    if (!canBeHit(target)) continue;
    const r = projectileRect(p);
    const hurt = bodyRect(target, ctx.defs[d]);
    if (!rectsOverlap(r, hurt)) continue;
    const c = overlapCentre(r, hurt);
    const pushDir: Facing = p.vx > 0 ? 1 : p.vx < 0 ? -1 : p.facing;
    pending.push({
      attacker: p.owner, defender: d, hit: projectileHitData(ctx.defs[p.owner], p.stance, p.slot),
      x: c.x, y: c.y, pushDir, group: 0, projectile: p.id,
    });
  }
  return pending;
}

/** Uses up one hit of each projectile that connected, emitting projectileHit. */
export function consumeProjectileHits(ctx: Ctx, pending: readonly PendingHit[], blocked: readonly boolean[]): void {
  const { s } = ctx;
  pending.forEach((h, k) => {
    const p = h.projectile === null ? undefined : s.projectiles.find((q) => q.id === h.projectile);
    if (!p) return;
    useHit(p);
    ctx.events.push({
      type: 'projectileHit', fighter: p.owner, target: h.defender, id: p.id, blocked: blocked[k] ?? false,
      x: h.x, y: h.y, element: p.element, strength: p.strength,
    });
  });
  s.projectiles = s.projectiles.filter((p) => p.hitsLeft > 0);
}
