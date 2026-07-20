import { useEffect, useCallback } from "react";
import type { Season } from "../utils/gameMapConfig";

export function useMapStoreSaver(mapStore: unknown, activeSeason: Season, enabled = true) {
  const handleSave = useCallback(() => {
    if (!enabled) return;

    const MAP_STORAGE_KEY = "game-map-season";

    function createSeasonStorageKey(season: Season): string {
      return `${MAP_STORAGE_KEY}-${season}`;
    }

    const serialized = JSON.stringify(mapStore);
    localStorage.setItem(createSeasonStorageKey(activeSeason), serialized);

    if (window.electronAPI.setMapData) {
      void window.electronAPI.setMapData(mapStore, activeSeason);
    }
  }, [mapStore, activeSeason, enabled]);

  useEffect(() => {
    handleSave();
  }, [handleSave]);
}
