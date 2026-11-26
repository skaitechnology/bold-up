# Roadmap

What exists today is the core loop (a coach gets verified and published, a customer finds them and requests a session) plus, since V2, the live map, clubs, street workout spots, events and the three calendar views. Everything below is deliberately left out so far.

## Right after V2

1. **Real data for clubs, street workout spots and events.** Import clubs and outdoor fitness stations from OpenStreetMap (as was done for gyms), and enter or feed real events. Today they are demonstration content.
2. **Photos** for clubs, spots and events (`photo_path` exists; pages use a coloured cover until then).
3. **Favourites and reminders** for places and events; "I'm going" on an event.
4. **Opt-in live presence on the map** (who trains where, now). It is what would bring the map closest to a social map; it needs consent, privacy rules and moderation before any code.
5. **Coaches attached to clubs and spots**: "trains here", sessions offered at a given spot.

## Next (after the first real coaches)

1. **Transactional e-mail**: confirmation of a request, acceptance, document decisions. Needs a mail provider configured in Supabase.
2. **Reviews after a completed session**, only from customers who actually trained with the coach.
3. **Coach onboarding polish**: photo cropping, gallery upload from the editor, a public preview before submission.
4. **Admin tooling**: bulk actions, document expiry reminders ahead of time, an automated account-erasure job.
5. **Google sign-in** in production (the flow is built; it needs an OAuth client).

## Partner ecosystem

- Venue claim flow with verification of the manager, enhanced partner pages (photos, facilities, coach-friendly time slots).
- Session spaces: a coach picks a partner venue when accepting a request.
- Shops, training schools and online businesses as directory categories (the `venues.category` field already allows `shop` and `school`; clubs and street workout spots shipped in V2).
- Partner offers. Not before signed agreements exist: nothing is invented in the product.

## Revenue

- Online payment for sessions and payouts to coaches.
- Coach subscription plans and extra visibility.

## Product depth

- Client management for coaches: notes, progress, session history.
- Training and nutrition tracking.
- Group sessions with capacity.
- Real document analysis (OCR, expiry extraction) behind the existing pre-check interface.
- National coverage, search moved to PostGIS, more languages.
- **BOLD UP GYM** as a separate connected product.

## Ideas kept from the HTML prototype

Search "precision" meter, time-of-day filters, per-coach promotions, a "Top Coach" badge, monthly coaching subscriptions, loyalty tiers and partner QR codes, a live revenue view for coaches. They were simulated in the prototype; each needs real data or a commercial decision before it is built.
