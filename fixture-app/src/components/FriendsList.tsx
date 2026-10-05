import { useRef, useState, useEffect } from 'react';
import { FeedTile } from './FeedTile';
import { virtualizationMode } from '../variantConfig';
import type { Friend } from '../data/friends';
import type { ThemeTokens } from '../theme';
import {
  computeMasonryLayout,
  columnContentHeight,
  visibleTileIndices,
  MASONRY_COLUMNS,
  MASONRY_GAP,
} from './masonryLayout';

type Props = {
  friends: Friend[];
  searchTerm: string;
  theme: ThemeTokens;
};

const TILE_WIDTH = 160;
const CONTAINER_HEIGHT = 640;
// 1,050px of preload buffer above and below the viewport, roughly 1.6 viewport-heights each
// side. A text row list can get away with a 10-row overscan because a row is nearly free to
// mount; an image tile is not, so the feed trades a larger pixel-based overscan budget for
// keeping tiles decoded before they scroll into view. See gate.config.json's
// virtualizationNote for the measured mounted-tile count this produces.
const OVERSCAN_PX = 1050;
// Below this the app renders every tile directly (no windowing machinery needed for a
// short feed). The gate's virtualization check always requests 10,000 items via
// ?count=10000 regardless of a variant's own default, so this constant only affects the
// app's own default behavior at small sizes, never what the gate measures.
const VIRTUALIZE_AT = 150;
const GRID_WIDTH = MASONRY_COLUMNS * (TILE_WIDTH + MASONRY_GAP) - MASONRY_GAP;

function tileStyle(top: number, column: number, height: number) {
  return {
    top,
    left: column * (TILE_WIDTH + MASONRY_GAP),
    width: TILE_WIDTH,
    height,
  };
}

function renderPlain(list: Friend[], theme: ThemeTokens) {
  const perColumn = computeMasonryLayout(list.length);
  const contentHeight = columnContentHeight(perColumn);
  const tiles = perColumn.flat();
  return (
    <div style={{ height: CONTAINER_HEIGHT, overflowY: 'auto' }}>
      <div style={{ position: 'relative', width: GRID_WIDTH, height: contentHeight }}>
        {tiles.map((tile) => (
          <FeedTile
            key={list[tile.index].id}
            friend={list[tile.index]}
            isFirst={tile.index === 0}
            theme={theme}
            style={tileStyle(tile.top, tile.column, tile.height)}
          />
        ))}
      </div>
    </div>
  );
}

// Correct ('ok') behavior: below VIRTUALIZE_AT, render everything (no windowing needed for
// a short feed). At or above it, lay out every item into a 7-column masonry grid
// (masonryLayout.ts), then mount only the tiles whose span overlaps the visible viewport
// plus OVERSCAN_PX, recomputed on scroll.
//
// Every mode below is a distinct, real way real teams break this, each isolated so exactly
// one thing is wrong per mode; every mode changes what is actually mounted, not just a flag.
export function FriendsList({ friends, searchTerm, theme }: Props) {
  const filtered = searchTerm
    ? friends.filter((f) => f.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : friends;

  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const PAGE_SIZE = 40;
  const [loadedCount, setLoadedCount] = useState(Math.min(PAGE_SIZE, filtered.length));

  useEffect(() => {
    if (virtualizationMode !== 'eager-load-more-all') return;
    // Bug: "load more as you scroll" is supposed to append one page at a time as the user
    // scrolls near the bottom. This effect is missing the scroll-position gate entirely, so
    // it loads every remaining page immediately on mount instead of one page per scroll.
    setLoadedCount(filtered.length);
  }, [filtered.length]);

  if (virtualizationMode === 'eager-load-more-all') {
    return renderPlain(filtered.slice(0, loadedCount), theme);
  }

  if (virtualizationMode === 'no-windowing') {
    return renderPlain(filtered, theme);
  }

  if (virtualizationMode === 'threshold-too-high' && filtered.length < 50_000) {
    // Bug: the enable-windowing threshold was bumped to 50,000 "temporarily" and never
    // reverted, so a 10,000-item feed still renders unwindowed.
    return renderPlain(filtered, theme);
  }

  if (virtualizationMode === 'disabled-flag') {
    // Bug: a feature flag meant only for local debugging was left forced off in the built
    // app, so windowing never engages regardless of feed length.
    const FORCE_VIRTUALIZE = false;
    if (!FORCE_VIRTUALIZE) return renderPlain(filtered, theme);
  }

  if (virtualizationMode === 'filter-bug-full-render' && !searchTerm) {
    // Bug: an empty search term was meant to just mean "no filtering applied", but the code
    // also bypasses windowing entirely on that path and renders the raw full array.
    return renderPlain(filtered, theme);
  }

  const shouldWindow = filtered.length >= VIRTUALIZE_AT || virtualizationMode === 'duplicate-render-print-view';
  if (!shouldWindow) {
    return renderPlain(filtered, theme);
  }

  // Not memoized, to match the rest of this component: every branch above returns before a
  // single hook is called conditionally, so this stays a plain computation, not a hook.
  const perColumn = computeMasonryLayout(filtered.length);
  const contentHeight = columnContentHeight(perColumn);

  let overscanPx = OVERSCAN_PX;
  if (virtualizationMode === 'overscan-explosion') {
    // Bug: overscan was set to the full content height "to be safe", which defeats
    // windowing: every tile's span then overlaps the window.
    overscanPx = contentHeight;
  }

  let viewportHeight = CONTAINER_HEIGHT;
  if (virtualizationMode === 'nan-fallback-full-render') {
    // Bug: container height is read from a ref before it is attached on first render,
    // producing a 0px viewport, and the fallback for that zero is wrong: instead of a sane
    // default viewport height, it falls back to rendering the entire feed.
    const measuredHeight = 0; // simulates reading containerRef.current.clientHeight too early
    if (measuredHeight <= 0) {
      return renderPlain(filtered, theme);
    }
    viewportHeight = measuredHeight;
  }

  const visible = visibleTileIndices(perColumn, scrollTop, viewportHeight, overscanPx);

  const windowedView = (
    <div
      ref={containerRef}
      onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
      style={{ height: CONTAINER_HEIGHT, overflowY: 'auto' }}
    >
      <div style={{ position: 'relative', width: GRID_WIDTH, height: contentHeight }}>
        {visible.map((tile) => (
          <FeedTile
            key={filtered[tile.index].id}
            friend={filtered[tile.index]}
            isFirst={tile.index === 0}
            theme={theme}
            style={tileStyle(tile.top, tile.column, tile.height)}
          />
        ))}
      </div>
    </div>
  );

  if (virtualizationMode === 'duplicate-render-print-view') {
    // Bug: a "print view" block was meant to be display:none outside of @media print, but
    // the class was misapplied, so it renders every tile a second time, visibly, in addition
    // to the correctly windowed grid above it.
    return (
      <>
        {windowedView}
        <div data-testid="print-view">
          {perColumn.flat().map((tile) => (
            <FeedTile
              key={`print-${filtered[tile.index].id}`}
              friend={filtered[tile.index]}
              isFirst={false}
              theme={theme}
              style={{ position: 'static', display: 'inline-block', width: TILE_WIDTH, height: tile.height, margin: 4 }}
            />
          ))}
        </div>
      </>
    );
  }

  return windowedView;
}
