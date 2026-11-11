// Lore text for the in-game lore screen. Mirrors docs/LORE.md (keep in step).
// "tradition" summarises the sources; "inThisGame" is our own fiction.

export interface LoreEntry {
  id: string;
  name: string;
  kind: 'fighter' | 'arena';
  tagline: string;
  tradition: string[];
  inThisGame: string[];
  sources: { label: string; url: string }[];
}

export const WORLD_PREMISE =
  "Far in the future, an AI called the Concord keeps humanity's archives of myth and martial knowledge. " +
  'To keep those stories alive, it stages a tournament in a city of light, rebuilding legends from everything ever written, carved or sung about them. ' +
  'Heroes and tricksters return as themselves, made of neon light and data. ' +
  'The great gods are not rebuilt: what is still worshipped is not the Concord’s to copy, so the gods lend their power only to mortal champions.';

export const FIGHTER_LORE: Record<'rei' | 'vira' | 'wukong' | 'thor', LoreEntry> = {
  rei: {
    id: 'rei',
    name: 'Rei Kurogane',
    kind: 'fighter',
    tagline: 'Kenjutsu and ninjutsu. Champion of Susanoo.',
    tradition: [
      'Susanoo is a Shinto kami of storms and the sea, younger brother of the sun goddess Amaterasu. In the Kojiki and Nihon Shoki he is expelled from heaven, then in Izumo slays the eight-headed serpent Yamata no Orochi and finds the sword Kusanagi in its tail. He is worshipped today at shrines such as Yasaka in Kyoto.',
      'Kenjutsu covers the older Japanese sword schools, many founded in the Muromachi period, trained through paired forms with wooden swords. The katana is a curved single-edged blade worn edge-up through the belt.',
      'Ninjutsu names the skills of the shinobi, spies and raiders of the Sengoku period; the black costume is a later invention. Shuriken were small thrown blades used mainly to distract, taught in samurai and ninja schools alike.',
    ],
    inThisGame: [
      'Rei is a young swordsman trained in a kenjutsu school and a shinobi tradition that the Concord rebuilt from old manuals. Susanoo chose him as his champion, so wind and storm follow his blade.',
      'His shuriken and footwork come from the real arts. The wind-slash dash and the shadow step are our inventions, drawn from Susanoo’s storms and the legend of the ninja.',
      'His katana is his own, not Kusanagi. Eightfold Storm is a rush of eight slashes that recalls the eight-headed serpent of the Orochi legend; Susanoo himself never fights.',
    ],
    sources: [
      { label: 'Susanoo (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Susanoo' },
      { label: 'Susanoo (World History Encyclopedia)', url: 'https://www.worldhistory.org/Susanoo/' },
      { label: 'Kusanagi no Tsurugi (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Kusanagi_no_Tsurugi' },
      { label: 'Yasaka Shrine (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Yasaka_Shrine' },
      { label: 'Kenjutsu (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Kenjutsu' },
      { label: 'Ninjutsu (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Ninjutsu' },
      { label: 'Shuriken (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Shuriken' },
      { label: 'Katana (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Katana' },
    ],
  },
  vira: {
    id: 'vira',
    name: 'Vira',
    kind: 'fighter',
    tagline: 'Kalaripayattu spear. Champion of Kartikeya.',
    tradition: [
      'Kartikeya, also Skanda or Murugan, is the Hindu god of war, son of Shiva and Parvati. Six sparks from Shiva became six infants raised by the Krittikas, united by Parvati into one six-faced child. He rides a peacock and holds the vel, a divine spear from Parvati, with which he defeats the asura Surapadman.',
      'Murugan is central to Tamil devotion today, honoured at the Six Abodes in Tamil Nadu and in festivals such as Thaipusam and Karthigai Deepam across India, Sri Lanka and the Tamil diaspora. The vel itself is worshipped in his temples.',
      'Kalaripayattu is the martial art of Kerala, practised since at least the 12th century. Training in the kalari moves from stances to wooden weapons, metal weapons such as the spear and the flexible urumi, then empty hands. Banned by the British in 1804, it was revived from the 1920s.',
    ],
    inThisGame: [
      'Vira trained in a kalari rebuilt in the Concord’s city, through stances, staff and spear. Kartikeya chose her as his champion, and his fire runs along her spear.',
      'Her spear lunge and reach come from the real art. Her spear is shaped after the vel but is her own, not the divine vel. The Spiral Orb and the leaping flame arc are our inventions.',
      'Vel of the Six Fires rains spears of light in honour of the six sparks of Kartikeya’s birth. Kartikeya is never shown fighting or being struck.',
    ],
    sources: [
      { label: 'Kartikeya (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Kartikeya' },
      { label: 'Vel (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Vel' },
      { label: 'Kalaripayattu (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Kalaripayattu' },
    ],
  },
  wukong: {
    id: 'wukong',
    name: 'Sun Wukong',
    kind: 'fighter',
    tagline: 'The Monkey King. Wushu staff.',
    tradition: [
      'Sun Wukong is the Monkey King of Journey to the West, a 16th-century Chinese novel attributed to Wu Cheng’en. Born from a stone, he learns 72 transformations, crosses 108,000 li in one cloud somersault and turns his hairs into copies of himself.',
      'His staff, the Ruyi Jingu Bang, is an iron pillar banded with gold that once measured the great flood. It grows or shrinks at his command. After his Havoc in Heaven the Buddha traps him under a mountain; freed, he guards the monk Tang Sanzang on his pilgrimage.',
      'The staff (gun) is one of the four major weapons of Chinese martial arts, called the grandfather of all weapons, and staff routines are a main event in modern wushu.',
    ],
    inThisGame: [
      'The Concord rebuilt Sun Wukong from the novel and the stories told about him since. He returns as himself: quick, proud and fond of a fight.',
      'His moves follow the novel: the clone strike uses his hair clones, the cloud dash his somersault, and the pillar slam and Havoc in Heaven use the staff’s power to change size. His technique draws on wushu staff forms.',
    ],
    sources: [
      { label: 'Sun Wukong (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Sun_Wukong' },
      { label: 'Ruyi Jingu Bang (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Ruyi_Jingu_Bang' },
      { label: 'Gun (staff) (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Gun_%28staff%29' },
    ],
  },
  thor: {
    id: 'thor',
    name: 'Thor',
    kind: 'fighter',
    tagline: 'Thunder god. Hammer and glima wrestling.',
    tradition: [
      'Thor is the Norse god of thunder, defender of gods and humans against the giants, known from the Poetic Edda and Snorri’s Prose Edda. He wears a strength belt and iron gloves, and at Ragnarok he kills the Midgard Serpent and dies of its venom.',
      'His hammer Mjolnir, forged by dwarves, never misses and returns to his hand; it also blessed weddings and funerals. In one tale he wrestles Elli, old age in disguise, and is forced to one knee. Norse gods are honoured today in modern Heathen religions.',
      'Glima is Icelandic folk wrestling, mentioned in medieval law books and sagas. Wrestlers grip belts at the waist and thigh, stay upright and follow a code of honour. It is Iceland’s national sport.',
    ],
    inThisGame: [
      'The Concord rebuilt Thor from the Eddas and he appears as himself: patient, loud and protective of the weak.',
      'His hammer throw returns to his hand, as Mjolnir does in the myths, and Mjolnir’s Judgment calls down a column of lightning. Making him a glima wrestler is our invention, drawn from the sport and his match with Elli.',
    ],
    sources: [
      { label: 'Thor (World History Encyclopedia)', url: 'https://www.worldhistory.org/thor/' },
      { label: 'Mjolnir (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Mj%C3%B6lnir' },
      { label: 'Glima (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Glima' },
      {
        label: 'Asatruarfelagid (Wikipedia)',
        url: 'https://en.wikipedia.org/wiki/%C3%81satr%C3%BAarf%C3%A9lagi%C3%B0',
      },
    ],
  },
};

