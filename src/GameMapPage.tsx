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
  enemyColor?: string;
  note: string;
};

type OurTeamConfig = {
  color: string;
  name: string;
  code: string;
};

type RivalTeam = {
  color: string;
  name: string;
  code: string;
};

type EnemyTeam = {
  color: string;
  name: string;
  code: string;
};

type StoredMapData = {
  tiles?: unknown;
  rivalTeams?: unknown;
  enemyTeams?: unknown;
  ourTeam?: unknown;
};

type StoredOurTeam = {
  color: string;
  name: string;
  code: string;
};

type StoredRivalTeam = {
  color: string;
  name: string;
  code: string;
};

type StoredEnemyTeam = {
  color: string;
  name: string;
  code: string;
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

const defaultRivalCodes = initialRivalColors.reduce<Record<string, string>>(
  (codes, color, index) => ({
    ...codes,
    [color]: `R${index + 1}`,
  }),
  {}
);

const defaultRivalNames = initialRivalColors.reduce<Record<string, string>>(
  (names, color, index) => ({
    ...names,
    [color]: `Rival ${index + 1}`,
  }),
  {}
);

const initialEnemyColors = [
  "#cf3f45",
  "#e07020",
  "#8b5e3c",
];

const defaultEnemyCodes = initialEnemyColors.reduce<Record<string, string>>(
  (codes, color, index) => ({
    ...codes,
    [color]: ["RED", "ORG", "BRN"][index] || `E${index + 1}`,
  }),
  {}
);

const defaultEnemyNames = initialEnemyColors.reduce<Record<string, string>>(
  (names, color, index) => ({
    ...names,
    [color]: `Enemy ${index + 1}`,
  }),
  {}
);

function generateRandomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 3; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

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
  selectedEnemyColor: string;
  onSelectTile: (tileId: string) => void;
  onPaintTile: (tileId: string, marker: TileMarker, rivalColor: string, enemyColor?: string) => void;
};

const createEmptyMap = (config: GameMapConfig): MapTilesById =>
  config.tiles.reduce<MapTilesById>(
    (tiles, tile) => ({
      ...tiles,
      [tile.id]: { marker: "none", rivalColor: initialRivalColors[0], enemyColor: initialEnemyColors[0], note: "" },
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

    const enemyColor =
      typeof savedTile?.enemyColor === "string" && savedTile.enemyColor
        ? savedTile.enemyColor
        : initialEnemyColors[0];

    return {
      ...tiles,
      [tileConfig.id]: {
        marker,
        rivalColor,
        enemyColor,
        note: typeof savedTile?.note === "string" ? savedTile.note : "",
      },
    };
  }, {});
}

function normalizeRivalTeams(parsed: unknown): RivalTeam[] {
  const maybeTeams =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as StoredMapData).rivalTeams
      : null;

  if (!maybeTeams || !Array.isArray(maybeTeams)) {
    return initialRivalColors.map((color, index) => ({
      color,
      name: defaultRivalNames[color] || `Rival ${index + 1}`,
      code: defaultRivalCodes[color] || `R${index + 1}`,
    }));
  }

  const storedTeams = maybeTeams as StoredRivalTeam[];
  
  const existingColors = new Set(storedTeams.map(t => t.color));
  const result: RivalTeam[] = storedTeams.map(team => ({
    color: team.color,
    name: typeof team.name === "string" && team.name ? team.name : `Rival`,
    code: typeof team.code === "string" && team.code ? team.code.substring(0, 3).toUpperCase() : `R`,
  }));

  for (const color of initialRivalColors) {
    if (!existingColors.has(color)) {
      result.push({
        color,
        name: defaultRivalNames[color] || "Rival",
        code: defaultRivalCodes[color] || "R1",
      });
    }
  }

  return result;
}

function normalizeOurTeam(parsed: unknown): OurTeamConfig {
  const maybeTeam =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as StoredMapData).ourTeam
      : null;

  if (!maybeTeam || typeof maybeTeam !== "object") {
    return {
      color: "#45b66b",
      name: "Our Team",
      code: "OUR",
    };
  }

  const stored = maybeTeam as StoredOurTeam;
  return {
    color: typeof stored.color === "string" && stored.color ? stored.color : "#45b66b",
    name: typeof stored.name === "string" && stored.name ? stored.name : "Our Team",
    code: typeof stored.code === "string" && stored.code ? stored.code.substring(0, 3).toUpperCase() : "OUR",
  };
}

