# BOLD UP — notes for coding agents

Read `AGENTS.md` first: this project uses Next.js 16, whose conventions differ from older versions (`src/proxy.ts` replaces middleware, request APIs are async). The bundled docs live in `node_modules/next/dist/docs/`.

## What this is

Two-sided marketplace for sports coaching in France (coach, customer, admin). Product scope and the reasons behind it: `docs/PRODUCT_SPEC.md`. Code map and security model: `docs/ARCHITECTURE.md`.

## Rules that must not be broken

- **The database is the authority.** Verification, bookings and roles change only through the `SECURITY DEFINER` functions in `supabase/migrations/*_functions.sql`. Do not add direct table writes for those from the app, and never use the service-role client to get around a policy.
- **"Verified" means a human approved it.** The pre-check in `src/lib/verification/checks.ts` is a simulated, technical file check. It must never be presented as authentication of a document, and it must never produce the public badge.
- **Service role stays on the server.** `src/lib/supabase/admin.ts` imports `server-only`. It is used for account creation, the pre-check and rate limiting, nothing else.
- **No invented facts.** No fake statistics, ratings, revenue, partnerships or discounts. Dashboards show counts read from the database. Seeded content (coaches, clubs, street workout spots, events) is flagged `is_demo` and labelled "Démo"; demo events say on their page that their dates are fictional.
- **Both languages, always.** Every string goes in `src/lib/i18n/dict/*.ts` with French and English side by side; `dict()` makes a missing translation a type error. French is the default. No hardcoded copy in components.
- **Paris time.** Scheduling is computed in `Europe/Paris` (SQL `open_slots`, `src/lib/format.ts`), never in the browser's zone.
- **Privacy.** Coach locations are a town centroid plus jitter, never an address. Messages are readable by the two participants only, admins included.

## Conventions

- Server Components fetch through `src/lib/data/*` (user-scoped Supabase client, RLS applies). Mutations are Server Actions in `src/lib/actions/*`, validated with Zod, returning an error *code* from `src/lib/errors.ts` that the UI translates.
- UI kit in `src/components/ui`. Colors and type come from tokens in `src/app/globals.css`; do not hardcode a palette. V2 look: deep night base, the flame gradient (`bg-bold`, `Button variant="accent"`) for the key action of a screen, volt as a highlight. Gold means "verified" and nothing else.
- **One colour per discipline, place category and event kind**: put `data-tone="<sport slug | venue category | event kind>"` on an element and use `tone-solid`, `tone-soft`, `tone-text`, `tone-fill`, `tone-border`, `tone-ring`, `tone-cover`. A new key is one line in `globals.css`.
- **Maps** go through `MapView` (`src/components/map/map-view.tsx`): build pins with `src/components/map/markers.ts`, show what a pin stands for with `MapPreview`. For a section map use `HomeMap`, for a single location `PinMap`. Map paint colours live in `map-theme.ts` (WebGL cannot read CSS variables). Never show a coach at a precise address, and never fake live presence.
- Constants shared by a Server Component and a Client Component live in `src/lib/*`, not in a `"use client"` file (the server only gets a reference to those exports).
- A lucide icon cannot be passed as a prop from a Server Component into a Client Component (pass it as a child element instead).
- After changing the schema: add a migration, `npm run db:reset`, `npm run db:types`, and keep the TypeScript transition tables in `src/lib/domain.ts` equal to the SQL ones (a unit test compares them).

## Before saying something works

```bash
npm run lint && npm run typecheck && npm test && npm run test:db && npm run test:e2e
```

The e2e suite needs local Supabase (`npm run db:start`) and reseeds the demo scenario itself. It refuses to run against a hosted project.
