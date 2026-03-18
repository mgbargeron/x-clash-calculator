import {Row} from "../App";

export function loadRows(initialRows: Row[], storageKey: string): Row[] {
  const savedRows = window.localStorage.getItem(storageKey)

  if (!savedRows) {
    return initialRows
  }

  try {
    const parsedRows = JSON.parse(savedRows)

    if (!Array.isArray(parsedRows)) {
      return initialRows
    }

    return initialRows.map((initialRow, index) => {
      const savedRow = parsedRows[index]

      return {
        description: initialRow.description,
        value: initialRow.isStatic
          ? initialRow.value
          : typeof savedRow?.value === 'string'
            ? savedRow.value
            : '',
        quantity:
          typeof savedRow?.quantity === 'string'
            ? savedRow.quantity
            : initialRow.quantity,
        isStatic: initialRow.isStatic ?? false,
      }
    })
  } catch {
    return initialRows
  }
}