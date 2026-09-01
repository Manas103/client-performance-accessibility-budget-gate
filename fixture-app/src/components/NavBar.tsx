import { focusBug } from '../variantConfig';
import type { ThemeTokens } from '../theme';

type Route = 'friends' | 'party';

type Props = {
  active: Route;
  onNavigate: (route: Route) => void;
  theme: ThemeTokens;
};

// Correct behavior: clicking a nav button changes route and keeps focus on the button that
// was clicked (the default browser behavior for a real <button>, nothing extra needed).
// focusBug === 'nav-link-remount-loses-focus': the whole nav bar is keyed on the active
// route, so every navigation forces React to unmount and remount it. The just-clicked
// button's DOM node is destroyed with focus still on it, and nothing refocuses the new
// button, so focus lands on document.body.
export function NavBar({ active, onNavigate, theme }: Props) {
  const key = focusBug === 'nav-link-remount-loses-focus' ? active : 'stable';
  return (
    <nav
      key={key}
      style={{ background: theme.navBg, padding: 12, display: 'flex', gap: 16 }}
    >
      {(['friends', 'party'] as Route[]).map((route) => (
        <button
          key={route}
          type="button"
          data-focus-trigger="nav-link"
          data-route={route}
          onClick={() => onNavigate(route)}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            font: 'inherit',
            padding: '4px 8px',
            color: active === route ? theme.navActiveText : theme.navText,
            fontWeight: active === route ? 700 : 400,
          }}
        >
          {route === 'friends' ? 'Friends' : 'Party'}
        </button>
      ))}
    </nav>
  );
}
