/**
 * City Race simulation rules and tunable values.
 *
 * Update this file when the event rules, unlock schedule, production rates, or
 * starting timeline need to change. The simulation engine reads all game values
 * from this single settings object.
 */
export const CITY_RACE_SETTINGS = {
  serverId: "SIM",
  timeline: {
    minimumDays: 20,
    defaultDays: 90,
    legacyDefaultDays: [20, 35],
  },
  captureLimits: {
    townsPerDay: 2,
    minesPerDay: 2,
    maximumTownsHeld: 8,
    maximumMinesHeld: 8,
  },
  darkOilPerHourByTownLevel: {
    1: 100,
    2: 200,
    3: 300,
    4: 400,
    5: 500,
    6: 600,
  },
  townUnlockDayByLevel: {
    1: 1,
    2: 5,
    3: 8,
    4: 12,
    5: 15,
    6: 19,
    7: 35,
  },
  tradeCenterUnlockDay: 21,
  // No event-specific amounts have been supplied yet. Level 7 towns use this
  // same first-capture rule, but still produce no Dark Oil.
  initialTownCaptureBonus: 0,
} as const;
