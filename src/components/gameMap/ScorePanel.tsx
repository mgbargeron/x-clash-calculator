import type { MarkerPointSummary, OurTeamConfig, RivalTeam, EnemyTeam } from "./types";
import { LockableControls } from "./LockableControls";
import { TeamRow } from "./TeamRow";

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
}: ScorePanelProps) {
  return (
    <aside className="map-score-panel" aria-label="Map score summary">
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
          className="aside-add-button"
          type="button"
          title="Add New Rival Team"
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
          className="aside-add-button"
          type="button"
          title="Add New Enemy Team"
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
