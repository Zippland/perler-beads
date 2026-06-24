import { describe, expect, test } from 'vitest';
import { TRANSPARENT_KEY } from '../../utils/pixelEditingUtils';
import {
  buildRectangleSelection,
  deleteSelection,
  replaceColorsAcrossChart,
  replaceSelectionColor,
} from './chartEdits';

const red = { key: 'R01', color: '#FF0000' };
const blue = { key: 'B01', color: '#0000FF' };
const paintedBlue = { key: 'B01', color: '#0000FF', isExternal: false };
const green = { key: 'G01', color: '#00FF00' };
const transparent = { key: TRANSPARENT_KEY, color: '#FFFFFF', isExternal: true };

describe('chart edit operations', () => {
  test('builds an inclusive rectangle selection with normalized endpoints', () => {
    expect(buildRectangleSelection({ row: 2, column: 3 }, { row: 1, column: 1 })).toEqual(new Set([
      '1:1', '1:2', '1:3',
      '2:1', '2:2', '2:3',
    ]));
  });

  test('replaces only selected non-transparent cells', () => {
    const result = replaceSelectionColor({
      data: [[red, transparent], [green, red]],
      selection: new Set(['0:0', '0:1', '1:0']),
      targetColor: blue,
    });

    expect(result.changedCount).toBe(2);
    expect(result.data).toEqual([[paintedBlue, transparent], [paintedBlue, red]]);
  });

  test('deletes selected cells by turning them transparent without shrinking the chart', () => {
    const result = deleteSelection({
      data: [[red, blue], [green, red]],
      selection: new Set(['0:1', '1:0']),
    });

    expect(result.changedCount).toBe(2);
    expect(result.data).toEqual([[red, transparent], [transparent, red]]);
  });

  test('replaces multiple source colors across the whole chart as one operation', () => {
    const result = replaceColorsAcrossChart({
      data: [[red, blue], [green, red]],
      sourceKeys: new Set(['R01', 'G01']),
      targetColor: blue,
    });

    expect(result.changedCount).toBe(3);
    expect(result.data).toEqual([[paintedBlue, blue], [paintedBlue, paintedBlue]]);
  });
});
