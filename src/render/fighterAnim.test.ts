import { describe, expect, it } from 'vitest';
import { GETUP_FRAMES, createMatch, testFighter, type FighterState } from '../sim';
import { createPose } from './anim';
import { baseAnims } from './anims/base';
import {
  FighterAnimator,
  KNOCKDOWN_AIR_END,
  KNOCKDOWN_LYING_START,
  KO_AIR_END,
  KO_LYING,
  WALK_STRIDE_SPEED,
  inActiveFrames,
  pickAnimation,
  resolveAnimation,
} from './fighterAnim';
import type { FighterUpdate, FighterView } from './fighterView';
import type { Pose } from './types';

const def = testFighter;

function fighter(patch: Partial<FighterState>): FighterState {
  const f = createMatch({ fighters: [def, def] }).state.fighters[0];
  return { ...f, ...patch };
}

describe('pickAnimation', () => {
  it('maps neutral states with 1-based state frames', () => {
    expect(pickAnimation(fighter({ state: 'idle', stateFrame: 1 }), def)).toEqual({ id: 'idle', frame: 0 });
    expect(pickAnimation(fighter({ state: 'crouch', stateFrame: 4 }), def)).toEqual({ id: 'crouch', frame: 3 });
    expect(pickAnimation(fighter({ state: 'prejump', stateFrame: 2 }), def)).toEqual({ id: 'prejump', frame: 1 });
    expect(pickAnimation(fighter({ state: 'air', stateFrame: 7 }), def)).toEqual({ id: 'air', frame: 7 });
    expect(pickAnimation(fighter({ state: 'land', stateFrame: 2 }), def)).toEqual({ id: 'crouch', frame: 1 });
    expect(pickAnimation(fighter({ state: 'dodge', stateFrame: 5 }), def)).toEqual({ id: 'dodge', frame: 4 });
    expect(pickAnimation(fighter({ state: 'win', stateFrame: 11 }), def)).toEqual({ id: 'win', frame: 10 });
  });

  it('picks walk or walkBack from velocity against facing, scaled to the stride', () => {
    const fwd = pickAnimation(fighter({ state: 'walk', stateFrame: 11, facing: 1, vx: 4 }), def);
    expect(fwd.id).toBe('walk');
    expect(fwd.frame).toBeCloseTo((10 * def.stats.walkSpeed) / WALK_STRIDE_SPEED);
    expect(pickAnimation(fighter({ state: 'walk', facing: 1, vx: -3 }), def).id).toBe('walkBack');
    expect(pickAnimation(fighter({ state: 'walk', facing: -1, vx: 3 }), def).id).toBe('walkBack');
    expect(pickAnimation(fighter({ state: 'walk', facing: -1, vx: -4 }), def).id).toBe('walk');
  });

  it('plays the move animation on move frames', () => {
    const p = pickAnimation(fighter({ state: 'attack', move: 'heavy', moveFrame: 10, stateFrame: 10 }), def);
    expect(p).toEqual({ id: def.moves.heavy.anim, frame: 10 });
    const u = pickAnimation(fighter({ state: 'attack', move: 'ultimate', moveFrame: 51 }), def);
    expect(u).toEqual({ id: 'ultimate', frame: 51 });
  });

  it('uses crouching variants for block and blockstun', () => {
    expect(pickAnimation(fighter({ state: 'block' }), def).id).toBe('block');
    expect(pickAnimation(fighter({ state: 'block', crouching: true }), def).id).toBe('crouchBlock');
    expect(pickAnimation(fighter({ state: 'blockstun' }), def).id).toBe('blockstun');
    expect(pickAnimation(fighter({ state: 'blockstun', crouching: true }), def).id).toBe('crouchBlock');
  });

  it('splits knockdown into an airborne tumble and the lying end', () => {
    expect(pickAnimation(fighter({ state: 'hitstun', stateFrame: 5 }), def)).toEqual({ id: 'hitstun', frame: 4 });
    const air = pickAnimation(fighter({ state: 'hitstun', knockdownOnLand: true, stateFrame: 40, y: 50 }), def);
    expect(air).toEqual({ id: 'knockdown', frame: KNOCKDOWN_AIR_END });
    expect(KNOCKDOWN_AIR_END).toBeLessThan(KNOCKDOWN_LYING_START);
    const down = pickAnimation(fighter({ state: 'knockdown', stateFrame: 1 }), def);
    expect(down).toEqual({ id: 'knockdown', frame: KNOCKDOWN_LYING_START });
  });

  it('scales getup to the sim getup length', () => {
    const last = pickAnimation(fighter({ state: 'getup', stateFrame: GETUP_FRAMES + 1 }), def);
    expect(last.id).toBe('getup');
    expect(last.frame).toBeCloseTo(26);
  });

  it('shows ko airborne, then collapsed on the ground', () => {
    expect(pickAnimation(fighter({ state: 'ko', stateFrame: 3, y: 40 }), def)).toEqual({ id: 'ko', frame: 2 });
    expect(pickAnimation(fighter({ state: 'ko', stateFrame: 30, y: 40 }), def)).toEqual({ id: 'ko', frame: KO_AIR_END });
    expect(pickAnimation(fighter({ state: 'ko', stateFrame: 1, y: 0, vy: 8 }), def)).toEqual({ id: 'ko', frame: 0 });
    expect(pickAnimation(fighter({ state: 'ko', stateFrame: 30, y: 0, vy: 0 }), def)).toEqual({ id: 'ko', frame: KO_LYING });
  });

  it('every id the test fighter can produce exists in baseAnims', () => {
    for (const m of Object.values(def.moves)) expect(baseAnims[m.anim]).toBeDefined();
  });
});

