import {sanitizeNumericInput} from "./sanatizeNumericInput";
import Decimal from "decimal.js";

export function toDecimal(input: string) {
  try {
    const sanitized = sanitizeNumericInput(input)
    return sanitized === '' || sanitized === '.'
      ? new Decimal(0)
      : new Decimal(sanitized)
  } catch {
    return new Decimal(0)
  }
}