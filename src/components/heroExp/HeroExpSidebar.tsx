import type { RefObject } from "react";
import Decimal from "decimal.js";
import { formatWholeDecimal } from "../../utils/formatWholeDecimal";

type VisibleLevel = {
  level: number;
  expRequired: Decimal | null;
  state: "achieved" | "current" | "next" | "pending";
};

type HeroExpSidebarProps = {
  levelListRef: RefObject<HTMLDivElement | null>;
  currentLevelRef: RefObject<HTMLDivElement | null>;
  visibleLevels: VisibleLevel[];
  totalExp: Decimal;
  progression: {
    expStillNeededToMax: Decimal;
    spentExp: Decimal;
    remainingExp: Decimal;
    nextLevelCost: Decimal;
    expNeededForNextLevel: Decimal;
    expToMax: Decimal;
  };
  startLevel: number;
};

export function HeroExpSidebar({
  levelListRef,
  currentLevelRef,
  visibleLevels,
  totalExp,
  progression,
  startLevel,
}: HeroExpSidebarProps) {
  return (
    <aside className="hero-exp-sidebar">
      <section className="hero-surface hero-exp-sidebar-panel">
        <div className="hero-section-heading hero-section-heading-tight">
          <div>
            <p className="hero-section-label">Level path</p>
            <h2>Start to max</h2>
          </div>
          <div className="hero-level-legend" aria-label="Level state legend">
            <span className="hero-level-legend-item">
              <span className="hero-level-legend-dot hero-level-legend-dot-current" />
              Current
            </span>
            <span className="hero-level-legend-item">
              <span className="hero-level-legend-dot hero-level-legend-dot-next" />
              Next
            </span>
          </div>
        </div>

        <div className="hero-level-list" ref={levelListRef}>
          {visibleLevels.map(({ level, expRequired, state }) => (
            <div
              className={`hero-level-pill hero-level-${state}`}
              key={level}
              ref={state === "current" ? currentLevelRef : null}
            >
              <span className="hero-level-label">Level {level}</span>
              <strong className="hero-level-exp">
                {expRequired ? `${formatWholeDecimal(expRequired)} EXP` : "Maxed"}
              </strong>
            </div>
          ))}
        </div>
      </section>

      <section className="hero-surface hero-exp-sidebar-panel">
        <div className="hero-section-heading hero-section-heading-tight">
          <div>
            <p className="hero-section-label">Summary</p>
            <h2>Progress snapshot</h2>
          </div>
        </div>

        <div className="hero-exp-summary-grid">
          <section className="hero-exp-stat-card">
            <span>Total chest EXP</span>
            <strong>{formatWholeDecimal(totalExp)}</strong>
          </section>
          <section className="hero-exp-stat-card">
            <span>EXP still to 150</span>
            <strong>{formatWholeDecimal(progression.expStillNeededToMax)}</strong>
          </section>
        </div>

        <div className="hero-exp-summary-list">
          <div className="grand-total">
            <span>EXP spent</span>
            <strong>{formatWholeDecimal(progression.spentExp)}</strong>
          </div>
          <div className="grand-total">
            <span>EXP left over</span>
            <strong>{formatWholeDecimal(progression.remainingExp)}</strong>
          </div>
          <div className="grand-total">
            <span>Next level cost</span>
            <strong>{formatWholeDecimal(progression.nextLevelCost)}</strong>
          </div>
          <div className="grand-total">
            <span>EXP still needed for next</span>
            <strong>{formatWholeDecimal(progression.expNeededForNextLevel)}</strong>
          </div>
          <div className="grand-total">
            <span>EXP needed from level {startLevel} to 150</span>
            <strong>{formatWholeDecimal(progression.expToMax)}</strong>
          </div>
        </div>
      </section>

    </aside>
  );
}
