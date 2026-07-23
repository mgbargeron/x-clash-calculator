import type { CSSProperties } from "react";
import type { MapTile as MapTileType, GameMapTileConfig } from "./types";

export type { MapTileType as MapTile };

export type MapTileSimulationState = {
  status: "owned" | "capturable" | "locked" | "blocked" | "unavailable";
  description: string;
};

type MapTileStyle = CSSProperties & {
  "--base-color": string;
  "--rival-color": string;
  "--enemy-color": string;
  "--tile-shape-columns"?: number;
  "--tile-shape-rows"?: number;
};

type MapTileComponentProps = {
  tileConfig: GameMapTileConfig;
  tileData: MapTileType;
  isSelected: boolean;
  baseColor: string;
  rivalColor: string;
  enemyColor: string;
  occupantCode?: string;
  occupantLabel?: string;
  simulationState?: MapTileSimulationState;
  onSelect: (tileId: string) => void;
  onPaint: (tileId: string) => void;
  onClear: (tileId: string) => void;
};

function getCoordinate(tile: GameMapTileConfig): string {
  const rowLabel = String.fromCharCode(64 + tile.y);
  return `${rowLabel}${tile.x}`;
}

function getTileSpan(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 1;
}

function getShapeCells(tile: GameMapTileConfig): Array<{ column: number; row: number }> {
  const width = getTileSpan(tile.width);
  const height = getTileSpan(tile.height);
  const shape = Array.isArray(tile.shape) && tile.shape.length > 0 ? tile.shape : null;

  if (!shape) return [];

  const cells: Array<{ column: number; row: number }> = [];

  for (let row = 0; row < height; row += 1) {
    const shapeRow = typeof shape[row] === "string" ? shape[row] : "";

    for (let column = 0; column < width; column += 1) {
      if ((shapeRow[column] ?? "X") !== ".") {
        cells.push({ column: column + 1, row: row + 1 });
      }
    }
  }

  return cells;
}

function getShapeOutlinePath(cells: Array<{ column: number; row: number }>): string {
  const occupiedCells = new Set(cells.map((cell) => `${cell.column},${cell.row}`));
  const segments: string[] = [];

  for (const cell of cells) {
    const column = cell.column - 1;
    const row = cell.row - 1;
    const hasTopNeighbor = occupiedCells.has(`${cell.column},${cell.row - 1}`);
    const hasRightNeighbor = occupiedCells.has(`${cell.column + 1},${cell.row}`);
    const hasBottomNeighbor = occupiedCells.has(`${cell.column},${cell.row + 1}`);
    const hasLeftNeighbor = occupiedCells.has(`${cell.column - 1},${cell.row}`);

    if (!hasTopNeighbor) segments.push(`M ${column} ${row} H ${column + 1}`);
    if (!hasRightNeighbor) segments.push(`M ${column + 1} ${row} V ${row + 1}`);
    if (!hasBottomNeighbor) segments.push(`M ${column + 1} ${row + 1} H ${column}`);
    if (!hasLeftNeighbor) segments.push(`M ${column} ${row + 1} V ${row}`);
  }

  return segments.join(" ");
}

function getTileLabel(tile: GameMapTileConfig): string {
  return tile.label ?? tile.kind;
}

function getTileDescription(tile: GameMapTileConfig): string {
  const levelText = typeof tile.level === "number" ? ` level ${tile.level}` : "";
  return `${getCoordinate(tile)} ${getTileLabel(tile)}${levelText}`;
}

