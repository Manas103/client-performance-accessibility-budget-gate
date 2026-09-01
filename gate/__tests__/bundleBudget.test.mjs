import { describe, expect, it } from 'vitest';
import { checkBundleBudget, round2 } from '../bundleBudget.mjs';

describe('checkBundleBudget', () => {
  it('reports no violations when every route is under budget', () => {
    const result = checkBundleBudget(
      [
        { route: 'friends', gzipBytes: 50 * 1024 },
        { route: 'party', gzipBytes: 60 * 1024 },
      ],
      120,
    );
    expect(result).toEqual([]);
  });

  it('reports a violation with the exact over-budget amount', () => {
    const result = checkBundleBudget([{ route: 'friends', gzipBytes: 200 * 1024 }], 120);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      route: 'friends',
      gzipKb: 200,
      budgetKb: 120,
      overByKb: 80,
    });
  });

  it('treats a route exactly at budget as passing (budget is inclusive)', () => {
    const result = checkBundleBudget([{ route: 'friends', gzipBytes: 120 * 1024 }], 120);
    expect(result).toEqual([]);
  });

  it('reports one violation per over-budget route, leaving under-budget routes out', () => {
    const result = checkBundleBudget(
      [
        { route: 'friends', gzipBytes: 300 * 1024 },
        { route: 'party', gzipBytes: 40 * 1024 },
      ],
      120,
    );
    expect(result).toHaveLength(1);
    expect(result[0].route).toBe('friends');
  });
});

describe('round2', () => {
  it('rounds to two decimal places', () => {
    expect(round2(1.005)).toBeCloseTo(1.0, 5);
    expect(round2(123.456)).toBe(123.46);
    expect(round2(10)).toBe(10);
  });
});
