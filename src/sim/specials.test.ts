import { describe, expect, it } from 'vitest';
import { DODGE_COOLDOWN_FRAMES, DODGE_FRAMES, METER_MAX, SUPER_FREEZE_FRAMES } from './constants';
import { testFighter } from './testFighter';
import {
  fightMatch, inp, NONE, ofType, place, putInAir, run, runUntilEvent, tap, withMove,
} from './testHelpers';

describe('dodge', () => {
  it('lasts 18 frames, invulnerable on frames 3 to 12, travels back by default', () => {
    const m = fightMatch();
    const a = m.state.fighters[0];
    const ev = run(m, 1, tap({ dodge: true }));
    expect(ofType(ev, 'dodge')).toEqual([{ type: 'dodge', fighter: 0, forward: false, x: 440, y: 0 }]);
    const invulnerableFrames: number[] = [];
    for (let frame = 1; frame <= DODGE_FRAMES; frame++) {
      if (frame > 1) run(m, 1);
      expect(a).toMatchObject({ state: 'dodge', stateFrame: frame });
      if (a.invulnerable) invulnerableFrames.push(frame);
    }
    expect(invulnerableFrames).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(a.x).toBe(440 - 90);
    run(m, 1);
    expect(a.state).toBe('idle');
    expect(a.dodgeCooldown).toBe(DODGE_COOLDOWN_FRAMES);
  });

  it('travels forward when forward is held', () => {
    const m = fightMatch();
    run(m, DODGE_FRAMES, tap({ dodge: true, right: true }));
    expect(m.state.fighters[0].x).toBe(440 + 90);
  });

  it('has a 30-frame cooldown after it ends', () => {
    const m = fightMatch();
    const a = m.state.fighters[0];
    run(m, DODGE_FRAMES + 1, tap({ dodge: true }));
    expect(a.state).toBe('idle');
    // Pressed during the cooldown: ignored once the buffer expires.
    const early = run(m, 20, tap({ dodge: true }));
    expect(ofType(early, 'dodge')).toHaveLength(0);
    run(m, DODGE_COOLDOWN_FRAMES - 22);
    // The cooldown ticks down at the start of each frame: 2 now, so the next frame is still blocked.
    expect(a.dodgeCooldown).toBe(2);
    const tooSoon = run(m, 1, tap({ dodge: true }));
    expect(ofType(tooSoon, 'dodge')).toHaveLength(0);
    // ...but the buffered press fires on the first frame it is allowed.
    const ok = run(m, 1);
    expect(ofType(ok, 'dodge')).toHaveLength(1);
  });

  it('avoids attacks during its invulnerable frames', () => {
    const m = fightMatch();
    place(m, 500, 600);
    const ev = run(m, 12, tap({ dodge: true }, { right: true }), tap({ light: true }));
    expect(ofType(ev, 'hit')).toHaveLength(0);
    expect(ofType(ev, 'whiff')).toMatchObject([{ fighter: 1, slot: 'light' }]);
  });

  it('can be hit after the invulnerable frames, which interrupts it', () => {
    const m = fightMatch();
    place(m, 500, 600);
    const a = m.state.fighters[0];
    a.state = 'dodge';
    a.stateFrame = 12;
    a.dodgeForward = true; // stays in place after frame 15 anyway
    const ev = run(m, 5, NONE, tap({ light: true }));
    expect(ofType(ev, 'hit')).toHaveLength(1);
    expect(a.state).toBe('hitstun');
    expect(a.dodgeCooldown).toBe(DODGE_COOLDOWN_FRAMES);
  });

  it('is buffered like attacks', () => {
    const m = fightMatch();
    const ev = run(m, 20, (k) => inp({ light: k === 0, dodge: k === 12 }));
    expect(ofType(ev, 'dodge')).toHaveLength(1);
    expect(m.state.fighters[0].state).toBe('dodge');
    expect(m.state.fighters[0].stateFrame).toBe(5); // started on step 16
  });

  it('needs the fighter to be grounded and actionable', () => {
    const m = fightMatch();
    putInAir(m, 0, 100);
    expect(ofType(run(m, 4, tap({ dodge: true })), 'dodge')).toHaveLength(0);
  });
});

describe('meter', () => {
  it('hits give the attacker meterGain and the defender 4% of damage taken', () => {
    const m = fightMatch();
    place(m, 500, 600);
    runUntilEvent(m, 'hit', 10, tap({ light: true }));
    expect(m.state.fighters[0].meter).toBe(4);
    expect(m.state.fighters[1].meter).toBeCloseTo(1.6);
  });

  it('blocked hits give half meterGain; chip counts as damage taken', () => {
    const m = fightMatch();
    place(m, 500, 600);
    runUntilEvent(m, 'block', 30, tap({ special: true }, { right: true }), inp({ block: true }));
    expect(m.state.fighters[0].meter).toBe(5);
    expect(m.state.fighters[1].meter).toBeCloseTo(15 * 0.04);
  });

  it('is capped at the maximum', () => {
    const m = fightMatch();
    place(m, 500, 600);
    m.state.fighters[0].meter = 98;
    runUntilEvent(m, 'hit', 10, tap({ light: true }));
    expect(m.state.fighters[0].meter).toBe(METER_MAX);
  });
});

