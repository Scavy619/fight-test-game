// Projectile drawing by look kind. The sim only knows boxes; heroes declare a
// `ProjectileLook` per move slot and the fight scene passes it here.
import type { ProjectileLook } from '../content/types';
import type { Projectile } from '../sim/types';
import { rgba } from './color';

const DEFAULT_LENGTH: Readonly<Record<ProjectileLook['kind'], number>> = { arrow: 52, orb: 0, shockwave: 0, axe: 46 };

/** Draws one projectile. `groundY` is the screen y of the floor; sim y is height above it. */
export function drawProjectile(
  ctx: CanvasRenderingContext2D,
  p: Projectile,
  look: ProjectileLook | undefined,
  accent: string,
  groundY: number,
): void {
  const kind = look?.kind ?? 'orb';
  const color = look?.color ?? accent;
  const x = p.x;
  const y = groundY - p.y;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  switch (kind) {
    case 'arrow':
      drawArrow(ctx, x, y, p, color, look?.length ?? DEFAULT_LENGTH.arrow);
      break;
    case 'shockwave':
      drawShockwave(ctx, x, groundY, p, color);
      break;
    case 'axe':
      drawAxe(ctx, x, y, p, color, look?.length ?? DEFAULT_LENGTH.axe);
      break;
    default:
      drawOrb(ctx, x, y, p, color);
      break;
  }
  ctx.restore();
}

export function drawOrb(ctx: CanvasRenderingContext2D, x: number, y: number, p: Projectile, color: string): void {
  const rx = p.w / 2;
  const ry = p.h / 2;
  const wob = 1 + 0.08 * Math.sin(p.age * 0.6);
  ctx.fillStyle = rgba(color, 0.18);
  ctx.beginPath();
  ctx.ellipse(x, y, rx * 1.5 * wob, ry * 1.5 * wob, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(color, 0.55);
  ctx.beginPath();
  ctx.ellipse(x, y, rx * wob, ry * wob, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx * 0.6, ry * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(x, y, rx * 0.3, ry * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Shaft with a bright head and a short feathered tail; a faint speed streak behind it. */
function drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, p: Projectile, color: string, length: number): void {
  const dir = Math.atan2(-p.vy, p.vx);
  ctx.translate(x, y);
  ctx.rotate(dir);
  const L = length;
  // Streak.
  ctx.strokeStyle = rgba(color, 0.22);
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-L * 1.6, 0);
  ctx.lineTo(-L * 0.4, 0);
  ctx.stroke();
  // Shaft.
  ctx.strokeStyle = rgba(color, 0.35);
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-L / 2, 0);
  ctx.lineTo(L / 2 - 6, 0);
  ctx.stroke();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Head.
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(L / 2, 0);
  ctx.lineTo(L / 2 - 11, -4.5);
  ctx.lineTo(L / 2 - 8, 0);
  ctx.lineTo(L / 2 - 11, 4.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(L / 2, 0);
  ctx.lineTo(L / 2 - 7, -2);
  ctx.lineTo(L / 2 - 7, 2);
  ctx.closePath();
  ctx.fill();
  // Fletching.
  ctx.fillStyle = rgba(color, 0.7);
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(-L / 2, 0);
    ctx.lineTo(-L / 2 - 2, sgn * 5);
    ctx.lineTo(-L / 2 + 11, sgn * 4);
    ctx.lineTo(-L / 2 + 10, 0);
    ctx.closePath();
    ctx.fill();
  }
}

/** Low arc of light running along the floor. */
function drawShockwave(ctx: CanvasRenderingContext2D, x: number, groundY: number, p: Projectile, color: string): void {
  const hw = p.w / 2;
  const h = Math.max(14, p.h);
  const lead = p.vx >= 0 ? 1 : -1;
  ctx.fillStyle = rgba(color, 0.2);
  ctx.beginPath();
  ctx.moveTo(x - hw, groundY);
  ctx.quadraticCurveTo(x + lead * hw * 0.3, groundY - h * 1.6, x + hw, groundY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x - hw, groundY);
  ctx.quadraticCurveTo(x + lead * hw * 0.3, groundY - h * 1.3, x + hw, groundY);
  ctx.stroke();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - hw * 0.6, groundY - 2);
  ctx.quadraticCurveTo(x + lead * hw * 0.3, groundY - h, x + hw * 0.7, groundY - 2);
  ctx.stroke();
  // Debris sparks.
  for (let k = 0; k < 4; k++) {
    const a = ((p.age * 7 + k * 90) % 360) * (Math.PI / 180);
    ctx.fillStyle = rgba(color, 0.6);
    ctx.fillRect(x + Math.cos(a) * hw * 0.5, groundY - Math.abs(Math.sin(a)) * h * 1.2, 3, 3);
  }
}

/** Spinning crescent with a blurred ring. */
function drawAxe(ctx: CanvasRenderingContext2D, x: number, y: number, p: Projectile, color: string, length: number): void {
  const spin = p.age * 0.45 * (p.vx >= 0 ? 1 : -1);
  const r = length / 2;
  ctx.translate(x, y);
  ctx.strokeStyle = rgba(color, 0.18);
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.rotate(spin);
  // Haft.
  ctx.strokeStyle = rgba(color, 0.7);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.lineTo(r * 0.6, 0);
  ctx.stroke();
  // Bit.
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(r * 0.3, 2);
  ctx.quadraticCurveTo(r * 0.5, r * 0.9, r * 1.05, r * 0.6);
  ctx.quadraticCurveTo(r * 0.9, r * 0.2, r * 0.75, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(r * 0.55, r * 0.72);
  ctx.quadraticCurveTo(r * 0.8, r * 0.72, r * 1.02, r * 0.58);
  ctx.stroke();
}
