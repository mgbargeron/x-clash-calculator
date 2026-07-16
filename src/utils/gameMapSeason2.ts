type GameMapTileConfig = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  kind: "copperMine";
  level: number;
  label?: string;
  shape?: string[];
};

const SEASON_TWO_MAP_SIZE = 13;

const copperMineHeightAndWidth = {
  height: 3,
  width: 3,
};

const copperMineShapes = {
  topLeftCorner: ["XXX", "XXX", "XX."],
  topRightCorner: ["XXX", "XXX", ".XX"],
  bottomRightCorner: [".XX", "XXX", "XXX"],
  bottomLeftCorner: ["XX.", "XXX", "XXX"],
  topEdge: ["XXX", "XXX", ".X."],
  rightEdge: [".XX", "XXX", ".XX"],
  bottomEdge: [".X.", "XXX", "XXX"],
  leftEdge: ["XX.", "XXX", "XX."],
  middleTile: [".X.", "XXX", ".X."],
} satisfies Record<string, string[]>;

function getCopperMineShape(rowIndex: number, columnIndex: number): string[] {
  const isTop = rowIndex === 0;
  const isRight = columnIndex === SEASON_TWO_MAP_SIZE - 1;
  const isBottom = rowIndex === SEASON_TWO_MAP_SIZE - 1;
  const isLeft = columnIndex === 0;

  if (isTop && isLeft) return copperMineShapes.topLeftCorner;
  if (isTop && isRight) return copperMineShapes.topRightCorner;
  if (isBottom && isRight) return copperMineShapes.bottomRightCorner;
  if (isBottom && isLeft) return copperMineShapes.bottomLeftCorner;
  if (isTop) return copperMineShapes.topEdge;
  if (isRight) return copperMineShapes.rightEdge;
  if (isBottom) return copperMineShapes.bottomEdge;
  if (isLeft) return copperMineShapes.leftEdge;

  return copperMineShapes.middleTile;
}

export const seasonTwoColumns = SEASON_TWO_MAP_SIZE * copperMineHeightAndWidth.width;
export const seasonTwoRowsCount = SEASON_TWO_MAP_SIZE * copperMineHeightAndWidth.height;

export const seasonTwoTiles: GameMapTileConfig[] = Array.from(
  { length: SEASON_TWO_MAP_SIZE },
  (_, rowIndex) =>
    Array.from(
      { length: SEASON_TWO_MAP_SIZE },
      (_, columnIndex): GameMapTileConfig => ({
        id: `s2-r${String(rowIndex + 1).padStart(2, "0")}-c${String(columnIndex + 1).padStart(2, "0")}-copper`,
        x: columnIndex * copperMineHeightAndWidth.width + 1,
        y: rowIndex * copperMineHeightAndWidth.height + 1,
        width: copperMineHeightAndWidth.width,
        height: copperMineHeightAndWidth.height,
        kind: "copperMine",
        level: 1,
        label: "Copper Mine",
        shape: getCopperMineShape(rowIndex, columnIndex),
      })
    )
).flat();
