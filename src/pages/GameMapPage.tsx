import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type ReactNode,
} from "react";

import {
  MapCaptureImportDialog,
  MapBoard,
  MapToolbar,
  ScorePanel,
  SimulationPanel,
  SimulationTimeDialog,
} from "../components/gameMap";
import type { MapTileSimulationState } from "../components/gameMap/MapTile";
import type {
  EnemyTeam,
  GameMapSnapshot,
  MapTile,
  MapTilesById,
  MultiServerMapStore,
  OurTeamConfig,
  RivalTeam,
  ServerId,
  TileMarker,
} from "../components/gameMap/types";
import { usePointSummaries } from "../hooks/usePointSummaries";
import { useSeasonPersistence } from "../hooks/useSeasonPersistence";
import { useDeselectTileOnOutsideClick } from "../hooks/useDeselectTileOnOutsideClick";
import { useUndoKeyboardShortcut } from "../hooks/useUndoKeyboardShortcut";
import { useBeforeUnloadSave } from "../hooks/useBeforeUnloadSave";
import { useMapStoreRefSync } from "../hooks/useMapStoreRefSync";
import { useMapStoreSaver } from "../hooks/useMapStoreSaver";
import {
  getNextSeason,
  getSeasonConfig,
  getSeasonConfigEntry,
  isConfiguredSeason,
  normalizeSeason,
} from "../utils/gameMapConfig";
import type { Season, GameMapConfig } from "../utils/gameMapConfig";
import {
  CITY_RACE_SERVER_ID,
  advanceCityRaceDay,
  captureCityRaceTile,
  createDefaultCityRaceSimulation,
  getCityRaceCaptureError,
  getCityRaceTileStatus,
  hasCityRaceActionsOnDay,
  normalizeCityRaceSimulation,
  releaseCityRaceTile,
  resetCityRaceDay,
  setCityRaceCaptureTime,
  setCityRaceFinalDay,
  type CityRaceSimulation,
} from "../utils/cityRaceSimulation";

const MAP_STORAGE_KEY = "game-map-season";
const LEGACY_SEASON_MAP_STORAGE_KEY = "game-map-v2";
const LEGACY_MAP_STORAGE_KEY = "game-map-v1";
const SEASON_STORAGE_KEY = "game-map-season";
const DEFAULT_SERVER_NUMBER = "001";
const DEFAULT_SERVER_ID = "001-1";
const MAP_CAPTURE_FORMAT = "x-clash-game-map-capture";
const MAP_CAPTURE_FORMAT_VERSION = 1;
const MAX_MAP_CAPTURE_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ACTION_HISTORY = 10;
const MIN_MAP_ZOOM = 0.25;
const MAX_MAP_ZOOM = 2;
const DEFAULT_MAP_ZOOM = 1;
const MAP_ZOOM_STEP = 0.05;
const DEFAULT_OUR_TEAM: OurTeamConfig = { color: "#45b66b", name: "Our Team", code: "OUR" };
const DEFAULT_RIVAL_COLOR = "#9d8465";

type StoredMapData = {
  tiles?: Record<string, unknown> | null;
  rivalTeams?: unknown[] | null;
  ourTeam?: unknown;
  enemyTeams?: unknown[] | null;
  selectedTileId?: unknown;
  selectedRivalTeamId?: unknown;
  selectedEnemyTeamId?: unknown;
  simulation?: unknown;
};

type StoredMultiServerMapData = {
  activeServerId?: unknown;
  serverOrder?: unknown;
  serversById?: unknown;
};

type StoredOurTeam = { color?: unknown; name?: unknown; code?: unknown };
type StoredRivalTeam = { id?: unknown; color?: unknown; name?: unknown; code?: unknown };
type StoredEnemyTeam = { id?: unknown; name?: unknown; code?: unknown };
type StoredTile = {
  marker?: unknown;
  rivalColor?: unknown;
  enemyColor?: unknown;
  rivalTeamId?: unknown;
  enemyTeamId?: unknown;
  note?: unknown;
};
type StoredMapCaptureFile = {
  format?: unknown;
  formatVersion?: unknown;
  season?: unknown;
  seasonName?: unknown;
  serverNumber?: unknown;
  version?: unknown;
  exportedAt?: unknown;
  capture?: unknown;
};
type ServerVersionIdentity = {
  serverNumber: string;
  version: number;
};

function createSeasonStorageKey(season: Season): string {
  return `${MAP_STORAGE_KEY}-${season}`;
}

function createLegacySeasonStorageKey(season: Season): string {
  return `${LEGACY_SEASON_MAP_STORAGE_KEY}-s${season}`;
}

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
    return `${words[0][0] ?? "X"}${words[1][0] ?? "X"}${words[1][1] ?? words[0][1] ?? "X"}`.toUpperCase();
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

function isValidServerNumber(value: string): boolean {
  return /^\d{3}$/.test(value);
}

function normalizeServerNumber(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return isValidServerNumber(trimmed) ? trimmed : null;
}

function createServerVersionId(serverNumber: string, version: number): ServerId {
  return `${serverNumber}-${version}`;
}

function parseServerVersionId(value: unknown): ServerVersionIdentity | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  const legacyServerNumber = normalizeServerNumber(trimmed);
  if (legacyServerNumber) {
    return { serverNumber: legacyServerNumber, version: 1 };
  }

  const match = /^(\d{3})-([1-9]\d*)$/.exec(trimmed);
  if (!match) return null;

  const version = Number(match[2]);
  if (!Number.isSafeInteger(version)) return null;

  return {
    serverNumber: match[1],
    version,
  };
}

function normalizeServerId(value: unknown): ServerId | null {
  const identity = parseServerVersionId(value);
  return identity
    ? createServerVersionId(identity.serverNumber, identity.version)
    : null;
}

function createSeasonFileToken(season: Season): string {
  return `Season${season}`;
}

function parseMapCaptureFilename(
  fileName: string
): { serverNumber: string; season: Season } | null {
  const match = /^(\d{3})-Season([1-9]\d*)[^/]*\.json$/i.exec(fileName.trim());
  if (!match) return null;

  const season = Number(match[2]);
  if (!isConfiguredSeason(season)) return null;

  return {
    serverNumber: match[1],
    season,
  };
}

function parseStoredPayload(raw: unknown): unknown {
  let current = raw;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (typeof current !== "string") break;

    try {
      current = JSON.parse(current);
    } catch {
      break;
    }
  }

  return current;
}

function normalizeMap(
  mapConfig: GameMapConfig,
  rivalTeams: RivalTeam[],
  enemyTeams: EnemyTeam[],
  storedTiles?: Record<string, unknown> | null
): MapTilesById {
  const rivalIdByColor = new Map(rivalTeams.map((team) => [team.color, team.id]));
  const rivalIds = new Set(rivalTeams.map((team) => team.id));
  const enemyIds = new Set(enemyTeams.map((team) => team.id));

  return mapConfig.tiles.reduce<MapTilesById>((tiles, tile) => {
    const storedTile = storedTiles?.[tile.id] as StoredTile | undefined;
    const normalizedMarker =
      storedTile?.marker === "base" ||
      storedTile?.marker === "enemy" ||
      storedTile?.marker === "rival" ||
      storedTile?.marker === "none"
        ? storedTile.marker
        : "none";
    const rivalTeamId =
      typeof storedTile?.rivalTeamId === "string" && rivalIds.has(storedTile.rivalTeamId)
        ? storedTile.rivalTeamId
        : typeof storedTile?.rivalColor === "string"
          ? rivalIdByColor.get(storedTile.rivalColor)
          : undefined;
    const enemyTeamId =
      typeof storedTile?.enemyTeamId === "string" && enemyIds.has(storedTile.enemyTeamId)
        ? storedTile.enemyTeamId
        : undefined;

    tiles[tile.id] = {
      marker: normalizedMarker,
      rivalTeamId,
      enemyTeamId,
      note: typeof storedTile?.note === "string" ? storedTile.note : "",
    };

    return tiles;
  }, {});
}

