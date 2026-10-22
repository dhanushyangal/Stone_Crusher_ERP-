import Decimal from "decimal.js";

/** Authoritative money/quantity arithmetic — never use native JS floats. */
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export type DecimalInput = Decimal.Value;

export function d(value: DecimalInput): Decimal {
  return new Decimal(value ?? 0);
}

export function money(value: DecimalInput): Decimal {
  return d(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function qty(value: DecimalInput, places = 4): Decimal {
  return d(value).toDecimalPlaces(places, Decimal.ROUND_HALF_UP);
}

export function add(...values: DecimalInput[]): Decimal {
  return values.reduce<Decimal>((acc, v) => acc.plus(d(v)), d(0));
}

export function sub(a: DecimalInput, b: DecimalInput): Decimal {
  return d(a).minus(d(b));
}

export function mul(a: DecimalInput, b: DecimalInput): Decimal {
  return d(a).times(d(b));
}

export function div(a: DecimalInput, b: DecimalInput): Decimal {
  const denom = d(b);
  if (denom.isZero()) {
    throw new Error("Division by zero");
  }
  return d(a).div(denom);
}

export function sum(values: DecimalInput[]): Decimal {
  return add(...values);
}

export function isPositive(value: DecimalInput): boolean {
  return d(value).gt(0);
}

export function isNegative(value: DecimalInput): boolean {
  return d(value).lt(0);
}

export function gte(a: DecimalInput, b: DecimalInput): boolean {
  return d(a).gte(d(b));
}

export function lte(a: DecimalInput, b: DecimalInput): boolean {
  return d(a).lte(d(b));
}

export function eq(a: DecimalInput, b: DecimalInput): boolean {
  return d(a).eq(d(b));
}

export function toNumber(value: DecimalInput): number {
  return d(value).toNumber();
}

export function toFixedMoney(value: DecimalInput): string {
  return money(value).toFixed(2);
}

export function formatInr(value: DecimalInput): string {
  const n = money(value).toNumber();
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

export { Decimal };
