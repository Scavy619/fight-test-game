// Placeholder hit sparks: short additive starbursts (hit) and rings (block).
// Visual only; a later task replaces this with particles behind the same small API.
import { rgba } from './color';

export const SPARK_FRAMES = 8;

interface Spark {
  /** World x, height above ground. */
  x: number;
  y: number;
  age: number;
  kind: 'hit' | 'block';
  size: number;
  /** Ray rotation, varied per spark. */
  rot: number;
  glow: string;
  core: string;
}

const BLOCK_GLOW = rgba('#9FD8FF', 0.35);
const BLOCK_CORE = '#E8F6FF';

export class Sparks {
  private readonly list: Spark[] = [];

  /** Starburst in `color` at world (x, y); `size` is the ray length in px. */
  hit(x: number, y: number, color: string, size = 46): void {
    this.list.push({
      x, y, age: 0, kind: 'hit', size, rot: Math.random() * Math.PI,
      glow: rgba(color, 0.4), core: rgba(color, 1),
    });
  }

  /** Smaller blue-white ring at world (x, y). */
  block(x: number, y: number): void {
    this.list.push({ x, y, age: 0, kind: 'block', size: 26, rot: 0, glow: BLOCK_GLOW, core: BLOCK_CORE });
  }

  /** Advance one frame. */
  update(): void {
    for (const s of this.list) s.age += 1;
    let w = 0;
    for (const s of this.list) if (s.age < SPARK_FRAMES) this.list[w++] = s;
    this.list.length = w;
  }

  clear(): void {
    this.list.length = 0;
  }

  draw(ctx: CanvasRenderingContext2D, groundY: number): void {
    if (this.list.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const s of this.list) {
      const t = s.age / SPARK_FRAMES;
      const a = 1 - t;
      const sx = s.x;
      const sy = groundY - s.y;
      if (s.kind === 'block') {
        const r = s.size * (0.4 + 0.6 * t);
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.globalAlpha = a;
        ctx.strokeStyle = s.glow;
        ctx.lineWidth = 8;
        ctx.stroke();
        ctx.strokeStyle = s.core;
        ctx.lineWidth = 2;
        ctx.stroke();
        continue;
      }
      // Rays shoot out fast and shorten as they fade.
      const outer = s.size * (0.55 + 0.45 * Math.sqrt(t));
      const inner = s.size * 0.6 * t;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const ang = s.rot + (i * Math.PI) / 4;
        const len = i % 2 === 0 ? outer : outer * 0.6;
        const c = Math.cos(ang);
        const sn = Math.sin(ang);
        ctx.moveTo(sx + c * inner, sy + sn * inner);
        ctx.lineTo(sx + c * len, sy + sn * len);
      }
      ctx.globalAlpha = a;
      ctx.strokeStyle = s.glow;
      ctx.lineWidth = 9;
      ctx.stroke();
      ctx.strokeStyle = s.core;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // Core flash for the first frames.
      if (s.age < 3) {
        ctx.beginPath();
        ctx.arc(sx, sy, s.size * 0.32 * (1 - s.age / 3), 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
