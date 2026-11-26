# Testing

| Layer | Command | Needs | Covers |
|---|---|---|---|
| Types and lint | `npm run typecheck`, `npm run lint` | nothing | Whole codebase, including translation key parity |
| Unit | `npm test` | nothing | State machines (compared with the SQL), completion %, search and distance, search URL and the V2 filters (availability, place, price sort), calendar arithmetic, place and event filters, the event calendar file, pre-check, formatting in Paris time, dictionaries |
| Database rules | `npm run test:db` | local PostgreSQL (`psql`, `createdb`) | Permissions, verification workflow, double booking, message privacy, on a throwaway database |
| End to end | `npm run test:e2e` | Docker + `npm run db:start` | The full multi-role story in a real browser against local Supabase |
| Build | `npm run build` | env vars | Production build |

## End-to-end tests

`playwright.config.ts` builds the app into `.next-e2e`, serves it on port 3100 and runs two projects: `desktop` (the story, serial) and `mobile` (responsive checks).

- `marketplace.spec.ts` is the V1 story (eleven journeys); `v2.spec.ts` covers the home search, the live map (pins, bubbles, filters, previews), clubs and street workout, events, and the calendar views. It relies on the seeded demo content (10 clubs, 10 spots, 13 events).
- `tests/e2e/global-setup.ts` **reseeds the demo scenario** and clears rate-limit counters, so every run starts from the same state.
- The story creates its own coach and customer with unique e-mails and **deletes them afterwards**.
- The suite **refuses to run against a hosted project**: it checks that the Supabase URL is local.
- Assertions read the database with the service role (status, events, audit log) and probe the API as real users to confirm that forbidden actions are refused by the server, not just hidden.

Faster loop while developing, against a running `npm run dev`:

```bash
E2E_BASE_URL=http://localhost:3000 npx playwright test --project=desktop
```

## Database rule tests

`scripts/test-db.sh` creates a temporary database, loads `tests/db/shim.sql` (a minimal stand-in for Supabase's `auth` and `storage` schemas and API roles), applies every migration and runs `tests/db/test.sql`. It needs no Docker. Note: it creates three login-less roles (`anon`, `authenticated`, `service_role`) in the local PostgreSQL cluster if they do not exist.

## What is not automated

- Safari and Firefox (tests run in Chromium).
- E-mail flows (magic link, password reset): they depend on the mail provider configured in Supabase. Locally, messages arrive in Mailpit at http://127.0.0.1:54324.
- Google sign-in: needs a Google OAuth client.
- Realtime delivery of messages is exercised indirectly; the thread also refreshes on a timer, which is what the test relies on.
