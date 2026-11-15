// Floor zones from the sim, drawn with their text label so no effect relies on colour alone.
// Decoys are drawn by the fight scene with a faded FighterView; this file draws their outline.
import type { Zone } from '../sim/types';
import { rgba } from './color';
import { HUD_FONT } from './hud';

const LABEL_FONT = `800 12px ${HUD_FONT}`;

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string): void {
  ctx.font = LABEL_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(7,10,20,0.85)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

/** Draws every zone except decoys' bodies. `accents[owner]` colours the zone. */
export function drawZones(
  ctx: CanvasRenderingContext2D,
  zones: readonly Zone[],
  accents: readonly [string, string],
  groundY: number,
  frame: number,
): void {
  if (zones.length === 0) return;
  ctx.save();
  for (const z of zones) {
    const c = accents[z.owner] ?? '#FFFFFF';
    const left = z.x - z.w / 2;
    switch (z.kind) {
      case 'strike':
        drawStrike(ctx, z, c, left, groundY, frame);
        break;
      case 'mark':
        drawMark(ctx, z, c, left, groundY, frame);
        break;
      case 'slow':
        drawSlow(ctx, z, c, left, groundY, frame);
        break;
      case 'decoy':
        drawDecoyOutline(ctx, z, c, groundY, frame);
        break;
    }
  }
  ctx.restore();
}

/** Telegraphed lane: faint column, floor band, a countdown bar that fills until the strike, then a flash. */
function drawStrike(ctx: CanvasRenderingContext2D, z: Zone, c: string, left: number, groundY: number, frame: number): void {
  const at = z.strikeAt ?? z.frames;
  const t = Math.min(1, z.age / Math.max(1, at));
  const flash = z.struck ? Math.max(0, 1 - (z.age - at) / 8) : 0;
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rgba(c, 0.05 + 0.1 * t + 0.4 * flash);
  ctx.fillRect(left, groundY - z.h, z.w, z.h);
  ctx.fillStyle = rgba(c, 0.25 + 0.5 * flash);
  ctx.fillRect(left, groundY - 4, z.w, 4);
  // Countdown bar across the floor, edges pulsing faster as it fills.
  ctx.fillStyle = rgba(c, 0.8);
  ctx.fillRect(left, groundY - 8, z.w * t, 3);
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = rgba(c, 0.5 + 0.3 * Math.sin(frame * (0.2 + t * 0.4)));
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(left + 0.5, groundY - z.h + 0.5, z.w - 1, z.h - 1);
  ctx.setLineDash([]);
  label(ctx, z.label, z.x, groundY - z.h - 12, '#FFFFFF');
}

/** Landing or path mark: floor band and label, no countdown. */
function drawMark(ctx: CanvasRenderingContext2D, z: Zone, c: string, left: number, groundY: number, frame: number): void {
  const pulse = 0.5 + 0.5 * Math.sin(frame * 0.25);
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rgba(c, 0.08 + 0.1 * pulse);
  ctx.fillRect(left, groundY - 10, z.w, 10);
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = rgba(c, 0.7);
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 5]);
  ctx.strokeRect(left + 0.5, groundY - 10.5, z.w - 1, 10);
  ctx.setLineDash([]);
  label(ctx, z.label, z.x, groundY - 24, '#FFFFFF');
}

/** Slow field: dim floor band with chevrons pointing inward and the label. */
function drawSlow(ctx: CanvasRenderingContext2D, z: Zone, c: string, left: number, groundY: number, frame: number): void {
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rgba(c, 0.07);
  ctx.fillRect(left, groundY - z.h * 0.35, z.w, z.h * 0.35);
  ctx.fillStyle = rgba(c, 0.22);
  ctx.fillRect(left, groundY - 5, z.w, 5);
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = rgba(c, 0.75);
  ctx.lineWidth = 1.5;
  const shift = (frame * 0.8) % 16;
  ctx.beginPath();
  for (let x = left + 10 + shift; x < z.x - 8; x += 16) {
    ctx.moveTo(x - 4, groundY - 16);
    ctx.lineTo(x + 2, groundY - 10);
    ctx.lineTo(x - 4, groundY - 4);
  }
  for (let x = left + z.w - 10 - shift; x > z.x + 8; x -= 16) {
    ctx.moveTo(x + 4, groundY - 16);
    ctx.lineTo(x - 2, groundY - 10);
    ctx.lineTo(x + 4, groundY - 4);
  }
  ctx.stroke();
  label(ctx, z.label, z.x, groundY - 30, '#FFFFFF');
}

/** Dashed outline and label around a decoy (its body is drawn by the fight scene). */
export function drawDecoyOutline(ctx: CanvasRenderingContext2D, z: Zone, c: string, groundY: number, frame: number): void {
  ctx.save();
  ctx.strokeStyle = rgba(c, 0.45 + 0.2 * Math.sin(frame * 0.3));
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 6]);
  ctx.beginPath();
  ctx.ellipse(z.x, groundY - z.h / 2, z.w * 0.7, z.h * 0.55, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  label(ctx, z.label, z.x, groundY - z.h - 14, '#FFFFFF');
  ctx.restore();
}
