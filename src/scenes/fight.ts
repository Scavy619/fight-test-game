// The fight: one sim match, two animated fighters, placeholder arena, HUD and
// visual-only feedback (shake, flash, sparks) driven by sim events.
import type { GameContext, Scene } from '../engine';
import type { FighterEntry, HeroEntry } from '../content/types';
import { samplePose } from '../render/anim';
import { baseAnims } from '../render/anims/base';
import { FighterAnimator } from '../render/fighterAnim';
import { createFighterView } from '../render/fighterView';
import { drawControlsStrip } from '../render/controlsHelp';
import { HudState, drawHud, type HudInfo } from '../render/hud';
import { MoveVisuals } from '../render/moveVisuals';
import { drawProjectile } from '../render/projectileView';
import { Sparks } from '../render/sparks';
import { DEFAULT_PALETTE, GROUND_Y, drawStage, type StagePalette } from '../render/stage';
import { drawStatusLabels } from '../render/statusLabels';
import { drawDecoyOutline, drawZones } from '../render/zoneView';
import {
  bodyRect,
  createMatch,
  liveWorldHitboxes,
  projectileRect,
  step,
  EMPTY_INPUT,
  type InputFrame,
  type Match,
  type PlayerIndex,
  type Rect,
  type SimEvent,
  type Strength,
} from '../sim';
import { createPauseScene, movePages } from './pause';

/** What a mode can do to a running fight (Practice resets, refills and reads the match). */
export interface FightApi {
  readonly match: Match;
  /** Starts a fresh match with the same fighters; `skipIntro` jumps to the fight phase. */
  reset(skipIntro?: boolean): void;
}

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
  /** Damage multiplier per side (difficulty handicap). */
  damageScale?: [number, number];
  /** Called when the player backs out after the match or from the pause overlay. */
  onExit?: () => void;
  /** Solo play: the on-screen controls show the mouse for P1 and mark P2 as the computer. */
  solo?: boolean;
  /** Hide the controls strip above the meters (default shown). */
  hideControls?: boolean;
  /** Stage colours (chapter or mode); default is the neon palette. */
  palette?: StagePalette;
  /** Meter each side starts the match with (a campaign reward). */
  startMeter?: [number, number];
  /** Arcade and campaign: no rematch or back-out at match end; `onMatchEnd` takes over. */
  noRematch?: boolean;
  /** Called once, about a second and a half after the match ends, with the winner. */
  onMatchEnd?: (winner: PlayerIndex) => void;
  /** Text under the match-end banner (default: the rematch prompt; null hides it). */
  endPrompt?: string | null;
  /** Called every step after the sim step (Practice refills health and handles its keys). */
  onStep?: (api: FightApi) => void;
  /** Drawn last, over the HUD (the solo action bar). */
  overlay?: (ctx: CanvasRenderingContext2D, match: Match) => void;
}

const PLAYERS = [0, 1] as const;

const SHAKE: Readonly<Record<Strength, number>> = { light: 3, heavy: 7, special: 10, ultimate: 16 };
const BLOCK_SHAKE = 2;
const SHAKE_FRAMES = 12;
const FLASH_ALPHA = 0.18;
const FLASH_FRAMES = 4;
const SPARK_SIZE: Readonly<Record<Strength, number>> = { light: 38, heavy: 50, special: 56, ultimate: 64 };
const FREEZE_DIM = 'rgba(0,0,0,0.7)';
/** Steps the match-end banner stays up before `onMatchEnd` fires. */
const MATCH_END_HOLD = 100;

