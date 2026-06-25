import { describe, expect, test } from 'vitest';
import { createBoardPlan } from '../../domain/boards/boardPlan';
import { buildMakerPackManifest, buildStoredZipBlob, listMakerPackPaths } from './buildMakerPack';

const chart = [
  [{ key: 'A01', color: '#FAF4C8' }, { key: 'B03', color: '#7ED3A4' }],
  [{ key: 'A01', color: '#FAF4C8' }, { key: 'TRANSPARENT', color: '#FFFFFF', isExternal: true }],
];

describe('maker pack contract', () => {
  test('uses one archive with fixed top-level files and per-board PNG paths', () => {
    const boardPlan = createBoardPlan({ gridWidth: 55, gridHeight: 2, preference: 52 });

    expect(listMakerPackPaths(boardPlan)).toEqual([
      'print-chart.png',
      'pattern.csv',
      'manifest.json',
      'boards/A1.png',
      'boards/A2.png',
    ]);
  });

  test('manifest keeps grid, inventory preset, board plan, and BOM fields', () => {
    const boardPlan = createBoardPlan({ gridWidth: 2, gridHeight: 2, preference: 'auto' });
    const manifest = buildMakerPackManifest({
      mappedPixelData: chart,
      gridDimensions: { N: 2, M: 2 },
      inventoryPresetId: 'mard-core',
      boardPlan,
      activeBeadPalette: [
        { key: 'A01', hex: '#FAF4C8', rgb: { r: 250, g: 244, b: 200 } },
        { key: 'B03', hex: '#7ED3A4', rgb: { r: 126, g: 211, b: 164 } },
      ],
    });

    expect(manifest.grid).toEqual({ N: 2, M: 2 });
    expect(manifest.inventoryPresetId).toBe('mard-core');
    expect(manifest.boardPlan.totalBoards).toBe(1);
    expect(manifest.bom).toEqual([
      { mardCode: 'A01', hex: '#FAF4C8', count: 2, percentage: 2 / 3 },
      { mardCode: 'B03', hex: '#7ED3A4', count: 1, percentage: 1 / 3 },
    ]);
  });

  test('builds a single ZIP blob containing every maker pack path', async () => {
    const zip = buildStoredZipBlob([
      { path: 'print-chart.png', bytes: new Uint8Array([1, 2, 3]) },
      { path: 'pattern.csv', bytes: new TextEncoder().encode('A01') },
      { path: 'manifest.json', bytes: new TextEncoder().encode('{}') },
      { path: 'boards/A1.png', bytes: new Uint8Array([4, 5, 6]) },
    ]);
    const bytes = new Uint8Array(await zip.arrayBuffer());
    const text = new TextDecoder().decode(bytes);

    expect(zip.type).toBe('application/zip');
    expect(text).toContain('print-chart.png');
    expect(text).toContain('pattern.csv');
    expect(text).toContain('manifest.json');
    expect(text).toContain('boards/A1.png');
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });
});
