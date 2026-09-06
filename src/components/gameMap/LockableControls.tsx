type LockableControlsProps = {
  locked: boolean;
  onToggleLock: () => void;
  onResetMap: () => void;
  onOpenSettings?: () => void;
};

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M7 10V8a5 5 0 1 1 10 0v2M6 10h12a1 1 0 0 1 1 1v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-8a1 1 0 0 1 1-1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UnlockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M18 10h1a1 1 0 0 1 1 1v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-8a1 1 0 0 1 1-1h8M10 10V8a5 5 0 0 1 9.8-1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 9 19.37a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15 1.7 1.7 0 0 0 3.08 14H3v-4h.08A1.7 1.7 0 0 0 4.63 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63a1.7 1.7 0 0 0 1-1.55V3h4v.08A1.7 1.7 0 0 0 15 4.63a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9c.25.61.85 1 1.55 1H21v4h-.08c-.7 0-1.3.39-1.52 1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LockableControls({
  locked,
  onToggleLock,
  onResetMap,
  onOpenSettings,
}: LockableControlsProps) {
  return (
    <div className="aside-controls">
      <button
        className={`secondary-button aside-control-button lock-button asidetip ${locked ? "active" : ""}`}
        type="button"
        onClick={onToggleLock}
        aria-pressed={locked}
        data-tip={locked ? "Unlock team management" : "Lock team management"}
        aria-label={locked ? "Unlock team add/remove and reset" : "Lock team add/remove and reset"}
      >
        {locked ? <LockIcon /> : <UnlockIcon />}
      </button>
      {onOpenSettings ? (
        <button
          className="secondary-button aside-control-button lock-button settings-button asidetip"
          type="button"
          onClick={onOpenSettings}
          data-tip="City Race settings"
          aria-label="Open City Race settings"
        >
          <SettingsIcon />
        </button>
      ) : null}
      <button
        className="secondary-button aside-control-button reset-button"
        type="button"
        onClick={onResetMap}
        disabled={locked}
      >
        Clear Board
      </button>
    </div>
  );
}
