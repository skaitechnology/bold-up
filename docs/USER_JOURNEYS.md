# User journeys

The eleven journeys of the MVP, and where each is verified. "E2E" refers to `tests/e2e/marketplace.spec.ts` unless noted.

| # | Journey | What happens | Verified by |
|---|---|---|---|
| 1 | Coach registration | `/inscription` → "Je suis coach" → name, e-mail, password → dashboard greets "Bienvenue sur Bold Up, …". Log out, log in: same account, same role. | E2E journey 1: asserts the role and draft profile in the database |
| 2 | Progressive profile | Identity, photo, sports, a service and price, town, qualification, weekly hours. Each save persists; progress goes from 0 % to 89 %. | E2E journey 2: reload, database rows, draft not public |
| 3 | Document submission | Upload → "Document reçu" → "Pré-vérification en cours" → "Pré-vérification terminée — en attente de validation". Then submit the profile. | E2E journey 3: four recorded events per document, no public URL, 401 for anonymous access |
| 4 | Admin approval | Queue → coach page → open documents → approve each → approve the coach. The coach sees "Votre profil est publié." | E2E journeys 4 and 4b: approval blocked until documents are approved, audit log, internal note |
| 5 | Customer discovery | Home → sport "Boxe" → results near Créteil on the list and the map → the coach's profile. | E2E journey 5: one pin per result, distance filter, pin preview |
| 6 | Booking request | Service, day, free slot → sign-up → back on the profile with the choice kept → "Votre demande a été envoyée." | E2E journey 6: booking row with service snapshot |
| 7 | Coach accepts | "Accepter" → both sides see "Confirmée". The slot disappears and a second request on it is refused. | E2E journey 7: `open_slots` and a rejected second booking |
| 8 | Messaging | Customer writes, coach reads and replies, customer sees it after reload. | E2E journey 8: exactly the two typed messages are stored |
| 9 | Profile editing | The coach changes a price; the public profile shows it. A qualification added after approval stays "declared". | E2E journey 9 |
| 10 | Responsive | Home, search, coach profile and booking sheet, coach area, admin review, sign-up and customer screens on a phone. | `tests/e2e/mobile.spec.ts`: no horizontal overflow, key controls reachable |
| 11 | Security | A coach cannot approve themselves, a customer cannot edit a coach, a coach cannot read another coach's documents, non-admins get 404 on `/admin`, admins cannot read messages. | E2E journey 11 (through the API, bypassing the interface) and `tests/db/test.sql` |

## Trying them by hand

1. `npm run db:seed`, then open `.demo-credentials.md` for the passwords.
2. **As admin** (`admin@boldup.test`): the queue shows Yanis Bellamy. Open him, open each document, approve both, then "Approuver le coach".
3. **As a visitor**: search "Boxe" around Créteil. Yanis now appears, with his pin on the map.
4. **As Camille** (`camille@boldup.test`): open Alexandre Moreau, pick a slot, request a session, write to him.
5. **As Alexandre** (`alexandre@boldup.test`): accept the request in "Demandes", reply in "Messages", change a price in "Mon profil".
6. Create your own coach account from `/inscription` to see the empty dashboard and the checklist fill up.
