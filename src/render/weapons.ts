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
    case 'bow':
      drawBow(ctx, pal, L, s, fade);
      break;
    case 'mace':
      drawMace(ctx, pal, L, s, fade);
      break;
    case 'axe':
      drawAxe(ctx, pal, L, s, fade);
      break;
    case 'sword':
      drawSword(ctx, pal, L, s, fade);
      break;
  }
}

/** Recurve bow held at its middle: limbs bow toward -y, the string is the chord on +y. */
function drawBow(ctx: CanvasRenderingContext2D, pal: Palette, L: number, s: number, fade: number): void {
  const bend = 0.17 * L;
  ctx.globalAlpha = fade;
  // String.
  ctx.beginPath();
  ctx.moveTo(0.02 * L, 1.5 * s);
  ctx.lineTo(0.98 * L, 1.5 * s);
  ctx.strokeStyle = pal.weaponCore;
  ctx.lineWidth = 0.9;
  ctx.stroke();
  // Limbs: one curve, recurving at both tips.
  ctx.beginPath();
  ctx.moveTo(0, 2 * s);
  ctx.quadraticCurveTo(0.08 * L, -0.25 * bend, 0.2 * L, -0.6 * bend);
  ctx.quadraticCurveTo(0.5 * L, -1.15 * bend, 0.8 * L, -0.6 * bend);
  ctx.quadraticCurveTo(0.92 * L, -0.25 * bend, L, 2 * s);
  ctx.strokeStyle = pal.weaponGlow;
  ctx.lineWidth = 3.2 * s + 6;
  ctx.stroke();
  ctx.strokeStyle = pal.weaponFill;
  ctx.lineWidth = 3.2 * s;
  ctx.stroke();
  ctx.strokeStyle = pal.weapon;
  ctx.lineWidth = 1.3;
  ctx.stroke();
  // Grip wrap at the middle, with a bright core.
  ctx.beginPath();
  ctx.rect(0.43 * L, -0.95 * bend - 2.6 * s, 0.14 * L, 5.2 * s);
  paintPart(ctx, pal, false, fade, pal.secondary, pal.secGlow);
  ctx.beginPath();
  ctx.moveTo(0.46 * L, -0.95 * bend);
  ctx.lineTo(0.54 * L, -0.95 * bend);
  ctx.strokeStyle = pal.weaponCore;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Nock caps.
  for (const x of [0.01 * L, 0.99 * L]) {
    ctx.beginPath();
    ctx.arc(x, 1.2 * s, 2.2 * s, 0, Math.PI * 2);
    ctx.fillStyle = pal.secondary;
    ctx.fill();
  }
}

