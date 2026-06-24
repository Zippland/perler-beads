import { describe, expect, test } from 'vitest';
import { TRANSPARENT_KEY } from '../../utils/pixelEditingUtils';
import { deriveChartStats } from './chartStats';

describe('deriveChartStats', () => {
  test('counts only non-transparent internal cells and groups by uppercase hex', () => {
    const stats = deriveChartStats([
      [
        { key: 'A01', color: '#faf4c8' },
        { key: TRANSPARENT_KEY, color: '#ffffff', isExternal: true },
        { key: 'A01', color: '#FAF4C8' },
      ],
      [
        { key: 'B03', color: '#7ED3A4' },
        { key: 'MASK', color: '#000000', isExternal: true },
        { key: 'B03', color: '#7ed3a4' },
      ],
    ]);

    expect(stats.totalBeadCount).toBe(4);
    expect(stats.colorCounts).toEqual({
      '#FAF4C8': { count: 2, color: '#FAF4C8' },
      '#7ED3A4': { count: 2, color: '#7ED3A4' },
    });
    expect(stats.colorUsage).toEqual([
      { hex: '#FAF4C8', key: 'A01', count: 2, percentage: 50 },
      { hex: '#7ED3A4', key: 'B03', count: 2, percentage: 50 },
    ]);
  });
});
