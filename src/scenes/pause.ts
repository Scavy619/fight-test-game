// Minimal pause overlay pushed over the fight scene.
import type { GameContext, Scene } from '../engine';
import { HUD_FONT } from '../render/hud';

export function createPauseScene(game: GameContext): Scene {
  return {
    enter(): void {
      game.menu.latch();
    },
    exit(): void {
      game.menu.latch();
    },
    update(): void {
      const a = game.menu.actions;
      if (a.pause || a.confirm) game.scenes.pop();
    },
    render(ctx): void {
      ctx.save();
      ctx.fillStyle = 'rgba(4,6,14,0.7)';
      ctx.fillRect(0, 0, game.width, game.height);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `italic 800 96px ${HUD_FONT}`;
      ctx.fillText('PAUSED', game.width / 2, 320);
      ctx.fillStyle = '#E8F0FF';
      ctx.font = `italic 800 20px ${HUD_FONT}`;
      ctx.fillText('ESC TO RESUME', game.width / 2, 390);
      ctx.restore();
    },
  };
}