describe('ultimate', () => {
  function readyMatch() {
    const m = fightMatch();
    m.state.fighters[0].meter = METER_MAX;
    return m;
  }

  it('needs a full meter (otherwise heavy + special is a special)', () => {
    const m = fightMatch();
    m.state.fighters[0].meter = METER_MAX - 1;
    const ev = run(m, 1, tap({ heavy: true, special: true }));
    expect(ofType(ev, 'moveStart')).toMatchObject([{ slot: 'specialN' }]);
    expect(m.state.superFreeze).toBeNull();
  });

  it('spends the whole meter and starts a 45-frame super freeze', () => {
    const m = readyMatch();
    const ev = run(m, 1, tap({ heavy: true, special: true }));
    expect(ofType(ev, 'moveStart')).toMatchObject([{ slot: 'ultimate', anim: 'ultimate', strength: 'ultimate' }]);
    expect(ofType(ev, 'superFreeze')).toEqual([
      { type: 'superFreeze', fighter: 0, frames: SUPER_FREEZE_FRAMES, x: 440, y: 0, element: 'wind' },
    ]);
    expect(m.state.fighters[0].meter).toBe(0);
    expect(m.state.superFreeze).toEqual({ frames: SUPER_FREEZE_FRAMES, caster: 0 });
  });

  it('during the freeze only the caster animates; the opponent cannot change state but buffers presses', () => {
    const m = readyMatch();
    run(m, 1, tap({ heavy: true, special: true }));
    const [a, b] = m.state.fighters;
    const timer = m.state.timer;
    const before = JSON.stringify({ ...b, input: null });
    const ev = run(m, SUPER_FREEZE_FRAMES, NONE, (k) => inp({ right: true, light: k === 10 }));
    expect(JSON.stringify({ ...b, input: null })).toBe(before);
    expect(a.moveFrame).toBe(1 + SUPER_FREEZE_FRAMES);
    expect(m.state.timer).toBe(timer);
    expect(m.state.superFreeze).toBeNull();
    expect(ofType(ev, 'fx')).toMatchObject([{ fighter: 0, tag: 'ultimateCharge' }]);
    // The press during the freeze comes out on the first frame after it.
    const after = run(m, 1, NONE, inp({ right: true }));
    expect(ofType(after, 'moveStart')).toMatchObject([{ fighter: 1, slot: 'light' }]);
  });

  it('can start within the first 3 frames of heavy', () => {
    const m = readyMatch();
    const ev = run(m, 3, (k) => inp({ heavy: true, special: k === 2 }));
    expect(ofType(ev, 'moveStart').map((e) => e.slot)).toEqual(['heavy', 'ultimate']);

    const late = readyMatch();
    const ev2 = run(late, 10, (k) => inp({ heavy: true, special: k >= 3 }));
    expect(ofType(ev2, 'moveStart').map((e) => e.slot)).toEqual(['heavy']);
    expect(late.state.fighters[0].meter).toBe(METER_MAX);
  });

  it('can start within the first 3 frames of a special', () => {
    const m = readyMatch();
    const ev = run(m, 2, (k) => inp({ special: true, heavy: k === 1 }));
    expect(ofType(ev, 'moveStart').map((e) => e.slot)).toEqual(['specialN', 'ultimate']);
  });

  it('can be cancelled into from a connecting heavy', () => {
    const m = readyMatch();
    place(m, 500, 600);
    runUntilEvent(m, 'hit', 15, tap({ heavy: true }));
    const ev = run(m, 12, inp({ heavy: true, special: true }));
    expect(ofType(ev, 'moveStart')).toMatchObject([{ slot: 'ultimate' }]);
  });

  it('is not available in the air or while stunned', () => {
    const air = readyMatch();
    putInAir(air, 0, 200);
    const ev = run(air, 1, tap({ heavy: true, special: true }));
    expect(ofType(ev, 'moveStart')).toMatchObject([{ slot: 'airHeavy' }]);

    const stunned = readyMatch();
    Object.assign(stunned.state.fighters[0], { state: 'hitstun', stateFrame: 1, stunFrames: 20 });
    const ev2 = run(stunned, 5, tap({ heavy: true, special: true }));
    expect(ofType(ev2, 'superFreeze')).toHaveLength(0);
  });

  it('is invulnerable through its startup', () => {
    const m = readyMatch();
    place(m, 500, 600);
    run(m, 1, tap({ heavy: true, special: true }), tap({ light: true }));
    // P2's light was already started on the activation frame; it whiffs after the freeze.
    const ev = run(m, SUPER_FREEZE_FRAMES + 6);
    expect(ofType(ev, 'hit').filter((h) => h.fighter === 1)).toHaveLength(0);
  });
});

