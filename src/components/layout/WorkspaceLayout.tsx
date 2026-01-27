'use client';

import React, { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useResponsive } from '@/hooks/useResponsive';
import { WorkspaceMode } from '@/types/workspace';
import { Header } from './Header';
import { LeftSidebar } from './LeftSidebar';
import { RightToolbar } from './RightToolbar';
import { CenterCanvas } from './CenterCanvas';
import { MobileBottomNav } from './MobileBottomNav';

interface WorkspaceLayoutProps {
  mode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
  hasImage?: boolean;
  leftSidebarContent?: React.ReactNode;
  rightToolbarContent?: React.ReactNode;
  canvasContent?: React.ReactNode;
  onDownloadClick?: () => void;
}

export function WorkspaceLayout({
  mode,
  onModeChange,
  hasImage = false,
  leftSidebarContent,
  rightToolbarContent,
  canvasContent,
  onDownloadClick,
}: WorkspaceLayoutProps) {
  const { isMobile, isTablet } = useResponsive();
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [leftSheetOpen, setLeftSheetOpen] = useState(false);
  const [rightSheetOpen, setRightSheetOpen] = useState(false);

  // 移动端布局
  if (isMobile) {
    return (
      <div className="h-screen flex flex-col bg-background">
        {/* 顶部栏 */}
        <Header
          mode={mode}
          onModeChange={onModeChange}
          hasImage={hasImage}
          showMenuButton={hasImage}
          onMenuClick={() => setLeftSheetOpen(true)}
        />

        {/* 中央画布 */}
        <CenterCanvas className="flex-1 pb-16">
          {canvasContent}
        </CenterCanvas>

        {/* 底部导航 */}
        <MobileBottomNav
          mode={mode}
          onModeChange={onModeChange}
          hasImage={hasImage}
          onSettingsClick={() => setLeftSheetOpen(true)}
          onPaletteClick={() => setRightSheetOpen(true)}
          onDownloadClick={onDownloadClick}
        />

        {/* 左侧抽屉 */}
        <Sheet open={leftSheetOpen} onOpenChange={setLeftSheetOpen}>
          <SheetContent side="left" className="w-80 p-0">
            <div className="h-full overflow-auto p-4">
              {leftSidebarContent}
            </div>
          </SheetContent>
        </Sheet>

        {/* 右侧抽屉 */}
        <Sheet open={rightSheetOpen} onOpenChange={setRightSheetOpen}>
          <SheetContent side="right" className="w-72 p-0">
            <div className="h-full overflow-auto p-4">
              {rightToolbarContent}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // 平板端布局
  if (isTablet) {
    return (
      <div className="h-screen flex flex-col bg-background">
        {/* 顶部栏 */}
        <Header
          mode={mode}
          onModeChange={onModeChange}
          hasImage={hasImage}
          showMenuButton={hasImage}
          onMenuClick={() => setLeftSheetOpen(true)}
        />

        {/* 主体区域 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧抽屉 */}
          <Sheet open={leftSheetOpen} onOpenChange={setLeftSheetOpen}>
            <SheetContent side="left" className="w-80 p-0">
              <div className="h-full overflow-auto p-4">
                {leftSidebarContent}
              </div>
            </SheetContent>
          </Sheet>

          {/* 中央画布 */}
          <CenterCanvas className="flex-1">
            {canvasContent}
          </CenterCanvas>

          {/* 右侧工具栏 - 浮动面板 */}
          {mode !== 'preview' && (
            <Sheet open={rightSheetOpen} onOpenChange={setRightSheetOpen}>
              <SheetTrigger asChild>
                <button
                  className={cn(
                    'fixed right-4 top-1/2 -translate-y-1/2 z-40',
                    'h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg',
                    'flex items-center justify-center hover:bg-primary/90 transition-colors'
                  )}
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                    />
                  </svg>
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0">
                <div className="h-full overflow-auto p-4">
                  {rightToolbarContent}
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>
    );
  }

  // 桌面端布局
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* 顶部栏 */}
      <Header
        mode={mode}
        onModeChange={onModeChange}
        hasImage={hasImage}
      />

      {/* 主体区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧栏 */}
        <LeftSidebar
          collapsed={leftCollapsed}
          onCollapsedChange={setLeftCollapsed}
        >
          {leftSidebarContent}
        </LeftSidebar>

        {/* 中央画布 */}
        <CenterCanvas className="flex-1">
          {canvasContent}
        </CenterCanvas>

        {/* 右侧工具栏 */}
        <RightToolbar
          mode={mode}
          collapsed={rightCollapsed}
          onCollapsedChange={setRightCollapsed}
        >
          {rightToolbarContent}
        </RightToolbar>
      </div>
    </div>
  );
}

export default WorkspaceLayout;
