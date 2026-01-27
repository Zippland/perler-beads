'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { MappedPixel, PixelationMode, PaletteColor } from '../utils/pixelation';
import { ColorSystem } from '../utils/colorSystemUtils';
import { PaletteSelections } from '../utils/localStorageUtils';
import { GridDownloadOptions } from '../types/downloadTypes';
import { gridLineColorOptions } from '../components/DownloadSettingsModal';
import {
  WorkspaceMode,
  WorkspaceState,
  EditState,
  UIState,
  ToolType,
  ColorReplaceState,
  MagnifierArea,
  TooltipData,
  ColorStats,
} from '../types/workspace';

// 默认下载设置
const defaultDownloadOptions: GridDownloadOptions = {
  showGrid: true,
  gridInterval: 10,
  showCoordinates: true,
  showCellNumbers: true,
  gridLineColor: gridLineColorOptions[0].value,
  includeStats: true,
  exportCsv: false,
};

// 默认工作区状态
const defaultWorkspaceState: WorkspaceState = {
  mode: 'preview',
  originalImageSrc: null,
  mappedPixelData: null,
  gridDimensions: null,
  granularity: 50,
  similarityThreshold: 30,
  pixelationMode: PixelationMode.Dominant,
  selectedColorSystem: 'MARD',
  activeBeadPalette: [],
  customPaletteSelections: {},
  excludedColorKeys: new Set(),
  initialGridColorKeys: new Set(),
  colorCounts: null,
  totalBeadCount: 0,
  downloadOptions: defaultDownloadOptions,
};

// 默认编辑状态
const defaultEditState: EditState = {
  isManualColoringMode: false,
  selectedColor: null,
  selectedTool: 'brush',
  isEraseMode: false,
  colorReplaceState: {
    isActive: false,
    step: 'select-source',
  },
  isMagnifierActive: false,
  magnifierArea: null,
  highlightColorKey: null,
  isFloatingPaletteOpen: true,
  showFullPalette: false,
  activeFloatingTool: null,
};

// 默认 UI 状态
const defaultUIState: UIState = {
  tooltipData: null,
  isDownloadSettingsOpen: false,
  isCustomPaletteEditorOpen: false,
  isDonationModalOpen: false,
  isFocusModePreDownloadModalOpen: false,
  showExcludedColors: false,
  isCustomPalette: false,
  isMounted: false,
};

// Context 类型
interface WorkspaceContextType {
  // 状态
  workspace: WorkspaceState;
  edit: EditState;
  ui: UIState;

  // Actions - 工作区
  setMode: (mode: WorkspaceMode) => void;
  setOriginalImageSrc: (src: string | null) => void;
  setMappedPixelData: (data: MappedPixel[][] | null) => void;
  setGridDimensions: (dimensions: { N: number; M: number } | null) => void;
  setGranularity: (value: number) => void;
  setSimilarityThreshold: (value: number) => void;
  setPixelationMode: (mode: PixelationMode) => void;
  setSelectedColorSystem: (system: ColorSystem) => void;
  setActiveBeadPalette: (palette: PaletteColor[]) => void;
  setCustomPaletteSelections: (selections: PaletteSelections) => void;
  setExcludedColorKeys: (keys: Set<string>) => void;
  setInitialGridColorKeys: (keys: Set<string>) => void;
  setColorCounts: (counts: ColorStats | null) => void;
  setTotalBeadCount: (count: number) => void;
  setDownloadOptions: (options: GridDownloadOptions) => void;

  // Actions - 编辑
  setIsManualColoringMode: (isManual: boolean) => void;
  setSelectedColor: (color: MappedPixel | null) => void;
  setSelectedTool: (tool: ToolType) => void;
  setIsEraseMode: (isErase: boolean) => void;
  setColorReplaceState: (state: ColorReplaceState) => void;
  setIsMagnifierActive: (isActive: boolean) => void;
  setMagnifierArea: (area: MagnifierArea | null) => void;
  setHighlightColorKey: (key: string | null) => void;
  setIsFloatingPaletteOpen: (isOpen: boolean) => void;
  setShowFullPalette: (show: boolean) => void;
  setActiveFloatingTool: (tool: 'palette' | 'magnifier' | null) => void;

