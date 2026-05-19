export type PlannerEventType = "oneTime" | "daily" | "alternating" | "weekly";
export type AlternatingWeek = "A" | "B";

export type PlannerEvent = {
  id: string;
  name: string;
  type: PlannerEventType;
  serverDayOfWeek: number;
  serverTime: string;
  oneTimeServerDate: string;
  alternatingWeek: AlternatingWeek;
  alternatingAnchorDate: string;
  note: string;
  enabled: boolean;
  alarmEnabled: boolean;
  alarmLeadMinutes: number;
};

export type AlternatingWeekState = {
  anchorServerDate: string;
  anchorWeek: AlternatingWeek;
  lastResolvedServerDate: string;
  currentWeek: AlternatingWeek;
};

export type TimezoneOption = {
  value: string;
  label: string;
  region: string;
};

export type ServerTimeSettings = {
  resetTime: string;
  extraTimezones: string[];
  timezoneSelectorCollapsed: boolean;
  alarmsMuted: boolean;
  defaultAlarmLeadMinutes: number;
};

export type ServerTimePlannerState = {
  settings: ServerTimeSettings;
  events: PlannerEvent[];
  acknowledgedAlarmKeys: string[];
  alternatingWeekState: AlternatingWeekState | null;
};

export type ServerWeekHour = {
  key: string;
  serverDayOfWeek: number;
  serverHour: number;
  serverLabel: string;
  serverDate: string;
  serverWeekStartDate: string;
  localDate: Date;
  localLabel: string;
  timezoneLabels: Record<string, string>;
  isCurrentHour: boolean;
  matchingEvents: PlannerEvent[];
};

