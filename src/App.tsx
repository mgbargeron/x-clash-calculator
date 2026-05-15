import {useEffect, useState} from "react";
import {sanitizeNumericInput} from "./utils/sanatizeNumericInput";
import CalculatorPage from "./pages/CalculatorPage";
import HeroExpPage from "./pages/HeroExpPage";
import GameMapPage from "./pages/GameMapPage";
import ServerTimePage from "./pages/ServerTimePage";

const GRID_STORAGE_KEY = "chest-grid-values-v1";

const DEFAULT_GRID_VALUES: string[][] = [
  ["", "", ""],
  ["", "", ""],
  ["", "", ""],
];

type Page = "calculator" | "heroExp" | "map" | "serverTime";

function loadInitialGridValues(): string[][] {
  try {
    const raw = window.localStorage.getItem(GRID_STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_GRID_VALUES);

    const parsed = JSON.parse(raw);
    const isValidShape =
      Array.isArray(parsed) &&
      parsed.length === 3 &&
      parsed.every(
        (row) =>
          Array.isArray(row) &&
          row.length === 3 &&
          row.every((cell) => typeof cell === "string")
      );

    if (!isValidShape) return structuredClone(DEFAULT_GRID_VALUES);

    return parsed.map((row: string[]) => row.map((cell) => sanitizeNumericInput(cell)));
  } catch {
    return structuredClone(DEFAULT_GRID_VALUES);
  }
}

export default function App() {
  const [page, setPage] = useState<Page>("calculator");
  const [gridValues, setGridValues] = useState<string[][]>(() => loadInitialGridValues());

  const updateGridCell = (rowIndex: number, columnIndex: number, value: string) => {
    const sanitized = sanitizeNumericInput(value);
    setGridValues((current) =>
      current.map((row, rIdx) =>
        rIdx === rowIndex
          ? row.map((cell, cIdx) => (cIdx === columnIndex ? sanitized : cell))
          : row
      )
    );
  };

  useEffect(() => {
    localStorage.setItem(GRID_STORAGE_KEY, JSON.stringify(gridValues));
  }, [gridValues]);

  const navigation = (
    <nav className="app-nav" aria-label="Primary navigation">
      <button
        className={`nav-button ${page === "calculator" ? "active" : ""}`}
        type="button"
        onClick={() => setPage("calculator")}
      >
        Calculator
      </button>
      <button
        className={`nav-button ${page === "heroExp" ? "active" : ""}`}
        type="button"
        onClick={() => setPage("heroExp")}
      >
        Hero Exp
      </button>
      <button
        className={`nav-button ${page === "map" ? "active" : ""}`}
        type="button"
        onClick={() => setPage("map")}
      >
        Game Map
      </button>
      <button
        className={`nav-button ${page === "serverTime" ? "active" : ""}`}
        type="button"
        onClick={() => setPage("serverTime")}
      >
        Server Time
      </button>
    </nav>
  );

  return (
    <main className="app">
      {page === "calculator" ? (
        <CalculatorPage
          gridValues={gridValues}
          updateGridCell={updateGridCell}
          navigation={navigation}
        />
      ) : page === "heroExp" ? (
        <HeroExpPage
          gridValues={gridValues}
          updateGridCell={updateGridCell}
          navigation={navigation}
        />
      ) : page === "map" ? (
        <GameMapPage navigation={navigation} />
      ) : (
        <ServerTimePage navigation={navigation} />
      )}
    </main>
  );
}
