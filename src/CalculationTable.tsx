
import { useEffect, useMemo, useState } from 'react'
import Decimal from 'decimal.js'
import {Row} from "./App";
import {sanitizeNumericInput} from "./utils/sanatizeNumericInput";
import {toDecimal} from "./utils/toDecimal";
import {formatInputValue} from "./utils/formatInputValue";
import {formatWholeDecimal} from "./utils/formatWholeDecimal";
import {loadRows} from "./utils/loadRows";

type CalculationTableProps = {
  initialRows: Row[],
  resourceName: string,
  storageKey: string,
}


const CalculationTable = ({
  initialRows,
  resourceName,
  storageKey,
}: CalculationTableProps) => {
  const [rows, setRows] = useState<Row[]>(loadRows(initialRows, storageKey))

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(rows))
  }, [rows])


  const rowTotals = useMemo(
    () =>
      rows.map((row) => {
        const value = toDecimal(row.value)
        const quantity = toDecimal(row.quantity)
        return value.mul(quantity)
      }),
    [rows]
  )

  const grandTotal = useMemo(
    () => rowTotals.reduce((sum, total) => sum.plus(total), new Decimal(0)),
    [rowTotals]
  )

  function updateRow(index: number, field: keyof Row, nextValue: string) {
    const sanitizedValue =
      field === 'value' || field === 'quantity'
        ? sanitizeNumericInput(nextValue)
        : nextValue

    setRows((currentRows) =>
      currentRows.map((row, rowIndex) => {
        if (rowIndex !== index) {
          return row
        }

        if (field === 'value' && row.isStatic) {
          return row
        }

        return { ...row, [field]: sanitizedValue }
      })
    )
  }

  return (
    <>
      <h2>{`${resourceName} Chests`}</h2>
      <div className="table">
        <div className="table-header">Description</div>
        <div className="table-header">Chest Value</div>
        <div className="table-header">Quantity</div>
        <div className="table-header">Total</div>

        {rows.map((row, index) => (
          <div className="table-row" key={index}>
            <div className="cell-display">{row.description}</div>

            {row.isStatic ? (
              <div className="cell-display">
                {formatInputValue(row.value || '0')}
              </div>
            ) : (
              <input
                className="cell-input"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={formatInputValue(row.value)}
                onChange={(event) =>
                  updateRow(index, 'value', event.target.value)
                }
              />
            )}

            <input
              className="cell-input"
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={formatInputValue(row.quantity)}
              onChange={(event) =>
                updateRow(index, 'quantity', event.target.value)
              }
            />

            <output className="total-cell">
              {formatWholeDecimal(rowTotals[index])}
            </output>
          </div>
        ))}
      </div>

      <div className="grand-total">
        <span>{`Sum of totals for ${resourceName}`}</span>
        <strong>{formatWholeDecimal(grandTotal)}</strong>
      </div>
    </>
  );
};

export default CalculationTable;