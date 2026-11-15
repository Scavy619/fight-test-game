// Character gallery: browse all eight heroes. The grid shows portraits and unlock state; a hero
// opens into three tabs (STORY, MOVES, CAMPAIGN) beside an animated preview. All text comes
// from the hero's profile and lore, the same data the select screen and practice use.
// Keys: arrows move or switch tabs and scroll, Light changes the preview animation, Heavy or Esc goes back.
import { HEROES, isHeroId, type HeroId } from '../content/heroes';
import { HERO_LORE } from '../content/lore';
import { ROSTER, type RosterSlot } from '../content/roster';
import type { HeroEntry } from '../content/types';
import type { GameContext, Scene } from '../engine';
import { animDuration } from '../render/anim';
import { baseAnims } from '../render/anims/base';
import { rgba } from '../render/color';
import { HUD_FONT } from '../render/hud';
import { drawPortrait, roundRect } from '../render/portrait';
import { wrapText } from '../render/text';
import { MOVE_SLOTS, type MoveSlot } from '../sim';
import { heroAvailability } from './charSelect';
import { MENU_CYAN, MENU_DIM, MENU_TEXT, drawMenuBackdrop, drawNotice } from './listMenu';

type LineKind = 'h1' | 'h2' | 'p' | 'dim' | 'gap';
interface Line {
  kind: LineKind;
  text: string;
  /** Top of the line in the scrolling column, px. */
  y: number;
  h: number;
}

const COLS = 4;
const TILE_W = 220;
const TILE_H = 188;
const GAP_X = 30;
const GAP_Y = 36;
const GRID_Y = 100;

const TEXT_X = 440;
const TEXT_Y = 168;
const TEXT_W = 780;
const TEXT_H = 506;

const TABS = ['STORY', 'MOVES', 'CAMPAIGN'] as const;
type Tab = 0 | 1 | 2;

const MOVE_ORDER: readonly MoveSlot[] = [
  'light', 'heavy', 'crouchLight', 'crouchHeavy', 'airLight', 'airHeavy',
  'specialN', 'specialF', 'specialD', 'ultimate', 'throw', 'power',
];

const FONT: Record<LineKind, string> = {
  h1: `italic 800 24px ${HUD_FONT}`,
  h2: `800 14px ${HUD_FONT}`,
  p: `600 14px ${HUD_FONT}`,
  dim: `600 13px ${HUD_FONT}`,
  gap: `600 10px ${HUD_FONT}`,
};
const HEIGHT: Record<LineKind, number> = { h1: 34, h2: 26, p: 20, dim: 18, gap: 10 };

/** The animation ids the preview cycles through for a hero. */
export function previewAnims(id: HeroId): string[] {
  const e = HEROES[id];
  const own = (slot: MoveSlot): string => e.def.moves[slot].anim;
  return ['idle', 'walk', own('light'), own('heavy'), own('specialN'), own('specialF'), own('specialD'), own('ultimate'), own('throw')];
}

function previewLabel(animId: string): string {
  const base = animId.includes('.') ? animId.split('.')[1] ?? animId : animId;
  return base.replace(/([A-Z])/g, ' $1').toUpperCase();
}

