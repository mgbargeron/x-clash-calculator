import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  defaultGameMapConfig,
} from "../utils/gameMapConfig";
import type { GameMapConfig, GameMapTileConfig } from "../utils/gameMapConfig";

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
  id: string;
  name: string;
  code: string;
};

type StoredMapData = {
  tiles?: unknown;
  rivalTeams?: unknown;
  enemyTeams?: unknown;
  ourTeam?: unknown;
  updatedAt?: unknown;
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
  id?: string;
  color?: string;
  name: string;
  code: string;
};

const MAP_STORAGE_KEY = "game-map-v1";

const markerTools: Array<{ marker: "none"; label: string; icon: string }> = [
  { marker: "none", label: "Clear marker", icon: "C" },
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

const ENEMY_COLOR = "#CF3F45";
const initialEnemyIds = ["enemy-1", "enemy-2", "enemy-3"];

const defaultEnemyCodes = initialEnemyIds.reduce<Record<string, string>>(
  (codes, id, index) => ({
    ...codes,
    [id]: `E${index + 1}`,
  }),
  {}
);

const defaultEnemyNames = initialEnemyIds.reduce<Record<string, string>>(
  (names, id, index) => ({
    ...names,
    [id]: `Enemy ${index + 1}`,
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

function formatTeamDisplayLabel(code: string, name: string): string {
  const normalizedCode = code.substring(0, 3).toUpperCase() || "XXX";
  const normalizedName = name.trim() || "Unnamed";
  return `[${normalizedCode}]${normalizedName}`;
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M7 10V8a5 5 0 1 1 10 0v2M6 10h12a1 1 0 0 1 1 1v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-8a1 1 0 0 1 1-1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UnlockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M18 10h1a1 1 0 0 1 1 1v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-8a1 1 0 0 1 1-1h8M10 10V8a5 5 0 0 1 9.8-1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type MapTilesById = Record<string, MapTile>;

type MarkerPointSummary = {
  count: number;
  townPoints: number;
  frostMinePoints: number;
};

type GameMapSnapshot = {
  tiles: MapTilesById;
  rivalTeams: RivalTeam[];
  ourTeam: OurTeamConfig;
  enemyTeams: EnemyTeam[];
  selectedTileId: string;
  selectedRivalColor: string;
  selectedEnemyTeamId: string;
};

const MAX_ACTION_HISTORY = 10;

type GameMapPageProps = {
  navigation: ReactNode;
};

type MapBoardProps = {
  config: GameMapConfig;
  tiles: MapTilesById;
  selectedTileId: string;
  selectedMarker: TileMarker;
  selectedRivalColor: string;
  selectedEnemyTeamId: string;
  boardRef: React.RefObject<HTMLDivElement | null>;
  onSelectTile: (tileId: string) => void;
  onPaintTile: (tileId: string, marker: TileMarker, rivalColor: string, enemyTeamId?: string) => void;
};

const createEmptyMap = (config: GameMapConfig): MapTilesById =>
  config.tiles.reduce<MapTilesById>(
    (tiles, tile) => ({
      ...tiles,
      [tile.id]: { marker: "none", rivalColor: initialRivalColors[0], enemyColor: initialEnemyIds[0], note: "" },
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
        : initialEnemyIds[0];

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

  return storedTeams.map(team => ({
    color: team.color,
    name: typeof team.name === "string" && team.name ? team.name : `Rival`,
    code: typeof team.code === "string" && team.code ? team.code.substring(0, 3).toUpperCase() : `R`,
  }));
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
    return initialEnemyIds.map((id, index) => ({
      id,
      name: defaultEnemyNames[id] || `Enemy ${index + 1}`,
      code: defaultEnemyCodes[id] || `E${index + 1}`,
    }));
  }

  const storedTeams = maybeTeams as StoredEnemyTeam[];

  return storedTeams.map(team => ({
    id:
      typeof team.id === "string" && team.id
        ? team.id
        : typeof team.color === "string" && team.color
          ? team.color
          : `enemy-${Math.random().toString(36).slice(2, 10)}`,
    name: typeof team.name === "string" && team.name ? team.name : `Enemy`,
    code: typeof team.code === "string" && team.code ? team.code.substring(0, 3).toUpperCase() : "XXX",
  }));
}

async function loadStoredMap(
  config: GameMapConfig
): Promise<{ tiles: MapTilesById; rivalTeams: RivalTeam[]; ourTeam: OurTeamConfig; enemyTeams: EnemyTeam[] }> {
  const emptyState = {
    tiles: createEmptyMap(config),
    rivalTeams: normalizeRivalTeams(null),
    ourTeam: normalizeOurTeam(null),
    enemyTeams: normalizeEnemyTeams(null),
  };

  const getUpdatedAt = (data: unknown): number =>
    data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    typeof (data as StoredMapData).updatedAt === "number"
      ? ((data as StoredMapData).updatedAt as number)
      : 0;

  let electronData: unknown = null;
  if (window.electronAPI?.getMapData) {
    try {
      electronData = await window.electronAPI.getMapData();
    } catch (ipcError) {
      console.error("[GameMapPage] Electron IPC get failed, falling back to localStorage:", ipcError);
    }
  }

  let localStorageData: unknown = null;
  try {
    const raw = window.localStorage.getItem(MAP_STORAGE_KEY);
    localStorageData = raw ? JSON.parse(raw) : null;
  } catch {
    localStorageData = null;
  }

  const parsed = getUpdatedAt(localStorageData) > getUpdatedAt(electronData) ? localStorageData : electronData;
  if (!parsed) {
    return emptyState;
  }

  return {
    tiles: normalizeMap(config, parsed),
    rivalTeams: normalizeRivalTeams(parsed),
    ourTeam: normalizeOurTeam(parsed),
    enemyTeams: normalizeEnemyTeams(parsed),
  };
}

function saveStoredMap(tiles: MapTilesById, rivalTeams: RivalTeam[], ourTeam: OurTeamConfig, enemyTeams: EnemyTeam[]) {
  const storedRivalTeams = rivalTeams.map(team => ({
    color: team.color,
    name: team.name,
    code: team.code,
  }));
  const storedEnemyTeams = enemyTeams.map(team => ({
    id: team.id,
    name: team.name,
    code: team.code,
  }));
  const storedOurTeam = {
    color: ourTeam.color,
    name: ourTeam.name,
    code: ourTeam.code,
  };
  const data = {
    tiles,
    rivalTeams: storedRivalTeams,
    ourTeam: storedOurTeam,
    enemyTeams: storedEnemyTeams,
    updatedAt: Date.now(),
  };

  try {
    window.localStorage.setItem(MAP_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("[GameMapPage] Failed to save via localStorage:", err);
  }

  if (window.electronAPI?.setMapData) {
    window.electronAPI.setMapData(data).catch((err: unknown) => {
      console.warn("[GameMapPage] Failed to save via Electron API:", err);
    });
  }
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
  selectedEnemyTeamId,
  boardRef,
  onSelectTile,
  onPaintTile,
}: MapBoardProps) {
  const columnLabels = Array.from({ length: config.columns }, (_, index) => index + 1);
  const rowLabels = Array.from({ length: config.rows }, (_, index) =>
    String.fromCharCode(65 + index)
  );

  return (
    <div
      ref={boardRef}
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
            tiles[tileConfig.id] ?? { marker: "none", rivalColor: initialRivalColors[0], enemyColor: initialEnemyIds[0], note: "" };

          return (
            <button
              className={`map-tile ${tile.marker} ${tileConfig.kind} ${
                selectedTileId === tileConfig.id ? "selected" : ""
              }`}
              type="button"
              key={tileConfig.id}
              onClick={() => {
                onSelectTile(tileConfig.id);
                onPaintTile(tileConfig.id, selectedMarker, selectedRivalColor, selectedEnemyTeamId);
              }}
              onContextMenu={(event) => {
                if (selectedTileId !== tileConfig.id) {
                  return;
                }

                event.preventDefault();
                onPaintTile(tileConfig.id, "none", selectedRivalColor, selectedEnemyTeamId);
              }}
              onFocus={() => onSelectTile(tileConfig.id)}
              aria-label={`Map tile ${getCoordinate(tileConfig)} ${tileConfig.kind} level ${tileConfig.level}`}
              title={tile.note || `${getCoordinate(tileConfig)} ${tileConfig.kind} level ${tileConfig.level}`}
              style={{
                gridColumn: `${tileConfig.x} / span ${tileConfig.width}`,
                gridRow: `${tileConfig.y} / span ${tileConfig.height}`,
                "--rival-color": tile.rivalColor,
                "--enemy-color": ENEMY_COLOR,
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

export default function GameMapPage({ navigation }: GameMapPageProps) {
  const mapConfig = defaultGameMapConfig;
  const firstTileId = mapConfig.tiles[0]?.id ?? "";
  const boardRef = useRef<HTMLDivElement | null>(null);
  const hasLoadedStoredMap = useRef(false);
  const latestSnapshotRef = useRef<GameMapSnapshot | null>(null);
  const undoStackRef = useRef<GameMapSnapshot[]>([]);
  const [tiles, setTiles] = useState<MapTilesById>(() => createEmptyMap(mapConfig));
  const [selectedMarker, setSelectedMarker] = useState<TileMarker>("base");
  const [selectedRivalColor, setSelectedRivalColor] = useState(initialRivalColors[0]);
  const [selectedTileId, setSelectedTileId] = useState(firstTileId);
  const [teamManagementLocked, setTeamManagementLocked] = useState(true);
  const [rivalTeams, setRivalTeams] = useState<RivalTeam[]>([]);
  const [ourTeam, setOurTeam] = useState<OurTeamConfig>({ color: "#45b66b", name: "Our Team", code: "OUR" });
  const [enemyTeams, setEnemyTeams] = useState<EnemyTeam[]>([]);
  const [selectedEnemyTeamId, setSelectedEnemyTeamId] = useState(initialEnemyIds[0]);

  function getCurrentSnapshot(): GameMapSnapshot {
    return latestSnapshotRef.current ?? {
      tiles,
      rivalTeams,
      ourTeam,
      enemyTeams,
      selectedTileId,
      selectedRivalColor,
      selectedEnemyTeamId,
    };
  }

  function applySnapshot(snapshot: GameMapSnapshot) {
    latestSnapshotRef.current = snapshot;
    setTiles(snapshot.tiles);
    setRivalTeams(snapshot.rivalTeams);
    setOurTeam(snapshot.ourTeam);
    setEnemyTeams(snapshot.enemyTeams);
    setSelectedTileId(snapshot.selectedTileId);
    setSelectedRivalColor(snapshot.selectedRivalColor);
    setSelectedEnemyTeamId(snapshot.selectedEnemyTeamId);
  }

  function snapshotsEqual(a: GameMapSnapshot, b: GameMapSnapshot) {
    return (
      a.tiles === b.tiles &&
      a.rivalTeams === b.rivalTeams &&
      a.ourTeam === b.ourTeam &&
      a.enemyTeams === b.enemyTeams &&
      a.selectedTileId === b.selectedTileId &&
      a.selectedRivalColor === b.selectedRivalColor &&
      a.selectedEnemyTeamId === b.selectedEnemyTeamId
    );
  }

  function commitAction(updater: (current: GameMapSnapshot) => GameMapSnapshot) {
    const current = getCurrentSnapshot();
    const next = updater(current);
    if (snapshotsEqual(current, next)) return;

    applySnapshot(next);
    undoStackRef.current = [current, ...undoStackRef.current].slice(0, MAX_ACTION_HISTORY);
  }

  function undoLastAction() {
    const snapshotToRestore = undoStackRef.current[0];
    if (!snapshotToRestore) return;

    undoStackRef.current = undoStackRef.current.slice(1);
    applySnapshot(snapshotToRestore);
  }

  useEffect(() => {
    let isMounted = true;

    void loadStoredMap(mapConfig).then((storedMap) => {
      if (!isMounted) return;
      applySnapshot({
        tiles: storedMap.tiles,
        rivalTeams: storedMap.rivalTeams.length > 0 ? storedMap.rivalTeams : normalizeRivalTeams(null),
        ourTeam: storedMap.ourTeam,
        enemyTeams: storedMap.enemyTeams,
        selectedTileId: firstTileId,
        selectedRivalColor: storedMap.rivalTeams[0]?.color ?? initialRivalColors[0],
        selectedEnemyTeamId: storedMap.enemyTeams[0]?.id ?? "",
      });
      undoStackRef.current = [];
      hasLoadedStoredMap.current = true;
    });

    return () => {
      isMounted = false;
    };
  }, [mapConfig]);

  useEffect(() => {
    latestSnapshotRef.current = {
      tiles,
      rivalTeams,
      ourTeam,
      enemyTeams,
      selectedTileId,
      selectedRivalColor,
      selectedEnemyTeamId,
    };
  }, [tiles, rivalTeams, ourTeam, enemyTeams, selectedTileId, selectedRivalColor, selectedEnemyTeamId]);

  useEffect(() => {
    if (!hasLoadedStoredMap.current) return;
    saveStoredMap(tiles, rivalTeams, ourTeam, enemyTeams);
  }, [tiles, rivalTeams, ourTeam, enemyTeams]);

  useEffect(() => {
    const flushLatestState = () => {
      if (!hasLoadedStoredMap.current || !latestSnapshotRef.current) return;
      const { tiles: latestTiles, rivalTeams: latestRivalTeams, ourTeam: latestOurTeam, enemyTeams: latestEnemyTeams } = latestSnapshotRef.current;
      saveStoredMap(latestTiles, latestRivalTeams, latestOurTeam, latestEnemyTeams);
    };

    window.addEventListener("beforeunload", flushLatestState);
    return () => {
      flushLatestState();
      window.removeEventListener("beforeunload", flushLatestState);
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!boardRef.current) return;
      if (boardRef.current.contains(event.target as Node)) return;
      setSelectedTileId("");
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "z") return;
      if (!event.metaKey && !event.ctrlKey) return;
      if (event.shiftKey || event.altKey) return;
      if (!latestSnapshotRef.current || undoStackRef.current.length === 0) return;

      event.preventDefault();
      undoLastAction();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const clearMarkerCount = useMemo(
    () => Object.values(tiles).filter((tile) => tile.marker === "none").length,
    [tiles]
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

  const enemyPointSummary = useMemo(
    () => {
      const summaryByColor = enemyTeams.reduce<Record<string, MarkerPointSummary>>(
        (summary, team) => {
          summary[team.id] = createPointSummary();
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

  function updateTile(tileId: string, marker: TileMarker, rivalColor: string, enemyTeamId?: string) {
    commitAction((current) => {
        const currentTile = current.tiles[tileId];
        if (!currentTile) return current;

        const nextTile = {
          ...currentTile,
          marker,
          rivalColor: marker === "rival" ? rivalColor : currentTile.rivalColor,
          enemyColor: marker === "enemy" ? (enemyTeamId ?? current.selectedEnemyTeamId) : currentTile.enemyColor,
        };

        if (
          currentTile.marker === nextTile.marker &&
          currentTile.rivalColor === nextTile.rivalColor &&
          currentTile.enemyColor === nextTile.enemyColor &&
          current.selectedTileId === tileId
        ) {
          return current;
        }

        return {
          ...current,
          selectedTileId: tileId,
          tiles: {
            ...current.tiles,
            [tileId]: nextTile,
          },
        };
      }
    );
  }


  function resetMap() {
    commitAction((current) => ({
      ...current,
      tiles: createEmptyMap(mapConfig),
      selectedTileId: firstTileId,
    }));
  }

  // Function to add a new rival team
  function addRival() {
    commitAction((current) => {
      const newColor = `#${Math.floor(Math.random()*16777215).toString(16)}`;
      const normalizedColor = newColor.startsWith("#") ? newColor : `#${newColor.replace(/^#/, "")}`;
      const finalColor = /^[#]?[0-9A-Fa-f]{6}$/.test(normalizedColor.replace("#", ""))
        ? normalizedColor.toUpperCase()
        : normalizedColor;
      const rivalAbbreviation = (current.rivalTeams.length < 9) ? `RV${current.rivalTeams.length + 1}` : `R${current.rivalTeams.length + 1}`;
      const newTeam: RivalTeam = {
        color: finalColor,
        name: `Rival ${current.rivalTeams.length + 1}`,
        code: rivalAbbreviation,
      };

      return {
        ...current,
        rivalTeams: [...current.rivalTeams, newTeam],
        selectedRivalColor:
          !current.rivalTeams.length || !current.rivalTeams.find((team) => team.color === current.selectedRivalColor)
            ? finalColor
            : current.rivalTeams[0]?.color ?? finalColor,
      };
    });
  }

  // Function to update a rival team color (Rival Teams can change color)
  function updateRivalColor(oldColor: string, newColor: string) {
    commitAction((current) => {
      let normalizedColor = newColor.startsWith("#") ? newColor : `#${newColor.replace(/^#/, "")}`;
      if (!/^[#]?[0-9A-Fa-f]{6}$/.test(normalizedColor.replace("#", ""))) {
        return current;
      }
      normalizedColor = normalizedColor.toUpperCase();
      if (normalizedColor === oldColor) return current;

      const nextTiles = { ...current.tiles };
      Object.keys(nextTiles).forEach((tileId) => {
        if (nextTiles[tileId].rivalColor === oldColor) {
          nextTiles[tileId] = {
            ...nextTiles[tileId],
            rivalColor: normalizedColor,
          };
        }
      });

      return {
        ...current,
        rivalTeams: current.rivalTeams.map((team) =>
          team.color === oldColor ? { ...team, color: normalizedColor } : team
        ),
        tiles: nextTiles,
        selectedRivalColor: current.selectedRivalColor === oldColor ? normalizedColor : current.selectedRivalColor,
      };
    });
  }

  // Function to update a rival team name (Rival Teams can edit name)
  function updateRivalName(oldColor: string, newName: string) {
    commitAction((current) => ({
      ...current,
      rivalTeams: current.rivalTeams.map((team) =>
        team.color === oldColor ? { ...team, name: newName } : team
      ),
    }));
  }

  // Function to update a rival team code (Rival Teams can edit code)
  function updateRivalCode(oldColor: string, newCode: string) {
    const normalized = newCode.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "");
    commitAction((current) => ({
      ...current,
      rivalTeams: current.rivalTeams.map((team) =>
        team.color === oldColor ? { ...team, code: normalized || "R" } : team
      ),
    }));
  }

  // Function to remove a rival team (Rival Teams can be removed)
  function removeRival(color: string) {
    commitAction((current) => {
      if (current.rivalTeams.length <= 1) return current;

      const newRivalTeams = current.rivalTeams.filter((team) => team.color !== color);
      const nextTiles = { ...current.tiles };
      Object.keys(nextTiles).forEach((tileId) => {
        if (nextTiles[tileId].marker === "rival" && nextTiles[tileId].rivalColor === color) {
          nextTiles[tileId] = {
            ...nextTiles[tileId],
            marker: "none",
          };
        }
      });

      const fallbackColor = newRivalTeams[0]?.color || initialRivalColors[0];
      return {
        ...current,
        rivalTeams: newRivalTeams,
        tiles: nextTiles,
        selectedRivalColor: current.selectedRivalColor === color ? fallbackColor : current.selectedRivalColor,
      };
    });
  }

  // Our Team management functions (Our Team can change name, code, and color)
  function updateOurTeamName(newName: string) {
    commitAction((current) => ({
      ...current,
      ourTeam: { ...current.ourTeam, name: newName },
    }));
  }

  function updateOurTeamCode(newCode: string) {
    const normalized = newCode.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "");
    commitAction((current) => ({
      ...current,
      ourTeam: { ...current.ourTeam, code: normalized || "OUR" },
    }));
  }

  function updateOurTeamColor(newColor: string) {
    commitAction((current) => {
      let normalizedColor = newColor.startsWith("#") ? newColor : `#${newColor.replace(/^#/, "")}`;
      if (!/^[#]?[0-9A-Fa-f]{6}$/.test(normalizedColor.replace("#", ""))) {
        return current;
      }
      normalizedColor = normalizedColor.toUpperCase();
      if (normalizedColor === current.ourTeam.color) return current;

      const nextTiles = { ...current.tiles };
      Object.keys(nextTiles).forEach((tileId) => {
        if (nextTiles[tileId].rivalColor === current.ourTeam.color) {
          nextTiles[tileId] = {
            ...nextTiles[tileId],
            rivalColor: normalizedColor,
          };
        }
      });

      return {
        ...current,
        tiles: nextTiles,
        ourTeam: { ...current.ourTeam, color: normalizedColor },
      };
    });
  }

  function addEnemy() {
    commitAction((current) => {
      const newTeam: EnemyTeam = {
        id: `enemy-${crypto.randomUUID()}`,
        name: `Enemy ${current.enemyTeams.length + 1}`,
        code: generateRandomCode(),
      };

      return {
        ...current,
        enemyTeams: [...current.enemyTeams, newTeam],
        selectedEnemyTeamId: newTeam.id,
      };
    });
  }

  function removeEnemy(id: string) {
    commitAction((current) => {
      if (current.enemyTeams.length === 0) return current;

      const newEnemyTeams = current.enemyTeams.filter((team) => team.id !== id);
      const nextTiles = { ...current.tiles };
      Object.keys(nextTiles).forEach((tileId) => {
        if (nextTiles[tileId].marker === "enemy" && nextTiles[tileId].enemyColor === id) {
          nextTiles[tileId] = {
            ...nextTiles[tileId],
            marker: "none",
          };
        }
      });

      return {
        ...current,
        enemyTeams: newEnemyTeams,
        tiles: nextTiles,
        selectedEnemyTeamId:
          current.selectedEnemyTeamId === id ? (newEnemyTeams[0]?.id || "") : current.selectedEnemyTeamId,
      };
    });

    if (enemyTeams.length === 1 && selectedMarker === "enemy") {
      setSelectedMarker("base");
    }
  }

  function updateEnemyName(id: string, name: string) {
    commitAction((current) => ({
      ...current,
      enemyTeams: current.enemyTeams.map((team) =>
        team.id === id ? { ...team, name } : team
      ),
    }));
  }

  function updateEnemyCode(id: string, code: string) {
    const normalized = code.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "");
    commitAction((current) => ({
      ...current,
      enemyTeams: current.enemyTeams.map((team) =>
        team.id === id ? { ...team, code: normalized || "XXX" } : team
      ),
    }));
  }

  return (
    <section className="card map-page">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Planning board</p>
          <h1>Game Map</h1>
        </div>
        {navigation}
      </div>

      <div className="map-toolbar" aria-label="Map tile tools">
        <div className="tile-tools">
          {markerTools.map((tool) => (
            <button
              className={`icon-tool-button clear-tool-button ${tool.marker} ${
                selectedMarker === tool.marker ? "active" : ""
              }`}
              type="button"
              key={tool.marker}
              title={tool.label}
              aria-label={tool.label}
              onClick={() => setSelectedMarker(tool.marker)}
            >
              <span className="tool-inline-label">
                {tool.icon} | {clearMarkerCount}
              </span>
            </button>
          ))}
          <button
            className={`icon-tool-button base team-tool-button ${
              selectedMarker === "base" ? "active" : ""
            }`}
            type="button"
            title={formatTeamDisplayLabel(ourTeam.code, ourTeam.name)}
            aria-label={formatTeamDisplayLabel(ourTeam.code, ourTeam.name)}
            onClick={() => setSelectedMarker("base")}
          >
            <span className="team-code">{ourTeam.code}</span>
          </button>
          {rivalTeams.map((team) => (
            <button
              key={team.color}
              className={`icon-tool-button rival team-tool-button ${
                selectedMarker === "rival" && selectedRivalColor === team.color ? "active" : ""
              }`}
              type="button"
              title={formatTeamDisplayLabel(team.code, team.name)}
              aria-label={formatTeamDisplayLabel(team.code, team.name)}
              onClick={() => {
                setSelectedMarker("rival");
                setSelectedRivalColor(team.color);
              }}
              style={{ "--rival-color": team.color } as CSSProperties}
            >
              <span className="team-code">{team.code}</span>
            </button>
          ))}

          {enemyTeams.map((team) => (
            <button
              key={team.id}
              className={`icon-tool-button enemy-team team-tool-button ${
                selectedMarker === "enemy" && selectedEnemyTeamId === team.id ? "active" : ""
              }`}
              type="button"
              title={formatTeamDisplayLabel(team.code, team.name)}
              aria-label={formatTeamDisplayLabel(team.code, team.name)}
              onClick={() => {
                setSelectedMarker("enemy");
                setSelectedEnemyTeamId(team.id);
              }}
              style={{ "--enemy-color": ENEMY_COLOR } as CSSProperties}
            >
              <span className="team-code">{team.code}</span>
            </button>
          ))}
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
            selectedEnemyTeamId={selectedEnemyTeamId}
            boardRef={boardRef}
            onSelectTile={setSelectedTileId}
            onPaintTile={updateTile}
          />
        </div>

        <aside className="map-score-panel" aria-label="Map score summary">
          <div className="aside-controls">
            <button
              className={`secondary-button aside-control-button lock-button ${teamManagementLocked ? "active" : ""}`}
              type="button"
              onClick={() => setTeamManagementLocked((locked) => !locked)}
              aria-pressed={teamManagementLocked}
              title={teamManagementLocked ? "Unlock team add/remove and reset" : "Lock team add/remove and reset"}
              aria-label={teamManagementLocked ? "Unlock team add/remove and reset" : "Lock team add/remove and reset"}
            >
              {teamManagementLocked ? <LockIcon /> : <UnlockIcon />}
            </button>
            <button
              className="secondary-button aside-control-button reset-button"
              type="button"
              onClick={resetMap}
              disabled={teamManagementLocked}
            >
              Clear Board
            </button>
          </div>

          {/* Our Team - can edit name, code, and color */}
          <div className="score-group-label">
            <span>Our Team</span>
          </div>

          <div
            className="score-row our-team"
            key={ourTeam.color}
            style={{ "--score-color": ourTeam.color } as CSSProperties}
          >
            <span className="score-color" aria-hidden="true" />
            <div className="rival-input-container">
              <input
                type="text"
                className="enemy-code-input"
                value={ourTeam.code}
                maxLength={3}
                disabled={teamManagementLocked}
                onChange={(event) => updateOurTeamCode(event.target.value)}
                title={`Change code for ${ourTeam.name}`}
              />
              <input
                className="team-name-input"
                aria-label={`${ourTeam.name} name`}
                value={ourTeam.name}
                maxLength={16}
                disabled={teamManagementLocked}
                onChange={(event) => updateOurTeamName(event.target.value)}
              />
              <input
                type="color"
                className="rival-color-picker"
                value={ourTeam.color}
                disabled={teamManagementLocked}
                onChange={(e) => updateOurTeamColor(e.target.value)}
                title={`Change color for ${ourTeam.name}`}
              />
            </div>
            {renderPointSummary(ourTeamPointSummary)}
            <button
              className="remove-team-button"
              type="button"
              title={`Remove ${ourTeam.name}`}
              aria-label={`Remove ${ourTeam.name}`}
              onClick={() => removeRival(ourTeam.color)}
              disabled={teamManagementLocked || rivalTeams.length <= 1}
            >
              ×
            </button>
          </div>



          {/* Rival teams - can edit name, code, and color */}
          <div className="score-group-label">
            <span>Rival Teams</span>
            <button
              className="aside-add-button"
              type="button"
              title="Add New Rival Team"
              aria-label="Add New Rival Team"
              onClick={addRival}
              disabled={teamManagementLocked}
            >
              +
            </button>
          </div>

          {rivalTeams.map((team) => (
            <div
              className="score-row rival"
              key={team.color}
              style={{ "--score-color": team.color } as CSSProperties}
            >
              <span className="score-color" aria-hidden="true" />
              <div className="rival-input-container">
                <input
                  type="text"
                  className="enemy-code-input"
                  value={team.code}
                  maxLength={3}
                  disabled={teamManagementLocked}
                  onChange={(event) => updateRivalCode(team.color, event.target.value)}
                  title={`Change code for ${team.name}`}
                />
                <input
                  className="team-name-input"
                  aria-label={`${team.name} name`}
                  value={team.name}
                  maxLength={16}
                  disabled={teamManagementLocked}
                  onChange={(event) => updateRivalName(team.color, event.target.value)}
                />
                <input
                  type="color"
                  className="rival-color-picker"
                  value={team.color}
                  disabled={teamManagementLocked}
                  onChange={(e) => updateRivalColor(team.color, e.target.value)}
                  title={`Change color for ${team.name}`}
                />
              </div>
              {renderPointSummary(rivalPointSummary[team.color])}
              <button
                className="remove-team-button"
                type="button"
                title={`Remove ${team.name}`}
                aria-label={`Remove ${team.name}`}
                onClick={() => removeRival(team.color)}
                disabled={teamManagementLocked || rivalTeams.length <= 1}
              >
                ×
              </button>
            </div>
          ))}

          {/* Enemy teams - can only edit name and code (no color picker) */}
          <div className="score-group-label">
            <span>Enemy Teams</span>
            <button
              className="aside-add-button"
              type="button"
              title="Add New Enemy Team"
              aria-label="Add New Enemy Team"
              onClick={addEnemy}
              disabled={teamManagementLocked}
            >
              +
            </button>
          </div>

          {enemyTeams.map((team) => (
            <div
              className="score-row enemy-team"
              key={team.id}
              style={{ "--score-color": ENEMY_COLOR } as CSSProperties}
            >
              <span className="score-color" aria-hidden="true" />
              <div className="rival-input-container">
                <input
                  type="text"
                  className="enemy-code-input"
                  value={team.code}
                  maxLength={3}
                  disabled={teamManagementLocked}
                  onChange={(event) => updateEnemyCode(team.id, event.target.value)}
                  title={`Change code for ${team.name}`}
                />
                <input
                  className="team-name-input"
                  aria-label={`${team.name} name`}
                  value={team.name}
                  maxLength={16}
                  disabled={teamManagementLocked}
                  onChange={(event) => updateEnemyName(team.id, event.target.value)}
                />
              </div>
              {renderPointSummary(enemyPointSummary[team.id])}
              <button
                className="remove-team-button"
                type="button"
                title={`Remove ${team.name}`}
                aria-label={`Remove ${team.name}`}
                onClick={() => removeEnemy(team.id)}
                disabled={teamManagementLocked}
              >
                ×
              </button>
            </div>
          ))}
        </aside>
      </div>
    </section>
  );
}
