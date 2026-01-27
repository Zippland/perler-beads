'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface LeftSidebarProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  children?: React.ReactNode;
  className?: string;
}

export function LeftSidebar({
  collapsed = false,
  onCollapsedChange,
  children,
  className,
}: LeftSidebarProps) {
  return (
    <div className="relative shrink-0 flex">
      <aside
        className={cn(
          'relative flex flex-col border-r border-border bg-sidebar transition-all duration-300 ease-in-out',
          collapsed ? 'w-0 overflow-hidden' : 'w-72',
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

      {/* 折叠按钮 - 放在 aside 外部避免被 overflow-hidden 隐藏 */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'absolute top-4 z-10 h-8 w-8 rounded-full border border-border bg-background shadow-sm',
          'hover:bg-accent hidden lg:flex',
          collapsed ? 'left-2' : '-right-4'
        )}
        onClick={() => onCollapsedChange?.(!collapsed)}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

// 侧边栏区块组件
interface SidebarSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function SidebarSection({ title, children, className }: SidebarSectionProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {title && (
        <h3 className="text-sm font-medium text-muted-foreground px-1">{title}</h3>
      )}
      {children}
    </div>
  );
}

// 侧边栏分隔线
export function SidebarDivider() {
  return <Separator className="my-4" />;
}

export default LeftSidebar;
