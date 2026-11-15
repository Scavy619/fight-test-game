// A dialogue scene: one line at a time with the speaker's portrait, a text box at the bottom.
// Confirm (or a click) shows the rest of a line, then moves to the next; Back (heavy) skips to the end.
import { HEROES, isHeroId } from '../content/heroes';
import type { Line } from '../content/campaign';
import { ROSTER } from '../content/roster';
import type { GameContext, Scene } from '../engine';
import { HUD_FONT } from '../render/hud';
import { drawPortrait } from '../render/portrait';
import { drawWrapped } from '../render/text';
import { MENU_CYAN, MENU_DIM, MENU_TEXT, drawMenuBackdrop, drawNotice } from './listMenu';

export interface DialogueOptions {
  lines: readonly Line[];
  /** Small label above the box, e.g. the chapter title. */
  heading?: string;
  accent?: string;
  onDone: () => void;
}

const CHARS_PER_FRAME = 1.6;

function speakerName(id: string): string {
  if (id === 'narrator') return '';
  return ROSTER.find((r) => r.id === id)?.name ?? id;
}

export function createDialogueScene(game: GameContext, o: DialogueOptions): Scene {
  const accent = o.accent ?? MENU_CYAN;
  let index = 0;
  let shown = 0;
  let frame = 0;
  let finished = false;

  const current = (): Line | undefined => o.lines[index];

  function finish(): void {
    if (finished) return;
    finished = true;
    o.onDone();
  }

  return {
    enter(): void {
      game.menu.latch();
      game.mouse.takeClick();
      if (o.lines.length === 0) finish();
    },
    update(): void {
      frame += 1;
      const line = current();
      if (!line) {
        finish();
        return;
      }
      shown = Math.min(line.text.length, shown + CHARS_PER_FRAME);
      const a = game.menu.actions;
      const clicked = game.mouse.takeClick();
      if (a.back) {
        finish();
        return;
      }
      if (a.confirm || clicked) {
        game.menu.latch();
        if (shown < line.text.length) {
          shown = line.text.length;
        } else if (index + 1 >= o.lines.length) {
          finish();
        } else {
          index += 1;
          shown = 0;
        }
      }
    },
    render(ctx): void {
      const line = current();
      if (!line) return;
      const w = game.width;
      ctx.save();
      drawMenuBackdrop(ctx, w, game.height);
      if (o.heading) {
        ctx.font = `italic 800 22px ${HUD_FONT}`;
        ctx.fillStyle = accent;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(o.heading, w / 2, 40);
      }
      const hero = isHeroId(line.speaker) ? HEROES[line.speaker] : null;
      if (hero) drawPortrait(ctx, hero, w / 2 - 130, 80, 260, 320, frame);
      // Text box.
      const bx = 140;
      const by = 430;
      const bw = w - 280;
      const bh = 210;
      ctx.fillStyle = 'rgba(12,18,36,0.92)';
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const name = speakerName(line.speaker);
      if (name) {
        ctx.font = `italic 800 22px ${HUD_FONT}`;
        ctx.fillStyle = accent;
        ctx.fillText(name.toUpperCase(), bx + 24, by + 16);
      }
      ctx.font = `${line.speaker === 'narrator' ? 'italic ' : ''}600 22px ${HUD_FONT}`;
      ctx.fillStyle = line.speaker === 'narrator' ? MENU_DIM : MENU_TEXT;
      drawWrapped(ctx, line.text.slice(0, Math.floor(shown)), bx + 24, by + (name ? 54 : 24), bw - 48, 32);
      ctx.font = `700 14px ${HUD_FONT}`;
      ctx.fillStyle = MENU_DIM;
      ctx.textAlign = 'right';
      ctx.fillText(`${index + 1}/${o.lines.length} · light, Enter or click to continue · heavy (G) skips`, bx + bw - 20, by + bh - 28);
      drawNotice(ctx, w / 2, 690, 12);
      ctx.restore();
    },
  };
}
