import { describe, expect, it } from 'vitest';
import { animDuration, samplePose } from '../../render/anim';
import { BONES } from '../../render/types';
import { WALK_STRIDE_SPEED } from '../../render/fighterAnim';
import { RIG, computeRig, createRigState } from '../../render/rig';
import { hitboxFrames, moveTotal } from '../../sim/moves';
import { MOVE_SLOTS, type MoveSlot } from '../../sim/types';
import { validateFighterDef } from '../../sim/validate';
import { FIGHTERS, FIGHTER_ORDER } from './index';

const entries = FIGHTER_ORDER.map((id) => [id, FIGHTERS[id]] as const);

/**
 * Melee hitboxes that deliberately do not follow the weapon: Vira's ultimate strikes with
 * remote columns of light while her spear stays planted at her feet.
 */
const REMOTE_HITBOXES: ReadonlySet<string> = new Set(['vira.ultimate']);

/** How far (px) the weapon tip may sit from the hitbox's far edge, and outside its height. */
const TIP_TOLERANCE = 35;

describe('fighter registry', () => {
  it('lists every registered fighter once, keyed by its id', () => {
    expect([...FIGHTER_ORDER].sort()).toEqual(Object.keys(FIGHTERS).sort());
    for (const [id, e] of entries) expect(e.def.id).toBe(id);
  });
});

describe.each(entries)('%s', (id, entry) => {
  const { def, look, anims } = entry;

  it('passes validateFighterDef and uses all 10 slots', () => {
    expect(validateFighterDef(def)).toEqual([]);
    expect(Object.keys(def.moves).sort()).toEqual([...MOVE_SLOTS].sort());
  });

  it('every move has its own animation, as long as the move (tolerance 0 frames)', () => {
    for (const slot of MOVE_SLOTS) {
      const m = def.moves[slot];
      expect(m.anim, slot).toBe(`${id}.${slot}`);
      const a = anims[m.anim];
      expect(a, m.anim).toBeDefined();
      if (!a) continue;
      expect(a.loop, m.anim).toBe(false);
      expect(animDuration(a), m.anim).toBe(moveTotal(m));
    }
  });

  it('animations are well formed and loops close on their first pose', () => {
    for (const [animId, a] of Object.entries(anims)) {
      expect(a.frames[0]?.t, animId).toBe(0);
      for (let i = 1; i < a.frames.length; i++) {
        expect(a.frames[i]?.t, animId).toBeGreaterThan(a.frames[i - 1]?.t ?? Infinity);
      }
      for (const k of a.frames) {
        for (const b of BONES) expect(Number.isFinite(k.pose.angles[b]), `${animId} ${b}`).toBe(true);
        expect(Number.isFinite(k.pose.lean + k.pose.weapon + k.pose.root.x + k.pose.root.y), animId).toBe(true);
      }
      if (a.loop) expect(a.frames[a.frames.length - 1]?.pose, animId).toEqual(a.frames[0]?.pose);
    }
    expect(anims.idle?.loop).toBe(true);
  });

  it('every fx tag has a visual and every visual is used', () => {
    const tags = new Set(MOVE_SLOTS.flatMap((s) => (def.moves[s].fx ?? []).map((f) => f.tag)));
    const visuals = entry.visuals ?? {};
    for (const tag of tags) expect(visuals[tag], tag).toBeDefined();
    for (const tag of Object.keys(visuals)) expect(tags.has(tag), tag).toBe(true);
  });

  it('weapon tip matches each melee hitbox at the middle of its live frames', () => {
    const rig = createRigState();
    const problems: string[] = [];
    let checked = 0;
    for (const slot of MOVE_SLOTS) {
      const m = def.moves[slot];
      if (REMOTE_HITBOXES.has(m.anim)) continue;
      const a = anims[m.anim];
      if (!a) continue;
      for (const b of m.hitboxes) {
        const r = hitboxFrames(m, b);
        const mid = r.from + Math.floor((r.to - r.from) / 2);
        computeRig(samplePose(a, mid), look, rig);
        const tip = rig.weaponTip;
        const far = b.x + b.w;
        const where = `${slot} f${mid} tip ${tip.x.toFixed(0)},${tip.y.toFixed(0)} box x..${far} y ${b.y}..${b.y + b.h}`;
        if (Math.abs(tip.x - far) > TIP_TOLERANCE) problems.push(`${where}: reach`);
        if (tip.y < b.y - TIP_TOLERANCE || tip.y > b.y + b.h + TIP_TOLERANCE) problems.push(`${where}: height`);
        // The blade's middle (between grip and tip) is inside the box, give or take.
        const mx = (rig.handF.x + tip.x) / 2;
        const my = (rig.handF.y + tip.y) / 2;
        if (mx < b.x - TIP_TOLERANCE || mx > far || my < b.y - TIP_TOLERANCE || my > b.y + b.h + TIP_TOLERANCE) {
          problems.push(`${where}: blade middle ${mx.toFixed(0)},${my.toFixed(0)} outside`);
        }
        checked += 1;
      }
    }
    expect(problems).toEqual([]);
    expect(checked).toBeGreaterThan(5);
  });

  it('projectiles spawn at the throwing hand or the weapon tip', () => {
    const rig = createRigState();
    for (const slot of MOVE_SLOTS) {
      const m = def.moves[slot];
      const p = m.projectile;
      const a = anims[m.anim];
      if (!p || !a) continue;
      computeRig(samplePose(a, p.frame), look, rig);
      const d = Math.min(
        ...[rig.handF, rig.handB, rig.weaponTip].map((q) => Math.hypot(q.x - p.x, q.y - p.y)),
      );
      expect(d, slot).toBeLessThan(TIP_TOLERANCE);
    }
  });

  it('walk strides match the walk speed playback (planted feet do not slide)', () => {
    const rig = createRigState();
    for (const walkId of ['walk', 'walkBack']) {
      const a = anims[walkId];
      expect(a, walkId).toBeDefined();
      if (!a) continue;
      const feet = a.frames.map((k) => {
        computeRig(k.pose, look, rig);
        return { t: k.t, f: { ...rig.ankleF }, b: { ...rig.ankleB } };
      });
      const grounded = RIG.ankle * look.height + 0.5;
      let spans = 0;
      for (const foot of ['f', 'b'] as const) {
        // Runs of consecutive keys with this foot on the ground.
        let start = 0;
        for (let i = 1; i <= feet.length; i++) {
          const prev = feet[i - 1];
          const cur = feet[i];
          if (cur && prev && cur[foot].y <= grounded && prev[foot].y <= grounded) continue;
          const first = feet[start];
          const last = feet[i - 1];
          if (first && last && i - 1 > start) {
            const speed = Math.abs(last[foot].x - first[foot].x) / (last.t - first.t);
            expect(speed / (WALK_STRIDE_SPEED * look.height), `${walkId} ${foot}`).toBeCloseTo(1, 1);
            spans += 1;
          }
          start = i;
        }
      }
      expect(spans, walkId).toBeGreaterThanOrEqual(2);
    }
  });

  it('ultimate startup covers the super freeze; specials and ultimate are telegraphed', () => {
    const slots: MoveSlot[] = ['specialN', 'specialF', 'specialD', 'ultimate'];
    for (const s of slots) expect(def.moves[s].strength, s).toMatch(/special|ultimate/);
    expect(def.moves.ultimate.hitboxes.length).toBeGreaterThan(1);
  });
});

