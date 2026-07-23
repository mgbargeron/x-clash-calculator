import type { GameMapConfig, GameMapTileConfig } from "./gameMapConfig";

export const CITY_RACE_SERVER_ID = "SIM";
export const CITY_RACE_DEFAULT_FINAL_DAY = 20;
export const CITY_RACE_MAX_CURRENT_TOWNS = 8;
export const CITY_RACE_MAX_CURRENT_MINES = 8;
export const CITY_RACE_DAILY_TOWN_LIMIT = 2;
export const CITY_RACE_DAILY_MINE_LIMIT = 2;

export const CITY_RACE_PRODUCTION_PER_HOUR = {
  1: 100,
  2: 200,
  3: 300,
  4: 400,
  5: 500,
  6: 600,
} as const;

export const CITY_RACE_TOWN_UNLOCK_DAY = {
  1: 1,
  2: 5,
  3: 8,
  4: 12,
  5: 15,
  6: 19,
} as const;

export type CityRaceTileKind = "copperMine" | "town" | "tradeCenter";

export type CityRaceCapture = {
  kind: CityRaceTileKind;
  tileId: string;
  level: number;
  captureTime: string;
  releaseTime: string | null;
  firstCaptureBonus: number | null;
};

export type CityRaceSimulation = {
  totalCaptures: CityRaceCapture[];
  currentTowns: string[];
  currentMines: string[];
  currentDay: number;
  finalDay: number;
  captureTime: string;
};

export type CityRaceTileStatus =
  | "owned"
  | "capturable"
  | "locked"
  | "blocked"
  | "unavailable";

export type CityRaceCaptureCounts = {
  towns: number;
  mines: number;
};

export type CityRaceScore = {
  production: number;
  firstCaptureBonuses: number;
  total: number;
};

type CityRaceActionResult = {
  state: CityRaceSimulation;
  error: string | null;
};

type ParsedTimestamp = {
  day: number;
  minuteOfDay: number;
};

const SERVER_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const TIMESTAMP_PATTERN = /^([1-9]\d*)-([01]\d|2[0-3]):([0-5]\d)$/;

function isCityRaceTileKind(value: unknown): value is CityRaceTileKind {
  return value === "town" || value === "copperMine" || value === "tradeCenter";
}

function normalizeInteger(value: unknown, fallback: number, minimum: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && Number.isInteger(parsed) && parsed >= minimum
    ? parsed
    : fallback;
}

function getTileLevel(tile: GameMapTileConfig): number {
  return normalizeInteger(tile.level, 0, 0);
}

function parseTimestamp(value: unknown): ParsedTimestamp | null {
  if (typeof value !== "string") return null;
  const match = TIMESTAMP_PATTERN.exec(value);
  if (!match) return null;

  const day = Number(match[1]);
  const hour = Number(match[2]);
  const minute = Number(match[3]);

  return {
    day,
    minuteOfDay: hour * 60 + minute,
  };
}

function timestampToMinutes(value: string): number {
  const parsed = parseTimestamp(value);
  return parsed ? (parsed.day - 1) * 24 * 60 + parsed.minuteOfDay : 0;
}

function getLastActionMinute(state: CityRaceSimulation): number {
  return state.totalCaptures.reduce((latest, capture) => {
    const captureMinute = timestampToMinutes(capture.captureTime);
    const releaseMinute = capture.releaseTime
      ? timestampToMinutes(capture.releaseTime)
      : captureMinute;
    return Math.max(latest, captureMinute, releaseMinute);
  }, 0);
}

function getTileCells(tile: GameMapTileConfig): Array<{ x: number; y: number }> {
  const width = normalizeInteger(tile.width, 1, 1);
  const height = normalizeInteger(tile.height, 1, 1);
  const shape = Array.isArray(tile.shape) && tile.shape.length > 0 ? tile.shape : null;
  const cells: Array<{ x: number; y: number }> = [];

  for (let row = 0; row < height; row += 1) {
    const shapeRow = shape && typeof shape[row] === "string" ? shape[row] : "";

    for (let column = 0; column < width; column += 1) {
      if (!shape || (shapeRow[column] ?? "X") !== ".") {
        cells.push({ x: tile.x + column, y: tile.y + row });
      }
    }
  }

  return cells;
}

