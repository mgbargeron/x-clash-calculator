import { useEffect, useMemo } from "react";
import {
  getResolvedAlternatingWeekState,
  type ServerTimePlannerState,
} from "../utils/serverTime";

export function usePlannerAlternatingWeekSync(
  isLoaded: boolean,
  now: Date,
  plannerState: ServerTimePlannerState,
  setPlannerState: (updater: (current: ServerTimePlannerState) => ServerTimePlannerState) => void
) {
  const alternatingWeekState = useMemo(
    () => getResolvedAlternatingWeekState(plannerState, now),
    [plannerState, now]
  );

  useEffect(() => {
    if (!isLoaded) return;

    setPlannerState((current) => {
      const existing = current.alternatingWeekState;

      if (
        existing?.anchorServerDate === alternatingWeekState?.anchorServerDate &&
        existing?.anchorWeek === alternatingWeekState?.anchorWeek &&
        existing?.lastResolvedServerDate === alternatingWeekState?.lastResolvedServerDate &&
        existing?.currentWeek === alternatingWeekState?.currentWeek
      ) {
        return current;
      }

      return {
        ...current,
        alternatingWeekState,
      };
    });
  }, [isLoaded, alternatingWeekState, setPlannerState]);
}