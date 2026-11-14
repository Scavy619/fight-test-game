import { paintPart, type Palette } from './neon';
import type { WeaponType } from './types';

/**
 * Weapons are drawn in their own frame: origin at the butt, +x along the weapon to the
 * tip, +y on the counter-clockwise side (the back of a raised blade). `L` is the scaled
 * length, `s` the fighter scale.
 */
export function drawWeapon(
  ctx: CanvasRenderingContext2D,
  type: WeaponType,
  pal: Palette,
  L: number,
  s: number,
  fade: number,
): void {
  switch (type) {
    case 'katana':
      drawKatana(ctx, pal, L, s, fade);
      break;
    case 'spear':
      drawSpear(ctx, pal, L, s, fade);
      break;
    case 'staff':
      drawStaff(ctx, pal, L, s, fade);
      break;
    case 'hammer':
      drawHammer(ctx, pal, L, s, fade);
      break;
  }
}

function glowLine(
  ctx: CanvasRenderingContext2D,
  color: string,
  glow: string,
  width: number,
  fade: number,
): void {
  ctx.globalAlpha = fade;
  ctx.strokeStyle = glow;
  ctx.lineWidth = width + 6;
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function shaft(ctx: CanvasRenderingContext2D, pal: Palette, x0: number, x1: number, hw: number, fade: number): void {
  ctx.beginPath();
  ctx.rect(x0, -hw, x1 - x0, hw * 2);
  paintPart(ctx, pal, false, fade);
  ctx.strokeStyle = pal.energy;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0 + 2, 0);
  ctx.lineTo(x1 - 2, 0);
  ctx.stroke();
}

// Katana blade sample count; the blade curves toward +y (its back) near the tip.
const KATANA_SAMPLES = 8;

function drawKatana(ctx: CanvasRenderingContext2D, pal: Palette, L: number, s: number, fade: number): void {
  const hiltEnd = 0.24 * L;
  const x0 = 0.255 * L;
  const bl = L - x0;
  const curve = 0.055 * L;
  const hw = 2.9 * s;

  // Handle with wrap diamonds.
  shaft(ctx, pal, 0, hiltEnd, 2.8 * s, fade);
  ctx.strokeStyle = pal.secSoft;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 4 * s; x < hiltEnd - 3 * s; x += 5 * s) {
    ctx.moveTo(x, -2.4 * s);
    ctx.lineTo(x + 2.5 * s, 2.4 * s);
  }
  ctx.stroke();

  // Blade: edge side (-y) then back side (+y).
  ctx.beginPath();
  for (let i = 0; i <= KATANA_SAMPLES; i++) {
    const f = i / KATANA_SAMPLES;
    const w = f < 0.86 ? hw : hw * Math.max(0, (1 - f) / 0.14);
    ctx.lineTo(x0 + bl * f, curve * f * f - w);
  }
  for (let i = KATANA_SAMPLES; i >= 0; i--) {
    const f = i / KATANA_SAMPLES;
    const w = f < 0.92 ? hw * 0.9 : hw * 0.9 * Math.max(0, (1 - f) / 0.08);
    ctx.lineTo(x0 + bl * f, curve * f * f + w);
  }
  ctx.closePath();
  ctx.globalAlpha = fade;
  ctx.fillStyle = pal.weaponFill;
  ctx.fill();
  ctx.strokeStyle = pal.weaponGlow;
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.strokeStyle = pal.weapon;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Bright cutting edge.
  ctx.beginPath();
  for (let i = 0; i <= KATANA_SAMPLES; i++) {
    const f = i / KATANA_SAMPLES;
    const w = f < 0.86 ? hw : hw * Math.max(0, (1 - f) / 0.14);
    ctx.lineTo(x0 + bl * f, curve * f * f - w * 0.55);
  }
  ctx.strokeStyle = pal.weaponCore;
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Guard (tsuba).
  ctx.beginPath();
  ctx.ellipse(hiltEnd + 1.2 * s, 0, 2.2 * s, 6.5 * s, 0, 0, Math.PI * 2);
  paintPart(ctx, pal, false, fade, pal.secondary, pal.secGlow);
}

