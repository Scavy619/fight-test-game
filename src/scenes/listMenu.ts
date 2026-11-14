// Shared vertical list menu: keyboard up/down + confirm/back, mouse hover + click, pad.
// Scenes compose it: `update()` returns the chosen item id (or 'back'), `draw()` renders.
import type { GameContext } from '../engine';
import { HUD_FONT } from '../render/hud';

export interface ListItem {
  id: string;
  label: string;
  hint?: string;
  /** Disabled items show their hint greyed and cannot be chosen. */
  enabled?: boolean;
}

export interface ListMenuOptions {
  x?: number;
  y0?: number;
  step?: number;
  w?: number;
  h?: number;
  /** Font size of the labels. */
  size?: number;
}

export const MENU_CYAN = '#2FF3E0';
export const MENU_DIM = '#5A6684';
export const MENU_TEXT = '#C8D2F0';

export class ListMenu {
  index = 0;
  private pulse = 0;
  private readonly x: number;
  private readonly y0: number;
  private readonly step: number;
  private readonly w: number;
  private readonly h: number;
  private readonly size: number;

  constructor(
    private readonly game: GameContext,
    public items: ListItem[],
    o: ListMenuOptions = {},
  ) {
    this.x = o.x ?? 640;
    this.y0 = o.y0 ?? 300;
    this.step = o.step ?? 52;
    this.w = o.w ?? 460;
    this.h = o.h ?? 46;
    this.size = o.size ?? 30;
    this.index = Math.max(0, items.findIndex((i) => i.enabled !== false));
  }

  private itemAt(x: number, y: number): number {
    for (let k = 0; k < this.items.length; k++) {
      const top = this.y0 + k * this.step - this.h / 2;
      if (x >= this.x - this.w / 2 && x <= this.x + this.w / 2 && y >= top && y <= top + this.h) return k;
    }
    return -1;
  }

  private move(dir: 1 | -1): void {
    const n = this.items.length;
    for (let k = 1; k <= n; k++) {
      const j = (this.index + dir * k + n * k) % n;
      if (this.items[j]?.enabled !== false) {
        this.index = j;
        return;
      }
    }
  }

  /** Call once per step. Returns the chosen item id, 'back', or null. */
  update(): string | null {
    this.pulse += 1;
    const a = this.game.menu.actions;
    if (a.up) this.move(-1);
    if (a.down) this.move(1);
    const m = this.game.mouse.state;
    const hover = m.active ? this.itemAt(m.x, m.y) : -1;
    if (hover >= 0 && this.items[hover]?.enabled !== false) this.index = hover;
    const clicked = this.game.mouse.takeClick();
    if (a.back) return 'back';
    const item = this.items[this.index];
    if (item && item.enabled !== false && (a.confirm || (clicked && hover === this.index))) {
      this.game.menu.latch();
      return item.id;
    }
    return null;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    this.items.forEach((it, k) => {
      const y = this.y0 + k * this.step;
      const on = k === this.index;
      const off = it.enabled === false;
      if (on) {
        const glow = 0.1 + 0.05 * Math.sin(this.pulse * 0.1);
        ctx.fillStyle = `rgba(47,243,224,${glow.toFixed(3)})`;
        ctx.fillRect(this.x - this.w / 2, y - this.h / 2, this.w, this.h);
        ctx.fillStyle = MENU_CYAN;
        ctx.fillRect(this.x - this.w / 2, y - this.h / 2, 4, this.h);
      }
      ctx.font = `italic 800 ${this.size}px ${HUD_FONT}`;
      ctx.fillStyle = off ? 'rgba(90,102,132,0.55)' : on ? '#FFFFFF' : MENU_DIM;
      ctx.fillText(it.label, this.x, y);
    });
    ctx.restore();
  }

  /** Hint of the highlighted item. */
  get hint(): string {
    return this.items[this.index]?.hint ?? '';
  }
}

/** Shared screen chrome: dark backdrop with the floor grid glow. */
export function drawMenuBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = '#070A14';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(47,243,224,0.08)';
  ctx.lineWidth = 1;
  for (let k = 0; k < 12; k++) {
    const y = 560 + k * 14 + (k * k) / 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
}

/** The ASTRA wordmark: wide low-alpha stroke under the bright fill (no shadowBlur). */
export function drawTitle(ctx: CanvasRenderingContext2D, x: number, y: number, size = 110, text = 'ASTRA'): void {
  ctx.save();
  ctx.font = `italic 800 ${size}px ${HUD_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.16;
  ctx.strokeStyle = 'rgba(255,170,60,0.18)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = '#FFD27A';
  ctx.fillText(text, x, y);
  ctx.restore();
}

export const ADAPTATION_NOTICE = 'A fictional fantasy adaptation inspired by epic traditions. Not a retelling of any tradition or regional version.';

export function drawNotice(ctx: CanvasRenderingContext2D, x: number, y: number, size = 13): void {
  ctx.save();
  ctx.font = `600 ${size}px ${HUD_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = MENU_DIM;
  ctx.fillText(ADAPTATION_NOTICE, x, y);
  ctx.restore();
}
