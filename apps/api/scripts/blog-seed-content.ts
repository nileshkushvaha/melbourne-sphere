/**
 * The six articles and their photographs, kept apart from the script that
 * loads them so the writing can be read and edited on its own.
 *
 * The copy is original. The photographs are Creative Commons Zero or
 * Attribution files from Wikimedia Commons — no share-alike, matching the
 * policy already recorded for the hero images in
 * `docs/content/hero-photography.md` — and each carries its credit into the
 * media library, where the licence's attribution requirement is satisfied.
 */

export interface SeedImage {
  /**
   * The file's title on Wikimedia Commons. The download address is resolved
   * from this at seed time rather than written here: Commons derives the path
   * from a hash of the name, so a hand-written URL is a guess that breaks.
   * Resolving it also lets the seeder re-check the licence before using the
   * file, instead of trusting a note in this table.
   */
  file: string;
  alt: string;
  credit: string;
  rightsNote: string;
}

export interface SeedPost {
  title: string;
  slug: string;
  category: string;
  tags: string[];
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  body: string;
  image: SeedImage;
}

export const SEED_CATEGORIES = [
  { name: 'City guides', slug: 'city-guides', description: 'Where to go and what to expect, neighbourhood by neighbourhood.' },
  { name: 'Food and drink', slug: 'food-and-drink', description: 'Coffee, markets, kitchens and the people running them.' },
  { name: 'Getting around', slug: 'getting-around', description: 'Trams, trains, walking and parking, explained plainly.' },
];

export const SEED_TAGS = ['carlton', 'cbd', 'coffee', 'fitzroy', 'markets', 'parks', 'street-art', 'trams'];

