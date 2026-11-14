// Clickable action buttons for solo mouse play: BLOCK, DODGE, GRAB, POWER, SPECIAL, ULTIMATE.
// Pure layout and drawing; the solo controller in `src/scenes/mainMenu.ts` reads the hit
// test and feeds the sim. Sits above the meters (y 676), below the fight strip text.
import type { InputFrame } from '../sim/types';
import { HUD_FONT } from './hud';

export type ActionId = 'block' | 'dodge' | 'grab' | 'power' | 'special' | 'ultimate';

export interface ActionButton {
  id: ActionId;
  label: string;
  /** Key hint drawn under the label. */
  hint: string;
  /** Held while the mouse button is down (block, power); others are presses. */
  hold: boolean;
  /** Input fields the button drives. */
  inputs: readonly (keyof InputFrame)[];
}

export const ACTION_BUTTONS: readonly ActionButton[] = [
  { id: 'block', label: 'BLOCK', hint: 'R · or hold back', hold: true, inputs: ['block'] },
  { id: 'dodge', label: 'DODGE', hint: 'T', hold: false, inputs: ['dodge'] },
  { id: 'grab', label: 'GRAB', hint: 'Q · F+G · L+R click', hold: false, inputs: ['grab'] },
  { id: 'power', label: 'POWER', hint: 'hold E · hold G', hold: true, inputs: ['power'] },
  { id: 'special', label: 'SPECIAL', hint: 'H · middle click', hold: false, inputs: ['special'] },
  { id: 'ultimate', label: 'ULTIMATE', hint: 'G+H · full meter', hold: false, inputs: ['heavy', 'special'] },
];

export const BAR_Y = 648;
export const BAR_H = 36;
export const BAR_W = 108;
export const BAR_GAP = 8;
const BAR_TOTAL = ACTION_BUTTONS.length * BAR_W + (ACTION_BUTTONS.length - 1) * BAR_GAP;
const BAR_LEFT = 640 - BAR_TOTAL / 2;

export interface ActionRect { x: number; y: number; w: number; h: number }

export function actionRect(index: number): ActionRect {
  return { x: BAR_LEFT + index * (BAR_W + BAR_GAP), y: BAR_Y - BAR_H / 2, w: BAR_W, h: BAR_H };
}

/** The button under a logical point, or null. */
export function actionAt(x: number, y: number): ActionButton | null {
  for (let k = 0; k < ACTION_BUTTONS.length; k++) {
    const r = actionRect(k);
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return ACTION_BUTTONS[k] ?? null;
  }
  return null;
}

/** True when the cursor is anywhere on the bar strip (movement by cursor is suppressed there). */
export function overActionBar(x: number, y: number): boolean {
  return x >= BAR_LEFT - BAR_GAP && x <= BAR_LEFT + BAR_TOTAL + BAR_GAP && y >= BAR_Y - BAR_H / 2 - 6 && y <= BAR_Y + BAR_H / 2 + 6;
}

export interface ActionBarView {
  hover: ActionId | null;
  /** Buttons currently driving input (pressed or held). */
  active: ReadonlySet<ActionId>;
  /** Grey out the ultimate until the meter is full. */
  ultimateReady: boolean;
  /** Pulse the POWER button while the fighter charges. */
  charging: boolean;
  accent: string;
  frame: number;
}

export function drawActionBar(ctx: CanvasRenderingContext2D, v: ActionBarView): void {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ACTION_BUTTONS.forEach((b, k) => {
    const r = actionRect(k);
    const disabled = b.id === 'ultimate' && !v.ultimateReady;
    const on = v.active.has(b.id) || (b.id === 'power' && v.charging);
    const hover = v.hover === b.id;
    const pulse = on && (b.id === 'power' || b.id === 'block') ? 0.75 + 0.25 * Math.sin(v.frame * 0.25) : 1;
    ctx.globalAlpha = disabled ? 0.35 : 1;
    // Wide low-alpha glow under a thin bright edge (no shadowBlur).
    ctx.fillStyle = on ? v.accent : hover ? 'rgba(232,240,255,0.16)' : 'rgba(10,16,32,0.78)';
    if (on) ctx.globalAlpha *= pulse;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.globalAlpha = disabled ? 0.35 : 1;
    ctx.lineWidth = 4;
    ctx.strokeStyle = on ? v.accent : 'rgba(47,243,224,0.12)';
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = on || hover ? '#FFFFFF' : v.accent;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = on ? '#070A14' : '#FFFFFF';
    ctx.font = `italic 800 15px ${HUD_FONT}`;
    ctx.fillText(b.label, r.x + r.w / 2, r.y + 12);
    ctx.fillStyle = on ? '#070A14' : '#AAB4D0';
    ctx.font = `600 9.5px ${HUD_FONT}`;
    ctx.fillText(b.hint, r.x + r.w / 2, r.y + 27);
  });
  ctx.restore();
}
