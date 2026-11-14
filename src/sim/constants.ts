// Tunable simulation constants. Units: px, px/frame, frames at 60 Hz.
import type { FrameRange, Strength } from './types';

export const FPS = 60;

// Stage: bounds for fighter centres; the logical canvas is 1280 wide.
export const STAGE_LEFT = 60;
export const STAGE_RIGHT = 1220;
export const STAGE_WIDTH = 1280;
export const START_X: readonly [number, number] = [440, 840];

// Match.
export const DEFAULT_ROUNDS_TO_WIN = 2;
export const DEFAULT_ROUND_SECONDS = 60;
export const INTRO_FRAMES = 90;
/** Length of the 'ko' and 'timeout' phases before the outro. */
export const ROUND_END_FRAMES = 60;
export const OUTRO_FRAMES = 120;

// Meter.
export const METER_MAX = 100;
/** Attacker gains this fraction of meterGain when the hit is blocked. */
export const BLOCK_METER_FACTOR = 0.5;
/** Defender gains 40% of damage taken / 10. */
export const METER_PER_DAMAGE_TAKEN = 0.04;

// Combos: each further hit does 0.9x the previous scaling, floor 0.4.
export const COMBO_SCALING = 0.9;
export const COMBO_SCALING_FLOOR = 0.4;

// Hitstop (whole sim frozen) on hit; block uses half (rounded down).
export const HITSTOP: Readonly<Record<Strength, number>> = { light: 6, heavy: 9, special: 12, ultimate: 12 };
export const BLOCK_HITSTOP_FACTOR = 0.5;

/** Chip fraction when a move does not set `chip`: blocked specials and ultimates chip. */
export const DEFAULT_CHIP: Readonly<Record<Strength, number>> = { light: 0, heavy: 0, special: 0.15, ultimate: 0.25 };

// Input.
export const INPUT_BUFFER_FRAMES = 6;

// Movement.
export const PREJUMP_FRAMES = 3;
/** Landing recovery when an air attack was still in progress. */
export const LANDING_RECOVERY_FRAMES = 4;
/** Ground pushback speed lost per frame. */
export const PUSHBACK_FRICTION = 0.5;

// Dodge.
export const DODGE_FRAMES = 18;
export const DODGE_INVULNERABLE: FrameRange = { from: 3, to: 12 };
/** Cooldown starts when the dodge ends (or is interrupted). */
export const DODGE_COOLDOWN_FRAMES = 30;
export const DODGE_SPEED = 6;
/** Dodge moves on its first frames only, then settles. */
export const DODGE_TRAVEL_FRAMES = 15;

// Grab.
/**
 * A light or heavy that just started becomes the grab if the other button arrives while
 * moveFrame <= this (so "together" tolerates a few frames of stagger, mouse buttons included).
 * Kept below every light's startup so a heavy pressed on the hit frame still chains.
 */
export const GRAB_CHORD_FRAMES = 4;

// Power strike.
/** Steps heavy must stay held (after any heavy normal) before the fighter starts charging. */
export const CHARGE_HOLD_FRAMES = 20;
/** The charge releases by itself after this many steps in the `charge` state. */
export const CHARGE_MAX_FRAMES = 70;

// Guard: holding back blocks when the opponent attacks within range (classic proximity block).
/** Px beyond the incoming move's reach within which holding back still blocks. */
export const GUARD_PROXIMITY = 70;
/** A projectile heading in within this many px makes holding back block. */
export const PROJECTILE_GUARD_RANGE = 260;

// Ultimate.
/** Ultimate may also start within the first N frames of heavy or a special. */
export const ULTIMATE_EARLY_FRAMES = 3;
/** Ultimate startup must be longer than this: the caster's move frames advance during the freeze. */
export const SUPER_FREEZE_FRAMES = 45;

// Hit reactions.
export const KNOCKDOWN_FRAMES = 30;
export const GETUP_FRAMES = 10;
/** Minimum upward speed of an air knockdown arc. */
export const AIR_HIT_MIN_VY = 4;
/** Minimum knock-away speeds for a KO'd fighter. */
export const KO_VX = 4;
export const KO_VY = 8;

// Projectiles.
/** Frames between hits (or clashes) of a multi-hit projectile. */
export const PROJECTILE_REHIT_FRAMES = 8;
