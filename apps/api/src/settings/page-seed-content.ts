import { SEED_POLICY_PAGES } from './policy-seed-content.js';
import type { StaticPageLayout } from './static-pages.js';

/**
 * Baseline copy for the four pages the product ships with (SRS CFG 002).
 *
 * This is shipped product copy, not placeholder text: every sentence describes
 * how Melbourne Sphere actually works today, so each page is truthful the
 * moment it is published. It is written once, into a page that does not exist
 * yet — the seed never overwrites what an editor has since written — and the
 * client's own approved wording replaces it through the admin editor like any
 * other change.
 *
 * Nothing here states a number, a date, a person or a credential: those are
 * either counted from the data by the page itself or absent by design. Nor
 * does it name a photograph: pictures are added in the admin from the media
 * library, and the About template lays out whichever sections have one.
 */
export interface PageSeed {
  slug: string;
  title: string;
  seoTitle?: string;
  seoDescription?: string;
  /** How the body is written; both go through the same sanitiser (SRS SEC 001). */
  format: 'markdown' | 'html';
  body: string;
  /** The layout the page starts with; an editor can change it afterwards. */
  layout: StaticPageLayout;
}

/**
 * About is written as sections, because that is what the public page lays out:
 * a heading with a picture beside it, a heading whose body is a list of points,
 * and a closing section. With no pictures yet it reads as an ordinary page; an
 * editor who adds one to a section gets the two-column band, without anybody
 * touching the code.
 */
export const ABOUT_SEED: PageSeed = {
  slug: 'about',
  title: 'About Melbourne Sphere',
  seoTitle: 'About Melbourne Sphere',
  seoDescription: 'Melbourne Sphere is an independently edited directory of Melbourne businesses, local area guides and city stories. Here is how it works and who it is for.',
  format: 'markdown',
  layout: 'fullWidth',
  body: `Melbourne Sphere is an independent directory of businesses across Melbourne, published alongside guides and stories about the city they sit in. One city, covered properly — no paid placements, no listings from three states away.

## Everything here is edited

Listings are researched, checked against Melbourne and published by our editorial team rather than uploaded by whoever gets there first. Reviews and comments are read by a person before they appear.

That is slower than an open submission form, and it is the point: a directory is only useful while the information in it can be trusted.

## What you will find here

- **Business listings.** Hours, contact details, services and photographs — checked before they go live, and corrected when you tell us something has changed.
- **Local guides and articles.** The suburbs, the trades and the places worth knowing, written by our editors rather than by the businesses.
- **Reviews and ratings.** From people who have been there, moderated against published guidelines so you can weigh them up.

## Melbourne, and nowhere else

We cover Melbourne, Victoria. One city means local area pages worth reading, categories that match how people here actually search, and editors who can tell a Carlton café from a Coburg one.

## Be part of it

Run a business in Melbourne? [Send us the details](/contact) and an editor will check it and publish it — there is no charge and no account to create. Spotted something wrong? [Tell us](/contact), and we will fix it.
`,
};

/** The four pages `pages:seed` installs: About, and the three policies. */
export const PAGE_SEEDS: PageSeed[] = [
  ABOUT_SEED,
  ...SEED_POLICY_PAGES.map(
    (page): PageSeed => ({
      slug: page.slug,
      title: page.title,
      format: 'markdown',
      // A policy is read with the enquiry form and its own contents beside it.
      layout: 'rightSidebar',
      body: page.body,
    }),
  ),
];
