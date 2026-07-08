import { useEffect } from "react";

export function useSeasonPersistence(activeSeason: 1 | 2) {
  useEffect(() => {
    try {
      localStorage.setItem("game-map-season", String(activeSeason));
    } catch {
      // Ignore storage errors.
    }
  }, [activeSeason]);
}