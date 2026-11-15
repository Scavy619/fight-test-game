// A reusable story card: heading, optional progress dots, optional portraits, wrapped text and a
// list of choices. Arcade (and later the campaign) use it for intros, continues and endings.
import { HEROES, isHeroId } from '../content/heroes';
import type { GameContext, Scene } from '../engine';
import { HUD_FONT } from '../render/hud';
import { drawPortrait } from '../render/portrait';
import { drawWrapped } from '../render/text';
import { ListMenu, MENU_CYAN, MENU_DIM, MENU_TEXT, drawMenuBackdrop, drawNotice, type ListItem } from './listMenu';

export interface CardPortrait {
  heroId: string;
  /** Small label under the portrait, e.g. "YOU" or "RIVAL". */
  caption?: string;
}

export interface CardOptions {
  heading: string;
  /** Smaller line under the heading. */
  subheading?: string;
  /** Wrapped paragraphs. */
  lines?: readonly string[];
  /** One portrait centred, or two (left and right). */
  portraits?: readonly CardPortrait[];
  /** Progress dots: `done` filled, the next one highlighted. */
  progress?: { total: number; done: number };
  items: ListItem[];
  onPick: (id: string) => void;
  /** Called on back/Esc (default: nothing). */
  onBack?: () => void;
  accent?: string;
}

export function createCard(game: GameContext, o: CardOptions): Scene {
  const accent = o.accent ?? MENU_CYAN;
  const hasPortraits = (o.portraits?.length ?? 0) > 0;
  // Choices sit at the bottom of the card.
  const menu = new ListMenu(game, o.items, { y0: 668 - (o.items.length - 1) * 44, step: 44, size: 24, w: 460, h: 38 });
  let frame = 0;

  function drawPortraits(ctx: CanvasRenderingContext2D): void {
    const ps = o.portraits ?? [];
    const w = 210;
    const h = 250;
    const y = 150;
    const xs = ps.length === 1 ? [(game.width - w) / 2] : [250, game.width - 250 - w];
    ps.forEach((p, k) => {
      const entry = isHeroId(p.heroId) ? HEROES[p.heroId] : null;
      const x = xs[k] ?? 0;
      if (entry) drawPortrait(ctx, entry, x, y, w, h, frame, { facing: k === 1 ? -1 : 1 });
      if (p.caption) {
        ctx.font = `800 14px ${HUD_FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = k === 1 ? '#FF4D6D' : '#3DA9FF';
        ctx.fillText(p.caption, x + w / 2, y + h + 16);
      }
    });
    if (ps.length === 2) {
      ctx.font = `italic 800 56px ${HUD_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = MENU_TEXT;
      ctx.fillText('VS', game.width / 2, y + h / 2);
    }
  }

  return {
    enter(): void {
      game.menu.latch();
      game.mouse.takeClick();
    },
    update(): void {
      frame += 1;
      const picked = menu.update();
      if (picked === 'back') o.onBack?.();
      else if (picked) o.onPick(picked);
    },
    render(ctx): void {
      ctx.save();
      drawMenuBackdrop(ctx, game.width, game.height);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `italic 800 44px ${HUD_FONT}`;
      ctx.fillStyle = accent;
      ctx.fillText(o.heading, game.width / 2, 58);
      if (o.subheading) {
        ctx.font = `700 16px ${HUD_FONT}`;
        ctx.fillStyle = MENU_DIM;
        ctx.fillText(o.subheading, game.width / 2, 96);
      }
      if (o.progress) {
        const { total, done } = o.progress;
        const gap = 34;
        const x0 = game.width / 2 - ((total - 1) * gap) / 2;
        for (let k = 0; k < total; k++) {
          ctx.beginPath();
          ctx.arc(x0 + k * gap, 126, 9, 0, Math.PI * 2);
          if (k < done) {
            ctx.fillStyle = accent;
            ctx.fill();
          } else {
            ctx.lineWidth = k === done ? 3 : 1.5;
            ctx.strokeStyle = k === done ? '#FFFFFF' : MENU_DIM;
            ctx.stroke();
          }
        }
      }
      if (hasPortraits) drawPortraits(ctx);
      if (o.lines && o.lines.length > 0) {
        ctx.font = `600 18px ${HUD_FONT}`;
        ctx.fillStyle = MENU_TEXT;
        ctx.textAlign = 'center';
        let y = hasPortraits ? 440 : 170;
        for (const para of o.lines) {
          ctx.textBaseline = 'top';
          y = drawWrapped(ctx, para, game.width / 2, y, 820, 26) + 12;
        }
        ctx.textBaseline = 'middle';
      }
      menu.draw(ctx);
      drawNotice(ctx, game.width / 2, 700, 12);
      ctx.restore();
    },
  };
}