function normalizeEnemyTeams(parsed: unknown): EnemyTeam[] {
  const maybeTeams =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as StoredMapData).enemyTeams
      : null;

  if (!maybeTeams || !Array.isArray(maybeTeams)) {
    return initialEnemyColors.map((color, index) => ({
      color,
      name: defaultEnemyNames[color] || `Enemy ${index + 1}`,
      code: defaultEnemyCodes[color] || `E${index + 1}`,
    }));
  }

  const storedTeams = maybeTeams as StoredEnemyTeam[];
  
  const existingColors = new Set(storedTeams.map(t => t.color));
  const result: EnemyTeam[] = storedTeams.map(team => ({
    color: team.color,
    name: typeof team.name === "string" && team.name ? team.name : `Enemy`,
    code: typeof team.code === "string" && team.code ? team.code.substring(0, 3).toUpperCase() : "XXX",
  }));

  for (const color of initialEnemyColors) {
    if (!existingColors.has(color)) {
      result.push({
        color,
        name: defaultEnemyNames[color] || "Enemy",
        code: defaultEnemyCodes[color] || "E1",
      });
    }
  }

  return result;
}

async function loadStoredMap(
  config: GameMapConfig
): Promise<{ tiles: MapTilesById; rivalTeams: RivalTeam[]; ourTeam: OurTeamConfig; enemyTeams: EnemyTeam[] }> {
  let parsed: unknown = null;

  if (window.electronAPI?.getMapData) {
    parsed = await window.electronAPI.getMapData();
    return {
      tiles: normalizeMap(config, parsed),
      rivalTeams: normalizeRivalTeams(parsed),
      ourTeam: normalizeOurTeam(parsed),
      enemyTeams: normalizeEnemyTeams(parsed),
    };
  }

  try {
    const raw = window.localStorage.getItem(MAP_STORAGE_KEY);
    if (!raw) {
      return {
        tiles: createEmptyMap(config),
        rivalTeams: normalizeRivalTeams(null),
        ourTeam: normalizeOurTeam(null),
        enemyTeams: normalizeEnemyTeams(null),
      };
    }

    parsed = JSON.parse(raw);
    return {
      tiles: normalizeMap(config, parsed),
      rivalTeams: normalizeRivalTeams(parsed),
      ourTeam: normalizeOurTeam(parsed),
      enemyTeams: normalizeEnemyTeams(parsed),
    };
  } catch {
    return {
      tiles: createEmptyMap(config),
      rivalTeams: normalizeRivalTeams(null),
      ourTeam: normalizeOurTeam(null),
      enemyTeams: normalizeEnemyTeams(null),
    };
  }
}

