// AI opponent: reads the sim state and returns one InputFrame per step, like a player.
// It sees the opponent with a reaction delay, makes offensive decisions on a think
// timer, blocks or dodges seen attacks, punishes recovery, anti-airs jumps, cancels
// into combos and spends a full meter on the ultimate. All randomness comes from a
// seeded RNG, so a run is reproducible for a seed.
import {
  EMPTY_INPUT, METER_MAX, STAGE_LEFT, STAGE_RIGHT,
  canCancelInto, isActionable, isAirborne, lastHitboxFrame, moveFor, moveInStance, moveReach,
  type FighterDef, type FighterState, type InputFrame, type Match, type MoveDef, type MoveSlot,
  type PlayerIndex, type Projectile,
} from '../sim';
import { createRng } from './rng';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface AiParams {
  /** Frames between the opponent acting and the AI seeing it. */
  reaction: number;
  /** Frames between offensive decisions. */
  think: number;
  /** Chance per decision of doing something pointless instead. */
  mistake: number;
  /** 0..1: how readily it attacks and advances rather than waits. */
  aggression: number;
  /** Chance to defend against a seen attack at all. */
  block: number;
  /** Of the defended attacks, the share answered with a dodge instead of a block. */
  dodge: number;
  /** Chance to anti-air a seen jump-in. */
  antiAir: number;
  /** Chance to punish seen recovery. */
  punish: number;
}

export const DIFFICULTIES: Readonly<Record<Difficulty, AiParams>> = {
  // Easy is for a first-time player: two thirds of a second of reaction, slow decisions, mostly mistakes, hardly blocks.
  easy: { reaction: 40, think: 36, mistake: 0.65, aggression: 0.15, block: 0.05, dodge: 0.05, antiAir: 0.03, punish: 0.05 },
  normal: { reaction: 16, think: 14, mistake: 0.28, aggression: 0.4, block: 0.4, dodge: 0.15, antiAir: 0.3, punish: 0.4 },
  hard: { reaction: 4, think: 4, mistake: 0.04, aggression: 0.75, block: 0.85, dodge: 0.25, antiAir: 0.8, punish: 0.9 },
};

/** Damage multiplier for the computer's hits per difficulty (the sim's `damageScale`). */
export const DIFFICULTY_DAMAGE: Readonly<Record<Difficulty, number>> = { easy: 0.5, normal: 0.8, hard: 1 };

export const DIFFICULTY_ORDER: readonly Difficulty[] = ['easy', 'normal', 'hard'];

/** Same shape as the fight scene's `Controller`. */
export type AiController = (match: Match, index: PlayerIndex) => InputFrame;

/** Frames a pressed button is held (the sim buffers the press for 6). */
const PRESS_FRAMES = 2;
/** Heroes whose own light reaches less than this (px) and who have a quick projectile play as zoners. */
const ZONER_MELEE_REACH = 140;
/** Slots a hero may fire projectiles from (stance overrides included via moveFor). */
const RANGED_SLOTS: readonly MoveSlot[] = ['specialN', 'specialD', 'specialF', 'heavy', 'light'];
/** Distance from a wall at which the AI counts itself cornered. */
const CORNER_MARGIN = 90;
/** Extra px the AI allows itself when judging whether an attack reaches. */
const REACH_SLACK = 12;

type Button = 'light' | 'heavy' | 'special' | 'dodge' | 'grab' | 'power';
type Intent = 'approach' | 'retreat' | 'wait' | 'block' | 'crouchBlock' | 'jumpIn';

interface OppView {
  state: FighterState['state'];
  move: MoveSlot | null;
  moveFrame: number;
  x: number;
  y: number;
  vx: number;
  stance: number;
}

interface Press {
  buttons: Button[];
  forward: boolean;
  down: boolean;
  back: boolean;
  left: number;
}

interface Reach {
  light: number; crouchLight: number; heavy: number; crouchHeavy: number;
  specialF: number; specialD: number; airHeavy: number; ultimate: number; throw: number;
}

function reachTable(def: FighterDef, f: FighterState): Reach {
  const r = (slot: MoveSlot): number => moveReach(moveFor(def, f, slot));
  return {
    light: r('light'), crouchLight: r('crouchLight'), heavy: r('heavy'), crouchHeavy: r('crouchHeavy'),
    specialF: r('specialF'), specialD: r('specialD'), airHeavy: r('airHeavy'), ultimate: r('ultimate'),
    throw: r('throw'),
  };
}