function createSimulationTiles(
  mapConfig: GameMapConfig,
  tiles: MapTilesById,
  simulation: CityRaceSimulation
): MapTilesById {
  const ownedTileIds = new Set([
    ...simulation.currentTowns,
    ...simulation.currentMines,
    ...simulation.currentTradeCenters,
  ]);

  return mapConfig.tiles.reduce<MapTilesById>((nextTiles, tileConfig) => {
    const existingTile = tiles[tileConfig.id] ?? { marker: "none", note: "" };
    nextTiles[tileConfig.id] = {
      ...existingTile,
      marker: ownedTileIds.has(tileConfig.id) ? "base" : "none",
      rivalTeamId: undefined,
      enemyTeamId: undefined,
    };
    return nextTiles;
  }, {});
}

function normalizeRivalTeams(stored: unknown): RivalTeam[] {
  const arr = Array.isArray(stored) ? stored : [];

  return (arr as StoredRivalTeam[]).map((team, index) => {
    const name = typeof team.name === "string" && team.name.trim() ? team.name : "Rival";
    return {
      id: typeof team.id === "string" && team.id.trim() ? team.id : createStableId(`rival-${index + 1}`),
      color: typeof team.color === "string" && team.color.trim() ? team.color : DEFAULT_RIVAL_COLOR,
      name,
      code: typeof team.code === "string" && team.code.trim() ? team.code : generateTeamCode(name),
    };
  });
}

function normalizeOurTeam(stored: unknown): OurTeamConfig {
  const obj = (stored ?? {}) as StoredOurTeam;
  const name = typeof obj.name === "string" && obj.name.trim() ? obj.name : DEFAULT_OUR_TEAM.name;
  const color = typeof obj.color === "string" && obj.color.trim() ? obj.color : DEFAULT_OUR_TEAM.color;
  const code =
    typeof obj.code === "string" && obj.code.trim() ? obj.code : generateTeamCode(name || DEFAULT_OUR_TEAM.name);

  return { color, name, code };
}

function normalizeEnemyTeams(stored: unknown): EnemyTeam[] {
  const arr = Array.isArray(stored) ? stored : [];

  return (arr as StoredEnemyTeam[]).map((team, index) => {
    const name = typeof team.name === "string" && team.name.trim() ? team.name : "Enemy";
    return {
      id: typeof team.id === "string" && team.id.trim() ? team.id : createStableId(`enemy-${index + 1}`),
      name,
      code: typeof team.code === "string" && team.code.trim() ? team.code : generateTeamCode(name),
    };
  });
}

function createDefaultServerSnapshot(
  mapConfig: GameMapConfig,
  firstTileId: string,
  simulationMode = false
): GameMapSnapshot {
  const simulation = simulationMode ? createDefaultCityRaceSimulation() : undefined;

  return {
    tiles: simulation
      ? createSimulationTiles(mapConfig, normalizeMap(mapConfig, [], []), simulation)
      : normalizeMap(mapConfig, [], []),
    rivalTeams: [],
    ourTeam: DEFAULT_OUR_TEAM,
    enemyTeams: [],
    selectedTileId: firstTileId,
    selectedRivalTeamId: "",
    selectedEnemyTeamId: "",
    simulation,
  };
}

function createDefaultMapStore(
  mapConfig: GameMapConfig,
  firstTileId: string,
  season: Season
): MultiServerMapStore {
  const includeSimulation = season === 2;

  return {
    activeServerId: DEFAULT_SERVER_ID,
    serverOrder: includeSimulation
      ? [DEFAULT_SERVER_ID, CITY_RACE_SERVER_ID]
      : [DEFAULT_SERVER_ID],
    serversById: {
      [DEFAULT_SERVER_ID]: createDefaultServerSnapshot(mapConfig, firstTileId),
      ...(includeSimulation
        ? {
            [CITY_RACE_SERVER_ID]: createDefaultServerSnapshot(
              mapConfig,
              firstTileId,
              true
            ),
          }
        : {}),
    },
  };
}

function normalizeStoredSnapshot(
  raw: unknown,
  mapConfig: GameMapConfig,
  firstTileId: string,
  simulationMode = false
): GameMapSnapshot {
  const stored = (raw ?? {}) as StoredMapData;
  const rivalTeams = normalizeRivalTeams(stored.rivalTeams);
  const enemyTeams = normalizeEnemyTeams(stored.enemyTeams);
  const ourTeam = normalizeOurTeam(stored.ourTeam);
  const simulation = simulationMode
    ? normalizeCityRaceSimulation(stored.simulation, mapConfig)
    : undefined;
  const normalizedTiles = normalizeMap(mapConfig, rivalTeams, enemyTeams, stored.tiles);
  const tiles = simulation
    ? createSimulationTiles(mapConfig, normalizedTiles, simulation)
    : normalizedTiles;
  const selectedTileId =
    typeof stored.selectedTileId === "string" && stored.selectedTileId in tiles
      ? stored.selectedTileId
      : firstTileId;
  const selectedRivalTeamId =
    typeof stored.selectedRivalTeamId === "string" &&
    rivalTeams.some((team) => team.id === stored.selectedRivalTeamId)
      ? stored.selectedRivalTeamId
      : rivalTeams[0]?.id ?? "";
  const selectedEnemyTeamId =
    typeof stored.selectedEnemyTeamId === "string" &&
    enemyTeams.some((team) => team.id === stored.selectedEnemyTeamId)
      ? stored.selectedEnemyTeamId
      : enemyTeams[0]?.id ?? "";

  return {
    tiles,
    rivalTeams,
    ourTeam,
    enemyTeams,
    selectedTileId,
    selectedRivalTeamId,
    selectedEnemyTeamId,
    simulation,
  };
}

