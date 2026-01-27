'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, Eye, Pencil, Focus, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WorkspaceMode } from '@/types/workspace';

interface HeaderProps {
  mode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  hasImage?: boolean;
}

export function Header({
  mode,
  onModeChange,
  onMenuClick,
  showMenuButton = false,
  hasImage = false,
}: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 shrink-0">
      {/* 左侧：Logo 和菜单按钮 */}
      <div className="flex items-center gap-3">
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">拼</span>
          </div>
          <span className="font-semibold text-foreground hidden sm:inline">
            拼豆底稿生成器
          </span>
        </div>
      </div>

      {/* 中间：模式切换 */}
      {hasImage && (
        <TooltipProvider>
          <Tabs value={mode} onValueChange={(v) => onModeChange(v as WorkspaceMode)}>
            <TabsList className="grid w-auto grid-cols-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="preview" className="gap-2">
                    <Eye className="h-4 w-4" />
                    <span className="hidden sm:inline">预览</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>预览模式 - 查看效果</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="edit" className="gap-2">
                    <Pencil className="h-4 w-4" />
                    <span className="hidden sm:inline">编辑</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>编辑模式 - 手动调整颜色</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="focus" className="gap-2">
                    <Focus className="h-4 w-4" />
                    <span className="hidden sm:inline">拼豆</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>拼豆模式 - 专注制作</TooltipContent>
              </Tooltip>
            </TabsList>
          </Tabs>
        </TooltipProvider>
      )}

      {/* 右侧：主题切换 */}
      <div className="flex items-center gap-2">
        {mounted && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                >
                  {theme === 'dark' ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </header>
  );
}

export default Header;
