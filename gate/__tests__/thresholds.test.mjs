import { describe, expect, it } from 'vitest';
import { checkFocusNeverLost, checkVirtualizationThreshold } from '../thresholds.mjs';

describe('checkVirtualizationThreshold', () => {
  it('passes when the rendered row count is under the threshold', () => {
    const result = checkVirtualizationThreshold(52, 150);
    expect(result.violated).toBe(false);
  });

  it('fails when the rendered row count exceeds the threshold', () => {
    const result = checkVirtualizationThreshold(1000, 150);
    expect(result.violated).toBe(true);
    expect(result.renderedRowCount).toBe(1000);
    expect(result.threshold).toBe(150);
  });

  it('treats exactly-at-threshold as passing (threshold is inclusive)', () => {
    const result = checkVirtualizationThreshold(150, 150);
    expect(result.violated).toBe(false);
  });
});

describe('checkFocusNeverLost', () => {
  it('passes when body never appears in the sequence', () => {
    const result = checkFocusNeverLost(['A', 'BUTTON', 'INPUT', 'DIV']);
    expect(result.lost).toBe(false);
    expect(result.lostAtSteps).toEqual([]);
  });

  it('fails and names the step index when body appears', () => {
    const result = checkFocusNeverLost(['A', 'BUTTON', 'BODY', 'INPUT']);
    expect(result.lost).toBe(true);
    expect(result.lostAtSteps).toEqual([2]);
  });

  it('names every step where focus was lost, not just the first', () => {
    const result = checkFocusNeverLost(['BODY', 'A', 'BODY']);
    expect(result.lostAtSteps).toEqual([0, 2]);
  });
});