/** Plain, unwrapped content of one tab (wrapping happens at draw time). Pure; exported for tests. */
export function tabContent(entry: HeroEntry, tab: Tab, unlocked: boolean): { kind: LineKind; text: string }[] {
  const p = entry.profile;
  const out: { kind: LineKind; text: string }[] = [];
  const add = (kind: LineKind, text: string): void => void out.push({ kind, text });
  if (tab === 0) {
    const lore = HERO_LORE[entry.def.id];
    add('p', p.identity);
    add('gap', '');
    add('h2', 'BIOGRAPHY');
    add('p', p.bio);
    if (lore) {
      add('gap', '');
      add('h2', 'TRADITION');
      for (const t of lore.tradition) add('p', t);
      add('gap', '');
      add('h2', 'IN THIS GAME');
      for (const t of lore.inThisGame) add('p', t);
      add('gap', '');
      add('h2', 'SOURCES');
      for (const s of lore.sources) add('dim', `${s.label}: ${s.url}`);
    }
  } else if (tab === 1) {
    for (const slot of MOVE_ORDER) {
      const mi = p.moves[slot];
      if (!mi) continue;
      add('h2', `${mi.name.toUpperCase()}   ·   ${mi.input}`);
      add('p', mi.description);
      if (mi.counterplay) add('dim', `Counterplay: ${mi.counterplay}`);
      add('gap', '');
    }
  } else {
    add('h2', 'CAMPAIGN ROLE');
    add('p', p.campaignRole);
    add('gap', '');
    add('h2', 'RELATIONSHIPS');
    for (const r of p.relationships) {
      const name = ROSTER.find((x) => x.id === r.id)?.name ?? r.id;
      add('p', `${name}: ${r.text}`);
    }
    add('gap', '');
    add('h2', 'LOADOUT');
    add('p', `${p.weapons.primary}${p.weapons.secondary ? `; ${p.weapons.secondary}` : ''}`);
    if (p.weapons.note) add('dim', p.weapons.note);
    add('gap', '');
    add('h2', 'STYLE');
    add('p', `Motif: ${p.motif}`);
    add('p', `Rhythm: ${p.rhythm}`);
    add('p', `Palette: ${p.palette.join(', ')}`);
    add('p', `Intro pose: ${p.poses.intro}`);
    add('p', `Victory pose: ${p.poses.victory}`);
    add('gap', '');
    add('h2', 'UNLOCK');
    add('p', `${p.unlock.text}  ·  ${unlocked ? 'UNLOCKED' : 'LOCKED'}`);
  }
  return out;
}

