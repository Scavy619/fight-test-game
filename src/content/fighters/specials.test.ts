// Scripted checks that each special and ultimate does what the design says.
import { describe, expect, it } from 'vitest';
import { METER_MAX } from '../../sim/constants';
import { isGroundNeutral } from '../../sim/fighter';
import { createMatch } from '../../sim/match';
import { inp, NONE, ofType, place, run, runUntil } from '../../sim/testHelpers';
import type { FighterDef, Match, PlayerIndex, SimEvent } from '../../sim/types';
import { FIGHTERS } from './index';

const REI = FIGHTERS.rei.def;
const VIRA = FIGHTERS.vira.def;

/** A match in the fight phase with the fighters placed on the ground. */
function fight(p0: FighterDef, p1: FighterDef, x0: number, x1: number): Match {
  const m = createMatch({ fighters: [p0, p1], roundSeconds: 99 });
  runUntil(m, (mm) => mm.state.phase === 'fight', 200);
  place(m, x0, x1);
  return m;
}

const pressed = (buttons: Parameters<typeof inp>[0], hold: Parameters<typeof inp>[0] = {}) =>
  (k: number) => (k === 0 ? inp({ ...hold, ...buttons }) : inp(hold));

function hitsBy(events: readonly SimEvent[], fighter: PlayerIndex) {
  return ofType(events, 'hit').filter((h) => h.fighter === fighter);
}

/** Steps until fighter `i` is back in a neutral state (or `max` steps). */
function untilNeutral(m: Match, i: PlayerIndex, max: number, p0 = NONE, p1 = NONE): SimEvent[] {
  return runUntil(m, (mm) => isGroundNeutral(mm.state.fighters[i]), max, p0, p1);
}

describe('Rei: Shuriken', () => {
  it('is thrown on frame 12, flies at 14 px/frame and hits for 55', () => {
    const m = fight(REI, VIRA, 300, 900);
    const spawn = run(m, 12, pressed({ special: true }));
    expect(ofType(spawn, 'projectileSpawn')).toMatchObject([{ fighter: 0, slot: 'specialN', x: 356, y: 128 }]);
    run(m, 1);
    expect(m.state.projectiles[0]).toMatchObject({ x: 370, vx: 14 });
    const ev = runUntil(m, (_, e) => e.some((x) => x.type === 'hit'), 60);
    expect(hitsBy(ev, 0)).toMatchObject([{ slot: 'specialN', damage: 55, projectile: 1 }]);
    expect(m.state.fighters[1].health).toBe(VIRA.stats.health - 55);
  });
});

describe('Rei: Wind-slash dash', () => {
  it('travels 240 px and hits for 95', () => {
    const far = fight(REI, VIRA, 300, 1100);
    run(far, 39, pressed({ special: true }, { right: true }));
    expect(far.state.fighters[0].x).toBe(300 + 240);

    const m = fight(REI, VIRA, 300, 560);
    const ev = run(m, 20, pressed({ special: true }, { right: true }));
    expect(hitsBy(ev, 0)).toMatchObject([{ slot: 'specialF', damage: 95 }]);
  });

  it('is clearly punishable on block: the defender acts at least 10 frames earlier', () => {
    const m = fight(REI, VIRA, 300, 560);
    const block = inp({ block: true });
    runUntil(m, (_, e) => e.some((x) => x.type === 'block'), 30, pressed({ special: true }, { right: true }), block);
    let reiFree = -1;
    let viraFree = -1;
    for (let k = 1; k <= 80 && (reiFree < 0 || viraFree < 0); k++) {
      run(m, 1, NONE, NONE);
      if (viraFree < 0 && isGroundNeutral(m.state.fighters[1])) viraFree = k;
      if (reiFree < 0 && isGroundNeutral(m.state.fighters[0])) reiFree = k;
    }
    expect(reiFree - viraFree).toBeGreaterThanOrEqual(10);
  });
});

describe('Rei: Shadow step', () => {
  it('passes a nearby opponent invulnerably and ends behind them, facing them after recovery', () => {
    const m = fight(REI, VIRA, 500, 650);
    const rei = m.state.fighters[0];
    const ev = run(m, 1, pressed({ special: true, down: true }));
    expect(ofType(ev, 'moveStart')).toMatchObject([{ slot: 'specialD', element: 'shadow' }]);
    let invulnerableWhileCrossing = true;
    for (let k = 0; k < 14; k++) {
      run(m, 1);
      if (rei.x > 560 && rei.x < 740 && !rei.invulnerable) invulnerableWhileCrossing = false;
    }
    expect(invulnerableWhileCrossing).toBe(true);
    const rest = untilNeutral(m, 0, 40);
    expect(ofType([...ev, ...rest], 'hit')).toHaveLength(0);
    expect(rei.x).toBeGreaterThan(m.state.fighters[1].x + 100);
    expect(rei.x).toBeCloseTo(500 + 320, 0);
    expect(rei.facing).toBe(-1);
    expect(m.state.fighters[1].facing).toBe(1);
  });

  it('can be punished by a ready opponent', () => {
    const m = fight(REI, VIRA, 500, 650);
    const rei = m.state.fighters[0];
    run(m, 1, pressed({ special: true, down: true }));
    // Vira reacts once Rei reappears (move frame 12) with a light.
    runUntil(m, (mm) => mm.state.fighters[0].moveFrame >= 12, 20);
    const ev = run(m, 12, NONE, pressed({ light: true }));
    expect(hitsBy(ev, 1)).toMatchObject([{ slot: 'light' }]);
    expect(rei.state).toBe('hitstun');
  });
});

