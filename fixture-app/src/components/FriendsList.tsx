import { useRef, useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { FriendRow } from './FriendRow';
import { virtualizationMode } from '../variantConfig';
import type { Friend } from '../data/friends';
import type { ThemeTokens } from '../theme';

type Props = {
  friends: Friend[];
  searchTerm: string;
  theme: ThemeTokens;
};

const ROW_HEIGHT = 48;
const CONTAINER_HEIGHT = 640;
const OVERSCAN = 10;
// Below this length the app renders every row directly; a short list does not need
// windowing machinery. The gate's virtualization check always requests 1,000 friends via
// ?count=1000 regardless of a variant's own default, so this constant only affects the
// app's own default behavior at small sizes, never what the gate measures.
const VIRTUALIZE_AT = 150;

function renderPlain(list: Friend[], theme: ThemeTokens) {
  return (
    <div style={{ height: CONTAINER_HEIGHT, overflowY: 'auto' }}>
      {list.map((f, i) => (
        <FriendRow key={f.id} friend={f} isFirst={i === 0} theme={theme} />
      ))}
    </div>
  );
}

// Correct ('ok') behavior: below VIRTUALIZE_AT, render everything (no windowing needed for
// a short list). At or above it, render only the rows within CONTAINER_HEIGHT plus an
// OVERSCAN buffer above and below, recomputed on scroll.
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

  if (virtualizationMode === 'threshold-too-high' && filtered.length < 5000) {
    // Bug: the enable-windowing threshold was bumped to 5,000 "temporarily" and never
    // reverted, so a 1,000-row list still renders unwindowed.
    return renderPlain(filtered, theme);
  }

  if (virtualizationMode === 'disabled-flag') {
    // Bug: a feature flag meant only for local debugging was left forced off in the built
    // app, so windowing never engages regardless of list length.
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

  let overscan = OVERSCAN;
  if (virtualizationMode === 'overscan-explosion') {
    // Bug: overscan was set to the full list length "to be safe", which defeats windowing.
    overscan = filtered.length;
  }

  let visibleCount = Math.ceil(CONTAINER_HEIGHT / ROW_HEIGHT) + overscan * 2;
  if (virtualizationMode === 'nan-fallback-full-render') {
    // Bug: container height is read from a ref before it is attached on first render,
    // producing 0 / ROW_HEIGHT = 0 rows, and the fallback for that zero is wrong: instead of
    // a sane default visible count, it falls back to rendering the entire list.
    const measuredHeight = 0; // simulates reading containerRef.current.clientHeight too early
    const computed = Math.ceil(measuredHeight / ROW_HEIGHT);
    visibleCount = computed <= 0 ? filtered.length : computed + overscan * 2;
  }

  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - overscan);
  const end = Math.min(filtered.length, start + visibleCount);
  const visible = filtered.slice(start, end);
  const topPad = start * ROW_HEIGHT;
  const bottomPad = (filtered.length - end) * ROW_HEIGHT;

  const windowedView = (
    <div
      ref={containerRef}
      onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
      style={{ height: CONTAINER_HEIGHT, overflowY: 'auto' }}
    >
      <div style={{ height: topPad } as CSSProperties} />
      {visible.map((f, i) => (
        <FriendRow key={f.id} friend={f} isFirst={start + i === 0} theme={theme} />
      ))}
      <div style={{ height: bottomPad } as CSSProperties} />
    </div>
  );

  if (virtualizationMode === 'duplicate-render-print-view') {
    // Bug: a "print view" block was meant to be display:none outside of @media print, but
    // the class was misapplied, so it renders every row a second time, visibly, in addition
    // to the correctly windowed list above it.
    return (
      <>
        {windowedView}
        <div data-testid="print-view">
          {filtered.map((f) => (
            <FriendRow key={`print-${f.id}`} friend={f} isFirst={false} theme={theme} />
          ))}
        </div>
      </>
    );
  }

  return windowedView;
}