function normalizeStoredMapStore(
  raw: unknown,
  mapConfig: GameMapConfig,
  firstTileId: string,
  season: Season
): MultiServerMapStore {
  const parsed = parseStoredPayload(raw);

  if (!parsed || typeof parsed !== "object") {
    return createDefaultMapStore(mapConfig, firstTileId, season);
  }

  if ("serversById" in parsed || "serverOrder" in parsed || "activeServerId" in parsed) {
    const stored = parsed as StoredMultiServerMapData;
    const serversByIdRaw =
      stored.serversById && typeof stored.serversById === "object" ? stored.serversById : {};
    const requestedOrder = Array.isArray(stored.serverOrder) ? stored.serverOrder : [];
    const normalizedOrder: ServerId[] = [];
    const normalizedServersById: Record<ServerId, GameMapSnapshot> = {};

    for (const candidate of requestedOrder) {
      const serverId = normalizeServerId(candidate);
      if (!serverId || normalizedOrder.includes(serverId)) continue;

      const rawKey = typeof candidate === "string" ? candidate : "";
      const rawSnapshots = serversByIdRaw as Record<string, unknown>;
      const rawSnapshot =
        rawKey in rawSnapshots
          ? rawSnapshots[rawKey]
          : serverId in rawSnapshots
            ? rawSnapshots[serverId]
            : undefined;

      normalizedOrder.push(serverId);
      normalizedServersById[serverId] = normalizeStoredSnapshot(rawSnapshot, mapConfig, firstTileId);
    }

    for (const [key, value] of Object.entries(serversByIdRaw as Record<string, unknown>)) {
      const serverId = normalizeServerId(key);
      if (!serverId || normalizedOrder.includes(serverId)) continue;

      normalizedOrder.push(serverId);
      normalizedServersById[serverId] = normalizeStoredSnapshot(value, mapConfig, firstTileId);
    }

    if (normalizedOrder.length === 0) {
      normalizedOrder.push(DEFAULT_SERVER_ID);
      normalizedServersById[DEFAULT_SERVER_ID] = createDefaultServerSnapshot(
        mapConfig,
        firstTileId
      );
    }

    if (season === 2) {
      const rawSimulationSnapshot = (serversByIdRaw as Record<string, unknown>)[
        CITY_RACE_SERVER_ID
      ];
      normalizedOrder.push(CITY_RACE_SERVER_ID);
      normalizedServersById[CITY_RACE_SERVER_ID] = normalizeStoredSnapshot(
        rawSimulationSnapshot,
        mapConfig,
        firstTileId,
        true
      );
    }

    const requestedActiveServerId = normalizeServerId(stored.activeServerId);
    const normalizedActiveServerId =
      season === 2 && stored.activeServerId === CITY_RACE_SERVER_ID
        ? CITY_RACE_SERVER_ID
        : requestedActiveServerId && normalizedServersById[requestedActiveServerId]
          ? requestedActiveServerId
          : normalizedOrder[0];

    return {
      activeServerId: normalizedActiveServerId,
      serverOrder: normalizedOrder,
      serversById: normalizedServersById,
    };
  }

  if ("tiles" in parsed || "rivalTeams" in parsed || "ourTeam" in parsed || "enemyTeams" in parsed) {
    const legacySnapshot = normalizeStoredSnapshot(parsed, mapConfig, firstTileId);
    const legacyStore: MultiServerMapStore = {
      activeServerId: DEFAULT_SERVER_ID,
      serverOrder: [DEFAULT_SERVER_ID],
      serversById: {
        [DEFAULT_SERVER_ID]: legacySnapshot,
      },
    };

    if (season === 2) {
      legacyStore.serverOrder.push(CITY_RACE_SERVER_ID);
      legacyStore.serversById[CITY_RACE_SERVER_ID] = createDefaultServerSnapshot(
        mapConfig,
        firstTileId,
        true
      );
    }

    return legacyStore;
  }

  return createDefaultMapStore(mapConfig, firstTileId, season);
}

async function loadStoredMapStore(
  mapConfig: GameMapConfig,
  firstTileId: string,
  season: Season
): Promise<MultiServerMapStore> {
  let raw: unknown = null;

  if (window.electronAPI.getMapData) {
    try {
      raw = await window.electronAPI.getMapData(season);
    } catch {
      raw = null;
    }
  }

  if (!raw) {
    const seasonKey = createSeasonStorageKey(season);
    try {
      raw = JSON.parse(localStorage.getItem(seasonKey) ?? "null");
    } catch {
      raw = null;
    }
  }

  if (!raw) {
    const legacySeasonKey = createLegacySeasonStorageKey(season);
    try {
      raw = JSON.parse(localStorage.getItem(legacySeasonKey) ?? "null");
    } catch {
      raw = null;
    }
  }

  if (raw) {
    return normalizeStoredMapStore(raw, mapConfig, firstTileId, season);
  }

  if (season !== 1) {
    return createDefaultMapStore(mapConfig, firstTileId, season);
  }

  let legacyRaw: unknown = null;

  try {
    legacyRaw = JSON.parse(localStorage.getItem(LEGACY_MAP_STORAGE_KEY) ?? "null");
  } catch {
    legacyRaw = null;
  }

  if (legacyRaw) {
    return normalizeStoredMapStore(legacyRaw, mapConfig, firstTileId, season);
  }

  return createDefaultMapStore(mapConfig, firstTileId, season);
}

async function saveStoredMapStore(store: MultiServerMapStore, season: Season) {
  const seasonKey = createSeasonStorageKey(season);
  localStorage.setItem(seasonKey, JSON.stringify(store));

  if (window.electronAPI.setMapData) {
    try {
      await window.electronAPI.setMapData(store, season);
    } catch {
      // Ignore persistence failures outside localStorage.
    }
  }
}

function replaceActiveServerSnapshot(
  store: MultiServerMapStore,
  snapshot: GameMapSnapshot
): MultiServerMapStore {
  return {
    ...store,
    serversById: {
      ...store.serversById,
      [store.activeServerId]: snapshot,
    },
  };
}

function getNextAvailableServerVersion(
  store: MultiServerMapStore,
  serverNumber: string,
  preferredVersion: number
): number {
  const usedVersions = new Set(
    store.serverOrder.flatMap((serverId) => {
      const identity = parseServerVersionId(serverId);
      return identity?.serverNumber === serverNumber ? [identity.version] : [];
    })
  );

  if (!usedVersions.has(preferredVersion)) return preferredVersion;

  let version = Math.max(preferredVersion, ...usedVersions) + 1;
  while (usedVersions.has(version)) {
    version += 1;
  }
  return version;
}

type GameMapPageProps = { navigation: ReactNode };
type SimulationNotice = {
  tone: "info" | "error" | "success";
  text: string;
} | null;
type PendingSimulationAction = {
  action: "capture" | "release";
  tileId: string;
  time: string;
};
type MapCaptureNotice = {
  tone: "error" | "success";
  text: string;
} | null;
type PendingMapCaptureImport = {
  fileName: string;
  serverNumber: string;
  sourceVersion: number;
  targetVersion: number;
  snapshot: GameMapSnapshot;
};

