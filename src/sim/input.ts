// Edge detection and the press buffer.
import { INPUT_BUFFER_FRAMES } from './constants';
import type { BufferedButton, FighterState, InputFrame, InputState } from './types';
import { EMPTY_INPUT } from './types';

export const BUFFERED_BUTTONS: readonly BufferedButton[] = ['light', 'heavy', 'special', 'dodge'];

export function emptyBuffer(): Record<BufferedButton, number> {
  return { light: 0, heavy: 0, special: 0, dodge: 0 };
}

export function createInputState(): InputState {
  return { held: { ...EMPTY_INPUT }, buffer: emptyBuffer() };
}

/**
 * Records one step of raw input. A newly pressed button is buffered for
 * INPUT_BUFFER_FRAMES steps (the press step included). While the sim is frozen
 * (hitstop, super freeze) presses are still recorded but buffers do not
 * expire. Presses are only buffered when `acceptPresses` (fight phase).
 */
export function recordInput(input: InputState, frame: InputFrame, acceptPresses: boolean, frozen: boolean): void {
  for (const b of BUFFERED_BUTTONS) {
    const pressed = frame[b] && !input.held[b];
    if (pressed && acceptPresses) input.buffer[b] = INPUT_BUFFER_FRAMES;
    else if (!frozen && input.buffer[b] > 0) input.buffer[b] -= 1;
  }
  input.held = { ...frame };
}

export function buffered(f: FighterState, b: BufferedButton): boolean {
  return f.input.buffer[b] > 0;
}

export function consume(f: FighterState, b: BufferedButton): void {
  f.input.buffer[b] = 0;
}

/** Direction toward which the fighter faces is held (and not its opposite). */
export function forwardHeld(f: FighterState, held: InputFrame): boolean {
  return f.facing === 1 ? held.right && !held.left : held.left && !held.right;
}

export function backHeld(f: FighterState, held: InputFrame): boolean {
  return f.facing === 1 ? held.left && !held.right : held.right && !held.left;
}
