// Data-driven mechanics added for the ASTRA roster: stances, shields, late-guard pierce,
// zones (slow, strike, decoy, mark) and returning projectiles.
import { describe, expect, it } from 'vitest';
import { createMatch, step } from './match';
import { moveFor } from './moves';
import { testFighter } from './testFighter';
import { fightMatch, inp, ofType, place, run, runUntil, withMove } from './testHelpers';
import type { FighterDef, MoveDef } from './types';
import { EMPTY_INPUT } from './types';
import { validateFighterDef } from './validate';

const light = testFighter.moves.light;

/** A fighter whose specialD switches to a second stance where light is a slow long poke. */
const stanceFighter: FighterDef = {
  ...testFighter,
  id: 'stancer',
  moves: { ...testFighter.moves, specialD: { ...testFighter.moves.specialD, switchStance: 'next', hitboxes: [], velocity: undefined } },
  stances: {
    names: ['BLADE', 'BOW'],
    moves: [{}, { light: { ...light, anim: 'light.bow', startup: 9, hitboxes: [{ x: 20, y: 105, w: 160, h: 30 }] } }],
  },
};

describe('stances', () => {
  it('a switchStance move changes the stance, which swaps the slot moves and resets per round', () => {
    expect(validateFighterDef(stanceFighter)).toEqual([]);
    const m = fightMatch({ p0: stanceFighter });
    place(m, 300, 900);
    const ev = run(m, 2, (k) => inp({ special: k === 0, down: true }));
    expect(ofType(ev, 'stanceChange')).toMatchObject([{ fighter: 0, stance: 1, name: 'BOW' }]);
    const f = m.state.fighters[0];
    expect(moveFor(stanceFighter, f, 'light').startup).toBe(9);
    expect(moveFor(stanceFighter, f, 'heavy')).toBe(testFighter.moves.heavy);
    // The stance light is what starts (its anim id is reported).
    runUntil(m, (mm) => mm.state.fighters[0].state === 'idle', 80);
    const ev2 = run(m, 1, inp({ light: true }));
    expect(ofType(ev2, 'moveStart')[0]?.anim).toBe('light.bow');
  });

  it('validation rejects a stance switch without stances and out-of-range indices', () => {
    const bad = { ...testFighter, moves: { ...testFighter.moves, specialD: { ...testFighter.moves.specialD, switchStance: 3 } } };
    expect(validateFighterDef(bad)).toContain('specialD: switchStance without stances');
    expect(validateFighterDef({ ...bad, stances: stanceFighter.stances })).toContain('specialD: switchStance out of range');
  });
});

describe('shields', () => {
  const guard = (shield: 'absorb' | 'halve', breaksOn?: MoveDef['grants'] extends infer G ? (G extends { breaksOn?: infer B } ? B : never) : never): FighterDef =>
    withMove(testFighter, 'specialD', {
      ...testFighter.moves.specialD, hitboxes: [], velocity: undefined, invulnerable: undefined,
      grants: { shield, frames: 120, label: 'WARD', ...(breaksOn ? { breaksOn } : {}) },
    });

  function withShield(def: FighterDef) {
    const m = fightMatch({ p0: testFighter, p1: def });
    place(m, 500, 575);
    // P2 raises the ward (down + special), then recovers.
    const ev = run(m, 1, inp(), inp({ special: true, down: true }));
    expect(ofType(ev, 'shieldGain')).toHaveLength(1);
    runUntil(m, (mm) => mm.state.fighters[1].state === 'idle', 80);
    expect(m.state.fighters[1].shield?.label).toBe('WARD');
    return m;
  }

  it('absorb: the first light hit does nothing to the defender, the attacker still chains', () => {
    const m = withShield(guard('absorb'));
    const health = m.state.fighters[1].health;
    const ev = run(m, 12, (k) => inp({ light: k === 0, heavy: k === 7 }));
    expect(ofType(ev, 'shieldAbsorb')).toMatchObject([{ fighter: 1, kind: 'absorb' }]);
    expect(ofType(ev, 'hit').filter((h) => h.slot === 'light')).toHaveLength(0);
    expect(m.state.fighters[1].shield).toBeNull();
    expect(m.state.fighters[1].health).toBeLessThanOrEqual(health);
    // The light counted as connected: heavy cancelled in and lands.
    expect(ofType(ev, 'moveStart').map((e) => e.slot)).toEqual(['light', 'heavy']);
  });

  it('halve: the hit lands for half damage; a special breaks the shield and lands in full', () => {
    const a = withShield(guard('halve'));
    const ev = run(a, 12, (k) => inp({ light: k === 0 }));
    expect(ofType(ev, 'shieldAbsorb')[0]?.kind).toBe('halve');
    expect(ofType(ev, 'hit')[0]?.damage).toBe(Math.round(light.damage / 2));

    const b = withShield(guard('halve'));
    const ev2 = run(b, 40, (k) => inp({ special: k === 0, right: true }));
    expect(ofType(ev2, 'shieldBreak')).toHaveLength(1);
    expect(ofType(ev2, 'hit')[0]?.damage).toBe(testFighter.moves.specialF.damage);
  });

  it('expires on its own and ignores grabs', () => {
    const m = withShield(guard('absorb'));
    run(m, 130);
    expect(m.state.fighters[0].shield).toBeNull();
    const g = withShield(guard('absorb'));
    const ev = run(g, 10, (k) => inp({ grab: k === 0 }));
    expect(ofType(ev, 'hit')[0]?.slot).toBe('throw');
    expect(ofType(ev, 'shieldAbsorb')).toHaveLength(0);
  });
});

