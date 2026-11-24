import { describe, expect, it } from 'vitest';
import { fitWithin } from './imageOptimize';

describe('fitWithin', () => {
  it('nie powiększa małych obrazów', () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(1600, 1600, 1600)).toEqual({ width: 1600, height: 1600 });
  });

  it('skaluje po dłuższym boku i zachowuje proporcje', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it('nigdy nie zwraca zera', () => {
    expect(fitWithin(100_000, 1, 1600)).toEqual({ width: 1600, height: 1 });
  });
});
