import {useEffect, useState} from "react";

import {
  buildServerWeekHours,
  formatLocalDateTime,
  formatServerDay,
  type PlannerEvent,
  type ServerTimeSettings,
  type ServerWeekHour,
  getDriverForDate,
} from "../../utils/serverTime";

const DAY_MS = 24 * 60 * 60 * 1000;

type WeekPanelProps = {
  weekStart: Date;
  now: Date;
  settings: ServerTimeSettings;
  events: PlannerEvent[];
  selectedTimezones: string[];
  onSelectSlot: (slot: ServerWeekHour) => void;
  onEditEvent: (eventId: string) => void;
  onRemoveEvent: (eventId: string) => void;
  onToggleSkipSlot: (eventId: string, serverDate: string) => void;
  onAssignDriver: (eventId: string, serverDate: string, driver: string) => void;
};

function WeekPanel({
  weekStart,
  now,
  settings,
  events,
  selectedTimezones,
  onSelectSlot,
  onEditEvent,
  onRemoveEvent,
  onToggleSkipSlot,
  onAssignDriver,
}: WeekPanelProps) {
  const weekHours = buildServerWeekHours(
    weekStart,
    now,
    settings,
    events,
    selectedTimezones
  );
  const [showAllByDay, setShowAllByDay] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(Array.from({length: 7}, (_, index) => [index, false]))
  );
  const [expandedEventSlots, setExpandedEventSlots] = useState<Record<string, boolean>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isEventVisible = (event: PlannerEvent, serverDate: string): boolean =>
    !event.skippedDates.includes(serverDate);

  const dayHeaders = weekHours.map((dayHours, dayIndex) => ({
    dayIndex,
    label: formatServerDay(dayIndex),
    localDateLabel: formatLocalDateTime(dayHours[0]?.localDate ?? weekStart),
    visibleSlots: (showAllByDay[dayIndex] ? dayHours : dayHours.filter((slot) =>
      slot.matchingEvents.some((e) => isEventVisible(e, slot.serverDate))
    )).length,
  }));
  const eventSlotKeys = weekHours.flat().filter((slot) =>
    slot.matchingEvents.some((e) => isEventVisible(e, slot.serverDate))
  ).map((slot) => slot.key);
  const allEventsExpanded = eventSlotKeys.length > 0 && eventSlotKeys.every((key) => expandedEventSlots[key]);

  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFullscreen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  return (
    <section className={`server-time-panel server-week-panel ${isFullscreen ? "fullscreen" : ""}`}>
      <div className="server-time-panel-header">
        <div>
          <h2>Server Week</h2>
          <small>Every server hour mapped to local time.</small>
        </div>
        <div className="server-time-panel-actions">
          <button
            className="secondary-button server-week-fullscreen-toggle"
            type="button"
            onClick={() => setIsFullscreen((current) => !current)}
            aria-pressed={isFullscreen}
          >
            {isFullscreen ? "Exit Full Screen" : "Full Screen"}
          </button>
          <button
            className="secondary-button server-week-event-expand-toggle"
            type="button"
            onClick={() =>
              setExpandedEventSlots(
                Object.fromEntries(eventSlotKeys.map((key) => [key, !allEventsExpanded]))
              )
            }
            disabled={eventSlotKeys.length === 0}
          >
            {allEventsExpanded ? "Collapse All Events" : "Expand All Events"}
          </button>
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
                <small>{header.localDateLabel} · {header.visibleSlots} visible</small>
              </div>
              <div className="server-week-day-scroll">
                {(showAllByDay[header.dayIndex]
                  ? weekHours[header.dayIndex]
                  : weekHours[header.dayIndex].filter((slot) =>
                      slot.matchingEvents.some(
                        (event) => event.enabled && !event.skippedDates.includes(slot.serverDate)
                      )
                    )
                ).map((slot) => (
                  <DayCell
                    key={slot.key}
                    slot={slot}
                    isExpanded={Boolean(expandedEventSlots[slot.key])}
                    selectedTimezones={selectedTimezones}
                    onSelectSlot={onSelectSlot}
                    onEditEvent={onEditEvent}
                    onRemoveEvent={onRemoveEvent}
                    onToggleSkipSlot={onToggleSkipSlot}
                    onToggleExpanded={(nextOpen) =>
                      setExpandedEventSlots((current) => ({
                        ...current,
                        [slot.key]: nextOpen,
                      }))
                    }
                    onAssignDriver={onAssignDriver}
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
  isExpanded: boolean;
  selectedTimezones: string[];
  onSelectSlot: (slot: ServerWeekHour) => void;
  onEditEvent: (eventId: string) => void;
  onRemoveEvent: (eventId: string) => void;
  onToggleSkipSlot: (eventId: string, serverDate: string) => void;
  onAssignDriver: (eventId: string, serverDate: string, driver: string) => void;
  onToggleExpanded: (nextOpen: boolean) => void;
};

function DayCell({slot, isExpanded, selectedTimezones, onSelectSlot, onEditEvent, onRemoveEvent, onToggleSkipSlot, onToggleExpanded, onAssignDriver}: DayCellProps) {
  const filteredEvents = slot.matchingEvents.filter((event) => !event.skippedDates.includes(slot.serverDate));
  const hasEvent = filteredEvents.length > 0;

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
          <span className="server-week-server-time">
            <span>Server</span>
            <strong>{slot.serverLabel}</strong>
          </span>
          <span className="server-week-local-time">
            <span>Local</span>
            <strong>{slot.localLabel}</strong>
          </span>
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
      {filteredEvents.length > 0 ? (
        <details
          className="server-week-events-dropdown"
          open={isExpanded}
          onToggle={(event) => onToggleExpanded(event.currentTarget.open)}
        >
          <summary>
            <span>Show {filteredEvents.length} event{filteredEvents.length === 1 ? "" : "s"}</span>
            <span className="server-week-events-toggle-icon" aria-hidden="true">▾</span>
          </summary>
          <div className="server-week-events-list">
            {filteredEvents.map((event) => (
              <div className="server-week-event-row" key={event.id}>
                <div className="server-week-event-row-header">
                  <div className="server-week-event-title">
                    <strong>{event.name || "Unnamed event"}</strong>
                    <span>{event.serverTime}</span>
                  </div>
                  <div className="event-row-actions">
                    <button
                      className="event-edit-btn"
                      type="button"
                      onClick={(clickEvent) => {
                        clickEvent.preventDefault();
                        clickEvent.stopPropagation();
                        onEditEvent(event.id);
                      }}
                    >
                      Edit
                    </button>
                    {slot.serverDate && event.type !== "oneTime" ? (
                      <button
                        className="event-skip"
                        type="button"
                        title="Skip this date"
                        onClick={(clickEvent) => {
                          clickEvent.preventDefault();
                          clickEvent.stopPropagation();
                          onToggleSkipSlot(event.id, slot.serverDate);
                        }}
                      >
                        Skip
                      </button>
                    ) : null}
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
                </div>

                {event.hasCrew && event.crewRoster.length > 0 ? (
                  <div className="server-week-crew-row">
                    <span className="crew-label">Driver:</span>
                    <select
                      className="cell-input crew-driver-select"
                      value={(() => {
                        const override = event.crewAssignmentOverrides[slot.serverDate];
                        if (override) return override;
                        const info = getDriverForDate(event, slot.serverDate);
                        return info ? info.driver : "";
                      })()}
                      onChange={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onAssignDriver(event.id, slot.serverDate, e.target.value);
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      {event.crewRoster.map((member) => (
                        <option key={member} value={member}>
                          {member}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function shortTimezoneLabel(timezone: string): string {
  const parts = timezone.split("/");
  return parts[parts.length - 1]?.replace(/_/g, " ") ?? timezone;
}

export default function ServerWeekView({
  weekStart,
  now,
  settings,
  events,
  selectedTimezones,
  onSelectSlot,
  onEditEvent,
  onRemoveEvent,
  onToggleSkipSlot,
  onAssignDriver,
}: {
  weekStart: Date;
  now: Date;
  settings: ServerTimeSettings;
  events: PlannerEvent[];
  selectedTimezones: string[];
  onSelectSlot: (slot: ServerWeekHour) => void;
  onEditEvent: (eventId: string) => void;
  onRemoveEvent: (eventId: string) => void;
  onToggleSkipSlot: (eventId: string, serverDate: string) => void;
  onAssignDriver: (eventId: string, serverDate: string, driver: string) => void;
}) {
  const weeksToShow = [0, -1, -2, -3, -4];

  return (
    <section className="server-time-panel server-week-panel">
      <div className="server-time-panel-header" style={{marginBottom: "1rem"}}>
        <div>
          <h2>Server Weeks</h2>
          <small>Click a calendar slot to create an event.</small>
        </div>
      </div>
      {weeksToShow.map((offset) => {
        const weekOffsetStart = new Date(weekStart.getTime() + offset * 7 * DAY_MS);
        const weekOffsetEnd = new Date(weekOffsetStart.getTime() + 6 * DAY_MS);
        const weekLabel = `${formatLocalDateTime(weekOffsetStart)}-${formatLocalDateTime(weekOffsetEnd)}`;
        const isCurrentWeek = offset === 0;
        const weekLabelWithSuffix = isCurrentWeek ? `${weekLabel} (Current Week)` : weekLabel;

        return (
          <div key={offset} style={{marginBottom: "2rem", paddingBottom: "2rem", borderBottom: "1px solid rgba(255, 255, 255, 0.1)"}}>
            <div className="server-time-panel-header" style={{marginBottom: "0.5rem"}}>
              <h3>{weekLabelWithSuffix}</h3>
            </div>
            <WeekPanel
              weekStart={weekOffsetStart}
              now={now}
              settings={settings}
              events={events}
              selectedTimezones={selectedTimezones}
              onSelectSlot={onSelectSlot}
              onEditEvent={onEditEvent}
              onRemoveEvent={onRemoveEvent}
              onToggleSkipSlot={onToggleSkipSlot}
              onAssignDriver={onAssignDriver}
            />
          </div>
        );
      })}
    </section>
  );
}
