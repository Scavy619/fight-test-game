import { describe, expect, it } from 'vitest';
import { fightMatch, inp, ofType, place, putInAir, run, tap } from './testHelpers';
import { testFighter } from './testFighter';
import { validateFighterDef } from './validate';
import { withMove } from './testHelpers';

describe('grab (throw slot)', () => {
  it('light + heavy together starts the throw move; either alone does not', () => {
    const m = fightMatch();
    run(m, 1, inp({ light: true, heavy: true }));
    expect(m.state.fighters[0]).toMatchObject({ state: 'attack', move: 'throw' });

    const m2 = fightMatch();
    run(m2, 1, inp({ light: true }));
    expect(m2.state.fighters[0].move).toBe('light');
    const m3 = fightMatch();
    run(m3, 1, inp({ heavy: true }));
    expect(m3.state.fighters[0].move).toBe('heavy');
  });

  it('the two presses may arrive on different steps within the buffer', () => {
    // A whiffed light (15 frames) is recovering when light (step 12) and heavy (step 13)
    // are pressed; both are still buffered when it ends, so the grab comes out.
    const m = fightMatch();
    run(m, 17, (k) => inp({ light: k === 0 || k === 12, heavy: k === 13 }));
    expect(m.state.fighters[0]).toMatchObject({ state: 'attack', move: 'throw' });
  });

  it('a staggered chord converts the started normal into the grab, in either order', () => {
    const m = fightMatch();
    run(m, 4, (k) => inp({ light: k === 0, heavy: k === 3 }));
    expect(m.state.fighters[0]).toMatchObject({ state: 'attack', move: 'throw', moveFrame: 1 });

    const m2 = fightMatch();
    run(m2, 3, (k) => inp({ heavy: k === 0, light: k === 2 }));
    expect(m2.state.fighters[0]).toMatchObject({ state: 'attack', move: 'throw' });
  });

  it('a heavy pressed after the chord window is a normal follow-up, not a grab', () => {
    const m = fightMatch();
    place(m, 300, 900); // far apart: the light whiffs, heavy is buffered into its recovery
    run(m, 20, (k) => inp({ light: k === 0, heavy: k === 14 }));
    expect(m.state.fighters[0]).toMatchObject({ state: 'attack', move: 'heavy' });
  });

  it('grabs through a block, tosses the defender, and whiffs on an airborne opponent', () => {
    const m = fightMatch();
    place(m, 500, 560);
    const ev = run(m, 10, tap({ light: true, heavy: true }), inp({ block: true }));
    expect(ofType(ev, 'hit')).toHaveLength(1);
    expect(ofType(ev, 'block')).toHaveLength(0);
    expect(m.state.fighters[1]).toMatchObject({ state: 'hitstun', knockdownOnLand: true });

    const air = fightMatch();
    place(air, 500, 560);
    putInAir(air, 1, 40);
    const ev2 = run(air, 10, tap({ light: true, heavy: true }));
    expect(ofType(ev2, 'hit')).toHaveLength(0);
  });

  it('the throw slot must be a throw and must not cancel', () => {
    expect(validateFighterDef(withMove(testFighter, 'throw', { throw: false }))).toContain('throw: must set throw: true');
    expect(validateFighterDef(withMove(testFighter, 'throw', { cancels: { into: ['heavy'], until: 10 } }))).toContain(
      'throw: grabs do not cancel',
    );
  });
});
