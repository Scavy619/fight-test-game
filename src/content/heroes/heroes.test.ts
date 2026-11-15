// Content tests every registered hero must pass.
import { describe, expect, it } from 'vitest';
import { animDuration, samplePose } from '../../render/anim';
import { WALK_STRIDE_SPEED } from '../../render/fighterAnim';
import { RIG, computeRig, createRigState } from '../../render/rig';
import { BONES } from '../../render/types';
import { hitboxFrames, moveTotal } from '../../sim/moves';
import { MOVE_SLOTS } from '../../sim/types';
import { validateFighterDef } from '../../sim/validate';
import { wordCount } from '../heroKit';
import { HERO_LORE } from '../lore';
import { ROSTER } from '../roster';
import { BODY_STRIKES, HEROES, HERO_ORDER } from './index';

const entries = HERO_ORDER.map((id) => [id, HEROES[id]] as const);

/** How far (px) the weapon tip may sit from the hitbox's far edge, and outside its height. */
const TIP_TOLERANCE = 35;

describe('hero registry', () => {
  it('lists every registered hero once, keyed by its id, and each appears in the roster with the same unlock', () => {
    expect([...HERO_ORDER].sort()).toEqual(Object.keys(HEROES).sort());
    for (const [id, e] of entries) {
      expect(e.def.id).toBe(id);
      const slot = ROSTER.find((r) => r.id === id);
      expect(slot, id).toBeDefined();
      expect(slot?.name).toBe(e.def.name);
      expect(slot?.title).toBe(e.profile.title);
      expect(slot?.unlock).toBe(e.profile.unlock.text);
    }
  });
});

