Melbourne Sphere Technical SRS

Software requirements specification

Version 1.1 • 7 September 2026 • MVP baseline with the administrator access-control extension (section 10)

Melbourne Sphere is a Melbourne only business directory and editorial blog. Visitors discover businesses, read local articles, submit moderated reviews and comments, and send enquiries without creating accounts. Administrators control all listings, publishing, moderation and website settings.

This document defines the implementation contract for the product, engineering, design, testing and operations teams. It consolidates the agreed architecture and scope into numbered requirements, data rules, service boundaries and verifiable release criteria. It authorizes planning only; application implementation is a separate activity.

## Document control

Document ID: MS SRS 001. Business owner: Melbourne Sphere client. Technical owner: delivery technical lead. Prepared for client and delivery team. Reviewers: product owner, engineering lead, QA lead and operations owner. Individual names and approval dates are to be recorded at baseline acceptance.

Authority: the latest approved revision of this SRS governs implementation and future audits. Explicit client decisions override earlier planning suggestions. Sections marked Future are excluded from MVP. Proposed operating thresholds are baseline engineering targets, not claims about a running service or existing client service agreement.

Change rule: record the requirement IDs affected, reason, data and security impact, migration and test impact, approver and effective version. Do not silently change scope through tickets, UI mockups or implementation details. Retain superseded revisions and link release evidence to the exact SRS version.

| **Revision** | **Date**   | **Change**                                                        | **Approval state**                       |
| ------------ | ---------- | ----------------------------------------------------------------- | ---------------------------------------- |
| 1.0          | 5 Sep 2026 | Consolidated Melbourne only scope and complete technical baseline | Prepared for client and technical review |
| 1.1          | 7 Sep 2026 | Administrator access control extended at explicit client instruction: roles carry permissions, roles are assigned to administrators, permissions may also be granted directly to an administrator, and the admin interface shows only what the signed-in administrator may use. Adds RBAC 002–RBAC 012 and amends RBAC 001 and ADM 003. Requirement IDs affected: RBAC 001, ADM 003 (amended), RBAC 002–012 (new). Reason: client requirement for staff roles and per-administrator access. Data impact: new direct-permission, role and permission-catalogue columns and one authorization audit table, delivered by reviewed migrations; no existing requirement withdrawn. Security impact: authorization becomes an explicit backend module with default deny, cache invalidation and audit; hiding interface elements remains insufficient. Test impact: effective-permission, enforcement, invariant, cache and interface suites in section 21. Approver: client instruction of 7 Sep 2026, recorded by the delivery technical lead. | Approved by client instruction; pending countersignature at baseline acceptance |

## Reading guide

Sections 1–3 establish scope, reference interpretation and architecture. Sections 4–12 specify public and admin behavior. Sections 13–17 define data, APIs, events and security. Sections 18–22 cover quality, operations, verification and delivery. Sections 23–24 record decisions and source references.

# Contents

Select a section to navigate to its requirements. Requirement IDs remain stable across revisions.

