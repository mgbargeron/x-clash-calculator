export function sanitizeNumericInput(input: unknown) {
  const normalizedInput = typeof input === 'string' ? input : String(input ?? '')
  const withoutCommas = normalizedInput.replace(/,/g, '')
  const digitsAndDotsOnly = withoutCommas.replace(/[^\d.]/g, '')
  const [whole = '', ...fractionParts] = digitsAndDotsOnly.split('.')

  if (fractionParts.length === 0) {
    return whole
  }

  return `${whole}.${fractionParts.join('')}`
}
