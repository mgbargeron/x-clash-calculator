import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { ReactNode } from "react";

import type { TileMarker, MapTile, OurTeamConfig, RivalTeam, EnemyTeam } from "../components/gameMap/types";
import { defaultGameMapConfig } from "../utils/gameMapConfig";
import type { GameMapConfig } from "../utils/gameMapConfig";
import { usePointSummaries } from "../hooks/usePointSummaries";
import {MapBoard, MapToolbar, ScorePanel} from "../components/gameMap";

type MapTilesById = Record<string, MapTile>;

type GameMapSnapshot = {
  tiles: MapTilesById;
  rivalTeams: RivalTeam[];
  ourTeam: OurTeamConfig;
  enemyTeams: EnemyTeam[];
  selectedTileId: string;
  selectedRivalTeamId: string;
  selectedEnemyTeamId: string;
};

const MAP_STORAGE_KEY = "game-map-v1";
const MAX_ACTION_HISTORY = 10;
const MIN_MAP_ZOOM = 0.75;
const MAX_MAP_ZOOM = 2;
const DEFAULT_MAP_ZOOM = 1.2;
const MAP_ZOOM_STEP = 0.1;

type StoredMapData = {
  tiles?: Record<string, unknown> | null;
  rivalTeams?: unknown[] | null;
  ourTeam?: unknown;
  enemyTeams?: unknown[] | null;
  selectedTileId?: string;
};

type StoredOurTeam = { color: string; name: string; code: string };
type StoredRivalTeam = { id?: string; color: string; name: string; code: string };
type StoredEnemyTeam = { id?: string; name: string; code: string };
type StoredTile = {
  marker?: unknown;
  rivalColor?: unknown;
  enemyColor?: unknown;
  rivalTeamId?: unknown;
  enemyTeamId?: unknown;
  note?: unknown;
};

function createStableId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createRivalId(): string {
  return createStableId("rival");
}

function createEnemyId(): string {
  return createStableId("enemy");
}

function generateTeamCode(name: string): string {
  const trimmedName = name.trim();
  if (!trimmedName) return "???";

  const words = trimmedName
    .split(/[^a-zA-Z0-9]+/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length >= 3) {
    return words
      .slice(0, 3)
      .map((word) => word[0]!.toUpperCase())
      .join("");
  }

  if (words.length === 2) {
    return `${words[0][0] ?? "X"}${(words[1][0] ?? "X")}${(words[1][1] ?? words[0][1] ?? "X")}`.toUpperCase();
  }

  const compact = trimmedName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return `${compact.slice(0, 3)}XXX`.slice(0, 3);
}

function syncGeneratedCode(currentCode: string, previousName: string, nextName: string): string {
  if (!currentCode.trim() || currentCode === generateTeamCode(previousName)) {
    return generateTeamCode(nextName);
  }

  return currentCode;
}

function normalizeMap(
  mapConfig: GameMapConfig,
  rivalTeams: RivalTeam[],
  enemyTeams: EnemyTeam[],
  storedTiles?: Record<string, unknown> | null
): MapTilesById {
  const rivalIdByColor = new Map(rivalTeams.map((team) => [team.color, team.id]));
  const enemyIds = new Set(enemyTeams.map((team) => team.id));

  return mapConfig.tiles.reduce<MapTilesById>(
    (tiles, tile) => {
      const storedTile = storedTiles?.[tile.id] as StoredTile | undefined;
      const normalizedMarker =
        storedTile?.marker === "base" ||
        storedTile?.marker === "enemy" ||
        storedTile?.marker === "rival" ||
        storedTile?.marker === "none"
          ? storedTile.marker
          : "none";
      const rivalTeamId =
        typeof storedTile?.rivalTeamId === "string"
          ? storedTile.rivalTeamId
          : typeof storedTile?.rivalColor === "string"
            ? rivalIdByColor.get(storedTile.rivalColor)
            : undefined;
      const enemyTeamId =
        typeof storedTile?.enemyTeamId === "string" && enemyIds.has(storedTile.enemyTeamId)
          ? storedTile.enemyTeamId
          : typeof storedTile?.enemyColor === "string" && enemyIds.has(storedTile.enemyColor)
            ? storedTile.enemyColor
            : undefined;

      tiles[tile.id] = {
        marker: normalizedMarker,
        rivalTeamId,
        enemyTeamId,
        note: typeof storedTile?.note === "string" ? storedTile.note : "",
      };

      return tiles;
    },
    {} as MapTilesById
  );
}

