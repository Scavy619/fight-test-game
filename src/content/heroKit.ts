// Authoring helpers shared by the hero files. Hitboxes and projectile spawn points are derived
// from the same poses the animation plays, so the weapon and its box always agree (the content
// tests check this); everything produced here is plain data stored in the hero's definition.
import { WALK_STRIDE_SPEED } from '../render/fighterAnim';
import { anim, key, pose, type PoseSpec } from '../render/pose';
import { computeRig, createRigState } from '../render/rig';
import type { Animation, FighterLook, Keyframe } from '../render/types';
import type { Hitbox, MoveDef } from '../sim/types';
import type { MoveInfo } from './types';

export interface TipBoxOptions {
  /** Live frames of the box (default: the move's active frames). */
  from?: number;
  to?: number;
  group?: number;
  /** Vertical padding around the hand-to-tip span. */
  pad?: number;
  /** Extra reach past the weapon tip (keep under about 25). */
  reach?: number;
  /** Do not clamp the box to the floor (air moves). */
  air?: boolean;
  launches?: boolean;
  knockback?: { x: number; y: number };
}

/** A hitbox covering the weapon from the front hand to its tip in the given pose. */
export function tipBox(look: FighterLook, spec: PoseSpec, o: TipBoxOptions = {}): Hitbox {
  const rig = createRigState();
  computeRig(pose(spec), look, rig);
  const tip = rig.weaponTip;
  const hand = rig.handF;
  const pad = o.pad ?? 16;
  const x = Math.max(12, Math.min(hand.x, tip.x) - 4);
  const far = Math.max(Math.max(hand.x, tip.x) + 8 + (o.reach ?? 0), x + 24);
  let y0 = Math.min(tip.y, hand.y) - pad;
  const y1 = Math.max(tip.y, hand.y) + pad;
  if (!o.air) y0 = Math.max(0, y0);
  const box: Hitbox = { x: Math.round(x), y: Math.round(y0), w: Math.round(far - x), h: Math.round(y1 - y0) };
  if (o.from !== undefined) box.from = o.from;
  if (o.to !== undefined) box.to = o.to;
  if (o.group !== undefined) box.group = o.group;
  if (o.launches !== undefined) box.launches = o.launches;
  if (o.knockback) box.knockback = o.knockback;
  return box;
}

/** The front hand and weapon tip (local px) in a pose; used to place projectiles and effects. */
export function weaponPoints(
  look: FighterLook,
  spec: PoseSpec,
): { hand: { x: number; y: number }; handB: { x: number; y: number }; tip: { x: number; y: number } } {
  const rig = createRigState();
  computeRig(pose(spec), look, rig);
  return {
    hand: { x: Math.round(rig.handF.x), y: Math.round(rig.handF.y) },
    handB: { x: Math.round(rig.handB.x), y: Math.round(rig.handB.y) },
    tip: { x: Math.round(rig.weaponTip.x), y: Math.round(rig.weaponTip.y) },
  };
}

export interface AttackShape {
  guard: PoseSpec;
  windup: PoseSpec;
  strike: PoseSpec;
  /** Pose after the strike (default: the strike pose). */
  follow?: PoseSpec;
  /** Move frame of the wind-up key (default about 55% of startup). */
  windupAt?: number;
}

/**
 * Standard attack animation: guard, wind-up, strike held through the active frames, follow
 * through, back to guard exactly on the move's last frame (the content tests require the
 * animation to last as long as the move).
 */
export function attackAnim(s: AttackShape, startup: number, active: number, recovery: number): Animation {
  const total = startup + active + recovery;
  const hit = startup + 1;
  const last = startup + active;
  const wAt = Math.max(1, Math.min(startup - 1, s.windupAt ?? Math.round(startup * 0.55)));
  const keys: Keyframe[] = [key(0, s.guard, 'out')];
  if (wAt < hit) keys.push(key(wAt, s.windup, 'in'));
  keys.push(key(hit, s.strike, last > hit ? 'linear' : 'out'));
  if (last > hit) keys.push(key(last, s.strike, 'out'));
  const followAt = last + Math.max(1, Math.round(recovery * 0.4));
  if (followAt < total) keys.push(key(followAt, s.follow ?? s.strike));
  keys.push(key(total, s.guard));
  return anim(false, ...keys);
}

