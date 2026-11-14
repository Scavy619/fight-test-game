// Placeholder arena: dark backdrop, faint horizon glow, perspective floor grid and the
// ground line. Real arenas replace this in a later task.

export interface StageOptions {
  /** Ground line colour (default cyan `#2FF3E0`). */
  lineColor?: string;
  /** Ground line alpha (default 0.5). */
  lineAlpha?: number;
}

export const STAGE_BG = '#070A14';
export const GROUND_Y = 600;

export function drawStage(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  groundY: number = GROUND_Y,
  opts: StageOptions = {},
): void {
  const lineColor = opts.lineColor ?? '#2FF3E0';
  const lineAlpha = opts.lineAlpha ?? 0.5;
  ctx.save();
  // Oversized fill so screen shake never exposes the canvas edge.
  ctx.fillStyle = STAGE_BG;
  ctx.fillRect(-width, -height, width * 3, height * 3);
  // Faint horizon glow and floor grid.
  const g = ctx.createLinearGradient(0, groundY - 220, 0, groundY);
  g.addColorStop(0, 'rgba(61,169,255,0)');
  g.addColorStop(1, 'rgba(61,169,255,0.08)');
  ctx.fillStyle = g;
  ctx.fillRect(-width, groundY - 220, width * 3, 220);
  ctx.fillStyle = '#0A0F1E';
  ctx.fillRect(-width, groundY, width * 3, height * 2);
  ctx.strokeStyle = 'rgba(61,169,255,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = -12; i <= 12; i++) {
    ctx.moveTo(width / 2 + i * 60, groundY);
    ctx.lineTo(width / 2 + i * 160, height);
  }
  for (let y = groundY + 14, k = 1; y < height; k++, y += 8 * k) {
    ctx.moveTo(-width, y);
    ctx.lineTo(width * 2, y);
  }
  ctx.stroke();
  // Ground line: wide low-alpha glow under a thin bright stroke.
  ctx.globalAlpha = lineAlpha;
  ctx.strokeStyle = lineColor;
  ctx.beginPath();
  ctx.moveTo(-width, groundY);
  ctx.lineTo(width * 2, groundY);
  ctx.globalAlpha = lineAlpha * 0.25;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.globalAlpha = lineAlpha;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}
