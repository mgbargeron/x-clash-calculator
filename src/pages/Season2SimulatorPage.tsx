import {useMemo, useState, type ReactNode} from "react";
import {calculateDarkOil, cityOpenDays, formatNumber, type CityCounts} from "../components/season2simulator/season2script";

type SimulationEntry = {
  day: number;
  part: number;
  hours: number;
  darkOilPerHour: number;
  earned: number;
  total: number;
  isCityOpenDay: boolean;
};

export default function Season2SimulatorPage({navigation}: {navigation: ReactNode}) {
  const [currentDay, setCurrentDay] = useState(1);
  const [currentPart, setCurrentPart] = useState(1);
  const [hoursInput, setHoursInput] = useState("");
  const [cityCounts, setCityCounts] = useState<CityCounts>({
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0,
  });
  const [history, setHistory] = useState<SimulationEntry[]>([]);

  const isCityOpenDay = currentDay in cityOpenDays;
  const totalParts = isCityOpenDay ? 2 : 1;

  const currentTotal = useMemo(() => {
    return history.reduce((sum, entry) => sum + entry.earned, 0);
  }, [history]);

  const previewOil = useMemo(() => {
    return calculateDarkOil(cityCounts);
  }, [cityCounts]);

  const previewEarned = useMemo(() => {
    if (parseInt(hoursInput, 10) <= 0) return "—";
    return `+${formatNumber(previewOil * parseInt(hoursInput, 10))}`;
  }, [hoursInput, previewOil]);

  const isDayComplete = useMemo(() => {
    return history.some(
      (entry) =>
        (entry.isCityOpenDay && entry.part === 2 && entry.day === currentDay) ||
        (!entry.isCityOpenDay && entry.day === currentDay && entry.part === 1)
    );
  }, [currentDay, history]);

  function updateCityCount(level: number, value: string) {
    setCityCounts((prev) => ({
      ...prev,
      [level]: Math.max(0, Number.parseInt(value, 10) || 0),
    }));
  }

  function handleSubmit() {
    const hours = Number.parseInt(hoursInput, 10);
    if (isNaN(hours) || hours <= 0) return;

    const darkOilPerHour = calculateDarkOil(cityCounts);
    const earned = darkOilPerHour * hours;

    const entry: SimulationEntry = {
      day: currentDay,
      part: currentPart,
      hours,
      darkOilPerHour,
      earned,
      total: currentTotal + earned,
      isCityOpenDay,
    };

    setHistory((prev) => [...prev, entry]);

    setHoursInput("");
    setCityCounts({1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0});

    if (currentPart < totalParts) {
      setCurrentPart((prev) => prev + 1);
    } else {
      setCurrentDay((prev) => prev + 1);
      setCurrentPart(1);
    }
  }

  function clearHistory() {
    setHistory([]);
    setCurrentDay(1);
    setCurrentPart(1);
  }

  return (
    <section className="card calculator season2-simulator">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Season 2</p>
          <h1>Dark Oil Simulator</h1>
          <p className="description">
            Track your dark oil earnings across simulation days. Enter hours played and city counts to calculate production.
          </p>
        </div>
        {navigation}
      </div>

      <div className="simulator-header">
        <div className="simulator-day-info">
          <h2>
            {isCityOpenDay
              ? `Day ${currentDay} - ${cityOpenDays[currentDay]}`
              : `Day ${currentDay}`}
          </h2>
          {currentPart === 2 && <p className="description">Part 2 of 2</p>}
        </div>
        <div className="simulator-total-display">
          <span className="simulator-total-label">Total Dark Oil</span>
          <span className="simulator-total-value">{formatNumber(currentTotal)}</span>
        </div>
      </div>

      {isDayComplete && (
        <div className="simulator-note">Day {currentDay} done! Moving to next day...</div>
      )}

      <div className="simulator-input-grid">
        <div className="simulator-hours-input">
          <label htmlFor="sim-hours">Hours Played</label>
          <input
            id="sim-hours"
            type="number"
            min="0"
            value={hoursInput}
            onChange={(e) => setHoursInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isDayComplete) {
                handleSubmit();
              }
            }}
            placeholder="How many hours?"
          />
          <span className="simulator-preview">{previewEarned}</span>
        </div>

        <div className="simulator-cities-grid">
          <h3>Cities Owned</h3>
          {[1, 2, 3, 4, 5, 6].map((level) => (
            <div key={level} className="simulator-city-row">
              <label htmlFor={`sim-city-${level}`}>Level {level}</label>
              <input
                id={`sim-city-${level}`}
                type="number"
                min="0"
                value={cityCounts[level] || ""}
                onChange={(e) => updateCityCount(level, e.target.value)}
                placeholder="0"
              />
              <span className="simulator-city-production">
                {formatNumber((level * 100) * Number(cityCounts[level] || 0))}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="simulator-subtotal">
        <div className="simulator-subtotal-item">
          <span>Dark Oil / Hour:</span>
          <strong>{formatNumber(previewOil)}</strong>
        </div>
        <div className="simulator-subtotal-item">
          <span>Hours:</span>
          <strong>{hoursInput || "0"}</strong>
        </div>
        <div className="simulator-subtotal-item">
          <span>Earned:</span>
          <strong>{previewEarned}</strong>
        </div>
      </div>

      <button className="primary-button" onClick={handleSubmit} disabled={isDayComplete}>
        {isCityOpenDay && currentPart === 1 ? "Submit Part 1" : isCityOpenDay ? "Submit Part 2" : "Submit Day"}
      </button>

      {history.length > 0 && (
        <button className="secondary-button reset-button" onClick={clearHistory}>
          Start Over
        </button>
      )}

      {history.length > 0 && (
        <div className="simulator-history">
          <h3>Simulation History</h3>

          <div className="simulator-history-summary">
            <div className="simulator-history-stat">
              <span>Days Completed</span>
              <strong>{history.filter((e) => e.part === (e.isCityOpenDay ? 2 : 1)).length}</strong>
            </div>
            <div className="simulator-history-stat">
              <span>Total Earned</span>
              <strong>{formatNumber(currentTotal)}</strong>
            </div>
          </div>

          <div className="simulator-history-table">
            <div className="simulator-history-row simulator-history-header">
              <span>Day</span>
              <span>Event</span>
              <span>Part</span>
              <span>Hours</span>
              <span>Rate/hr</span>
              <span>Earned</span>
              <span>Total</span>
            </div>
            {history.map((entry, idx) => (
              <div className="simulator-history-row" key={idx}>
                <span>Day {entry.day}</span>
                <span>
                  {entry.isCityOpenDay && cityOpenDays[entry.day] ? cityOpenDays[entry.day] : "—"}
                </span>
                <span>Part {entry.part}</span>
                <span>{entry.hours}</span>
                <span>{formatNumber(entry.darkOilPerHour)}</span>
                <span>{formatNumber(entry.earned)}</span>
                <span>{formatNumber(entry.total)}</span>
              </div>
            ))}
            <div className="simulator-history-row">
              <span>&nbsp;</span>
              <span>&nbsp;</span>
              <span>&nbsp;</span>
              <span>&nbsp;</span>
              <span>&nbsp;</span>
              <span>Total:</span>
              <strong className="simulator-history-row-total">{formatNumber(currentTotal)}</strong>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}