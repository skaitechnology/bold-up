# Roadmap

What exists today is the core loop: a coach gets verified and published, a customer finds them and requests a session. Everything below is deliberately left out of the MVP.

## Next (after the first real coaches)

1. **Transactional e-mail**: confirmation of a request, acceptance, document decisions. Needs a mail provider configured in Supabase.
2. **Reviews after a completed session**, only from customers who actually trained with the coach.
3. **Coach onboarding polish**: photo cropping, gallery upload from the editor, a public preview before submission.
4. **Admin tooling**: bulk actions, document expiry reminders ahead of time, an automated account-erasure job.
5. **Google sign-in** in production (the flow is built; it needs an OAuth client).

## Partner ecosystem

- Venue claim flow with verification of the manager, enhanced partner pages (photos, facilities, coach-friendly time slots).
- Session spaces: a coach picks a partner venue when accepting a request.
- Shops, training schools and online businesses as directory categories (the `venues.category` field already allows `shop` and `school`).
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
