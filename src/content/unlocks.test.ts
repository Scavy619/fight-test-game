import { describe, expect, it } from 'vitest';
import { SaveStore } from '../engine/save';
import { ARCADE_ENDINGS, ARCADE_RIVALS, buildLadder } from './arcade';
import { HEROES, HERO_ORDER } from './heroes';
import { ROSTER, ROSTER_IDS } from './roster';
import { UNLOCK_RULES, grantUnlocks, unlocksFor } from './unlocks';

describe('unlock rules', () => {
  it('match each registered hero profile and the roster text', () => {
    for (const id of HERO_ORDER) {
      const p = HEROES[id].profile.unlock;
      const rule = UNLOCK_RULES.find((r) => r.id === id);
      if (p.kind === 'start') expect(rule, `${id} should be unlocked from the start`).toBeUndefined();
      else {
        expect(rule, id).toBeDefined();
        if (p.kind === 'chapter') expect(rule?.chapter).toBe(p.chapter);
      }
    }
    for (const r of UNLOCK_RULES) expect(ROSTER_IDS).toContain(r.id);
  });

  it('unlocks by chapter, arcade and campaign, and only reports new ones', () => {
    expect(unlocksFor({ kind: 'chapter', chapter: 2 })).toEqual(['ekalavya']);
    expect(unlocksFor({ kind: 'chapter', chapter: 4 })).toEqual(['ekalavya', 'karna']);
    expect(unlocksFor({ kind: 'arcade' })).toEqual(['ashwatthama']);
    expect(unlocksFor({ kind: 'campaign' })).toEqual(['ashwatthama']);
    const save = new SaveStore(null);
    expect(grantUnlocks(save, { kind: 'chapter', chapter: 2 })).toEqual(['ekalavya']);
    expect(grantUnlocks(save, { kind: 'chapter', chapter: 2 })).toEqual([]);
    expect(grantUnlocks(save, { kind: 'arcade' })).toEqual(['ashwatthama']);
    expect(save.isUnlocked('ashwatthama')).toBe(true);
  });
});

describe('arcade content', () => {
  it('every roster hero has an ending and a rival on the roster', () => {
    for (const r of ROSTER) {
      expect(ARCADE_ENDINGS[r.id], r.id).toBeDefined();
      expect(ARCADE_ENDINGS[r.id]?.text.length).toBeGreaterThanOrEqual(2);
      expect(ROSTER_IDS).toContain(ARCADE_RIVALS[r.id]);
    }
  });

  it('the ladder covers every other hero once, ends with the rival at hard, and climbs in difficulty', () => {
    const ladder = buildLadder('arjuna', HERO_ORDER);
    expect(ladder.map((s) => s.opponent).sort()).toEqual(HERO_ORDER.filter((h) => h !== 'arjuna').sort());
    const last = ladder[ladder.length - 1];
    expect(last?.opponent).toBe('karna');
    expect(last?.rival).toBe(true);
    expect(last?.difficulty).toBe('hard');
    expect(ladder[0]?.difficulty).toBe('easy');
    const rank = { easy: 0, normal: 1, hard: 2 } as const;
    for (let k = 1; k < ladder.length; k++) {
      expect(rank[ladder[k]?.difficulty ?? 'easy']).toBeGreaterThanOrEqual(rank[ladder[k - 1]?.difficulty ?? 'easy']);
    }
    // Rival not available: the last other hero closes the ladder.
    expect(buildLadder('bhima', ['bhima', 'arjuna', 'karna']).at(-1)?.opponent).toBe('karna');
    expect(buildLadder('bhima', ['bhima'])).toEqual([]);
  });
});
