// The ASTRA campaign: eight chapters of original fiction inspired by epic themes. Pure data plus
// the pure functions that resolve a chapter's steps from the player's earlier choices, so the
// scenes and the tests read the same thing. No deity appears; no one is mocked.
import type { Difficulty } from '../ai/controller';
import type { HeroId } from './heroes';

/** A line of dialogue: a hero id (shows their portrait), 'narrator' or a plain name. */
export interface Line {
  speaker: string;
  text: string;
}

/** A step runs only when the earlier choice `choice` was `is` (an array means any of them). */
export interface Condition {
  choice: string;
  is: string | readonly string[];
}

interface StepBase {
  when?: Condition;
}

export interface DialogueStep extends StepBase {
  kind: 'dialogue';
  lines: readonly Line[];
}

export interface FightStep extends StepBase {
  kind: 'fight';
  /** Player hero; default is the chapter's player. 'ally' is the hero picked in chapter 7. */
  player?: HeroId | 'ally';
  opponent: HeroId;
  difficulty: Difficulty;
  roundsToWin?: number;
  /** Shown one at a time at the top of the screen for the first half minute. */
  hints?: readonly string[];
  /** Palette id from STAGE_PALETTES; default is the chapter's. */
  palette?: string;
  /** Extra meter for the player at the start (a reward from an earlier choice). */
  startMeterIf?: { choice: string; is: string; meter: number };
}

export interface ChoiceOption {
  id: string;
  label: string;
  /** What this option means, shown under the prompt. */
  text: string;
}

export interface ChoiceStep extends StepBase {
  kind: 'choice';
  id: string;
  prompt: string;
  options: readonly ChoiceOption[];
}

/** Opens a hero select among unlocked heroes; the pick is saved under `id` (used as 'ally'). */
export interface PickHeroStep extends StepBase {
  kind: 'pickHero';
  id: string;
  prompt: string;
}

export type Step = DialogueStep | FightStep | ChoiceStep | PickHeroStep;

export interface Chapter {
  n: number;
  title: string;
  /** One paragraph shown on the intro card. */
  setup: string;
  /** Lead hero of the chapter; 'ally' resolves to the hero picked in chapter 7 (default Arjuna). */
  lead: HeroId | 'ally';
  palette: string;
  steps: readonly Step[];
  result: { title: string; text: string };
  /** Heroes unlocked by finishing this chapter (checked against content/unlocks.ts by a test). */
  unlocks: readonly string[];
}

const N = 'narrator';

