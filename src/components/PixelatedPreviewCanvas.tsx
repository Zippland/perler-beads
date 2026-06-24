"use client";

import React, {
  useRef,
  useEffect,
  TouchEvent,
  MouseEvent,
  PointerEvent,
  useState,
} from "react";
import { MappedPixel } from "../utils/pixelation";
import { BoardPlan } from "../domain/boards/boardPlan";

interface PixelatedPreviewCanvasProps {
  mappedPixelData: MappedPixel[][] | null;
  gridDimensions: { N: number; M: number } | null;
  isManualColoringMode: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  canvasWidth?: number;
  canvasHeight?: number;
  zoom?: number;
  onInteraction: (
    clientX: number,
    clientY: number,
    pageX: number,
    pageY: number,
    isClick: boolean,
    isTouchEnd?: boolean,
  ) => void;
  highlightColorKey?: string | null;
  onHighlightComplete?: () => void;
  boardPlan?: BoardPlan | null;
  selectedBoardId?: string | null;
  editorTool?: "paint" | "erase" | "select";
  selection?: Set<string>;
  draftSelection?: Set<string>;
  onSelectionPreview?: (selection: Set<string>) => void;
  onSelectionCommit?: (selection: Set<string>, append: boolean) => void;
  onSelectionClear?: () => void;
}

