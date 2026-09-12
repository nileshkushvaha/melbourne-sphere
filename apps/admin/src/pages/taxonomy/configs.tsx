import { Typography } from 'antd';
import { Pill } from '@/components/ui';
import { formatDate } from '@/shared/format';
import type { TermsPageConfig } from './TermsPage';

/** The name field, with an example drawn from the taxonomy being edited. */
const name = (placeholder: string) => ({ name: 'name', label: 'Name', input: 'text' as const, required: true, max: 80, placeholder });
const sortOrder = { name: 'sortOrder', label: 'Display order', input: 'number' as const, help: 'Lower numbers appear first. Terms with the same number are ordered by name.' };

/**
 * The address is shown the way a CMS shows it — one line under the name, edited
 * deliberately — for the two taxonomies that have a public page of their own.
 * Changing one leaves a 301 behind (SRS SEO 004).
 */
const address = (base: string) => ({ name: 'slug', label: 'Address', input: 'permalink' as const, base, help: 'Made from the name when left empty. Changing it redirects the old address to the new one.' });

export const CATEGORIES_CONFIG: TermsPageConfig = {
  kind: 'categories',
  title: 'Categories',
  singular: 'Category',
  intro: 'Organise listings into directory categories. Categories nest at most two levels.',
  fields: [name('e.g. Cafés and coffee'), address('/business/category'), { name: 'parentId', label: 'Parent category', input: 'parent', help: 'Only top-level categories can be parents.' }, { name: 'description', label: 'Description', input: 'textarea', max: 500 }, sortOrder],
};

export const SERVICES_CONFIG: TermsPageConfig = {
  kind: 'services',
  title: 'Services',
  singular: 'Service',
  intro: 'The services listings can offer. Synonyms help visitors find them by other words.',
  // A service has no page of its own — it is a search facet — so its address
  // is made from the name and never shown.
  fields: [name('e.g. Plumbing'), { name: 'synonyms', label: 'Search synonyms', input: 'tags', help: 'Other words people search for, e.g. “plumber” for Plumbing. Up to 20.' }],
  columns: [{ title: 'Synonyms', render: (item) => ('synonyms' in item ? item.synonyms.join(', ') || '—' : '—') }],
};

export const AREAS_CONFIG: TermsPageConfig = {
  kind: 'areas',
  title: 'Local areas',
  singular: 'Local area',
  intro: 'The approved Melbourne areas listings can belong to. Melbourne only, by design.',
  // Whether an area's boundary was checked, and when — the fact SRS BUS 008
  // asks to be recorded, shown as the date rather than a bare yes/no.
  columns: [
    {
      title: 'Verified',
      render: (item) =>
        'eligibilityVerifiedAt' in item && item.eligibilityVerifiedAt ? (
          <Typography.Text>{formatDate(item.eligibilityVerifiedAt)}</Typography.Text>
        ) : (
          <Pill tone="attention">Not verified</Pill>
        ),
    },
  ],
  fields: [name('e.g. Fitzroy'), address('/business/area'), { name: 'eligibilitySource', label: 'How this area was verified', input: 'text', max: 255, help: 'Where the boundary came from, e.g. “City of Melbourne suburb list, checked 6 Sep 2026”. Saving records the time.' }, { name: 'editorialIntro', label: 'Editorial introduction', input: 'textarea', max: 5000 }, sortOrder],
};
