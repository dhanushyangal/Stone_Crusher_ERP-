# Architecture — Stone Crusher ERP

## Overview

Production-oriented ERP for an Indian stone crusher business. Single Next.js application with:

- **Frontend:** Next.js App Router, React, TypeScript, Tailwind CSS
- **Backend:** Route Handlers under `/api/v1`
- **Database:** PostgreSQL (local Homebrew for development; Supabase-compatible for production)
- **ORM:** Prisma with versioned SQL migrations
- **Auth:** HttpOnly session cookies + bcrypt password hashes (`app_users` / `sessions`)
- **Connectivity:** Online-only — writes require network; offline banner blocks actions
- **Money:** `decimal.js` + PostgreSQL `NUMERIC` — never JS floats for financial truth

## Key decisions

1. **Authoritative server calculations** — clients may suggest rates; the server recomputes line totals, transport, tax, discount, and stock effects.
2. **Immutable posted history** — corrections use cancellations / reversals / replacement entries, not silent deletes.
3. **Client transaction UUIDs** — online retries reuse the same `client_txn_id` (unique per site) for idempotency.
4. **Draft vs official numbers** — drafts have no invoice number; official invoice numbers are issued only on server post.
5. **Units** — “tune” is a business unit. Default: `1 billing unit = 4 tunes`. Factors are snapshotted on sale lines.
6. **Multi-site ready** — every operational table is scoped by `site_id`.
7. **Supabase** — API keys and JWKS are configured for future Edge/auth integration via `@supabase/server` / `@supabase/supabase-js`. Business data currently flows through Prisma against Postgres.

## Layering

```
UI (App Router pages)
  → fetch /api/v1/* (requires network)
    → auth guard + Zod validation + RBAC
      → domain services (sales, stock, payments, …)
        → Prisma transaction
          → PostgreSQL
```

## Roles

Owner, Manager, Sales Operator, Cashier, Accountant — see `src/lib/permissions.ts`. Extra permissions can be attached per user.

## Assumptions

- Currency INR, timezone `Asia/Kolkata`, language English.
- No weighbridge; quantities are estimated in configured units.
- GST / e-invoice statutory wording is configurable and must be confirmed with an accountant (not fabricated).
- Estimated operating profit excludes incomplete COGS unless cost data is recorded.