export const SEED_POSTS: SeedPost[] = [
  {
    title: 'A first-timer’s guide to Hosier Lane',
    slug: 'first-timers-guide-to-hosier-lane',
    category: 'city-guides',
    tags: ['cbd', 'street-art'],
    excerpt: 'Melbourne’s best-known street art lane changes every week. Here is how to see it properly, when to go, and what to do with the rest of the afternoon.',
    seoTitle: 'Hosier Lane, Melbourne: a first-timer’s guide',
    seoDescription: 'When to visit Hosier Lane, what you will actually see, and where to go next — written for someone standing at the Flinders Street end for the first time.',
    seoKeywords: 'hosier lane, melbourne street art, cbd, laneways',
    body: `Hosier Lane runs one short block off Flinders Street, opposite Federation Square, and it is the first place most visitors are sent when they ask where to find Melbourne's street art. That reputation is deserved, but it also means the lane is rarely quiet and almost never the same twice.

## What you are looking at

The walls are painted over continuously. A piece you photographed in the morning can be gone by the weekend, and that impermanence is the point rather than a problem — the lane is a working surface, not a gallery. Do not expect to find a particular mural again on a second visit.

## When to go

Early morning, before about nine, is the only reliably quiet window. Weekend afternoons are busy with photographers and wedding parties, and the lane is narrow enough that a dozen people fills it. The light is best in the middle of the day, when it reaches the lower half of the walls.

## Photographing it considerately

People live and work along the lane. Rutledge Lane, which joins it halfway down, has residential entrances. Keep doorways clear, and treat anyone working on a wall as someone at work rather than part of the scenery.

## Where to go next

Federation Square is directly across Flinders Street. If you would rather keep walking, Degraves Street is five minutes west and trades street art for coffee, and the riverside path at Southbank is a short walk over Princes Bridge.`,
    image: {
      file: 'File:Hosier Lane Melbourne. (21380271866).jpg',
      alt: 'Painted walls and stencil work covering both sides of Hosier Lane, Melbourne',
      credit: 'Bernard Spragg. NZ',
      rightsNote: 'CC0 1.0 (public domain dedication) via Wikimedia Commons.',
    },
  },
  {
    title: 'Queen Victoria Market, without the queue',
    slug: 'queen-victoria-market-without-the-queue',
    category: 'food-and-drink',
    tags: ['cbd', 'markets'],
    excerpt: 'The market rewards a plan. Which sheds to start in, what time the good produce goes, and how to shop it like someone who does it weekly.',
    seoTitle: 'Queen Victoria Market: how to shop it properly',
    seoDescription: 'Opening days, which shed is which, and the timing that decides whether you queue for twenty minutes or walk straight up to the counter.',
    seoKeywords: 'queen victoria market, melbourne markets, produce, deli hall',
    body: `Queen Victoria Market covers two city blocks at the top of Elizabeth Street and has been trading on the site since the nineteenth century. It is big enough that arriving without a plan usually means walking the same aisle twice.

## Know which part you are in

The open sheds hold fruit and vegetables. The Deli Hall — indoors, on the Victoria Street side — holds cheese, smallgoods, bread and coffee. Meat and fish have their own hall beside it. Most first visits go wrong by starting at the wrong end and running out of time.

## Timing

The market is closed Mondays and Wednesdays. Early is better for choice and later is better for price: traders discount produce in the last hour, and on a Saturday afternoon that is a genuine saving, though the selection by then is whatever is left.

## Practical things

Bring a bag and bring cash — many stalls take cards, but not all, and the queue moves faster when you do not. If you are buying more than you can carry comfortably, the Elizabeth Street end is closest to the tram stops.

## Worth staying for

The Deli Hall is the part people come back for: a handful of stalls there have been run by the same families for decades, and they will tell you what is good this week if you ask.`,
    image: {
      file: 'File:Queen Victoria Market from above. December 2022.jpg',
      alt: 'Queen Victoria Market seen from above, showing the long rows of open trading sheds',
      credit: 'Bob Tan',
      rightsNote: 'CC BY 4.0 via Wikimedia Commons.',
    },
  },
  {
    title: 'Using Melbourne’s trams without thinking about it',
    slug: 'using-melbourne-trams',
    category: 'getting-around',
    tags: ['cbd', 'trams'],
    excerpt: 'The Free Tram Zone, which routes actually go where you want, and the small habits that make the network feel simple.',
    seoTitle: 'Melbourne trams explained: zones, fares and routes',
    seoDescription: 'How the Free Tram Zone works, when you need to touch on, and the handful of routes that cover most of what a visitor wants to reach.',
    seoKeywords: 'melbourne trams, free tram zone, myki, public transport',
    body: `Melbourne runs the largest tram network in the world, and for most of the city centre it is the fastest way to move short distances without thinking about parking.

## The Free Tram Zone

Travel wholly inside the Free Tram Zone — broadly the central grid, Docklands and the Queen Victoria Market end — costs nothing and needs no card. You do not touch on, and you should not: touching on inside the zone can charge you for a journey you did not take.

## Outside the zone

Beyond it you need a myki card, touched on when you board. Trams do not sell cards, so buy one before you travel: most 7-Eleven stores, staffed stations and the PTV hubs have them.

## Routes worth remembering

Route 96 runs from Southern Cross through the city to St Kilda beach. Route 86 runs up Brunswick Street through Fitzroy. Route 19 covers Sydney Road. Between those three you can reach a large share of what people actually visit.

## Small habits

Trams stop only at marked stops, and many in the centre are island platforms in the middle of the road — cross at the lights, not between cars. If the tram is crowded, move down the aisle rather than standing at the doors; it is the difference between a smooth run and a stop that takes a minute.`,
    image: {
      file: 'File:AUS Melbourne, Central Business District, Bourke Street 001.jpg',
      alt: 'A tram on Bourke Street in Melbourne’s central business district',
      credit: '-wuppertaler',
      rightsNote: 'CC BY 4.0 via Wikimedia Commons.',
    },
  },
  {
    title: 'An afternoon in the Royal Botanic Gardens',
    slug: 'afternoon-royal-botanic-gardens',
    category: 'city-guides',
    tags: ['parks'],
    excerpt: 'Thirty-eight hectares beside the Yarra, ten minutes from Flinders Street. What to see if you have an hour, and what to see if you have a day.',
    seoTitle: 'Royal Botanic Gardens Melbourne: what to see',
    seoDescription: 'The lake, the fern gully and the Aboriginal heritage walk — a practical route through the Royal Botanic Gardens for an hour or an afternoon.',
    seoKeywords: 'royal botanic gardens, melbourne parks, gardens, yarra',
    body: `The Royal Botanic Gardens sit on the south bank of the Yarra, a short walk or a single tram stop from the city, and they are the easiest way to spend an afternoon in Melbourne without spending anything.

## If you have an hour

Enter at Gate F on Alexandra Avenue and walk the Ornamental Lake anticlockwise. It is flat, it takes about forty minutes at a slow pace, and it passes most of what people photograph — the lake, the lawns, and the view back across the water to the city towers.

## If you have longer

The Fern Gully is worth the detour: a cool, shaded path that feels a long way from the street you arrived on. The Guilfoyle's Volcano reservoir at the southern end is the best view in the gardens and the least crowded.

## Aboriginal heritage

The gardens sit on the land of the Boon Wurrung and Woiwurrung peoples of the Kulin Nation. The Aboriginal Heritage Walk, run by Aboriginal guides, is the most direct way to understand the site as something much older than the garden laid over it.

## Practical things

There is no charge to enter. The gardens close at sunset, which in winter means as early as half past five. The nearest tram stop is on St Kilda Road; the walk from Flinders Street Station takes about fifteen minutes across Princes Bridge.`,
    image: {
      file: 'File:Lake in Melbourne Botanic Gardens 20180726-016.jpg',
      alt: 'The ornamental lake in the Royal Botanic Gardens, Melbourne, with trees reflected in still water',
      credit: 'Gary Houston',
      rightsNote: 'CC0 1.0 (public domain dedication) via Wikimedia Commons.',
    },
  },
  {
    title: 'Lygon Street after dark',
    slug: 'lygon-street-after-dark',
    category: 'food-and-drink',
    tags: ['carlton', 'coffee'],
    excerpt: 'Carlton’s Italian quarter is louder and better than its reputation suggests. How to pick a table, and what the street is actually known for.',
    seoTitle: 'Lygon Street, Carlton: an evening guide',
    seoDescription: 'Where Melbourne’s Italian quarter is worth your evening, how to choose between the tables on offer, and what the street is genuinely known for.',
    seoKeywords: 'lygon street, carlton, italian, melbourne dining',
    body: `Lygon Street in Carlton has been Melbourne's Italian quarter since the post-war migration of the 1950s, and it is where the city's espresso culture started before it spread into the laneways.

## Choosing a table

The stretch between Grattan and Elgin is the busiest and the most touristed. If someone is standing outside trying to talk you in, keep walking: the places with a queue of locals rather than a host on the footpath are consistently better, and they are usually one block further north.

## What the street is known for

Two claims are worth knowing. Melbourne's first espresso machine is generally credited to a Lygon Street café in the 1950s, and the street has kept that coffee culture since. The other is simply longevity — several of the family restaurants here have been running for more than fifty years.

## Beyond dinner

Readings bookshop stays open late and is one of the best independent bookshops in the country. The Cinema Nova, just off the main strip, runs arthouse and late sessions.

## Getting there and back

Route 1 and Route 6 trams run up Lygon Street itself. The walk back to the city takes about twenty-five minutes and is well lit the whole way down Swanston Street.`,
    image: {
      file: 'File:Lygon Street, Carlton at night.jpg',
      alt: 'Shopfronts and restaurant lights along Lygon Street, Carlton, at night',
      credit: 'Nathan Jones',
      rightsNote: 'CC BY 2.0 via Wikimedia Commons.',
    },
  },
  {
    title: 'Fitzroy on foot',
    slug: 'fitzroy-on-foot',
    category: 'city-guides',
    tags: ['fitzroy', 'street-art'],
    excerpt: 'Brunswick Street, Gertrude Street and the quiet blocks between them. A walking route through Melbourne’s oldest suburb.',
    seoTitle: 'Fitzroy walking guide: Brunswick and Gertrude Streets',
    seoDescription: 'A walking route through Fitzroy — where to start, which cross streets are worth the detour, and how long the whole thing takes.',
    seoKeywords: 'fitzroy, brunswick street, gertrude street, melbourne walks',
    body: `Fitzroy was Melbourne's first suburb, and it still reads that way on foot: terrace housing, narrow side streets, and two very different main roads a few blocks apart.

## Start on Gertrude Street

Gertrude Street is the quieter of the two and the better place to start. It runs from Smith Street down towards Carlton Gardens, and the galleries and small shops along it are easier to take in before the day gets busy.

## Then Brunswick Street

Turn north and Brunswick Street is louder — bars, record shops, bookshops and the bulk of the street art. It runs for well over a kilometre; the section between Gertrude and Johnston is the densest and the part most people mean when they say Brunswick Street.

## The blocks in between

The cross streets are the reason to walk rather than take the tram. Rose, Kerr and Johnston all have something worth stopping for, and the residential blocks between them are where the suburb's nineteenth-century housing is still intact.

## How long it takes

Gertrude Street to the top of Brunswick Street is about an hour at a walking pace, or a whole afternoon if you stop. Route 86 runs the length of Brunswick Street when you have had enough.`,
    image: {
      file: 'File:Fitzroy Melbourne.jpg',
      alt: 'Shopfronts and painted walls along a street in Fitzroy, Melbourne',
      credit: 'Marcus Bichel Lindegaard',
      rightsNote: 'CC BY 2.0 via Wikimedia Commons.',
    },
  },
];
