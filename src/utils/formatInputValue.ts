import {sanitizeNumericInput} from "./sanitizeNumericInput";
import Decimal from "decimal.js";

export function formatInputValue(input: unknown) {
  const sanitized = sanitizeNumericInput(input)

  if (sanitized === '') {
    return ''
  }

  if (sanitized === '.') {
    return '0.'
  }

  const [wholePart, fractionalPart] = sanitized.split('.')
  let formattedWhole = '0'

  try {
    formattedWhole = new Decimal(wholePart || '0').toFixed(0).replace(
      /\B(?=(\d{3})+(?!\d))/g,
      ','
    )
  } catch {
    return ''
  }

  return fractionalPart !== undefined
    ? `${formattedWhole}.${fractionalPart}`
    : formattedWhole
}
