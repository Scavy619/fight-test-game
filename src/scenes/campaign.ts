// The story campaign: a menu (continue, new, chapter select), a card per chapter, then the
// chapter's steps (dialogue, choice, hero pick, fight) and a result card. Progress is saved
// after every step, so leaving mid-chapter resumes at the same step.
import { DIFFICULTY_DAMAGE, createAi } from '../ai';
import {
  CHAPTERS,
  chapterByNumber,
  isChapterUnlocked,
  leadFor,
  playerFor,
  resolveSteps,
  startMeterFor,
  type Chapter,
  type FightStep,
} from '../content/campaign';
import type { Match } from '../sim';
import { HEROES, isHeroId, type HeroId } from '../content/heroes';
import { ROSTER } from '../content/roster';
import { grantUnlocks } from '../content/unlocks';
import type { GameContext } from '../engine';
import { HUD_FONT, P_COLORS } from '../render/hud';
import { STAGE_PALETTES } from '../render/stage';
import { drawWrapped } from '../render/text';
import { createCard } from './card';
import { createCharSelect } from './charSelect';
import { withControlsGate } from './controlsScreen';
import { createDialogueScene } from './dialogue';
import { createFightScene } from './fight';
import { MENU_CYAN } from './listMenu';
import { createSoloHuman } from './soloControls';

const nameOf = (id: string): string => ROSTER.find((r) => r.id === id)?.name ?? id;
const TOTAL = CHAPTERS.length;
const HINT_FRAMES = 420;

type Back = () => void;

/** Entry from the main menu. */
export function startCampaign(game: GameContext, back: Back): void {
  menu(game, back);
}

function menu(game: GameContext, back: Back): void {
  const c = game.save.data.campaign;
  const finished = c.completed.length >= TOTAL;
  const started = c.completed.length > 0 || c.step > 0;
  const next = Math.min(c.current, TOTAL);
  const items = [];
  if (started && !finished) {
    const ch = chapterByNumber(next);
    items.push({ id: 'continue', label: `CONTINUE · CHAPTER ${next}`, hint: ch?.title ?? '' });
  } else if (!started) {
    items.push({ id: 'continue', label: 'BEGIN THE STORY' });
  }
  items.push({ id: 'select', label: 'CHAPTER SELECT' });
  if (started) items.push({ id: 'new', label: 'NEW CAMPAIGN' });
  items.push({ id: 'back', label: 'MAIN MENU' });
  game.scenes.set(
    createCard(game, {
      heading: 'STORY CAMPAIGN',
      subheading: 'A fictional adaptation inspired by epic traditions',
      progress: { total: TOTAL, done: c.completed.length },
      lines: [
        finished
          ? 'You have finished the story. Replay any chapter from chapter select; your choices are kept until you start a new campaign.'
          : 'Eight chapters. Your choices change who fights beside you. Progress saves after every step.',
      ],
      items,
      onPick: (id) => {
        if (id === 'continue') begin(game, next, back);
        else if (id === 'select') select(game, back);
        else if (id === 'new') confirmNew(game, back);
        else back();
      },
      onBack: back,
    }),
  );
}

function confirmNew(game: GameContext, back: Back): void {
  game.scenes.set(
    createCard(game, {
      heading: 'START A NEW CAMPAIGN?',
      lines: ['Your chapter progress and choices will be erased. Heroes you have unlocked stay unlocked.'],
      items: [
        { id: 'no', label: 'KEEP MY PROGRESS' },
        { id: 'yes', label: 'ERASE AND START OVER' },
      ],
      onPick: (id) => {
        if (id === 'yes') {
          game.save.resetCampaign();
          begin(game, 1, back);
        } else menu(game, back);
      },
      onBack: () => menu(game, back),
    }),
  );
}

