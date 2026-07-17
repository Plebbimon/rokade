# Rokade — Product Requirements & Strategy

*Status: draft v1 · 2026-07-13 · owner: Sebastian*

## 1. Background & vision

Norwegian chess runs its tournament administration — pairings, live results, the
national tournament calendar, and the rating-report pipeline into NSF and FIDE —
on **TournamentService (TS6)**, a closed-source Windows application maintained by a
single, elderly author. The software is excellent and battle-tested since 1990,
but the arrangement is a textbook bus-factor risk for the federation.

**Rokade** is an open-source, web-based successor candidate. The goal is not to
copy TS6 (we respect the author and his IP) but to reimplement the *functions*
Norwegian chess depends on, on top of open standards (FIDE TRF, FIDE-validated
pairing engines) and NSF-owned data formats — so that no single person is ever
again a point of failure for rated chess in Norway.

**Positioning: continuity planning, not replacement.** Every conversation with
NSF and every public statement frames Rokade as an open contingency and an
eventual successor, developed respectfully alongside the incumbent.

## 2. Goals & non-goals

**Goals**

1. A club can run a complete rated tournament — announce, take signups, pair,
   record, publish live, and file NSF/FIDE reports — with zero software cost.
2. NSF owns its integration points (member lookup, report ingestion) as
   documented APIs any client could implement.
3. The codebase is maintainable by ordinary TypeScript developers and governed
   so that at least two people can always ship it.
4. FIDE-endorsable: pairings delegated to an already FIDE-validated engine
   (bbpPairings), tiebreaks per current FIDE regulations.

**Non-goals (for now)**

- Not a chess *playing* platform (no online games; PGN replay of OTB games only).
- Not a member-administration system — NSF's member registry stays the source
  of truth; Rokade reads from it.
- No pixel-parity with TS6. We keep the functions, not the interface.
- Team/lag tournaments deferred until the individual flow is proven (they are
  on the long-term map — TS6 supports them and Norway needs them eventually).

## 3. Users, roles & tenancy

TS6 licenses per club; clubs admin their own tournaments while NSF holds a
super-admin function. Rokade keeps that shape as a multi-tenant web service:

| Role | Scope | Can do |
|---|---|---|
| **Player / public** | no account | Browse terminliste and tournament pages, follow live standings, sign up for tournaments (validated against member registry — no login required) |
| **Arbiter / organizer** | per tournament | Registration desk, pairing, result entry, corrections, printouts, publish rounds, file reports |
| **Club admin** | one club (tenant) | Create tournaments, manage the club's arbiters and templates |
| **NSF admin** | global | Terminliste curation, all-tournament oversight, assist any club, integration monitoring, receive reports |

Principles: clubs are tenants and get accounts for free (open source replaces
the license fee); players never need accounts; public pages are open to all.
One NSF-hosted instance is the default; self-hosting remains possible (AGPL).

## 4. Product scope — the tournament lifecycle

The product is a lifecycle, not a pairing program. Phases 1–5 below each make
one stage of this lifecycle real.

1. **Announce.** Tournament page exists before play: invitation (innbydelse),
   dates, classes, time control, fees. Aggregated into the national
   **terminliste** — the network-effect feature players actually visit.
2. **Sign up (påmelding).** Online self-registration with **member-registry
   lookup**: a few keystrokes resolves a player against NSF's database
   (rating, club, GP group, FIDE id) and flags unpaid membership dues for the
   organizer. Entry list is visible and grows in public.
3. **Run rounds.** Pairing (FIDE Dutch via engine; Berger; NSF Monrad),
   result entry with corrections, byes/late entries/withdrawals, and **print
   products** — wall pairing lists, bordkort (score cards), start lists,
   standings. Venues run on paper.
4. **Follow along.** Live standings and round bulletins as results land;
   PGN upload for game replay. For the player at home and the parent in the hall.
5. **Wrap up & report.** Prize lists per class/rating group; one-click reports:
   **NSF ELO**, **NGP/Grand Prix quality**, **FIDE report (TRF)**.

Cross-cutting: multiple groups/classes per tournament (A/B/C is standard even
at club level), Norwegian-first UI with English second, accessibility on
public pages.

## 5. Current state (2026-07-17)

