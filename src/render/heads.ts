import { RIG } from './rig';
import { paintPart, type Palette } from './neon';
import type { HeadStyle } from './types';

/**
 * Heads are drawn in their own frame: origin at the head centre, +y up the head axis,
 * +x toward the face. `s` is the fighter scale. `behind` draws the parts that sit
 * behind the skull (called before the skull), otherwise the skull and front parts.
 */
export function drawHead(
  ctx: CanvasRenderingContext2D,
  style: HeadStyle,
  pal: Palette,
  s: number,
  fade: number,
): void {
  const rx = RIG.headRx * s;
  const ry = RIG.headRy * s;

  // Behind-the-skull silhouettes.
  if (style === 'topknot') topknot(ctx, pal, s, fade);
  if (style === 'circlet') feathers(ctx, pal, s, fade);
  if (style === 'wingedHelm') wing(ctx, pal, s, fade, true);
  if (style === 'crown') sunRays(ctx, pal, s, fade);
  if (style === 'curls') curls(ctx, pal, s, fade);
  if (style === 'hermit') bun(ctx, pal, s, fade);

  // Skull: slightly pointed chin toward the face.
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  paintPart(ctx, pal, false, fade);

  // Jaw plate line.
  ctx.globalAlpha = fade;
  ctx.strokeStyle = pal.energy;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-2 * s, -ry * 0.98);
  ctx.quadraticCurveTo(rx * 0.2, -ry * 0.35, rx * 0.95, -ry * 0.2);
  ctx.stroke();

  if (style === 'circlet') ears(ctx, pal, s, fade);
  if (style === 'wingedHelm') helm(ctx, pal, s, fade);

  visor(ctx, pal, s, fade);

  if (style === 'braid' || style === 'circlet' || style === 'curls') band(ctx, pal, s, fade, style === 'circlet');
  if (style === 'wingedHelm') {
    wing(ctx, pal, s, fade, false);
    beard(ctx, pal, s, fade);
  }
  if (style === 'crown') diadem(ctx, pal, s, fade);
  if (style === 'hermit') {
    mark(ctx, pal, s, fade);
    longBeard(ctx, pal, s, fade);
  }
}

/** Crown: short sun points fanned over the top of the head (behind the skull). */
function sunRays(ctx: CanvasRenderingContext2D, pal: Palette, s: number, fade: number): void {
  ctx.globalAlpha = fade;
  for (let k = -2; k <= 2; k++) {
    const a = Math.PI / 2 + k * 0.42;
    const bx = Math.cos(a) * 10 * s;
    const by = Math.sin(a) * 11 * s;
    const tx = Math.cos(a) * (19 - Math.abs(k) * 2) * s;
    const ty = Math.sin(a) * (20 - Math.abs(k) * 2) * s;
    const px = -Math.sin(a) * 2.6 * s;
    const py = Math.cos(a) * 2.6 * s;
    ctx.beginPath();
    ctx.moveTo(bx + px, by + py);
    ctx.lineTo(tx, ty);
    ctx.lineTo(bx - px, by - py);
    ctx.closePath();
    paintPart(ctx, pal, false, fade, pal.secondary, pal.secGlow);
  }
}