function tilesTouch(first: GameMapTileConfig, second: GameMapTileConfig): boolean {
  const secondCells = new Set(getTileCells(second).map((cell) => `${cell.x},${cell.y}`));

  return getTileCells(first).some((cell) => {
    return (
      secondCells.has(`${cell.x},${cell.y}`) ||
      secondCells.has(`${cell.x + 1},${cell.y}`) ||
      secondCells.has(`${cell.x - 1},${cell.y}`) ||
      secondCells.has(`${cell.x},${cell.y + 1}`) ||
      secondCells.has(`${cell.x},${cell.y - 1}`)
    );
  });
}

function isEdgeTile(tile: GameMapTileConfig, mapConfig: GameMapConfig): boolean {
  return getTileCells(tile).some(
    (cell) =>
      cell.x === 1 ||
      cell.y === 1 ||
      cell.x === mapConfig.columns ||
      cell.y === mapConfig.rows
  );
}

function isOwned(state: CityRaceSimulation, tileId: string): boolean {
  return state.currentTowns.includes(tileId) || state.currentMines.includes(tileId);
}

function isConnectedToOwnedTile(
  state: CityRaceSimulation,
  tile: GameMapTileConfig,
  mapConfig: GameMapConfig
): boolean {
  const ownedIds = new Set([...state.currentTowns, ...state.currentMines]);
  return mapConfig.tiles.some(
    (candidate) => ownedIds.has(candidate.id) && tilesTouch(tile, candidate)
  );
}

function getFirstCaptureBonus(_tile: GameMapTileConfig): number {
  // Bonus values were not supplied. Keeping this as a number preserves first-capture
  // semantics and provides one place to add the real values when they are known.
  return 0;
}

function validateActionTime(state: CityRaceSimulation): string | null {
  if (!SERVER_TIME_PATTERN.test(state.captureTime)) {
    return "Choose a valid 24-hour server time.";
  }

  const actionMinute = timestampToMinutes(
    formatCityRaceTimestamp(state.currentDay, state.captureTime)
  );

  if (actionMinute < getLastActionMinute(state)) {
    return "Capture and release times cannot move backward.";
  }

  return null;
}

function getTownUnlockDay(level: number): number | null {
  return CITY_RACE_TOWN_UNLOCK_DAY[level as keyof typeof CITY_RACE_TOWN_UNLOCK_DAY] ?? null;
}

export function createDefaultCityRaceSimulation(): CityRaceSimulation {
  return {
    totalCaptures: [],
    currentTowns: [],
    currentMines: [],
    currentDay: 1,
    finalDay: CITY_RACE_DEFAULT_FINAL_DAY,
    captureTime: "00:00",
  };
}

