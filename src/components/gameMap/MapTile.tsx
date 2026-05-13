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
  onSelect: (tileId: string) => void;
  onPaint: (tileId: string) => void;
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
  onSelect,
  onPaint,
}: MapTileComponentProps) {
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
        if (isSelected !== true) {
          return;
        }

        event.preventDefault();
      }}
      onFocus={() => onSelect(tileConfig.id)}
      aria-label={`Map tile ${getCoordinate(tileConfig)} ${tileConfig.kind} level ${tileConfig.level}`}
      title={tileData.note || `${getCoordinate(tileConfig)} ${tileConfig.kind} level ${tileConfig.level}`}
      style={{
        gridColumn: `${tileConfig.x} / span ${tileConfig.width}`,
        gridRow: `${tileConfig.y} / span ${tileConfig.height}`,
        "--base-color": baseColor,
        "--rival-color": rivalColor,
        "--enemy-color": enemyColor,
      } as MapTileStyle}
    >
      {tileConfig.kind === "town" ? (
        <span className="town-level">
          <span>{tileConfig.level}</span>
        </span>
      ) : (
        <span className="frost-mine-level">
          <span>{tileConfig.level}</span>
        </span>
      )}
    </button>
  );
}
