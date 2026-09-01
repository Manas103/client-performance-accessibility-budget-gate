import { Suspense, lazy, useEffect, useState } from 'react';
import { NavBar } from './components/NavBar';
import { resolveTheme } from './theme';
import { theme as themeName, contrastBug, routeDefault } from './variantConfig';

// Each route is its own dynamically imported chunk (see manualChunks in vite.config.ts),
// which is what lets the bundle-budget check measure "this route's JS" independently of
// the other route's JS, and what lets a bundle-bloat regression on one route leave the
// other route's chunk untouched.
const FriendsRoute = lazy(() => import('./routes/FriendsRoute'));
const PartyRoute = lazy(() => import('./routes/PartyRoute'));

type Route = 'friends' | 'party';

function routeFromHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  return hash === 'party' ? 'party' : 'friends';
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => {
    if (typeof window === 'undefined') return (routeDefault as Route) ?? 'friends';
    return window.location.hash ? routeFromHash() : ((routeDefault as Route) ?? 'friends');
  });

  useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = `#/${route}`;
    }
    const onHashChange = () => setRoute(routeFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  function navigate(next: Route) {
    setRoute(next);
    const query = window.location.hash.split('?')[1];
    window.location.hash = `#/${next}${query ? `?${query}` : ''}`;
  }

  const theme = resolveTheme(themeName, contrastBug);

  return (
    <div>
      <NavBar active={route} onNavigate={navigate} theme={theme} />
      <Suspense fallback={<div style={{ padding: 16 }}>Loading...</div>}>
        {route === 'friends' ? <FriendsRoute /> : <PartyRoute />}
      </Suspense>
    </div>
  );
}
