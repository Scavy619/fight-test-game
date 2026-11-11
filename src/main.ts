import { setupCanvas } from './engine/canvas';

const canvas = document.getElementById('game');
if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Missing #game canvas');

let draw = (): void => {};
const { ctx, width, height } = setupCanvas(canvas, () => draw());

draw = (): void => {
  ctx.fillStyle = '#070A14';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#2FF3E0';
  ctx.font = "italic 800 96px 'Segoe UI', system-ui, sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MYTHIC NEON', width / 2, height / 2);
};
draw();
