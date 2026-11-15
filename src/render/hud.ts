// Fight HUD: health bars with damage ghost, names, round pips, timer, meters, combo
// counters and the centre announcer. Logical canvas 1280x720.
//
// Time-dependent parts (damage ghost, combo pop and fade, pulses) live in `HudState`,
// a small pure object updated once per sim step; drawing only reads it.
import { INTRO_FRAMES, METER_MAX } from '../sim/constants';
import type { FighterState, MatchState } from '../sim/types';
import { rgba } from './color';

// ---- Layout --------------------------------------------------------------------------

export const HUD_FONT = "'Segoe UI', system-ui, sans-serif";
const font = (px: number): string => `italic 800 ${px}px ${HUD_FONT}`;

export const P_COLORS: readonly [string, string] = ['#3DA9FF', '#FF4D6D'];
const TRACK = '#141B33';
const TEXT = '#E8F0FF';
const LOW_TIME = '#FF4D6D';

const BAR_Y = 36;
const BAR_H = 22;
const BAR_W = 520;
const SLANT = 12;
/** Bar outer and inner x per side: P1 40..560, P2 1240..720. */
const BAR_OUTER: readonly [number, number] = [40, 1240];
const BAR_INNER: readonly [number, number] = [560, 720];

const NAME_Y = 82;
const PIP_R = 7;
const TIMER_Y = 58;

const METER_Y = 676;
const METER_H = 12;
const METER_W = 360;
const METER_OUTER: readonly [number, number] = [40, 1240];

const COMBO_Y = 210;
const COMBO_X: readonly [number, number] = [48, 1232];

const ANNOUNCE_X = 640;
const ANNOUNCE_Y = 300;
const ANNOUNCE_STROKE = rgba('#2FF3E0', 0.3);

// ---- Timing --------------------------------------------------------------------------

/** Frames the damage ghost holds after the last hit. */
export const GHOST_HOLD = 30;
/** Ghost shrink per frame, as a fraction of max health. */
export const GHOST_RATE = 0.01;
export const COMBO_POP_FRAMES = 8;
export const COMBO_POP_SCALE = 1.3;
export const COMBO_FADE_FRAMES = 40;
export const ANNOUNCE_SCALE_FRAMES = 10;
const ROUND_TEXT_FRAMES = 60;
const FIGHT_AFTER_START = 20;

// ---- State ---------------------------------------------------------------------------

export interface HudSide {
  /** Damage ghost value in health points (>= health). */
  ghost: number;
  /** Frames left before the ghost starts shrinking. */
  ghostHold: number;
  lastHealth: number;
  /** Last combo count shown (0 = none yet). */
  combo: number;
  /** Frames left of the pop animation. */
  pop: number;
  /** Frames left of the fade-out after the combo ended; -1 while the combo is live. */
  fade: number;
}

function newSide(health: number): HudSide {
  return { ghost: health, ghostHold: 0, lastHealth: health, combo: 0, pop: 0, fade: 0 };
}

export class HudState {
  sides: [HudSide, HudSide];
  /** Sim steps seen (drives pulses and blinking). */
  frame = 0;

  constructor(private readonly maxHealth: readonly [number, number]) {
    this.sides = [newSide(maxHealth[0]), newSide(maxHealth[1])];
  }

  /** Clears transient state (round start): ghosts snap to current health, combos vanish. */
  reset(fighters?: readonly [FighterState, FighterState]): void {
    for (const i of [0, 1] as const) {
      this.sides[i] = newSide(fighters ? fighters[i].health : this.maxHealth[i]);
    }
  }

  /** Once per sim step, after the step. */
  update(fighters: readonly [FighterState, FighterState]): void {
    this.frame += 1;
    for (const i of [0, 1] as const) {
      const s = this.sides[i];
      const f = fighters[i];
      // Damage ghost (health of fighter i).
      if (f.health < s.lastHealth) {
        s.ghostHold = GHOST_HOLD;
      } else if (s.ghostHold > 0) {
        s.ghostHold -= 1;
      } else if (s.ghost > f.health) {
        s.ghost = Math.max(f.health, s.ghost - GHOST_RATE * this.maxHealth[i]);
      }
      if (f.health > s.ghost) s.ghost = f.health;
      s.lastHealth = f.health;

      // Combo fighter i is dealing.
      if (f.combo >= 2) {
        if (f.combo !== s.combo || s.fade !== -1) {
          // New count, or a new combo after the last one ended: pop.
          s.combo = f.combo;
          s.pop = COMBO_POP_FRAMES;
          s.fade = -1;
        } else if (s.pop > 0) {
          s.pop -= 1;
        }
      } else {
        // Combo over: keep the last value and fade it out.
        if (s.fade === -1) s.fade = COMBO_FADE_FRAMES;
        else if (s.fade > 0) s.fade -= 1;
        if (s.pop > 0) s.pop -= 1;
      }
    }
  }

