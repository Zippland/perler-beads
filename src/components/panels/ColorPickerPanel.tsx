'use client';

import React, { useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Grid3X3, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaletteColor } from '@/utils/pixelation';
import { getDisplayColorKey, ColorSystem, sortColorsByHue } from '@/utils/colorSystemUtils';

interface ColorPickerPanelProps {
  palette: PaletteColor[];
  selectedColorSystem: ColorSystem;
  selectedColor: string | null;
  onColorSelect: (color: PaletteColor) => void;
  recentColors?: string[];
  gridColors?: Set<string>; // 当前图纸中使用的颜色
  showOnlyGridColors?: boolean;
  onToggleShowOnlyGridColors?: () => void;
}

export function ColorPickerPanel({
  palette,
  selectedColorSystem,
  selectedColor,
  onColorSelect,
  recentColors = [],
  gridColors,
  showOnlyGridColors = false,
  onToggleShowOnlyGridColors,
}: ColorPickerPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // 过滤和排序颜色
  const filteredPalette = useMemo(() => {
    let colors = palette;

    // 仅显示图纸中的颜色
    if (showOnlyGridColors && gridColors) {
      colors = colors.filter((c) => gridColors.has(c.hex.toUpperCase()));
    }

    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      colors = colors.filter((c) => {
        const colorKey = getDisplayColorKey(c.hex, selectedColorSystem);
        return (
          colorKey.toLowerCase().includes(query) ||
          c.hex.toLowerCase().includes(query)
        );
      });
    }

    // 按色相排序
    return sortColorsByHue(colors);
  }, [palette, showOnlyGridColors, gridColors, searchQuery, selectedColorSystem]);

  // 最近使用的颜色
  const recentPaletteColors = useMemo(() => {
    return recentColors
      .map((hex) => palette.find((c) => c.hex.toUpperCase() === hex.toUpperCase()))
      .filter((c): c is PaletteColor => c !== undefined)
      .slice(0, 12);
  }, [recentColors, palette]);

  return (
    <div className="space-y-4">
      {/* 搜索和视图切换 */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索色号..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8"
          />
        </div>
        <div className="flex border rounded-md">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8 rounded-r-none"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8 rounded-l-none"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 过滤选项 */}
      {gridColors && onToggleShowOnlyGridColors && (
        <Button
          variant={showOnlyGridColors ? 'secondary' : 'outline'}
          size="sm"
          className="w-full text-xs"
          onClick={onToggleShowOnlyGridColors}
        >
          {showOnlyGridColors ? '显示全部颜色' : '仅显示图纸颜色'}
        </Button>
      )}

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="recent" disabled={recentPaletteColors.length === 0}>
            最近
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-3">
          <ScrollArea className="h-48">
            {viewMode === 'grid' ? (
              <TooltipProvider>
                <div className="grid grid-cols-8 gap-1 pr-2">
                  {filteredPalette.map((color) => {
                    const colorKey = getDisplayColorKey(color.hex, selectedColorSystem);
                    const isSelected = selectedColor?.toUpperCase() === color.hex.toUpperCase();
                    return (
                      <Tooltip key={color.hex}>
                        <TooltipTrigger asChild>
                          <button
                            className={cn(
                              'w-6 h-6 rounded border transition-all',
                              isSelected
                                ? 'ring-2 ring-primary ring-offset-1'
                                : 'hover:scale-110 hover:z-10'
                            )}
                            style={{ backgroundColor: color.hex }}
                            onClick={() => onColorSelect(color)}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="font-mono">{colorKey}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </TooltipProvider>
            ) : (
              <div className="space-y-1 pr-2">
                {filteredPalette.map((color) => {
                  const colorKey = getDisplayColorKey(color.hex, selectedColorSystem);
                  const isSelected = selectedColor?.toUpperCase() === color.hex.toUpperCase();
                  return (
                    <button
                      key={color.hex}
                      className={cn(
                        'w-full flex items-center gap-2 p-1.5 rounded text-sm transition-colors',
                        isSelected ? 'bg-primary/10' : 'hover:bg-muted'
                      )}
                      onClick={() => onColorSelect(color)}
                    >
                      <div
                        className="w-5 h-5 rounded border shrink-0"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span className="font-mono">{colorKey}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="recent" className="mt-3">
          <TooltipProvider>
            <div className="grid grid-cols-6 gap-2">
              {recentPaletteColors.map((color) => {
                const colorKey = getDisplayColorKey(color.hex, selectedColorSystem);
                const isSelected = selectedColor?.toUpperCase() === color.hex.toUpperCase();
                return (
                  <Tooltip key={color.hex}>
                    <TooltipTrigger asChild>
                      <button
                        className={cn(
                          'w-8 h-8 rounded border transition-all',
                          isSelected
                            ? 'ring-2 ring-primary ring-offset-1'
                            : 'hover:scale-110'
                        )}
                        style={{ backgroundColor: color.hex }}
                        onClick={() => onColorSelect(color)}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{colorKey}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
        </TabsContent>
      </Tabs>

      {/* 当前选中颜色 */}
      {selectedColor && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
          <div
            className="w-8 h-8 rounded border"
            style={{ backgroundColor: selectedColor }}
          />
          <div className="flex-1">
            <p className="text-sm font-medium">当前颜色</p>
            <p className="text-xs text-muted-foreground font-mono">
              {getDisplayColorKey(selectedColor, selectedColorSystem)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ColorPickerPanel;