const MINUTES_PER_DAY = 24 * 60;
const DAY_MS = MINUTES_PER_DAY * 60_000;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const DEFAULT_SERVER_TIME_STATE: ServerTimePlannerState = {
  settings: {
    resetTime: "19:00",
    extraTimezones: ["America/New_York", "Europe/London", "Asia/Singapore"],
    timezoneSelectorCollapsed: false,
    alarmsMuted: true,
    defaultAlarmLeadMinutes: 15,
  },
  events: [
    {
      id: "daily-reset",
      name: "Daily Reset",
      type: "daily",
      serverDayOfWeek: 0,
      serverTime: "00:00",
      oneTimeServerDate: "",
      alternatingWeek: "A",
      alternatingAnchorDate: "",
      note: "Server day rollover.",
      enabled: true,
      alarmEnabled: true,
      alarmLeadMinutes: 15,
    },
    {
      id: "weekly-war",
      name: "Weekly Team Check-In",
      type: "weekly",
      serverDayOfWeek: 1,
      serverTime: "12:00",
      oneTimeServerDate: "",
      alternatingWeek: "A",
      alternatingAnchorDate: "",
      note: "Adjust this to your real weekly server event.",
      enabled: false,
      alarmEnabled: false,
      alarmLeadMinutes: 30,
    },
  ],
  acknowledgedAlarmKeys: [],
  alternatingWeekState: null,
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

export function createPlannerEvent(
  defaultLeadMinutes: number,
  preset?: Partial<PlannerEvent>
): PlannerEvent {
  const nextServerTime = sanitizeTimeInput(preset?.serverTime ?? "00:00");
  const baseEvent: PlannerEvent = {
    id: createStableId("planner"),
    name: "",
    type: "daily",
    serverDayOfWeek: 0,
    serverTime: "00:00",
    oneTimeServerDate: "",
    alternatingWeek: "A",
    alternatingAnchorDate: "",
    note: "",
    enabled: true,
    alarmEnabled: false,
    alarmLeadMinutes: defaultLeadMinutes,
  };

  return {
    ...baseEvent,
    ...preset,
    serverTime: nextServerTime,
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

export function sanitizeTimeInput(value: unknown): string {
  const normalizedValue = typeof value === "string" ? value.trim() : String(value ?? "").trim();
  const match = /^(\d{1,2}):(\d{1,2})$/.exec(normalizedValue);
  if (!match) return "00:00";

  const hours = Math.max(0, Math.min(23, Number(match[1])));
  const minutes = Math.max(0, Math.min(59, Number(match[2])));
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function sanitizeDateInput(value: unknown): string {
  const normalizedValue = typeof value === "string" ? value.trim() : String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(normalizedValue) ? normalizedValue : "";
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
    : new Date(resetToday.getTime() - DAY_MS);
  const nextReset = new Date(lastReset.getTime() + DAY_MS);
  const elapsedMinutes = Math.floor((now.getTime() - lastReset.getTime()) / 60_000);
  const serverDate = new Date(lastReset.getTime() + DAY_MS);

  return {
    resetMinutes,
    lastReset,
    nextReset,
    serverMinutes: ((elapsedMinutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY,
    serverDayOfWeek: serverDate.getDay(),
    serverDate,
  };
}

export function getCurrentServerDateString(now: Date, settings: ServerTimeSettings): string {
  return toDateInputString(getServerContext(now, settings).serverDate);
}

export function formatServerClock(serverMinutes: number): string {
  const hours = Math.floor(serverMinutes / 60);
  const minutes = serverMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
}

export function getCurrentServerWeekStart(now: Date, settings: ServerTimeSettings): Date {
  const context = getServerContext(now, settings);
  return new Date(context.lastReset.getTime() - context.serverDayOfWeek * DAY_MS);
}

export function getCurrentServerWeekStartDateString(now: Date, settings: ServerTimeSettings): string {
  return toDateInputString(getCurrentServerWeekStart(now, settings));
}

export function resolveAlternatingWeek(
  anchorServerDate: string,
  anchorWeek: AlternatingWeek,
  currentServerDate: string
): AlternatingWeek {
  const anchorDate = parseDateInput(anchorServerDate);
  const currentDate = parseDateInput(currentServerDate);

  if (!anchorDate || !currentDate) return anchorWeek;

  const daysBetween = Math.floor((currentDate.getTime() - anchorDate.getTime()) / DAY_MS);
  const isEven = Math.abs(daysBetween) % 2 === 0;
  return isEven ? anchorWeek : flipAlternatingWeek(anchorWeek);
}

export function getResolvedAlternatingWeekState(
  state: ServerTimePlannerState,
  now: Date
): AlternatingWeekState | null {
  const currentServerDate = getCurrentServerDateString(now, state.settings);
  const source =
    state.alternatingWeekState ??
    state.events.find((event) => event.type === "alternating" && event.alternatingAnchorDate);

  if (!source) return null;

  const anchorServerDate = "anchorServerDate" in source
    ? source.anchorServerDate
    : source.alternatingAnchorDate;
  const anchorWeek = "anchorWeek" in source
    ? source.anchorWeek
    : source.alternatingWeek;

  if (!anchorServerDate) return null;

  return {
    anchorServerDate,
    anchorWeek,
    lastResolvedServerDate: currentServerDate,
    currentWeek: resolveAlternatingWeek(anchorServerDate, anchorWeek, currentServerDate),
  };
}

export function getNextEventOccurrence(
  event: PlannerEvent,
  plannerState: ServerTimePlannerState,
  now: Date
): Date | null {
  const context = getServerContext(now, plannerState.settings);
  const eventMinutes = parseTimeToMinutes(event.serverTime);

  for (let dayOffset = 0; dayOffset < 28; dayOffset += 1) {
    const dayStart = new Date(context.lastReset.getTime() + dayOffset * DAY_MS);
    const occurrence = new Date(dayStart.getTime() + eventMinutes * 60_000);
    if (occurrence.getTime() <= now.getTime()) continue;

    const serverDayOfWeek = (context.serverDayOfWeek + dayOffset) % 7;
    const serverDate = toDateInputString(new Date(dayStart.getTime() + DAY_MS));

    if (eventMatchesSlot(event, serverDayOfWeek, eventMinutes, serverDate)) {
      return occurrence;
    }
  }

  return null;
}

export function getEventScheduleSummary(
  event: PlannerEvent,
  alternatingState: AlternatingWeekState | null
): string {
  switch (event.type) {
    case "oneTime":
      return `One time · ${event.oneTimeServerDate || "No date"} ${event.serverTime}`;
    case "daily":
      return `Daily · ${event.serverTime}`;
    case "weekly":
      return `Weekly · ${formatServerDay(event.serverDayOfWeek)} ${event.serverTime}`;
    case "alternating":
      return `Every other day · ${event.serverTime}${alternatingState ? ` · current ${alternatingState.currentWeek}` : ""}`;
    default:
      return event.serverTime;
  }
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
      const dayStart = new Date(weekStart.getTime() + dayIndex * DAY_MS);
      const localDate = new Date(dayStart.getTime() + hour * 60 * 60_000);
      const serverDate = toDateInputString(new Date(dayStart.getTime() + DAY_MS));
      const serverWeekStartDate = toDateInputString(weekStart);
      const serverLabel = `${String(hour).padStart(2, "0")}:00`;
      const timezoneLabels = selectedTimezones.reduce<Record<string, string>>((acc, timezone) => {
        acc[timezone] = formatTimeOnlyInZone(localDate, timezone);
        return acc;
      }, {});
      const matchingEvents = events.filter((event) =>
        event.enabled &&
        eventMatchesSlot(
          event,
          dayIndex,
          hour * 60,
          serverDate
        )
      );

      return {
        key: `${dayIndex}-${hour}`,
        serverDayOfWeek: dayIndex,
        serverHour: hour,
        serverLabel,
        serverDate,
        serverWeekStartDate,
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
  const alternatingWeekState = normalizeAlternatingWeekState(input.alternatingWeekState);

  return {
    settings: {
      resetTime: sanitizeTimeInput(migratedResetTime),
      extraTimezones: normalizeTimezones(settings.extraTimezones),
      timezoneSelectorCollapsed: Boolean(settings.timezoneSelectorCollapsed),
      alarmsMuted: Boolean(settings.alarmsMuted ?? base.settings.alarmsMuted),
      defaultAlarmLeadMinutes: clampLeadMinutes(
        typeof settings.defaultAlarmLeadMinutes === "number"
          ? settings.defaultAlarmLeadMinutes
          : base.settings.defaultAlarmLeadMinutes
      ),
    },
    events: events.map((event, index) => normalizeEvent(event, index, base.settings.defaultAlarmLeadMinutes)),
    acknowledgedAlarmKeys,
    alternatingWeekState,
  };
}

export function toDateInputString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeEvent(raw: unknown, index: number, fallbackLeadMinutes: number): PlannerEvent {
  const event = raw && typeof raw === "object" ? raw as Partial<PlannerEvent> & { cadence?: string } : {};
  const normalizedType = normalizeEventType(event.type, event.cadence);

  return {
    id: typeof event.id === "string" && event.id ? event.id : createStableId(`planner-${index + 1}`),
    name: typeof event.name === "string" ? event.name : "",
    type: normalizedType,
    serverDayOfWeek: typeof event.serverDayOfWeek === "number" && Number.isInteger(event.serverDayOfWeek)
      ? normalizeServerDay(event.serverDayOfWeek)
      : 0,
    serverTime: sanitizeTimeInput(typeof event.serverTime === "string" ? event.serverTime : "00:00"),
    oneTimeServerDate: sanitizeDateInput(typeof event.oneTimeServerDate === "string" ? event.oneTimeServerDate : ""),
    alternatingWeek: event.alternatingWeek === "B" ? "B" : "A",
    alternatingAnchorDate: sanitizeDateInput(typeof event.alternatingAnchorDate === "string" ? event.alternatingAnchorDate : ""),
    note: typeof event.note === "string" ? event.note : "",
    enabled: event.enabled !== false,
    alarmEnabled: Boolean(event.alarmEnabled),
    alarmLeadMinutes: clampLeadMinutes(
      typeof event.alarmLeadMinutes === "number" ? event.alarmLeadMinutes : fallbackLeadMinutes
    ),
  };
}

function normalizeAlternatingWeekState(raw: unknown): AlternatingWeekState | null {
  if (!raw || typeof raw !== "object") return null;

  const state = raw as Partial<AlternatingWeekState>;
  const anchorServerDate = sanitizeDateInput(typeof state.anchorServerDate === "string" ? state.anchorServerDate : "");
  if (!anchorServerDate) return null;

  return {
    anchorServerDate,
    anchorWeek: state.anchorWeek === "B" ? "B" : "A",
    lastResolvedServerDate: sanitizeDateInput(typeof state.lastResolvedServerDate === "string" ? state.lastResolvedServerDate : anchorServerDate),
    currentWeek: state.currentWeek === "B" ? "B" : "A",
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

function parseDateInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function flipAlternatingWeek(value: AlternatingWeek): AlternatingWeek {
  return value === "A" ? "B" : "A";
}

function normalizeEventType(type?: string, cadence?: string): PlannerEventType {
  if (type === "oneTime" || type === "daily" || type === "alternating" || type === "weekly") {
    return type;
  }

  if (cadence === "weekly") return "weekly";
  return "daily";
}

function normalizeServerDay(day: number): number {
  return ((Number(day) % 7) + 7) % 7;
}

function eventMatchesSlot(
  event: PlannerEvent,
  serverDayOfWeek: number,
  slotMinutes: number,
  serverDate: string
): boolean {
  const eventMinutes = parseTimeToMinutes(event.serverTime);
  if (eventMinutes < slotMinutes || eventMinutes >= slotMinutes + 60) return false;

  switch (event.type) {
    case "oneTime":
      return event.oneTimeServerDate === serverDate;
    case "daily":
      return true;
    case "weekly":
      return event.serverDayOfWeek === serverDayOfWeek;
    case "alternating": {
      const anchorDate = parseDateInput(event.alternatingAnchorDate || serverDate);
      const currentDate = parseDateInput(serverDate);

      if (!anchorDate || !currentDate) return false;

      const daysBetween = Math.floor((currentDate.getTime() - anchorDate.getTime()) / DAY_MS);
      return Math.abs(daysBetween) % 2 === 0;
    }
    default:
      return false;
  }
}