function buttonsFor(slot: MoveSlot): Omit<Press, 'left'> {
  switch (slot) {
    case 'light': case 'airLight': return { buttons: ['light'], forward: false, down: false, back: false };
    case 'crouchLight': return { buttons: ['light'], forward: false, down: true, back: false };
    case 'heavy': case 'airHeavy': return { buttons: ['heavy'], forward: false, down: false, back: false };
    case 'crouchHeavy': return { buttons: ['heavy'], forward: false, down: true, back: false };
    case 'specialN': return { buttons: ['special'], forward: false, down: false, back: false };
    case 'specialF': return { buttons: ['special'], forward: true, down: false, back: false };
    case 'specialD': return { buttons: ['special'], forward: false, down: true, back: false };
    case 'ultimate': return { buttons: ['heavy', 'special'], forward: false, down: false, back: false };
    case 'throw': return { buttons: ['grab'], forward: false, down: false, back: false };
    // Held for PRESS_FRAMES then released: a short charge, then the strike.
    case 'power': return { buttons: ['power'], forward: false, down: false, back: false };
  }
}

export function createAi(difficulty: Difficulty | AiParams, seed: number): AiController {
  const p: AiParams = typeof difficulty === 'string' ? DIFFICULTIES[difficulty] : difficulty;
  const rng = createRng(seed);

  let lastMatch: Match | null = null;
  let lastFrame = -1;
  let history: OppView[] = [];
  let press: Press | null = null;
  let intent: Intent = 'approach';
  let intentLeft = 0;
  let tick = 0;
  let threatSeen = false;
  let threatPlan: 'block' | 'dodge' | 'jump' | 'ignore' = 'ignore';
  let airSeen = false;

  function reset(): void {
    history = [];
    press = null;
    intent = 'approach';
    intentLeft = 0;
    tick = 0;
    threatSeen = false;
    airSeen = false;
  }

  function startPress(slot: MoveSlot | 'dodge', opts: Partial<Pick<Press, 'forward' | 'back' | 'down'>> = {}): void {
    const base = slot === 'dodge'
      ? { buttons: ['dodge'] as Button[], forward: false, down: false, back: false }
      : buttonsFor(slot);
    press = { ...base, ...opts, left: PRESS_FRAMES };
  }

  return (match, index) => {
    const s = match.state;
    if (match !== lastMatch || s.frame < lastFrame) {
      lastMatch = match;
      reset();
    }
    lastFrame = s.frame;
    const def = match.defs[index];
    const oppIndex: PlayerIndex = index === 0 ? 1 : 0;
    const oppDef = match.defs[oppIndex];
    const f = s.fighters[index];
    const o = s.fighters[oppIndex];
    const reach = reachTable(def, f);

    history.push({ state: o.state, move: o.move, moveFrame: o.moveFrame, x: o.x, y: o.y, vx: o.vx, stance: o.stance });
    while (history.length > p.reaction + 1) history.shift();
    const delayed = history[0] ?? history[history.length - 1];
    if (s.phase !== 'fight' || !delayed) return { ...EMPTY_INPUT };
    const view: OppView = delayed;

    const out: InputFrame = { ...EMPTY_INPUT };
    const toward: 1 | -1 = o.x > f.x ? 1 : o.x < f.x ? -1 : f.facing;
    const gap = Math.abs(o.x - f.x) - oppDef.stats.width / 2;
    const cornered = toward === 1 ? f.x < STAGE_LEFT + CORNER_MARGIN : f.x > STAGE_RIGHT - CORNER_MARGIN;
    const reaches = (r: number): boolean => r + REACH_SLACK >= gap;

    // What this hero can do from range, given its current stance.
    const projSlots = RANGED_SLOTS.filter((sl) => {
      const m = moveFor(def, f, sl);
      return m.projectile !== undefined && m.projectile.damage >= 20;
    });
    const quickShot = projSlots.some((sl) => moveFor(def, f, sl).startup <= 16);
    const oppReach = Math.max(moveReach(oppDef.moves.light), moveReach(oppDef.moves.heavy));
    // A zoner prefers to keep out of the opponent's melee reach and shoot.
    const zoner = quickShot && reach.light < ZONER_MELEE_REACH && reach.light <= oppReach + 10;
    const ultMelee = reach.ultimate > 0;
    const ultZone = moveFor(def, f, 'ultimate').zone !== undefined || moveFor(def, f, 'ultimate').projectile !== undefined;

    const setDir = (dir: 1 | -1 | 0): void => {
      out.left = dir === -1;
      out.right = dir === 1;
    };
    const applyPress = (): InputFrame => {
      if (press) {
        for (const b of press.buttons) out[b] = true;
        if (press.forward) setDir(toward);
        if (press.back) setDir(toward === 1 ? -1 : 1);
        if (press.down) out.down = true;
        press.left -= 1;
        if (press.left <= 0) press = null;
      }
      return out;
    };

    // Buttons already being pressed: hold them and nothing else.
    if (press) return applyPress();

    // Threat detection on the delayed view.
    let incoming: MoveDef | null = null;
    if (view.state === 'attack' && view.move !== null) {
      const m = moveInStance(oppDef, view.stance, view.move);
      if (view.moveFrame <= lastHitboxFrame(m) && !m.projectile && moveReach(m) + def.stats.width / 2 + 40 >= gap) incoming = m;
    }
    const recovering =
      (view.state === 'attack' && view.move !== null &&
        view.moveFrame > lastHitboxFrame(moveInStance(oppDef, view.stance, view.move)) &&
        view.moveFrame + 6 <= moveTotalOf(moveInStance(oppDef, view.stance, view.move))) ||
      view.state === 'land' || view.state === 'getup';
    const projectile = s.projectiles.find((q: Projectile) =>
      q.owner === oppIndex && (q.x < f.x) === (q.vx > 0) && Math.abs(q.x - f.x) < Math.abs(q.vx) * (p.reaction + 12) + 70,
    );
    const threat = incoming !== null || projectile !== undefined;

    // 1. Combo: cancel a connected move into the next link.
    if (f.state === 'attack' && f.move !== null && f.moveConnected) {
      const cancels = moveFor(def, f, f.move).cancels;
      if (cancels && f.moveFrame <= cancels.until && !rng.chance(p.mistake * 0.5)) {
        const slot = pickCancel(cancels.into, f, def, reaches, o, gap);
        if (slot && canCancelInto(f, def, slot)) {
          startPress(slot);
          return applyPress();
        }
      }
      return out;
    }

    // 2. Not actionable: keep holding a block if we were blocking, otherwise wait.
    if (!isActionable(f)) {
      if ((f.state === 'block' || f.state === 'blockstun') && threat) {
        out.block = true;
        out.down = incoming?.level === 'low' || f.crouching;
      }
      return out;
    }

    // 3. In the air with the air attack still available.
    if (isAirborne(f)) {
      if (reaches(reach.airHeavy) && Math.abs(o.y - f.y) < 140 && rng.chance(p.aggression + 0.2)) startPress('airHeavy');
      else if (gap < 60 && rng.chance(0.5)) startPress('airLight');
      return applyPress();
    }

    // 3b. Standing in a telegraphed strike lane: step out (the better the blocker, the more reliably).
    const lane = s.zones.find(
      (z) => z.owner === oppIndex && z.kind === 'strike' && !z.struck && Math.abs(z.x - f.x) < z.w / 2 + def.stats.width / 2,
    );
    if (lane && rng.chance(Math.max(0.15, p.block))) {
      const away: 1 | -1 = f.x >= lane.x ? 1 : -1;
      setDir(cornered && away !== toward ? toward : away);
      return out;
    }

    // 4. Defence against a seen attack or projectile.
    if (threat) {
      if (!threatSeen) {
        threatSeen = true;
        const r = rng.next();
        if (r > p.block) threatPlan = 'ignore';
        else if (projectile && r < p.block * 0.35) threatPlan = 'jump';
        else if (r < p.block * p.dodge) threatPlan = 'dodge';
        else threatPlan = 'block';
      }
      if (threatPlan === 'block') {
        out.block = true;
        out.down = incoming?.level === 'low';
        return out;
      }
      if (threatPlan === 'dodge') {
        threatPlan = 'ignore';
        if (f.dodgeCooldown === 0) {
          startPress('dodge', cornered ? { forward: true } : { back: true });
          return applyPress();
        }
        out.block = true;
        return out;
      }
      if (threatPlan === 'jump') {
        out.up = true;
        setDir(toward);
        return out;
      }
      // ignore: fall through and keep playing.
    } else {
      threatSeen = false;
    }

    // 5. Ultimate with a full meter when it reaches.
    if (f.meter >= METER_MAX && ((ultMelee && reaches(reach.ultimate) && fitsLeap(moveFor(def, f, 'ultimate'), reach.ultimate, gap)) || (ultZone && gap < 520)) && rng.chance(p.aggression)) {
      startPress('ultimate');
      return applyPress();
    }

    // 6. Anti-air a jump-in.
    const oppAir = view.y > 24 && (view.state === 'air' || view.state === 'attack');
    if (oppAir) {
      if (!airSeen) {
        airSeen = true;
        const closing = Math.sign(view.vx) === -toward || gap < 120;
        if (closing && isAntiAir(moveFor(def, f, 'specialD')) && reaches(reach.specialD + 30) && rng.chance(p.antiAir)) {
          startPress('specialD');
          return applyPress();
        }
      }
    } else {
      airSeen = false;
    }

    // 7. Punish recovery.
    if (recovering && rng.chance(p.punish)) {
      if (reaches(reach.heavy)) startPress('heavy');
      else if (reaches(reach.specialF)) startPress('specialF');
      else if (reaches(reach.light)) startPress('light');
      if (press) return applyPress();
    }

    // 8. Offensive decision on the think timer.
    if (tick <= 0) {
      tick = p.think;
      decide();
      if (press) return applyPress();
    }
    tick -= 1;

    // 9. Movement from the current intent.
    if (intentLeft <= 0) intent = 'approach';
    else intentLeft -= 1;
    switch (intent) {
      case 'approach':
        if (zoner ? gap > 430 : gap > reach.light * 0.75) setDir(toward);
        break;
      case 'retreat':
        setDir(cornered ? toward : toward === 1 ? -1 : 1);
        break;
      case 'block':
        out.block = true;
        break;
      case 'crouchBlock':
        out.block = true;
        out.down = true;
        break;
      case 'jumpIn':
        out.up = true;
        setDir(toward);
        break;
      case 'wait':
        break;
    }
    return out;

    function decide(): void {
      if (!reach) return;
      if (rng.chance(p.mistake)) {
        // A pointless action: a random button, a backstep or a hop.
        const r = rng.int(4);
        if (r === 0) startPress(rng.chance(0.5) ? 'light' : 'heavy');
        else if (r === 1) startPress('specialN');
        else if (r === 2) setIntent('retreat', 14);
        else setIntent('jumpIn', 4);
        return;
      }
      if (o.state === 'knockdown') {
        // Walk up and wait for the get-up (punish handles the meaty).
        setIntent(gap > reach.light ? 'approach' : 'wait', 6);
        return;
      }
      // Stance: switch to the stance that suits the distance.
      const sw = moveFor(def, f, 'specialF').switchStance;
      if (def.stances && sw !== undefined) {
        if (f.stance === 0 && gap > 330 && rng.chance(0.5)) return startPress('specialF');
        if (f.stance !== 0 && gap < 190 && rng.chance(0.5)) return startPress('specialF');
      }
      // A temporary guard before a close fight.
      if (moveFor(def, f, 'specialD').grants && !f.shield && gap > 80 && gap < 280 && rng.chance(0.3 + p.aggression * 0.2)) {
        return startPress('specialD');
      }
      // Zone setters: a decoy near, a slow field a little further.
      const zn = moveFor(def, f, 'specialN').zone;
      if (zn?.kind === 'decoy' && !s.zones.some((z) => z.owner === index && z.kind === 'decoy') && gap > 120 && gap < 320 && rng.chance(0.3)) {
        return startPress('specialN');
      }
      const zf = moveFor(def, f, 'specialF').zone;
      if (zf?.kind === 'slow' && !s.zones.some((z) => z.owner === index && z.kind === 'slow') && gap > 150 && gap < 340 && rng.chance(0.3)) {
        return startPress('specialF');
      }
      // Zoners back away from the opponent's reach instead of trading in it.
      if (zoner && gap < oppReach + 50 && !cornered && rng.chance(0.65)) {
        setIntent('retreat', p.think);
        return;
      }
      // Ranged options from a safe distance.
      if (projSlots.length > 0 && gap >= 150 && rng.chance(0.4 + p.aggression * 0.3)) {
        const far = gap > 380;
        const pick = far ? projSlots[rng.int(projSlots.length)] : projSlots[0];
        if (pick) return startPress(pick);
      }
      // Grab a standing or blocking opponent in reach (never one already stunned or airborne).
      const grabbable = (view.state === 'block' || view.state === 'idle' || view.state === 'walk' || view.state === 'crouch') && view.y <= 0;
      if (grabbable && reaches(reach.throw) && rng.chance(view.state === 'block' ? p.aggression * 0.8 : p.aggression * 0.3)) {
        startPress('throw');
        return;
      }
      if (reaches(reach.light)) {
        if (rng.chance(p.aggression)) {
          const r = rng.next();
          startPress(r < 0.5 ? 'light' : r < 0.75 ? 'crouchLight' : reaches(reach.heavy) ? 'heavy' : 'light');
        } else {
          setIntent(rng.chance(0.5) ? 'retreat' : rng.chance(0.5) ? 'block' : 'crouchBlock', p.think);
        }
        return;
      }
      // Hard only: the slow unblockable power strike as an occasional mix-up at heavy range.
      if (p.aggression >= 0.7 && reaches(reach.heavy) && rng.chance(0.08)) return startPress('power');
      if (reaches(reach.heavy) && rng.chance(p.aggression * 0.6)) return startPress('heavy');
      if (reaches(reach.specialF) && rng.chance(p.aggression * 0.4)) return startPress('specialF');
      if (gap > 220 && rng.chance(p.aggression * 0.15)) return setIntent('jumpIn', 4);
      if (rng.chance(p.aggression + 0.25)) setIntent('approach', p.think);
      else setIntent(rng.chance(0.5) ? 'retreat' : 'wait', p.think);
    }

    function setIntent(i: Intent, frames: number): void {
      intent = i;
      intentLeft = frames;
    }
  };
}

