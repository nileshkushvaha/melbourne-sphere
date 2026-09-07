# SRS navigation index

Index into `docs/Melbourne_Sphere_Technical_SRS_v1.md` (637 lines, MD5 `fcbd1675fb4cd505c1d395b4e7a0c0cb` on 2026-09-06). It maps implementation areas to the SRS's own headings and requirement IDs so a session reads the complete relevant sections instead of the whole document. It is not a specification: when in doubt, open the section. Line numbers are approximate anchors for `sed -n`; headings are exact.

| Area | SRS heading (exact) | IDs | Approx. lines |
| --- | --- | --- | --- |
| Governance, precedence, actors | `# 1 Scope and requirement governance` (`## Mandatory scope`, `## Interpretation and precedence`, `## Actors and responsibility`) | SCP 001–005 | 79–107 |
| Melbourne geographic scope | `# 1 Scope and requirement governance` (SCP 001–005) and `# 6 Business listings and local areas` (BUS 008) | SCP, BUS 008 | 79–107, 203–222 |
| Public experience, branding, routes | `# 2 Reference and public experience` (`## Reference interpretation`, `## Public route contract`) | UX 001–003 | 108–138 |
| Architecture, repository, boundaries | `# 3 Agreed architecture and repository` | ARC 001–005 | 139–164 |
| Hero banner and search box | `# 4 Hero banner and search interaction` | HERO 001–007 | 165–182 |
| Directory search, filters, sort, pagination | `# 5 Directory search and discovery` | DIR 001–008 | 183–202 |
| Business listings, hours, publication, duplicates | `# 6 Business listings and local areas` | BUS 001–008 | 203–222 |
| Reviews, ratings, abuse reports, moderation | `# 7 Ratings reviews and abuse reporting` | REV 001–005, REP 001–002 | 223–240 |
| Enquiries and contact handling | `# 8 Business enquiries and contact handling` | ENQ 001–007 | 241–258 |
| Blog, editorial, comments | `# 9 Blog and editorial content` | BLOG 001–005, COM 001–002 | 259–276 |
| Admin auth, accounts, RBAC, admin UX | `# 10 Administration and permissions` | ADM 001–003, AUTH 001–003, RBAC 001 | 277–294 |
| Media pipeline and site configuration/pages | `# 11 Media and site configuration` | MED 001–004, CFG 001–003 | 295–312 |
| SEO, sitemap, redirects, structured data | `# 12 SEO indexing and structured data` | SEO 001–007 | 313–330 |
| Core data model and invariants (entity table) | `# 13 Data model and relational invariants` | DAT 001–003 | 331–352 |
| Editorial/operational model, migrations | `# 14 Editorial and operational data model` | DAT 004–006 | 353–379 |
| Public REST contract (route table), envelopes, idempotency | `# 15 REST contract and public API` | API 001–004 | 380–408 |
| Admin API, versioning, module ownership | `# 16 Admin API and module ownership` | API 005, MOD 001–002 | 409–438 |
| Events, outbox, caching, invalidation | `# 17 Events caching and consistency` | EVT 001–002, CACHE 001–003 | 439–460 |
| Security, privacy, retention | `# 18 Security privacy and retention` | SEC 001–004, PRIV 001–002 | 461–483 |
| Performance, accessibility, responsive, compatibility (NFR table + rules) | `# 19 Non functional requirements` | NFR 001–013 | 484–506 |
| Deployment, backups, monitoring | `# 20 Deployment backups and monitoring` | OPS 001–004, BACK 001–002, MON 001–002 | 507–524 |
| Verification and acceptance matrix (T01–T14) | `# 21 Verification and acceptance matrix` | QA 001–003 | 525–549 |
| Implementation sequence and release gates | `# 22 Implementation sequence and release gates` | — | 550–574 |
| Client decisions D01–D08, risks, future scope | `# 23 Decisions risks and future scope` (`## Launch decision register`, `## Principal risks and controls`, `## Explicit future scope`) | FUT 001–004 | 575–605 |
| Sources and audit handover checklist | `# 24 Source register and audit handover` | — | 606–637 |

Per-phase acceptance criteria are written in `docs/setup-progress.md` from these sections; the requirement-level status lives in `docs/traceability.md`.
