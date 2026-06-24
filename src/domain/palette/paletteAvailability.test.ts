import { describe, expect, test } from 'vitest';
import { buildAllowedMardPalette } from './paletteAvailability';

const catalog = [
  { key: 'A01', hex: '#FAF4C8', rgb: { r: 250, g: 244, b: 200 } },
  { key: 'B03', hex: '#7ED3A4', rgb: { r: 126, g: 211, b: 164 } },
  { key: 'C03', hex: '#6DD4F4', rgb: { r: 109, g: 212, b: 244 } },
];

describe('buildAllowedMardPalette', () => {
  test('intersects catalog with inventory preset and removes excluded colors by hex', () => {
    const allowed = buildAllowedMardPalette({
      fullPalette: catalog,
      inventoryCodes: ['B03', 'C03'],
      excludedHexKeys: new Set(['#6dd4f4']),
    });

    expect(allowed).toEqual([
      { key: 'B03', hex: '#7ED3A4', rgb: { r: 126, g: 211, b: 164 } },
    ]);
  });
});
