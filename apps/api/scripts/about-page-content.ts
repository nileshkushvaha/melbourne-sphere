/**
 * The About page as it is first written (SRS CFG 002, and SRS 1.6/1.7: the page
 * says what an editor wrote and nothing else).
 *
 * It is seeded the way any other page would be typed into the admin — headings,
 * paragraphs, a list and two photographs — and it is the editor's from then on.
 * The public template reads the shape rather than the wording: a section with a
 * photograph becomes a band with the picture beside the words, a section whose
 * body is a list becomes the cards. Rewriting a heading or swapping a picture
 * in the admin changes the page; nothing here has to be edited again.
 *
 * `{{image:name}}` is replaced by the seeder with an image it has uploaded.
 */
export interface AboutImage {
  /** Placeholder name used in the body. */
  name: string;
  /** What to look for on Wikimedia Commons, best first. */
  queries: string[];
  alt: string;
}

export const ABOUT_IMAGES: AboutImage[] = [
  { name: 'hero', queries: ['Melbourne skyline Yarra River', 'Melbourne city skyline', 'Melbourne CBD skyline'], alt: 'The Melbourne skyline along the Yarra River' },
  { name: 'editing', queries: ['Melbourne laneway cafe', 'Degraves Street Melbourne', 'Melbourne laneway'], alt: 'A Melbourne laneway lined with cafés' },
  { name: 'city', queries: ['Queen Victoria Market Melbourne', 'Flinders Street station Melbourne tram', 'Melbourne tram Bourke Street'], alt: 'A busy Melbourne street outside Queen Victoria Market' },
];

export const ABOUT_TITLE = 'About Melbourne Sphere';

export const ABOUT_BODY = `Melbourne Sphere is an independent directory of businesses across Melbourne, published alongside guides and stories about the city they sit in. One city, covered properly — no paid placements, no listings from three states away.

## Everything here is edited

{{image:editing}}

Listings are researched, checked against Melbourne and published by our editorial team rather than uploaded by whoever gets there first. Reviews and comments are read by a person before they appear.

That is slower than an open submission form, and it is the point: a directory is only useful while the information in it can be trusted.

## What you will find here

- **Business listings.** Hours, contact details, services and photographs — checked before they go live, and corrected when you tell us something has changed.
- **Local guides and articles.** The suburbs, the trades and the places worth knowing, written by our editors rather than by the businesses.
- **Reviews and ratings.** From people who have been there, moderated against published guidelines so you can weigh them up.

## Melbourne, and nowhere else

{{image:city}}

We cover Melbourne, Victoria. One city means local area pages worth reading, categories that match how people here actually search, and editors who can tell a Carlton café from a Coburg one.

## Be part of it

Run a business in Melbourne? [Send us the details](/contact) and an editor will check it and publish it — there is no charge and no account to create. Spotted something wrong? [Tell us](/contact), and we will fix it.
`;