/** Gada: shaft, collar and a large ribbed spherical head. */
function drawMace(ctx: CanvasRenderingContext2D, pal: Palette, L: number, s: number, fade: number): void {
  const r = 0.17 * L;
  const cx = L - r;
  shaft(ctx, pal, 0, cx - r * 0.7, 2.9 * s, fade);
  // Pommel disc.
  ctx.beginPath();
  ctx.ellipse(0, 0, 2.2 * s, 5 * s, 0, 0, Math.PI * 2);
  paintPart(ctx, pal, false, fade, pal.secondary, pal.secGlow, false);
  // Collar.
  ctx.beginPath();
  ctx.rect(cx - r - 3 * s, -4 * s, 5 * s, 8 * s);
  paintPart(ctx, pal, false, fade, pal.secondary, pal.secGlow, false);
  // Head.
  ctx.beginPath();
  ctx.arc(cx, 0, r, 0, Math.PI * 2);
  paintPart(ctx, pal, false, fade, pal.weapon, pal.weaponGlow);
  ctx.globalAlpha = fade;
  ctx.fillStyle = pal.weaponFill;
  ctx.beginPath();
  ctx.arc(cx, 0, r * 0.82, 0, Math.PI * 2);
  ctx.fill();
  // Ribs: three ellipses of decreasing width.
  ctx.strokeStyle = pal.weaponCore;
  ctx.lineWidth = 1.2;
  for (const f of [0.25, 0.6]) {
    ctx.beginPath();
    ctx.ellipse(cx, 0, r * f, r * 0.82, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.82, 0);
  ctx.lineTo(cx + r * 0.82, 0);
  ctx.stroke();
  // Crown nub at the far end.
  ctx.beginPath();
  ctx.arc(L - 1.5 * s, 0, 2.6 * s, 0, Math.PI * 2);
  ctx.fillStyle = pal.secondary;
  ctx.fill();
}

/** Parashu: long haft, single crescent bit on +y, a short spike on -y. */
function drawAxe(ctx: CanvasRenderingContext2D, pal: Palette, L: number, s: number, fade: number): void {
  shaft(ctx, pal, 0, L - 2 * s, 2.7 * s, fade);
  ctx.beginPath();
  ctx.arc(-1 * s, 0, 3.4 * s, 0, Math.PI * 2);
  paintPart(ctx, pal, false, fade, pal.secondary, pal.secGlow, false);
  // Socket.
  const a = 0.7 * L;
  ctx.beginPath();
  ctx.rect(a, -5 * s, 0.26 * L, 10 * s);
  paintPart(ctx, pal, false, fade, pal.secondary, pal.secGlow, false);
  // Crescent bit.
  const reach = 22 * s;
  ctx.beginPath();
  ctx.moveTo(a + 1 * s, 4 * s);
  ctx.quadraticCurveTo(a + 0.02 * L, reach * 0.55, a + 0.1 * L, reach);
  ctx.quadraticCurveTo(a + 0.2 * L, reach * 1.08, L + 2 * s, reach * 0.9);
  ctx.quadraticCurveTo(L - 1 * s, reach * 0.4, L - 1 * s, 4 * s);
  ctx.closePath();
  ctx.globalAlpha = fade;
  ctx.fillStyle = pal.weaponFill;
  ctx.fill();
  glowLine(ctx, pal.weapon, pal.weaponGlow, 1.5, fade);
  // Cutting edge highlight along the outer arc.
  ctx.beginPath();
  ctx.moveTo(a + 0.1 * L, reach - 1.5 * s);
  ctx.quadraticCurveTo(a + 0.2 * L, reach * 1.02, L + 0.5 * s, reach * 0.88);
  ctx.strokeStyle = pal.weaponCore;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Back spike.
  ctx.beginPath();
  ctx.moveTo(a + 0.05 * L, -4 * s);
  ctx.lineTo(a + 0.13 * L, -11 * s);
  ctx.lineTo(a + 0.2 * L, -4 * s);
  ctx.closePath();
  paintPart(ctx, pal, false, fade, pal.weapon, pal.weaponGlow);
}

/** Straight double-edged sword: pommel, wrapped grip, crossguard, tapered blade. */
function drawSword(ctx: CanvasRenderingContext2D, pal: Palette, L: number, s: number, fade: number): void {
  const guard = 0.2 * L;
  const x0 = 0.22 * L;
  const hw = 3.1 * s;
  shaft(ctx, pal, 0.04 * L, guard, 2.5 * s, fade);
  ctx.strokeStyle = pal.secSoft;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0.06 * L; x < guard - 2 * s; x += 4.5 * s) {
    ctx.moveTo(x, -2.2 * s);
    ctx.lineTo(x + 2 * s, 2.2 * s);
  }
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0.02 * L, 0, 3.2 * s, 0, Math.PI * 2);
  paintPart(ctx, pal, false, fade, pal.secondary, pal.secGlow, false);
  // Blade.
  const taper = 0.86;
  ctx.beginPath();
  ctx.moveTo(x0, -hw);
  ctx.lineTo(x0 + (L - x0) * taper, -hw);
  ctx.lineTo(L, 0);
  ctx.lineTo(x0 + (L - x0) * taper, hw);
  ctx.lineTo(x0, hw);
  ctx.closePath();
  ctx.globalAlpha = fade;
  ctx.fillStyle = pal.weaponFill;
  ctx.fill();
  glowLine(ctx, pal.weapon, pal.weaponGlow, 1.4, fade);
  ctx.beginPath();
  ctx.moveTo(x0 + 2 * s, 0);
  ctx.lineTo(L - 3 * s, 0);
  ctx.strokeStyle = pal.weaponCore;
  ctx.lineWidth = 1.3;
  ctx.stroke();
  // Crossguard.
  ctx.beginPath();
  ctx.rect(guard - 1.5 * s, -9.5 * s, 3.4 * s, 19 * s);
  paintPart(ctx, pal, false, fade, pal.secondary, pal.secGlow);
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
