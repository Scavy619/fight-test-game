// Text tags over a fighter for every status effect (accessibility: never colour alone).
import { inRange, moveFor } from '../sim/moves';
import type { FighterDef, FighterState } from '../sim/types';
import { HUD_FONT } from './hud';

/** Labels a fighter currently carries, most important first. Pure. */
export function statusLabels(f: FighterState, def: FighterDef): string[] {
  const out: string[] = [];
  if (f.shield) out.push(f.shield.label);
  if (f.state === 'attack' && f.move !== null) {
    const m = moveFor(def, f, f.move);
    if (m.armor && inRange(m.armor, f.moveFrame)) out.push('ARMOR');
  }
  if (f.state === 'charge') out.push('CHARGING');
  if (f.slow.frames > 0) out.push('SLOWED');
  if (def.stances) out.push(`STANCE: ${def.stances.names[f.stance] ?? f.stance}`);
  return out;
}

/** Draws the labels stacked above the fighter's head. */
export function drawStatusLabels(
  ctx: CanvasRenderingContext2D,
  f: FighterState,
  def: FighterDef,
  accent: string,
  groundY: number,
): void {
  const labels = statusLabels(f, def);
  if (labels.length === 0) return;
  ctx.save();
  ctx.font = `800 12px ${HUD_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const top = groundY - f.y - def.stats.height - 16;
  labels.forEach((text, k) => {
    const y = top - k * 16;
    const w = ctx.measureText(text).width + 12;
    ctx.fillStyle = 'rgba(7,10,20,0.78)';
    ctx.fillRect(f.x - w / 2, y - 8, w, 16);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.strokeRect(f.x - w / 2 + 0.5, y - 7.5, w - 1, 15);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(text, f.x, y);
  });
  ctx.restore();
}
