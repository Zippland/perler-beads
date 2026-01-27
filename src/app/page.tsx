'use client';

import React, { useState, useCallback, useRef, ChangeEvent, useEffect } from 'react';

// 强制动态渲染，避免静态生成时的水合问题
// 注意：Electron 打包走静态导出（next export），这里不要 force-dynamic
import { WorkspaceLayout } from '@/components/layout';
import { CanvasPlaceholder } from '@/components/layout/CenterCanvas';
import { SidebarSection, SidebarDivider } from '@/components/layout/LeftSidebar';
import { ToolbarSection, ToolbarDivider } from '@/components/layout/RightToolbar';
import { UnifiedCanvas } from '@/components/canvas';
import { FocusControlPanel } from '@/components/panels/FocusControlPanel';
import { ToolPalette } from '@/components/panels/ToolPalette';
import { ColorPickerPanel } from '@/components/panels/ColorPickerPanel';
import { ExportPanel } from '@/components/panels/ExportPanel';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Upload } from 'lucide-react';

// 粒度吸附点
const GRANULARITY_SNAP_POINTS = [50, 100, 150, 200];
const SNAP_THRESHOLD = 5; // 吸附阈值

// 默认导出选项（与 ExportPanel 默认一致）
const DEFAULT_DOWNLOAD_OPTIONS: GridDownloadOptions = {
  showGrid: true,
  gridInterval: 10,
  showCoordinates: true,
  showCellNumbers: true,
  gridLineColor: '#999999',
  includeStats: true,
  exportCsv: false,
};
import { WorkspaceMode, ToolType } from '@/types/workspace';
import { usePixelationEngine } from '@/hooks/usePixelationEngine';
import { useColorManagement, fullBeadPalette } from '@/hooks/useColorManagement';
import { useFocusMode } from '@/hooks/useFocusMode';
import { PixelationMode, PaletteColor, MappedPixel } from '@/utils/pixelation';
import { colorSystemOptions, convertPaletteToColorSystem, getDisplayColorKey } from '@/utils/colorSystemUtils';
import { GridDownloadOptions } from '@/types/downloadTypes';
import { paintSinglePixel, transparentColorData } from '@/utils/pixelEditingUtils';
import { getConnectedRegion } from '@/utils/floodFillUtils';
import { downloadImage, exportCsvData } from '@/utils/imageDownloader';
import { isElectron, openFileWithElectron, getElectronAPI } from '@/utils/electronUtils';