/** A move that leaves the ground (a leap): it overshoots a close opponent. */
function leaps(m: MoveDef): boolean {
  return (m.velocity ?? []).some((v) => (v.vy ?? 0) > 0);
}

/** Leaps only make sense at a distance near their landing spot. */
function fitsLeap(m: MoveDef, reach: number, gap: number): boolean {
  return !leaps(m) || gap >= reach * 0.5;
}

/** An invulnerable damaging special that can beat a jump-in (a rising cut), as opposed to a leap or an evade. */
function isAntiAir(m: MoveDef): boolean {
  return m.damage > 0 && m.invulnerable !== undefined && m.hitboxes.length > 0 && !leaps(m);
}

function moveTotalOf(m: MoveDef): number {
  return m.startup + m.active + m.recovery;
}

/** Next combo link: ultimate when full, else a special that reaches, else a heavy, else a light. */
function pickCancel(
  into: readonly MoveSlot[], f: FighterState, def: FighterDef, reaches: (r: number) => boolean, o: FighterState, gap: number,
): MoveSlot | null {
  const ult = moveFor(def, f, 'ultimate');
  if (f.meter >= METER_MAX && into.includes('ultimate') && fitsLeap(ult, moveReach(ult), gap)) return 'ultimate';
  const airborne = isAirborne(f);
  const order: MoveSlot[] = airborne
    ? ['airHeavy', 'airLight']
    : o.y > 24
      ? ['specialD', 'specialF', 'specialN', 'heavy', 'crouchHeavy', 'light', 'crouchLight']
      : ['specialF', 'specialN', 'specialD', 'heavy', 'crouchHeavy', 'light', 'crouchLight'];
  for (const slot of order) {
    if (!into.includes(slot)) continue;
    const m = moveFor(def, f, slot);
    // Utility specials (no damage: shields, evades, stance switches, decoys) never continue a combo.
    if (isSpecial(slot) && m.damage <= 0 && m.zone === undefined) continue;
    if (m.damage <= 0) continue;
    const r = moveReach(m);
    if (slot === 'specialN' && m.projectile) return slot;
    if (!reaches(r + 20) || !fitsLeap(m, r, gap)) continue;
    return slot;
  }
  return null;
}

function isSpecial(slot: MoveSlot): boolean {
  return slot === 'specialN' || slot === 'specialF' || slot === 'specialD';
}