  /** Combo display for side i: count, scale and alpha (alpha 0 = hidden). */
  comboView(i: 0 | 1): { count: number; scale: number; alpha: number } {
    const s = this.sides[i];
    if (s.combo < 2) return { count: 0, scale: 1, alpha: 0 };
    const scale = 1 + (COMBO_POP_SCALE - 1) * (s.pop / COMBO_POP_FRAMES);
    const alpha = s.fade === -1 ? 1 : s.fade / COMBO_FADE_FRAMES;
    return { count: s.combo, scale, alpha };
  }
}

// ---- Announcer -----------------------------------------------------------------------

export interface Announcement {
  text: string;
  size: number;
  /** Frames since this text appeared (drives the scale-in). */
  age: number;
  /** Optional second line (match end prompt). */
  prompt?: string;
}

export const REMATCH_PROMPT = 'PRESS LIGHT OR ENTER FOR REMATCH';

/** Centre text for the current phase, or null. `names` are display names per side. */
export function announcement(s: MatchState, names: readonly [string, string]): Announcement | null {
  const pf = s.phaseFrame;
  switch (s.phase) {
    case 'intro':
      if (pf < ROUND_TEXT_FRAMES) return { text: `ROUND ${s.round}`, size: 96, age: pf };
      return { text: 'FIGHT', size: 96, age: pf - ROUND_TEXT_FRAMES };
    case 'fight':
      if (pf < FIGHT_AFTER_START) return { text: 'FIGHT', size: 96, age: pf + INTRO_FRAMES - ROUND_TEXT_FRAMES };
      return null;
    case 'ko':
      if (s.lastRoundResult?.reason === 'doubleKo') return { text: 'DOUBLE K.O.', size: 96, age: pf };
      return { text: 'K.O.', size: 120, age: pf };
    case 'timeout':
      return { text: 'TIME UP', size: 96, age: pf };
    case 'outro': {
      const w = s.lastRoundResult?.winner;
      if (w === undefined || w === null) return { text: 'DRAW', size: 64, age: pf };
      return { text: `${names[w]} WINS`, size: 64, age: pf };
    }
    case 'matchEnd': {
      const w = s.winner ?? 0;
      return { text: `${names[w]} WINS THE MATCH`, size: 64, age: pf, prompt: REMATCH_PROMPT };
    }
  }
}

/** Scale-in from 1.6 to 1 over ANNOUNCE_SCALE_FRAMES. */
export function announceScale(age: number): number {
  const t = Math.min(1, Math.max(0, age / ANNOUNCE_SCALE_FRAMES));
  return 1.6 - 0.6 * (1 - (1 - t) * (1 - t));
}

/** Whole seconds left on the clock (ceil). */
export function timerSeconds(timerFrames: number): number {
  return Math.max(0, Math.ceil(timerFrames / 60));
}

// ---- Drawing -------------------------------------------------------------------------

export interface HudInfo {
  /** Display names (already upper-cased or not; drawn upper-cased). */
  names: readonly [string, string];
  /** Each fighter's `look.accent`. */
  accents: readonly [string, string];
  maxHealth: readonly [number, number];
  /** Replaces the rematch prompt at match end (null hides it). */
  endPrompt?: string | null;
}

/** Parallelogram for side i between fractions [a, b] of the bar, measured from the inner end. */
function barPath(ctx: CanvasRenderingContext2D, i: 0 | 1, a: number, b: number, y: number, h: number): void {
  const run = BAR_W - SLANT;
  if (i === 0) {
    // P1: top edge shifted right (toward the centre); inner end at x 560 (top).
    const topInner = BAR_INNER[0];
    const botInner = topInner - SLANT;
    ctx.beginPath();
    ctx.moveTo(topInner - a * run, y);
    ctx.lineTo(topInner - b * run, y);
    ctx.lineTo(botInner - b * run, y + h);
    ctx.lineTo(botInner - a * run, y + h);
    ctx.closePath();
  } else {
    const topInner = BAR_INNER[1];
    const botInner = topInner + SLANT;
    ctx.beginPath();
    ctx.moveTo(topInner + a * run, y);
    ctx.lineTo(topInner + b * run, y);
    ctx.lineTo(botInner + b * run, y + h);
    ctx.lineTo(botInner + a * run, y + h);
    ctx.closePath();
  }
}

function pulse(frame: number, period: number): number {
  return 0.5 + 0.5 * Math.sin((frame / period) * Math.PI * 2);
}

export function drawHud(ctx: CanvasRenderingContext2D, s: MatchState, hud: HudState, info: HudInfo): void {
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.lineJoin = 'round';

  for (const i of [0, 1] as const) {
    drawHealth(ctx, i, s.fighters[i], hud, info);
    drawNameAndPips(ctx, i, s, info);
    drawMeter(ctx, i, s.fighters[i], hud, info.accents[i]);
    drawCombo(ctx, i, hud, info.accents[i]);
  }
  drawTimer(ctx, s);
  drawAnnouncer(ctx, s, hud, info);
  ctx.restore();
}

