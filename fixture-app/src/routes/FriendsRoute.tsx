import { useMemo, useRef, useState } from 'react';
import { generateFriends } from '../data/friends';
import { FriendsList } from '../components/FriendsList';
import { SearchBox } from '../components/SearchBox';
import { Modal } from '../components/Modal';
import { resolveTheme } from '../theme';
import { friendCount, theme as themeName, contrastBug } from '../variantConfig';
// virtual:friends-bloat is resolved by the bloatModulePlugin in vite.config.ts, per variant:
// either a real bundle-bloat module (a genuine, statically bundled increase in this route's
// shipped bytes) or a near-empty stub, decided at build-config time, not by dead-code
// elimination of a runtime branch. See vite.config.ts and docs/bundle_baseline_measurement.txt.
import { bloatPayload } from 'virtual:friends-bloat';

function readCountOverride(): number | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  const raw = params.get('count');
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function FriendsRoute() {
  const theme = resolveTheme(themeName, contrastBug);
  const count = readCountOverride() ?? friendCount;
  const friends = useMemo(() => generateFriends(count), [count]);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <main style={{ background: theme.bg, color: theme.text, minHeight: '100vh', padding: 16 }}>
      <h1 style={{ color: theme.headingText }}>Friends</h1>
      {bloatPayload ? (
        <span data-testid="bloat-marker" style={{ display: 'none' }}>
          {typeof bloatPayload === 'string' ? bloatPayload : JSON.stringify(bloatPayload)}
        </span>
      ) : null}
      <div style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
        <SearchBox value={searchTerm} onChange={setSearchTerm} />
        <button
          ref={triggerRef}
          type="button"
          data-focus-trigger="modal-open"
          onClick={() => setModalOpen(true)}
          style={{ background: theme.buttonBg, color: theme.buttonText, border: 'none', padding: '6px 12px', borderRadius: 4, cursor: 'pointer' }}
        >
          View profile
        </button>
      </div>
      <div style={{ background: theme.panelBg, padding: 8 }}>
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          data-testid="panel-link"
          style={{ color: theme.linkColor, display: 'inline-block', marginBottom: 8 }}
        >
          See friend suggestions
        </a>
        <FriendsList friends={friends} searchTerm={searchTerm} theme={theme} />
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Friend profile" triggerRef={triggerRef}>
        <p>Profile details would go here.</p>
      </Modal>
    </main>
  );
}