export const CHAPTERS: readonly Chapter[] = [
  {
    n: 1,
    title: 'The First Disturbance',
    setup:
      'In an ancient forest, a bow misfires and a blast of unfamiliar power tears through the canopy. Arjuna follows it and finds a trusted friend whose mace has begun to hum with a force he did not give it.',
    lead: 'arjuna',
    palette: 'forest',
    steps: [
      {
        kind: 'dialogue',
        lines: [
          { speaker: N, text: 'Dawn, in a forest older than any kingdom. The air tastes of struck metal.' },
          { speaker: 'arjuna', text: 'That was not my arrow. Something fired through the Gandiva\'s own string, and I had not drawn it.' },
          { speaker: 'bhima', text: 'Arjuna! Stay back. The gada is ringing in my hands, and it wants to swing at anything I look at.' },
          { speaker: 'arjuna', text: 'Then let us find out what it wants. Spar with me. Keep your anger out of it, and I will keep my aim honest.' },
        ],
      },
      {
        kind: 'fight',
        opponent: 'bhima',
        difficulty: 'easy',
        hints: [
          'Move with A and D, or point with the mouse. Jump with W.',
          'Light is F and heavy is G. Light attacks are quick; heavy ones are slow but strong.',
          'Hold R, or hold back from your opponent, to block. Big attacks show a wind-up first.',
          'Heavy and special together with a full meter is your ultimate.',
        ],
      },
      {
        kind: 'dialogue',
        lines: [
          { speaker: 'bhima', text: 'It stopped. The moment I stopped fighting it, the humming stopped too.' },
          { speaker: 'arjuna', text: 'Something is turning our weapons against our own judgment. We should not be the first to notice.' },
          { speaker: N, text: 'Far away, in three other realms, other weapons begin to hum.' },
        ],
      },
    ],
    result: {
      title: 'A weapon without a wielder',
      text: 'The disturbance is real, and it is not only in the forest. Whatever is twisting the weapons wants warriors who strike without thinking. Arjuna and Bhima agree to find its source before it finds a village.',
    },
    unlocks: [],
  },
  {
    n: 2,
    title: 'The Forest Path',
    setup:
      'Travellers are fleeing the burning edge of the forest, and someone has marked a safe path through the trees. Arjuna must decide how to meet the archer who knows these woods better than he does.',
    lead: 'arjuna',
    palette: 'forest',
    steps: [
      {
        kind: 'dialogue',
        lines: [
          { speaker: N, text: 'A line of families, bundles on their backs, follows strips of coloured cloth tied to the trees.' },
          { speaker: 'ekalavya', text: 'Keep to the markers. Do not step off them; the ground beyond is wrong now, and I have not mapped it yet.' },
          { speaker: 'arjuna', text: 'You did this? The route, the evacuation, all of it?' },
        ],
      },
      {
        kind: 'choice',
        id: 'forest',
        prompt: 'The archer carries a bow of his own making. How does Arjuna meet him?',
        options: [
          { id: 'challenge', label: 'CHALLENGE HIM', text: 'Test his skill first. A harder duel, and Arjuna learns what he is made of.' },
          { id: 'listen', label: 'LISTEN FIRST', text: 'Ask what he has seen before anyone draws a bow. A gentler duel.' },
        ],
      },
      {
        kind: 'dialogue',
        when: { choice: 'forest', is: 'challenge' },
        lines: [
          { speaker: 'arjuna', text: 'You move like someone who has taught himself everything. Show me.' },
          { speaker: 'ekalavya', text: 'I will. But understand: the people behind me do not have time for this.' },
        ],
      },
      {
        kind: 'dialogue',
        when: { choice: 'forest', is: 'listen' },
        lines: [
          { speaker: 'arjuna', text: 'Before anything else: what do you know about what is happening to the forest?' },
          { speaker: 'ekalavya', text: 'More than you would guess. But I would like to see how you fight, if you will let me. A path is only as safe as the person guarding it.' },
        ],
      },
      {
        kind: 'fight',
        opponent: 'ekalavya',
        difficulty: 'normal',
        palette: 'forest',
        hints: [
          'Hold back from your opponent to block when he attacks; you do not need a button.',
          'Arrows are slow compared with a sprint: jump or step aside, then close in.',
        ],
        when: { choice: 'forest', is: 'challenge' },
      },
      {
        kind: 'fight',
        opponent: 'ekalavya',
        difficulty: 'easy',
        palette: 'forest',
        hints: [
          'Hold back from your opponent to block when he attacks; you do not need a button.',
          'Arrows are slow compared with a sprint: jump or step aside, then close in.',
        ],
        when: { choice: 'forest', is: 'listen' },
      },
      {
        kind: 'dialogue',
        lines: [
          { speaker: 'ekalavya', text: 'Good. You can guard a path. Now listen: the corruption follows the weapons. It follows whoever carries one without asking why.' },
          { speaker: 'arjuna', text: 'Then we will carry ours with questions. Lead on; I would rather follow your markers than my own pride.' },
        ],
      },
    ],
    result: {
      title: 'A guide in the forest',
      text: 'The travellers reach safe ground, and the archer who marked their path joins Arjuna. He knows where the corruption is strongest and who has gone to meet it.',
    },
    unlocks: ['ekalavya'],
  },
  {
    n: 3,
    title: 'The Broken Formation',
    setup:
      'A ring of warriors closes on Abhimanyu\'s company and does not stop turning. He is brave enough to charge it, and wise enough, this time, to plan the way back out first.',
    lead: 'abhimanyu',
    palette: 'field',
    steps: [
      {
        kind: 'dialogue',
        lines: [
          { speaker: N, text: 'On a dusty plain, warriors move in a slow spiral. Each ring turns the opposite way to the one inside it.' },
          { speaker: 'abhimanyu', text: 'It is a circle that closes behind whoever enters. I can see the way in. I want the way out first.' },
          { speaker: 'bhima', text: 'Practice on me. Hit me from the angle you would use, and I will tell you where the line is thin.' },
        ],
      },
      {
        kind: 'fight',
        opponent: 'bhima',
        difficulty: 'normal',
        hints: [
          'Stay just outside your opponent\'s reach, then step in when he swings and misses.',
          'Dashes carry you through him, but you land exposed: use them to escape, not to start fights.',
        ],
      },
      {
        kind: 'dialogue',
        lines: [
          { speaker: N, text: 'The formation shifts. Shadows move in it that are not quite soldiers: they flicker, and a second shape stands where one was a moment ago.' },
          { speaker: 'abhimanyu', text: 'Decoys. Which one is real?' },
        ],
      },
      {
        kind: 'fight',
        opponent: 'ghatotkacha',
        difficulty: 'normal',
        hints: [
          'A decoy vanishes when you hit it. If the shape in front of you is a double, the real one is somewhere else.',
          'Marked zones on the floor tell you where a big attack is going to land. Step out of them.',
        ],
      },
      {
        kind: 'dialogue',
        lines: [
          { speaker: 'ghatotkacha', text: 'You read the pattern well. I was told to keep you inside it. I did not say I would, once I saw you were not here to hurt anyone.' },
          { speaker: 'abhimanyu', text: 'Then show my allies the thin place in the ring. We leave together or not at all.' },
        ],
      },
    ],
    result: {
      title: 'The ring opens',
      text: 'Abhimanyu leads his company out along a path they planned before they went in. Courage guided by preparation costs less than courage alone.',
    },
    unlocks: [],
  },
  {
    n: 4,
    title: 'The Rival\'s Trial',
    setup:
      'At dawn, a village stands between Arjuna and a warrior with a debt of loyalty on one side and a lifetime of unanswered questions on the other. The duel will not settle either, but it will say what each of them is.',
    lead: 'arjuna',
    palette: 'dawn',
    steps: [
      {
        kind: 'dialogue',
        lines: [
          { speaker: N, text: 'A village on a hill, thatch gold in the early light. A tall figure stands in the road with a spear grounded at his side.' },
          { speaker: 'karna', text: 'I promised one side that I would stop you. I did not promise to harm the people behind me, so I will do neither: I will fight you here, and no farther.' },
          { speaker: 'arjuna', text: 'You always have a reason that is better than mine. Tell me why it matters to you who wins.' },
          { speaker: 'karna', text: 'Because no one has ever asked what I would do if I were simply allowed to choose.' },
        ],
      },
      { kind: 'fight', opponent: 'karna', difficulty: 'normal' },
      {
        kind: 'choice',
        id: 'trial',
        prompt: 'The duel is over, and the corrupted weapons are still humming somewhere to the north.',
        options: [
          { id: 'pursue', label: 'PURSUE THE SOURCE', text: 'Leave at once. The village is safe, and time matters.' },
          { id: 'stay', label: 'STAY AND HELP', text: 'Spend the day with the village first. Karna remembers who stood with him.' },
        ],
      },
      {
        kind: 'dialogue',
        when: { choice: 'trial', is: 'pursue' },
        lines: [
          { speaker: 'arjuna', text: 'We cannot wait. Karna, will you come, or will you go back to the one you promised?' },
          { speaker: 'karna', text: 'Not yet. Go. I will find you when I know which promise is the true one.' },
        ],
      },
      {
        kind: 'dialogue',
        when: { choice: 'trial', is: 'stay' },
        lines: [
          { speaker: 'arjuna', text: 'The north can wait a day. Help me raise the walls on the east side, and we will go together.' },
          { speaker: 'karna', text: 'You would ask me that, after this morning? Then I know what I want to carry with me. Lead; I will follow, this once.' },
        ],
      },
    ],
    result: {
      title: 'A rival with a reason',
      text: 'Arjuna understands Karna a little better, and neither of them is sure that understanding will be enough. The road north is open.',
    },
    unlocks: ['karna'],
  },
  {
    n: 5,
    title: 'The Night of Illusions',
    setup:
      'The forest at night fills with doubles that do not tire and shapes that do not breathe. Bhima has to learn to read the tells, and then, for once, to trust the guardian who made them.',
    lead: 'bhima',
    palette: 'night',
    steps: [
      {
        kind: 'dialogue',
        lines: [
          { speaker: N, text: 'Moonlight through the leaves. In the gaps between the trees, shapes stand very still, and then they are not where they were.' },
          { speaker: 'bhima', text: 'There are too many of you, and I know the real one is smiling at me from the back.' },
          { speaker: 'ghatotkacha', text: 'Father. You came. I was afraid you would meet me when the power turned wrong.' },
        ],
      },
      {
        kind: 'fight',
        opponent: 'ghatotkacha',
        difficulty: 'normal',
        hints: [
          'Strike the double and it disappears. If it disappears, the real one is not there.',
          'A marked floor zone shows where the real slam lands. Walk out of it, then punish his recovery.',
        ],
      },
      {
        kind: 'dialogue',
        lines: [
          { speaker: 'ghatotkacha', text: 'The corrupted weapons are drawn to us. To me, to you. I can hold the forest, but I cannot also hold the one who is coming for it.' },
          { speaker: 'bhima', text: 'Who is coming?' },
          { speaker: N, text: 'A gold-armoured figure steps out of the dark, his spear dripping with a light that does not belong to him.' },
        ],
      },
      {
        kind: 'fight',
        player: 'ghatotkacha',
        opponent: 'karna',
        difficulty: 'normal',
        hints: ['You play Ghatotkacha now. Use your double to hold the front, then strike from the side.'],
      },
      {
        kind: 'dialogue',
        lines: [
          { speaker: 'karna', text: 'It lets go. I felt it let go when you did not strike back at the end. Whoever you are, I am grateful.' },
          { speaker: 'ghatotkacha', text: 'Strength is only worth what it shelters. Stay with us. We will need all of it.' },
        ],
      },
    ],
    result: {
      title: 'A guardian in the dark',
      text: 'The doubles fade at dawn. The forest families are safe, and a young guardian who was once feared joins the heroes as an equal.',
    },
    unlocks: ['ghatotkacha'],
  },
  {
    n: 6,
    title: 'The Vow and the Weapon',
    setup:
      'On a mountain hermitage, an old teacher recognises the signs of a power he once believed contained. He asks the heroes a question without an easy answer: which promise comes first?',
    lead: 'parashurama',
    palette: 'mountain',
    steps: [
      {
        kind: 'dialogue',
        lines: [
          { speaker: N, text: 'A hermitage above the clouds, an axe grounded in the stone. A teacher stands with it, not raising it.' },
          { speaker: 'parashurama', text: 'I made a vow once that I would end a kind of war. I believed it was done. These weapons say otherwise, and I am no longer sure I understood my own vow.' },
          { speaker: 'karna', text: 'You taught me to draw a bow. You never told me when not to.' },
          { speaker: 'parashurama', text: 'No. That is the lesson I owe you. I will give it now, here, as I should have then.' },
        ],
      },
      {
        kind: 'fight',
        opponent: 'karna',
        difficulty: 'normal',
        hints: ['A teacher does not rush. Wait for the opening, then take it with something heavy.'],
      },
      {
        kind: 'choice',
        id: 'vow',
        prompt: 'The corruption is spreading toward three places at once. What does Parashurama advise?',
        options: [
          { id: 'pursue', label: 'PURSUE THE SOURCE', text: 'Strike at the cause now. Allies face the one who commands the corrupted weapons.' },
          { id: 'negotiate', label: 'NEGOTIATE', text: 'Send word to the one at the centre and ask what he wants. A harder, steadier path.' },
          { id: 'protect', label: 'PROTECT THE PEOPLE', text: 'Shelter the villages first. The heroes enter the final fight with strength in reserve.' },
        ],
      },
      {
        kind: 'dialogue',
        lines: [
          { speaker: 'parashurama', text: 'Whatever you choose, choose it knowing what it costs. A vow kept without judgment is just habit with a good name.' },
        ],
      },
    ],
    result: {
      title: 'The vow, examined',
      text: 'The heroes leave the hermitage with a decision and a warning. What they chose here will shape who stands beside them, and what they carry into the last fight.',
    },
    unlocks: [],
  },
  {
    n: 7,
    title: 'The Gathering of Allies',
    setup:
      'The heroes gather at last, and the consequences of every choice are visible in who is standing there. One of them will lead the way to the source; the player decides who.',
    lead: 'arjuna',
    palette: 'dawn',
    steps: [
      { kind: 'pickHero', id: 'ally', prompt: 'WHO LEADS THE FINAL JOURNEY? Choose a hero.' },
      {
        kind: 'dialogue',
        lines: [
          { speaker: N, text: 'A hall of stone at the edge of the world. Heroes who first met as strangers stand together.' },
          { speaker: 'arjuna', text: 'We are not all of us who were in this. Whoever leads, we all carry the doubt.' },
        ],
      },
      {
        kind: 'dialogue',
        when: { choice: 'trial', is: 'stay' },
        lines: [{ speaker: 'karna', text: 'I stayed that day because I was asked. I am here now because I was not told to be.' }],
      },
      {
        kind: 'dialogue',
        when: { choice: 'vow', is: 'protect' },
        lines: [{ speaker: 'parashurama', text: 'The villages are sheltered. We go to the end with something in reserve. That was the point.' }],
      },
      {
        kind: 'dialogue',
        when: { choice: 'vow', is: 'negotiate' },
        lines: [{ speaker: 'parashurama', text: 'The one at the centre answered. He will not tell us his terms. He will meet us.' }],
      },
      {
        kind: 'dialogue',
        when: { choice: 'vow', is: 'pursue' },
        lines: [{ speaker: 'parashurama', text: 'We struck first. It cost us. That is also an answer, and we will carry it.' }],
      },
      { kind: 'fight', player: 'ally', opponent: 'ashwatthama', difficulty: 'normal', when: { choice: 'vow', is: 'pursue' } },
      { kind: 'fight', player: 'ally', opponent: 'karna', difficulty: 'normal', when: { choice: 'vow', is: 'negotiate' } },
      { kind: 'fight', player: 'ally', opponent: 'ghatotkacha', difficulty: 'normal', when: { choice: 'vow', is: 'protect' } },
      { kind: 'fight', player: 'ally', opponent: 'parashurama', difficulty: 'normal' },
      {
        kind: 'dialogue',
        lines: [
          { speaker: 'parashurama', text: 'You are ready. Not because you win, but because you stopped when the fight was done.' },
        ],
      },
    ],
    result: {
      title: 'Together',
      text: 'The allies choose their leader and go north. Everything the player decided is now someone standing beside them.',
    },
    unlocks: [],
  },
  {
    n: 8,
    title: 'The Final Astra',
    setup:
      'At the source of the disturbance stands a veteran whose grief has become a weapon. The heroes must stop him, and decide on the way what they owe someone who is hurting.',
    lead: 'ally',
    palette: 'ruins',
    steps: [
      {
        kind: 'dialogue',
        lines: [
          { speaker: N, text: 'Storm-dark ruins. A figure stands in the middle of them with a blue fire at his back and a sword lowered.' },
          { speaker: 'ashwatthama', text: 'I have been told I am the reason the weapons turned. That is not wrong. But I did not do it to hurt you. I did it so something I lost could be undone.' },
          { speaker: 'arjuna', text: 'It cannot be undone. I am sorry. I do not say that to make you stop. I say it because it is true, and no one has said it to you.' },
          { speaker: 'ashwatthama', text: 'Then there is nothing left to fight for, and nothing to stop me.' },
        ],
      },
      {
        kind: 'fight',
        player: 'ally',
        opponent: 'ashwatthama',
        difficulty: 'hard',
        roundsToWin: 3,
        startMeterIf: { choice: 'vow', is: 'protect', meter: 60 },
        hints: [
          'Each stage of his ultimate is marked on the floor and strikes 40 frames later: move out of the mark, then out of the next.',
          'When he shifts stance, he is open for a moment. That is the time to hit him.',
        ],
      },
      {
        kind: 'dialogue',
        lines: [
          { speaker: 'ashwatthama', text: 'You did not finish it. You could have.' },
          { speaker: 'arjuna', text: 'I could have. That is the whole of what I learned. Come away from here; the weapons will quiet when you do.' },
          { speaker: N, text: 'The blue fire gutters out. In the silence, in four realms, the weapons stop humming.' },
        ],
      },
    ],
    result: {
      title: 'Restraint',
      text: 'The Hollow Astra fades. The weapons are only weapons again, and the heroes are left with the thing that mattered most: they stopped when the fight was done. The story of what comes next is theirs to tell.',
    },
    unlocks: ['ashwatthama'],
  },
];

