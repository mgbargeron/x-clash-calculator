import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  defaultGameMapConfig,
} from "./utils/gameMapConfig";
import type { GameMapConfig, GameMapTileConfig } from "./utils/gameMapConfig";

type TileType = "empty" | "base" | "rally" | "farm" | "threat";

type MapTile = {
  type: TileType;
  note: string;
};

const MAP_STORAGE_KEY = "game-map-v1";

const tileTypes: Array<{ type: TileType; label: string }> = [
  { type: "empty", label: "Clear" },
  { type: "base", label: "Base" },
  { type: "rally", label: "Rally" },
  { type: "farm", label: "Farm" },
  { type: "threat", label: "Threat" },
];

type MapTilesById = Record<string, MapTile>;

type MapBoardProps = {
  config: GameMapConfig;
  tiles: MapTilesById;
  selectedTileId: string;
  selectedType: TileType;
  onSelectTile: (tileId: string) => void;
  onPaintTile: (tileId: string, type: TileType) => void;
};

const createEmptyMap = (config: GameMapConfig): MapTilesById =>
  config.tiles.reduce<MapTilesById>(
    (tiles, tile) => ({
      ...tiles,
      [tile.id]: { type: "empty", note: "" },
    }),
    {}
  );

function loadMap(config: GameMapConfig): MapTilesById {
  try {
    const raw = window.localStorage.getItem(MAP_STORAGE_KEY);
    if (!raw) return createEmptyMap(config);

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return createEmptyMap(config);
    }

    return config.tiles.reduce<MapTilesById>((tiles, tileConfig) => {
      const savedTile = parsed[tileConfig.id];
      const type = tileTypes.some((option) => option.type === savedTile?.type)
        ? savedTile.type
        : "empty";
      return {
        ...tiles,
        [tileConfig.id]: {
          type,
          note: typeof savedTile?.note === "string" ? savedTile.note : "",
        },
      };
    }, {});
  } catch {
    return createEmptyMap(config);
  }
}

const getCoordinate = (tile: GameMapTileConfig) => {
  const rowLabel = String.fromCharCode(64 + tile.y);
  return `${rowLabel}${tile.x}`;
};

function MapBoard({
  config,
  tiles,
  selectedTileId,
  selectedType,
  onSelectTile,
  onPaintTile,
}: MapBoardProps) {
  const columnLabels = Array.from({ length: config.columns }, (_, index) => index + 1);
  const rowLabels = Array.from({ length: config.rows }, (_, index) =>
    String.fromCharCode(65 + index)
  );

  return (
    <div
      className="map-board-frame"
      style={
        {
          "--map-columns": config.columns,
          "--map-rows": config.rows,
        } as CSSProperties
      }
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
          const tile = tiles[tileConfig.id] ?? { type: "empty", note: "" };

          return (
            <button
              className={`map-tile ${tile.type} ${tileConfig.kind} ${
                selectedTileId === tileConfig.id ? "selected" : ""
              }`}
              type="button"
              key={tileConfig.id}
              onClick={() => onPaintTile(tileConfig.id, selectedType)}
              onFocus={() => onSelectTile(tileConfig.id)}
              aria-label={`Map tile ${getCoordinate(tileConfig)} ${tileConfig.kind} level ${tileConfig.level}`}
              title={tile.note || `${getCoordinate(tileConfig)} ${tileConfig.kind} level ${tileConfig.level}`}
              style={{
                gridColumn: `${tileConfig.x} / span ${tileConfig.width}`,
                gridRow: `${tileConfig.y} / span ${tileConfig.height}`,
              }}
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
        })}
      </div>
    </div>
  );
}

export default function GameMapPage() {
  const mapConfig = defaultGameMapConfig;
  const firstTileId = mapConfig.tiles[0]?.id ?? "";
  const [tiles, setTiles] = useState<MapTilesById>(() => loadMap(mapConfig));
  const [selectedType, setSelectedType] = useState<TileType>("base");
  const [selectedTileId, setSelectedTileId] = useState(firstTileId);

  useEffect(() => {
    window.localStorage.setItem(MAP_STORAGE_KEY, JSON.stringify(tiles));
  }, [tiles]);

  const selectedTileConfig =
    mapConfig.tiles.find((tile) => tile.id === selectedTileId) ?? mapConfig.tiles[0];
  const selectedTileLabel = selectedTileConfig ? getCoordinate(selectedTileConfig) : "";
  const selectedTile = tiles[selectedTileId] ?? { type: "empty", note: "" };

  const counts = useMemo(
    () =>
      tileTypes.reduce<Record<TileType, number>>(
        (summary, tileType) => ({
          ...summary,
          [tileType.type]: Object.values(tiles).filter(
            (tile) => tile.type === tileType.type
          ).length,
        }),
        { empty: 0, base: 0, rally: 0, farm: 0, threat: 0 }
      ),
    [tiles]
  );

  function updateTile(tileId: string, type: TileType) {
    setSelectedTileId(tileId);
    setTiles((currentTiles) =>
      currentTiles[tileId]
        ? {
            ...currentTiles,
            [tileId]: { ...currentTiles[tileId], type },
          }
        : currentTiles
    );
  }

  function updateSelectedNote(note: string) {
    setTiles((currentTiles) =>
      currentTiles[selectedTileId]
        ? {
            ...currentTiles,
            [selectedTileId]: { ...currentTiles[selectedTileId], note },
          }
        : currentTiles
    );
  }

  function resetMap() {
    setTiles(createEmptyMap(mapConfig));
    setSelectedTileId(firstTileId);
  }

  return (
    <section className="card map-page">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Planning board</p>
          <h1>Game Map</h1>
        </div>
        <button className="secondary-button" type="button" onClick={resetMap}>
          Reset
        </button>
      </div>

      <div className="map-toolbar" aria-label="Map tile tools">
        <div className="tile-tools">
          {tileTypes.map((tileType) => (
            <button
              className={`tool-button ${tileType.type} ${
                selectedType === tileType.type ? "active" : ""
              }`}
              type="button"
              key={tileType.type}
              onClick={() => setSelectedType(tileType.type)}
            >
              {tileType.label}
            </button>
          ))}
        </div>
      </div>

      <div className="map-layout">
        <MapBoard
          config={mapConfig}
          tiles={tiles}
          selectedTileId={selectedTileId}
          selectedType={selectedType}
          onSelectTile={setSelectedTileId}
          onPaintTile={updateTile}
        />
      </div>

      <div className="map-details">
        <div className="map-summary">
          {tileTypes
            .filter((tileType) => tileType.type !== "empty")
            .map((tileType) => (
              <div className="summary-row" key={tileType.type}>
                <span>{tileType.label}</span>
                <strong>{counts[tileType.type]}</strong>
              </div>
            ))}
        </div>

        <label className="note-field">
          <span>Tile {selectedTileLabel}</span>
          <textarea
            value={selectedTile.note}
            onChange={(event) => updateSelectedNote(event.target.value)}
            placeholder="Add target, timer, or player note"
          />
        </label>
      </div>
    </section>
  );
}
