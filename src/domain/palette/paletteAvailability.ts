import { PaletteColor } from '../../utils/pixelation';

export interface AllowedMardPaletteInput {
  fullPalette: PaletteColor[];
  inventoryCodes: readonly string[];
}

export function buildAllowedMardPalette(input: AllowedMardPaletteInput): PaletteColor[] {
  const inventory = new Set(input.inventoryCodes);

  return input.fullPalette.filter((color) => inventory.has(color.key));
}
