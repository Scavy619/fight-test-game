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

/**
 * Draft looks for the eight ASTRA heroes, matched to the concept boards' palettes and motifs
 * (reference only). Slice A4 and later move each into its hero file; `?set=astra` in the
 * rig gallery shows them side by side.
 */
export const ASTRA_LOOKS: readonly { name: string; look: FighterLook }[] = [
  {
    name: 'Arjuna',
    look: { accent: '#7C8CFF', secondary: '#FFB347', height: 1, bulk: 0.9, headStyle: 'topknot', ribbon: 'quiver', weapon: { type: 'bow', length: 112, color: '#E8C27A' } },
  },
  {
    name: 'Bhima',
    look: { accent: '#5FBF6E', secondary: '#D1A04A', height: 1.08, bulk: 1.3, headStyle: 'curls', ribbon: 'sash', weapon: { type: 'mace', length: 120, color: '#D1A04A' } },
  },
  {
    name: 'Karna',
    look: { accent: '#FFC857', secondary: '#E0405A', height: 1.02, bulk: 1, headStyle: 'crown', ribbon: 'shawl', weapon: { type: 'spear', length: 172, color: '#FFD98A' } },
  },
  {
    name: 'Abhimanyu',
    look: { accent: '#3DDC97', secondary: '#FFC15E', height: 0.96, bulk: 0.86, headStyle: 'circlet', ribbon: 'scarf', weapon: { type: 'sword', length: 104, color: '#DDE8F0' } },
  },
  {
    name: 'Ghatotkacha',
    look: { accent: '#9D7BFF', secondary: '#D8DEFF', height: 1.15, bulk: 1.25, headStyle: 'curls', ribbon: 'cape', weapon: { type: 'mace', length: 124, color: '#B9A6FF' } },
  },
  {
    name: 'Parashurama',
    look: { accent: '#D9A441', secondary: '#6FA86A', height: 1.03, bulk: 1.05, headStyle: 'hermit', ribbon: 'shawl', weapon: { type: 'axe', length: 150, color: '#C9CED8' } },
  },
  {
    name: 'Ekalavya',
    look: { accent: '#8FD65A', secondary: '#D98C4A', height: 0.97, bulk: 0.88, headStyle: 'braid', ribbon: 'quiver', weapon: { type: 'bow', length: 106, color: '#C58A52' } },
  },
  {
    name: 'Ashwatthama',
    look: { accent: '#4FA3FF', secondary: '#C2334D', height: 1.02, bulk: 1, headStyle: 'wingedHelm', ribbon: 'cape', weapon: { type: 'sword', length: 108, color: '#B8D4FF' } },
  },
];
