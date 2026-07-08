import { useEffect, useRef, useState } from "react";

import {
  createPlannerEvent,
  formatLocalDateTime,
  formatServerDay,
  sanitizeDateInput,
  sanitizeTimeInput,
  type PlannerEvent,
  type ServerTimePlannerState,
  type ServerWeekHour,
} from "../../utils/serverTime";

type EventPlannerDialogProps = {
  open: boolean;
  slot: ServerWeekHour | null;
  event: PlannerEvent | null;
  plannerState: ServerTimePlannerState;
  onClose: () => void;
  onSave: (event: PlannerEvent) => void;
};

export default function EventPlannerDialog({
  open,
  slot,
  event: editingEvent,
  plannerState,
  onClose,
  onSave,
}: EventPlannerDialogProps) {
  const [draft, setDraft] = useState<PlannerEvent | null>(null);
  const [skipChecked, setSkipChecked] = useState(false);
  const prevOpenRef = useRef(open);
  const prevEventRef = useRef(editingEvent);
  const prevSlotRef = useRef(slot);

  useEffect(() => {
    if (prevOpenRef.current === open) return;
    prevOpenRef.current = open;

    if (!open) {
      setDraft(null);
      return;
    }

    prevEventRef.current = editingEvent;
    prevSlotRef.current = slot;

    const newDraft = buildDraft(editingEvent, slot, plannerState);
    if (newDraft) {
      setDraft(newDraft);
      if (slot && newDraft.type !== "oneTime") {
        setSkipChecked(newDraft.skippedDates.includes(slot.serverDate));
      }
    }
  }, [open, editingEvent, slot, plannerState]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  function buildDraft(event: PlannerEvent | null, slot: ServerWeekHour | null, state: ServerTimePlannerState): PlannerEvent | null {
    if (!open || (!event && !slot)) return null;

    if (event) {
      return {
        ...event,
        alarmEnabled: false,
      };
    }

    if (slot) {
      return createPlannerEvent(state.settings.defaultAlarmLeadMinutes, {
        type: "oneTime",
        serverDayOfWeek: slot.serverDayOfWeek,
        serverTime: `${String(slot.serverHour).padStart(2, "0")}:00`,
        oneTimeServerDate: slot.serverDate,
        alternatingWeek: state.alternatingWeekState?.currentWeek ?? "A",
        alternatingAnchorDate: slot.serverDate,
        alarmEnabled: false,
      });
    }

    return null;
  }

  if (!open || !draft) return null;
  const currentDraft = draft;

  const title = editingEvent ? "Edit Event" : `Plan Event For ${formatServerDay(currentDraft.serverDayOfWeek)} ${currentDraft.serverTime}`;
  const slotSummary = slot
    ? `Server ${formatServerDay(slot.serverDayOfWeek)} ${slot.serverLabel} · ${slot.serverDate}`
    : currentDraft.type === "oneTime" && currentDraft.oneTimeServerDate
      ? `Server ${currentDraft.oneTimeServerDate} ${currentDraft.serverTime}`
      : `${formatServerDay(currentDraft.serverDayOfWeek)} ${currentDraft.serverTime}`;
  const localSummary = slot ? formatLocalDateTime(slot.localDate) : null;

  function updateDraft(updater: (current: PlannerEvent) => PlannerEvent) {
    setDraft((current) => (current ? updater(current) : current));
  }

  function submit() {
    let eventToSave = {
      ...currentDraft,
      name: currentDraft.name.trim(),
      alarmEnabled: false,
      oneTimeServerDate: sanitizeDateInput(currentDraft.oneTimeServerDate),
      serverTime: sanitizeTimeInput(currentDraft.serverTime),
    };

    if (slot && eventToSave.type !== "oneTime") {
      const dates = skipChecked
        ? [...eventToSave.skippedDates, slot.serverDate]
        : eventToSave.skippedDates.filter((d) => d !== slot.serverDate);
      eventToSave = {
        ...eventToSave,
        skippedDates: dates,
      };
    }

    onSave(eventToSave);
  }

  const isRecurringEvent = currentDraft.type !== "oneTime";

  return (
    <div className="event-dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="event-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(mouseEvent) => mouseEvent.stopPropagation()}
      >
        <div className="event-dialog-header">
          <div>
            <p className="eyebrow">Event Planner</p>
            <h2>{title}</h2>
            <p className="description">
              {slotSummary}
              {localSummary ? ` · Local ${localSummary}` : ""}
            </p>
          </div>
          <button className="secondary-button" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="event-dialog-form">
          <label className="server-time-field">
            <span>Name</span>
            <input
              className="cell-input"
              type="text"
              placeholder="Event name"
              value={currentDraft.name}
              onChange={(inputEvent) =>
                updateDraft((current) => ({
                  ...current,
                  name: inputEvent.target.value,
                }))
              }
            />
          </label>

          <div className="event-dialog-grid">
            <label className="server-time-field">
              <span>Type</span>
              <select
                className="cell-input"
                value={currentDraft.type}
                onChange={(inputEvent) =>
                  updateDraft((current) => ({
                    ...current,
                    type: normalizeEventType(inputEvent.target.value),
                  }))
                }
              >
                <option value="oneTime">One Time</option>
                <option value="daily">Daily</option>
                <option value="alternating">Every Other Day</option>
                <option value="weekly">Weekly</option>
              </select>
            </label>

            <label className="server-time-field">
              <span>Server Time (24h)</span>
              <input
                className="cell-input"
                type="text"
                inputMode="numeric"
                pattern="[0-2][0-9]:[0-5][0-9]"
                placeholder="HH:mm"
                maxLength={5}
                value={currentDraft.serverTime}
                onChange={(inputEvent) =>
                  updateDraft((current) => ({
                    ...current,
                    serverTime: sanitizeTimeInput(inputEvent.target.value),
                  }))
                }
              />
            </label>

            {currentDraft.type === "oneTime" ? (
              <label className="server-time-field">
                <span>Server Date</span>
                <input
                  className="cell-input"
                  type="date"
                  value={currentDraft.oneTimeServerDate}
                  onChange={(inputEvent) =>
                    updateDraft((current) => ({
                      ...current,
                      oneTimeServerDate: sanitizeDateInput(inputEvent.target.value),
                    }))
                  }
                />
              </label>
            ) : null}

            {currentDraft.type === "weekly" ? (
              <label className="server-time-field">
                <span>Server Day</span>
                <select
                  className="cell-input"
                  value={currentDraft.serverDayOfWeek}
                  onChange={(inputEvent) =>
                    updateDraft((current) => ({
                      ...current,
                      serverDayOfWeek: Number(inputEvent.target.value),
                    }))
                  }
                >
                  {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                    <option key={day} value={day}>
                      {formatServerDay(day)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

          </div>

          <label className="server-time-field">
            <span>Note</span>
            <textarea
              className="cell-input event-dialog-textarea"
              placeholder="Optional note"
              value={currentDraft.note}
              onChange={(inputEvent) =>
                updateDraft((current) => ({
                  ...current,
                  note: inputEvent.target.value,
                }))
              }
            />
          </label>

          <div className="event-dialog-toggles">
            <label className="server-time-toggle">
              <input
                type="checkbox"
                checked={currentDraft.enabled}
                onChange={(inputEvent) =>
                  updateDraft((current) => ({
                    ...current,
                    enabled: inputEvent.target.checked,
                  }))
                }
              />
              <span>Enabled</span>
            </label>

            {isRecurringEvent && slot ? (
              <label className="server-time-toggle">
                <input
                  type="checkbox"
                  checked={skipChecked}
                  onChange={(inputEvent) => setSkipChecked(inputEvent.target.checked)}
                />
                <span>Skipped for this date</span>
              </label>
            ) : null}
          </div>
        </div>

        <div className="event-dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="secondary-button" type="button" onClick={submit}>
            Save Event
          </button>
        </div>
      </div>
    </div>
  );
}

function normalizeEventType(value: string): PlannerEvent["type"] {
  if (value === "oneTime" || value === "daily" || value === "alternating" || value === "weekly") {
    return value;
  }

  return "daily";
}