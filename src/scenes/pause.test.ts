import { describe, expect, it } from 'vitest';
import { HEROES, HERO_ORDER } from '../content/heroes';
import { movePages } from './pause';

describe('movePages', () => {
  it('lists every described move of each hero, with a name and an input', () => {
    const pages = movePages([HEROES.arjuna, HEROES.bhima]);
    expect(pages).toHaveLength(2);
    expect(pages[0]?.title).toContain('PLAYER 1');
    for (const id of HERO_ORDER) {
      const [p] = movePages([HEROES[id]]);
      expect(p?.moves.length, id).toBeGreaterThanOrEqual(8);
      for (const m of p?.moves ?? []) {
        expect(m.name.length).toBeGreaterThan(0);
        expect(m.input.length).toBeGreaterThan(0);
        expect(m.description.length).toBeGreaterThan(10);
      }
    }
  });

  it('skips fighters without a profile', () => {
    expect(movePages([{ def: { name: 'x' } }])).toEqual([]);
  });
});
