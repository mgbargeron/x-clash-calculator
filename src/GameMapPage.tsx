import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  defaultGameMapConfig,
} from "./utils/gameMapConfig";
import type { GameMapConfig, GameMapTileConfig } from "./utils/gameMapConfig";

type TileMarker = "none" | "base" | "enemy" | "rival";

type MapTile = {
  marker: TileMarker;
  rivalColor: string;
  note: string;
};

type StoredMapData = {
  tiles?: unknown;
  rivalNames?: unknown;
  rivalColors?: string[];
};

const MAP_STORAGE_KEY = "game-map-v1";

const markerTools: Array<{ marker: Exclude<TileMarker, "rival">; label: string; icon: string }> = [
  { marker: "none", label: "Clear marker", icon: "C" },
  { marker: "base", label: "Our base", icon: "B" },
  { marker: "enemy", label: "Enemy", icon: "E" },
];

// Initialize with default colors but allow for dynamic addition
const initialRivalColors = [
  "#b08d57",
  "#7a8fb8",
  "#a16f96",
  "#729b79",
  "#9d8465",
];

const defaultRivalNames = initialRivalColors.reduce<Record<string, string>>(
  (names, color, index) => ({
    ...names,
    [color]: `Rival ${index + 1}`,
  }),
  {}
);

type MapTilesById = Record<string, MapTile>;

type MarkerPointSummary = {
  count: number;
  townPoints: number;
  frostMinePoints: number;
};

type MapBoardProps = {
  config: GameMapConfig;
  tiles: MapTilesById;
  selectedTileId: string;
  selectedMarker: TileMarker;
  selectedRivalColor: string;
  onSelectTile: (tileId: string) => void;
  onPaintTile: (tileId: string, marker: TileMarker, rivalColor: string) => void;
};

const createEmptyMap = (config: GameMapConfig): MapTilesById =>
  config.tiles.reduce<MapTilesById>(
    (tiles, tile) => ({
      ...tiles,
      [tile.id]: { marker: "none", rivalColor: initialRivalColors[0], note: "" },
    }),
    {}
  );

function normalizeMap(config: GameMapConfig, parsed: unknown): MapTilesById {
  const tileData =
    parsed &&
    typeof parsed === "object" &&
    !Array.isArray(parsed) &&
    "tiles" in parsed
      ? (parsed as StoredMapData).tiles
      : parsed;

  if (!tileData || typeof tileData !== "object" || Array.isArray(tileData)) {
    return createEmptyMap(config);
  }

  return config.tiles.reduce<MapTilesById>((tiles, tileConfig) => {
    const savedTile = (tileData as Record<string, Partial<MapTile>>)[tileConfig.id];
    const marker: TileMarker =
      savedTile?.marker === "base" ||
      savedTile?.marker === "enemy" ||
      savedTile?.marker === "rival"
        ? savedTile.marker
        : "none";
    const rivalColor =
      typeof savedTile?.rivalColor === "string" && savedTile.rivalColor
        ? savedTile.rivalColor
        : initialRivalColors[0];

    return {
      ...tiles,
      [tileConfig.id]: {
        marker,
        rivalColor,
        note: typeof savedTile?.note === "string" ? savedTile.note : "",
      },
    };
  }, {});
}

function normalizeRivalNames(parsed: unknown): Record<string, string> {
  const maybeNames =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as StoredMapData).rivalNames
      : null;

  if (!maybeNames || typeof maybeNames !== "object" || Array.isArray(maybeNames)) {
    return defaultRivalNames;
  }

  return initialRivalColors.reduce<Record<string, string>>(
    (names, color, index) => ({
      ...names,
      [color]:
        typeof (maybeNames as Record<string, unknown>)[color] === "string"
          ? ((maybeNames as Record<string, string>)[color] || `Rival ${index + 1}`)
          : `Rival ${index + 1}`,
    }),
    {}
  );
}

function normalizeRivalColors(parsed: unknown): string[] {
  const maybeColors =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as StoredMapData).rivalColors
      : null;

  if (!maybeColors || !Array.isArray(maybeColors) || !maybeColors.every(c => typeof c === "string")) {
    return initialRivalColors;
  }

  return maybeColors;
}

