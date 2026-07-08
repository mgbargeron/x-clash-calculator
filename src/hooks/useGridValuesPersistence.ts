import { useEffect } from "react";

const GRID_STORAGE_KEY = "chest-grid-values-v1";

export function useGridValuesPersistence(gridValues: string[][]) {
  useEffect(() => {
    localStorage.setItem(GRID_STORAGE_KEY, JSON.stringify(gridValues));
  }, [gridValues]);
}