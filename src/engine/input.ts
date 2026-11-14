import type { InputFrame } from '../sim/types';
import { EMPTY_INPUT } from '../sim/types';

/** Per-action list of `KeyboardEvent.code` values. */
export type KeyBindings = Record<keyof InputFrame, string[]>;

export const INPUT_KEYS: readonly (keyof InputFrame)[] = [
  'left', 'right', 'up', 'down', 'light', 'heavy', 'special', 'block', 'dodge', 'grab', 'power',
];

export const P1_KEYS: KeyBindings = {
  left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'],
  light: ['KeyF'], heavy: ['KeyG'], special: ['KeyH'], block: ['KeyR'], dodge: ['KeyT'],
  grab: ['KeyQ'], power: ['KeyE'],
};

export const P2_KEYS: KeyBindings = {
  left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'],
  light: ['KeyK', 'Numpad1'], heavy: ['KeyL', 'Numpad2'], special: ['Semicolon', 'Numpad3'],
  block: ['KeyI', 'Numpad4'], dodge: ['KeyO', 'Numpad5'],
  grab: ['KeyU', 'Numpad7'], power: ['KeyP', 'Numpad8'],
};

export const DEFAULT_BINDINGS: readonly [KeyBindings, KeyBindings] = [P1_KEYS, P2_KEYS];

/** Standard-mapping gamepad button indices. */
export const PAD_BUTTONS = {
  A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15,
} as const;

export const PAD_DEADZONE = 0.4;

/** Minimal gamepad shape; the DOM `Gamepad` satisfies it. */
export interface GamepadSnapshot {
  readonly axes: readonly number[];
  readonly buttons: readonly { readonly pressed: boolean }[];
}

/** Left+right held together cancel to neither; same for up+down. Returns a new frame. */
export function cancelOpposites(f: InputFrame): InputFrame {
  const out = { ...f };
  if (out.left && out.right) out.left = out.right = false;
  if (out.up && out.down) out.up = out.down = false;
  return out;
}

/** Held key codes + bindings -> InputFrame. */
export function keysToFrame(held: ReadonlySet<string>, bindings: KeyBindings): InputFrame {
  const out = { ...EMPTY_INPUT };
  for (const k of INPUT_KEYS) out[k] = bindings[k].some((code) => held.has(code));
  return cancelOpposites(out);
}

/** Gamepad snapshot -> InputFrame (left stick with deadzone, or d-pad). */
export function gamepadToFrame(
  pad: GamepadSnapshot | null | undefined,
  deadzone: number = PAD_DEADZONE,
): InputFrame {
  if (!pad) return { ...EMPTY_INPUT };
  const btn = (i: number): boolean => pad.buttons[i]?.pressed ?? false;
  const ax = pad.axes[0] ?? 0;
  const ay = pad.axes[1] ?? 0;
  return cancelOpposites({
    left: ax <= -deadzone || btn(PAD_BUTTONS.LEFT),
    right: ax >= deadzone || btn(PAD_BUTTONS.RIGHT),
    up: ay <= -deadzone || btn(PAD_BUTTONS.UP),
    down: ay >= deadzone || btn(PAD_BUTTONS.DOWN),
    light: btn(PAD_BUTTONS.X),
    heavy: btn(PAD_BUTTONS.Y),
    special: btn(PAD_BUTTONS.B),
    block: btn(PAD_BUTTONS.RB),
    dodge: btn(PAD_BUTTONS.A),
    grab: btn(PAD_BUTTONS.LB),
    power: btn(PAD_BUTTONS.LT),
  });
}

/** OR of two frames, then opposite directions cancel. */
export function mergeFrames(a: InputFrame, b: InputFrame): InputFrame {
  const out = { ...EMPTY_INPUT };
  for (const k of INPUT_KEYS) out[k] = a[k] || b[k];
  return cancelOpposites(out);
}

/** Whether a gamepad's Start button (9) is pressed. */
export function padStartPressed(pad: GamepadSnapshot | null | undefined): boolean {
  return pad?.buttons[PAD_BUTTONS.START]?.pressed ?? false;
}

