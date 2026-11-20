# BOLD UP

A French marketplace that connects independent sports coaches with people who want to train near home. Launch area: Créteil and the Val-de-Marne.

This repository is the working MVP: real accounts, a real database, a real interactive map. Three roles are implemented end to end:

- **Coach**: signs up in three actions, completes a profile step by step, uploads professional documents, manages availability, answers session requests, chats with clients.
- **Customer**: browses verified coaches on a list and a map, opens a profile, requests a session on a free slot, follows bookings, saves favourites, chats with the coach.
- **Administrator**: reviews coach documents, approves or rejects applications, manages venues, users and reference lists.

The interface is available in **French (default) and English**.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage, Row Level Security, Realtime) · MapLibre GL with OpenStreetMap data (OpenFreeMap tiles) · Zod · Playwright · Vitest · Vercel.

## Run it locally

Prerequisites: Node.js 22.13 or newer, Docker Desktop (for the local Supabase stack).

```bash
npm install
npm run db:start          # starts local Supabase and applies supabase/migrations
cp .env.example .env.local
# paste the values printed by `npx supabase status -o env`:
#   API_URL -> NEXT_PUBLIC_SUPABASE_URL, ANON_KEY -> NEXT_PUBLIC_SUPABASE_ANON_KEY,
#   SERVICE_ROLE_KEY -> SUPABASE_SERVICE_ROLE_KEY
npm run db:seed           # demo data + three test accounts
npm run dev               # http://localhost:3000
```

`npm run db:seed` prints nothing secret on screen: it writes the demo logins to `.demo-credentials.md` (git-ignored).

| Role | E-mail | State |
|---|---|---|
| Coach | alexandre@boldup.test | Alexandre Moreau, approved and published |
| Customer | camille@boldup.test | Camille Reynaud, with bookings and a favourite |
| Administrator | admin@boldup.test | BoldUP Admin |
| Coach (to review) | yanis@boldup.test | Yanis Bellamy, awaiting validation: approve him from `/admin` |

All seeded people, documents and two of the venues are fictional and flagged "Démo" in the interface.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server on port 3000 |
| `npm run build` / `npm run start` | Production build and server |
| `npm run lint` · `npm run typecheck` | ESLint · TypeScript |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright) against local Supabase |
| `npm run test:db` | Database rule tests on plain PostgreSQL |
| `npm run db:start` · `db:stop` · `db:reset` | Local Supabase lifecycle |
| `npm run db:seed` | Recreate the demo scenario |
| `npm run db:push` | Apply migrations to a hosted project (`ENV_FILE=…`) |
| `npm run db:types` | Regenerate `src/lib/database.types.ts` |

## Documentation

- [Product specification](docs/PRODUCT_SPEC.md): what the MVP does and does not do
- [Architecture](docs/ARCHITECTURE.md): code layout, data model, security model
- [User journeys](docs/USER_JOURNEYS.md): the eleven journeys and how each is verified
- [Testing](docs/TESTING.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Roadmap](docs/ROADMAP.md)
- [Image and data credits](docs/CREDITS.md)
