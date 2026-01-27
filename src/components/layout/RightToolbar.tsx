'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { WorkspaceMode } from '@/types/workspace';

interface RightToolbarProps {
  mode: WorkspaceMode;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  children?: React.ReactNode;
  className?: string;
}

export function RightToolbar({
  mode,
  collapsed = false,
  onCollapsedChange,
  children,
  className,
}: RightToolbarProps) {
  // 预览模式下不显示工具栏
  if (mode === 'preview') {
    return null;
  }

  return (
    <div className="relative shrink-0 flex">
      {/* 折叠按钮 - 放在 aside 外部避免被 overflow-hidden 隐藏 */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'absolute top-4 z-10 h-8 w-8 rounded-full border border-border bg-background shadow-sm',
          'hover:bg-accent hidden lg:flex',
          collapsed ? 'right-2' : '-left-4'
        )}
        onClick={() => onCollapsedChange?.(!collapsed)}
      >
        {collapsed ? (
          <ChevronLeft className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </Button>

      <aside
        className={cn(
          'relative flex flex-col border-l border-border bg-sidebar transition-all duration-300 ease-in-out',
          collapsed ? 'w-0 overflow-hidden' : 'w-56',
          className
        )}
      >
        {/* 内容区域 */}
        <ScrollArea className="flex-1">
          <div className={cn('p-4 space-y-4', collapsed && 'hidden')}>
            {children}
          </div>
        </ScrollArea>
      </aside>
    </div>
  );
}

// 工具栏区块组件
interface ToolbarSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function ToolbarSection({ title, children, className }: ToolbarSectionProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {title && (
        <h3 className="text-sm font-medium text-muted-foreground px-1">{title}</h3>
      )}
      {children}
    </div>
  );
}

// 工具栏分隔线
export function ToolbarDivider() {
  return <Separator className="my-4" />;
}

export default RightToolbar;