/** Keys whose default browser action (scrolling) is always suppressed. */
const ALWAYS_PREVENT = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space']);

export interface InputManagerOptions {
  bindings?: readonly [KeyBindings, KeyBindings];
  /** Defaults to `navigator.getGamepads`. */
  getGamepads?: () => readonly (GamepadSnapshot | null)[];
  deadzone?: number;
}

/**
 * Keyboard + gamepad input. Call `attach()` once, then `poll()` once per fixed step.
 * Gamepad 0 drives P1 and gamepad 1 drives P2; the keyboard stays active for both.
 */
export class InputManager {
  private readonly held = new Set<string>();
  private readonly bindings: readonly [KeyBindings, KeyBindings];
  private readonly getPads: () => readonly (GamepadSnapshot | null)[];
  private readonly deadzone: number;
  private readonly bound = new Set<string>();
  private lastFrames: [InputFrame, InputFrame] = [{ ...EMPTY_INPUT }, { ...EMPTY_INPUT }];
  private lastStart: [boolean, boolean] = [false, false];
  private lastPadCount = 0;
  private attached = false;

  constructor(options: InputManagerOptions = {}) {
    this.bindings = options.bindings ?? DEFAULT_BINDINGS;
    this.getPads = options.getGamepads ?? defaultGetGamepads;
    this.deadzone = options.deadzone ?? PAD_DEADZONE;
    for (const b of this.bindings) for (const k of INPUT_KEYS) for (const c of b[k]) this.bound.add(c);
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    this.held.add(e.code);
    if (this.shouldPrevent(e)) e.preventDefault();
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.held.delete(e.code);
    if (this.shouldPrevent(e)) e.preventDefault();
  };

  private readonly onBlur = (): void => {
    this.held.clear();
  };

  private shouldPrevent(e: KeyboardEvent): boolean {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    return this.bound.has(e.code) || ALWAYS_PREVENT.has(e.code);
  }

  attach(target: Window = window): void {
    if (this.attached) return;
    this.attached = true;
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
    target.addEventListener('blur', this.onBlur);
  }

  detach(target: Window = window): void {
    if (!this.attached) return;
    this.attached = false;
    target.removeEventListener('keydown', this.onKeyDown);
    target.removeEventListener('keyup', this.onKeyUp);
    target.removeEventListener('blur', this.onBlur);
    this.held.clear();
  }

  /** Whether a raw `KeyboardEvent.code` is currently held. */
  isKeyDown(code: string): boolean {
    return this.held.has(code);
  }

  /** Samples keyboard and gamepads; call once per fixed step. */
  poll(): [InputFrame, InputFrame] {
    let pads: readonly (GamepadSnapshot | null)[];
    try {
      pads = this.getPads();
    } catch {
      pads = [];
    }
    const frames: [InputFrame, InputFrame] = [
      mergeFrames(keysToFrame(this.held, this.bindings[0]), gamepadToFrame(pads[0], this.deadzone)),
      mergeFrames(keysToFrame(this.held, this.bindings[1]), gamepadToFrame(pads[1], this.deadzone)),
    ];
    this.lastFrames = frames;
    this.lastStart = [padStartPressed(pads[0]), padStartPressed(pads[1])];
    this.lastPadCount = pads.filter((p) => p !== null && p !== undefined).length;
    return frames;
  }

  /** Gamepads seen on the most recent `poll()` (browsers list a pad only after a button press). */
  get connectedPads(): number {
    return this.lastPadCount;
  }

  /** Frames from the most recent `poll()`. */
  get frames(): readonly [InputFrame, InputFrame] {
    return this.lastFrames;
  }

  /** Start-button state per player from the most recent `poll()`. */
  get padStart(): readonly [boolean, boolean] {
    return this.lastStart;
  }
}

function defaultGetGamepads(): readonly (GamepadSnapshot | null)[] {
  if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return [];
  return navigator.getGamepads();
}
