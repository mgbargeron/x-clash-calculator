export type PlannerCadence = "daily" | "weekly";

export type PlannerEvent = {
  id: string;
  name: string;
  cadence: PlannerCadence;
  serverDayOfWeek: number;
  serverTime: string;
  note: string;
  enabled: boolean;
  alarmEnabled: boolean;
  alarmLeadMinutes: number;
};

export type TimezoneOption = {
  value: string;
  label: string;
  region: string;
};

export type ServerTimeSettings = {
  resetTime: string;
  extraTimezones: string[];
  alarmsMuted: boolean;
  defaultAlarmLeadMinutes: number;
};

export type ServerTimePlannerState = {
  settings: ServerTimeSettings;
  events: PlannerEvent[];
  acknowledgedAlarmKeys: string[];
};

export type ServerWeekHour = {
  key: string;
  serverDayOfWeek: number;
  serverHour: number;
  serverLabel: string;
  localDate: Date;
  localLabel: string;
  timezoneLabels: Record<string, string>;
  isCurrentHour: boolean;
  matchingEvents: PlannerEvent[];
};

export const DEFAULT_SERVER_TIME_STATE: ServerTimePlannerState = {
  settings: {
    resetTime: "19:00",
    extraTimezones: ["America/New_York", "Europe/London", "Asia/Singapore"],
    alarmsMuted: false,
    defaultAlarmLeadMinutes: 15,
  },
  events: [
    {
      id: "daily-reset",
      name: "Daily Reset",
      cadence: "daily",
      serverDayOfWeek: 0,
      serverTime: "00:00",
      note: "Server day rollover.",
      enabled: true,
      alarmEnabled: true,
      alarmLeadMinutes: 15,
    },
    {
      id: "weekly-war",
      name: "Weekly Team Check-In",
      cadence: "weekly",
      serverDayOfWeek: 1,
      serverTime: "12:00",
      note: "Adjust this to your real weekly server event.",
      enabled: false,
      alarmEnabled: false,
      alarmLeadMinutes: 30,
    },
  ],
  acknowledgedAlarmKeys: [],
};

export const CURATED_TIMEZONES: TimezoneOption[] = [
  { value: "America/Los_Angeles", label: "Los Angeles", region: "Americas" },
  { value: "America/Denver", label: "Denver", region: "Americas" },
  { value: "America/Chicago", label: "Chicago", region: "Americas" },
  { value: "America/New_York", label: "New York", region: "Americas" },
  { value: "America/Sao_Paulo", label: "Sao Paulo", region: "Americas" },
  { value: "Europe/London", label: "London", region: "Europe" },
  { value: "Europe/Berlin", label: "Berlin", region: "Europe" },
  { value: "Europe/Istanbul", label: "Istanbul", region: "Europe" },
  { value: "Africa/Cairo", label: "Cairo", region: "Africa" },
  { value: "Africa/Johannesburg", label: "Johannesburg", region: "Africa" },
  { value: "Asia/Dubai", label: "Dubai", region: "Asia" },
  { value: "Asia/Kolkata", label: "Kolkata", region: "Asia" },
  { value: "Asia/Singapore", label: "Singapore", region: "Asia" },
  { value: "Asia/Tokyo", label: "Tokyo", region: "Asia" },
  { value: "Australia/Sydney", label: "Sydney", region: "Oceania" },
  { value: "Pacific/Auckland", label: "Auckland", region: "Oceania" },
];

const MINUTES_PER_DAY = 24 * 60;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function createPlannerEvent(defaultLeadMinutes: number): PlannerEvent {
  return {
    id: createStableId("planner"),
    name: "",
    cadence: "daily",
    serverDayOfWeek: 0,
    serverTime: "00:00",
    note: "",
    enabled: true,
    alarmEnabled: false,
    alarmLeadMinutes: defaultLeadMinutes,
  };
}

export function createStableId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function clampLeadMinutes(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(24 * 60, Math.round(value)));
}

