import { GameMapTileKind } from "../../utils/gameMapConfig";

export type TileMarker = "none" | "base" | "enemy" | "rival";

export type MapTile = {
  marker: TileMarker;
  rivalTeamId?: string;
  enemyTeamId?: string;
  note: string;
};

export type MapTilesById = Record<string, MapTile>;

export type OurTeamConfig = {
  color: string;
  name: string;
  code: string;
};

export type RivalTeam = {
  id: string;
  color: string;
  name: string;
  code: string;
};

export type EnemyTeam = {
  id: string;
  name: string;
  code: string;
};

export type ServerId = string;

export type GameMapSnapshot = {
  tiles: MapTilesById;
  rivalTeams: RivalTeam[];
  ourTeam: OurTeamConfig;
  enemyTeams: EnemyTeam[];
  selectedTileId: string;
  selectedRivalTeamId: string;
  selectedEnemyTeamId: string;
};

export type MultiServerMapStore = {
  activeServerId: ServerId;
  serverOrder: ServerId[];
  serversById: Record<ServerId, GameMapSnapshot>;
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
  shape?: string[];
};

export type GameMapConfig = {
  columns: number;
  rows: number;
  tiles: GameMapTileConfig[];
};
