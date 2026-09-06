import { useEffect } from "react";

type MapCaptureImportDialogProps = {
  fileName: string;
  seasonLabel: string;
  sourceLabel: string;
  newVersionLabel: string;
  replaceVersionLabel?: string;
  onImportAsVersion: () => void;
  onReplaceVersion: () => void;
  onClose: () => void;
};

export function MapCaptureImportDialog({
  fileName,
  seasonLabel,
  sourceLabel,
  newVersionLabel,
  replaceVersionLabel,
  onImportAsVersion,
  onReplaceVersion,
  onClose,
}: MapCaptureImportDialogProps) {
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
      <div
        className="event-dialog map-capture-import-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="map-capture-import-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="event-dialog-header">
          <div>
            <p className="eyebrow">{seasonLabel} capture</p>
            <h2 id="map-capture-import-title">Import {sourceLabel}</h2>
            <p className="description">{fileName}</p>
          </div>
        </div>

        <p className="description">
          Add this capture as {newVersionLabel}
          {replaceVersionLabel
            ? `, or replace the currently selected ${replaceVersionLabel}.`
            : ". Select a version of the same server to enable replacement."}
        </p>

        <div className="event-dialog-actions map-capture-import-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Cancel
          </button>
          {replaceVersionLabel ? (
            <button
              className="secondary-button map-capture-replace-button"
              type="button"
              onClick={onReplaceVersion}
            >
              Replace {replaceVersionLabel}
            </button>
          ) : null}
          <button
            className="primary-button"
            type="button"
            onClick={onImportAsVersion}
          >
            Add as {newVersionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
