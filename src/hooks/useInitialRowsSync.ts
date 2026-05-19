import { useEffect, useState } from "react";
import type { Row } from "../types";

type UseInitialRowsSyncProps = {
  initialRows: Row[];
  storageKey?: string;
};

type UseInitialRowsSyncReturn = {
  rows: Row[];
  setRows: React.Dispatch<React.SetStateAction<Row[]>>;
};

function isStoredRowArray(value: unknown): value is Array<Partial<Row>> {
  return (
    Array.isArray(value) &&
    value.every(
      (row) =>
        row !== null &&
        typeof row === "object" &&
        ("description" in row || "value" in row || "quantity" in row || "isStatic" in row)
    )
  );
}

export function useInitialRowsSync({
  initialRows,
  storageKey,
}: UseInitialRowsSyncProps): UseInitialRowsSyncReturn {
  const [rows, setRows] = useState<Row[]>(() => {
    if (!storageKey) return initialRows;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (!isStoredRowArray(parsed) || parsed.length === 0) {
          return initialRows;
        }

        return initialRows.map((initialRow, index) => {
          const storedRow = parsed[index];
          if (!storedRow) return initialRow;

          return {
            description: initialRow.description,
            value: initialRow.isStatic
              ? initialRow.value
              : typeof storedRow.value === "string"
                ? storedRow.value
                : initialRow.value,
            quantity:
              typeof storedRow.quantity === "string"
                ? storedRow.quantity
                : initialRow.quantity,
            isStatic: initialRow.isStatic ?? false,
          };
        });
      }
    } catch {
      // Ignore parse errors
    }

    return initialRows;
  });

  useEffect(() => {
    setRows((currentRows) =>
      currentRows.map((row, index) => {
        const incoming = initialRows[index];
        if (!incoming || !row.isStatic) return row;

        return { ...row, value: incoming.value, isStatic: true };
      })
    );
  }, [initialRows]);

  useEffect(() => {
    localStorage.setItem(storageKey ?? "", JSON.stringify(rows));
  }, [rows, storageKey]);

  return { rows, setRows };
}
