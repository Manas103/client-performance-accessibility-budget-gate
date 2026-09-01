import { useRef, useState } from 'react';
import { Dropdown } from '../components/Dropdown';
import { Modal } from '../components/Modal';
import { resolveTheme } from '../theme';
import { theme as themeName, contrastBug } from '../variantConfig';
// virtual:party-bloat mirrors virtual:friends-bloat but for this route; see FriendsRoute.tsx
// and vite.config.ts for how it is resolved per variant.
import { bloatPayload } from 'virtual:party-bloat';

const RSVP_OPTIONS = ['Going', 'Maybe', 'Not going'];

export default function PartyRoute() {
  const theme = resolveTheme(themeName, contrastBug);
  const [rsvp, setRsvp] = useState(RSVP_OPTIONS[0]);
  const [modalOpen, setModalOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <main style={{ background: theme.bg, color: theme.text, minHeight: '100vh', padding: 16 }}>
      <h1 style={{ color: theme.headingText }}>Party</h1>
      {bloatPayload ? (
        <span data-testid="bloat-marker" style={{ display: 'none' }}>
          {typeof bloatPayload === 'string' ? bloatPayload : JSON.stringify(bloatPayload)}
        </span>
      ) : null}
      <div style={{ background: theme.panelBg, padding: 16, marginBottom: 12 }}>
        <p style={{ color: theme.text }}>Summer rooftop party, Saturday 7pm.</p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span>RSVP:</span>
          <Dropdown options={RSVP_OPTIONS} value={rsvp} onChange={setRsvp} />
          <span
            data-testid="status-badge"
            style={{ background: theme.badgeBg, color: theme.badgeText, padding: '2px 8px', borderRadius: 12, fontSize: 12 }}
          >
            {rsvp}
          </span>
        </div>
      </div>
      <button
        ref={triggerRef}
        type="button"
        data-focus-trigger="modal-open"
        onClick={() => setModalOpen(true)}
        style={{ background: theme.buttonBg, color: theme.buttonText, border: 'none', padding: '6px 12px', borderRadius: 4, cursor: 'pointer' }}
      >
        Party details
      </button>
      <div style={{ marginTop: 12 }}>
        <span
          data-testid="active-filter-chip"
          style={{ background: theme.chipActiveBg, color: theme.chipActiveText, padding: '4px 10px', borderRadius: 16, fontSize: 13 }}
        >
          Attending only
        </span>
      </div>
      <div style={{ marginTop: 12, background: theme.errorBg, color: theme.errorText, padding: 8, borderRadius: 4, display: 'inline-block' }}>
        RSVP closes in 2 days
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Party details" triggerRef={triggerRef}>
        <p>Address and directions would go here.</p>
      </Modal>
    </main>
  );
}