function select(game: GameContext, back: Back): void {
  const done = game.save.data.campaign.completed;
  game.scenes.set(
    createCard(game, {
      heading: 'CHAPTER SELECT',
      subheading: 'Replaying a chapter keeps your later progress',
      items: [
        ...CHAPTERS.map((c) => {
          const open = isChapterUnlocked(c.n, done);
          return {
            id: String(c.n),
            label: `${c.n} · ${c.title.toUpperCase()}${done.includes(c.n) ? ' ✓' : ''}`,
            hint: open ? '' : `Finish chapter ${c.n - 1} first`,
            enabled: open,
          };
        }),
        { id: 'back', label: 'BACK' },
      ],
      onPick: (id) => (id === 'back' ? menu(game, back) : begin(game, Number(id), back)),
      onBack: () => menu(game, back),
    }),
  );
}

/** Opens chapter `n`: resumes the saved step if that is this chapter, otherwise the intro card. */
function begin(game: GameContext, n: number, back: Back): void {
  const chapter = chapterByNumber(n);
  if (!chapter) return menu(game, back);
  const c = game.save.data.campaign;
  const resume = c.current === n && c.step > 0 ? c.step : 0;
  if (resume > 0) return runStep(game, chapter, resume, back);
  game.save.update((d) => {
    d.campaign.current = n;
    d.campaign.step = 0;
  });
  intro(game, chapter, back);
}

function intro(game: GameContext, chapter: Chapter, back: Back): void {
  const lead = leadFor(chapter, game.save.data.campaign.choices);
  game.scenes.set(
    createCard(game, {
      heading: `CHAPTER ${chapter.n}`,
      subheading: chapter.title.toUpperCase(),
      progress: { total: TOTAL, done: chapter.n - 1 },
      portraits: [{ heroId: lead, caption: nameOf(lead).toUpperCase() }],
      lines: [chapter.setup],
      items: [
        { id: 'go', label: 'BEGIN' },
        { id: 'back', label: 'BACK' },
      ],
      onPick: (id) => (id === 'go' ? runStep(game, chapter, 0, back) : menu(game, back)),
      onBack: () => menu(game, back),
    }),
  );
}

function runStep(game: GameContext, chapter: Chapter, i: number, back: Back): void {
  const choices = game.save.data.campaign.choices;
  const steps = resolveSteps(chapter, choices);
  const step = steps[i];
  if (!step) return result(game, chapter, back);
  game.save.update((d) => {
    d.campaign.current = chapter.n;
    d.campaign.step = i;
  });
  const heading = `CHAPTER ${chapter.n} · ${chapter.title.toUpperCase()}`;
  const next = (): void => runStep(game, chapter, i + 1, back);
  switch (step.kind) {
    case 'dialogue':
      game.scenes.set(createDialogueScene(game, { lines: step.lines, heading, onDone: next }));
      return;
    case 'choice':
      game.scenes.set(
        createCard(game, {
          heading: 'A CHOICE',
          subheading: heading,
          lines: [step.prompt, ...step.options.map((o) => `${o.label}: ${o.text}`)],
          items: step.options.map((o) => ({ id: o.id, label: o.label })),
          onPick: (id) => {
            game.save.update((d) => {
              d.campaign.choices[step.id] = id;
            });
            next();
          },
          onBack: () => menu(game, back),
        }),
      );
      return;
    case 'pickHero':
      game.scenes.set(
        createCharSelect(game, {
          heading: step.prompt,
          accent: P_COLORS[0],
          onBack: () => menu(game, back),
          onPick: (id) => {
            game.save.update((d) => {
              d.campaign.choices[step.id] = id;
            });
            next();
          },
        }),
      );
      return;
    case 'fight':
      withControlsGate(game, true, () => fight(game, chapter, step, i, back));
      return;
  }
}

