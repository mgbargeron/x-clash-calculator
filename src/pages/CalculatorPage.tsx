import {type ReactNode, useMemo} from "react";
import CalculationTable from "../CalculationTable";
import type {Row} from "../types";
import {formatInputValue} from "../utils/formatInputValue";

const WHEAT_STORAGE_KEY = "wheat-quantity-rows";
const IRON_STORAGE_KEY = "iron-quantity-rows";
const GOLD_STORAGE_KEY = "gold-quantity-rows";

const getInitialResourceRows = (values: string[]): Row[] => {
  const rssRows: Row[] = [
    {description: "1k Chest", value: "1000", quantity: "", isStatic: true},
    {description: "10K Chest", value: "10000", quantity: "", isStatic: true},
    {description: "50K Chest", value: "50000", quantity: "", isStatic: true},
    {description: "Blue Chest", value: values[0] ?? "", quantity: "", isStatic: true},
    {description: "Purple Chest", value: values[1] ?? "", quantity: "", isStatic: true},
    {description: "Legendary Chest", value: values[2] ?? "", quantity: "", isStatic: true},
    {description: "Selection Chest", value: "10000", quantity: "", isStatic: true},
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
  {description: "Selection Chest", value: "6000", quantity: "", isStatic: true},
  {description: "Excellent Selection Chest", value: values[0] ?? "", quantity: "", isStatic: true},
  {description: "Purple Selection Chest", value: values[1] ?? "", quantity: "", isStatic: true},
  {description: "Legendary Selection Chest", value: values[2] ?? "", quantity: "", isStatic: true},
];

const columnHeaders = ["Blue Chest", "Purple Chest", "Legendary Chest"];
const calculatorRowHeaders = ["Resources", "Gold"];

type CalculatorPageProps = {
  gridValues: string[][];
  updateGridCell: (rowIndex: number, columnIndex: number, value: string) => void;
  navigation: ReactNode;
};

export default function CalculatorPage({gridValues, updateGridCell, navigation}: CalculatorPageProps) {
  const initialWheatRows = useMemo(() => getInitialResourceRows(gridValues[0]), [gridValues[0]]);
  const initialIronRows = useMemo(() => getInitialResourceRows(gridValues[0]), [gridValues[0]]);
  const initialGoldRows = useMemo(() => getInitialGoldRows(gridValues[1]), [gridValues[1]]);

  return (
    <section className="card calculator">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Auto total calculator</p>
          <h1>Chest Value × Quantity</h1>
          <p className="description">
            Enter a value and quantity for each row. Totals update automatically.
          </p>
        </div>
        {navigation}
      </div>

      <div className="tables-container">
        <div className="table">
          <div className="table-header"></div>
          {columnHeaders.map((header) => (
            <div className="table-header" key={header}>
              {header}
            </div>
          ))}

          {calculatorRowHeaders.map((rowLabel, rowIndex) => (
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
        </div>
      </div>
    </section>
  );
}
