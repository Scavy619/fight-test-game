// Structural checks for fighter data, for content tests.
import { SUPER_FREEZE_FRAMES } from './constants';
import { hitboxFrames, isAirSlot, moveTotal } from './moves';
import type { FighterDef, MoveDef } from './types';
import { MOVE_SLOTS } from './types';

function isWhole(n: number, min: number): boolean {
  return Number.isInteger(n) && n >= min;
}

function checkMove(slot: string, m: MoveDef, problems: string[]): void {
  const p = (msg: string): void => {
    problems.push(`${slot}: ${msg}`);
  };
  if (!m.anim) p('missing anim');
  if (!isWhole(m.startup, 1) || !isWhole(m.active, 1) || !isWhole(m.recovery, 0)) {
    p('startup/active must be whole numbers >= 1 and recovery >= 0');
  }
  const total = moveTotal(m);
  for (const b of m.hitboxes) {
    if (b.w <= 0 || b.h <= 0) p('hitbox with non-positive size');
    const r = hitboxFrames(m, b);
    if (r.from < 1 || r.to > total || r.from > r.to) p(`hitbox frames ${r.from}..${r.to} outside 1..${total}`);
  }
  if (m.armor && (m.armor.from < 1 || m.armor.to > total || m.armor.from > m.armor.to)) {
    p(`armor frames ${m.armor.from}..${m.armor.to} outside 1..${total}`);
  }
  for (const v of m.velocity ?? []) {
    if (v.from < 1 || v.to > total || v.from > v.to) p(`velocity frames ${v.from}..${v.to} outside 1..${total}`);
  }
  if (m.projectile) {
    const pr = m.projectile;
    if (pr.frame < 1 || pr.frame > total) p('projectile frame outside the move');
    if (pr.w <= 0 || pr.h <= 0 || pr.lifetime <= 0) p('projectile needs a positive size and lifetime');
  }
  if (m.cancels) {
    for (const s of m.cancels.into) if (!MOVE_SLOTS.includes(s)) p(`cancels into unknown slot ${s}`);
  }
  for (const fx of m.fx ?? []) if (fx.frame < 1 || fx.frame > total) p(`fx ${fx.tag} outside the move`);
  if (m.grants && (!isWhole(m.grants.frames, 1) || !m.grants.label)) p('grants needs frames >= 1 and a label');
  if (m.piercesLateGuard !== undefined && !isWhole(m.piercesLateGuard, 1)) p('piercesLateGuard must be a whole number >= 1');
  const z = m.zone;
  if (z) {
    if (z.frame < 1 || z.frame > total) p('zone frame outside the move');
    if (!(z.w > 0) || !isWhole(z.frames, 1) || !z.label) p('zone needs a positive width, frames >= 1 and a label');
    if (z.kind === 'strike') {
      if (!(z.damage !== undefined && z.damage > 0)) p('strike zone needs damage');
      if (z.strikeAt !== undefined && (z.strikeAt < 1 || z.strikeAt > z.frames)) p('strike zone strikeAt outside 1..frames');
    }
    if (z.kind === 'slow' && z.slowFactor !== undefined && !(z.slowFactor > 0 && z.slowFactor < 1)) p('slow zone factor must be in (0, 1)');
  }
  if (m.projectile?.behavior === 'returning' && (m.projectile.hits ?? 1) < 1) p('returning projectile needs hits');
}

/** Returns a list of problems (empty when the fighter is valid). */
export function validateFighterDef(def: FighterDef): string[] {
  const problems: string[] = [];
  if (!def.id) problems.push('missing id');
  const st = def.stats;
  for (const [k, v] of Object.entries(st)) if (!(v > 0)) problems.push(`stats.${k} must be positive`);
  if (st.crouchHeight > st.height) problems.push('crouchHeight above height');
  for (const slot of MOVE_SLOTS) {
    const m = def.moves[slot];
    if (!m) {
      problems.push(`${slot}: missing`);
      continue;
    }
    checkMove(slot, m, problems);
    if (isAirSlot(slot) && m.level !== 'overhead') problems.push(`${slot}: air attacks must be overhead`);
    if (slot === 'throw' && !m.throw) problems.push('throw: must set throw: true');
    if (slot === 'throw' && m.cancels) problems.push('throw: grabs do not cancel');
  }
  const ult = def.moves.ultimate;
  if (ult && ult.startup <= SUPER_FREEZE_FRAMES) {
    problems.push(`ultimate: startup must exceed the ${SUPER_FREEZE_FRAMES}-frame super freeze`);
  }
  const stances = def.stances;
  if (stances) {
    if (stances.names.length !== stances.moves.length || stances.moves.length < 2) {
      problems.push('stances: names and moves must match and number at least 2');
    }
    stances.moves.forEach((over, k) => {
      for (const [slot, m] of Object.entries(over) as [string, MoveDef | undefined][]) {
        if (m) checkMove(`stance ${k} ${slot}`, m, problems);
      }
    });
  }
  for (const slot of MOVE_SLOTS) {
    const sw = def.moves[slot]?.switchStance;
    if (sw === undefined) continue;
    if (!stances) problems.push(`${slot}: switchStance without stances`);
    else if (sw !== 'next' && (sw < 0 || sw >= stances.moves.length)) problems.push(`${slot}: switchStance out of range`);
  }
  return problems;
}
