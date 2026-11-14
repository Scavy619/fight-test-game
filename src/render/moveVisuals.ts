// Move visuals: small additive shapes for moves the rig cannot show (teleports,
// light columns, dash streaks). Driven by sim `fx` events through the per-fighter
// `visuals` table of a FighterEntry (fx tag -> VisualSpec). Visual only.
//
// Three primitive kinds, positioned relative to the fighter's origin (feet centre)
// and facing at the time of the event, authored facing right like move data:
// - column: a vertical beam of light standing on the ground at `x`;
// - burst: an expanding ring with a few radial streaks centred at (`x`, `y`);
// - streak: horizontal speed lines from `x` to `x + length` around height `y`.
import { rgba } from './color';
import type { Facing } from '../sim/types';

interface VisualBase {
  /** Forward offset from the fighter origin (facing right), px. */
  x: number;
  /** CSS hex colour; default: the fighter's accent. */
  color?: string;
  /** Frames the visual lives (fades out over its life). */
  life?: number;
}

export interface ColumnSpec extends VisualBase {
  kind: 'column';
  /** Beam width, px. */
  width: number;
  /** Beam height above the ground, px (default 360). */
  height?: number;
}

export interface BurstSpec extends VisualBase {
  kind: 'burst';
  /** Height above the fighter origin, px. */
  y: number;
  /** Final ring radius, px. */
  radius: number;
  /** Number of radial streaks (default 6). */
  rays?: number;
}

export interface StreakSpec extends VisualBase {
  kind: 'streak';
  /** Height above the fighter origin of the middle line, px. */
  y: number;
  /** Signed length along facing, px (negative draws behind the fighter). */
  length: number;
  /** Number of lines (default 5). */
  lines?: number;
  /** Vertical spread of the lines, px (default 70). */
  spread?: number;
}

export type VisualSpec = ColumnSpec | BurstSpec | StreakSpec;
export type VisualKind = VisualSpec['kind'];

export const DEFAULT_VISUAL_LIFE: Readonly<Record<VisualKind, number>> = { column: 16, burst: 14, streak: 12 };
const DEFAULT_COLUMN_HEIGHT = 360;

/** A spawned visual in world space (stage x, height above ground). */
export interface LiveVisual {
  kind: VisualKind;
  /** World x of the anchor (column centre, burst centre, streak start). */
  x: number;
  /** World height of the anchor (column foot is always the ground). */
  y: number;
  /** Signed world length (streak) or width (column) or radius (burst). */
  size: number;
  height: number;
  count: number;
  spread: number;
  age: number;
  life: number;
  /** Per-visual variation for ray angles and line offsets. */
  seed: number;
  glow: string;
  mid: string;
  core: string;
}

/** World-space visual for `spec` spawned by a fighter at (ox, oy) facing `facing`. */
export function placeVisual(spec: VisualSpec, ox: number, oy: number, facing: Facing, accent: string, seed = 0): LiveVisual {
  const color = spec.color ?? accent;
  const base = {
    kind: spec.kind,
    x: ox + facing * spec.x,
    y: oy,
    size: 0,
    height: 0,
    count: 0,
    spread: 0,
    age: 0,
    life: spec.life ?? DEFAULT_VISUAL_LIFE[spec.kind],
    seed,
    glow: rgba(color, 0.22),
    mid: rgba(color, 0.7),
    core: '#FFFFFF',
  };
  switch (spec.kind) {
    case 'column':
      return { ...base, y: 0, size: spec.width, height: spec.height ?? DEFAULT_COLUMN_HEIGHT };
    case 'burst':
      return { ...base, y: oy + spec.y, size: spec.radius, count: spec.rays ?? 6 };
    case 'streak':
      return {
        ...base, y: oy + spec.y, size: facing * spec.length, count: spec.lines ?? 5, spread: spec.spread ?? 70,
      };
  }
}

/** Golden-ratio hash in [0, 1) for stable per-visual variation. */
function frac(n: number): number {
  const v = n * 0.6180339887;
  return v - Math.floor(v);
}

export class MoveVisuals {
  private readonly list: LiveVisual[] = [];
  private spawned = 0;

  get count(): number {
    return this.list.length;
  }

  /** The live visuals (read-only view, for tests and debugging). */
  get live(): readonly LiveVisual[] {
    return this.list;
  }

