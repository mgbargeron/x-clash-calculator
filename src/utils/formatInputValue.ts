import {sanitizeNumericInput} from "./sanatizeNumericInput";
import Decimal from "decimal.js";

export function formatInputValue(input: string) {
  const sanitized = sanitizeNumericInput(input)

  if (sanitized === '') {
    return ''
  }

  if (sanitized === '.') {
    return '0.'
  }

  const [wholePart, fractionalPart] = sanitized.split('.')
  const formattedWhole = new Decimal(wholePart || '0').toFixed(0).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ','
  )

  return fractionalPart !== undefined
    ? `${formattedWhole}.${fractionalPart}`
    : formattedWhole
}