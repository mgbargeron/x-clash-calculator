import { useEffect, useMemo, useRef } from "react";
import Decimal from "decimal.js";
import type { Row } from "../../types";
import { sanitizeNumericInput } from "../../utils/sanitizeNumericInput";
import { toDecimal } from "../../utils/toDecimal";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { useInitialRowsSync } from "../../hooks/useInitialRowsSync";
import { HeroExpChestValues } from "./HeroExpChestValues";
import { HeroExpOverview } from "./HeroExpOverview";
import { HeroExpInputGrid } from "./HeroExpInputGrid";
import { HeroExpRequirements } from "./HeroExpRequirements";
import { HeroExpSidebar } from "./HeroExpSidebar";

type HeroExpCalculatorProps = {
  chestValues: string[];
  onChestValueChange: (columnIndex: number, value: string) => void;
  storageKey: string;
};

const START_LEVEL_STORAGE_SUFFIX = "-start-level";
const DESIRED_LEVEL_STORAGE_SUFFIX = "-desired-level";
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
  const isMounted = useRef(true);

  const initialRows = useMemo<Row[]>(
    () => [
      { description: "Blue Chest", value: chestValues[0] ?? "", quantity: "", isStatic: true },
      { description: "Purple Chest", value: chestValues[1] ?? "", quantity: "", isStatic: true },
      { description: "Legendary Chest", value: chestValues[2] ?? "", quantity: "", isStatic: true },
    ],
    [chestValues]
  );

  const { rows, setRows } = useInitialRowsSync({ initialRows, storageKey });

  const [startLevel, setStartLevel] = useLocalStorage<number>(`${storageKey}${START_LEVEL_STORAGE_SUFFIX}`, 1);
  const [desiredLevel, setDesiredLevel] = useLocalStorage<number>(`${storageKey}${DESIRED_LEVEL_STORAGE_SUFFIX}`, MAX_HERO_LEVEL);

  useEffect(() => {
    if (!Number.isFinite(startLevel)) {
      setStartLevel(clampLevel(1));
    } else if (startLevel < 1 || startLevel > MAX_HERO_LEVEL) {
      setStartLevel(clampLevel(startLevel));
    }
  }, [startLevel, setStartLevel]);

  useEffect(() => {
    if (!Number.isFinite(desiredLevel)) {
      setDesiredLevel(clampLevel(MAX_HERO_LEVEL));
    } else if (desiredLevel < 1 || desiredLevel > MAX_HERO_LEVEL) {
      setDesiredLevel(clampLevel(desiredLevel));
    } else if (desiredLevel < startLevel) {
      setDesiredLevel(startLevel);
    }
  }, [desiredLevel, setDesiredLevel, startLevel]);

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

    let expToDesired = new Decimal(0);
    for (let level = startLevel; level < desiredLevel; level += 1) {
      expToDesired = expToDesired.plus(HERO_LEVEL_COSTS[level]);
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
      expToDesired,
      expStillNeededToMax: Decimal.max(expToMax.minus(totalExp), new Decimal(0)),
      expStillNeededToDesired: Decimal.max(expToDesired.minus(totalExp), new Decimal(0)),
    };
  }, [startLevel, desiredLevel, totalExp]);

  useEffect(() => {
    if (!isMounted.current) return;
    const listElement = levelListRef.current;
    const targetElement = currentLevelRef.current;
    if (!listElement || !targetElement) return;

    const listRect = listElement.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();
    const relativeTop = targetRect.top - listRect.top;

    listElement.scrollTo({ top: listElement.scrollTop + relativeTop, behavior: "smooth" });
  }, [progression.achievedLevel]);

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
        const toDesired =
          chestValue.gt(0) && progression.expToDesired.gt(0)
            ? progression.expToDesired.div(chestValue).ceil()
            : new Decimal(0);

        return {
          description: row.description,
          chestValue,
          toNext,
          toMax,
          toDesired,
        };
      }),
    [progression.expNeededForNextLevel, progression.expToMax, progression.expToDesired, rows]
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

  const desiredLevelProgressPercent = useMemo(() => {
    if (progression.expToDesired.lte(0)) {
      return 100;
    }

    return Number(
      Decimal.min(totalExp.div(progression.expToDesired).mul(100), new Decimal(100)).toFixed(1)
    );
  }, [progression.expToDesired, totalExp]);

  type LevelState = "achieved" | "current" | "next" | "pending";

  const visibleLevels = useMemo(
    () =>
      LEVEL_OPTIONS.filter((level) => level >= startLevel).map((level): { level: number; expRequired: Decimal | null; state: LevelState } => {
        const state: LevelState =
          level < progression.achievedLevel
            ? "achieved"
            : level === progression.achievedLevel
              ? "current"
              : level === progression.nextLevel &&
                  progression.achievedLevel < MAX_HERO_LEVEL &&
                  progression.remainingExp.gt(0)
                ? "next"
                : "pending";

        return {
          level,
          expRequired:
            level >= MAX_HERO_LEVEL ? null : HERO_LEVEL_COSTS[level],
          state,
        };
      }),
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
        <HeroExpChestValues
          rows={rows}
          chestValues={chestValues}
          onChestValueChange={onChestValueChange}
        />

        <HeroExpOverview
          startLevel={startLevel}
          setStartLevel={setStartLevel}
          desiredLevel={desiredLevel}
          setDesiredLevel={setDesiredLevel}
          clampLevel={clampLevel}
          LEVEL_OPTIONS={LEVEL_OPTIONS}
          progression={progression}
          nextLevelProgressPercent={nextLevelProgressPercent}
          desiredLevelProgressPercent={desiredLevelProgressPercent}
          totalExp={totalExp}
        />

        <HeroExpInputGrid
          rows={rows}
          rowTotals={rowTotals}
          updateRow={updateRow}
        />

        <HeroExpRequirements
          chestRequirements={chestRequirements}
          progression={progression}
          desiredLevel={desiredLevel}
        />
      </div>

      <HeroExpSidebar
        levelListRef={levelListRef}
        currentLevelRef={currentLevelRef}
        visibleLevels={visibleLevels}
        totalExp={totalExp}
        progression={progression}
        startLevel={startLevel}
        desiredLevel={desiredLevel}
      />
    </div>
  );
}
