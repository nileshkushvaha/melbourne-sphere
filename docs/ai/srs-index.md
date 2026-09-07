# SRS navigation index

Index into `docs/Melbourne_Sphere_Technical_SRS_v1.md` (670 lines, MD5 `d59de99dc57ecf636012a0e9619e432d` on 2026-09-07; SRS revision 1.1). It maps implementation areas to the SRS's own headings and requirement IDs so a session reads the complete relevant sections instead of the whole document. It is not a specification: when in doubt, open the section. Line numbers are approximate anchors for `sed -n`; headings are exact.

| Area | SRS heading (exact) | IDs | Approx. lines |
| --- | --- | --- | --- |
| Governance, precedence, actors | `# 1 Scope and requirement governance` (`## Mandatory scope`, `## Interpretation and precedence`, `## Actors and responsibility`) | SCP 001–005 | 80–108 |
| Melbourne geographic scope | `# 1 Scope and requirement governance` (SCP 001–005) and `# 6 Business listings and local areas` (BUS 008) | SCP, BUS 008 | 80–108, 204–223 |
| Public experience, branding, routes | `# 2 Reference and public experience` (`## Reference interpretation`, `## Public route contract`) | UX 001–003 | 109–139 |
| Architecture, repository, boundaries | `# 3 Agreed architecture and repository` | ARC 001–005 | 140–165 |
| Hero banner and search box | `# 4 Hero banner and search interaction` | HERO 001–007 | 166–183 |
| Directory search, filters, sort, pagination | `# 5 Directory search and discovery` | DIR 001–008 | 184–203 |
| Business listings, hours, publication, duplicates | `# 6 Business listings and local areas` | BUS 001–008 | 204–223 |
| Reviews, ratings, abuse reports, moderation | `# 7 Ratings reviews and abuse reporting` | REV 001–005, REP 001–002 | 224–241 |
| Enquiries and contact handling | `# 8 Business enquiries and contact handling` | ENQ 001–007 | 242–259 |
| Blog, editorial, comments | `# 9 Blog and editorial content` | BLOG 001–005, COM 001–002 | 260–277 |
| Admin auth, accounts, admin UX | `# 10 Administration and permissions` | ADM 001–003, AUTH 001–003 | 278–317 |
| **Roles, permissions, effective access, permission-aware admin UI** | `# 10 Administration and permissions` (RBAC block, revision 1.1) | RBAC 001–012 | 278–317 |
| Media pipeline and site configuration/pages | `# 11 Media and site configuration` | MED 001–004, CFG 001–003 | 318–335 |
| SEO, sitemap, redirects, structured data | `# 12 SEO indexing and structured data` | SEO 001–007 | 336–353 |
| Core data model and invariants (entity table) | `# 13 Data model and relational invariants` | DAT 001–003 | 354–375 |
| Editorial/operational model, migrations | `# 14 Editorial and operational data model` | DAT 004–006 | 376–406 |
| Public REST contract (route table), envelopes, idempotency | `# 15 REST contract and public API` | API 001–004 | 407–435 |
| Admin API, versioning, module ownership | `# 16 Admin API and module ownership` | API 005, MOD 001–002 | 436–469 |
| Events, outbox, caching, invalidation | `# 17 Events caching and consistency` | EVT 001–002, CACHE 001–003 | 470–491 |
| Security, privacy, retention | `# 18 Security privacy and retention` | SEC 001–004, PRIV 001–002 | 492–514 |
| Performance, accessibility, responsive, compatibility (NFR table + rules) | `# 19 Non functional requirements` | NFR 001–013 | 515–537 |
| Deployment, backups, monitoring | `# 20 Deployment backups and monitoring` | OPS 001–004, BACK 001–002, MON 001–002 | 538–555 |
| Verification and acceptance matrix (T01–T14) | `# 21 Verification and acceptance matrix` | QA 001–003 | 556–581 |
| Implementation sequence and release gates | `# 22 Implementation sequence and release gates` | — | 582–606 |
| Client decisions D01–D08, risks, future scope | `# 23 Decisions risks and future scope` (`## Launch decision register`, `## Principal risks and controls`, `## Explicit future scope`) | FUT 001–004 | 607–637 |
| Sources and audit handover checklist | `# 24 Source register and audit handover` | — | 638–670 |

Per-phase acceptance criteria are written in `docs/setup-progress.md` from these sections; the requirement-level status lives in `docs/requirements-traceability.md`.
