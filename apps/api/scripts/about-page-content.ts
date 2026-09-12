/**
 * The photographs the development seeder puts on the About page, and where
 * they go.
 *
 * The words are not here: they are the shipped copy in
 * `src/settings/page-seed-content.ts`, which is what `pages:seed` installs in
 * any environment. This file only says which section gets a picture, so the
 * demonstration database looks like a finished page while the production seed
 * stays text an editor illustrates from the media library.
 */
import { ABOUT_SEED } from '../src/settings/page-seed-content.js';

export interface AboutImage {
  /** The exact heading the picture belongs under. */
  heading: string;
  /** What to look for on Wikimedia Commons, best first. */
  queries: string[];
  alt: string;
  /** Used for the page's own share and title image rather than placed in a section. */
  hero?: boolean;
}

export const ABOUT_IMAGES: AboutImage[] = [
  { heading: '', hero: true, queries: ['Melbourne skyline Yarra River', 'Melbourne city skyline', 'Melbourne CBD skyline'], alt: 'The Melbourne skyline along the Yarra River' },
  { heading: 'Everything here is edited', queries: ['Melbourne laneway cafe', 'Degraves Street Melbourne', 'Melbourne laneway'], alt: 'A Melbourne laneway lined with cafés' },
  { heading: 'Melbourne, and nowhere else', queries: ['Queen Victoria Market Melbourne', 'Flinders Street station Melbourne tram', 'Melbourne tram Bourke Street'], alt: 'A busy Melbourne street outside Queen Victoria Market' },
];

export const ABOUT_TITLE = ABOUT_SEED.title;
export const ABOUT_BODY = ABOUT_SEED.body;

/** A stable name for the media asset behind one of these pictures. */
export const aboutImageName = (image: AboutImage): string => (image.hero ? 'hero' : image.heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40));

/** Puts a picture directly under its heading, leaving the rest of the copy untouched. */
export function withPicture(body: string, heading: string, figure: string): string {
  const marker = `## ${heading}`;
  const at = body.indexOf(marker);
  if (at === -1) return body;
  const after = at + marker.length;
  return `${body.slice(0, after)}\n\n${figure}${body.slice(after)}`;
}
