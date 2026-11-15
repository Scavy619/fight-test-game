// Pause overlay pushed over the fight scene: the controls panel, plus a move list page for each
// hero (left/right switches pages). Every move shows its input, what it does and how to counter it.
import { MOVE_SLOTS } from '../sim';
import type { MoveInfo } from '../content/types';
import type { GameContext, Scene } from '../engine';
import { drawControlsPanel } from '../render/controlsHelp';
import { HUD_FONT } from '../render/hud';
import { drawWrapped } from '../render/text';

export interface PausePage {
  title: string;
  moves: readonly MoveInfo[];
}

export interface PauseOptions {
  /** Leave the match (heavy / back). Without it the overlay only resumes. */
  onMenu?: () => void;
  /** Solo play: show the mouse controls and mark P2 as the computer. */
  solo?: boolean;
  /** Move list pages after the controls page. */
  pages?: readonly PausePage[];
}

/** Move list pages for the fighters that carry a hero profile. */
export function movePages(fighters: readonly object[]): PausePage[] {
  const out: PausePage[] = [];
  fighters.forEach((f, k) => {
    const profile = (f as { profile?: { moves: Partial<Record<string, MoveInfo>> }; def?: { name?: string } }).profile;
    if (!profile) return;
    const name = (f as { def: { name: string } }).def.name;
    const moves = MOVE_SLOTS.map((s) => profile.moves[s]).filter((m): m is MoveInfo => m !== undefined);
    out.push({ title: `${k === 0 ? 'PLAYER 1' : 'PLAYER 2'} · ${name.toUpperCase()} · MOVES`, moves });
  });
  return out;
}

export function createPauseScene(game: GameContext, options: PauseOptions = {}): Scene {
  const solo = options.solo ?? false;
  const pages = options.pages ?? [];
  let page = 0; // 0 = controls, 1.. = pages
  return {
    enter(): void {
      game.menu.latch();
    },
    exit(): void {
      game.menu.latch();
    },
    update(): void {
      const a = game.menu.actions;
      const n = pages.length + 1;
      if (a.right) page = (page + 1) % n;
      if (a.left) page = (page + n - 1) % n;
      if (a.pause || a.confirm || game.mouse.takeClick()) {
        game.scenes.pop();
        return;
      }
      if (a.back && options.onMenu) options.onMenu();
    },
    render(ctx): void {
      ctx.save();
      ctx.fillStyle = 'rgba(4,6,14,0.86)';
      ctx.fillRect(0, 0, game.width, game.height);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `italic 800 ${page === 0 ? 96 : 56}px ${HUD_FONT}`;
      ctx.fillText('PAUSED', game.width / 2, page === 0 ? 150 : 50);
      ctx.fillStyle = '#E8F0FF';
      ctx.font = `italic 800 20px ${HUD_FONT}`;
      const resume = options.onMenu ? 'ESC, LIGHT OR CLICK TO RESUME   ·   HEAVY FOR MENU' : 'ESC, LIGHT OR CLICK TO RESUME';
      ctx.fillText(resume, game.width / 2, page === 0 ? 215 : 92);
      if (pages.length > 0) {
        ctx.font = `700 14px ${HUD_FONT}`;
        ctx.fillStyle = '#5A6684';
        ctx.fillText(`LEFT / RIGHT: PAGE ${page + 1} OF ${pages.length + 1}`, game.width / 2, 700);
      }
      if (page === 0) {
        ctx.font = `800 22px ${HUD_FONT}`;
        ctx.fillStyle = '#2FF3E0';
        ctx.fillText('CONTROLS', game.width / 2, 290);
        drawControlsPanel(ctx, game.width / 2, 340, { solo });
      } else {
        const p = pages[page - 1];
        if (p) {
          ctx.font = `800 22px ${HUD_FONT}`;
          ctx.fillStyle = '#2FF3E0';
          ctx.fillText(p.title, game.width / 2, 130);
          ctx.textAlign = 'left';
          const rowH = Math.min(46, 520 / Math.max(1, p.moves.length));
          p.moves.forEach((m, k) => {
            const y = 160 + k * rowH;
            ctx.textBaseline = 'top';
            ctx.font = `700 15px ${HUD_FONT}`;
            ctx.fillStyle = '#2FF3E0';
            ctx.fillText(m.name, 120, y, 220);
            ctx.fillStyle = '#5A6684';
            ctx.fillText(m.input, 120, y + 18, 220);
            ctx.font = `600 14px ${HUD_FONT}`;
            ctx.fillStyle = '#C8D2F0';
            drawWrapped(ctx, m.counterplay ? `${m.description} Counter: ${m.counterplay}` : m.description, 360, y, 800, 17, 2);
          });
        }
      }
      ctx.restore();
    },
  };
}