export function createFightScene(game: GameContext, config: FightConfig): Scene {
  const entries = config.fighters;
  const defs = [entries[0].def, entries[1].def] as const;
  const accents = [entries[0].look.accent, entries[1].look.accent] as const;
  const animators = PLAYERS.map(
    (i) => new FighterAnimator(createFighterView(entries[i].look), { ...baseAnims, ...entries[i].anims }),
  ) as [FighterAnimator, FighterAnimator];
  const heroes = entries as unknown as readonly [Partial<HeroEntry>, Partial<HeroEntry>];
  const decoyViews = PLAYERS.map((i) => createFighterView(entries[i].look));
  const info: HudInfo = {
    names: [defs[0].name, defs[1].name],
    accents,
    maxHealth: [defs[0].stats.health, defs[1].stats.health],
    endPrompt: config.endPrompt,
  };
  const hud = new HudState(info.maxHealth);
  const sparks = new Sparks();
  const visuals = new MoveVisuals();

  let match = newMatch();
  let shakeAmp = 0;
  let shakeLeft = 0;
  let shakeX = 0;
  let shakeY = 0;
  let flashLeft = 0;
  let debugBoxes = false;
  let debugKeyHeld = false;
  let endFrames = 0;

  function newMatch(): Match {
    const m = createMatch({
      fighters: [defs[0], defs[1]],
      roundsToWin: config.roundsToWin,
      roundSeconds: config.roundSeconds,
      damageScale: config.damageScale,
    });
    if (config.startMeter) for (const i of PLAYERS) m.state.fighters[i].meter = config.startMeter[i];
    return m;
  }

  function resetTransients(): void {
    for (const a of animators) a.reset();
    hud.reset(match.state.fighters);
    sparks.clear();
    visuals.clear();
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
      case 'fx': {
        const spec = entries[e.fighter].visuals?.[e.tag];
        if (spec) visuals.spawn(spec, e.x, e.y, match.state.fighters[e.fighter].facing, accents[e.fighter]);
        break;
      }
      default:
        break;
    }
  }

  /** True while a hideWeaponWhileProjectile move's projectile is live (a thrown axe). */
  function weaponHidden(i: PlayerIndex): boolean {
    const slots = heroes[i].hideWeaponWhileProjectile;
    if (!slots) return false;
    return match.state.projectiles.some((p) => p.owner === i && slots.includes(p.slot));
  }

  const api: FightApi = {
    get match(): Match {
      return match;
    },
    reset(skipIntro = false): void {
      match = newMatch();
      resetTransients();
      if (skipIntro) {
        while (match.state.phase === 'intro') step(match, [EMPTY_INPUT, EMPTY_INPUT]);
      }
    },
  };

  function inputFor(i: PlayerIndex): InputFrame {
    const c = config.controllers?.[i];
    return c ? c(match, i) : game.input.frames[i];
  }

  function updateMatchEnd(clicked: boolean): boolean {
    if (match.state.phase !== 'matchEnd' || config.noRematch) return false;
    const a = game.menu.actions;
    if (a.confirm || clicked) {
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
    // Consumed every step so a click during play cannot linger until the match ends.
    const clicked = game.mouse.takeClick();

    if (game.menu.actions.pause) {
      game.scenes.push(createPauseScene(game, { onMenu: config.onExit, solo: config.solo ?? false, pages: movePages(config.fighters) }));
      return;
    }
    if (updateMatchEnd(clicked)) return;

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
    for (const i of PLAYERS) if (advanced[i]) animators[i].update(st.fighters[i], defs[i], weaponHidden(i));
    hud.update(st.fighters);
    sparks.update();
    // Move visuals belong to the frozen world: they hold during hitstop.
    if (advanced[0] || advanced[1]) visuals.update();

    if (shakeLeft > 0) {
      shakeLeft -= 1;
      const a = shakeAmp * (shakeLeft / SHAKE_FRAMES);
      shakeX = (Math.random() * 2 - 1) * a;
      shakeY = (Math.random() * 2 - 1) * a;
    } else {
      shakeX = shakeY = 0;
    }
    if (flashLeft > 0) flashLeft -= 1;
    if (st.phase === 'matchEnd') {
      endFrames += 1;
      if (endFrames === MATCH_END_HOLD && config.onMatchEnd) config.onMatchEnd(st.winner ?? 0);
    } else {
      endFrames = 0;
    }
    config.onStep?.(api);
  }

  function drawProjectiles(ctx: CanvasRenderingContext2D): void {
    for (const p of match.state.projectiles) {
      drawProjectile(ctx, p, heroes[p.owner].projectiles?.[p.slot], accents[p.owner], GROUND_Y);
    }
  }

  /** Decoys: the owner's rig at idle, faded, standing where the zone is. */
  function drawDecoys(ctx: CanvasRenderingContext2D): void {
    for (const z of match.state.zones) {
      if (z.kind !== 'decoy') continue;
      const owner = match.state.fighters[z.owner];
      const view = decoyViews[z.owner];
      const idle = entries[z.owner].anims.idle ?? baseAnims.idle;
      if (!view || !idle) continue;
      view.update({ pose: samplePose(idle, match.state.frame % 60), x: z.x, y: 0, facing: owner.facing, trail: false });
      view.draw(ctx, GROUND_Y, 0.45);
      drawDecoyOutline(ctx, z, accents[z.owner], GROUND_Y, match.state.frame);
    }
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
    drawStage(ctx, w, h, GROUND_Y, { palette: config.palette ?? DEFAULT_PALETTE });
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
    drawZones(ctx, s.zones, accents, GROUND_Y, s.frame);
    drawDecoys(ctx);
    animators[bottom].view.draw(ctx, GROUND_Y);
    animators[top].view.draw(ctx, GROUND_Y);
    visuals.draw(ctx, GROUND_Y);
    for (const i of PLAYERS) drawStatusLabels(ctx, s.fighters[i], defs[i], accents[i], GROUND_Y);
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
    else if (!config.hideControls) drawControlsStrip(ctx, { solo: config.solo ?? false });
    config.overlay?.(ctx, match);
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
