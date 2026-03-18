import Decimal from "decimal.js";

export function formatWholeDecimal(value: Decimal) {
  return value
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .toNumber()
    .toLocaleString()
}
