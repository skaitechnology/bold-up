#!/usr/bin/env bash
# Database behaviour test on plain PostgreSQL (no Docker needed).
# Creates a throwaway database, loads a minimal stand-in for Supabase (auth/storage
# schemas and API roles), applies every migration, then runs tests/db/test.sql, which
# checks permissions, the verification workflow and double-booking rules.
#
#   npm run test:db            (uses the local PostgreSQL on localhost)
#   PGHOST=... PGPORT=... npm run test:db
set -euo pipefail
cd "$(dirname "$0")/.."
DB=boldup_shim_test
export PGHOST="${PGHOST:-localhost}"

dropdb --if-exists "$DB" >/dev/null 2>&1
createdb "$DB"
trap 'dropdb --if-exists "$DB" >/dev/null 2>&1 || true' EXIT

psql -d "$DB" -v ON_ERROR_STOP=1 -q -f tests/db/shim.sql
for file in supabase/migrations/*.sql; do
  psql -d "$DB" -v ON_ERROR_STOP=1 -q -f "$file"
done
psql -d "$DB" -f tests/db/test.sql 2>&1 | grep -E "ok   |TEST FAILED|ERROR|ALL DATABASE TESTS PASSED" | sed -E 's/^psql:[^ ]+ NOTICE:  //'