  // Actions - UI
  setTooltipData: (data: TooltipData | null) => void;
  setIsDownloadSettingsOpen: (isOpen: boolean) => void;
  setIsCustomPaletteEditorOpen: (isOpen: boolean) => void;
  setIsDonationModalOpen: (isOpen: boolean) => void;
  setIsFocusModePreDownloadModalOpen: (isOpen: boolean) => void;
  setShowExcludedColors: (show: boolean) => void;
  setIsCustomPalette: (isCustom: boolean) => void;
  setIsMounted: (isMounted: boolean) => void;
}

// 创建 Context
const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

// Provider 组件
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  // 工作区状态
  const [workspace, setWorkspace] = useState<WorkspaceState>(defaultWorkspaceState);
  const [edit, setEdit] = useState<EditState>(defaultEditState);
  const [ui, setUI] = useState<UIState>(defaultUIState);

  // 工作区 Actions
  const setMode = useCallback((mode: WorkspaceMode) => {
    setWorkspace((prev) => ({ ...prev, mode }));
  }, []);

  const setOriginalImageSrc = useCallback((src: string | null) => {
    setWorkspace((prev) => ({ ...prev, originalImageSrc: src }));
  }, []);

  const setMappedPixelData = useCallback((data: MappedPixel[][] | null) => {
    setWorkspace((prev) => ({ ...prev, mappedPixelData: data }));
  }, []);

  const setGridDimensions = useCallback((dimensions: { N: number; M: number } | null) => {
    setWorkspace((prev) => ({ ...prev, gridDimensions: dimensions }));
  }, []);

  const setGranularity = useCallback((value: number) => {
    setWorkspace((prev) => ({ ...prev, granularity: value }));
  }, []);

  const setSimilarityThreshold = useCallback((value: number) => {
    setWorkspace((prev) => ({ ...prev, similarityThreshold: value }));
  }, []);

  const setPixelationMode = useCallback((mode: PixelationMode) => {
    setWorkspace((prev) => ({ ...prev, pixelationMode: mode }));
  }, []);

  const setSelectedColorSystem = useCallback((system: ColorSystem) => {
    setWorkspace((prev) => ({ ...prev, selectedColorSystem: system }));
  }, []);

  const setActiveBeadPalette = useCallback((palette: PaletteColor[]) => {
    setWorkspace((prev) => ({ ...prev, activeBeadPalette: palette }));
  }, []);

  const setCustomPaletteSelections = useCallback((selections: PaletteSelections) => {
    setWorkspace((prev) => ({ ...prev, customPaletteSelections: selections }));
  }, []);

  const setExcludedColorKeys = useCallback((keys: Set<string>) => {
    setWorkspace((prev) => ({ ...prev, excludedColorKeys: keys }));
  }, []);

  const setInitialGridColorKeys = useCallback((keys: Set<string>) => {
    setWorkspace((prev) => ({ ...prev, initialGridColorKeys: keys }));
  }, []);

  const setColorCounts = useCallback((counts: ColorStats | null) => {
    setWorkspace((prev) => ({ ...prev, colorCounts: counts }));
  }, []);

  const setTotalBeadCount = useCallback((count: number) => {
    setWorkspace((prev) => ({ ...prev, totalBeadCount: count }));
  }, []);

  const setDownloadOptions = useCallback((options: GridDownloadOptions) => {
    setWorkspace((prev) => ({ ...prev, downloadOptions: options }));
  }, []);

  // 编辑 Actions
  const setIsManualColoringMode = useCallback((isManual: boolean) => {
    setEdit((prev) => ({ ...prev, isManualColoringMode: isManual }));
  }, []);

  const setSelectedColor = useCallback((color: MappedPixel | null) => {
    setEdit((prev) => ({ ...prev, selectedColor: color }));
  }, []);

  const setSelectedTool = useCallback((tool: ToolType) => {
    setEdit((prev) => ({ ...prev, selectedTool: tool }));
  }, []);

  const setIsEraseMode = useCallback((isErase: boolean) => {
    setEdit((prev) => ({ ...prev, isEraseMode: isErase }));
  }, []);

  const setColorReplaceState = useCallback((state: ColorReplaceState) => {
    setEdit((prev) => ({ ...prev, colorReplaceState: state }));
  }, []);

  const setIsMagnifierActive = useCallback((isActive: boolean) => {
    setEdit((prev) => ({ ...prev, isMagnifierActive: isActive }));
  }, []);

  const setMagnifierArea = useCallback((area: MagnifierArea | null) => {
    setEdit((prev) => ({ ...prev, magnifierArea: area }));
  }, []);

  const setHighlightColorKey = useCallback((key: string | null) => {
    setEdit((prev) => ({ ...prev, highlightColorKey: key }));
  }, []);

  const setIsFloatingPaletteOpen = useCallback((isOpen: boolean) => {
    setEdit((prev) => ({ ...prev, isFloatingPaletteOpen: isOpen }));
  }, []);

  const setShowFullPalette = useCallback((show: boolean) => {
    setEdit((prev) => ({ ...prev, showFullPalette: show }));
  }, []);

  const setActiveFloatingTool = useCallback((tool: 'palette' | 'magnifier' | null) => {
    setEdit((prev) => ({ ...prev, activeFloatingTool: tool }));
  }, []);

  // UI Actions
  const setTooltipData = useCallback((data: TooltipData | null) => {
    setUI((prev) => ({ ...prev, tooltipData: data }));
  }, []);

  const setIsDownloadSettingsOpen = useCallback((isOpen: boolean) => {
    setUI((prev) => ({ ...prev, isDownloadSettingsOpen: isOpen }));
  }, []);

  const setIsCustomPaletteEditorOpen = useCallback((isOpen: boolean) => {
    setUI((prev) => ({ ...prev, isCustomPaletteEditorOpen: isOpen }));
  }, []);

  const setIsDonationModalOpen = useCallback((isOpen: boolean) => {
    setUI((prev) => ({ ...prev, isDonationModalOpen: isOpen }));
  }, []);

  const setIsFocusModePreDownloadModalOpen = useCallback((isOpen: boolean) => {
    setUI((prev) => ({ ...prev, isFocusModePreDownloadModalOpen: isOpen }));
  }, []);

  const setShowExcludedColors = useCallback((show: boolean) => {
    setUI((prev) => ({ ...prev, showExcludedColors: show }));
  }, []);

  const setIsCustomPalette = useCallback((isCustom: boolean) => {
    setUI((prev) => ({ ...prev, isCustomPalette: isCustom }));
  }, []);

  const setIsMounted = useCallback((isMounted: boolean) => {
    setUI((prev) => ({ ...prev, isMounted }));
  }, []);

  const value: WorkspaceContextType = {
    // 状态
    workspace,
    edit,
    ui,
    // 工作区 Actions
    setMode,
    setOriginalImageSrc,
    setMappedPixelData,
    setGridDimensions,
    setGranularity,
    setSimilarityThreshold,
    setPixelationMode,
    setSelectedColorSystem,
    setActiveBeadPalette,
    setCustomPaletteSelections,
    setExcludedColorKeys,
    setInitialGridColorKeys,
    setColorCounts,
    setTotalBeadCount,
    setDownloadOptions,
    // 编辑 Actions
    setIsManualColoringMode,
    setSelectedColor,
    setSelectedTool,
    setIsEraseMode,
    setColorReplaceState,
    setIsMagnifierActive,
    setMagnifierArea,
    setHighlightColorKey,
    setIsFloatingPaletteOpen,
    setShowFullPalette,
    setActiveFloatingTool,
    // UI Actions
    setTooltipData,
    setIsDownloadSettingsOpen,
    setIsCustomPaletteEditorOpen,
    setIsDonationModalOpen,
    setIsFocusModePreDownloadModalOpen,
    setShowExcludedColors,
    setIsCustomPalette,
    setIsMounted,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

// Hook 用于访问 Context
export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}

// 便捷 Hooks
export function useWorkspaceState() {
  const { workspace } = useWorkspace();
  return workspace;
}

export function useEditState() {
  const { edit } = useWorkspace();
  return edit;
}

export function useUIState() {
  const { ui } = useWorkspace();
  return ui;
}
