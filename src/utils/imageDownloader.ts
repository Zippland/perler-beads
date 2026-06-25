import { GridDownloadOptions } from '../types/downloadTypes';
import { MappedPixel, PaletteColor } from './pixelation';
import { getDisplayColorKey, getColorKeyByHex, ColorSystem } from './colorSystemUtils';
import { checkExportPixels, checkGridSize } from './limits';
import { BoardPlan } from '../domain/boards/boardPlan';

// 用于获取对比色的工具函数 - 改进版，带文字描边效果
function getContrastColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#000000';
  // WCAG 相对亮度公式
  const luma = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return luma > 0.55 ? '#1a1a1a' : '#fafafa'; // 用 off-black/off-white 更柔和
}

// 绘制带描边的文字，确保在各种底色上清晰可读
function drawLabelWithOutline(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  textColor: string,
  outlineColor: string
) {
  // 先绘制描边（四个方向偏移）
  ctx.fillStyle = outlineColor;
  const offset = 1;
  ctx.fillText(text, x - offset, y);
  ctx.fillText(text, x + offset, y);
  ctx.fillText(text, x, y - offset);
  ctx.fillText(text, x, y + offset);
  // 再绘制主文字
  ctx.fillStyle = textColor;
  ctx.fillText(text, x, y);
}

// 辅助函数：将十六进制颜色转换为RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const formattedHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(formattedHex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

// 用于排序颜色键的函数 - 从page.tsx复制
function sortColorKeys(a: string, b: string): number {
  const regex = /^([A-Z]+)(\d+)$/;
  const matchA = a.match(regex);
  const matchB = b.match(regex);

  if (matchA && matchB) {
    const prefixA = matchA[1];
    const numA = parseInt(matchA[2], 10);
    const prefixB = matchB[1];
    const numB = parseInt(matchB[2], 10);

    if (prefixA !== prefixB) {
      return prefixA.localeCompare(prefixB); // Sort by prefix first (A, B, C...)
    }
    return numA - numB; // Then sort by number (1, 2, 10...)
  }
  // Fallback for keys that don't match the standard pattern (e.g., T1, ZG1)
  return a.localeCompare(b);
}

export function createBoardSheetPngBlob(input: {
  mappedPixelData: MappedPixel[][];
  board: BoardPlan['boards'][number];
  selectedColorSystem: ColorSystem;
  boardSize: 52 | 104;
}): Blob | null {
  const { mappedPixelData, board, selectedColorSystem, boardSize } = input;
  const cellSize = 28;
  const axis = 34;
  const titleHeight = 54;
  const width = board.usedWidth * cellSize + axis * 2;
  const height = titleHeight + board.usedHeight * cellSize + axis * 2;
  const exportCheck = checkExportPixels(width, height);
  if (!exportCheck.ok) {
    alert(exportCheck.message);
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#1F2937';
  ctx.fillRect(0, 0, width, titleHeight);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '600 18px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    `${board.id} · ${boardSize} 钉板 · C${board.gridStartColumn + 1}-C${board.gridEndColumnExclusive}, R${board.gridStartRow + 1}-R${board.gridEndRowExclusive}`,
    16,
    titleHeight / 2,
  );

  const gridX = axis;
  const gridY = titleHeight + axis;

  ctx.font = '12px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#374151';
  for (let col = 0; col < board.usedWidth; col++) {
    const globalCol = board.gridStartColumn + col + 1;
    if (globalCol === 1 || globalCol % 10 === 0 || col === board.usedWidth - 1) {
      ctx.fillText(String(globalCol), gridX + col * cellSize + cellSize / 2, titleHeight + axis / 2);
      ctx.fillText(String(globalCol), gridX + col * cellSize + cellSize / 2, gridY + board.usedHeight * cellSize + axis / 2);
    }
  }
  for (let row = 0; row < board.usedHeight; row++) {
    const globalRow = board.gridStartRow + row + 1;
    if (globalRow === 1 || globalRow % 10 === 0 || row === board.usedHeight - 1) {
      ctx.fillText(String(globalRow), axis / 2, gridY + row * cellSize + cellSize / 2);
      ctx.fillText(String(globalRow), gridX + board.usedWidth * cellSize + axis / 2, gridY + row * cellSize + cellSize / 2);
    }
  }

  ctx.font = '600 10px system-ui, -apple-system, sans-serif';
  for (let row = 0; row < board.usedHeight; row++) {
    for (let col = 0; col < board.usedWidth; col++) {
      const cell = mappedPixelData[board.gridStartRow + row]?.[board.gridStartColumn + col];
      const x = gridX + col * cellSize;
      const y = gridY + row * cellSize;
      ctx.fillStyle = cell && !cell.isExternal ? cell.color : '#FFFFFF';
      ctx.fillRect(x, y, cellSize, cellSize);
      ctx.strokeStyle = '#DDDDDD';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x + 0.5, y + 0.5, cellSize, cellSize);
      if (cell && !cell.isExternal) {
        const label = getDisplayColorKey(cell.color, selectedColorSystem);
        drawLabelWithOutline(ctx, label.length > 4 ? label.slice(0, 3) + '…' : label, x + cellSize / 2, y + cellSize / 2, getContrastColor(cell.color), 'rgba(255,255,255,0.7)');
      }
    }
  }

  ctx.strokeStyle = '#8EA19D';
  ctx.lineWidth = 1.5;
  for (let col = 10; col < board.usedWidth; col += 10) {
    const x = gridX + col * cellSize;
    ctx.beginPath();
    ctx.moveTo(x, gridY);
    ctx.lineTo(x, gridY + board.usedHeight * cellSize);
    ctx.stroke();
  }
  for (let row = 10; row < board.usedHeight; row += 10) {
    const y = gridY + row * cellSize;
    ctx.beginPath();
    ctx.moveTo(gridX, y);
    ctx.lineTo(gridX + board.usedWidth * cellSize, y);
    ctx.stroke();
  }

  ctx.strokeStyle = '#B45309';
  ctx.lineWidth = 2;
  ctx.strokeRect(gridX, gridY, board.usedWidth * cellSize, board.usedHeight * cellSize);

  return new Blob([dataUrlToBytes(canvas.toDataURL('image/png'))], { type: 'image/png' });
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] ?? '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function serializeCsvText({
  mappedPixelData,
  gridDimensions,
}: {
  mappedPixelData: MappedPixel[][] | null;
  gridDimensions: { N: number; M: number } | null;
}): string {
  if (!mappedPixelData || !gridDimensions) {
    throw new Error("无法导出CSV，数据未生成或无效。");
  }

  const { N, M } = gridDimensions;
  
  // 生成CSV内容，每行代表图纸的一行
  const csvLines: string[] = [];
  
  for (let row = 0; row < M; row++) {
    const rowData: string[] = [];
    for (let col = 0; col < N; col++) {
      const cellData = mappedPixelData[row][col];
      if (cellData && !cellData.isExternal) {
        // 内部单元格，记录hex颜色值
        rowData.push(cellData.color);
      } else {
        // 外部单元格或空白，使用特殊标记
        rowData.push('TRANSPARENT');
      }
    }
    csvLines.push(rowData.join(','));
  }

  return csvLines.join('\n');
}