export default function GameMapPage({ navigation }: GameMapPageProps) {
  const [activeSeason, setActiveSeason] = useState<Season>(() => {
    try {
      const stored = localStorage.getItem(SEASON_STORAGE_KEY);
      return normalizeSeason(stored);
    } catch {
      return normalizeSeason(null);
    }
  });

  const mapConfig = getSeasonConfig(activeSeason);
  const firstTileId = mapConfig.tiles[0]?.id ?? "";

  useSeasonPersistence(activeSeason);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const captureFileInputRef = useRef<HTMLInputElement | null>(null);
  const hasLoadedStoredMap = useRef(false);
  const [mapStore, setMapStore] = useState<MultiServerMapStore>(() =>
    createDefaultMapStore(mapConfig, firstTileId, activeSeason)
  );
  const [loadedSeason, setLoadedSeason] = useState<Season | null>(null);

  const latestStoreRef = useRef(mapStore);
  const latestSnapshotRef = useRef(mapStore.serversById[mapStore.activeServerId]);
  const undoStackRef = useRef<GameMapSnapshot[]>([]);

  const [selectedMarker, setSelectedMarker] = useState<TileMarker>("base");
  const [teamManagementLocked, setTeamManagementLocked] = useState(true);
  const [mapZoom, setMapZoom] = useState(DEFAULT_MAP_ZOOM);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [simulationNotice, setSimulationNotice] = useState<SimulationNotice>(null);
  const [pendingSimulationAction, setPendingSimulationAction] =
    useState<PendingSimulationAction | null>(null);
  const [simulationDialogError, setSimulationDialogError] = useState<string | null>(
    null
  );
  const [captureNotice, setCaptureNotice] = useState<MapCaptureNotice>(null);
  const [pendingCaptureImport, setPendingCaptureImport] =
    useState<PendingMapCaptureImport | null>(null);

  const activeServerSnapshot = mapStore.serversById[mapStore.activeServerId];
  const activeServerIdentity = parseServerVersionId(mapStore.activeServerId);
  const isSimulationMode =
    activeSeason === 2 && mapStore.activeServerId === CITY_RACE_SERVER_ID;
  const simulation =
    activeServerSnapshot.simulation ?? createDefaultCityRaceSimulation();
  const activeSeasonConfig = getSeasonConfigEntry(activeSeason);
  const activeSeasonLabel = activeSeasonConfig.label;
  const nextSeason = getNextSeason(activeSeason);
  const pendingSimulationTile = pendingSimulationAction
    ? mapConfig.tiles.find((tile) => tile.id === pendingSimulationAction.tileId)
    : undefined;
  const {
    tiles,
    rivalTeams,
    ourTeam,
    enemyTeams,
    selectedTileId,
    selectedRivalTeamId,
    selectedEnemyTeamId,
  } = activeServerSnapshot;

  function applyMapStore(nextStore: MultiServerMapStore) {
    latestStoreRef.current = nextStore;
    latestSnapshotRef.current = nextStore.serversById[nextStore.activeServerId];
    setMapStore(nextStore);
  }

  function getCurrentSnapshot(): GameMapSnapshot {
    return latestSnapshotRef.current;
  }

  function applyActiveSnapshot(snapshot: GameMapSnapshot) {
    applyMapStore(replaceActiveServerSnapshot(latestStoreRef.current, snapshot));
  }

  function snapshotsEqual(a: GameMapSnapshot, b: GameMapSnapshot) {
    return (
      a.tiles === b.tiles &&
      a.rivalTeams === b.rivalTeams &&
      a.ourTeam === b.ourTeam &&
      a.enemyTeams === b.enemyTeams &&
      a.selectedTileId === b.selectedTileId &&
      a.selectedRivalTeamId === b.selectedRivalTeamId &&
      a.selectedEnemyTeamId === b.selectedEnemyTeamId &&
      a.simulation === b.simulation
    );
  }

  function patchActiveSnapshot(patch: Partial<GameMapSnapshot>) {
    const current = getCurrentSnapshot();
    applyActiveSnapshot({ ...current, ...patch });
  }

  function commitAction(updater: (current: GameMapSnapshot) => GameMapSnapshot) {
    const current = getCurrentSnapshot();
    const next = updater(current);
    if (snapshotsEqual(current, next)) return;

    applyActiveSnapshot(next);
    undoStackRef.current = [current, ...undoStackRef.current].slice(0, MAX_ACTION_HISTORY);
  }

  function clearUndoHistory() {
    undoStackRef.current = [];
  }

  function undoLastAction() {
    if (pendingSimulationAction) return;
    const snapshotToRestore = undoStackRef.current[0];
    if (!snapshotToRestore) return;

    undoStackRef.current = undoStackRef.current.slice(1);
    applyActiveSnapshot(snapshotToRestore);
    setSimulationNotice(
      isSimulationMode
        ? { tone: "success", text: "The last simulation action was undone." }
        : null
    );
  }

  useEffect(() => {
    let cancelled = false;
    hasLoadedStoredMap.current = false;
    setLoadedSeason(null);
    applyMapStore(createDefaultMapStore(mapConfig, firstTileId, activeSeason));
    clearUndoHistory();

    void loadStoredMapStore(mapConfig, firstTileId, activeSeason).then((storedMapStore) => {
      if (cancelled) return;

      applyMapStore(storedMapStore);
      clearUndoHistory();
      hasLoadedStoredMap.current = true;
      setLoadedSeason(activeSeason);
    });

    return () => {
      cancelled = true;
    };
  }, [firstTileId, mapConfig, activeSeason]);

  useEffect(() => {
    setPanelCollapsed(false);
    setSimulationNotice(null);
    setPendingSimulationAction(null);
    setSimulationDialogError(null);
    setPendingCaptureImport(null);
  }, [activeSeason, mapStore.activeServerId]);

  useEffect(() => {
    setCaptureNotice(null);
  }, [activeSeason]);

  useMapStoreRefSync(latestStoreRef, latestSnapshotRef, mapStore, activeServerSnapshot);

  useMapStoreSaver(mapStore, activeSeason, loadedSeason === activeSeason);

  const flushLatestState = useEffectEvent(() => {
    if (!hasLoadedStoredMap.current) return;
    void saveStoredMapStore(latestStoreRef.current, activeSeason);
  });

  useBeforeUnloadSave(flushLatestState);

  useDeselectTileOnOutsideClick(boardRef, (tileId: string) => {
    patchActiveSnapshot({ selectedTileId: tileId });
  });

  useUndoKeyboardShortcut(undoLastAction);

  const {
    clearMarkerCount,
    ourTeamPointSummary,
    rivalPointSummary,
    enemyPointSummary,
  } = usePointSummaries({ mapConfig, tiles, rivalTeams, enemyTeams });

  const normalServerCount = mapStore.serverOrder.filter(
    (serverId) => serverId !== CITY_RACE_SERVER_ID
  ).length;
  const canRemoveActiveServer =
    mapStore.activeServerId !== CITY_RACE_SERVER_ID && normalServerCount > 1;
  const canUndo = undoStackRef.current.length > 0;
  const hasCurrentDayActions =
    isSimulationMode && hasCityRaceActionsOnDay(simulation);
  const activeServerLabel = useMemo(
    () =>
      isSimulationMode
        ? "Simulate City Race"
        : `Server ${activeServerIdentity?.serverNumber ?? mapStore.activeServerId} · Version ${
            activeServerIdentity?.version ?? 1
          }`,
    [activeServerIdentity, isSimulationMode, mapStore.activeServerId]
  );
  const simulationStates = useMemo<Record<string, MapTileSimulationState> | undefined>(() => {
    if (!isSimulationMode) return undefined;

    return Object.fromEntries(
      mapConfig.tiles.map((tile) => {
        const status = getCityRaceTileStatus(simulation, tile, mapConfig);
        const levelText = typeof tile.level === "number" ? `Level ${tile.level} ` : "";
        const tileName =
          tile.kind === "copperMine"
            ? "Copper Mine"
            : tile.kind === "town"
              ? "Town"
              : "Trade Center";
        const description =
          status === "owned"
            ? `${levelText}${tileName} is owned. Click to choose its drop time.`
            : status === "capturable"
              ? `Capture ${levelText}${tileName} on Day ${simulation.currentDay}. Click to choose the time.`
              : getCityRaceCaptureError(simulation, tile, mapConfig) ??
                `${levelText}${tileName} is unavailable.`;

        return [tile.id, { status, description }];
      })
    );
  }, [isSimulationMode, mapConfig, simulation]);

  function resetMap() {
    commitAction((current) => ({
      ...current,
      tiles: normalizeMap(mapConfig, current.rivalTeams, current.enemyTeams),
    }));
  }

  function createSimulationSnapshot(
    current: GameMapSnapshot,
    nextSimulation: CityRaceSimulation,
    selectedId = current.selectedTileId
  ): GameMapSnapshot {
    return {
      ...current,
      selectedTileId: selectedId,
      simulation: nextSimulation,
      tiles: createSimulationTiles(mapConfig, current.tiles, nextSimulation),
    };
  }

  function changeSimulationFinalDay(value: number) {
    const current = getCurrentSnapshot();
    const currentSimulation =
      current.simulation ?? createDefaultCityRaceSimulation();
    const nextSimulation = setCityRaceFinalDay(currentSimulation, value);
    if (nextSimulation.finalDay === currentSimulation.finalDay) return;
    applyActiveSnapshot(createSimulationSnapshot(current, nextSimulation));
    setSimulationNotice({
      tone: "info",
      text: `The simulation now runs through Day ${nextSimulation.finalDay} at 00:00.`,
    });
  }

  function advanceSimulationDay() {
    const current = getCurrentSnapshot();
    const currentSimulation =
      current.simulation ?? createDefaultCityRaceSimulation();
    const nextSimulation = advanceCityRaceDay(currentSimulation);

    if (nextSimulation === currentSimulation) {
      setSimulationNotice({
        tone: "info",
        text: `Day ${currentSimulation.finalDay} is the configured final score day.`,
      });
      return;
    }

    commitAction((snapshot) =>
      createSimulationSnapshot(snapshot, nextSimulation)
    );
    setSimulationNotice({
      tone: "info",
      text: `Day ${nextSimulation.currentDay} begins at 00:00. Daily capture limits have reset.`,
    });
  }

  function resetCurrentSimulationDay() {
    const current = getCurrentSnapshot();
    const currentSimulation =
      current.simulation ?? createDefaultCityRaceSimulation();

    if (!hasCityRaceActionsOnDay(currentSimulation)) {
      setSimulationNotice({
        tone: "info",
        text: `Day ${currentSimulation.currentDay} has no captures or drops to reset.`,
      });
      return;
    }

    const shouldReset = window.confirm(
      `Reset Day ${currentSimulation.currentDay}? Today's captures and drops will be removed.`
    );
    if (!shouldReset) return;

    const nextSimulation = resetCityRaceDay(currentSimulation);
    commitAction((snapshot) =>
      createSimulationSnapshot(snapshot, nextSimulation)
    );
    setSimulationNotice({
      tone: "success",
      text: `Day ${nextSimulation.currentDay} was reset to 00:00. Tiles held at the start of the day were restored.`,
    });
  }

  function resetSimulation() {
    const shouldReset = window.confirm(
      "Reset the City Race simulation? This removes its capture history and score."
    );
    if (!shouldReset) return;

    const nextSimulation = createDefaultCityRaceSimulation();
    commitAction((current) =>
      createSimulationSnapshot(current, nextSimulation, firstTileId)
    );
    setSimulationNotice({
      tone: "success",
      text: "The City Race simulation has been reset.",
    });
  }

  function updateOurTeamCode(value: string) {
    commitAction((current) => ({
      ...current,
      ourTeam: { ...current.ourTeam, code: value },
    }));
  }

  function updateOurTeamName(value: string) {
    commitAction((current) => ({
      ...current,
      ourTeam: { ...current.ourTeam, name: value },
    }));
  }

  function updateOurTeamColor(value: string) {
    commitAction((current) => ({
      ...current,
      ourTeam: { ...current.ourTeam, color: value },
    }));
  }

  function addRival() {
    const name = "Rival";
    const newId = createRivalId();

    commitAction((current) => ({
      ...current,
      rivalTeams: [
        ...current.rivalTeams,
        { id: newId, color: DEFAULT_RIVAL_COLOR, name, code: generateTeamCode(name) },
      ],
      selectedRivalTeamId: newId,
    }));
  }

  function updateRivalCode(id: string, value: string) {
    commitAction((current) => ({
      ...current,
      rivalTeams: current.rivalTeams.map((team) => (team.id === id ? { ...team, code: value } : team)),
    }));
  }

  function updateRivalName(id: string, value: string) {
    commitAction((current) => ({
      ...current,
      rivalTeams: current.rivalTeams.map((team) =>
        team.id === id
          ? { ...team, name: value, code: syncGeneratedCode(team.code, team.name, value) }
          : team
      ),
    }));
  }

  function updateRivalColor(id: string, value: string) {
    commitAction((current) => ({
      ...current,
      rivalTeams: current.rivalTeams.map((team) =>
        team.id === id ? { ...team, color: value } : team
      ),
    }));
  }

  function removeRival(id: string) {
    const current = getCurrentSnapshot();
    const rivalTeam = current.rivalTeams.find((team) => team.id === id);
    if (!rivalTeam) return;

    const shouldSelectClearMarker =
      selectedMarker === "rival" && current.selectedRivalTeamId === rivalTeam.id;

    commitAction((snapshot) => ({
      ...snapshot,
      rivalTeams: snapshot.rivalTeams.filter((team) => team.id !== id),
      tiles: Object.fromEntries(
        Object.entries(snapshot.tiles).map(([tileId, tile]) => [
          tileId,
          tile.marker === "rival" && tile.rivalTeamId === rivalTeam.id
            ? { ...tile, marker: "none", rivalTeamId: undefined }
            : tile,
        ])
      ),
      selectedRivalTeamId:
        snapshot.selectedRivalTeamId === rivalTeam.id
          ? snapshot.rivalTeams.find((team) => team.id !== rivalTeam.id)?.id ?? ""
          : snapshot.selectedRivalTeamId,
    }));

    if (shouldSelectClearMarker) {
      setSelectedMarker("none");
    }
  }

  function addEnemy() {
    const name = "Enemy";
    const newId = createEnemyId();

    commitAction((current) => ({
      ...current,
      enemyTeams: [...current.enemyTeams, { id: newId, name, code: generateTeamCode(name) }],
      selectedEnemyTeamId: newId,
    }));
  }

  function updateEnemyCode(id: string, value: string) {
    commitAction((current) => ({
      ...current,
      enemyTeams: current.enemyTeams.map((team) => (team.id === id ? { ...team, code: value } : team)),
    }));
  }

  function updateEnemyName(id: string, value: string) {
    commitAction((current) => ({
      ...current,
      enemyTeams: current.enemyTeams.map((team) =>
        team.id === id
          ? { ...team, name: value, code: syncGeneratedCode(team.code, team.name, value) }
          : team
      ),
    }));
  }

  function removeEnemy(id: string) {
    const current = getCurrentSnapshot();
    const enemyTeam = current.enemyTeams.find((team) => team.id === id);
    if (!enemyTeam) return;

    const shouldSelectClearMarker =
      selectedMarker === "enemy" && current.selectedEnemyTeamId === enemyTeam.id;

    commitAction((snapshot) => ({
      ...snapshot,
      enemyTeams: snapshot.enemyTeams.filter((team) => team.id !== id),
      tiles: Object.fromEntries(
        Object.entries(snapshot.tiles).map(([tileId, tile]) => [
          tileId,
          tile.marker === "enemy" && tile.enemyTeamId === enemyTeam.id
            ? { ...tile, marker: "none", enemyTeamId: undefined }
            : tile,
        ])
      ),
      selectedEnemyTeamId:
        snapshot.selectedEnemyTeamId === enemyTeam.id
          ? snapshot.enemyTeams.find((team) => team.id !== enemyTeam.id)?.id ?? ""
          : snapshot.selectedEnemyTeamId,
    }));

    if (shouldSelectClearMarker) {
      setSelectedMarker("none");
    }
  }

  function openSimulationTimeDialog(
    action: "capture" | "release",
    tileId: string
  ) {
    const tileConfig = mapConfig.tiles.find((tile) => tile.id === tileId);
    if (!tileConfig) return;

    const current = getCurrentSnapshot();
    const currentSimulation =
      current.simulation ?? createDefaultCityRaceSimulation();

    if (action === "capture") {
      const latestPossibleTime = setCityRaceCaptureTime(
        currentSimulation,
        "23:59"
      );
      const captureError = getCityRaceCaptureError(
        latestPossibleTime,
        tileConfig,
        mapConfig
      );
      if (captureError) {
        patchActiveSnapshot({ selectedTileId: tileId });
        setSimulationNotice({ tone: "error", text: captureError });
        return;
      }
    } else {
      const isOwned =
        currentSimulation.currentTowns.includes(tileId) ||
        currentSimulation.currentMines.includes(tileId) ||
        currentSimulation.currentTradeCenters.includes(tileId);
      if (!isOwned) {
        patchActiveSnapshot({ selectedTileId: tileId });
        setSimulationNotice({
          tone: "error",
          text: "Only a currently owned tile can be dropped.",
        });
        return;
      }
    }

    patchActiveSnapshot({ selectedTileId: tileId });
    setPendingSimulationAction({
      action,
      tileId,
      time: currentSimulation.captureTime,
    });
    setSimulationDialogError(null);
    setSimulationNotice(null);
  }

  function closeSimulationTimeDialog() {
    setPendingSimulationAction(null);
    setSimulationDialogError(null);
  }

  function confirmSimulationTime() {
    if (!pendingSimulationAction) return;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(pendingSimulationAction.time)) {
      setSimulationDialogError("Choose a valid 24-hour server time.");
      return;
    }

    const tileConfig = mapConfig.tiles.find(
      (tile) => tile.id === pendingSimulationAction.tileId
    );
    if (!tileConfig) {
      closeSimulationTimeDialog();
      return;
    }

    const current = getCurrentSnapshot();
    const currentSimulation =
      current.simulation ?? createDefaultCityRaceSimulation();
    const timedSimulation = setCityRaceCaptureTime(
      currentSimulation,
      pendingSimulationAction.time
    );
    const result =
      pendingSimulationAction.action === "capture"
        ? captureCityRaceTile(timedSimulation, tileConfig, mapConfig)
        : releaseCityRaceTile(timedSimulation, tileConfig);

    if (result.error) {
      setSimulationDialogError(result.error);
      return;
    }

    commitAction((snapshot) =>
      createSimulationSnapshot(snapshot, result.state, tileConfig.id)
    );
    const tileName =
      tileConfig.kind === "copperMine"
        ? "Copper Mine"
        : tileConfig.kind === "town"
          ? "Town"
          : "Trade Center";
    const actionText =
      pendingSimulationAction.action === "capture" ? "captured" : "dropped";
    setSimulationNotice({
      tone: "success",
      text: `${tileName} L${tileConfig.level ?? 0} ${actionText} at Day ${result.state.currentDay} ${result.state.captureTime}.`,
    });
    closeSimulationTimeDialog();
  }

  function paintTile(tileId: string) {
    if (isSimulationMode) {
      const current = getCurrentSnapshot();
      const currentSimulation =
        current.simulation ?? createDefaultCityRaceSimulation();
      const isOwned =
        currentSimulation.currentTowns.includes(tileId) ||
        currentSimulation.currentMines.includes(tileId) ||
        currentSimulation.currentTradeCenters.includes(tileId);
      openSimulationTimeDialog(isOwned ? "release" : "capture", tileId);
      return;
    }

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
        rivalTeamId:
          selectedMarker === "rival" ? current.selectedRivalTeamId || undefined : existingTile.rivalTeamId,
        enemyTeamId:
          selectedMarker === "enemy" ? current.selectedEnemyTeamId || undefined : existingTile.enemyTeamId,
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
    if (isSimulationMode) {
      return;
    }

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

  function openCaptureFilePicker() {
    const input = captureFileInputRef.current;
    if (!input) return;

    input.value = "";
    input.click();
  }

  async function handleCaptureFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setPendingCaptureImport(null);
    setCaptureNotice(null);

    if (file.size > MAX_MAP_CAPTURE_FILE_BYTES) {
      setCaptureNotice({
        tone: "error",
        text: `${file.name} is too large to be a map capture file.`,
      });
      return;
    }

    const filenameMetadata = parseMapCaptureFilename(file.name);
    if (!filenameMetadata) {
      setCaptureNotice({
        tone: "error",
        text: `Use a capture filename like ${DEFAULT_SERVER_NUMBER}-${createSeasonFileToken(
          activeSeason
        )}-v1.json.`,
      });
      return;
    }

    if (filenameMetadata.season !== activeSeason) {
      setCaptureNotice({
        tone: "error",
        text: `${file.name} belongs to ${getSeasonConfigEntry(
          filenameMetadata.season
        ).label}. Switch to that season before importing it.`,
      });
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      setCaptureNotice({
        tone: "error",
        text: `${file.name} is not valid JSON.`,
      });
      return;
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      setCaptureNotice({
        tone: "error",
        text: `${file.name} is not a game map capture file.`,
      });
      return;
    }

    const stored = parsed as StoredMapCaptureFile;
    const fileSeason =
      typeof stored.season === "number" && isConfiguredSeason(stored.season)
        ? stored.season
        : null;
    const serverNumber = normalizeServerNumber(stored.serverNumber);
    const sourceVersion =
      typeof stored.version === "number" &&
      Number.isSafeInteger(stored.version) &&
      stored.version >= 1
        ? stored.version
        : null;
    const hasCapture =
      Boolean(stored.capture) &&
      typeof stored.capture === "object" &&
      !Array.isArray(stored.capture);

    if (
      stored.format !== MAP_CAPTURE_FORMAT ||
      stored.formatVersion !== MAP_CAPTURE_FORMAT_VERSION ||
      !fileSeason ||
      !serverNumber ||
      !sourceVersion ||
      !hasCapture
    ) {
      setCaptureNotice({
        tone: "error",
        text: `${file.name} is not a supported game map capture file.`,
      });
      return;
    }

    if (fileSeason !== activeSeason || filenameMetadata.season !== fileSeason) {
      setCaptureNotice({
        tone: "error",
        text: `The filename and capture data must both identify ${activeSeasonLabel}.`,
      });
      return;
    }

    if (filenameMetadata.serverNumber !== serverNumber) {
      setCaptureNotice({
        tone: "error",
        text: "The server number in the filename does not match the capture data.",
      });
      return;
    }

    const targetVersion = getNextAvailableServerVersion(
      latestStoreRef.current,
      serverNumber,
      sourceVersion
    );
    setPendingCaptureImport({
      fileName: file.name,
      serverNumber,
      sourceVersion,
      targetVersion,
      snapshot: normalizeStoredSnapshot(stored.capture, mapConfig, firstTileId),
    });
  }

  function exportActiveCapture() {
    const currentStore = latestStoreRef.current;
    const identity = parseServerVersionId(currentStore.activeServerId);
    const snapshot = currentStore.serversById[currentStore.activeServerId];

    if (!identity || !snapshot) {
      setCaptureNotice({
        tone: "error",
        text: "Select a numbered server version before exporting.",
      });
      return;
    }

    const fileName = `${identity.serverNumber}-${createSeasonFileToken(
      activeSeason
    )}-v${identity.version}.json`;
    const payload = {
      format: MAP_CAPTURE_FORMAT,
      formatVersion: MAP_CAPTURE_FORMAT_VERSION,
      season: activeSeason,
      seasonName: activeSeasonLabel,
      serverNumber: identity.serverNumber,
      version: identity.version,
      exportedAt: new Date().toISOString(),
      capture: snapshot,
    };

    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);

    setCaptureNotice({
      tone: "success",
      text: `Exported ${fileName}.`,
    });
  }

  function importPendingCaptureAsVersion() {
    const pending = pendingCaptureImport;
    if (!pending) return;

    const currentStore = latestStoreRef.current;
    const targetVersion = getNextAvailableServerVersion(
      currentStore,
      pending.serverNumber,
      pending.targetVersion
    );
    const targetServerId = createServerVersionId(
      pending.serverNumber,
      targetVersion
    );
    const hasSimulationServer =
      CITY_RACE_SERVER_ID in currentStore.serversById;
    const normalServerOrder = currentStore.serverOrder.filter(
      (serverId) => serverId !== CITY_RACE_SERVER_ID
    );

    applyMapStore({
      activeServerId: targetServerId,
      serverOrder: hasSimulationServer
        ? [...normalServerOrder, targetServerId, CITY_RACE_SERVER_ID]
        : [...normalServerOrder, targetServerId],
      serversById: {
        ...currentStore.serversById,
        [targetServerId]: pending.snapshot,
      },
    });
    clearUndoHistory();
    setPendingCaptureImport(null);
    setCaptureNotice({
      tone: "success",
      text: `Imported ${pending.fileName} as ${targetServerId}.`,
    });
  }

  function replaceActiveVersionWithPendingCapture() {
    const pending = pendingCaptureImport;
    if (!pending) return;

    const currentStore = latestStoreRef.current;
    const identity = parseServerVersionId(currentStore.activeServerId);
    if (!identity || identity.serverNumber !== pending.serverNumber) {
      setPendingCaptureImport(null);
      setCaptureNotice({
        tone: "error",
        text: "Select a version of the same server before replacing it.",
      });
      return;
    }

    applyMapStore({
      ...currentStore,
      serversById: {
        ...currentStore.serversById,
        [currentStore.activeServerId]: pending.snapshot,
      },
    });
    clearUndoHistory();
    setPendingCaptureImport(null);
    setCaptureNotice({
      tone: "success",
      text: `Replaced ${currentStore.activeServerId} with ${pending.fileName}.`,
    });
  }

  function switchServer(serverId: string) {
    if (serverId === mapStore.activeServerId || !mapStore.serversById[serverId]) return;

    applyMapStore({
      ...latestStoreRef.current,
      activeServerId: serverId,
    });
    clearUndoHistory();
  }

  function addServer(serverId: string): boolean {
    const serverNumber = normalizeServerNumber(serverId);
    if (!serverNumber) return false;

    const serverVersionId = createServerVersionId(serverNumber, 1);
    if (latestStoreRef.current.serversById[serverVersionId]) return false;

    const hasSimulationServer =
      CITY_RACE_SERVER_ID in latestStoreRef.current.serversById;
    const normalServerOrder = latestStoreRef.current.serverOrder.filter(
      (currentServerId) => currentServerId !== CITY_RACE_SERVER_ID
    );
    const nextStore: MultiServerMapStore = {
      activeServerId: serverVersionId,
      serverOrder: hasSimulationServer
        ? [...normalServerOrder, serverVersionId, CITY_RACE_SERVER_ID]
        : [...normalServerOrder, serverVersionId],
      serversById: {
        ...latestStoreRef.current.serversById,
        [serverVersionId]: createDefaultServerSnapshot(mapConfig, firstTileId),
      },
    };

    applyMapStore(nextStore);
    clearUndoHistory();
    return true;
  }

  function renameActiveServer(serverId: string): boolean {
    const serverNumber = normalizeServerNumber(serverId);
    const { activeServerId, serverOrder, serversById } = latestStoreRef.current;
    const activeIdentity = parseServerVersionId(activeServerId);

    if (!activeIdentity || !serverNumber) return false;
    if (serverNumber === activeIdentity.serverNumber) return true;

    const renamedServerId = createServerVersionId(
      serverNumber,
      activeIdentity.version
    );
    if (serversById[renamedServerId]) return false;

    const activeSnapshot = serversById[activeServerId];
    if (!activeSnapshot) return false;

    const nextServersById = { ...serversById };
    delete nextServersById[activeServerId];
    nextServersById[renamedServerId] = activeSnapshot;

    applyMapStore({
      activeServerId: renamedServerId,
      serverOrder: serverOrder.map((currentServerId) =>
        currentServerId === activeServerId ? renamedServerId : currentServerId
      ),
      serversById: nextServersById,
    });
    clearUndoHistory();
    return true;
  }

  function removeActiveServer() {
    const { activeServerId, serverOrder, serversById } = latestStoreRef.current;
    const normalServers = serverOrder.filter(
      (serverId) => serverId !== CITY_RACE_SERVER_ID
    );
    if (
      activeServerId === CITY_RACE_SERVER_ID ||
      normalServers.length <= 1
    ) {
      return;
    }
    const shouldRemoveServer = window.confirm(
      `Delete server ${activeServerId}? This will remove its saved map, teams, and tile data.`
    );
    if (!shouldRemoveServer) return;

    const activeIndex = serverOrder.indexOf(activeServerId);
    const nextServerOrder = serverOrder.filter((serverId) => serverId !== activeServerId);
    const fallbackServerId =
      nextServerOrder[Math.max(0, activeIndex - 1)] ?? nextServerOrder[0] ?? DEFAULT_SERVER_ID;
    const { [activeServerId]: _removedServer, ...remainingServers } = serversById;

    applyMapStore({
      activeServerId: fallbackServerId,
      serverOrder: nextServerOrder,
      serversById: remainingServers,
    });
    clearUndoHistory();
  }

  function clampMapZoom(value: number) {
    return Math.min(MAX_MAP_ZOOM, Math.max(MIN_MAP_ZOOM, Number(value.toFixed(2))));
  }

  function getFitMapZoom(currentZoom: number): number | null {
    const boardShell = boardRef.current;
    const boardScroller = boardShell?.querySelector<HTMLElement>(".map-board-scroller");
    const boardFrame = boardShell?.querySelector<HTMLElement>(".map-board-frame");

    if (!boardShell || !boardScroller || !boardFrame || currentZoom <= 0) {
      return null;
    }

    const scrollerStyle = window.getComputedStyle(boardScroller);
    const horizontalPadding =
      Number.parseFloat(scrollerStyle.paddingLeft) + Number.parseFloat(scrollerStyle.paddingRight);
    const verticalPadding =
      Number.parseFloat(scrollerStyle.paddingTop) + Number.parseFloat(scrollerStyle.paddingBottom);
    const availableWidth = boardScroller.clientWidth - horizontalPadding;
    const availableHeight = boardScroller.clientHeight - verticalPadding;
    const unscaledWidth = boardFrame.offsetWidth / currentZoom;
    const unscaledHeight = boardFrame.offsetHeight / currentZoom;

    if (availableWidth <= 0 || availableHeight <= 0 || unscaledWidth <= 0 || unscaledHeight <= 0) {
      return null;
    }

    return clampMapZoom(Math.min(availableWidth / unscaledWidth, availableHeight / unscaledHeight));
  }

  function fitMapToView() {
    const nextZoom = getFitMapZoom(mapZoom);
    if (nextZoom === null) return;
    setMapZoom(nextZoom);
  }

  useEffect(() => {
    const animationFrameId = window.requestAnimationFrame(() => {
      const nextZoom = getFitMapZoom(mapZoom);
      if (nextZoom === null) return;
      setMapZoom(nextZoom);
    });

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [activeSeason, mapConfig.columns, mapConfig.rows, panelCollapsed]);

  function switchSeason() {
    void saveStoredMapStore(latestStoreRef.current, activeSeason);
    setActiveSeason(nextSeason);
  }

  const kbdStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "1px 6px",
    borderRadius: 4,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    fontSize: "0.75rem",
    fontFamily: "inherit",
    color: "#c8d4ff",
  };

  return (
    <section className="card map-page">
      <div className="page-title-row">
        <div className="page-title-copy">
          <p className="eyebrow">Planning board</p>
          <h1>Game Map</h1>
        </div>
        <h2 className="season-page-heading">{activeSeasonLabel}</h2>
        <div className="page-header-controls">
          {navigation}
          <button
            className="season-toggle-button"
            type="button"
            onClick={switchSeason}
            title={`Switch to Season ${nextSeason}`}
            aria-label="Switch season"
          >
            Switch to Season {nextSeason}
          </button>
        </div>
      </div>
      <p style={{ margin: 0, fontSize: "0.8rem", color: "#8a9bc0" }}>
        {isSimulationMode ? (
          <>
            {activeServerLabel}. Capture from an edge Level 1 mine, then expand through
            touching tiles. Click an owned tile to choose when to drop it.{" "}
            <kbd style={kbdStyle}>Ctrl+Z</kbd> to undo.
          </>
        ) : (
          <>
            {activeServerLabel}. Click a tile to select it, then use the toolbar to paint
            markers. Right-click a tile to clear it.{" "}
            <kbd style={kbdStyle}>Ctrl+Z</kbd> to undo.
          </>
        )}
      </p>

      <div className="map-toolbar-stack">
        <MapToolbar
          serverIds={mapStore.serverOrder}
          activeServerId={mapStore.activeServerId}
          activeServerNumber={activeServerIdentity?.serverNumber ?? ""}
          simulationServerId={activeSeason === 2 ? CITY_RACE_SERVER_ID : undefined}
          canRemoveActiveServer={canRemoveActiveServer}
          clearMarkerCount={clearMarkerCount}
          selectedMarker={selectedMarker}
          ourTeam={ourTeam}
          rivalTeams={rivalTeams}
          enemyTeams={enemyTeams}
          selectedRivalTeamId={selectedRivalTeamId}
          selectedEnemyTeamId={selectedEnemyTeamId}
          onServerSelect={switchServer}
          onServerAdd={addServer}
          onActiveServerRename={renameActiveServer}
          onActiveServerRemove={removeActiveServer}
          onCaptureImport={openCaptureFilePicker}
          onCaptureExport={exportActiveCapture}
          onMarkerChange={setSelectedMarker}
          onRivalSelect={(id) => patchActiveSnapshot({ selectedRivalTeamId: id })}
          onEnemySelect={(id) => patchActiveSnapshot({ selectedEnemyTeamId: id })}
        />
        <input
          ref={captureFileInputRef}
          className="map-capture-file-input"
          type="file"
          accept=".json,application/json"
          aria-label="Choose game map capture JSON"
          onChange={handleCaptureFileChange}
        />
        {captureNotice ? (
          <p
            className={`map-capture-notice map-capture-notice--${captureNotice.tone}`}
            role={captureNotice.tone === "error" ? "alert" : "status"}
          >
            {captureNotice.text}
          </p>
        ) : null}
      </div>

      <div className={`map-layout${panelCollapsed ? " map-layout--panel-collapsed" : ""}`}>
        <div
          className={`map-board-column${
            isSimulationMode ? " map-board-column--simulation" : ""
          }`}
        >
          {isSimulationMode ? (
            <div className="city-race-board-actions" aria-label="Simulation controls">
              <button
                className="city-race-action-button city-race-action-button--day"
                type="button"
                onClick={resetCurrentSimulationDay}
                disabled={!hasCurrentDayActions}
              >
                <span className="city-race-action-icon" aria-hidden="true">
                  ↺
                </span>
                <span>
                  <strong>Reset Day {simulation.currentDay}</strong>
                  <small>Remove today&apos;s captures and drops</small>
                </span>
              </button>
              <button
                className="city-race-action-button city-race-action-button--undo"
                type="button"
                onClick={undoLastAction}
                disabled={!canUndo}
              >
                <span className="city-race-action-icon" aria-hidden="true">
                  ↶
                </span>
                <span>
                  <strong>Undo Last Action</strong>
                  <small>Restore the previous change · Ctrl+Z</small>
                </span>
              </button>
              <button
                className="city-race-action-button city-race-action-button--reset"
                type="button"
                onClick={resetSimulation}
              >
                <span className="city-race-action-icon" aria-hidden="true">
                  ×
                </span>
                <span>
                  <strong>Reset Simulation</strong>
                  <small>Clear every day, capture, and score</small>
                </span>
              </button>
            </div>
          ) : null}
          <MapBoard
            config={mapConfig}
            tiles={tiles}
            selectedTileId={selectedTileId}
            ourTeam={ourTeam}
            rivalTeams={rivalTeams}
            enemyTeams={enemyTeams}
            simulationStates={simulationStates}
            zoom={mapZoom}
            boardRef={boardRef}
            onTileSelect={(tileId) => patchActiveSnapshot({ selectedTileId: tileId })}
            onTilePaint={paintTile}
            onTileClear={clearTile}
          />
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
            <button
              className="map-zoom-reset"
              type="button"
              onClick={fitMapToView}
              aria-label="Fit map to view"
            >
              Fit
            </button>
          </div>
        </div>

        {isSimulationMode ? (
          <SimulationPanel
            simulation={simulation}
            mapConfig={mapConfig}
            notice={simulationNotice}
            onAdvanceDay={advanceSimulationDay}
            onFinalDayChange={changeSimulationFinalDay}
            onCollapseChange={setPanelCollapsed}
          />
        ) : (
          <ScorePanel
            teamManagementLocked={teamManagementLocked}
            ourTeam={ourTeam}
            rivalTeams={rivalTeams}
            enemyTeams={enemyTeams}
            ourTeamPoints={ourTeamPointSummary}
            rivalPoints={rivalPointSummary}
            enemyPoints={enemyPointSummary}
            onToggleLock={() => setTeamManagementLocked((current) => !current)}
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
            onCollapseChange={setPanelCollapsed}
          />
        )}
      </div>

      {pendingCaptureImport ? (
        <MapCaptureImportDialog
          fileName={pendingCaptureImport.fileName}
          seasonLabel={activeSeasonLabel}
          sourceLabel={`${pendingCaptureImport.serverNumber}-${pendingCaptureImport.sourceVersion}`}
          newVersionLabel={`${pendingCaptureImport.serverNumber}-${pendingCaptureImport.targetVersion}`}
          replaceVersionLabel={
            activeServerIdentity?.serverNumber === pendingCaptureImport.serverNumber
              ? mapStore.activeServerId
              : undefined
          }
          onImportAsVersion={importPendingCaptureAsVersion}
          onReplaceVersion={replaceActiveVersionWithPendingCapture}
          onClose={() => setPendingCaptureImport(null)}
        />
      ) : null}

      {pendingSimulationAction && pendingSimulationTile ? (
        <SimulationTimeDialog
          action={pendingSimulationAction.action}
          day={simulation.currentDay}
          tileName={`${
            pendingSimulationTile.label ??
            (pendingSimulationTile.kind === "copperMine"
              ? "Copper Mine"
              : pendingSimulationTile.kind === "town"
                ? "Town"
                : "Trade Center")
          }${
            typeof pendingSimulationTile.level === "number"
              ? ` · Level ${pendingSimulationTile.level}`
              : ""
          }`}
          time={pendingSimulationAction.time}
          error={simulationDialogError}
          onTimeChange={(value) => {
            setPendingSimulationAction((current) =>
              current ? { ...current, time: value } : current
            );
            setSimulationDialogError(null);
          }}
          onConfirm={confirmSimulationTime}
          onClose={closeSimulationTimeDialog}
        />
      ) : null}
    </section>
  );
}
