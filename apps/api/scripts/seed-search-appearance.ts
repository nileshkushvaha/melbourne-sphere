/**
 * Fills the search appearance of every public record in a demonstration
 * database (SRS SEO 001): businesses, directory categories, local areas,
 * articles, the policy pages and the route settings for Home, Businesses, Blog,
 * FAQs, About and Contact.
 *
 * Only empty fields are written — anything an editor has typed is left alone —
 * and every value is composed from the record's own data: its name, category,
 * area, description and photographs. Nothing states a number, a rating or a
 * claim the record does not make, because stored metadata is not recounted
 * and a figure written today would be wrong tomorrow.
 *
 * Local areas had no photograph and no introduction, which also kept their
 * landing pages out of the index (`landingRobots`). Each gets a licensed
 * Wikimedia Commons photograph of the suburb, chosen by exact file name and
 * processed by the worker, and a short factual introduction.
 *
 *   pnpm --filter api exec tsx --env-file=.env scripts/seed-search-appearance.ts
 *
 * The worker must be running (`pnpm dev:worker`) for the area photographs.
 */
import Redis from 'ioredis';
import { SEO_ROUTES } from '@melbourne-sphere/domain';
import { DEFAULT_SEO_SETTINGS, EMPTY_ROUTE_SEO, SEO_SETTINGS_KEY, validateSeoSettings, type RouteSeo } from '../src/settings/seo-settings.js';
import { databaseName, db, resolveCommonsFile, uploadImage, waitUntilReady } from './seed-commons.js';

const SITE = 'Melbourne Sphere';
const TITLE_MAX = 60;
const DESCRIPTION_MAX = 160;
const KEYWORDS_MAX = 255;

