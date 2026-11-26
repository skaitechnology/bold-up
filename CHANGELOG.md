# Changelog

## 0.2.0 — V2 (2026-11-26)

Built from the client's feedback on the first demo. Nothing from 0.1.0 was removed. Full description (in French): [docs/V2.md](docs/V2.md).

### Added

- **Live map** at `/carte`: coach portraits as pins ringed in their discipline colour, one shape and colour per kind of place, dated event pins, counted bubbles that open on click, selection animations, previews that open on the map, quick layer and discipline filters, a "nearby" rail, 3D view.
- **Home page** rebuilt around "Trouver mon COACH": a magnifier opens the disciplines with their icons and every filter; the events section sits directly under it.
- **Coach search filters**: availability (today, weekdays, weekend), where the session takes place, sort by price.
- **Calendar views** Day / Week / Month (Week by default) for choosing a slot, and for the customer's and the coach's sessions.
- **Sports clubs** (`/clubs`, `/club/<slug>`) and **street workout spots** (`/street-workout`, `/street-workout/<slug>`), each with their own filters and detail pages; managed from `/admin/salles`.
- **Sports events** (`/evenements`, `/evenement/<slug>`): HYROX, marathons, trails, competitions, challenges, local events; calendar file download; managed from `/admin/evenements`.
- Demo content for all of the above (`npm run db:seed:places`), always labelled "Démo".
- Unit tests for the new search, calendar, places and events logic; end-to-end tests in `tests/e2e/v2.spec.ts`.

### Changed

- **Design system**: deep night base, flame gradient for key actions, volt highlight, one colour per discipline through `data-tone`. Gold now means "verified" only.
- **Navigation**: the map is the featured entry in the header and the centre tab on phones; clubs, street workout and events are linked from the header, the tab bar, the footer and the home page.
- Base map style is OpenFreeMap "liberty", recoloured at runtime.
- `/salles` lists indoor venues only; clubs and spots opened under `/salle/` redirect to their own pages.

### Database

- `venue_category` gains `club` and `street_workout`; `venues` gains `sports`, `is_free`, `always_open`.
- New table `events` with row level security (public read of published rows, admin write).

## 0.1.0 — MVP (2026-11-20)

Coach, customer and administrator journeys end to end: sign-up, verified coach profiles, search with a map, session requests, messaging, back-office.
