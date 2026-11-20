#!/usr/bin/env bash
# Finishes the production setup in one go, once the Supabase terms have been accepted
# on Vercel (see docs/DEPLOYMENT.md, step 1). Safe to run again: each step is skipped
# or repeated without harm.
#
#   bash scripts/go-live.sh https://bold-up.vercel.app
set -euo pipefail
cd "$(dirname "$0")/.."

SITE_URL="${1:-}"
if [ -z "$SITE_URL" ]; then
  echo "Usage: bash scripts/go-live.sh <public site URL>" >&2
  exit 1
fi
ENV_FILE=.env.production.local
vercel() { npx --yes vercel@latest "$@"; }

echo "1/6 Database"
if vercel integration list 2>&1 | grep -q "bold-up-db"; then
  echo "    bold-up-db already exists"
else
  vercel integration add supabase --name bold-up-db --billing-plan free --meta region=cdg1 --no-env-pull
fi

echo "2/6 Environment variables"
existing="$(vercel env ls production 2>&1 || true)"
if ! grep -q "NEXT_PUBLIC_SITE_URL" <<<"$existing"; then
  printf '%s' "$SITE_URL" | vercel env add NEXT_PUBLIC_SITE_URL production
fi
if ! grep -q "CRON_SECRET" <<<"$existing"; then
  openssl rand -hex 32 | tr -d '\n' | vercel env add CRON_SECRET production
fi

echo "3/6 Pull production variables (kept local, git-ignored)"
vercel env pull "$ENV_FILE" --environment=production --yes

echo "4/6 Migrations"
ENV_FILE="$ENV_FILE" npm run db:push

echo "5/6 Demo data and accounts"
ENV_FILE="$ENV_FILE" npm run db:seed -- --allow-remote

echo "6/6 Deploy"
vercel deploy --prod --yes

rm -f "$ENV_FILE"
echo
echo "Done. Demo logins are in .demo-credentials.md."
echo "Still to do by hand, in the Supabase dashboard: Authentication > URL Configuration"
echo "  Site URL:      $SITE_URL"
echo "  Redirect URLs: $SITE_URL/auth/callback"
