// Title and main menu of ASTRA, and `startMode`, which starts a match in a mode (also used
// by the `?mode=` deep link). Modes that later slices add are listed but disabled, with the
// slice named in the hint, so nothing on screen is a dead button without an explanation.
import { DIFFICULTY_DAMAGE, createAi, type Difficulty } from '../ai';
import { HEROES, type HeroId } from '../content/heroes';
import type { GameContext, Scene } from '../engine';
import { HUD_FONT, P_COLORS } from '../render/hud';
import { createCharSelect } from './charSelect';
import { createControlsScreen, withControlsGate } from './controlsScreen';
import { createFightScene } from './fight';
import { createGalleryScene } from './gallery';
import { startArcade } from './arcade';
import { startCampaign } from './campaign';
import { startPractice } from './practice';
import { createSoloHuman } from './soloControls';
import { ListMenu, MENU_CYAN, MENU_DIM, MENU_TEXT, drawMenuBackdrop, drawNotice, drawTitle, type ListItem } from './listMenu';

/** Match modes that exist today; the menu also lists the modes later slices add. */
export type Mode = 'versus' | Difficulty;

export const MODES: readonly Mode[] = ['versus', 'easy', 'normal', 'hard'];

export function isMode(v: string | null): v is Mode {
  return v !== null && (MODES as readonly string[]).includes(v);
}

export interface MatchSetup {
  mode: Mode;
  /** Hero for P1 (the human in solo modes). */
  player: HeroId;
  /** Hero for P2 (the computer in solo modes). */
  opponent: HeroId;
}

/** Heroes used by the `?mode=` deep link. */
export const DEFAULT_HEROES: readonly [HeroId, HeroId] = ['arjuna', 'bhima'];

/** Starts a match with the given heroes; backing out returns to the main menu on that mode. */
export function startMatch(game: GameContext, setup: MatchSetup): void {
  const { mode } = setup;
  const onExit = (): void => game.scenes.set(createMainMenuScene(game, mode));
  const p1 = HEROES[setup.player];
  const p2 = HEROES[setup.opponent];
  if (mode === 'versus') {
    withControlsGate(game, false, () => game.scenes.set(createFightScene(game, { fighters: [p1, p2], onExit })));
    return;
  }
  withControlsGate(game, true, () => {
    const seed = (Math.random() * 0xffffffff) >>> 0;
    const human = createSoloHuman(game, p1.look.accent);
    game.scenes.set(
      createFightScene(game, {
        fighters: [p1, p2],
        controllers: [human.controller, createAi(mode, seed)],
        damageScale: [1, DIFFICULTY_DAMAGE[mode]],
        onExit,
        solo: true,
        overlay: human.overlay,
      }),
    );
  });
}

/** Starts a match in the given mode with the default heroes (the `?mode=` deep link). */
export function startMode(game: GameContext, mode: Mode): void {
  startMatch(game, { mode, player: DEFAULT_HEROES[0], opponent: DEFAULT_HEROES[1] });
}

export interface PickHeroesOptions {
  first: string;
  second: string;
  /** Leave from the first pick. */
  toMenu: () => void;
  then: (player: HeroId, opponent: HeroId) => void;
}

/** Two character selects in a row (hero, then opponent); backing out of the second returns to the first. */
export function pickHeroes(game: GameContext, o: PickHeroesOptions): void {
  const first = (initial?: HeroId): void => {
    game.scenes.set(
      createCharSelect(game, {
        heading: o.first,
        accent: P_COLORS[0],
        initial,
        onBack: o.toMenu,
        onPick: (player) => {
          game.scenes.set(
            createCharSelect(game, {
              heading: o.second,
              accent: P_COLORS[1],
              initial: player === 'arjuna' ? 'bhima' : 'arjuna',
              onBack: () => first(player),
              onPick: (opponent) => o.then(player, opponent),
            }),
          );
        },
      }),
    );
  };
  first();
}

/** Character select for a mode, then the match. Backing out of the first pick returns to the menu. */
export function chooseHeroes(game: GameContext, mode: Mode): void {
  const versus = mode === 'versus';
  pickHeroes(game, {
    first: versus ? 'PLAYER 1: CHOOSE YOUR HERO' : 'CHOOSE YOUR HERO',
    second: versus ? 'PLAYER 2: CHOOSE YOUR HERO' : 'CHOOSE YOUR OPPONENT',
    toMenu: () => game.scenes.set(createMainMenuScene(game, mode)),
    then: (player, opponent) => startMatch(game, { mode, player, opponent }),
  });
}

type MenuId = 'campaign' | 'arcade' | 'cpu' | 'versus' | 'practice' | 'gallery' | 'controls';
type CpuId = 'easy' | 'normal' | 'hard' | 'back';

