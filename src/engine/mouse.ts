// Mouse input for single-player play: the fighter walks toward the cursor, jumps when
// the cursor is high above it, crouches when the cursor is below the floor line, and
// the buttons attack (left light, right heavy, middle special; right + middle = ultimate).
// Block and dodge stay on the keyboard. `mouseToFrame` is the pure mapping.
import type { InputFrame } from '../sim/types';
import { EMPTY_INPUT } from '../sim/types';

export interface MouseSnapshot {
  /** Cursor in logical canvas units (1280x720). */
  x: number;
  y: number;
  /** The cursor is over the canvas and has moved since play began. */
  active: boolean;
  light: boolean;
  heavy: boolean;
  special: boolean;
}

export const NO_MOUSE: Readonly<MouseSnapshot> = { x: 0, y: 0, active: false, light: false, heavy: false, special: false };

/** The fighter does not walk while the cursor is within this many px of its centre. */
export const MOUSE_DEAD_ZONE = 44;
/** Jump when the cursor is higher than this many body heights above the feet. */
export const MOUSE_JUMP_HEIGHTS = 1.45;
/** Crouch when the cursor is this many px below the floor line. */
export const MOUSE_CROUCH_BELOW = 16;

export interface MouseTarget {
  /** Fighter feet centre x (sim). */
  x: number;
  /** Fighter height above ground (sim). */
  y: number;
  /** Body height. */
  height: number;
}

/**
 * Cursor and buttons -> InputFrame. `groundY` is the screen y of the floor line.
 * Screen y grows downward; sim y is height above the floor.
 */
export function mouseToFrame(m: MouseSnapshot, f: MouseTarget, groundY: number): InputFrame {
  const out: InputFrame = { ...EMPTY_INPUT, light: m.light, heavy: m.heavy, special: m.special };
  if (!m.active) return out;
  const dx = m.x - f.x;
  if (dx > MOUSE_DEAD_ZONE) out.right = true;
  else if (dx < -MOUSE_DEAD_ZONE) out.left = true;
  const feetScreenY = groundY - f.y;
  if (m.y < feetScreenY - f.height * MOUSE_JUMP_HEIGHTS) out.up = true;
  else if (m.y > groundY + MOUSE_CROUCH_BELOW) out.down = true;
  return out;
}

/** Converts a client (CSS pixel) point to logical canvas units. */
export type ToLogical = (clientX: number, clientY: number) => { x: number; y: number };

export function canvasToLogical(canvas: HTMLCanvasElement, logicalWidth: number, logicalHeight: number): ToLogical {
  return (clientX, clientY) => {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / r.width) * logicalWidth,
      y: ((clientY - r.top) / r.height) * logicalHeight,
    };
  };
}

const BUTTON_NAMES = ['light', 'special', 'heavy'] as const; // MouseEvent.button 0, 1, 2
type MouseButton = (typeof BUTTON_NAMES)[number];

/**
 * Tracks the cursor and buttons. A click shorter than one fixed step still counts as a
 * press for the next `poll()`, so quick clicks are never lost between steps.
 */
export class MouseInput {
  private x = 0;
  private y = 0;
  private active = false;
  private readonly held = new Set<MouseButton>();
  private readonly pressed = new Set<MouseButton>();
  private clicked = false;
  private last: MouseSnapshot = { ...NO_MOUSE };
  private detachFn: (() => void) | null = null;

  constructor(private readonly toLogical: ToLogical) {}

  attach(target: HTMLElement): void {
    if (this.detachFn) return;
    const onMove = (e: MouseEvent): void => {
      const p = this.toLogical(e.clientX, e.clientY);
      this.x = p.x;
      this.y = p.y;
      this.active = true;
    };
    const onDown = (e: MouseEvent): void => {
      onMove(e);
      const b = BUTTON_NAMES[e.button];
      if (b) {
        this.held.add(b);
        this.pressed.add(b);
      }
      this.clicked = true;
      e.preventDefault();
    };
    const onUp = (e: MouseEvent): void => {
      const b = BUTTON_NAMES[e.button];
      if (b) this.held.delete(b);
    };
    const onLeave = (): void => {
      this.active = false;
      this.held.clear();
    };
    const onContext = (e: Event): void => e.preventDefault();
    target.addEventListener('mousemove', onMove);
    target.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    target.addEventListener('mouseleave', onLeave);
    window.addEventListener('blur', onLeave);
    target.addEventListener('contextmenu', onContext);
    this.detachFn = () => {
      target.removeEventListener('mousemove', onMove);
      target.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      target.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('blur', onLeave);
      target.removeEventListener('contextmenu', onContext);
    };
  }

  detach(): void {
    this.detachFn?.();
    this.detachFn = null;
    this.held.clear();
    this.pressed.clear();
    this.active = false;
  }

  /** Samples the mouse; call once per fixed step. Presses since the last poll count as held. */
  poll(): MouseSnapshot {
    const down = (b: MouseButton): boolean => this.held.has(b) || this.pressed.has(b);
    this.last = {
      x: this.x, y: this.y, active: this.active,
      light: down('light'), heavy: down('heavy'), special: down('special'),
    };
    this.pressed.clear();
    return this.last;
  }

  /** Snapshot from the most recent `poll()`. */
  get state(): Readonly<MouseSnapshot> {
    return this.last;
  }

  /** True once per `mousedown` of any button (menus use it as "click"); cleared when read. */
  takeClick(): boolean {
    const c = this.clicked;
    this.clicked = false;
    return c;
  }
}
