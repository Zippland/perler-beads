export type BoardPreference = 'auto' | 52 | 104;

export interface BoardPlanInput {
  gridWidth: number;
  gridHeight: number;
  preference: BoardPreference;
}

export interface BoardPlanBoard {
  id: string;
  boardRow: number;
  boardColumn: number;
  gridStartRow: number;
  gridStartColumn: number;
  gridEndRowExclusive: number;
  gridEndColumnExclusive: number;
  usedWidth: number;
  usedHeight: number;
}

export interface BoardPlan {
  boardSize: 52 | 104;
  columns: number;
  rows: number;
  totalBoards: number;
  usedWidth: number;
  usedHeight: number;
  capacityWidth: number;
  capacityHeight: number;
  wasteCells: number;
  boards: BoardPlanBoard[];
}

function comparePlans(a: BoardPlan, b: BoardPlan): BoardPlan {
  if (a.totalBoards !== b.totalBoards) return a.totalBoards < b.totalBoards ? a : b;
  if (a.wasteCells !== b.wasteCells) return a.wasteCells < b.wasteCells ? a : b;
  return a.boardSize === 104 ? a : b;
}

function rowLabel(index: number): string {
  let value = index;
  let label = '';

  do {
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);

  return label;
}

function createFixedBoardPlan(gridWidth: number, gridHeight: number, boardSize: 52 | 104): BoardPlan {
  const columns = Math.ceil(gridWidth / boardSize);
  const rows = Math.ceil(gridHeight / boardSize);
  const capacityWidth = columns * boardSize;
  const capacityHeight = rows * boardSize;
  const boards: BoardPlanBoard[] = [];

  for (let boardRow = 0; boardRow < rows; boardRow++) {
    for (let boardColumn = 0; boardColumn < columns; boardColumn++) {
      const gridStartRow = boardRow * boardSize;
      const gridStartColumn = boardColumn * boardSize;
      const gridEndRowExclusive = Math.min(gridHeight, gridStartRow + boardSize);
      const gridEndColumnExclusive = Math.min(gridWidth, gridStartColumn + boardSize);

      boards.push({
        id: `${rowLabel(boardRow)}${boardColumn + 1}`,
        boardRow,
        boardColumn,
        gridStartRow,
        gridStartColumn,
        gridEndRowExclusive,
        gridEndColumnExclusive,
        usedWidth: Math.max(0, gridEndColumnExclusive - gridStartColumn),
        usedHeight: Math.max(0, gridEndRowExclusive - gridStartRow),
      });
    }
  }

  return {
    boardSize,
    columns,
    rows,
    totalBoards: columns * rows,
    usedWidth: gridWidth,
    usedHeight: gridHeight,
    capacityWidth,
    capacityHeight,
    wasteCells: capacityWidth * capacityHeight - gridWidth * gridHeight,
    boards,
  };
}

export function createBoardPlan(input: BoardPlanInput): BoardPlan {
  const gridWidth = Math.max(1, Math.floor(input.gridWidth));
  const gridHeight = Math.max(1, Math.floor(input.gridHeight));

  if (input.preference === 52 || input.preference === 104) {
    return createFixedBoardPlan(gridWidth, gridHeight, input.preference);
  }

  if (gridWidth <= 52 && gridHeight <= 52) {
    return createFixedBoardPlan(gridWidth, gridHeight, 52);
  }

  if (gridWidth <= 104 && gridHeight <= 104) {
    return createFixedBoardPlan(gridWidth, gridHeight, 104);
  }

  return comparePlans(
    createFixedBoardPlan(gridWidth, gridHeight, 52),
    createFixedBoardPlan(gridWidth, gridHeight, 104)
  );
}
