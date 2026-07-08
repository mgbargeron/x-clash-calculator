import { useEffect } from "react";
import type { ServerTimePlannerState } from "../utils/serverTime";

const STORAGE_KEY = "server-time-planner-v1";

export function useServerTimeDataSaver(plannerState: ServerTimePlannerState, isLoaded: boolean) {
  useEffect(() => {
    if (!isLoaded) return;

    const serialized = JSON.stringify(plannerState);
    localStorage.setItem(STORAGE_KEY, serialized);

    if (window.electronAPI.setServerTimeData) {
      void window.electronAPI.setServerTimeData(plannerState);
    }
  }, [isLoaded, plannerState]);
}