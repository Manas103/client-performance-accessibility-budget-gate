// Pure masonry layout and virtualization math, no DOM and no React, so it is directly unit
// testable (masonryLayout.test.ts) the same way gate/thresholds.mjs is: this module decides
// where every tile goes and which ones are visible; FeedTile.tsx and FriendsList.tsx only
// read the numbers back and render them.

export const MASONRY_COLUMNS = 7;
export const MASONRY_MIN_TILE_HEIGHT = 90;
export const MASONRY_MAX_TILE_HEIGHT = 180;
export const MASONRY_GAP = 8;

export type TilePosition = {
  index: number;
  column: number;
  top: number;
  height: number;
};

// Deterministic per-tile height from its index, so the dataset itself does not need to
// store a height and the same index always lays out the same way (needed for the
// regression matrix to be reproducible). Math.imul keeps this a cheap 32-bit integer hash,
// not a cryptographic one; it only needs to look irregular, not be unpredictable.
export function tileHeight(index: number): number {
  const h = (Math.imul(index + 1, 2654435761) >>> 0) % 4294967296;
  const span = MASONRY_MAX_TILE_HEIGHT - MASONRY_MIN_TILE_HEIGHT;
  return MASONRY_MIN_TILE_HEIGHT + (h % span);
}

// Shortest-column-first packing, the standard masonry heuristic: each new tile goes into
// whichever column is currently shortest, which is what keeps columns close to balanced
// without a second pass. Each column's own tiles come out already sorted by `top` because a
// column's bottom only ever grows, which is what makes the binary search in
// visibleTileIndices correct.
export function computeMasonryLayout(itemCount: number, columns = MASONRY_COLUMNS): TilePosition[][] {
  const colBottoms = new Array(columns).fill(0);
  const perColumn: TilePosition[][] = Array.from({ length: columns }, () => []);
  for (let i = 0; i < itemCount; i++) {
    let col = 0;
    for (let c = 1; c < columns; c++) {
      if (colBottoms[c] < colBottoms[col]) col = c;
    }
    const height = tileHeight(i);
    perColumn[col].push({ index: i, column: col, top: colBottoms[col], height });
    colBottoms[col] += height + MASONRY_GAP;
  }
  return perColumn;
}

export function columnContentHeight(perColumn: TilePosition[][]): number {
  let max = 0;
  for (const col of perColumn) {
    if (col.length === 0) continue;
    const last = col[col.length - 1];
    max = Math.max(max, last.top + last.height);
  }
  return max;
}

// First index in a column (sorted ascending by `top`) whose bottom edge (top + height) is
// at or past `from`. Used to skip straight to the first tile that could possibly intersect
// the visible-plus-overscan window instead of scanning every tile in the column from zero.
function lowerBoundByBottom(col: TilePosition[], from: number): number {
  let lo = 0;
  let hi = col.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (col[mid].top + col[mid].height < from) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

// Every tile, across every column, whose span overlaps [scrollTop - overscanPx,
// scrollTop + viewportHeight + overscanPx]. Real virtualization math: a column's items are
// walked only from the first one that could be visible, and stop the instant a tile starts
// past the window, since every column is sorted by `top`.
export function visibleTileIndices(
  perColumn: TilePosition[][],
  scrollTop: number,
  viewportHeight: number,
  overscanPx: number,
): TilePosition[] {
  const from = scrollTop - overscanPx;
  const to = scrollTop + viewportHeight + overscanPx;
  const visible: TilePosition[] = [];
  for (const col of perColumn) {
    const start = lowerBoundByBottom(col, from);
    for (let i = start; i < col.length; i++) {
      const tile = col[i];
      if (tile.top > to) break;
      visible.push(tile);
    }
  }
  return visible;
}
