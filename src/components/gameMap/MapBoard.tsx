import type { CSSProperties, RefObject } from "react";
import { MapTileComponent } from "./MapTile";
import type { GameMapConfig, TileMarker, MapTile } from "./types";

type MapBoardFrameStyle = CSSProperties & {
  "--map-columns": number;
  "--map-rows": number;
  "--map-zoom": number;
};

type MapBoardProps = {
  config: GameMapConfig;
  tiles: Record<string, MapTile>;
  selectedTileId: string;
  ourTeam: { color: string; code: string; name: string };
  rivalTeams: Array<{ id: string; color: string; code: string; name: string }>;
  enemyTeams: Array<{ id: string; code: string; name: string }>;
  zoom: number;
  boardRef: RefObject<HTMLDivElement | null>;
  onTileSelect: (tileId: string) => void;
  onTilePaint: (tileId: string) => void;
  onTileClear: (tileId: string) => void;
};

function formatTeamDisplayLabel(code: string, name: string): string {
  const normalizedCode = code.substring(0, 3).toUpperCase() || "XXX";
  const normalizedName = name.trim() || "Unnamed";
  return `[${normalizedCode}]${normalizedName}`;
}

export function MapBoard({
  config,
  tiles,
  selectedTileId,
  ourTeam,
  rivalTeams,
  enemyTeams,
  zoom,
  boardRef,
  onTileSelect,
  onTilePaint,
  onTileClear,
}: MapBoardProps) {
  const columnLabels = Array.from({ length: config.columns }, (_, index) => index + 1);
  const rowLabels = Array.from({ length: config.rows }, (_, index) =>
    String.fromCharCode(65 + index)
  );

  return (
    <div ref={boardRef} className="map-board-shell">
      <div className="map-board-scroller">
        <div
          className="map-board-frame"
          style={{
            "--map-columns": config.columns,
            "--map-rows": config.rows,
            "--map-zoom": zoom,
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
                tiles[tileConfig.id] ?? { marker: "none" as TileMarker, note: "" };
              const rivalTeam = rivalTeams.find((team) => team.id === tile.rivalTeamId);
              const enemyTeam = enemyTeams.find((team) => team.id === tile.enemyTeamId);
              const rivalColor = rivalTeam?.color ?? "#b08d57";
              const occupantCode =
                tile.marker === "base"
                  ? ourTeam.code
                  : tile.marker === "rival"
                    ? rivalTeam?.code
                    : tile.marker === "enemy"
                      ? enemyTeam?.code
                      : undefined;
              const occupantLabel =
                tile.marker === "base"
                  ? formatTeamDisplayLabel(ourTeam.code, ourTeam.name)
                  : tile.marker === "rival" && rivalTeam
                    ? formatTeamDisplayLabel(rivalTeam.code, rivalTeam.name)
                    : tile.marker === "enemy" && enemyTeam
                      ? formatTeamDisplayLabel(enemyTeam.code, enemyTeam.name)
                      : undefined;

              return (
                <MapTileComponent
                  key={tileConfig.id}
                  tileConfig={tileConfig}
                  tileData={tile}
                  isSelected={selectedTileId === tileConfig.id}
                  baseColor={ourTeam.color}
                  rivalColor={rivalColor}
                  enemyColor="#CF3F45"
                  occupantCode={occupantCode}
                  occupantLabel={occupantLabel}
                  onSelect={onTileSelect}
                  onPaint={onTilePaint}
                  onClear={onTileClear}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
