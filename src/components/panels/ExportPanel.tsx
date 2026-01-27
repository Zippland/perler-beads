'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Download, FileSpreadsheet, Image as ImageIcon, Settings2 } from 'lucide-react';
import { GridDownloadOptions } from '@/types/downloadTypes';

// 网格线颜色选项
const gridLineColorOptions = [
  { value: '#999999', label: '灰色' },
  { value: '#000000', label: '黑色' },
  { value: '#FFFFFF', label: '白色' },
  { value: '#FF0000', label: '红色' },
  { value: '#0000FF', label: '蓝色' },
];

export interface ExportPanelProps {
  onDownload: (options: GridDownloadOptions) => void;
  onExportCsv?: () => void;
  onExportStats?: () => void;
  disabled?: boolean;
  defaultOptions?: Partial<GridDownloadOptions>;
}

const defaultDownloadOptions: GridDownloadOptions = {
  showGrid: true,
  gridInterval: 10,
  showCoordinates: true,
  showCellNumbers: true,
  gridLineColor: '#999999',
  includeStats: true,
  exportCsv: false,
};

export function ExportPanel({
  onDownload,
  onExportCsv,
  onExportStats,
  disabled = false,
  defaultOptions,
}: ExportPanelProps) {
  const [options, setOptions] = useState<GridDownloadOptions>({
    ...defaultDownloadOptions,
    ...defaultOptions,
  });
  const [dialogOpen, setDialogOpen] = useState(false);

  const updateOption = <K extends keyof GridDownloadOptions>(
    key: K,
    value: GridDownloadOptions[K]
  ) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  const handleDownload = () => {
    onDownload(options);
    setDialogOpen(false);
  };

  return (
    <div className="space-y-3">
      {/* 快速下载按钮 */}
      <Button
        className="w-full"
        onClick={() => onDownload(options)}
        disabled={disabled}
      >
        <Download className="h-4 w-4 mr-2" />
        下载图纸
      </Button>

      {/* 下载设置对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full" disabled={disabled}>
            <Settings2 className="h-4 w-4 mr-2" />
            下载设置
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>下载设置</DialogTitle>
            <DialogDescription>
              自定义图纸导出选项
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* 显示网格 */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">显示分隔线</label>
              <Switch
                checked={options.showGrid}
                onCheckedChange={(checked) => updateOption('showGrid', checked)}
              />
            </div>

            {/* 网格间隔 */}
            {options.showGrid && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">分隔线间隔</label>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    每 {options.gridInterval} 格
                  </span>
                </div>
                <Slider
                  value={[options.gridInterval]}
                  onValueChange={([value]) => updateOption('gridInterval', value)}
                  min={5}
                  max={20}
                  step={5}
                />
              </div>
            )}

            {/* 网格线颜色 */}
            {options.showGrid && (
              <div className="space-y-2">
                <label className="text-sm font-medium">分隔线颜色</label>
                <Select
                  value={options.gridLineColor}
                  onValueChange={(value) => updateOption('gridLineColor', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {gridLineColorOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded border"
                            style={{ backgroundColor: option.value }}
                          />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 显示坐标 */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">显示坐标</label>
              <Switch
                checked={options.showCoordinates}
                onCheckedChange={(checked) => updateOption('showCoordinates', checked)}
              />
            </div>

            {/* 显示色号 */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">显示色号</label>
              <Switch
                checked={options.showCellNumbers}
                onCheckedChange={(checked) => updateOption('showCellNumbers', checked)}
              />
            </div>

            {/* 包含统计 */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">包含颜色统计</label>
              <Switch
                checked={options.includeStats}
                onCheckedChange={(checked) => updateOption('includeStats', checked)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              下载
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 其他导出选项 */}
      <div className="flex gap-2">
        {onExportStats && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onExportStats}
            disabled={disabled}
          >
            <ImageIcon className="h-4 w-4 mr-1" />
            统计图
          </Button>
        )}
        {onExportCsv && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onExportCsv}
            disabled={disabled}
          >
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            CSV
          </Button>
        )}
      </div>
    </div>
  );
}

export default ExportPanel;
