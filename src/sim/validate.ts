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
  }
  const ult = def.moves.ultimate;
  if (ult && ult.startup <= SUPER_FREEZE_FRAMES) {
    problems.push(`ultimate: startup must exceed the ${SUPER_FREEZE_FRAMES}-frame super freeze`);
  }
  return problems;
}
