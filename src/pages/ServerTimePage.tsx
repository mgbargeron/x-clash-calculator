import {useEffect, useMemo, useRef, useState, type ReactNode} from "react";

import {
  CURATED_TIMEZONES,
  DEFAULT_SERVER_TIME_STATE,
  createPlannerEvent,
  formatDuration,
  formatLocalDateTime,
  formatNowInZone,
  formatServerClock,
  formatServerDay,
  formatTimeInZone,
  getNextEventOccurrence,
  getServerContext,
  normalizePlannerState,
  sanitizeTimeInput,
  type PlannerEvent,
  type ServerTimePlannerState,
} from "../utils/serverTime";

const STORAGE_KEY = "server-time-planner-v1";
const MAX_TIMEZONES = 6;

type ServerTimePageProps = {
  navigation: ReactNode;
};

type UpcomingAlarm = {
  event: PlannerEvent;
  alarmKey: string;
  triggerAt: Date;
  occurrence: Date;
};

export default function ServerTimePage({navigation}: ServerTimePageProps) {
  const [plannerState, setPlannerState] = useState<ServerTimePlannerState>(DEFAULT_SERVER_TIME_STATE);
  const [isLoaded, setIsLoaded] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const lastNotifiedAlarmRef = useRef<string | null>(null);

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

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    const serialized = JSON.stringify(plannerState);
    localStorage.setItem(STORAGE_KEY, serialized);

    if (window.electronAPI.setServerTimeData) {
      void window.electronAPI.setServerTimeData(plannerState);
    }
  }, [isLoaded, plannerState]);

  const localTimezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Local",
    []
  );

  const serverContext = useMemo(
    () => getServerContext(now, plannerState.settings),
    [now, plannerState.settings]
  );

  const eventRows = useMemo(() => {
    return plannerState.events.map((event) => {
      const nextOccurrence = getNextEventOccurrence(event, now, plannerState.settings);
      const alarmKey = `${event.id}:${nextOccurrence.toISOString()}`;
      return {
        event,
        nextOccurrence,
        countdown: formatDuration(nextOccurrence.getTime() - now.getTime()),
        alarmKey,
      };
    });
  }, [now, plannerState.events, plannerState.settings]);

  const upcomingAlarm = useMemo<UpcomingAlarm | null>(() => {
    if (plannerState.settings.alarmsMuted) return null;

    const candidates = eventRows
      .filter(({event}) => event.enabled && event.alarmEnabled)
      .map(({event, nextOccurrence, alarmKey}) => ({
        event,
        alarmKey,
        occurrence: nextOccurrence,
        triggerAt: new Date(nextOccurrence.getTime() - event.alarmLeadMinutes * 60_000),
      }))
      .filter(({triggerAt, alarmKey}) =>
        triggerAt.getTime() <= now.getTime() &&
        !plannerState.acknowledgedAlarmKeys.includes(alarmKey)
      )
      .sort((a, b) => a.occurrence.getTime() - b.occurrence.getTime());

    return candidates[0] ?? null;
  }, [eventRows, now, plannerState.acknowledgedAlarmKeys, plannerState.settings.alarmsMuted]);

  useEffect(() => {
    if (!upcomingAlarm) return;
    if (lastNotifiedAlarmRef.current === upcomingAlarm.alarmKey) return;

    lastNotifiedAlarmRef.current = upcomingAlarm.alarmKey;

    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      try {
        new Notification("Server event coming up", {
          body: `${upcomingAlarm.event.name || "Unnamed event"} starts at ${formatLocalDateTime(upcomingAlarm.occurrence)}.`,
        });
      } catch {
        // Ignore Notification API issues.
      }
    }
  }, [upcomingAlarm]);

  function updateSettings(
    updater: (current: ServerTimePlannerState["settings"]) => ServerTimePlannerState["settings"]
  ) {
    setPlannerState((current) => ({
      ...current,
      settings: updater(current.settings),
    }));
  }

  function updateEvent(eventId: string, updater: (current: PlannerEvent) => PlannerEvent) {
    setPlannerState((current) => ({
      ...current,
      events: current.events.map((event) => (event.id === eventId ? updater(event) : event)),
    }));
  }

  function acknowledgeAlarm(alarmKey: string) {
    setPlannerState((current) => ({
      ...current,
      acknowledgedAlarmKeys: current.acknowledgedAlarmKeys.includes(alarmKey)
        ? current.acknowledgedAlarmKeys
        : [...current.acknowledgedAlarmKeys, alarmKey],
    }));
  }

  function addEvent() {
    setPlannerState((current) => ({
      ...current,
      events: [...current.events, createPlannerEvent(current.settings.defaultAlarmLeadMinutes)],
    }));
  }

  function removeEvent(eventId: string) {
    setPlannerState((current) => ({
      ...current,
      events: current.events.filter((event) => event.id !== eventId),
      acknowledgedAlarmKeys: current.acknowledgedAlarmKeys.filter((key) => !key.startsWith(`${eventId}:`)),
    }));
  }

  function toggleTimezone(timezone: string) {
    updateSettings((current) => {
      const exists = current.extraTimezones.includes(timezone);
      if (exists) {
        return {
          ...current,
          extraTimezones: current.extraTimezones.filter((value) => value !== timezone),
        };
      }

      if (current.extraTimezones.length >= MAX_TIMEZONES) return current;
      return {
        ...current,
        extraTimezones: [...current.extraTimezones, timezone],
      };
    });
  }

  const groupedTimezones = useMemo(() => {
    return CURATED_TIMEZONES.reduce<Record<string, typeof CURATED_TIMEZONES>>((groups, zone) => {
      groups[zone.region] ??= [];
      groups[zone.region].push(zone);
      return groups;
    }, {});
  }, []);

  return (
    <section className="card calculator server-time-page">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Server planning</p>
          <h1>Server Time Dashboard</h1>
          <p className="description">
            Keep reset timing, shared timezone references, and event alarms in one view.
          </p>
        </div>
        {navigation}
      </div>

      <div className="server-time-summary">
        <div className="server-time-stat">
          <span className="server-time-stat-label">Local Time</span>
          <strong>{now.toLocaleTimeString()}</strong>
          <small>{localTimezone}</small>
        </div>
        <div className="server-time-stat">
          <span className="server-time-stat-label">Server Time</span>
          <strong>{formatServerClock(serverContext.serverMinutes)}</strong>
          <small>
            Server `00:00:00` = {new Date(serverContext.lastReset).toLocaleTimeString([], {hour: "numeric", minute: "2-digit"})} local
          </small>
        </div>
        <div className="server-time-stat">
          <span className="server-time-stat-label">Next Reset</span>
          <strong>{formatLocalDateTime(serverContext.nextReset)}</strong>
          <small>{formatDuration(serverContext.nextReset.getTime() - now.getTime())}</small>
        </div>
        <button
          className={`mute-alarms-button ${plannerState.settings.alarmsMuted ? "active" : ""}`}
          type="button"
          onClick={() =>
            updateSettings((current) => ({
              ...current,
              alarmsMuted: !current.alarmsMuted,
            }))
          }
        >
          {plannerState.settings.alarmsMuted ? "Alarms Muted" : "Mute All Alarms"}
        </button>
      </div>

      {upcomingAlarm ? (
        <div className="server-time-alert" role="status" aria-live="polite">
          <div>
            <strong>{upcomingAlarm.event.name || "Unnamed event"} soon</strong>
            <p>
              Starts {formatLocalDateTime(upcomingAlarm.occurrence)}. Alarm lead: {upcomingAlarm.event.alarmLeadMinutes}m.
            </p>
          </div>
          <button
            className="secondary-button"
            type="button"
            onClick={() => acknowledgeAlarm(upcomingAlarm.alarmKey)}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="server-time-grid">
        <section className="server-time-panel">
          <div className="server-time-panel-header">
            <h2>Settings</h2>
          </div>

          <div className="server-time-form-grid">
            <label className="server-time-field">
              <span>What time does server reset for you?</span>
              <input
                className="cell-input"
                type="time"
                value={plannerState.settings.resetTime}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    resetTime: sanitizeTimeInput(event.target.value),
                  }))
                }
              />
            </label>
            <label className="server-time-field">
              <span>Default Alarm Lead (minutes)</span>
              <input
                className="cell-input"
                type="number"
                min="0"
                max="1440"
                value={plannerState.settings.defaultAlarmLeadMinutes}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    defaultAlarmLeadMinutes: Number(event.target.value) > 0 ? Number(event.target.value) : 0,
                  }))
                }
              />
            </label>
          </div>
          <p className="description">
            Example: if reset is <strong>7:00 PM</strong> local, then <strong>server 00:00:00</strong> is 7:00 PM and <strong>server 01:00:00</strong> is 8:00 PM local.
          </p>

          <div className="server-time-panel-header">
            <h2>Team Timezones</h2>
            <small>{plannerState.settings.extraTimezones.length}/{MAX_TIMEZONES} selected</small>
          </div>

          <div className="timezone-selector-groups">
            {Object.entries(groupedTimezones).map(([region, zones]) => (
              <div className="timezone-selector-group" key={region}>
                <strong>{region}</strong>
                <div className="timezone-selector-list">
                  {zones.map((zone) => (
                    <label className="timezone-option" key={zone.value}>
                      <input
                        type="checkbox"
                        checked={plannerState.settings.extraTimezones.includes(zone.value)}
                        onChange={() => toggleTimezone(zone.value)}
                      />
                      <span>{zone.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="server-time-panel">
          <div className="server-time-panel-header">
            <h2>Timezone Board</h2>
          </div>

          <div className="timezone-board">
            <div className="timezone-board-row timezone-board-row--header">
              <span>Timezone</span>
              <span>Now</span>
              <span>Next Reset</span>
              <span>Server 00:00</span>
            </div>
            {plannerState.settings.extraTimezones.map((timezone) => (
              <div className="timezone-board-row" key={timezone}>
                <span>{timezone}</span>
                <span>{formatNowInZone(now, timezone)}</span>
                <span>{formatTimeInZone(serverContext.nextReset, timezone)}</span>
                <span>{formatTimeInZone(serverContext.lastReset, timezone)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="server-time-panel">
        <div className="server-time-panel-header">
          <h2>Server Events</h2>
          <button className="secondary-button" type="button" onClick={addEvent}>
            Add Event
          </button>
        </div>

        <div className="event-list">
          <div className="event-row event-row--header">
            <span>Name</span>
            <span>Server Schedule</span>
            <span>Note</span>
            <span>Local Conversion</span>
            <span>Alarm</span>
            <span></span>
          </div>
          {eventRows.map(({event, nextOccurrence, countdown, alarmKey}) => (
            <div className="event-row" key={event.id}>
              <div className="event-main-fields">
                <input
                  className="cell-input"
                  type="text"
                  placeholder="Event name"
                  value={event.name}
                  onChange={(inputEvent) =>
                    updateEvent(event.id, (current) => ({
                      ...current,
                      name: inputEvent.target.value,
                    }))
                  }
                />
                <div className="event-schedule-fields">
                  <select
                    className="cell-input"
                    value={event.cadence}
                    onChange={(inputEvent) =>
                      updateEvent(event.id, (current) => ({
                        ...current,
                        cadence: inputEvent.target.value === "weekly" ? "weekly" : "daily",
                      }))
                    }
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                  {event.cadence === "weekly" ? (
                    <select
                      className="cell-input"
                      value={event.serverDayOfWeek}
                      onChange={(inputEvent) =>
                        updateEvent(event.id, (current) => ({
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
                  ) : null}
                  <input
                    className="cell-input"
                    type="time"
                    value={event.serverTime}
                    onChange={(inputEvent) =>
                      updateEvent(event.id, (current) => ({
                        ...current,
                        serverTime: sanitizeTimeInput(inputEvent.target.value),
                      }))
                    }
                  />
                </div>
              </div>
              <textarea
                className="cell-input server-time-textarea"
                placeholder="Note"
                value={event.note}
                onChange={(inputEvent) =>
                  updateEvent(event.id, (current) => ({
                    ...current,
                    note: inputEvent.target.value,
                  }))
                }
              />
              <div className="event-timing">
                <strong>{formatLocalDateTime(nextOccurrence)}</strong>
                <small>
                  Server {formatServerDay(event.serverDayOfWeek)} {event.serverTime}
                  {event.cadence === "daily" ? " daily" : ""} · {countdown}
                </small>
              </div>
              <div className="event-alarms">
                <label className="server-time-toggle">
                  <input
                    type="checkbox"
                    checked={event.enabled}
                    onChange={(inputEvent) =>
                      updateEvent(event.id, (current) => ({
                        ...current,
                        enabled: inputEvent.target.checked,
                      }))
                    }
                  />
                  <span>Enabled</span>
                </label>
                <label className="server-time-toggle">
                  <input
                    type="checkbox"
                    checked={event.alarmEnabled}
                    onChange={(inputEvent) =>
                      updateEvent(event.id, (current) => ({
                        ...current,
                        alarmEnabled: inputEvent.target.checked,
                      }))
                    }
                  />
                  <span>Alarm</span>
                </label>
                <input
                  className="cell-input"
                  type="number"
                  min="0"
                  max="1440"
                  value={event.alarmLeadMinutes}
                  onChange={(inputEvent) =>
                    updateEvent(event.id, (current) => ({
                      ...current,
                      alarmLeadMinutes: Number(inputEvent.target.value) > 0 ? Number(inputEvent.target.value) : 0,
                    }))
                  }
                />
                <small>Dismissed: {plannerState.acknowledgedAlarmKeys.includes(alarmKey) ? "Yes" : "No"}</small>
              </div>
              <div className="event-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => acknowledgeAlarm(alarmKey)}
                >
                  Clear Alarm
                </button>
                <button
                  className="secondary-button reset-button"
                  type="button"
                  onClick={() => removeEvent(event.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
