import {useEffect, useMemo, useRef, useState, type ReactNode} from "react";

import EventPlannerDialog from "../components/serverTime/EventPlannerDialog";
import ServerWeekView from "../components/serverTime/ServerWeekView";
import {useServerTimeDataLoader} from "../hooks/useServerTimeDataLoader";
import {useServerTimeDataSaver} from "../hooks/useServerTimeDataSaver";
import {useNowRefresher} from "../hooks/useNowRefresher";
import {
  type AlternatingWeek,
  CURATED_TIMEZONES,
  formatDuration,
  formatLocalDateTime,
  formatNowInZone,
  formatServerClock,
  formatTimeInZone,
  getCurrentServerDateString,
  getCurrentServerWeekStart,
  getEventScheduleSummary,
  getNextEventOccurrence,
  getResolvedAlternatingWeekState,
  getServerContext,
  sanitizeTimeInput,
  type PlannerEvent,
  type ServerTimePlannerState,
  type ServerWeekHour,
} from "../utils/serverTime";

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
  const {plannerState, setPlannerState, isLoaded} = useServerTimeDataLoader();
  const now = useNowRefresher();
  const [eventsPanelOpen, setEventsPanelOpen] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [dialogSlot, setDialogSlot] = useState<ServerWeekHour | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission
  );
  const lastNotifiedAlarmRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    setPlannerState((current) => {
      const alternatingWeekState = getResolvedAlternatingWeekState(current, now);
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
  }, [isLoaded, now]);

  useServerTimeDataSaver(plannerState, isLoaded);

  const localTimezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Local",
    []
  );

  const serverContext = useMemo(
    () => getServerContext(now, plannerState.settings),
    [now, plannerState.settings]
  );

  const alternatingWeekState = useMemo(
    () => getResolvedAlternatingWeekState(plannerState, now),
    [plannerState, now]
  );

  const eventRows = useMemo(() => {
    return plannerState.events.map((event) => {
      const nextOccurrence = getNextEventOccurrence(event, plannerState, now);
      const alarmKey = nextOccurrence ? `${event.id}:${nextOccurrence.toISOString()}` : `${event.id}:none`;
      const nextAlarmTime = nextOccurrence
        ? new Date(nextOccurrence.getTime() - event.alarmLeadMinutes * 60_000)
        : null;
      const primaryTime = event.alarmEnabled && nextAlarmTime ? nextAlarmTime : nextOccurrence;
      const primaryLabel = event.alarmEnabled ? "Alarm Fires" : "Next Local";

      return {
        event,
        nextOccurrence,
        nextAlarmTime,
        primaryTime,
        primaryLabel,
        countdown: primaryTime ? formatDuration(primaryTime.getTime() - now.getTime()) : "Not scheduled",
        alarmKey,
      };
    });
  }, [now, plannerState]);

  const upcomingAlarm = useMemo<UpcomingAlarm | null>(() => {
    if (plannerState.settings.alarmsMuted) return null;

    const candidates = eventRows
      .filter(({event, nextOccurrence}) => event.enabled && event.alarmEnabled && nextOccurrence)
      .map(({event, nextOccurrence, alarmKey}) => ({
        event,
        alarmKey,
        occurrence: nextOccurrence!,
        triggerAt: new Date(nextOccurrence!.getTime() - event.alarmLeadMinutes * 60_000),
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
    playAlarmChime();

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

  async function enableAlarmNotifications() {
    if (typeof Notification === "undefined") {
      setNotificationPermission("unsupported");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    } catch {
      setNotificationPermission(Notification.permission);
    }
  }

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
      events: current.events.map((event) =>
        event.id === eventId ? ensureAlternatingDefaults(updater(event), current, now) : event
      ),
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
    setCreatingEvent(true);
    setDialogSlot(null);
    setEditingEventId(null);
  }

  function removeEvent(eventId: string) {
    setPlannerState((current) => ({
      ...current,
      events: current.events.filter((event) => event.id !== eventId),
      acknowledgedAlarmKeys: current.acknowledgedAlarmKeys.filter((key) => !key.startsWith(`${eventId}:`)),
    }));
  }

  function toggleSkipDate(eventId: string, serverDate: string) {
    setPlannerState((current) => ({
      ...current,
      events: current.events.map((event) => {
        if (event.id !== eventId) return event;
        const isSkipped = event.skippedDates.includes(serverDate);
        return {
          ...event,
          skippedDates: isSkipped
            ? event.skippedDates.filter((d) => d !== serverDate)
            : [...event.skippedDates, serverDate],
        };
      }),
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

  function createEventFromSlot(slot: ServerWeekHour) {
    setCreatingEvent(false);
    setDialogSlot(slot);
    setEditingEventId(null);
  }

  function closeDialog() {
    setCreatingEvent(false);
    setDialogSlot(null);
    setEditingEventId(null);
  }

  function saveDialogEvent(event: PlannerEvent) {
    setPlannerState((current) => {
      const nextEvent = ensureAlternatingDefaults(event, current, now);
      const exists = current.events.some((item) => item.id === nextEvent.id);

      return {
        ...current,
        events: exists
          ? current.events.map((item) => (item.id === nextEvent.id ? nextEvent : item))
          : [...current.events, nextEvent],
      };
    });
    setEventsPanelOpen(true);
    closeDialog();
  }

  function editEvent(eventId: string) {
    setCreatingEvent(false);
    setEditingEventId(eventId);
    setDialogSlot(null);
  }

  const groupedTimezones = useMemo(() => {
    return CURATED_TIMEZONES.reduce<Record<string, typeof CURATED_TIMEZONES>>((groups, zone) => {
      groups[zone.region] ??= [];
      groups[zone.region].push(zone);
      return groups;
    }, {});
  }, []);

  const serverWeekStart = useMemo(
    () => getCurrentServerWeekStart(now, plannerState.settings),
    [now, plannerState.settings]
  );
  const editingEvent = useMemo(
    () => plannerState.events.find((event) => event.id === editingEventId) ?? null,
    [editingEventId, plannerState.events]
  );

  return (
    <section className="card calculator server-time-page">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Server planning</p>
          <h1>Server Time Dashboard</h1>
          <p className="description">
            Click a calendar slot to create an event, then choose whether it is one-time, daily, every other day, or weekly.
          </p>
        </div>
        {navigation}
      </div>

      <div className="server-time-summary server-time-summary--wide">
        <div className="server-time-stat">
          <span className="server-time-stat-label">Local Time</span>
          <strong>{now.toLocaleTimeString()}</strong>
          <small>{localTimezone}</small>
        </div>
        <div className="server-time-stat">
          <span className="server-time-stat-label">Server Time</span>
          <strong>{formatServerClock(serverContext.serverMinutes)}</strong>
          <small>
            Server `00:00:00` = {serverContext.lastReset.toLocaleTimeString([], {hour: "numeric", minute: "2-digit"})} local
          </small>
        </div>
        <div className="server-time-stat">
          <span className="server-time-stat-label">Next Reset</span>
          <strong>{formatLocalDateTime(serverContext.nextReset)}</strong>
          <small>{formatDuration(serverContext.nextReset.getTime() - now.getTime())}</small>
        </div>
        <div className="server-time-stat">
          <span className="server-time-stat-label">Current Alt Day</span>
          <strong>{alternatingWeekState?.currentWeek ?? "Not Set"}</strong>
          <small>{alternatingWeekState ? `Anchor ${alternatingWeekState.anchorWeek} · ${alternatingWeekState.anchorServerDate}` : "Created from the first every-other-day event"}</small>
        </div>
        <div className="mute-alarms-placeholder">
          <button
            className={`mute-alarms-button ${plannerState.settings.alarmsMuted ? "active" : ""}`}
            type="button"
            disabled
            title="Alarm controls are temporarily disabled."
          >
            {plannerState.settings.alarmsMuted ? "Alarms Muted" : "Mute All Alarms"}
          </button>
          <small>Will be added later</small>
        </div>
      </div>

      {!plannerState.settings.alarmsMuted && notificationPermission !== "granted" ? (
        <div className="server-time-alert" role="status" aria-live="polite">
          <div>
            <strong>Notifications are not enabled</strong>
            <p>
              {notificationPermission === "unsupported"
                ? "This environment does not support desktop notifications. In-app alarm banners and chimes will still work."
                : "Allow notifications so alarm popups can appear even when the app is not frontmost."}
            </p>
          </div>
          {notificationPermission !== "unsupported" ? (
            <button className="secondary-button" type="button" onClick={() => void enableAlarmNotifications()}>
              Enable Notifications
            </button>
          ) : null}
        </div>
      ) : null}

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
            <div className="server-time-panel-actions">
              <small>{plannerState.settings.extraTimezones.length}/{MAX_TIMEZONES} selected</small>
              <button
                className="secondary-button"
                type="button"
                onClick={() =>
                  updateSettings((current) => ({
                    ...current,
                    timezoneSelectorCollapsed: !current.timezoneSelectorCollapsed,
                  }))
                }
              >
                {plannerState.settings.timezoneSelectorCollapsed ? "Show Timezones" : "Hide Timezones"}
              </button>
            </div>
          </div>

          {!plannerState.settings.timezoneSelectorCollapsed ? (
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
          ) : null}
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

      <ServerWeekView
        weekStart={serverWeekStart}
        now={now}
        settings={plannerState.settings}
        events={plannerState.events}
        selectedTimezones={plannerState.settings.extraTimezones}
        onSelectSlot={createEventFromSlot}
        onRemoveEvent={removeEvent}
        onToggleSkipSlot={toggleSkipDate}
      />

      <section className="server-time-panel">
        <div className="server-time-panel-header">
          <div>
            <h2>Server Events</h2>
            <small>Upcoming, repeating, every-other-day, and weekly schedules</small>
          </div>
          <div className="server-time-panel-actions">
            <button className="secondary-button" type="button" onClick={addEvent}>
              New Event
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => setEventsPanelOpen((current) => !current)}
            >
              {eventsPanelOpen ? "Hide Events" : `Show Events (${plannerState.events.length})`}
            </button>
          </div>
        </div>

        {eventsPanelOpen ? (
          <div className="event-list event-list--summary">
            {eventRows.map(({event, nextOccurrence, primaryTime, primaryLabel, countdown, alarmKey}) => (
              <div className="event-card" key={event.id}>
                <div className="event-card-header">
                  <div>
                    <strong>{event.name || "Unnamed event"}</strong>
                    <small>{getEventScheduleSummary(event, alternatingWeekState)}</small>
                  </div>
                  <span className={`event-card-state ${event.enabled ? "active" : "muted"}`}>
                    {event.enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div className="event-card-body">
                  <div className="event-card-stat">
                    <span>{primaryLabel}</span>
                    <strong>{primaryTime ? formatLocalDateTime(primaryTime) : "No upcoming occurrence"}</strong>
                  </div>
                  <div className="event-card-stat">
                    <span>Countdown</span>
                    <strong>{countdown}</strong>
                  </div>
                  <div className="event-card-stat">
                    <span>Event Starts</span>
                    <strong>{nextOccurrence ? formatLocalDateTime(nextOccurrence) : "No upcoming occurrence"}</strong>
                  </div>
                  <div className="event-card-stat">
                    <span>Alarm</span>
                    <strong>{event.alarmEnabled ? `${event.alarmLeadMinutes}m lead` : "Off"}</strong>
                  </div>
                </div>
                <div className="event-card-actions">
                  <button className="secondary-button" type="button" onClick={() => editEvent(event.id)}>
                    Edit
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() =>
                      updateEvent(event.id, (current) => ({
                        ...current,
                        enabled: !current.enabled,
                      }))
                    }
                  >
                    {event.enabled ? "Disable" : "Enable"}
                  </button>
                  <button className="secondary-button" type="button" onClick={() => acknowledgeAlarm(alarmKey)}>
                    Clear Alarm
                  </button>
                  <button className="secondary-button reset-button" type="button" onClick={() => removeEvent(event.id)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <EventPlannerDialog
        open={creatingEvent || dialogSlot !== null || editingEvent !== null}
        slot={dialogSlot}
        event={editingEvent}
        plannerState={plannerState}
        onClose={closeDialog}
        onSave={saveDialogEvent}
      />
    </section>
  );
}

function playAlarmChime() {
  if (typeof window === "undefined") return;

  const AudioContextCtor =
    window.AudioContext ||
    (window as Window & typeof globalThis & {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;

  if (!AudioContextCtor) return;

  try {
    const audioContext = new AudioContextCtor();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.45);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.45);
    oscillator.onended = () => {
      void audioContext.close();
    };
  } catch {
    // Ignore audio API issues.
  }
}

function ensureAlternatingDefaults(
  event: PlannerEvent,
  plannerState: ServerTimePlannerState,
  now: Date
): PlannerEvent {
  if (event.type !== "alternating") {
    return event;
  }

  return {
    ...event,
    alternatingAnchorDate:
      event.alternatingAnchorDate ||
      plannerState.alternatingWeekState?.anchorServerDate ||
      getCurrentServerDateString(now, plannerState.settings),
    alternatingWeek:
      event.alternatingWeek ||
      plannerState.alternatingWeekState?.currentWeek ||
      "A",
  } as PlannerEvent & {alternatingWeek: AlternatingWeek};
}
