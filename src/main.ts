import {
  InputManager,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  MenuInput,
  MouseInput,
  SaveStore,
  SceneManager,
  canvasToLogical,
  createInputDebugScene,
  createLoop,
  setupCanvas,
  stepGame,
  type GameContext,
} from './engine';
import { createMainMenuScene, isMode, startMode } from './scenes';

const canvas = document.getElementById('game');
if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Missing #game canvas');

const scenes = new SceneManager();
// Redraw immediately after a resize clears the backing store. setupCanvas calls this
// synchronously before returning, so it starts as a no-op.
let redraw = (): void => {};
const { ctx, width, height } = setupCanvas(canvas, () => redraw());
redraw = (): void => scenes.render(ctx, 0);

const input = new InputManager();
input.attach();
const mouse = new MouseInput(canvasToLogical(canvas, LOGICAL_WIDTH, LOGICAL_HEIGHT));
mouse.attach(canvas);

const game: GameContext = { ctx, width, height, input, mouse, scenes, menu: new MenuInput(), save: new SaveStore() };

// `?debug=input` shows live inputs; `?mode=versus|easy|normal|hard` skips the menu.
const params = new URLSearchParams(window.location.search);
const mode = params.get('mode');
if (params.get('debug') === 'input') scenes.set(createInputDebugScene(game));
else if (isMode(mode)) startMode(game, mode);
else scenes.set(createMainMenuScene(game));

createLoop({
  update: () => stepGame(game),
  render: (alpha) => scenes.render(ctx, alpha),
}).start();
