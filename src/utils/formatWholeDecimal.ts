import Decimal from "decimal.js";

export function formatWholeDecimal(value: Decimal) {
  if (!value.isFinite()) return "0";
  return value
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .toNumber()
    .toLocaleString()
}
