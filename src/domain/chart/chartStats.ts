import { MappedPixel } from '../../utils/pixelation';
import { TRANSPARENT_KEY } from '../../utils/pixelEditingUtils';

export interface ChartColorUsage {
  hex: string;
  key: string;
  count: number;
  percentage: number;
}

export interface ChartStats {
  colorCounts: { [hexKey: string]: { count: number; color: string } };
  totalBeadCount: number;
  colorUsage: ChartColorUsage[];
}

export function deriveChartStats(mappedPixelData: MappedPixel[][]): ChartStats {
  const colorCounts: ChartStats['colorCounts'] = {};
  const firstKeyByHex = new Map<string, string>();
  let totalBeadCount = 0;

  for (const row of mappedPixelData) {
    for (const cell of row) {
      if (!cell || cell.isExternal || cell.key === TRANSPARENT_KEY) continue;

      const hex = cell.color.toUpperCase();
      if (!colorCounts[hex]) {
        colorCounts[hex] = { count: 0, color: hex };
        firstKeyByHex.set(hex, cell.key);
      }
      colorCounts[hex].count++;
      totalBeadCount++;
    }
  }

  const colorUsage = Object.entries(colorCounts).map(([hex, data]) => ({
    hex,
    key: firstKeyByHex.get(hex) ?? '',
    count: data.count,
    percentage: totalBeadCount === 0 ? 0 : (data.count / totalBeadCount) * 100,
  }));

  return { colorCounts, totalBeadCount, colorUsage };
}
