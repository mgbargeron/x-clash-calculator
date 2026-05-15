import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import Decimal from "decimal.js";
import { formatWholeDecimal } from "../../utils/formatWholeDecimal";

const MAX_VISIBLE_OPTIONS = 10;

type LevelAutocompleteProps = {
  value: number;
  onChange: (level: number) => void;
  clampLevel: (level: number) => number;
  LEVEL_OPTIONS: number[];
};

function LevelAutocomplete({
  value,
  onChange,
  clampLevel,
  LEVEL_OPTIONS,
}: LevelAutocompleteProps) {
  const [inputValue, setInputValue] = useState(String(value));
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  const filteredOptions = useMemo(() => {
    if (!inputValue) return LEVEL_OPTIONS;
    return LEVEL_OPTIONS.filter((l) => String(l).startsWith(inputValue));
  }, [inputValue, LEVEL_OPTIONS]);

  const visibleOptions = useMemo(
    () => filteredOptions.slice(0, MAX_VISIBLE_OPTIONS),
    [filteredOptions]
  );

  const selectOption = useCallback(
    (level: number) => {
      onChange(clampLevel(level));
      setInputValue(String(level));
      setIsOpen(false);
    },
    [onChange, clampLevel]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (!/^\d*$/.test(raw)) return;
      setInputValue(raw);
      setIsOpen(true);
      setHighlightedIndex(0);
    },
    []
  );

  const handleBlur = useCallback(() => {
    const parsed = Number(inputValue);
    if (inputValue && !Number.isNaN(parsed)) {
      selectOption(clampLevel(parsed));
    } else {
      setInputValue(String(value));
    }
    setIsOpen(false);
  }, [inputValue, value, clampLevel, selectOption]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          setIsOpen(true);
          setHighlightedIndex(
            e.key === "ArrowDown" ? 0 : visibleOptions.length - 1
          );
          e.preventDefault();
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          setHighlightedIndex((prev) =>
            Math.min(prev + 1, visibleOptions.length - 1)
          );
          e.preventDefault();
          break;
        case "ArrowUp":
          setHighlightedIndex((prev) => Math.max(prev - 1, 0));
          e.preventDefault();
          break;
        case "Enter":
          if (visibleOptions[highlightedIndex] !== undefined) {
            selectOption(visibleOptions[highlightedIndex]);
          }
          e.preventDefault();
          break;
        case "Escape":
          setInputValue(String(value));
          setIsOpen(false);
          e.preventDefault();
          break;
      }
    },
    [isOpen, visibleOptions, highlightedIndex, selectOption, value]
  );

  return (
    <div className="hero-exp-autocomplete">
      <input
        ref={inputRef}
        type="text"
        className="hero-level-select"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => {
          setIsOpen(true);
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
      {isOpen && visibleOptions.length > 0 && (
        <ul ref={listRef} className="hero-level-dropdown" role="listbox">
          {visibleOptions.map((level, index) => (
            <li
              key={level}
              role="option"
              aria-selected={index === highlightedIndex}
              className={`hero-level-option${index === highlightedIndex ? " hero-level-option-highlighted" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                selectOption(level);
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {level}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type HeroExpOverviewProps = {
  startLevel: number;
  setStartLevel: (level: number) => void;
  desiredLevel: number;
  setDesiredLevel: (level: number) => void;
  clampLevel: (level: number) => number;
  LEVEL_OPTIONS: number[];
  progression: {
    achievedLevel: number;
    levelsGained: number;
    nextLevel: number;
    expToMax: Decimal;
    expToDesired: Decimal;
    remainingExp: Decimal;
    nextLevelCost: Decimal;
  };
  nextLevelProgressPercent: number;
  desiredLevelProgressPercent: number;
  totalExp: Decimal;
};

export function HeroExpOverview({
  startLevel,
  setStartLevel,
  desiredLevel,
  setDesiredLevel,
  clampLevel,
  LEVEL_OPTIONS,
  progression,
  nextLevelProgressPercent,
  desiredLevelProgressPercent,
  totalExp,
}: HeroExpOverviewProps) {
  return (
    <section className="hero-surface hero-exp-overview">
      <div className="hero-exp-overview-top">
        <div className="hero-exp-level-controls">
          <label className="hero-exp-control">
            <span>Starting level</span>
            <LevelAutocomplete
              value={startLevel}
              onChange={setStartLevel}
              clampLevel={clampLevel}
              LEVEL_OPTIONS={LEVEL_OPTIONS}
            />
          </label>
          <label className="hero-exp-control">
            <span>Desired level</span>
            <LevelAutocomplete
              value={desiredLevel}
              onChange={setDesiredLevel}
              clampLevel={clampLevel}
              LEVEL_OPTIONS={LEVEL_OPTIONS}
            />
          </label>
        </div>

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
              {progression.achievedLevel >= 150
                ? "100%"
                : `${nextLevelProgressPercent}%`}
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
            <span>
              Progress from level {startLevel} to {desiredLevel}
            </span>
            <strong>{desiredLevelProgressPercent}%</strong>
          </div>
          <div className="hero-progress-track">
            <div
              className="hero-progress-fill hero-progress-fill-max"
              style={{ width: `${desiredLevelProgressPercent}%` }}
            />
          </div>
          <small>
            {formatWholeDecimal(totalExp)} /{" "}
            {formatWholeDecimal(progression.expToDesired)} EXP
          </small>
        </div>
      </div>
    </section>
  );
}
