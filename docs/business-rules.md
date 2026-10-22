# Business rules

## Units

- Default: **1 billing unit = 4 tunes**.
- “Tune” is a business-specific unit — not a tonne and not auto-converted to kg/m³ unless an explicit `unit_conversions` row exists.
- Sale lines store `conversion_factor` and `tune_quantity` at posting time so historical invoices never change when defaults are updated.

## Sales

```
line_total = quantity × unit_rate
material_subtotal = Σ line_total
transport = f(basis) unless included_in_material_rate
grand_total = material_subtotal + transport + tax − discount
```

Transport bases: per billing unit, per trip, fixed amount, included in material rate.

Customer-specific rates and transport rules are snapshotted onto the transaction.

## Stock

```
closing = opening + receipts + production + returns − dispatches − losses
```

- Draft documents do **not** move stock.
- Dispatch post creates a negative `DISPATCH` movement exactly once (idempotent source key).
- Negative stock blocked unless an authorized exception is approved.

## Payments

- Allocations must be positive and cannot exceed payment amount or invoice outstanding (unless overpayment policy is added later).
- Advances = payment amount − allocated amount.

## Customer outstanding

```
outstanding = opening + posted invoices − allocated payments − advances − credit notes
```

## Profit

Daily “estimated operating result” = posted sales revenue − posted operating expenses for the period, with explicit caveats when COGS/depreciation are missing.
