// Pause overlay pushed over the fight scene, with the full controls panel.
import type { GameContext, Scene } from '../engine';
import { drawControlsPanel } from '../render/controlsHelp';
import { HUD_FONT } from '../render/hud';

export interface PauseOptions {
  /** Leave the match (heavy / back). Without it the overlay only resumes. */
  onMenu?: () => void;
  /** Solo play: show the mouse controls and mark P2 as the computer. */
  solo?: boolean;
}

export function createPauseScene(game: GameContext, options: PauseOptions = {}): Scene {
  const solo = options.solo ?? false;
  return {
    enter(): void {
      game.menu.latch();
    },
    exit(): void {
      game.menu.latch();
    },
    update(): void {
      const a = game.menu.actions;
      if (a.pause || a.confirm || game.mouse.takeClick()) {
        game.scenes.pop();
        return;
      }
      if (a.back && options.onMenu) options.onMenu();
    },
    render(ctx): void {
      ctx.save();
      ctx.fillStyle = 'rgba(4,6,14,0.8)';
      ctx.fillRect(0, 0, game.width, game.height);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `italic 800 96px ${HUD_FONT}`;
      ctx.fillText('PAUSED', game.width / 2, 150);
      ctx.fillStyle = '#E8F0FF';
      ctx.font = `italic 800 20px ${HUD_FONT}`;
      ctx.fillText(
        options.onMenu ? 'ESC, LIGHT OR CLICK TO RESUME   ·   HEAVY FOR MENU' : 'ESC, LIGHT OR CLICK TO RESUME',
        game.width / 2,
        215,
      );
      ctx.font = `800 22px ${HUD_FONT}`;
      ctx.fillStyle = '#2FF3E0';
      ctx.fillText('CONTROLS', game.width / 2, 290);
      drawControlsPanel(ctx, game.width / 2, 340, { solo });
      ctx.restore();
    },
  };
}