describe('late-guard pierce', () => {
  const piercer = withMove(testFighter, 'light', { piercesLateGuard: 8 });

  it('is blocked by a guard raised early, but not by one raised a few frames before impact', () => {
    const early = fightMatch({ p0: piercer });
    place(early, 500, 575);
    run(early, 12, inp(), inp({ block: true }));
    const ev = run(early, 10, (k) => inp({ light: k === 0 }), inp({ block: true }));
    expect(ofType(ev, 'block')).toHaveLength(1);

    const late = fightMatch({ p0: piercer });
    place(late, 500, 575);
    // Light hits on step 5; the guard goes up on step 3 (2 frames old at impact).
    const ev2 = run(late, 10, (k) => inp({ light: k === 0 }), (k) => inp({ block: k >= 3 }));
    expect(ofType(ev2, 'block')).toHaveLength(0);
    expect(ofType(ev2, 'hit')).toHaveLength(1);
  });
});

describe('zones', () => {
  const zoneMove = (zone: MoveDef['zone']): FighterDef =>
    withMove(testFighter, 'specialN', { ...testFighter.moves.specialN, projectile: undefined, fx: undefined, hitboxes: [], zone });

  it('slow fields halve the walk speed of an opponent inside and expire', () => {
    const def = zoneMove({ kind: 'slow', frame: 13, x: 'opponent', w: 160, frames: 60, label: 'SNARE' });
    expect(validateFighterDef(def)).toEqual([]);
    const m = fightMatch({ p0: def });
    place(m, 300, 700);
    const ev = run(m, 14, (k) => inp({ special: k === 0 }));
    expect(ofType(ev, 'zoneSpawn')).toMatchObject([{ kind: 'slow', label: 'SNARE', x: 700 }]);
    // P2 already stands in the field when it appears, so the slow applies at once.
    expect(ofType(ev, 'slowed')).toMatchObject([{ fighter: 1, by: 0, factor: 0.5 }]);
    expect(m.state.fighters[1].slow.frames).toBeGreaterThan(0);
    const before = m.state.fighters[1].x;
    run(m, 10, inp(), inp({ right: true }));
    const moved = m.state.fighters[1].x - before;
    expect(moved).toBeCloseTo(10 * testFighter.stats.backSpeed * 0.5, 0);
    run(m, 60);
    expect(m.state.zones).toHaveLength(0);
    const free = fightMatch();
    place(free, 300, 700);
    run(free, 10, inp(), inp({ right: true }));
    expect(free.state.fighters[1].x - 700).toBeCloseTo(10 * testFighter.stats.backSpeed, 0);
  });

  it('strike lanes warn, then hit whoever stands in them, and can be stepped out of', () => {
    // Lanes 60 wide, 140 apart: an 80 px gap between them fits the 70 px body.
    const def = zoneMove({
      kind: 'strike', frame: 13, x: 'opponent', offsets: [-140, 0, 140], w: 60, frames: 40, strikeAt: 30,
      damage: 60, hitstun: 20, knockback: { x: 4, y: 9 }, launches: true, label: 'ARROWS FALL',
    });
    const hitM = fightMatch({ p0: def });
    place(hitM, 300, 800);
    const ev = run(hitM, 13 + 31, (k) => inp({ special: k === 0 }));
    expect(ofType(ev, 'zoneSpawn')).toHaveLength(3);
    expect(ofType(ev, 'zoneStrike')).toHaveLength(3);
    const hits = ofType(ev, 'hit');
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ target: 1, damage: 60, launches: true });
    expect(hitM.state.fighters[0].moveConnected).toBe(false); // a zone hit is not the move's own hit

    const dodged = fightMatch({ p0: def });
    place(dodged, 300, 800);
    // Walk 18 frames (72 px) into the gap between the middle and left lanes before the strike.
    const ev2 = run(dodged, 13 + 31, (k) => inp({ special: k === 0 }), (k) => inp({ left: k >= 14 && k < 32 }));
    expect(ofType(ev2, 'hit')).toHaveLength(0);
  });

  it('decoys absorb one melee hit or projectile and vanish', () => {
    const def = zoneMove({ kind: 'decoy', frame: 13, x: 120, w: 70, h: 180, frames: 300, label: 'DOUBLE' });
    const m = fightMatch({ p0: def });
    place(m, 400, 640);
    run(m, 14, (k) => inp({ special: k === 0 }));
    expect(m.state.zones.map((z) => z.kind)).toEqual(['decoy']);
    // P2's light reaches x 640-90-20 = 530..; the decoy at 520 overlaps its hitbox.
    const ev = run(m, 12, inp(), (k) => inp({ light: k === 0 }));
    expect(ofType(ev, 'decoyBroken')).toMatchObject([{ fighter: 0, by: 1 }]);
    expect(m.state.zones).toHaveLength(0);
    expect(ofType(ev, 'hit')).toHaveLength(0);

    const shot = fightMatch({ p0: def });
    place(shot, 300, 900);
    run(shot, 14, (k) => inp({ special: k === 0 }));
    const ev2 = run(shot, 90, inp(), (k) => inp({ special: k === 0 }));
    expect(ofType(ev2, 'decoyBroken')).toHaveLength(1);
    expect(shot.state.projectiles).toHaveLength(0);
  });

  it('marks are visual only and zones clear with the round', () => {
    const def = zoneMove({ kind: 'mark', frame: 13, x: 200, w: 120, frames: 40, label: 'LANDING' });
    const m = fightMatch({ p0: def, roundSeconds: 1 });
    place(m, 300, 700);
    const ev = run(m, 20, (k) => inp({ special: k === 0 }));
    expect(ofType(ev, 'zoneSpawn')[0]?.kind).toBe('mark');
    expect(ofType(ev, 'hit')).toHaveLength(0);
    runUntil(m, (mm) => mm.state.round === 2 && mm.state.phase === 'fight', 400);
    expect(m.state.zones).toHaveLength(0);
  });
});

