/**
 * Baseline copy for the About page (SRS CFG 002).
 *
 * This is shipped product copy, not placeholder text: every sentence describes
 * how Melbourne Sphere actually works today, so the page is truthful the
 * moment it is published. It is written once, into an empty row — the seed
 * never overwrites what an editor has since written — and the client's own
 * approved wording replaces it through the admin editor like any other change.
 *
 * Nothing here states a number, a date, a person or a credential: those are
 * either counted from the data by the page itself or absent by design.
 */
export const ABOUT_SEED = {
  title: 'About Melbourne Sphere',
  seoTitle: 'About Melbourne Sphere',
  seoDescription: 'Melbourne Sphere is an independently edited directory of Melbourne businesses, local area guides and city stories. Here is how it works and who it is for.',
  /** Sanitised again on save; kept to the tags the editor's allowlist permits. */
  body: [
    '<p>Melbourne Sphere is an independent directory of businesses across Melbourne, published alongside guides and stories about the city they sit in. It exists because finding a good local business should not mean scrolling past paid placements, duplicated listings and reviews for a shop three states away.</p>',
    '<p>Everything here is edited. Listings are researched, checked against Melbourne and published by our editorial team rather than uploaded by whoever gets there first, and reviews and comments from visitors are moderated before they appear. That is slower than an open submission form, and it is the point: a directory is only useful while the information in it can be trusted.</p>',
    '<p>We cover Melbourne, Victoria, and nowhere else. One city means local area pages worth reading, categories that reflect how people here actually search, and editors who can tell the difference between a Carlton café and a Coburg one.</p>',
  ].join(''),
} as const;
