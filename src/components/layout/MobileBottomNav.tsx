'use client';

import React from 'react';
import { Eye, Pencil, Focus, Settings, Palette, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkspaceMode } from '@/types/workspace';

interface MobileBottomNavProps {
  mode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
  onSettingsClick?: () => void;
  onPaletteClick?: () => void;
  onDownloadClick?: () => void;
  hasImage?: boolean;
  className?: string;
}

export function MobileBottomNav({
  mode,
  onModeChange,
  onSettingsClick,
  onPaletteClick,
  onDownloadClick,
  hasImage = false,
  className,
}: MobileBottomNavProps) {
  if (!hasImage) {
    return null;
  }

  return (
    <nav
      className={cn(
        'lg:hidden fixed bottom-0 left-0 right-0 z-50',
        'border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        'safe-area-inset-bottom',
        className
      )}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {/* 模式切换按钮 */}
        <NavButton
          icon={Eye}
          label="预览"
          active={mode === 'preview'}
          onClick={() => onModeChange('preview')}
        />
        <NavButton
          icon={Pencil}
          label="编辑"
          active={mode === 'edit'}
          onClick={() => onModeChange('edit')}
        />
        <NavButton
          icon={Focus}
          label="拼豆"
          active={mode === 'focus'}
          onClick={() => onModeChange('focus')}
        />

        {/* 分隔线 */}
        <div className="h-8 w-px bg-border" />

        {/* 功能按钮 */}
        <NavButton
          icon={Settings}
          label="设置"
          onClick={onSettingsClick}
        />
        {mode === 'edit' && (
          <NavButton
            icon={Palette}
            label="色板"
            onClick={onPaletteClick}
          />
        )}
        <NavButton
          icon={Download}
          label="下载"
          onClick={onDownloadClick}
        />
      </div>
    </nav>
  );
}

// 导航按钮组件
interface NavButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

function NavButton({ icon: Icon, label, active, onClick }: NavButtonProps) {
  return (
    <button
      className={cn(
        'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors',
        'min-w-[4rem]',
        active
          ? 'text-primary bg-primary/10'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      )}
      onClick={onClick}
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

export default MobileBottomNav;
