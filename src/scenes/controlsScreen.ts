// Controls screen: shown from the main menu and automatically before the first fight.
import type { GameContext, Scene } from '../engine';
import { drawControlsPanel } from '../render/controlsHelp';
import { HUD_FONT } from '../render/hud';
import { MENU_CYAN, MENU_DIM, drawMenuBackdrop, drawTitle } from './listMenu';

export interface ControlsScreenOptions {
  /** Solo controls (mouse column) rather than two-player. */
  solo: boolean;
  onDone: () => void;
}

export function createControlsScreen(game: GameContext, o: ControlsScreenOptions): Scene {
  let frame = 0;
  return {
    enter(): void {
      game.menu.latch();
      game.mouse.takeClick();
    },
    update(): void {
      frame += 1;
      const a = game.menu.actions;
      // Any menu button or a click continues (after a few frames so a held key does not skip it).
      if (frame > 10 && (a.confirm || a.back || a.pause || game.mouse.takeClick())) {
        game.menu.latch();
        game.save.update((d) => {
          d.seenControls = true;
        });
        o.onDone();
      }
    },
    render(ctx): void {
      ctx.save();
      drawMenuBackdrop(ctx, game.width, game.height);
      drawTitle(ctx, game.width / 2, 92, 64, 'CONTROLS');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `600 16px ${HUD_FONT}`;
      ctx.fillStyle = MENU_DIM;
      ctx.fillText(
        o.solo ? 'Keyboard, mouse or gamepad. Click the action bar during a fight for the rest.' : 'Two players on one keyboard, or a gamepad each.',
        game.width / 2,
        140,
      );
      const bottom = drawControlsPanel(ctx, game.width / 2, 200, { solo: o.solo });
      ctx.font = `600 15px ${HUD_FONT}`;
      ctx.fillStyle = '#C8D2F0';
      const tips = [
        'Attacks show a wind-up, a strike and a recovery: big moves are slow to start and slow to recover, so they can be answered.',
        'Status effects are named over the fighter: SHIELD, ARMOR, SLOWED, STANCE, CHARGING.',
        'Esc pauses and shows this list again.',
      ];
      tips.forEach((t, k) => ctx.fillText(t, game.width / 2, bottom + 30 + k * 22));
      const blink = 0.55 + 0.45 * Math.sin(frame * 0.12);
      ctx.globalAlpha = blink;
      ctx.font = `italic 800 20px ${HUD_FONT}`;
      ctx.fillStyle = MENU_CYAN;
      ctx.fillText('LIGHT, ENTER OR CLICK TO CONTINUE', game.width / 2, 668);
      ctx.restore();
    },
  };
}
