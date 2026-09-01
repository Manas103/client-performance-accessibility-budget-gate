import { useEffect, useState } from 'react';
import { focusBug } from '../variantConfig';

type Props = {
  value: string;
  onChange: (next: string) => void;
};

// Correct behavior: the clear button empties the search value; the input stays mounted and
// nothing about focus changes unexpectedly.
// focusBug === 'search-clear-remounts-input': clicking clear unmounts the whole search box
// for one tick (simulating a "reset" implemented as a remount instead of a state clear) and
// never refocuses anything afterward. Removing the currently focused element from the DOM
// moves focus to document.body in a real browser, and re-adding a new element later does
// not reclaim it.
export function SearchBox({ value, onChange }: Props) {
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    if (!hiding) return;
    const id = setTimeout(() => setHiding(false), 0);
    return () => clearTimeout(id);
  }, [hiding]);

  function handleClear() {
    if (focusBug === 'search-clear-remounts-input') {
      setHiding(true);
    }
    onChange('');
  }

  if (hiding) return <div data-testid="search-box-hidden" />;

  return (
    <div>
      <input
        type="text"
        aria-label="Search friends"
        data-focus-trigger="search-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search friends"
      />
      <button type="button" data-focus-trigger="search-clear" onClick={handleClear} aria-label="Clear search">
        x
      </button>
    </div>
  );
}