[1 Scope and requirement governance](#section1)

[2 Reference and public experience](#section2)

[3 Agreed architecture and repository](#section3)

[4 Hero banner and search interaction](#section4)

[5 Directory search and discovery](#section5)

[6 Business listings and local areas](#section6)

[7 Ratings reviews and abuse reporting](#section7)

[8 Business enquiries and contact handling](#section8)

[9 Blog and editorial content](#section9)

[10 Administration and permissions](#section10)

[11 Media and site configuration](#section11)

[12 SEO indexing and structured data](#section12)

[13 Data model and relational invariants](#section13)

[14 Editorial and operational data model](#section14)

[15 REST contract and public API](#section15)

[16 Admin API and module ownership](#section16)

[17 Events caching and consistency](#section17)

[18 Security privacy and retention](#section18)

[19 Non functional requirements](#section19)

[20 Deployment backups and monitoring](#section20)

[21 Verification and acceptance matrix](#section21)

[22 Implementation sequence and release gates](#section22)

[23 Decisions risks and future scope](#section23)

[24 Source register and audit handover](#section24)

# 1 Scope and requirement governance

## Mandatory scope

**SCP 001 —** The MVP shall serve Melbourne, Victoria, Australia only. City, country and timezone are server owned constants: Melbourne, AU and Australia/Melbourne. There shall be no city selector, country selector, city CRUD, multi tenant routing, geographic tenancy key or city hierarchy. Local areas are subdivisions within the approved Melbourne boundary, not additional cities.

**SCP 002 —** Only administrator accounts shall exist. Businesses request additions or corrections by email; external authors submit content by email. No public registration, ownership claim, business dashboard, reviewer profile, self service listing submission or public publishing endpoint shall be exposed.

**SCP 003 —** MVP includes directory browsing, categories, Melbourne local areas, keyword/service search, business details, ratings and reviews, enquiries, blog categories/tags/authors, comments, reporting, moderation, media, SEO, static information pages and secure administration. Manual featured placement is included; paid promotion and billing are future scope.

## Interpretation and precedence

Every numbered requirement is mandatory unless explicitly labelled conditional or future. "Shall" is testable behavior. Engineering defaults may be changed only through the change rule. The user's Melbourne only instruction supersedes the prior plan's generic location hierarchy and suburb examples; those examples do not authorize additional territory.

**SCP 004 —** Listing eligibility shall be checked against a client approved boundary and local area allowlist. Until that decision is recorded, use the City of Melbourne council area as the conservative planning boundary, not all Greater Melbourne. The exact geography is a pre launch content gate. No listing shall be published merely because its postcode or free text address contains "Melbourne". Service area businesses must operate within the approved boundary and meet the same editorial verification rule.

## Actors and responsibility

| **Actor**               | **Permitted activity**                                    | **Accountability**                                  |
| ----------------------- | --------------------------------------------------------- | --------------------------------------------------- |
| Visitor                 | Browse and submit forms without login                     | Follow published content guidelines                 |
| Super Admin             | Manage all content, moderation and settings               | Verify accuracy, rights and publication decisions   |
| Technical operator      | Deploy, restore and monitor through infrastructure access | Least privilege access and incident handling        |
| Business or contributor | Request changes or submit content by email                | Provide accurate information and publication rights |

**SCP 005 —** Product approval shall record final boundary, brand assets, contact recipient, content policy and vendor choices in section 23. A missing decision must not be replaced by fabricated production information. Core architecture and MVP functions remain the baseline while these launch configuration decisions are resolved.

Acceptance: QA shall verify no public account journey or city switching exists and shall reject an out of boundary listing through both the admin UI and a direct API request.

# 2 Reference and public experience

## Reference interpretation

The supplied hero reference shows a wide city photograph, dark blue overlay, large centered heading, counters and a rounded horizontal search bar with a location segment, a discovery segment and a prominent search icon. The requested rotating or scrolling headline is a behavior requirement supplied by the client; timing cannot be inferred from a still image.

The Boca Locals screenshots establish directory cards, galleries, services, opening hours, contact actions, review forms, blog cards/articles and About and Contact pages. The live homepage also demonstrates category discovery and recent articles \[R2\]. These are functional references, not assets to copy.

**UX 001 —** Use original Melbourne branding, licensed Melbourne photography and original copy. Sky blue and navy are primary colors, with balanced light and dark surfaces, restrained gradients and subtle glass treatments. Background opacity and blur shall never compromise contrast or content performance. Ant Design remains the admin component foundation; public styling uses Tailwind and shadcn/ui.

**UX 002 —** Public navigation shall include Home, Directory, Blog, About and Contact, plus an email based "Add or update a business" action. Footer links shall include Privacy, Terms and Review guidelines. Navigation, breadcrumbs and content headings shall remain usable by keyboard and screen reader.

## Public route contract

| **Route**                                          | **Purpose**                   | **Index policy**               |
| -------------------------------------------------- | ----------------------------- | ------------------------------ |
| /                                                  | Hero and discovery home       | Index                          |
| /directory                                         | All published businesses      | Index                          |
| /directory/category/{slug}                         | Curated category landing      | Index if substantive           |
| /directory/area/{slug}                             | Approved Melbourne local area | Index if substantive           |
| /business/{slug}                                   | Stable business detail        | Index when published           |
| /blog and /blog/{slug}                             | Blog index and article        | Index when published           |
| /blog/category/{slug} and /blog/tag/{slug}         | Editorial collections         | Index only curated collections |
| /about /contact /privacy /terms /review-guidelines | Information and policies      | Index by default               |
| /directory?q=… and filtered combinations           | Dynamic search results        | Noindex follow                 |
| /admin and admin subroutes                         | Restricted application        | Noindex and authentication     |

**UX 003 —** No generic city route shall be introduced. Category plus area combinations use query parameters in MVP, not mass generated location pages. A short stable business slug shall not contain its category. Persisted slugs change only by explicit admin action with redirects.

Acceptance: navigation shall reach a business and an article within three deliberate interactions from the homepage; deep links, refresh and back navigation shall preserve results state.

# 3 Agreed architecture and repository

**ARC 001 —** Implement a pnpm workspace monorepo with TypeScript throughout. Pin compatible supported versions in the lockfile and record them in the architecture decision register before development; the SRS does not assume that "latest" packages are mutually compatible.

| **Boundary**            | **Technology**                            | **Responsibility**                                                |
| ----------------------- | ----------------------------------------- | ----------------------------------------------------------------- |
| apps/web                | Next.js and React                         | Server rendered public pages, metadata, accessible interactions   |
| apps/admin              | React, Refine and Ant Design              | Admin forms, tables, previews and moderation workflows            |
| apps/api                | NestJS                                    | REST /api/v1, validation, authorization and domain transactions   |
| apps/worker             | Nest compatible worker runtime and BullMQ | Email, media, publishing, invalidation and maintenance jobs       |
| packages/database       | Prisma and MySQL                          | Schema, versioned migrations and database access for backend only |
| packages/contracts      | OpenAPI generated TypeScript contracts    | Public and admin clients without persistence models               |
| packages/config         | Shared lint and TypeScript configuration  | Consistent build and quality rules                                |
| packages/ui             | Public Tailwind and shadcn components     | Public design system without admin bundle coupling                |
| infrastructure and docs | Deployment definitions and runbooks       | Environments, operations and decision records                     |

**ARC 002 —** Next.js shall obtain domain data through NestJS. Browser applications shall never access MySQL, Redis or storage credentials. Only API and worker services own Prisma access. Share domain services where a worker needs the same invariant; do not copy publication or moderation rules into clients.

**ARC 003 —** Use MySQL with utf8mb4, Redis for distributed limits/cache and BullMQ, S3 compatible object storage with CDN for approved media, and an email provider adapter. Deploy public web, admin assets, API and worker as independently operable components. Start as a modular monolith, not microservices.

**ARC 004 —** Route browser traffic through one HTTPS origin: / for Next.js, /admin for the admin application, /api/v1 for NestJS. Infrastructure shall preserve client IP only from trusted proxies. The production hostname is configured, not assumed to be owned. Use private networking for database, Redis and worker connections.

**ARC 005 —** Refine is the agreed admin framework. Its data provider shall translate pagination, filters, sorting, errors and custom actions to the REST contract \[R3\]. It does not replace NestJS authorization or generate the complete backend. A vertical slice shall validate nested listing fields, image upload, publishing, permission denial and stale edit handling before broad CRUD development.

Acceptance: apps build independently from one lockfile; browser bundles contain no backend secrets or Prisma client; a vertical slice exercises real API permissions and migrations.

# 4 Hero banner and search interaction

**HERO 001 —** The homepage shall render a full width Melbourne background image with configurable desktop/mobile focal point and a navy overlay. The image shall have defined dimensions, responsive sizes and a prioritized optimized hero rendition. Provide a solid color fallback; do not use autoplay video, unlicensed reference photography or parallax in MVP.

**HERO 002 —** Provide one semantic H1 with a stable accessible meaning such as "Discover Melbourne businesses". A visible phrase may rotate vertically through 2–5 admin managed phrases, for example local services, places to eat and independent shops. Initial text shall be present in server HTML. Rotation defaults to a 4 second dwell and 300 millisecond transition with reserved height, so layout does not shift.

**HERO 003 —** A persistent keyboard accessible pause/resume control shall accompany automatically continuing animation. Respect prefers-reduced-motion by rendering a static first phrase with no motion. Pause while the page is hidden. Do not announce every phrase through a live region; screen readers receive one coherent stable headline. Auto motion controls follow WCAG pause requirements \[R4\].

**HERO 004 —** The rounded search panel shall contain a visibly fixed "Melbourne, Australia" label, a labelled keyword input, a category/service discovery control and a clearly named Search button. The location label is text, not an editable or disabled required field. Do not trust a client supplied city parameter. On mobile, stack controls with a full width action; preserve labels rather than relying only on placeholders.

**HERO 005 —** A single keyword field accepts business names, categories and services. Category selection is optional and constrains results; services are matched via indexed service labels and synonyms. Suggestions shall group categories/services/businesses and support arrows, Enter and Escape. Debounce by about 250 milliseconds, require two characters for suggestions, cap at eight suggestions and ignore stale responses. Search still works when suggestions fail.

**HERO 006 —** Submit via GET to /directory with q and optional category slug. Empty submission opens all listings. Enter and the button behave identically. Search shall be usable without client JavaScript using a server rendered form; enhanced suggestions are progressive. Never auto navigate merely because a suggestion becomes focused.

**HERO 007 —** Do not reproduce the reference's cities counter. Optional category/business counters, if enabled by an admin, shall use published records only and carry accurate labels. Hide counters when their data is unavailable rather than display invented totals.

Acceptance: test at 320, 375, 768, 1024 and 1440 CSS pixels, 200 percent zoom, keyboard only, reduced motion and slow image loading. The form shall remain usable, contrast shall pass and hero movement shall cause no observable layout shift.

# 5 Directory search and discovery

**DIR 001 —** Directory, category and local area pages shall expose published eligible businesses only. Cards include image or fallback, name, primary category, local area, review average/count when available and detail/contact actions. Zero reviews display "No reviews yet", not zero stars. Featured placements carry an explicit "Featured" label.

**DIR 002 —** The API shall combine keyword, category, approved local area and minimum approved rating filters using AND. Category matches include its active descendant categories. Keyword matches name, category labels, services and curated keywords; it shall never search private emails, moderation notes or enquiry content. Filter counts shall be calculated from the same publication scope.

**DIR 003 —** Normalize whitespace and case; q length is 0–120 characters. Use indexed MySQL search through a SearchService abstraction. Name exact/prefix match outranks category/service match, which outranks description match. Short terms and MySQL stop words require a bounded indexed name/service prefix fallback; do not depend exclusively on FULLTEXT defaults. Typos and semantic search are future scope.

**DIR 004 —** Sort choices are relevance, highest rated, newest and name A–Z. Relevance defaults for nonempty q; name A–Z defaults otherwise. Highest rated sorts average descending, approved review count descending, then stable ID. Newest uses firstPublishedAt descending then stable ID. Unrated businesses follow rated businesses for rating sort. Document SQL collation and deterministic tie rules.

**DIR 005 —** Use page numbered pagination, default 20, maximum 50 per request and a bounded maximum accessible result window of 10,000. Return total and pageCount. Reset page to one when filters change. Invalid enum/range inputs return a field error; an unknown valid slug returns an empty result. Pages beyond the result count display an empty state with a link to page one.

**DIR 006 —** Persist q, category, area, minRating, sort and page in the URL. Provide removable filter chips, reset, result count, loading, retry and no result states. Empty results suggest broadening the query or removing filters; do not silently expand geography. A failed backend request shall not be reported as zero matching businesses.

**DIR 007 —** Featured businesses occupy a separate labelled block with at most three eligible matching entries. For a given query, select this set deterministically and exclude those IDs before calculating organic counts and pagination. Keep the same featured set across result pages; reset on filter changes. Featured status shall not bypass matching, geography or publication rules. Paid/sponsored ordering is not part of MVP.

**DIR 008 —** "Open now" filtering is conditional and disabled until complete hours data and daylight saving tests pass. The rest of search shall ship without this filter if data quality is insufficient. Distance sorting, user geolocation and interactive map search are future features.

Acceptance: seed exact, partial, short and no match queries, tied ratings, inactive categories and unpublished records; verify deterministic results, filter combinations and absence of private fields.

# 6 Business listings and local areas

**BUS 001 —** A business detail page shall show name, description, primary and secondary categories, service labels, gallery, approved public address or service area, phone, website, social links, operating hours, contact actions, review summary, approved reviews and related listings. Optional missing fields shall be omitted cleanly, without fabricated values.

**BUS 002 —** Publication requires name, stable unique slug, useful description, active primary category, verified Melbourne eligibility, at least one contact route, reviewed content rights and an admin verification timestamp. Store a private enquiry destination separately from public contact details. A gallery is optional; a fallback image is required if none exists.

**BUS 003 —** "Call" uses a valid tel link, website/social links permit HTTPS or HTTP only, and Directions uses validated address/coordinates. External links opened in a new tab shall use safe relationship attributes. The MVP uses a directions link rather than an embedded tracking map. A service business may hide a residential street address and expose only its approved service area; structured data must follow that visibility choice.

**BUS 004 —** Weekly hours support multiple intervals per weekday, overnight closing via an explicit next day flag, closed days, open 24 hours and unknown hours as distinct states. Date specific exceptions override weekly hours. Store wall clock hours in Australia/Melbourne and evaluate with timezone aware dates. An unknown schedule shall not be labelled closed or open. Display an hours accuracy note and correction email action.

**BUS 005 —** Related listings return up to four other published businesses sharing the primary category, preferring the same approved local area with stable ID tie breaking. Do not insert out of boundary businesses to fill slots. Hide the section if no eligible alternatives exist.

**BUS 006 —** Admin workflow: draft → published → archived, with unpublished content returning to draft. Publication is an explicit permission protected action and captures firstPublishedAt. An archived or unpublished listing shall disappear from discovery and forms. Edits increment a version; a stale update receives 409 rather than overwriting another editor's change.

**BUS 007 —** Warn on potential duplicates using normalized name with address or phone. Require a logged override reason to publish a flagged duplicate. Category/local area removal is blocked while active listings reference it; reassign or deactivate through a validated action. Deleting a gallery item shall not remove another listing's shared media.

**BUS 008 —** Local areas have an allowlisted name, unique slug, optional editorial introduction and active flag. They shall be managed as Melbourne subdivisions only; no state/country expansion control exists. Administrators verify eligibility manually against the approved boundary, recording source and date.

Acceptance: publish, edit, archive and restore a listing; validate address privacy, overnight hours, duplicate overrides, stale edits and unpublished URL behavior.

# 7 Ratings reviews and abuse reporting

**REV 001 —** A visitor shall submit a whole number rating from 1–5, display name of 2–80 characters, private email up to 254 characters and plain text review of 20–3000 characters without registering. Require acknowledgement of review guidelines and the privacy notice. Email is collected for moderation contact and is never public. The MVP does not label unverified submissions as verified purchases or verified customers.

**REV 002 —** Validate business publication, field limits, server side Turnstile, honeypot and distributed rate limits before acceptance. Create accepted reviews as pending and return a neutral receipt/reference with "Submitted for moderation". No immediate publication, public edit token, review image upload or public review management page is included.

**REV 003 —** States are pending, approved, rejected and spam. Only approved reviews appear publicly or contribute to totals. An admin can move an approved review to rejected/spam, with reason, audit entry and aggregate/cache update. Store the original submitted text. Any editorial redaction shall preserve a restricted original and a reason; do not change the reviewer's rating to improve a business score.

**REV 004 —** The displayed mean is sum of approved ratings divided by approved count, rounded to one decimal only for display. Sorting uses the unrounded value. A zero count has a null mean. Update count and sum in the same transaction as moderation and reconcile periodically against source rows. Removing or republishing a review shall never increment aggregates twice.

**REV 005 —** Use a normalized private email keyed hash plus business ID to flag repeat submissions within 30 days for admin review, rather than permanently forbid a shared address. A repeated idempotency key returns the original outcome. Duplicate content and suspicious bursts enter moderation, not automatic approval. Staff shall not claim perfect prevention of fake reviews.

**REP 001 —** Visitors may report an approved review or comment with a reason enum, optional details up to 1000 characters and optional private contact email. Apply spam controls and acknowledge without revealing reporter identity. Persist the target and a public content snapshot reference so that reports remain auditable after removal.

**REP 002 —** Abuse reports have open, investigating and resolved states with an outcome and moderator. A report does not automatically remove content. Administrators can hide the target promptly, investigate and record retain/remove/spam decisions. Reports about unpublished or nonexistent targets shall not disclose private content.

Acceptance: pending and rejected reviews shall not leak through detail, search, JSON LD or counts. Repeated moderation requests shall preserve correct totals. Reporters' and reviewers' emails shall be absent from public API responses and cached pages.

# 8 Business enquiries and contact handling

**ENQ 001 —** A published business with an approved enquiry recipient shall have a form containing name 2–80 characters, email up to 254, optional phone up to 30, subject up to 150 and message 20–5000. Require acknowledgement that contact details will be shared with the named business to respond. Do not bundle marketing consent. Attachments are excluded.

**ENQ 002 —** The server shall select the recipient from the listing configuration, never from a visitor supplied destination. A listing without a valid destination shall show available phone/website actions and an email correction route; it shall not accept a form that cannot be routed. General Contact requests use the same pipeline with a configured site recipient and no business target.

**ENQ 003 —** Validate and save the enquiry and an outbound event in one MySQL transaction. Return 202 with a receipt once durably accepted, not a claim that email was delivered. A transactional outbox dispatcher shall enqueue BullMQ jobs; queue downtime must not lose an accepted enquiry. Do not send email synchronously inside the request transaction.

**ENQ 004 —** Delivery states are queued, providerAccepted, delivered when supported, retrying, failed and suppressed. Keep admin handling states new, inProgress and closed separate. Workers shall use stable message IDs, bounded retries with exponential backoff and provider idempotency where supported. A provider timeout may be ambiguous; avoid promising exactly once email delivery and reconcile before manual resend.

**ENQ 005 —** Use a configured verified sender; the visitor email may become Reply To after validation, never the From header. Escape visitor content in HTML and supply a plain text body. Enforce header injection prevention. Provider credentials and recipient addresses shall not appear in browser responses. Optional visitor receipts default off to reduce reflection spam.

**ENQ 006 —** Verify webhook signatures, reject replay beyond the provider's allowed window and deduplicate provider event IDs. Process bounces and complaints into delivery status. A Super Admin can retry a failed delivery with an audit reason; a closed enquiry does not imply delivery succeeded. Before dispatch, recheck recipient and listing availability; suppress and alert the admin if routing is no longer valid.

**ENQ 007 —** Admin views shall show target business, submit time, delivery status, handling status and necessary contact details with restricted permissions. No public enquiry listing, marketing export, lead resale or bulk broadcast is included. Enquiry contents shall be excluded from application logs and analytics.

Acceptance: simulate Redis outage after saving, worker crash, provider 429/5xx, duplicate webhook, removed recipient and retry. Every accepted enquiry shall be traceable to a pending, successful or failed delivery state, with no silent loss.

# 9 Blog and editorial content

**BLOG 001 —** Administrators alone create and manage articles. Each article has title, unique stable slug, excerpt, sanitized rich content, author attribution, primary category, optional tags, cover image, publication date, updated date and SEO fields. Public author identity is separate from admin login identity and email.

**BLOG 002 —** States are draft, scheduled, published and archived. Require title, content, author, active category and valid slug before publish/schedule. Store scheduled timestamps in UTC while the admin selects and sees Australia/Melbourne time with offset. Scheduled publishing runs idempotently with a periodic catch up scan; a missed job shall not leave due posts stranded.

**BLOG 003 —** Draft preview requires an authenticated authorized admin and a short lived preview route, sets noindex and private no-store and excludes draft URLs from sitemaps. A public unauthenticated draft lookup returns 404. Updates to a published article create a revision and invalidate public content; preserve first publication date separately from updatedAt.

**BLOG 004 —** Article pages shall show heading hierarchy, author byline, date, cover, body, optional tags, share links, related articles and approved comments. Provide ordinary share URLs or copy link behavior without third party social widgets. Related articles prefer shared category then tags, exclude self and unpublished content, and return at most four with deterministic tie order.

**BLOG 005 —** Blog index and category/tag pages provide server rendered pagination, 12 articles per page by default, newest published first. A tag with no substantive editorial landing shall be noindex. Do not create empty author archive pages in MVP; author information can appear in an article byline or author card.

**COM 001 —** A visitor may submit name 2–80 characters, private email up to 254 and plain text comment 2–2000 without login. Require privacy/guidelines acknowledgement. All comments start pending; approved, rejected and spam states follow the review moderation rules. Only approved comments appear publicly. The MVP supports a flat comment list; threaded discussions and visitor replies are future scope.

**COM 002 —** Comments may be closed per article. Submission shall recheck publication and commentsEnabled in the API. Reject submissions to archived/draft/closed articles with a safe public error. Sorting is chronological with a stable ID tie break and page size 20. Reporting and removal invalidate comment counts and pages.

Acceptance: prove scheduled publication across daylight saving transitions, private preview isolation, sanitizer protection, accurate dates, disabled comment handling and complete absence of pending comments in public HTML/API.

# 10 Administration and permissions

**ADM 001 —** The initial authenticated role is Super Admin. No public registration endpoint shall exist. Bootstrap the first admin using an operator controlled one time procedure; never ship default credentials. Additional admins are created by an authorized Super Admin and receive a short lived setup link. Prevent disabling or deleting the last active Super Admin.

**AUTH 001 —** Support email/password login, logout, password reset and session revocation. Use Argon2id password hashing with deployment benchmarked parameters, long passwords up to a documented safe bound, generic reset/login responses and progressive throttling. Reset tokens are cryptographically random, stored hashed, single use and expire after 30 minutes. Successful reset revokes prior sessions.

**AUTH 002 —** Use opaque server side sessions with hashed tokens in MySQL and optional Redis lookup caching. Set Secure, HttpOnly, SameSite cookies scoped as narrowly as routing permits. Rotate the session on login and privilege changes. Defaults: 30 minute idle timeout and 12 hour absolute lifetime. Logout revokes the server record, not just the browser cookie. Do not store admin bearer tokens in localStorage.

**AUTH 003 —** Offer optional TOTP two factor enrollment, verification, disable and recovery codes in MVP, consistent with the original brief. Recovery codes are hashed and single use. Enrollment and disable require recent authentication; secrets are encrypted. Whether to require 2FA for every production administrator is a recorded client security policy decision. Lost factor recovery must be verified and audited, never a public bypass.

**RBAC 001 —** Define permissions by resource and action: listings.read/write/publish, taxonomy.manage, reviews.moderate, comments.moderate, reports.manage, enquiries.read/manage, posts.write/publish, media.manage, settings.manage, admins.manage and audit.read. Store roles, permissions and joins; seed one Super Admin role. NestJS guards enforce permissions and object/state constraints for every admin endpoint \[R5\]. Hiding buttons is not authorization. *Amended in 1.1:* the catalogue named here is the MVP baseline, not a closed list; RBAC 002 governs how it is registered and extended, and RBAC 003–012 specify roles, direct administrator permissions, effective-permission calculation, enforcement, caching, audit and the permission-aware interface.

**ADM 002 —** Admin screens shall include dashboard, listings, directory categories/services/local areas, reviews, reports, enquiries, blog posts/categories/tags/authors, comments, media, static pages, SEO/redirects, site settings, account security and audit log. Provide server pagination, search, filters, validation, confirmations for destructive actions and stale edit warnings. Bulk moderation requires per item results and audit records.

**ADM 003 —** Dashboard shall show pending moderation, open reports, failed enquiries, due/failed scheduled posts and recent audit activity. Do not expose private text in aggregate dashboard widgets. ~~Keep advanced role editing UI out of MVP~~; the underlying permission model must support future staff roles without rewriting authorization. *Amended in 1.1 by client instruction:* the deferral of role-editing interface is withdrawn. Role, permission-catalogue and administrator-access screens are in scope and are specified by RBAC 010; the permission model requirement is unchanged and is now met by RBAC 003–009.

**RBAC 002 — Permission catalogue.** Permission codes follow `resource.action` in lower snake case (for example `businesses.publish`, `audit_logs.view`). The catalogue is declared in application code and applied to the database by an idempotent, audited synchronisation command; administrators may assign registered permissions but shall never create permission codes through an interface, so an unknown or misspelt code cannot exist to be granted. Each entry carries a stable code, a human-readable label, a description, a module grouping for the interface, an active flag and a system-managed flag. Retiring a permission deactivates it; an inactive permission grants nothing and is not offered for assignment. Every admin capability delivered by any section of this document shall be represented by a catalogue entry, and a newly registered admin resource is visible to no one until a role or a direct assignment grants its permission.

**RBAC 003 — Roles.** A role has a stable identifier, a unique normalised key, a label, a description, an active flag, a protected/system flag and creation, modification and version metadata. Roles hold permissions; an inactive role grants nothing. Protected system roles shall not be deleted, renamed at the key, deactivated or stripped of their protected status. Deleting an unprotected role is permitted only when it holds no administrator assignments, or through an explicit workflow that reassigns them first; authorization history shall survive the deletion of the role it refers to.

**RBAC 004 — Administrator roles and direct permissions.** An administrator may hold any number of roles and, independently, any number of directly assigned permissions. Both assignment records carry the assigning administrator where known, an assignment timestamp and composite uniqueness so a duplicate cannot be created. Direct permissions grant additional access only. This revision defines no explicit deny: absence of a grant is denial. A future deny model shall be introduced only by a deliberate SRS revision and migration, because precedence rules and their support cost have not been requested.

**RBAC 005 — Effective permissions.** The effective permission set of an administrator is the union of the permissions of their active roles and their direct permissions, restricted to active permissions, and is empty unless the administrator's own account is active. Duplicates collapse. An administrator with no role and no direct permission has no administrative access. The calculation lives in one server-side resolver; no other component recreates it.

**RBAC 006 — Enforcement.** Authentication establishes identity; authorization then decides what that identity may do. Every admin route declares its required permissions in code against the typed catalogue, and a route that declares nothing is refused as a programming error. The default is deny. A request is refused with 401 when authentication is missing, invalid, expired or revoked, and with 403 when the identity is valid but the effective permission is absent, an account, role or permission is inactive, or a declared permission is unknown. Error bodies use the standard envelope with the request id and disclose no role-resolution detail. Where access depends on the loaded record, the object-level check is repeated in the service layer, so an identifier in a URL cannot bypass it.

**RBAC 007 — Current principal endpoint.** An authenticated endpoint returns the signed-in administrator's identifier, display name, email, active role summaries, effective permission codes and the session metadata already approved for client use. It returns no password material, no session secret, no unrelated audit detail and not the whole permission graph. This response is the authority the admin interface consumes.

**RBAC 008 — Access administration API.** Versioned, permission-protected admin endpoints shall list and read roles, create, update, activate and deactivate non-system roles, replace a role's permissions, delete an unused non-system role, list the registered permission catalogue, read an administrator's roles, direct permissions and effective permissions, replace an administrator's roles and replace their direct permissions, and read authorization audit events. Assignment endpoints use complete replacement with `expectedVersion`, so a concurrent change is refused with 409 rather than silently merged, and repeating the same replacement is idempotent. Every assignment change and its audit record commit in one transaction. Payloads are validated by explicit allowlisting DTOs; lists are paginated with bounded page sizes.

**RBAC 009 — Caching and revocation.** Effective permissions may be cached in Redis under a key scoped to the administrator and versioned by an authorization version held with the administrator record. Any change to a role's permissions, an administrator's roles or direct permissions, the active state of a role, permission or administrator, or a session revocation shall take effect on the administrator's next request; no revoked access may survive to the expiry of a time-to-live. If the cache is unavailable or returns an unusable value, authorization falls back to the database; a cache failure shall never grant access. Password material, session tokens and other secrets are never part of a cached permission entry.

**RBAC 010 — Permission-aware administration interface.** The admin application consumes the effective permissions calculated by the server and never recreates role resolution. Navigation, routes, records, actions and bulk operations appear only when the corresponding permission is held; while capabilities are loading the interface renders a safe waiting state rather than items that may be withdrawn. Direct navigation to a route the administrator may not use renders an accessible forbidden state, and the underlying API still answers 403. Capabilities refresh after a change affecting the signed-in administrator and are cleared on logout or session invalidation. The interface shall provide a roles list, a role editor with a permission matrix grouped by module, an administrator access editor that distinguishes inherited from direct permissions and shows the source of each effective permission, a read-only permission catalogue with no creation control, and an authorization audit view with filters and bounded pagination. All screens meet the accessibility and responsive obligations of NFR 006/011.

**RBAC 011 — Privileged invariants.** The system shall refuse: removing the protected Super Admin role from, or deactivating, the last active super administrator; deleting, renaming or unprotecting the protected Super Admin role; an administrator changing their own roles or direct permissions; granting a permission the acting administrator does not hold; assigning an unknown or inactive permission or an inactive role; and deleting a role that still has assignments. Refusals are recorded. Bootstrap of the first administrator remains the operator-controlled procedure of ADM 001: credentials come from operator input, are validated and hashed, unsafe defaults are refused, and the procedure is documented together with rotation, removal and a recovery path for a deployment that has lost all administrator access.

**RBAC 012 — Authorization audit.** Every access-control mutation writes an audit event in the same transaction as the change: role created, updated, activated or deactivated; permissions added to or removed from a role; a role assigned to or removed from an administrator; a direct permission granted to or revoked from an administrator; an administrator activated or deactivated; a rejected privileged operation; and the bootstrap of the first super administrator. Each event records the acting administrator, the target, the action, safe before and after summaries, the request id, the timestamp, and the address and user agent already permitted by PRIV 001. Full request bodies, secrets and password material are never stored.

Acceptance: direct API tests cover anonymous access, disabled sessions, missing permission and last admin protection, independent of the Refine UI. For the access-control extension, acceptance additionally requires: effective-permission calculation proven for inherited, multiple-role, direct, duplicate, inactive-role, inactive-permission, inactive-administrator and no-grant cases; 401 without authentication and 403 without permission on every protected route, including a route reached directly rather than through the interface; the privileged invariants of RBAC 011 refused and recorded; assignment changes proven transactional and version-checked under concurrency; cached capabilities proven to be invalidated by each triggering change and proven not to grant access when Redis is unavailable; and interface tests proving navigation, actions and bulk operations follow effective permissions, that an unauthorised route renders the forbidden state, that no unauthorised item is shown while capabilities load, and that logout clears them. Constraint and transaction behaviour is proven against the real MySQL database, not a substitute.

# 11 Media and site configuration

**MED 001 —** Only authorized admins shall upload images. Accept JPEG, PNG and WebP up to 10 MB and 40 megapixels; reject SVG, executable files, animated formats and arbitrary documents in MVP. Validate signature and decoded image, not only filename or browser MIME. Reencode derivatives and strip EXIF including location metadata.

**MED 002 —** Upload flow: request a short lived constrained signed upload → place object in private quarantine → validate completion and checksum → process variants → mark ready. A pending/rejected asset must never be publicly addressable through the published CDN. Use random server generated object keys and least privilege credentials; deny arbitrary key selection and overwrite by clients.

**MED 003 —** Media metadata includes source name, MIME, bytes, width/height, checksum, object key, derivatives, alt text, credit, rights/source note, focal point, processing status, creator and timestamps. Generate responsive thumbnail/card/hero renditions; preserve aspect ratios and provide fallback behavior when processing fails. Content images require useful alt text; decorative backgrounds use empty alternatives in their HTML representation.

**MED 004 —** Gallery order, caption and contextual alt overrides belong to the usage record. A shared asset may be used by multiple businesses/posts. Block deletion of a referenced asset unless usages are removed or replaced first. Remove abandoned quarantine objects after 24 hours and unreferenced ready objects after a 30 day recoverable period. Critical removals must purge CDN content promptly.

**CFG 001 —** Editable site settings include logo, contact email, social URLs, homepage hero image/phrases, featured ordering, default SEO/share image and footer details. City, country and timezone are not general editor settings. Validate settings server side, version edits, record actor and keep secrets in a secret store rather than content settings.

**CFG 002 —** Static About, Contact, Privacy, Terms and Review guidelines pages use sanitized limited rich content and revisions. Changes to contact routing require validation before activation. Never leave sample contact details or placeholder legal text in production. The product owner supplies approved public policy copy.

**CFG 003 —** Categories/services/local areas shall have active status and stable slugs. Category nesting is limited to two levels in MVP; prevent cycles and orphaned primary categories. Deactivation removes a term from new selections while preserving historical links; publication checks prevent active content from relying on an invalid primary classification.

Acceptance: test spoofed MIME, oversized/decompression images, expired upload signatures, attempted key overwrite, missing alt text, deletion of shared assets and a failed image processing job without public leakage.

# 12 SEO indexing and structured data

**SEO 001 —** Indexable pages shall return meaningful server rendered HTML with one primary H1, descriptive title, meta description, absolute canonical URL, correct status, Open Graph and social image metadata. Public URLs use lowercase hyphenated slugs and one configured HTTPS origin. Admin and private content shall never appear in public metadata.

**SEO 002 —** Publish an XML sitemap index split by businesses, editorial content and curated taxonomies, within protocol limits. Include only canonical 200 indexable pages and meaningful last modification timestamps. Exclude drafts, redirects, empty taxonomies, search/filter combinations and private routes. Regenerate/invalidate after publication or removal; robots.txt is crawl guidance, not access control.

**SEO 003 —** Curated category and local area pages require useful unique editorial content and eligible listings. Avoid automated category × area pages. Query based searches/filter combinations use noindex,follow and normalized self canonical URLs rather than canonicalizing unrelated results to a misleading page. Tracking parameters are removed from canonicals. Base listing pagination uses self canonical page URLs with crawlable previous/next links.

**SEO 004 —** Slug changes create a 301 redirect to the new canonical path. Prevent collisions, cycles, cross origin redirects and chains; resolve existing aliases to the latest target. Unpublished/draft resources return 404 publicly, permanently removed resources may return 410 when deliberately designated, and merged businesses redirect only to a true replacement. Do not redirect every missing page to Home.

**SEO 005 —** Output validated JSON LD: Organization and WebSite for the platform, BreadcrumbList where visible, the most accurate LocalBusiness subtype for business details and BlogPosting for articles. Populate address, telephone, URL, geo and hours only when known and publicly displayed. Do not invent coordinates, price range or opening hours \[R6\].

**SEO 006 —** Review and aggregateRating markup shall use only approved, visible, genuine submissions and the same approved aggregate as the page. Omit empty rating data. The technical lead shall verify current Google eligibility rules for directory reviews before enabling review markup; schema validity does not guarantee a rich result \[R7\]. Do not add unsupported search rich result promises.

**SEO 007 —** Sanitize text embedded into JSON LD so content cannot break out into script markup. XML escape sitemap content. An unpublished listing must disappear from schema, related blocks, feeds and sitemaps as well as visible search. On publish/unpublish, invalidate all affected cache layers and confirm the public status.

Acceptance: crawl representative routes with JavaScript disabled; verify metadata, canonical, HTTP status, redirects, sitemap exclusion and structured data consistency. Use schema validation and Google testing tools as supplemental checks, not guarantees of search ranking.

# 13 Data model and relational invariants

**DAT 001 —** Use opaque IDs consistently, UTC millisecond timestamps, utf8mb4 and explicit foreign keys. Public slugs are separate unique fields. Core records have createdAt, updatedAt and integer version; deletable content has archivedAt where needed. Email and sensitive content are not placed in identifiers. Use decimal coordinates and whole integer rating/count fields.

| **Entity**                         | **Principal fields**                                                                                                                     | **Relationships and constraints**                                         |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Business                           | name, slug, description, status, firstPublishedAt, eligibilityVerifiedAt, publicPhone, publicUrl, privateEnquiryEmail, addressVisibility | Required primary category and local area; unique slug                     |
| BusinessAddress                    | address lines, suburb label, postcode, latitude, longitude                                                                               | One per business; fixed AU/VIC context; optional private street           |
| Category and Service               | name, slug, active, parentId or synonyms                                                                                                 | Business category joins; primary category must be a member; service joins |
| LocalArea                          | name, slug, active, editorialIntro                                                                                                       | Approved Melbourne allowlist; no City parent entity                       |
| OpeningInterval and HoursException | weekday, local start/end, endNextDay, date, closed/allDay                                                                                | Business 1 to many; validate nonoverlap and exception priority            |
| BusinessMedia                      | businessId, mediaId, order, caption, altOverride                                                                                         | Unique pair and ordered usage; one nominated cover                        |
| FeaturedPlacement                  | businessId, position, startsAt, endsAt                                                                                                   | Manual editorial feature, valid interval, no payment fields               |
| Review                             | businessId, displayName, privateEmail, emailHash, rating, originalText, publicText, status                                               | No public user FK; check rating 1–5; moderation fields                    |
| BusinessRating                     | businessId, approvedCount, ratingSum                                                                                                     | One per business; transactional aggregate and reconciliation              |
| Enquiry                            | businessId nullable, kind, contact fields, message, receiptId, handlingStatus, deliveryStatus                                            | Business or site target; private access only                              |
| AbuseReport                        | reviewId or commentId, reason, details, status, resolution                                                                               | Exactly one target via check/application invariant                        |

**DAT 002 —** Email hashes used for abuse detection are keyed hashes, not unsalted hashes. Encrypt recoverable private contact fields using managed keys or equivalent application field encryption. Search indexes shall contain only public approved business/editorial content; normalized private contacts have separate restricted uses.

**DAT 003 —** Restrict deletes of referenced taxonomies and published media. Moderation history shall survive public removal. Hard deletion of private submission data follows the retention workflow; maintain only minimal nonpersonal audit evidence afterward. Do not cascade delete every review simply because a listing is archived.

# 14 Editorial and operational data model

| **Entity**                      | **Principal fields**                                                                                 | **Relationships and constraints**                         |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Post                            | title, slug, excerpt, sanitizedBody, status, scheduledAt, firstPublishedAt, commentsEnabled, version | Author, primary blog category and optional cover media    |
| Author                          | displayName, bio, publicImage                                                                        | Attribution only; does not grant authentication           |
| BlogCategory and Tag            | name, slug, active, landingContent                                                                   | Post joins, unique slugs per taxonomy                     |
| Comment                         | postId, displayName, privateEmail, originalText, publicText, status                                  | No visitor user FK; flat list                             |
| ContentRevision                 | resourceType, resourceId, version, sanitizedSnapshot, actorId                                        | Restricted history for businesses, posts and pages        |
| MediaAsset and MediaVariant     | keys, size, dimensions, checksum, rights, status                                                     | Usage references from business, post, author and settings |
| StaticPage and SiteSetting      | key/slug, content or typed value, version                                                            | Versioned, no secrets in settings                         |
| SeoMetadata and Redirect        | resource scope, title, description, image; sourcePath, targetPath                                    | Typed unique owner; redirect source unique                |
| AdminUser                       | email, passwordHash, active, encryptedTotpSecret, authorization version                              | Unique normalized email; never used as public author data; the authorization version scopes the permission cache (RBAC 009) |
| Role                            | stable key, label, description, active, protected/system flag, version                               | RolePermission composite unique join; protected roles are undeletable (RBAC 003) |
| Permission                      | stable code `resource.action`, label, description, module, active, system-managed                    | Code-declared catalogue synchronised into the table; assignment restricted to registered active codes (RBAC 002) |
| AdminRole and RolePermission    | assignment timestamp, assigning administrator                                                        | Composite unique joins; restrict deletion so history survives (RBAC 004)   |
| AdminPermission                 | adminId, permissionId, assignment timestamp, assigning administrator                                 | Direct grant, additive only; composite unique (RBAC 004)                   |
| AuthorizationAuditEvent         | actor, target administrator or role, action, safe before/after summary, requestId, address, agent    | Written in the same transaction as the access change; retains the target key after deletion (RBAC 012) |
| Session and ResetToken          | tokenHash, adminId, expiresAt, revokedAt                                                             | Reset token single use; idle/absolute session timestamps  |
| ModerationAction and AuditLog   | actor, target, action, reason, timestamp, correlationId                                              | Append only; redact private values in change snapshots    |
| OutboxEvent and DeliveryAttempt | eventId, type, targetId, status, attempt, providerId                                                 | Unique event/idempotency IDs; bounded payload references  |
| IdempotencyRecord               | scoped key hash, payloadHash, resultRef, expiresAt                                                   | Key reuse with different payload gives 409                |

**DAT 004 —** Index business status with primary category/local area and first publication date; index join foreign keys, review business/status/time, comment post/status/time, post status/publish time, enquiry status/time and outbox pending/time. Unique slug indexes apply even to archived content unless explicitly reclaimed through a reviewed migration. Use query plans and seeded load to validate indexes.

**DAT 005 —** MySQL transactions shall make publication, moderation, aggregate updates and outbox insertion atomic. Workers receive IDs and reload authoritative data. Use optimistic versions for content edits and guarded state transitions for moderation. Concurrent approval/unapproval must not double count. Failed transactions roll back both data and events.

**DAT 006 —** Prisma migrations are version controlled, reviewed and executed by a single deployment job. Use expand then backfill then contract changes across compatible releases. Test schema upgrades and restore on a production like copy with private data anonymized. Production schema push, ad hoc destructive migrations and uncontrolled manual database edits are prohibited.

Acceptance: integration tests exercise unique keys, orphan prevention, exactly one report target, rollback, concurrent edits, aggregates and migration compatibility. Document the final ER diagram generated from the implemented schema as release evidence.

# 15 REST contract and public API

**API 001 —** NestJS owns /api/v1. Publish OpenAPI for every route with schemas, validation bounds, auth requirements, response examples and errors. Generate frontend types from that contract. Use explicit allowlisted DTO fields; never serialize Prisma records directly. Dates use ISO 8601 UTC; local operating hours are separately identified wall clock values.

**API 002 —** Single responses use {data}; collections use {data, meta:{page,pageSize,total,pageCount}}. Errors use {error:{code,message,fields,requestId}}. Use 400 for invalid input, 401 for absent/expired admin auth, 403 for permission denial, 404 for unavailable public resources, 409 for version/state conflicts, 413 for oversized content, 429 with Retry After for limits and 503 for temporary failure. Do not disclose stack traces.

| **Method and path relative to /api/v1** | **Contract and visibility**                                              |
| --------------------------------------- | ------------------------------------------------------------------------ |
| GET /site and /home                     | Public approved settings, hero, featured and latest posts                |
| GET /businesses                         | q, category, area, minRating, sort, page, pageSize; published projection |
| GET /businesses/{slug}                  | Public detail and approved aggregate; no private recipient               |
| GET /businesses/{id}/related            | Published similar businesses with bounded limit                          |
| GET /categories /services /areas        | Active directory taxonomy and permitted local areas                      |
| GET /search/suggestions                 | q 2–120; max eight typed results; no private content                     |
| GET /businesses/{id}/reviews            | Approved only, pagination, newest default                                |
| POST /businesses/{id}/reviews           | Rating/name/email/text, acknowledgement, anti spam token                 |
| POST /businesses/{id}/enquiries         | Contact fields/message, acknowledgement, anti spam token                 |
| GET /posts and /posts/{slug}            | Published index/detail; category/tag/page filters                        |
| GET /blog-categories /tags              | Published editorial taxonomy                                             |
| GET /posts/{id}/comments                | Approved only with pagination                                            |
| POST /posts/{id}/comments               | Name/email/text, acknowledgement, anti spam token                        |
| POST /reports                           | Review or comment target, reason, optional private contact               |
| POST /contact                           | General site enquiry, same durable delivery pipeline                     |
| GET /pages/{slug}                       | Published static content only                                            |

**API 003 —** Public form POSTs require a scoped Idempotency Key, payload fingerprint and 24 hour retention of result references. Return 201 for newly persisted pending reviews/comments/reports and 202 for enquiries. Replays return the original receipt without repeated email or moderation rows. Validate CAPTCHA for a new submission; a valid existing idempotent result may be returned without replaying an expired challenge after matching key/payload scope.

**API 004 —** Cap JSON request bodies at 64 KB for public forms, reject unknown fields and constrain pagination/sort keys. Apply a conservative public GET rate ceiling and cache only safe responses. Form error responses preserve user input in the browser but never echo private text into logs or URLs.

# 16 Admin API and module ownership

All paths below are relative to /api/v1/admin except provider webhooks. Auth endpoints permit only their narrowly defined unauthenticated actions; every resource route requires a valid session and mapped permission.

| **Endpoint family**                                      | **Operations and module owner**                                              |
| -------------------------------------------------------- | ---------------------------------------------------------------------------- |
| /auth/login /logout /me /forgot-password /reset-password | AuthenticationModule; login/reset public with abuse limits                   |
| /auth/totp/enroll /verify /disable /recovery             | AuthenticationModule; session and recent authentication                      |
| /admins and /admins/{id}/sessions                        | IdentityModule; manage accounts and revoke sessions                          |
| /roles /roles/{id} /roles/{id}/permissions               | AuthorizationModule; list, read, create, update, activate/deactivate, replace permissions, delete unused non-system roles (RBAC 008) |
| /permissions                                             | AuthorizationModule; read-only registered catalogue grouped by module        |
| /admins/{id}/access /roles /permissions                  | AuthorizationModule; read effective access, replace roles, replace direct permissions, versioned and transactional |
| /audit/authorization                                     | AuthorizationModule; bounded, filtered authorization audit events            |
| /businesses and /businesses/{id}                         | DirectoryModule; list/create/read/update, version required                   |
| /businesses/{id}/publish /unpublish /archive             | DirectoryModule explicit POST state transitions                              |
| /categories /services /areas                             | TaxonomyModule; validated CRUD/deactivation                                  |
| /reviews /comments and /{resource}/{id}/moderate         | ModerationModule; GET lists/details; POST decision, reason, expected version |
| /reports and /reports/{id}/resolve                       | ModerationModule; investigation state and target handling                    |
| /enquiries and /enquiries/{id}/retry                     | EnquiriesModule; private read, handling PATCH, audited retry                 |
| /posts and /posts/{id}/publish /schedule /archive        | EditorialModule; content and state management                                |
| /blog-categories /tags /authors                          | EditorialModule; attribution and editorial taxonomy                          |
| /media/upload-intents /media/{id}/complete               | MediaModule; signed quarantine flow and processing                           |
| /media /pages /settings /redirects                       | Owning media/content/SEO modules; typed CRUD                                 |
| /audit and /revisions                                    | AuditModule; filtered restricted read only                                   |
| POST /webhooks/email at /api/v1                          | IntegrationsModule; signed provider events, no browser cookie auth           |

**API 005 —** Updates require expectedVersion in the validated payload, and respond with the next version. The service checks permission, current state and version within the transaction. Published/private transitions are explicit actions rather than unrestricted status fields. Admin lists support documented Refine filters and allowlisted sort fields; private exports are excluded from MVP.

**MOD 001 —** Directory owns business eligibility, hours and search projections. Editorial owns posts and scheduling. Moderation owns decisions but calls the owning review/comment service for transactional effects. Enquiries owns delivery requests; Integrations owns external provider adapters. Media owns asset lifecycle. SEO consumes publication events. Audit receives redacted immutable records. Avoid circular module imports or one controller bypassing another domain's invariants.

**MOD 002 —** Infrastructure adapters include object storage, email, Turnstile, cache, queue and clock. Unit tests replace adapters; integration tests use MySQL/Redis with real constraints. Internal health endpoints expose minimal health to uptime checks and detailed dependency diagnostics only to operators.

Acceptance: OpenAPI, permission tests and Refine behavior shall agree; new unrecognized resource actions deny access by default and cross module failures preserve transaction boundaries.

# 17 Events caching and consistency

**EVT 001 —** Persist domain events in a MySQL outbox in the same transaction as the change. Event fields include ID, type, resource ID, resource version, occurrence time and correlation ID. Event types cover listing/post publication/update/removal, moderation decisions, enquiry accepted, media completed and settings changes. Queue payloads use identifiers rather than private message bodies.

**EVT 002 —** A dispatcher shall retry pending events until enqueue succeeds. Consumers shall deduplicate by event ID/version and tolerate repeat execution \[R8\]. Default job policy is five attempts with exponential backoff and jitter, followed by a visible failed queue state and alert. Retain enough execution metadata for diagnosis without retaining unnecessary personal content. Manual retry is permission protected and audited.

**CACHE 001 —** Explicitly configure Next.js rendering and data cache behavior for the pinned framework version; do not rely on implicit defaults. Public content may use pre rendering and revalidation, while dynamic search is server rendered with bounded short cache entries. Tag/path invalidation APIs must be validated against the selected version \[R9\]. Never cache authenticated previews, admin endpoints or POST responses in a shared cache.

| **Cache**                     | **Default freshness budget**         | **Invalidation rule**                                       |
| ----------------------------- | ------------------------------------ | ----------------------------------------------------------- |
| Listing/article HTML and data | 5 minutes maximum for ordinary edits | Resource version event refreshes detail and related pages   |
| Category/area/home/taxonomy   | 5 minutes                            | Relevant publication, feature or settings events            |
| Search query results          | 30 seconds                           | Namespace/version bump for publication and review changes   |
| Static versioned media        | Up to one year immutable             | New object key for replacements; explicit purge for removal |
| Admin/private submissions     | No shared caching                    | private no-store headers and CDN bypass                     |

**CACHE 002 —** Unpublish, abuse removal and sensitive media removal are urgent: purge affected web/API/CDN entries within 60 seconds. Check current publication state at dynamic detail boundaries until purge is confirmed. Track failed invalidations and retry; a TTL alone is insufficient for sensitive removals. Multi replica deployments shall share invalidation state or receive a broadcast; one pod's local invalidation is not adequate.

**CACHE 003 —** Normalize query keys; include filters, sort, page and publication namespace. Apply cache entry size/TTL limits and request coalescing to reduce stampedes. Approved aggregates are authoritative in MySQL, never only Redis. Separate cache Redis from durable queue Redis in production or enforce compatible durability/no eviction policies and resource isolation.

Acceptance: test worker retry after commit, Redis restart, duplicate events, multiple web replicas and CDN purging. Public pages shall meet the stated freshness bounds, and admin/private responses shall not become reusable CDN hits.

# 18 Security privacy and retention

**SEC 001 —** Apply TLS, restricted trusted origins, CSRF protection for session authenticated mutations, Origin checks, security headers and a tested Content Security Policy. Use parameterized Prisma queries and parameterized raw SQL only. Validate server side, sanitize rich text with an allowlist and escape output by context. Protect against stored XSS in admin previews as well as public pages. Do not fetch arbitrary user URLs server side.

**SEC 002 —** Verify Turnstile server side including expected hostname/action and token outcome \[R10\]. Honeypots and browser checks supplement, not replace, this validation. Default per trusted IP ceilings: login five failed attempts per 15 minutes plus account throttling; review/comment five per 15 minutes and 20 per day; enquiries three per 15 minutes and 10 per day; reports five per hour. Add keyed email/target burst signals without exposing existence. Tune from measured false positives, particularly shared networks.

**SEC 003 —** During CAPTCHA or rate limit infrastructure failure, public writes fail safely with a retry message; do not silently bypass checks. Browsing may degrade to safe cached public content. Do not accept spoofable X Forwarded For from the open internet. A successful challenge never authorizes admin access or publication.

**SEC 004 —** Secrets belong in an environment specific secret manager, never source control, media metadata, logs or browser variables. Encrypt database/backups at rest and sensitive application fields, restrict service identities, rotate credentials and prohibit production personal data in development. Dependency scanning, lockfile review and container scanning are release gates; unresolved critical/high exploitable issues require remediation before launch.

**PRIV 001 —** Publish clear collection/use/retention notices and a privacy contact. Store acknowledgement version and timestamp per form. Collect only necessary data. Provide an admin assisted access/correction/deletion procedure using proportionate identity verification; no public user account is required. The client must approve applicable Australian privacy and content policies before launch; this SRS specifies engineering controls, not legal certification.

| **Data**                              | **Baseline retention from relevant event** | **Treatment**                                                 |
| ------------------------------------- | ------------------------------------------ | ------------------------------------------------------------- |
| Enquiries and private contact details | 180 days from submission                   | Purge unless documented active case hold                      |
| Rejected/spam reviews and comments    | 90 days from decision                      | Purge content and private contact                             |
| Approved review/comment private email | 180 days from submission                   | Remove recoverable email; retain public content until removal |
| Abuse reports                         | 180 days after resolution                  | Purge personal details and narrative                          |
| Abuse IP signals / application logs   | 30 / 30 days                               | Rotating hashes for signals; redact log bodies                |
| Security and admin audit events       | 365 days                                   | Minimal redacted action records                               |

**PRIV 002 —** Holds require a recorded owner, reason and review date. Expiry jobs shall be testable and logged by counts. Backup retention is defined in section 20; restored systems must replay deletion records before serving users. Policy changes require an updated SRS decision and public notice where appropriate.

# 19 Non functional requirements

The following are measurable engineering acceptance targets for MVP. Test evidence shall record build, environment, dataset, workload, device and date so that a later audit can reproduce the result.

| **ID and area**           | **Target**                                                                             | **Measurement and pass condition**                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| NFR 001 Performance       | LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1 at mobile p75                                        | Prelaunch lab proxy on key pages; field data after sufficient traffic, reviewed after 28 days                     |
| NFR 002 API latency       | Read p95 ≤500 ms; durable form receipt p95 ≤1000 ms                                    | API elapsed time excluding email delivery; disclose CAPTCHA latency separately                                    |
| NFR 003 Capacity          | 10,000 businesses, 2,000 posts, 100,000 reviews/comments, 20 GB media                  | 30 minute seeded test, 50 GET/s plus 2 form POST/s, 100 browsing sessions, errors below 1% excluding expected 4xx |
| NFR 004 Availability      | 99.5% monthly public read availability target                                          | External probes at one minute intervals; report all outages and maintenance separately                            |
| NFR 005 Queue delivery    | 95% of eligible enquiries submitted to provider within 60 s                            | Normal provider availability; oldest queued item over 5 min alerts                                                |
| NFR 006 Accessibility     | WCAG 2.2 AA public and core admin flows                                                | Automated scans plus keyboard, screen reader, zoom and contrast review                                            |
| NFR 007 Responsive UX     | No unintended horizontal scrolling at 320 px                                           | Test listed breakpoints; wide admin data uses intentional scroll regions                                          |
| NFR 008 Compatibility     | Current and previous major Chrome, Safari, Firefox and Edge; iOS Safari/Android Chrome | Record tested versions at release; progressive fallback for unsupported enhancements                              |
| NFR 009 Recovery          | RPO ≤1 hour, RTO ≤4 hours                                                              | Timed restore drill including DB, media, configuration and deletion replay                                        |
| NFR 010 Content freshness | Normal ≤5 min, urgent removal ≤60 s                                                    | Multi layer cache tests with timestamped evidence                                                                 |

**NFR 011 —** Maintain visible focus, logical tab order, labelled inputs, associated errors, skip links and semantic landmarks. Dialogs trap focus appropriately and restore it when closed. Touch controls target at least 44 × 44 CSS pixels where practicable; never fall below applicable WCAG minimums. Avoid color only indicators, inaccessible star widgets and motion dependent instructions.

**NFR 012 —** Use en AU copy, Australian phone/address formats and Australia/Melbourne display dates. Store instants in UTC and format with daylight saving rules. Display concise recoverable errors; retries must not duplicate forms. Public pages remain readable when analytics, media or suggestion services fail.

**NFR 013 —** Keep module boundaries, migrations, OpenAPI and architecture decisions current. Public page JavaScript shall exclude Refine/Ant Design and backend modules. Establish a bundle budget after the vertical slice; require review for more than 10% regression. Accessibility and performance are ongoing release checks, not a single Lighthouse score claim.

# 20 Deployment backups and monitoring

**OPS 001 —** Provide separate development, staging and production environments with isolated databases, buckets, queues and credentials. Staging shall be access controlled and noindex; use synthetic/anonymized data. Prefer an Australian region for primary data, subject to documented vendor availability and client approval. Record any cross border processing by email, CDN or diagnostics providers.

**OPS 002 —** CI shall install from the frozen pnpm lockfile, lint/type check, test, build immutable images/assets, scan dependencies and apply migrations once. Deploy backend changes backward compatibly before dependent clients. Use readiness checks, rolling replacement, graceful worker shutdown and rollback to the last good build. A destructive database migration has no automatic "undo"; use a reviewed corrective migration or restore procedure.

**OPS 003 —** Expose separate liveness and readiness checks. Graceful shutdown stops new work, finishes or safely releases jobs and closes connections. Set database pool budgets across API/worker replicas. Restrict DB/Redis ports to private networks, enable TLS where supported and apply tested connection/time limits. Run the queue store with persistence and no eviction; the outbox remains the recovery source.

**BACK 001 —** Take encrypted daily database backups and retain continuous/binlog recovery data sufficient for a one hour RPO. Retain daily recovery points 30 days; avoid unapproved long term personal data archives. Enable object versioning or equivalent daily media protection with replication/backup lag at most one hour. Back up configuration and secret recovery procedures through their managed systems, not plaintext copies.

**BACK 002 —** Store backups separately from production service credentials and restrict deletion rights. Test restore before launch and quarterly thereafter. The drill shall restore an isolated environment, verify schema/content/media checksums, replay privacy deletion records, rebuild caches/queues from authoritative rows, disable unintended outbound mail and measure RPO/RTO. Record results and follow up defects.

**MON 001 —** Collect structured redacted logs with request/event IDs, error tracking such as Sentry, uptime checks and metrics for p95 latency, 5xx rate, queue age/failures, moderation backlog, email bounces, DB connections, storage usage and backup age. Do not log passwords, tokens, private form bodies, session cookies or full email addresses.

**MON 002 —** Alert the named operator when public probes fail for three minutes, 5xx exceeds 2% for five minutes, oldest outbound job exceeds five minutes, scheduled publishing is over five minutes late or the latest backup is over 26 hours old. Monitor urgent purge failures immediately. Record on call ownership and escalation channels before launch; dashboards without a responder are insufficient.

**OPS 004 —** Supply deployment, rollback, restore, failed email, content takedown, credential compromise, admin recovery and vendor outage runbooks. Each shall identify owner, trigger, diagnostic steps, containment, recovery checks and incident record. Smoke test browsing, login, a moderated submission and test email routing after deployment.

# 21 Verification and acceptance matrix

**QA 001 —** Use Vitest or Jest for pure logic, NestJS integration tests with real MySQL/Redis constraints, contract tests against OpenAPI and Playwright for public/admin journeys. Use isolated seeds and test email/storage adapters; never submit real reviews or send business emails as a side effect of test runs. Store reproducible reports against the release and requirement IDs.

| **Test group**           | **Requirements traced**                             | **Required evidence**                                                                 |
| ------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------------------- |
| T01 Scope                | SCP 001–005, UX 001–003                             | Fixed Melbourne context, no public accounts, rejected out of boundary listing         |
| T02 Hero                 | HERO 001–007                                        | Screenshot layouts, keyboard video/checklist, reduced motion, no JS submit            |
| T03 Discovery            | DIR 001–008                                         | Filter/sort/pagination fixtures, no leakage, short query behavior, empty/error states |
| T04 Listing              | BUS 001–008                                         | Publication gates, hidden address, overnight/DST hours, duplicate/stale edit tests    |
| T05 Moderation           | REV 001–005, REP 001–002, COM 001–002               | Pending visibility, aggregate concurrency, reporting and redaction audit              |
| T06 Enquiries            | ENQ 001–007                                         | Outbox recovery, provider failure/replay, private recipient protection                |
| T07 Editorial            | BLOG 001–005                                        | Draft isolation, schedule catch up, sanitized content, related posts                  |
| T08 Admin                | ADM 001–003, AUTH 001–003, RBAC 001                 | Direct API permission denial, reset/session/TOTP recovery and last admin tests        |
| T15 Access control       | RBAC 002–012                                        | Effective-permission cases (inherited, multi-role, direct, duplicate, inactive role/permission/administrator, no grant); 401/403 on protected routes reached directly; privileged invariants refused and recorded; transactional, version-checked assignment under concurrency; cache invalidation per trigger and safe behaviour with Redis down; interface tests for navigation, actions, forbidden route, loading state and logout |
| T09 Media                | MED 001–004, CFG 001–003                            | Upload attack cases, rights/alt validation, shared deletion and settings audit        |
| T10 SEO                  | SEO 001–007                                         | Crawl/status/canonical/sitemap report, structured data consistency                    |
| T11 Data and APIs        | ARC 001–005, DAT 001–006, API 001–005, MOD 001–002  | Migration, constraints, contracts, rollback and independent build results             |
| T12 Reliability          | EVT 001–002, CACHE 001–003                          | Repeated jobs, replica invalidation, urgent purge and outage scenarios                |
| T13 Security and privacy | SEC 001–004, PRIV 001–002                           | CSRF/XSS/SQLi/IDOR checks, redaction, retention and deletion replay                   |
| T14 Operations           | NFR 001–013, OPS 001–004, BACK 001–002, MON 001–002 | Load/accessibility reports, restore timing, deployment/rollback and alert drill       |

**QA 002 —** Release requires all mandatory groups passing, no unresolved critical/high security defects, no data loss/privacy leak defects, no blocked core journey and client approval of content, boundary and policies. Conditional Open now may remain disabled with recorded data readiness status. Accepted minor defects require owner, rationale and target date.

**QA 003 —** UAT shall demonstrate Home → search → business → pending review, business enquiry → provider status, Blog → article → pending comment, and admin → approve/remove → public refresh. The evidence pack shall include build ID, SRS version, test results, unresolved defect register, signed launch decisions and operator handover.

# 22 Implementation sequence and release gates

This is the future execution plan. Each phase ends with reviewable evidence before its dependants proceed; no application code is delivered with this SRS.

| **Phase**          | **Objective and deliverable**                      | **Dependency and key decision**       | **Acceptance tests and principal risk**   |
| ------------------ | -------------------------------------------------- | ------------------------------------- | ----------------------------------------- |
| 1 Scope            | Approve SRS, boundary and content inventory        | Client decisions; city interpretation | T01; prevent geographic scope drift       |
| 2 Foundation       | Monorepo, CI, app boundaries, design tokens        | 1; pin supported compatible versions  | T11 builds; avoid shared secret bundles   |
| 3 Data             | Prisma schema, migrations and seed fixtures        | 1–2; constraints and private fields   | T11 rollback/concurrency; avoid data loss |
| 4 Admin slice      | Refine listing form/table and real API actions     | 2–3; REST adapter contract            | T08/T11; nested forms and error mapping   |
| 5 Identity         | Login/reset/session/TOTP and permission foundation | 3–4; server enforced permissions      | T08; session bypass and admin lockout     |
| 6 Directory admin  | Listings, categories, local areas and hours        | 3–5; publication/eligibility rules    | T04; duplicates and invalid hours         |
| 7 Public discovery | Hero, directory, search and business pages         | 6; MySQL search and fixed city        | T02–04; short tokens and mobile layout    |
| 8 Interactions     | Reviews, reporting, enquiry outbox and moderation  | 5–7; pending by default               | T05–06; spam and lost/repeated email      |
| 9 Editorial        | Blog, scheduled publishing and comments            | 3–5, 8 moderation; sanitized editor   | T07/T05; preview leaks and missed jobs    |
| 10 Media           | Quarantine, variants, usage tracking and rights    | 3–5; object storage lifecycle         | T09; unsafe uploads and shared deletion   |
| 11 SEO             | Metadata, schema, sitemap and redirects            | 7, 9–10; index allowlist              | T10; crawl explosion and stale removal    |
| 12 UX completion   | Responsive states and accessibility review         | 7–11; controlled motion               | T02/T14; contrast and keyboard defects    |
| 13 Hardening       | Security, privacy and cache consistency            | 8–12; retention and retry rules       | T12–13; stale/private caches              |
| 14 Verification    | Contract, integration, UAT and load evidence       | 13; release defect thresholds         | T01–14; unrealistic test fixtures         |
| 15 Operations      | Deploy staging, restore/alert drill and runbooks   | 14; RPO/RTO proof                     | T14; untested backups or recipients       |
| 16 Launch          | Approved content import, smoke test and handover   | 15 and section 23 decisions           | QA 002–003; rollback readiness            |

The media foundation needed by listing and blog forms may be prepared with phase 4; phase 10 completes its lifecycle and adversarial validation. UI design begins with phase 2 and is verified throughout. Phase numbers express gates, not estimates or a requirement to postpone foundational dependencies.

# 23 Decisions risks and future scope

## Launch decision register

| **ID** | **Decision and baseline**                                                                                             | **Accountable owner and gate**                   |
| ------ | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| D01    | Confirm council area versus Greater Melbourne and approve local area allowlist; conservative baseline is council area | Client; before content publication               |
| D02    | Approve original logo, Melbourne hero license, copy and rotating phrases                                              | Client/design lead; before visual UAT            |
| D03    | Select hosting, S3 provider, email provider, CAPTCHA and observability accounts; confirm region/cost                  | Technical lead/client; before staging            |
| D04    | Confirm public domain, site contact and verified per business enquiry recipients                                      | Client; before delivery tests                    |
| D05    | Approve privacy/terms/review policy, retention defaults and takedown escalation                                       | Client; before live form collection              |
| D06    | Decide optional TOTP use versus mandatory production enrollment policy                                                | Client/security owner; before admin onboarding   |
| D07    | Approve NFR workload, availability/recovery targets and named support operator                                        | Client/operations; before load and restore gates |
| D08    | Confirm Open now data readiness; default disabled                                                                     | Content/QA lead; before enabling filter          |

## Principal risks and controls

Melbourne boundary ambiguity can admit unintended listings; D01 and eligibility checks control it. No account submissions invite impersonation and spam; pre moderation, rate limits, reporting and honest unverified labels reduce the risk. Email delivery depends on a provider; durable outbox, retries and delivery state prevent silent loss. Concurrent edits and moderation can corrupt aggregates; version checks, transactions and reconciliation are mandatory.

Search token behavior may miss short service terms; prefix fallback and seeded query tests must prove it. Cache layers can expose removed content; urgent invalidation needs multi replica/CDN testing. Photography and submitted copy can carry rights concerns; record sources/permissions and provide a takedown route. Backups that have never been restored do not meet the recovery requirement; a timed drill is a release gate.

## Explicit future scope

**FUT 001 —** Business owner accounts, ownership verification/claims, self service submissions, business response threads, visitor accounts, saved listings and personalization are excluded. Introduce a separate identity/ownership design and abuse model if approved later; do not create dormant visitor account tables now.

**FUT 002 —** Paid promotions, subscriptions, payment processing, invoices, coupons, booking, ecommerce, automated lead resale and advertising marketplaces are excluded. Manual featured placements do not imply an entitlement or billing system.

**FUT 003 —** Multiple staff role administration UI, public comment threads, review attachments, email verification badges, external search engines, fuzzy/semantic search, map/radius discovery, mobile apps, multilingual support, newsletters and bulk imports/exports require separate approval.

**FUT 004 —** Multi city/multi country capability is explicitly excluded from MVP architecture. Future expansion requires a migration decision covering eligibility, jurisdiction, locale, timezone, URLs, permissions and SEO; preserve stable business IDs and modular location validation to make that migration possible without building the expanded platform now.

# 24 Source register and audit handover

## Requirements provenance

**R1 —** Client conversation "Implementation plan Melbourne Sphere", including the original project brief, the accepted architecture recommendation, seven Boca Locals screenshots and the subsequent hero reference with the Melbourne only clarification. Conversation ID 6a9c42f5 46f0 83e8 b022 aca8259f535c. The current request explicitly fixes the architecture and requires an editable authoritative SRS. These client instructions are the scope authority.

**R2 —** Boca Locals homepage, reviewed 5 September 2026. Used for information architecture and discovery patterns only. <https://bocalocals.com/>

## Technical reference register

The references below support specific integration considerations. Product rules, workload targets and retention periods in this SRS are project requirements or stated defaults, not quotations from these sources. Recheck version dependent documentation when pinning dependencies and before release.

**R3 —** Refine Data Provider Guide. Admin REST adaptation and data access boundary. <https://refine.dev/core/docs/data/data-provider/>

**R4 —** W3C Understanding WCAG 2.2 Pause Stop Hide. Continuing automatically moving content needs an appropriate pause/stop/hide mechanism. <https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide>

**R5 —** NestJS Authorization. Server side guards and permission based access control foundation. <https://docs.nestjs.com/security/authorization>

**R6 —** Schema.org LocalBusiness. Business type and vocabulary reference. <https://schema.org/LocalBusiness>

**R7 —** Google Search Central Local Business Structured Data. Search eligibility and structured data testing guidance. <https://developers.google.com/search/docs/appearance/structured-data/local-business>

**R8 —** BullMQ Idempotent Jobs. Retry safe consumer design. <https://docs.bullmq.io/patterns/idempotent-jobs>

**R9 —** Next.js revalidateTag API reference. Cache invalidation behavior is version sensitive and must be explicitly tested. <https://nextjs.org/docs/app/api-reference/functions/revalidateTag>

**R10 —** Cloudflare Turnstile Server Side Validation. Backend challenge verification is required. <https://developers.cloudflare.com/turnstile/get-started/server-side-validation/>

## Audit handover checklist

At each release, the technical owner shall retain the approved SRS revision and change history; architecture/version decisions; schema and migration history; OpenAPI specification; permission matrix; content boundary allowlist; license/source records; test and accessibility evidence; dependency/security findings; cache invalidation checks; backup/restore and rollback results; runbooks; monitoring ownership; privacy retention job evidence; and client release acceptance.

An auditor shall be able to select any requirement ID, locate its implementation boundary and test group, inspect release evidence, and identify any approved deviation with owner and expiry. Features excluded in section 23 shall not become implied MVP commitments merely because supporting libraries expose them.