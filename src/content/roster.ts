// The full eight-hero roster as the interface shows it, including heroes whose files are not
// written yet (their select tile reads "coming soon"). `src/content/heroes/index.ts` holds the
// heroes that exist; a test checks every registered hero appears here with the same unlock.
export interface RosterSlot {
  id: string;
  name: string;
  title: string;
  /** Unlock text shown on a locked tile. */
  unlock: string;
}

export const ROSTER: readonly RosterSlot[] = [
  { id: 'arjuna', name: 'Arjuna', title: 'The Astra-Bound Archer', unlock: 'Available from the start' },
  { id: 'bhima', name: 'Bhima', title: "The Mountain's Strength", unlock: 'Available from the start' },
  { id: 'karna', name: 'Karna', title: "The Sun's Chosen", unlock: "Finish chapter 4: The Rival's Trial" },
  { id: 'abhimanyu', name: 'Abhimanyu', title: 'The Circle Breaker', unlock: 'Available from the start' },
  { id: 'ghatotkacha', name: 'Ghatotkacha', title: 'The Night-Born Guardian', unlock: 'Finish chapter 5: The Night of Illusions' },
  { id: 'parashurama', name: 'Parashurama', title: 'The Axe-Bearing Teacher', unlock: 'Available from the start' },
  { id: 'ekalavya', name: 'Ekalavya', title: 'The Self-Taught Archer', unlock: 'Finish chapter 2: The Forest Path' },
  { id: 'ashwatthama', name: 'Ashwatthama', title: 'The Wounded Veteran', unlock: 'Finish the campaign, or clear Arcade with any hero' },
];

export const ROSTER_IDS: readonly string[] = ROSTER.map((r) => r.id);