// 导出CSV hex数据的函数
export function exportCsvData({
  mappedPixelData,
  gridDimensions,
  selectedColorSystem
}: {
  mappedPixelData: MappedPixel[][] | null;
  gridDimensions: { N: number; M: number } | null;
  selectedColorSystem: ColorSystem;
}): void {
  let csvContent: string;
  try {
    csvContent = serializeCsvText({ mappedPixelData, gridDimensions });
  } catch (error) {
    console.error("导出失败: 映射数据或尺寸无效。", error);
    alert("无法导出CSV，数据未生成或无效。");
    return;
  }

  const { N, M } = gridDimensions!;
  
  // 创建并下载CSV文件
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `bead-pattern-${N}x${M}-${selectedColorSystem}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // 释放URL对象
  URL.revokeObjectURL(url);
  
  console.log("CSV数据导出完成");
}

export function createPrintChartPngBlob(input: {
  mappedPixelData: MappedPixel[][];
  gridDimensions: { N: number; M: number };
  colorCounts: { [key: string]: { count: number; color: string } };
  totalBeadCount: number;
  selectedColorSystem: ColorSystem;
}): Blob | null {
  const {
    mappedPixelData,
    gridDimensions,
    colorCounts,
    totalBeadCount,
    selectedColorSystem,
  } = input;
  const { N, M } = gridDimensions;
  const cellSize = 28;
  const axis = 34;
  const titleHeight = 58;
  const statsPadding = 20;
  const colorRows = Math.ceil(Object.keys(colorCounts).length / 3);
  const statsHeight = 70 + colorRows * 26;
  const width = N * cellSize + axis * 2;
  const height = titleHeight + M * cellSize + axis * 2 + statsHeight;
  const exportCheck = checkExportPixels(width, height);
  if (!exportCheck.ok) {
    alert(exportCheck.message);
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#1F2937';
  ctx.fillRect(0, 0, width, titleHeight);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '600 20px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Juice拼豆 · ${N} x ${M}`, 18, titleHeight / 2);

  const gridX = axis;
  const gridY = titleHeight + axis;

  ctx.font = '12px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#374151';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let col = 0; col < N; col++) {
    if (col === 0 || (col + 1) % 10 === 0 || col === N - 1) {
      const x = gridX + col * cellSize + cellSize / 2;
      ctx.fillText(String(col + 1), x, titleHeight + axis / 2);
      ctx.fillText(String(col + 1), x, gridY + M * cellSize + axis / 2);
    }
  }
  for (let row = 0; row < M; row++) {
    if (row === 0 || (row + 1) % 10 === 0 || row === M - 1) {
      const y = gridY + row * cellSize + cellSize / 2;
      ctx.fillText(String(row + 1), axis / 2, y);
      ctx.fillText(String(row + 1), gridX + N * cellSize + axis / 2, y);
    }
  }

  ctx.font = '600 10px system-ui, -apple-system, sans-serif';
  for (let row = 0; row < M; row++) {
    for (let col = 0; col < N; col++) {
      const cell = mappedPixelData[row]?.[col];
      const x = gridX + col * cellSize;
      const y = gridY + row * cellSize;
      ctx.fillStyle = cell && !cell.isExternal ? cell.color : '#FFFFFF';
      ctx.fillRect(x, y, cellSize, cellSize);
      ctx.strokeStyle = '#DDDDDD';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x + 0.5, y + 0.5, cellSize, cellSize);
      if (cell && !cell.isExternal) {
        const label = getDisplayColorKey(cell.color, selectedColorSystem);
        drawLabelWithOutline(
          ctx,
          label.length > 4 ? `${label.slice(0, 3)}…` : label,
          x + cellSize / 2,
          y + cellSize / 2,
          getContrastColor(cell.color),
          'rgba(255,255,255,0.7)',
        );
      }
    }
  }

  ctx.strokeStyle = '#8EA19D';
  ctx.lineWidth = 1.5;
  for (let col = 10; col < N; col += 10) {
    const x = gridX + col * cellSize;
    ctx.beginPath();
    ctx.moveTo(x, gridY);
    ctx.lineTo(x, gridY + M * cellSize);
    ctx.stroke();
  }
  for (let row = 10; row < M; row += 10) {
    const y = gridY + row * cellSize;
    ctx.beginPath();
    ctx.moveTo(gridX, y);
    ctx.lineTo(gridX + N * cellSize, y);
    ctx.stroke();
  }

  const statsY = gridY + M * cellSize + axis + statsPadding;
  ctx.fillStyle = '#17201F';
  ctx.font = '700 16px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('色号与用量', statsPadding, statsY);
  const sortedColors = Object.keys(colorCounts).sort(sortColorKeys);
  sortedColors.forEach((hex, index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const itemWidth = Math.floor((width - statsPadding * 2) / 3);
    const x = statsPadding + column * itemWidth;
    const y = statsY + 30 + row * 26;
    ctx.fillStyle = colorCounts[hex].color;
    ctx.fillRect(x, y - 10, 16, 16);
    ctx.strokeStyle = '#CCCCCC';
    ctx.strokeRect(x, y - 10, 16, 16);
    ctx.fillStyle = '#17201F';
    ctx.font = '600 12px system-ui, -apple-system, sans-serif';
    ctx.fillText(getColorKeyByHex(hex, selectedColorSystem), x + 24, y);
    ctx.fillStyle = '#6B7280';
    ctx.font = '400 12px system-ui, -apple-system, sans-serif';
    ctx.fillText(`${colorCounts[hex].count} 颗`, x + 86, y);
  });
  ctx.fillStyle = '#17201F';
  ctx.font = '700 13px system-ui, -apple-system, sans-serif';
  ctx.fillText(`合计 ${totalBeadCount} 颗`, statsPadding, height - 22);

  return new Blob([dataUrlToBytes(canvas.toDataURL('image/png'))], { type: 'image/png' });
}