export function MapTileComponent({
  tileConfig,
  tileData,
  isSelected,
  baseColor,
  rivalColor,
  enemyColor,
  occupantCode,
  occupantLabel,
  simulationState,
  onSelect,
  onPaint,
  onClear,
}: MapTileComponentProps) {
  const tileWidth = getTileSpan(tileConfig.width);
  const tileHeight = getTileSpan(tileConfig.height);
  const shapeCells = getShapeCells(tileConfig);
  const shapeOutlinePath = getShapeOutlinePath(shapeCells);
  const hasCustomShape = Array.isArray(tileConfig.shape) && tileConfig.shape.length > 0;
  const tileDescription = getTileDescription(tileConfig);
  const hasLevel = typeof tileConfig.level === "number";
  const tileTitle =
    simulationState?.description ||
    tileData.note ||
    (occupantLabel ? `${occupantLabel} ${tileDescription}` : tileDescription);
  const chipClassName =
    tileConfig.kind === "town"
      ? "map-chip town-chip"
      : tileConfig.kind === "tradeCenter"
        ? "map-chip trade-center-chip"
        : "map-chip mine-chip";
  const className = `map-tile ${tileData.marker} ${tileConfig.kind} ${
    isSelected ? "selected" : ""
  } ${simulationState ? `city-race-tile city-race-tile--${simulationState.status}` : ""}`;
  const style = {
    gridColumn: `${tileConfig.x} / span ${tileWidth}`,
    gridRow: `${tileConfig.y} / span ${tileHeight}`,
    "--base-color": baseColor,
    "--rival-color": rivalColor,
    "--enemy-color": enemyColor,
  } as MapTileStyle;

  if (hasCustomShape) {
    return (
      <div
        className={`${className} map-tile-shaped`}
        aria-label={`Map tile ${tileDescription}`}
        aria-disabled={
          simulationState?.status === "locked" ||
          simulationState?.status === "blocked" ||
          simulationState?.status === "unavailable"
        }
        title={tileTitle}
        style={{
          ...style,
          "--tile-shape-columns": tileWidth,
          "--tile-shape-rows": tileHeight,
        } as MapTileStyle}
      >
        {shapeCells.map((cell) => (
          <button
            key={`${cell.column}-${cell.row}`}
            className="map-tile-shape-cell"
            type="button"
            onClick={() => {
              onPaint(tileConfig.id);
            }}
            onContextMenu={(event) => {
              if (tileData.marker === "none") {
                return;
              }

              event.preventDefault();
              onClear(tileConfig.id);
            }}
            onFocus={() => onSelect(tileConfig.id)}
            aria-label={`Map tile ${tileDescription}`}
            aria-disabled={
              simulationState?.status === "locked" ||
              simulationState?.status === "blocked" ||
              simulationState?.status === "unavailable"
            }
            title={tileTitle}
            style={{
              gridColumn: cell.column,
              gridRow: cell.row,
            }}
          />
        ))}
        {shapeOutlinePath ? (
          <svg
            className="map-tile-shape-outline"
            viewBox={`0 0 ${tileWidth} ${tileHeight}`}
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
          >
            <path className="map-tile-shape-marker" d={shapeOutlinePath} />
            <path className="map-tile-shape-selected" d={shapeOutlinePath} />
          </svg>
        ) : null}
        <span className={chipClassName}>
          {hasLevel ? <span className="tile-badge-level">{tileConfig.level}</span> : null}
          {occupantCode ? <span className="tile-badge-code">{occupantCode}</span> : null}
        </span>
      </div>
    );
  }

  return (
    <button
      className={className}
      type="button"
      onClick={() => {
        onPaint(tileConfig.id);
      }}
      onContextMenu={(event) => {
        if (tileData.marker === "none") {
          return;
        }

        event.preventDefault();
        onClear(tileConfig.id);
      }}
      onFocus={() => onSelect(tileConfig.id)}
      aria-label={`Map tile ${tileDescription}`}
      aria-disabled={
        simulationState?.status === "locked" ||
        simulationState?.status === "blocked" ||
        simulationState?.status === "unavailable"
      }
      title={tileTitle}
      style={style}
    >
      <span className={chipClassName}>
        {hasLevel ? <span className="tile-badge-level">{tileConfig.level}</span> : null}
        {occupantCode ? <span className="tile-badge-code">{occupantCode}</span> : null}
      </span>
    </button>
  );
}
