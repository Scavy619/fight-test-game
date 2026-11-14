import { describe, expect, it } from 'vitest';
import { MOUSE_CROUCH_BELOW, MOUSE_DEAD_ZONE, MOUSE_JUMP_HEIGHTS, MouseInput, NO_MOUSE, mouseToFrame } from './mouse';

const GROUND = 600;
const fighter = { x: 400, y: 0, height: 180 };
const at = (x: number, y: number, buttons: Partial<typeof NO_MOUSE> = {}) => ({ ...NO_MOUSE, active: true, x, y, ...buttons });

describe('mouseToFrame', () => {
  it('walks toward the cursor outside the dead zone and stands still inside it', () => {
    expect(mouseToFrame(at(400 + MOUSE_DEAD_ZONE + 1, 500), fighter, GROUND)).toMatchObject({ right: true, left: false });
    expect(mouseToFrame(at(400 - MOUSE_DEAD_ZONE - 1, 500), fighter, GROUND)).toMatchObject({ left: true, right: false });
    expect(mouseToFrame(at(400 + MOUSE_DEAD_ZONE - 1, 500), fighter, GROUND)).toMatchObject({ left: false, right: false });
  });

  it('jumps when the cursor is high above the fighter and crouches below the floor line', () => {
    const jumpY = GROUND - fighter.height * MOUSE_JUMP_HEIGHTS;
    expect(mouseToFrame(at(400, jumpY - 1), fighter, GROUND).up).toBe(true);
    expect(mouseToFrame(at(400, jumpY + 1), fighter, GROUND).up).toBe(false);
    expect(mouseToFrame(at(400, GROUND + MOUSE_CROUCH_BELOW + 1), fighter, GROUND).down).toBe(true);
    expect(mouseToFrame(at(400, GROUND + MOUSE_CROUCH_BELOW - 1), fighter, GROUND).down).toBe(false);
  });

  it('measures the jump zone from the airborne fighter, not the floor', () => {
    // Grounded: zone starts at 600 - 261 = 339. At y = 200 the feet are at 400, zone starts at 139.
    const airborne = { ...fighter, y: 200 };
    expect(mouseToFrame(at(400, 150), fighter, GROUND).up).toBe(true);
    expect(mouseToFrame(at(400, 150), airborne, GROUND).up).toBe(false);
  });

  it('maps buttons and ignores the cursor while inactive', () => {
    const f = mouseToFrame({ ...NO_MOUSE, x: 900, y: 50, light: true, heavy: true, special: true }, fighter, GROUND);
    expect(f).toMatchObject({ light: true, heavy: true, special: true, left: false, right: false, up: false, down: false });
    expect(f.block).toBe(false);
  });
});

describe('MouseInput', () => {
  function harness() {
    const listeners = new Map<string, (e: Event) => void>();
    const target = {
      addEventListener: (type: string, fn: (e: Event) => void) => listeners.set(type, fn),
      removeEventListener: () => {},
    } as unknown as HTMLElement;
    const mouse = new MouseInput((x, y) => ({ x: x * 2, y: y * 2 }));
    // `mouseup` and `blur` are registered on window; route them through the same map.
    const win = globalThis as unknown as { window?: unknown };
    const saved = win.window;
    win.window = target;
    mouse.attach(target);
    win.window = saved;
    const fire = (type: string, init: Partial<MouseEvent>): void => {
      listeners.get(type)?.({ preventDefault: () => {}, ...init } as unknown as Event);
    };
    return { mouse, fire };
  }

  it('keeps a click that is released before the next poll', () => {
    const { mouse, fire } = harness();
    fire('mousedown', { button: 0, clientX: 10, clientY: 20 });
    fire('mouseup', { button: 0 });
    expect(mouse.poll()).toMatchObject({ light: true, x: 20, y: 40, active: true });
    expect(mouse.poll().light).toBe(false);
  });

  it('maps right and middle buttons to heavy and special, and clears on leave', () => {
    const { mouse, fire } = harness();
    fire('mousedown', { button: 2, clientX: 0, clientY: 0 });
    fire('mousedown', { button: 1, clientX: 0, clientY: 0 });
    expect(mouse.poll()).toMatchObject({ heavy: true, special: true, light: false });
    expect(mouse.takeClick()).toBe(true);
    expect(mouse.takeClick()).toBe(false);
    fire('mouseleave', {});
    expect(mouse.poll()).toMatchObject({ heavy: false, special: false, active: false });
  });
});
