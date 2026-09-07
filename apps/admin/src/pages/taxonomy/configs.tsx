import type { TermsPageConfig } from './TermsPage';

const common = [
  { name: 'name', label: 'Name', input: 'text' as const, required: true, max: 80 },
  { name: 'slug', label: 'Slug', input: 'text' as const, max: 100, help: 'Lowercase letters, numbers and hyphens. Generated from the name when left empty. Changing a published slug needs a redirect (later phase).' },
  { name: 'sortOrder', label: 'Sort order', input: 'number' as const },
];

export const CATEGORIES_CONFIG: TermsPageConfig = {
  kind: 'categories',
  title: 'Categories',
  singular: 'Category',
  intro: 'Business categories nest at most two levels. Deactivating hides a category from new selections while keeping historical links.',
  fields: [common[0]!, common[1]!, { name: 'parentId', label: 'Parent category', input: 'parent', help: 'Only top-level categories can be parents.' }, { name: 'description', label: 'Description', input: 'textarea', max: 500 }, common[2]!],
  columns: [{ title: 'Parent', render: (item) => ('parentId' in item && item.parentId ? 'child' : 'top-level') }],
};

export const SERVICES_CONFIG: TermsPageConfig = {
  kind: 'services',
  title: 'Services',
  singular: 'Service',
  intro: 'Service labels businesses offer. Synonyms improve keyword search (e.g. “plumber” for Plumbing).',
  fields: [common[0]!, common[1]!, { name: 'synonyms', label: 'Search synonyms', input: 'tags', help: 'Up to 20, 2–80 characters each.' }],
  columns: [{ title: 'Synonyms', render: (item) => ('synonyms' in item ? item.synonyms.join(', ') || '—' : '—') }],
};

export const AREAS_CONFIG: TermsPageConfig = {
  kind: 'areas',
  title: 'Local areas',
  singular: 'Local area',
  intro: 'Approved Melbourne local areas (allowlist). Record how each area was verified against the approved boundary (client decision D01; council-area baseline meanwhile). There is no city, state or country selector by design.',
  fields: [common[0]!, common[1]!, { name: 'eligibilitySource', label: 'Eligibility verification source', input: 'text', max: 255, help: 'e.g. “City of Melbourne suburb list, checked 6 Sep 2026”. Saving it records the verification time.' }, { name: 'editorialIntro', label: 'Editorial introduction', input: 'textarea', max: 5000 }, common[2]!],
  columns: [{ title: 'Verified', render: (item) => ('eligibilityVerifiedAt' in item && item.eligibilityVerifiedAt ? 'yes' : 'no') }],
};
