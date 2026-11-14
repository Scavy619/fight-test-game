import { describe, expect, it } from 'vitest';
import { EMPTY_INPUT } from './types';

describe('EMPTY_INPUT', () => {
  it('has every button released', () => {
    expect(Object.values(EMPTY_INPUT).every((v) => v === false)).toBe(true);
    expect(Object.keys(EMPTY_INPUT)).toHaveLength(11);
  });
});
