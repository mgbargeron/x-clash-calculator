import { useEffect, useState } from "react";
import type { GameMapConfig } from "../../utils/gameMapConfig";
import {
  CITY_RACE_DAILY_MINE_LIMIT,
  CITY_RACE_DAILY_TOWN_LIMIT,
  CITY_RACE_MAX_CURRENT_MINES,
  CITY_RACE_MAX_CURRENT_TOWNS,
  CITY_RACE_MIN_FINAL_DAY,
  calculateCityRaceScoreAtDayStart,
  getCityRaceCaptureCounts,
  type CityRaceSimulation,
} from "../../utils/cityRaceSimulation";

type SimulationNotice = {
  tone: "info" | "error" | "success";
  text: string;
} | null;

type SimulationPanelProps = {
  simulation: CityRaceSimulation;
  mapConfig: GameMapConfig;
  notice: SimulationNotice;
  onAdvanceDay: () => void;
  onFinalDayChange: (value: number) => void;
  onCollapseChange?: (collapsed: boolean) => void;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

function formatCaptureName(
  tileId: string,
  kind: "copperMine" | "town" | "tradeCenter",
  level: number,
  mapConfig: GameMapConfig
): string {
  const tile = mapConfig.tiles.find((candidate) => candidate.id === tileId);
  const tileName = kind === "copperMine" ? "Copper Mine" : kind === "town" ? "Town" : "Trade Center";
  if (!tile) return `${tileName} L${level}`;

  const row = Math.floor((tile.y - 1) / (mapConfig.coordinateGroupSize ?? 1)) + 1;
  const column = Math.floor((tile.x - 1) / (mapConfig.coordinateGroupSize ?? 1)) + 1;
  return `${tileName} L${level} · R${row} C${column}`;
}

export function SimulationPanel({
  simulation,
  mapConfig,
  notice,
  onAdvanceDay,
  onFinalDayChange,
  onCollapseChange,
}: SimulationPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [finalDayDraft, setFinalDayDraft] = useState(String(simulation.finalDay));
  const score = calculateCityRaceScoreAtDayStart(simulation);
  const captureCounts = getCityRaceCaptureCounts(simulation);

  useEffect(() => {
    setFinalDayDraft(String(simulation.finalDay));
  }, [simulation.finalDay]);

  function toggleCollapsed(next: boolean) {
    setCollapsed(next);
    onCollapseChange?.(next);
  }

  function commitFinalDay() {
    const parsed = Number(finalDayDraft);
    if (
      Number.isInteger(parsed) &&
      parsed >= CITY_RACE_MIN_FINAL_DAY &&
      parsed >= simulation.currentDay
    ) {
      onFinalDayChange(parsed);
      return;
    }
    setFinalDayDraft(String(simulation.finalDay));
  }

  if (collapsed) {
    return (
      <aside className="map-score-panel city-race-panel" aria-label="City Race simulation">
        <button
          className="secondary-button aside-control-button"
          type="button"
          onClick={() => toggleCollapsed(false)}
          aria-label="Show simulation panel"
        >
          ‹
        </button>
      </aside>
    );
  }

  return (
    <aside className="map-score-panel city-race-panel" aria-label="City Race simulation">
      <div className="city-race-panel-heading">
        <div>
          <div className="city-race-title-row">
            <span>City Race simulation</span>
            <small className="city-race-beta-badge">Beta</small>
          </div>
          <strong>Day {simulation.currentDay} · 00:00 score</strong>
        </div>
        <button
          className="secondary-button aside-control-button city-race-collapse-button"
          type="button"
          onClick={() => toggleCollapsed(true)}
          aria-label="Hide simulation panel"
        >
          ›
        </button>
      </div>

      <div className="city-race-score-card">
        <span>Dark Oil</span>
        <strong>{formatNumber(score.total)}</strong>
        <small>
          {formatNumber(score.production)} production +{" "}
          {formatNumber(score.firstCaptureBonuses)} first-capture bonus
        </small>
      </div>

      <div className="city-race-fields">
        <label>
          <span>Current day</span>
          <strong>
            {simulation.currentDay} / {simulation.finalDay}
          </strong>
        </label>
        <label>
          <span>Final score day</span>
          <input
            type="number"
            min={CITY_RACE_MIN_FINAL_DAY}
            step={1}
            inputMode="numeric"
            value={finalDayDraft}
            onChange={(event) => setFinalDayDraft(event.target.value)}
            onBlur={commitFinalDay}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitFinalDay();
              }
            }}
          />
        </label>
      </div>

      <button
        className="primary-button city-race-next-day"
        type="button"
        onClick={onAdvanceDay}
        disabled={simulation.currentDay >= simulation.finalDay}
      >
        {simulation.currentDay >= simulation.finalDay
          ? "Final score reached"
          : `Advance to Day ${simulation.currentDay + 1}`}
      </button>

      <div className="city-race-limit-grid" aria-label="City Race limits">
        <span>
          Towns today
          <strong>
            {captureCounts.towns}/{CITY_RACE_DAILY_TOWN_LIMIT}
          </strong>
        </span>
        <span>
          Mines today
          <strong>
            {captureCounts.mines}/{CITY_RACE_DAILY_MINE_LIMIT}
          </strong>
        </span>
        <span>
          Towns held
          <strong>
            {simulation.currentTowns.length}/{CITY_RACE_MAX_CURRENT_TOWNS}
          </strong>
        </span>
        <span>
          Mines held
          <strong>
            {simulation.currentMines.length}/{CITY_RACE_MAX_CURRENT_MINES}
          </strong>
        </span>
        <span>
          Trade Centers held
          <strong>{simulation.currentTradeCenters.length} · No cap</strong>
        </span>
      </div>

      {notice ? (
        <p className={`city-race-notice city-race-notice--${notice.tone}`} role="status">
          {notice.text}
        </p>
      ) : (
        <p className="city-race-notice city-race-notice--info">
          Click an available tile to capture it. Click an owned tile to choose its drop time.
        </p>
      )}

      <div className="city-race-history-heading">
        <span>Total captures</span>
        <strong>{simulation.totalCaptures.length}</strong>
      </div>
      <div className="city-race-history">
        {simulation.totalCaptures.length === 0 ? (
          <p>No captures yet. Start with a Level 1 edge mine.</p>
        ) : (
          [...simulation.totalCaptures].reverse().map((capture, index) => (
            <article
              className="city-race-history-item"
              key={`${capture.tileId}-${capture.captureTime}-${index}`}
            >
              <strong>
                {formatCaptureName(capture.tileId, capture.kind, capture.level, mapConfig)}
              </strong>
              <span>
                {capture.captureTime} → {capture.releaseTime ?? "Held"}
              </span>
              {capture.kind !== "town" ? (
                <small>No Dark Oil production</small>
              ) : capture.firstCaptureBonus !== null ? (
                <small>First capture: +{formatNumber(capture.firstCaptureBonus)}</small>
              ) : (
                <small>Repeat capture</small>
              )}
            </article>
          ))
        )}
      </div>

      <p className="city-race-bonus-note">
        First-capture bonus amounts were not supplied, so first captures are recorded as +0.
      </p>
    </aside>
  );
}