export function createGalleryScene(game: GameContext, onBack: () => void, initial?: HeroId): Scene {
  let index = Math.max(0, ROSTER.findIndex((r) => r.id === initial));
  if (!initial) index = Math.max(0, ROSTER.findIndex((r) => isHeroId(r.id)));
  let mode: 'grid' | 'detail' = 'grid';
  let tab: Tab = 0;
  let scroll = 0;
  let previewIdx = 0;
  let frame = 0;
  let note = '';
  let noteLeft = 0;
  let cache: { key: string; lines: Line[]; total: number } | null = null;

  const gridW = COLS * TILE_W + (COLS - 1) * GAP_X;
  const x0 = (game.width - gridW) / 2;
  const tileXY = (k: number): { x: number; y: number } => ({
    x: x0 + (k % COLS) * (TILE_W + GAP_X),
    y: GRID_Y + Math.floor(k / COLS) * (TILE_H + GAP_Y),
  });
  const tileAt = (px: number, py: number): number => {
    for (let k = 0; k < ROSTER.length; k++) {
      const { x, y } = tileXY(k);
      if (px >= x && px <= x + TILE_W && py >= y && py <= y + TILE_H + 26) return k;
    }
    return -1;
  };
  const tabRect = (k: number): { x: number; y: number; w: number; h: number } => ({ x: TEXT_X + k * 170, y: 118, w: 160, h: 34 });

  const slot = (): RosterSlot | undefined => ROSTER[index];
  const entry = (): HeroEntry | null => {
    const s = slot();
    return s && isHeroId(s.id) ? HEROES[s.id] : null;
  };

  function open(k: number): void {
    index = k;
    const s = ROSTER[k];
    if (!s) return;
    if (!isHeroId(s.id)) {
      note = `${s.name} is coming in a later update. Unlock: ${s.unlock}`;
      noteLeft = 170;
      return;
    }
    mode = 'detail';
    tab = 0;
    scroll = 0;
    previewIdx = 0;
    cache = null;
  }

  function layout(ctx: CanvasRenderingContext2D, e: HeroEntry, unlocked: boolean): { lines: Line[]; total: number } {
    const key = `${e.def.id}:${tab}:${unlocked}`;
    if (cache?.key === key) return cache;
    const lines: Line[] = [];
    let y = 0;
    for (const raw of tabContent(e, tab, unlocked)) {
      ctx.font = FONT[raw.kind];
      const wrapped = raw.kind === 'gap' ? [''] : wrapText(ctx, raw.text, TEXT_W);
      for (const text of wrapped) {
        lines.push({ kind: raw.kind, text, y, h: HEIGHT[raw.kind] });
        y += HEIGHT[raw.kind];
      }
    }
    cache = { key, lines, total: y };
    return cache;
  }

  function update(): void {
    frame += 1;
    if (noteLeft > 0) noteLeft -= 1;
    const a = game.menu.actions;
    const m = game.mouse.state;
    const clicked = game.mouse.takeClick();
    if (mode === 'grid') {
      const n = ROSTER.length;
      if (a.left) index = (index + n - 1) % n;
      if (a.right) index = (index + 1) % n;
      if (a.up) index = (index + n - COLS) % n;
      if (a.down) index = (index + COLS) % n;
      const hover = m.active ? tileAt(m.x, m.y) : -1;
      if (hover >= 0) index = hover;
      if (a.back) {
        game.menu.latch();
        onBack();
        return;
      }
      if (a.confirm || (clicked && hover === index)) open(index);
      return;
    }
    // Detail page.
    if (a.back) {
      game.menu.latch();
      mode = 'grid';
      return;
    }
    if (a.left) tab = ((tab + 2) % 3) as Tab;
    if (a.right) tab = ((tab + 1) % 3) as Tab;
    if (a.left || a.right) {
      scroll = 0;
      cache = null;
    }
    if (a.up) scroll = Math.max(0, scroll - 40);
    if (a.down) scroll = Math.min(Math.max(0, (cache?.total ?? 0) - TEXT_H), scroll + 40);
    if (clicked && m.active) {
      for (let k = 0; k < TABS.length; k++) {
        const r = tabRect(k);
        if (m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h) {
          tab = k as Tab;
          scroll = 0;
          cache = null;
        }
      }
      if (m.x >= 60 && m.x <= 400 && m.y >= 120 && m.y <= 540) previewIdx += 1;
    }
    if (a.confirm) previewIdx += 1;
  }

  function drawGrid(ctx: CanvasRenderingContext2D): void {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `italic 800 34px ${HUD_FONT}`;
    ctx.fillStyle = MENU_CYAN;
    ctx.fillText('CHARACTER GALLERY', game.width / 2, 44);
    ctx.font = `600 14px ${HUD_FONT}`;
    ctx.fillStyle = MENU_DIM;
    ctx.fillText('Arrows or mouse to look · Light, Enter or click to open · Heavy or Esc to go back', game.width / 2, 74);
    if (noteLeft > 0) {
      ctx.font = `800 15px ${HUD_FONT}`;
      ctx.fillStyle = '#FFB347';
      ctx.fillText(note, game.width / 2, 94);
    }
    ROSTER.forEach((s, k) => {
      const { x, y } = tileXY(k);
      const selected = k === index;
      const { entry: e, locked } = heroAvailability(game, s);
      if (e) {
        drawPortrait(ctx, e, x, y, TILE_W, TILE_H, selected ? frame : 0, { locked, selected });
      } else {
        roundRect(ctx, x, y, TILE_W, TILE_H, 10);
        ctx.fillStyle = 'rgba(14,19,36,0.9)';
        ctx.fill();
        ctx.strokeStyle = selected ? '#FFFFFF' : rgba('#5A6684', 0.8);
        ctx.lineWidth = selected ? 2.5 : 1.5;
        ctx.stroke();
        ctx.font = `800 34px ${HUD_FONT}`;
        ctx.fillStyle = 'rgba(90,102,132,0.6)';
        ctx.fillText('?', x + TILE_W / 2, y + TILE_H * 0.42);
        ctx.font = `italic 800 13px ${HUD_FONT}`;
        ctx.fillText('COMING SOON', x + TILE_W / 2, y + TILE_H * 0.7);
      }
      ctx.font = `italic 800 17px ${HUD_FONT}`;
      ctx.fillStyle = selected ? '#FFFFFF' : e && !locked ? MENU_TEXT : MENU_DIM;
      ctx.fillText(s.name.toUpperCase(), x + TILE_W / 2, y + TILE_H + 14);
      ctx.font = `600 11px ${HUD_FONT}`;
      ctx.fillStyle = MENU_DIM;
      ctx.fillText(e ? (locked ? 'LOCKED' : 'UNLOCKED') : s.title, x + TILE_W / 2, y + TILE_H + 30);
    });
    const s = slot();
    if (s) {
      ctx.font = `700 15px ${HUD_FONT}`;
      ctx.fillStyle = MENU_TEXT;
      const e = entry();
      ctx.fillText(`${s.name}: ${e ? e.profile.identity : `${s.title}. Unlock: ${s.unlock}`}`, game.width / 2, 668);
    }
  }

  function drawDetail(ctx: CanvasRenderingContext2D, e: HeroEntry): void {
    const s = slot();
    if (!s) return;
    const unlocked = e.profile.unlock.kind === 'start' || game.save.isUnlocked(s.id);
    const anims = previewAnims(e.def.id as HeroId);
    const animId = anims[previewIdx % anims.length] ?? 'idle';
    const anim = e.anims[animId] ?? baseAnims[animId];
    const dur = anim ? Math.max(1, animDuration(anim)) : 60;
    const f = anim?.loop ? frame : frame % (dur + 24);
    drawPortrait(ctx, e, 60, 120, 340, 420, Math.min(f, dur), { animId, locked: false, selected: true });
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 13px ${HUD_FONT}`;
    ctx.fillStyle = MENU_CYAN;
    ctx.fillText(`PREVIEW: ${previewLabel(animId)}`, 230, 560);
    ctx.font = `600 12px ${HUD_FONT}`;
    ctx.fillStyle = MENU_DIM;
    ctx.fillText('Light or click the portrait to change', 230, 580);
    ctx.font = `700 13px ${HUD_FONT}`;
    ctx.fillStyle = unlocked ? MENU_TEXT : '#FFB347';
    ctx.fillText(unlocked ? 'UNLOCKED' : `LOCKED: ${e.profile.unlock.text}`, 230, 610, 340);

    ctx.textAlign = 'left';
    ctx.font = `italic 800 38px ${HUD_FONT}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(s.name.toUpperCase(), TEXT_X, 52);
    ctx.font = `700 17px ${HUD_FONT}`;
    ctx.fillStyle = e.look.accent;
    ctx.fillText(e.profile.title, TEXT_X, 90);

    TABS.forEach((label, k) => {
      const r = tabRect(k);
      const on = k === tab;
      ctx.fillStyle = on ? rgba(e.look.accent, 0.25) : 'rgba(14,19,36,0.8)';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = on ? e.look.accent : rgba('#5A6684', 0.7);
      ctx.lineWidth = on ? 2 : 1;
      ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
      ctx.textAlign = 'center';
      ctx.font = `800 14px ${HUD_FONT}`;
      ctx.fillStyle = on ? '#FFFFFF' : MENU_DIM;
      ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 1);
    });

    const { lines, total } = layout(ctx, e, unlocked);
    ctx.save();
    ctx.beginPath();
    ctx.rect(TEXT_X - 4, TEXT_Y, TEXT_W + 8, TEXT_H);
    ctx.clip();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    for (const l of lines) {
      const yy = TEXT_Y + l.y - scroll;
      if (yy + l.h < TEXT_Y || yy > TEXT_Y + TEXT_H || l.kind === 'gap') continue;
      ctx.font = FONT[l.kind];
      ctx.fillStyle = l.kind === 'h1' ? '#FFFFFF' : l.kind === 'h2' ? e.look.accent : l.kind === 'dim' ? MENU_DIM : MENU_TEXT;
      ctx.fillText(l.text, TEXT_X, yy + 2);
    }
    ctx.restore();
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    if (total > TEXT_H) {
      ctx.font = `800 12px ${HUD_FONT}`;
      ctx.fillStyle = MENU_CYAN;
      const more = scroll < total - TEXT_H;
      ctx.fillText(more ? 'UP / DOWN TO SCROLL  ▼ MORE' : 'UP / DOWN TO SCROLL  ▲ START', TEXT_X + TEXT_W / 2, TEXT_Y + TEXT_H + 14);
    }
    ctx.font = `600 13px ${HUD_FONT}`;
    ctx.fillStyle = MENU_DIM;
    ctx.fillText('Left and right: tabs · Up and down: scroll · Light: change preview · Heavy or Esc: back to the grid', game.width / 2, 700);
  }

  return {
    enter(): void {
      game.menu.latch();
      game.mouse.takeClick();
    },
    update,
    render(ctx): void {
      ctx.save();
      drawMenuBackdrop(ctx, game.width, game.height);
      const e = entry();
      if (mode === 'detail' && e) drawDetail(ctx, e);
      else {
        drawGrid(ctx);
        drawNotice(ctx, game.width / 2, 698, 12);
      }
      ctx.restore();
    },
  };
}

/** All gallery tab ids, for tests. */
export const GALLERY_MOVE_ORDER: readonly MoveSlot[] = MOVE_ORDER;
export const GALLERY_ALL_SLOTS: readonly MoveSlot[] = MOVE_SLOTS;