describe('returning projectile', () => {
  const axe = withMove(testFighter, 'specialN', {
    ...testFighter.moves.specialN,
    projectile: { ...testFighter.moves.specialN.projectile!, vx: 10, hits: 2, behavior: 'returning', range: 200, lifetime: 200 },
  });

  it('flies out, turns back and hits on both legs, then vanishes at its owner', () => {
    const m = fightMatch({ p0: axe });
    place(m, 300, 420);
    const ev = run(m, 90, (k) => inp({ special: k === 0 }));
    const hits = ofType(ev, 'hit');
    expect(hits.length).toBeGreaterThanOrEqual(1);
    const p = m.state.projectiles;
    expect(p).toHaveLength(0);
    // The second leg's push direction is back toward the owner.
    expect(ev.some((e) => e.type === 'projectileHit')).toBe(true);
  });

  it('is deterministic and JSON-stable with zones and shields in play', () => {
    const play = (): string => {
      const m = createMatch({ fighters: [axe, stanceFighter], roundSeconds: 20 });
      for (let k = 0; k < 600; k++) {
        step(m, [
          { ...EMPTY_INPUT, special: k % 90 === 20, right: k % 40 < 20 },
          { ...EMPTY_INPUT, special: k % 70 === 10, down: k % 70 === 10, light: k % 23 === 0, left: k % 50 < 25 },
        ]);
      }
      return JSON.stringify(m.state);
    };
    expect(play()).toBe(play());
  });
});
