import type { CSSProperties, RefObject } from "react";
import { MapTileComponent } from "./MapTile";
import type { GameMapConfig, TileMarker, MapTile } from "./types";

type MapBoardFrameStyle = CSSProperties & {
  "--map-columns": number;
  "--map-rows": number;
};

const initialRivalColors = [
  "#b08d57",
  "#7a8fb8",
  "#a16f96",
  "#729b79",
  "#9d8465",
];

const initialEnemyIds = ["enemy-1", "enemy-2", "enemy-3"];

type MapBoardProps = {
  config: GameMapConfig;
  tiles: Record<string, MapTile>;
  selectedTileId: string;
  baseColor: string;
  rivalTeams: Array<{ color: string }>;
  boardRef: RefObject<HTMLDivElement | null>;
  onTileSelect: (tileId: string) => void;
  onTilePaint: (tileId: string) => void;
};

export function MapBoard({
  config,
  tiles,
  selectedTileId,
  baseColor,
  rivalTeams,
  boardRef,
  onTileSelect,
  onTilePaint,
}: MapBoardProps) {
  const columnLabels = Array.from({ length: config.columns }, (_, index) => index + 1);
  const rowLabels = Array.from({ length: config.rows }, (_, index) =>
    String.fromCharCode(65 + index)
  );

  return (
    <div
      ref={boardRef}
      className="map-board-frame"
      style={{
        "--map-columns": config.columns,
        "--map-rows": config.rows,
      } as MapBoardFrameStyle}
    >
      <div className="map-corner" aria-hidden="true" />
      <div className="map-column-key" aria-hidden="true">
        {columnLabels.map((column) => (
          <span key={column}>{column}</span>
        ))}
      </div>
      <div className="map-row-key" aria-hidden="true">
        {rowLabels.map((row) => (
          <span key={row}>{row}</span>
        ))}
      </div>
      <div className="map-board" aria-label="Editable game map">
        {config.tiles.map((tileConfig) => {
          const tile =
            tiles[tileConfig.id] ?? { marker: "none" as TileMarker, rivalColor: initialRivalColors[0], enemyColor: initialEnemyIds[0], note: "" };
          const rivalColor = rivalTeams.find((team) => team.color === tile.rivalColor)?.color ?? tile.rivalColor;

          return (
            <MapTileComponent
              key={tileConfig.id}
              tileConfig={tileConfig}
              tileData={tile}
              isSelected={selectedTileId === tileConfig.id}
              baseColor={baseColor}
              rivalColor={rivalColor}
              enemyColor="#CF3F45"
              onSelect={onTileSelect}
              onPaint={onTilePaint}
            />
          );
        })}
      </div>
    </div>
  );
}
