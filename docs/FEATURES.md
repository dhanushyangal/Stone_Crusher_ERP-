# Stone Crusher ERP — Complete Features Guide

How every feature works in the live application (India stone crusher business, INR, Asia/Kolkata).

---

## Quick start

| Item | Value |
| --- | --- |
| App URL (computer) | http://localhost:3000 |
| App URL (phone, same Wi‑Fi) | http://YOUR_LAPTOP_IP:3000 |
| Owner login | `owner@crusher.local` / `ChangeMe@123` |
| Database | Supabase PostgreSQL |
| Default unit rule | **1 billing unit (BU) = 4 tunes** |

### Phone bottom bar

| Tab | Opens |
| --- | --- |
| Home | Dashboard |
| Sale | New sale form |
| Customer | Customers list + create |
| Product | Products list + create |
| More | Full menu (production, stock, payments, etc.) |

Add to Home Screen from Safari/Chrome for an app-like icon.

---

## End-to-end daily flow (recommended order)

```
1. Create Customers + Products (once)
2. Production → Post          → stock increases
3. New Sale → Save & post     → official invoice number
4. Dispatch → Post            → stock decreases
5. Payments                   → customer dues reduce
6. Expenses                   → costs recorded
7. Dashboard / Reports        → see today’s picture
```

---

## 1. Login & security

**Where:** `/login`

**How it works**
- Enter email + password.
- Server checks against `app_users` (password hashed with bcrypt).
- Creates a secure **HttpOnly cookie** session (`sc_erp_session`).
- Roles control what each user may do (Owner, Manager, Sales Operator, Cashier, Accountant).
- Permissions are enforced on **every API** — hiding a button is not enough.
- Logout clears the session cookie.

**Owner can:** manage everything (settings, users, cancel sales, profit reports, etc.).

---

## 2. Dashboard (Home)

**Where:** `/dashboard`

**What you see (from real posted data, not fake numbers)**
- Today’s sales amount and invoice count
- Today’s collections
- Today’s expenses
- Estimated operating result (sales − expenses for today, with assumptions shown)
- Customer / supplier outstanding totals
- Cash movement note for the day
- Stock balances by product
- Quick buttons: Customers, Products, New sale, Production

**How it works**
- Uses Asia/Kolkata day boundaries.
- Only **POSTED** transactions count in totals.
- Drafts never appear as confirmed business figures.

---

## 3. Customers

**Where:** `/customers` and `/customers/[id]`

### Create
1. Open **Customers**.
2. Enter **Code** (e.g. `C001`), **Name**, optional **Phone**.
3. Tap **Add customer**.

### What else is stored (database / detail API)
- Address, tax registration, opening balance, credit limit, notes, active flag
- Customer-specific product rates and transport rules (schema + APIs support them)

### Customer detail & ledger
- Tap a customer name.
- See **outstanding balance** calculated as:

```
outstanding = opening balance
            + posted invoices
            − payments (allocated + advances)
            − credit notes
```

- Chronological ledger: opening → invoices → receipts → running balance.

**Important:** Balances are derived from transactions. You do not manually overwrite “current balance”.

---

## 4. Products & units

**Where:** `/products`

### Create a product
1. Open **Products**.
2. Enter:
   - **SKU** — short code (e.g. `AGG20`)
   - **Name** — e.g. `20 mm Aggregate`
   - **Default rate ₹**
   - **Unit** — normally **BU** (Billing Unit)
3. Tap **Add product**.

### How units / tunes work
- Catalogue units include **BU** and **TUNE**.
- Default conversion: **1 BU = 4 tunes**.
- On each sale line the app stores:
  - quantity in billing unit
  - conversion factor used at that time
  - tune quantity (= quantity × factor)
- Changing the default later does **not** rewrite old invoices.

**Example:** Sale of 5 BU → **20 tunes** shown and stored.

---

## 5. Suppliers

