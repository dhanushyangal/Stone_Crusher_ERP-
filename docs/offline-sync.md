# Online-only (sync removed)

This ERP requires a live internet connection for all writes (sales, production, payments, etc.).

## What was removed

- IndexedDB offline queue (`src/offline/`)
- Sync centre (`/sync`) and `/api/v1/sync/*` routes
- Service-worker / Serwist offline caching packages

## What remains

- `clientTxnId` on API posts for **idempotent online retries** (safe refresh / double-submit when online)
- Database columns/tables related to sync (`provisional_ref`, `sync_operations`, `registered_devices`) may still exist in the schema; application code no longer uses them for offline sync

## Offline behaviour

If the device has no network, the UI shows a banner (“No internet — reconnect to use the app”) and write actions (e.g. new sale) are blocked with a clear error.
