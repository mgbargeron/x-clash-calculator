import {useState} from "react";

import {
  buildServerWeekHours,
  formatLocalDateTime,
  formatServerDay,
  type AlternatingWeekState,
  type PlannerEvent,
  type ServerTimeSettings,
  type ServerWeekHour,
} from "../../utils/serverTime";

type ServerWeekViewProps = {
  weekStart: Date;
  now: Date;
  settings: ServerTimeSettings;
  events: PlannerEvent[];
  selectedTimezones: string[];
  alternatingWeekState: AlternatingWeekState | null;
  onSelectSlot: (slot: ServerWeekHour) => void;
  onRemoveEvent: (eventId: string) => void;
};

export default function ServerWeekView({
  weekStart,
  now,
  settings,
  events,
  selectedTimezones,
  alternatingWeekState,
  onSelectSlot,
  onRemoveEvent,
}: ServerWeekViewProps) {
  const weekHours = buildServerWeekHours(
    weekStart,
    now,
    settings,
    events,
    selectedTimezones,
    alternatingWeekState
  );
  const [showAllByDay, setShowAllByDay] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(Array.from({length: 7}, (_, index) => [index, false]))
  );
  const dayHeaders = weekHours.map((dayHours, dayIndex) => ({
    dayIndex,
    label: formatServerDay(dayIndex),
    localDateLabel: formatLocalDateTime(dayHours[0]?.localDate ?? weekStart),
    visibleSlots: (showAllByDay[dayIndex] ? dayHours : dayHours.filter((slot) => slot.matchingEvents.length > 0)).length,
  }));

  return (
    <section className="server-time-panel">
      <div className="server-time-panel-header">
        <div>
          <h2>Server Week</h2>
          <small>Sunday through Saturday, with every server hour mapped to local time.</small>
        </div>
      </div>

      <div className="server-week-view">
        <div className="server-week-columns">
          {dayHeaders.map((header) => (
            <div className="server-week-day-column" key={header.dayIndex}>
              <div className="server-week-day-header">
                <div className="server-week-day-header-top">
                  <strong>{header.label}</strong>
                  <button
                    className={`server-week-day-toggle ${showAllByDay[header.dayIndex] ? "expanded" : ""}`}
                    type="button"
                    onClick={() =>
                      setShowAllByDay((current) => ({
                        ...current,
                        [header.dayIndex]: !current[header.dayIndex],
                      }))
                    }
                    aria-label={showAllByDay[header.dayIndex] ? `Show only event hours for ${header.label}` : `Show all hours for ${header.label}`}
                  >
                    <span className="server-week-day-toggle-label">
                      {showAllByDay[header.dayIndex] ? "All hours" : "Event hours"}
                    </span>
                    <span className="server-week-day-toggle-icon" aria-hidden="true">▾</span>
                  </button>
                </div>
                <small>{header.localDateLabel}</small>
                <small>{header.visibleSlots} visible</small>
              </div>
              <div className="server-week-day-scroll">
                {(showAllByDay[header.dayIndex]
                  ? weekHours[header.dayIndex]
                  : weekHours[header.dayIndex].filter((slot) => slot.matchingEvents.length > 0)
                ).map((slot) => (
                  <DayCell
                    key={slot.key}
                    slot={slot}
                    selectedTimezones={selectedTimezones}
                    onSelectSlot={onSelectSlot}
                    onRemoveEvent={onRemoveEvent}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

type DayCellProps = {
  slot: ServerWeekHour;
  selectedTimezones: string[];
  onSelectSlot: (slot: ServerWeekHour) => void;
  onRemoveEvent: (eventId: string) => void;
};

function DayCell({slot, selectedTimezones, onSelectSlot, onRemoveEvent}: DayCellProps) {
  const hasEvent = slot.matchingEvents.length > 0;

  return (
    <div
      className={`server-week-cell ${slot.isCurrentHour ? "current" : ""} ${hasEvent ? "has-event" : ""}`}
      title={`${formatServerDay(slot.serverDayOfWeek)} ${slot.serverLabel} -> ${formatLocalDateTime(slot.localDate)}`}
    >
      <button
        className="server-week-slot-button"
        type="button"
        onClick={() => onSelectSlot(slot)}
      >
        <div className="server-week-cell-top">
          <strong>{slot.serverLabel}</strong>
          <span>{slot.localLabel}</span>
        </div>
        {selectedTimezones.length > 0 ? (
          <div className="server-week-timezones">
            {selectedTimezones.slice(0, 3).map((timezone) => (
              <div className="server-week-timezone" key={timezone}>
                <span>{shortTimezoneLabel(timezone)}</span>
                <strong>{slot.timezoneLabels[timezone]}</strong>
              </div>
            ))}
          </div>
        ) : null}
      </button>
      {slot.matchingEvents.length > 0 ? (
        <details className="server-week-events-dropdown">
          <summary>
            <span>Show {slot.matchingEvents.length} event{slot.matchingEvents.length === 1 ? "" : "s"}</span>
            <span className="server-week-events-toggle-icon" aria-hidden="true">▾</span>
          </summary>
          <div className="server-week-events-list">
            {slot.matchingEvents.map((event) => (
              <div className="server-week-event-row" key={event.id}>
                <div className="server-week-event-row-header">
                  <strong>{event.name || "Unnamed event"}</strong>
                  <button
                    className="server-week-event-remove"
                    type="button"
                    aria-label={`Remove ${event.name || "event"}`}
                    onClick={(clickEvent) => {
                      clickEvent.preventDefault();
                      clickEvent.stopPropagation();

                      if (window.confirm(`Remove "${event.name || "Unnamed event"}"?`)) {
                        onRemoveEvent(event.id);
                      }
                    }}
                  >
                    ×
                  </button>
                </div>
                <span>{event.serverTime}</span>
              </div>
            ))}
          </div>
        </details>
      ) : (
        <div className="server-week-events server-week-events--empty">
          <span>No events</span>
        </div>
      )}
    </div>
  );
}

function shortTimezoneLabel(timezone: string): string {
  const parts = timezone.split("/");
  return parts[parts.length - 1]?.replace(/_/g, " ") ?? timezone;
}
