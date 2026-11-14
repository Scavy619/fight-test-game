// The fight: one sim match, two animated fighters, placeholder arena, HUD and
// visual-only feedback (shake, flash, sparks) driven by sim events.
import type { GameContext, Scene } from '../engine';
import type { FighterEntry } from '../content/types';
import { baseAnims } from '../render/anims/base';
import { rgba } from '../render/color';
import { FighterAnimator } from '../render/fighterAnim';
import { createFighterView } from '../render/fighterView';
import { HudState, drawHud, type HudInfo } from '../render/hud';
import { Sparks } from '../render/sparks';
import { GROUND_Y, drawStage } from '../render/stage';
import {
  bodyRect,
  createMatch,
  liveWorldHitboxes,
  projectileRect,
  step,
  type InputFrame,
  type Match,
  type PlayerIndex,
  type Rect,
  type SimEvent,
  type Strength,
} from '../sim';
import { createPauseScene } from './pause';

/** Produces one player's input for the next step (an AI plugs in here). */
export type Controller = (match: Match, index: 0 | 1) => InputFrame;

export interface FightConfig {
  fighters: [FighterEntry, FighterEntry];
  /** null/undefined = human via `game.input.frames[i]`. */
  controllers?: [Controller | null, Controller | null];
  /** Called for every sim event, after the step (effects and audio subscribe here). */
  listeners?: ((e: SimEvent, match: Match) => void)[];
  roundsToWin?: number;
  roundSeconds?: number;
  /** Called when the player backs out after the match. */
  onExit?: () => void;
}

const PLAYERS = [0, 1] as const;

const SHAKE: Readonly<Record<Strength, number>> = { light: 3, heavy: 7, special: 10, ultimate: 16 };
const BLOCK_SHAKE = 2;
const SHAKE_FRAMES = 12;
const FLASH_ALPHA = 0.18;
const FLASH_FRAMES = 4;
const SPARK_SIZE: Readonly<Record<Strength, number>> = { light: 38, heavy: 50, special: 56, ultimate: 64 };
const FREEZE_DIM = 'rgba(0,0,0,0.7)';

