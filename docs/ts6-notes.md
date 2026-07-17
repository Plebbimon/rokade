# TS6 functional notes (from the help pages)

*Source: TS6's public online help (archived 2026-07-17, `ts6-help-page.webarchive`),
plus Sebastian's functional teardown. These notes record how the incumbent works
from a user's perspective — what we reimplement is the function, never the code
or interface.*

## Architecture

- Local, offline-first desktop app; all state in one proprietary `.trx` file
  (settings, rosters, teams, results, sponsor config). Publishing pushes state
  to a central web service and **pulls down new online signups** (two-way sync,
  triggered by Ctrl+P or on every save).
- Keyboard-centric arbiter UX: ALT mnemonics, numpad result entry, F1
  context help everywhere. Individual vs team mode changes the whole UI.

## Rating-list integration (shapes our `MemberRegistry`)

- TS6 validates players against **publicly available rating lists**, not a
  live member API: the national federation list (auto-updated for supported
  federations, staleness warning) and the FIDE list (auto-downloaded/unzipped).
- Lookup UX: prefix search on given/family name while typing → dropdown of
  candidates; picking one auto-fills rating, club, federation and the
  federation/FIDE id ("eliminates the possibility for errors in the
  identification of players when returning reports"). A separate extended
  search does substring matching.
- A player on both lists appears twice; if the national list carries the FIDE
  id, TS6 consolidates the two into one entry. For FIDE-rated events, pick
  the FIDE entry.
- **Implication for Rokade:** the member lookup for påmelding can be built on
  NSF's public rating list without waiting for API access. Only dues/
  membership-status flagging genuinely needs NSF's registry.

## Online signup (SignupService — shapes Phase 3)

- Organizer enables signup per tournament and may set a **deadline**; after it
  the form closes automatically.
- The signup form checks the entrant against the public rating list to attach
  id/rating/club. Optional **e-mail confirmation** of the signup protects
  against "jokers and false signups".
- Manual (arbiter-entered) and online signups merge into one list, published
  as a growing public entry list ("the internet audience can at any time view
  the complete and current list of signed-up players").

## Public web pages (context for Phase 2+, mostly done)

- `home.aspx` is a lifecycle redirect: invitation before round 1, bulletin
  during play, standings after (our unified tournament page covers this).
- Historical views via URL params: `&round=3` for standings/pairings after a
  given round; `&latest=5` for the most recent signups (negative for a compact
  variant). Useful backlog ideas for our public pages.
- BulletinService (per-round rich-text reports), SponsorService (logo
  placement in page margins/headers — tournaments need financing),
  GameService (PGN files with the same name as the tournament file →
  game-viewer links), and a plain URL field for external live-board pages.
- Unpublishing removes all published information permanently.

## Reporting (context for Phase 5)

- FIDE reports in FIDE's format; **some federations (NSF) accept the TRX file
  itself** as the rating/Grand Prix report.
- TS6 validates all data before submission (missing ids, unmatched results)
  and submits directly over the network — no local mail client needed; the
  reporting addresses are plain settings.

## Printing (context for Phase 4)

- Unified preview window (scaling, pagination); output to printer or file.
- Formats: PDF/HTML for distribution, RTF/TXT for pasting into word
  processors. A separate higher-quality export exists for standings only.
- Report headers show tournament/group/site; visible columns follow the main
  window's options (club, federation, national/FIDE rating).
