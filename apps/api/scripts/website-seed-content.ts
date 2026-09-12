/**
 * Demonstration content for the website surfaces that have none: the FAQ page,
 * the testimonials on the home page, the clients-and-partners strip, and the
 * comments under the seeded articles.
 *
 * Written out rather than composed, because there are a few dozen of each and
 * every one is read closely — an FAQ answer that does not answer anything, or
 * a comment that does not sound like a person, is worse than an empty list.
 *
 * Fictional on the same terms as the rest: invented people, invented
 * organisations, addresses on domains that belong to nobody.
 */

export interface SeedFaq {
  question: string;
  /** Markdown; rendered and sanitised on the way in, as the editor's would be. */
  answer: string;
  group: string;
  published?: boolean;
}

export const SEED_FAQS: SeedFaq[] = [
  // Listings
  { group: 'Listings', question: 'How do I add my business to Melbourne Sphere?', answer: 'Send us the details through the contact page and we will get back to you. Every listing is checked by an editor before it appears: we confirm the business is in Melbourne, that the contact details work, and that you are happy with the wording and images.' },
  { group: 'Listings', question: 'Does it cost anything to be listed?', answer: 'No. A standard listing is free, and there is no paid placement in search results. Featured placements appear in a separate, labelled block above results and never change the order of the results themselves.' },
  { group: 'Listings', question: 'Which suburbs do you cover?', answer: 'Melbourne only — the CBD and the local areas immediately around it. Each area we cover has a page of its own, and a business must be in one of them to be listed. We are not planning to expand to other cities.' },
  { group: 'Listings', question: 'How do I change my opening hours or contact details?', answer: 'Email the editors from the address on your listing and tell us what has changed. Hours are supplied by the business, so we only change them when the business asks us to.' },
  { group: 'Listings', question: 'Can I have my listing removed?', answer: 'Yes, at any time, and without giving a reason. Write to the editors from an address we can connect to the business and we will unpublish it the same day. The public page is then removed and the old address returns a "not found".' },
  { group: 'Listings', question: 'Why does my listing say "hours not published"?', answer: 'Because we have not been given them. A listing without hours is still published — it just does not claim to know when you are open, which is better than guessing. Send them through and they will appear.' },
  { group: 'Listings', question: 'How long does it take for a new listing to appear?', answer: 'Usually two to three working days. Most of that is the editorial check: confirming the address, trying the phone number and reading the description. We will tell you if anything is holding it up.' },
  // Reviews
  { group: 'Reviews', question: 'Are reviews checked before they appear?', answer: 'Yes. Every review is read by a moderator before it is published. We check it describes a real experience of the business and that it does not name individual staff, repeat hearsay or contain personal information.' },
  { group: 'Reviews', question: 'Can a business pay to have a review removed?', answer: 'No. Reviews are removed only when they break the guidelines — and if we remove one, the reason is recorded. A business owner can reply to us about a review, but paying for its removal is not something we offer.' },
  { group: 'Reviews', question: 'Why has my review not appeared?', answer: 'It may still be waiting for a moderator, or it may not have met the guidelines. The most common reasons are naming an individual, describing something that happened to somebody else, or including a phone number or email address.' },
  { group: 'Reviews', question: 'Is my email address published with my review?', answer: 'No. We ask for it so we can contact you about the review if we need to, and it is stored encrypted. It is never shown on the site and never given to the business.' },
  { group: 'Reviews', question: 'Can I edit or delete a review I left?', answer: 'Write to us and we will remove it. We do not offer editing: a review that changes after people have read it is not much use to anybody, so we take the old one down instead.' },
  // Enquiries
  { group: 'Enquiries', question: 'What happens when I send an enquiry?', answer: 'It goes straight to the business by email. We do not see a copy beyond what is needed to deliver it and to tell you if the delivery failed, and we do not pass your address to anyone else.' },
  { group: 'Enquiries', question: 'How long should I wait for a reply?', answer: 'That is up to the business — most reply within a day or two. If your message could not be delivered at all, we will know about it, and you can tell us through the contact page so the listing can be corrected.' },
  { group: 'Enquiries', question: 'Why can I not send an enquiry to some businesses?', answer: 'Because they have not given us an address to deliver it to. Those listings show a phone number or a website instead, which is more honest than a form that goes nowhere.' },
  // Your details
  { group: 'Your details', question: 'What do you do with my personal information?', answer: 'We keep as little as we can and only for as long as it is useful. Contact details you send with a review or an enquiry are stored encrypted and are not sold, shared or used for marketing. The privacy policy sets out the detail.' },
  { group: 'Your details', question: 'Do you use tracking cookies?', answer: 'Only if you agree to them. Nothing that tracks you loads until you choose "accept" on the banner, and you can change your mind at any time. The site works exactly the same if you decline.' },
  { group: 'Your details', question: 'How do I ask for my information to be deleted?', answer: 'Write to us through the contact page and say what you would like removed. We will confirm what we hold, delete what we can, and tell you plainly if something has to be kept and why.' },
  // About
  { group: 'About Melbourne Sphere', question: 'Who writes the guides and the category pages?', answer: 'A small editorial team in Melbourne. The guides are written by people who have been to the places they describe, and nothing in them is paid for by the businesses mentioned.' },
  { group: 'About Melbourne Sphere', question: 'How do you decide what appears first in search results?', answer: 'Results are ordered by how well they match what you searched for, and then by rating and how recently the listing was updated. No business can pay to move up. Featured placements are shown separately and labelled.' },
  { group: 'About Melbourne Sphere', question: 'I have found a mistake. How do I report it?', answer: 'Use the contact page, or the "report" link on a review or comment. Tell us what is wrong and where you saw it — a link helps enormously — and we will correct it and say so.' },
  { group: 'About Melbourne Sphere', question: 'Do you have an app?', answer: 'No, and we have no plans for one. The site is built to work properly on a phone browser, which is the same thing without asking you to install anything.', published: false },
];

