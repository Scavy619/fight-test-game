import type { InputFrame } from '../sim/types';

export interface MenuActions {
  up: boolean; down: boolean; left: boolean; right: boolean;
  confirm: boolean; back: boolean; pause: boolean;
}

export const NO_MENU_ACTIONS: Readonly<MenuActions> = {
  up: false, down: false, left: false, right: false,
  confirm: false, back: false, pause: false,
};

/** Raw per-step input the menu helper reads. */
export interface MenuRaw {
  frames: readonly [InputFrame, InputFrame];
  enter: boolean;
  escape: boolean;
  /** Gamepad Start (button 9) per player. */
  start: readonly [boolean, boolean];
}

/** Steps a direction must be held before the first repeat. */
export const REPEAT_DELAY = 18;
/** Steps between later repeats. */
export const REPEAT_INTERVAL = 6;

/** Edge detector: true only on the step a button goes from up to down. */
export class EdgeButton {
  private prev = false;
  update(down: boolean): boolean {
    const fired = down && !this.prev;
    this.prev = down;
    return fired;
  }
}

/** Edge with auto-repeat: fires on press, after `delay` steps, then every `interval` steps. */
export class RepeatButton {
  private held = 0;
  private latched = false;
  constructor(
    private readonly delay: number = REPEAT_DELAY,
    private readonly interval: number = REPEAT_INTERVAL,
  ) {}
  update(down: boolean): boolean {
    if (!down) {
      this.held = 0;
      this.latched = false;
      return false;
    }
    if (this.latched) return false;
    const t = this.held++;
    return t === 0 || (t >= this.delay && (t - this.delay) % this.interval === 0);
  }
  /** If currently held, stop firing (including repeats) until it is released. */
  latch(): void {
    if (this.held > 0) this.latched = true;
  }
}

class ActionTracker {
  private readonly up = new RepeatButton();
  private readonly down = new RepeatButton();
  private readonly left = new RepeatButton();
  private readonly right = new RepeatButton();
  private readonly confirm = new EdgeButton();
  private readonly back = new EdgeButton();
  private readonly pause = new EdgeButton();
  current: MenuActions = { ...NO_MENU_ACTIONS };

  update(held: MenuActions): void {
    this.current = {
      up: this.up.update(held.up),
      down: this.down.update(held.down),
      left: this.left.update(held.left),
      right: this.right.update(held.right),
      confirm: this.confirm.update(held.confirm),
      back: this.back.update(held.back),
      pause: this.pause.update(held.pause),
    };
  }

  latch(): void {
    // Edge buttons never refire while held, so only the repeating directions need latching.
    for (const b of [this.up, this.down, this.left, this.right]) b.latch();
    this.current = { ...NO_MENU_ACTIONS };
  }
}

/**
 * Per-step, edge-triggered menu actions.
 * Combined: either player's directions; confirm = either light or Enter; back = either heavy;
 * pause = Escape or either pad's Start.
 * Per player (`player(i)`): that player's directions, light (P1 also Enter), heavy,
 * and pause = Escape or that player's pad Start.
 */
export class MenuInput {
  private readonly all = new ActionTracker();
  private readonly perPlayer: [ActionTracker, ActionTracker] = [new ActionTracker(), new ActionTracker()];

  update(raw: MenuRaw): void {
    const [a, b] = raw.frames;
    this.all.update({
      up: a.up || b.up,
      down: a.down || b.down,
      left: a.left || b.left,
      right: a.right || b.right,
      confirm: a.light || b.light || raw.enter,
      back: a.heavy || b.heavy,
      pause: raw.escape || raw.start[0] || raw.start[1],
    });
    for (const i of [0, 1] as const) {
      const f = raw.frames[i];
      this.perPlayer[i].update({
        up: f.up,
        down: f.down,
        left: f.left,
        right: f.right,
        confirm: f.light || (i === 0 && raw.enter),
        back: f.heavy,
        pause: raw.escape || raw.start[i],
      });
    }
  }

  /** Combined actions for this step. */
  get actions(): Readonly<MenuActions> {
    return this.all.current;
  }

  /** One player's actions for this step (0 = P1, 1 = P2). */
  player(index: 0 | 1): Readonly<MenuActions> {
    return this.perPlayer[index].current;
  }

  /**
   * Ignores everything currently held until it is released, e.g. on a scene change so a
   * confirm press does not carry into the next menu. Clears this step's actions.
   */
  latch(): void {
    this.all.latch();
    this.perPlayer[0].latch();
    this.perPlayer[1].latch();
  }
}
