import { useEffect } from "react";
import { createPlannerEvent, type PlannerEvent, type ServerTimePlannerState, type ServerWeekHour } from "../utils/serverTime";

export function useDialogDraftSync(
  open: boolean,
  editingEvent: PlannerEvent | null,
  slot: ServerWeekHour | null,
  plannerState: ServerTimePlannerState,
  setDraft: (draft: PlannerEvent | null) => void,
  setSkipChecked: (checked: boolean) => void
) {
  useEffect(() => {
    if (!open) {
      setDraft(null);
      setSkipChecked(false);
      return;
    }

    setDraft(newDraft(editingEvent, slot, plannerState));
    if (slot && plannerState.alternatingWeekState) {
      setSkipChecked(editingEvent && editingEvent.type !== "oneTime"
        ? editingEvent.skippedDates.includes(slot.serverDate)
        : false
      );
    }
  }, [open, editingEvent, slot, plannerState, setDraft, setSkipChecked]);
}

function newDraft(
  event: PlannerEvent | null,
  slot: ServerWeekHour | null,
  state: ServerTimePlannerState
): PlannerEvent {
  if (event) {
    return { ...event, alarmEnabled: false };
  }

  if (slot) {
    return createPlannerEvent(state.settings.defaultAlarmLeadMinutes, {
      type: "oneTime",
      serverDayOfWeek: slot.serverDayOfWeek,
      serverTime: slot.serverLabel,
      oneTimeServerDate: slot.serverDate,
      alternatingWeek: state.alternatingWeekState?.currentWeek ?? "A",
      alternatingAnchorDate: slot.serverDate,
    });
  }

  return createPlannerEvent(state.settings.defaultAlarmLeadMinutes);
}
