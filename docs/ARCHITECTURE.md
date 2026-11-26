# Architecture

One Next.js application, one Supabase project. No other backend.

```
Browser ──► Next.js on Vercel (Paris region)
              ├─ Server Components  → read through src/lib/data (user session, RLS applies)
              ├─ Server Actions     → write through src/lib/actions (Zod validation)
              └─ Route handlers     → /auth/callback, /api/documents/[id], /api/geo, /api/cron/*
                       │
                       ▼
            Supabase: Postgres + Auth + Storage + Realtime
              ├─ Row Level Security on every table
              ├─ SECURITY DEFINER functions = the business rules
              └─ private bucket for documents, public buckets for photos
```

## Code layout

| Path | Contents |
|---|---|
| `src/app/(site)` | Public site and customer area (header + phone tab bar) |
| `src/app/(auth)` | Sign-up, sign-in, password, become a coach |
| `src/app/pro` | Coach area (own layout, guarded by `requireCoach`) |
| `src/app/admin` | Back office (own layout, guarded by `requireAdmin`, 404 for everyone else) |
| `src/app/api` | Document access, place search, daily job |
| `src/proxy.ts` | Session refresh and early redirect for protected paths |
| `src/components/ui` | Design system: buttons, fields, badges, sheet, toast |
| `src/components/*` | Feature components (map, booking, messages, pro, admin, site) |
| `src/lib/data` | Read side, server only |
| `src/lib/actions` | Write side: Server Actions |
| `src/lib/domain.ts`, `search.ts`, `geo.ts`, `format.ts` | Pure logic, unit-tested |
| `src/lib/verification/checks.ts` | The simulated pre-check |
| `src/lib/i18n` | French and English dictionaries, locale cookie |
| `supabase/migrations` | Schema, functions, policies, reference data |
| `scripts` | Seed, migration helper, database test runner |
| `tests` | Unit, database and end-to-end tests |

## Data model

| Table | Role |
|---|---|
| `profiles` | One row per account: role, name, town, preferences. Private (self and admin). |
| `sports`, `document_types` | Reference lists, editable by admins |
| `coach_profiles` | Public profile, location, booking settings, verification status |
| `coach_sports`, `coach_services`, `coach_qualifications`, `coach_media` | What a coach offers and states |
| `coach_documents` | Uploaded files and their status |
| `verification_events` | Append-only history of every status change |
| `availability_rules`, `availability_exceptions` | Weekly hours and days off, in Paris local time |
| `bookings` | Session requests, with a snapshot of the service at request time |
| `conversations`, `messages` | One conversation per coach and customer |
| `favorites`, `notifications` | Customer shortlist, in-app notifications |
| `venues`, `venue_inquiries` | Gyms and other places, partner and claim status |
| `audit_logs` | Who decided what, and when |
| `rate_limits` | Counters for sensitive operations |

`profile_cards` is a view exposing only a name and town of the people a user actually deals with.

## State machines

Each one is a SQL function listing the allowed pairs, checked by a trigger on every update, whoever makes it. `src/lib/domain.ts` mirrors them for the interface and a unit test fails if the two drift.

- **Profile**: `draft → awaiting_review → approved | rejected | changes_requested`, `approved → changes_requested | suspended`, `suspended → approved`, `changes_requested | rejected → awaiting_review`.
- **Document**: `uploaded → precheck_pending → precheck_completed → awaiting_review | needs_attention`, `awaiting_review → approved | rejected | info_requested`, `approved → expired`.
- **Booking**: `requested → accepted | declined | cancelled`, `accepted → cancelled | completed`.

## Security model

1. **Row Level Security everywhere.** API roles start with no privileges and get explicit grants. Public visitors can read approved and published coaches, their services, and published venues; nothing else.
2. **Guard triggers** freeze sensitive columns for API clients (`role`, `verification_status`, `verified_by`, `slug`…). Inside a `SECURITY DEFINER` function the current role is the function owner, which is how a trusted path is told apart from a direct write.
3. **Business actions are functions** that check the caller: `submit_coach_profile`, `register_document`, `admin_review_document`, `admin_decide_coach`, `request_booking`, `respond_booking`, `start_conversation`… Admin functions call `is_admin()`; an admin can never decide on their own profile.
4. **No double booking**: an exclusion constraint forbids two live bookings on overlapping time ranges for the same coach, and `request_booking` re-checks the slot with the same function that lists free slots.
5. **Documents**: private bucket, files under `<coach id>/…`, storage policies for owner and admin, access through `/api/documents/[id]` which returns a signed URL valid for one minute.
6. **Service role** is used in three places only: creating accounts, recording the pre-check result, rate limiting. The key never reaches the browser (`server-only`).
7. **Rate limits** (database-backed, per IP or user): sign-up, sign-in, magic link, password reset, document upload, venue enquiries, plus a cap on messages per minute and on pending requests per customer.
8. **Headers**: `X-Frame-Options: DENY`, `nosniff`, strict referrer policy, restricted permissions policy.