export const ARENA_LORE: Record<'stormShrine' | 'lampCitadel' | 'bifrostBridge', LoreEntry> = {
  stormShrine: {
    id: 'stormShrine',
    name: 'Storm Shrine',
    kind: 'arena',
    tagline: 'Japan. A sea shrine under storm.',
    tradition: [
      'A torii is the gate of a Shinto shrine, marking the line between the everyday world and sacred ground; many are vermilion, and the torii of Itsukushima stands in the sea.',
      'A shimenawa is a rope of twisted straw, often hung with paper streamers, marking a sacred space. Myth ties it to Amaterasu’s return from her cave. Susanoo is linked to storms, the sea and the Izumo region.',
    ],
    inThisGame: [
      'The Concord’s reconstruction of a sea shrine to Susanoo: neon torii stand in dark water under rain, shimenawa strung between them, lightning on the horizon. Fighters duel on the stone approach, never inside the sanctuary.',
    ],
    sources: [
      { label: 'Torii (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Torii' },
      { label: 'Shimenawa (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Shimenawa' },
      { label: 'Susanoo (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Susanoo' },
    ],
  },
  lampCitadel: {
    id: 'lampCitadel',
    name: 'Lamp Citadel',
    kind: 'arena',
    tagline: 'India. Temple towers on a night of lamps.',
    tradition: [
      'A gopuram is the tall entrance tower of a South Indian Hindu temple: tapering storeys over the gateway, covered in painted sculpture of the temple’s myths. Gopurams came to dominate temple skylines between the 12th and 16th centuries.',
      'Karthigai Deepam is a Tamil festival of lamps on the full moon of Karthigai, when homes and temples are lined with clay oil lamps. It honours the birth of Murugan and Shiva’s appearance as a column of fire, and is mentioned in Sangam-era poetry.',
    ],
    inThisGame: [
      'A temple city at dusk, rebuilt by the Concord from South Indian architecture, its gopurams outlined in neon. On its endless Karthigai night, rows of oil lamps line the walls and embers drift up. Fighters meet in the outer courtyard, never in the shrines.',
    ],
    sources: [
      { label: 'Gopuram (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Gopuram' },
      { label: 'Karthikai Deepam (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Karthikai_Deepam' },
      { label: 'Kartikeya (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Kartikeya' },
    ],
  },
  bifrostBridge: {
    id: 'bifrostBridge',
    name: 'Bifrost Bridge',
    kind: 'arena',
    tagline: 'Norse. The burning bridge to Asgard.',
    tradition: [
      'Bifrost is the bridge between Midgard and Asgard, described as burning and three-coloured and usually read as a rainbow. Heimdall guards it. The gods ride over it daily to the well of Urd, and it breaks at Ragnarok.',
      'Yggdrasil is the immense ash tree at the centre of Norse cosmology, with the worlds around it, three roots over three wells, and the Norns who water it. It shakes as Ragnarok approaches.',
    ],
    inThisGame: [
      'The Concord renders Bifrost as a bridge of crystal light under aurora bands, with snow falling and Yggdrasil’s shadow across the sky. Its red band still burns, as the Eddas say, and faint cracks hint at the ending the archive remembers.',
    ],
    sources: [
      { label: 'Bifrost (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Bifr%C3%B6st' },
      { label: 'Yggdrasil (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Yggdrasil' },
    ],
  },
};
