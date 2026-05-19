import type { CSSProperties } from "react";
import type { MapTile as MapTileType, GameMapTileConfig } from "./types";

export type { MapTileType as MapTile };

type MapTileStyle = CSSProperties & {
  "--base-color": string;
  "--rival-color": string;
  "--enemy-color": string;
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
  onSelect: (tileId: string) => void;
  onPaint: (tileId: string) => void;
  onClear: (tileId: string) => void;
};

function getCoordinate(tile: GameMapTileConfig): string {
  const rowLabel = String.fromCharCode(64 + tile.y);
  return `${rowLabel}${tile.x}`;
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
  onSelect,
  onPaint,
  onClear,
}: MapTileComponentProps) {
  const tileTitle =
    tileData.note ||
    (occupantLabel
      ? `${occupantLabel} ${getCoordinate(tileConfig)} ${tileConfig.kind} level ${tileConfig.level}`
      : `${getCoordinate(tileConfig)} ${tileConfig.kind} level ${tileConfig.level}`);
  const chipClassName = tileConfig.kind === "town" ? "map-chip town-chip" : "map-chip mine-chip";

  return (
    <button
      className={`map-tile ${tileData.marker} ${tileConfig.kind} ${
        isSelected ? "selected" : ""
      }`}
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
      aria-label={`Map tile ${getCoordinate(tileConfig)} ${tileConfig.kind} level ${tileConfig.level}`}
      title={tileTitle}
      style={{
        gridColumn: `${tileConfig.x} / span ${tileConfig.width}`,
        gridRow: `${tileConfig.y} / span ${tileConfig.height}`,
        "--base-color": baseColor,
        "--rival-color": rivalColor,
        "--enemy-color": enemyColor,
      } as MapTileStyle}
    >
      <span className={chipClassName}>
        <span className="tile-badge-level">{tileConfig.level}</span>
        {occupantCode ? <span className="tile-badge-code">{occupantCode}</span> : null}
      </span>
    </button>
  );
}
