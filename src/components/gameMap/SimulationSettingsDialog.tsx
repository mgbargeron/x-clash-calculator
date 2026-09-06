import { useEffect, useState } from "react";
import {
  CITY_RACE_TOWN_LEVELS,
  type CityRaceSimulationSettings,
  type CityRaceTownLevel,
} from "../../utils/cityRaceSimulation";

type SimulationSettingsDialogProps = {
  settings: CityRaceSimulationSettings;
  onSave: (settings: CityRaceSimulationSettings) => void;
  onReset: () => void;
  onClose: () => void;
};

function copySettings(
  settings: CityRaceSimulationSettings
): CityRaceSimulationSettings {
  return {
    townUnlockDayByLevel: { ...settings.townUnlockDayByLevel },
    townUnlockHourByLevel: { ...settings.townUnlockHourByLevel },
    darkOilPerHourByTownLevel: { ...settings.darkOilPerHourByTownLevel },
  };
}

export function SimulationSettingsDialog({
  settings,
  onSave,
  onReset,
  onClose,
}: SimulationSettingsDialogProps) {
  const [draft, setDraft] = useState(() => copySettings(settings));

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  function setValue(
    level: CityRaceTownLevel,
    field: "day" | "hour" | "yield",
    value: string
  ) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed)) return;

    setDraft((current) => {
      const next = copySettings(current);
      if (field === "day") next.townUnlockDayByLevel[level] = parsed;
      if (field === "hour") next.townUnlockHourByLevel[level] = parsed;
      if (field === "yield") next.darkOilPerHourByTownLevel[level] = parsed;
      return next;
    });
  }

  return (
    <div className="event-dialog-backdrop" role="presentation" onClick={onClose}>
      <form
        className="event-dialog city-race-settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="city-race-settings-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          onSave(draft);
        }}
      >
        <div className="event-dialog-header">
          <div>
            <p className="eyebrow">City Race rules</p>
            <h2 id="city-race-settings-title">Town settings</h2>
            <p className="description">
              Set each town level&apos;s unlock time in its relative event day and
              its Dark Oil production per hour.
            </p>
          </div>
        </div>

        <div className="city-race-settings-table">
          <div className="city-race-settings-row city-race-settings-row--header">
            <span>Level</span>
            <span>Day</span>
            <span>Hour</span>
            <span>Yield / hr</span>
          </div>
          {CITY_RACE_TOWN_LEVELS.map((level) => (
            <div className="city-race-settings-row" key={level}>
              <strong>L{level}</strong>
              <input
                type="number"
                min={1}
                step={1}
                value={draft.townUnlockDayByLevel[level]}
                onChange={(event) => setValue(level, "day", event.target.value)}
                aria-label={`Level ${level} unlock day`}
              />
              <input
                type="number"
                min={0}
                max={23}
                step={1}
                value={draft.townUnlockHourByLevel[level]}
                onChange={(event) => setValue(level, "hour", event.target.value)}
                aria-label={`Level ${level} unlock hour`}
              />
              <input
                type="number"
                min={0}
                step={1}
                value={draft.darkOilPerHourByTownLevel[level]}
                onChange={(event) => setValue(level, "yield", event.target.value)}
                aria-label={`Level ${level} hourly yield`}
              />
            </div>
          ))}
        </div>

        <div className="event-dialog-actions city-race-settings-actions">
          <button className="secondary-button" type="button" onClick={onReset}>
            Restore defaults
          </button>
          <span />
          <button className="secondary-button" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" type="submit">
            Save settings
          </button>
        </div>
      </form>
    </div>
  );
}