export interface SeedTestimonial {
  name: string;
  relationship: string;
  quote: string;
  /** Slug of a seeded listing, when the quote is from one of them. */
  business?: string;
  published?: boolean;
}

export const SEED_TESTIMONIALS: SeedTestimonial[] = [
  { name: 'Marika Stevens', relationship: 'Owner', business: 'lygon-lane-espresso', quote: 'We had a website nobody could find and a Google listing with the wrong hours. Within a month of being on Melbourne Sphere we were getting people through the door who said they found us here. The editors actually checked our details with us first, which nobody else does.' },
  { name: 'Daniel Okonkwo', relationship: 'Owner', business: 'kensington-plumbing-and-gas', quote: 'Most directories sell you a package and then sell your competitor a better one. This one just lists you properly. Half our new work in winter came through the listing.' },
  { name: 'Sophie Tran', relationship: 'Visitor, Carlton', quote: 'I moved to Carlton in February and used the area page to find a vet, a bakery and somebody to fix the heater. All three were exactly what the listings said they were, which sounds like a low bar until you have used the alternatives.' },
  { name: 'Reuben Clarke', relationship: 'Owner', business: 'bay-street-fish-market', quote: 'My father ran this shop for thirty years without a website. The listing was written in an afternoon, the photographs are honest, and it has brought us a new generation of customers from across the river.' },
  { name: 'Anita Bose', relationship: 'Visitor, Docklands', quote: 'The opening hours are right. I know that is a strange thing to praise, but I have been caught out enough times to notice when a directory keeps them current.' },
  { name: 'Tom Whelan', relationship: 'Owner', business: 'errol-street-barbers', quote: 'A customer told me she picked us because the review said we were good with nervous kids. That review went up because somebody read it first and checked it was fair. That matters to a small shop.' },
  { name: 'Grace Mbeki', relationship: 'Visitor, North Melbourne', quote: 'I wanted a physio who did clinical Pilates and was open before work. Two filters and I had three options, all of them real. That is all I wanted a directory to do.' },
  { name: 'Peter Lawson', relationship: 'Owner', business: 'flinders-lane-books', quote: 'We have been on Flinders Lane since 1998 and have watched a lot of listing sites come and go. This is the first one that asked what we actually do before writing about us.' },
  { name: 'Hannah Reid', relationship: 'Visitor, Kensington', quote: 'The enquiry form went straight to the business and they rang me back within the hour. No sales calls afterwards from anybody else, which is more than I can say for the last site I used.' },
  { name: 'Julian Marsh', relationship: 'Owner', business: 'harbour-kitchen-docklands', quote: 'We are in Docklands, which people write off before they have been. Having a proper area page with our listing on it has genuinely changed who walks in on a weeknight.' },
  { name: 'Elif Demir', relationship: 'Visitor, Southbank', quote: 'I like that featured listings are in their own labelled box. I know what I am looking at, and the rest of the results are in the order the site says they are in.', published: false },
];

export interface SeedPartner {
  name: string;
  relationship: string;
  website: string;
  note: string;
  /** Two letters for the generated wordmark, and the colour behind them. */
  initials: string;
  colour: string;
  published?: boolean;
}

