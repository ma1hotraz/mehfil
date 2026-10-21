import { useEffect, useState } from 'react';

/** Tracks a CSS media query (for example the wide layout that shows the Planner as a rail). */
export function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = (): void => {
      setMatches(list.matches);
    };
    onChange();
    list.addEventListener('change', onChange);
    return () => {
      list.removeEventListener('change', onChange);
    };
  }, [query]);

  return matches;
}
