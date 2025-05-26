import { GridDownloadOptions } from '../types/downloadTypes';
import { MappedPixel, PaletteColor } from './pixelation';
import { getDisplayColorKey, getColorKeyByHex, ColorSystem } from './colorSystemUtils';

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
  
  // 加载二维码图片
  const qrCodeImage = new Image();
  qrCodeImage.src = '/website_qrcode.png'; // 使用public目录中的图片
  
  // 主要下载处理函数
  const processDownload = () => {
    const { N, M } = gridDimensions; // 此时已确保gridDimensions不为null
    const downloadCellSize = 30;
  
    // 从下载选项中获取设置
    const { showGrid, gridInterval, showCoordinates, gridLineColor, includeStats } = options;
  
    // 设置边距空间用于坐标轴标注（如果需要）
    const axisLabelSize = showCoordinates ? Math.max(30, Math.floor(downloadCellSize)) : 0;
    
    // 定义统计区域的基本参数
    const statsPadding = 20;
    let statsHeight = 0;
    
    // 预先计算用于字体大小的变量
    const preCalcWidth = N * downloadCellSize + axisLabelSize;
    const preCalcAvailableWidth = preCalcWidth - (statsPadding * 2);
    
    // 计算字体大小 - 与颜色统计区域保持一致
    const baseStatsFontSize = 13;
    const widthFactor = Math.max(0, preCalcAvailableWidth - 350) / 600;
    const statsFontSize = Math.floor(baseStatsFontSize + (widthFactor * 10));
    
    // 计算额外边距，确保坐标数字完全显示
    const extraLeftMargin = showCoordinates ? Math.max(20, statsFontSize * 2) : 0; // 左侧额外边距
    const extraTopMargin = showCoordinates ? Math.max(15, statsFontSize) : 0; // 顶部额外边距
    
    // 计算网格尺寸
    const gridWidth = N * downloadCellSize;
    const gridHeight = M * downloadCellSize;
    
    // 计算小红书标识区域的高度
    const xiaohongshuAreaHeight = 35; // 为小红书名字预留的底部空间
  
    // 计算标题栏高度（根据图片大小自动调整）
    const baseTitleBarHeight = 80; // 增大基础高度
    
    // 先计算一个初始下载宽度来确定缩放比例
    const initialWidth = gridWidth + axisLabelSize + extraLeftMargin;
    // 使用总宽度而不是单元格大小来计算比例，确保字体在大尺寸图片上也足够大
    const titleBarScale = Math.max(1.0, Math.min(2.0, initialWidth / 1000)); // 更激进的缩放策略
    const titleBarHeight = Math.floor(baseTitleBarHeight * titleBarScale);
    
    // 计算标题文字大小 - 与总体宽度相关而不是单元格大小
    const titleFontSize = Math.max(28, Math.floor(28 * titleBarScale)); // 最小28px，确保可读性
    
    // 计算二维码大小
    const qrSize = Math.floor(titleBarHeight * 0.85); // 增大二维码比例
    
    // 计算统计区域的大小
    if (includeStats && colorCounts) {
      const colorKeys = Object.keys(colorCounts);
      
      // 统计区域顶部额外间距
      const statsTopMargin = 24; // 与下方渲染时保持一致
      
      // 根据可用宽度动态计算列数
      const numColumns = Math.max(1, Math.min(4, Math.floor(preCalcAvailableWidth / 250)));
      
      // 根据可用宽度动态计算样式参数，使用更积极的线性缩放
      const baseSwatchSize = 18; // 略微增大基础大小
      // baseStatsFontSize 和 statsFontSize 在前面已经计算了，这里不需要重复
      // const baseItemPadding = 10;
      
      // 调整缩放公式，使大宽度更明显增大
      // widthFactor 在前面已经计算了，这里不需要重复
      const swatchSize = Math.floor(baseSwatchSize + (widthFactor * 20)); // 增大最大增量幅度
      // statsFontSize 在前面已经计算了，这里不需要重复
      // const itemPadding = Math.floor(baseItemPadding + (widthFactor * 12)); // 增大最大增量幅度 // 移除未使用的 itemPadding
      
      // 计算实际需要的行数
      const numRows = Math.ceil(colorKeys.length / numColumns);
      
      // 计算单行高度 - 根据色块大小和内边距动态调整
      const statsRowHeight = Math.max(swatchSize + 8, 25);
      
      // 标题和页脚高度
      const titleHeight = 40; // 标题和分隔线的总高度
      const footerHeight = 40; // 总计部分的高度
      
      // 计算统计区域的总高度 - 需要包含顶部间距
      statsHeight = titleHeight + (numRows * statsRowHeight) + footerHeight + (statsPadding * 2) + statsTopMargin;
    }
  
    // 调整画布大小，包含标题栏、坐标轴、统计区域和小红书标识区域
    const downloadWidth = gridWidth + axisLabelSize + extraLeftMargin;
    let downloadHeight = titleBarHeight + gridHeight + axisLabelSize + statsHeight + extraTopMargin + xiaohongshuAreaHeight;
  
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
    
    ctx.fillText('七卡瓦', titleStartX, mainTitleY);
    
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
    
    // 8. 二维码区域 - 重新设计
    const qrX = downloadWidth - qrSize - titleBarHeight * 0.15;
    const qrY = (titleBarHeight - qrSize) / 2;
    
    // 二维码背景 - 圆角，更现代
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(qrX, qrY, qrSize, qrSize, qrSize * 0.08);
    ctx.fill();
    
    // 绘制二维码图片或占位符
    if (qrCodeImage.complete && qrCodeImage.naturalWidth !== 0) {
      // 使用裁剪区域绘制圆角二维码
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(qrX, qrY, qrSize, qrSize, qrSize * 0.08);
      ctx.clip();
      ctx.drawImage(qrCodeImage, qrX, qrY, qrSize, qrSize);
      ctx.restore();
    } else {
      // 占位符设计
      ctx.fillStyle = '#6366F1';
      const qrPlaceholderFontSize = Math.max(10, Math.floor(14 * titleBarScale));
      ctx.font = `500 ${qrPlaceholderFontSize}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('扫码访问', qrX + qrSize / 2, qrY + qrSize / 2);
    }
  
    console.log(`Generating download grid image: ${downloadWidth}x${downloadHeight}`);
    const fontSize = Math.max(8, Math.floor(downloadCellSize * 0.4));
    
    // 如果需要，先绘制坐标轴和网格背景
    if (showCoordinates) {
      // 绘制坐标轴背景
      ctx.fillStyle = '#F5F5F5'; // 浅灰色背景
      // 横轴背景 (顶部)
      ctx.fillRect(extraLeftMargin + axisLabelSize, titleBarHeight + extraTopMargin, gridWidth, axisLabelSize);
      // 纵轴背景 (左侧)
      ctx.fillRect(extraLeftMargin, titleBarHeight + extraTopMargin + axisLabelSize, axisLabelSize, gridHeight);
      
      // 绘制坐标轴数字
      ctx.fillStyle = '#333333'; // 坐标数字颜色
      // 使用与颜色统计区域相同的字体大小，但不使用粗体
      const axisFontSize = statsFontSize;
      ctx.font = `${axisFontSize}px sans-serif`;

      // X轴（顶部）数字
      ctx.textAlign = 'center';
      for (let i = 0; i < N; i++) {
        if ((i + 1) % gridInterval === 0 || i === 0 || i === N - 1) { // 在间隔处、起始处和结束处标注
          // 将数字放在轴线之上，考虑额外边距
          const numX = extraLeftMargin + axisLabelSize + (i * downloadCellSize) + (downloadCellSize / 2);
          const numY = titleBarHeight + extraTopMargin + (axisLabelSize / 2);
          ctx.fillText((i + 1).toString(), numX, numY);
        }
      }
      
      // Y轴（左侧）数字
      ctx.textAlign = 'right';
      for (let j = 0; j < M; j++) {
        if ((j + 1) % gridInterval === 0 || j === 0 || j === M - 1) { // 在间隔处、起始处和结束处标注
          // 将数字放在轴线之左，留出间距并考虑额外边距
          const numX = extraLeftMargin + axisLabelSize - 8;
          const numY = titleBarHeight + extraTopMargin + axisLabelSize + (j * downloadCellSize) + (downloadCellSize / 2);
          ctx.fillText((j + 1).toString(), numX, numY);
        }
      }
      
      // 绘制坐标轴边框
      ctx.strokeStyle = '#AAAAAA';
      ctx.lineWidth = 1;
      // 横轴底边
      ctx.beginPath();
      ctx.moveTo(extraLeftMargin + axisLabelSize, titleBarHeight + extraTopMargin + axisLabelSize);
      ctx.lineTo(extraLeftMargin + axisLabelSize + gridWidth, titleBarHeight + extraTopMargin + axisLabelSize);
      ctx.stroke();
      // 纵轴右侧边
      ctx.beginPath();
      ctx.moveTo(extraLeftMargin + axisLabelSize, titleBarHeight + extraTopMargin + axisLabelSize);
      ctx.lineTo(extraLeftMargin + axisLabelSize, titleBarHeight + extraTopMargin + axisLabelSize + gridHeight);
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
          const cellKey = getDisplayColorKey(cellData.color || '#FFFFFF', selectedColorSystem);

          ctx.fillStyle = cellColor;
          ctx.fillRect(drawX, drawY, downloadCellSize, downloadCellSize);

          ctx.fillStyle = getContrastColor(cellColor);
          ctx.fillText(cellKey, drawX + downloadCellSize / 2, drawY + downloadCellSize / 2);
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

    // 添加水印 - 小红书标识，防止被截图去除
    // 主水印：放在网格右下角，带背景设计，清晰明显
    const watermarkFontSize = Math.max(12, Math.floor(downloadCellSize * 0.7));
    
    // 计算主水印位置和尺寸
    const mainWatermarkText = '小红书@七卡瓦';
    ctx.font = `600 ${watermarkFontSize}px system-ui, -apple-system, sans-serif`;
    const textMetrics = ctx.measureText(mainWatermarkText);
    const textWidth = textMetrics.width;
    const textHeight = watermarkFontSize;
    
    const mainWatermarkX = extraLeftMargin + axisLabelSize + N * downloadCellSize - textWidth - 15;
    const mainWatermarkY = titleBarHeight + extraTopMargin + axisLabelSize + M * downloadCellSize - 15;
    
    // 绘制水印背景 - 半透明白色背景，增强可读性
    const bgPadding = 6;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.roundRect(
      mainWatermarkX - bgPadding, 
      mainWatermarkY - textHeight - bgPadding, 
      textWidth + bgPadding * 2, 
      textHeight + bgPadding * 2, 
      4
    );
    ctx.fill();
    
    // 绘制水印边框 - 细边框增加设计感
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // 绘制水印文字 - 深色，清晰可见
    ctx.fillStyle = '#374151'; // 深灰色，清晰但不刺眼
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(mainWatermarkText, mainWatermarkX, mainWatermarkY);
    
    // 副水印：放在网格左上角，简洁版本
    const secondaryWatermarkFontSize = Math.max(10, Math.floor(downloadCellSize * 0.5));
    const secondaryText = '@七卡瓦';
    
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
      const statsTopMargin = 24; // 增加间距，防止文字侵入画布
      const statsY = titleBarHeight + extraTopMargin + M * downloadCellSize + axisLabelSize + statsPadding + statsTopMargin;
      
      // 计算统计区域的可用宽度
      const availableStatsWidth = downloadWidth - (statsPadding * 2);
      
      // 根据可用宽度动态计算列数 - 这里使用实际渲染时的宽度
      const renderNumColumns = Math.max(1, Math.min(4, Math.floor(availableStatsWidth / 250)));
      
      // 根据可用宽度动态计算样式参数，使用更积极的线性缩放
      const baseSwatchSize = 18; // 略微增大基础大小
      // baseStatsFontSize 和 statsFontSize 在前面已经计算了，这里不需要重复
      // const baseItemPadding = 10;
      
      // 调整缩放公式，使大宽度更明显增大
      // widthFactor 在前面已经计算了，这里不需要重复
      const swatchSize = Math.floor(baseSwatchSize + (widthFactor * 20)); // 增大最大增量幅度
      // statsFontSize 在前面已经计算了，这里不需要重复
      // const itemPadding = Math.floor(baseItemPadding + (widthFactor * 12)); // 增大最大增量幅度 // 移除未使用的 itemPadding
      
      // 计算每个项目所占的宽度
      const itemWidth = Math.floor(availableStatsWidth / renderNumColumns);
      
      // 绘制统计区域标题
      ctx.fillStyle = '#333333';
      ctx.font = `bold ${Math.max(16, statsFontSize)}px sans-serif`;
      ctx.textAlign = 'left';
      
      // 绘制分隔线
      ctx.strokeStyle = '#DDDDDD';
      ctx.beginPath();
      ctx.moveTo(statsPadding, statsY + 20);
      ctx.lineTo(downloadWidth - statsPadding, statsY + 20);
      ctx.stroke();
      
      const titleHeight = 30; // 标题和分隔线的总高度
      // 根据色块大小动态调整行高
      const statsRowHeight = Math.max(swatchSize + 8, 25); // 确保行高足够放下色块和文字
      
      // 设置表格字体
      ctx.font = `${statsFontSize}px sans-serif`;
      
      // 绘制每行统计信息
      colorKeys.forEach((key, index) => {
        // 计算当前项目应该在哪一行和哪一列
        const rowIndex = Math.floor(index / renderNumColumns);
        const colIndex = index % renderNumColumns;
        
        // 计算当前项目的X起始位置
        const itemX = statsPadding + (colIndex * itemWidth);
        
        // 计算当前行的Y位置
        const rowY = statsY + titleHeight + (rowIndex * statsRowHeight) + (swatchSize / 2);
        
        const cellData = colorCounts[key];
        
        // 绘制色块
        ctx.fillStyle = cellData.color;
        ctx.strokeStyle = '#CCCCCC';
        ctx.fillRect(itemX, rowY - (swatchSize / 2), swatchSize, swatchSize);
        ctx.strokeRect(itemX + 0.5, rowY - (swatchSize / 2) + 0.5, swatchSize - 1, swatchSize - 1);
        
        // 绘制色号
        ctx.fillStyle = '#333333';
        ctx.textAlign = 'left';
        ctx.fillText(getColorKeyByHex(key, selectedColorSystem), itemX + swatchSize + 5, rowY);
        
        // 绘制数量 - 在每个项目的右侧
        const countText = `${cellData.count} 颗`;
        ctx.textAlign = 'right';
        
        // 根据列数计算数字的位置
        // 如果只有一列，就靠右绘制
        if (renderNumColumns === 1) {
          ctx.fillText(countText, downloadWidth - statsPadding, rowY);
        } else {
          // 多列时，在每个单元格右侧偏内绘制
          ctx.fillText(countText, itemX + itemWidth - 10, rowY);
        }
      });
      
      // 计算实际需要的行数
      const numRows = Math.ceil(colorKeys.length / renderNumColumns);
      
      // 绘制总量
      const totalY = statsY + titleHeight + (numRows * statsRowHeight) + 10;
      ctx.font = `bold ${statsFontSize}px sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillText(`总计: ${totalBeadCount} 颗`, downloadWidth - statsPadding, totalY);
      
      // 统计区域水印 - 第三重保护，清晰明显
      const statsWatermarkFontSize = Math.max(10, Math.floor(statsFontSize * 0.7));
      const statsWatermarkText = '图纸来源：小红书@七卡瓦';
      
      ctx.font = `500 ${statsWatermarkFontSize}px system-ui, -apple-system, sans-serif`;
      const statsTextMetrics = ctx.measureText(statsWatermarkText);
      const statsTextWidth = statsTextMetrics.width;
      const statsTextHeight = statsWatermarkFontSize;
      
      const statsWatermarkX = statsPadding;
      const statsWatermarkY = totalY + 20;
      
      // 统计区域水印背景
      const statsBgPadding = 5;
      ctx.fillStyle = 'rgba(248, 250, 252, 0.9)'; // 浅灰背景，更柔和
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
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // 统计区域水印文字
      ctx.fillStyle = '#64748B'; // 清晰的深灰色
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(statsWatermarkText, statsWatermarkX, statsWatermarkY);
      
      // 更新统计区域高度的计算 - 需要包含新增的顶部间距
      const footerHeight = 30; // 总计部分高度
      statsHeight = titleHeight + (numRows * statsRowHeight) + footerHeight + (statsPadding * 2) + statsTopMargin;
    }

    // 重新计算画布高度并调整
    if (includeStats && colorCounts) {
      // 调整画布大小，包含计算后的统计区域和小红书标识区域
      const newDownloadHeight = titleBarHeight + extraTopMargin + M * downloadCellSize + axisLabelSize + statsHeight + xiaohongshuAreaHeight;
      
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
      const link = document.createElement('a');
      link.download = `bead-grid-${N}x${M}-keys-palette_${selectedColorSystem}.png`; // 文件名包含色彩系统
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      console.log("Grid image download initiated.");
    } catch (e) {
      console.error("下载图纸失败:", e);
      alert("无法生成图纸下载链接。");
    }
  };
  
  // 图片加载后处理，或在加载失败时使用占位符
  if (qrCodeImage.complete) {
    processDownload();
  } else {
    qrCodeImage.onload = processDownload;
    qrCodeImage.onerror = () => {
      console.warn("二维码图片加载失败，将使用占位符");
      processDownload();
    };
  }
} 