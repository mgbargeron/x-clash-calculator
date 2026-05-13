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

export function useInitialRowsSync({
  initialRows,
  storageKey,
}: UseInitialRowsSyncProps): UseInitialRowsSyncReturn {
  const [rows, setRows] = useState<Row[]>(() => {
    if (!storageKey) return initialRows;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) {
        const parsed: Row[] = JSON.parse(stored);
        return parsed.length > 0 ? parsed : initialRows;
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
