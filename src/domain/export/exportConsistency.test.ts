import { describe, expect, test } from 'vitest';
import { createBoardPlan } from '../boards/boardPlan';
import { validateExportConsistency } from './exportConsistency';

describe('validateExportConsistency', () => {
  test('passes when colors are allowed, BOM equals beads, and board coverage is exact', () => {
    const chart = [
      [{ key: 'A01', color: '#FAF4C8' }, { key: 'B03', color: '#7ED3A4' }],
      [{ key: 'A01', color: '#FAF4C8' }, { key: 'B03', color: '#7ED3A4' }],
    ];

    expect(validateExportConsistency({
      mappedPixelData: chart,
      allowedMardCodes: new Set(['A01', 'B03']),
      boardPlan: createBoardPlan({ gridWidth: 2, gridHeight: 2, preference: 'auto' }),
    })).toEqual([]);
  });

  test('blocks export when chart still uses colors outside the active inventory', () => {
    const issues = validateExportConsistency({
      mappedPixelData: [[{ key: 'A01', color: '#FAF4C8' }, { key: 'B03', color: '#7ED3A4' }]],
      allowedMardCodes: new Set(['A01']),
      boardPlan: createBoardPlan({ gridWidth: 2, gridHeight: 1, preference: 'auto' }),
    });

    expect(issues).toContain('图纸仍包含当前库存色包外的颜色：B03');
  });
});