// 绘制像素化画布的函数
const drawPixelatedCanvas = (
  dataToDraw: MappedPixel[][],
  canvas: HTMLCanvasElement | null,
  dims: { N: number; M: number } | null,
  highlightColorKey?: string | null,
  isHighlighting?: boolean,
  boardPlan?: BoardPlan | null,
  selectedBoardId?: string | null,
  selection?: Set<string>,
  draftSelection?: Set<string>,
) => {
  if (!canvas || !dims || !dataToDraw) {
    console.warn("drawPixelatedCanvas: Missing required parameters");
    return;
  }

  const pixelatedCtx = canvas.getContext("2d");
  if (!pixelatedCtx) {
    console.error("Failed to get 2D context for pixelated canvas");
    return;
  }

  // Respect current dark mode preference
  const isDarkMode =
    typeof window !== "undefined" &&
    document.documentElement.classList.contains("dark");

  // Define colors based on mode
  const externalBackgroundColor = isDarkMode ? "#374151" : "#F3F4F6"; // gray-700 : gray-100
  const gridLineColor = isDarkMode ? "#4B5563" : "#DDDDDD"; // gray-600 : lighter gray
  const groupLineColor = isDarkMode ? "#9CA3AF" : "#8EA19D";
  const boardLineColor = isDarkMode ? "#FBBF24" : "#B45309";

  const { N, M } = dims;
  const outputWidth = canvas.width;
  const outputHeight = canvas.height;
  const cellWidthOutput = outputWidth / N;
  const cellHeightOutput = outputHeight / M;

  pixelatedCtx.clearRect(0, 0, outputWidth, outputHeight);
  pixelatedCtx.lineWidth = 0.5; // Keep line width thin

  for (let j = 0; j < M; j++) {
    for (let i = 0; i < N; i++) {
      const cellData = dataToDraw[j]?.[i];
      if (!cellData) continue;

      const drawX = i * cellWidthOutput;
      const drawY = j * cellHeightOutput;

      // Fill cell color using mode-specific background for external cells
      if (cellData.isExternal) {
        pixelatedCtx.fillStyle = externalBackgroundColor;
      } else {
        pixelatedCtx.fillStyle = cellData.color;
      }
      pixelatedCtx.fillRect(drawX, drawY, cellWidthOutput, cellHeightOutput);

      // 如果正在高亮且当前单元格不是目标颜色，添加半透明黑色蒙版
      if (isHighlighting && highlightColorKey) {
        let shouldDim = false;

        if (cellData.isExternal) {
          // 外部单元格总是变深色（因为它们不是要高亮的颜色）
          shouldDim = true;
        } else {
          // 内部单元格：如果颜色不匹配则变深色
          shouldDim =
            cellData.color.toUpperCase() !== highlightColorKey.toUpperCase();
        }

        if (shouldDim) {
          pixelatedCtx.fillStyle = "rgba(0, 0, 0, 0.6)"; // 60% 透明度的黑色蒙版
          pixelatedCtx.fillRect(
            drawX,
            drawY,
            cellWidthOutput,
            cellHeightOutput,
          );
        }
      }

      // Draw grid lines using mode-specific color
      pixelatedCtx.strokeStyle = gridLineColor;
      pixelatedCtx.strokeRect(
        drawX + 0.5,
        drawY + 0.5,
        cellWidthOutput,
        cellHeightOutput,
      );
    }
  }

  pixelatedCtx.save();
  pixelatedCtx.strokeStyle = groupLineColor;
  pixelatedCtx.lineWidth = Math.max(
    1,
    Math.min(cellWidthOutput, cellHeightOutput) * 0.08,
  );
  for (let i = 10; i < N; i += 10) {
    const x = i * cellWidthOutput;
    pixelatedCtx.beginPath();
    pixelatedCtx.moveTo(x, 0);
    pixelatedCtx.lineTo(x, outputHeight);
    pixelatedCtx.stroke();
  }
  for (let j = 10; j < M; j += 10) {
    const y = j * cellHeightOutput;
    pixelatedCtx.beginPath();
    pixelatedCtx.moveTo(0, y);
    pixelatedCtx.lineTo(outputWidth, y);
    pixelatedCtx.stroke();
  }
  pixelatedCtx.restore();

  if (boardPlan) {
    pixelatedCtx.save();
    pixelatedCtx.lineWidth = Math.max(
      2,
      Math.min(cellWidthOutput, cellHeightOutput) * 0.14,
    );
    pixelatedCtx.font = `${Math.max(12, Math.min(18, cellWidthOutput * 2.4))}px sans-serif`;
    pixelatedCtx.textBaseline = "top";

    for (const board of boardPlan.boards) {
      const x = board.gridStartColumn * cellWidthOutput;
      const y = board.gridStartRow * cellHeightOutput;
      const width = board.usedWidth * cellWidthOutput;
      const height = board.usedHeight * cellHeightOutput;
      const isSelected = selectedBoardId === board.id;

      if (isSelected) {
        pixelatedCtx.fillStyle = "rgba(251, 191, 36, 0.14)";
        pixelatedCtx.fillRect(x, y, width, height);
      }

      pixelatedCtx.strokeStyle = boardLineColor;
      pixelatedCtx.strokeRect(
        x + 1,
        y + 1,
        Math.max(0, width - 2),
        Math.max(0, height - 2),
      );
      pixelatedCtx.fillStyle = boardLineColor;
      pixelatedCtx.fillText(board.id, x + 5, y + 5);
    }
    pixelatedCtx.restore();
  }

  const drawSelection = (keys: Set<string>, fill: string, stroke: string) => {
    if (keys.size === 0) return;
    pixelatedCtx.save();
    pixelatedCtx.fillStyle = fill;
    pixelatedCtx.strokeStyle = stroke;
    pixelatedCtx.lineWidth = Math.max(1, Math.min(cellWidthOutput, cellHeightOutput) * 0.1);
    for (const key of keys) {
      const [row, column] = key.split(":").map(Number);
      if (!Number.isInteger(row) || !Number.isInteger(column)) continue;
      pixelatedCtx.fillRect(
        column * cellWidthOutput,
        row * cellHeightOutput,
        cellWidthOutput,
        cellHeightOutput,
      );
      pixelatedCtx.strokeRect(
        column * cellWidthOutput + 0.5,
        row * cellHeightOutput + 0.5,
        cellWidthOutput,
        cellHeightOutput,
      );
    }
    pixelatedCtx.restore();
  };

  drawSelection(selection ?? new Set(), "rgba(31, 157, 138, 0.18)", "rgba(31, 157, 138, 0.85)");
  drawSelection(draftSelection ?? new Set(), "rgba(251, 191, 36, 0.2)", "rgba(180, 83, 9, 0.9)");
};

