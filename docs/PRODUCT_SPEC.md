# Product specification — MVP

## Purpose

BOLD UP makes it easy for an independent sports coach in France to have a professional presence online, and for someone nearby to find, evaluate and book that coach. Independent gyms are the third side: places where coaches can run sessions.

Launch area: **Créteil, Val-de-Marne and nearby Île-de-France**. The data model is national; the content is local on purpose.

## Roles

| Role | Can do |
|---|---|
| Visitor | Browse coaches, the map, venues and coach profiles without an account |
| Customer | Request sessions, cancel them, save favourites, message coaches, edit their account, ask for deletion |
| Coach | Everything a customer can read, plus: profile editor, documents, availability, requests, agenda, messages |
| Administrator | Review documents and coach applications, publish or hide listings, manage venues, users, sports and required documents |

## What is implemented

### Coach
- Sign-up in three actions (choose "Je suis coach", three fields, submit). No diploma or insurance asked at sign-up.
- Dashboard with a status card, a completion ring computed from real data (nine steps), a checklist with direct links, real counters (pending requests, upcoming and completed sessions).
- Profile editor in five independent sections: identity and photo, coaching (sports, levels, formats, experience), services and prices, location (town + radius, never an address), qualifications and links. Each section saves on its own.
- Documents: upload of PDF, JPG or PNG to private storage, simulated pre-check with visible states, history, replacement and deletion.
- Submit for review, unlocked when the nine steps are complete.
- Weekly availability with several ranges per day, slot step, minimum notice, pause switch, days off.
- Requests: accept, decline, cancel, mark as completed. Week agenda.
- Public profile at `/coach/<slug>` with share link and Open Graph preview.

### Customer
- Home with sport and town search, sport shortcuts, nearby coaches, live map preview.
- Discovery page: list and map in sync, filters by sport, town or "near me", distance and maximum price. Split layout on desktop, map with a results sheet on phones.
- Coach profile and booking request: service, day, free time slot, place, optional message. Signing in mid-way keeps the selection.
- Bookings (upcoming, past), favourites, messages, notifications, account.

### Administrator
- Overview with counters read from the database, the review queue, recent decisions, venue enquiries.
- Coach list with search and filters; coach review page with secure document access, pre-check report, external-check note, per-document decision, qualification check, application decision, full history.
- Venues: create, edit, locate an address, partner and claim status, publish or hide, delete. Enquiries sent from venue pages.
- Users: search, suspend, reinstate, see deletion requests.
- Settings: sports list, which documents are required.

### Venues
- Directory and detail pages. Three honest states: **official partner**, **claimed listing**, **public listing** (unclaimed, from OpenStreetMap). A "Do you manage this venue?" form reaches the admin.

## Verification policy

Two levels, never merged:

1. **Simulated pre-check** (automatic). Technical only: the file exists, it really is a PDF/JPEG/PNG, its size is acceptable, metadata is present. It is labelled "simulated" everywhere and extracts nothing.
2. **Human approval**. An administrator opens each document, may record an external check (for example a lookup on the official sports educators portal), then approves, rejects or asks for more.

The public "Vérifié" badge exists only when an administrator has approved the profile **and** every required document is approved. If a required document is deleted or expires, the approval is withdrawn automatically until a new one is reviewed.

The official pages on sports.gouv.fr could not be read while this version was built (the site answered 503), so the regulatory wording in the product comes from general knowledge of the French rules and has not been checked line by line against the official text. It must be reviewed before launch.

Required documents are platform policy, editable by the admin (default: professional sports educator card and professional liability insurance; diploma, business registration and others are optional). They are not a statement that the law requires the same in every case: a diploma does not authorise every discipline, and the admin screen says so.

## Deliberately not in this version

Online payment and payouts, subscriptions for coaches, reviews and ratings, loyalty and partner discounts, shops and training schools as full categories, nutrition and training tracking, real OCR or AI document analysis, group class capacity, a native app. See [ROADMAP.md](ROADMAP.md). Prices are shown for information; the app never says a payment was collected.

## Assumptions made

- **E-mail confirmation is skipped at sign-up** so a coach reaches the dashboard immediately. Accounts are created server-side as confirmed. Ownership of the address is therefore not proven at sign-up; passwordless sign-in and password reset do prove it. To require confirmation, switch `signUpAction` to the public sign-up call.
- **A requested slot is held** until the coach answers, so two customers cannot request the same time.
- **Sample prices** on demo coaches are examples, not Bold Up pricing.
- **Demo imagery** shows no identifiable face (see [CREDITS.md](CREDITS.md)); replace it before a public launch.

## Open legal and compliance decisions

These need the founder and legal counsel, and are not settled by the code:

- Publisher identity, legal notice and data-protection contact on the privacy and terms pages (both are marked provisional).
- Retention periods for professional documents, messages and closed accounts.
- The exact list of required documents per discipline, and the process for checking a professional card against the official register.
- Whether Bold Up needs its own insurance or a specific status as an intermediary once payments are added.
- Processing agreement terms with the hosting providers, and the record of processing activities.
- Account deletion is a request handled by an admin today; an automated, time-bound erasure job is not built yet.