async function loadStoredMap(
  config: GameMapConfig
): Promise<{ tiles: MapTilesById; rivalNames: Record<string, string>; rivalColors: string[] }> {
  let parsed: unknown = null;

  if (window.electronAPI?.getMapData) {
    parsed = await window.electronAPI.getMapData();
    return {
      tiles: normalizeMap(config, parsed),
      rivalNames: normalizeRivalNames(parsed),
      rivalColors: normalizeRivalColors(parsed),
    };
  }

  try {
    const raw = window.localStorage.getItem(MAP_STORAGE_KEY);
    if (!raw) {
      return {
        tiles: createEmptyMap(config),
        rivalNames: defaultRivalNames,
        rivalColors: initialRivalColors
      };
    }

    parsed = JSON.parse(raw);
    return {
      tiles: normalizeMap(config, parsed),
      rivalNames: normalizeRivalNames(parsed),
      rivalColors: normalizeRivalColors(parsed),
    };
  } catch {
    return {
      tiles: createEmptyMap(config),
      rivalNames: defaultRivalNames,
      rivalColors: initialRivalColors
    };
  }
}

function saveStoredMap(tiles: MapTilesById, rivalNames: Record<string, string>, rivalColors: string[]) {
  const data = { tiles, rivalNames, rivalColors };

  if (window.electronAPI?.setMapData) {
    void window.electronAPI.setMapData(data);
    return;
  }

  window.localStorage.setItem(MAP_STORAGE_KEY, JSON.stringify(data));
}

const createPointSummary = (): MarkerPointSummary => ({
  count: 0,
  townPoints: 0,
  frostMinePoints: 0,
});

const getCoordinate = (tile: GameMapTileConfig) => {
  const rowLabel = String.fromCharCode(64 + tile.y);
  return `${rowLabel}${tile.x}`;
};

