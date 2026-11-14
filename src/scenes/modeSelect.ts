// Interim title and mode select until task 10 builds the real menus: two players on one
// keyboard, or solo against the AI at three difficulties (keyboard plus mouse for P1).
// Keyboard: up/down, light or Enter confirms. Mouse: hover highlights, click confirms.
import { DIFFICULTY_DAMAGE, createAi, type Difficulty } from '../ai';
import { FIGHTERS } from '../content/fighters';
import { mergeFrames, mouseToFrame, type GameContext, type Scene } from '../engine';
import { actionAt, drawActionBar, overActionBar, type ActionId } from '../render/actionBar';
import { drawControlsPanel } from '../render/controlsHelp';
import { HUD_FONT } from '../render/hud';
import { GROUND_Y } from '../render/stage';
import { EMPTY_INPUT, METER_MAX, type InputFrame } from '../sim';
import { createFightScene, type Controller } from './fight';

export type Mode = 'versus' | Difficulty;

export interface ModeOption {
  mode: Mode;
  label: string;
  hint: string;
}

export const MODE_OPTIONS: readonly ModeOption[] = [
  { mode: 'versus', label: 'TWO PLAYERS', hint: 'Rei (P1) versus Vira (P2) on one keyboard or two pads' },
  { mode: 'easy', label: 'SOLO · EASY', hint: 'You are Rei; the computer plays Vira. Keyboard and mouse.' },
  { mode: 'normal', label: 'SOLO · NORMAL', hint: 'Faster reactions, fewer mistakes.' },
  { mode: 'hard', label: 'SOLO · HARD', hint: 'Blocks, punishes and anti-airs on reaction.' },
];

const BG = '#070A14';
const CYAN = '#2FF3E0';
const DIM = '#5A6684';
const TEXT = '#C8D2F0';
const OPTION_X = 640;
const OPTION_Y0 = 300;
const OPTION_STEP = 52;
const OPTION_W = 420;
const OPTION_H = 46;

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

/** Starts a match in the given mode; backing out returns to the mode select. */
export function startMode(game: GameContext, mode: Mode): void {
  const onExit = (): void => game.scenes.set(createModeSelectScene(game, mode));
  if (mode === 'versus') {
    game.scenes.set(createFightScene(game, { fighters: [FIGHTERS.rei, FIGHTERS.vira], onExit }));
    return;
  }
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
}

export function createModeSelectScene(game: GameContext, initial: Mode = 'versus'): Scene {
  let index = Math.max(0, MODE_OPTIONS.findIndex((o) => o.mode === initial));
  let pulse = 0;

  function optionAt(x: number, y: number): number {
    for (let k = 0; k < MODE_OPTIONS.length; k++) {
      const top = OPTION_Y0 + k * OPTION_STEP - OPTION_H / 2;
      if (x >= OPTION_X - OPTION_W / 2 && x <= OPTION_X + OPTION_W / 2 && y >= top && y <= top + OPTION_H) return k;
    }
    return -1;
  }

  function update(): void {
    pulse += 1;
    const a = game.menu.actions;
    if (a.up) index = (index + MODE_OPTIONS.length - 1) % MODE_OPTIONS.length;
    if (a.down) index = (index + 1) % MODE_OPTIONS.length;
    const m = game.mouse.state;
    const hover = m.active ? optionAt(m.x, m.y) : -1;
    if (hover >= 0) index = hover;
    const clicked = game.mouse.takeClick();
    const option = MODE_OPTIONS[index];
    if (option && (a.confirm || (clicked && hover >= 0))) {
      game.menu.latch();
      startMode(game, option.mode);
    }
  }

  function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = 'center'): void {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(s, x, y);
  }

  function render(ctx: CanvasRenderingContext2D): void {
    const w = game.width;
    ctx.save();
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, game.height);
    // Floor grid glow, echoing the arena.
    ctx.strokeStyle = 'rgba(47,243,224,0.08)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 12; k++) {
      const y = 560 + k * 14 + (k * k) / 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.textBaseline = 'middle';
    // Title with a wide low-alpha stroke under the bright fill (no shadowBlur).
    ctx.font = `italic 800 110px ${HUD_FONT}`;
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 18;
    ctx.strokeStyle = 'rgba(47,243,224,0.16)';
    ctx.strokeText('MYTHIC NEON', w / 2, 150);
    ctx.fillStyle = CYAN;
    ctx.fillText('MYTHIC NEON', w / 2, 150);
    text(ctx, 'NEON FIGHTERS OF MYTH AND MARTIAL ART', w / 2, 222, `600 18px ${HUD_FONT}`, DIM);

    for (let k = 0; k < MODE_OPTIONS.length; k++) {
      const o = MODE_OPTIONS[k];
      if (!o) continue;
      const y = OPTION_Y0 + k * OPTION_STEP;
      const on = k === index;
      if (on) {
        const glow = 0.1 + 0.05 * Math.sin(pulse * 0.1);
        ctx.fillStyle = `rgba(47,243,224,${glow.toFixed(3)})`;
        ctx.fillRect(OPTION_X - OPTION_W / 2, y - OPTION_H / 2, OPTION_W, OPTION_H);
        ctx.fillStyle = CYAN;
        ctx.fillRect(OPTION_X - OPTION_W / 2, y - OPTION_H / 2, 4, OPTION_H);
      }
      text(ctx, o.label, OPTION_X, y, `italic 800 30px ${HUD_FONT}`, on ? '#FFFFFF' : DIM);
    }
    const hint = MODE_OPTIONS[index]?.hint ?? '';
    text(ctx, hint, w / 2, OPTION_Y0 + MODE_OPTIONS.length * OPTION_STEP + 4, `600 17px ${HUD_FONT}`, TEXT);
    const pads = game.input.connectedPads;
    const padText = pads > 0
      ? `GAMEPAD READY · ${pads} connected · A confirms · Start pauses`
      : 'Gamepad: plug one in and press any button on it';
    text(ctx, padText, w / 2, OPTION_Y0 + MODE_OPTIONS.length * OPTION_STEP + 30, `700 14px ${HUD_FONT}`, pads > 0 ? CYAN : DIM);

    // Controls for the highlighted mode.
    drawControlsPanel(ctx, w / 2, 572, { solo: MODE_OPTIONS[index]?.mode !== 'versus' });
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