export function parseCsvText(
  text: string,
  options: { allowedHexColors?: Set<string> } = {},
): {
  mappedPixelData: MappedPixel[][];
  gridDimensions: { N: number; M: number };
} {
  if (!text) {
    throw new Error('无法读取文件内容');
  }

  const lines = text.trim().split('\n');
  const M = lines.length;

  if (M === 0) {
    throw new Error('CSV文件为空');
  }

  const firstRowData = lines[0].split(',');
  const N = firstRowData.length;

  if (N === 0) {
    throw new Error('CSV文件格式无效');
  }

  const gridCheck = checkGridSize(N, M);
  if (!gridCheck.ok) {
    throw new Error(gridCheck.message!);
  }

  const allowedHexColors = options.allowedHexColors
    ? new Set(Array.from(options.allowedHexColors, (hex) => hex.toUpperCase()))
    : undefined;
  const mappedPixelData: MappedPixel[][] = [];

  for (let row = 0; row < M; row++) {
    const rowData = lines[row].split(',');
    const mappedRow: MappedPixel[] = [];

    if (rowData.length !== N) {
      throw new Error(`第${row + 1}行的列数不匹配，期望${N}列，实际${rowData.length}列`);
    }

    for (let col = 0; col < N; col++) {
      const cellValue = rowData[col].trim();

      if (cellValue === 'TRANSPARENT' || cellValue === '') {
        mappedRow.push({
          key: 'TRANSPARENT',
          color: '#FFFFFF',
          isExternal: true,
        });
        continue;
      }

      const hexPattern = /^#[0-9A-Fa-f]{6}$/;
      if (!hexPattern.test(cellValue)) {
        throw new Error(`第${row + 1}行第${col + 1}列的颜色值无效：${cellValue}`);
      }

      const normalizedHex = cellValue.toUpperCase();
      if (allowedHexColors && !allowedHexColors.has(normalizedHex)) {
        throw new Error(`第${row + 1}行第${col + 1}列不在当前色板中：${cellValue}。请使用支持的色号重新导出。`);
      }

      const mardKey = getColorKeyByHex(normalizedHex, 'MARD');
      if (mardKey === '?') {
        throw new Error(`第${row + 1}行第${col + 1}列的颜色在当前色号映射中不存在：${cellValue}`);
      }

      mappedRow.push({
        key: mardKey,
        color: normalizedHex,
        isExternal: false,
      });
    }

    mappedPixelData.push(mappedRow);
  }

  return {
    mappedPixelData,
    gridDimensions: { N, M },
  };
}

