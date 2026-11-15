import { describe, expect, it } from 'vitest';
import { BASE_POSES } from './anims/base';
import { pose } from './pose';
import { WEAPON_SPECS, computeRig, createRigState } from './rig';
import { ASTRA_LOOKS } from './sampleLooks';
import { STAGE_PALETTES } from './stage';
import { statusLabels } from './statusLabels';
import { createMatch } from '../sim/match';
import { testFighter } from '../sim/testFighter';
import type { FighterDef } from '../sim/types';

describe('ASTRA draft looks', () => {
  it('cover the eight heroes with distinct accents and solve to finite rigs', () => {
    expect(ASTRA_LOOKS.map((l) => l.name)).toEqual([
      'Arjuna', 'Bhima', 'Karna', 'Abhimanyu', 'Ghatotkacha', 'Parashurama', 'Ekalavya', 'Ashwatthama',
    ]);
    expect(new Set(ASTRA_LOOKS.map((l) => l.look.accent)).size).toBe(8);
    const rig = createRigState();
    for (const { name, look } of ASTRA_LOOKS) {
      expect(WEAPON_SPECS[look.weapon.type], name).toBeDefined();
      computeRig(pose(BASE_POSES.GUARD), look, rig);
      for (const v of [rig.weaponTip.x, rig.weaponTip.y, rig.weaponBase.x, rig.head.y]) {
        expect(Number.isFinite(v), name).toBe(true);
      }
    }
  });

  it('every weapon type has a grip inside the weapon', () => {
    for (const [type, spec] of Object.entries(WEAPON_SPECS)) {
      expect(spec.grip, type).toBeGreaterThanOrEqual(0);
      expect(spec.grip, type).toBeLessThanOrEqual(0.6);
    }
  });
});

describe('stage palettes', () => {
  it('each palette is keyed by its id and has every colour', () => {
    for (const [id, p] of Object.entries(STAGE_PALETTES)) {
      expect(p.id).toBe(id);
      for (const c of [p.bg, p.horizon, p.floor, p.grid, p.line]) expect(c.length).toBeGreaterThan(3);
    }
  });
});

describe('status labels', () => {
  const stanced: FighterDef = {
    ...testFighter,
    stances: { names: ['BLADE', 'BOW'], moves: [{}, {}] },
  };

  it('names shield, armour, charging, slowed and stance in text', () => {
    const m = createMatch({ fighters: [stanced, testFighter] });
    const f = m.state.fighters[0];
    expect(statusLabels(f, stanced)).toEqual(['STANCE: BLADE']);
    f.shield = { kind: 'absorb', framesLeft: 50, breaksOn: [], label: 'RADIANT ARMOR' };
    f.slow = { frames: 2, factor: 0.5 };
    f.state = 'charge';
    expect(statusLabels(f, stanced)).toEqual(['RADIANT ARMOR', 'CHARGING', 'SLOWED', 'STANCE: BLADE']);
    f.state = 'attack';
    f.move = 'power';
    f.moveFrame = 3;
    expect(statusLabels(f, testFighter)).toContain('ARMOR');
    f.moveFrame = 25;
    expect(statusLabels(f, testFighter)).not.toContain('ARMOR');
  });
});