export const SEED_PARTNERS: SeedPartner[] = [
  { name: 'Carlton Traders Association', relationship: 'Local business association', website: 'https://carltontraders.example.org', note: 'Logo and name supplied by their communications officer, 4 March 2026, for use on the partners strip.', initials: 'CT', colour: '#0B1F3A' },
  { name: 'Docklands Chamber of Commerce', relationship: 'Local business association', website: 'https://docklandschamber.example.org', note: 'Written permission from the chamber secretary, 12 March 2026.', initials: 'DC', colour: '#0369A1' },
  { name: 'North & West Melbourne Business Network', relationship: 'Business network', website: 'https://nwmbusiness.example.org', note: 'Permission by email from the network coordinator, 2 April 2026.', initials: 'NW', colour: '#155E75' },
  { name: 'Victoria Small Business Advisory', relationship: 'Advisory service', website: 'https://vicsmallbusiness.example.org', note: 'Brand usage agreed with their partnerships team, 19 April 2026, current for twelve months.', initials: 'VS', colour: '#065F46' },
  { name: 'Melbourne Makers Collective', relationship: 'Makers and traders collective', website: 'https://melbournemakers.example.org', note: 'Logo supplied with the partnership pack, 7 May 2026.', initials: 'MM', colour: '#7C2D12' },
  { name: 'Inner North Food Alliance', relationship: 'Hospitality group', website: 'https://innernorthfood.example.org', note: 'Permission recorded in the partnership email thread, 21 May 2026.', initials: 'IN', colour: '#9D174D' },
  { name: 'Southbank Retail Forum', relationship: 'Retail forum', website: 'https://southbankretail.example.org', note: 'Approved by the forum chair on a call, 3 June 2026; confirmation email on file.', initials: 'SR', colour: '#4C1D95' },
  { name: 'Yarra Valley Growers Co-op', relationship: 'Produce supplier network', website: 'https://yarragrowers.example.org', note: 'Logo pack received from the co-op office, 15 June 2026.', initials: 'YG', colour: '#3F6212', published: false },
];

export interface SeedComment {
  /** Slug of the seeded article this belongs under. */
  post: string;
  name: string;
  text: string;
  status: 'approved' | 'pending' | 'rejected';
  daysAgo: number;
  /** Set for a comment an editor has redacted; replaces the public text. */
  redactedTo?: string;
  redactionReason?: string;
  moderationReason?: string;
}

/**
 * Comments across the seeded articles, in every state the moderation queue has
 * to deal with: published, waiting, refused, and one that was published after
 * a personal detail was taken out of it.
 */