const MAIN_ITEMS: ListItem[] = [
  { id: 'campaign', label: 'STORY CAMPAIGN', hint: 'Eight chapters, choices and saves: the story of the Hollow Astra.' },
  { id: 'arcade', label: 'ARCADE', hint: 'Climb a ladder of opponents to your rival and see the ending for your hero.' },
  { id: 'cpu', label: 'VERSUS CPU', hint: 'One match against the computer at easy, normal or hard. Keyboard, mouse or pad.' },
  { id: 'versus', label: 'TWO PLAYERS', hint: 'Two players on one keyboard or two pads.' },
  { id: 'practice', label: 'PRACTICE', hint: 'Train against a dummy: reset, refill and a live move list.' },
  { id: 'gallery', label: 'GALLERY', hint: 'Every hero: loadout, moves, story and unlock state.' },
  { id: 'controls', label: 'CONTROLS', hint: 'Keyboard, mouse and gamepad controls.' },
];

const CPU_ITEMS: ListItem[] = [
  { id: 'easy', label: 'EASY', hint: 'Slow to react, forgiving, deals half damage.' },
  { id: 'normal', label: 'NORMAL', hint: 'Blocks and punishes sometimes, deals 80% damage.' },
  { id: 'hard', label: 'HARD', hint: 'Reacts in four frames, grabs blockers, uses the power strike.' },
  { id: 'back', label: 'BACK', hint: '' },
];

export function createMainMenuScene(game: GameContext, remember: Mode | null = null, focus?: MenuId): Scene {
  const main = new ListMenu(game, MAIN_ITEMS, { y0: 286, step: 46, size: 28, w: 520, h: 40 });
  const cpu = new ListMenu(game, CPU_ITEMS, { y0: 300, step: 52 });
  let page: 'main' | 'cpu' = 'main';
  if (remember && remember !== 'versus') {
    page = 'cpu';
    cpu.index = Math.max(0, CPU_ITEMS.findIndex((i) => i.id === remember));
  } else if (remember === 'versus') {
    main.index = MAIN_ITEMS.findIndex((i) => i.id === 'versus');
  } else {
    main.index = MAIN_ITEMS.findIndex((i) => i.id === (focus ?? 'cpu'));
  }

  function update(): void {
    if (page === 'main') {
      const picked = main.update() as MenuId | 'back' | null;
      if (picked === 'cpu') page = 'cpu';
      else if (picked === 'versus') chooseHeroes(game, 'versus');
      else if (picked === 'campaign') startCampaign(game, () => game.scenes.set(createMainMenuScene(game, null, 'campaign')));
      else if (picked === 'arcade') startArcade(game, () => game.scenes.set(createMainMenuScene(game, null, 'arcade')));
      else if (picked === 'practice') {
        const toMenu = (): void => game.scenes.set(createMainMenuScene(game, null, 'practice'));
        pickHeroes(game, {
          first: 'PRACTICE: CHOOSE YOUR HERO',
          second: 'PRACTICE: CHOOSE AN OPPONENT',
          toMenu,
          then: (player, opponent) => startPractice(game, player, opponent, toMenu),
        });
      } else if (picked === 'gallery') {
        game.scenes.set(createGalleryScene(game, () => game.scenes.set(createMainMenuScene(game, null, 'gallery'))));
      }
      else if (picked === 'controls') {
        game.scenes.set(createControlsScreen(game, { solo: true, onDone: () => game.scenes.set(createMainMenuScene(game)) }));
      }
      return;
    }
    const picked = cpu.update() as CpuId | null;
    if (picked === 'back') page = 'main';
    else if (picked) chooseHeroes(game, picked);
  }

  function render(ctx: CanvasRenderingContext2D): void {
    const w = game.width;
    ctx.save();
    drawMenuBackdrop(ctx, w, game.height);
    drawTitle(ctx, w / 2, 130);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `600 18px ${HUD_FONT}`;
    ctx.fillStyle = MENU_DIM;
    ctx.fillText('EIGHT HEROES · ONE HOLLOW ASTRA', w / 2, 200);
    if (page === 'main') {
      main.draw(ctx);
      ctx.font = `600 16px ${HUD_FONT}`;
      ctx.fillStyle = MENU_TEXT;
      ctx.fillText(main.hint, w / 2, 616);
    } else {
      ctx.font = `italic 800 22px ${HUD_FONT}`;
      ctx.fillStyle = MENU_CYAN;
      ctx.fillText('VERSUS CPU · DIFFICULTY', w / 2, 250);
      cpu.draw(ctx);
      ctx.font = `600 16px ${HUD_FONT}`;
      ctx.fillStyle = MENU_TEXT;
      ctx.fillText(cpu.hint, w / 2, 540);
    }
    const pads = game.input.connectedPads;
    ctx.font = `700 14px ${HUD_FONT}`;
    ctx.fillStyle = pads > 0 ? MENU_CYAN : MENU_DIM;
    ctx.fillText(
      pads > 0 ? `GAMEPAD READY · ${pads} connected · A confirms · Y backs out` : 'Up/down and light or Enter · click with the mouse · gamepad: press any button on it',
      w / 2,
      648,
    );
    drawNotice(ctx, w / 2, 690);
    ctx.restore();
  }

  return {
    enter(): void {
      game.menu.latch();
      game.mouse.takeClick();
    },
    update,
    render(ctx): void {
      render(ctx);
    },
  };
}
