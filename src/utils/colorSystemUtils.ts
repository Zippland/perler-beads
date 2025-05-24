import { PaletteColor } from './pixelation';
import colorSystemMapping from '../app/colorSystemMapping.json';
import beadPaletteData from '../app/beadPaletteData.json';

// 定义色号系统类型并导出
export type ColorSystem = 'MARD' | 'COCO' | '漫漫' | '盼盼' | '咪小窝';

// 色号系统选项
export const colorSystemOptions = [
  { key: 'MARD', name: 'MARD马德' },
  { key: 'COCO', name: 'COCO可可' },
  { key: '漫漫', name: '漫漫拼豆' },
  { key: '盼盼', name: '盼盼拼豆' },
  { key: '咪小窝', name: '咪小窝' },
];

// 类型定义
type ColorMapping = Record<string, Record<ColorSystem, string>>;
const typedColorSystemMapping = colorSystemMapping as ColorMapping;
const typedBeadPaletteData = beadPaletteData as Record<string, string>;

// 从colorSystemMapping.json加载完整的颜色映射数据
export function loadFullColorMapping(): Map<string, any> {
  const mapping = new Map();
  Object.entries(colorSystemMapping).forEach(([baseKey, colorData]) => {
    mapping.set(baseKey, colorData);
  });
  return mapping;
}

// 将色板转换到指定色号系统
export function convertPaletteToColorSystem(
  palette: PaletteColor[],
  colorSystem: ColorSystem
): PaletteColor[] {
  return palette.map(color => {
    const colorMapping = typedColorSystemMapping[color.hex];
    if (colorMapping && colorMapping[colorSystem]) {
      return {
        ...color,
        key: colorMapping[colorSystem]
      };
    }
    return color; // 如果找不到映射，保持原样
  });
}

// 获取指定色号系统的显示键 - 重新设计的简化版本
export function getDisplayColorKey(originalKey: string, colorSystem: ColorSystem): string {
  // 对于特殊键（如透明键），直接返回原键
  if (originalKey === 'ERASE' || originalKey.length === 0 || originalKey === '?') {
    return originalKey;
  }
  
  // 如果目标色号系统就是MARD，直接返回原键
  if (colorSystem === 'MARD') {
    return originalKey;
  }
  
  // 1. 通过MARD色号从beadPaletteData获取hex值
  const hexValue = typedBeadPaletteData[originalKey];
  if (!hexValue) {
    return originalKey; // 如果找不到对应的hex值，返回原键
  }
  
  // 2. 通过hex值从colorSystemMapping获取目标色号系统的值
  const colorMapping = typedColorSystemMapping[hexValue];
  if (colorMapping && colorMapping[colorSystem]) {
    return colorMapping[colorSystem];
  }
  
  return originalKey; // 如果找不到映射，返回原键
}

// 将色号键转换回基础系统（MARD）
export function convertToBaseKey(displayKey: string, colorSystem: ColorSystem): string {
  if (colorSystem === 'MARD') {
    return displayKey;
  }
  
  for (const [hex, mapping] of Object.entries(typedColorSystemMapping)) {
    if (mapping[colorSystem] === displayKey) {
      return mapping.MARD;
    }
  }
  return displayKey; // 如果找不到映射，返回原键
}

// 验证颜色在指定系统中是否有效
export function isValidColorInSystem(hexValue: string, colorSystem: ColorSystem): boolean {
  const mapping = typedColorSystemMapping[hexValue];
  return mapping && mapping[colorSystem] !== undefined;
} 