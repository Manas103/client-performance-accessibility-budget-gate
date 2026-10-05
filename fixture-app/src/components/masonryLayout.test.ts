import { describe, expect, it } from 'vitest';
import {
  computeMasonryLayout,
  columnContentHeight,
  tileHeight,
  visibleTileIndices,
  MASONRY_MIN_TILE_HEIGHT,
  MASONRY_MAX_TILE_HEIGHT,
} from './masonryLayout';

describe('tileHeight', () => {
  it('stays within the configured min/max range', () => {
    for (let i = 0; i < 2000; i++) {
      const h = tileHeight(i);
      expect(h).toBeGreaterThanOrEqual(MASONRY_MIN_TILE_HEIGHT);
      expect(h).toBeLessThan(MASONRY_MAX_TILE_HEIGHT);
    }
  });

  it('is deterministic for the same index', () => {
    expect(tileHeight(4321)).toBe(tileHeight(4321));
  });
});

describe('computeMasonryLayout', () => {
  it('assigns every item to exactly one column', () => {
    const perColumn = computeMasonryLayout(500, 5);
    const total = perColumn.reduce((sum, col) => sum + col.length, 0);
    expect(total).toBe(500);
  });

  it('keeps every column sorted ascending by top (required for the binary search)', () => {
    const perColumn = computeMasonryLayout(2000, 7);
    for (const col of perColumn) {
      for (let i = 1; i < col.length; i++) {
        expect(col[i].top).toBeGreaterThan(col[i - 1].top);
      }
    }
  });

  it('keeps columns balanced: no column more than one tile-height ahead of the shortest', () => {
    const perColumn = computeMasonryLayout(1000, 7);
    const bottoms = perColumn.map((col) => {
      if (col.length === 0) return 0;
      const last = col[col.length - 1];
      return last.top + last.height;
    });
    const spread = Math.max(...bottoms) - Math.min(...bottoms);
    expect(spread).toBeLessThan(MASONRY_MAX_TILE_HEIGHT * 2);
  });
});

describe('columnContentHeight', () => {
  it('matches the tallest column bottom edge', () => {
    const perColumn = computeMasonryLayout(50, 3);
    const height = columnContentHeight(perColumn);
    const expected = Math.max(
      ...perColumn.map((col) => (col.length ? col[col.length - 1].top + col[col.length - 1].height : 0)),
    );
    expect(height).toBe(expected);
  });

  it('is 0 for an empty layout', () => {
    expect(columnContentHeight(computeMasonryLayout(0, 5))).toBe(0);
  });
});

describe('visibleTileIndices', () => {
  it('returns every tile for a window covering the full content', () => {
    const perColumn = computeMasonryLayout(200, 4);
    const contentHeight = columnContentHeight(perColumn);
    const visible = visibleTileIndices(perColumn, 0, contentHeight, contentHeight);
    expect(visible.length).toBe(200);
  });

  it('returns only tiles overlapping a narrow window, never the full set, for a large layout', () => {
    const perColumn = computeMasonryLayout(10_000, 7);
    const visible = visibleTileIndices(perColumn, 5000, 640, 1100);
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.length).toBeLessThan(10_000);
    for (const tile of visible) {
      expect(tile.top + tile.height).toBeGreaterThanOrEqual(5000 - 1100);
      expect(tile.top).toBeLessThanOrEqual(5000 + 640 + 1100);
    }
  });

  it('never returns a tile whose span does not actually overlap the window', () => {
    const perColumn = computeMasonryLayout(3000, 5);
    const visible = visibleTileIndices(perColumn, 20_000, 640, 300);
    const allIndices = new Set(perColumn.flat().map((t) => t.index));
    for (const tile of visible) {
      expect(allIndices.has(tile.index)).toBe(true);
    }
  });

  it('finds no tiles for a window entirely past the end of the content', () => {
    const perColumn = computeMasonryLayout(100, 3);
    const contentHeight = columnContentHeight(perColumn);
    const visible = visibleTileIndices(perColumn, contentHeight + 100_000, 640, 0);
    expect(visible.length).toBe(0);
  });
});
