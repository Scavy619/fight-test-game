import {
  InputManager,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  MenuInput,
  MouseInput,
  SceneManager,
  canvasToLogical,
  createInputDebugScene,
  createLoop,
  setupCanvas,
  stepGame,
  type GameContext,
} from './engine';
import { MODE_OPTIONS, createModeSelectScene, startMode } from './scenes';

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

const game: GameContext = { ctx, width, height, input, mouse, scenes, menu: new MenuInput() };

// `?debug=input` shows live inputs; `?mode=versus|easy|normal|hard` skips the mode select.
const params = new URLSearchParams(window.location.search);
const mode = MODE_OPTIONS.find((o) => o.mode === params.get('mode'))?.mode;
if (params.get('debug') === 'input') scenes.set(createInputDebugScene(game));
else if (mode) startMode(game, mode);
else scenes.set(createModeSelectScene(game));

createLoop({
  update: () => stepGame(game),
  render: (alpha) => scenes.render(ctx, alpha),
}).start();
