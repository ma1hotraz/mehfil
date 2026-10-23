import { useState } from 'react';

import { type Plan, type VendorItem, type VendorStatus } from '../../../shared/schema/plan.js';
import { ChipGroup } from '../../components/ChipGroup';
import { Section } from '../../components/Section';
import { Stamp, type StampTone } from '../../components/Stamp';
import { Ticket } from '../../components/Ticket';
import { cx } from '../../lib/cx';
import { STATUS_LABELS, formatLongDate } from '../../lib/format';
import type { PlansApi } from '../../lib/usePlans';

import styles from './almanac.module.css';
import own from './VendorsTab.module.css';
import { filterVendors } from '../../lib/almanacViewModels';

const STATUSES: readonly VendorStatus[] = ['to-find', 'enquired', 'booked', 'paid'];
const TONES: Record<VendorStatus, StampTone> = {
  'to-find': 'ink',
  enquired: 'umber',
  booked: 'peacock',
  paid: 'leaf',
};
const FILTERS = [
  { value: 'all', label: 'All' },
  ...STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
];

function VendorTicket({ vendor, api }: { vendor: VendorItem; api: PlansApi }) {
  const [contact, setContact] = useState(vendor.contact ?? {});
  const commit = (): void => {
    api.setVendorContact(vendor.id, contact);
  };
  const field = (key: 'name' | 'phone' | 'notes', label: string, long = false) => (
    <label className={own.field}>
      <span>{label}</span>
      {long ? (
        <textarea
          rows={3}
          maxLength={300}
          value={contact[key] ?? ''}
          onBlur={commit}
          onChange={(e) => {
            setContact({ ...contact, [key]: e.target.value });
          }}
        />
      ) : (
        <input
          type="text"
          maxLength={key === 'phone' ? 30 : 80}
          value={contact[key] ?? ''}
          onBlur={commit}
          onChange={(e) => {
            setContact({ ...contact, [key]: e.target.value });
          }}
        />
      )}
    </label>
  );
  return (
    <Ticket
      id={`vendor-${vendor.id}`}
      title={vendor.label}
      meta={
        <>
          Book by <time dateTime={vendor.bookByDate}>{formatLongDate(vendor.bookByDate)}</time>
        </>
      }
      stamp={
        <Stamp tone={TONES[vendor.status]} tilt={-6}>
          {STATUS_LABELS[vendor.status].toUpperCase()}
        </Stamp>
      }
    >
      <p className={cx(own.reason)}>{vendor.reason}</p>
      <details>
        <summary>Questions to ask ({vendor.questions.length})</summary>
        <ul className={own.questions}>
          {vendor.questions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
      </details>
      <fieldset className={own.segment}>
        <legend className="srOnly">Status of {vendor.label}</legend>
        {STATUSES.map((status) => (
          <label key={status} className={own.option}>
            <input
              type="radio"
              name={`status-${vendor.id}`}
              className="srOnly"
              checked={vendor.status === status}
              onChange={() => {
                api.setVendorStatus(vendor.id, status);
              }}
            />
            <span>{STATUS_LABELS[status]}</span>
          </label>
        ))}
      </fieldset>
      <details>
        <summary>Your notes for {vendor.label}</summary>
        <p className={styles.muted}>These stay on this device and are never sent anywhere.</p>
        {field('name', 'Name')}
        {field('phone', 'Phone')}
        {field('notes', 'Notes', true)}
      </details>
    </Ticket>
  );
}

/** §4 The Vendors: ticket stubs with reasons, book-by dates, questions and a status stamp. */
export default function VendorsTab({ plan, api }: { plan: Plan; api: PlansApi }) {
  const [filter, setFilter] = useState('all');
  const shown = filterVendors(plan.vendors, filter);
  return (
    <Section
      number={4}
      title="The Vendors"
      margin={<p>Each ticket says why it is on your list. Book-by dates follow the Timetable.</p>}
    >
      <div className={styles.stack}>
        <ChipGroup
          mode="single"
          legend="Show vendors"
          options={FILTERS}
          selected={filter}
          onChange={setFilter}
        />
        {shown.length === 0 ? (
          <p className={styles.muted}>No vendors with that status yet.</p>
        ) : (
          <ul className={cx(styles.plain, own.grid)}>
            {shown.map((vendor) => (
              <li key={vendor.id}>
                <VendorTicket vendor={vendor} api={api} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}