Foundation and the multi-user core are built, tested (61 tests, the
database ones against real PostgreSQL), and green in CI at
[github.com/Plebbimon/rokade](https://github.com/Plebbimon/rokade):

- TRF16 parser/serializer (byte-exact golden tests)
- FIDE Dutch pairing via bbpPairings v6.0.0 (Apache-2.0, FIDE-validated engine)
- Domain model: participants, rounds, boards, byes, forfeits, standings
- Berger round-robin per FIDE Handbook C.05 Annex 1 (table-exact tests)
- Tiebreaks per FIDE C.07 (2023): Buchholz, BH cut-1, Sonneborn-Berger,
  incl. Article 16 unplayed-round rules
- First arbiter UI: create tournament, register players, pair, record, standings
- Storage behind a `TournamentStore` interface: JSON files for zero-setup local
  use, PostgreSQL (Drizzle) for the multi-user service
- Passwordless auth (e-mail magic links), clubs as tenants with admin/arbiter
  roles, NSF super-admin, club-scoped tournament access enforced in every
  server action
- Append-only audit log of arbiter and club-admin actions, shown on the
  tournament page and per club
- Public half begun: draft/publish flow with invitation (innbydelse) editing,
  tournament pages readable by anyone once published, and the national
  terminliste grouped by pågår/kommende/ferdigspilt

## 6. Strategy

**NSF engagement (respectfully, via the general secretary's office).**
First asks package — framed as "help us document how the current flow works":

1. NSF Monrad pairing rules (TS6's help pages say Norwegian Monrad "is
   described in the Norwegian handbook" — check NSF's public handbook first;
   the ask may only be confirmation we read it right. TS6 also offers a
   "Konrad" variant allowing rematches, popular for casual club evenings)
2. One sample NSF ELO report file from a recently rated tournament
   (TS6's help pages state NSF accepts the TS6 TRX file itself as the
   rating/Grand Prix report — so the TRX format may BE the report format,
   making ask #4 doubly important)
3. One sample NGP/quality calculation
4. One TS6 XML export of an NSF-owned tournament (the format is documented for
   third-party integration; enables a migration/import story)
5. Later, at pilot stage: member-lookup API access and a report-ingestion
   endpoint — ideally specified and owned by NSF as public API docs

**Pilot plan.** Run Rokade in parallel with TS6 at one club tournament
(official report still filed from TS6). Iterate. Then a first tournament where
Rokade files the real report, with NSF's office in the loop.

**FIDE endorsement.** Needed only when Rokade runs FIDE-rated Swiss events as
the pairing program of record. Using an endorsed/validated engine (bbpPairings)
makes the application straightforward; target after the pilot proves the flow.

**Sustainability.** Move the repo to an org (NSF's or a neutral chess-tech org)
before the pilot; recruit at least one co-maintainer from the club/arbiter
community; CI + golden tests keep the correctness bar enforceable by strangers.

**Licensing.** AGPL-3.0: anyone hosting a modified version must publish their
changes — the exact failure mode this project exists to prevent.

## 7. Step-based plan

Each phase ends in something demonstrable. Order optimizes for (a) unblocking
multi-user work early, (b) making the public half visible fast — that is what
changes how the project *demos* to NSF.

**Phase 0 — Foundation ✅ (done)**
Engine, domain, tiebreaks, Berger, arbiter CRUD, CI. See §5.

**Phase 1 — Multi-user core ✅ (done)**
1. PostgreSQL + Drizzle behind `TournamentStore` (Docker Compose for dev)
2. Auth (email magic-link or passkeys; no passwords to leak)
3. Clubs as organizations; roles: club admin, arbiter, NSF admin
4. Tournament ownership & permissions; audit log of arbiter actions
   *Done when: two clubs can run tournaments without seeing each other's admin.*

**Phase 2 — The public half ✅ (done)**
1. Public tournament page: invitation, entry list, per-round results, standings ✅
2. Terminliste: national calendar, filterable, upcoming/ongoing/finished ✅
3. Live updates on public pages (SSE) ✅
4. First deliberate design pass ✅ — "the tournament bulletin": board-green /
   paper / clock-flag-red palette, IBM Plex (condensed caps for the wall-list
   voice, mono crosstables), 0-0 wordmark, light + dark
   *Done when: a parent can follow a round from their phone via a shared link.*

**Phase 3 — Påmelding & member registry**
1. `MemberRegistry` interface + CSV/fixture stub implementation
2. Public signup form with lookup, class selection, organizer approval queue
3. Dues/membership flagging surfaced to the organizer
4. Swap-in real NSF API adapter when access lands
   *Done when: signup→startlist requires no manual transcription.*

**Phase 4 — Venue tooling**
1. PDF printouts: wall pairing lists, start lists, standings, bordkort
2. Multi-group tournaments (domain + UI): classes with own pairing/standings
3. Arbiter conveniences: late entries, withdrawals, result corrections with log
   *Done when: an arbiter can run a physical weekend tournament without spreadsheets.*

**Phase 5 — Federation reports & Norwegian systems**
1. NSF Monrad pairing (from the requested rules; golden tests like Berger's)
2. NSF ELO report generation (from the sample file)
3. NGP/quality calculation
4. FIDE TRF report export; FIDE rating-list import for foreign players
5. TS6 XML import (migration story)
   *Done when: the one-click report from a finished tournament is accepted by NSF's office.*

**Phase 6 — Pilot & hardening**
1. Parallel-run pilot at a club tournament; fix what the arbiter trips on
2. Validate tiebreaks against the FIDE arbiter exercises (C.07-2023 PDF) as fixtures
3. Repo → organization, second maintainer, deployment runbook
4. First tournament of record; FIDE endorsement application when needed
   *Done when: a rated Norwegian tournament was administered start-to-finish on Rokade.*

## 8. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Incumbent author feels attacked; NSF relationship sours | Continuity framing everywhere; no feature-comparison marketing; involve NSF office early; consider inviting the author's input once mature |
| Project recreates the bus factor (one maintainer) | Org ownership + second maintainer before pilot (Phase 6.3); boring stack; tests that encode domain knowledge |
| Tiebreak/pairing correctness errors damage trust | Golden tests against FIDE tables/exercises; engine delegation; parallel-run pilot before any report of record |
| NSF API/report formats undocumented or bespoke | The asks package (§6) gets samples early; interfaces isolate every NSF touchpoint |
| FIDE rules change (pairing 2026, tiebreaks) | Engine pinned & swappable; tiebreaks isolated in one module with regulation citations in comments |
| Scope creep toward TS6 pixel-parity | This document's non-goals; each phase has a demoable definition of done |

## 9. Open questions

- Hosting: who operates the NSF instance (NSF office? volunteer ops? paid VPS)?
- Signup without login: spam/abuse protection for public påmelding — TS6
  answers this with an optional e-mail confirmation loop on signup; adopt the
  same (plus rate limits)
- USF (youth federation) — same instance or later integration?
- Name: "Rokade" is a working title; check feelings at NSF before it sticks.
- Team tournaments: when do they enter the roadmap?
