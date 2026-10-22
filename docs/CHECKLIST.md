# Implementation checklist

Mark complete only after implementation + verification.

## Phase 1 — Foundation
- [x] Next.js App Router + TypeScript + Tailwind
- [x] Prisma schema + migration on PostgreSQL
- [x] Session auth + roles
- [x] Env example + docs skeleton
- [x] Supabase env wiring

## Phase 2 — Master data
- [x] Customers CRUD + ledger
- [x] Suppliers CRUD
- [x] Products + units + conversions (seeded)
- [x] Seed demo data

## Phase 3 — Inventory
- [x] Stock ledger
- [x] Production post
- [x] Purchases post
- [x] Stock UI + movements

## Phase 4 — Sales & dispatch
- [x] Multi-line sales + 4-tune conversion
- [x] Transport calculation
- [x] Invoice sequences
- [x] Dispatch + stock deduction
- [x] Print via browser print on sale detail

## Phase 5 — Payments & expenses
- [x] Payments + allocations support
- [x] Expenses
- [x] Customer ledger
- [ ] Cash sessions UI (schema ready)

## Phase 6 — Reports
- [x] Daily closing + estimated profit reports
- [ ] CSV/Excel export helpers (partial — JSON APIs ready)

## Phase 7 — Connectivity (online-only)
- [x] Removed IndexedDB queue + sync engine + Sync UI
- [x] Offline banner blocks writes when disconnected
- [x] PWA manifest + icons (home-screen only; not offline store)

## Phase 8 — Hardening
- [x] Unit tests (10 passed)
- [x] Integration tests (1 passed — full sale flow)
- [x] Playwright spec drafted (`tests/e2e`)
- [x] README + docs
- [x] Production `next build` succeeds