describe('projectiles', () => {
  it('spawns on its frame and travels', () => {
    const m = fightMatch();
    const ev = run(m, 13, tap({ special: true }));
    expect(ofType(ev, 'projectileSpawn')).toEqual([{
      type: 'projectileSpawn', fighter: 0, id: 1, slot: 'specialN', anim: 'specialN', x: 495, y: 115,
      element: 'wind', strength: 'special',
    }]);
    expect(m.state.projectiles).toMatchObject([{ id: 1, owner: 0, x: 495, vx: 7, facing: 1, hitsLeft: 1 }]);
    run(m, 1);
    expect(m.state.projectiles[0]?.x).toBe(502);
  });

  it('only one live projectile per owner per move', () => {
    const m = fightMatch();
    place(m, 100, 1200);
    const ev = run(m, 100, (k) => inp({ special: k === 0 || k === 40 }));
    expect(ofType(ev, 'moveStart')).toHaveLength(2);
    expect(ofType(ev, 'projectileSpawn')).toHaveLength(1);
    expect(m.state.projectiles).toHaveLength(1);
  });

  it('expires after its lifetime', () => {
    const def = withMove(testFighter, 'specialN', {
      projectile: { ...testFighter.moves.specialN.projectile!, lifetime: 20 },
    });
    const m = fightMatch({ p0: def });
    run(m, 13 + 20, tap({ special: true }));
    expect(m.state.projectiles).toHaveLength(1);
    run(m, 1);
    expect(m.state.projectiles).toHaveLength(0);
  });

  it('hits, then disappears', () => {
    const m = fightMatch();
    const ev = runUntilEvent(m, 'hit', 80, tap({ special: true }));
    expect(ofType(ev, 'hit')).toMatchObject([{ fighter: 0, target: 1, slot: 'specialN', damage: 70, projectile: 1, strength: 'special' }]);
    expect(ofType(ev, 'projectileHit')).toMatchObject([{ fighter: 0, target: 1, id: 1, blocked: false }]);
    expect(m.state.projectiles).toHaveLength(0);
    expect(m.state.fighters[1]).toMatchObject({ health: 930, state: 'hitstun' });
    expect(m.state.fighters[0].meter).toBe(6);
  });

  it('can be blocked for chip', () => {
    const m = fightMatch();
    const ev = runUntilEvent(m, 'block', 80, tap({ special: true }), inp({ block: true }));
    expect(ofType(ev, 'projectileHit')).toMatchObject([{ blocked: true }]);
    expect(ofType(ev, 'block')).toMatchObject([{ chip: 11, projectile: 1 }]);
    expect(m.state.fighters[1].health).toBe(989);
  });

  it('opposing projectiles cancel each other', () => {
    const m = fightMatch();
    const ev = run(m, 80, tap({ special: true }), tap({ special: true }));
    expect(ofType(ev, 'projectileSpawn')).toHaveLength(2);
    expect(ofType(ev, 'projectileClash')).toMatchObject([{ ids: [1, 2], fighters: [0, 1], elements: ['wind', 'wind'] }]);
    expect(ofType(ev, 'hit')).toHaveLength(0);
    expect(m.state.projectiles).toHaveLength(0);
    expect(m.state.fighters.map((f) => f.health)).toEqual([1000, 1000]);
  });

  it('multi-hit projectiles hit several times and outlast a single-hit one in a clash', () => {
    const def = withMove(testFighter, 'specialN', {
      projectile: { ...testFighter.moves.specialN.projectile!, hits: 2 },
    });
    const m = fightMatch({ p0: def });
    const ev = run(m, 120, tap({ special: true }), tap({ special: true }));
    expect(ofType(ev, 'projectileClash')).toHaveLength(1);
    expect(ofType(ev, 'projectileHit')).toMatchObject([{ fighter: 0, id: 1 }]);

    const m2 = fightMatch({ p0: def });
    place(m2, 300, 700);
    m2.state.fighters[1].state = 'idle';
    const ev2 = run(m2, 120, tap({ special: true }));
    expect(ofType(ev2, 'projectileHit')).toHaveLength(2);
  });

  it('passes through invulnerable fighters', () => {
    // P2's heavy is invulnerable throughout in this variant.
    const p1 = withMove(testFighter, 'heavy', { invulnerable: { from: 1, to: 29 } });
    const m = fightMatch({ p1 });
    place(m, 440, 600);
    const ev = run(m, 40, tap({ special: true }), (k) => inp({ heavy: k === 17 }));
    expect(ofType(ev, 'hit')).toHaveLength(0);
    expect(m.state.projectiles[0]?.x).toBeGreaterThan(640);
  });
});
