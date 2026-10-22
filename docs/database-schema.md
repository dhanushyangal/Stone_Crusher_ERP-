# Database schema

Prisma models map to PostgreSQL tables (see `prisma/schema.prisma` and `prisma/migrations/`).

## Core

| Table | Purpose |
| --- | --- |
| `sites` | Crusher sites (multi-site ready) |
| `app_users` | Staff accounts + roles |
| `sessions` | Server sessions (hashed tokens) |
| `units` | Unit catalogue (BU, TUNE, …) |
| `unit_conversions` | Explicit conversion factors with effective dates |
| `customers` / `suppliers` | Party masters + opening balances |
| `products` | Material catalogue |
| `customer_product_rates` | Customer-specific rates |
| `customer_transport_rules` | Transport pricing rules |

## Operations

| Table | Purpose |
| --- | --- |
| `purchases` / `purchase_items` | Incoming materials |
| `production_entries` | Production output |
| `sales` / `sale_items` | Sales (invoice issued on post) |
| `dispatches` / `dispatch_items` | Vehicle dispatches; stock deducted on post |
| `stock_movements` | Immutable signed quantity ledger |
| `stock_counts` / `stock_count_items` | Physical counts |
| `stock_adjustments` | Approved adjustments |

## Finance

| Table | Purpose |
| --- | --- |
| `payments` / `payment_allocations` | Receipts & supplier payments |
| `expenses` / `expense_categories` | Operating expenses |
| `credit_notes` | Credit corrections |
| `cash_sessions` | Cash open/close |

## Sync & audit

| Table | Purpose |
| --- | --- |
| `registered_devices` | Optional device registration |
| `sync_operations` | Server-side sync receipts |
| `audit_logs` | Sensitive action trail |
| `business_settings` | Key/value site config |
| `invoice_sequences` | Per-series invoice numbering |

## Conventions

- UUID PKs for transactional entities
- `NUMERIC` / Prisma `Decimal` for money & quantities
- `TIMESTAMPTZ` for event times
- Unique `(site_id, client_txn_id)` for idempotent offline posts
- Unique `(site_id, invoice_number)` for official invoices
- Stock movements unique on `(site_id, source_type, source_id, movement_type)` to prevent double posting
