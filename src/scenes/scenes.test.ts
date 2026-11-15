import { describe, expect, it } from 'vitest';
import { HERO_ORDER, HEROES } from '../content/heroes';
import { ROSTER } from '../content/roster';
import { MOVE_SLOTS } from '../sim';
import { createMatch, step } from '../sim/match';
import { DUMMIES, dummyController } from './practice';
import { previewAnims, tabContent } from './gallery';

describe('practice dummies', () => {
  it('still never presses anything; guard only blocks; ids are unique and damage is gentle', () => {
    const m = createMatch({ fighters: [HEROES.arjuna.def, HEROES.bhima.def] });
    expect(Object.values(dummyController('still', 1)(m, 1)).every((v) => v === false)).toBe(true);
    const g = dummyController('guard', 1)(m, 1);
    expect(g.block).toBe(true);
    expect(Object.entries(g).filter(([k, v]) => v && k !== 'block')).toEqual([]);
    expect(new Set(DUMMIES.map((d) => d.id)).size).toBe(DUMMIES.length);
    for (const d of DUMMIES) expect(d.damage).toBeLessThanOrEqual(0.3);
  });

  it('a guarding dummy blocks a light and takes no damage from a still opponent', () => {
    const m = createMatch({ fighters: [HEROES.arjuna.def, HEROES.bhima.def] });
    while (m.state.phase !== 'fight') step(m, [dummyController('still', 1)(m, 0), dummyController('still', 1)(m, 1)]);
    m.state.fighters[0].x = 600;
    m.state.fighters[1].x = 690;
    const hp = m.state.fighters[1].health;
    for (let k = 0; k < 40; k++) {
      const inp = { ...dummyController('still', 1)(m, 0), light: k === 0 };
      step(m, [inp, dummyController('guard', 1)(m, 1)]);
    }
    expect(m.state.fighters[1].health).toBe(hp);
  });
});

describe('gallery content', () => {
  it.each(HERO_ORDER)('%s has content on every tab, and a preview animation that exists', (id) => {
    const e = HEROES[id];
    for (const tab of [0, 1, 2] as const) {
      const lines = tabContent(e, tab, true);
      expect(lines.length, `${id} tab ${tab}`).toBeGreaterThan(3);
      expect(lines.every((l) => l.kind === 'gap' || l.text.length > 0)).toBe(true);
    }
    const moves = tabContent(e, 1, true).filter((l) => l.kind === 'h2');
    expect(moves.length).toBe(MOVE_SLOTS.length);
    for (const a of previewAnims(id)) expect(e.anims[a] ?? (a === 'idle' || a === 'walk' ? e.anims[a] : undefined), a).toBeDefined();
  });

  it('every roster slot is either registered or marked as not yet written', () => {
    for (const r of ROSTER) expect(r.unlock.length).toBeGreaterThan(5);
    expect(HERO_ORDER.length).toBeGreaterThanOrEqual(2);
  });
});
