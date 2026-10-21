import { useCallback, useEffect, useState } from 'react';

export type View = 'front' | 'intake' | 'plan';

export const TAB_IDS = ['overview', 'ledger', 'timetable', 'vendors', 'ideas', 'runsheet'] as const;
export type TabId = (typeof TAB_IDS)[number];

export interface Route {
  view: View;
  tab: TabId;
}

const INTAKE_HASH = 'invitation';

/** Maps `location.hash` to a route: '' front, #invitation intake, #<tab> the plan. */
export function parseHash(hash: string): Route {
  const name = hash.replace(/^#/, '');
  if (name === INTAKE_HASH) {
    return { view: 'intake', tab: 'overview' };
  }
  const tab = TAB_IDS.find((id) => id === name);
  return tab ? { view: 'plan', tab } : { view: 'front', tab: 'overview' };
}

export function routeHash(route: Route): string {
  if (route.view === 'front') {
    return '';
  }
  return route.view === 'intake' ? `#${INTAKE_HASH}` : `#${route.tab}`;
}

/** Minimal hash router for the three views. Changing the hash never moves focus by itself. */
export function useRoute(): [Route, (route: Route) => void] {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const onChange = (): void => {
      setRoute(parseHash(window.location.hash));
    };
    window.addEventListener('hashchange', onChange);
    window.addEventListener('popstate', onChange);
    return () => {
      window.removeEventListener('hashchange', onChange);
      window.removeEventListener('popstate', onChange);
    };
  }, []);

  const navigate = useCallback((next: Route) => {
    const hash = routeHash(next);
    if (hash === '') {
      window.history.pushState(null, '', window.location.pathname + window.location.search);
    } else {
      window.location.hash = hash;
    }
    setRoute(next);
  }, []);

  return [route, navigate];
}
