import type { InputManager } from './input';
import type { MenuInput } from './menu';
import type { MouseInput } from './mouse';
import type { SceneManager } from './scenes';

/** Shared services every scene receives. */
export interface GameContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  input: InputManager;
  /** Cursor and buttons (solo play and menus); `mouse.state` after each step. */
  mouse: MouseInput;
  scenes: SceneManager;
  menu: MenuInput;
}

/**
 * One fixed step: polls input once (frames are then available as `input.frames`),
 * polls the mouse, updates menu actions, then updates the top scene.
 */
export function stepGame(game: GameContext): void {
  const frames = game.input.poll();
  game.mouse.poll();
  game.menu.update({
    frames,
    enter: game.input.isKeyDown('Enter') || game.input.isKeyDown('NumpadEnter'),
    escape: game.input.isKeyDown('Escape'),
    start: game.input.padStart,
  });
  game.scenes.update();
}
