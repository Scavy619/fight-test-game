// Hero registry. One file per hero in this folder; register it here.
import type { HeroEntry } from '../types';
import { ABHIMANYU } from './abhimanyu';
import { ARJUNA } from './arjuna';
import { BHIMA, BHIMA_BODY_STRIKES } from './bhima';
import { EKALAVYA } from './ekalavya';
import { GHATOTKACHA } from './ghatotkacha';
import { KARNA } from './karna';

export type HeroId = 'arjuna' | 'bhima' | 'abhimanyu' | 'ekalavya' | 'karna' | 'ghatotkacha';

export const HEROES: Record<HeroId, HeroEntry> = {
  arjuna: ARJUNA,
  bhima: BHIMA,
  abhimanyu: ABHIMANYU,
  ekalavya: EKALAVYA,
  karna: KARNA,
  ghatotkacha: GHATOTKACHA,
};

/** Select-screen order. */
export const HERO_ORDER: readonly HeroId[] = ['arjuna', 'bhima', 'abhimanyu', 'ekalavya', 'karna', 'ghatotkacha'];

/** Move anim ids whose hitboxes are the body rather than the weapon (skipped by the weapon-tip test). */
export const BODY_STRIKES: ReadonlySet<string> = new Set([...BHIMA_BODY_STRIKES]);

export function isHeroId(v: string | null | undefined): v is HeroId {
  return v !== null && v !== undefined && Object.prototype.hasOwnProperty.call(HEROES, v);
}
