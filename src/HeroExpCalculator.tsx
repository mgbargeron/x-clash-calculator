import { useEffect, useMemo, useRef } from "react";
import Decimal from "decimal.js";
import type { Row } from "./types";
import { formatInputValue } from "./utils/formatInputValue";
import { formatWholeDecimal } from "./utils/formatWholeDecimal";
import { sanitizeNumericInput } from "./utils/sanatizeNumericInput";
import { toDecimal } from "./utils/toDecimal";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useInitialRowsSync } from "./hooks/useInitialRowsSync";
import { useScrollToElement } from "./hooks/useScrollToElement";

type HeroExpCalculatorProps = {
  chestValues: string[];
  onChestValueChange: (columnIndex: number, value: string) => void;
  storageKey: string;
};

const START_LEVEL_STORAGE_SUFFIX = "-start-level";
const MAX_HERO_LEVEL = 150;

const HERO_LEVEL_COSTS_RAW: Record<string, number | string> = {
  "1": 90,
  "2": 190,
  "3": 280,
  "4": 380,
  "5": 470,
  "6": 570,
  "7": 660,
  "8": 760,
  "9": 850,
  "10": 950,
  "11": 1040,
  "12": 1140,
  "13": 1240,
  "14": 1330,
  "15": 1430,
  "16": 1520,
  "17": 1620,
  "18": 1720,
  "19": 1810,
  "20": 1910,
  "21": 2000,
  "22": 2200,
  "23": 2580,
  "24": 3060,
  "25": 3730,
  "26": 4400,
  "27": 5270,
  "28": 6320,
  "29": 7670,
  "30": 9110,
  "31": "11k",
  "32": "13k",
  "33": "16k",
  "34": "19k",
  "35": "23k",
  "36": "27k",
  "37": "33k",
  "38": "39k",
  "39": "47k",
  "40": "56k",
  "41": "68k",
  "42": "81k",
  "43": "105k",
  "44": "125k",
  "45": "144k",
  "46": "173k",
  "47": "212k",
  "48": "250k",
  "49": "299k",
  "50": "357k",
  "51": "424k",
  "52": "511k",
  "53": "608k",
  "54": "734k",
  "55": "879k",
  "56": "1060k",
  "57": "1350k",
  "58": "1540k",
  "59": "1830k",
  "60": "2030k",
  "61": "2220k",
  "62": "2420k",
  "63": "2710k",
  "64": "3000k",
  "65": "3290k",
  "66": "3580k",
  "67": "3970k",
  "68": "4360k",
  "69": "4750k",
  "70": "5240k",
  "71": "5730k",
  "72": "6310k",
  "73": "6990k",
  "74": "7680k",
  "75": "8460k",
  "76": "9240k",
  "77": "10M",
  "78": "11M",
  "79": "12M",
  "80": "12M",
  "81": "13M",
  "82": "13M",
  "83": "14M",
  "84": "15M",
  "85": "16M",
  "86": "16M",
  "87": "17M",
  "88": "18M",
  "89": "19M",
  "90": "20M",
  "91": "21M",
  "92": "22M",
  "93": "23M",
  "94": "25M",
  "95": "26M",
  "96": "27M",
  "97": "29M",
  "98": "30M",
  "99": "32M",
  "100": "34M",
  "101": "36M",
  "102": "38M",
  "103": "40M",
  "104": "42M",
  "105": "44M",
  "106": "46M",
  "107": "48M",
  "108": "50M",
  "109": "52M",
  "110": "54M",
  "111": "56M",
  "112": "58M",
  "113": "60M",
  "114": "62M",
  "115": "64M",
  "116": "66M",
  "117": "67M",
  "118": "69M",
  "119": "71M",
  "120": "73M",
  "121": "75M",
  "122": "77M",
  "123": "79M",
  "124": "81M",
  "125": "83M",
  "126": "85M",
  "127": "87M",
  "128": "89M",
  "129": "91M",
  "130": "93M",
  "131": "95M",
  "132": "98M",
  "133": "103M",
  "134": "108M",
  "135": "113M",
  "136": "118M",
  "137": "123M",
  "138": "128M",
  "139": "133M",
  "140": "138M",
  "141": "143M",
  "142": "148M",
  "143": "153M",
  "144": "158M",
  "145": "163M",
  "146": "168M",
  "147": "173M",
  "148": "178M",
  "149": "183M",
};

