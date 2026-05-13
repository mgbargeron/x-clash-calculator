import type { CSSProperties } from "react";
import type { TileMarker, MapTile as MapTileType, GameMapTileConfig } from "./types";

export type { MapTileType as MapTile };

type MapTileComponentProps = {
  tileConfig: GameMapTileConfig;
  tileData: MapTileType;
  isSelected: boolean;
  onSelect: (tileId: string) => void;

  selectedMarker?: TileMarker;
  selectedRivalColor?: string;
  selectedEnemyTeamId?: string;
};

function getCoordinate(tile: GameMapTileConfig): string {
  const rowLabel = String.fromCharCode(64 + tile.y);
  return `${rowLabel}${tile.x}`;
}

export function MapTileComponent({
  tileConfig,
  tileData,
  isSelected,
  onSelect,
}: MapTileComponentProps) {
  return (
    <button
      className={`map-tile ${tileData.marker} ${tileConfig.kind} ${
        isSelected ? "selected" : ""
      }`}
      type="button"
      key={tileConfig.id}
      onClick={() => {
        onSelect(tileConfig.id);
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
      } as CSSProperties}
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
