#!/usr/bin/env bash
# Apply migrations + clean bootstrap to Supabase Postgres.
# Requires DATABASE_URL and DIRECT_URL in .env with the real DB password.
set -euo pipefail
cd "$(dirname "$0")/.."

if grep -q 'YOUR_DB_PASSWORD' .env; then
  echo "Replace YOUR_DB_PASSWORD in .env first."
  echo "Supabase Dashboard → project → Connect → copy Session + Transaction strings."
  exit 1
fi

npx prisma migrate deploy
npx tsx prisma/seed.ts
echo "Supabase schema + clean owner bootstrap applied."
echo "Login: owner@crusher.local / (OWNER_SEED_PASSWORD or ChangeMe@123)"
