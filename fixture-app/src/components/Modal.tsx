import { useEffect, useRef } from 'react';
import { focusBug } from '../variantConfig';

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  triggerRef: React.RefObject<HTMLElement>;
  children: React.ReactNode;
};

// Correct behavior: focus the close button on open, restore focus to the trigger on close.
// focusBug === 'modal-no-restore': close intentionally does not restore focus, and blurs
// whatever is focused instead, landing on document.body.
// focusBug === 'modal-trap-tabindex-removed': right after open, every focusable element
// inside the modal has its tabIndex stripped and the currently focused element is blurred,
// simulating a broken focus-trap implementation that leaves nothing focusable inside.
export function Modal({ open, onClose, title, triggerRef, children }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    if (focusBug === 'modal-trap-tabindex-removed') {
      closeRef.current?.focus();
      const focusable = bodyRef.current?.querySelectorAll<HTMLElement>(
        'button, a[href], input, [tabindex]',
      );
      focusable?.forEach((el) => el.setAttribute('tabindex', '-1'));
      closeRef.current?.removeAttribute('tabindex');
      closeRef.current?.setAttribute('tabindex', '-1');
      (document.activeElement as HTMLElement | null)?.blur();
      return;
    }
    closeRef.current?.focus();
  }, [open]);

  if (!open) return null;

  function handleClose() {
    onClose();
    if (focusBug === 'modal-no-restore') {
      (document.activeElement as HTMLElement | null)?.blur();
      return;
    }
    triggerRef.current?.focus();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-testid="modal"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div ref={bodyRef} style={{ background: '#fff', color: '#111', padding: 24, minWidth: 280 }}>
        <h2>{title}</h2>
        <div>{children}</div>
        <button
          ref={closeRef}
          type="button"
          data-focus-trigger="modal-close"
          onClick={handleClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}