export function normalizeCityRaceSimulation(
  raw: unknown,
  mapConfig: GameMapConfig
): CityRaceSimulation {
  if (!raw || typeof raw !== "object") return createDefaultCityRaceSimulation();

  const stored = raw as Partial<CityRaceSimulation>;
  const finalDay = normalizeInteger(
    stored.finalDay,
    CITY_RACE_DEFAULT_FINAL_DAY,
    CITY_RACE_DEFAULT_FINAL_DAY
  );
  const requestedCurrentDay = Math.min(
    normalizeInteger(stored.currentDay, 1, 1),
    finalDay
  );
  const captureTime =
    typeof stored.captureTime === "string" && SERVER_TIME_PATTERN.test(stored.captureTime)
      ? stored.captureTime
      : "00:00";
  const tilesById = new Map(mapConfig.tiles.map((tile) => [tile.id, tile]));
  const captures: CityRaceCapture[] = [];
  const openTileIds = new Set<string>();
  let openTownCount = 0;
  let openMineCount = 0;
  const storedCaptures = Array.isArray(stored.totalCaptures) ? stored.totalCaptures : [];

  for (const candidate of storedCaptures) {
    if (!candidate || typeof candidate !== "object") continue;
    const capture = candidate as Partial<CityRaceCapture>;
    const tile = typeof capture.tileId === "string" ? tilesById.get(capture.tileId) : undefined;
    if (!tile || !isCityRaceTileKind(tile.kind) || tile.kind === "tradeCenter") continue;
    if (capture.kind !== tile.kind || openTileIds.has(tile.id)) continue;

    const parsedCaptureTime = parseTimestamp(capture.captureTime);
    const normalizedReleaseTime = capture.releaseTime ?? null;
    const parsedReleaseTime = parseTimestamp(normalizedReleaseTime);
    if (!parsedCaptureTime || parsedCaptureTime.day > finalDay) continue;
    if (
      normalizedReleaseTime !== null &&
      (!parsedReleaseTime ||
        timestampToMinutes(normalizedReleaseTime) < timestampToMinutes(capture.captureTime!) ||
        parsedReleaseTime.day > finalDay)
    ) {
      continue;
    }

    const firstCaptureBonus =
      tile.kind !== "town" || capture.firstCaptureBonus === null
        ? null
        : typeof capture.firstCaptureBonus === "number" &&
            Number.isFinite(capture.firstCaptureBonus) &&
            capture.firstCaptureBonus >= 0
          ? Math.floor(capture.firstCaptureBonus)
          : null;
    const normalizedCapture: CityRaceCapture = {
      kind: tile.kind,
      tileId: tile.id,
      level: getTileLevel(tile),
      captureTime: capture.captureTime!,
      releaseTime: normalizedReleaseTime,
      firstCaptureBonus,
    };

    if (
      normalizedCapture.releaseTime === null &&
      ((normalizedCapture.kind === "town" &&
        openTownCount >= CITY_RACE_MAX_CURRENT_TOWNS) ||
        (normalizedCapture.kind === "copperMine" &&
          openMineCount >= CITY_RACE_MAX_CURRENT_MINES))
    ) {
      continue;
    }

    captures.push(normalizedCapture);
    if (normalizedCapture.releaseTime === null) {
      openTileIds.add(tile.id);
      if (normalizedCapture.kind === "town") openTownCount += 1;
      if (normalizedCapture.kind === "copperMine") openMineCount += 1;
    }
  }

  captures.sort(
    (first, second) =>
      timestampToMinutes(first.captureTime) - timestampToMinutes(second.captureTime)
  );
  const latestActionDay = captures.reduce((latestDay, capture) => {
    const captureDay = parseTimestamp(capture.captureTime)?.day ?? 1;
    const releaseDay = parseTimestamp(capture.releaseTime)?.day ?? captureDay;
    return Math.max(latestDay, captureDay, releaseDay);
  }, 1);
  const currentDay = Math.min(
    Math.max(requestedCurrentDay, latestActionDay),
    finalDay
  );

  return {
    totalCaptures: captures,
    currentTowns: captures
      .filter((capture) => capture.kind === "town" && capture.releaseTime === null)
      .map((capture) => capture.tileId)
      .slice(0, CITY_RACE_MAX_CURRENT_TOWNS),
    currentMines: captures
      .filter((capture) => capture.kind === "copperMine" && capture.releaseTime === null)
      .map((capture) => capture.tileId)
      .slice(0, CITY_RACE_MAX_CURRENT_MINES),
    currentDay,
    finalDay,
    captureTime,
  };
}

export function formatCityRaceTimestamp(day: number, time: string): string {
  return `${day}-${time}`;
}

export function getCityRaceCaptureCounts(
  state: CityRaceSimulation,
  day = state.currentDay
): CityRaceCaptureCounts {
  return state.totalCaptures.reduce<CityRaceCaptureCounts>(
    (counts, capture) => {
      if (parseTimestamp(capture.captureTime)?.day !== day) return counts;
      if (capture.kind === "town") counts.towns += 1;
      if (capture.kind === "copperMine") counts.mines += 1;
      return counts;
    },
    { towns: 0, mines: 0 }
  );
}

