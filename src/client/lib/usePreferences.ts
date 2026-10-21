import { useCallback, useEffect, useMemo, useState } from 'react';

import { type TextSize, type ThemeName } from './prefs';
import { DEFAULT_PREFS, type KeyValueStore, type Prefs, loadPrefs, savePrefs } from './storage';

function systemTheme(): ThemeName {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'lamplight' : 'paper';
}

export interface Preferences {
  /** The theme actually showing (the stored choice, or the system preference). */
  theme: ThemeName;
  textSize: TextSize;
  setTheme: (theme: ThemeName) => void;
  setTextSize: (size: TextSize) => void;
}

/**
 * Theme and text-size preferences. They are applied to the root element (data-theme and
 * --text-scale) through the DOM, which a strict CSP allows, and persisted locally.
 */
export function usePreferences(store: KeyValueStore): Preferences {
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs(store));

  useEffect(() => {
    const root = document.documentElement;
    if (prefs.theme) {
      root.dataset.theme = prefs.theme;
    } else {
      delete root.dataset.theme;
    }
    root.style.setProperty('--text-scale', String(prefs.textSize));
    if (prefs !== DEFAULT_PREFS) {
      savePrefs(store, prefs);
    }
  }, [prefs, store]);

  const setTheme = useCallback((theme: ThemeName) => {
    setPrefs((current) => ({ ...current, theme }));
  }, []);
  const setTextSize = useCallback((textSize: TextSize) => {
    setPrefs((current) => ({ ...current, textSize }));
  }, []);

  return useMemo(
    () => ({
      theme: prefs.theme ?? systemTheme(),
      textSize: prefs.textSize,
      setTheme,
      setTextSize,
    }),
    [prefs, setTheme, setTextSize],
  );
}
