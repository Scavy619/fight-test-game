// Floor zones: slow fields, telegraphed delayed strikes (lanes), decoys and visual marks.
// Spawned by moves (ZoneDef), ticked once per live frame after physics.
import { STAGE_LEFT, STAGE_RIGHT } from './constants';
import { type Ctx, PLAYERS, other } from './context';
import type { PendingHit } from './combat';
import { bodyRect, liveWorldHitboxes, projectileRect, rectsOverlap, zoneRect } from './geometry';
import { moveElement } from './moves';
import type { FighterState, MoveDef, MoveSlot, PlayerIndex, Zone, ZoneDef } from './types';

export const ZONE_DEFAULT_HEIGHT = 200;
export const ZONE_DEFAULT_SLOW = 0.5;
/** Steps a slow field keeps acting after the fighter leaves it (so the effect is continuous inside). */
export const SLOW_LINGER = 2;

/** Spawns the move's zone(s) when its spawn frame is reached. */
export function spawnZones(ctx: Ctx, i: PlayerIndex, f: FighterState, slot: MoveSlot, m: MoveDef): void {
  for (const zd of [m.zone, ...(m.extraZones ?? [])]) {
    if (zd && f.moveFrame === zd.frame) spawnZone(ctx, i, f, slot, m, zd);
  }
}

function spawnZone(ctx: Ctx, i: PlayerIndex, f: FighterState, slot: MoveSlot, m: MoveDef, zd: ZoneDef): void {
  const { s } = ctx;
  const opp = s.fighters[other(i)];
  const base = zd.x === 'opponent' ? opp.x : f.x + f.facing * zd.x;
  const offsets = zd.offsets ?? [0];
  for (const off of offsets) {
    const x = Math.min(STAGE_RIGHT, Math.max(STAGE_LEFT, base + f.facing * off));
    const z: Zone = {
      id: s.nextZoneId,
      owner: i,
      slot,
      kind: zd.kind,
      x,
      w: zd.w,
      h: zd.h ?? ZONE_DEFAULT_HEIGHT,
      age: 0,
      frames: zd.frames,
      strikeAt: zd.kind === 'strike' ? zd.strikeAt ?? zd.frames : null,
      struck: false,
      damage: zd.damage ?? 0,
      hitstun: zd.hitstun ?? 18,
      knockback: zd.knockback ?? { x: 4, y: 0 },
      level: zd.level ?? 'mid',
      strength: zd.strength ?? m.strength,
      launches: zd.launches ?? false,
      slowFactor: zd.slowFactor ?? ZONE_DEFAULT_SLOW,
      element: moveElement(ctx.defs[i], m),
      label: zd.label,
    };
    s.nextZoneId += 1;
    s.zones.push(z);
    ctx.events.push({ type: 'zoneSpawn', fighter: i, id: z.id, kind: z.kind, slot, label: z.label, w: z.w, x: z.x, y: 0 });
  }
}

/**
 * Decoys absorb the first opponent attack that reaches them: the melee hit group or one
 * projectile hit is spent on the decoy, so it does not also reach the real fighter this frame.
 */
export function resolveDecoys(ctx: Ctx): void {
  const { s } = ctx;
  if (s.zones.length === 0) return;
  for (const z of s.zones) {
    if (z.kind !== 'decoy' || z.struck) continue;
    const rz = zoneRect(z);
    const j = other(z.owner);
    const a = s.fighters[j];
    for (const box of liveWorldHitboxes(a, ctx.defs[j])) {
      if (a.hitGroups.includes(box.group) || !rectsOverlap(box, rz)) continue;
      a.hitGroups.push(box.group);
      a.moveConnected = true;
      z.struck = true;
      ctx.events.push({ type: 'decoyBroken', fighter: z.owner, by: j, id: z.id, x: z.x, y: z.h / 2 });
      break;
    }
    if (z.struck) continue;
    for (const p of s.projectiles) {
      if (p.owner !== j || p.hitsLeft <= 0 || p.rehit > 0 || !rectsOverlap(projectileRect(p), rz)) continue;
      p.hitsLeft -= 1;
      z.struck = true;
      ctx.events.push({ type: 'decoyBroken', fighter: z.owner, by: j, id: z.id, x: z.x, y: z.h / 2 });
      break;
    }
  }
  s.projectiles = s.projectiles.filter((p) => p.hitsLeft > 0);
  s.zones = s.zones.filter((z) => !(z.kind === 'decoy' && z.struck));
}

/** Ages zones, applies slow fields, and returns the delayed strikes due this frame. Removes expired zones. */
export function tickZones(ctx: Ctx): PendingHit[] {
  const { s } = ctx;
  const pending: PendingHit[] = [];
  if (s.zones.length === 0) return pending;
  for (const z of s.zones) {
    z.age += 1;
    const rz = zoneRect(z);
    if (z.kind === 'slow') {
      for (const i of PLAYERS) {
        if (i === z.owner) continue;
        const f = s.fighters[i];
        if (!rectsOverlap(bodyRect(f, ctx.defs[i]), rz)) continue;
        if (f.slow.frames === 0) ctx.events.push({ type: 'slowed', fighter: i, by: z.owner, factor: z.slowFactor, x: f.x, y: f.y });
        f.slow = { frames: SLOW_LINGER, factor: z.slowFactor };
      }
    } else if (z.kind === 'strike' && !z.struck && z.strikeAt !== null && z.age >= z.strikeAt) {
      z.struck = true;
      ctx.events.push({ type: 'zoneStrike', fighter: z.owner, id: z.id, slot: z.slot, element: z.element, strength: z.strength, x: z.x, y: 0 });
      for (const i of PLAYERS) {
        if (i === z.owner) continue;
        const f = s.fighters[i];
        const hurt = bodyRect(f, ctx.defs[i]);
        if (!rectsOverlap(hurt, rz)) continue;
        pending.push({
          attacker: z.owner,
          defender: i,
          hit: {
            slot: z.slot, damage: z.damage, level: z.level, hitstun: z.hitstun, blockstun: Math.round(z.hitstun * 0.7),
            knockback: z.knockback, chip: z.strength === 'light' || z.strength === 'heavy' ? 0 : 0.15,
            launches: z.launches, throw: false, unblockable: false, piercesLateGuard: 0,
            strength: z.strength, element: z.element, meterGain: 4,
          },
          x: f.x,
          y: Math.min(hurt.y + hurt.h, z.h) * 0.7,
          pushDir: f.x >= z.x ? 1 : -1,
          group: 0,
          projectile: null,
          zone: z.id,
        });
      }
    }
  }
  const expired = s.zones.filter((z) => z.age >= z.frames);
  for (const z of expired) ctx.events.push({ type: 'zoneEnd', fighter: z.owner, id: z.id, kind: z.kind, x: z.x, y: 0 });
  s.zones = s.zones.filter((z) => z.age < z.frames);
  return pending;
}
