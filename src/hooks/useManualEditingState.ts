import { useState, useCallback } from 'react';
import { MappedPixel } from '../utils/pixelation';

// 颜色替换状态类型
export interface ColorReplaceState {
  isActive: boolean;
  step: 'select-source' | 'select-target';
  sourceColor?: { key: string; color: string };
}

/**
 * 手动编辑状态管理hook
 */
export function useManualEditingState() {
  // 手动上色模式
  const [isManualColoringMode, setIsManualColoringMode] = useState<boolean>(false);
  
  // 选中的颜色
  const [selectedColor, setSelectedColor] = useState<MappedPixel | null>(null);
  
  // 一键擦除模式
  const [isEraseMode, setIsEraseMode] = useState<boolean>(false);
  
  // 颜色替换状态
  const [colorReplaceState, setColorReplaceState] = useState<ColorReplaceState>({
    isActive: false,
    step: 'select-source'
  });
  
  // 高亮颜色键
  const [highlightColorKey, setHighlightColorKey] = useState<string | null>(null);

  // 进入手动编辑模式
  const enterManualMode = useCallback(() => {
    setIsManualColoringMode(true);
    setSelectedColor(null);
    setIsEraseMode(false);
    setColorReplaceState({
      isActive: false,
      step: 'select-source'
    });
    setHighlightColorKey(null);
  }, []);

  // 退出手动编辑模式
  const exitManualMode = useCallback(() => {
    setIsManualColoringMode(false);
    setSelectedColor(null);
    setIsEraseMode(false);
    setColorReplaceState({
      isActive: false,
      step: 'select-source'
    });
    setHighlightColorKey(null);
  }, []);

  // 切换擦除模式
  const toggleEraseMode = useCallback(() => {
    if (!isManualColoringMode) return;
    
    if (colorReplaceState.isActive) {
      setColorReplaceState({
        isActive: false,
        step: 'select-source'
      });
      setHighlightColorKey(null);
    }
    
    setIsEraseMode(!isEraseMode);
    if (!isEraseMode) {
      setSelectedColor(null);
    }
  }, [isManualColoringMode, isEraseMode, colorReplaceState.isActive]);

  // 切换颜色替换模式
  const toggleColorReplaceMode = useCallback(() => {
    setColorReplaceState(prev => {
      if (prev.isActive) {
        setHighlightColorKey(null);
        return {
          isActive: false,
          step: 'select-source'
        };
      } else {
        setIsEraseMode(false);
        setSelectedColor(null);
        return {
          isActive: true,
          step: 'select-source'
        };
      }
    });
  }, []);

  // 选择颜色
  const selectColor = useCallback((colorData: { key: string; color: string; isExternal?: boolean }) => {
    const TRANSPARENT_KEY = 'ERASE';
    
    // 如果选择的是橡皮擦且当前在颜色替换模式，退出替换模式
    if (colorData.key === TRANSPARENT_KEY && colorReplaceState.isActive) {
      setColorReplaceState({
        isActive: false,
        step: 'select-source'
      });
      setHighlightColorKey(null);
    }
    
    // 选择任何颜色时，都应该退出一键擦除模式
    if (isEraseMode) {
      setIsEraseMode(false);
    }
    
    setSelectedColor(colorData);
  }, [isEraseMode, colorReplaceState.isActive]);

  // 从画布选择源颜色（用于颜色替换）
  const selectSourceColorFromCanvas = useCallback((colorData: { key: string; color: string }) => {
    if (colorReplaceState.isActive && colorReplaceState.step === 'select-source') {
      setHighlightColorKey(colorData.color);
      setColorReplaceState({
        isActive: true,
        step: 'select-target',
        sourceColor: colorData
      });
    }
  }, [colorReplaceState]);

  // 完成颜色替换
  const completeColorReplace = useCallback(() => {
    setColorReplaceState({
      isActive: false,
      step: 'select-source'
    });
    setHighlightColorKey(null);
  }, []);

  // 设置高亮颜色
  const setHighlight = useCallback((colorHex: string) => {
    setHighlightColorKey(colorHex);
  }, []);

  // 清除高亮
  const clearHighlight = useCallback(() => {
    setHighlightColorKey(null);
  }, []);

  return {
    // 状态
    isManualColoringMode,
    selectedColor,
    isEraseMode,
    colorReplaceState,
    highlightColorKey,
    
    // 操作函数
    enterManualMode,
    exitManualMode,
    toggleEraseMode,
    toggleColorReplaceMode,
    selectColor,
    selectSourceColorFromCanvas,
    completeColorReplace,
    setHighlight,
    clearHighlight,
    
    // 直接设置函数（用于特殊情况）
    setIsManualColoringMode,
    setSelectedColor,
    setIsEraseMode,
    setColorReplaceState,
    setHighlightColorKey
  };
} 