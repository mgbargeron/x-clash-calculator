import { useMemo } from "react";
import type { GameMapConfig, MapTile, RivalTeam, EnemyTeam, MarkerPointSummary } from "../components/gameMap/types";

type UsePointSummariesProps = {
  mapConfig: GameMapConfig;
  tiles: Record<string, MapTile>;
  rivalTeams: RivalTeam[];
  enemyTeams: EnemyTeam[];
};

export function usePointSummaries({
  mapConfig,
  tiles,
  rivalTeams,
  enemyTeams,
}: UsePointSummariesProps): { clearMarkerCount: number; rivalPointSummary: Record<string, MarkerPointSummary>; ourTeamPointSummary: MarkerPointSummary; enemyPointSummary: Record<string, MarkerPointSummary> } {
  const clearMarkerCount = useMemo(
    () => Object.values(tiles).filter((tile) => tile.marker === "none").length,
    [tiles]
  );

  const rivalPointSummary = useMemo(() => {
    const summaryById: Record<string, MarkerPointSummary> = rivalTeams.reduce<Record<string, MarkerPointSummary>>(
      (summary, team) => {
        summary[team.id] = { count: 0, townPoints: 0, frostMinePoints: 0 };
        return summary;
      },
      {}
    );

    for (const tileConfig of mapConfig.tiles) {
      const tile = tiles[tileConfig.id];
      if (tile?.marker !== "rival") continue;

      const summary = tile.rivalTeamId ? summaryById[tile.rivalTeamId] : undefined;
      if (!summary) continue;

      summary.count += 1;
      if (tileConfig.kind === "town") {
        summary.townPoints += tileConfig.level ?? 0;
      } else if (tileConfig.kind === "frostMine" || tileConfig.kind === "copperMine") {
        summary.frostMinePoints += tileConfig.level ?? 0;
      }
    }

    return summaryById;
  }, [mapConfig.tiles, tiles, rivalTeams]);

  const ourTeamPointSummary = useMemo(() => {
    const summary: MarkerPointSummary = { count: 0, townPoints: 0, frostMinePoints: 0 };
    for (const tileConfig of mapConfig.tiles) {
      const tile = tiles[tileConfig.id];
      if (tile?.marker !== "base") continue;

      summary.count += 1;
      if (tileConfig.kind === "town") {
        summary.townPoints += tileConfig.level ?? 0;
      } else if (tileConfig.kind === "frostMine" || tileConfig.kind === "copperMine") {
        summary.frostMinePoints += tileConfig.level ?? 0;
      }
    }

    return summary;
  }, [mapConfig.tiles, tiles]);

  const enemyPointSummary = useMemo(() => {
    const summaryById: Record<string, MarkerPointSummary> = enemyTeams.reduce<Record<string, MarkerPointSummary>>(
      (summary, team) => {
        summary[team.id] = { count: 0, townPoints: 0, frostMinePoints: 0 };
        return summary;
      },
      {}
    );

    for (const tileConfig of mapConfig.tiles) {
      const tile = tiles[tileConfig.id];
      if (tile?.marker !== "enemy" || !tile.enemyTeamId) continue;

      const summary = summaryById[tile.enemyTeamId];
      if (!summary) continue;

      summary.count += 1;
      if (tileConfig.kind === "town") {
        summary.townPoints += tileConfig.level ?? 0;
      } else if (tileConfig.kind === "frostMine" || tileConfig.kind === "copperMine") {
        summary.frostMinePoints += tileConfig.level ?? 0;
      }
    }

    return summaryById;
  }, [mapConfig.tiles, tiles, enemyTeams]);

  return { clearMarkerCount, rivalPointSummary, ourTeamPointSummary, enemyPointSummary };
}
