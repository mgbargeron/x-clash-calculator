import { seasonOneTiles as s1Tiles } from "./gameMapSeason1";
import {
  seasonTwoColumns,
  seasonTwoRowsCount,
  seasonTwoTiles as s2Tiles,
} from "./gameMapSeason2";

export { seasonOneTiles } from "./gameMapSeason1";
export { seasonTwoTiles } from "./gameMapSeason2";

export type GameMapTileKind = "town" | "frostMine" | "copperMine" | "tradeCenter";

export type GameMapTileConfig = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  kind: GameMapTileKind;
  level?: number;
  label?: string;
  shape?: string[];
};

export type GameMapConfig = {
  columns: number;
  rows: number;
  tiles: GameMapTileConfig[];
  coordinateGroupSize?: number;
};

export type Season = number;

export type SeasonConfig = {
  seasonNumber: Season;
  mapConfig: GameMapConfig;
  label: string;
};

export const defaultGameMapConfig: GameMapConfig = {
  columns: 20,
  rows: 20,
  tiles: s1Tiles,
  coordinateGroupSize: 1,
};

export const seasonTwoMapConfig: GameMapConfig = {
  columns: seasonTwoColumns,
  rows: seasonTwoRowsCount,
  tiles: s2Tiles,
  coordinateGroupSize: 3,
};

export const allSeasonConfigs: SeasonConfig[] = [
  { seasonNumber: 1, mapConfig: defaultGameMapConfig, label: "Season 1" },
  { seasonNumber: 2, mapConfig: seasonTwoMapConfig, label: "Season 2" },
];

const DEFAULT_SEASON = allSeasonConfigs[0]?.seasonNumber ?? 1;

export function getDefaultSeason(): Season {
  return DEFAULT_SEASON;
}

export function getSeasonConfigEntry(season: Season): SeasonConfig {
  return (
    allSeasonConfigs.find((config) => config.seasonNumber === season) ??
    allSeasonConfigs[0] ?? {
      seasonNumber: DEFAULT_SEASON,
      mapConfig: defaultGameMapConfig,
      label: `Season ${DEFAULT_SEASON}`,
    }
  );
}

export function isConfiguredSeason(value: unknown): value is Season {
  if (typeof value !== "number" || !Number.isInteger(value)) return false;
  return allSeasonConfigs.some((config) => config.seasonNumber === value);
}

export function normalizeSeason(value: unknown): Season {
  const parsed = typeof value === "number" ? value : Number(value);
  return isConfiguredSeason(parsed) ? parsed : getDefaultSeason();
}

export function getNextSeason(season: Season): Season {
  const currentIndex = allSeasonConfigs.findIndex((config) => config.seasonNumber === season);
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % allSeasonConfigs.length : 0;
  return allSeasonConfigs[nextIndex]?.seasonNumber ?? getDefaultSeason();
}

export function getSeasonConfig(season: Season): GameMapConfig {
  return getSeasonConfigEntry(season).mapConfig;
}
