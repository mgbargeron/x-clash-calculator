export function sanitizeNumericInput(input: string) {
  const withoutCommas = input.replaceAll(',', '')
  const digitsAndDotsOnly = withoutCommas.replace(/[^\d.]/g, '')
  const [whole = '', ...fractionParts] = digitsAndDotsOnly.split('.')

  if (fractionParts.length === 0) {
    return whole
  }

  return `${whole}.${fractionParts.join('')}`
}

