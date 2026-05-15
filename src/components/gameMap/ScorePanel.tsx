import { useState, type ReactNode } from "react";
import type { MarkerPointSummary, OurTeamConfig, RivalTeam, EnemyTeam } from "./types";
import { LockableControls } from "./LockableControls";
import { TeamRow } from "./TeamRow";

function ChevronRightIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" width="16" height="16">
      <path
        d="M9 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronLeftIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" width="16" height="16">
      <path
        d="M15 6l-6 6 6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type ScorePanelProps = {
  teamManagementLocked: boolean;
  ourTeam: OurTeamConfig;
  rivalTeams: RivalTeam[];
  enemyTeams: EnemyTeam[];
  ourTeamPoints?: MarkerPointSummary;
  rivalPoints: Record<string, MarkerPointSummary>;
  enemyPoints: Record<string, MarkerPointSummary>;
  onToggleLock: () => void;
  onResetMap: () => void;
  onUpdateOurTeamCode: (value: string) => void;
  onUpdateOurTeamName: (value: string) => void;
  updateOurTeamColor: (color: string) => void;
  addRival: () => void;
  updateRivalCode: (id: string, value: string) => void;
  updateRivalName: (id: string, value: string) => void;
  updateRivalColor: (id: string, value: string) => void;
  removeRival: (id: string) => void;
  addEnemy: () => void;
  updateEnemyCode: (id: string, value: string) => void;
  updateEnemyName: (id: string, value: string) => void;
  removeEnemy: (id: string) => void;
  onCollapseChange?: (collapsed: boolean) => void;
};
const ENEMY_COLOR = "#CF3F45";

export function ScorePanel({
  teamManagementLocked,
  ourTeam,
  rivalTeams,
  enemyTeams,
  ourTeamPoints,
  rivalPoints,
  enemyPoints,
  onToggleLock,
  onResetMap,
  onUpdateOurTeamCode,
  onUpdateOurTeamName,
  updateOurTeamColor,
  addRival,
  updateRivalCode,
  updateRivalName,
  updateRivalColor,
  removeRival,
  addEnemy,
  updateEnemyCode,
  updateEnemyName,
  removeEnemy,
  onCollapseChange,
}: ScorePanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const toggleCollapsed = (next: boolean) => {
    setCollapsed(next);
    onCollapseChange?.(next);
  };

  if (collapsed) {
    return (
      <aside className="map-score-panel" aria-label="Map score summary">
        <button
          className="secondary-button aside-control-button asidetip"
          type="button"
          onClick={() => toggleCollapsed(false)}
          aria-label="Show score panel"
          data-tip="Show score panel"
          style={{ minWidth: 0, padding: "4px 8px", lineHeight: 1 }}
        >
          <ChevronLeftIcon />
        </button>
      </aside>
    );
  }

  return (
    <aside className="map-score-panel" aria-label="Map score summary">
      <button
        className="secondary-button aside-control-button asidetip"
        type="button"
        onClick={() => toggleCollapsed(true)}
        aria-label="Hide score panel"
        data-tip="Hide score panel"
        style={{ width: 32, minWidth: 32, padding: 0, display: "grid", placeItems: "center" }}
      >
        <ChevronRightIcon />
      </button>
      <LockableControls
        locked={teamManagementLocked}
        onToggleLock={onToggleLock}
        onResetMap={onResetMap}
      />

      {/* Our Team - can edit name, code, and color */}
      <div className="score-group-label">
        <span>Our Team</span>
      </div>

      <TeamRow
        team={ourTeam}
        type="our-team"
        points={ourTeamPoints}
        teamColor={ourTeam.color}
        locked={teamManagementLocked}
        hasColorPicker={true}
        onCodeChange={onUpdateOurTeamCode}
        onNameChange={onUpdateOurTeamName}
        onColorChange={updateOurTeamColor}
        onRemove={() => {}}
      />

      {/* Rival teams - can edit name, code, and color */}
      <div className="score-group-label">
        <span>Rival Teams</span>
        <button
          className="aside-add-button asidetip"
          type="button"
          data-tip="Add New Rival Team"
          aria-label="Add New Rival Team"
          onClick={addRival}
          disabled={teamManagementLocked}
        >
          +
        </button>
      </div>

      {rivalTeams.map((team) => (
        <TeamRow
          key={team.id}
          team={team}
          type="rival"
          points={rivalPoints[team.id]}
          teamColor={team.color}
          locked={teamManagementLocked}
          hasColorPicker={true}
          onCodeChange={(value) => updateRivalCode(team.id, value)}
          onNameChange={(value) => updateRivalName(team.id, value)}
          onColorChange={(color) => updateRivalColor(team.id, color)}
          onRemove={() => removeRival(team.id)}
        />
      ))}

      {/* Enemy teams - can only edit name and code (no color picker) */}
      <div className="score-group-label">
        <span>Enemy Teams</span>
        <button
          className="aside-add-button asidetip"
          type="button"
          data-tip="Add New Enemy Team"
          aria-label="Add New Enemy Team"
          onClick={addEnemy}
          disabled={teamManagementLocked}
        >
          +
        </button>
      </div>

      {enemyTeams.map((team) => (
        <TeamRow
          key={team.id}
          team={team}
          type="enemy"
          points={enemyPoints[team.id]}
          teamColor={ENEMY_COLOR}
          locked={teamManagementLocked}
          hasColorPicker={false}
          onCodeChange={(value) => updateEnemyCode(team.id, value)}
          onNameChange={(value) => updateEnemyName(team.id, value)}
          onRemove={() => removeEnemy(team.id)}
        />
      ))}
    </aside>
  );
}