function drawHealth(ctx: CanvasRenderingContext2D, i: 0 | 1, f: FighterState, hud: HudState, info: HudInfo): void {
  const max = info.maxHealth[i];
  const frac = Math.max(0, Math.min(1, f.health / max));
  const ghost = Math.max(frac, Math.min(1, hud.sides[i].ghost / max));
  barPath(ctx, i, 0, 1, BAR_Y, BAR_H);
  ctx.fillStyle = TRACK;
  ctx.fill();
  if (ghost > frac) {
    barPath(ctx, i, frac, ghost, BAR_Y, BAR_H);
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (frac > 0) {
    barPath(ctx, i, 0, frac, BAR_Y, BAR_H);
    ctx.fillStyle = P_COLORS[i];
    ctx.fill();
    if (frac < 0.25) {
      ctx.globalAlpha = 0.6 * pulse(hud.frame, 30);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  // Accent line under the bar, along its bottom edge.
  const y = BAR_Y + BAR_H + 2;
  const x0 = i === 0 ? BAR_OUTER[0] : BAR_INNER[1] + SLANT;
  ctx.fillStyle = info.accents[i];
  ctx.fillRect(x0, y, BAR_W - SLANT, 3);
}

function drawNameAndPips(ctx: CanvasRenderingContext2D, i: 0 | 1, s: MatchState, info: HudInfo): void {
  ctx.font = font(18);
  ctx.textBaseline = 'middle';
  ctx.fillStyle = TEXT;
  ctx.textAlign = i === 0 ? 'left' : 'right';
  ctx.fillText(info.names[i].toUpperCase(), i === 0 ? 40 : 1240, NAME_Y);
  ctx.lineWidth = 2;
  for (let k = 0; k < s.roundsToWin; k++) {
    const x = i === 0 ? 552 - k * 22 : 728 + k * 22;
    ctx.beginPath();
    ctx.arc(x, NAME_Y, PIP_R, 0, Math.PI * 2);
    if (s.wins[i] > k) {
      ctx.fillStyle = P_COLORS[i];
      ctx.fill();
    }
    ctx.strokeStyle = P_COLORS[i];
    ctx.stroke();
  }
}

function drawTimer(ctx: CanvasRenderingContext2D, s: MatchState): void {
  const secs = timerSeconds(s.timer);
  ctx.font = font(46);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = secs <= 10 ? LOW_TIME : '#FFFFFF';
  ctx.fillText(String(secs), 640, TIMER_Y);
}

function drawMeter(ctx: CanvasRenderingContext2D, i: 0 | 1, f: FighterState, hud: HudState, accent: string): void {
  const frac = Math.max(0, Math.min(1, f.meter / METER_MAX));
  const x0 = i === 0 ? METER_OUTER[0] : METER_OUTER[1] - METER_W;
  ctx.fillStyle = TRACK;
  ctx.fillRect(x0, METER_Y, METER_W, METER_H);
  const w = METER_W * frac;
  const fx = i === 0 ? x0 : x0 + METER_W - w;
  ctx.fillStyle = accent;
  ctx.fillRect(fx, METER_Y, w, METER_H);
  if (frac >= 1) {
    const p = pulse(hud.frame, 40);
    ctx.globalAlpha = 0.45 * p;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(fx, METER_Y, w, METER_H);
    // Glow halo: wide low-alpha stroke.
    ctx.globalAlpha = 0.25 + 0.35 * p;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 4;
    ctx.strokeRect(fx - 2, METER_Y - 2, w + 4, METER_H + 4);
    ctx.globalAlpha = 0.7 + 0.3 * p;
    ctx.font = font(14);
    ctx.textBaseline = 'middle';
    ctx.textAlign = i === 0 ? 'left' : 'right';
    ctx.fillStyle = accent;
    ctx.fillText('ULTIMATE READY', i === 0 ? x0 + METER_W + 12 : x0 - 12, METER_Y + METER_H / 2);
    ctx.globalAlpha = 1;
  }
}

function drawCombo(ctx: CanvasRenderingContext2D, i: 0 | 1, hud: HudState, accent: string): void {
  const v = hud.comboView(i);
  if (v.alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = v.alpha;
  ctx.translate(COMBO_X[i], COMBO_Y);
  ctx.scale(v.scale, v.scale);
  ctx.font = font(42);
  ctx.textBaseline = 'middle';
  ctx.textAlign = i === 0 ? 'left' : 'right';
  ctx.fillStyle = accent;
  ctx.fillText(`${v.count} HITS`, 0, 0);
  ctx.restore();
}

function drawAnnouncer(ctx: CanvasRenderingContext2D, s: MatchState, hud: HudState, info: HudInfo): void {
  const names: [string, string] = [info.names[0].toUpperCase(), info.names[1].toUpperCase()];
  const a = announcement(s, names);
  if (!a) return;
  const k = announceScale(a.age);
  ctx.save();
  ctx.translate(ANNOUNCE_X, ANNOUNCE_Y);
  ctx.scale(k, k);
  ctx.font = font(a.size);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = ANNOUNCE_STROKE;
  ctx.lineWidth = 6;
  ctx.strokeText(a.text, 0, 0);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(a.text, 0, 0);
  ctx.restore();
  const prompt = info.endPrompt === undefined ? a.prompt : (a.prompt ? info.endPrompt ?? undefined : undefined);
  if (prompt && hud.frame % 60 < 40) {
    ctx.font = font(20);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(prompt, ANNOUNCE_X, 370);
  }
}
