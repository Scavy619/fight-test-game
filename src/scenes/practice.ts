// Practice: pick a hero and an opponent, pick how the opponent behaves, then train with a
// permanent round (no timer, health and meter refill), a reset key and the hero's move list.
//   Backspace: reset positions and refill   Tab: show or hide the move list   Esc: pause
import { DIFFICULTIES, createAi } from '../ai';
import { HEROES, type HeroId } from '../content/heroes';
import type { GameContext } from '../engine';
import { HUD_FONT } from '../render/hud';
import { EMPTY_INPUT, METER_MAX, MOVE_SLOTS, type Match } from '../sim';
import { createControlsScreen } from './controlsScreen';
import { createFightScene, type Controller, type FightApi } from './fight';
import { ListMenu, MENU_CYAN, MENU_DIM, MENU_TEXT, drawMenuBackdrop, drawNotice, type ListItem } from './listMenu';
import { createSoloHuman } from './soloControls';

export type DummyMode = 'still' | 'guard' | 'cpu';

interface DummyInfo {
  id: DummyMode;
  label: string;
  hint: string;
  /** Damage multiplier for the opponent's hits. */
  damage: number;
}

export const DUMMIES: readonly DummyInfo[] = [
  { id: 'still', label: 'STANDING DUMMY', hint: 'Stands still and never attacks. Best for learning combos and spacing.', damage: 0 },
  { id: 'guard', label: 'GUARDING DUMMY', hint: 'Holds block and never attacks. Practise grabs, power strikes and guard breaks.', damage: 0 },
  { id: 'cpu', label: 'GENTLE CPU', hint: 'Fights back slowly and weakly. Practise reacting.', damage: 0.3 },
];

const STILL: Controller = () => ({ ...EMPTY_INPUT });
const GUARD: Controller = () => ({ ...EMPTY_INPUT, block: true });

export function dummyController(mode: DummyMode, seed: number): Controller {
  if (mode === 'still') return STILL;
  if (mode === 'guard') return GUARD;
  return createAi({ ...DIFFICULTIES.easy, aggression: 0.12, mistake: 0.6, think: 40 }, seed);
}

/** The slots shown in the move list, in a readable order. */
const LIST_ORDER = [
  'light', 'heavy', 'crouchLight', 'crouchHeavy', 'airLight', 'airHeavy',
  'specialN', 'specialF', 'specialD', 'ultimate', 'throw', 'power',
] as const;

/** Practice dummy menu, then the training fight. */
export function startPractice(game: GameContext, player: HeroId, opponent: HeroId, back: () => void): void {
  const items: ListItem[] = [
    ...DUMMIES.map((d) => ({ id: d.id, label: d.label, hint: d.hint })),
    { id: 'back', label: 'BACK', hint: '' },
  ];
  const menu = new ListMenu(game, items, { y0: 280, step: 56, size: 28, w: 560 });
  let frame = 0;
  game.scenes.set({
    enter(): void {
      game.menu.latch();
      game.mouse.takeClick();
    },
    update(): void {
      frame += 1;
      const picked = menu.update();
      if (picked === 'back') back();
      else if (picked) {
        const d = DUMMIES.find((x) => x.id === picked);
        if (d) launch(game, player, opponent, d, back);
      }
    },
    render(ctx): void {
      ctx.save();
      drawMenuBackdrop(ctx, game.width, game.height);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `italic 800 40px ${HUD_FONT}`;
      ctx.fillStyle = MENU_CYAN;
      ctx.fillText('PRACTICE', game.width / 2, 100);
      ctx.font = `600 16px ${HUD_FONT}`;
      ctx.fillStyle = MENU_DIM;
      ctx.fillText(`${HEROES[player].def.name} versus ${HEROES[opponent].def.name}: choose how the opponent behaves`, game.width / 2, 160);
      menu.draw(ctx);
      ctx.font = `600 16px ${HUD_FONT}`;
      ctx.fillStyle = MENU_TEXT;
      ctx.fillText(menu.hint, game.width / 2, 560);
      ctx.fillStyle = frame % 120 < 60 ? MENU_DIM : MENU_TEXT;
      ctx.font = `600 14px ${HUD_FONT}`;
      ctx.fillText('In practice: Backspace resets positions, Tab shows or hides the move list, Esc pauses', game.width / 2, 620);
      drawNotice(ctx, game.width / 2, 690);
      ctx.restore();
    },
  });
}

