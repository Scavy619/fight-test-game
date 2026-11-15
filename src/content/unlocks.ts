// Unlock rules: which heroes appear after which event. The select screens, the gallery and the
// save agree through this one table (a test checks it against each hero's profile and the roster).
import type { SaveStore } from '../engine/save';

export type UnlockEvent =
  | { kind: 'chapter'; chapter: number }
  | { kind: 'arcade' }
  | { kind: 'campaign' };

export interface UnlockRule {
  id: string;
  /** Unlocked when this chapter is finished. */
  chapter?: number;
  /** Unlocked when Arcade is cleared with any hero. */
  arcade?: boolean;
  /** Unlocked when the campaign is finished. */
  campaign?: boolean;
}

export const UNLOCK_RULES: readonly UnlockRule[] = [
  { id: 'ekalavya', chapter: 2 },
  { id: 'karna', chapter: 4 },
  { id: 'ghatotkacha', chapter: 5 },
  { id: 'ashwatthama', arcade: true, campaign: true },
];

/** Hero ids that become available because of `ev`. */
export function unlocksFor(ev: UnlockEvent): string[] {
  return UNLOCK_RULES.filter((r) => {
    if (ev.kind === 'chapter') return r.chapter !== undefined && r.chapter <= ev.chapter;
    if (ev.kind === 'arcade') return r.arcade === true;
    return r.campaign === true;
  }).map((r) => r.id);
}

/** Applies `ev` to the save; returns only the ids that were not unlocked before. */
export function grantUnlocks(save: SaveStore, ev: UnlockEvent): string[] {
  const fresh: string[] = [];
  for (const id of unlocksFor(ev)) if (save.unlock(id)) fresh.push(id);
  return fresh;
}
