import { REI_LOOK } from '../content/fighters/rei';
import { VIRA_LOOK } from '../content/fighters/vira';
import type { FighterLook } from './types';

// Rei's and Vira's looks live with their fighter data in src/content/fighters.
export { REI_LOOK, VIRA_LOOK };

/** Reference looks for the gallery and for content to start from. */
export const WUKONG_LOOK: FighterLook = {
  accent: '#5CFF8A',
  secondary: '#FFC940',
  height: 0.93,
  bulk: 0.88,
  headStyle: 'circlet',
  ribbon: 'tail',
  weapon: { type: 'staff', length: 172, color: '#FFC940' },
};

export const THOR_LOOK: FighterLook = {
  accent: '#9D7BFF',
  secondary: '#E8F0FF',
  height: 1.1,
  bulk: 1.28,
  headStyle: 'wingedHelm',
  ribbon: 'cape',
  weapon: { type: 'hammer', length: 80, color: '#8FE3FF' },
};

export const SAMPLE_LOOKS: readonly { name: string; look: FighterLook }[] = [
  { name: 'Rei Kurogane', look: REI_LOOK },
  { name: 'Vira', look: VIRA_LOOK },
  { name: 'Sun Wukong', look: WUKONG_LOOK },
  { name: 'Thor', look: THOR_LOOK },
];