export function sanitizeTimeInput(value: string): string {
  const match = /^(\d{1,2}):(\d{1,2})$/.exec(value.trim());
  if (!match) return "00:00";

  const hours = Math.max(0, Math.min(23, Number(match[1])));
  const minutes = Math.max(0, Math.min(59, Number(match[2])));
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function parseTimeToMinutes(value: string): number {
  const [hours, minutes] = sanitizeTimeInput(value).split(":").map(Number);
  return hours * 60 + minutes;
}

export function formatMinutesAsTime(totalMinutes: number): string {
  const normalized = ((Math.floor(totalMinutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function getActiveResetMinutes(settings: ServerTimeSettings): number {
  return parseTimeToMinutes(settings.resetTime);
}

export function getServerContext(now: Date, settings: ServerTimeSettings) {
  const resetMinutes = getActiveResetMinutes(settings);
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);

  const resetToday = new Date(midnight.getTime() + resetMinutes * 60_000);
  const lastReset = now >= resetToday
    ? resetToday
    : new Date(resetToday.getTime() - MINUTES_PER_DAY * 60_000);
  const nextReset = new Date(lastReset.getTime() + MINUTES_PER_DAY * 60_000);
  const elapsedMinutes = Math.floor((now.getTime() - lastReset.getTime()) / 60_000);

  return {
    resetMinutes,
    lastReset,
    nextReset,
    serverMinutes: ((elapsedMinutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY,
    serverDayOfWeek: lastReset.getDay(),
    serverDate: lastReset,
  };
}

export function formatServerClock(serverMinutes: number): string {
  const hours = Math.floor(serverMinutes / 60);
  const minutes = serverMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
}

export function getCurrentServerWeekStart(now: Date, settings: ServerTimeSettings): Date {
  const context = getServerContext(now, settings);
  return new Date(context.lastReset.getTime() - context.serverDayOfWeek * MINUTES_PER_DAY * 60_000);
}

export function getNextEventOccurrence(
  event: PlannerEvent,
  now: Date,
  settings: ServerTimeSettings
): Date {
  const context = getServerContext(now, settings);
  const eventMinutes = parseTimeToMinutes(event.serverTime);
  const cadence = event.cadence;

  const offsetDays =
    cadence === "daily"
      ? eventMinutes > context.serverMinutes ? 0 : 1
      : getWeeklyOffsetDays(context.serverDayOfWeek, context.serverMinutes, event.serverDayOfWeek, eventMinutes);

  return new Date(context.lastReset.getTime() + offsetDays * MINUTES_PER_DAY * 60_000 + eventMinutes * 60_000);
}

function getWeeklyOffsetDays(
  currentDay: number,
  currentMinutes: number,
  targetDay: number,
  targetMinutes: number
): number {
  const normalizedTargetDay = Number.isInteger(targetDay) ? ((targetDay % 7) + 7) % 7 : 0;
  const rawOffset = (normalizedTargetDay - currentDay + 7) % 7;

  if (rawOffset > 0) return rawOffset;
  return targetMinutes > currentMinutes ? 0 : 7;
}

export function formatDuration(ms: number): string {
  if (ms <= 0) return "now";

  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatLocalDateTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatTimeInZone(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatNowInZone(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export function formatServerDay(day: number): string {
  return DAYS[((day % 7) + 7) % 7];
}

export function formatTimeOnly(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function buildServerWeekHours(
  weekStart: Date,
  now: Date,
  settings: ServerTimeSettings,
  events: PlannerEvent[],
  selectedTimezones: string[]
): ServerWeekHour[][] {
  const currentContext = getServerContext(now, settings);

  return Array.from({length: 7}, (_, dayIndex) =>
    Array.from({length: 24}, (_, hour) => {
      const localDate = new Date(weekStart.getTime() + (dayIndex * 24 + hour) * 60 * 60_000);
      const serverLabel = `${String(hour).padStart(2, "0")}:00`;
      const timezoneLabels = selectedTimezones.reduce<Record<string, string>>((acc, timezone) => {
        acc[timezone] = formatTimeOnlyInZone(localDate, timezone);
        return acc;
      }, {});
      const matchingEvents = events.filter((event) => {
        if (!event.enabled) return false;
        if (parseTimeToMinutes(event.serverTime) < hour * 60 || parseTimeToMinutes(event.serverTime) >= (hour + 1) * 60) {
          return false;
        }

        return event.cadence === "daily" || event.serverDayOfWeek === dayIndex;
      });

      return {
        key: `${dayIndex}-${hour}`,
        serverDayOfWeek: dayIndex,
        serverHour: hour,
        serverLabel,
        localDate,
        localLabel: formatTimeOnly(localDate),
        timezoneLabels,
        isCurrentHour: currentContext.serverDayOfWeek === dayIndex && Math.floor(currentContext.serverMinutes / 60) === hour,
        matchingEvents,
      };
    })
  );
}

export function normalizePlannerState(raw: unknown): ServerTimePlannerState {
  const base = DEFAULT_SERVER_TIME_STATE;
  const input = raw && typeof raw === "object" ? raw as Partial<ServerTimePlannerState> : {};
  const settings: Partial<ServerTimeSettings> = input.settings && typeof input.settings === "object"
    ? input.settings as Partial<ServerTimeSettings>
    : {};
  const legacySettings = settings as Partial<{
    standardResetTime: string;
    daylightResetTime: string;
    isDaylightSavingActive: boolean;
  }>;
  const migratedResetTime =
    settings.resetTime ??
    (legacySettings.isDaylightSavingActive
      ? legacySettings.daylightResetTime
      : legacySettings.standardResetTime) ??
    base.settings.resetTime;
  const events = Array.isArray(input.events) ? input.events : base.events;
  const acknowledgedAlarmKeys = Array.isArray(input.acknowledgedAlarmKeys)
    ? input.acknowledgedAlarmKeys.filter((key): key is string => typeof key === "string")
    : [];

  return {
    settings: {
      resetTime: sanitizeTimeInput(migratedResetTime),
      extraTimezones: normalizeTimezones(settings.extraTimezones),
      alarmsMuted: Boolean(settings.alarmsMuted ?? base.settings.alarmsMuted),
      defaultAlarmLeadMinutes: clampLeadMinutes(
        typeof settings.defaultAlarmLeadMinutes === "number"
          ? settings.defaultAlarmLeadMinutes
          : base.settings.defaultAlarmLeadMinutes
      ),
    },
    events: events.map((event, index) => normalizeEvent(event, index, base.settings.defaultAlarmLeadMinutes)),
    acknowledgedAlarmKeys,
  };
}

function normalizeEvent(raw: unknown, index: number, fallbackLeadMinutes: number): PlannerEvent {
  const event = raw && typeof raw === "object" ? raw as Partial<PlannerEvent> : {};
  return {
    id: typeof event.id === "string" && event.id ? event.id : createStableId(`planner-${index + 1}`),
    name: typeof event.name === "string" ? event.name : "",
    cadence: event.cadence === "weekly" ? "weekly" : "daily",
    serverDayOfWeek: Number.isInteger(event.serverDayOfWeek) ? Number(event.serverDayOfWeek) % 7 : 0,
    serverTime: sanitizeTimeInput(typeof event.serverTime === "string" ? event.serverTime : "00:00"),
    note: typeof event.note === "string" ? event.note : "",
    enabled: event.enabled !== false,
    alarmEnabled: Boolean(event.alarmEnabled),
    alarmLeadMinutes: clampLeadMinutes(
      typeof event.alarmLeadMinutes === "number" ? event.alarmLeadMinutes : fallbackLeadMinutes
    ),
  };
}

function normalizeTimezones(raw: unknown): string[] {
  const allowed = new Set(CURATED_TIMEZONES.map((zone) => zone.value));
  const values = Array.isArray(raw) ? raw.filter((value): value is string => typeof value === "string") : [];
  const deduped = Array.from(new Set(values.filter((value) => allowed.has(value))));
  return deduped.length > 0 ? deduped : DEFAULT_SERVER_TIME_STATE.settings.extraTimezones;
}

function formatTimeOnlyInZone(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
