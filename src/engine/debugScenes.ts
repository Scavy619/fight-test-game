import type { GameContext } from './context';
import { INPUT_KEYS } from './input';
import type { MenuActions } from './menu';
import type { Scene } from './scenes';

const BG = '#070A14';
const CYAN = '#2FF3E0';
const DIM = '#26304A';
const TEXT = '#C8D2F0';

/** The scaffold's placeholder title card, as a scene. Replaced by the real title in task 6. */
export function createPlaceholderTitleScene(game: GameContext): Scene {
  return {
    update(): void {},
    render(ctx): void {
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, game.width, game.height);
      ctx.fillStyle = CYAN;
      ctx.font = "italic 800 96px 'Segoe UI', system-ui, sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('MYTHIC NEON', game.width / 2, game.height / 2);
    },
  };
}

const MENU_KEYS: readonly (keyof MenuActions)[] = ['up', 'down', 'left', 'right', 'confirm', 'back', 'pause'];

/**
 * Debug view (`?debug=input`): both players' live InputFrames, combined and per-player
 * menu actions (latched for 12 steps so single-step edges are visible), and steps/second.
 */
export function createInputDebugScene(game: GameContext): Scene {
  const MENU_HOLD = 12;
  const menuGlow: Record<string, number> = {};
  let steps = 0;
  let sps = 0;
  let windowStart = performance.now();

  const box = (ctx: CanvasRenderingContext2D, x: number, y: number, label: string, on: boolean): void => {
    ctx.fillStyle = on ? CYAN : DIM;
    ctx.fillRect(x, y, 96, 40);
    ctx.fillStyle = on ? BG : TEXT;
    ctx.font = "600 16px 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + 48, y + 20);
  };

  const heading = (ctx: CanvasRenderingContext2D, x: number, y: number, text: string): void => {
    ctx.fillStyle = TEXT;
    ctx.font = "700 20px 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  };

  return {
    update(): void {
      steps++;
      const sources: [string, Readonly<MenuActions>][] = [
        ['all', game.menu.actions],
        ['p1', game.menu.player(0)],
        ['p2', game.menu.player(1)],
      ];
      for (const [id, actions] of sources) {
        for (const k of MENU_KEYS) {
          const key = `${id}.${k}`;
          if (actions[k]) menuGlow[key] = MENU_HOLD;
          else if ((menuGlow[key] ?? 0) > 0) menuGlow[key] = (menuGlow[key] ?? 0) - 1;
        }
      }
    },
    render(ctx): void {
      const now = performance.now();
      if (now - windowStart >= 1000) {
        sps = Math.round((steps * 1000) / (now - windowStart));
        steps = 0;
        windowStart = now;
      }
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, game.width, game.height);
      heading(ctx, 40, 40, `INPUT DEBUG   steps/s: ${sps}`);

      const frames = game.input.frames;
      for (const p of [0, 1] as const) {
        const y = 100 + p * 120;
        heading(ctx, 40, y, `P${p + 1} InputFrame`);
        INPUT_KEYS.forEach((k, i) => box(ctx, 40 + i * 106, y + 20, k, frames[p][k]));
      }

      const rows: [string, string][] = [['all', 'Menu (combined)'], ['p1', 'Menu (P1)'], ['p2', 'Menu (P2)']];
      rows.forEach(([id, label], r) => {
        const y = 360 + r * 100;
        heading(ctx, 40, y, label);
        MENU_KEYS.forEach((k, i) => box(ctx, 40 + i * 106, y + 20, k, (menuGlow[`${id}.${k}`] ?? 0) > 0));
      });
    },
  };
}
