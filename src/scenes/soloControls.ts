// The human side of solo play: keyboard (both sets) and pad merged with the mouse, plus the
// clickable action bar. Used by the CPU matches and Practice.
import { mergeFrames, mouseToFrame, type GameContext } from '../engine';
import { actionAt, drawActionBar, overActionBar, type ActionId } from '../render/actionBar';
import { GROUND_Y } from '../render/stage';
import { EMPTY_INPUT, METER_MAX, type InputFrame, type Match } from '../sim';
import type { Controller } from './fight';

interface BarState {
  hover: ActionId | null;
  active: Set<ActionId>;
}

export interface SoloHuman {
  controller: Controller;
  /** Draws the action bar; pass as `FightConfig.overlay` (or call it from a wrapping overlay). */
  overlay: (ctx: CanvasRenderingContext2D, match: Match) => void;
}

/**
 * Over the action bar the cursor stops steering the fighter and the left button presses or
 * holds the hovered action; elsewhere the cursor walks, jumps and crouches (see mouse.ts).
 */
export function createSoloHuman(game: GameContext, accent: string): SoloHuman {
  const bar: BarState = { hover: null, active: new Set() };
  const controller: Controller = (match, i) => {
    const f = match.state.fighters[i];
    const m = game.mouse.state;
    const onBar = m.active && overActionBar(m.x, m.y);
    const hovered = onBar ? actionAt(m.x, m.y) : null;
    bar.hover = hovered?.id ?? null;
    bar.active.clear();
    let mouse: InputFrame;
    if (onBar) {
      mouse = { ...EMPTY_INPUT };
      if (hovered && m.light) {
        for (const k of hovered.inputs) mouse[k] = true;
        bar.active.add(hovered.id);
      }
    } else {
      mouse = mouseToFrame(m, { x: f.x, y: f.y, height: match.defs[i].stats.height }, GROUND_Y);
    }
    // Solo: both keyboard sets and any gamepad drive the human (P2's inputs are otherwise unused).
    return mergeFrames(mergeFrames(game.input.frames[0], game.input.frames[1]), mouse);
  };
  const overlay = (ctx: CanvasRenderingContext2D, match: Match): void => {
    const f = match.state.fighters[0];
    drawActionBar(ctx, {
      hover: bar.hover,
      active: bar.active,
      ultimateReady: f.meter >= METER_MAX,
      charging: f.state === 'charge',
      accent,
      frame: match.state.frame,
    });
  };
  return { controller, overlay };
}
