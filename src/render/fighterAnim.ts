// Maps sim fighter state to an animation and frame, and drives a FighterView from it.
import { GETUP_FRAMES } from '../sim/constants';
import type { FighterDef, FighterState } from '../sim/types';
import { animDuration, blendPose, copyPose, createPose, samplePose } from './anim';
import type { FighterView } from './fighterView';
import type { Animation, AnimationSet, Pose } from './types';

export interface AnimPick {
  id: string;
  /** Animation frame (animation `t`, may be fractional). */
  frame: number;
}

/**
 * Speed (reference px per frame) at which a planted foot travels backward in the base
 * walk cycle (front foot 32 -> 8 over 14 frames, back foot -12 -> -34 over 14 frames).
 * Walk playback is scaled by `speed / WALK_STRIDE_SPEED` so planted feet do not slide.
 */
export const WALK_STRIDE_SPEED = 1.65;

/** Last frame of the airborne tumble part of `knockdown` (lying keys start at 26). */
export const KNOCKDOWN_AIR_END = 14;
/** First frame of the lying part of `knockdown` (lands, bounces, settles by 37). */
export const KNOCKDOWN_LYING_START = 26;
/** Last frame of the airborne part of `ko` (key 10 is already a kneeling slump). */
export const KO_AIR_END = 6;
/** Collapsed `ko` pose (LYING_KO). */
export const KO_LYING = 22;
/** Length of the base `getup` animation; it is time-scaled to the sim's getup state. */
export const GETUP_ANIM_FRAMES = 26;

/**
 * Pure mapping from sim state to an animation id and frame. Sim `stateFrame` and
 * `moveFrame` are 1-based; state animations start at their first key on the state's
 * first frame (frame = stateFrame - 1). Attack animations are keyed in move frames
 * (strike key = first active frame), so frame = moveFrame.
 */
export function pickAnimation(f: FighterState, def: FighterDef): AnimPick {
  const sf = Math.max(0, f.stateFrame - 1);
  switch (f.state) {
    case 'idle':
      return { id: 'idle', frame: sf };
    case 'walk': {
      const back = f.vx * f.facing < 0;
      const speed = back ? def.stats.backSpeed : def.stats.walkSpeed;
      return { id: back ? 'walkBack' : 'walk', frame: (sf * speed) / WALK_STRIDE_SPEED };
    }
    case 'crouch':
      return { id: 'crouch', frame: sf };
    case 'prejump':
      return { id: 'prejump', frame: sf };
    case 'air':
      return { id: 'air', frame: f.stateFrame };
    case 'land':
      return { id: 'crouch', frame: sf };
    case 'attack':
      if (f.move === null) return { id: 'idle', frame: sf };
      return { id: def.moves[f.move].anim, frame: f.moveFrame };
    case 'charge':
      return { id: 'charge', frame: sf };
    case 'block':
      return { id: f.crouching ? 'crouchBlock' : 'block', frame: sf };
    case 'blockstun':
      return { id: f.crouching ? 'crouchBlock' : 'blockstun', frame: sf };
    case 'hitstun':
      if (f.knockdownOnLand) return { id: 'knockdown', frame: Math.min(sf, KNOCKDOWN_AIR_END) };
      return { id: 'hitstun', frame: sf };
    case 'knockdown':
      return { id: 'knockdown', frame: KNOCKDOWN_LYING_START + sf };
    case 'getup':
      return { id: 'getup', frame: (sf * GETUP_ANIM_FRAMES) / GETUP_FRAMES };
    case 'dodge':
      return { id: 'dodge', frame: sf };
    case 'ko':
      // On the KO frame itself the fighter is still on the ground but already launched (vy > 0).
      return f.y > 0 || f.vy > 0 ?{ id: 'ko', frame: Math.min(sf, KO_AIR_END) } : { id: 'ko', frame: KO_LYING };
    case 'win':
      return { id: 'win', frame: sf };
  }
}

/** The animation for a pick, falling back to `idle` when the set lacks the id. */
export function resolveAnimation(anims: AnimationSet, id: string): { id: string; anim: Animation | undefined } {
  const a = anims[id];
  if (a) return { id, anim: a };
  return { id: 'idle', anim: anims.idle };
}

/** True while the fighter's current move is on its active frames (weapon trail). */
export function inActiveFrames(f: FighterState, def: FighterDef): boolean {
  if (f.state !== 'attack' || f.move === null) return false;
  const m = def.moves[f.move];
  return f.moveFrame > m.startup && f.moveFrame <= m.startup + m.active;
}

/** Frames over which a change of animation blends from the previous pose. */
export const BLEND_FRAMES = 3;
/** A forward jump in frame larger than this within one animation also blends. */
const MAX_FRAME_STEP = 6;

/**
 * Drives one FighterView from sim state. Call `update` once per sim step in which the
 * fighter advanced; skip it on frozen steps (hitstop, super freeze) to hold the pose.
 */
export class FighterAnimator {
  private readonly out: Pose = createPose();
  private readonly target: Pose = createPose();
  private readonly from: Pose = createPose();
  private lastId: string | null = null;
  private lastFrame = 0;
  private blendStep = BLEND_FRAMES;
  /** Last animation id shown (after the idle fallback); for debugging. */
  currentId = '';
  currentFrame = 0;

  constructor(
    readonly view: FighterView,
    readonly anims: AnimationSet,
  ) {}

  /** Round start: forget pose history, ribbons and trails. */
  reset(): void {
    this.view.reset();
    this.lastId = null;
    this.blendStep = BLEND_FRAMES;
  }

  update(f: FighterState, def: FighterDef): void {
    const pick = pickAnimation(f, def);
    const { id, anim } = resolveAnimation(this.anims, pick.id);
    let frame = pick.frame;
    if (id !== pick.id) frame = Math.max(0, f.stateFrame - 1);
    if (anim) samplePose(anim, frame, this.target);
    else copyPose(this.out, this.target);

    if (this.lastId === null) {
      this.blendStep = BLEND_FRAMES;
    } else if (id !== this.lastId || frame < this.lastFrame || frame > this.lastFrame + MAX_FRAME_STEP) {
      copyPose(this.out, this.from);
      this.blendStep = 0;
    }
    this.lastId = id;
    this.lastFrame = frame;
    this.currentId = id;
    this.currentFrame = anim && !anim.loop ? Math.min(frame, animDuration(anim)) : frame;

    if (this.blendStep < BLEND_FRAMES) {
      this.blendStep += 1;
      blendPose(this.from, this.target, this.blendStep / BLEND_FRAMES, this.out);
    } else {
      copyPose(this.target, this.out);
    }

    this.view.update({ pose: this.out, x: f.x, y: f.y, facing: f.facing, trail: inActiveFrames(f, def) });
  }
}
