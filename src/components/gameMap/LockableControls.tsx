type LockableControlsProps = {
  locked: boolean;
  onToggleLock: () => void;
  onResetMap: () => void;
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

export function LockableControls({ locked, onToggleLock, onResetMap }: LockableControlsProps) {
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