function parseHeroExpCost(value: number | string) {
  if (typeof value === "number") {
    return new Decimal(value);
  }

  const normalized = value.trim().toUpperCase();

  if (normalized.endsWith("K")) {
    return new Decimal(normalized.slice(0, -1)).mul(1000);
  }

  if (normalized.endsWith("M")) {
    return new Decimal(normalized.slice(0, -1)).mul(1000000);
  }

  return new Decimal(normalized);
}

const HERO_LEVEL_COSTS = Array.from({ length: MAX_HERO_LEVEL + 1 }, (_, level) => {
  if (level >= MAX_HERO_LEVEL) {
    return new Decimal(0);
  }

  return parseHeroExpCost(HERO_LEVEL_COSTS_RAW[String(level)] ?? 0);
});

const LEVEL_OPTIONS = Array.from({ length: MAX_HERO_LEVEL }, (_, index) => index + 1);

function clampLevel(level: number) {
  return Math.min(Math.max(level, 1), MAX_HERO_LEVEL);
}

export default function HeroExpCalculator({
  chestValues,
  onChestValueChange,
  storageKey,
}: HeroExpCalculatorProps) {
  const levelListRef = useRef<HTMLDivElement | null>(null);
  const currentLevelRef = useRef<HTMLDivElement | null>(null);

  const initialRows = useMemo<Row[]>(
    () => [
      { description: "Blue Chest", value: chestValues[0] ?? "", quantity: "", isStatic: true },
      { description: "Purple Chest", value: chestValues[1] ?? "", quantity: "", isStatic: true },
      { description: "Legendary Chest", value: chestValues[2] ?? "", quantity: "", isStatic: true },
    ],
    [chestValues]
  );

  // useInitialRowsSync handles: initial loading, row sync with props, and localStorage persistence
  const { rows, setRows } = useInitialRowsSync({ initialRows, storageKey });

  // useLocalStorage handles: loading and persisting start level
  const [startLevel, setStartLevel] = useLocalStorage<number>(`${storageKey}${START_LEVEL_STORAGE_SUFFIX}`, 1);

  // Handle clamp on load
  useEffect(() => {
    if (!Number.isFinite(startLevel)) {
      setStartLevel(clampLevel(1));
    } else if (startLevel < 1 || startLevel > MAX_HERO_LEVEL) {
      setStartLevel(clampLevel(startLevel));
    }
  }, [startLevel, setStartLevel]);

  // useScrollToElement handles: scrolling to current level element (moved after progression is defined)

  const rowTotals = useMemo(
    () =>
      rows.map((row) => {
        const value = toDecimal(row.value);
        const quantity = toDecimal(row.quantity);
        return value.mul(quantity);
      }),
    [rows]
  );

  const totalExp = useMemo(
    () => rowTotals.reduce((sum, total) => sum.plus(total), new Decimal(0)),
    [rowTotals]
  );

  const progression = useMemo(() => {
    let achievedLevel = startLevel;
    let spentExp = new Decimal(0);
    let remainingExp = totalExp;

    while (achievedLevel < MAX_HERO_LEVEL) {
      const nextCost = HERO_LEVEL_COSTS[achievedLevel];
      if (remainingExp.lt(nextCost)) {
        break;
      }

      remainingExp = remainingExp.minus(nextCost);
      spentExp = spentExp.plus(nextCost);
      achievedLevel += 1;
    }

    const nextLevel = achievedLevel < MAX_HERO_LEVEL ? achievedLevel + 1 : MAX_HERO_LEVEL;
    const nextLevelCost = achievedLevel < MAX_HERO_LEVEL ? HERO_LEVEL_COSTS[achievedLevel] : new Decimal(0);
    const expNeededForNextLevel = Decimal.max(
      nextLevelCost.minus(remainingExp),
      new Decimal(0)
    );

    let expToMax = new Decimal(0);
    for (let level = startLevel; level < MAX_HERO_LEVEL; level += 1) {
      expToMax = expToMax.plus(HERO_LEVEL_COSTS[level]);
    }

    return {
      achievedLevel,
      levelsGained: achievedLevel - startLevel,
      spentExp,
      remainingExp,
      nextLevel,
      nextLevelCost,
      expNeededForNextLevel,
      expToMax,
      expStillNeededToMax: Decimal.max(expToMax.minus(totalExp), new Decimal(0)),
    };
  }, [startLevel, totalExp]);

  // useScrollToElement handles: scrolling to current level element
  useScrollToElement({ listRef: levelListRef, targetRef: currentLevelRef, triggerId: [progression.achievedLevel, startLevel] });

  const chestRequirements = useMemo(
    () =>
      rows.map((row) => {
        const chestValue = toDecimal(row.value);
        const toNext =
          chestValue.gt(0) && progression.expNeededForNextLevel.gt(0)
            ? progression.expNeededForNextLevel.div(chestValue).ceil()
            : new Decimal(0);
        const toMax =
          chestValue.gt(0) && progression.expToMax.gt(0)
            ? progression.expToMax.div(chestValue).ceil()
            : new Decimal(0);

        return {
          description: row.description,
          chestValue,
          toNext,
          toMax,
        };
      }),
    [progression.expNeededForNextLevel, progression.expToMax, rows]
  );

  const nextLevelProgressPercent = useMemo(() => {
    if (progression.achievedLevel >= MAX_HERO_LEVEL || progression.nextLevelCost.lte(0)) {
      return 100;
    }

    return Number(
      Decimal.min(
        progression.remainingExp.div(progression.nextLevelCost).mul(100),
        new Decimal(100)
      ).toFixed(1)
    );
  }, [progression.achievedLevel, progression.nextLevelCost, progression.remainingExp]);

  const maxLevelProgressPercent = useMemo(() => {
    if (progression.expToMax.lte(0)) {
      return 100;
    }

    return Number(
      Decimal.min(totalExp.div(progression.expToMax).mul(100), new Decimal(100)).toFixed(1)
    );
  }, [progression.expToMax, totalExp]);

  const visibleLevels = useMemo(
    () =>
      LEVEL_OPTIONS.filter((level) => level >= startLevel).map((level) => ({
        level,
        expRequired:
          level >= MAX_HERO_LEVEL ? null : HERO_LEVEL_COSTS[level],
        state:
          level < progression.achievedLevel
            ? "achieved"
            : level === progression.achievedLevel
              ? "current"
              : level === progression.nextLevel &&
                  progression.achievedLevel < MAX_HERO_LEVEL &&
                  progression.remainingExp.gt(0)
                ? "next"
                : "pending",
      })),
    [progression.achievedLevel, progression.nextLevel, progression.remainingExp, startLevel]
  );

  function updateRow(index: number, nextValue: string) {
    const sanitizedValue = sanitizeNumericInput(nextValue);

    setRows((currentRows) =>
      currentRows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, quantity: sanitizedValue } : row
      )
    );
  }

  return (
    <div className="hero-exp-layout">
      <div className="hero-exp-main">
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
                  {progression.achievedLevel >= MAX_HERO_LEVEL
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
                  {progression.achievedLevel >= MAX_HERO_LEVEL ? "100%" : `${nextLevelProgressPercent}%`}
                </strong>
              </div>
              <div className="hero-progress-track">
                <div
                  className="hero-progress-fill hero-progress-fill-next"
                  style={{ width: `${nextLevelProgressPercent}%` }}
                />
              </div>
              <small>
                {progression.achievedLevel >= MAX_HERO_LEVEL
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

        <section className="hero-surface">
          <div className="hero-section-heading">
            <div>
              <p className="hero-section-label">Requirements</p>
              <h2>Chest counts needed</h2>
            </div>
          </div>

          <div className="hero-exp-chest-grid">
            {chestRequirements.map((requirement) => (
              <section className="hero-exp-chest-card" key={requirement.description}>
                <p>{requirement.description}</p>
                <strong>{formatInputValue(requirement.chestValue.toString())} EXP</strong>
                <span>
                  To next:{" "}
                  {progression.achievedLevel >= MAX_HERO_LEVEL
                    ? "Maxed"
                    : requirement.chestValue.lte(0)
                      ? "Set chest value"
                      : formatWholeDecimal(requirement.toNext)}
                </span>
                <span>
                  To 150:{" "}
                  {requirement.chestValue.gt(0)
                    ? formatWholeDecimal(requirement.toMax)
                    : "Set chest value"}
                </span>
              </section>
            ))}
          </div>
        </section>
      </div>

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
    </div>
  );
}