export function getCityRaceCaptureError(
  state: CityRaceSimulation,
  tile: GameMapTileConfig,
  mapConfig: GameMapConfig
): string | null {
  if (tile.kind === "tradeCenter") {
    return "Trade Centers are not capture targets in this simulation.";
  }
  if (tile.kind !== "town" && tile.kind !== "copperMine") {
    return "This tile cannot be captured in City Race.";
  }
  if (isOwned(state, tile.id)) {
    return "This tile is already owned. Right-click it to release it.";
  }

  const timeError = validateActionTime(state);
  if (timeError) return timeError;

  const counts = getCityRaceCaptureCounts(state);
  if (tile.kind === "town") {
    const unlockDay = getTownUnlockDay(getTileLevel(tile));
    if (unlockDay === null) {
      return `Level ${getTileLevel(tile)} towns do not have an unlock day.`;
    }
    if (state.currentDay < unlockDay) {
      return `Level ${getTileLevel(tile)} towns unlock on Day ${unlockDay}.`;
    }
    if (counts.towns >= CITY_RACE_DAILY_TOWN_LIMIT) {
      return `The Day ${state.currentDay} town capture limit has been reached.`;
    }
    if (state.currentTowns.length >= CITY_RACE_MAX_CURRENT_TOWNS) {
      return "Release a town before capturing another one.";
    }
  }

  if (tile.kind === "copperMine") {
    if (counts.mines >= CITY_RACE_DAILY_MINE_LIMIT) {
      return `The Day ${state.currentDay} mine capture limit has been reached.`;
    }
    if (state.currentMines.length >= CITY_RACE_MAX_CURRENT_MINES) {
      return "Release a mine before capturing another one.";
    }
  }

  const hasOwnedTiles = state.currentTowns.length + state.currentMines.length > 0;
  if (!hasOwnedTiles) {
    if (
      tile.kind !== "copperMine" ||
      getTileLevel(tile) !== 1 ||
      !isEdgeTile(tile, mapConfig)
    ) {
      return "Begin with a Level 1 Copper Mine on the edge of the map.";
    }
  } else if (!isConnectedToOwnedTile(state, tile, mapConfig)) {
    return "Capture a tile touching a tile your team currently owns.";
  }

  return null;
}

export function getCityRaceTileStatus(
  state: CityRaceSimulation,
  tile: GameMapTileConfig,
  mapConfig: GameMapConfig
): CityRaceTileStatus {
  if (isOwned(state, tile.id)) return "owned";
  if (tile.kind === "tradeCenter") return "unavailable";
  if (tile.kind === "town") {
    const unlockDay = getTownUnlockDay(getTileLevel(tile));
    if (unlockDay === null || state.currentDay < unlockDay) return "locked";
  }
  return getCityRaceCaptureError(state, tile, mapConfig) ? "blocked" : "capturable";
}

export function captureCityRaceTile(
  state: CityRaceSimulation,
  tile: GameMapTileConfig,
  mapConfig: GameMapConfig
): CityRaceActionResult {
  const error = getCityRaceCaptureError(state, tile, mapConfig);
  if (error || (tile.kind !== "town" && tile.kind !== "copperMine")) {
    return { state, error: error ?? "This tile cannot be captured." };
  }

  const isFirstCapture = !state.totalCaptures.some(
    (capture) => capture.tileId === tile.id
  );
  const capture: CityRaceCapture = {
    kind: tile.kind,
    tileId: tile.id,
    level: getTileLevel(tile),
    captureTime: formatCityRaceTimestamp(state.currentDay, state.captureTime),
    releaseTime: null,
    firstCaptureBonus:
      tile.kind === "town" && isFirstCapture ? getFirstCaptureBonus(tile) : null,
  };

  return {
    error: null,
    state: {
      ...state,
      totalCaptures: [...state.totalCaptures, capture],
      currentTowns:
        tile.kind === "town" ? [...state.currentTowns, tile.id] : state.currentTowns,
      currentMines:
        tile.kind === "copperMine"
          ? [...state.currentMines, tile.id]
          : state.currentMines,
    },
  };
}

