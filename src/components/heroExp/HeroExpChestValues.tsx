import type { Row } from "../../types";
import { formatInputValue } from "../../utils/formatInputValue";

type HeroExpChestValuesProps = {
  rows: Row[];
  chestValues: string[];
  onChestValueChange: (columnIndex: number, value: string) => void;
};

export function HeroExpChestValues({ rows, chestValues, onChestValueChange }: HeroExpChestValuesProps) {
  return (
    <section className="hero-surface">
      <div className="hero-section-heading">
        <div>
          <p className="hero-section-label">Chest values</p>
          <h2>Set hero EXP per chest</h2>
        </div>
      </div>

      <div className="table">
        <div className="table-header"></div>
        {rows.map((row) => (
          <div className="table-header" key={row.description}>
            {row.description}
          </div>
        ))}

        <div className="table-row">
          <div className="cell-display">Hero exp</div>
          {rows.map((row, columnIndex) => (
            <input
              key={`hero-exp-${row.description}`}
              className="cell-input"
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={formatInputValue(chestValues[columnIndex])}
              onChange={(event) => onChestValueChange(columnIndex, event.target.value)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
