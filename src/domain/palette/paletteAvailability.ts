import { PaletteColor } from '../../utils/pixelation';

export interface AllowedMardPaletteInput {
  fullPalette: PaletteColor[];
  inventoryCodes: readonly string[];
  excludedHexKeys: Set<string>;
}

export function buildAllowedMardPalette(input: AllowedMardPaletteInput): PaletteColor[] {
  const inventory = new Set(input.inventoryCodes);
  const excluded = new Set(Array.from(input.excludedHexKeys, (hex) => hex.toUpperCase()));

  return input.fullPalette.filter((color) => (
    inventory.has(color.key) && !excluded.has(color.hex.toUpperCase())
  ));
}
