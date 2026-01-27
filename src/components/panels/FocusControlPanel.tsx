'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Clock,
  Target,
  Sparkles,
  Grid3X3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDisplayColorKey, ColorSystem } from '@/utils/colorSystemUtils';

export type GuidanceMode = 'nearest' | 'largest' | 'edge-first';

export interface ColorProgress {
  color: string;
  completed: number;
  total: number;
}

export interface FocusControlPanelProps {
  // 当前颜色
  currentColor: string | null;
  onColorChange?: (color: string) => void;

  // 颜色系统
  selectedColorSystem: ColorSystem;

  // 进度
  colorProgress: ColorProgress[];
  totalCompleted: number;
  totalCells: number;

  // 计时器
  elapsedTime: number;
  isPaused: boolean;
  onPauseToggle: () => void;
  onResetTimer?: () => void;

  // 引导模式
  guidanceMode: GuidanceMode;
  onGuidanceModeChange: (mode: GuidanceMode) => void;

  // 网格设置
  gridInterval: number;
  onGridIntervalChange: (interval: number) => void;
  showSectionLines: boolean;
  onShowSectionLinesChange: (show: boolean) => void;

  // 庆祝动画
  enableCelebration: boolean;
  onEnableCelebrationChange: (enable: boolean) => void;

  // 完成状态
  isCompleted?: boolean;
  onShowCompletionCard?: () => void;
}

const guidanceModes: { value: GuidanceMode; label: string; description: string }[] = [
  { value: 'nearest', label: '最近优先', description: '推荐最近的未完成区域' },
  { value: 'largest', label: '大块优先', description: '优先推荐大色块区域' },
  { value: 'edge-first', label: '边缘优先', description: '从外围向内部制作' },
];

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function FocusControlPanel({
  currentColor,
  onColorChange,
  selectedColorSystem,
  colorProgress,
  totalCompleted,
  totalCells,
  elapsedTime,
  isPaused,
  onPauseToggle,
  onResetTimer,
  guidanceMode,
  onGuidanceModeChange,
  gridInterval,
  onGridIntervalChange,
  showSectionLines,
  onShowSectionLinesChange,
  enableCelebration,
  onEnableCelebrationChange,
  isCompleted = false,
  onShowCompletionCard,
}: FocusControlPanelProps) {
  const progressPercent = totalCells > 0 ? Math.round((totalCompleted / totalCells) * 100) : 0;

  // 按进度排序颜色列表
  const sortedColors = [...colorProgress].sort((a, b) => {
    // 已完成的放后面
    const aComplete = a.completed >= a.total;
    const bComplete = b.completed >= b.total;
    if (aComplete !== bComplete) return aComplete ? 1 : -1;
    // 按剩余数量排序
    return (a.total - a.completed) - (b.total - b.completed);
  });

  return (
    <div className="space-y-4">
      {/* 计时器和进度 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-lg">{formatTime(elapsedTime)}</span>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onPauseToggle}
            >
              {isPaused ? (
                <Play className="h-4 w-4" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
            </Button>
            {onResetTimer && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onResetTimer}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">总进度</span>
            <span className="font-medium">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">
            {totalCompleted} / {totalCells} 颗
          </p>
        </div>
      </div>

      {/* 当前颜色 */}
      {currentColor && (
        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg border-2 shadow-sm"
              style={{ backgroundColor: currentColor }}
            />
            <div className="flex-1">
              <p className="font-medium">当前颜色</p>
              <p className="text-sm font-mono text-muted-foreground">
                {getDisplayColorKey(currentColor, selectedColorSystem)}
              </p>
            </div>
            {colorProgress.find(c => c.color === currentColor) && (
              <Badge variant="secondary" className="tabular-nums">
                {colorProgress.find(c => c.color === currentColor)?.total ?? 0 -
                 (colorProgress.find(c => c.color === currentColor)?.completed ?? 0)} 剩余
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* 颜色进度列表 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">颜色进度</h4>
          <Badge variant="outline">{colorProgress.length} 种</Badge>
        </div>
        <ScrollArea className="h-36">
          <div className="space-y-1 pr-2">
            {sortedColors.map((item) => {
              const isComplete = item.completed >= item.total;
              const percent = item.total > 0
                ? Math.round((item.completed / item.total) * 100)
                : 0;
              const colorKey = getDisplayColorKey(item.color, selectedColorSystem);

              return (
                <button
                  key={item.color}
                  className={cn(
                    'w-full flex items-center gap-2 p-2 rounded transition-colors text-left',
                    currentColor === item.color ? 'bg-primary/10' : 'hover:bg-muted',
                    isComplete && 'opacity-60'
                  )}
                  onClick={() => onColorChange?.(item.color)}
                >
                  <div
                    className={cn(
                      'w-5 h-5 rounded border shrink-0',
                      isComplete && 'ring-2 ring-green-500'
                    )}
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-mono text-sm flex-1">{colorKey}</span>
                  {isComplete ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {percent}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* 引导模式 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">引导模式</span>
        </div>
        <Select value={guidanceMode} onValueChange={(v) => onGuidanceModeChange(v as GuidanceMode)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {guidanceModes.map((mode) => (
              <SelectItem key={mode.value} value={mode.value}>
                <div>
                  <p>{mode.label}</p>
                  <p className="text-xs text-muted-foreground">{mode.description}</p>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 网格设置 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Grid3X3 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">网格设置</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">显示分割线</span>
          <Switch
            checked={showSectionLines}
            onCheckedChange={onShowSectionLinesChange}
          />
        </div>

        {showSectionLines && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">分割间隔</span>
              <span className="tabular-nums">每 {gridInterval} 格</span>
            </div>
            <Slider
              value={[gridInterval]}
              onValueChange={([v]) => onGridIntervalChange(v)}
              min={5}
              max={20}
              step={5}
            />
          </div>
        )}
      </div>

      {/* 庆祝动画 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">完成庆祝动画</span>
        </div>
        <Switch
          checked={enableCelebration}
          onCheckedChange={onEnableCelebrationChange}
        />
      </div>

      {/* 完成状态 */}
      {isCompleted && onShowCompletionCard && (
        <Button className="w-full" onClick={onShowCompletionCard}>
          <Sparkles className="h-4 w-4 mr-2" />
          查看完成打卡图
        </Button>
      )}
    </div>
  );
}

export default FocusControlPanel;
