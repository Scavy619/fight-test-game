// Character select: eight portrait tiles (four columns by two rows), the highlighted hero's
// title, identity, weapons, unlock and special names below. Keyboard (arrows, light or Enter
// to choose, heavy or Esc to go back), mouse (hover, click) and pad (d-pad, A, Y).
// Heroes whose files are not written yet show "COMING SOON"; locked heroes show their unlock text.
import { HEROES, isHeroId, type HeroId } from '../content/heroes';
import { ROSTER, type RosterSlot } from '../content/roster';
import type { HeroEntry } from '../content/types';
import type { GameContext, Scene } from '../engine';
import { rgba } from '../render/color';
import { HUD_FONT } from '../render/hud';
import { drawPortrait, roundRect } from '../render/portrait';
import { drawWrapped } from '../render/text';
import { MENU_CYAN, MENU_DIM, MENU_TEXT, drawMenuBackdrop } from './listMenu';

export interface CharSelectOptions {
  /** Big heading, e.g. "PLAYER 1: CHOOSE YOUR HERO". */
  heading: string;
  /** Accent for the highlight (P1 blue, P2 red, default cyan). */
  accent?: string;
  /** Initial hero (e.g. the previous pick). */
  initial?: HeroId;
  onPick: (id: HeroId) => void;
  onBack: () => void;
}

const COLS = 4;
const TILE_W = 220;
const TILE_H = 188;
const GAP_X = 30;
const GAP_Y = 36;
const GRID_Y = 118;

/** A hero can be picked when its file exists and it is unlocked (start heroes always are). */
export function heroAvailability(game: GameContext, slot: RosterSlot): { entry: HeroEntry | null; locked: boolean } {
  const entry = isHeroId(slot.id) ? HEROES[slot.id] : null;
  const locked = entry ? entry.profile.unlock.kind !== 'start' && !game.save.isUnlocked(slot.id) : true;
  return { entry, locked };
}

