import { focusBug } from '../variantConfig';

type Props = {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  dataFocusTrigger?: string;
};

// Custom checkbox control (not a native <input type="checkbox">) so it needs its own
// keyboard wiring. Correct behavior: tabbable, Enter/Space toggles.
// focusBug === 'checkbox-blurs-on-focus': a leftover debug handler wired to onFocus instead
// of a blur/escape handler calls blur() the moment the control receives keyboard focus,
// which is exactly the "loses keyboard focus" failure mode the gate checks for.
export function Checkbox({ checked, onChange, label, dataFocusTrigger }: Props) {
  return (
    <div
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      tabIndex={0}
      data-focus-trigger={dataFocusTrigger}
      onFocus={(e) => {
        if (focusBug === 'checkbox-blurs-on-focus') {
          (e.currentTarget as HTMLElement).blur();
        }
      }}
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onChange(!checked);
        }
      }}
      style={{
        display: 'inline-block',
        width: 18,
        height: 18,
        border: '2px solid currentColor',
        borderRadius: 4,
        cursor: 'pointer',
        textAlign: 'center',
        lineHeight: '14px',
      }}
    >
      {checked ? '✓' : ''}
    </div>
  );
}
