import { describe, expect, it } from 'vitest';
import { EMPTY_INPUT, type InputFrame } from '../sim/types';
import {
  gamepadToFrame,
  InputManager,
  keysToFrame,
  mergeFrames,
  P1_KEYS,
  P2_KEYS,
  padStartPressed,
  type GamepadSnapshot,
} from './input';

const frame = (on: Partial<InputFrame>): InputFrame => ({ ...EMPTY_INPUT, ...on });

function pad(opts: { axes?: number[]; pressed?: number[] } = {}): GamepadSnapshot {
  const pressed = new Set(opts.pressed ?? []);
  return {
    axes: opts.axes ?? [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.has(i) })),
  };
}

describe('keysToFrame', () => {
  it('maps every P1 default binding', () => {
    const cases: [string, keyof InputFrame][] = [
      ['KeyA', 'left'], ['KeyD', 'right'], ['KeyW', 'up'], ['KeyS', 'down'],
      ['KeyF', 'light'], ['KeyG', 'heavy'], ['KeyH', 'special'], ['KeyR', 'block'], ['KeyT', 'dodge'],
    ];
    for (const [code, key] of cases) {
      expect(keysToFrame(new Set([code]), P1_KEYS)).toEqual(frame({ [key]: true }));
    }
  });

  it('maps every P2 default binding including numpad mirrors', () => {
    const cases: [string, keyof InputFrame][] = [
      ['ArrowLeft', 'left'], ['ArrowRight', 'right'], ['ArrowUp', 'up'], ['ArrowDown', 'down'],
      ['KeyK', 'light'], ['KeyL', 'heavy'], ['Semicolon', 'special'], ['KeyI', 'block'], ['KeyO', 'dodge'],
      ['Numpad1', 'light'], ['Numpad2', 'heavy'], ['Numpad3', 'special'], ['Numpad4', 'block'], ['Numpad5', 'dodge'],
    ];
    for (const [code, key] of cases) {
      expect(keysToFrame(new Set([code]), P2_KEYS)).toEqual(frame({ [key]: true }));
    }
  });

  it('keeps players separate', () => {
    const held = new Set(['KeyA', 'ArrowRight', 'KeyK']);
    expect(keysToFrame(held, P1_KEYS)).toEqual(frame({ left: true }));
    expect(keysToFrame(held, P2_KEYS)).toEqual(frame({ right: true, light: true }));
  });

  it('cancels left+right and up+down', () => {
    expect(keysToFrame(new Set(['KeyA', 'KeyD', 'KeyF']), P1_KEYS)).toEqual(frame({ light: true }));
    expect(keysToFrame(new Set(['KeyW', 'KeyS', 'KeyA']), P1_KEYS)).toEqual(frame({ left: true }));
  });

  it('returns an empty frame for no keys or unbound keys', () => {
    expect(keysToFrame(new Set(), P1_KEYS)).toEqual(EMPTY_INPUT);
    expect(keysToFrame(new Set(['KeyZ', 'Space']), P1_KEYS)).toEqual(EMPTY_INPUT);
  });

  it('uses custom bindings as data', () => {
    const custom = { ...P1_KEYS, light: ['KeyJ'] };
    expect(keysToFrame(new Set(['KeyJ']), custom)).toEqual(frame({ light: true }));
    expect(keysToFrame(new Set(['KeyF']), custom)).toEqual(EMPTY_INPUT);
  });
});

describe('gamepadToFrame', () => {
  it('returns empty for a missing pad', () => {
    expect(gamepadToFrame(null)).toEqual(EMPTY_INPUT);
    expect(gamepadToFrame(undefined)).toEqual(EMPTY_INPUT);
  });

  it('maps face buttons and RB', () => {
    expect(gamepadToFrame(pad({ pressed: [2] }))).toEqual(frame({ light: true }));
    expect(gamepadToFrame(pad({ pressed: [3] }))).toEqual(frame({ heavy: true }));
    expect(gamepadToFrame(pad({ pressed: [1] }))).toEqual(frame({ special: true }));
    expect(gamepadToFrame(pad({ pressed: [5] }))).toEqual(frame({ block: true }));
    expect(gamepadToFrame(pad({ pressed: [0] }))).toEqual(frame({ dodge: true }));
  });

  it('applies the 0.4 stick deadzone', () => {
    expect(gamepadToFrame(pad({ axes: [0.39, -0.39] }))).toEqual(EMPTY_INPUT);
    expect(gamepadToFrame(pad({ axes: [0.4, 0] }))).toEqual(frame({ right: true }));
    expect(gamepadToFrame(pad({ axes: [-0.8, 0] }))).toEqual(frame({ left: true }));
    expect(gamepadToFrame(pad({ axes: [0, -0.5] }))).toEqual(frame({ up: true }));
    expect(gamepadToFrame(pad({ axes: [0, 0.9] }))).toEqual(frame({ down: true }));
  });

  it('maps the d-pad', () => {
    expect(gamepadToFrame(pad({ pressed: [12] }))).toEqual(frame({ up: true }));
    expect(gamepadToFrame(pad({ pressed: [13] }))).toEqual(frame({ down: true }));
    expect(gamepadToFrame(pad({ pressed: [14] }))).toEqual(frame({ left: true }));
    expect(gamepadToFrame(pad({ pressed: [15] }))).toEqual(frame({ right: true }));
  });

  it('cancels opposite stick and d-pad', () => {
    expect(gamepadToFrame(pad({ axes: [-1, 0], pressed: [15] }))).toEqual(EMPTY_INPUT);
  });

  it('tolerates short button and axis arrays', () => {
    expect(gamepadToFrame({ axes: [], buttons: [] })).toEqual(EMPTY_INPUT);
  });

  it('reads Start', () => {
    expect(padStartPressed(pad({ pressed: [9] }))).toBe(true);
    expect(padStartPressed(pad())).toBe(false);
    expect(padStartPressed(null)).toBe(false);
  });
});

describe('mergeFrames', () => {
  it('ORs the two frames', () => {
    expect(mergeFrames(frame({ left: true }), frame({ light: true }))).toEqual(frame({ left: true, light: true }));
  });

  it('cancels opposites coming from different devices', () => {
    expect(mergeFrames(frame({ left: true }), frame({ right: true, up: true }))).toEqual(frame({ up: true }));
  });
});

describe('InputManager.poll', () => {
  it('assigns pad 0 to P1 and pad 1 to P2, merged with keyboard', () => {
    let pads: (GamepadSnapshot | null)[] = [pad({ pressed: [2] }), pad({ axes: [1, 0] })];
    const im = new InputManager({ getGamepads: () => pads });
    expect(im.poll()).toEqual([frame({ light: true }), frame({ right: true })]);
    pads = [null, pad({ pressed: [9] })];
    expect(im.poll()).toEqual([EMPTY_INPUT, EMPTY_INPUT]);
    expect(im.padStart).toEqual([false, true]);
    expect(im.frames).toEqual([EMPTY_INPUT, EMPTY_INPUT]);
  });

  it('survives a throwing getGamepads', () => {
    const im = new InputManager({
      getGamepads: () => {
        throw new Error('blocked');
      },
    });
    expect(im.poll()).toEqual([EMPTY_INPUT, EMPTY_INPUT]);
  });
});
