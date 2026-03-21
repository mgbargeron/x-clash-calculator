import CalculationTable from "./CalculationTable";
import {useEffect, useState} from "react";
import {sanitizeNumericInput} from "./utils/sanatizeNumericInput";
import {formatInputValue} from "./utils/formatInputValue";

export type Row = {
  description: string;
  value: string;
  quantity: string;
  isStatic?: boolean;
};

const GRID_STORAGE_KEY = "chest-grid-values-v1";
const WHEAT_STORAGE_KEY = "wheat-quantity-rows";
const IRON_STORAGE_KEY = "iron-quantity-rows";
const GOLD_STORAGE_KEY = "gold-quantity-rows";
const HERO_EXP_STORAGE_KEY = "hero-exp-quantity-rows";

const DEFAULT_GRID_VALUES: string[][] = [
  ["", "", ""],
  ["", "", ""],
  ["", "", ""],
];

const getInitialResourceRows = (values: string[]): Row[] => {
  const rssRows: Row[] = [
    {description: "1k Chest", value: "1000", quantity: "", isStatic: true},
    {description: "10K Chest", value: "10000", quantity: "", isStatic: true},
    {description: "50K Chest", value: "50000", quantity: "", isStatic: true},
    {description: "Blue Chest", value: values[0] ?? "", quantity: "", isStatic: true},
    {description: "Purple Chest", value: values[1] ?? "", quantity: "", isStatic: true},
    {description: "Legendary Chest", value: values[2] ?? "", quantity: "", isStatic: true},
    {description: "Resource Chest", value: "10000", quantity: "", isStatic: true},
    {description: "Excellent Selection Chest", value: values[0] ?? "", quantity: "", isStatic: true},
    {description: "Purple Selection Chest", value: values[1] ?? "", quantity: "", isStatic: true},
    {description: "Legendary Selection Chest", value: values[2] ?? "", quantity: "", isStatic: true},
  ];
  return structuredClone(rssRows);
};

const getInitialGoldRows = (values: string[]): Row[] => [
  {description: "600 Chest", value: "600", quantity: "", isStatic: true},
  {description: "6k Chest", value: "6000", quantity: "", isStatic: true},
  {description: "30k Chest", value: "30000", quantity: "", isStatic: true},
  {description: "Blue Chest", value: values[0] ?? "", quantity: "", isStatic: true},
  {description: "Purple Chest", value: values[1] ?? "", quantity: "", isStatic: true},
  {description: "Legendary Chest", value: values[2] ?? "", quantity: "", isStatic: true},
  {description: "Resource Chest", value: "6000", quantity: "", isStatic: true},
  {description: "Excellent Selection Chest", value: values[0] ?? "", quantity: "", isStatic: true},
  {description: "Purple Selection Chest", value: values[1] ?? "", quantity: "", isStatic: true},
  {description: "Legendary Selection Chest", value: values[2] ?? "", quantity: "", isStatic: true},
];

const getInitialHeroExpRows = (values: string[]): Row[] => [
  {description: "Blue Chest", value: values[0] ?? "", quantity: "", isStatic: true},
  {description: "Purple Chest", value: values[1] ?? "", quantity: "", isStatic: true},
  {description: "Legendary Chest", value: values[2] ?? "", quantity: "", isStatic: true},
];

const columnHeaders = ["Blue Chest", "Purple Chest", "Legendary Chest"];
const rowHeaders = ["Resources", "Gold", "Hero exp"];

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
  const [gridValues, setGridValues] = useState<string[][]>(() => loadInitialGridValues());

  useEffect(() => {
    window.localStorage.setItem(GRID_STORAGE_KEY, JSON.stringify(gridValues));
  }, [gridValues]);

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

  const initialWheatRows: Row[] = getInitialResourceRows(gridValues[0]);
  const initialIronRows: Row[] = getInitialResourceRows(gridValues[0]);
  const initialGoldRows: Row[] = getInitialGoldRows(gridValues[1]);
  const initialHeroExpRows: Row[] = getInitialHeroExpRows(gridValues[2]);

  return (
    <main className="app">
      <section className="card calculator">
        <p className="eyebrow">Auto total calculator</p>
        <h1>Chest Value × Quantity</h1>
        <p className="description">
          Enter a value and quantity for each row. Totals update automatically.
        </p>


        <div className="tables-container">
          <div className="table">
            <div className="table-header"></div>
            {columnHeaders.map((header) => (
              <div className="table-header" key={header}>
                {header}
              </div>
            ))}

            {rowHeaders.map((rowLabel, rowIndex) => (
              <div className="table-row" key={rowLabel}>
                <div className="cell-display">{rowLabel}</div>
                {columnHeaders.map((_, columnIndex) => (
                  <input
                    key={`${rowIndex}-${columnIndex}`}
                    className="cell-input"
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={formatInputValue(gridValues[rowIndex][columnIndex])}
                    onChange={(event) =>
                      updateGridCell(rowIndex, columnIndex, event.target.value)
                    }
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="tables-container">
            <div className="calculator-wrapper">
              <CalculationTable
                initialRows={initialWheatRows}
                resourceName="Wheat"
                storageKey={WHEAT_STORAGE_KEY}
              />
            </div>
            <div className="calculator-wrapper">
              <CalculationTable
                initialRows={initialIronRows}
                resourceName="Iron"
                storageKey={IRON_STORAGE_KEY}
              />
            </div>
            <div className="calculator-wrapper">
              <CalculationTable
                initialRows={initialGoldRows}
                resourceName="Gold"
                storageKey={GOLD_STORAGE_KEY}
              />
            </div>
            <div className="calculator-wrapper">
              <CalculationTable
                initialRows={initialHeroExpRows}
                resourceName="Hero Exp"
                storageKey={HERO_EXP_STORAGE_KEY}
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}