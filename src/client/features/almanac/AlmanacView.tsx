import { type Ref, Suspense, lazy, useEffect, useState } from 'react';

import type { Plan } from '../../../shared/schema/plan.js';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { Tabs } from '../../components/Tabs';
import { TypesetLoader } from '../../components/TypesetLoader';
import { copyPlanText, downloadIcs } from '../../lib/exports';
import type { Announce } from '../../lib/useAnnouncer';
import { useMedia } from '../../lib/useMedia';
import type { PlansApi } from '../../lib/usePlans';
import { type TabId } from '../../lib/useRoute';

import styles from './AlmanacView.module.css';
import { Masthead } from './Masthead';
import { PrintSheet } from './PrintSheet';
import { usePlanner } from './planner/usePlanner';

const loaders = {
  overview: () => import('./OverviewTab'),
  ledger: () => import('./LedgerTab'),
  timetable: () => import('./TimetableTab'),
  vendors: () => import('./VendorsTab'),
  ideas: () => import('./IdeasTab'),
  runsheet: () => import('./RunSheetTab'),
  planner: () => import('./planner/PlannerPanel'),
};
const OverviewTab = lazy(loaders.overview);
const LedgerTab = lazy(loaders.ledger);
const TimetableTab = lazy(loaders.timetable);
const VendorsTab = lazy(loaders.vendors);
const IdeasTab = lazy(loaders.ideas);
const RunSheetTab = lazy(loaders.runsheet);
const PlannerPanel = lazy(loaders.planner);

const TABS = [
  { id: 'overview', label: 'Overview', number: 1 },
  { id: 'ledger', label: 'Ledger', number: 2 },
  { id: 'timetable', label: 'Timetable', number: 3 },
  { id: 'vendors', label: 'Vendors', number: 4 },
  { id: 'ideas', label: 'Ideas', number: 5 },
  { id: 'runsheet', label: 'Run sheet', number: 6 },
] as const;

const WIDE = '(min-width: 1100px)';

interface Props {
  plan: Plan;
  today: string;
  tab: TabId;
  api: PlansApi;
  announce: Announce;
  headingRef: Ref<HTMLHeadingElement>;
  onTab: (tab: TabId) => void;
  onEdit: () => void;
  onNotice: (message: string) => void;
}

/** Runs the prefetch when the browser is idle so the next tab is usually already loaded. */
function prefetchTabs(): () => void {
  const run = (): void => {
    Object.values(loaders).forEach((load) => {
      void load();
    });
  };
  if ('requestIdleCallback' in window) {
    const handle = window.requestIdleCallback(run);
    return () => {
      window.cancelIdleCallback(handle);
    };
  }
  const timer = setTimeout(run, 400);
  return () => {
    clearTimeout(timer);
  };
}

/** The plan: masthead, the six lazily loaded tabs and the Planner (a rail or a sheet). */
export function AlmanacView({
  plan,
  today,
  tab,
  api,
  announce,
  headingRef,
  onTab,
  onEdit,
  onNotice,
}: Props) {
  const [plannerOpen, setPlannerOpen] = useState(false);
  const wide = useMedia(WIDE);
  const planner = usePlanner({ plan, today, api, announce, onNotice });

  useEffect(prefetchTabs, []);

  const copy = (): void => {
    void copyPlanText(plan).then((result) => {
      onNotice(
        result.ok ? 'Plan copied to the clipboard' : 'Copying is not available in this browser',
      );
    });
  };
  const exportIcs = (): void => {
    onNotice(`Saved ${downloadIcs(plan)}`);
  };

  const panel = (
    <Suspense fallback={<TypesetLoader label="Setting the page in type…" />}>
      {tab === 'overview' && <OverviewTab plan={plan} today={today} onCopy={copy} />}
      {tab === 'ledger' && <LedgerTab plan={plan} api={api} />}
      {tab === 'timetable' && (
        <TimetableTab
          plan={plan}
          today={today}
          onToggle={api.toggleTask}
          onExport={exportIcs}
          onPrint={() => {
            window.print();
          }}
        />
      )}
      {tab === 'vendors' && <VendorsTab plan={plan} api={api} />}
      {tab === 'ideas' && <IdeasTab plan={plan} api={api} />}
      {tab === 'runsheet' && (
        <RunSheetTab
          plan={plan}
          onPrint={() => {
            window.print();
          }}
        />
      )}
    </Suspense>
  );

  const letters = (
    <Suspense fallback={<TypesetLoader label="Opening the letters…" />}>
      <PlannerPanel plan={plan} planner={planner} />
    </Suspense>
  );

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <Masthead
          plan={plan}
          today={today}
          headingRef={headingRef}
          actions={
            <Button variant="text" icon="pencil" onClick={onEdit}>
              Edit brief
            </Button>
          }
        />
        <Tabs
          label="Plan sections"
          tabs={TABS}
          activeId={tab}
          onChange={(id) => {
            onTab(id as TabId);
          }}
          idPrefix="plan"
          trailing={
            <Button
              variant="text"
              aria-expanded={plannerOpen}
              onClick={() => {
                setPlannerOpen((open) => !open);
              }}
            >
              Ask the Planner
            </Button>
          }
        >
          <ErrorBoundary key={tab}>{panel}</ErrorBoundary>
        </Tabs>
      </div>
      {wide && plannerOpen ? (
        <aside aria-label="Letters to the Planner" className={styles.rail}>
          <ErrorBoundary>{letters}</ErrorBoundary>
        </aside>
      ) : null}
      {!wide ? (
        <Dialog
          open={plannerOpen}
          variant="sheet"
          title="Ask the Planner"
          onClose={() => {
            setPlannerOpen(false);
          }}
        >
          <ErrorBoundary>{letters}</ErrorBoundary>
        </Dialog>
      ) : null}
      <PrintSheet plan={plan} />
    </div>
  );
}
