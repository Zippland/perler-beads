import { GridDownloadOptions } from '../types/downloadTypes';
import { MappedPixel, PaletteColor } from './pixelation';
import { getDisplayColorKey, getColorKeyByHex, ColorSystem } from './colorSystemUtils';
import { isElectron, saveFileWithElectron, saveCsvWithElectron } from './electronUtils';

// 用于获取对比色的工具函数 - 从page.tsx复制
function getContrastColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#000000'; // Default to black
  // Simple brightness check (Luma formula Y = 0.2126 R + 0.7152 G + 0.0722 B)
  const luma = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return luma > 0.5 ? '#000000' : '#FFFFFF'; // Dark background -> white text, Light background -> black text
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

// 导出CSV hex数据的函数
export async function exportCsvData({
  mappedPixelData,
  gridDimensions,
  selectedColorSystem
}: {
  mappedPixelData: MappedPixel[][] | null;
  gridDimensions: { N: number; M: number } | null;
  selectedColorSystem: ColorSystem;
}): Promise<void> {
  if (!mappedPixelData || !gridDimensions) {
    console.error("导出失败: 映射数据或尺寸无效。");
    alert("无法导出CSV，数据未生成或无效。");
    return;
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

  // 创建CSV内容
  const csvContent = csvLines.join('\n');
  const defaultFileName = `bead-pattern-${N}x${M}-${selectedColorSystem}.csv`;
  
  // 如果在 Electron 环境下，使用原生保存对话框
  if (isElectron()) {
    const result = await saveCsvWithElectron(csvContent, defaultFileName);
    if (result.success) {
      console.log("CSV数据导出完成:", result.path);
    } else {
      console.error("CSV导出失败:", result.error);
    }
    return;
  }
  
  // Web 环境：创建并下载CSV文件
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', defaultFileName);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // 释放URL对象
  URL.revokeObjectURL(url);
  
  console.log("CSV数据导出完成");
}

// 导入CSV hex数据的函数
export function importCsvData(file: File): Promise<{
  mappedPixelData: MappedPixel[][];
  gridDimensions: { N: number; M: number };
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) {
          reject(new Error('无法读取文件内容'));
          return;
        }
        
        // 解析CSV内容
        const lines = text.trim().split('\n');
        const M = lines.length; // 行数
        
        if (M === 0) {
          reject(new Error('CSV文件为空'));
          return;
        }
        
        // 解析第一行获取列数
        const firstRowData = lines[0].split(',');
        const N = firstRowData.length; // 列数
        
        if (N === 0) {
          reject(new Error('CSV文件格式无效'));
          return;
        }
        
        // 创建映射数据
        const mappedPixelData: MappedPixel[][] = [];
        
        for (let row = 0; row < M; row++) {
          const rowData = lines[row].split(',');
          const mappedRow: MappedPixel[] = [];
          
          // 确保每行都有正确的列数
          if (rowData.length !== N) {
            reject(new Error(`第${row + 1}行的列数不匹配，期望${N}列，实际${rowData.length}列`));
            return;
          }
          
          for (let col = 0; col < N; col++) {
            const cellValue = rowData[col].trim();
            
            if (cellValue === 'TRANSPARENT' || cellValue === '') {
              // 外部/透明单元格
              mappedRow.push({
                key: 'TRANSPARENT',
                color: '#FFFFFF',
                isExternal: true
              });
            } else {
              // 验证hex颜色格式
              const hexPattern = /^#[0-9A-Fa-f]{6}$/;
              if (!hexPattern.test(cellValue)) {
                reject(new Error(`第${row + 1}行第${col + 1}列的颜色值无效：${cellValue}`));
                return;
              }
              
              // 内部单元格
              mappedRow.push({
                key: cellValue.toUpperCase(),
                color: cellValue.toUpperCase(),
                isExternal: false
              });
            }
          }
          
          mappedPixelData.push(mappedRow);
        }
        
        // 返回解析结果
        resolve({
          mappedPixelData,
          gridDimensions: { N, M }
        });
        
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
  selectedColorSystem
}: {
  mappedPixelData: MappedPixel[][] | null;
  gridDimensions: { N: number; M: number } | null;
  colorCounts: { [key: string]: { count: number; color: string } } | null;
  totalBeadCount: number;
  options: GridDownloadOptions;
  activeBeadPalette: PaletteColor[];
  selectedColorSystem: ColorSystem;
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
  const processDownload = async () => {
    const { N, M } = gridDimensions; // 此时已确保gridDimensions不为null
    const downloadCellSize = 30;
  
    // 从下载选项中获取设置
    const { showGrid, gridInterval, showCoordinates, gridLineColor, includeStats, showCellNumbers = true } = options;
  
    // 设置边距空间用于坐标轴标注（如果需要）
    const axisLabelSize = showCoordinates ? Math.max(30, Math.floor(downloadCellSize)) : 0;
    
    // 定义统计区域的基本参数
    const statsPadding = 15;
    let statsHeight = 0;
    
    // 预先计算用于字体大小的变量
    const preCalcWidth = N * downloadCellSize + axisLabelSize;
    const preCalcAvailableWidth = preCalcWidth - (statsPadding * 2);
    
    // 计算字体大小 - 与颜色统计区域保持一致
    const baseStatsFontSize = 13;
    const widthFactor = Math.max(0, preCalcAvailableWidth - 350) / 600;
    const statsFontSize = Math.floor(baseStatsFontSize + (widthFactor * 10));
    
    // 计算额外边距，确保坐标数字完全显示（四边都需要）
    const extraLeftMargin = showCoordinates ? Math.max(20, statsFontSize * 2) : 0; // 左侧额外边距
    const extraRightMargin = showCoordinates ? Math.max(20, statsFontSize * 2) : 0; // 右侧额外边距
    const extraTopMargin = showCoordinates ? Math.max(15, statsFontSize) : 0; // 顶部额外边距
    const extraBottomMargin = showCoordinates ? Math.max(15, statsFontSize) : 0; // 底部额外边距
    
    // 计算网格尺寸
    const gridWidth = N * downloadCellSize;
    const gridHeight = M * downloadCellSize;

    // 标题栏高度设为0（暂时不需要标题栏）
    const titleBarHeight = 0;
    
    // 计算统计区域的大小
    if (includeStats && colorCounts) {
      const colorKeys = Object.keys(colorCounts);

      // 统计区域顶部额外间距
      const statsTopMargin = 15;

      // 根据可用宽度动态计算列数 - 卡片样式需要更宽
      // 优化：减小基准宽度，增加列数，使色块更小
      const numColumns = Math.max(4, Math.min(15, Math.floor(preCalcAvailableWidth / 70)));

      // 卡片尺寸参数
      const cardGap = 6; // 卡片间距减小
      const cardWidth = Math.floor((preCalcAvailableWidth - (numColumns - 1) * cardGap) / numColumns);
      const cardHeight = Math.floor(cardWidth * 0.55); // 卡片高度比例减小

      // 计算实际需要的行数
      const numRows = Math.ceil(colorKeys.length / numColumns);

      // 标题和页脚高度
      const titleHeight = 20;
      const footerHeight = 30;

      // 计算统计区域的总高度
      statsHeight = titleHeight + (numRows * (cardHeight + cardGap)) + footerHeight + (statsPadding * 2) + statsTopMargin;
    }
  
    // 调整画布大小，包含坐标轴和统计区域（四边都有坐标）
    const downloadWidth = gridWidth + (axisLabelSize * 2) + extraLeftMargin + extraRightMargin;
    let downloadHeight = titleBarHeight + gridHeight + (axisLabelSize * 2) + statsHeight + extraTopMargin + extraBottomMargin;
  
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

    console.log(`Generating download grid image: ${downloadWidth}x${downloadHeight}`);
    const fontSize = Math.max(8, Math.floor(downloadCellSize * 0.4));
    
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

    // 设置用于绘制单元格内容的字体
    ctx.font = `bold ${fontSize}px sans-serif`;
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
            const cellKey = getDisplayColorKey(cellData.color || '#FFFFFF', selectedColorSystem);
            ctx.fillStyle = getContrastColor(cellColor);
            ctx.fillText(cellKey, drawX + downloadCellSize / 2, drawY + downloadCellSize / 2);
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

    

    


    // 绘制统计信息 - 圆角卡片样式
    if (includeStats && colorCounts) {
      // 按显示色号排序（而不是按 hex 值排序）
      const colorKeys = Object.keys(colorCounts).sort((a, b) => {
        const displayKeyA = getColorKeyByHex(a, selectedColorSystem);
        const displayKeyB = getColorKeyByHex(b, selectedColorSystem);
        return sortColorKeys(displayKeyA, displayKeyB);
      });

      // 增加额外的间距
      const statsTopMargin = 15;
      const statsY = titleBarHeight + extraTopMargin + M * downloadCellSize + (axisLabelSize * 2) + statsPadding + statsTopMargin;

      // 计算统计区域的可用宽度
      const availableStatsWidth = downloadWidth - (statsPadding * 2);

      // 根据可用宽度动态计算列数 - 卡片样式
      // 优化：与预计算保持一致
      const renderNumColumns = Math.max(4, Math.min(15, Math.floor(availableStatsWidth / 70)));

      // 卡片尺寸参数
      const cardGap = 6;
      const cardWidth = Math.floor((availableStatsWidth - (renderNumColumns - 1) * cardGap) / renderNumColumns);
      const cardHeight = Math.floor(cardWidth * 0.55);
      const cardRadius = Math.floor(cardWidth * 0.1); // 圆角半径

      // 绘制分隔线
      ctx.strokeStyle = '#DDDDDD';
      ctx.beginPath();
      ctx.moveTo(statsPadding, statsY + 10); // 调整线条位置
      ctx.lineTo(downloadWidth - statsPadding, statsY + 10);
      ctx.stroke();

      const titleHeight = 20;

      // 绘制每个颜色卡片
      colorKeys.forEach((key, index) => {
        const rowIndex = Math.floor(index / renderNumColumns);
        const colIndex = index % renderNumColumns;

        // 计算卡片位置
        const cardX = statsPadding + colIndex * (cardWidth + cardGap);
        const cardY = statsY + titleHeight + rowIndex * (cardHeight + cardGap);

        const cellData = colorCounts[key];
        const displayKey = getColorKeyByHex(key, selectedColorSystem);

        // 绘制卡片背景 - 圆角矩形，使用颜色填充
        ctx.fillStyle = cellData.color;
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardWidth, cardHeight, cardRadius);
        ctx.fill();

        // 绘制卡片边框 - 半透明白色，增加层次感
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 绘制毛玻璃效果的文字背景区域
        const textBgHeight = cardHeight * 0.55;
        const textBgY = cardY + cardHeight - textBgHeight;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        ctx.roundRect(cardX, textBgY, cardWidth, textBgHeight, [0, 0, cardRadius, cardRadius]);
        ctx.fill();

        // 计算字体大小
        const keyFontSize = Math.max(9, Math.floor(cardWidth * 0.16));
        const countFontSize = Math.max(9, Math.floor(cardWidth * 0.13));

        // 绘制色号 - 居中显示
        ctx.fillStyle = '#333333';
        ctx.font = `bold ${keyFontSize}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(displayKey, cardX + cardWidth / 2, textBgY + textBgHeight * 0.35);

        // 绘制数量 - 居中显示，不带单位
        ctx.fillStyle = '#666666';
        ctx.font = `${countFontSize}px system-ui, -apple-system, sans-serif`;
        ctx.fillText(`× ${cellData.count}`, cardX + cardWidth / 2, textBgY + textBgHeight * 0.72);
      });

      // 计算实际需要的行数
      const numRows = Math.ceil(colorKeys.length / renderNumColumns);

      // 绘制总量
      const totalY = statsY + titleHeight + (numRows * (cardHeight + cardGap)) + 15;
      ctx.font = `bold ${Math.max(12, statsFontSize)}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = '#333333';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`总计: ${totalBeadCount}`, downloadWidth - statsPadding, totalY);


      // 更新统计区域高度
      const footerHeight = 30;
      statsHeight = titleHeight + (numRows * (cardHeight + cardGap)) + footerHeight + (statsPadding * 2) + statsTopMargin;
    }

    // 重新计算画布高度并调整
    if (includeStats && colorCounts) {
      // 调整画布大小，包含计算后的统计区域
      const newDownloadHeight = titleBarHeight + extraTopMargin + M * downloadCellSize + (axisLabelSize * 2) + statsHeight + extraBottomMargin;
      
      if (downloadHeight !== newDownloadHeight) {
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
      const defaultFileName = showCellNumbers
        ? `bead-grid-${N}x${M}-keys-palette_${selectedColorSystem}.png`
        : `bead-grid-${N}x${M}-pixel-palette_${selectedColorSystem}.png`;
      
      // 如果在 Electron 环境下，使用原生保存对话框
      if (isElectron()) {
        const result = await saveFileWithElectron(dataURL, defaultFileName);
        if (result.success) {
          console.log("图片保存成功:", result.path);
        } else {
          console.error("图片保存失败:", result.error);
          alert("保存图片失败");
        }
      } else {
        // Web 环境：使用传统下载方式
        const link = document.createElement('a');
        link.download = defaultFileName;
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log("Grid image download initiated.");
      }
      
      // 如果启用了CSV导出，同时导出CSV文件
      if (options.exportCsv) {
        await exportCsvData({
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

  // 直接执行下载
  void processDownload();
} 