/** Plain text cut at a word boundary, never mid-word. */
function clip(text: string, max: number): string {
  const plain = text.replace(/\s+/g, ' ').trim();
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max - 1);
  const at = cut.lastIndexOf(' ');
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,;:.–—-]+$/, '')}…`;
}

/** The first sentence, or as much of the text as fits. */
function firstSentence(text: string, max: number): string {
  const plain = text.replace(/\s+/g, ' ').trim();
  const sentence = plain.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? plain;
  return clip(sentence, max);
}

/** The first title that fits, else the last clipped. */
function fitTitle(...candidates: string[]): string {
  return candidates.find((candidate) => candidate.length <= TITLE_MAX) ?? clip(candidates.at(-1)!, TITLE_MAX);
}

/** Comma-separated, de-duplicated case-insensitively, within the column limit. */
function keywords(values: (string | null | undefined)[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const word = (raw ?? '').replace(/\s+/g, ' ').trim();
    if (!word || seen.has(word.toLowerCase())) continue;
    if ([...out, word].join(', ').length > KEYWORDS_MAX) break;
    seen.add(word.toLowerCase());
    out.push(word);
  }
  return out.join(', ');
}

const lower = (value: string) => value.charAt(0).toLowerCase() + value.slice(1);

/** "Carlton, Melbourne", but "North Melbourne" and "Melbourne CBD" as they are. */
const place = (area: string) => (/melbourne/i.test(area) ? area : `${area}, Melbourne`);

// ---- local areas: introduction and photograph -------------------------------

/**
 * Established, verifiable facts about each suburb only — landmarks and
 * shopping streets that are there today — so the introduction is true without
 * anyone having to vouch for it.
 */
const AREA_INTROS: Record<string, string> = {
  'melbourne-cbd':
    'The Melbourne CBD is the Hoddle Grid of the city centre, from Flinders Street Station to the Queen Victoria Market, threaded with laneways of cafés, bars and small shops and served by the free tram zone.',
  carlton:
    'Carlton is known for Lygon Street and its long-running Italian restaurants and cafés, and for the Carlton Gardens and the World Heritage-listed Royal Exhibition Building, with the University of Melbourne on its western edge.',
  'carlton-north':
    'Carlton North is a residential suburb of Victorian terraces and wide streets, with the Rathdowne Street village of cafés and shops and Princes Park on its western side.',
  docklands:
    'Docklands is the waterfront precinct on Victoria Harbour, west of the city centre, home to Marvel Stadium, apartments, offices and restaurants along the harbour promenade.',
  'east-melbourne':
    'East Melbourne is a quiet inner suburb of heritage terraces between the Fitzroy and Treasury Gardens and Yarra Park, a short walk from the MCG and the city centre.',
  flemington:
    'Flemington is home to Flemington Racecourse, where the Melbourne Cup is run, and to the shops and eateries along Racecourse Road.',
  kensington:
    'Kensington is a village-style suburb north-west of the city, centred on the shops and cafés of Macaulay Road and Bellair Street, with JJ Holland Park and the Maribyrnong River nearby.',
  'north-melbourne':
    'North Melbourne combines Victorian streetscapes with the local shopping strip of Errol Street, sitting between the Queen Victoria Market and the Arden precinct.',
  parkville:
    'Parkville is home to the University of Melbourne, the Royal Melbourne Hospital, Royal Park and Melbourne Zoo, with quiet residential streets between them.',
  'port-melbourne':
    'Port Melbourne is a bayside suburb on Port Phillip Bay, with Station Pier, beaches along the foreshore and the shops and cafés of Bay Street.',
  southbank:
    'Southbank runs along the south bank of the Yarra River opposite the city centre, and takes in the Arts Centre Melbourne, the National Gallery of Victoria and the riverside Southbank Promenade.',
  'south-wharf':
    'South Wharf sits on the Yarra beside the Melbourne Convention and Exhibition Centre, with riverside restaurants, the DFO South Wharf outlet centre and the tall ship Polly Woodside.',
  'south-yarra':
    'South Yarra is known for the shops, restaurants and bars of Chapel Street and Toorak Road, and borders the Royal Botanic Gardens.',
  'west-melbourne':
    'West Melbourne lies between the city centre and the port, taking in Flagstaff Gardens and a mix of warehouses, offices, apartments and small businesses.',
};

/**
 * Photographs of each suburb, by exact Commons file name, checked by hand
 * against the file's own description. `resolveCommonsFile` refuses any file
 * whose licence is not attribution-only or public domain. Two suburbs use a
 * photograph the project already holds.
 */
const AREA_PHOTOS: Record<string, { file?: string; existingSourceName?: string; alt: string }> = {
  'melbourne-cbd': { existingSourceName: 'using-melbourne-trams.jpg', alt: 'A tram on Bourke Street in Melbourne’s central business district' },
  carlton: { existingSourceName: 'lygon-street-after-dark.jpg', alt: 'Shopfronts and restaurant lights along Lygon Street, Carlton, at night' },
  'carlton-north': { file: 'File:Carlton North VIC 3054, Australia - panoramio.jpg', alt: 'A residential street in Carlton North, Melbourne' },
  docklands: { file: 'File:Sunset Bolte Bridge Docklands 2016-04-17.jpg', alt: 'Harbour Esplanade in Docklands at sunset, looking towards the Bolte Bridge' },
  'east-melbourne': { file: 'File:Tasma Terrace 2018 001.JPG', alt: 'Tasma Terrace, a row of Victorian terraces in East Melbourne' },
  flemington: { file: 'File:20101211-Racecourse-Road-Flemington-Victoria-AU.JPG', alt: 'Shops along Racecourse Road, Flemington' },
  kensington: { file: 'File:Kensington railway station, Melbourne.jpg', alt: 'The entrance to Kensington railway station, Melbourne' },
  'north-melbourne': { file: 'File:A VLocity Train Crossing the RRL and a Comeng Departing North Melbourne.jpg', alt: 'Trains at North Melbourne, with the railway overpass behind' },
  parkville: { file: 'File:Aerial panorama of University of Melbourne facing the city skyline. September 2023.jpg', alt: 'The University of Melbourne campus in Parkville, with the city skyline beyond' },
  'port-melbourne': { file: 'File:Station Pier 2006.jpg', alt: 'Station Pier, Port Melbourne, with a ferry berthed' },
  southbank: { file: 'File:AUS Melbourne, Melbourne, Southbank Promenade 001.jpg', alt: 'The Southbank Promenade beside the Yarra River' },
  'south-wharf': { file: 'File:Polly Woodside (21371129260).jpg', alt: 'The tall ship Polly Woodside at South Wharf' },
  'south-yarra': { file: 'File:Chapel St in South Yarra.jpg', alt: 'Shops along Chapel Street, South Yarra' },
  'west-melbourne': { file: 'File:AUS Melbourne, Melbourne, Flagstaff Gardens 007.jpg', alt: 'Lawns and trees in Flagstaff Gardens, West Melbourne' },
};

async function areaPhotos(): Promise<Map<string, string>> {
  const bySlug = new Map<string, string>();
  const pending: string[] = [];
  for (const [slug, photo] of Object.entries(AREA_PHOTOS)) {
    if (photo.existingSourceName) {
      const asset = await db.mediaAsset.findFirst({ where: { sourceName: photo.existingSourceName, status: 'ready' }, select: { id: true } });
      if (asset) bySlug.set(slug, asset.id);
      else console.log(`  ${slug}: ${photo.existingSourceName} is not in the library; skipped`);
      continue;
    }
    try {
      const file = await resolveCommonsFile(photo.file!, 1600);
      const credit = file.artist ? `${file.artist} via Wikimedia Commons` : 'Wikimedia Commons';
      const id = await uploadImage({ file, sourceName: `area-${slug}.jpg`, alt: photo.alt, credit, rightsNote: `${file.licence} — ${file.pageUrl}` });
      bySlug.set(slug, id);
      pending.push(id);
    } catch (error) {
      console.log(`  ${slug}: ${(error as Error).message}; left without a photograph`);
    }
  }
  if (pending.length > 0) await waitUntilReady(pending);
  return bySlug;
}

// ---- runners ---------------------------------------------------------------

async function seedAreas(photos: Map<string, string>) {
  const areas = await db.localArea.findMany({
    include: { businesses: { where: { status: 'published' }, select: { primaryCategory: { select: { name: true } } } } },
  });
  let written = 0;
  for (const area of areas) {
    const counts = new Map<string, number>();
    for (const business of area.businesses) counts.set(business.primaryCategory.name, (counts.get(business.primaryCategory.name) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([name]) => name);
    const photo = photos.get(area.slug) ?? null;
    const intro = AREA_INTROS[area.slug] ?? null;
    const lead = top.length > 0 ? `${top.map(lower).join(', ')} and more` : 'local services';
    const data = {
      ...(area.editorialIntro ? {} : intro ? { editorialIntro: intro } : {}),
      ...(area.imageMediaId || !photo ? {} : { imageMediaId: photo }),
      ...(area.ogImageMediaId || !(area.imageMediaId ?? photo) ? {} : { ogImageMediaId: area.imageMediaId ?? photo }),
      ...(area.seoTitle ? {} : { seoTitle: fitTitle(`Businesses in ${place(area.name)}`, `${area.name} businesses`) }),
      ...(area.seoDescription ? {} : { seoDescription: clip(`Local businesses in ${place(area.name)}: ${lead}, with contact details, opening hours and locations.`, DESCRIPTION_MAX) }),
      ...(area.seoKeywords
        ? {}
        : { seoKeywords: keywords([`${area.name} businesses`, ...(/melbourne/i.test(area.name) ? [] : [`${area.name} Melbourne`]), `businesses in ${area.name}`, ...top.map((name) => `${name} ${area.name}`), `${area.name} VIC`, 'inner Melbourne']) }),
    };
    if (Object.keys(data).length === 0) continue;
    await db.localArea.update({ where: { id: area.id }, data: { ...data, version: { increment: 1 } } });
    written += 1;
  }
  console.log(`  local areas: ${written} of ${areas.length} updated`);
}

/**
 * The categories that shipped without a description. A landing page without
 * one is `noindex` (`landingRobots`), so these are written like the others:
 * what the category holds, with no claim about any listing in it.
 */
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  cafes: 'Cafés for coffee, breakfast and lunch, from laneway espresso bars to neighbourhood all-day kitchens.',
  restaurants: 'Restaurants for lunch and dinner across the city, from casual local favourites to places for a longer meal.',
  bars: 'Bars, wine bars and pubs for an after-work drink, a cocktail or a late night out.',
  'independent-shops': 'Independently owned shops — bookshops, gift and homewares stores, fashion and specialty retailers.',
};

async function seedCategories() {
  const categories = await db.category.findMany({
    include: {
      parent: { select: { name: true } },
      primaryOf: { where: { status: 'published' }, select: { localArea: { select: { name: true } } } },
    },
  });
  let written = 0;
  for (const category of categories) {
    const areas = new Map<string, number>();
    for (const business of category.primaryOf) areas.set(business.localArea.name, (areas.get(business.localArea.name) ?? 0) + 1);
    const topAreas = [...areas.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([name]) => name);
    const where = topAreas.length > 0 ? ` in ${topAreas.join(', ')} and across inner Melbourne` : ' across inner Melbourne';
    const composed = category.description
      ? `${firstSentence(category.description, 110)} Find listings${where}.`
      : `Find ${lower(category.name)}${where}, with contact details, opening hours and locations.`;
    const data = {
      ...(category.description || !CATEGORY_DESCRIPTIONS[category.slug] ? {} : { description: CATEGORY_DESCRIPTIONS[category.slug] }),
      ...(category.seoTitle ? {} : { seoTitle: fitTitle(`${category.name} in Melbourne`, category.name) }),
      ...(category.seoDescription ? {} : { seoDescription: clip(composed, DESCRIPTION_MAX) }),
      ...(category.seoKeywords
        ? {}
        : { seoKeywords: keywords([category.name, `${category.name} Melbourne`, category.parent?.name, ...topAreas.map((area) => `${category.name} ${area}`), `${lower(category.name)} near Melbourne CBD`]) }),
      ...(category.ogImageMediaId || !category.imageMediaId ? {} : { ogImageMediaId: category.imageMediaId }),
    };
    if (Object.keys(data).length === 0) continue;
    await db.category.update({ where: { id: category.id }, data: { ...data, version: { increment: 1 } } });
    written += 1;
  }
  console.log(`  categories: ${written} of ${categories.length} updated`);
}

async function seedBusinesses() {
  const businesses = await db.business.findMany({
    include: {
      primaryCategory: { select: { name: true } },
      localArea: { select: { name: true } },
      categories: { select: { category: { select: { name: true } } } },
      services: { select: { service: { select: { name: true } } } },
      media: { where: { media: { status: 'ready' } }, orderBy: { sortOrder: 'asc' }, select: { mediaId: true }, take: 1 },
    },
  });
  let written = 0;
  for (const business of businesses) {
    const category = business.primaryCategory.name;
    const area = business.localArea.name;
    // The listing's own opening sentence with where it is, when both fit; a
    // sentence too long for that leads with the place instead, so the cut (if
    // any) falls at the end rather than in the middle of the description.
    const sentence = firstSentence(business.description, DESCRIPTION_MAX);
    const placed = `${sentence} ${category} in ${place(area)}.`;
    const description = !sentence.endsWith('…') && placed.length <= DESCRIPTION_MAX ? placed : clip(`${category} in ${place(area)}. ${business.description}`, DESCRIPTION_MAX);
    const data = {
      ...(business.seoTitle ? {} : { seoTitle: fitTitle(`${business.name} – ${category} in ${area}`, `${business.name} – ${place(area)}`, `${business.name} – ${area}`, business.name) }),
      ...(business.seoDescription ? {} : { seoDescription: description }),
      ...(business.seoKeywords
        ? {}
        : {
            seoKeywords: keywords([
              business.name,
              `${category} ${area}`,
              `${category} Melbourne`,
              `${business.name} ${area}`,
              area,
              ...business.categories.map((entry) => entry.category.name),
              ...business.services.slice(0, 4).map((entry) => entry.service.name),
            ]),
          }),
      ...(business.ogImageMediaId || !business.media[0] ? {} : { ogImageMediaId: business.media[0].mediaId }),
    };
    if (Object.keys(data).length === 0) continue;
    await db.business.update({ where: { id: business.id }, data: { ...data, version: { increment: 1 } } });
    written += 1;
  }
  console.log(`  businesses: ${written} of ${businesses.length} updated`);
}

async function seedPosts() {
  const posts = await db.post.findMany({ include: { category: { select: { name: true } }, tags: { select: { tag: { select: { name: true } } } } } });
  let written = 0;
  for (const post of posts) {
    const data = {
      ...(post.seoTitle ? {} : { seoTitle: fitTitle(post.title, post.title) }),
      ...(post.seoDescription ? {} : { seoDescription: clip(post.excerpt, DESCRIPTION_MAX) }),
      ...(post.seoKeywords ? {} : { seoKeywords: keywords([...post.tags.map((entry) => entry.tag.name), post.category.name, `${post.category.name} Melbourne`, 'Melbourne guide']) }),
      ...(post.ogImageMediaId || !post.coverMediaId ? {} : { ogImageMediaId: post.coverMediaId }),
    };
    if (Object.keys(data).length === 0) continue;
    await db.post.update({ where: { id: post.id }, data: { ...data, version: { increment: 1 } } });
    written += 1;
  }
  console.log(`  articles: ${written} of ${posts.length} updated`);
}

const POLICY_SEO: Record<string, { title: string; description: string; keywords: string[] }> = {
  privacy: {
    title: 'Privacy Policy',
    description: `How ${SITE} collects, uses, stores and protects personal information from reviews, comments and enquiries, and how to ask for access or deletion.`,
    keywords: [`${SITE} privacy policy`, 'privacy policy', 'personal information', 'data protection', 'Australian Privacy Principles'],
  },
  terms: {
    title: 'Terms of Use',
    description: `The terms that apply when you use ${SITE}, including listing accuracy, reviews and comments, acceptable use and the limits of our liability.`,
    keywords: [`${SITE} terms of use`, 'terms of use', 'website terms', 'directory terms and conditions'],
  },
  'review-guidelines': {
    title: 'Review Guidelines',
    description: `What makes a review or comment acceptable on ${SITE}, what moderators remove and how to report content that breaks the guidelines.`,
    keywords: [`${SITE} review guidelines`, 'review guidelines', 'review moderation', 'comment guidelines', 'report a review'],
  },
};

async function seedPages(shareImage: string | null) {
  let written = 0;
  for (const [slug, seo] of Object.entries(POLICY_SEO)) {
    const page = await db.staticPage.findUnique({ where: { slug } });
    if (!page) continue;
    const data = {
      ...(page.seoTitle ? {} : { seoTitle: seo.title }),
      ...(page.seoDescription ? {} : { seoDescription: clip(seo.description, DESCRIPTION_MAX) }),
      ...(page.seoKeywords ? {} : { seoKeywords: keywords(seo.keywords) }),
      ...(page.ogImageMediaId || !shareImage ? {} : { ogImageMediaId: shareImage }),
    };
    if (Object.keys(data).length === 0) continue;
    await db.staticPage.update({ where: { id: page.id }, data: { ...data, version: { increment: 1 } } });
    written += 1;
  }
  console.log(`  policy pages: ${written} updated`);
}

/**
 * The routes with no record of their own; the image is the project photograph
 * that best fits each. Titles leave out the site name: the layout's title
 * template appends it to every page, so including it here would repeat it.
 */
const ROUTE_SEO: Record<string, { title: string; description: string; keywords: string[]; image: string }> = {
  home: {
    // The home page title is used as written, without the template, so it carries the name itself.
    title: `${SITE} – Local Businesses & Guides in Melbourne`,
    description: 'An independently edited directory of local businesses across inner Melbourne, with contact details, opening hours, reviews and neighbourhood guides.',
    keywords: [SITE, 'Melbourne business directory', 'local businesses Melbourne', 'Melbourne services', 'inner Melbourne', 'Melbourne guides'],
    image: 'about-hero.jpg',
  },
  directory: {
    title: 'Businesses in Melbourne | Local Directory',
    description: 'Browse published businesses across inner Melbourne by category and local area, with contact details, opening hours and moderated reviews.',
    keywords: ['Melbourne businesses', 'business directory Melbourne', 'local services Melbourne', 'Melbourne shops', 'Melbourne trades'],
    image: 'using-melbourne-trams.jpg',
  },
  blog: {
    title: 'Melbourne Guides & Local Stories',
    description: 'Guides to Melbourne’s neighbourhoods, markets, laneways and city life, written and checked by the Melbourne Sphere editors.',
    keywords: ['Melbourne blog', 'Melbourne guides', 'things to do in Melbourne', 'Melbourne neighbourhoods', 'Melbourne laneways'],
    image: 'first-timers-guide-to-hosier-lane.jpg',
  },
  faqs: {
    title: 'Frequently Asked Questions',
    description: 'Answers about adding or correcting a business listing, how reviews are moderated and how to contact the Melbourne Sphere editors.',
    keywords: [`${SITE} FAQ`, 'add a business Melbourne', 'correct a business listing', 'review moderation', 'directory help'],
    image: 'about-editing.jpg',
  },
  about: {
    title: `About ${SITE} – Independent Melbourne Directory`,
    description: `How ${SITE} works: an independently edited guide to Melbourne’s local businesses, where every listing is checked by an editor before it is published.`,
    keywords: [`about ${SITE}`, 'independent business directory', 'Melbourne local directory', 'edited business listings'],
    image: 'about-hero.jpg',
  },
  contact: {
    title: `Contact ${SITE}`,
    description: `Contact the ${SITE} editors to request a business listing, correct listing details, report a review or ask a general question.`,
    keywords: [`contact ${SITE}`, 'request a business listing', 'correct a business listing', 'Melbourne directory contact'],
    image: 'about-city.jpg',
  },
};

async function seedRoutes() {
  const row = await db.setting.findUnique({ where: { group_key: { group: 'website', key: SEO_SETTINGS_KEY } } });
  const stored = row ? validateSeoSettings(row.data).value : structuredClone(DEFAULT_SEO_SETTINGS);
  let filled = 0;
  for (const route of SEO_ROUTES) {
    const seo = ROUTE_SEO[route.key];
    if (!seo) continue;
    const current: RouteSeo = stored.routes[route.key] ?? { ...EMPTY_ROUTE_SEO };
    const image = current.ogImageMediaId ? null : await db.mediaAsset.findFirst({ where: { sourceName: seo.image, status: 'ready' }, select: { id: true } });
    const next: RouteSeo = {
      ...current,
      metaTitle: current.metaTitle ?? clip(seo.title, 70),
      metaDescription: current.metaDescription ?? clip(seo.description, DESCRIPTION_MAX),
      metaKeywords: current.metaKeywords ?? keywords(seo.keywords),
      ogImageMediaId: current.ogImageMediaId ?? image?.id ?? null,
    };
    if (JSON.stringify(next) !== JSON.stringify(current)) filled += 1;
    stored.routes[route.key] = next;
  }
  const { errors, value } = validateSeoSettings(stored);
  if (Object.keys(errors).length > 0) throw new Error(`Route SEO did not validate: ${JSON.stringify(errors)}`);
  const data = JSON.parse(JSON.stringify(value));
  if (row) await db.setting.update({ where: { group_key: { group: 'website', key: SEO_SETTINGS_KEY } }, data: { data, version: { increment: 1 } } });
  else await db.setting.create({ data: { group: 'website', key: SEO_SETTINGS_KEY, data, version: 1 } });
  console.log(`  routes: ${filled} of ${SEO_ROUTES.length} filled`);
}

/** Retires every cached public read, as a publication does, so the API serves the new values at once. */
async function retireApiCache() {
  const url = process.env.REDIS_URL;
  if (!url) return console.log('  REDIS_URL is not set; cached reads expire on their own within five minutes');
  const redis = new Redis(url, { keyPrefix: 'ms:', lazyConnect: true, maxRetriesPerRequest: 1 });
  try {
    await redis.connect();
    await redis.incr('cache:public:ns');
    console.log('  API read cache retired');
  } catch {
    console.log('  Redis was unreachable; cached reads expire on their own within five minutes');
  } finally {
    redis.disconnect();
  }
}

async function main() {
  console.log(`Filling search appearance in ${databaseName}\n`);
  console.log('Local area photographs');
  const photos = await areaPhotos();
  console.log('\nRecords');
  await seedAreas(photos);
  await seedCategories();
  await seedBusinesses();
  await seedPosts();
  const skyline = await db.mediaAsset.findFirst({ where: { sourceName: 'about-hero.jpg', status: 'ready' }, select: { id: true } });
  await seedPages(skyline?.id ?? null);
  await seedRoutes();
  await retireApiCache();
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
