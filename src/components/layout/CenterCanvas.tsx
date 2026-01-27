'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface CenterCanvasProps {
  children?: React.ReactNode;
  className?: string;
}

export function CenterCanvas({ children, className }: CenterCanvasProps) {
  return (
    <main
      className={cn(
        'flex-1 flex flex-col overflow-hidden bg-muted/30 min-h-0',
        className
      )}
    >
      {/* 画布内容区域 */}
      <div className="flex-1 relative overflow-auto min-h-0">
        <div className="h-full w-full flex items-center justify-center p-4">
          {children}
        </div>
      </div>
    </main>
  );
}

// 画布占位符 - 无图片时显示
interface CanvasPlaceholderProps {
  onUpload?: () => void;
  isDragging?: boolean;
}

export function CanvasPlaceholder({ onUpload, isDragging }: CanvasPlaceholderProps) {
  return (
    <div
      className={cn(
        'w-full max-w-md aspect-square rounded-2xl border-2 border-dashed transition-all',
        'flex flex-col items-center justify-center gap-4 p-8 text-center cursor-pointer',
        isDragging
          ? 'border-primary bg-primary/10 scale-105'
          : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
      )}
      onClick={onUpload}
    >
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
        <svg
          className="w-8 h-8 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
      <div>
        <p className="text-lg font-medium text-foreground">
          {isDragging ? '放开以上传图片' : '点击或拖放图片'}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          支持 JPG、PNG 格式
        </p>
      </div>
    </div>
  );
}

export default CenterCanvas;
