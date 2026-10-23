import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

export type Politeness = 'polite' | 'assertive';
export type Announce = (message: string, level?: Politeness) => void;

const AnnouncerContext = createContext<Announce>(() => undefined);

/** Messages kept in each region; older ones fall away as new ones are appended. */
const KEEP = 5;

interface Entry {
  id: number;
  text: string;
}

/**
 * Mounts the two visually hidden live regions once (docs/09 §2) and exposes `announce`.
 * Each message is appended as its own paragraph, so repeats are announced again and quick
 * successive messages are not lost. Assertive is reserved for errors that block the user.
 */
export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [polite, setPolite] = useState<Entry[]>([]);
  const [assertive, setAssertive] = useState<Entry[]>([]);
  const counter = useRef(0);
  const announce = useCallback<Announce>((message, level = 'polite') => {
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }
    counter.current += 1;
    const entry = { id: counter.current, text: trimmed };
    const setter = level === 'assertive' ? setAssertive : setPolite;

    // Micro-tick pacing gives screen readers time to register discrete live-region updates
    setTimeout(() => {
      setter((list) => [...list, entry].slice(-KEEP));
    }, 50);
  }, []);

  const value = useMemo(() => announce, [announce]);
  return (
    <AnnouncerContext.Provider value={value}>
      {children}
      <div className="srOnly" aria-live="polite" aria-atomic="true" data-testid="live-polite">
        {polite.map((entry) => (
          <p key={entry.id}>{entry.text}</p>
        ))}
      </div>
      <div
        className="srOnly"
        aria-live="assertive"
        aria-atomic="true"
        data-testid="live-assertive"
      >
        {assertive.map((entry) => (
          <p key={entry.id}>{entry.text}</p>
        ))}
      </div>
    </AnnouncerContext.Provider>
  );
}

export const useAnnouncer = (): Announce => useContext(AnnouncerContext);