// 导入CSV hex数据的函数
export function importCsvData(file: File, allowedHexColors?: Set<string>): Promise<{
  mappedPixelData: MappedPixel[][];
  gridDimensions: { N: number; M: number };
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        resolve(parseCsvText(text, { allowedHexColors }));
        
      } catch (error) {
        reject(new Error(`解析CSV文件失败：${error}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('读取文件失败'));
    };
    
    reader.readAsText(file, 'utf-8');
  });
}

// 下载图片的主函数
export async function downloadImage({
  mappedPixelData,
  gridDimensions,
  colorCounts,
  totalBeadCount,
  options,
  activeBeadPalette,
  selectedColorSystem,
}: {
  mappedPixelData: MappedPixel[][] | null;
  gridDimensions: { N: number; M: number } | null;
  colorCounts: { [key: string]: { count: number; color: string } } | null;
  totalBeadCount: number;
  options: GridDownloadOptions;
  activeBeadPalette: PaletteColor[];
  selectedColorSystem: ColorSystem;
  boardPlan?: BoardPlan | null;
  inventoryPresetId?: string;
}): Promise<void> {
  if (!mappedPixelData || !gridDimensions || gridDimensions.N === 0 || gridDimensions.M === 0 || activeBeadPalette.length === 0) {
    console.error("下载失败: 映射数据或尺寸无效。");
    alert("无法下载图纸，数据未生成或无效。");
    return;
  }
  if (!colorCounts) {
    console.error("下载失败: 色号统计数据无效。");
    alert("无法下载图纸，色号统计数据未生成或无效。");
    return;
  }
  
  // 主要下载处理函数
  const processDownload = () => {
    const { N, M } = gridDimensions; // 此时已确保gridDimensions不为null
    const downloadCellSize = 30;
  
    // 从下载选项中获取设置
    const { showGrid, gridInterval, showCoordinates, gridLineColor, includeStats, showCellNumbers = true } = options;
  
    // 设置边距空间用于坐标轴标注（如果需要）
    const axisLabelSize = showCoordinates ? Math.max(30, Math.floor(downloadCellSize)) : 0;
    
    // 定义统计区域的基本参数
    const statsPadding = 20;
    let statsHeight = 0;
    
    // 预先计算可用宽度
    const preCalcWidth = N * downloadCellSize + axisLabelSize;
    const preCalcAvailableWidth = preCalcWidth - (statsPadding * 2);

    // 估算字体参考大小，用于坐标边距计算
    const approxFontSize = Math.floor(13 + Math.max(0, preCalcAvailableWidth - 350) / 60);

    // 计算额外边距，确保坐标数字完全显示（四边都需要）
    const extraLeftMargin = showCoordinates ? Math.max(20, approxFontSize * 2) : 0;
    const extraRightMargin = showCoordinates ? Math.max(20, approxFontSize * 2) : 0;
    const extraTopMargin = showCoordinates ? Math.max(15, approxFontSize) : 0;
    const extraBottomMargin = showCoordinates ? Math.max(15, approxFontSize) : 0;
    
    // 计算网格尺寸
    const gridWidth = N * downloadCellSize;
    const gridHeight = M * downloadCellSize;
    
    // 计算底部留白区域高度
    const bottomPadding = 35;
  
    // 计算标题栏高度（根据图片大小自动调整）
    const baseTitleBarHeight = 80; // 增大基础高度
    
    // 先计算一个初始下载宽度来确定缩放比例
    const initialWidth = gridWidth + axisLabelSize + extraLeftMargin;
    // 使用总宽度而不是单元格大小来计算比例，确保字体在大尺寸图片上也足够大
    const titleBarScale = Math.max(1.0, Math.min(2.0, initialWidth / 1000)); // 更激进的缩放策略
    const titleBarHeight = Math.floor(baseTitleBarHeight * titleBarScale);
    
    // 计算标题文字大小 - 与总体宽度相关而不是单元格大小
    const titleFontSize = Math.max(28, Math.floor(28 * titleBarScale)); // 最小28px，确保可读性
    
    // 预估统计区域高度（用于初始画布大小，实际渲染后可能微调）
    if (includeStats && colorCounts) {
      const numColors = Object.keys(colorCounts).length;
      const estColumns = Math.max(1, Math.min(4, Math.floor(preCalcAvailableWidth / 280)));
      const estRows = Math.ceil(numColors / estColumns);
      const estScale = Math.max(1.0, preCalcAvailableWidth / 800);
      const estRowHeight = Math.max(Math.floor(18 * estScale) + 12, 28);
      statsHeight = 36 + (estRows * estRowHeight) + 60 + (statsPadding * 2) + 24; // title + rows + footer + padding + topMargin
    }

    // 调整画布大小，包含标题栏、坐标轴、统计区域和底部留白（四边都有坐标）
    const downloadWidth = gridWidth + (axisLabelSize * 2) + extraLeftMargin + extraRightMargin;
    let downloadHeight = titleBarHeight + gridHeight + (axisLabelSize * 2) + statsHeight + extraTopMargin + extraBottomMargin + bottomPadding;

    // 检查导出画布像素上限
    const exportCheck = checkExportPixels(downloadWidth, downloadHeight);
    if (!exportCheck.ok) { alert(exportCheck.message); return; }

    let downloadCanvas = document.createElement('canvas');
    downloadCanvas.width = downloadWidth;
    downloadCanvas.height = downloadHeight;
    const context = downloadCanvas.getContext('2d');
    if (!context) {
      console.error("下载失败: 无法创建临时 Canvas Context。");
      alert("无法下载图纸。");
      return;
    }
    
    // 使用非空的context变量
    let ctx = context;
    ctx.imageSmoothingEnabled = false;
  
    // 设置背景色
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, downloadWidth, downloadHeight);
  
    // 重新设计的现代简洁标题栏
    // 1. 主背景 - 纯净的深色，专业感
    ctx.fillStyle = '#1F2937'; // 深灰色，既有专业感又不抢夺主要内容
    ctx.fillRect(0, 0, downloadWidth, titleBarHeight);
    
    // 2. 左侧品牌色块 - 作为Logo载体
    const brandBlockWidth = titleBarHeight * 0.8;
    const brandGradient = ctx.createLinearGradient(0, 0, brandBlockWidth, titleBarHeight);
    brandGradient.addColorStop(0, '#6366F1'); // 现代蓝色
    brandGradient.addColorStop(1, '#8B5CF6'); // 现代紫色
    
    ctx.fillStyle = brandGradient;
    ctx.fillRect(0, 0, brandBlockWidth, titleBarHeight);
    
    // 3. 绘制现代Logo - 几何图形组合
    const logoSize = titleBarHeight * 0.4;
    const logoX = brandBlockWidth / 2;
    const logoY = titleBarHeight / 2;
    
    // Logo: 拼豆的抽象表示 - 圆角方块阵列
    ctx.fillStyle = '#FFFFFF';
    const beadSize = logoSize / 4;
    const beadSpacing = beadSize * 1.2;
    
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const beadX = logoX - logoSize/2 + col * beadSpacing;
        const beadY = logoY - logoSize/2 + row * beadSpacing;
        
        // 绘制圆角方块，模拟拼豆
        ctx.beginPath();
        ctx.roundRect(beadX, beadY, beadSize, beadSize, beadSize * 0.2);
        ctx.fill();
        
        // 添加中心小圆点，增加拼豆特征
        ctx.fillStyle = 'rgba(99, 102, 241, 0.3)';
        ctx.beginPath();
        ctx.arc(beadX + beadSize/2, beadY + beadSize/2, beadSize * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
      }
    }
    
    // 4. 主标题 - 现代字体，清晰层次
    const mainTitleFontSize = Math.max(20, Math.floor(titleFontSize * 0.8));
    const subTitleFontSize = Math.max(12, Math.floor(titleFontSize * 0.45));
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `600 ${mainTitleFontSize}px system-ui, -apple-system, sans-serif`; // 现代字体栈
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    // 主标题位置
    const titleStartX = brandBlockWidth + titleBarHeight * 0.3;
    const mainTitleY = titleBarHeight * 0.4;
    
    ctx.fillText('Juice拼豆', titleStartX, mainTitleY);
    
    // 5. 副标题 - 功能说明
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = `400 ${subTitleFontSize}px system-ui, -apple-system, sans-serif`;
    const subTitleY = titleBarHeight * 0.65;
    
    ctx.fillText('拼豆图纸生成工具', titleStartX, subTitleY);
    
    
    
    // 7. 优雅的分割线
    const separatorY = titleBarHeight - 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, separatorY);
    ctx.lineTo(downloadWidth, separatorY);
    ctx.stroke();
    
    // 标题右侧留白
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.font = `500 ${subTitleFontSize}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('Juice拼豆', downloadWidth - titleBarHeight * 0.3, titleBarHeight / 2);

    // 如果需要，先绘制坐标轴和网格背景
    if (showCoordinates) {
      // 绘制坐标轴背景
      ctx.fillStyle = '#F5F5F5'; // 浅灰色背景
      // 横轴背景 (顶部)
      ctx.fillRect(extraLeftMargin + axisLabelSize, titleBarHeight + extraTopMargin, gridWidth, axisLabelSize);
      // 横轴背景 (底部)
      ctx.fillRect(extraLeftMargin + axisLabelSize, titleBarHeight + extraTopMargin + axisLabelSize + gridHeight, gridWidth, axisLabelSize);
      // 纵轴背景 (左侧)
      ctx.fillRect(extraLeftMargin, titleBarHeight + extraTopMargin + axisLabelSize, axisLabelSize, gridHeight);
      // 纵轴背景 (右侧)
      ctx.fillRect(extraLeftMargin + axisLabelSize + gridWidth, titleBarHeight + extraTopMargin + axisLabelSize, axisLabelSize, gridHeight);
      
      // 绘制坐标轴数字
      ctx.fillStyle = '#333333'; // 坐标数字颜色
      // 使用固定的字体大小，不进行缩放
      const axisFontSize = 14;
      ctx.font = `${axisFontSize}px sans-serif`;

      // X轴（顶部）数字
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < N; i++) {
        if ((i + 1) % gridInterval === 0 || i === 0 || i === N - 1) { // 在间隔处、起始处和结束处标注
          // 将数字放在轴线之上，考虑额外边距
          const numX = extraLeftMargin + axisLabelSize + (i * downloadCellSize) + (downloadCellSize / 2);
          const numY = titleBarHeight + extraTopMargin + (axisLabelSize / 2);
          ctx.fillText((i + 1).toString(), numX, numY);
        }
      }
      
      // X轴（底部）数字
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < N; i++) {
        if ((i + 1) % gridInterval === 0 || i === 0 || i === N - 1) { // 在间隔处、起始处和结束处标注
          // 将数字放在底部轴线上
          const numX = extraLeftMargin + axisLabelSize + (i * downloadCellSize) + (downloadCellSize / 2);
          const numY = titleBarHeight + extraTopMargin + axisLabelSize + gridHeight + (axisLabelSize / 2);
          ctx.fillText((i + 1).toString(), numX, numY);
        }
      }
      
      // Y轴（左侧）数字
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let j = 0; j < M; j++) {
        if ((j + 1) % gridInterval === 0 || j === 0 || j === M - 1) { // 在间隔处、起始处和结束处标注
          // 将数字放在轴线之左
          const numX = extraLeftMargin + (axisLabelSize / 2);
          const numY = titleBarHeight + extraTopMargin + axisLabelSize + (j * downloadCellSize) + (downloadCellSize / 2);
          ctx.fillText((j + 1).toString(), numX, numY);
        }
      }
      
      // Y轴（右侧）数字
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let j = 0; j < M; j++) {
        if ((j + 1) % gridInterval === 0 || j === 0 || j === M - 1) { // 在间隔处、起始处和结束处标注
          // 将数字放在右侧轴线上
          const numX = extraLeftMargin + axisLabelSize + gridWidth + (axisLabelSize / 2);
          const numY = titleBarHeight + extraTopMargin + axisLabelSize + (j * downloadCellSize) + (downloadCellSize / 2);
          ctx.fillText((j + 1).toString(), numX, numY);
        }
      }
      
      // 绘制坐标轴边框
      ctx.strokeStyle = '#AAAAAA';
      ctx.lineWidth = 1;
      // 顶部横轴底边
      ctx.beginPath();
      ctx.moveTo(extraLeftMargin + axisLabelSize, titleBarHeight + extraTopMargin + axisLabelSize);
      ctx.lineTo(extraLeftMargin + axisLabelSize + gridWidth, titleBarHeight + extraTopMargin + axisLabelSize);
      ctx.stroke();
      // 底部横轴顶边
      ctx.beginPath();
      ctx.moveTo(extraLeftMargin + axisLabelSize, titleBarHeight + extraTopMargin + axisLabelSize + gridHeight);
      ctx.lineTo(extraLeftMargin + axisLabelSize + gridWidth, titleBarHeight + extraTopMargin + axisLabelSize + gridHeight);
      ctx.stroke();
      // 左侧纵轴右边
      ctx.beginPath();
      ctx.moveTo(extraLeftMargin + axisLabelSize, titleBarHeight + extraTopMargin + axisLabelSize);
      ctx.lineTo(extraLeftMargin + axisLabelSize, titleBarHeight + extraTopMargin + axisLabelSize + gridHeight);
      ctx.stroke();
      // 右侧纵轴左边
      ctx.beginPath();
      ctx.moveTo(extraLeftMargin + axisLabelSize + gridWidth, titleBarHeight + extraTopMargin + axisLabelSize);
      ctx.lineTo(extraLeftMargin + axisLabelSize + gridWidth, titleBarHeight + extraTopMargin + axisLabelSize + gridHeight);
      ctx.stroke();
    }
    
    // 恢复默认文本对齐和基线，为后续绘制做准备
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 设置用于绘制单元格内容的字体（使用系统现代字体栈，更清晰美观）
    const labelFontSize = Math.max(7, Math.floor(downloadCellSize * 0.35));
    ctx.font = `600 ${labelFontSize}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 绘制所有单元格
    for (let j = 0; j < M; j++) {
      for (let i = 0; i < N; i++) {
        const cellData = mappedPixelData[j][i];
        // 计算绘制位置，考虑额外边距和标题栏高度
        const drawX = extraLeftMargin + i * downloadCellSize + axisLabelSize;
        const drawY = titleBarHeight + extraTopMargin + j * downloadCellSize + axisLabelSize;

        // 根据是否是外部背景确定填充颜色
        if (cellData && !cellData.isExternal) {
          // 内部单元格：使用珠子颜色填充并绘制文本
          const cellColor = cellData.color || '#FFFFFF';

          ctx.fillStyle = cellColor;
          ctx.fillRect(drawX, drawY, downloadCellSize, downloadCellSize);

          if (showCellNumbers) {
            let cellKey = getDisplayColorKey(cellData.color || '#FFFFFF', selectedColorSystem);
            // 如果色号太长（>4字符）且格子较小，截断显示
            if (cellKey.length > 4 && downloadCellSize < 28) {
              cellKey = cellKey.substring(0, 3) + String.fromCharCode(8230);
            }
            const textColor = getContrastColor(cellColor);
            const outlineColor = textColor === '#1a1a1a' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.35)';
            const centerX = drawX + downloadCellSize / 2;
            const centerY = drawY + downloadCellSize / 2;
            drawLabelWithOutline(ctx, cellKey, centerX, centerY, textColor, outlineColor);
          }
        } else {
          // 外部背景：填充白色
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(drawX, drawY, downloadCellSize, downloadCellSize);
        }

        // 绘制所有单元格的边框
        ctx.strokeStyle = '#DDDDDD'; // 浅色线条作为基础网格
        ctx.lineWidth = 0.5;
        ctx.strokeRect(drawX + 0.5, drawY + 0.5, downloadCellSize, downloadCellSize);
      }
    }

    // 如果需要，绘制分隔网格线
    if (showGrid) {
      ctx.strokeStyle = gridLineColor; // 使用用户选择的颜色
      ctx.lineWidth = 1.5;
      
      // 绘制垂直分隔线 - 在单元格之间而不是边框上
      for (let i = gridInterval; i < N; i += gridInterval) {
        const lineX = extraLeftMargin + i * downloadCellSize + axisLabelSize;
        ctx.beginPath();
        ctx.moveTo(lineX, titleBarHeight + extraTopMargin + axisLabelSize);
        ctx.lineTo(lineX, titleBarHeight + extraTopMargin + axisLabelSize + M * downloadCellSize);
        ctx.stroke();
      }
      
      // 绘制水平分隔线 - 在单元格之间而不是边框上
      for (let j = gridInterval; j < M; j += gridInterval) {
        const lineY = titleBarHeight + extraTopMargin + j * downloadCellSize + axisLabelSize;
        ctx.beginPath();
        ctx.moveTo(extraLeftMargin + axisLabelSize, lineY);
        ctx.lineTo(extraLeftMargin + axisLabelSize + N * downloadCellSize, lineY);
        ctx.stroke();
      }
    }

    // 绘制整个网格区域的主边框
    ctx.strokeStyle = '#000000'; // 黑色边框
    ctx.lineWidth = 1.5;
    ctx.strokeRect(
      extraLeftMargin + axisLabelSize + 0.5, 
      titleBarHeight + extraTopMargin + axisLabelSize + 0.5, 
      N * downloadCellSize, 
      M * downloadCellSize
    );

    // 副水印：放在网格左上角，简洁版本
    const secondaryWatermarkFontSize = Math.max(10, Math.floor(downloadCellSize * 0.5));
    const secondaryText = 'Juice拼豆';
    
    ctx.font = `500 ${secondaryWatermarkFontSize}px system-ui, -apple-system, sans-serif`;
    const secondaryMetrics = ctx.measureText(secondaryText);
    const secondaryWidth = secondaryMetrics.width;
    const secondaryHeight = secondaryWatermarkFontSize;
    
    const secondaryWatermarkX = extraLeftMargin + axisLabelSize + 15;
    const secondaryWatermarkY = titleBarHeight + extraTopMargin + axisLabelSize + secondaryHeight + 15;
    
    // 副水印背景
    const secondaryBgPadding = 4;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.beginPath();
    ctx.roundRect(
      secondaryWatermarkX - secondaryBgPadding,
      secondaryWatermarkY - secondaryHeight - secondaryBgPadding,
      secondaryWidth + secondaryBgPadding * 2,
      secondaryHeight + secondaryBgPadding * 2,
      3
    );
    ctx.fill();
    
    // 副水印文字
    ctx.fillStyle = '#6B7280'; // 中等灰色，存在但不突兀
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(secondaryText, secondaryWatermarkX, secondaryWatermarkY);

    // 绘制统计信息
    if (includeStats && colorCounts) {
      const colorKeys = Object.keys(colorCounts).sort(sortColorKeys);

      // 增加额外的间距，防止标题文字侵入画布
      const statsTopMargin = 24;
      const statsY = titleBarHeight + extraTopMargin + M * downloadCellSize + (axisLabelSize * 2) + statsPadding + statsTopMargin;

      // 计算统计区域的可用宽度
      const availableStatsWidth = downloadWidth - (statsPadding * 2);

      // 根据可用宽度动态计算列数
      const renderNumColumns = Math.max(1, Math.min(4, Math.floor(availableStatsWidth / 280)));

      // 缩放因子
      const scaleFactor = Math.max(1.0, availableStatsWidth / 800);
      const swatchSize = Math.floor(18 * scaleFactor);
      const itemFontSize = Math.floor(13 * scaleFactor);
      const countFontSize = Math.floor(12 * scaleFactor);
      const titleFontSize = Math.floor(16 * scaleFactor);

      // 每项宽度
      const itemWidth = Math.floor(availableStatsWidth / renderNumColumns);

      // 绘制统计区域标题
      ctx.fillStyle = '#333333';
      ctx.font = `bold ${titleFontSize}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('色号与用量', statsPadding, statsY + 10);

      // 绘制分隔线
      ctx.strokeStyle = '#DDDDDD';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(statsPadding, statsY + 28);
      ctx.lineTo(downloadWidth - statsPadding, statsY + 28);
      ctx.stroke();

      const titleAreaHeight = 36;
      // 行高根据色块大小动态调整
      const statsRowHeight = Math.max(swatchSize + 12, 28);

      // 绘制每行统计信息 - 使用更清晰的布局: [色块] 色号  数量
      colorKeys.forEach((key, index) => {
        const rowIndex = Math.floor(index / renderNumColumns);
        const colIndex = index % renderNumColumns;
        const cellData = colorCounts[key];

        // 当前项的起始X
        const itemX = statsPadding + (colIndex * itemWidth);
        // 当前行的Y中心
        const rowY = statsY + titleAreaHeight + (rowIndex * statsRowHeight) + (statsRowHeight / 2);

        // 1. 绘制色块 (带圆角效果)
        ctx.fillStyle = cellData.color;
        ctx.strokeStyle = '#CCCCCC';
        ctx.lineWidth = 1;
        const swatchX = itemX;
        const swatchY = rowY - swatchSize / 2;
        ctx.beginPath();
        ctx.roundRect(swatchX, swatchY, swatchSize, swatchSize, Math.max(1, swatchSize * 0.15));
        ctx.fill();
        ctx.stroke();

        // 2. 绘制色号 (左对齐，在色块右侧)
        const codeX = swatchX + swatchSize + 8;
        ctx.fillStyle = '#1F2937';
        ctx.font = `600 ${itemFontSize}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const displayKey = getColorKeyByHex(key, selectedColorSystem);
        ctx.fillText(displayKey, codeX, rowY);

        // 3. 绘制数量 (在色号之后，用更轻的字体)
        const codeWidth = ctx.measureText(displayKey).width;
        const countX = codeX + codeWidth + 12;
        const countText = `${cellData.count}颗`;
        ctx.fillStyle = '#6B7280';
        ctx.font = `400 ${countFontSize}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(countText, countX, rowY);
      });

      // 计算实际需要的行数
      const numRows = Math.ceil(colorKeys.length / renderNumColumns);

      // 绘制总量分隔线
      const totalDividerY = statsY + titleAreaHeight + (numRows * statsRowHeight) + 6;
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(statsPadding, totalDividerY);
      ctx.lineTo(downloadWidth - statsPadding, totalDividerY);
      ctx.stroke();

      // 绘制总量
      const totalY = totalDividerY + 20;
      ctx.fillStyle = '#1F2937';
      ctx.font = `bold ${itemFontSize}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('合计', statsPadding, totalY);

      ctx.fillStyle = '#6B7280';
      ctx.font = `400 ${countFontSize}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillText(`${totalBeadCount} 颗`, downloadWidth - statsPadding, totalY);

      // 水印
      const statsWatermarkFontSize = Math.max(10, Math.floor(itemFontSize * 0.7));
      const statsWatermarkText = '图纸来源：Juice拼豆';

      ctx.font = `400 ${statsWatermarkFontSize}px system-ui, -apple-system, sans-serif`;
      const statsTextMetrics = ctx.measureText(statsWatermarkText);
      const statsTextWidth = statsTextMetrics.width;
      const statsTextHeight = statsWatermarkFontSize;

      const statsWatermarkX = statsPadding;
      const statsWatermarkY = totalY + 22;

      // 统计区域水印背景
      const statsBgPadding = 4;
      ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
      ctx.beginPath();
      ctx.roundRect(
        statsWatermarkX - statsBgPadding,
        statsWatermarkY - statsTextHeight - statsBgPadding,
        statsTextWidth + statsBgPadding * 2,
        statsTextHeight + statsBgPadding * 2,
        3
      );
      ctx.fill();

      // 统计区域水印边框
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 统计区域水印文字
      ctx.fillStyle = '#94A3B8';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(statsWatermarkText, statsWatermarkX, statsWatermarkY);

      // 更新统计区域高度
      const footerAreaHeight = 60;
      statsHeight = titleAreaHeight + (numRows * statsRowHeight) + footerAreaHeight + (statsPadding * 2) + statsTopMargin;
    }

    // 重新计算画布高度并调整
    if (includeStats && colorCounts) {
      // 调整画布大小，包含计算后的统计区域和底部留白
      const newDownloadHeight = titleBarHeight + extraTopMargin + M * downloadCellSize + (axisLabelSize * 2) + statsHeight + extraBottomMargin + bottomPadding;
      
      if (downloadHeight !== newDownloadHeight) {
        // 检查新画布像素上限
        const resizeCheck = checkExportPixels(downloadWidth, newDownloadHeight);
        if (!resizeCheck.ok) { alert(resizeCheck.message); return; }

        // 如果高度变化了，需要创建新的画布并复制当前内容
        const newCanvas = document.createElement('canvas');
        newCanvas.width = downloadWidth;
        newCanvas.height = newDownloadHeight;
        const newContext = newCanvas.getContext('2d');
        
        if (newContext) {
          // 复制原画布内容
          newContext.drawImage(downloadCanvas, 0, 0);
          
          // 更新画布和上下文引用
          downloadCanvas = newCanvas;
          ctx = newContext;
          ctx.imageSmoothingEnabled = false;
          
          // 更新高度
          downloadHeight = newDownloadHeight;
        }
      }
    }

    try {
      const dataURL = downloadCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = showCellNumbers
        ? `bead-grid-${N}x${M}-keys-palette_${selectedColorSystem}.png`
        : `bead-grid-${N}x${M}-pixel-palette_${selectedColorSystem}.png`;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      console.log("Grid image download initiated.");
      
      // 如果启用了CSV导出，同时导出CSV文件
      if (options.exportCsv) {
        exportCsvData({
          mappedPixelData,
          gridDimensions,
          selectedColorSystem
        });
      }

    } catch (e) {
      console.error("下载图纸失败:", e);
      alert("无法生成图纸下载链接。");
    }
  };
  
  // 直接执行下载处理
  processDownload();
}
