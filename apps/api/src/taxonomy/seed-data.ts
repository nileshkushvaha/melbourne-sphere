/**
 * Baseline fixtures (SRS SCP 004 / BUS 008): the City of Melbourne council
 * area's suburbs as the conservative local-area allowlist until decision D01
 * records the approved boundary, plus a small starter set of categories and
 * services that administrators are expected to edit. Seeding is explicit
 * (`pnpm --filter api taxonomy:seed`), idempotent by slug, and audited.
 */
export const BASELINE_LOCAL_AREAS: { name: string; slug: string; note: string }[] = [
  { name: 'Melbourne CBD', slug: 'melbourne-cbd', note: 'City of Melbourne (council area baseline)' },
  { name: 'Carlton', slug: 'carlton', note: 'City of Melbourne (council area baseline)' },
  { name: 'Carlton North', slug: 'carlton-north', note: 'City of Melbourne, part (council area baseline)' },
  { name: 'Docklands', slug: 'docklands', note: 'City of Melbourne (council area baseline)' },
  { name: 'East Melbourne', slug: 'east-melbourne', note: 'City of Melbourne (council area baseline)' },
  { name: 'Flemington', slug: 'flemington', note: 'City of Melbourne, part (council area baseline)' },
  { name: 'Kensington', slug: 'kensington', note: 'City of Melbourne (council area baseline)' },
  { name: 'North Melbourne', slug: 'north-melbourne', note: 'City of Melbourne (council area baseline)' },
  { name: 'Parkville', slug: 'parkville', note: 'City of Melbourne (council area baseline)' },
  { name: 'Port Melbourne', slug: 'port-melbourne', note: 'City of Melbourne, part (council area baseline)' },
  { name: 'Southbank', slug: 'southbank', note: 'City of Melbourne (council area baseline)' },
  { name: 'South Wharf', slug: 'south-wharf', note: 'City of Melbourne (council area baseline)' },
  { name: 'South Yarra', slug: 'south-yarra', note: 'City of Melbourne, part (council area baseline)' },
  { name: 'West Melbourne', slug: 'west-melbourne', note: 'City of Melbourne (council area baseline)' },
];

export const STARTER_CATEGORIES: { name: string; slug: string; children?: { name: string; slug: string }[] }[] = [
  { name: 'Food & Drink', slug: 'food-and-drink', children: [{ name: 'Cafes', slug: 'cafes' }, { name: 'Restaurants', slug: 'restaurants' }, { name: 'Bars', slug: 'bars' }] },
  { name: 'Shopping', slug: 'shopping', children: [{ name: 'Independent shops', slug: 'independent-shops' }] },
  { name: 'Health & Wellness', slug: 'health-and-wellness' },
  { name: 'Home Services', slug: 'home-services' },
  { name: 'Professional Services', slug: 'professional-services' },
];

export const STARTER_SERVICES: { name: string; slug: string; synonyms: string[] }[] = [
  { name: 'Coffee', slug: 'coffee', synonyms: ['espresso', 'flat white', 'cafe'] },
  { name: 'Plumbing', slug: 'plumbing', synonyms: ['plumber', 'blocked drain', 'hot water'] },
  { name: 'Accounting', slug: 'accounting', synonyms: ['accountant', 'tax return', 'bookkeeping'] },
];
