import { mixHex, rgba } from './color';
import type { FighterLook, Point } from './types';

/** Pre-built colour strings for one look, so drawing never formats strings per frame. */
export interface Palette {
  accent: string;
  secondary: string;
  weapon: string;
  body: string;
  bodyBack: string;
  rimGlow: string;
  rimSoft: string;
  energy: string;
  jointDot: string;
  secGlow: string;
  secSoft: string;
  weaponGlow: string;
  weaponFill: string;
  weaponCore: string;
  ribbonFill: string;
  /** Trail fill per age step (index 0 = newest). */
  trailFill: string[];
  /** Trail tip line per age step. */
  trailLine: string[];
  shadowCore: string;
}

export const BODY_COLOR = '#0E1324';
export const TRAIL_FRAMES = 8;

export function makePalette(look: FighterLook): Palette {
  const trailFill: string[] = [];
  const trailLine: string[] = [];
  for (let i = 0; i < TRAIL_FRAMES; i++) {
    const k = 1 - i / TRAIL_FRAMES;
    trailFill.push(rgba(look.accent, 0.26 * k * k * k));
    trailLine.push(rgba(mixHex(look.weapon.color, '#FFFFFF', 0.4), 0.95 * k));
  }
  return {
    accent: look.accent,
    secondary: look.secondary,
    weapon: look.weapon.color,
    body: BODY_COLOR,
    bodyBack: '#0A0E1B',
    rimGlow: rgba(look.accent, 0.18),
    rimSoft: rgba(look.accent, 0.07),
    energy: rgba(look.accent, 0.35),
    jointDot: mixHex(look.accent, '#FFFFFF', 0.65),
    secGlow: rgba(look.secondary, 0.3),
    secSoft: rgba(look.secondary, 0.12),
    weaponGlow: rgba(look.weapon.color, 0.2),
    weaponFill: rgba(look.weapon.color, 0.32),
    weaponCore: mixHex(look.weapon.color, '#FFFFFF', 0.55),
    ribbonFill: rgba(look.secondary, 0.4),
    trailFill,
    trailLine,
    shadowCore: rgba('#000000', 0.55),
  };
}

/**
 * An affine frame mapping rig-local sub-frame coordinates straight to screen space, so
 * shapes are emitted with no canvas transform (mirrored, rotated or y-flipped canvas
 * transforms push Canvas 2D off its fast paths). Local coordinates: `a` along the frame
 * axis `dir`, `b` 90 degrees counter-clockwise from it, in the fighter's y-up frame.
 */
export class Frame {
  ox = 0;
  oy = 0;
  ux = 1;
  uy = 0;
  vx = 0;
  vy = 1;

  /**
   * `X`, `G`: screen x of the fighter origin and screen y of its feet. `f`: facing.
   * (lx, ly): frame origin in the fighter's local frame; `dir`: local direction of +a.
   */
  set(X: number, G: number, f: number, lx: number, ly: number, dir: number): this {
    const c = Math.cos(dir);
    const s = Math.sin(dir);
    this.ox = X + f * lx;
    this.oy = G - ly;
    this.ux = f * c;
    this.uy = -s;
    this.vx = -f * s;
    this.vy = -c;
    return this;
  }

  x(a: number, b: number): number {
    return this.ox + this.ux * a + this.vx * b;
  }

  y(a: number, b: number): number {
    return this.oy + this.uy * a + this.vy * b;
  }

  m(ctx: CanvasRenderingContext2D, a: number, b: number): void {
    ctx.moveTo(this.x(a, b), this.y(a, b));
  }

  l(ctx: CanvasRenderingContext2D, a: number, b: number): void {
    ctx.lineTo(this.x(a, b), this.y(a, b));
  }

  q(ctx: CanvasRenderingContext2D, ca: number, cb: number, a: number, b: number): void {
    ctx.quadraticCurveTo(this.x(ca, cb), this.y(ca, cb), this.x(a, b), this.y(a, b));
  }

  /** Closed polygon from flat [a, b] pairs scaled by (sa, sb). */
  poly(ctx: CanvasRenderingContext2D, pts: readonly number[], sa: number, sb: number): void {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i += 2) this.l(ctx, (pts[i] ?? 0) * sa, (pts[i + 1] ?? 0) * sb);
    ctx.closePath();
  }
}

/**
 * Tapered capsule path from A (radius ra) to B (radius rb), outer tangents joined.
 * Works in whatever transform is current.
 */
export function capsulePath(
  ctx: CanvasRenderingContext2D,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  ra: number,
  rb: number,
): void {
  const dx = bx - ax;
  const dy = by - ay;
  const d = Math.hypot(dx, dy);
  ctx.beginPath();
  if (d <= Math.abs(ra - rb) + 0.01) {
    ctx.arc(ax, ay, Math.max(ra, rb), 0, Math.PI * 2);
    return;
  }
  const ang = Math.atan2(dy, dx);
  // Tangent contact angle from the A->B axis.
  const phi = Math.acos((ra - rb) / d);
  ctx.arc(ax, ay, ra, ang + phi, ang - phi + Math.PI * 2);
  ctx.arc(bx, by, rb, ang - phi, ang + phi);
  ctx.closePath();
}

/**
 * Fills the current path with the dark body colour and strokes the neon rim: a wide
 * low-alpha glow under a thin bright line. Back parts are darker with a ~55% rim.
 * `glow = false` skips the wide stroke (the costliest call) for small armour details.
 */
export function paintPart(
  ctx: CanvasRenderingContext2D,
  pal: Palette,
  back: boolean,
  fade: number,
  rimColor: string = pal.accent,
  glowColor: string = pal.rimGlow,
  glow = true,
): void {
  ctx.globalAlpha = fade;
  ctx.fillStyle = back ? pal.bodyBack : pal.body;
  ctx.fill();
  ctx.globalAlpha = back ? fade * 0.55 : fade;
  if (glow) {
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 7;
    ctx.stroke();
  }
  ctx.strokeStyle = rimColor;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.globalAlpha = fade;
}

/**
 * Thin energy line down a limb's centre: A -> B, or A -> B -> C through a joint when C
 * is given (one stroke for a whole limb). The ends are inset by `inset`.
 */
export function energyLine(
  ctx: CanvasRenderingContext2D,
  pal: Palette,
  a: Point,
  b: Point,
  c: Point | null,
  inset: number,
  back: boolean,
  fade: number,
): void {
  const end = c ?? b;
  const from = c ? b : a;
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  let d = Math.hypot(dx, dy) || 1;
  ctx.globalAlpha = back ? fade * 0.55 : fade;
  ctx.strokeStyle = pal.energy;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(a.x + (dx / d) * inset, a.y + (dy / d) * inset);
  if (c) ctx.lineTo(b.x, b.y);
  dx = end.x - from.x;
  dy = end.y - from.y;
  d = Math.hypot(dx, dy) || 1;
  ctx.lineTo(end.x - (dx / d) * inset, end.y - (dy / d) * inset);
  ctx.stroke();
  ctx.globalAlpha = fade;
}

export function jointDot(
  ctx: CanvasRenderingContext2D,
  pal: Palette,
  x: number,
  y: number,
  r: number,
  back: boolean,
  fade: number,
): void {
  ctx.globalAlpha = back ? fade * 0.55 : fade;
  ctx.fillStyle = pal.jointDot;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = fade;
}
