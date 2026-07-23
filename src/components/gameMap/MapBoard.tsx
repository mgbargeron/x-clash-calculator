import type { CSSProperties, RefObject } from "react";
import { MapTileComponent, type MapTileSimulationState } from "./MapTile";
import type { GameMapConfig, TileMarker, MapTile } from "./types";

type MapBoardFrameStyle = CSSProperties & {
  "--map-columns": number;
  "--map-rows": number;
  "--map-zoom": number;
};

type AxisLabel = {
  label: string | number;
  start: number;
  span: number;
};

type MapBoardProps = {
  config: GameMapConfig;
  tiles: Record<string, MapTile>;
  selectedTileId: string;
  ourTeam: { color: string; code: string; name: string };
  rivalTeams: Array<{ id: string; color: string; code: string; name: string }>;
  enemyTeams: Array<{ id: string; code: string; name: string }>;
  simulationStates?: Record<string, MapTileSimulationState>;
  zoom: number;
  boardRef: RefObject<HTMLDivElement | null>;
  onTileSelect: (tileId: string) => void;
  onTilePaint: (tileId: string) => void;
  onTileClear: (tileId: string) => void;
};

function formatTeamDisplayLabel(code: unknown, name: unknown): string {
  const normalizedCode = String(code ?? "").slice(0, 3).toUpperCase() || "XXX";
  const normalizedName = String(name ?? "").trim() || "Unnamed";
  return `[${normalizedCode}]${normalizedName}`;
}

function getCoordinateGroupSize(config: GameMapConfig): number {
  const configuredSize = config.coordinateGroupSize;

  return typeof configuredSize === "number" && Number.isInteger(configuredSize) && configuredSize > 0
    ? configuredSize
    : 1;
}

function createColumnLabels(config: GameMapConfig): AxisLabel[] {
  const groupSize = getCoordinateGroupSize(config);
  const labelCount = Math.ceil(config.columns / groupSize);

  return Array.from({ length: labelCount }, (_, index) => {
    const start = index * groupSize + 1;
    const span = Math.min(groupSize, config.columns - start + 1);

    return {
      label: index + 1,
      start,
      span,
    };
  });
}

function createRowLabels(config: GameMapConfig): AxisLabel[] {
  const groupSize = getCoordinateGroupSize(config);
  const labelCount = Math.ceil(config.rows / groupSize);

  return Array.from({ length: labelCount }, (_, index) => {
    const start = index * groupSize + 1;
    const span = Math.min(groupSize, config.rows - start + 1);

    return {
      label: String.fromCharCode(65 + index),
      start,
      span,
    };
  });
}

export function MapBoard({
  config,
  tiles,
  selectedTileId,
  ourTeam,
  rivalTeams,
  enemyTeams,
  simulationStates,
  zoom,
  boardRef,
  onTileSelect,
  onTilePaint,
  onTileClear,
}: MapBoardProps) {
  const columnLabels = createColumnLabels(config);
  const rowLabels = createRowLabels(config);

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
              <span
                key={column.label}
                style={{
                  gridColumn: `${column.start} / span ${column.span}`,
                }}
              >
                {column.label}
              </span>
            ))}
          </div>
          <div className="map-row-key" aria-hidden="true">
            {rowLabels.map((row) => (
              <span
                key={row.label}
                style={{
                  gridRow: `${row.start} / span ${row.span}`,
                }}
              >
                {row.label}
              </span>
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
                  simulationState={simulationStates?.[tileConfig.id]}
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