function launch(game: GameContext, player: HeroId, opponent: HeroId, dummy: DummyInfo, back: () => void): void {
  const run = (): void => {
    const p1 = HEROES[player];
    const p2 = HEROES[opponent];
    const human = createSoloHuman(game, p1.look.accent);
    const seed = (Math.random() * 0xffffffff) >>> 0;
    let showList = true;
    let started = false;
    let tabHeld = false;
    let resetHeld = false;

    const onStep = (api: FightApi): void => {
      const m = api.match;
      if (!started) {
        started = true;
        api.reset(true);
        return;
      }
      // A permanent round: no clock, health refills when low, the player's meter stays full.
      m.state.timer = m.state.roundFrames;
      for (const f of m.state.fighters) {
        const i = m.state.fighters.indexOf(f);
        const max = m.defs[i]?.stats.health ?? 1;
        if (f.health < max * 0.35 && f.state !== 'hitstun') f.health = max;
      }
      m.state.fighters[0].meter = METER_MAX;
      const tab = game.input.isKeyDown('Tab');
      if (tab && !tabHeld) showList = !showList;
      tabHeld = tab;
      const reset = game.input.isKeyDown('Backspace');
      if (reset && !resetHeld) api.reset(true);
      resetHeld = reset;
    };

    const overlay = (ctx: CanvasRenderingContext2D, match: Match): void => {
      human.overlay(ctx, match);
      drawPracticeHud(ctx, p1.profile.moves, dummy, showList);
    };

    game.scenes.set(
      createFightScene(game, {
        fighters: [p1, p2],
        controllers: [human.controller, dummyController(dummy.id, seed)],
        damageScale: [1, dummy.damage],
        roundSeconds: 99,
        roundsToWin: 99,
        onExit: back,
        solo: true,
        overlay,
        onStep,
      }),
    );
  };
  if (game.save.data.seenControls) run();
  else game.scenes.set(createControlsScreen(game, { solo: true, onDone: run }));
}

/** Header strip and (optionally) the move list down the left side, under the health bars. */
function drawPracticeHud(
  ctx: CanvasRenderingContext2D,
  moves: Partial<Record<(typeof MOVE_SLOTS)[number], { name: string; input: string }>>,
  dummy: DummyInfo,
  showList: boolean,
): void {
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.font = `800 13px ${HUD_FONT}`;
  ctx.fillStyle = MENU_CYAN;
  ctx.fillText(`PRACTICE · ${dummy.label} · BACKSPACE RESET · TAB MOVE LIST`, 640, 96);
  if (showList) {
    const x = 20;
    const y = 112;
    const w = 330;
    const rows = LIST_ORDER.length;
    ctx.fillStyle = 'rgba(7,10,20,0.78)';
    ctx.fillRect(x, y, w, rows * 18 + 28);
    ctx.textAlign = 'left';
    ctx.font = `800 12px ${HUD_FONT}`;
    ctx.fillStyle = MENU_CYAN;
    ctx.fillText('MOVES', x + 10, y + 12);
    ctx.font = `600 12px ${HUD_FONT}`;
    LIST_ORDER.forEach((slot, k) => {
      const mi = moves[slot];
      if (!mi) return;
      const yy = y + 30 + k * 18;
      ctx.fillStyle = MENU_DIM;
      ctx.fillText(mi.input, x + 10, yy, 150);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(mi.name, x + 170, yy, 150);
    });
  }
  ctx.restore();
}
