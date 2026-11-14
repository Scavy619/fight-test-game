import { describe, expect, it } from 'vitest';
import { EMPTY_INPUT, type InputFrame } from '../sim/types';
import { EdgeButton, MenuInput, NO_MENU_ACTIONS, RepeatButton, type MenuRaw } from './menu';

const frame = (on: Partial<InputFrame> = {}): InputFrame => ({ ...EMPTY_INPUT, ...on });

function raw(p1: Partial<InputFrame> = {}, p2: Partial<InputFrame> = {}, extra: Partial<MenuRaw> = {}): MenuRaw {
  return { frames: [frame(p1), frame(p2)], enter: false, escape: false, start: [false, false], ...extra };
}

describe('EdgeButton', () => {
  it('fires only on the press step', () => {
    const b = new EdgeButton();
    expect([true, true, false, true].map((d) => b.update(d))).toEqual([true, false, false, true]);
  });
});

describe('RepeatButton', () => {
  it('fires on press, after 18 steps, then every 6', () => {
    const b = new RepeatButton();
    const fired: number[] = [];
    for (let t = 0; t < 40; t++) if (b.update(true)) fired.push(t);
    expect(fired).toEqual([0, 18, 24, 30, 36]);
  });

  it('restarts the delay after release', () => {
    const b = new RepeatButton();
    for (let t = 0; t < 20; t++) b.update(true);
    expect(b.update(false)).toBe(false);
    const fired: number[] = [];
    for (let t = 0; t < 20; t++) if (b.update(true)) fired.push(t);
    expect(fired).toEqual([0, 18]);
  });

  it('latch has no effect on a released button', () => {
    const b = new RepeatButton();
    b.latch();
    expect(b.update(true)).toBe(true);
  });

  it('latch suppresses a held button until release', () => {
    const b = new RepeatButton();
    b.update(true);
    b.latch();
    const fired: number[] = [];
    for (let t = 0; t < 30; t++) if (b.update(true)) fired.push(t);
    expect(fired).toEqual([]);
    b.update(false);
    expect(b.update(true)).toBe(true);
  });
});

describe('MenuInput', () => {
  it('starts with no actions', () => {
    expect(new MenuInput().actions).toEqual(NO_MENU_ACTIONS);
  });

  it('dodge (A on a pad) also confirms, for either player', () => {
    const m = new MenuInput();
    m.update(raw({ dodge: true }));
    expect(m.actions.confirm).toBe(true);
    expect(m.player(0).confirm).toBe(true);
    m.update(raw({ dodge: true }));
    expect(m.actions.confirm).toBe(false);
    m.update(raw({}, { dodge: true }));
    expect(m.player(1).confirm).toBe(true);
  });

  it('confirm from either light or Enter, edge-triggered', () => {
    const m = new MenuInput();
    m.update(raw({ light: true }));
    expect(m.actions.confirm).toBe(true);
    m.update(raw({ light: true }));
    expect(m.actions.confirm).toBe(false);
    m.update(raw());
    m.update(raw({}, { light: true }));
    expect(m.actions.confirm).toBe(true);
    m.update(raw());
    m.update(raw({}, {}, { enter: true }));
    expect(m.actions.confirm).toBe(true);
  });

  it('back from either heavy; pause from Escape or either Start', () => {
    const m = new MenuInput();
    m.update(raw({}, { heavy: true }));
    expect(m.actions).toEqual({ ...NO_MENU_ACTIONS, back: true });
    m.update(raw({}, {}, { escape: true }));
    expect(m.actions).toEqual({ ...NO_MENU_ACTIONS, pause: true });
    m.update(raw());
    m.update(raw({}, {}, { start: [false, true] }));
    expect(m.actions.pause).toBe(true);
  });

  it('directions from either player repeat while held', () => {
    const m = new MenuInput();
    const fired: number[] = [];
    for (let t = 0; t < 25; t++) {
      m.update(t < 10 ? raw({ down: true }) : raw({}, { down: true }));
      if (m.actions.down) fired.push(t);
    }
    expect(fired).toEqual([0, 18, 24]);
  });

  it('per-player actions only see that player', () => {
    const m = new MenuInput();
    m.update(raw({ left: true }, { right: true, light: true }));
    expect(m.player(0)).toEqual({ ...NO_MENU_ACTIONS, left: true });
    expect(m.player(1)).toEqual({ ...NO_MENU_ACTIONS, right: true, confirm: true });
    expect(m.actions).toEqual({ ...NO_MENU_ACTIONS, left: true, right: true, confirm: true });
  });

  it('Enter confirms for P1 only; Start pauses only its own player', () => {
    const m = new MenuInput();
    m.update(raw({}, {}, { enter: true, start: [false, true] }));
    expect(m.player(0).confirm).toBe(true);
    expect(m.player(1).confirm).toBe(false);
    expect(m.player(0).pause).toBe(false);
    expect(m.player(1).pause).toBe(true);
  });

  it('latch swallows held buttons until released', () => {
    const m = new MenuInput();
    m.update(raw({ light: true, down: true }));
    m.latch();
    expect(m.actions).toEqual(NO_MENU_ACTIONS);
    let downFired = false;
    for (let t = 0; t < 30; t++) {
      m.update(raw({ light: true, down: true, up: t === 5 }));
      downFired ||= m.actions.down || m.actions.confirm;
      if (t === 5) expect(m.actions).toEqual({ ...NO_MENU_ACTIONS, up: true });
    }
    expect(downFired).toBe(false);
  });
});