describe('resolveAnimation', () => {
  it('falls back to idle for a missing id', () => {
    expect(resolveAnimation(baseAnims, 'nope').id).toBe('idle');
    expect(resolveAnimation(baseAnims, 'nope').anim).toBe(baseAnims.idle);
    expect(resolveAnimation(baseAnims, 'heavy').anim).toBe(baseAnims.heavy);
  });
});

describe('inActiveFrames', () => {
  it('is true only on the move active frames', () => {
    const m = def.moves.light; // startup 4, active 3
    const at = (moveFrame: number): boolean =>
      inActiveFrames(fighter({ state: 'attack', move: 'light', moveFrame }), def);
    expect(at(m.startup)).toBe(false);
    expect(at(m.startup + 1)).toBe(true);
    expect(at(m.startup + m.active)).toBe(true);
    expect(at(m.startup + m.active + 1)).toBe(false);
    expect(inActiveFrames(fighter({ state: 'idle' }), def)).toBe(false);
  });
});

describe('FighterAnimator', () => {
  function fakeView(): { view: FighterView; updates: FighterUpdate[]; resets: number } {
    const rec = { updates: [] as FighterUpdate[], resets: 0, view: undefined as unknown as FighterView };
    rec.view = {
      update: (p: FighterUpdate) => {
        const pose: Pose = createPose();
        pose.lean = p.pose.lean;
        pose.root.y = p.pose.root.y;
        rec.updates.push({ ...p, pose });
      },
      reset: () => {
        rec.resets += 1;
      },
    } as unknown as FighterView;
    return rec;
  }

  it('blends over 3 frames when the animation changes', () => {
    const rec = fakeView();
    const a = new FighterAnimator(rec.view, baseAnims);
    a.update(fighter({ state: 'idle', stateFrame: 1 }), def);
    const idleY = rec.updates[0]?.pose.root.y ?? 0;
    // Knockdown lying pose is far lower than the guard.
    const down = (n: number): FighterState => fighter({ state: 'knockdown', stateFrame: n });
    a.update(down(20), def);
    a.update(down(21), def);
    a.update(down(22), def);
    a.update(down(23), def);
    const ys = rec.updates.map((u) => u.pose.root.y);
    const lyingY = ys[4] ?? 0;
    expect(lyingY).toBeLessThan(idleY - 30);
    // Strictly between on the first two blend frames, at the target on the third.
    expect(ys[1]).toBeGreaterThan(lyingY);
    expect(ys[1]).toBeLessThan(idleY);
    expect(ys[2]).toBeLessThan(ys[1] ?? 0);
    expect(ys[3]).toBeCloseTo(lyingY, 5);
  });

  it('passes position, facing and trail through', () => {
    const rec = fakeView();
    const a = new FighterAnimator(rec.view, baseAnims);
    a.update(fighter({ state: 'attack', move: 'light', moveFrame: 5, x: 300, y: 0, facing: -1 }), def);
    expect(rec.updates[0]).toMatchObject({ x: 300, y: 0, facing: -1, trail: true });
    a.update(fighter({ state: 'attack', move: 'light', moveFrame: 9 }), def);
    expect(rec.updates[1]?.trail).toBe(false);
  });

  it('falls back to idle for unknown move animations', () => {
    const rec = fakeView();
    const anims = { idle: baseAnims.idle! };
    const a = new FighterAnimator(rec.view, anims);
    a.update(fighter({ state: 'attack', move: 'heavy', moveFrame: 3 }), def);
    expect(a.currentId).toBe('idle');
  });

  it('reset clears the view', () => {
    const rec = fakeView();
    const a = new FighterAnimator(rec.view, baseAnims);
    a.reset();
    expect(rec.resets).toBe(1);
  });
});
