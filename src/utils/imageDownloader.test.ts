import { describe, expect, test } from 'vitest';
import { parseCsvText } from './imageDownloader';

describe('parseCsvText', () => {
  test('normalizes imported HEX cells to MARD keys while preserving colors', () => {
    const parsed = parseCsvText('#FAF4C8,#000000\nTRANSPARENT,#FFFFFF', {
      allowedHexColors: new Set(['#FAF4C8', '#000000', '#FFFFFF']),
    });

    expect(parsed.gridDimensions).toEqual({ N: 2, M: 2 });
    expect(parsed.mappedPixelData[0][0]).toEqual({
      key: 'A01',
      color: '#FAF4C8',
      isExternal: false,
    });
    expect(parsed.mappedPixelData[0][1]).toEqual({
      key: 'H07',
      color: '#000000',
      isExternal: false,
    });
    expect(parsed.mappedPixelData[1][0]).toEqual({
      key: 'TRANSPARENT',
      color: '#FFFFFF',
      isExternal: true,
    });
    expect(parsed.mappedPixelData[1][1]).toEqual({
      key: 'T01',
      color: '#FFFFFF',
      isExternal: false,
    });
  });

  test('rejects HEX values that are not in the color mapping catalog', () => {
    expect(() => parseCsvText('#123456')).toThrow('当前色号映射中不存在');
  });
});
