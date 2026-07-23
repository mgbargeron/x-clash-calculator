import { useEffect } from "react";

const HOURS = Array.from({ length: 24 }, (_, hour) =>
  String(hour).padStart(2, "0")
);
const MINUTES = Array.from({ length: 60 }, (_, minute) =>
  String(minute).padStart(2, "0")
);

type SimulationTimeDialogProps = {
  action: "capture" | "release";
  day: number;
  tileName: string;
  time: string;
  error: string | null;
  onTimeChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
};

export function SimulationTimeDialog({
  action,
  day,
  tileName,
  time,
  error,
  onTimeChange,
  onConfirm,
  onClose,
}: SimulationTimeDialogProps) {
  const isCapture = action === "capture";
  const [hour = "00", minute = "00"] = time.split(":");

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="event-dialog-backdrop" role="presentation" onClick={onClose}>
      <form
        className="event-dialog city-race-time-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="city-race-time-dialog-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm();
        }}
      >
        <div className="event-dialog-header">
          <div>
            <p className="eyebrow">Day {day} · Server time</p>
            <h2 id="city-race-time-dialog-title">
              {isCapture ? "What time was this captured?" : "What time was this dropped?"}
            </h2>
            <p className="description">{tileName}</p>
          </div>
        </div>

        <div className="server-time-field city-race-time-field">
          <span id="city-race-time-label">
            {isCapture ? "Capture time" : "Drop time"} (24-hour)
          </span>
          <div
            className="city-race-time-selectors"
            role="group"
            aria-labelledby="city-race-time-label"
          >
            <label>
              <small>Hour</small>
              <select
                className="cell-input"
                value={hour}
                onChange={(event) =>
                  onTimeChange(`${event.target.value}:${minute}`)
                }
                aria-label="Hour from 00 to 23"
                autoFocus
              >
                {HOURS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <strong className="city-race-time-separator" aria-hidden="true">
              :
            </strong>
            <label>
              <small>Minute</small>
              <select
                className="cell-input"
                value={minute}
                onChange={(event) =>
                  onTimeChange(`${hour}:${event.target.value}`)
                }
                aria-label="Minute from 00 to 59"
              >
                {MINUTES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {error ? (
          <p className="city-race-notice city-race-notice--error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="event-dialog-actions city-race-time-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" type="submit">
            {isCapture ? "Capture tile" : "Drop tile"}
          </button>
        </div>
      </form>
    </div>
  );
}
