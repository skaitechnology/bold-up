# Deployment

Production runs on **Vercel** (functions in the Paris region, `cdg1`) with a **Supabase** project in the same region.

- Vercel project: `bold-up` in the team `skaitechnologys-projects`, linked to the GitHub repository `skaitechnology/bold-up`.
- Database: a Supabase project provisioned through the Vercel Marketplace, so its keys arrive as Vercel environment variables.

## First deployment

### 1. Provision the database

The Supabase integration needs its terms accepted once, in a browser, by a team owner:

https://vercel.com/skaitechnologys-projects/~/integrations/accept-terms/supabase

Then, from the repository:

```bash
npx vercel integration add supabase --name bold-up-db --billing-plan free --meta region=cdg1
```

This creates the project and adds `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `POSTGRES_URL_NON_POOLING` and friends to the Vercel project.

Using an existing Supabase project instead: add those four variables by hand in Vercel (Project → Settings → Environment Variables).

### 2. Remaining environment variables

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | The public URL, for example `https://bold-up.vercel.app` |
| `CRON_SECRET` | A long random string (protects the daily document-expiry job) |
| `NEXT_PUBLIC_GOOGLE_AUTH` | `1` only after Google sign-in is configured in Supabase |

```bash
npx vercel env add NEXT_PUBLIC_SITE_URL production
npx vercel env add CRON_SECRET production
```

### 3. Create the schema and the demo data

```bash
npx vercel env pull .env.production.local --environment=production
ENV_FILE=.env.production.local npm run db:push -- --yes            # applies supabase/migrations
ENV_FILE=.env.production.local npm run db:seed -- --allow-remote   # demo scenario + accounts
```

The seed writes the production demo passwords to `.demo-credentials.md` (git-ignored). `.env.production.local` contains secrets and is git-ignored too: delete it when you are done.

For a real launch without demo content, skip the seed and create the first administrator:

```sql
-- in the Supabase SQL editor, after that person has signed up normally
update public.profiles set role = 'admin' where email = 'you@example.com';
```

### 4. Supabase Auth settings

In the Supabase dashboard (opened from the Vercel integration page), under Authentication → URL Configuration:

- **Site URL**: the production URL.
- **Redirect URLs**: `https://<production-domain>/auth/callback` (add the preview pattern `https://*-skaitechnologys-projects.vercel.app/auth/callback` if previews should be able to sign in by e-mail link).

Password sign-up and sign-in work without this. It is required for the passwordless link and the password-reset e-mail. For real traffic, also configure a custom SMTP provider: the built-in Supabase mailer is limited to a few e-mails per hour.

Google sign-in (optional): create an OAuth client in Google Cloud, enable the Google provider in Supabase with its id and secret, then set `NEXT_PUBLIC_GOOGLE_AUTH=1`.

### 5. Deploy

Pushing to `main` deploys to production; any other branch gets a preview URL. From the command line:

```bash
npx vercel deploy --prod
```

### 6. Verify the live site

A green build is not proof. Check, on the public URL:

- [ ] Home page loads, language switch works
- [ ] `/coachs`: results and map pins appear
- [ ] Sign up as a coach, reach the dashboard, log out and back in
- [ ] Upload a document: it reaches "en attente de validation"
- [ ] As admin: open the document, approve it, approve the coach
- [ ] As a customer: request a session; as the coach: accept it
- [ ] `/admin` answers 404 when signed in as a customer

## Later deployments

Schema change: add a file in `supabase/migrations`, then `ENV_FILE=.env.production.local npm run db:push -- --yes` **before** deploying code that needs it.

### Deploying V2 over a V1 production

V2 needs two additive migrations and its demo content. In this order:

```bash
npx vercel env pull .env.production.local --environment=production
ENV_FILE=.env.production.local npm run db:push -- --yes                  # venue categories, events table
ENV_FILE=.env.production.local npm run db:seed:places -- --allow-remote  # demo clubs, spots and events
npx vercel deploy --prod
rm .env.production.local
```

`db:seed:places` replaces only its own demo rows: accounts and the passwords already shared stay as they are. Run it again whenever the demo events have drifted into the past (their dates are computed from the day it runs). Because the migrations only add things, rolling the code back to V1 needs no database change.

After deploying, also check on the public URL: `/carte` shows portraits and coloured pins, `/clubs`, `/street-workout` and `/evenements` list their content, and the booking panel opens on the week view.

## Local development

See the README. `npm run db:start` runs the whole Supabase stack in Docker with the same migrations.