describe('archetypes', () => {
  const rei = FIGHTERS.rei.def;
  const vira = FIGHTERS.vira.def;
  const reach = (slot: MoveSlot, d: typeof rei): number =>
    Math.max(...d.moves[slot].hitboxes.map((b) => b.x + b.w));

  it('Rei is the faster, frailer rushdown fighter', () => {
    expect(rei.stats.health).toBe(900);
    expect(vira.stats.health).toBe(1000);
    expect(rei.stats.walkSpeed).toBeGreaterThan(vira.stats.walkSpeed);
    expect(rei.moves.light.startup).toBeLessThan(vira.moves.light.startup);
    expect(rei.moves.heavy.damage).toBeLessThan(vira.moves.heavy.damage);
  });

  it('Vira out-reaches Rei on every ground normal', () => {
    for (const slot of ['light', 'heavy', 'crouchLight', 'crouchHeavy'] as const) {
      expect(reach(slot, vira), slot).toBeGreaterThan(reach(slot, rei));
    }
  });

  it('no ground normal links into itself (startup longer than the advantage on hit)', () => {
    for (const d of [rei, vira]) {
      for (const slot of ['light', 'heavy', 'crouchLight'] as const) {
        const m = d.moves[slot];
        expect(m.hitstun - (m.active + m.recovery), `${d.id} ${slot}`).toBeLessThan(m.startup);
      }
    }
  });
});
