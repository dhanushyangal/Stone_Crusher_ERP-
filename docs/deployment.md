# Deployment

## Environments

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Prisma Postgres connection |
| `DIRECT_URL` | Direct/session mode URL for migrations (Supabase) |
| `SESSION_SECRET` | Cookie signing/hashing pepper |
| `SUPABASE_URL` / `SUPABASE_*_KEY` / `SUPABASE_JWKS_URL` | Supabase project |
| `APP_URL` | Public URL |

## Local

```bash
brew services start postgresql@16   # or docker compose up -d
cp .env.example .env
npm install
npx prisma migrate deploy
npx tsx prisma/seed.ts              # demo only
npm run dev
```

## Supabase production

1. Create project (or use existing).
2. Copy Database URI into `DATABASE_URL` / `DIRECT_URL`.
3. Copy API keys into Supabase env vars (never commit secrets).
4. `npx prisma migrate deploy`
5. Deploy Next.js to your host (Vercel, etc.) with HTTPS.
6. Enable automated Postgres backups in Supabase dashboard.
7. Seed only creates site/owner/units (no fake sales data). Prefer running seed from a trusted machine with `ALLOW_PROD_SEED=true` if needed.

## Backups

- Supabase: enable PITR / daily backups in the dashboard.
- Local restore test: `pg_dump` → `pg_restore` against a scratch database before go-live.
- Document restore RPO/RTO with the business owner.

## Security checklist

- HTTPS only in production
- HttpOnly / Secure / SameSite session cookies
- Rotate `SESSION_SECRET`
- Deactivate users instead of sharing passwords
- Review `/audit` periodically
