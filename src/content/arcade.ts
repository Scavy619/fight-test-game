// Arcade: the ladder each hero climbs and the ending card for each hero.
import type { Difficulty } from '../ai/controller';

/** The opponent each hero meets last when that rival is available. */
export const ARCADE_RIVALS: Readonly<Record<string, string>> = {
  arjuna: 'karna',
  karna: 'arjuna',
  bhima: 'ghatotkacha',
  ghatotkacha: 'bhima',
  abhimanyu: 'ashwatthama',
  ashwatthama: 'abhimanyu',
  parashurama: 'ashwatthama',
  ekalavya: 'karna',
};

export interface ArcadeStep {
  opponent: string;
  difficulty: Difficulty;
  /** True for the last fight, against the rival or the strongest remaining hero. */
  rival: boolean;
}

/**
 * Every other available hero once, in roster order, ending with the rival (or the last hero when
 * the rival is not available). Difficulty climbs from easy to hard; the last fight is always hard.
 */
export function buildLadder(player: string, available: readonly string[]): ArcadeStep[] {
  const others = available.filter((id) => id !== player);
  if (others.length === 0) return [];
  const rivalId = ARCADE_RIVALS[player];
  const finalId = rivalId && others.includes(rivalId) ? rivalId : (others[others.length - 1] as string);
  const order = [...others.filter((id) => id !== finalId), finalId];
  return order.map((opponent, i) => {
    const frac = order.length === 1 ? 1 : i / (order.length - 1);
    const difficulty: Difficulty = frac < 0.34 ? 'easy' : frac < 0.8 ? 'normal' : 'hard';
    return { opponent, difficulty, rival: i === order.length - 1 };
  });
}

export interface ArcadeEnding {
  title: string;
  text: readonly string[];
}

/** One ending per hero. These are original fiction; no deity appears and no one is mocked. */
export const ARCADE_ENDINGS: Readonly<Record<string, ArcadeEnding>> = {
  arjuna: {
    title: 'THE BOW LOWERED',
    text: [
      'The last duel ends, and Arjuna does not fire again. He lowers the Gandiva and looks at the quiet forest he fought to keep.',
      'He still carries his doubts, but they are lighter now: skill was never the hard part. Choosing when not to use it was.',
    ],
  },
  bhima: {
    title: 'THE GATE HOLDS',
    text: [
      'Bhima sets down the gada and steadies the last of the gate with his own shoulders while the villagers walk through, laughing with relief.',
      'He grins, tired and proud. The strongest thing he did all day was to stop when the fight was over.',
    ],
  },
  karna: {
    title: 'THE DAWN OVER THE VILLAGE',
    text: [
      'Karna plants his spear in the dust as the sun rises over the village he chose to defend. No one asks where he comes from; they thank him for what he did.',
      'For a moment the question that has followed him all his life is quiet.',
    ],
  },
  abhimanyu: {
    title: 'THE WAY BACK OUT',
    text: [
      'Abhimanyu looks at the broken ring of warriors and, for the first time, plans the way out before he steps in.',
      'He signals his allies, and they leave together. Courage, he has learned, is better when someone is waiting at the other end.',
    ],
  },
  ghatotkacha: {
    title: 'THE LIGHT IN THE FOREST',
    text: [
      'The decoys fade one by one, and Ghatotkacha stands in the moonlight with the forest families safe behind him.',
      'He kneels so the smallest child can reach his hand. Strength, he says, is only worth what it shelters.',
    ],
  },
  parashurama: {
    title: 'THE AXE LAID DOWN',
    text: [
      'Parashurama lays the parashu on the stone of his hermitage and begins to teach, as he came to do. The younger heroes sit in a circle.',
      'Mastery without judgment, he tells them, can destroy what it means to protect, and judgment is the first thing to practise.',
    ],
  },
  ekalavya: {
    title: 'THE ROUTE HOME',
    text: [
      'Ekalavya walks the forest route one last time, checking every marker he set. The families he led out are already home.',
      'He decides what happens next with the people who live here. That was always the point.',
    ],
  },
  ashwatthama: {
    title: 'THE GRIEF SET DOWN',
    text: [
      'Ashwatthama stops, and the blue fire around him gutters out. The heroes do not strike him; they wait.',
      'Beneath the anger is a loss that no weapon can undo, and for the first time he says so out loud.',
    ],
  },
};