describe('Rei: Eightfold Storm', () => {
  it('lands eight hits for 260-340 damage on a standing opponent; the last launches', () => {
    const m = fight(REI, VIRA, 500, 650);
    m.state.fighters[0].meter = METER_MAX;
    const ev = run(m, 260, pressed({ heavy: true, special: true }));
    const hits = hitsBy(ev, 0);
    expect(hits.map((h) => h.slot)).toEqual(Array(8).fill('ultimate'));
    expect(hits.map((h) => h.combo)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    const total = hits.reduce((s, h) => s + h.damage, 0);
    expect(total).toBeGreaterThanOrEqual(260);
    expect(total).toBeLessThanOrEqual(340);
    expect(hits.map((h) => h.launches)).toEqual([false, false, false, false, false, false, false, true]);
  });

  it('rushes in from mid range', () => {
    const m = fight(REI, VIRA, 400, 680);
    m.state.fighters[0].meter = METER_MAX;
    const ev = run(m, 260, pressed({ heavy: true, special: true }));
    expect(hitsBy(ev, 0)).toHaveLength(8);
  });
});

describe('Vira: Spiral Orb', () => {
  it('is slow and hits twice for about 100 damage', () => {
    const m = fight(VIRA, REI, 300, 800);
    const spawn = run(m, 19, pressed({ special: true }));
    expect(ofType(spawn, 'projectileSpawn')).toMatchObject([{ fighter: 0, slot: 'specialN', x: 450 }]);
    run(m, 1);
    expect(m.state.projectiles[0]).toMatchObject({ vx: 5, hitsLeft: 2 });
    const ev = run(m, 140);
    const hits = hitsBy(ev, 0);
    expect(hits.map((h) => [h.slot, h.combo])).toEqual([['specialN', 1], ['specialN', 2]]);
    const total = hits.reduce((s, h) => s + h.damage, 0);
    expect(total).toBeGreaterThanOrEqual(90);
    expect(total).toBeLessThanOrEqual(110);
    expect(m.state.projectiles).toHaveLength(0);
  });
});

describe('Vira: Spear lunge', () => {
  it('moves forward, hits for 110 and knocks the opponent far back', () => {
    const m = fight(VIRA, REI, 300, 560);
    const ev = run(m, 20, pressed({ special: true }, { right: true }));
    expect(hitsBy(ev, 0)).toMatchObject([{ slot: 'specialF', damage: 110 }]);
    const before = m.state.fighters[1].x;
    run(m, 40);
    expect(m.state.fighters[1].x - before).toBeGreaterThan(100);
  });
});

describe('Vira: Leaping flame arc', () => {
  it('beats a jump-in: Vira launches Rei and takes no damage', () => {
    // Rei jumps forward from 380 and swings an air heavy on the way down.
    const m = fight(REI, VIRA, 380, 600);
    const reiInput = (k: number) => inp({ up: k < 5, right: k < 5, heavy: k === 18 });
    const viraInput = (k: number) => inp({ down: k >= 14 && k <= 16, special: k === 16 });
    const ev = run(m, 60, reiInput, viraInput);
    expect(hitsBy(ev, 1)).toMatchObject([{ slot: 'specialD', launches: true }]);
    expect(hitsBy(ev, 0)).toHaveLength(0);
    expect(m.state.fighters[1].health).toBe(VIRA.stats.health);
  });

  it('leaves the ground and is very punishable when it misses', () => {
    const m = fight(VIRA, REI, 300, 700);
    const vira = m.state.fighters[0];
    run(m, 1, pressed({ special: true, down: true }));
    let peak = 0;
    for (let k = 0; k < 30; k++) {
      run(m, 1);
      peak = Math.max(peak, vira.y);
    }
    expect(peak).toBeGreaterThan(80);
    // Grounded recovery after landing.
    runUntil(m, () => vira.y === 0, 20);
    const landedAt = vira.moveFrame;
    untilNeutral(m, 0, 40);
    expect(VIRA.moves.specialD.startup + VIRA.moves.specialD.active + VIRA.moves.specialD.recovery - landedAt)
      .toBeGreaterThanOrEqual(15);
  });
});

describe('Vira: Vel of the Six Fires', () => {
  it('six columns land for 260-340 damage at the right distance; the last launches', () => {
    const m = fight(VIRA, REI, 500, 650);
    m.state.fighters[0].meter = METER_MAX;
    const ev = run(m, 300, pressed({ heavy: true, special: true }));
    const hits = hitsBy(ev, 0);
    expect(hits.map((h) => h.combo)).toEqual([1, 2, 3, 4, 5, 6]);
    const total = hits.reduce((s, h) => s + h.damage, 0);
    expect(total).toBeGreaterThanOrEqual(260);
    expect(total).toBeLessThanOrEqual(340);
    expect(hits.map((h) => h.launches)).toEqual([false, false, false, false, false, true]);
    expect(ofType(ev, 'fx').filter((e) => e.tag.startsWith('fire'))).toHaveLength(6);
  });

  it('a close opponent is only hit by the first columns', () => {
    const m = fight(VIRA, REI, 500, 570);
    m.state.fighters[0].meter = METER_MAX;
    const ev = run(m, 300, pressed({ heavy: true, special: true }));
    const hits = hitsBy(ev, 0);
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits.length).toBeLessThanOrEqual(2);
  });
});