export const SEED_COMMENTS: SeedComment[] = [
  // Hosier Lane
  { post: 'first-timers-guide-to-hosier-lane', name: 'Bianca R.', status: 'approved', daysAgo: 4, text: 'Went on a Sunday morning as suggested and had the lane almost to myself. Worth the early alarm.' },
  { post: 'first-timers-guide-to-hosier-lane', name: 'Duc N.', status: 'approved', daysAgo: 11, text: 'Good point about the walls changing. I photographed a piece in March that was gone by May — that is the whole point of it really.' },
  { post: 'first-timers-guide-to-hosier-lane', name: 'Steph M.', status: 'approved', daysAgo: 26, text: 'Would add: the coffee place at the Flinders Street end opens at seven, which makes an early visit much more appealing.' },
  { post: 'first-timers-guide-to-hosier-lane', name: 'Anon', status: 'rejected', daysAgo: 19, text: 'This is rubbish, the whole lane is a tourist trap and anyone who likes it has no taste whatsoever.', moderationReason: 'Abusive toward other readers rather than about the article' },
  { post: 'first-timers-guide-to-hosier-lane', name: 'Martin K.', status: 'pending', daysAgo: 1, text: 'Is the Rutledge Lane end still accessible? I read somewhere it had been closed off for works.' },
  // Queen Victoria Market
  { post: 'queen-victoria-market-without-the-queue', name: 'Leila F.', status: 'approved', daysAgo: 6, text: 'The advice about going late on a Tuesday is correct and I am now slightly annoyed that everyone knows it.' },
  { post: 'queen-victoria-market-without-the-queue', name: 'Ivan P.', status: 'approved', daysAgo: 15, text: 'One thing to add — most of the deli hall stalls will vacuum-pack things for you if you ask, which makes the tram home a lot less awkward.' },
  { post: 'queen-victoria-market-without-the-queue', name: 'Rosa T.', status: 'approved', daysAgo: 33, text: 'I have shopped here for twenty years and still learned something about the Saturday timings. Good piece.' },
  { post: 'queen-victoria-market-without-the-queue', name: 'Greg H.', status: 'approved', daysAgo: 48, redactedTo: 'Great guide. The fish stall on the corner is the one I always use — ask for the whole fish and they will fillet it while you wait.', redactionReason: 'A stallholder was named alongside a personal remark', text: 'Great guide. The fish stall on the corner is the one I always use — ask for Ronnie, he will fillet it while you wait and he owes me a favour anyway.' },
  { post: 'queen-victoria-market-without-the-queue', name: 'Priya S.', status: 'pending', daysAgo: 2, text: 'Does the night market run through winter or only over summer?' },
  // Trams
  { post: 'using-melbourne-trams', name: 'Callum W.', status: 'approved', daysAgo: 3, text: 'The bit about the free tram zone boundary is the thing every visitor gets wrong. Clearest explanation I have read.' },
  { post: 'using-melbourne-trams', name: 'Yui T.', status: 'approved', daysAgo: 9, text: 'Touching off inside the free zone does nothing but it does not cost you anything either — worth saying, because people panic about it.' },
  { post: 'using-melbourne-trams', name: 'Ahmed B.', status: 'approved', daysAgo: 21, text: 'Would have loved this article when I arrived. Took me two weeks to work out the stop numbers were sequential from the city.' },
  { post: 'using-melbourne-trams', name: 'Jenny L.', status: 'approved', daysAgo: 40, text: 'Route 96 to the beach on a hot day is still the best value hour in Melbourne.' },
  { post: 'using-melbourne-trams', name: 'Unknown', status: 'rejected', daysAgo: 30, text: 'Buy cheap myki cards here www.example-scam-site.test cheapest in australia click now', moderationReason: 'Advertising an unrelated site' },
  // Botanic Gardens
  { post: 'afternoon-royal-botanic-gardens', name: 'Margot D.', status: 'approved', daysAgo: 5, text: 'The Fern Gully suggestion is perfect on a hot afternoon. Ten degrees cooler and almost empty.' },
  { post: 'afternoon-royal-botanic-gardens', name: 'Sanjay K.', status: 'approved', daysAgo: 17, text: 'The Tan is busier than the article suggests on weekends, but the garden paths themselves are quiet enough.' },
  { post: 'afternoon-royal-botanic-gardens', name: 'Fiona A.', status: 'approved', daysAgo: 29, text: 'Took my mother, who uses a walking frame. The main paths were all manageable — good to know for anyone wondering.' },
  { post: 'afternoon-royal-botanic-gardens', name: 'Oliver M.', status: 'pending', daysAgo: 1, text: 'Are the Aboriginal Heritage Walk tours still running on Thursdays? The article mentions them but not the days.' },
  // Lygon Street
  { post: 'lygon-street-after-dark', name: 'Carla V.', status: 'approved', daysAgo: 7, text: 'Finally an article about Lygon Street that does not just list the same four places. The bit about the back half past Faraday is spot on.' },
  { post: 'lygon-street-after-dark', name: 'Ben S.', status: 'approved', daysAgo: 14, text: 'Went last Friday on the strength of this. The gelato queue at eleven at night is a genuinely Melbourne sight.' },
  { post: 'lygon-street-after-dark', name: 'Nadine O.', status: 'approved', daysAgo: 38, text: 'Parking is the one thing I would add — after six the side streets are permit-only and they do check.' },
  { post: 'lygon-street-after-dark', name: 'Hamish G.', status: 'pending', daysAgo: 3, text: 'Any recommendations for somewhere still serving after midnight midweek?' },
  // Fitzroy
  { post: 'fitzroy-on-foot', name: 'Tessa L.', status: 'approved', daysAgo: 8, text: 'Did the whole walk on Saturday. About two hours with stops, and the order of it works — you finish where you want to sit down.' },
  { post: 'fitzroy-on-foot', name: 'Raf M.', status: 'approved', daysAgo: 20, text: 'Good to see Gertrude Street get a mention rather than just Brunswick Street.' },
  { post: 'fitzroy-on-foot', name: 'Priyanka N.', status: 'approved', daysAgo: 31, text: 'The map would be even better with the tram stops marked, but the directions were clear enough to follow on foot.' },
  { post: 'fitzroy-on-foot', name: 'Dan W.', status: 'approved', daysAgo: 55, text: 'Went with two kids, aged six and nine. The second half was too long for them — worth splitting it if you have small legs.' },
  { post: 'fitzroy-on-foot', name: 'Kate B.', status: 'pending', daysAgo: 2, text: 'Is the walk doable with a pram? Some of those footpaths looked narrow in the photos.' },
];
