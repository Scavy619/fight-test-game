import { describe, expect, it } from 'vitest';
import { SceneManager, type Scene } from './scenes';

const ctx = {} as CanvasRenderingContext2D;

function makeScene(name: string, log: string[], onUpdate?: () => void): Scene {
  return {
    enter: () => log.push(`${name}.enter`),
    exit: () => log.push(`${name}.exit`),
    update: () => {
      log.push(`${name}.update`);
      onUpdate?.();
    },
    render: () => log.push(`${name}.render`),
  };
}

describe('SceneManager', () => {
  it('set enters the scene and replaces the whole stack, exiting top to bottom', () => {
    const log: string[] = [];
    const m = new SceneManager();
    m.set(makeScene('a', log));
    m.push(makeScene('b', log));
    m.set(makeScene('c', log));
    expect(log).toEqual(['a.enter', 'b.enter', 'b.exit', 'a.exit', 'c.enter']);
    expect(m.size).toBe(1);
  });

  it('updates only the top scene and renders all bottom to top', () => {
    const log: string[] = [];
    const m = new SceneManager();
    m.set(makeScene('fight', log));
    m.push(makeScene('pause', log));
    log.length = 0;
    m.update();
    m.render(ctx, 0.5);
    expect(log).toEqual(['pause.update', 'fight.render', 'pause.render']);
  });

  it('push does not exit the scene below; pop exits the top and resumes the one below', () => {
    const log: string[] = [];
    const m = new SceneManager();
    m.set(makeScene('a', log));
    m.push(makeScene('b', log));
    m.pop();
    m.update();
    expect(log).toEqual(['a.enter', 'b.enter', 'b.exit', 'a.update']);
  });

  it('pop on an empty stack is a no-op, and update/render on empty do nothing', () => {
    const m = new SceneManager();
    expect(() => {
      m.pop();
      m.update();
      m.render(ctx, 0);
    }).not.toThrow();
    expect(m.top).toBeUndefined();
  });

  it('defers changes requested during update until the update finishes', () => {
    const log: string[] = [];
    const m = new SceneManager();
    const pause = makeScene('pause', log);
    m.set(makeScene('fight', log, () => {
      m.push(pause);
      log.push('after-push');
    }));
    log.length = 0;
    m.update();
    expect(log).toEqual(['fight.update', 'after-push', 'pause.enter']);
    expect(m.top).toBe(pause);
  });

  it('a scene can pop itself during its own update', () => {
    const log: string[] = [];
    const m = new SceneManager();
    m.set(makeScene('fight', log));
    m.push(makeScene('pause', log, () => m.pop()));
    log.length = 0;
    m.update();
    m.update();
    expect(log).toEqual(['pause.update', 'pause.exit', 'fight.update']);
  });

  it('applies multiple deferred requests in call order', () => {
    const log: string[] = [];
    const m = new SceneManager();
    const c = makeScene('c', log);
    m.set(makeScene('a', log, () => {
      m.set(makeScene('b', log));
      m.push(c);
    }));
    log.length = 0;
    m.update();
    expect(log).toEqual(['a.update', 'a.exit', 'b.enter', 'c.enter']);
    expect(m.size).toBe(2);
    expect(m.top).toBe(c);
  });

  it('changes requested from enter are queued after the current change', () => {
    const log: string[] = [];
    const m = new SceneManager();
    const b = makeScene('b', log);
    m.set({
      enter: () => {
        log.push('a.enter');
        m.push(b);
        log.push('a.enter-done');
      },
      update: () => {},
      render: () => {},
    });
    expect(log).toEqual(['a.enter', 'a.enter-done', 'b.enter']);
    expect(m.top).toBe(b);
  });
});
