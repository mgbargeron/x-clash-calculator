import {
  buildServerWeekHours,
  formatLocalDateTime,
  formatServerDay,
  type PlannerEvent,
  type ServerTimeSettings,
} from "../../utils/serverTime";

type ServerWeekViewProps = {
  weekStart: Date;
  now: Date;
  settings: ServerTimeSettings;
  events: PlannerEvent[];
  selectedTimezones: string[];
};

export default function ServerWeekView({
  weekStart,
  now,
  settings,
  events,
  selectedTimezones,
}: ServerWeekViewProps) {
  const weekHours = buildServerWeekHours(weekStart, now, settings, events, selectedTimezones);
  const dayHeaders = weekHours.map((dayHours, dayIndex) => ({
    dayIndex,
    label: formatServerDay(dayIndex),
    localDateLabel: formatLocalDateTime(dayHours[0]?.localDate ?? weekStart),
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
                <strong>{header.label}</strong>
                <small>{header.localDateLabel}</small>
              </div>
              <div className="server-week-day-scroll">
                {weekHours[header.dayIndex].map((slot) => (
                  <DayCell
                    key={slot.key}
                    slot={slot}
                    selectedTimezones={selectedTimezones}
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
  slot: ReturnType<typeof buildServerWeekHours>[number][number];
  selectedTimezones: string[];
};

function DayCell({slot, selectedTimezones}: DayCellProps) {
  return (
    <div
      className={`server-week-cell ${slot.isCurrentHour ? "current" : ""}`}
      title={`${formatServerDay(slot.serverDayOfWeek)} ${slot.serverLabel} -> ${formatLocalDateTime(slot.localDate)}`}
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
      {slot.matchingEvents.length > 0 ? (
        <div className="server-week-events">
          {slot.matchingEvents.slice(0, 3).map((event) => (
            <span className="server-week-event-chip" key={event.id}>
              {event.name || "Unnamed"} {event.serverTime}
            </span>
          ))}
          {slot.matchingEvents.length > 3 ? (
            <span className="server-week-event-chip muted">+{slot.matchingEvents.length - 3}</span>
          ) : null}
        </div>
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
