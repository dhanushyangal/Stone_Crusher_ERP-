import { d, mul, qty, type DecimalInput } from "@/lib/money";

/** Default business rule: 1 billing unit = 4 tunes. Configurable per site/settings. */
export const DEFAULT_BILLING_TO_TUNE_FACTOR = 4;

/**
 * Convert billing quantity to tune quantity using an explicit factor.
 * Historical postings MUST store and reuse the factor used at posting time.
 */
export function billingToTunes(
  billingQuantity: DecimalInput,
  factor: DecimalInput = DEFAULT_BILLING_TO_TUNE_FACTOR,
) {
  if (d(billingQuantity).lte(0)) {
    throw new Error("Quantity must be greater than zero");
  }
  if (d(factor).lte(0)) {
    throw new Error("Conversion factor must be greater than zero");
  }
  return qty(mul(billingQuantity, factor));
}

export function tunesToBilling(
  tuneQuantity: DecimalInput,
  factor: DecimalInput = DEFAULT_BILLING_TO_TUNE_FACTOR,
) {
  if (d(factor).lte(0)) {
    throw new Error("Conversion factor must be greater than zero");
  }
  return qty(d(tuneQuantity).div(d(factor)));
}

/**
 * Apply a configured unit conversion. Never invent a conversion.
 * Returns null when no valid factor is provided.
 */
export function convertQuantity(
  quantity: DecimalInput,
  factor: DecimalInput | null | undefined,
) {
  if (factor === null || factor === undefined) {
    return null;
  }
  if (d(factor).lte(0)) {
    throw new Error("Invalid conversion factor");
  }
  return qty(mul(quantity, factor));
}
