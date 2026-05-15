import Decimal from "decimal.js";
import { formatWholeDecimal } from "../../utils/formatWholeDecimal";

type HeroExpOverviewProps = {
  startLevel: number;
  setStartLevel: (level: number) => void;
  clampLevel: (level: number) => number;
  LEVEL_OPTIONS: number[];
  progression: {
    achievedLevel: number;
    levelsGained: number;
    nextLevel: number;
    expToMax: Decimal;
    remainingExp: Decimal;
    nextLevelCost: Decimal;
  };
  nextLevelProgressPercent: number;
  maxLevelProgressPercent: number;
  totalExp: Decimal;
};

export function HeroExpOverview({
  startLevel,
  setStartLevel,
  clampLevel,
  LEVEL_OPTIONS,
  progression,
  nextLevelProgressPercent,
  maxLevelProgressPercent,
  totalExp,
}: HeroExpOverviewProps) {
  return (
    <section className="hero-surface hero-exp-overview">
      <div className="hero-exp-overview-top">
        <label className="hero-exp-control">
          <span>Starting level</span>
          <select
            className="hero-level-select"
            value={startLevel}
            onChange={(event) => setStartLevel(clampLevel(Number(event.target.value)))}
          >
            {LEVEL_OPTIONS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>

        <div className="hero-exp-kpi-strip">
          <div className="hero-exp-kpi">
            <span>Reach</span>
            <strong>Level {progression.achievedLevel}</strong>
          </div>
          <div className="hero-exp-kpi">
            <span>Next</span>
            <strong>
              {progression.achievedLevel >= 150
                ? "Maxed"
                : `Level ${progression.nextLevel}`}
            </strong>
          </div>
          <div className="hero-exp-kpi">
            <span>Levels gained</span>
            <strong>{progression.levelsGained}</strong>
          </div>
        </div>
      </div>

      <div className="hero-exp-progress-grid">
        <div className="hero-progress-card">
          <div className="hero-progress-heading">
            <span>Progress to next level</span>
            <strong>
              {progression.achievedLevel >= 150 ? "100%" : `${nextLevelProgressPercent}%`}
            </strong>
          </div>
          <div className="hero-progress-track">
            <div
              className="hero-progress-fill hero-progress-fill-next"
              style={{ width: `${nextLevelProgressPercent}%` }}
            />
          </div>
          <small>
            {progression.achievedLevel >= 150
              ? "Level 150 reached"
              : `${formatWholeDecimal(progression.remainingExp)} / ${formatWholeDecimal(
                  progression.nextLevelCost
                )} EXP loaded`}
          </small>
        </div>

        <div className="hero-progress-card">
          <div className="hero-progress-heading">
            <span>Progress from level {startLevel} to 150</span>
            <strong>{maxLevelProgressPercent}%</strong>
          </div>
          <div className="hero-progress-track">
            <div
              className="hero-progress-fill hero-progress-fill-max"
              style={{ width: `${maxLevelProgressPercent}%` }}
            />
          </div>
          <small>
            {formatWholeDecimal(totalExp)} / {formatWholeDecimal(progression.expToMax)} EXP
          </small>
        </div>
      </div>
    </section>
  );
}
