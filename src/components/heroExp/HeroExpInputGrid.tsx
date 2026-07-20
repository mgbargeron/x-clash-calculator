import type { Row } from "../../types";
import Decimal from "decimal.js";
import { formatInputValue } from "../../utils/formatInputValue";
import { formatWholeDecimal } from "../../utils/formatWholeDecimal";

type HeroExpInputGridProps = {
  rows: Row[];
  rowTotals: Decimal[];
  updateRow: (index: number, value: string) => void;
};

export function HeroExpInputGrid({ rows, rowTotals, updateRow }: HeroExpInputGridProps) {
  return (
    <section className="hero-surface">
      <div className="hero-section-heading">
        <div>
          <p className="hero-section-label">Chest planner</p>
          <h2>Enter what you can open</h2>
        </div>
      </div>

      <div className="hero-exp-input-grid">
        {rows.map((row, index) => (
          <article className="hero-exp-input-card" key={row.description}>
            <div className="hero-exp-input-card-head">
              <div>
                <p>{row.description}</p>
                <strong>{formatInputValue(row.value || "0")} EXP each</strong>
              </div>
              <output>{formatWholeDecimal(rowTotals[index])}</output>
            </div>

            <label className="hero-exp-field">
              <span>Chest count</span>
              <input
                className="cell-input"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={formatInputValue(row.quantity)}
                onChange={(event) => updateRow(index, event.target.value)}
              />
            </label>
          </article>
        ))}
      </div>
    </section>
  );
}
