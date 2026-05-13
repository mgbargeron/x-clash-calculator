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
  selectedRivalColor: string;
  selectedEnemyTeamId: string;
};

const MAP_STORAGE_KEY = "game-map-v1";
const MAX_ACTION_HISTORY = 10;

const initialRivalColors = [
  "#b08d57",
  "#7a8fb8",
  "#a16f96",
  "#729b79",
  "#9d8465",
];

const initialEnemyIds = ["enemy-1", "enemy-2", "enemy-3"];

type StoredMapData = {
  tiles?: Record<string, unknown> | null;
  rivalTeams?: unknown[] | null;
  ourTeam?: unknown;
  enemyTeams?: unknown[] | null;
  selectedTileId?: string;
};

type StoredOurTeam = { color: string; name: string; code: string };
type StoredRivalTeam = { color: string; name: string; code: string };
type StoredEnemyTeam = { id?: string; name: string; code: string };

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

function normalizeMap(mapConfig: GameMapConfig, storedTiles?: Record<string, unknown> | null): MapTilesById {
  const defaultTile = { marker: "none" as TileMarker, rivalColor: initialRivalColors[0], enemyColor: initialEnemyIds[0], note: "" };
  return mapConfig.tiles.reduce<MapTilesById>(
    (tiles, tile) => ({
      ...tiles,
      [tile.id]: storedTiles?.[tile.id] as MapTile ?? defaultTile,
    }),
    {} as MapTilesById
  );
}

function normalizeRivalTeams(stored: unknown): RivalTeam[] {
  const arr = Array.isArray(stored) ? stored : [];
  return (arr as StoredRivalTeam[]).map((t) => {
    const name = t.name || "Unnamed";
    return { color: t.color, name, code: t.code || generateTeamCode(name) };
  });
}

function normalizeOurTeam(stored: unknown): OurTeamConfig {
  const obj = (stored ?? {}) as StoredOurTeam;
  return obj.color ? { color: obj.color, name: obj.name || "Our Team", code: obj.code } : { color: "#45b66b", name: "Our Team", code: "OUR" };
}

