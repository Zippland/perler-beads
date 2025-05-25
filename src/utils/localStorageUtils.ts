const STORAGE_KEY = 'customPerlerPaletteSelections';

export interface PaletteSelections {
  [hexValue: string]: boolean;
}

/**
 * 保存自定义色板选择状态到localStorage
 */
export function savePaletteSelections(selections: PaletteSelections): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selections));
  } catch (error) {
    console.error("无法保存色板选择到本地存储:", error);
  }
}

/**
 * 从localStorage加载自定义色板选择状态
 */
export function loadPaletteSelections(): PaletteSelections | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("无法从本地存储加载色板选择:", error);
    localStorage.removeItem(STORAGE_KEY); // 清除无效数据
  }
  return null;
}

/**
 * 将预设色板转换为选择状态对象（基于hex值）
 */
export function presetToSelections(allHexValues: string[], presetHexValues: string[]): PaletteSelections {
  const presetSet = new Set(presetHexValues.map(hex => hex.toUpperCase()));
  const selections: PaletteSelections = {};
  
  allHexValues.forEach(hex => {
    const normalizedHex = hex.toUpperCase();
    selections[normalizedHex] = presetSet.has(normalizedHex);
  });
  
  return selections;
}

/**
 * 根据MARD色号预设生成基于hex值的选择状态（用于兼容旧预设）
 */
export function presetKeysToHexSelections(
  allBeadPalette: Array<{key: string, hex: string}>, 
  presetKeys: string[]
): PaletteSelections {
  const presetKeySet = new Set(presetKeys);
  const selections: PaletteSelections = {};
  
  allBeadPalette.forEach(color => {
    const normalizedHex = color.hex.toUpperCase();
    selections[normalizedHex] = presetKeySet.has(color.key);
  });
  
  return selections;
} 