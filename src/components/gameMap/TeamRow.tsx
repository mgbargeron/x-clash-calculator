import type { CSSProperties } from "react";
import type { MarkerPointSummary, OurTeamConfig, RivalTeam, EnemyTeam } from "./types";

type TeamRowProps = {
  team: RivalTeam | EnemyTeam | OurTeamConfig;
  type: "our-team" | "rival" | "enemy";
  points?: MarkerPointSummary;
  teamColor: string;
  locked: boolean;
  hasColorPicker: boolean;
  onCodeChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onColorChange?: (value: string) => void;
  onRemove: () => void;
};

function renderPointSummary(summary?: MarkerPointSummary) {
  if (!summary) return null;
  return (
    <div className="points-cells">
      <span>{summary.count}</span>
      <small>T {summary.townPoints}</small>
      <small>F {summary.frostMinePoints}</small>
    </div>
  );
}

export function TeamRow({
  team,
  type,
  points,
  teamColor,
  locked,
  hasColorPicker,
  onCodeChange,
  onNameChange,
  onColorChange,
  onRemove,
}: TeamRowProps) {
  const key = type === "our-team" ? (team as OurTeamConfig).color : (team as EnemyTeam).id;

  return (
    <div
      className={`score-row ${type}`}
      key={key}
      style={{ "--score-color": teamColor } as CSSProperties}
    >
      <span className="score-color" aria-hidden="true" />
      <div className="rival-input-container">
        <input
          type="text"
          className="enemy-code-input"
          value={team.code}
          maxLength={3}
          disabled={locked}
          onChange={(event) => onCodeChange(event.target.value)}
          title={`Change code for ${team.name}`}
        />
        <input
          className="team-name-input"
          aria-label={`${team.name} name`}
          value={team.name}
          maxLength={16}
          disabled={locked}
          onChange={(event) => onNameChange(event.target.value)}
        />
      </div>

      {hasColorPicker && (
        <input
          type="color"
          className="rival-color-picker"
          value={(team as OurTeamConfig | RivalTeam).color}
          disabled={locked}
          onChange={(e) => onColorChange?.(e.target.value)}
          title={`Change color for ${team.name}`}
        />
      )}

      {renderPointSummary(points)}
      <button
        className="remove-team-button"
        type="button"
        title={`Remove ${team.name}`}
        aria-label={`Remove ${team.name}`}
        onClick={onRemove}
        disabled={locked}
      >
        ×
      </button>
    </div>
  );
}
