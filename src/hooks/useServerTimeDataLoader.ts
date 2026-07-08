type ServerTimePlannerState = import("../utils/serverTime").ServerTimePlannerState;
import { useEffect, useState } from "react";
import {
  DEFAULT_SERVER_TIME_STATE,
  normalizePlannerState,
} from "../utils/serverTime";

const STORAGE_KEY = "server-time-planner-v1";

export function useServerTimeDataLoader(): {
  plannerState: ServerTimePlannerState;
  setPlannerState: React.Dispatch<React.SetStateAction<ServerTimePlannerState>>;
  isLoaded: boolean;
  setIsLoaded: React.Dispatch<React.SetStateAction<boolean>>;
} {
  const [plannerState, setPlannerState] = useState<ServerTimePlannerState>(
    () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") {
            return normalizePlannerState(parsed);
          }
        }
      } catch {
        // ignore parse errors
      }
      return structuredClone(DEFAULT_SERVER_TIME_STATE);
    }
  );
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      let raw: unknown = null;

      if (window.electronAPI.getServerTimeData) {
        try {
          raw = await window.electronAPI.getServerTimeData();
        } catch {
          raw = null;
        }
      }

      if (!raw) {
        try {
          raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
        } catch {
          raw = null;
        }
      }

      if (!cancelled) {
        setPlannerState(normalizePlannerState(raw));
        setIsLoaded(true);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { plannerState, setPlannerState, isLoaded, setIsLoaded };
}