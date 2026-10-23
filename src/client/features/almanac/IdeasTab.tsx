import { useState } from 'react';

import { IDEA_CATEGORIES, type Plan } from '../../../shared/schema/plan.js';
import { Button } from '../../components/Button';
import { ChipGroup } from '../../components/ChipGroup';
import { Postage, Postcard } from '../../components/Postcard';
import { Section } from '../../components/Section';
import { TypesetLoader } from '../../components/TypesetLoader';
import { cx } from '../../lib/cx';
import { IDEA_CATEGORY_LABELS, costLabel, costMarks } from '../../lib/format';
import type { PlansApi } from '../../lib/usePlans';

import styles from './almanac.module.css';
import own from './IdeasTab.module.css';
import { filterIdeas } from '../../lib/almanacViewModels';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'kept', label: 'Kept' },
  ...IDEA_CATEGORIES.map((c) => ({ value: c, label: IDEA_CATEGORY_LABELS[c] })),
];

const SOURCE_LINE = {
  gemini: 'DRAFTED BY GEMINI',
  library: 'FROM THE MEHFIL LIBRARY',
  pending: 'DRAFTING',
} as const;

interface Props {
  plan: Plan;
  api: PlansApi;
}

/** §5 The Ideas: postcards of personalised ideas, labelled with where they came from. */
export default function IdeasTab({ plan, api }: Props) {
  const [filter, setFilter] = useState('all');
  const { ideas, brief } = plan;
  const shown = filterIdeas(ideas, filter);
  const focus = IDEA_CATEGORIES.find((c) => c === filter);
  const loading = api.ideasLoading;

  return (
    <Section
      number={5}
      title="The Ideas"
      margin={
        plan.ideasSource === 'library' ? (
          <p>Ideas from the Mehfil library — written by people, picked for your event.</p>
        ) : (
          <p>Each idea says which detail of your brief it answers.</p>
        )
      }
      actions={
        <Button
          variant="text"
          disabled={loading}
          onClick={() => {
            api.requestIdeas(focus ?? 'all');
          }}
        >
          {focus ? `Regenerate ${IDEA_CATEGORY_LABELS[focus].toLowerCase()}` : 'Regenerate all'}
        </Button>
      }
    >
      <div className={styles.stack}>
        <p className={cx(own.source, styles.kicker)}>{SOURCE_LINE[plan.ideasSource]}</p>
        <ChipGroup
          mode="single"
          legend="Show ideas"
          options={FILTERS}
          selected={filter}
          onChange={setFilter}
        />
        <div aria-busy={loading}>
          {loading && ideas.length === 0 ? <TypesetLoader label="Setting ideas in type…" /> : null}
          {!loading && shown.length === 0 ? (
            <p className={styles.muted}>
              {filter === 'kept'
                ? 'Nothing kept yet. Choose Keep on an idea you like.'
                : 'No ideas here yet.'}
            </p>
          ) : null}
          <ul className={cx(styles.plain, own.grid)}>
            {shown.map((idea) => (
              <li key={idea.id}>
                <Postcard
                  id={idea.id}
                  kicker={IDEA_CATEGORY_LABELS[idea.category]}
                  title={idea.title}
                  postage={
                    <Postage
                      band={costMarks(brief.currency, idea.costBand)}
                      label={costLabel(idea.costBand)}
                      initial={IDEA_CATEGORY_LABELS[idea.category].charAt(0)}
                    />
                  }
                  footer={`Fits because: ${idea.fitsBecause}`}
                  actions={
                    <>
                      <Button
                        variant="text"
                        aria-pressed={idea.saved}
                        onClick={() => {
                          api.toggleIdeaSaved(idea.id);
                        }}
                      >
                        {idea.saved ? 'Kept' : 'Keep'}
                      </Button>
                      <Button
                        variant="text"
                        disabled={loading}
                        onClick={() => {
                          api.requestIdeas(idea.category);
                        }}
                      >
                        More like this
                      </Button>
                    </>
                  }
                >
                  {idea.description}
                </Postcard>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
