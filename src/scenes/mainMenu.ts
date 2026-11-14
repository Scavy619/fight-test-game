// Title and main menu of ASTRA, and `startMode`, which starts a match in a mode (also used
// by the `?mode=` deep link). Modes that later slices add are listed but disabled, with the
// slice named in the hint, so nothing on screen is a dead button without an explanation.
import { DIFFICULTY_DAMAGE, createAi, type Difficulty } from '../ai';
import { FIGHTERS } from '../content/fighters';
import { mergeFrames, mouseToFrame, type GameContext, type Scene } from '../engine';
import { actionAt, drawActionBar, overActionBar, type ActionId } from '../render/actionBar';
import { HUD_FONT } from '../render/hud';
import { GROUND_Y } from '../render/stage';
import { EMPTY_INPUT, METER_MAX, type InputFrame } from '../sim';
import { createControlsScreen } from './controlsScreen';
import { createFightScene, type Controller } from './fight';
import { ListMenu, MENU_CYAN, MENU_DIM, MENU_TEXT, drawMenuBackdrop, drawNotice, drawTitle, type ListItem } from './listMenu';

/** Match modes that exist today; the menu also lists the modes later slices add. */
export type Mode = 'versus' | Difficulty;

export const MODES: readonly Mode[] = ['versus', 'easy', 'normal', 'hard'];

export function isMode(v: string | null): v is Mode {
  return v !== null && (MODES as readonly string[]).includes(v);
}

/** What the solo controller saw this step, for drawing the action bar. */
interface BarState {
  hover: ActionId | null;
  active: Set<ActionId>;
}

/**
 * Human P1 for solo play: keyboard (and pad) merged with the mouse. Over the action bar the
 * cursor stops steering the fighter and the left button presses or holds the hovered action.
 */
function mouseAndKeyboard(game: GameContext, bar: BarState): Controller {
  return (match, i) => {
    const f = match.state.fighters[i];
    const m = game.mouse.state;
    const onBar = m.active && overActionBar(m.x, m.y);
    const hovered = onBar ? actionAt(m.x, m.y) : null;
    bar.hover = hovered?.id ?? null;
    bar.active.clear();
    let mouse: InputFrame;
    if (onBar) {
      mouse = { ...EMPTY_INPUT };
      if (hovered && m.light) {
        for (const k of hovered.inputs) mouse[k] = true;
        bar.active.add(hovered.id);
      }
    } else {
      mouse = mouseToFrame(m, { x: f.x, y: f.y, height: match.defs[i].stats.height }, GROUND_Y);
    }
    // Solo: both keyboard sets and any gamepad drive the human (P2's inputs are otherwise unused).
    return mergeFrames(mergeFrames(game.input.frames[0], game.input.frames[1]), mouse);
  };
}

/** Shows the controls screen first when the player has never seen it, then runs `start`. */
function withControlsGate(game: GameContext, solo: boolean, start: () => void): void {
  if (game.save.data.seenControls) return start();
  game.scenes.set(createControlsScreen(game, { solo, onDone: start }));
}

/** Starts a match in the given mode; backing out returns to the main menu. */
export function startMode(game: GameContext, mode: Mode): void {
  const onExit = (): void => game.scenes.set(createMainMenuScene(game, mode));
  if (mode === 'versus') {
    withControlsGate(game, false, () =>
      game.scenes.set(createFightScene(game, { fighters: [FIGHTERS.rei, FIGHTERS.vira], onExit })),
    );
    return;
  }
  withControlsGate(game, true, () => {
    const seed = (Math.random() * 0xffffffff) >>> 0;
    const bar: BarState = { hover: null, active: new Set() };
    const accent = FIGHTERS.rei.look.accent;
    game.scenes.set(
      createFightScene(game, {
        fighters: [FIGHTERS.rei, FIGHTERS.vira],
        controllers: [mouseAndKeyboard(game, bar), createAi(mode, seed)],
        damageScale: [1, DIFFICULTY_DAMAGE[mode]],
        onExit,
        solo: true,
        overlay: (ctx, match) => {
          const f = match.state.fighters[0];
          drawActionBar(ctx, {
            hover: bar.hover,
            active: bar.active,
            ultimateReady: f.meter >= METER_MAX,
            charging: f.state === 'charge',
            accent,
            frame: match.state.frame,
          });
        },
      }),
    );
  });
}

type MenuId = 'campaign' | 'arcade' | 'cpu' | 'versus' | 'practice' | 'gallery' | 'controls';
type CpuId = 'easy' | 'normal' | 'hard' | 'back';

const MAIN_ITEMS: ListItem[] = [
  { id: 'campaign', label: 'STORY CAMPAIGN', hint: 'Eight chapters, choices and saves. Arrives with slice A8.', enabled: false },
  { id: 'arcade', label: 'ARCADE', hint: 'A ladder of opponents ending in your rival. Arrives with slice A6.', enabled: false },
  { id: 'cpu', label: 'VERSUS CPU', hint: 'One match against the computer at easy, normal or hard. Keyboard, mouse or pad.' },
  { id: 'versus', label: 'TWO PLAYERS', hint: 'Two players on one keyboard or two pads.' },
  { id: 'practice', label: 'PRACTICE', hint: 'Dummy opponent, reset and the move list. Arrives with slice A5.', enabled: false },
  { id: 'gallery', label: 'GALLERY', hint: 'Every hero: loadout, moves, story and unlock. Arrives with slice A5.', enabled: false },
  { id: 'controls', label: 'CONTROLS', hint: 'Keyboard, mouse and gamepad controls.' },
];

const CPU_ITEMS: ListItem[] = [
  { id: 'easy', label: 'EASY', hint: 'Slow to react, forgiving, deals half damage.' },
  { id: 'normal', label: 'NORMAL', hint: 'Blocks and punishes sometimes, deals 80% damage.' },
  { id: 'hard', label: 'HARD', hint: 'Reacts in four frames, grabs blockers, uses the power strike.' },
  { id: 'back', label: 'BACK', hint: '' },
];

export function createMainMenuScene(game: GameContext, remember: Mode | null = null): Scene {
  const main = new ListMenu(game, MAIN_ITEMS, { y0: 286, step: 46, size: 28, w: 520, h: 40 });
  const cpu = new ListMenu(game, CPU_ITEMS, { y0: 300, step: 52 });
  let page: 'main' | 'cpu' = 'main';
  if (remember && remember !== 'versus') {
    page = 'cpu';
    cpu.index = Math.max(0, CPU_ITEMS.findIndex((i) => i.id === remember));
  } else if (remember === 'versus') {
    main.index = MAIN_ITEMS.findIndex((i) => i.id === 'versus');
  } else {
    main.index = MAIN_ITEMS.findIndex((i) => i.id === 'cpu');
  }

  function update(): void {
    if (page === 'main') {
      const picked = main.update() as MenuId | 'back' | null;
      if (picked === 'cpu') page = 'cpu';
      else if (picked === 'versus') startMode(game, 'versus');
      else if (picked === 'controls') {
        game.scenes.set(createControlsScreen(game, { solo: true, onDone: () => game.scenes.set(createMainMenuScene(game)) }));
      }
      return;
    }
    const picked = cpu.update() as CpuId | null;
    if (picked === 'back') page = 'main';
    else if (picked) startMode(game, picked);
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
