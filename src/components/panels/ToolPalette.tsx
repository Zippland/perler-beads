'use client';

import React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Brush, Eraser, PaintBucket, Pipette, ZoomIn } from 'lucide-react';
import { ToolType } from '@/types/workspace';

export interface ToolPaletteProps {
  selectedTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  disabled?: boolean;
}

const tools: { value: ToolType; icon: React.ElementType; label: string; shortcut?: string }[] = [
  { value: 'brush', icon: Brush, label: '画笔', shortcut: 'B' },
  { value: 'eraser', icon: Eraser, label: '橡皮擦', shortcut: 'E' },
  { value: 'fill', icon: PaintBucket, label: '油漆桶', shortcut: 'G' },
  { value: 'eyedropper', icon: Pipette, label: '吸管', shortcut: 'I' },
  { value: 'magnifier', icon: ZoomIn, label: '放大镜', shortcut: 'Z' },
];

export function ToolPalette({ selectedTool, onToolChange, disabled = false }: ToolPaletteProps) {
  return (
    <TooltipProvider>
      <ToggleGroup
        type="single"
        value={selectedTool}
        onValueChange={(value) => value && onToolChange(value as ToolType)}
        className="flex flex-wrap gap-1"
        disabled={disabled}
      >
        {tools.map(({ value, icon: Icon, label, shortcut }) => (
          <Tooltip key={value}>
            <TooltipTrigger asChild>
              <ToggleGroupItem
                value={value}
                aria-label={label}
                className="h-9 w-9 p-0"
              >
                <Icon className="h-4 w-4" />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>
                {label}
                {shortcut && (
                  <span className="ml-2 text-muted-foreground">({shortcut})</span>
                )}
              </p>
            </TooltipContent>
          </Tooltip>
        ))}
      </ToggleGroup>
    </TooltipProvider>
  );
}

export default ToolPalette;
