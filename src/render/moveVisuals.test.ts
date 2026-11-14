import { describe, expect, it } from 'vitest';
import { DEFAULT_VISUAL_LIFE, MoveVisuals, placeVisual, type VisualSpec } from './moveVisuals';

/** Canvas stand-in that accepts every call and property write. */
function fakeCtx(): { ctx: CanvasRenderingContext2D; calls: string[] } {
  const calls: string[] = [];
  const target: Record<string, unknown> = {};
  const ctx = new Proxy(target, {
    get(t, prop: string) {
      if (prop in t) return t[prop];
      return (...args: unknown[]) => {
        calls.push(`${prop}(${args.length})`);
      };
    },
    set(t, prop: string, value: unknown) {
      t[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

const column: VisualSpec = { kind: 'column', x: 120, width: 60 };
const burst: VisualSpec = { kind: 'burst', x: 10, y: 80, radius: 50 };
const streak: VisualSpec = { kind: 'streak', x: -20, y: 100, length: 240 };

describe('placeVisual', () => {
  it('positions relative to the fighter origin, mirrored by facing', () => {
    expect(placeVisual(column, 500, 0, 1, '#FF8A2A')).toMatchObject({ kind: 'column', x: 620, y: 0, size: 60 });
    expect(placeVisual(column, 500, 0, -1, '#FF8A2A')).toMatchObject({ x: 380 });
    expect(placeVisual(burst, 500, 40, -1, '#2FF3E0')).toMatchObject({ x: 490, y: 120, size: 50 });
    expect(placeVisual(streak, 500, 0, 1, '#2FF3E0')).toMatchObject({ x: 480, y: 100, size: 240 });
    expect(placeVisual(streak, 500, 0, -1, '#2FF3E0')).toMatchObject({ x: 520, size: -240 });
  });

  it('columns stand on the ground even when spawned in the air', () => {
    expect(placeVisual(column, 500, 120, 1, '#FFFFFF').y).toBe(0);
  });

  it('uses the accent unless the spec sets a colour, and default lifetimes', () => {
    const a = placeVisual(burst, 0, 0, 1, '#FF0000');
    const b = placeVisual({ ...burst, color: '#00FF00', life: 30 }, 0, 0, 1, '#FF0000');
    expect(a.mid).toContain('255,0,0');
    expect(b.mid).toContain('0,255,0');
    expect(a.life).toBe(DEFAULT_VISUAL_LIFE.burst);
    expect(b.life).toBe(30);
  });
});

describe('MoveVisuals', () => {
  it('expires each visual after its lifetime', () => {
    const v = new MoveVisuals();
    v.spawn(column, 0, 0, 1, '#FFFFFF');
    v.spawn({ ...burst, life: 3 }, 0, 0, 1, '#FFFFFF');
    expect(v.count).toBe(2);
    for (let k = 0; k < 3; k++) v.update();
    expect(v.live.map((x) => x.kind)).toEqual(['column']);
    for (let k = 3; k < DEFAULT_VISUAL_LIFE.column; k++) v.update();
    expect(v.count).toBe(0);
  });

  it('draws every kind additively over its whole life without errors', () => {
    const v = new MoveVisuals();
    const { ctx, calls } = fakeCtx();
    v.draw(ctx, 600);
    expect(calls).toHaveLength(0);
    for (const s of [column, burst, streak]) v.spawn(s, 400, 0, 1, '#2FF3E0');
    for (let k = 0; k < 20; k++) {
      v.draw(ctx, 600);
      v.update();
    }
    expect(calls.some((c) => c.startsWith('fillRect'))).toBe(true);
    expect(calls.some((c) => c.startsWith('arc'))).toBe(true);
    expect(calls.filter((c) => c.startsWith('save')).length).toBe(calls.filter((c) => c.startsWith('restore')).length);
    expect((ctx as unknown as { globalCompositeOperation: string }).globalCompositeOperation).toBe('lighter');
  });

  it('clear removes everything', () => {
    const v = new MoveVisuals();
    v.spawn(streak, 0, 0, 1, '#FFFFFF');
    v.clear();
    expect(v.count).toBe(0);
  });
});