function normalizeRivalTeams(stored: unknown): RivalTeam[] {
  const arr = Array.isArray(stored) ? stored : [];
  return (arr as StoredRivalTeam[]).map((t, index) => {
    const name = t.name || "Unnamed";
    return { id: t.id ?? createStableId(`rival-${index + 1}`), color: t.color, name, code: t.code || generateTeamCode(name) };
  });
}

function normalizeOurTeam(stored: unknown): OurTeamConfig {
  const obj = (stored ?? {}) as StoredOurTeam;
  return obj.color ? { color: obj.color, name: obj.name || "Our Team", code: obj.code } : { color: "#45b66b", name: "Our Team", code: "OUR" };
}

function normalizeEnemyTeams(stored: unknown): EnemyTeam[] {
  const arr = Array.isArray(stored) ? stored : [];
  return (arr as StoredEnemyTeam[]).map((t, idx) => ({
    id: t.id ?? createStableId(`enemy-${idx + 1}`),
    name: t.name || "Enemy",
    code: t.code || generateTeamCode(t.name || "Enemy"),
  }));
}

async function loadStoredMap(): Promise<{ tiles: Record<string, unknown> | null; rivalTeams: any[]; ourTeam: any; enemyTeams: any[]; selectedTileId: string | null }> {
  const storedRaw = localStorage.getItem(MAP_STORAGE_KEY);
  
  if (!storedRaw) return { tiles: null, rivalTeams: [], ourTeam: null, enemyTeams: [], selectedTileId: null };

  try {
    const stored = JSON.parse(storedRaw) as StoredMapData;
    return {
      tiles: stored.tiles ?? null,
      rivalTeams: (stored.rivalTeams as any[]) || [],
      ourTeam: stored.ourTeam ?? null,
      enemyTeams: (stored.enemyTeams as any[]) || [],
      selectedTileId: stored.selectedTileId ?? null,
    };
  } catch {
    return { tiles: null, rivalTeams: [], ourTeam: null, enemyTeams: [], selectedTileId: null };
  }
}

async function saveStoredMap(tiles: MapTilesById, rivalTeams: RivalTeam[], ourTeam: OurTeamConfig, enemyTeams: EnemyTeam[], selectedTileId: string) {
  const data = JSON.stringify({ tiles, rivalTeams, ourTeam, enemyTeams, selectedTileId });
  localStorage.setItem(MAP_STORAGE_KEY, data);

  if (typeof window !== "undefined" && "electronAPI" in window) {
    const api = (window as any).electronAPI;
    if (api?.saveGameMap) {
      try { await api.saveGameMap(data); } catch {}
    }
  }
}

type GameMapPageProps = { navigation: ReactNode };