function MapBoard({
  config,
  tiles,
  selectedTileId,
  selectedMarker,
  selectedRivalColor,
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
      <div 
        className="map-board" 
        aria-label="Editable game map"
        onBlur={(e) => {
          // Clear the selected tile when focus is lost from the map board
          if (e.currentTarget.contains(e.relatedTarget)) {
            // If focus moves to a child element, don't clear selection
            return;
          }
          // Clear the selection if focus is lost to a different element
          onSelectTile("");
        }}
        tabIndex={-1}
      >
        {config.tiles.map((tileConfig) => {
          const tile =
            tiles[tileConfig.id] ?? { marker: "none", rivalColor: initialRivalColors[0], note: "" };

          return (
            <button
              className={`map-tile ${tile.marker} ${tileConfig.kind} ${
                selectedTileId === tileConfig.id ? "selected" : ""
              }`}
              type="button"
              key={tileConfig.id}
              onClick={() => onPaintTile(tileConfig.id, selectedMarker, selectedRivalColor)}
              onFocus={() => onSelectTile(tileConfig.id)}
              aria-label={`Map tile ${getCoordinate(tileConfig)} ${tileConfig.kind} level ${tileConfig.level}`}
              title={tile.note || `${getCoordinate(tileConfig)} ${tileConfig.kind} level ${tileConfig.level}`}
              style={{
                gridColumn: `${tileConfig.x} / span ${tileConfig.width}`,
                gridRow: `${tileConfig.y} / span ${tileConfig.height}`,
                "--rival-color": tile.rivalColor,
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
        })}
      </div>
    </div>
  );
}

export default function GameMapPage() {
  const mapConfig = defaultGameMapConfig;
  const firstTileId = mapConfig.tiles[0]?.id ?? "";
  const hasLoadedStoredMap = useRef(false);
  const [tiles, setTiles] = useState<MapTilesById>(() => createEmptyMap(mapConfig));
  const [selectedMarker, setSelectedMarker] = useState<TileMarker>("base");
  const [selectedRivalColor, setSelectedRivalColor] = useState(initialRivalColors[0]);
  const [selectedTileId, setSelectedTileId] = useState(firstTileId);
  const [rivalNames, setRivalNames] = useState<Record<string, string>>(defaultRivalNames);
  const [rivalColors, setRivalColors] = useState<string[]>(initialRivalColors);

  useEffect(() => {
    let isMounted = true;

    void loadStoredMap(mapConfig).then((storedMap) => {
      if (!isMounted) return;
      setTiles(storedMap.tiles);
      setRivalNames(storedMap.rivalNames);
      setRivalColors(storedMap.rivalColors);
      hasLoadedStoredMap.current = true;
    });

    return () => {
      isMounted = false;
    };
  }, [mapConfig]);

  useEffect(() => {
    if (!hasLoadedStoredMap.current) return;
    saveStoredMap(tiles, rivalNames, rivalColors);
  }, [tiles, rivalNames, rivalColors]);

  const selectedTileConfig =
    mapConfig.tiles.find((tile) => tile.id === selectedTileId) ?? mapConfig.tiles[0];
  const selectedTileLabel = selectedTileConfig ? getCoordinate(selectedTileConfig) : "";
  const selectedTile =
    tiles[selectedTileId] ?? { marker: "none", rivalColor: initialRivalColors[0], note: "" };

  const counts = useMemo(
    () =>
      (["none", "base", "enemy", "rival"] as TileMarker[]).reduce<Record<string, number>>(
        (summary, marker) => ({
          ...summary,
          [marker]: Object.values(tiles).filter((tile) => tile.marker === marker).length,
        }),
        { none: 0, base: 0, enemy: 0, rival: 0 }
      ),
    [tiles]
  );

  const pointSummary = useMemo(
    () =>
      mapConfig.tiles.reduce<Record<TileMarker, MarkerPointSummary>>(
        (summary, tileConfig) => {
          const marker = tiles[tileConfig.id]?.marker ?? "none";
          const nextSummary = summary[marker];

          nextSummary.count += 1;
          if (tileConfig.kind === "town") {
            nextSummary.townPoints += tileConfig.level;
          } else {
            nextSummary.frostMinePoints += tileConfig.level;
          }

          return summary;
        },
        {
          none: createPointSummary(),
          base: createPointSummary(),
          enemy: createPointSummary(),
          rival: createPointSummary(),
        }
      ),
    [mapConfig.tiles, tiles]
  );

  const rivalCounts = useMemo(
    () =>
      rivalColors.reduce<Record<string, number>>(
        (summary, color) => ({
          ...summary,
          [color]: Object.values(tiles).filter(
            (tile) => tile.marker === "rival" && tile.rivalColor === color
          ).length,
        }),
        {}
      ),
    [tiles, rivalColors]
  );

  const rivalPointSummary = useMemo(
    () => {
      const summaryByColor = rivalColors.reduce<Record<string, MarkerPointSummary>>(
        (summary, color) => {
          summary[color] = createPointSummary();
          return summary;
        },
        {}
      );

      for (const tileConfig of mapConfig.tiles) {
        const tile = tiles[tileConfig.id];
        if (tile?.marker !== "rival") continue;

        const summary = summaryByColor[tile.rivalColor];
        if (!summary) continue;

        summary.count += 1;
        if (tileConfig.kind === "town") {
          summary.townPoints += tileConfig.level;
        } else {
          summary.frostMinePoints += tileConfig.level;
        }
      }

      return summaryByColor;
    },
    [mapConfig.tiles, tiles, rivalColors]
  );

  function updateRivalName(color: string, name: string) {
    setRivalNames((currentNames) => ({
      ...currentNames,
      [color]: name,
    }));
  }

  function renderPointSummary(summary: MarkerPointSummary) {
    return (
      <div className="points-cells">
        <span>{summary.count}</span>
        <small>T {summary.townPoints}</small>
        <small>F {summary.frostMinePoints}</small>
      </div>
    );
  }

  function updateTile(tileId: string, marker: TileMarker, rivalColor: string) {
    setSelectedTileId(tileId);
    setTiles((currentTiles) =>
      currentTiles[tileId]
        ? {
          ...currentTiles,
          [tileId]: {
            ...currentTiles[tileId],
            marker,
            rivalColor: marker === "rival" ? rivalColor : currentTiles[tileId].rivalColor,
          },
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

  // Function to add a new rival color
  function addRival() {
    const newColor = `#${Math.floor(Math.random()*16777215).toString(16)}`;
    
    // Ensure the color is in proper 6-digit hex format
    const normalizedColor = newColor.startsWith('#') ? newColor : `#${newColor.replace(/^#/, '')}`;
    
    // Add new color to the list
    setRivalColors(prev => [...prev, normalizedColor]);

    // Create a default name for the new rival
    const newRivalNames = { ...rivalNames };
    const newIndex = rivalColors.length;
    newRivalNames[normalizedColor] = `Rival ${newIndex + 1}`;

    setRivalNames(newRivalNames);
  }

  // Function to update a rival color
  function updateRivalColor(oldColor: string, newColor: string) {
    // Convert to hex if needed (handle both #RGB and RGB formats)
    let normalizedColor = newColor.startsWith('#') ? newColor : `#${newColor.replace(/^#/, '')}`;
    
    // Ensure it's a valid 6-digit hex color
    if (!/^[#]?[0-9A-Fa-f]{6}$/.test(normalizedColor.replace('#', ''))) {
      return; // Invalid color format
    }
    
    // Normalize to uppercase hex format for consistency
    normalizedColor = normalizedColor.toUpperCase();
    
    // Update the color in the list
    const newRivalColors = rivalColors.map(color => color === oldColor ? normalizedColor : color);
    setRivalColors(newRivalColors);

    // Update tiles with the old color to use the new color
    setTiles(prev => {
      const newTiles = { ...prev };
      Object.keys(newTiles).forEach(tileId => {
        if (newTiles[tileId].rivalColor === oldColor) {
          newTiles[tileId] = {
            ...newTiles[tileId],
            rivalColor: normalizedColor
          };
        }
      });
      return newTiles;
    });

    // If the old color was selected, switch to new color
    if (selectedRivalColor === oldColor) {
      setSelectedRivalColor(normalizedColor);
    }
  }

  // Function to remove a rival color
  function removeRival(color: string) {
    if (rivalColors.length <= 1) return; // Prevent removing the last rival

    // Remove color from the list
    const newRivalColors = rivalColors.filter(c => c !== color);
    setRivalColors(newRivalColors);

    // Remove associated names
    const newRivalNames = { ...rivalNames };
    delete newRivalNames[color];
    setRivalNames(newRivalNames);

    // Reassign tiles with this color to the first color
    setTiles(prev => {
      const newTiles = { ...prev };
      Object.keys(newTiles).forEach(tileId => {
        if (newTiles[tileId].rivalColor === color) {
          newTiles[tileId] = {
            ...newTiles[tileId],
            rivalColor: newRivalColors[0]
          };
        }
      });
      return newTiles;
    });

    // If the removed color was selected, switch to first color
    if (selectedRivalColor === color) {
      setSelectedRivalColor(newRivalColors[0]);
    }
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
          {markerTools.map((tool) => (
            <button
              className={`icon-tool-button ${tool.marker} ${
                selectedMarker === tool.marker ? "active" : ""
              }`}
              type="button"
              key={tool.marker}
              title={tool.label}
              aria-label={tool.label}
              onClick={() => setSelectedMarker(tool.marker)}
            >
              <span>{tool.icon}</span>
              <span className="tool-count">{counts[tool.marker]}</span>
            </button>
          ))}
          {rivalColors.map((color, index) => (
            <div key={color} className="rival-tool-container">
              <button
                className={`icon-tool-button rival ${
                  selectedMarker === "rival" && selectedRivalColor === color ? "active" : ""
                }`}
                type="button"
                title={`Rival ${index + 1}`}
                aria-label={`Rival ${index + 1}`}
                onClick={() => {
                  setSelectedMarker("rival");
                  setSelectedRivalColor(color);
                }}
                style={{ "--rival-color": color } as CSSProperties}
              >
                <span>R</span>
                <span className="tool-count">{rivalCounts[color] ?? 0}</span>
              </button>
              <button
                className="remove-rival-button"
                type="button"
                title={`Remove Rival ${index + 1}`}
                aria-label={`Remove Rival ${index + 1}`}
                onClick={() => removeRival(color)}
                disabled={rivalColors.length <= 1}
              >
                ×
              </button>
            </div>
          ))}
          <button
            className="add-rival-button"
            type="button"
            title="Add New Rival"
            aria-label="Add New Rival"
            onClick={addRival}
          >
            +
          </button>
        </div>
      </div>

      <div className="map-layout">
        <div className="map-board-column">
          <MapBoard
            config={mapConfig}
            tiles={tiles}
            selectedTileId={selectedTileId}
            selectedMarker={selectedMarker}
            selectedRivalColor={selectedRivalColor}
            onSelectTile={setSelectedTileId}
            onPaintTile={updateTile}
          />
        </div>

        <aside className="map-score-panel" aria-label="Map score summary">
          <div
            className="score-row base"
            style={{ "--score-color": "#45b66b" } as CSSProperties}
          >
            <span className="score-color" aria-hidden="true" />
            <strong>Our base</strong>
            {renderPointSummary(pointSummary.base)}
          </div>

          <div
            className="score-row enemy"
            style={{ "--score-color": "#cf3f45" } as CSSProperties}
          >
            <span className="score-color" aria-hidden="true" />
            <strong>Enemies</strong>
            {renderPointSummary(pointSummary.enemy)}
          </div>

          {rivalColors.map((color, index) => (
            <div
              className="score-row rival"
              key={index}
              style={{ "--score-color": color } as CSSProperties}
            >
              <span className="score-color" aria-hidden="true" />
              <div className="rival-input-container">
                <input
                  aria-label={`Rival ${index + 1} name`}
                  value={rivalNames[color] ?? `Rival ${index + 1}`}
                  onChange={(event) => updateRivalName(color, event.target.value)}
                />
                <input
                  type="color"
                  className="rival-color-picker"
                  value={color}
                  onChange={(e) => updateRivalColor(color, e.target.value)}
                  title={`Change color for Rival ${index + 1}`}
                />
              </div>
              {renderPointSummary(rivalPointSummary[color])}
            </div>
          ))}
        </aside>
      </div>

      <div className="map-details">
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