import {
  InputManager,
  MenuInput,
  SceneManager,
  createInputDebugScene,
  createLoop,
  setupCanvas,
  stepGame,
  type GameContext,
} from './engine';
import { REI_LOOK, VIRA_LOOK, baseAnims } from './render';
import { createFightScene } from './scenes';
import { testFighter } from './sim';

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

const game: GameContext = { ctx, width, height, input, scenes, menu: new MenuInput() };

const debug = new URLSearchParams(window.location.search).get('debug');
scenes.set(
  debug === 'input'
    ? createInputDebugScene(game)
    : createFightScene(game, {
        fighters: [
          { def: testFighter, look: REI_LOOK, anims: baseAnims },
          { def: testFighter, look: VIRA_LOOK, anims: baseAnims },
        ],
      }),
);

createLoop({
  update: () => stepGame(game),
  render: (alpha) => scenes.render(ctx, alpha),
}).start();