export default function GameMapPage({ navigation }: GameMapPageProps) {
  const mapConfig = defaultGameMapConfig;
  const firstTileId = mapConfig.tiles[0]?.id ?? "";
  const boardRef = useRef<HTMLDivElement | null>(null);
  const hasLoadedStoredMap = useRef(false);

  // Undo system refs
  const latestSnapshotRef = useRef<GameMapSnapshot | null>(null);
  const undoStackRef = useRef<GameMapSnapshot[]>([]);

  // State
  const [tiles, setTiles] = useState<MapTilesById>(() => normalizeMap(mapConfig, [], []));
  const [selectedMarker, setSelectedMarker] = useState<TileMarker>("base");
  const [selectedRivalTeamId, setSelectedRivalTeamId] = useState("");
  const [selectedTileId, setSelectedTileId] = useState(firstTileId);
  const [teamManagementLocked, setTeamManagementLocked] = useState(true);
  const [rivalTeams, setRivalTeams] = useState<RivalTeam[]>([]);
  const [ourTeam, setOurTeam] = useState<OurTeamConfig>({ color: "#45b66b", name: "Our Team", code: "OUR" });
  const [enemyTeams, setEnemyTeams] = useState<EnemyTeam[]>([]);
  const [selectedEnemyTeamId, setSelectedEnemyTeamId] = useState("");
  const [mapZoom, setMapZoom] = useState(DEFAULT_MAP_ZOOM);

  // Undo system
  function getCurrentSnapshot(): GameMapSnapshot {
    return latestSnapshotRef.current ?? { tiles, rivalTeams, ourTeam, enemyTeams, selectedTileId, selectedRivalTeamId, selectedEnemyTeamId };
  }

  function applySnapshot(snapshot: GameMapSnapshot) {
    latestSnapshotRef.current = snapshot;
    setTiles(snapshot.tiles);
    setRivalTeams(snapshot.rivalTeams);
    setOurTeam(snapshot.ourTeam);
    setEnemyTeams(snapshot.enemyTeams);
    setSelectedTileId(snapshot.selectedTileId);
    setSelectedRivalTeamId(snapshot.selectedRivalTeamId);
    setSelectedEnemyTeamId(snapshot.selectedEnemyTeamId);
  }

  function snapshotsEqual(a: GameMapSnapshot, b: GameMapSnapshot) {
    return (
      a.tiles === b.tiles &&
      a.rivalTeams === b.rivalTeams &&
      a.ourTeam === b.ourTeam &&
      a.enemyTeams === b.enemyTeams &&
      a.selectedTileId === b.selectedTileId &&
      a.selectedRivalTeamId === b.selectedRivalTeamId &&
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

  // Storage loading (async)
  useEffect(() => {
    let isMounted = true;

    void loadStoredMap().then((storedMap) => {
      if (!isMounted) return;
      const normalizedRivalTeams =
        storedMap.rivalTeams && (storedMap.rivalTeams as any[]).length > 0 ? normalizeRivalTeams(storedMap.rivalTeams) : [];
      const normalizedEnemyTeams =
        storedMap.enemyTeams && (storedMap.enemyTeams as any[]).length > 0 ? normalizeEnemyTeams(storedMap.enemyTeams) : [];

      applySnapshot({
        tiles: normalizeMap(mapConfig, normalizedRivalTeams, normalizedEnemyTeams, storedMap.tiles),
        rivalTeams: normalizedRivalTeams,
        ourTeam: storedMap.ourTeam ? normalizeOurTeam(storedMap.ourTeam) : { color: "#45b66b", name: "Our Team", code: "OUR" },
        enemyTeams: normalizedEnemyTeams,
        selectedTileId: storedMap.selectedTileId ?? firstTileId,
        selectedRivalTeamId: normalizedRivalTeams[0]?.id ?? "",
        selectedEnemyTeamId: normalizedEnemyTeams[0]?.id ?? "",
      });
      undoStackRef.current = [];
      hasLoadedStoredMap.current = true;
    });

    return () => { isMounted = false; };
  }, [mapConfig]);

  // Snapshot tracking
  useEffect(() => {
    latestSnapshotRef.current = { tiles, rivalTeams, ourTeam, enemyTeams, selectedTileId, selectedRivalTeamId, selectedEnemyTeamId };
  }, [tiles, rivalTeams, ourTeam, enemyTeams, selectedTileId, selectedRivalTeamId, selectedEnemyTeamId]);

  // Save on change
  useEffect(() => {
    if (!hasLoadedStoredMap.current) return;
    saveStoredMap(tiles, rivalTeams, ourTeam, enemyTeams, selectedTileId);
  }, [tiles, rivalTeams, ourTeam, enemyTeams, selectedTileId]);

  // Flush on unload (useEffectEvent for stable callback reference)
  const flushLatestState = useEffectEvent(() => {
    if (!hasLoadedStoredMap.current || !latestSnapshotRef.current) return;
    const s = latestSnapshotRef.current;
    saveStoredMap(s.tiles, s.rivalTeams, s.ourTeam, s.enemyTeams, s.selectedTileId);
  });

  useEffect(() => {
    window.addEventListener("beforeunload", flushLatestState);
    return () => { window.removeEventListener("beforeunload", flushLatestState); };
  }, [flushLatestState]);

  // Deselect on pointer down outside board (useEffectEvent for stable callback)
  const handlePointerDown = useEffectEvent((event: PointerEvent) => {
    if (!boardRef.current) return;
    if (boardRef.current.contains(event.target as Node)) return;
    setSelectedTileId("");
  });

  useEffect(() => {
    document.addEventListener("pointerdown", handlePointerDown);
    return () => { document.removeEventListener("pointerdown", handlePointerDown); };
  }, [handlePointerDown]);

  // Undo keyboard shortcut (Cmd/Ctrl+Z) - useEffectEvent for stable callback reference
  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.key.toLowerCase() !== "z") return;
    if (!event.metaKey && !event.ctrlKey) return;
    if (event.shiftKey || event.altKey) return;
    if (!latestSnapshotRef.current || undoStackRef.current.length === 0) return;

    event.preventDefault();
    undoLastAction();
  });

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => { window.removeEventListener("keydown", handleKeyDown); };
  }, [handleKeyDown]);

  // Point summaries (extracted to hook)
  const { clearMarkerCount } = usePointSummaries({ mapConfig, tiles, rivalTeams, enemyTeams });


  // Reset map
  function resetMap() {
    commitAction((c) => ({ ...c, tiles: normalizeMap(mapConfig, c.rivalTeams, c.enemyTeams) }));
  }

  // Team management handlers
  function updateOurTeamCode(value: string) { commitAction((c) => ({ ...c, ourTeam: { ...c.ourTeam, code: value } })); }
  function updateOurTeamName(value: string) { commitAction((c) => ({ ...c, ourTeam: { ...c.ourTeam, name: value } })); }
  function updateOurTeamColor(value: string) { commitAction((c) => ({ ...c, ourTeam: { ...c.ourTeam, color: value } })); }

  function addRival() {
    const name = "Rival";
    const newColor = "#9d8465"; // Next color in rotation
    const newId = createRivalId();
    commitAction((c) => ({
      ...c,
      rivalTeams: [...c.rivalTeams, { id: newId, color: newColor, name, code: generateTeamCode(name) }],
      selectedRivalTeamId: newId,
    }));
  }

  function updateRivalCode(id: string, value: string) {
    commitAction((c) => ({
      ...c,
      rivalTeams: c.rivalTeams.map((team) => team.id === id ? { ...team, code: value } : team),
    }));
  }

  function updateRivalName(id: string, value: string) {
    commitAction((c) => ({
      ...c,
      rivalTeams: c.rivalTeams.map((team) =>
        team.id === id ? { ...team, name: value, code: syncGeneratedCode(team.code, team.name, value) } : team
      ),
    }));
  }

  function updateRivalColor(id: string, value: string) {
    commitAction((c) => {
      const rivalTeam = c.rivalTeams.find((team) => team.id === id);
      if (!rivalTeam) return c;

      return {
        ...c,
        rivalTeams: c.rivalTeams.map((team) =>
          team.id === id ? { ...team, color: value } : team
        ),
      };
    });
  }

  function removeRival(id: string) {
    const current = getCurrentSnapshot();
    const rivalTeam = current.rivalTeams.find((team) => team.id === id);
    if (!rivalTeam) return;

    const shouldSelectClearMarker =
      selectedMarker === "rival" && current.selectedRivalTeamId === rivalTeam.id;

    commitAction((c) => ({
      ...c,
      rivalTeams: c.rivalTeams.filter((team) => team.id !== id),
      tiles: Object.fromEntries(
        Object.entries(c.tiles).map(([tileId, tile]) => [
          tileId,
          tile.marker === "rival" && tile.rivalTeamId === rivalTeam.id
            ? { ...tile, marker: "none" }
            : tile,
        ])
      ),
      selectedRivalTeamId: c.selectedRivalTeamId === rivalTeam.id ? "" : c.selectedRivalTeamId,
    }));

    if (shouldSelectClearMarker) {
      setSelectedMarker("none");
    }
  }

  function addEnemy() {
    const newId = createEnemyId();
    const name = "Enemy";
    commitAction((c) => ({
      ...c,
      enemyTeams: [...c.enemyTeams, { id: newId, name, code: generateTeamCode(name) }],
      selectedEnemyTeamId: newId,
    }));
  }

  function updateEnemyCode(id: string, value: string) { commitAction((c) => ({ ...c, enemyTeams: c.enemyTeams.map(t => t.id === id ? { ...t, code: value } : t) })); }
  function updateEnemyName(id: string, value: string) { commitAction((c) => ({ ...c, enemyTeams: c.enemyTeams.map(t => t.id === id ? { ...t, name: value, code: syncGeneratedCode(t.code, t.name, value) } : t) })); }
  function removeEnemy(id: string) {
    const current = getCurrentSnapshot();
    const enemyTeam = current.enemyTeams.find((team) => team.id === id);
    if (!enemyTeam) return;

    const shouldSelectClearMarker =
      selectedMarker === "enemy" && current.selectedEnemyTeamId === enemyTeam.id;

    commitAction((c) => ({
      ...c,
      enemyTeams: c.enemyTeams.filter((team) => team.id !== id),
      tiles: Object.fromEntries(
        Object.entries(c.tiles).map(([tileId, tile]) => [
          tileId,
          tile.marker === "enemy" && tile.enemyTeamId === enemyTeam.id
            ? { ...tile, marker: "none" }
            : tile,
        ])
      ),
      selectedEnemyTeamId: c.selectedEnemyTeamId === enemyTeam.id ? "" : c.selectedEnemyTeamId,
    }));

    if (shouldSelectClearMarker) {
      setSelectedMarker("none");
    }
  }

  function paintTile(tileId: string) {
    commitAction((current) => {
      if (selectedMarker === "rival" && !current.selectedRivalTeamId) return current;
      if (selectedMarker === "enemy" && !current.selectedEnemyTeamId) return current;

      const existingTile = current.tiles[tileId] ?? {
        marker: "none" as TileMarker,
        rivalTeamId: current.selectedRivalTeamId || undefined,
        enemyTeamId: current.selectedEnemyTeamId || undefined,
        note: "",
      };

      const nextTile: MapTile = {
        ...existingTile,
        marker: selectedMarker,
        rivalTeamId: selectedMarker === "rival" ? current.selectedRivalTeamId || undefined : existingTile.rivalTeamId,
        enemyTeamId: selectedMarker === "enemy" ? current.selectedEnemyTeamId || undefined : existingTile.enemyTeamId,
      };

      return {
        ...current,
        selectedTileId: tileId,
        tiles: {
          ...current.tiles,
          [tileId]: nextTile,
        },
      };
    });
  }

  function clearTile(tileId: string) {
    commitAction((current) => {
      const existingTile = current.tiles[tileId];
      if (!existingTile || existingTile.marker === "none") {
        return current;
      }

      return {
        ...current,
        selectedTileId: tileId,
        tiles: {
          ...current.tiles,
          [tileId]: {
            ...existingTile,
            marker: "none",
          },
        },
      };
    });
  }

  function clampMapZoom(value: number) {
    return Math.min(MAX_MAP_ZOOM, Math.max(MIN_MAP_ZOOM, Number(value.toFixed(2))));
  }

  // Render
  return (
    <section className="card map-page">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Planning board</p>
          <h1>Game Map</h1>
        </div>
        {navigation}
      </div>

      <MapToolbar
        clearMarkerCount={clearMarkerCount}
        selectedMarker={selectedMarker}
        ourTeam={ourTeam}
        rivalTeams={rivalTeams}
        enemyTeams={enemyTeams}
        selectedRivalTeamId={selectedRivalTeamId}
        selectedEnemyTeamId={selectedEnemyTeamId}
        onMarkerChange={setSelectedMarker}
        onRivalSelect={(id) => {
          setSelectedRivalTeamId(id);
        }}
        onEnemySelect={setSelectedEnemyTeamId}
      />

      <div className="map-layout">
        <div className="map-board-column">
          <div className="map-board-controls" aria-label="Map board zoom controls">
            <button
              className="map-zoom-button"
              type="button"
              onClick={() => setMapZoom((current) => clampMapZoom(current - MAP_ZOOM_STEP))}
              disabled={mapZoom <= MIN_MAP_ZOOM}
              aria-label="Zoom out map"
              title="Zoom out"
            >
              -
            </button>
            <input
              className="map-zoom-slider"
              type="range"
              min={MIN_MAP_ZOOM}
              max={MAX_MAP_ZOOM}
              step={0.05}
              value={mapZoom}
              onChange={(event) => setMapZoom(clampMapZoom(Number(event.target.value)))}
              aria-label="Map zoom"
            />
            <button
              className="map-zoom-button"
              type="button"
              onClick={() => setMapZoom((current) => clampMapZoom(current + MAP_ZOOM_STEP))}
              disabled={mapZoom >= MAX_MAP_ZOOM}
              aria-label="Zoom in map"
              title="Zoom in"
            >
              +
            </button>
            <button
              className="map-zoom-reset"
              type="button"
              onClick={() => setMapZoom(DEFAULT_MAP_ZOOM)}
              aria-label="Reset map zoom"
            >
              {Math.round(mapZoom * 100)}%
            </button>
          </div>
          <MapBoard
            config={mapConfig}
            tiles={tiles}
            selectedTileId={selectedTileId}
            ourTeam={ourTeam}
            rivalTeams={rivalTeams}
            enemyTeams={enemyTeams}
            zoom={mapZoom}
            boardRef={boardRef}
            onTileSelect={setSelectedTileId}
            onTilePaint={paintTile}
            onTileClear={clearTile}
          />
        </div>

        {(() => {
          const summaries = usePointSummaries({ mapConfig, tiles, rivalTeams, enemyTeams });
          return (
            <ScorePanel
              teamManagementLocked={teamManagementLocked}
              ourTeam={ourTeam}
              rivalTeams={rivalTeams}
              enemyTeams={enemyTeams}
              ourTeamPoints={summaries.ourTeamPointSummary}
              rivalPoints={summaries.rivalPointSummary}
              enemyPoints={summaries.enemyPointSummary}
              onToggleLock={() => setTeamManagementLocked(l => !l)}
              onResetMap={resetMap}
              onUpdateOurTeamCode={updateOurTeamCode}
              onUpdateOurTeamName={updateOurTeamName}
              updateOurTeamColor={updateOurTeamColor}
              addRival={addRival}
              updateRivalCode={updateRivalCode}
              updateRivalName={updateRivalName}
              updateRivalColor={updateRivalColor}
              removeRival={removeRival}
              addEnemy={addEnemy}
              updateEnemyCode={updateEnemyCode}
              updateEnemyName={updateEnemyName}
              removeEnemy={removeEnemy}
            />
          );
        })()}
      </div>
    </section>
  );
}
