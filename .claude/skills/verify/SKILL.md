---
name: verify
description: How to launch and drive Rokade end-to-end (file mode and multi-user mode) for verification.
---

# Verifying Rokade

## Launch

- File mode (no clubs/auth): `npm run dev` — data in `.data/tournaments/*.json`.
- Multi-user mode: `docker compose up -d` (Postgres on 5433), migrate with
  `npm run db:migrate`, then
  `DATABASE_URL="postgres://rokade:rokade@localhost:5433/rokade" npm run dev`.
- **Never run two dev instances from the same checkout** — they share `.next`
  and corrupt it. Check `lsof -i :3000 -sTCP:LISTEN` first; kill or reuse.
- Inspect the db directly: `docker exec turneringsservice-db-1 psql -U rokade -d rokade -c "..."`.

## Driving the UI with curl

All forms are progressive-enhancement server actions, so curl works:

1. GET the page, find the form's hidden `$ACTION_ID_<hex>` input.
   **Match inside the `<form>` element containing the fields you expect** — a
   bare regex over the whole HTML hits ids in the RSC payload or, worse, the
   logout form (POSTing that id logs you out).
2. POST multipart to the same URL:
   `curl -b cookies.txt <page-url> -X POST -F '$ACTION_ID_<hex>=' -F 'field=value' ...`
   Success = 200 (re-render) or 303 (redirect); thrown action errors = 500.

## Login (magic link)

No SMTP in dev; the link is printed to the dev-server log:
`[rokade] innloggingslenke til <email>: http://...bekreft?token=...`
POST the login form with an email, grep the log for the token, GET the
bekreft page, POST its form (`token=` field) with `-c cookies.txt` to
capture the `rokade_session` cookie.

## Flows worth driving

- Club: create on `/klubber`, add member, check roles.
- Tournament: create on `/turneringer` (needs `clubId` in multi-user mode),
  add players, pair, set result on `/turneringer/<id>`.
- Isolation probes: second user (other/no club) must get 404 on the
  tournament page and 500 on direct action POSTs, with no rows changed.
- File-mode regression: without `DATABASE_URL`, pages render, mutations write
  to `.data/`, and nothing touches Postgres.