export function createFightScene(game: GameContext, config: FightConfig): Scene {
  const entries = config.fighters;
  const defs = [entries[0].def, entries[1].def] as const;
  const accents = [entries[0].look.accent, entries[1].look.accent] as const;
  const animators = PLAYERS.map(
    (i) => new FighterAnimator(createFighterView(entries[i].look), { ...baseAnims, ...entries[i].anims }),
  ) as [FighterAnimator, FighterAnimator];
  const orb = PLAYERS.map((i) => ({
    glow: rgba(accents[i], 0.18),
    mid: rgba(accents[i], 0.55),
  }));
  const info: HudInfo = {
    names: [defs[0].name, defs[1].name],
    accents,
    maxHealth: [defs[0].stats.health, defs[1].stats.health],
  };
  const hud = new HudState(info.maxHealth);
  const sparks = new Sparks();

  let match = newMatch();
  let shakeAmp = 0;
  let shakeLeft = 0;
  let shakeX = 0;
  let shakeY = 0;
  let flashLeft = 0;
  let debugBoxes = false;
  let debugKeyHeld = false;

  function newMatch(): Match {
    return createMatch({
      fighters: [defs[0], defs[1]],
      roundsToWin: config.roundsToWin,
      roundSeconds: config.roundSeconds,
    });
  }

  function resetTransients(): void {
    for (const a of animators) a.reset();
    hud.reset(match.state.fighters);
    sparks.clear();
    shakeAmp = shakeLeft = shakeX = shakeY = 0;
    flashLeft = 0;
  }

  function shake(amp: number): void {
    if (shakeLeft > 0 && shakeAmp * (shakeLeft / SHAKE_FRAMES) > amp) return;
    shakeAmp = amp;
    shakeLeft = SHAKE_FRAMES;
  }

  function feedback(e: SimEvent): void {
    switch (e.type) {
      case 'roundIntro':
        resetTransients();
        break;
      case 'hit':
        shake(SHAKE[e.strength]);
        if (e.strength !== 'light') flashLeft = FLASH_FRAMES;
        sparks.hit(e.x, e.y, accents[e.fighter], SPARK_SIZE[e.strength]);
        break;
      case 'block':
        shake(BLOCK_SHAKE);
        sparks.block(e.x, e.y);
        break;
      default:
        break;
    }
  }

  function inputFor(i: PlayerIndex): InputFrame {
    const c = config.controllers?.[i];
    return c ? c(match, i) : game.input.frames[i];
  }

  function updateMatchEnd(): boolean {
    if (match.state.phase !== 'matchEnd') return false;
    const a = game.menu.actions;
    if (a.confirm) {
      game.menu.latch();
      match = newMatch();
      resetTransients();
      return true;
    }
    if (a.back && config.onExit) {
      game.menu.latch();
      config.onExit();
      return true;
    }
    return false;
  }

  function update(): void {
    // Debug overlay toggle (Backquote), edge-triggered.
    const dk = game.input.isKeyDown('Backquote');
    if (dk && !debugKeyHeld) debugBoxes = !debugBoxes;
    debugKeyHeld = dk;

    if (game.menu.actions.pause) {
      game.scenes.push(createPauseScene(game));
      return;
    }
    if (updateMatchEnd()) return;

    const s = match.state;
    // Which fighters the sim advances this step (mirrors `step`): none during hitstop,
    // only an attacking caster during a super freeze.
    const sf = s.superFreeze;
    const advanced: [boolean, boolean] = sf
      ? [sf.caster === 0 && s.fighters[0].state === 'attack', sf.caster === 1 && s.fighters[1].state === 'attack']
      : [s.hitstop === 0, s.hitstop === 0];

    const inputs: [InputFrame, InputFrame] = [inputFor(0), inputFor(1)];
    const events = step(match, inputs);
    for (const e of events) {
      feedback(e);
      if (config.listeners) for (const l of config.listeners) l(e, match);
    }

    const st = match.state;
    // Frozen fighters keep their last pose (no blend, ribbon or trail advance).
    for (const i of PLAYERS) if (advanced[i]) animators[i].update(st.fighters[i], defs[i]);
    hud.update(st.fighters);
    sparks.update();

    if (shakeLeft > 0) {
      shakeLeft -= 1;
      const a = shakeAmp * (shakeLeft / SHAKE_FRAMES);
      shakeX = (Math.random() * 2 - 1) * a;
      shakeY = (Math.random() * 2 - 1) * a;
    } else {
      shakeX = shakeY = 0;
    }
    if (flashLeft > 0) flashLeft -= 1;
  }

  function drawProjectiles(ctx: CanvasRenderingContext2D): void {
    const ps = match.state.projectiles;
    if (ps.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of ps) {
      const c = orb[p.owner];
      if (!c) continue;
      const x = p.x;
      const y = GROUND_Y - p.y;
      const rx = p.w / 2;
      const ry = p.h / 2;
      const wob = 1 + 0.08 * Math.sin(p.age * 0.6);
      ctx.fillStyle = c.glow;
      ctx.beginPath();
      ctx.ellipse(x, y, rx * 1.5 * wob, ry * 1.5 * wob, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c.mid;
      ctx.beginPath();
      ctx.ellipse(x, y, rx * wob, ry * wob, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = accents[p.owner];
      ctx.beginPath();
      ctx.ellipse(x, y, rx * 0.6, ry * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(x, y, rx * 0.3, ry * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function rectPath(ctx: CanvasRenderingContext2D, r: Rect): void {
    ctx.rect(r.x, GROUND_Y - r.y - r.h, r.w, r.h);
  }

  function drawDebug(ctx: CanvasRenderingContext2D): void {
    const s = match.state;
    ctx.save();
    ctx.lineWidth = 1.5;
    for (const i of PLAYERS) {
      const f = s.fighters[i];
      ctx.strokeStyle = '#3CFF6E';
      ctx.fillStyle = 'rgba(60,255,110,0.12)';
      ctx.beginPath();
      rectPath(ctx, bodyRect(f, defs[i]));
      ctx.fill();
      ctx.stroke();
      const boxes = liveWorldHitboxes(f, defs[i]);
      if (boxes.length > 0) {
        ctx.strokeStyle = '#FF3B3B';
        ctx.fillStyle = 'rgba(255,59,59,0.22)';
        ctx.beginPath();
        for (const b of boxes) rectPath(ctx, b);
        ctx.fill();
        ctx.stroke();
      }
      // Origin marker.
      ctx.strokeStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(f.x - 6, GROUND_Y - f.y);
      ctx.lineTo(f.x + 6, GROUND_Y - f.y);
      ctx.moveTo(f.x, GROUND_Y - f.y - 6);
      ctx.lineTo(f.x, GROUND_Y - f.y + 6);
      ctx.stroke();
    }
    if (s.projectiles.length > 0) {
      ctx.strokeStyle = '#FFE14D';
      ctx.fillStyle = 'rgba(255,225,77,0.18)';
      ctx.beginPath();
      for (const p of s.projectiles) rectPath(ctx, projectileRect(p));
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawDebugText(ctx: CanvasRenderingContext2D): void {
    const s = match.state;
    ctx.save();
    ctx.font = `600 13px ui-monospace, Consolas, monospace`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#E8F0FF';
    for (const i of PLAYERS) {
      const f = s.fighters[i];
      const a = animators[i];
      const move = f.move === null ? '-' : `${f.move} f${f.moveFrame}`;
      const line =
        `P${i + 1} ${f.state} f${f.stateFrame}  move ${move}  anim ${a.currentId}@${a.currentFrame.toFixed(1)}` +
        `  x${f.x.toFixed(0)} y${f.y.toFixed(0)}${f.invulnerable ? '  INV' : ''}`;
      ctx.textAlign = i === 0 ? 'left' : 'right';
      ctx.fillText(line, i === 0 ? 40 : 1240, 620 + i * 18);
    }
    ctx.textAlign = 'center';
    const extra = `${s.phase} ${s.phaseFrame}  hitstop ${s.hitstop}${s.superFreeze ? `  freeze ${s.superFreeze.frames}` : ''}`;
    ctx.fillText(extra, 640, 658);
    ctx.restore();
  }

  function render(ctx: CanvasRenderingContext2D): void {
    const s = match.state;
    const w = game.width;
    const h = game.height;
    ctx.save();
    ctx.translate(shakeX, shakeY);
    drawStage(ctx, w, h, GROUND_Y);
    if (s.superFreeze) {
      ctx.fillStyle = FREEZE_DIM;
      ctx.fillRect(-w, -h, w * 3, h * 3);
    }
    // The super-freeze caster, else an attacking fighter, draws on top.
    const [f0, f1] = s.fighters;
    let top: PlayerIndex = 1;
    if (s.superFreeze) top = s.superFreeze.caster;
    else if (f0.state === 'attack' && f1.state !== 'attack') top = 0;
    const bottom: PlayerIndex = top === 0 ? 1 : 0;
    animators[bottom].view.draw(ctx, GROUND_Y);
    animators[top].view.draw(ctx, GROUND_Y);
    drawProjectiles(ctx);
    sparks.draw(ctx, GROUND_Y);
    if (debugBoxes) drawDebug(ctx);
    ctx.restore();

    if (flashLeft > 0) {
      ctx.save();
      ctx.globalAlpha = FLASH_ALPHA * (flashLeft / FLASH_FRAMES);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
    drawHud(ctx, s, hud, info);
    if (debugBoxes) drawDebugText(ctx);
  }

  return {
    enter(): void {
      game.menu.latch();
    },
    update,
    render(ctx): void {
      render(ctx);
    },
  };
}
