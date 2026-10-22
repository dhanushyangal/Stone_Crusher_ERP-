import { describe, expect, it } from "vitest";
import {
  calcLineTotal,
  calcOutstanding,
  calcSaleTotals,
  calcTransportAmount,
  calcTuneQuantity,
} from "@/lib/calculations/sales";
import { billingToTunes } from "@/lib/units";
import { hasPermission } from "@/lib/permissions";

describe("billing to tunes", () => {
  it("converts 5 billing units to 20 tunes", () => {
    expect(billingToTunes(5, 4).toFixed(4)).toBe("20.0000");
    expect(calcTuneQuantity(5, 4).toFixed(4)).toBe("20.0000");
  });

  it("rejects non-positive quantities", () => {
    expect(() => billingToTunes(0, 4)).toThrow();
  });
});

describe("sale totals", () => {
  it("calculates material subtotal", () => {
    expect(calcLineTotal(5, 100).toFixed(2)).toBe("500.00");
  });

  it("calculates per-trip transport once", () => {
    const totals = calcSaleTotals({
      lines: [
        { quantity: 5, unitRate: 100 },
        { quantity: 2, unitRate: 50 },
      ],
      transportBasis: "PER_TRIP",
      transportRate: 1500,
      tripCount: 1,
    });
    expect(totals.materialSubtotal.toFixed(2)).toBe("600.00");
    expect(totals.transportAmount.toFixed(2)).toBe("1500.00");
    expect(totals.grandTotal.toFixed(2)).toBe("2100.00");
  });

  it("calculates per billing unit transport", () => {
    expect(
      calcTransportAmount({
        basis: "PER_BILLING_UNIT",
        rate: 10,
        billingQuantityTotal: 5,
      }).toFixed(2),
    ).toBe("50.00");
  });

  it("does not double-charge included transport", () => {
    const totals = calcSaleTotals({
      lines: [{ quantity: 5, unitRate: 100 }],
      transportBasis: "INCLUDED_IN_MATERIAL",
      transportRate: 999,
      includedInMaterialRate: true,
    });
    expect(totals.transportAmount.toFixed(2)).toBe("0.00");
    expect(totals.grandTotal.toFixed(2)).toBe("500.00");
  });

  it("applies discount and tax in defined order", () => {
    const totals = calcSaleTotals({
      lines: [{ quantity: 10, unitRate: 100 }],
      transportBasis: "FIXED_AMOUNT",
      transportRate: 100,
      discountAmount: 50,
      taxAmount: 27,
    });
    // 1000 + 100 + 27 - 50 = 1077
    expect(totals.grandTotal.toFixed(2)).toBe("1077.00");
  });
});

describe("outstanding", () => {
  it("computes customer outstanding", () => {
    expect(
      calcOutstanding({
        openingBalance: 1000,
        postedInvoices: 5000,
        allocatedPayments: 2500,
        creditNotes: 500,
      }).toFixed(2),
    ).toBe("3000.00");
  });
});

describe("permissions", () => {
  it("allows owner full access", () => {
    expect(hasPermission("OWNER", "sales.cancel")).toBe(true);
  });

  it("blocks sales operator from cancelling", () => {
    expect(hasPermission("SALES_OPERATOR", "sales.cancel")).toBe(false);
  });
});
