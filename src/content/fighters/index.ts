// Fighter registry: one entry per playable fighter (def, look, anims, visuals).
import type { FighterEntry } from '../types';
import { REI } from './rei';
import { VIRA } from './vira';

export type FighterId = 'rei' | 'vira';

export const FIGHTERS: Readonly<Record<FighterId, FighterEntry>> = {
  rei: REI,
  vira: VIRA,
};

/** Display order for select screens. */
export const FIGHTER_ORDER: readonly FighterId[] = ['rei', 'vira'];

export { REI, VIRA };
export { REI_DEF, REI_LOOK } from './rei';
export { VIRA_DEF, VIRA_LOOK } from './vira';
