import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { planTitle } from '../shared/labels.js';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SkipLink } from './components/SkipLink';
import { TextSizeControl } from './components/TextSizeControl';
import { Telegram } from './components/Telegram';
import { ThemeToggle } from './components/ThemeToggle';
import { TypesetLoader } from './components/TypesetLoader';
import { FrontPage } from './features/front/FrontPage';
import { IntakeView } from './features/intake/IntakeView';
import styles from './App.module.css';
import { localToday } from './lib/clock';
import { prefetchEngine } from './lib/engine';
import { draftFromBrief, emptyDraft, type IntakeDraft } from './lib/draft';
import { sampleBriefs } from './lib/samples';
import { browserStore } from './lib/storage';
import { AnnouncerProvider, useAnnouncer } from './lib/useAnnouncer';
import { usePlans } from './lib/usePlans';
import { usePreferences } from './lib/usePreferences';
import { type TabId, useRoute } from './lib/useRoute';

const AlmanacView = lazy(() =>
  import('./features/almanac/AlmanacView').then((module) => ({ default: module.AlmanacView })),
);

const TAB_NAMES: Record<TabId, string> = {
  overview: 'Overview',
  ledger: 'Ledger',
  timetable: 'Timetable',
  vendors: 'Vendors',
  ideas: 'Ideas',
  runsheet: 'Run sheet',
};

function Shell() {
  const [store] = useState(() => browserStore());
  const announce = useAnnouncer();
  const prefs = usePreferences(store);
  const api = usePlans({ store, announce });
  const [route, navigate] = useRoute();
  const [today] = useState(() => localToday());
  const [notice, setNotice] = useState<string | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<IntakeDraft>(() => emptyDraft(today));

  const plan = api.plan;
  const view = route.view === 'plan' && !plan ? 'front' : route.view;

  // Focus the new view's <h1> once it exists (the plan view loads lazily), but never on first paint.
  const focusedFor = useRef(view);
  const headingRef = useCallback(
    (node: HTMLHeadingElement | null) => {
      if (node && focusedFor.current !== view) {
        focusedFor.current = view;
        if (!node.hasAttribute('tabindex')) {
          node.setAttribute('tabindex', '-1');
        }
        node.focus();
      }
    },
    [view],
  );
  const samples = useMemo(() => sampleBriefs(today), [today]);

  // Titles per view (docs/09 §1) and focus on the new view's <h1> (not on the first paint).
  useEffect(() => {
    document.title =
      view === 'intake'
        ? 'The Invitation — Mehfil'
        : view === 'plan' && plan
          ? `${planTitle(plan.brief)} · ${TAB_NAMES[route.tab]} — Mehfil`
          : 'Mehfil — a planning almanac';
  }, [view, plan, route.tab]);

  useEffect(prefetchEngine, []);

  const dismiss = useCallback(() => {
    setNotice(undefined);
  }, []);
  const goFront = useCallback(() => {
    navigate({ view: 'front', tab: 'overview' });
  }, [navigate]);
  const openPlanView = useCallback(
    (tab: TabId = 'overview') => {
      navigate({ view: 'plan', tab });
    },
    [navigate],
  );

  return (
    <>
      <SkipLink />
      <header className={styles.banner} aria-label="Mehfil">
        <button
          type="button"
          className={styles.wordmark}
          aria-label="Mehfil, back to the front page"
          onClick={goFront}
        >
          Mehfil
        </button>
        <div className={styles.prefs}>
          <TextSizeControl size={prefs.textSize} onChange={prefs.setTextSize} />
          <ThemeToggle theme={prefs.theme} onChange={prefs.setTheme} />
        </div>
      </header>
      <main id="main" tabIndex={-1} className={styles.main}>
        {notice ? (
          <div className={styles.notice}>
            <Telegram message={notice} onDismiss={dismiss} />
          </div>
        ) : null}
        {view === 'front' && (
          <FrontPage
            today={today}
            plans={api.plans}
            samples={samples}
            discarded={api.discarded}
            headingRef={headingRef}
            onBegin={() => {
              setEditing(false);
              setDraft(emptyDraft(today));
              navigate({ view: 'intake', tab: 'overview' });
            }}
            onSample={(sample) => {
              setEditing(false);
              setDraft(draftFromBrief(sample.brief));
              navigate({ view: 'intake', tab: 'overview' });
            }}
            onOpen={(id) => {
              api.open(id);
              openPlanView();
            }}
            onRemove={api.remove}
          />
        )}
        {view === 'intake' && (
          <IntakeView
            key={editing ? 'edit' : draft.city + draft.eventType + draft.guestCount}
            initial={draft}
            today={today}
            editing={editing}
            headingRef={headingRef}
            onSubmit={(brief) => {
              const done = editing && plan ? api.editBrief(brief) : api.create(brief);
              done
                .then(() => {
                  setEditing(false);
                  openPlanView();
                })
                .catch(() => {
                  announce(
                    'The planning engine could not be loaded. Check your connection and try again.',
                    'assertive',
                  );
                });
            }}
            onBack={() => {
              if (editing && plan) {
                openPlanView();
              } else {
                goFront();
              }
            }}
          />
        )}
        {view === 'plan' && plan && (
          <Suspense fallback={<TypesetLoader label="Setting the page in type…" />}>
            <AlmanacView
              plan={plan}
              today={today}
              tab={route.tab}
              api={api}
              announce={announce}
              headingRef={headingRef}
              onTab={openPlanView}
              onNotice={setNotice}
              onEdit={() => {
                setEditing(true);
                setDraft(draftFromBrief(plan.brief));
                navigate({ view: 'intake', tab: 'overview' });
              }}
            />
          </Suspense>
        )}
      </main>
      <footer className={styles.footer} aria-label="About your data">
        <p>Your plans are saved on this device only. Ideas and answers may be drafted by Gemini.</p>
      </footer>
    </>
  );
}

/** Root component: announcer and error boundary around the shell. */
export function App() {
  return (
    <AnnouncerProvider>
      <ErrorBoundary>
        <Shell />
      </ErrorBoundary>
    </AnnouncerProvider>
  );
}
