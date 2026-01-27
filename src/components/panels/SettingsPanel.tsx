'use client';

import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw } from 'lucide-react';
import { PixelationMode } from '@/utils/pixelation';
import { colorSystemOptions, ColorSystem } from '@/utils/colorSystemUtils';

export interface SettingsPanelProps {
  // 粒度设置
  granularity: number;
  onGranularityChange: (value: number) => void;
  onGranularityCommit?: () => void;

  // 相似度阈值
  similarityThreshold: number;
  onSimilarityThresholdChange: (value: number) => void;
  onSimilarityThresholdCommit?: () => void;

  // 像素化模式
  pixelationMode: PixelationMode;
  onPixelationModeChange: (mode: PixelationMode) => void;

  // 颜色系统
  selectedColorSystem: ColorSystem;
  onColorSystemChange: (system: ColorSystem) => void;

  // 重置
  onReset?: () => void;

  // 网格信息
  gridDimensions?: { N: number; M: number } | null;
}

export function SettingsPanel({
  granularity,
  onGranularityChange,
  onGranularityCommit,
  similarityThreshold,
  onSimilarityThresholdChange,
  onSimilarityThresholdCommit,
  pixelationMode,
  onPixelationModeChange,
  selectedColorSystem,
  onColorSystemChange,
  onReset,
  gridDimensions,
}: SettingsPanelProps) {
  return (
    <div className="space-y-6">
      {/* 网格信息 */}
      {gridDimensions && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">网格尺寸</span>
          <Badge variant="secondary">
            {gridDimensions.N} × {gridDimensions.M}
          </Badge>
        </div>
      )}

      {/* 粒度设置 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">粒度（横向格数）</label>
          <span className="text-sm text-muted-foreground tabular-nums">{granularity}</span>
        </div>
        <Slider
          value={[granularity]}
          onValueChange={([value]) => onGranularityChange(value)}
          onValueCommit={() => onGranularityCommit?.()}
          min={10}
          max={200}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>精细</span>
          <span>粗糙</span>
        </div>
      </div>

      {/* 相似度阈值 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">颜色合并阈值</label>
          <span className="text-sm text-muted-foreground tabular-nums">{similarityThreshold}</span>
        </div>
        <Slider
          value={[similarityThreshold]}
          onValueChange={([value]) => onSimilarityThresholdChange(value)}
          onValueCommit={() => onSimilarityThresholdCommit?.()}
          min={0}
          max={100}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>保留细节</span>
          <span>合并颜色</span>
        </div>
      </div>

      {/* 像素化模式 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">像素化模式</label>
        <Select
          value={pixelationMode}
          onValueChange={(value) => onPixelationModeChange(value as PixelationMode)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={PixelationMode.Dominant}>
              <div className="flex flex-col items-start">
                <span>卡通模式</span>
                <span className="text-xs text-muted-foreground">保持色块纯净</span>
              </div>
            </SelectItem>
            <SelectItem value={PixelationMode.Average}>
              <div className="flex flex-col items-start">
                <span>真实模式</span>
                <span className="text-xs text-muted-foreground">保持色彩过渡</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 颜色系统 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">色号系统</label>
        <Select
          value={selectedColorSystem}
          onValueChange={(value) => onColorSystemChange(value as ColorSystem)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {colorSystemOptions.map((option) => (
              <SelectItem key={option.key} value={option.key}>
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 重置按钮 */}
      {onReset && (
        <Button variant="outline" size="sm" className="w-full" onClick={onReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          重置设置
        </Button>
      )}
    </div>
  );
}

export default SettingsPanel;