export function createCharSelect(game: GameContext, o: CharSelectOptions): Scene {
  const accent = o.accent ?? MENU_CYAN;
  const gridW = COLS * TILE_W + (COLS - 1) * GAP_X;
  const x0 = (game.width - gridW) / 2;
  let index = Math.max(0, ROSTER.findIndex((r) => r.id === o.initial));
  if (index < 0 || !o.initial) index = Math.max(0, ROSTER.findIndex((r) => isHeroId(r.id)));
  let frame = 0;
  let note = '';
  let noteLeft = 0;

  const tileXY = (k: number): { x: number; y: number } => ({
    x: x0 + (k % COLS) * (TILE_W + GAP_X),
    y: GRID_Y + Math.floor(k / COLS) * (TILE_H + GAP_Y),
  });

  function tileAt(px: number, py: number): number {
    for (let k = 0; k < ROSTER.length; k++) {
      const { x, y } = tileXY(k);
      if (px >= x && px <= x + TILE_W && py >= y && py <= y + TILE_H + 26) return k;
    }
    return -1;
  }

  function choose(k: number): void {
    const slot = ROSTER[k];
    if (!slot) return;
    const { entry, locked } = heroAvailability(game, slot);
    if (!entry) {
      note = `${slot.name} is coming in a later update.`;
      noteLeft = 120;
      return;
    }
    if (locked) {
      note = `LOCKED: ${entry.profile.unlock.text}`;
      noteLeft = 150;
      return;
    }
    game.menu.latch();
    o.onPick(slot.id as HeroId);
  }

  function update(): void {
    frame += 1;
    if (noteLeft > 0) noteLeft -= 1;
    const a = game.menu.actions;
    const n = ROSTER.length;
    if (a.left) index = (index + n - 1) % n;
    if (a.right) index = (index + 1) % n;
    if (a.up) index = (index + n - COLS) % n;
    if (a.down) index = (index + COLS) % n;
    const m = game.mouse.state;
    const hover = m.active ? tileAt(m.x, m.y) : -1;
    if (hover >= 0) index = hover;
    const clicked = game.mouse.takeClick();
    if (a.back) {
      game.menu.latch();
      o.onBack();
      return;
    }
    if (a.confirm || (clicked && hover === index)) choose(index);
  }

  function drawTile(ctx: CanvasRenderingContext2D, k: number): void {
    const slot = ROSTER[k];
    if (!slot) return;
    const { x, y } = tileXY(k);
    const selected = k === index;
    const { entry, locked } = heroAvailability(game, slot);
    if (entry) {
      drawPortrait(ctx, entry, x, y, TILE_W, TILE_H, selected ? frame : 0, { locked, selected });
    } else {
      ctx.save();
      roundRect(ctx, x, y, TILE_W, TILE_H, 10);
      ctx.fillStyle = 'rgba(14,19,36,0.9)';
      ctx.fill();
      ctx.strokeStyle = selected ? '#FFFFFF' : rgba('#5A6684', 0.8);
      ctx.lineWidth = selected ? 2.5 : 1.5;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `800 ${34}px ${HUD_FONT}`;
      ctx.fillStyle = 'rgba(90,102,132,0.6)';
      ctx.fillText('?', x + TILE_W / 2, y + TILE_H * 0.42);
      ctx.font = `italic 800 13px ${HUD_FONT}`;
      ctx.fillText('COMING SOON', x + TILE_W / 2, y + TILE_H * 0.7);
      ctx.restore();
    }
    // Name strip under the portrait.
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `italic 800 17px ${HUD_FONT}`;
    ctx.fillStyle = selected ? '#FFFFFF' : locked || !entry ? MENU_DIM : MENU_TEXT;
    ctx.fillText(slot.name.toUpperCase(), x + TILE_W / 2, y + TILE_H + 14);
    ctx.restore();
  }

  function drawInfo(ctx: CanvasRenderingContext2D): void {
    const slot = ROSTER[index];
    if (!slot) return;
    const { entry, locked } = heroAvailability(game, slot);
    const px = x0;
    const py = GRID_Y + 2 * (TILE_H + GAP_Y) - 4;
    const pw = gridW;
    ctx.save();
    ctx.fillStyle = 'rgba(14,19,36,0.8)';
    ctx.fillRect(px, py, pw, 718 - py - 4);
    ctx.fillStyle = accent;
    ctx.fillRect(px, py, 4, 718 - py - 4);
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.font = `italic 800 28px ${HUD_FONT}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(slot.name.toUpperCase(), px + 20, py + 12);
    ctx.font = `700 15px ${HUD_FONT}`;
    ctx.fillStyle = accent;
    ctx.fillText(slot.title, px + 20, py + 46);
    ctx.font = `600 14px ${HUD_FONT}`;
    ctx.fillStyle = MENU_TEXT;
    if (entry) {
      const p = entry.profile;
      drawWrapped(ctx, p.identity, px + 20, py + 70, 430, 19, 3);
      ctx.fillStyle = MENU_DIM;
      ctx.fillText(`Weapon: ${p.weapons.primary}${p.weapons.secondary ? ` · ${p.weapons.secondary}` : ''}`, px + 20, py + 134, 440);
      const mv = (s: 'specialN' | 'specialF' | 'specialD' | 'ultimate'): string => {
        const i = p.moves[s];
        return i ? `${i.input}: ${i.name}` : '';
      };
      ctx.font = `700 13px ${HUD_FONT}`;
      ctx.fillStyle = MENU_CYAN;
      ctx.fillText('MOVES', px + 500, py + 14);
      ctx.font = `600 14px ${HUD_FONT}`;
      ctx.fillStyle = MENU_TEXT;
      (['specialN', 'specialF', 'specialD', 'ultimate'] as const).forEach((s, k) => {
        ctx.fillText(mv(s), px + 500, py + 38 + k * 22, 450);
      });
      ctx.fillStyle = locked ? '#FFB347' : MENU_DIM;
      ctx.fillText(locked ? `LOCKED: ${p.unlock.text}` : `Style: ${p.rhythm}`, px + 500, py + 134, 450);
    } else {
      ctx.fillText('This hero is part of the full roster and arrives in a later update.', px + 20, py + 74);
      ctx.fillStyle = MENU_DIM;
      ctx.fillText(`Unlock: ${slot.unlock}`, px + 20, py + 100);
    }
    ctx.restore();
  }

  function render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    drawMenuBackdrop(ctx, game.width, game.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `italic 800 34px ${HUD_FONT}`;
    ctx.fillStyle = accent;
    ctx.fillText(o.heading, game.width / 2, 46);
    ctx.font = `600 14px ${HUD_FONT}`;
    ctx.fillStyle = MENU_DIM;
    ctx.fillText('Arrows or mouse to look · Light, Enter or click to choose · Heavy or Esc to go back', game.width / 2, 80);
    if (noteLeft > 0) {
      ctx.font = `800 16px ${HUD_FONT}`;
      ctx.fillStyle = '#FFB347';
      ctx.fillText(note, game.width / 2, 102);
    }
    for (let k = 0; k < ROSTER.length; k++) drawTile(ctx, k);
    drawInfo(ctx);
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
