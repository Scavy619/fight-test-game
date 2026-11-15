// Lore text for the gallery and campaign screens. Mirrors docs/LORE.md (keep in step).
// "tradition" summarises the sources; "inThisGame" is our own fiction.

export interface LoreEntry {
  id: string;
  name: string;
  tagline: string;
  tradition: string[];
  inThisGame: string[];
  sources: { label: string; url: string }[];
}

export const ADAPTATION_STATEMENT =
  'ASTRA is a fictional fantasy adaptation inspired by epic traditions. It is not a retelling of any tradition, text or regional version.';

export const WORLD_PREMISE =
  'Across several realms, something is going wrong with the legendary weapons. Bows misfire, maces ring with a power their owners did not give them, ' +
  'and kingdoms that once kept peace begin to quarrel. The heroes learn that a hidden force, the Hollow Astra, is amplifying the weapons so that warriors strike without judgment. ' +
  'The story is about courage, duty, loyalty, restraint, and what power costs when no one stops to ask whether it should be used.';

export const HERO_LORE: Record<string, LoreEntry> = {
  arjuna: {
    id: 'arjuna',
    name: 'Arjuna',
    tagline: 'The Astra-Bound Archer',
    tradition: [
      'Arjuna is the third of the five Pandava brothers in the Mahabharata, a master archer trained by the teacher Drona. His bow is the Gandiva, which the sources say he receives from the fire god Agni during the burning of the Khandava forest, together with quivers that never empty.',
      'He wins Draupadi at her svayamvara by an archery feat and later gains divine weapons called astras after a long penance. The Bhagavad Gita, set on the eve of the Kurukshetra war, begins with Arjuna\'s doubt and his refusal to fight kin.',
      'Tellings differ on details of the Khandava episode and of his travels; this adaptation keeps only the broad outline.',
    ],
    inThisGame: [
      'Arjuna is a gifted archer who has trained until the Gandiva feels like part of his own judgment. When a corrupted blast threatens an ancient forest he refuses to fire blindly, traces the disturbance, and lowers his bow to protect the trees before pursuing the source.',
      'The astras of this game are our own idea: charged arrows and barrages with long, visible warnings. Gods do not appear in his story. His doubts are shown in short moments before each duel, and he answers them with focus and humility.',
      'His campaign chapter tests whether he can act with resolve without losing compassion. His rival is Karna.',
    ],
    sources: [
      { label: 'Arjuna (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Arjuna' },
      { label: 'Gandiva (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Gandiva' },
      { label: 'Bhagavad Gita (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Bhagavad_Gita' },
    ],
  },
  bhima: {
    id: 'bhima',
    name: 'Bhima',
    tagline: 'The Mountain\'s Strength',
    tradition: [
      'Bhima is the second Pandava, described in the Mahabharata as the son of the wind god Vayu, known for enormous strength and his gada (mace). He kills the rakshasa Hidimba and marries Hidimba\'s sister Hidimbi; their son is Ghatotkacha. In the war he fights Duryodhana in the mace duel that ends it.',
      'He is also remembered for his appetite, his loyalty to his brothers, and for working as a cook at King Virata\'s court during the Pandavas\' year in disguise. Details of these episodes differ between tellings and regions.',
    ],
    inThisGame: [
      'Bhima\'s strength is direct but never cruel. At a collapsing mountain gate he braces the beams long enough for villagers to escape, then turns to face what drove them there.',
      'He fights close and heavy with the gada and wrestler\'s holds. His campaign asks whether he can protect the people he loves without letting anger dictate each blow. Warmth, loyalty and humour are as much his character as his strength.',
    ],
    sources: [
      { label: 'Bhima (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Bhima' },
      { label: 'Mahabharata (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Mahabharata' },
      { label: 'Ghatotkacha (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Ghatotkacha' },
    ],
  },
  ekalavya: {
    id: 'ekalavya',
    name: 'Ekalavya',
    tagline: 'The Self-Taught Archer',
    tradition: [
      'Ekalavya appears in the Adi Parva of the Mahabharata as a young prince of the Nishadas, a forest people. He asks the teacher Drona for instruction and is refused; he builds an image of Drona and trains himself until his skill rivals that of the best archers.',
      'When Drona learns of it, he asks for a guru-dakshina, a teacher’s fee: Ekalavya’s right thumb, which Ekalavya gives. The story has been read for centuries as a tale of devotion and, in modern retellings, as a tale of unfair exclusion; versions and readings differ widely.',
    ],
    inThisGame: [
      'Our Ekalavya is a resourceful forest archer who chooses his own tools and his own teachers. He notices that weapon corruption is harming the woodland communities, marks a safe route and organises an evacuation before he joins the heroes.',
      'His story emphasises self-discipline, protecting a community, and the right of the people affected to decide what happens next. The episode of the thumb is not shown; his hands are his own.',
    ],
    sources: [
      { label: 'Ekalavya (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Ekalavya' },
      { label: 'Dronacharya (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Drona' },
      { label: 'Mahabharata (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Mahabharata' },
    ],
  },
  abhimanyu: {
    id: 'abhimanyu',
    name: 'Abhimanyu',
    tagline: 'The Circle Breaker',
    tradition: [
      'Abhimanyu is the son of Arjuna and Subhadra in the Mahabharata. On the thirteenth day of the Kurukshetra war the opposing army forms the chakravyuha, a spiralling circular formation. He knows how to enter it but not how to leave, and he is killed inside it.',
      'Many retellings describe him as a teenager. Details of the story, and of how he learned the formation, vary between tellings and regions.',
    ],
    inThisGame: [
      'Our Abhimanyu is a young adult hero, quick, brave and talented. When allies are trapped by a shifting formation, he reads the pattern and signals a coordinated escape.',
      'His chapter is about preparation and teamwork: he wants to prove himself, learns to trust the others, and plans the way out before the way in. We treat the subject with gravity and do not show his death.',
    ],
    sources: [
      { label: 'Abhimanyu (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Abhimanyu' },
      { label: 'Chakravyuha (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Chakravyuha' },
      { label: 'Mahabharata (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Mahabharata' },
    ],
  },
};