/** Looping idle: a breath and a small weapon drift, last key equal to the first. */
export function idleAnim(guard: PoseSpec, period = 56, amp = 1.2): Animation {
  const g = guard;
  const y = g.y ?? 80;
  const q = period / 4;
  return anim(
    true,
    key(0, g),
    key(q, { ...g, x: 1, y: y - amp * 0.8, lean: (g.lean ?? 0) + 1, weaponDir: (g.weaponDir ?? 0) + 2 }),
    key(q * 2, { ...g, x: 2, y: y - amp * 1.4, lean: (g.lean ?? 0) + 2, weaponDir: (g.weaponDir ?? 0) + 1 }),
    key(q * 3, { ...g, x: 1, y: y - amp * 0.8, lean: (g.lean ?? 0) + 1, weaponDir: (g.weaponDir ?? 0) + 4 }),
    key(period, g),
  );
}

export interface WalkShape {
  guard: PoseSpec;
  /** Lean while walking (negative leans forward). */
  lean: number;
  /** Front and back foot x at the start of the cycle (reference px). */
  footF?: number;
  footB?: number;
  /** Arm and weapon offsets at full swing (positive swing = on the front-foot-forward key). */
  arms?: (swing: number) => PoseSpec;
}

/**
 * Walk cycle with planted feet sliding exactly WALK_STRIDE_SPEED px per animation frame
 * (the animator scales playback by walk speed, so feet do not skate). Half cycle 20 frames.
 */
export function walkKeys(w: WalkShape): Keyframe[] {
  const T = 20;
  const D = WALK_STRIDE_SPEED * T;
  const a = w.footF ?? 7;
  const b = w.footB ?? -16;
  const base = w.guard.y ?? 80;
  const step = (
    t: number,
    footF: [number, number],
    footB: [number, number],
    y: number,
    swing: number,
  ): Keyframe =>
    key(t, { ...w.guard, lean: w.lean + swing * 2, y, footF, footB, ...(w.arms ? w.arms(swing) : {}) }, 'linear');
  return [
    step(0, [a, 0], [b, 0], base + 1, 0),
    step(10, [a + D / 2, 10], [b - D / 2, 0], base + 3, 1),
    step(20, [a + D, 0], [b - D, 0], base - 2, 0),
    step(30, [a + D / 2, 0], [b - D / 2, 10], base + 3, -1),
    step(40, [a, 0], [b, 0], base + 1, 0),
  ];
}

export function reversedKeys(keys: Keyframe[]): Keyframe[] {
  const end = keys[keys.length - 1]?.t ?? 0;
  return keys
    .slice()
    .reverse()
    .map((k) => ({ t: end - k.t, pose: k.pose, ease: k.ease }));
}

/** Compact MoveInfo constructor for profiles. */
export function info(name: string, input: string, description: string, counterplay?: string): MoveInfo {
  return counterplay ? { name, input, description, counterplay } : { name, input, description };
}

/** Whole-word count, for the profile bio length check. */
export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Cancel lists shared by the heroes: lights chain into one more light, heavies into specials. */
export const GROUND_CHAIN = ['heavy', 'crouchHeavy', 'specialN', 'specialF', 'specialD'] as const;
export const LIGHT_CHAIN = ['light', 'crouchLight', ...GROUND_CHAIN] as const;
export const SPECIALS = ['specialN', 'specialF', 'specialD'] as const;

export type NormalMove = Omit<MoveDef, 'anim' | 'hitboxes'>;