export default function Home() {
  // 模式状态
  const [mode, setMode] = useState<WorkspaceMode>('preview');
  const [selectedTool, setSelectedTool] = useState<ToolType>('brush');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  // 图片状态
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 画布缩放和平移状态
  const [canvasScale, setCanvasScale] = useState(1);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });

  // 处理设置
  const [granularity, setGranularity] = useState(50);
  const [similarityThreshold, setSimilarityThreshold] = useState(30);
  const [pixelationMode, setPixelationMode] = useState<PixelationMode>(PixelationMode.Dominant);

  // Hooks
  const pixelationEngine = usePixelationEngine();
  const colorManagement = useColorManagement();
  const focusMode = useFocusMode(
    pixelationEngine.mappedPixelData,
    pixelationEngine.gridDimensions
  );

  // 处理文件上传
  const handleFileUpload = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('请上传图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      setOriginalImageSrc(src);

      // 处理图片
      setTimeout(() => {
        pixelationEngine.processImage(
          src,
          granularity,
          similarityThreshold,
          colorManagement.activeBeadPalette,
          pixelationMode
        );
      }, 100);
    };
    reader.readAsDataURL(file);
  }, [granularity, similarityThreshold, colorManagement.activeBeadPalette, pixelationMode, pixelationEngine]);

  // 处理拖放
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  // 处理文件输入
  const handleFileInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  // 处理从 Electron 或 dataUrl 加载图片
  const handleImageDataUrl = useCallback((dataUrl: string) => {
    setOriginalImageSrc(dataUrl);
    // 处理图片
    setTimeout(() => {
      pixelationEngine.processImage(
        dataUrl,
        granularity,
        similarityThreshold,
        colorManagement.activeBeadPalette,
        pixelationMode
      );
    }, 100);
  }, [granularity, similarityThreshold, colorManagement.activeBeadPalette, pixelationMode, pixelationEngine]);

  // 触发文件选择（支持 Electron 原生对话框）
  const triggerFileInput = useCallback(async () => {
    // 如果在 Electron 环境下，使用原生文件对话框
    if (isElectron()) {
      const result = await openFileWithElectron();
      if (result && result.dataUrl) {
        handleImageDataUrl(result.dataUrl);
      }
      return;
    }
    // Web 环境：使用传统文件输入
    fileInputRef.current?.click();
  }, [handleImageDataUrl]);

  // 重新处理图片
  const reprocessImage = useCallback(() => {
    if (originalImageSrc) {
      pixelationEngine.processImage(
        originalImageSrc,
        granularity,
        similarityThreshold,
        colorManagement.activeBeadPalette,
        pixelationMode
      );
    }
  }, [originalImageSrc, granularity, similarityThreshold, colorManagement.activeBeadPalette, pixelationMode, pixelationEngine]);

  // 监听像素化模式变化，自动重新处理图片
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // 像素化模式变化时重新处理图片
    if (originalImageSrc) {
      reprocessImage();
    }
    // 注意：粒度和相似度阈值通过 onValueCommit 触发，避免拖动时频繁重绘
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pixelationMode, colorManagement.activeBeadPalette]);

  // Electron 菜单事件监听
  useEffect(() => {
    if (!isElectron()) return;

    const api = getElectronAPI();
    if (!api) return;

    // 监听菜单打开文件事件
    api.onMenuOpenFile(() => {
      triggerFileInput();
    });

    // 保存项目：导出 CSV 作为“项目数据”
    api.onMenuSaveProject(() => {
      exportCsvData({
        mappedPixelData: pixelationEngine.mappedPixelData,
        gridDimensions: pixelationEngine.gridDimensions,
        selectedColorSystem: colorManagement.selectedColorSystem,
      });
    });

    // 导出：执行一次默认下载（Electron 下会弹出保存对话框）
    api.onMenuExport(() => {
      downloadImage({
        mappedPixelData: pixelationEngine.mappedPixelData,
        gridDimensions: pixelationEngine.gridDimensions,
        colorCounts: pixelationEngine.colorCounts,
        totalBeadCount: pixelationEngine.totalBeadCount,
        options: DEFAULT_DOWNLOAD_OPTIONS,
        activeBeadPalette: colorManagement.activeBeadPalette,
        selectedColorSystem: colorManagement.selectedColorSystem
      });
    });

    // 撤销/重做：当前页面暂无通用历史栈，先做安全空实现（不影响原有功能）
    api.onMenuUndo(() => {});
    api.onMenuRedo(() => {});

    // 监听菜单缩放事件
    api.onMenuZoomIn(() => {
      setCanvasScale(prev => Math.min(prev * 1.2, 10));
    });
    api.onMenuZoomOut(() => {
      setCanvasScale(prev => Math.max(prev / 1.2, 0.1));
    });
    api.onMenuZoomReset(() => {
      setCanvasScale(1);
      setCanvasOffset({ x: 0, y: 0 });
    });

    // 清理函数
    return () => {
      api.removeAllListeners('menu-open-file');
      api.removeAllListeners('menu-save-project');
      api.removeAllListeners('menu-export');
      api.removeAllListeners('menu-undo');
      api.removeAllListeners('menu-redo');
      api.removeAllListeners('menu-zoom-in');
      api.removeAllListeners('menu-zoom-out');
      api.removeAllListeners('menu-zoom-reset');
    };
  }, [
    triggerFileInput,
    pixelationEngine.mappedPixelData,
    pixelationEngine.gridDimensions,
    pixelationEngine.colorCounts,
    pixelationEngine.totalBeadCount,
    colorManagement.activeBeadPalette,
    colorManagement.selectedColorSystem,
  ]);

  // 粒度吸附处理
  const snapGranularity = useCallback((value: number): number => {
    for (const snapPoint of GRANULARITY_SNAP_POINTS) {
      if (Math.abs(value - snapPoint) <= SNAP_THRESHOLD) {
        return snapPoint;
      }
    }
    return value;
  }, []);

  // 粒度滑块变化处理（带吸附）
  const handleGranularitySliderChange = useCallback((values: number[]) => {
    const snappedValue = snapGranularity(values[0]);
    setGranularity(snappedValue);
  }, [snapGranularity]);

  // 粒度输入框处理
  const handleGranularityInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      // 限制在有效范围内
      const clampedValue = Math.max(10, Math.min(200, value));
      setGranularity(clampedValue);
    }
  }, []);

  // 粒度输入框失焦时处理图片
  const handleGranularityInputBlur = useCallback(() => {
    reprocessImage();
  }, [reprocessImage]);

  // 颜色选择处理
  const handleColorSelect = useCallback((color: PaletteColor) => {
    setSelectedColor(color.hex);
  }, []);

  // 编辑模式下的画布点击处理
  const handleEditCellClick = useCallback((row: number, col: number) => {
    if (!pixelationEngine.mappedPixelData || !pixelationEngine.gridDimensions) return;

    const currentCell = pixelationEngine.mappedPixelData[row]?.[col];
    if (!currentCell) return;

    switch (selectedTool) {
      case 'brush': {
        // 画笔工具：使用选中的颜色绘制
        if (!selectedColor) {
          alert('请先选择一个颜色');
          return;
        }
        const newColorData: MappedPixel = {
          key: selectedColor,
          color: selectedColor,
          isExternal: false
        };
        const { newPixelData, hasChange } = paintSinglePixel(
          pixelationEngine.mappedPixelData,
          row,
          col,
          newColorData
        );
        if (hasChange) {
          pixelationEngine.setMappedPixelData(newPixelData);
          pixelationEngine.updateColorStats(newPixelData);
        }
        break;
      }

      case 'eraser': {
        // 橡皮擦工具：将像素设为透明/外部
        const { newPixelData, hasChange } = paintSinglePixel(
          pixelationEngine.mappedPixelData,
          row,
          col,
          transparentColorData
        );
        if (hasChange) {
          pixelationEngine.setMappedPixelData(newPixelData);
          pixelationEngine.updateColorStats(newPixelData);
        }
        break;
      }

      case 'fill': {
        // 填充工具：洪水填充整个连通区域
        if (!selectedColor) {
          alert('请先选择一个颜色');
          return;
        }
        if (currentCell.isExternal) return;

        const targetColor = currentCell.color;
        if (targetColor === selectedColor) return; // 颜色相同，无需填充

        const region = getConnectedRegion(
          pixelationEngine.mappedPixelData,
          row,
          col,
          targetColor
        );

        if (region.length === 0) return;

        // 创建新的像素数据并填充整个区域
        const newPixelData = pixelationEngine.mappedPixelData.map(r => r.map(c => ({ ...c })));
        region.forEach(({ row: r, col: c }) => {
          newPixelData[r][c] = {
            key: selectedColor,
            color: selectedColor,
            isExternal: false
          };
        });

        pixelationEngine.setMappedPixelData(newPixelData);
        pixelationEngine.updateColorStats(newPixelData);
        break;
      }

      case 'eyedropper': {
        // 吸管工具：获取点击位置的颜色
        if (!currentCell.isExternal && currentCell.color) {
          setSelectedColor(currentCell.color);
          // 切换回画笔工具
          setSelectedTool('brush');
        }
        break;
      }

      case 'magnifier': {
        // 放大镜工具：暂不实现，保留占位
        console.log('Magnifier clicked at:', row, col);
        break;
      }
    }
  }, [pixelationEngine, selectedTool, selectedColor]);

  // 下载处理
  const handleDownload = useCallback((options: GridDownloadOptions) => {
    downloadImage({
      mappedPixelData: pixelationEngine.mappedPixelData,
      gridDimensions: pixelationEngine.gridDimensions,
      colorCounts: pixelationEngine.colorCounts,
      totalBeadCount: pixelationEngine.totalBeadCount,
      options,
      activeBeadPalette: colorManagement.activeBeadPalette,
      selectedColorSystem: colorManagement.selectedColorSystem
    });
  }, [pixelationEngine, colorManagement]);

  // 缩放控制函数
  const handleZoomIn = useCallback(() => {
    setCanvasScale(prev => Math.min(5, prev * 1.2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setCanvasScale(prev => Math.max(0.3, prev / 1.2));
  }, []);

  const handleResetZoom = useCallback(() => {
    setCanvasScale(1);
    setCanvasOffset({ x: 0, y: 0 });
  }, []);

  // 转换色板用于显示
  const displayPalette = convertPaletteToColorSystem(fullBeadPalette, colorManagement.selectedColorSystem);

  // 获取图纸中使用的颜色
  const gridColors = pixelationEngine.colorCounts
    ? new Set(Object.keys(pixelationEngine.colorCounts))
    : undefined;

  // 左侧栏内容
  const leftSidebarContent = (
    <>
      {/* 文件上传 */}
      <SidebarSection title="图片">
        <div
          className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors hover:border-primary"
          onClick={triggerFileInput}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {originalImageSrc ? '点击更换图片' : '点击或拖放上传'}
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInputChange}
        />
      </SidebarSection>

      <SidebarDivider />

      {/* 处理设置 */}
      <SidebarSection title="设置">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-muted-foreground">粒度</label>
              <Input
                type="number"
                value={granularity}
                onChange={handleGranularityInputChange}
                onBlur={handleGranularityInputBlur}
                onKeyDown={(e) => e.key === 'Enter' && reprocessImage()}
                min={10}
                max={200}
                className="w-16 h-7 text-center text-sm"
              />
            </div>
            <Slider
              value={[granularity]}
              onValueChange={handleGranularitySliderChange}
              onValueCommit={reprocessImage}
              min={10}
              max={200}
              step={1}
            />
            {/* 吸附点标记 */}
            <div className="flex justify-between text-xs text-muted-foreground mt-1 px-1">
              <span>10</span>
              <span className="text-primary font-medium">50</span>
              <span className="text-primary font-medium">100</span>
              <span className="text-primary font-medium">150</span>
              <span className="text-primary font-medium">200</span>
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              相似度阈值: {similarityThreshold}
            </label>
            <Slider
              value={[similarityThreshold]}
              onValueChange={([value]) => setSimilarityThreshold(value)}
              onValueCommit={reprocessImage}
              min={0}
              max={100}
              step={1}
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              像素化模式
            </label>
            <Select
              value={pixelationMode}
              onValueChange={(value) => setPixelationMode(value as PixelationMode)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PixelationMode.Dominant}>卡通模式</SelectItem>
                <SelectItem value={PixelationMode.Average}>真实模式</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              色号系统
            </label>
            <Select
              value={colorManagement.selectedColorSystem}
              onValueChange={(value) => colorManagement.setSelectedColorSystem(value as typeof colorManagement.selectedColorSystem)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {colorSystemOptions.map(option => (
                  <SelectItem key={option.key} value={option.key}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </SidebarSection>

      <SidebarDivider />

      {/* 颜色统计 */}
      {pixelationEngine.colorCounts && (
        <SidebarSection title={`颜色统计 (${Object.keys(pixelationEngine.colorCounts).length} 种)`}>
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {Object.entries(pixelationEngine.colorCounts)
                .sort((a, b) => b[1].count - a[1].count)
                .map(([hexKey, data]) => {
                  const colorKey = getDisplayColorKey(hexKey, colorManagement.selectedColorSystem);
                  return (
                    <div
                      key={hexKey}
                      className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                    >
                      <div
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: data.color }}
                      />
                      <span className="text-sm font-mono flex-1">{colorKey}</span>
                      <Badge variant="secondary">{data.count}</Badge>
                    </div>
                  );
                })}
            </div>
          </ScrollArea>
          <div className="mt-2 text-sm text-muted-foreground">
            总计: {pixelationEngine.totalBeadCount} 颗
          </div>
        </SidebarSection>
      )}
    </>
  );

  // 右侧工具栏内容
  const rightToolbarContent = (
    <>
      {/* 编辑模式工具 */}
      {mode === 'edit' && (
        <>
          <ToolbarSection title="工具">
            <ToolPalette
              selectedTool={selectedTool}
              onToolChange={setSelectedTool}
            />
          </ToolbarSection>

          <ToolbarDivider />

          <ToolbarSection title="色板">
            <ColorPickerPanel
              palette={displayPalette}
              selectedColorSystem={colorManagement.selectedColorSystem}
              selectedColor={selectedColor}
              onColorSelect={handleColorSelect}
              gridColors={gridColors}
            />
          </ToolbarSection>
        </>
      )}

      {/* 专注模式控制 */}
      {mode === 'focus' && (
        <ToolbarSection title="专注模式">
          <FocusControlPanel
            currentColor={focusMode.currentColor}
            onColorChange={focusMode.setCurrentColor}
            selectedColorSystem={colorManagement.selectedColorSystem}
            colorProgress={focusMode.colorProgress}
            totalCompleted={focusMode.totalCompleted}
            totalCells={focusMode.totalCells}
            elapsedTime={focusMode.elapsedTime}
            isPaused={focusMode.isPaused}
            onPauseToggle={focusMode.togglePause}
            onResetTimer={focusMode.resetTimer}
            guidanceMode={focusMode.guidanceMode}
            onGuidanceModeChange={focusMode.setGuidanceMode}
            gridInterval={focusMode.gridInterval}
            onGridIntervalChange={focusMode.setGridInterval}
            showSectionLines={focusMode.showSectionLines}
            onShowSectionLinesChange={focusMode.setShowSectionLines}
            enableCelebration={focusMode.enableCelebration}
            onEnableCelebrationChange={focusMode.setEnableCelebration}
            isCompleted={focusMode.isCompleted}
          />
        </ToolbarSection>
      )}

      <ToolbarDivider />

      {/* 导出选项 */}
      <ToolbarSection title="导出">
        <ExportPanel
          onDownload={handleDownload}
          disabled={!originalImageSrc}
        />
      </ToolbarSection>
    </>
  );

  // 根据模式选择点击处理函数
  const getCellClickHandler = useCallback(() => {
    if (mode === 'focus') {
      return focusMode.toggleCell;
    } else if (mode === 'edit') {
      return handleEditCellClick;
    }
    return undefined;
  }, [mode, focusMode.toggleCell, handleEditCellClick]);

  // 画布内容
  const canvasContent = originalImageSrc ? (
    <div className="relative w-full h-full">
      <UnifiedCanvas
        mappedPixelData={pixelationEngine.mappedPixelData}
        gridDimensions={pixelationEngine.gridDimensions}
        mode={mode}
        isManualColoringMode={mode === 'edit'}
        showGrid={true}
        currentColor={(mode === 'focus' ? focusMode.currentColor : selectedColor) ?? undefined}
        completedCells={mode === 'focus' ? focusMode.completedCells : undefined}
        onCellClick={getCellClickHandler()}
        scale={canvasScale}
        offset={canvasOffset}
        onScaleChange={setCanvasScale}
        onOffsetChange={setCanvasOffset}
        className="w-full h-full"
      />
      {/* 缩放控制按钮 */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1 bg-background/80 backdrop-blur-sm rounded-lg p-1 shadow-lg border">
        <button
          onClick={handleZoomIn}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-muted transition-colors"
          title="放大 (滚轮向上)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <button
          onClick={handleResetZoom}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-muted transition-colors text-xs font-medium"
          title="重置缩放"
        >
          {Math.round(canvasScale * 100)}%
        </button>
        <button
          onClick={handleZoomOut}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-muted transition-colors"
          title="缩小 (滚轮向下)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
      </div>
    </div>
  ) : (
    <CanvasPlaceholder
      onUpload={triggerFileInput}
      isDragging={isDragging}
    />
  );

  return (
    <WorkspaceLayout
      mode={mode}
      onModeChange={setMode}
      hasImage={!!originalImageSrc}
      leftSidebarContent={leftSidebarContent}
      rightToolbarContent={rightToolbarContent}
      canvasContent={canvasContent}
    />
  );
}