function normalizeEnemyTeams(stored: unknown): EnemyTeam[] {
  const arr = Array.isArray(stored) ? stored : [];
  return (arr as StoredEnemyTeam[]).map((t, idx) => ({
    id: t.id ?? `enemy-${idx + 1}`,
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
  const [tiles, setTiles] = useState<MapTilesById>(() => normalizeMap(mapConfig));
  const [selectedMarker, setSelectedMarker] = useState<TileMarker>("base");
  const [selectedRivalColor, setSelectedRivalColor] = useState(initialRivalColors[0]);
  const [selectedTileId, setSelectedTileId] = useState(firstTileId);
  const [teamManagementLocked, setTeamManagementLocked] = useState(true);
  const [rivalTeams, setRivalTeams] = useState<RivalTeam[]>([]);
  const [ourTeam, setOurTeam] = useState<OurTeamConfig>({ color: "#45b66b", name: "Our Team", code: "OUR" });
  const [enemyTeams, setEnemyTeams] = useState<EnemyTeam[]>([]);
  const [selectedEnemyTeamId, setSelectedEnemyTeamId] = useState(initialEnemyIds[0]);

  // Undo system
  function getCurrentSnapshot(): GameMapSnapshot {
    return latestSnapshotRef.current ?? { tiles, rivalTeams, ourTeam, enemyTeams, selectedTileId, selectedRivalColor, selectedEnemyTeamId };
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

  // Storage loading (async)
  useEffect(() => {
    let isMounted = true;

    void loadStoredMap().then((storedMap) => {
      if (!isMounted) return;
      applySnapshot({
        tiles: normalizeMap(mapConfig, storedMap.tiles),
        rivalTeams: storedMap.rivalTeams && (storedMap.rivalTeams as any[]).length > 0 ? normalizeRivalTeams(storedMap.rivalTeams) : [],
        ourTeam: storedMap.ourTeam ? normalizeOurTeam(storedMap.ourTeam) : { color: "#45b66b", name: "Our Team", code: "OUR" },
        enemyTeams: storedMap.enemyTeams && (storedMap.enemyTeams as any[]).length > 0 ? normalizeEnemyTeams(storedMap.enemyTeams) : [],
        selectedTileId: storedMap.selectedTileId ?? firstTileId,
        selectedRivalColor: (storedMap.rivalTeams && (storedMap.rivalTeams as any[])[0])?.color ?? initialRivalColors[0],
        selectedEnemyTeamId: (storedMap.enemyTeams && (storedMap.enemyTeams as any[])[0])?.id ?? "",
      });
      undoStackRef.current = [];
      hasLoadedStoredMap.current = true;
    });

    return () => { isMounted = false; };
  }, [mapConfig]);

  // Snapshot tracking
  useEffect(() => {
    latestSnapshotRef.current = { tiles, rivalTeams, ourTeam, enemyTeams, selectedTileId, selectedRivalColor, selectedEnemyTeamId };
  }, [tiles, rivalTeams, ourTeam, enemyTeams, selectedTileId, selectedRivalColor, selectedEnemyTeamId]);

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
    commitAction((c) => ({ ...c, tiles: normalizeMap(mapConfig) }));
  }

  // Team management handlers
  function updateOurTeamCode(value: string) { commitAction((c) => ({ ...c, ourTeam: { ...c.ourTeam, code: value } })); }
  function updateOurTeamName(value: string) { commitAction((c) => ({ ...c, ourTeam: { ...c.ourTeam, name: value } })); }
  function updateOurTeamColor(value: string) { commitAction((c) => ({ ...c, ourTeam: { ...c.ourTeam, color: value } })); }

  function addRival() {
    const name = "Rival";
    const newColor = "#9d8465"; // Next color in rotation
    commitAction((c) => ({ ...c, rivalTeams: [...c.rivalTeams, { color: newColor, name, code: generateTeamCode(name) }] }));
  }

  function updateRivalCode(color: string, value: string) { commitAction((c) => ({ ...c, rivalTeams: c.rivalTeams.map(t => t.color === color ? { ...t, code: value } : t) })); }
  function updateRivalName(color: string, value: string) { commitAction((c) => ({ ...c, rivalTeams: c.rivalTeams.map(t => t.color === color ? { ...t, name: value, code: syncGeneratedCode(t.code, t.name, value) } : t) })); }
  function updateRivalColor(color: string, value: string) { commitAction((c) => ({ ...c, rivalTeams: c.rivalTeams.map(t => t.color === color ? { ...t, color: value } : t) })); }
  function removeRival(color: string) { commitAction((c) => ({ ...c, rivalTeams: c.rivalTeams.filter(t => t.color !== color), selectedRivalColor: initialRivalColors[0] })); }

  function addEnemy() {
    const newId = `enemy-${Date.now() % 1000}`;
    const name = "Enemy";
    commitAction((c) => ({ ...c, enemyTeams: [...c.enemyTeams, { id: newId, name, code: generateTeamCode(name) }] }));
  }

  function updateEnemyCode(id: string, value: string) { commitAction((c) => ({ ...c, enemyTeams: c.enemyTeams.map(t => t.id === id ? { ...t, code: value } : t) })); }
  function updateEnemyName(id: string, value: string) { commitAction((c) => ({ ...c, enemyTeams: c.enemyTeams.map(t => t.id === id ? { ...t, name: value, code: syncGeneratedCode(t.code, t.name, value) } : t) })); }
  function removeEnemy(id: string) { commitAction((c) => ({ ...c, enemyTeams: c.enemyTeams.filter(t => t.id !== id), selectedEnemyTeamId: initialEnemyIds[0] })); }

  function paintTile(tileId: string) {
    commitAction((current) => {
      const existingTile = current.tiles[tileId] ?? {
        marker: "none" as TileMarker,
        rivalColor: current.selectedRivalColor,
        enemyColor: current.selectedEnemyTeamId,
        note: "",
      };

      const nextTile: MapTile = {
        ...existingTile,
        marker: selectedMarker,
        rivalColor: selectedRivalColor,
        enemyColor: selectedEnemyTeamId,
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
        selectedRivalColor={selectedRivalColor}
        selectedEnemyTeamId={selectedEnemyTeamId}
        onMarkerChange={setSelectedMarker}
        onRivalSelect={setSelectedRivalColor}
        onEnemySelect={setSelectedEnemyTeamId}
      />

      <div className="map-layout">
        <div className="map-board-column">
          <MapBoard
            config={mapConfig}
            tiles={tiles}
            selectedTileId={selectedTileId}
            baseColor={ourTeam.color}
            rivalTeams={rivalTeams}
            boardRef={boardRef}
            onTileSelect={setSelectedTileId}
            onTilePaint={paintTile}
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
