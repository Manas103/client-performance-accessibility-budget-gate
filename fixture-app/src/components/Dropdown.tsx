import { useState } from 'react';
import { focusBug } from '../variantConfig';

type Props = {
  options: string[];
  value: string;
  onChange: (next: string) => void;
};

// Custom RSVP-status dropdown. Correct behavior: Enter/Space opens the menu, ArrowDown/Up
// moves selection, Enter picks an option, and focus returns to the trigger button.
// focusBug === 'dropdown-blurs-on-select': after picking an option, the handler calls
// blur() on the trigger instead of leaving/returning focus to it, landing on document.body.
export function Dropdown({ options, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  function selectOption(opt: string, triggerEl: HTMLButtonElement | null) {
    onChange(opt);
    setOpen(false);
    if (focusBug === 'dropdown-blurs-on-select') {
      triggerEl?.blur();
      return;
    }
    triggerEl?.focus();
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        data-focus-trigger="dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setHighlight((h) => Math.min(h + 1, options.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setOpen(true);
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === 'Enter' && open) {
            e.preventDefault();
            selectOption(options[highlight], e.currentTarget);
          }
        }}
      >
        {value} ▾
      </button>
      {open && (
        <ul role="listbox" style={{ position: 'absolute', background: '#fff', margin: 0, padding: 4, listStyle: 'none' }}>
          {options.map((opt, i) => (
            <li
              key={opt}
              role="option"
              aria-selected={value === opt}
              style={{ padding: 4, background: i === highlight ? '#eee' : undefined, color: '#111' }}
              onClick={(e) => selectOption(opt, e.currentTarget.closest('div')?.querySelector('button') ?? null)}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
