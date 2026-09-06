import { useState, type CSSProperties } from "react";
import type { TileMarker } from "./types";
import { useMapToolbarServerControls } from "../../hooks/useMapToolbarServerControls";

type RivalButtonStyle = CSSProperties & {
  "--rival-color": string;
};

type EnemyButtonStyle = CSSProperties & {
  "--enemy-color": string;
};

type TeamItem = { code: string; name: string };

type MapToolbarProps = {
  serverIds: string[];
  activeServerId: string;
  activeServerNumber: string;
  simulationServerId?: string;
  canRemoveActiveServer: boolean;
  clearMarkerCount: number;
  selectedMarker: TileMarker;
  ourTeam: TeamItem & { color: string };
  rivalTeams: Array<{ id: string; color: string; name: string; code: string }>;
  enemyTeams: Array<{ id: string; name: string; code: string }>;
  selectedRivalTeamId: string;
  selectedEnemyTeamId: string;
  onServerSelect: (id: string) => void;
  onServerAdd: (id: string) => boolean;
  onActiveServerRename: (id: string) => boolean;
  onActiveServerRemove: () => void;
  onCaptureImport: () => void;
  onCaptureExport: () => void;
  onMarkerChange: (marker: TileMarker) => void;
  onRivalSelect: (id: string) => void;
  onEnemySelect: (id: string) => void;
};

const markerTools: Array<{ marker: "none"; label: string; icon: string }> = [
  { marker: "none", label: "Clear marker", icon: "C" },
];
const ENEMY_COLOR = "#CF3F45";

function formatTeamDisplayLabel(code: unknown, name: unknown): string {
  const normalizedCode = String(code ?? "").slice(0, 3).toUpperCase() || "XXX";
  const normalizedName = String(name ?? "").trim() || "Unnamed";
  return `[${normalizedCode}]${normalizedName}`;
}

