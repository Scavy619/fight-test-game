import { describe, expect, it } from 'vitest';
import { STAGE_PALETTES } from '../render/stage';
import {
  CHAPTERS,
  isChapterUnlocked,
  leadFor,
  playerFor,
  resolveSteps,
  startMeterFor,
  type FightStep,
} from './campaign';
import { HEROES, isHeroId } from './heroes';
import { ROSTER } from './roster';
import { unlocksFor } from './unlocks';

const speakers = new Set(['narrator', ...ROSTER.map((r) => r.id)]);

describe('campaign content', () => {
  it('has eight numbered chapters with text, a palette and a result', () => {
    expect(CHAPTERS.map((c) => c.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    for (const c of CHAPTERS) {
      expect(c.title.length).toBeGreaterThan(3);
      expect(c.setup.length).toBeGreaterThan(40);
      expect(c.result.text.length).toBeGreaterThan(40);
      expect(STAGE_PALETTES[c.palette], c.palette).toBeDefined();
      expect(c.steps.some((s) => s.kind === 'fight'), `chapter ${c.n} has a fight`).toBe(true);
    }
  });

  it('only names heroes that exist and speakers that are known', () => {
    for (const c of CHAPTERS) {
      for (const s of c.steps) {
        if (s.kind === 'dialogue') for (const l of s.lines) expect(speakers.has(l.speaker), l.speaker).toBe(true);
        if (s.kind === 'fight') {
          expect(isHeroId(s.opponent), s.opponent).toBe(true);
          if (s.player && s.player !== 'ally') expect(isHeroId(s.player)).toBe(true);
          if (s.palette) expect(STAGE_PALETTES[s.palette]).toBeDefined();
        }
      }
      if (c.lead !== 'ally') expect(isHeroId(c.lead)).toBe(true);
    }
  });

  it('every choice has options, and every condition refers to an earlier choice option', () => {
    const seen = new Map<string, Set<string>>();
    for (const c of CHAPTERS) {
      for (const s of c.steps) {
        if (s.when) {
          const opts = seen.get(s.when.choice);
          expect(opts, `condition on unknown choice ${s.when.choice} in chapter ${c.n}`).toBeDefined();
          for (const v of Array.isArray(s.when.is) ? s.when.is : [s.when.is]) expect(opts?.has(v), v).toBe(true);
        }
        if (s.kind === 'choice') {
          expect(s.options.length).toBeGreaterThanOrEqual(2);
          expect(new Set(s.options.map((o) => o.id)).size).toBe(s.options.length);
          seen.set(s.id, new Set(s.options.map((o) => o.id)));
        }
        if (s.kind === 'pickHero') seen.set(s.id, new Set(Object.keys(HEROES)));
      }
    }
    expect(seen.has('ally')).toBe(true);
  });

  it('has at least one choice and every chapter resolves to steps for every combination of choices', () => {
    expect(CHAPTERS.some((c) => c.steps.some((s) => s.kind === 'choice'))).toBe(true);
    const combos: Record<string, string>[] = [
      { forest: 'challenge', trial: 'pursue', vow: 'negotiate' },
      { forest: 'listen', trial: 'stay', vow: 'protect' },
      { forest: 'listen', trial: 'pursue', vow: 'pursue', ally: 'bhima' },
    ];
    for (const choices of combos) {
      for (const c of CHAPTERS) {
        const steps = resolveSteps(c, choices);
        expect(steps.length).toBeGreaterThan(0);
        expect(steps.some((s) => s.kind === 'fight')).toBe(true);
      }
    }
  });

  it('chapter 2 fight difficulty follows the forest choice', () => {
    const ch = CHAPTERS[1]!;
    const fights = (v: string): FightStep[] => resolveSteps(ch, { forest: v }).filter((s): s is FightStep => s.kind === 'fight');
    expect(fights('challenge').map((f) => f.difficulty)).toEqual(['normal']);
    expect(fights('listen').map((f) => f.difficulty)).toEqual(['easy']);
  });

  it('chapter 7 has exactly one extra fight, chosen by the vow, plus the closing duel', () => {
    const ch = CHAPTERS[6]!;
    for (const vow of ['pursue', 'negotiate', 'protect']) {
      const fights = resolveSteps(ch, { vow, ally: 'arjuna' }).filter((s) => s.kind === 'fight');
      expect(fights).toHaveLength(2);
    }
  });

  it('resolves the ally and the start-meter reward', () => {
    const ch8 = CHAPTERS[7]!;
    const fight = ch8.steps.find((s): s is FightStep => s.kind === 'fight')!;
    expect(playerFor(ch8, fight, {})).toBe('arjuna');
    expect(playerFor(ch8, fight, { ally: 'abhimanyu' })).toBe('abhimanyu');
    expect(leadFor(ch8, { ally: 'bhima' })).toBe('bhima');
    expect(startMeterFor(fight, { vow: 'protect' })).toBe(60);
    expect(startMeterFor(fight, { vow: 'pursue' })).toBe(0);
  });

  it('unlock grants match the unlock table', () => {
    for (const c of CHAPTERS) {
      const fromTable = unlocksFor({ kind: 'chapter', chapter: c.n })
        .filter((id) => !unlocksFor({ kind: 'chapter', chapter: c.n - 1 }).includes(id));
      const declared = c.unlocks.filter((id) => id !== 'ashwatthama');
      expect(declared.sort()).toEqual(fromTable.sort());
    }
    expect(unlocksFor({ kind: 'campaign' })).toContain('ashwatthama');
    expect(CHAPTERS[7]!.unlocks).toContain('ashwatthama');
  });

  it('chapters open one after another', () => {
    expect(isChapterUnlocked(1, [])).toBe(true);
    expect(isChapterUnlocked(2, [])).toBe(false);
    expect(isChapterUnlocked(3, [1, 2])).toBe(true);
  });
});