const PixelatedPreviewCanvas: React.FC<PixelatedPreviewCanvasProps> = ({
  mappedPixelData,
  gridDimensions,
  isManualColoringMode,
  canvasRef,
  canvasWidth,
  canvasHeight,
  zoom,
  onInteraction,
  highlightColorKey,
  onHighlightComplete,
  boardPlan,
  selectedBoardId,
  editorTool,
  selection,
  draftSelection,
  onSelectionPreview,
  onSelectionCommit,
  onSelectionClear,
}) => {
  const [darkModeState, setDarkModeState] = useState<boolean | null>(null);
  const touchStartPosRef = useRef<{
    x: number;
    y: number;
    pageX: number;
    pageY: number;
  } | null>(null);
  const touchMovedRef = useRef<boolean>(false);
  const [isHighlighting, setIsHighlighting] = useState(false);
  const selectionStartRef = useRef<{ row: number; column: number; append: boolean } | null>(null);

  // Effect to detect dark mode changes and update state
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains("dark");
      // Only update state if it actually changes
      if (isDark !== darkModeState) {
        setDarkModeState(isDark);
      }
    };

    // Initial check
    checkDarkMode();

    // Use MutationObserver to watch for class changes on <html>
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Cleanup observer on component unmount
    return () => observer.disconnect();
  }, [darkModeState]); // Depend on darkModeState to re-run if needed externally

  // Effect to set canvas pixel dimensions from props (ensures square cells)
  useEffect(() => {
    if (canvasRef.current && canvasWidth && canvasHeight) {
      canvasRef.current.width = canvasWidth;
      canvasRef.current.height = canvasHeight;
    }
  }, [canvasRef, canvasWidth, canvasHeight]);

  // Update useEffect for drawing to depend on darkModeState as well
  useEffect(() => {
    // Ensure darkModeState is not null before drawing
    if (
      mappedPixelData &&
      gridDimensions &&
      canvasRef.current &&
      darkModeState !== null
    ) {
      console.log(`Redrawing canvas, dark mode: ${darkModeState}`); // Log redraw trigger
      drawPixelatedCanvas(
        mappedPixelData,
        canvasRef.current,
        gridDimensions,
        highlightColorKey,
        isHighlighting,
        boardPlan,
        selectedBoardId,
        selection,
        draftSelection,
      );
    }
  }, [
    mappedPixelData,
    gridDimensions,
    canvasRef,
    darkModeState,
    highlightColorKey,
    isHighlighting,
    boardPlan,
    selectedBoardId,
    selection,
    draftSelection,
  ]); // Add darkModeState dependency

  const getCellFromPointer = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !gridDimensions) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const canvasX = (event.clientX - rect.left) * scaleX;
    const canvasY = (event.clientY - rect.top) * scaleY;
    const column = Math.floor(canvasX / (canvasRef.current.width / gridDimensions.N));
    const row = Math.floor(canvasY / (canvasRef.current.height / gridDimensions.M));

    if (row < 0 || row >= gridDimensions.M || column < 0 || column >= gridDimensions.N) return null;
    return { row, column };
  };

  const buildRectangle = (start: { row: number; column: number }, end: { row: number; column: number }) => {
    const next = new Set<string>();
    for (let row = Math.min(start.row, end.row); row <= Math.max(start.row, end.row); row++) {
      for (let column = Math.min(start.column, end.column); column <= Math.max(start.column, end.column); column++) {
        next.add(`${row}:${column}`);
      }
    }
    return next;
  };

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (editorTool !== "select") return;
    const cell = getCellFromPointer(event);
    if (!cell) {
      onSelectionClear?.();
      return;
    }
    selectionStartRef.current = { ...cell, append: event.shiftKey };
    onSelectionPreview?.(buildRectangle(cell, cell));
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (editorTool !== "select" || !selectionStartRef.current) return;
    const cell = getCellFromPointer(event);
    if (!cell) return;
    onSelectionPreview?.(buildRectangle(selectionStartRef.current, cell));
    event.preventDefault();
  };

  const handlePointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    if (editorTool !== "select" || !selectionStartRef.current) return;
    const cell = getCellFromPointer(event);
    const start = selectionStartRef.current;
    selectionStartRef.current = null;
    if (cell) onSelectionCommit?.(buildRectangle(start, cell), start.append);
    onSelectionPreview?.(new Set());
    event.currentTarget.releasePointerCapture(event.pointerId);
    event.preventDefault();
  };

  // 处理高亮效果
  useEffect(() => {
    if (highlightColorKey && mappedPixelData && gridDimensions) {
      setIsHighlighting(true);
      // 0.3秒后结束高亮
      const timer = setTimeout(() => {
        setIsHighlighting(false);
        onHighlightComplete?.();
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [highlightColorKey, mappedPixelData, gridDimensions, onHighlightComplete]);

  // --- 鼠标事件处理 ---

  // 鼠标移动时显示提示
  const handleMouseMove = (event: MouseEvent<HTMLCanvasElement>) => {
    // 只有在非手动模式下才通过mousemove显示tooltip，避免干扰手动上色
    if (!isManualColoringMode) {
      onInteraction(
        event.clientX,
        event.clientY,
        event.pageX,
        event.pageY,
        false,
      );
    }
  };

  // 鼠标离开时隐藏提示
  const handleMouseLeave = () => {
    // 鼠标离开时总是隐藏tooltip
    onInteraction(0, 0, 0, 0, false, true);
  };

  // 鼠标点击处理（用于手动上色模式）
  const handleClick = (event: MouseEvent<HTMLCanvasElement>) => {
    if (editorTool === "select") return;
    // 鼠标点击行为保持不变：
    // 手动模式下：上色
    // 非手动模式下：切换tooltip
    onInteraction(
      event.clientX,
      event.clientY,
      event.pageX,
      event.pageY,
      isManualColoringMode,
    );
  };

  // --- 触摸事件处理 ---
  // 用于检测触摸移动的参考
  const handleTouchStart = (event: TouchEvent<HTMLCanvasElement>) => {
    const touch = event.touches[0];
    if (!touch) return;

    // 记录起始位置并重置移动标志
    touchStartPosRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      pageX: touch.pageX,
      pageY: touch.pageY,
    };
    touchMovedRef.current = false;

    // 在非手动模式下，触摸开始时仍然可以立即显示/切换tooltip，提供即时反馈
    if (!isManualColoringMode) {
      onInteraction(
        touch.clientX,
        touch.clientY,
        touch.pageX,
        touch.pageY,
        false,
      );
    }
    // 注意：此处不再触发手动上色 (isClick: true)
  };

  // 触摸移动时检测是否需要隐藏提示
  const handleTouchMove = (event: TouchEvent<HTMLCanvasElement>) => {
    const touch = event.touches[0];
    if (!touch || !touchStartPosRef.current) return;

    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);

    // 如果移动超过阈值，则标记为已移动，并隐藏tooltip
    // 增加一个稍大的阈值，以更好地区分点击和微小的手指抖动/滑动意图
    if (!touchMovedRef.current && (dx > 10 || dy > 10)) {
      touchMovedRef.current = true;
      // 一旦确定是移动，就隐藏tooltip
      onInteraction(0, 0, 0, 0, false, true);
    }
  };

  // 触摸结束时不再自动隐藏提示框
  const handleTouchEnd = () => {
    // 检查是否是手动模式，并且触摸没有移动（判定为点击）
    if (
      isManualColoringMode &&
      !touchMovedRef.current &&
      touchStartPosRef.current
    ) {
      // 使用触摸开始时的坐标来执行上色操作
      const { x, y, pageX, pageY } = touchStartPosRef.current;
      onInteraction(x, y, pageX, pageY, true); // isClick: true 表示执行上色
    }
    // 如果是非手动模式下的点击 (isManualColoringMode=false, touchMovedRef=false)
    // Tooltip 的显示/隐藏切换已在 touchstart 处理，touchend 时无需额外操作

    // 重置触摸状态
    touchStartPosRef.current = null;
    touchMovedRef.current = false;
  };

  const z = zoom && zoom > 0 ? zoom : 1;
  const cssWidth = canvasWidth ? canvasWidth * z : undefined;
  const cssHeight = canvasHeight ? canvasHeight * z : undefined;

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={`border border-gray-300 dark:border-gray-600 rounded block ${
        isManualColoringMode ? "cursor-pointer" : "cursor-grab"
      }`}
      style={{
        width: cssWidth ? `${cssWidth}px` : undefined,
        height: cssHeight ? `${cssHeight}px` : undefined,
        imageRendering: "pixelated",
      }}
    />
  );
};

export default PixelatedPreviewCanvas;