function drawSpear(ctx: CanvasRenderingContext2D, pal: Palette, L: number, s: number, fade: number): void {
  const x0 = 0.83 * L;
  const bl = L - x0;
  shaft(ctx, pal, 0, x0 + 2 * s, 2.3 * s, fade);

  // Butt cap and collar.
  ctx.beginPath();
  ctx.rect(-1 * s, -3.2 * s, 6 * s, 6.4 * s);
  paintPart(ctx, pal, false, fade, pal.secondary, pal.secGlow, false);
  ctx.beginPath();
  ctx.rect(x0 - 7 * s, -3.6 * s, 8 * s, 7.2 * s);
  paintPart(ctx, pal, false, fade, pal.secondary, pal.secGlow, false);

  // Leaf-shaped vel blade.
  const w = 6.5 * s;
  ctx.beginPath();
  ctx.moveTo(x0, 0);
  ctx.bezierCurveTo(x0 + bl * 0.15, w * 1.2, x0 + bl * 0.45, w * 1.1, L, 0);
  ctx.bezierCurveTo(x0 + bl * 0.45, -w * 1.1, x0 + bl * 0.15, -w * 1.2, x0, 0);
  ctx.closePath();
  ctx.globalAlpha = fade;
  ctx.fillStyle = pal.weaponFill;
  ctx.fill();
  glowLine(ctx, pal.weapon, pal.weaponGlow, 1.6, fade);
  ctx.beginPath();
  ctx.moveTo(x0 + 2 * s, 0);
  ctx.lineTo(L - 2 * s, 0);
  ctx.strokeStyle = pal.weaponCore;
  ctx.lineWidth = 1.3;
  ctx.stroke();
}

function drawStaff(ctx: CanvasRenderingContext2D, pal: Palette, L: number, s: number, fade: number): void {
  const hw = 2.8 * s;
  const band = 0.1 * L;
  shaft(ctx, pal, band, L - band, hw, fade);
  staffBand(ctx, pal, 0, band, hw, fade);
  staffBand(ctx, pal, L - band, L, hw, fade);
}

function staffBand(ctx: CanvasRenderingContext2D, pal: Palette, a: number, b: number, hw: number, fade: number): void {
  ctx.beginPath();
  ctx.rect(a, -hw * 1.35, b - a, hw * 2.7);
  ctx.globalAlpha = fade;
  ctx.fillStyle = pal.weaponFill;
  ctx.fill();
  glowLine(ctx, pal.weapon, pal.weaponGlow, 1.6, fade);
  // Ring lines across the band.
  ctx.beginPath();
  for (let k = 1; k < 4; k++) {
    const x = a + ((b - a) * k) / 4;
    ctx.moveTo(x, -hw * 1.35);
    ctx.lineTo(x, hw * 1.35);
  }
  ctx.strokeStyle = pal.weaponCore;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawHammer(ctx: CanvasRenderingContext2D, pal: Palette, L: number, s: number, fade: number): void {
  const headA = 0.72 * L;
  const headB = L;
  const half = 19 * s;
  shaft(ctx, pal, 0, headA + 2, 2.8 * s, fade);
  // Pommel loop.
  ctx.beginPath();
  ctx.arc(-2 * s, 0, 3.6 * s, 0, Math.PI * 2);
  paintPart(ctx, pal, false, fade, pal.secondary, pal.secGlow, false);

  // Blocky head with bevelled corners.
  const b = 4 * s;
  ctx.beginPath();
  ctx.moveTo(headA + b, -half);
  ctx.lineTo(headB - b, -half);
  ctx.lineTo(headB, -half + b);
  ctx.lineTo(headB, half - b);
  ctx.lineTo(headB - b, half);
  ctx.lineTo(headA + b, half);
  ctx.lineTo(headA, half - b);
  ctx.lineTo(headA, -half + b);
  ctx.closePath();
  paintPart(ctx, pal, false, fade, pal.weapon, pal.weaponGlow);

  // Striking faces and a rune band.
  ctx.globalAlpha = fade;
  ctx.fillStyle = pal.weaponFill;
  ctx.fillRect(headA + 2 * s, -half + 1.5 * s, headB - headA - 4 * s, 4 * s);
  ctx.fillRect(headA + 2 * s, half - 5.5 * s, headB - headA - 4 * s, 4 * s);
  const mid = (headA + headB) / 2;
  ctx.beginPath();
  ctx.moveTo(mid - 4 * s, -9 * s);
  ctx.lineTo(mid + 3 * s, -3 * s);
  ctx.lineTo(mid - 3 * s, 2 * s);
  ctx.lineTo(mid + 4 * s, 9 * s);
  ctx.strokeStyle = pal.weaponCore;
  ctx.lineWidth = 1.4;
  ctx.stroke();
}
