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

// A synthetic "photo" placeholder: a deterministic hue from the friend's id, so every tile
// looks different without loading a single real or external image. No network request, no
// real photo, anywhere in this repository.
function placeholderGradient(id: number): string {
  const hue = (id * 47) % 360;
  return `linear-gradient(160deg, hsl(${hue}, 60%, 55%), hsl(${(hue + 40) % 360}, 55%, 35%))`;
}

// One tile in the masonry image feed (see FriendsList.tsx for the grid and
// masonryLayout.ts for the layout math). Correct behavior: the message button keeps focus
// after being activated by keyboard. focusBug === 'explicit-blur-after-action': leftover
// debug code blurs the button right after the action fires, landing focus on
// document.body. Only wired on the first tile so the gate's scripted check has a single
// stable target.
export function FeedTile({ friend, isFirst, theme, style }: Props) {
  function handleMessage(e: MouseEvent<HTMLButtonElement>) {
    if (focusBug === 'explicit-blur-after-action' && isFirst) {
      (e.currentTarget as HTMLElement).blur();
    }
  }

  return (
    <div
      data-feed-item
      data-feed-id={friend.id}
      style={{
        position: 'absolute',
        boxSizing: 'border-box',
        overflow: 'hidden',
        borderRadius: 6,
        background: placeholderGradient(friend.id),
        color: '#fff',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 6px',
          background: 'rgba(0, 0, 0, 0.55)',
          color: theme.text === theme.bg ? '#fff' : theme.text,
        }}
      >
        <Checkbox
          checked={friend.favorite}
          onChange={() => {}}
          label={`Favorite ${friend.name}`}
          dataFocusTrigger={isFirst ? 'favorite-checkbox' : undefined}
        />
        <span style={{ flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {friend.name}
        </span>
        <button
          type="button"
          data-focus-trigger={isFirst ? 'message-button' : undefined}
          onClick={handleMessage}
          style={{
            background: theme.buttonBg,
            color: theme.buttonText,
            border: 'none',
            padding: '2px 8px',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 11,
          }}
        >
          Message
        </button>
      </div>
    </div>
  );
}
