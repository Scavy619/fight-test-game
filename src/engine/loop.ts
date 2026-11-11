export const DEFAULT_STEP_MS = 1000 / 60;
export const DEFAULT_MAX_STEPS = 5;

export interface StepResult {
  /** Fixed steps to run this frame (0..maxSteps). */
  steps: number;
  /** Leftover accumulated time in ms, always in [0, stepMs). */
  acc: number;
}

/**
 * Pure step accounting for a fixed-step accumulator loop.
 * Adds `elapsedMs` to `acc`, returns how many whole steps to run and the leftover.
 * When more than `maxSteps` are owed, the excess whole steps are dropped (only the
 * fractional remainder is kept) so a slow frame cannot cause a spiral of death.
 */
export function accumulate(
  acc: number,
  elapsedMs: number,
  stepMs: number = DEFAULT_STEP_MS,
  maxSteps: number = DEFAULT_MAX_STEPS,
): StepResult {
  const total = Math.max(0, acc) + (Number.isFinite(elapsedMs) && elapsedMs > 0 ? elapsedMs : 0);
  const owed = Math.floor(total / stepMs);
  const left = total - owed * stepMs;
  return { steps: Math.min(owed, maxSteps), acc: left < 0 ? 0 : left };
}

export interface LoopOptions {
  /** Called once per fixed step. */
  update(): void;
  /** Called once per animation frame; `alpha` is leftover/stepMs in [0, 1). */
  render(alpha: number): void;
  stepMs?: number;
  maxSteps?: number;
}

export interface Loop {
  start(): void;
  stop(): void;
}

/**
 * Fixed-step loop driven by requestAnimationFrame. Pauses while the tab is hidden and
 * resets its timestamp on return so no burst of catch-up steps occurs.
 */
export function createLoop(options: LoopOptions): Loop {
  const stepMs = options.stepMs ?? DEFAULT_STEP_MS;
  const maxSteps = options.maxSteps ?? DEFAULT_MAX_STEPS;
  let acc = 0;
  let last = 0;
  let rafId = 0;
  let running = false;

  const frame = (now: number): void => {
    rafId = 0;
    if (!running || document.hidden) return;
    const r = accumulate(acc, now - last, stepMs, maxSteps);
    last = now;
    acc = r.acc;
    for (let i = 0; i < r.steps; i++) options.update();
    options.render(acc / stepMs);
    rafId = requestAnimationFrame(frame);
  };

  const schedule = (): void => {
    if (rafId === 0) rafId = requestAnimationFrame(frame);
  };

  const unschedule = (): void => {
    if (rafId !== 0) cancelAnimationFrame(rafId);
    rafId = 0;
  };

  const onVisibility = (): void => {
    if (!running) return;
    if (document.hidden) {
      unschedule();
    } else {
      last = performance.now();
      acc = 0;
      schedule();
    }
  };

  return {
    start(): void {
      if (running) return;
      running = true;
      last = performance.now();
      acc = 0;
      document.addEventListener('visibilitychange', onVisibility);
      if (!document.hidden) schedule();
    },
    stop(): void {
      if (!running) return;
      running = false;
      unschedule();
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };
}