**Where:** `/suppliers`

**How it works**
- Create supplier with code + name (+ phone later as needed).
- Used when recording **purchases** and supplier payments.
- Opening balance supported in the database for future ledger views.

---

## 6. Production

**Where:** `/production`

**How it works**
1. Choose product, quantity (BU), optional shift.
2. Tap **Record** → creates a **DRAFT**.
3. Tap **Post** → creates a stock movement of type **PRODUCTION** (stock increases).

**Rules**
- Draft production does **not** change stock.
- Posting is idempotent per client transaction id.
- Raw material quantity can be noted separately; the system does **not** invent a crush ratio.

---

## 7. Purchases

**Where:** `/purchases`

**How it works**
1. Select supplier + product + qty + rate.
2. **Create draft**.
3. **Post** → if “affects stock”, creates **PURCHASE_RECEIPT** stock movement.

**Rules**
- Draft purchases do not move stock.
- Line amounts = qty × rate; totals calculated on the server.

---

## 8. Sales (core module)

**Where:** `/sales`, `/sales/new`, `/sales/[id]`

### Create a sale
1. Open **Sale** (or Sales → New sale).
2. Select **customer**.
3. Add one or more product lines (qty + rate).
4. See **Tunes (×4)** preview on each line.
5. Set **transport** (per trip / per BU / fixed / included).
6. Optional vehicle number, driver, discount.
7. Choose:
   - **Save draft**, or
   - **Save & post invoice**

### How totals are calculated (server is authoritative)

```
line_total          = quantity × unit_rate
material_subtotal   = sum of line totals
transport_amount    = based on transport basis (0 if included in material)
grand_total         = material + transport + tax − discount
```

Preview on screen is helpful; the **server recalculates** on save.

### Invoice numbers
- Draft sales have no invoice number until posted.
- After post on server: official number from sequence (e.g. `INV-00001`).
- Internet is required to save or post a sale.

### Statuses
| Status | Meaning |
| --- | --- |
| DRAFT | Editable; no official invoice |
| POSTED | Invoice issued; locked for normal edit |
| CANCELLED | Cancelled with reason (authorized users) |

### Sale detail page
- Line items with units and tunes
- Material / transport / discount / grand total
- **Post invoice**, **Cancel**, **Print** (browser print)

---

## 9. Dispatch

**Where:** `/dispatches`

**How it works**
1. Select a **posted** sale.
2. Enter vehicle number.
3. Create draft for remaining undelivered quantity.
4. **Post** → stock **decreases** (DISPATCH movement) once.

**Rules**
- Cannot dispatch more than remaining sale qty (unless an authorized oversell exception is used).
- Cannot double-deduct stock on retry (idempotent movement key).
- No weighbridge assumed — quantities use configured business units / estimates.

---

## 10. Stock

**Where:** `/stock`

**How it works**
- Shows **ledger stock** per product = sum of signed stock movements.
- Movement history: opening, purchase, production, dispatch, adjustment, etc.

```
closing = opening + purchases + production + returns − dispatches − losses
```

**Rules**
- Only **posted** documents create movements.
- Ordinary users cannot overwrite a stock number by hand.
- Corrections should use adjustments / reversals (schema supports this).

---

## 11. Payments (collections)

**Where:** `/payments`

**How it works**
1. Select customer.
2. Enter amount and method (Cash / UPI / Bank / Cheque).
3. **Record receipt** → posts immediately, issues receipt number (e.g. `RCT-00001`).
4. Optional allocation to one or more invoices (API supports split / advance).

**Customer outstanding** falls when payments are posted.

**Methods:** Cash, UPI, Bank transfer, Cheque, Other.

---

## 12. Expenses

**Where:** `/expenses`

**How it works**
1. Choose category (Diesel, Electricity, Wages, Repairs, etc.).
2. Enter amount + description.
3. Save → posted operating expense.

Used in dashboard and profit estimates.

