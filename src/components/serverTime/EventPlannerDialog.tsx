import { useState } from "react";

import {
  formatLocalDateTime,
  formatServerDay,
  sanitizeDateInput,
  sanitizeTimeInput,
  type PlannerEvent,
  type ServerTimePlannerState,
  type ServerWeekHour,
} from "../../utils/serverTime";
import { useEscapeClose } from "../../hooks/useEscapeClose";
import { useDialogDraftSync } from "../../hooks/useDialogDraftSync";

type TimeOption = { value: string; label: string };

const TIME_OPTIONS: TimeOption[] = Array.from({length: 96}, (_, i) => {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  return { value: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`, label: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}` };
});

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
  const [newCrewMember, setNewCrewMember] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEscapeClose(open, onClose);
  useDialogDraftSync(open, editingEvent, slot, plannerState, setDraft, setSkipChecked);

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

  function addCrewMember() {
    const name = newCrewMember.trim();
    if (name && draft && !draft.crewRoster.includes(name)) {
      setDraft((current) =>
        current
          ? { ...current, crewRoster: [...current.crewRoster, name] }
          : current
      );
      setNewCrewMember("");
    }
  }

  function removeCrewMember(name: string) {
    setDraft((current) =>
      current
        ? {
            ...current,
            crewRoster: current.crewRoster.filter((n) => n !== name),
            crewAssignmentOverrides: Object.entries(current.crewAssignmentOverrides).reduce<Record<string, string>>((acc, [k, v]) => {
              if (v !== name) acc[k] = v;
              return acc;
            }, {}),
          }
        : current
    );
  }

  function onDragStart(index: number) {
    setDraggedIndex(index);
  }

  function onDragOver(index: number) {
    if (draft && draggedIndex !== null && draggedIndex !== index) {
      setDraft((current) =>
        current
          ? {
              ...current,
              crewRoster: reorderArray(current.crewRoster, draggedIndex, index),
            }
          : current
      );
      setDraggedIndex(index);
    }
  }

  function onDragEnd() {
    setDraggedIndex(null);
  }

  function reorderArray<T>(array: T[], from: number, to: number): T[] {
    const result = Array.from(array);
    const [item] = result.splice(from, 1);
    result.splice(to, 0, item);
    return result;
  }

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
              <select
                className="cell-input"
                value={currentDraft.serverTime}
                onChange={(inputEvent) =>
                  updateDraft((current) => ({
                    ...current,
                    serverTime: inputEvent.target.value,
                  }))
                }
              >
                {TIME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
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

            {isRecurringEvent ? (
              <label className="server-time-field">
                <span>Start Date</span>
                <input
                  className="cell-input"
                  type="date"
                  value={currentDraft.startDate}
                  onChange={(inputEvent) =>
                    updateDraft((current) => ({
                      ...current,
                      startDate: sanitizeDateInput(inputEvent.target.value),
                    }))
                  }
                />
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

          <div className="crew-section">
            <label className="server-time-toggle">
              <input
                type="checkbox"
                checked={currentDraft.hasCrew}
                onChange={(inputEvent) =>
                  updateDraft((current) => ({
                    ...current,
                    hasCrew: inputEvent.target.checked,
                    crewRoster: inputEvent.target.checked ? current.crewRoster : [],
                    crewAssignmentOverrides: {},
                  }))
                }
              />
              <span>Rotating Crew</span>
            </label>

            {currentDraft.hasCrew ? (
              <>
                <div className="crew-roster-list">
                  {currentDraft.crewRoster.map((member, index) => (
                    <div
                      className={`crew-roster-item ${draggedIndex === index ? "dragging" : ""}`}
                      key={`${member}-${index}`}
                      draggable
                      onDragStart={() => onDragStart(index)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        onDragOver(index);
                      }}
                      onDragEnd={onDragEnd}
                    >
                      <span className="crew-roster-drag-handle">⠿</span>
                      <span>{member}</span>
                      <button
                        type="button"
                        className="secondary-button crew-remove-btn"
                        onClick={() => removeCrewMember(member)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="crew-add-row">
                  <input
                    className="cell-input"
                    type="text"
                    placeholder="Add crew member..."
                    value={newCrewMember}
                    onChange={(inputEvent) => setNewCrewMember(inputEvent.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCrewMember();
                      }
                    }}
                  />
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={addCrewMember}
                  >
                    Add
                  </button>
                </div>
              </>
            ) : null}
          </div>

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