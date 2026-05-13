import { GameMapTileKind } from "../../utils/gameMapConfig";

export type TileMarker = "none" | "base" | "enemy" | "rival";

export type MapTile = {
  marker: TileMarker;
  rivalColor: string;
  enemyColor?: string;
  note: string;
};

export type OurTeamConfig = {
  color: string;
  name: string;
  code: string;
};

export type RivalTeam = {
  color: string;
  name: string;
  code: string;
};

export type EnemyTeam = {
  id: string;
  name: string;
  code: string;
};

export type MarkerPointSummary = {
  count: number;
  townPoints: number;
  frostMinePoints: number;
};

export type GameMapTileConfig = {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  kind: GameMapTileKind;
  level: number;
};

export type GameMapConfig = {
  columns: number;
  rows: number;
  tiles: GameMapTileConfig[];
};
