export const LOGICAL_WIDTH = 1280;
export const LOGICAL_HEIGHT = 720;

export interface CanvasSetup {
  ctx: CanvasRenderingContext2D;
  width: typeof LOGICAL_WIDTH;
  height: typeof LOGICAL_HEIGHT;
}

/**
 * Sizes the canvas to fit the window with letterboxing (centred, aspect preserved)
 * and applies a transform so drawing code always uses 1280x720 logical units.
 * The transform is reset on resize and devicePixelRatio changes; `onResize` lets
 * the caller redraw after the backing store is cleared.
 */
export function setupCanvas(canvas: HTMLCanvasElement, onResize?: () => void): CanvasSetup {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  const fit = (): void => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.min(vw / LOGICAL_WIDTH, vh / LOGICAL_HEIGHT);
    const cssW = Math.floor(LOGICAL_WIDTH * scale);
    const cssH = Math.floor(LOGICAL_HEIGHT * scale);
    const dpr = window.devicePixelRatio || 1;

    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.style.left = `${Math.floor((vw - cssW) / 2)}px`;
    canvas.style.top = `${Math.floor((vh - cssH) / 2)}px`;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(canvas.width / LOGICAL_WIDTH, 0, 0, canvas.height / LOGICAL_HEIGHT, 0, 0);
    onResize?.();
  };

  const watchDpr = (): void => {
    const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    mq.addEventListener(
      'change',
      () => {
        fit();
        watchDpr();
      },
      { once: true },
    );
  };

  window.addEventListener('resize', fit);
  watchDpr();
  fit();

  return { ctx, width: LOGICAL_WIDTH, height: LOGICAL_HEIGHT };
}
