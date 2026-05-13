import type { CSSProperties } from "react";
import type { TileMarker } from "./types";

type RivalButtonStyle = CSSProperties & {
  "--rival-color": string;
};

type EnemyButtonStyle = CSSProperties & {
  "--enemy-color": string;
};

type TeamItem = { code: string; name: string };

type MapToolbarProps = {
  clearMarkerCount: number;
  selectedMarker: TileMarker;
  ourTeam: TeamItem & { color: string };
  rivalTeams: Array<{ color: string; name: string; code: string }>;
  enemyTeams: Array<{ id: string; name: string; code: string }>;
  selectedRivalColor: string;
  selectedEnemyTeamId: string;
  onMarkerChange: (marker: TileMarker) => void;
  onRivalSelect: (color: string) => void;
  onEnemySelect: (id: string) => void;
};

const markerTools: Array<{ marker: "none"; label: string; icon: string }> = [
  { marker: "none", label: "Clear marker", icon: "C" },
];
const ENEMY_COLOR = "#CF3F45";

function formatTeamDisplayLabel(code: string, name: string): string {
  const normalizedCode = code.substring(0, 3).toUpperCase() || "XXX";
  const normalizedName = name.trim() || "Unnamed";
  return `[${normalizedCode}]${normalizedName}`;
}

export function MapToolbar({
  clearMarkerCount,
  selectedMarker,
  ourTeam,
  rivalTeams,
  enemyTeams,
  selectedRivalColor,
  selectedEnemyTeamId,
  onMarkerChange,
  onRivalSelect,
  onEnemySelect,
}: MapToolbarProps) {
  return (
    <div className="map-toolbar" aria-label="Map tile tools">
      <div className="tile-tools">
        {markerTools.map((tool) => (
          <button
            className={`icon-tool-button clear-tool-button ${tool.marker} ${
              selectedMarker === tool.marker ? "active" : ""
            }`}
            type="button"
            key={tool.marker}
            title={tool.label}
            aria-label={tool.label}
            onClick={() => onMarkerChange(tool.marker)}
          >
            <span className="tool-inline-label">
              {tool.icon} | {clearMarkerCount}
            </span>
          </button>
        ))}
        <button
          className={`icon-tool-button base team-tool-button ${
            selectedMarker === "base" ? "active" : ""
          }`}
          type="button"
          title={formatTeamDisplayLabel(ourTeam.code, ourTeam.name)}
          aria-label={formatTeamDisplayLabel(ourTeam.code, ourTeam.name)}
          onClick={() => onMarkerChange("base")}
        >
          <span className="team-code">{ourTeam.code}</span>
        </button>
        {rivalTeams.map((team) => (
          <button
            key={team.color}
            className={`icon-tool-button rival team-tool-button ${
              selectedMarker === "rival" && selectedRivalColor === team.color ? "active" : ""
            }`}
            type="button"
            title={formatTeamDisplayLabel(team.code, team.name)}
            aria-label={formatTeamDisplayLabel(team.code, team.name)}
            onClick={() => {
              onMarkerChange("rival");
              onRivalSelect(team.color);
            }}
            style={{ "--rival-color": team.color } as RivalButtonStyle}
          >
            <span className="team-code">{team.code}</span>
          </button>
        ))}

        {enemyTeams.map((team) => (
          <button
            key={team.id}
            className={`icon-tool-button enemy-team team-tool-button ${
              selectedMarker === "enemy" && selectedEnemyTeamId === team.id ? "active" : ""
            }`}
            type="button"
            title={formatTeamDisplayLabel(team.code, team.name)}
            aria-label={formatTeamDisplayLabel(team.code, team.name)}
            onClick={() => {
              onMarkerChange("enemy");
              onEnemySelect(team.id);
            }}
            style={{ "--enemy-color": ENEMY_COLOR } as EnemyButtonStyle}
          >
            <span className="team-code">{team.code}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