## Map and location

MapLibre GL renders OpenStreetMap vector tiles served by OpenFreeMap (no key, production use allowed, attribution shown). The style URL is configurable with `NEXT_PUBLIC_MAP_STYLE_URL`; the default ("liberty") is recoloured at runtime by `applyMapTheme` (`src/components/map/map-theme.ts`), layer by source layer, so the map wears Bold Up's colours without hosting a style.

`MapView` (`src/components/map/map-view.tsx`) is the only component that talks to MapLibre. Pins are React elements rendered through portals into MapLibre markers, so they are real buttons (keyboard, screen readers) styled and animated in CSS: a coach is their portrait ringed in the colour of their first discipline, a place or an event is a tile with its icon and colour. Pins that would overlap are grouped on screen into a counted bubble at each zoom change (greedy, in pixels); people and places never share a bubble and the selected pin always stands alone. `cluster="places"` keeps every coach on their own pin (used by the coach search). Selecting a pin flies the camera to it; `padding` keeps pins clear of floating panels.

Around it: `markers.ts` turns coaches, places and events into pins, `map-preview.tsx` is the card that opens on the map, `HomeMap` is a section map for any mix of the three, `PinMap` shows one location, and `ExploreMap` (`/carte`) is the full-screen experience with layer and discipline filters whose state is mirrored in the URL (`src/lib/explore.ts`). Town search uses the French national address base (Géoplateforme) through `/api/geo`, with a built-in list of launch-area towns as an instant fallback. Distances are haversine distances between real coordinates; the search logic is isolated in `src/lib/search.ts` so it can move to PostGIS when volume requires it.

## Places and events (V2)

Gyms, sports clubs and street workout spots share the `venues` table; `category` tells them apart (`GYM_CATEGORIES` versus `club` and `street_workout` in `src/lib/domain.ts`) and `placeHref` gives each its own route. `sports` lists the disciplines practised, `facilities` holds filterable keys (`PLACE_FEATURES`) or free text, `is_free` and `always_open` describe open-air spots. Events have their own table (`events`): local Paris dates, a kind, an optional discipline, coordinates. Both follow the venue security model: anyone reads published rows, only administrators write.

Filtering stays in `src/lib/search.ts` (`searchVenues`, `searchEvents`), pure and unit-tested; each listing keeps its state in the URL through a small reader/writer pair (`src/components/places/params.ts`, `src/components/events/utils.ts`), like the coach search.

## Design system (V2)

Tokens live in `src/app/globals.css`: neutrals with a violet tint, the flame gradient, volt, gold for verification only. The tone system gives every discipline, place category and event kind a colour: an element with `data-tone="<key>"` exposes `--tone`, `--tone-soft`, `--tone-ink` and `--tone-on` to itself and its children, consumed by the `tone-*` utilities. Components never name a colour.

## Calendar (V2)

`src/lib/calendar.ts` holds the pure date arithmetic (Monday weeks, month grids, clamping to the booking horizon), always on Paris date keys. `SlotPicker` offers the free slots returned by the database in day, week and month views (week by default); `BookingsCalendar` shows a person's sessions the same three ways on `/reservations` and `/pro/agenda`.

## Internationalisation

Each namespace declares French and English together with `dict(fr, en)`; TypeScript rejects a missing key. The locale is a cookie (`bu_locale`, French by default), switchable from every screen and saved on the profile. Dates, times and prices go through `src/lib/format.ts` (Europe/Paris, EUR). Content typed by users is stored in one language; reference lists carry both names.

## Extension points

- **Real document analysis**: replace `runTechnicalChecks` (same report shape) or call a provider from `runPrecheckAction`. The workflow around it does not change.
- **Payments**: `bookings` already snapshots price and duration; add a payment table keyed on booking and a status alongside, without touching the booking state machine.
- **More languages**: add a locale to `src/lib/i18n/config.ts` and a third argument to `dict()`.