function saveStoredMap(tiles: MapTilesById, rivalTeams: RivalTeam[], ourTeam: OurTeamConfig, enemyTeams: EnemyTeam[]) {
  const storedRivalTeams = rivalTeams.map(team => ({
    color: team.color,
    name: team.name,
    code: team.code,
  }));
  const storedEnemyTeams = enemyTeams.map(team => ({
    color: team.color,
    name: team.name,
    code: team.code,
  }));
  const storedOurTeam = {
    color: ourTeam.color,
    name: ourTeam.name,
    code: ourTeam.code,
  };
  const data = { tiles, rivalTeams: storedRivalTeams, ourTeam: storedOurTeam, enemyTeams: storedEnemyTeams };

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
  selectedEnemyColor,
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
          const tile =
            tiles[tileConfig.id] ?? { marker: "none", rivalColor: initialRivalColors[0], enemyColor: initialEnemyColors[0], note: "" };

          return (
            <button
              className={`map-tile ${tile.marker} ${tileConfig.kind} ${
                selectedTileId === tileConfig.id ? "selected" : ""
              }`}
              type="button"
              key={tileConfig.id}
              onClick={() => {
                onSelectTile(tileConfig.id);
                onPaintTile(tileConfig.id, selectedMarker, selectedRivalColor, selectedEnemyColor);
              }}
              onFocus={() => onSelectTile(tileConfig.id)}
              aria-label={`Map tile ${getCoordinate(tileConfig)} ${tileConfig.kind} level ${tileConfig.level}`}
              title={tile.note || `${getCoordinate(tileConfig)} ${tileConfig.kind} level ${tileConfig.level}`}
              style={{
                gridColumn: `${tileConfig.x} / span ${tileConfig.width}`,
                gridRow: `${tileConfig.y} / span ${tileConfig.height}`,
                "--rival-color": tile.rivalColor,
                "--enemy-color": tile.enemyColor || initialEnemyColors[0],
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
  const [rivalTeams, setRivalTeams] = useState<RivalTeam[]>([]);
  const [ourTeam, setOurTeam] = useState<OurTeamConfig>({ color: "#45b66b", name: "Our Team", code: "OUR" });
  const [enemyTeams, setEnemyTeams] = useState<EnemyTeam[]>([]);
  const [selectedEnemyColor, setSelectedEnemyColor] = useState(initialEnemyColors[0]);

  useEffect(() => {
    let isMounted = true;

    void loadStoredMap(mapConfig).then((storedMap) => {
      if (!isMounted) return;
      setTiles(storedMap.tiles);
      setRivalTeams(storedMap.rivalTeams.length > 0 ? storedMap.rivalTeams : normalizeRivalTeams(null));
      setOurTeam(storedMap.ourTeam);
      setEnemyTeams(storedMap.enemyTeams.length > 0 ? storedMap.enemyTeams : normalizeEnemyTeams(null));
      hasLoadedStoredMap.current = true;
    });

    return () => {
      isMounted = false;
    };
  }, [mapConfig]);

  useEffect(() => {
    if (!hasLoadedStoredMap.current) return;
    saveStoredMap(tiles, rivalTeams, ourTeam, enemyTeams);
  }, [tiles, rivalTeams, ourTeam, enemyTeams]);

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

  const rivalCounts = useMemo(
    () =>
      rivalTeams.reduce<Record<string, number>>(
        (summary, team) => ({
          ...summary,
          [team.color]: Object.values(tiles).filter(
            (tile) => tile.marker === "rival" && tile.rivalColor === team.color
          ).length,
        }),
        {}
      ),
    [tiles, rivalTeams]
  );

  const rivalPointSummary = useMemo(
    () => {
      const summaryByColor = rivalTeams.reduce<Record<string, MarkerPointSummary>>(
        (summary, team) => {
          summary[team.color] = createPointSummary();
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
    [mapConfig.tiles, tiles, rivalTeams]
  );

  const ourTeamPointSummary = useMemo(
    () => {
      const summary = createPointSummary();
      for (const tileConfig of mapConfig.tiles) {
        const tile = tiles[tileConfig.id];
        if (tile?.marker !== "base") continue;

        summary.count += 1;
        if (tileConfig.kind === "town") {
          summary.townPoints += tileConfig.level;
        } else {
          summary.frostMinePoints += tileConfig.level;
        }
      }

      return summary;
    },
    [mapConfig.tiles, tiles]
  );

  const enemyCounts = useMemo(
    () =>
      enemyTeams.reduce<Record<string, number>>(
        (summary, team) => ({
          ...summary,
          [team.color]: Object.values(tiles).filter(
            (tile) => tile.marker === "enemy" && tile.enemyColor === team.color
          ).length,
        }),
        {}
      ),
    [tiles, enemyTeams]
  );

  const enemyPointSummary = useMemo(
    () => {
      const summaryByColor = enemyTeams.reduce<Record<string, MarkerPointSummary>>(
        (summary, team) => {
          summary[team.color] = createPointSummary();
          return summary;
        },
        {}
      );

      for (const tileConfig of mapConfig.tiles) {
        const tile = tiles[tileConfig.id];
        if (tile?.marker !== "enemy" || !tile.enemyColor) continue;

        const summary = summaryByColor[tile.enemyColor];
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
    [mapConfig.tiles, tiles, enemyTeams]
  );

  function renderPointSummary(summary: MarkerPointSummary) {
    return (
      <div className="points-cells">
        <span>{summary.count}</span>
        <small>T {summary.townPoints}</small>
        <small>F {summary.frostMinePoints}</small>
      </div>
    );
  }

  function updateTile(tileId: string, marker: TileMarker, rivalColor: string, enemyColor?: string) {
    setSelectedTileId(tileId);
    setTiles((currentTiles) =>
      currentTiles[tileId]
        ? {
          ...currentTiles,
          [tileId]: {
            ...currentTiles[tileId],
            marker,
            rivalColor: marker === "rival" ? rivalColor : currentTiles[tileId].rivalColor,
            enemyColor: marker === "enemy" ? (enemyColor ?? selectedEnemyColor) : currentTiles[tileId].enemyColor,
          },
        }
        : currentTiles
    );
  }


  function resetMap() {
    setTiles(createEmptyMap(mapConfig));
    setSelectedTileId(firstTileId);
  }

  // Function to add a new rival team
  function addRival() {
    const newColor = `#${Math.floor(Math.random()*16777215).toString(16)}`;
    
    // Ensure the color is in proper 6-digit hex format
    const normalizedColor = newColor.startsWith('#') ? newColor : `#${newColor.replace(/^#/, '')}`;
    
    // Normalize to uppercase hex format for consistency
    const finalColor = /^[#]?[0-9A-Fa-f]{6}$/.test(normalizedColor.replace('#', ''))
      ? normalizedColor.toUpperCase()
      : normalizedColor;

    const rivalAbbreviation = (rivalTeams.length < 9) ? `RV${rivalTeams.length + 1}` : `R${rivalTeams.length + 1}`;

    // Add new rival team to the list
    const newTeam: RivalTeam = {
      color: finalColor,
      name: `Rival ${rivalTeams.length + 1}`,
      code: rivalAbbreviation,
    };
    setRivalTeams(prev => [...prev, newTeam]);

    // If the previous first color was selected, keep selection; otherwise select new
    if (!rivalTeams.length || !rivalTeams.find(t => t.color === selectedRivalColor)) {
      setSelectedRivalColor(finalColor);
    } else if (rivalTeams.length > 0) {
      setSelectedRivalColor(rivalTeams[0].color);
    }
  }

  // Function to update a rival team color (Rival Teams can change color)
  function updateRivalColor(oldColor: string, newColor: string) {
    // Convert to hex if needed (handle both #RGB and RGB formats)
    let normalizedColor = newColor.startsWith('#') ? newColor : `#${newColor.replace(/^#/, '')}`;
    
    // Ensure it's a valid 6-digit hex color
    if (!/^[#]?[0-9A-Fa-f]{6}$/.test(normalizedColor.replace('#', ''))) {
      return; // Invalid color format
    }
    
    // Normalize to uppercase hex format for consistency
    normalizedColor = normalizedColor.toUpperCase();
    
    // Update the color in the team list
    setRivalTeams(prev => 
      prev.map(team => 
        team.color === oldColor ? { ...team, color: normalizedColor } : team
      )
    );

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

  // Function to update a rival team name (Rival Teams can edit name)
  function updateRivalName(oldColor: string, newName: string) {
    setRivalTeams(prev =>
      prev.map(team =>
        team.color === oldColor ? { ...team, name: newName } : team
      )
    );
  }

  // Function to update a rival team code (Rival Teams can edit code)
  function updateRivalCode(oldColor: string, newCode: string) {
    const normalized = newCode.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "");
    setRivalTeams(prev =>
      prev.map(team =>
        team.color === oldColor ? { ...team, code: normalized || "R" } : team
      )
    );
  }

  // Function to remove a rival team (Rival Teams can be removed)
  function removeRival(color: string) {
    if (rivalTeams.length <= 1) return; // Prevent removing the last rival

    // Remove team from the list
    const newRivalTeams = rivalTeams.filter(t => t.color !== color);
    setRivalTeams(newRivalTeams);

    // Reassign tiles with this color to the first team's color
    const fallbackColor = newRivalTeams[0]?.color || initialRivalColors[0];
    setTiles(prev => {
      const newTiles = { ...prev };
      Object.keys(newTiles).forEach(tileId => {
        if (newTiles[tileId].rivalColor === color) {
          newTiles[tileId] = {
            ...newTiles[tileId],
            rivalColor: fallbackColor
          };
        }
      });
      return newTiles;
    });

    // If the removed color was selected, switch to first team's color
    if (selectedRivalColor === color) {
      setSelectedRivalColor(fallbackColor);
    }
  }

  // Our Team management functions (Our Team can change name, code, and color)
  function updateOurTeamName(newName: string) {
    setOurTeam(prev => ({ ...prev, name: newName }));
  }

  function updateOurTeamCode(newCode: string) {
    const normalized = newCode.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "");
    setOurTeam(prev => ({ ...prev, code: normalized || "OUR" }));
  }

  function updateOurTeamColor(newColor: string) {
    let normalizedColor = newColor.startsWith('#') ? newColor : `#${newColor.replace(/^#/, '')}`;
    
    if (!/^[#]?[0-9A-Fa-f]{6}$/.test(normalizedColor.replace('#', ''))) {
      return; // Invalid color format
    }
    
    normalizedColor = normalizedColor.toUpperCase();

    // Update all base tiles to use the new color
    setTiles(prev => {
      const newTiles = { ...prev };
      // Find any tiles with the old ourTeam color and update them
      Object.keys(newTiles).forEach(tileId => {
        if (newTiles[tileId].rivalColor === ourTeam.color) {
          newTiles[tileId] = {
            ...newTiles[tileId],
            rivalColor: normalizedColor
          };
        }
      });
      return newTiles;
    });

    // Update the team color
    setOurTeam(prev => ({ ...prev, color: normalizedColor }));
  }

  function addEnemy() {
    const newColor = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
    const newTeam: EnemyTeam = {
      color: newColor,
      name: "Enemy",
      code: generateRandomCode(),
    };
    setEnemyTeams(prev => [...prev, newTeam]);
  }

  function removeEnemy(color: string) {
    if (enemyTeams.length <= 1) return;

    const newEnemyTeams = enemyTeams.filter(t => t.color !== color);
    setEnemyTeams(newEnemyTeams);

    setTiles(prev => {
      const newTiles = { ...prev };
      Object.keys(newTiles).forEach(tileId => {
        if (newTiles[tileId].enemyColor === color) {
          newTiles[tileId] = {
            ...newTiles[tileId],
            enemyColor: newEnemyTeams[0]?.color || initialEnemyColors[0]
          };
        }
      });
      return newTiles;
    });

    if (selectedEnemyColor === color) {
      setSelectedEnemyColor(newEnemyTeams[0]?.color || initialEnemyColors[0]);
    }
  }

  function updateEnemyName(color: string, name: string) {
    setEnemyTeams(prev =>
      prev.map(team =>
        team.color === color ? { ...team, name } : team
      )
    );
  }

  function updateEnemyCode(color: string, code: string) {
    const normalized = code.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "");
    setEnemyTeams(prev =>
      prev.map(team =>
        team.color === color ? { ...team, code: normalized || "XXX" } : team
      )
    );
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
          {rivalTeams.map((team) => (
            <div key={team.color} className="rival-tool-container">
              <button
                className={`icon-tool-button rival ${
                  selectedMarker === "rival" && selectedRivalColor === team.color ? "active" : ""
                }`}
                type="button"
                title={team.name}
                aria-label={team.name}
                onClick={() => {
                  setSelectedMarker("rival");
                  setSelectedRivalColor(team.color);
                }}
                style={{ "--rival-color": team.color } as CSSProperties}
              >
                <span>{team.code}</span>
                <span className="tool-count">{rivalCounts[team.color] ?? 0}</span>
              </button>
              <button
                className="remove-rival-button"
                type="button"
                title={`Remove ${team.name}`}
                aria-label={`Remove ${team.name}`}
                onClick={() => removeRival(team.color)}
                disabled={rivalTeams.length <= 1}
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

          {enemyTeams.map((team) => (
            <div key={team.color} className="rival-tool-container">
              <button
                className={`icon-tool-button enemy-team ${
                  selectedMarker === "enemy" && selectedEnemyColor === team.color ? "active" : ""
                }`}
                type="button"
                title={team.name}
                aria-label={team.name}
                onClick={() => {
                  setSelectedMarker("enemy");
                  setSelectedEnemyColor(team.color);
                }}
                style={{ "--enemy-color": team.color } as CSSProperties}
              >
                <span>{team.code}</span>
                <span className="tool-count">{enemyCounts[team.color] ?? 0}</span>
              </button>
              <button
                className="remove-rival-button"
                type="button"
                title={`Remove ${team.name}`}
                aria-label={`Remove ${team.name}`}
                onClick={() => removeEnemy(team.color)}
                disabled={enemyTeams.length <= 1}
              >
                ×
              </button>
            </div>
          ))}
          <button
            className="add-rival-button"
            type="button"
            title="Add New Enemy Team"
            aria-label="Add New Enemy Team"
            onClick={addEnemy}
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
            selectedEnemyColor={selectedEnemyColor}
            onSelectTile={setSelectedTileId}
            onPaintTile={updateTile}
          />
        </div>

        <aside className="map-score-panel" aria-label="Map score summary">
          {/* Our Team - can edit name, code, and color */}
          <div
            className="score-row our-team"
            key={ourTeam.color}
            style={{ "--score-color": ourTeam.color } as CSSProperties}
          >
            <span className="score-color" aria-hidden="true" />
            <div className="rival-input-container">
              <input
                aria-label={`${ourTeam.name} name`}
                value={ourTeam.name}
                onChange={(event) => updateOurTeamName(event.target.value)}
              />
              <input
                type="text"
                className="enemy-code-input"
                value={ourTeam.code}
                maxLength={3}
                onChange={(event) => updateOurTeamCode(event.target.value)}
                title={`Change code for ${ourTeam.name}`}
              />
              <input
                type="color"
                className="rival-color-picker"
                value={ourTeam.color}
                onChange={(e) => updateOurTeamColor(e.target.value)}
                title={`Change color for ${ourTeam.name}`}
              />
            </div>
            {renderPointSummary(ourTeamPointSummary)}
          </div>

          {/* Enemy teams - can only edit name and code (no color picker) */}
          {enemyTeams.map((team) => (
            <div
              className="score-row enemy-team"
              key={team.color}
              style={{ "--score-color": team.color } as CSSProperties}
            >
              <span className="score-color" aria-hidden="true" />
              <div className="rival-input-container">
                <input
                  aria-label={`${team.name} name`}
                  value={team.name}
                  maxLength={16}
                  onChange={(event) => updateEnemyName(team.color, event.target.value)}
                />
                <input
                  type="text"
                  className="enemy-code-input"
                  value={team.code}
                  maxLength={3}
                  onChange={(event) => updateEnemyCode(team.color, event.target.value)}
                  title={`Change code for ${team.name}`}
                />
              </div>
              {renderPointSummary(enemyPointSummary[team.color])}
            </div>
          ))}

          {/* Rival teams - can edit name, code, and color */}
          {rivalTeams.map((team) => (
            <div
              className="score-row rival"
              key={team.color}
              style={{ "--score-color": team.color } as CSSProperties}
            >
              <span className="score-color" aria-hidden="true" />
              <div className="rival-input-container">
                <input
                  aria-label={`${team.name} name`}
                  value={team.name}
                  maxLength={16}
                  onChange={(event) => updateRivalName(team.color, event.target.value)}
                />
                <input
                  type="text"
                  className="enemy-code-input"
                  value={team.code}
                  maxLength={3}
                  onChange={(event) => updateRivalCode(team.color, event.target.value)}
                  title={`Change code for ${team.name}`}
                />
                <input
                  type="color"
                  className="rival-color-picker"
                  value={team.color}
                  onChange={(e) => updateRivalColor(team.color, e.target.value)}
                  title={`Change color for ${team.name}`}
                />
              </div>
              {renderPointSummary(rivalPointSummary[team.color])}
            </div>
          ))}
        </aside>
      </div>
    </section>
  );
}