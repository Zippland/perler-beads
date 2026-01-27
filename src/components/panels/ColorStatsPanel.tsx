'use client';

import React, { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { X, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ColorStats } from '@/hooks/usePixelationEngine';
import { getDisplayColorKey, ColorSystem } from '@/utils/colorSystemUtils';

export interface ColorStatsPanelProps {
  colorCounts: ColorStats | null;
  totalBeadCount: number;
  selectedColorSystem: ColorSystem;
  excludedColorKeys: Set<string>;
  onToggleExclude: (hexKey: string) => void;
  onRestoreAll: () => void;
  onHighlight?: (hexKey: string | null) => void;
  highlightColorKey?: string | null;
  showExcluded?: boolean;
  onToggleShowExcluded?: () => void;
}

export function ColorStatsPanel({
  colorCounts,
  totalBeadCount,
  selectedColorSystem,
  excludedColorKeys,
  onToggleExclude,
  onRestoreAll,
  onHighlight,
  highlightColorKey,
  showExcluded = false,
  onToggleShowExcluded,
}: ColorStatsPanelProps) {
  // 排序颜色：按数量降序
  const sortedColors = useMemo(() => {
    if (!colorCounts) return [];
    return Object.entries(colorCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([hexKey, data]) => ({
        hexKey,
        color: data.color,
        count: data.count,
        colorKey: getDisplayColorKey(hexKey, selectedColorSystem),
        isExcluded: excludedColorKeys.has(hexKey.toUpperCase()),
      }));
  }, [colorCounts, selectedColorSystem, excludedColorKeys]);

  // 分离已排除和未排除的颜色
  const activeColors = sortedColors.filter((c) => !c.isExcluded);
  const excludedColors = sortedColors.filter((c) => c.isExcluded);

  if (!colorCounts || sortedColors.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        暂无颜色数据
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 统计摘要 */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {activeColors.length} 种颜色
        </span>
        <Badge variant="secondary">{totalBeadCount} 颗</Badge>
      </div>

      {/* 颜色列表 */}
      <ScrollArea className="h-64">
        <div className="space-y-1 pr-2">
          <TooltipProvider>
            {activeColors.map(({ hexKey, color, count, colorKey }) => (
              <div
                key={hexKey}
                className={cn(
                  'flex items-center gap-2 p-2 rounded-md transition-colors',
                  'hover:bg-muted cursor-pointer group',
                  highlightColorKey?.toUpperCase() === hexKey.toUpperCase() && 'bg-primary/10 ring-1 ring-primary'
                )}
                onClick={() => onHighlight?.(highlightColorKey === hexKey ? null : hexKey)}
              >
                {/* 颜色块 */}
                <div
                  className="w-6 h-6 rounded border border-border shrink-0"
                  style={{ backgroundColor: color }}
                />

                {/* 色号 */}
                <span className="text-sm font-mono flex-1 truncate">{colorKey}</span>

                {/* 数量 */}
                <Badge variant="outline" className="tabular-nums">
                  {count}
                </Badge>

                {/* 排除按钮 */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleExclude(hexKey);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>排除此颜色</TooltipContent>
                </Tooltip>
              </div>
            ))}
          </TooltipProvider>
        </div>
      </ScrollArea>

      {/* 已排除颜色 */}
      {excludedColors.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-muted-foreground hover:text-foreground"
              onClick={onToggleShowExcluded}
            >
              {showExcluded ? (
                <EyeOff className="h-3 w-3 mr-1" />
              ) : (
                <Eye className="h-3 w-3 mr-1" />
              )}
              <span className="text-xs">已排除 ({excludedColors.length})</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
              onClick={onRestoreAll}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              全部恢复
            </Button>
          </div>

          {showExcluded && (
            <div className="flex flex-wrap gap-1">
              {excludedColors.map(({ hexKey, color, colorKey }) => (
                <Tooltip key={hexKey}>
                  <TooltipTrigger asChild>
                    <button
                      className="w-6 h-6 rounded border border-dashed border-muted-foreground/50 opacity-50 hover:opacity-100 transition-opacity relative"
                      style={{ backgroundColor: color }}
                      onClick={() => onToggleExclude(hexKey)}
                    >
                      <X className="absolute inset-0 m-auto h-3 w-3 text-white drop-shadow" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    点击恢复 {colorKey}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ColorStatsPanel;
