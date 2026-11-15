// Procedural stage: dark backdrop, horizon glow, perspective floor grid and the ground
// line, coloured by a palette per chapter or mode. Parallax arenas are a later phase.

export interface StagePalette {
  id: string;
  /** Sky fill. */
  bg: string;
  /** Horizon glow colour as `r,g,b`. */
  horizon: string;
  /** Floor fill. */
  floor: string;
  /** Grid line colour (rgba string). */
  grid: string;
  /** Ground line colour. */
  line: string;
  /** Optional distant silhouette: 'mountains' | 'forest' | 'ruins' | 'village' | 'none'. */
  skyline: 'mountains' | 'forest' | 'ruins' | 'village' | 'none';
}

export const STAGE_PALETTES: Readonly<Record<string, StagePalette>> = {
  neon: { id: 'neon', bg: '#070A14', horizon: '61,169,255', floor: '#0A0F1E', grid: 'rgba(61,169,255,0.12)', line: '#2FF3E0', skyline: 'none' },
  forest: { id: 'forest', bg: '#060D0A', horizon: '120,200,110', floor: '#08120C', grid: 'rgba(120,200,110,0.12)', line: '#8FE27A', skyline: 'forest' },
  dawn: { id: 'dawn', bg: '#140A0A', horizon: '255,170,70', floor: '#160E0A', grid: 'rgba(255,170,70,0.12)', line: '#FFC46B', skyline: 'village' },
  night: { id: 'night', bg: '#07061A', horizon: '150,120,255', floor: '#0B0A22', grid: 'rgba(150,120,255,0.12)', line: '#B59CFF', skyline: 'forest' },
  mountain: { id: 'mountain', bg: '#0A0C12', horizon: '200,190,160', floor: '#10121A', grid: 'rgba(200,190,160,0.1)', line: '#E0CFA0', skyline: 'mountains' },
  ruins: { id: 'ruins', bg: '#0D0608', horizon: '120,160,255', floor: '#120A0E', grid: 'rgba(230,80,100,0.1)', line: '#5FA8FF', skyline: 'ruins' },
  field: { id: 'field', bg: '#0B0A06', horizon: '255,210,120', floor: '#12100A', grid: 'rgba(255,210,120,0.1)', line: '#FFD27A', skyline: 'mountains' },
};

export const DEFAULT_PALETTE = STAGE_PALETTES.neon as StagePalette;

export interface StageOptions {
  palette?: StagePalette;
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
  const pal = opts.palette ?? DEFAULT_PALETTE;
  const lineAlpha = opts.lineAlpha ?? 0.5;
  ctx.save();
  // Oversized fill so screen shake never exposes the canvas edge.
  ctx.fillStyle = pal.bg;
  ctx.fillRect(-width, -height, width * 3, height * 3);
  drawSkyline(ctx, pal, width, groundY);
  // Faint horizon glow and floor grid.
  const g = ctx.createLinearGradient(0, groundY - 220, 0, groundY);
  g.addColorStop(0, `rgba(${pal.horizon},0)`);
  g.addColorStop(1, `rgba(${pal.horizon},0.1)`);
  ctx.fillStyle = g;
  ctx.fillRect(-width, groundY - 220, width * 3, 220);
  ctx.fillStyle = pal.floor;
  ctx.fillRect(-width, groundY, width * 3, height * 2);
  ctx.strokeStyle = pal.grid;
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
  ctx.strokeStyle = pal.line;
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

/** A distant silhouette band just above the horizon, in the horizon colour at low alpha. */
function drawSkyline(ctx: CanvasRenderingContext2D, pal: StagePalette, width: number, groundY: number): void {
  if (pal.skyline === 'none') return;
  ctx.fillStyle = `rgba(${pal.horizon},0.07)`;
  ctx.beginPath();
  ctx.moveTo(-width, groundY);
  const base = groundY - 40;
  switch (pal.skyline) {
    case 'mountains':
      for (let x = -width; x <= width * 2; x += 160) {
        ctx.lineTo(x, base - 10);
        ctx.lineTo(x + 70, base - 150 - ((x / 160) % 3) * 40);
        ctx.lineTo(x + 160, base - 10);
      }
      break;
    case 'forest':
      for (let x = -width; x <= width * 2; x += 36) {
        const h = 90 + ((Math.abs(x) / 36) % 4) * 30;
        ctx.lineTo(x, base);
        ctx.lineTo(x + 18, base - h);
        ctx.lineTo(x + 36, base);
      }
      break;
    case 'ruins':
      for (let x = -width; x <= width * 2; x += 120) {
        const h = 60 + ((Math.abs(x) / 120) % 5) * 35;
        ctx.lineTo(x, base);
        ctx.lineTo(x, base - h);
        ctx.lineTo(x + 50, base - h);
        ctx.lineTo(x + 60, base - h + 25);
        ctx.lineTo(x + 100, base - h + 25);
        ctx.lineTo(x + 100, base);
      }
      break;
    case 'village':
      for (let x = -width; x <= width * 2; x += 140) {
        ctx.lineTo(x, base);
        ctx.lineTo(x + 10, base - 50);
        ctx.lineTo(x + 50, base - 95);
        ctx.lineTo(x + 90, base - 50);
        ctx.lineTo(x + 100, base);
      }
      break;
  }
  ctx.lineTo(width * 2, groundY);
  ctx.closePath();
  ctx.fill();
}
