// Every hero must have a real ground chain: light, light, heavy lands as one combo at close
// range (the cancel windows and hitstun have to line up), and the ultimate is reachable.
import { describe, expect, it } from 'vitest';
import { createMatch, step } from '../../sim/match';
import { EMPTY_INPUT, type FighterDef, type InputFrame } from '../../sim/types';
import { HEROES, HERO_ORDER } from './index';

function ready(a: FighterDef, d: FighterDef) {
  const m = createMatch({ fighters: [a, d], roundSeconds: 99 });
  while (m.state.phase !== 'fight') step(m, [EMPTY_INPUT, EMPTY_INPUT]);
  m.state.fighters[0].x = 600;
  m.state.fighters[1].x = 690;
  return m;
}

/**
 * Plays `buttons` in order: the first at once, each next one on the step after the current
 * move connects (what a player cancelling on hit does). Returns the highest combo reached.
 */
function maxCombo(a: FighterDef, d: FighterDef, buttons: readonly ('light' | 'heavy')[]): number {
  const m = ready(a, d);
  let best = 0;
  let next = 0;
  let lastConnected = false;
  for (let k = 0; k < 220; k++) {
    const f = m.state.fighters[0];
    const press: Partial<InputFrame> = {};
    if (next === 0 && k === 0) {
      press[buttons[0] as 'light'] = true;
      next = 1;
    } else if (next > 0 && next < buttons.length && f.state === 'attack' && f.moveConnected && !lastConnected) {
      press[buttons[next] as 'light'] = true;
      next += 1;
    }
    lastConnected = f.state === 'attack' && f.moveConnected;
    step(m, [{ ...EMPTY_INPUT, ...press }, EMPTY_INPUT]);
    best = Math.max(best, m.state.fighters[0].combo);
  }
  return best;
}

describe.each(HERO_ORDER)('%s chains', (id) => {
  const def = HEROES[id].def;
  const dummy = HEROES[id === 'bhima' ? 'arjuna' : 'bhima'].def;

  it('light, light, heavy connect as one three-hit combo at close range', () => {
    expect(maxCombo(def, dummy, ['light', 'light', 'heavy'])).toBeGreaterThanOrEqual(3);
  });

  it('a full meter and heavy + special starts the ultimate', () => {
    const m = ready(def, dummy);
    m.state.fighters[0].meter = 100;
    const ev = step(m, [{ ...EMPTY_INPUT, heavy: true, special: true }, EMPTY_INPUT]);
    expect(ev.some((e) => e.type === 'superFreeze')).toBe(true);
  });
});
