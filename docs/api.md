# API — `/api/v1`

All responses: `{ data: ... }` or `{ error: { code, message, details? } }`.

Authenticated via HttpOnly cookie `sc_erp_session`.

## Auth

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/auth/login` | email + password |
| POST | `/auth/logout` | clears session |
| GET | `/auth/me` | current user |

## Core modules

| Area | Endpoints |
| --- | --- |
| Dashboard | `GET /dashboard` |
| Customers | `GET/POST /customers`, `GET/PATCH /customers/:id`, `GET /customers/:id/ledger`, rates & transport subroutes |
| Suppliers | `GET/POST /suppliers`, `GET/PATCH /suppliers/:id`, ledger |
| Products | `GET/POST /products`, `GET/PATCH /products/:id`, rates |
| Units | `GET/POST /units`, conversions |
| Production | `GET/POST /production`, `POST /production/:id/post` |
| Purchases | `GET/POST /purchases`, `POST /purchases/:id/post` |
| Sales | `GET/POST /sales`, `GET/PATCH /sales/:id`, `POST .../post`, `POST .../cancel` |
| Dispatches | `GET/POST /dispatches`, `POST .../post`, `POST .../cancel` |
| Stock | `GET /stock`, `/stock/movements`, counts, adjustments |
| Payments | `GET/POST /payments`, allocations, cancel |
| Expenses | `GET/POST /expenses` |
| Reports | `/reports/{sales,production,stock,dispatches,customers,expenses,daily-closing,profit}` |
| Users / Settings / Audit | `/users`, `/settings`, `/audit` |

## Idempotency

POST bodies for transactional entities must include `clientTxnId` (UUID). Replays return the original record.