describe.each(entries)('%s', (id, entry) => {
  const { def, look, anims, profile } = entry;

  it('passes validateFighterDef and uses every slot', () => {
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
    const stanceMoves = (def.stances?.moves ?? []).flatMap((o) => Object.values(o));
    const tags = new Set([
      ...MOVE_SLOTS.flatMap((s) => (def.moves[s].fx ?? []).map((f) => f.tag)),
      ...stanceMoves.flatMap((m) => (m?.fx ?? []).map((f) => f.tag)),
    ]);
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
      if (m.throw || BODY_STRIKES.has(m.anim)) continue;
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
        const mx = (rig.handF.x + tip.x) / 2;
        const my = (rig.handF.y + tip.y) / 2;
        if (mx < b.x - TIP_TOLERANCE || mx > far || my < b.y - TIP_TOLERANCE || my > b.y + b.h + TIP_TOLERANCE) {
          problems.push(`${where}: blade middle ${mx.toFixed(0)},${my.toFixed(0)} outside`);
        }
        checked += 1;
      }
    }
    expect(problems).toEqual([]);
    expect(checked).toBeGreaterThan(4);
  });

  it('stance override moves have animations as long as the move and spawn projectiles at a hand', () => {
    const rig = createRigState();
    for (const [k, overrides] of (def.stances?.moves ?? []).entries()) {
      for (const [slot, m] of Object.entries(overrides)) {
        if (!m) continue;
        const a = anims[m.anim];
        expect(a, `${slot} stance ${k}`).toBeDefined();
        if (!a) continue;
        expect(m.anim, slot).toBe(`${id}.${slot}.s${k}`);
        expect(animDuration(a), m.anim).toBe(moveTotal(m));
        if (m.projectile) {
          computeRig(samplePose(a, m.projectile.frame), look, rig);
          const d = Math.min(...[rig.handF, rig.handB, rig.weaponTip].map((q) => Math.hypot(q.x - (m.projectile?.x ?? 0), q.y - (m.projectile?.y ?? 0))));
          expect(d, m.anim).toBeLessThan(TIP_TOLERANCE);
        }
      }
    }
  });

  it('projectiles spawn at the hand or the weapon tip', () => {
    const rig = createRigState();
    for (const slot of MOVE_SLOTS) {
      const m = def.moves[slot];
      const p = m.projectile;
      const a = anims[m.anim];
      if (!p || !a) continue;
      computeRig(samplePose(a, p.frame), look, rig);
      const d = Math.min(...[rig.handF, rig.handB, rig.weaponTip].map((q) => Math.hypot(q.x - p.x, q.y - p.y)));
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

  it('the grab and the power strike follow the shared rules', () => {
    const t = def.moves.throw;
    expect(t.throw).toBe(true);
    expect(t.launches).toBe(true);
    expect(t.cancels).toBeUndefined();
    expect(Math.max(...t.hitboxes.map((b) => b.x + b.w))).toBeLessThanOrEqual(90);
    expect(t.recovery).toBeGreaterThanOrEqual(18);
    expect(t.damage).toBeGreaterThan(def.moves.heavy.damage);
    const p = def.moves.power;
    expect(p.unblockable).toBe(true);
    expect(p.armor).toBeDefined();
    expect(p.launches).toBe(true);
    expect(p.cancels).toBeUndefined();
    expect(p.startup).toBeGreaterThanOrEqual(16);
    expect(p.recovery).toBeGreaterThanOrEqual(20);
  });

  it('specials and the ultimate are telegraphed, and the ultimate does something', () => {
    for (const s of ['specialN', 'specialF', 'specialD', 'ultimate'] as const) {
      expect(def.moves[s].strength, s).toMatch(/special|ultimate/);
    }
    const u = def.moves.ultimate;
    expect(u.hitboxes.length > 1 || u.zone !== undefined || u.projectile !== undefined).toBe(true);
    expect(u.invulnerable).toBeDefined();
  });

  it('no ground normal links into itself (startup longer than the advantage on hit)', () => {
    for (const slot of ['light', 'heavy', 'crouchLight'] as const) {
      const m = def.moves[slot];
      expect(m.hitstun - (m.active + m.recovery), slot).toBeLessThan(m.startup);
    }
  });

  it('has a complete profile: bio length, every move described, unlock, relationships on the roster', () => {
    const words = wordCount(profile.bio);
    expect(words, 'bio words').toBeGreaterThanOrEqual(80);
    expect(words, 'bio words').toBeLessThanOrEqual(130);
    expect(profile.identity.endsWith('.')).toBe(true);
    expect(profile.title.length).toBeGreaterThan(5);
    expect(profile.weapons.primary.length).toBeGreaterThan(2);
    expect(profile.palette.length).toBeGreaterThanOrEqual(3);
    expect(profile.poses.intro.length).toBeGreaterThan(10);
    expect(profile.poses.victory.length).toBeGreaterThan(10);
    for (const slot of MOVE_SLOTS) {
      const mi = profile.moves[slot];
      expect(mi, slot).toBeDefined();
      expect(mi?.name.length, slot).toBeGreaterThan(2);
      expect(mi?.description.length, slot).toBeGreaterThan(15);
      expect(mi?.input.length, slot).toBeGreaterThan(2);
    }
    for (const sl of ['specialN', 'specialF', 'specialD', 'ultimate', 'heavy', 'power'] as const) {
      expect(profile.moves[sl]?.counterplay?.length ?? 0, `${sl} counterplay`).toBeGreaterThan(10);
    }
    const ids = ROSTER.map((r) => r.id);
    for (const r of profile.relationships) expect(ids).toContain(r.id);
    expect(profile.campaignRole.length).toBeGreaterThan(20);
    expect(profile.unlock.text.length).toBeGreaterThan(5);
  });
});

describe('hero lore', () => {
  it.each(entries)('%s has Tradition and In this game text with sources', (id) => {
    const l = HERO_LORE[id];
    expect(l, id).toBeDefined();
    expect(l?.tradition.length).toBeGreaterThanOrEqual(2);
    expect(l?.inThisGame.length).toBeGreaterThanOrEqual(2);
    expect(l?.sources.length).toBeGreaterThanOrEqual(2);
    for (const s of l?.sources ?? []) expect(s.url.startsWith('https://')).toBe(true);
  });
});
