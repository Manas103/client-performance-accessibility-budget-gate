import type { CSSProperties, MouseEvent } from 'react';
import { focusBug } from '../variantConfig';
import { Checkbox } from './Checkbox';
import type { Friend } from '../data/friends';
import type { ThemeTokens } from '../theme';

type Props = {
  friend: Friend;
  isFirst: boolean;
  theme: ThemeTokens;
  style?: CSSProperties;
};

// Correct behavior: the message button keeps focus after being activated by keyboard.
// focusBug === 'explicit-blur-after-action': leftover debug code blurs the button right
// after the action fires, landing focus on document.body. Only wired on the first row so
// the gate's scripted check has a single stable target.
export function FriendRow({ friend, isFirst, theme, style }: Props) {
  function handleMessage(e: MouseEvent<HTMLButtonElement>) {
    if (focusBug === 'explicit-blur-after-action' && isFirst) {
      (e.currentTarget as HTMLElement).blur();
    }
  }

  return (
    <div
      data-friend-row
      data-friend-id={friend.id}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        height: 48,
        padding: '0 8px',
        boxSizing: 'border-box',
        color: theme.text,
        borderBottom: `1px solid ${theme.panelBg}`,
        ...style,
      }}
    >
      <Checkbox
        checked={friend.favorite}
        onChange={() => {}}
        label={`Favorite ${friend.name}`}
        dataFocusTrigger={isFirst ? 'favorite-checkbox' : undefined}
      />
      <span style={{ flex: 1 }}>{friend.name}</span>
      <span style={{ fontSize: 12, opacity: 0.8 }}>{friend.status}</span>
      <button
        type="button"
        data-focus-trigger={isFirst ? 'message-button' : undefined}
        onClick={handleMessage}
        style={{ background: theme.buttonBg, color: theme.buttonText, border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer' }}
      >
        Message
      </button>
    </div>
  );
}