/** Crown: the band itself with a central disc, in front. */
function diadem(ctx: CanvasRenderingContext2D, pal: Palette, s: number, fade: number): void {
  ctx.globalAlpha = fade;
  ctx.beginPath();
  ctx.moveTo(-11 * s, 5 * s);
  ctx.quadraticCurveTo(0, 9 * s, 11.5 * s, 6 * s);
  ctx.strokeStyle = pal.secGlow;
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.strokeStyle = pal.secondary;
  ctx.lineWidth = 2.8;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(7 * s, 7.5 * s, 2.8 * s, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
}

/** Curls: a bushy lobed mass around the back and top of the head. */
function curls(ctx: CanvasRenderingContext2D, pal: Palette, s: number, fade: number): void {
  const lobes: [number, number, number][] = [
    [-9, 10, 7.5], [-14, 2, 7], [-13, -7, 6], [-2, 15, 7], [5, 13, 6], [-8, -14, 5.5],
  ];
  for (const [x, y, r] of lobes) {
    ctx.beginPath();
    ctx.arc(x * s, y * s, r * s, 0, Math.PI * 2);
    paintPart(ctx, pal, false, fade);
  }
}

/** Hermit: tied hair bun high at the back. */
function bun(ctx: CanvasRenderingContext2D, pal: Palette, s: number, fade: number): void {
  ctx.beginPath();
  ctx.moveTo(3 * s, 13 * s);
  ctx.quadraticCurveTo(-4 * s, 18 * s, -9 * s, 15 * s);
  ctx.lineTo(-12 * s, 6 * s);
  ctx.lineTo(-6 * s, 2 * s);
  ctx.closePath();
  paintPart(ctx, pal, false, fade);
  ctx.beginPath();
  ctx.arc(-6 * s, 19 * s, 5.5 * s, 0, Math.PI * 2);
  paintPart(ctx, pal, false, fade);
  ctx.beginPath();
  ctx.moveTo(-10 * s, 15.5 * s);
  ctx.lineTo(-2 * s, 16.5 * s);
  ctx.strokeStyle = pal.secGlow;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.strokeStyle = pal.secondary;
  ctx.lineWidth = 2;
  ctx.stroke();
}

/** Hermit: a small vertical forehead mark. */
function mark(ctx: CanvasRenderingContext2D, pal: Palette, s: number, fade: number): void {
  ctx.globalAlpha = fade;
  ctx.beginPath();
  ctx.moveTo(9.5 * s, 4.5 * s);
  ctx.lineTo(10.5 * s, 9.5 * s);
  ctx.strokeStyle = pal.secGlow;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.strokeStyle = pal.secondary;
  ctx.lineWidth = 1.8;
  ctx.stroke();
}

/** Hermit: long pointed beard hanging from the jaw. */
function longBeard(ctx: CanvasRenderingContext2D, pal: Palette, s: number, fade: number): void {
  ctx.beginPath();
  ctx.moveTo(-5 * s, -6 * s);
  ctx.lineTo(11 * s, -4 * s);
  ctx.quadraticCurveTo(12 * s, -16 * s, 6 * s, -28 * s);
  ctx.quadraticCurveTo(0, -20 * s, -3 * s, -14 * s);
  ctx.closePath();
  paintPart(ctx, pal, false, fade, pal.secondary, pal.secGlow);
  ctx.beginPath();
  ctx.moveTo(3 * s, -8 * s);
  ctx.lineTo(5.5 * s, -22 * s);
  ctx.moveTo(8 * s, -7 * s);
  ctx.lineTo(8 * s, -18 * s);
  ctx.strokeStyle = pal.secGlow;
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

function visor(ctx: CanvasRenderingContext2D, pal: Palette, s: number, fade: number): void {
  ctx.beginPath();
  ctx.moveTo(0.5 * s, 3.2 * s);
  ctx.lineTo(10.8 * s, 2.4 * s);
  ctx.lineTo(10.2 * s, -0.4 * s);
  ctx.lineTo(1.5 * s, 0.6 * s);
  ctx.closePath();
  ctx.globalAlpha = fade;
  ctx.strokeStyle = pal.secGlow;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.fillStyle = pal.secondary;
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(3 * s, 1.9 * s);
  ctx.lineTo(10 * s, 1.2 * s);
  ctx.stroke();
}

/** Where the hair chain starts, in head coordinates [forward, up]. */
export const TOPKNOT_ANCHOR: readonly [number, number] = [-8, 17];
export const BRAID_ANCHOR: readonly [number, number] = [-9, 2];

function topknot(ctx: CanvasRenderingContext2D, pal: Palette, s: number, fade: number): void {
  // Swept-back hair mass rising into a tied bun; the tail itself is a chain.
  ctx.beginPath();
  ctx.moveTo(2 * s, 14 * s);
  ctx.quadraticCurveTo(-3 * s, 19 * s, -6 * s, 21 * s);
  ctx.lineTo(-11 * s, 19 * s);
  ctx.lineTo(-10 * s, 14 * s);
  ctx.quadraticCurveTo(-15 * s, 6 * s, -13 * s, -5 * s);
  ctx.lineTo(-6 * s, 1 * s);
  ctx.closePath();
  paintPart(ctx, pal, false, fade);
  // Tie band.
  ctx.beginPath();
  ctx.moveTo(-5 * s, 18 * s);
  ctx.lineTo(-10 * s, 15.5 * s);
  ctx.strokeStyle = pal.secGlow;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.strokeStyle = pal.secondary;
  ctx.lineWidth = 2.4;
  ctx.stroke();
}

function band(ctx: CanvasRenderingContext2D, pal: Palette, s: number, fade: number, crown: boolean): void {
  ctx.globalAlpha = fade;
  ctx.beginPath();
  ctx.moveTo(-10.6 * s, 4.2 * s);
  ctx.quadraticCurveTo(0, 7.5 * s, 11 * s, 5.5 * s);
  ctx.strokeStyle = pal.secGlow;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.strokeStyle = pal.secondary;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  if (crown) {
    // Small raised front point of the circlet.
    ctx.beginPath();
    ctx.moveTo(6 * s, 6.5 * s);
    ctx.lineTo(9 * s, 11 * s);
    ctx.lineTo(11 * s, 5.8 * s);
    ctx.fillStyle = pal.secondary;
    ctx.fill();
  } else {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(10 * s, 5.8 * s, 1.5 * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

function feathers(ctx: CanvasRenderingContext2D, pal: Palette, s: number, fade: number): void {
  ctx.globalAlpha = fade;
  for (let i = 0; i < 2; i++) {
    const o = i * 7 * s;
    ctx.beginPath();
    ctx.moveTo((3 - i * 4) * s, 10 * s);
    ctx.bezierCurveTo((12 - i * 3) * s, 40 * s + o, (-8 - i * 6) * s, 64 * s, (-40 - i * 10) * s, 60 * s - o);
    ctx.strokeStyle = pal.secGlow;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.strokeStyle = i === 0 ? pal.secondary : pal.accent;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function ears(ctx: CanvasRenderingContext2D, pal: Palette, s: number, fade: number): void {
  ctx.beginPath();
  ctx.arc(-3 * s, 0.5 * s, 4.2 * s, 0, Math.PI * 2);
  paintPart(ctx, pal, false, fade, pal.accent, pal.rimGlow, false);
  ctx.beginPath();
  ctx.arc(-3 * s, 0.5 * s, 1.6 * s, 0, Math.PI * 2);
  ctx.fillStyle = pal.energy;
  ctx.fill();
}

function helm(ctx: CanvasRenderingContext2D, pal: Palette, s: number, fade: number): void {
  ctx.beginPath();
  ctx.moveTo(-13 * s, -1 * s);
  ctx.bezierCurveTo(-14 * s, 14 * s, -4 * s, 18.5 * s, 3 * s, 17 * s);
  ctx.bezierCurveTo(10 * s, 15.5 * s, 13.5 * s, 9 * s, 12.5 * s, 5 * s);
  ctx.lineTo(13 * s, -3 * s); // nasal guard
  ctx.lineTo(10.5 * s, -2.5 * s);
  ctx.lineTo(10 * s, 3.8 * s);
  ctx.lineTo(-8 * s, 4.5 * s);
  ctx.lineTo(-9 * s, -3 * s);
  ctx.closePath();
  paintPart(ctx, pal, false, fade);
  ctx.beginPath();
  ctx.moveTo(-9 * s, 4.6 * s);
  ctx.lineTo(10 * s, 3.9 * s);
  ctx.strokeStyle = pal.secondary;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Crest ridge.
  ctx.beginPath();
  ctx.moveTo(-10 * s, 10 * s);
  ctx.quadraticCurveTo(-2 * s, 18 * s, 9 * s, 13 * s);
  ctx.strokeStyle = pal.energy;
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

function wing(ctx: CanvasRenderingContext2D, pal: Palette, s: number, fade: number, far: boolean): void {
  // Swept-back feathered wing on the side of the helm.
  const ox = far ? 4 * s : 0;
  const oy = far ? 3.5 * s : 0;
  ctx.beginPath();
  ctx.moveTo(-2 * s + ox, 9 * s + oy);
  ctx.quadraticCurveTo(-12 * s + ox, 20 * s + oy, -27 * s + ox, 22 * s + oy);
  ctx.lineTo(-19 * s + ox, 15.5 * s + oy);
  ctx.lineTo(-28 * s + ox, 14 * s + oy);
  ctx.lineTo(-18 * s + ox, 9.5 * s + oy);
  ctx.lineTo(-25 * s + ox, 6 * s + oy);
  ctx.quadraticCurveTo(-12 * s + ox, 3 * s + oy, -5 * s + ox, 4 * s + oy);
  ctx.closePath();
  paintPart(ctx, pal, far, fade, pal.secondary, pal.secGlow);
}

function beard(ctx: CanvasRenderingContext2D, pal: Palette, s: number, fade: number): void {
  // Short braided beard wedge jutting forward from the jaw.
  ctx.beginPath();
  ctx.moveTo(-4 * s, -7 * s);
  ctx.lineTo(11.5 * s, -4.5 * s);
  ctx.lineTo(13 * s, -12 * s);
  ctx.lineTo(9 * s, -20 * s);
  ctx.lineTo(4 * s, -15 * s);
  ctx.lineTo(-1 * s, -14 * s);
  ctx.closePath();
  paintPart(ctx, pal, false, fade, pal.secondary, pal.secGlow);
  ctx.beginPath();
  ctx.moveTo(4 * s, -7 * s);
  ctx.lineTo(7.5 * s, -15 * s);
  ctx.moveTo(8.5 * s, -6.5 * s);
  ctx.lineTo(10.5 * s, -13 * s);
  ctx.strokeStyle = pal.secGlow;
  ctx.lineWidth = 1.2;
  ctx.stroke();
}