export function releaseCityRaceTile(
  state: CityRaceSimulation,
  tile: GameMapTileConfig
): CityRaceActionResult {
  if (!isOwned(state, tile.id)) {
    return { state, error: "Only a currently owned tile can be released." };
  }

  const timeError = validateActionTime(state);
  if (timeError) return { state, error: timeError };

  const releaseTime = formatCityRaceTimestamp(state.currentDay, state.captureTime);
  let released = false;
  const totalCaptures = state.totalCaptures.map((capture) => {
    if (!released && capture.tileId === tile.id && capture.releaseTime === null) {
      released = true;
      return { ...capture, releaseTime };
    }
    return capture;
  });

  if (!released) {
    return { state, error: "The open capture record for this tile could not be found." };
  }

  return {
    error: null,
    state: {
      ...state,
      totalCaptures,
      currentTowns: state.currentTowns.filter((tileId) => tileId !== tile.id),
      currentMines: state.currentMines.filter((tileId) => tileId !== tile.id),
    },
  };
}

export function calculateCityRaceScoreAtDayStart(
  state: CityRaceSimulation,
  day = state.currentDay
): CityRaceScore {
  const cutoffMinute = Math.max(0, day - 1) * 24 * 60;
  let production = 0;
  let firstCaptureBonuses = 0;

  for (const capture of state.totalCaptures) {
    if (capture.kind !== "town") continue;

    const captureMinute = timestampToMinutes(capture.captureTime);
    if (captureMinute >= cutoffMinute) continue;

    const releaseMinute = capture.releaseTime
      ? timestampToMinutes(capture.releaseTime)
      : cutoffMinute;
    const heldMinutes = Math.max(
      0,
      Math.min(releaseMinute, cutoffMinute) - captureMinute
    );
    const productionPerHour =
      CITY_RACE_PRODUCTION_PER_HOUR[
        capture.level as keyof typeof CITY_RACE_PRODUCTION_PER_HOUR
      ] ?? 0;

    production += Math.floor((productionPerHour * heldMinutes) / 60);
    firstCaptureBonuses += capture.firstCaptureBonus ?? 0;
  }

  return {
    production,
    firstCaptureBonuses,
    total: production + firstCaptureBonuses,
  };
}

export function setCityRaceCaptureTime(
  state: CityRaceSimulation,
  captureTime: string
): CityRaceSimulation {
  return SERVER_TIME_PATTERN.test(captureTime) ? { ...state, captureTime } : state;
}

export function advanceCityRaceDay(state: CityRaceSimulation): CityRaceSimulation {
  if (state.currentDay >= state.finalDay) return state;
  return {
    ...state,
    currentDay: state.currentDay + 1,
    captureTime: "00:00",
  };
}

export function hasCityRaceActionsOnDay(
  state: CityRaceSimulation,
  day = state.currentDay
): boolean {
  return state.totalCaptures.some(
    (capture) =>
      parseTimestamp(capture.captureTime)?.day === day ||
      parseTimestamp(capture.releaseTime)?.day === day
  );
}

export function resetCityRaceDay(
  state: CityRaceSimulation,
  day = state.currentDay
): CityRaceSimulation {
  const totalCaptures = state.totalCaptures
    .filter((capture) => parseTimestamp(capture.captureTime)?.day !== day)
    .map((capture) =>
      parseTimestamp(capture.releaseTime)?.day === day
        ? { ...capture, releaseTime: null }
        : capture
    );

  if (
    totalCaptures.length === state.totalCaptures.length &&
    totalCaptures.every(
      (capture, index) => capture === state.totalCaptures[index]
    ) &&
    state.captureTime === "00:00"
  ) {
    return state;
  }

  return {
    ...state,
    totalCaptures,
    currentTowns: totalCaptures
      .filter((capture) => capture.kind === "town" && capture.releaseTime === null)
      .map((capture) => capture.tileId),
    currentMines: totalCaptures
      .filter(
        (capture) =>
          capture.kind === "copperMine" && capture.releaseTime === null
      )
      .map((capture) => capture.tileId),
    captureTime: "00:00",
  };
}

export function setCityRaceFinalDay(
  state: CityRaceSimulation,
  finalDay: number
): CityRaceSimulation {
  const normalizedFinalDay = normalizeInteger(
    finalDay,
    state.finalDay,
    CITY_RACE_DEFAULT_FINAL_DAY
  );
  return {
    ...state,
    finalDay: Math.max(normalizedFinalDay, state.currentDay),
  };
}