  spawn(spec: VisualSpec, ox: number, oy: number, facing: Facing, accent: string): void {
    this.spawned += 1;
    this.list.push(placeVisual(spec, ox, oy, facing, accent, this.spawned));
  }

  /** Advance one frame; drops expired visuals. */
  update(): void {
    let w = 0;
    for (const v of this.list) {
      v.age += 1;
      if (v.age < v.life) this.list[w++] = v;
    }
    this.list.length = w;
  }

  clear(): void {
    this.list.length = 0;
  }

  /** Draws additively; `groundY` is the screen y of the ground line. */
  draw(ctx: CanvasRenderingContext2D, groundY: number): void {
    if (this.list.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const v of this.list) {
      const t = v.age / v.life;
      switch (v.kind) {
        case 'column':
          drawColumn(ctx, v, t, groundY);
          break;
        case 'burst':
          drawBurst(ctx, v, t, groundY);
          break;
        case 'streak':
          drawStreak(ctx, v, t, groundY);
          break;
      }
    }
    ctx.restore();
  }
}

function drawColumn(ctx: CanvasRenderingContext2D, v: LiveVisual, t: number, groundY: number): void {
  // Strikes in fast (full height by t = 0.15), then narrows and fades.
  const grow = Math.min(1, t / 0.15);
  const fade = 1 - Math.max(0, (t - 0.15) / 0.85);
  const h = v.height * grow;
  const top = groundY - h;
  // Half-width: the glow spans the spec width, the bright core a third of it.
  const w = (v.size / 2) * (1 - 0.45 * t);
  ctx.globalAlpha = fade;
  ctx.fillStyle = v.glow;
  ctx.fillRect(v.x - w, top, w * 2, h);
  ctx.fillStyle = v.mid;
  ctx.fillRect(v.x - w * 0.6, top, w * 1.2, h);
  ctx.fillStyle = v.core;
  ctx.fillRect(v.x - w * 0.22, top, w * 0.44, h);
  // Ground flare.
  ctx.beginPath();
  ctx.ellipse(v.x, groundY, w * 1.6, 7 * fade + 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = v.mid;
  ctx.fill();
}

function drawBurst(ctx: CanvasRenderingContext2D, v: LiveVisual, t: number, groundY: number): void {
  const sx = v.x;
  const sy = groundY - v.y;
  const a = 1 - t;
  const r = v.size * (0.25 + 0.75 * Math.sqrt(t));
  ctx.globalAlpha = a;
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.strokeStyle = v.glow;
  ctx.lineWidth = 12;
  ctx.stroke();
  ctx.strokeStyle = v.mid;
  ctx.lineWidth = 3;
  ctx.stroke();
  // Radial streaks just outside the ring.
  ctx.beginPath();
  const rot = frac(v.seed) * Math.PI;
  for (let i = 0; i < v.count; i++) {
    const ang = rot + (i * Math.PI * 2) / v.count;
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    ctx.moveTo(sx + c * r * 0.9, sy + s * r * 0.9);
    ctx.lineTo(sx + c * r * 1.45, sy + s * r * 1.45);
  }
  ctx.strokeStyle = v.mid;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = v.core;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  if (t < 0.25) {
    ctx.beginPath();
    ctx.arc(sx, sy, v.size * 0.35 * (1 - t / 0.25), 0, Math.PI * 2);
    ctx.fillStyle = v.core;
    ctx.fill();
  }
}

function drawStreak(ctx: CanvasRenderingContext2D, v: LiveVisual, t: number, groundY: number): void {
  const a = 1 - t;
  ctx.globalAlpha = a;
  ctx.beginPath();
  for (let i = 0; i < v.count; i++) {
    const k = v.count > 1 ? i / (v.count - 1) - 0.5 : 0;
    const y = groundY - v.y + k * v.spread;
    // Lines start staggered and their tails pull toward the far end as they fade.
    const jitter = frac(v.seed * 7 + i * 3.1);
    const from = v.x + v.size * (0.1 * jitter + 0.75 * t);
    const to = v.x + v.size * (0.75 + 0.25 * jitter);
    ctx.moveTo(from, y);
    ctx.lineTo(to, y);
  }
  ctx.strokeStyle = v.glow;
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.strokeStyle = v.mid;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = v.core;
  ctx.lineWidth = 0.8;
  ctx.stroke();
}
