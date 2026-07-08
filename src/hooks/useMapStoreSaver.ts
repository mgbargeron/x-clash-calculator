import { useEffect, useCallback } from "react";

export function useMapStoreSaver(mapStore: unknown, activeSeason: 1 | 2) {
  const handleSave = useCallback(() => {
    const MAP_STORAGE_KEY = "game-map-v2";

    function createSeasonStorageKey(season: 1 | 2): string {
      return `${MAP_STORAGE_KEY}-s${season}`;
    }

    const serialized = JSON.stringify(mapStore);
    localStorage.setItem(createSeasonStorageKey(activeSeason), serialized);

    if (window.electronAPI.setMapData) {
      void window.electronAPI.setMapData(mapStore);
    }
  }, [mapStore, activeSeason]);

  useEffect(() => {
    handleSave();
  }, [handleSave]);
}