// ---- Resolution (pure) ------------------------------------------------------------------

export type Choices = Readonly<Record<string, string>>;

export function chapterByNumber(n: number): Chapter | undefined {
  return CHAPTERS.find((c) => c.n === n);
}

function matches(c: Condition | undefined, choices: Choices): boolean {
  if (!c) return true;
  const v = choices[c.choice];
  return Array.isArray(c.is) ? (c.is as readonly string[]).includes(v ?? '') : v === c.is;
}

/** The steps of a chapter that run for these choices, in order. */
export function resolveSteps(chapter: Chapter, choices: Choices): Step[] {
  return chapter.steps.filter((s) => matches(s.when, choices));
}

/** The hero the player controls in a fight step ('ally' is the chapter-7 pick, default Arjuna). */
export function playerFor(chapter: Chapter, step: FightStep, choices: Choices): HeroId {
  const p = step.player ?? chapter.lead;
  if (p !== 'ally') return p;
  return (choices.ally as HeroId | undefined) ?? 'arjuna';
}

export function leadFor(chapter: Chapter, choices: Choices): HeroId {
  return chapter.lead === 'ally' ? ((choices.ally as HeroId | undefined) ?? 'arjuna') : chapter.lead;
}

/** Chapter `n` can be started once chapter `n - 1` is finished (chapter 1 always can). */
export function isChapterUnlocked(n: number, completed: readonly number[]): boolean {
  return n <= 1 || completed.includes(n - 1);
}

/** Start meter for a fight step given the choices made so far. */
export function startMeterFor(step: FightStep, choices: Choices): number {
  const r = step.startMeterIf;
  return r && choices[r.choice] === r.is ? r.meter : 0;
}
