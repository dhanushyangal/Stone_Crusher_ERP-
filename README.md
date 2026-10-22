# Stone Crusher ERP

Production-oriented ERP for an Indian stone crusher business: sales, production, stock, payments, expenses, and reports. **Online-only** — internet required for all writes.

**Stack:** Next.js (App Router) · TypeScript · Tailwind · Prisma · PostgreSQL · Supabase-compatible · Vitest / Playwright

## Quick start (local)

```bash
# PostgreSQL 16 (Homebrew example)
brew services start postgresql@16
createdb stone_crusher_erp

cp .env.example .env
# Edit DATABASE_URL / SESSION_SECRET / Supabase keys

npm install
npx prisma migrate deploy
npm run db:seed          # clean bootstrap only (site, owner, units) — no demo sales data
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Initial owner (after seed):**

| Email | Default password |
| --- | --- |
| `owner@crusher.local` | `ChangeMe@123` (override with `OWNER_SEED_PASSWORD`) |

Add customers, products, and staff yourself — the seed does not insert demo business data.

To wipe everything and start clean again:

```bash
npx prisma migrate reset --force
```

## Supabase

This project is wired for the Supabase project keys (`SUPABASE_URL`, publishable/secret keys, JWKS). Business data uses **Prisma → Postgres**.

1. In Supabase → **Settings → Database**, copy the connection URI.
2. Set `DATABASE_URL` (pooler) and `DIRECT_URL` (direct/session) in `.env`.
3. Run `npx prisma migrate deploy`.
4. Keep `SEED_DEMO_DATA=false` in production.

Optional: `npm install @supabase/server` is already included for Edge/API helpers.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `start` | Production |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Seed demo masters |
| `npm test` | Unit + integration tests |
| `npm run test:unit` | Calculation / permission unit tests |
| `npm run test:integration` | DB workflow tests |

## Business rule (default)

`1 billing unit = 4 tunes` (configurable; snapshotted on each sale line).

Tune is a **business unit**, not a tonne.

## Documentation

See `docs/`:

- `architecture.md`
- `database-schema.md`
- `business-rules.md`
- `api.md`
- `offline-sync.md` (online-only note; sync removed)
- `deployment.md`
- `user-guide.md`
- `CHECKLIST.md`

## Connectivity

- Internet required for creating/posting sales and other writes
- Banner shown when offline; actions are blocked until reconnect
- Optional PWA manifest at `/manifest.webmanifest` (home-screen icon only; not an offline store)

## Tests

```bash
npm run test:unit
npm run test:integration
```