---

## 13. Reports

**Where:** `/reports`

| Report | What it shows |
| --- | --- |
| Daily closing | Sales revenue vs collections vs expenses vs outstanding |
| Estimated operating result | Revenue − operating expenses for a period |

**Assumptions shown clearly**
- Includes posted sales and posted expenses.
- May **exclude** full material COGS / depreciation until cost data is configured.
- Labelled **Estimated** when costs are incomplete — not “cash in minus cash out” alone.

---

## 14. Connectivity (online-only)

**How it works**
- The app requires internet for all writes (sales, production, payments, etc.).
- When offline, a banner shows “No internet — reconnect to use the app” and save/post actions are blocked.
- `clientTxnId` still supports safe **online** retries (no duplicate invoices on double-submit).

There is no offline queue, Sync page, or IndexedDB store.

---

## 15. Settings

**Where:** `/settings`

Shows:
- Site name / address
- Unit conversion (1 BU = 4 tunes)
- Invoice number series (INV-, DC-, RCT-, SP-)
- Note that GST / statutory wording must be configured with an accountant (not fabricated)

---

## 16. Users

**Where:** `/users` (Owner)

Lists staff accounts and roles for the site.  
Default seed creates only the owner; add more users as needed for Manager / Sales / Cashier / Accountant.

---

## 17. Audit

**Where:** `/audit` (Owner / Accountant)

Filterable history of sensitive actions (login, sale post, payment post, etc.) with user and timestamp.

---

## Roles (who can do what)

| Role | Typical access |
| --- | --- |
| Owner | Full access |
| Manager | Operations, stock, sales post, reports |
| Sales Operator | Create sales / dispatches, view customers |
| Cashier | Payments, expenses, cash |
| Accountant | Ledgers, reports, audit (not free edit of history) |

---

## Important business rules (summary)

1. **1 BU = 4 tunes** by default; factor is frozen on each sale line.
2. **Server calculates money** with decimal arithmetic (not JS floats).
3. **Draft ≠ stock / invoice.** Only **Post** makes it official.
4. **Idempotent online retries** via `clientTxnId`.
5. **Draft ≠ invoice number** until posted.
6. **Currency INR**, timezone **Asia/Kolkata**.
7. Multi-site ready in the database; currently one site (`MAIN`).
8. **Online-only** — no offline queue.

---

## Feature checklist (current app)

| Feature | Status |
| --- | --- |
| Login / logout / roles | Working |
| Dashboard live figures | Working |
| Customers create + ledger | Working |
| Products create + units | Working |
| Suppliers create | Working |
| Production draft + post → stock | Working |
| Purchases draft + post → stock | Working |
| Sales multi-line + tunes + transport | Working |
| Sale post → invoice number | Working |
| Sale cancel with reason | Working |
| Dispatch post → stock out | Working |
| Stock balances + movements | Working |
| Payments / receipts | Working |
| Expenses | Working |
| Daily closing + estimated profit | Working |
| Online-only + offline banner | Working |
| Phone bottom nav + More menu | Working |
| PWA manifest / Add to Home Screen | Manifest ready (not offline store) |
| Cash open/close UI | Schema ready; UI pending |
| CSV export all reports | Partial |
| GST e-invoice compliance | Configurable; accountant must confirm |

---

## Troubleshooting

| Problem | What to try |
| --- | --- |
| Phone cannot open app | Same Wi‑Fi; use laptop IP:3000; keep `npm run dev` running |
| Cannot create product | Login as Owner; ensure seed created BU unit |
| Sale post fails on stock | Record & post **Production** first, or buy stock via Purchases |
| Numbers look wrong | Check status is POSTED, not DRAFT |
| Cannot save when offline | Reconnect to the internet, then retry |
| Draft sale has no INV- | Open the sale and tap **Post invoice** |

---

*This document matches the implemented Stone Crusher ERP. Update it when new screens ship.*
