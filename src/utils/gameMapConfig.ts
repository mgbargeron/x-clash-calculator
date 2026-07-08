import { seasonOneTiles as s1Tiles } from "./gameMapSeason1";
import { seasonTwoTiles as s2Tiles } from "./gameMapSeason2";

export { seasonOneTiles } from "./gameMapSeason1";
export { seasonTwoTiles } from "./gameMapSeason2";

export type GameMapTileKind = "town" | "frostMine";

export type GameMapTileConfig = {
  id: string;
  x: number;
  y: number;
  width: 1 | 2;
  height: 1 | 2;
  kind: GameMapTileKind;
  level: number;
  label?: string;
};

export type GameMapConfig = {
  columns: number;
  rows: number;
  tiles: GameMapTileConfig[];
};

export type Season = 1 | 2;

export type SeasonConfig = {
  seasonNumber: Season;
  mapConfig: GameMapConfig;
  label: string;
};

export const defaultGameMapConfig: GameMapConfig = {
  columns: 20,
  rows: 20,
  tiles: s1Tiles,
};

export const seasonTwoMapConfig: GameMapConfig = {
  columns: 20,
  rows: 20,
  tiles: s2Tiles,
};

export const allSeasonConfigs: SeasonConfig[] = [
  { seasonNumber: 1, mapConfig: defaultGameMapConfig, label: "Season 1" },
  { seasonNumber: 2, mapConfig: seasonTwoMapConfig, label: "Season 2" },
];

export function getSeasonConfig(season: Season): GameMapConfig {
  return season === 2 ? seasonTwoMapConfig : defaultGameMapConfig;
}
