import { BoardPlan } from '../boards/boardPlan';
import { deriveChartStats } from '../chart/chartStats';
import { MappedPixel } from '../../utils/pixelation';
import { TRANSPARENT_KEY } from '../../utils/pixelEditingUtils';

export interface ExportConsistencyInput {
  mappedPixelData: MappedPixel[][];
  allowedMardCodes: Set<string>;
  boardPlan: BoardPlan;
}

export function validateExportConsistency(input: ExportConsistencyInput): string[] {
  const issues: string[] = [];
  const usedCodes = new Set<string>();

  for (const row of input.mappedPixelData) {
    for (const cell of row) {
      if (!cell || cell.isExternal || cell.key === TRANSPARENT_KEY) continue;
      usedCodes.add(cell.key);
    }
  }

  const disallowedCodes = Array.from(usedCodes).filter((code) => !input.allowedMardCodes.has(code)).sort();
  if (disallowedCodes.length > 0) {
    issues.push(`图纸仍包含当前库存色包外的颜色：${disallowedCodes.join(', ')}`);
  }

  const stats = deriveChartStats(input.mappedPixelData);
  const countedCells = input.mappedPixelData.flat().filter((cell) => cell && !cell.isExternal && cell.key !== TRANSPARENT_KEY).length;
  if (stats.totalBeadCount !== countedCells) {
    issues.push(`BOM 总数 ${stats.totalBeadCount} 与非透明格数量 ${countedCells} 不一致`);
  }

  const covered = new Set<string>();
  for (const board of input.boardPlan.boards) {
    for (let row = board.gridStartRow; row < board.gridEndRowExclusive; row++) {
      for (let column = board.gridStartColumn; column < board.gridEndColumnExclusive; column++) {
        const key = `${row}:${column}`;
        if (covered.has(key)) issues.push(`画板分区重叠：${board.id} 覆盖了 ${key}`);
        covered.add(key);
      }
    }
  }

  const gridHeight = input.mappedPixelData.length;
  const gridWidth = input.mappedPixelData[0]?.length ?? 0;
  for (let row = 0; row < gridHeight; row++) {
    for (let column = 0; column < gridWidth; column++) {
      if (!covered.has(`${row}:${column}`)) {
        issues.push(`画板分区未覆盖格子：${row}:${column}`);
      }
    }
  }

  return issues;
}