export function MapToolbar({
  serverIds,
  activeServerId,
  activeServerNumber,
  simulationServerId,
  canRemoveActiveServer,
  clearMarkerCount,
  selectedMarker,
  ourTeam,
  rivalTeams,
  enemyTeams,
  selectedRivalTeamId,
  selectedEnemyTeamId,
  onServerSelect,
  onServerAdd,
  onActiveServerRename,
  onActiveServerRemove,
  onCaptureImport,
  onCaptureExport,
  onMarkerChange,
  onRivalSelect,
  onEnemySelect,
}: MapToolbarProps) {
  const {
    serverEditDraft,
    serverEditInvalid,
    isEditingServerId,
    setServerEditDraft,
    setServerEditInvalid,
    setIsEditingServerId,
  } = useMapToolbarServerControls(activeServerNumber);

  const [isAddingServer, setIsAddingServer] = useState(false);
  const [serverDraft, setServerDraft] = useState("");
  const [serverDraftInvalid, setServerDraftInvalid] = useState(false);
  const isSimulationMode = activeServerId === simulationServerId;

  function submitServer() {
    const nextServerId = serverDraft.trim();
    const didAddServer = onServerAdd(nextServerId);

    if (didAddServer) {
      setIsAddingServer(false);
      setServerDraft("");
      setServerDraftInvalid(false);
      return;
    }

    setServerDraftInvalid(true);
  }

  function submitServerRename() {
    const nextServerId = serverEditDraft.trim();
    const didRenameServer = onActiveServerRename(nextServerId);

    if (didRenameServer) {
      setServerEditInvalid(false);
      setIsEditingServerId(false);
      return;
    }

    setServerEditInvalid(true);
  }

  return (
    <div className="map-toolbar" aria-label="Map tile tools">
      <div className="map-toolbar-section server-tools" aria-label="Server map selector">
        <div className="server-strip">
          {serverIds.map((serverId) => (
            <button
              key={serverId}
              className={`icon-tool-button server-tool-button ${
                activeServerId === serverId ? "active" : ""
              } ${serverId === simulationServerId ? "server-tool-button--simulation" : ""}`}
              type="button"
              title={
                serverId === simulationServerId
                  ? "Simulate City Race"
                  : `Switch to server ${serverId}`
              }
              aria-label={
                serverId === simulationServerId
                  ? "Simulate City Race"
                  : `Switch to server ${serverId}`
              }
              onClick={() => onServerSelect(serverId)}
            >
              <span className="team-code">{serverId}</span>
            </button>
          ))}
          {isEditingServerId && !isSimulationMode ? (
            <input
              className={`server-id-input server-id-input--edit ${serverEditInvalid ? "invalid" : ""}`}
              type="text"
              value={serverEditDraft}
              maxLength={3}
              inputMode="numeric"
              pattern="[0-9]{3}"
              placeholder={activeServerNumber}
              aria-label={`Edit active server number ${activeServerNumber}`}
              aria-invalid={serverEditInvalid}
              onChange={(event) => {
                setServerEditDraft(event.target.value.replace(/\D/g, "").slice(0, 3));
                setServerEditInvalid(false);
              }}
              onBlur={() => {
                if (serverEditDraft === activeServerNumber) {
                  setIsEditingServerId(false);
                  return;
                }
                submitServerRename();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitServerRename();
                }

                if (event.key === "Escape") {
                  setServerEditDraft(activeServerNumber);
                  setServerEditInvalid(false);
                  setIsEditingServerId(false);
                }
              }}
              autoFocus
            />
          ) : null}
          {isAddingServer ? (
            <input
              className={`server-id-input ${serverDraftInvalid ? "invalid" : ""}`}
              type="text"
              value={serverDraft}
              maxLength={3}
              inputMode="numeric"
              pattern="[0-9]{3}"
              placeholder="001"
              aria-label="Add server"
              aria-invalid={serverDraftInvalid}
              onChange={(event) => {
                setServerDraft(event.target.value.replace(/\D/g, "").slice(0, 3));
                setServerDraftInvalid(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitServer();
                }

                if (event.key === "Escape") {
                  setIsAddingServer(false);
                  setServerDraft("");
                  setServerDraftInvalid(false);
                }
              }}
              autoFocus
            />
          ) : (
            <button
              className="aside-add-button asidetip"
              type="button"
              data-tip="Add server"
              aria-label="Add server"
              onClick={() => setIsAddingServer(true)}
            >
              +
            </button>
          )}
          {isAddingServer ? (
            <button
              className="map-toolbar-mini-button asidetip"
              type="button"
              data-tip="Confirm server"
              aria-label="Confirm server"
              onClick={submitServer}
            >
              +
            </button>
          ) : null}
          {isEditingServerId && !isSimulationMode ? (
            <button
              className="map-toolbar-mini-button asidetip"
              type="button"
              data-tip="Save server number"
              aria-label={`Save server number ${serverEditDraft}`}
              onClick={submitServerRename}
            >
              #
            </button>
          ) : !isSimulationMode ? (
            <button
              className="map-toolbar-mini-button asidetip"
              type="button"
              data-tip="Edit active server number"
              aria-label={`Edit server number ${activeServerNumber}`}
              onClick={() => {
                setServerEditDraft(activeServerNumber);
                setServerEditInvalid(false);
                setIsEditingServerId(true);
              }}
            >
              #
            </button>
          ) : null}
          <button
            className="remove-team-button asidetip"
            type="button"
            data-tip="Remove active server"
            aria-label={`Remove server ${activeServerId}`}
            disabled={!canRemoveActiveServer}
            onClick={onActiveServerRemove}
          >
            ×
          </button>
          <div className="map-capture-actions" aria-label="Map capture file actions">
            <button
              className="secondary-button map-capture-button"
              type="button"
              onClick={onCaptureImport}
            >
              Import
            </button>
            <button
              className="secondary-button map-capture-button"
              type="button"
              disabled={isSimulationMode}
              title={isSimulationMode ? "Select a numbered server version to export" : undefined}
              onClick={onCaptureExport}
            >
              Export
            </button>
          </div>
        </div>
      </div>

      {!isSimulationMode ? (
        <div className="map-toolbar-section tile-tools">
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
            key={team.id}
            className={`icon-tool-button rival team-tool-button ${
              selectedMarker === "rival" && selectedRivalTeamId === team.id ? "active" : ""
            }`}
            type="button"
            title={formatTeamDisplayLabel(team.code, team.name)}
            aria-label={formatTeamDisplayLabel(team.code, team.name)}
            onClick={() => {
              onMarkerChange("rival");
              onRivalSelect(team.id);
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
      ) : null}
    </div>
  );
}
