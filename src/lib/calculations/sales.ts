import {
  add,
  d,
  money,
  mul,
  qty,
  sub,
  type DecimalInput,
} from "@/lib/money";
import { billingToTunes, DEFAULT_BILLING_TO_TUNE_FACTOR } from "@/lib/units";

export type TransportBasisCalc =
  | "PER_BILLING_UNIT"
  | "PER_TRIP"
  | "FIXED_AMOUNT"
  | "INCLUDED_IN_MATERIAL";

export type SaleLineInput = {
  quantity: DecimalInput;
  unitRate: DecimalInput;
  conversionFactor?: DecimalInput;
};

export type SaleTotalsInput = {
  lines: SaleLineInput[];
  transportBasis: TransportBasisCalc;
  transportRate: DecimalInput;
  /** Trip count used when basis is PER_TRIP (usually 1 per order/dispatch). */
  tripCount?: DecimalInput;
  discountAmount?: DecimalInput;
  taxAmount?: DecimalInput;
  /** When true, transport is already inside material rates — do not add again. */
  includedInMaterialRate?: boolean;
};

export function calcLineTotal(quantity: DecimalInput, unitRate: DecimalInput) {
  return money(mul(quantity, unitRate));
}

export function calcMaterialSubtotal(lines: SaleLineInput[]) {
  return money(
    lines.reduce(
      (acc, line) => add(acc, calcLineTotal(line.quantity, line.unitRate)),
      d(0),
    ),
  );
}

export function calcTuneQuantity(
  billingQuantity: DecimalInput,
  conversionFactor: DecimalInput = DEFAULT_BILLING_TO_TUNE_FACTOR,
) {
  return billingToTunes(billingQuantity, conversionFactor);
}

export function calcTransportAmount(input: {
  basis: TransportBasisCalc;
  rate: DecimalInput;
  billingQuantityTotal: DecimalInput;
  tripCount?: DecimalInput;
  includedInMaterialRate?: boolean;
}) {
  if (input.includedInMaterialRate || input.basis === "INCLUDED_IN_MATERIAL") {
    return money(0);
  }

  switch (input.basis) {
    case "PER_BILLING_UNIT":
      return money(mul(input.billingQuantityTotal, input.rate));
    case "PER_TRIP":
      return money(mul(input.tripCount ?? 1, input.rate));
    case "FIXED_AMOUNT":
      return money(input.rate);
    default:
      return money(0);
  }
}

/**
 * Calculation order (assumption — confirm with accountant for GST):
 * 1. line_total = qty * rate
 * 2. material_subtotal = sum(line_total)
 * 3. transport (unless included)
 * 4. discount subtracted
 * 5. tax added
 * grand_total = material + transport + tax - discount
 */
export function calcSaleTotals(input: SaleTotalsInput) {
  const lines = input.lines.map((line) => {
    const conversionFactor = line.conversionFactor ?? DEFAULT_BILLING_TO_TUNE_FACTOR;
    const lineTotal = calcLineTotal(line.quantity, line.unitRate);
    const tuneQuantity = calcTuneQuantity(line.quantity, conversionFactor);
    return {
      ...line,
      conversionFactor: qty(conversionFactor),
      lineTotal,
      tuneQuantity,
    };
  });

  const materialSubtotal = calcMaterialSubtotal(input.lines);
  const billingQuantityTotal = input.lines.reduce(
    (acc, line) => add(acc, line.quantity),
    d(0),
  );

  const transportAmount = calcTransportAmount({
    basis: input.transportBasis,
    rate: input.transportRate,
    billingQuantityTotal,
    tripCount: input.tripCount,
    includedInMaterialRate: input.includedInMaterialRate,
  });

  const discountAmount = money(input.discountAmount ?? 0);
  const taxAmount = money(input.taxAmount ?? 0);

  if (d(discountAmount).lt(0) || d(taxAmount).lt(0)) {
    throw new Error("Discount and tax cannot be negative");
  }

  const grandTotal = money(
    sub(add(materialSubtotal, transportAmount, taxAmount), discountAmount),
  );

  if (d(grandTotal).lt(0)) {
    throw new Error("Grand total cannot be negative");
  }

  return {
    lines,
    materialSubtotal,
    transportAmount,
    discountAmount,
    taxAmount,
    grandTotal,
    billingQuantityTotal: qty(billingQuantityTotal),
  };
}

export function calcOutstanding(input: {
  openingBalance: DecimalInput;
  postedInvoices: DecimalInput;
  allocatedPayments: DecimalInput;
  creditNotes?: DecimalInput;
}) {
  return money(
    sub(
      add(input.openingBalance, input.postedInvoices),
      add(input.allocatedPayments, input.creditNotes ?? 0),
    ),
  );
}
