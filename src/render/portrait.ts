// Procedural portraits: a hero's rig in a card, used by character select, the gallery and
// campaign cards. No image assets: the same FighterView that fights draws the portrait.
import type { FighterEntry } from '../content/types';
import { samplePose } from './anim';
import { baseAnims } from './anims/base';
import { rgba } from './color';
import { createFighterView, type FighterView } from './fighterView';
import { HUD_FONT } from './hud';
import type { Pose } from './types';

const views = new WeakMap<FighterEntry, FighterView>();
const poses = new WeakMap<FighterEntry, Pose>();

export interface PortraitOptions {
  /** Animation id to sample (default the entry's `intro`, else `idle`). */
  animId?: string;
  /** Greyed, with a lock glyph. */
  locked?: boolean;
  /** Highlighted frame. */
  selected?: boolean;
  /** Facing; -1 mirrors (P2 side). */
  facing?: 1 | -1;
}

/**
 * Draws the hero in a rounded card at (x, y) of size w by h, animating with `frame`.
 * The card has an accent backdrop; callers draw names and text around it.
 */
export function drawPortrait(
  ctx: CanvasRenderingContext2D,
  entry: FighterEntry,
  x: number,
  y: number,
  w: number,
  h: number,
  frame: number,
  o: PortraitOptions = {},
): void {
  let view = views.get(entry);
  if (!view) {
    view = createFighterView(entry.look);
    views.set(entry, view);
  }
  const id = o.animId ?? (entry.anims.intro ? 'intro' : 'idle');
  const anim = entry.anims[id] ?? baseAnims[id] ?? entry.anims.idle ?? baseAnims.idle;
  let pose = poses.get(entry);
  if (!pose) {
    pose = samplePose(anim ?? baseAnims.idle!, 0);
    poses.set(entry, pose);
  }
  if (anim) samplePose(anim, frame, pose);
  const facing = o.facing ?? 1;
  view.update({ pose, x: 0, y: 0, facing, trail: false });

  const accent = entry.look.accent;
  ctx.save();
  // Card.
  roundRect(ctx, x, y, w, h, 10);
  ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, rgba(accent, o.selected ? 0.3 : 0.16));
  g.addColorStop(1, 'rgba(7,10,20,0.95)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  // Floor glow line.
  const floor = y + h * 0.86;
  ctx.strokeStyle = rgba(accent, 0.5);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, floor);
  ctx.lineTo(x + w, floor);
  ctx.stroke();
  // Figure: scale so a height-1 fighter (~190 px) fills about 72% of the card.
  const k = (h * 0.72) / 190;
  ctx.translate(x + w / 2, floor);
  ctx.scale(k, k);
  ctx.globalAlpha = o.locked ? 0.3 : 1;
  view.draw(ctx, 0);
  ctx.restore();

  ctx.save();
  roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 10);
  ctx.strokeStyle = o.selected ? '#FFFFFF' : rgba(accent, 0.7);
  ctx.lineWidth = o.selected ? 2.5 : 1.5;
  ctx.stroke();
  if (o.locked) {
    ctx.font = `800 ${Math.round(h * 0.11)}px ${HUD_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#C8D2F0';
    ctx.fillText('LOCKED', x + w / 2, y + h * 0.5);
  }
  ctx.restore();
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
