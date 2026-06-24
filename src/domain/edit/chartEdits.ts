import { MappedPixel } from '../../utils/pixelation';
import { TRANSPARENT_KEY, transparentColorData } from '../../utils/pixelEditingUtils';

export interface GridPoint {
  row: number;
  column: number;
}

export interface ChartEditResult {
  data: MappedPixel[][];
  changedCount: number;
}

export function buildSelectionKey(row: number, column: number): string {
  return `${row}:${column}`;
}

export function buildRectangleSelection(start: GridPoint, end: GridPoint): Set<string> {
  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);
  const minColumn = Math.min(start.column, end.column);
  const maxColumn = Math.max(start.column, end.column);
  const selection = new Set<string>();

  for (let row = minRow; row <= maxRow; row++) {
    for (let column = minColumn; column <= maxColumn; column++) {
      selection.add(buildSelectionKey(row, column));
    }
  }

  return selection;
}

function cloneChart(data: MappedPixel[][]): MappedPixel[][] {
  return data.map((row) => row.map((cell) => ({ ...cell })));
}

function parseSelectionKey(key: string): GridPoint | null {
  const [row, column] = key.split(':').map(Number);
  if (!Number.isInteger(row) || !Number.isInteger(column)) return null;
  return { row, column };
}

function isEditableCell(cell: MappedPixel | undefined): cell is MappedPixel {
  return Boolean(cell && !cell.isExternal && cell.key !== TRANSPARENT_KEY);
}

export function replaceSelectionColor(input: {
  data: MappedPixel[][];
  selection: Set<string>;
  targetColor: MappedPixel;
}): ChartEditResult {
  const data = cloneChart(input.data);
  let changedCount = 0;

  for (const key of input.selection) {
    const point = parseSelectionKey(key);
    if (!point) continue;

    const cell = data[point.row]?.[point.column];
    if (!isEditableCell(cell)) continue;
    if (cell.key === input.targetColor.key) continue;

    data[point.row][point.column] = { ...input.targetColor, isExternal: false };
    changedCount++;
  }

  return { data: changedCount > 0 ? data : input.data, changedCount };
}

export function deleteSelection(input: {
  data: MappedPixel[][];
  selection: Set<string>;
}): ChartEditResult {
  const data = cloneChart(input.data);
  let changedCount = 0;

  for (const key of input.selection) {
    const point = parseSelectionKey(key);
    if (!point) continue;

    const cell = data[point.row]?.[point.column];
    if (!isEditableCell(cell)) continue;

    data[point.row][point.column] = { ...transparentColorData };
    changedCount++;
  }

  return { data: changedCount > 0 ? data : input.data, changedCount };
}

export function replaceColorsAcrossChart(input: {
  data: MappedPixel[][];
  sourceKeys: Set<string>;
  targetColor: MappedPixel;
}): ChartEditResult {
  const data = cloneChart(input.data);
  let changedCount = 0;

  for (let row = 0; row < data.length; row++) {
    for (let column = 0; column < data[row].length; column++) {
      const cell = data[row][column];
      if (!isEditableCell(cell) || !input.sourceKeys.has(cell.key)) continue;
      if (cell.key === input.targetColor.key) continue;

      data[row][column] = { ...input.targetColor, isExternal: false };
      changedCount++;
    }
  }

  return { data: changedCount > 0 ? data : input.data, changedCount };
}