function hintOverlay(hints: readonly string[], inner: (ctx: CanvasRenderingContext2D, m: Match) => void) {
  let frames = 0;
  return (ctx: CanvasRenderingContext2D, m: Match): void => {
    inner(ctx, m);
    frames += 1;
    const k = Math.floor(frames / HINT_FRAMES);
    const text = hints[k];
    if (!text) return;
    ctx.save();
    ctx.font = `700 18px ${HUD_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(8,12,26,0.82)';
    ctx.fillRect(240, 118, 800, 64);
    ctx.strokeStyle = MENU_CYAN;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(240, 118, 800, 64);
    ctx.fillStyle = '#FFFFFF';
    drawWrapped(ctx, `TIP ${k + 1}/${hints.length}: ${text}`, 640, 130, 760, 24, 2);
    ctx.restore();
  };
}

function fight(game: GameContext, chapter: Chapter, step: FightStep, i: number, back: Back): void {
  const choices = game.save.data.campaign.choices;
  const playerId: HeroId = playerFor(chapter, step, choices);
  if (!isHeroId(step.opponent)) return menu(game, back);
  const p1 = HEROES[playerId];
  const p2 = HEROES[step.opponent];
  const human = createSoloHuman(game, p1.look.accent);
  const seed = (Math.random() * 0xffffffff) >>> 0;
  const overlay = step.hints && step.hints.length > 0 ? hintOverlay(step.hints, human.overlay) : human.overlay;
  const meter = startMeterFor(step, choices);
  game.scenes.set(
    createFightScene(game, {
      fighters: [p1, p2],
      controllers: [human.controller, createAi(step.difficulty, seed)],
      damageScale: [1, DIFFICULTY_DAMAGE[step.difficulty]],
      roundsToWin: step.roundsToWin,
      palette: STAGE_PALETTES[step.palette ?? chapter.palette],
      startMeter: [meter, 0],
      solo: true,
      overlay,
      noRematch: true,
      endPrompt: null,
      onExit: () => menu(game, back),
      onMatchEnd: (winner) => {
        if (winner === 0) runStep(game, chapter, i + 1, back);
        else lost(game, chapter, step, i, back);
      },
    }),
  );
}

function lost(game: GameContext, chapter: Chapter, step: FightStep, i: number, back: Back): void {
  game.scenes.set(
    createCard(game, {
      heading: 'DEFEATED',
      subheading: `${nameOf(step.opponent)} won this time`,
      lines: ['Nothing is lost. Your progress is saved, and the story waits at this fight.'],
      items: [
        { id: 'retry', label: 'TRY AGAIN' },
        { id: 'menu', label: 'CAMPAIGN MENU' },
      ],
      onPick: (id) => (id === 'retry' ? fight(game, chapter, step, i, back) : menu(game, back)),
      onBack: () => menu(game, back),
    }),
  );
}

function result(game: GameContext, chapter: Chapter, back: Back): void {
  const fresh = [
    ...grantUnlocks(game.save, { kind: 'chapter', chapter: chapter.n }),
    ...(chapter.n === TOTAL ? grantUnlocks(game.save, { kind: 'campaign' }) : []),
  ];
  game.save.update((d) => {
    if (!d.campaign.completed.includes(chapter.n)) d.campaign.completed.push(chapter.n);
    d.campaign.current = Math.min(chapter.n + 1, TOTAL);
    d.campaign.step = 0;
  });
  const lines = [chapter.result.text];
  if (fresh.length > 0) lines.push(`UNLOCKED: ${fresh.map(nameOf).join(', ')}`);
  const last = chapter.n >= TOTAL;
  game.scenes.set(
    createCard(game, {
      heading: last ? 'THE STORY ENDS' : chapter.result.title.toUpperCase(),
      subheading: `Chapter ${chapter.n} complete`,
      progress: { total: TOTAL, done: chapter.n },
      portraits: [{ heroId: leadFor(chapter, game.save.data.campaign.choices) }],
      lines,
      items: [
        ...(last ? [] : [{ id: 'next', label: 'NEXT CHAPTER' }]),
        { id: 'menu', label: 'CAMPAIGN MENU' },
        { id: 'main', label: 'MAIN MENU' },
      ],
      onPick: (id) => {
        if (id === 'next') begin(game, chapter.n + 1, back);
        else if (id === 'menu') menu(game, back);
        else back();
      },
      onBack: () => menu(game, back),
    }),
  );
}
