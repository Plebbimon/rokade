# ♜ Rokade

[![CI](https://github.com/Plebbimon/rokade/actions/workflows/ci.yml/badge.svg)](https://github.com/Plebbimon/rokade/actions/workflows/ci.yml)

**Fri og åpen programvare for sjakkturneringer i Norge.**

Rokade is an open-source tournament administration platform for Norwegian chess:
pairings, results, tournament pages, and rating reports to the Norwegian Chess
Federation (NSF) and FIDE. It is an independent project — not affiliated with,
or derived from, the existing TournamentService software — motivated by giving
Norwegian chess an open, community-maintainable alternative.

> "Rokade" (castling) is a working title; renaming is a find-and-replace away.

## Architecture

One language (TypeScript, strict) end to end. The domain logic lives in a pure
package with zero framework dependencies, so it outlives any web-framework churn.

```
packages/core      Domain: tournament model, TRF16 parser/serializer,
                   (soon) NSF Monrad & Berger pairing, tiebreaks, NSF ELO reports
packages/pairing   Thin adapter around the bbpPairings binary (FIDE Dutch system)
apps/web           Next.js: public tournament pages + arbiter UI (skeleton)
```

Key decisions:

- **FIDE Dutch pairings are delegated to [bbpPairings](https://github.com/BieremaBoyzProgramming/bbpPairings)**
  (Apache-2.0, implements the FIDE 2026 rules, speaks TRF). We never reimplement
  FIDE Swiss; we only implement the Norwegian systems (NSF Monrad, Berger) ourselves.
- **Every NSF touchpoint hides behind an interface** (member lookup, report
  submission). They start as stubs/CSV fixtures and become real adapters when
  NSF API access lands — nothing else changes.
- **Golden-file tests**: real TRF files in, expected output byte-for-byte out.
- **Self-hostable**: plain Node + PostgreSQL (planned), Docker Compose, no cloud lock-in.

## Getting started

```sh
npm install
npm test              # unit tests (TRF round-trip, pairing output parsing)
npm run typecheck

# optional: build the pairing engine, enables the integration test
npm run fetch:bbppairings
npm test

npm run dev           # web app on http://localhost:3000
```

## Roadmap

- [x] TRF16 parse/serialize with golden-file round-trip tests
- [x] bbpPairings adapter (FIDE Dutch, next-round pairing)
- [x] Tournament domain model (participants, rounds, byes, standings, TRF bridge)
- [ ] Persistence (PostgreSQL/Drizzle)
- [ ] Tiebreaks (FIDE 2023 regulations subset used in Norway)
- [ ] Berger (round robin) pairing tables
- [ ] NSF Monrad pairing (rules requested from NSF)
- [ ] Arbiter UI: registration, result entry, round management
- [ ] Public pages: tournament page, standings, terminliste (calendar)
- [ ] NSF ELO report generation (needs one sample report file)
- [ ] NSF member-database adapter (needs API access)
- [ ] FIDE rating report export + FIDE player-list import

## License

[AGPL-3.0](LICENSE). Chosen so that anyone hosting a modified version must share
their changes — the point of this project is that Norwegian chess never again
depends on software only one person can maintain. (The bbpPairings engine is a
separate Apache-2.0 work, invoked as an external binary.)
