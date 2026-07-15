import { useEffect } from "react";
import type { Season } from "../utils/gameMapConfig";

export function useSeasonPersistence(activeSeason: Season) {
  useEffect(() => {
    try {
      localStorage.setItem("game-map-season", String(activeSeason));
    } catch {
      // Ignore storage errors.
    }
  }, [activeSeason]);
}
