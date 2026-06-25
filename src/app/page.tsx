"use client";

import React, {
  useState,
  useRef,
  ChangeEvent,
  DragEvent,
  useEffect,
  useMemo,
  useCallback,
} from "react";

// 导入像素化工具和类型
import {
  PixelationMode,
  calculatePixelGrid,
  RgbColor,
  PaletteColor,
  MappedPixel,
  hexToRgb,
  colorDistance,
} from "../utils/pixelation";

import {
  createBoardSheetPngBlob,
  createPrintChartPngBlob,
  downloadImage,
  importCsvData,
  serializeCsvText,
} from "../utils/imageDownloader";
import {
  checkFileSize,
  checkImagePixels,
  checkGridSize,
  checkCsvSize,
} from "../utils/limits";

import {
  getColorKeyByHex,
  getMardToHexMapping,
  sortColorsByHue,
  ColorSystem,
} from "../utils/colorSystemUtils";

// Helper function for sorting color keys - 保留原有实现，因为未在utils中导出
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

// --- Define available palette key sets ---
// 从colorSystemMapping.json获取所有MARD色号
const mardToHexMapping = getMardToHexMapping();

// Pre-process the FULL palette data once - 使用colorSystemMapping而不是beadPaletteData
const fullBeadPalette: PaletteColor[] = Object.entries(mardToHexMapping)
  .map(([mardKey, hex]) => {
    const rgb = hexToRgb(hex);
    if (!rgb) {
      console.warn(
        `Invalid hex code "${hex}" for MARD key "${mardKey}". Skipping.`,
      );
      return null;
    }
    return { key: mardKey, hex, rgb };
  })
  .filter((color): color is PaletteColor => color !== null);

function downloadBlob(blob: Blob, filename: string): void {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ++ Add definition for background color keys ++

// 1. 导入新组件
import PixelatedPreviewCanvas from "../components/PixelatedPreviewCanvas";
import CustomPaletteEditor from "../components/CustomPaletteEditor";
import InventoryPresetSelector from "../components/InventoryPresetSelector";
import ExportDialog from "../features/workbench/ExportDialog";
import {
  loadPaletteSelections,
  savePaletteSelections,
  presetToSelections,
  PaletteSelections,
} from "../utils/localStorageUtils";
import {
  TRANSPARENT_KEY,
  transparentColorData,
} from "../utils/pixelEditingUtils";

import { createBoardPlan, BoardPreference } from "../domain/boards/boardPlan";
import { deriveChartStats } from "../domain/chart/chartStats";
import {
  CompileConfig,
  resolveRecompileIntent,
} from "../domain/chart/recompilePolicy";
import {
  MardInventoryPresetId,
  getMardInventoryPreset,
} from "../domain/palette/mardInventoryPresets";
import { buildAllowedMardPalette } from "../domain/palette/paletteAvailability";
import { validateExportConsistency } from "../domain/export/exportConsistency";
import {
  deleteSelection,
  replaceSelectionColor,
} from "../domain/edit/chartEdits";
import {
  MakerPackFile,
  buildMakerPackManifest,
  buildStoredZipBlob,
} from "../features/workbench/buildMakerPack";

export default function Home() {
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);
  const [granularity, setGranularity] = useState<number>(50);
  const [granularityInput, setGranularityInput] = useState<string>("50");
  const [similarityThreshold, setSimilarityThreshold] = useState<number>(30);
  const [similarityThresholdInput, setSimilarityThresholdInput] =
    useState<string>("30");
  // 添加像素化模式状态
  const [pixelationMode, setPixelationMode] = useState<PixelationMode>(
    PixelationMode.Dominant,
  ); // 默认为卡通模式

  const selectedColorSystem: ColorSystem = "MARD";
  const [inventoryPresetId, setInventoryPresetId] =
    useState<MardInventoryPresetId>("mard-full");
  const [boardPreference, setBoardPreference] =
    useState<BoardPreference>("auto");
  const [appliedCompileConfig, setAppliedCompileConfig] =
    useState<CompileConfig | null>(null);

  // 用于记录初始网格颜色（hex值）
  const [, setInitialGridColorKeys] = useState<Set<string>>(new Set());
  const [mappedPixelData, setMappedPixelData] = useState<
    MappedPixel[][] | null
  >(null);
  const [gridDimensions, setGridDimensions] = useState<{
    N: number;
    M: number;
  } | null>(null);
  const [pixelatedCanvasSize, setPixelatedCanvasSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [canvasZoom, setCanvasZoom] = useState<number>(1);
  const [colorCounts, setColorCounts] = useState<{
    [key: string]: { count: number; color: string };
  } | null>(null);
  const [totalBeadCount, setTotalBeadCount] = useState<number>(0);
  const [tooltipData, setTooltipData] = useState<{
    x: number;
    y: number;
    key: string;
    color: string;
  } | null>(null);
  const [remapTrigger, setRemapTrigger] = useState<number>(0);
  const [isManualColoringMode, setIsManualColoringMode] =
    useState<boolean>(false);
  const [editorTool, setEditorTool] = useState<"paint" | "erase" | "select">(
    "paint",
  );
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [draftSelection, setDraftSelection] = useState<Set<string>>(new Set());
  const [selectedColor, setSelectedColor] = useState<MappedPixel | null>(null);
  const [customPaletteSelections, setCustomPaletteSelections] =
    useState<PaletteSelections>({});
  const [isCustomPaletteEditorOpen, setIsCustomPaletteEditorOpen] =
    useState<boolean>(false);
  const [isCustomPalette, setIsCustomPalette] = useState<boolean>(false);

  // ++ 新增：下载设置相关状态 ++
  const [isDownloadSettingsOpen, setIsDownloadSettingsOpen] =
    useState<boolean>(false);

  // 新增：高亮相关状态
  const [highlightColorKey, setHighlightColorKey] = useState<string | null>(
    null,
  );

  // 新增：完整色板切换状态
  const [showFullPalette, setShowFullPalette] = useState<boolean>(false);

  // 新增：组件挂载状态
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // 新增：编辑撤回历史栈（多步）
  interface EditSnapshot {
    mappedPixelData: MappedPixel[][];
    colorCounts: { [key: string]: { count: number; color: string } };
    totalBeadCount: number;
  }
  const [editHistory, setEditHistory] = useState<EditSnapshot[]>([]);
  const [editFuture, setEditFuture] = useState<EditSnapshot[]>([]);

  // 新增：轻量提示
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  }, []);

  const applyChartData = useCallback((nextData: MappedPixel[][]) => {
    const stats = deriveChartStats(nextData);
    setMappedPixelData(nextData);
    setColorCounts(stats.colorCounts);
    setTotalBeadCount(stats.totalBeadCount);
    setInitialGridColorKeys(new Set(Object.keys(stats.colorCounts)));
  }, []);

  // --- 撤回功能 ---

  const createEditSnapshot = useCallback((): EditSnapshot | null => {
    if (!mappedPixelData || !colorCounts) return null;
    return {
      mappedPixelData: mappedPixelData.map((row) =>
        row.map((cell) => ({ ...cell })),
      ),
      colorCounts: { ...colorCounts },
      totalBeadCount,
    };
  }, [mappedPixelData, colorCounts, totalBeadCount]);

  // 保存编辑快照到历史栈
  const saveEditSnapshot = useCallback(() => {
    const snapshot = createEditSnapshot();
    if (!snapshot) return;
    setEditHistory((prev) => [...prev.slice(-49), snapshot]);
    setEditFuture([]);
  }, [createEditSnapshot]);

  // 编辑模式多步撤回
  const handleUndoEdit = useCallback(() => {
    if (editHistory.length === 0) return;
    const currentSnapshot = createEditSnapshot();
    const snapshot = editHistory[editHistory.length - 1];
    setMappedPixelData(snapshot.mappedPixelData);
    setColorCounts(snapshot.colorCounts);
    setTotalBeadCount(snapshot.totalBeadCount);
    setEditHistory((prev) => prev.slice(0, -1));
    if (currentSnapshot) setEditFuture((prev) => [currentSnapshot, ...prev]);
    showToast("已撤回上一步");
  }, [createEditSnapshot, editHistory, showToast]);

  const handleRedoEdit = useCallback(() => {
    if (editFuture.length === 0) return;
    const currentSnapshot = createEditSnapshot();
    const snapshot = editFuture[0];
    setMappedPixelData(snapshot.mappedPixelData);
    setColorCounts(snapshot.colorCounts);
    setTotalBeadCount(snapshot.totalBeadCount);
    setEditFuture((prev) => prev.slice(1));
    if (currentSnapshot) {
      setEditHistory((prev) => [...prev.slice(-49), currentSnapshot]);
    }
    showToast("已重做");
  }, [createEditSnapshot, editFuture, showToast]);

  // 清空编辑历史（参数变化、退出编辑模式等时调用）
  const clearEditHistory = useCallback(() => {
    setEditHistory([]);
    setEditFuture([]);
  }, []);

  const clearSelection = useCallback(() => {
    setSelection(new Set());
    setDraftSelection(new Set());
  }, []);

  const handleDeleteSelection = useCallback(() => {
    if (!mappedPixelData || selection.size === 0) return;
    const result = deleteSelection({ data: mappedPixelData, selection });
    if (result.changedCount === 0) return;
    saveEditSnapshot();
    applyChartData(result.data);
    clearSelection();
    showToast(`已删除 ${result.changedCount} 格`);
  }, [
    applyChartData,
    clearSelection,
    mappedPixelData,
    saveEditSnapshot,
    selection,
    showToast,
  ]);

  const handleReplaceSelection = useCallback(() => {
    if (!mappedPixelData || !selectedColor || selection.size === 0) return;
    const result = replaceSelectionColor({
      data: mappedPixelData,
      selection,
      targetColor: selectedColor,
    });
    if (result.changedCount === 0) return;
    saveEditSnapshot();
    applyChartData(result.data);
    clearSelection();
    showToast(`已替换 ${result.changedCount} 格`);
  }, [
    applyChartData,
    clearSelection,
    mappedPixelData,
    saveEditSnapshot,
    selectedColor,
    selection,
    showToast,
  ]);

  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const pixelatedCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // ++ 添加: Ref for import file input ++
  const importPaletteInputRef = useRef<HTMLInputElement>(null);
  //const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  // ++ Re-add touch refs needed for tooltip logic ++
  //const touchStartPosRef = useRef<{ x: number; y: number; pageX: number; pageY: number } | null>(null);
  //const touchMovedRef = useRef<boolean>(false);

  // ++ Add a ref for the main element ++
  const mainRef = useRef<HTMLElement>(null);

  // --- Derived State ---

  // 同步派生 activePalette（单一数据源，消除竞态）
  const activePalette: PaletteColor[] = useMemo(() => {
    if (inventoryPresetId === "mard-custom") {
      const customPalette = fullBeadPalette.filter(
        (color) => customPaletteSelections[color.hex.toUpperCase()],
      );
      return buildAllowedMardPalette({
        fullPalette: customPalette,
        inventoryCodes: customPalette.map((color) => color.key),
      });
    }

    const preset = getMardInventoryPreset(inventoryPresetId);
    return buildAllowedMardPalette({
      fullPalette: fullBeadPalette,
      inventoryCodes: preset.mardCodes,
    });
  }, [customPaletteSelections, inventoryPresetId]);

  // ++ 添加：当状态变化时同步更新输入框的值 ++
  useEffect(() => {
    setGranularityInput(granularity.toString());
    setSimilarityThresholdInput(similarityThreshold.toString());
  }, [granularity, similarityThreshold]);

  // ++ Calculate unique colors currently on the grid for the palette ++
  const currentGridColors = useMemo(() => {
    if (!mappedPixelData) return [];
    // 使用hex值进行去重，避免多个MARD色号对应同一个目标色号系统值时产生重复key
    const uniqueColorsMap = new Map<string, MappedPixel>();
    mappedPixelData.flat().forEach((cell) => {
      if (cell && cell.color && !cell.isExternal) {
        const hexKey = cell.color.toUpperCase();
        if (!uniqueColorsMap.has(hexKey)) {
          // 存储hex值作为key，保持颜色信息
          uniqueColorsMap.set(hexKey, { key: cell.key, color: cell.color });
        }
      }
    });

    // 转换为数组并为每个hex值生成对应的色号系统显示
    const originalColors = Array.from(uniqueColorsMap.values());

    const colorData = originalColors.map((color) => {
      const displayKey = getColorKeyByHex(
        color.color.toUpperCase(),
        selectedColorSystem,
      );
      return {
        key: displayKey,
        color: color.color,
      };
    });

    // 使用色相排序而不是色号排序
    return sortColorsByHue(colorData);
  }, [mappedPixelData, selectedColorSystem]);

  const boardPlan = useMemo(() => {
    if (!gridDimensions) return null;
    return createBoardPlan({
      gridWidth: gridDimensions.N,
      gridHeight: gridDimensions.M,
      preference: boardPreference,
    });
  }, [boardPreference, gridDimensions]);

  const buildCompileConfig = useCallback(
    (overrides: Partial<CompileConfig> = {}): CompileConfig => ({
      gridWidth: granularity,
      similarityThreshold,
      pixelationMode,
      inventoryPresetId,
      cropRect: null,
      ...overrides,
    }),
    [
      granularity,
      inventoryPresetId,
      pixelationMode,
      similarityThreshold,
    ],
  );

  const hasLocalEdits = useMemo(
    () =>
      editHistory.length > 0 ||
      editFuture.length > 0,
    [editFuture.length, editHistory.length],
  );

  const confirmRecompileIfNeeded = useCallback(
    (draftConfig: CompileConfig): boolean => {
      if (!appliedCompileConfig || !hasLocalEdits) return true;

      const intent = resolveRecompileIntent({
        appliedConfig: appliedCompileConfig,
        draftConfig,
        hasLocalEdits,
        userConfirmed: false,
      });

      if (intent.status === "ready") return true;

      const changeLabels: Record<string, string> = {
        gridWidth: "图纸宽度",
        similarityThreshold: "相似度",
        pixelationMode: "像素化模式",
        inventoryPresetId: "可用色域",
        cropRect: "原图裁剪",
      };
      const changedText = intent.changes
        .map((change) => changeLabels[change] ?? change)
        .join("、");

      const confirmed = window.confirm(
        `重新生成会丢失当前局部编辑、撤回记录和重做记录。\n\n变更项：${changedText}\n\n是否继续重新生成？`,
      );
      if (!confirmed) {
        showToast("已取消重新生成，当前图纸未改变");
      }
      return confirmed;
    },
    [appliedCompileConfig, hasLocalEdits, showToast],
  );

  // 初始化时从本地存储加载自定义色板选择
  useEffect(() => {
    // 尝试从localStorage加载
    const savedSelections = loadPaletteSelections();
    if (savedSelections && Object.keys(savedSelections).length > 0) {
      console.log(
        "从localStorage加载的数据键数量:",
        Object.keys(savedSelections).length,
      );
      // 验证加载的数据是否都是有效的hex值
      const allHexValues = fullBeadPalette.map((color) =>
        color.hex.toUpperCase(),
      );
      const validSelections: PaletteSelections = {};
      let hasValidData = false;
      let validCount = 0;
      let invalidCount = 0;

      Object.entries(savedSelections).forEach(([key, value]) => {
        // 严格验证：键必须是有效的hex格式，并且存在于调色板中
        if (
          /^#[0-9A-F]{6}$/i.test(key) &&
          allHexValues.includes(key.toUpperCase())
        ) {
          validSelections[key.toUpperCase()] = value;
          hasValidData = true;
          validCount++;
        } else {
          invalidCount++;
        }
      });

      console.log(
        `验证结果: 有效键 ${validCount} 个, 无效键 ${invalidCount} 个`,
      );

      if (hasValidData) {
        setCustomPaletteSelections(validSelections);
        setIsCustomPalette(true);
      } else {
        console.log("所有数据都无效，清除localStorage并重新初始化");
        // 如果本地数据无效，清除localStorage并默认选择所有颜色
        localStorage.removeItem("customPerlerPaletteSelections");
        const allHexValues = fullBeadPalette.map((color) =>
          color.hex.toUpperCase(),
        );
        const initialSelections = presetToSelections(
          allHexValues,
          allHexValues,
        );
        setCustomPaletteSelections(initialSelections);
        setIsCustomPalette(false);
      }
    } else {
      console.log("没有localStorage数据，默认选择所有颜色");
      // 如果没有保存的选择，默认选择所有颜色
      const allHexValues = fullBeadPalette.map((color) =>
        color.hex.toUpperCase(),
      );
      const initialSelections = presetToSelections(allHexValues, allHexValues);
      setCustomPaletteSelections(initialSelections);
      setIsCustomPalette(false);
    }
  }, []); // 只在组件首次加载时执行

  // --- Event Handlers ---

  // 添加一个安全的文件输入触发函数
  const triggerFileInput = useCallback(() => {
    // 检查组件是否已挂载
    if (!isMounted) {
      console.warn("组件尚未完全挂载，延迟触发文件选择");
      setTimeout(() => triggerFileInput(), 200);
      return;
    }

    // 检查 ref 是否存在
    if (fileInputRef.current) {
      try {
        fileInputRef.current.click();
      } catch (error) {
        console.error("触发文件选择失败:", error);
        // 如果直接点击失败，尝试延迟执行
        setTimeout(() => {
          try {
            fileInputRef.current?.click();
          } catch (retryError) {
            console.error("重试触发文件选择失败:", retryError);
          }
        }, 100);
      }
    } else {
      // 如果 ref 不存在，延迟重试
      console.warn("文件输入引用不存在，将在100ms后重试");
      setTimeout(() => {
        if (fileInputRef.current) {
          try {
            fileInputRef.current.click();
          } catch (error) {
            console.error("延迟触发文件选择失败:", error);
          }
        }
      }, 100);
    }
  }, [isMounted]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 检查文件类型是否支持
      const fileName = file.name.toLowerCase();
      const fileType = file.type.toLowerCase();

      // 支持的图片类型（白名单，不开放所有 image/*）
      const supportedImageTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
      ];
      // 支持的CSV MIME类型（不同浏览器可能返回不同的MIME类型）
      const supportedCsvTypes = ["text/csv", "application/csv", "text/plain"];

      const isImageFile = supportedImageTypes.includes(fileType);
      const isCsvFile =
        supportedCsvTypes.includes(fileType) || fileName.endsWith(".csv");

      if (isImageFile || isCsvFile) {
        processFile(file);
      } else {
        alert(
          `不支持的文件类型: ${file.type || "未知"}。请选择 JPG、PNG 格式的图片文件，或 CSV 数据文件。\n文件名: ${file.name}`,
        );
        console.warn(
          `Unsupported file type: ${file.type}, file name: ${file.name}`,
        );
      }
    }
    // 重置文件输入框的值，这样用户可以重新选择同一个文件
    if (event.target) {
      event.target.value = "";
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      if (event.dataTransfer.files && event.dataTransfer.files[0]) {
        const file = event.dataTransfer.files[0];

        // 使用与handleFileChange相同的文件类型检查逻辑
        const fileName = file.name.toLowerCase();
        const fileType = file.type.toLowerCase();

        // 支持的图片类型
        const supportedImageTypes = [
          "image/jpeg",
          "image/jpg",
          "image/png",
        ];
        // 支持的CSV MIME类型（不同浏览器可能返回不同的MIME类型）
        const supportedCsvTypes = ["text/csv", "application/csv", "text/plain"];

        const isImageFile = supportedImageTypes.includes(fileType);
        const isCsvFile =
          supportedCsvTypes.includes(fileType) || fileName.endsWith(".csv");

        if (isImageFile || isCsvFile) {
          processFile(file);
        } else {
          alert(
            `不支持的文件类型: ${file.type || "未知"}。请拖放 JPG、PNG 格式的图片文件，或 CSV 数据文件。\n文件名: ${file.name}`,
          );
          console.warn(
            `Unsupported file type: ${file.type}, file name: ${file.name}`,
          );
        }
      }
    } catch (error) {
      console.error("处理拖拽文件时发生错误:", error);
      alert("处理文件时发生错误，请重试。");
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  // 根据mappedPixelData生成合成的originalImageSrc
  const generateSyntheticImageFromPixelData = (
    pixelData: MappedPixel[][],
    dimensions: { N: number; M: number },
  ): string => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      console.error("无法创建canvas上下文");
      return "";
    }

    // 设置画布尺寸，每个像素用8x8像素来表示以确保清晰度
    const pixelSize = 8;
    canvas.width = dimensions.N * pixelSize;
    canvas.height = dimensions.M * pixelSize;

    // 绘制每个像素
    pixelData.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell) {
          // 使用颜色，外部单元格用白色
          const color = cell.isExternal ? "#FFFFFF" : cell.color;
          ctx.fillStyle = color;
          ctx.fillRect(
            colIndex * pixelSize,
            rowIndex * pixelSize,
            pixelSize,
            pixelSize,
          );
        }
      });
    });

    // 转换为dataURL
    return canvas.toDataURL("image/png");
  };

  // 统一文件验证入口（handleFileChange + handleDrop + processFile 共用）
  const validateIncomingFile = (file: File): string | null => {
    const sizeErr = checkFileSize(file.size);
    if (!sizeErr.ok) return sizeErr.message!;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "csv") {
      const csvErr = checkCsvSize(file.size);
      if (!csvErr.ok) return csvErr.message!;
    }
    return null;
  };

  const processFile = (file: File) => {
    // 统一资源认证
    const validationError = validateIncomingFile(file);
    if (validationError) {
      alert(validationError);
      return;
    }

    // 检查文件类型
    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    if (fileExtension === "csv") {
      // 处理CSV文件
      console.log("正在导入CSV文件...");
      const allowedHex = new Set(
        fullBeadPalette.map((c) => c.hex.toUpperCase()),
      );
      importCsvData(file, allowedHex)
        .then(({ mappedPixelData, gridDimensions }) => {
          console.log(
            `成功导入CSV文件: ${gridDimensions.N}x${gridDimensions.M}`,
          );

          // 设置导入的数据
          setMappedPixelData(mappedPixelData);
          setGridDimensions(gridDimensions);
          setOriginalImageSrc(null); // CSV导入时没有原始图片

          // 计算颜色统计
          const colorCountsMap: {
            [key: string]: { count: number; color: string };
          } = {};
          let totalCount = 0;

          mappedPixelData.forEach((row) => {
            row.forEach((cell) => {
              if (cell && !cell.isExternal) {
                const colorKey = cell.color.toUpperCase();
                if (colorCountsMap[colorKey]) {
                  colorCountsMap[colorKey].count++;
                } else {
                  colorCountsMap[colorKey] = {
                    count: 1,
                    color: cell.color,
                  };
                }
                totalCount++;
              }
            });
          });

          setColorCounts(colorCountsMap);
          setTotalBeadCount(totalCount);
          setInitialGridColorKeys(new Set(Object.keys(colorCountsMap)));

          // 根据mappedPixelData生成合成的originalImageSrc
          const syntheticImageSrc = generateSyntheticImageFromPixelData(
            mappedPixelData,
            gridDimensions,
          );

          setOriginalImageSrc(syntheticImageSrc);

          // 重置状态
          setIsManualColoringMode(false);
          setSelectedColor(null);

          // 设置格子数量为导入的尺寸，避免重新映射时尺寸被修改
          setGranularity(gridDimensions.N);
          setGranularityInput(gridDimensions.N.toString());

          alert(
            `成功导入CSV文件！图纸尺寸：${gridDimensions.N}x${gridDimensions.M}，共使用${Object.keys(colorCountsMap).length}种颜色。`,
          );
        })
        .catch((error) => {
          console.error("CSV导入失败:", error);
          alert(`CSV导入失败：${error.message}`);
        });
    } else {
      // 处理图片文件
      const applyImageSrc = (result: string) => {
        setOriginalImageSrc(result);
        setMappedPixelData(null);
        setGridDimensions(null);
        setColorCounts(null);
        setTotalBeadCount(0);
        setPixelatedCanvasSize(null);
        setInitialGridColorKeys(new Set()); // ++ 重置初始键 ++
        // ++ 重置横轴格子数量为默认值 ++
        const defaultGranularity = 100;
        setGranularity(defaultGranularity);
        setGranularityInput(defaultGranularity.toString());
        setRemapTrigger((prev) => prev + 1); // Trigger full remap for new image
      };

      const reader = new FileReader();
      reader.onload = (e) => {
        applyImageSrc(e.target?.result as string);
      };
      reader.onerror = () => {
        console.error("文件读取失败");
        alert("无法读取文件。");
        setInitialGridColorKeys(new Set()); // ++ 重置初始键 ++
      };
      reader.readAsDataURL(file);
      // ++ Reset manual coloring mode when a new file is processed ++
      setIsManualColoringMode(false);
      setSelectedColor(null);
    }
  };

  // ++ 修改：处理确认按钮点击的函数，同时处理两个参数 ++
  const handleConfirmParameters = () => {
    // 处理格子数
    const minGranularity = 10;
    const maxGranularity = 300;
    let newGranularity = parseInt(granularityInput, 10);

    if (isNaN(newGranularity) || newGranularity < minGranularity) {
      newGranularity = minGranularity;
    } else if (newGranularity > maxGranularity) {
      newGranularity = maxGranularity;
    }

    // 处理相似度阈值
    const minSimilarity = 0;
    const maxSimilarity = 100;
    let newSimilarity = parseInt(similarityThresholdInput, 10);

    if (isNaN(newSimilarity) || newSimilarity < minSimilarity) {
      newSimilarity = minSimilarity;
    } else if (newSimilarity > maxSimilarity) {
      newSimilarity = maxSimilarity;
    }

    const draftConfig = buildCompileConfig({
      gridWidth: newGranularity,
      similarityThreshold: newSimilarity,
    });
    if (!confirmRecompileIfNeeded(draftConfig)) return;

    // 更新状态并触发重映射（用户主动点击"生成图纸"，始终执行）
    setGranularity(newGranularity);
    setSimilarityThreshold(newSimilarity);
    setGranularityInput(newGranularity.toString());
    setSimilarityThresholdInput(newSimilarity.toString());
    setRemapTrigger((prev) => prev + 1);
    // 退出手动上色模式
    setIsManualColoringMode(false);
    setSelectedColor(null);
  };

  // 修改pixelateImage函数接收模式参数
  const pixelateImage = (
    imageSrc: string,
    detailLevel: number,
    threshold: number,
    currentPalette: PaletteColor[],
    mode: PixelationMode,
  ) => {
    console.log(
      `Attempting to pixelate with detail: ${detailLevel}, threshold: ${threshold}, mode: ${mode}`,
    );
    const originalCanvas = originalCanvasRef.current;

    if (!originalCanvas) {
      console.error("Original canvas ref not available.");
      return;
    }
    const originalCtx = originalCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    if (!originalCtx) {
      console.error("Original canvas context not found.");
      return;
    }
    console.log("Canvas context obtained.");

    if (currentPalette.length === 0) {
      console.error(
        "Cannot pixelate: The selected color palette is empty (likely due to exclusions).",
      );
      alert(
        "错误：当前可用色域为空，无法处理图像。请在“我的库存”中选择至少一种颜色。",
      );
      setMappedPixelData(null);
      setGridDimensions(null);
      setPixelatedCanvasSize(null);
      // Keep colorCounts potentially showing the last valid counts? Or clear them too?
      // setColorCounts(null); // Decide if clearing counts is desired when palette is empty
      // setTotalBeadCount(0);
      return; // Stop processing
    }
    const t1FallbackColor =
      currentPalette.find((p) => p.key === "T1") ||
      currentPalette.find((p) => p.hex.toUpperCase() === "#FFFFFF") ||
      currentPalette[0]; // 使用第一个可用颜色作为备用
    console.log("Using fallback color for empty cells:", t1FallbackColor);

    const img = new window.Image();

    img.onerror = (error: Event | string) => {
      console.error("Image loading failed:", error);
      alert("无法加载图片。");
      setOriginalImageSrc(null);
      setMappedPixelData(null);
      setGridDimensions(null);
      setColorCounts(null);
      setInitialGridColorKeys(new Set());
      setPixelatedCanvasSize(null);
    };

    img.onload = () => {
      console.log("Image loaded successfully.");

      // 检查源图像素上限
      const imgPixelCheck = checkImagePixels(img.width, img.height);
      if (!imgPixelCheck.ok) {
        alert(imgPixelCheck.message);
        setOriginalImageSrc(null);
        setMappedPixelData(null);
        setGridDimensions(null);
        setPixelatedCanvasSize(null);
        return;
      }

      const aspectRatio = img.height / img.width;
      const N = detailLevel;
      const M = Math.max(1, Math.round(N * aspectRatio));
      if (N <= 0 || M <= 0) {
        console.error("Invalid grid dimensions:", { N, M });
        return;
      }

      // 检查网格尺寸上限
      const gridCheck = checkGridSize(N, M);
      if (!gridCheck.ok) {
        alert(
          `${gridCheck.message}\n\n请降低"宽度颗粒"数值（当前 ${N}，建议 ≤${Math.min(300, Math.round(300 / aspectRatio))}）。`,
        );
        setOriginalImageSrc(null);
        setMappedPixelData(null);
        setGridDimensions(null);
        setPixelatedCanvasSize(null);
        return;
      }
      console.log(`Grid size: ${N}x${M}`);

      // 动态调整画布尺寸：当格子数量大于100时，增加画布尺寸以保持每个格子的可见性
      const baseWidth = 500;
      const minCellSize = 4; // 每个格子的最小尺寸（像素）
      const recommendedCellSize = 6; // 推荐的格子尺寸（像素）

      let outputWidth = baseWidth;

      // 如果格子数量大于100，计算需要的画布宽度
      if (N > 100) {
        const requiredWidthForMinSize = N * minCellSize;
        const requiredWidthForRecommendedSize = N * recommendedCellSize;

        // 使用推荐尺寸，但不超过屏幕宽度的90%（最大1200px）
        const maxWidth = Math.min(1200, window.innerWidth * 0.9);
        outputWidth = Math.min(
          maxWidth,
          Math.max(baseWidth, requiredWidthForRecommendedSize),
        );

        // 确保不小于最小要求
        outputWidth = Math.max(outputWidth, requiredWidthForMinSize);

        console.log(
          `Large grid detected (${N} columns). Adjusted canvas width from ${baseWidth} to ${outputWidth}px (cell size: ${Math.round(outputWidth / N)}px)`,
        );
      }

      // 使用 M/N 比例计算高度，确保格子严格正方形（避免 aspectRatio 与 M 的双重取整误差）
      const outputHeight = Math.round((outputWidth * M) / N);

      // 存储画布尺寸供 PixelatedPreviewCanvas 使用
      setPixelatedCanvasSize({ width: outputWidth, height: outputHeight });

      // 在控制台提示用户画布尺寸变化
      if (N > 100) {
        console.log(
          `💡 由于格子数量较多 (${N}x${M})，画布已自动放大以保持清晰度。可以使用水平滚动查看完整图像。`,
        );
      }
      originalCanvas.width = img.width;
      originalCanvas.height = img.height;
      console.log(
        `Canvas dimensions: Original ${img.width}x${img.height}, Output ${outputWidth}x${outputHeight}`,
      );

      originalCtx.drawImage(img, 0, 0, img.width, img.height);
      console.log("Original image drawn.");

      // 1. 使用calculatePixelGrid进行初始颜色映射
      console.log("Starting initial color mapping using calculatePixelGrid...");
      const initialMappedData = calculatePixelGrid(
        originalCtx,
        img.width,
        img.height,
        N,
        M,
        currentPalette,
        mode,
        t1FallbackColor,
      );
      console.log(
        `Initial data mapping complete using mode ${mode}. Starting global color merging...`,
      );

      // --- 新的全局颜色合并逻辑 ---
      const keyToRgbMap = new Map<string, RgbColor>();
      const keyToColorDataMap = new Map<string, PaletteColor>();
      currentPalette.forEach((p) => {
        keyToRgbMap.set(p.key, p.rgb);
        keyToColorDataMap.set(p.key, p);
      });

      // 2. 统计初始颜色数量
      const initialColorCounts: { [key: string]: number } = {};
      initialMappedData.flat().forEach((cell) => {
        if (
          cell &&
          cell.key &&
          !cell.isExternal &&
          cell.key !== TRANSPARENT_KEY
        ) {
          initialColorCounts[cell.key] =
            (initialColorCounts[cell.key] || 0) + 1;
        }
      });
      console.log("Initial color counts:", initialColorCounts);

      // 3. 创建一个颜色排序列表，按出现频率从高到低排序
      const colorsByFrequency = Object.entries(initialColorCounts)
        .sort((a, b) => b[1] - a[1]) // 按频率降序排序
        .map((entry) => entry[0]); // 只保留颜色键

      if (colorsByFrequency.length === 0) {
        console.log("No non-background colors found! Skipping merging.");
      }

      console.log("Colors sorted by frequency:", colorsByFrequency);

      // 4. 复制初始数据，准备合并
      const mergedData: MappedPixel[][] = initialMappedData.map((row) =>
        row.map((cell) => ({ ...cell, isExternal: cell.isExternal ?? false })),
      );

      // 5. 处理相似颜色合并
      const similarityThresholdValue = threshold;

      // 已被合并（替换）的颜色集合
      const replacedColors = new Set<string>();

      // 对每个颜色按频率从高到低处理
      for (let i = 0; i < colorsByFrequency.length; i++) {
        const currentKey = colorsByFrequency[i];

        // 如果当前颜色已经被合并到更频繁的颜色中，跳过
        if (replacedColors.has(currentKey)) continue;

        const currentRgb = keyToRgbMap.get(currentKey);
        if (!currentRgb) {
          console.warn(`RGB not found for key ${currentKey}. Skipping.`);
          continue;
        }

        // 检查剩余的低频颜色
        for (let j = i + 1; j < colorsByFrequency.length; j++) {
          const lowerFreqKey = colorsByFrequency[j];

          // 如果低频颜色已被替换，跳过
          if (replacedColors.has(lowerFreqKey)) continue;

          const lowerFreqRgb = keyToRgbMap.get(lowerFreqKey);
          if (!lowerFreqRgb) {
            console.warn(`RGB not found for key ${lowerFreqKey}. Skipping.`);
            continue;
          }

          // 计算颜色距离
          const dist = colorDistance(currentRgb, lowerFreqRgb);

          // 如果距离小于阈值，将低频颜色替换为高频颜色
          if (dist < similarityThresholdValue) {
            console.log(
              `Merging color ${lowerFreqKey} into ${currentKey} (Distance: ${dist.toFixed(2)})`,
            );

            // 标记这个颜色已被替换
            replacedColors.add(lowerFreqKey);

            // 替换所有使用这个低频颜色的单元格
            for (let r = 0; r < M; r++) {
              for (let c = 0; c < N; c++) {
                if (mergedData[r][c].key === lowerFreqKey) {
                  const colorData = keyToColorDataMap.get(currentKey);
                  if (colorData) {
                    mergedData[r][c] = {
                      key: currentKey,
                      color: colorData.hex,
                      isExternal: false,
                    };
                  }
                }
              }
            }
          }
        }
      }

      if (replacedColors.size > 0) {
        console.log(
          `Merged ${replacedColors.size} less frequent similar colors into more frequent ones.`,
        );
      } else {
        console.log("No colors were similar enough to merge.");
      }
      // --- 结束新的全局颜色合并逻辑 ---

      // --- 状态更新（始终执行，不依赖 pixelatedCanvasRef）---
      // 注意：实际 canvas 绘制由 PixelatedPreviewCanvas 组件内的 useEffect 负责
      // pixelatedCanvasRef 在初始渲染时可能为 null（条件渲染），不应阻塞数据流
      applyChartData(mergedData);
      setGridDimensions({ N, M });
      setAppliedCompileConfig(
        buildCompileConfig({
          gridWidth: N,
          similarityThreshold: threshold,
          pixelationMode: mode,
        }),
      );
      console.log("Chart stats updated based on merged data (after merging).");
    }; // 正确闭合 img.onload 函数

    console.log("Setting image source...");
    img.src = imageSrc;
    setIsManualColoringMode(false);
    setSelectedColor(null);
  }; // 正确闭合 pixelateImage 函数

  // 当 remapTrigger 变化时清空撤回历史（参数调整/新图上传等均会触发 remap）
  useEffect(() => {
    clearEditHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remapTrigger]);

  // 修改useEffect中的pixelateImage调用，加入模式参数
  useEffect(() => {
    if (originalImageSrc && activePalette.length > 0) {
      const timeoutId = setTimeout(() => {
        if (
          originalImageSrc &&
          originalCanvasRef.current &&
          activePalette.length > 0
        ) {
          console.log(
            "useEffect triggered: Processing image due to src, granularity, threshold, palette, mode or remap trigger.",
          );
          pixelateImage(
            originalImageSrc,
            granularity,
            similarityThreshold,
            activePalette,
            pixelationMode,
          );
        } else {
          console.warn(
            "useEffect check failed inside timeout: Refs or active palette not ready/empty.",
          );
        }
      }, 50);
      return () => clearTimeout(timeoutId);
    } else if (originalImageSrc && activePalette.length === 0) {
      console.warn(
        "Image selected, but the active palette is empty after exclusions. Cannot process. Clearing preview.",
      );
      const pixelatedCanvas = pixelatedCanvasRef.current;
      const pixelatedCtx = pixelatedCanvas?.getContext("2d");
      if (pixelatedCtx && pixelatedCanvas) {
        pixelatedCtx.clearRect(
          0,
          0,
          pixelatedCanvas.width,
          pixelatedCanvas.height,
        );
        // Draw a message on the canvas?
        pixelatedCtx.fillStyle = "#6b7280"; // gray-500
        pixelatedCtx.font = "16px sans-serif";
        pixelatedCtx.textAlign = "center";
        pixelatedCtx.fillText(
          "无可用颜色，请先维护我的库存",
          pixelatedCanvas.width / 2,
          pixelatedCanvas.height / 2,
        );
      }
      setMappedPixelData(null);
      setGridDimensions(null);
      setPixelatedCanvasSize(null);
      // Keep colorCounts to allow user to un-exclude colors
      // setColorCounts(null);
      // setTotalBeadCount(0);
    }
    // 编译只由导入新图或用户点击生成/重新生成触发；草稿设置变化不静默改写当前图纸。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originalImageSrc, remapTrigger]);

  // 确保文件输入框引用在组件挂载后正确设置
  useEffect(() => {
    // 延迟执行，确保DOM完全渲染
    const timer = setTimeout(() => {
      if (!fileInputRef.current) {
        console.warn(
          "文件输入框引用在组件挂载后仍为null，这可能会导致上传功能异常",
        );
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // 设置组件挂载状态
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      );
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isManualColoringMode || isEditableTarget(event.target)) return;
      const key = event.key.toLowerCase();
      const isModifierPressed = event.metaKey || event.ctrlKey;

      if (key === "escape") {
        event.preventDefault();
        clearSelection();
      } else if (key === "delete" || key === "backspace") {
        if (selection.size > 0) {
          event.preventDefault();
          handleDeleteSelection();
        }
      } else if (isModifierPressed && key === "z" && !event.shiftKey) {
        event.preventDefault();
        handleUndoEdit();
      } else if (
        (isModifierPressed && key === "z" && event.shiftKey) ||
        (event.ctrlKey && key === "y")
      ) {
        event.preventDefault();
        handleRedoEdit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    clearSelection,
    handleDeleteSelection,
    handleRedoEdit,
    handleUndoEdit,
    isManualColoringMode,
    selection.size,
  ]);

  // --- Download function (ensure filename includes palette) ---
  const handlePrintChartDownload = () => {
    if (mappedPixelData && boardPlan) {
      const issues = validateExportConsistency({
        mappedPixelData,
        allowedMardCodes: new Set(activePalette.map((color) => color.key)),
        boardPlan,
      });

      if (issues.length > 0) {
        alert(`${issues[0]}\n\n请先重新生成图纸后再导出。`);
        return;
      }
    }

    // 调用移动到utils/imageDownloader.ts中的downloadImage函数
    downloadImage({
      mappedPixelData,
      gridDimensions,
      colorCounts,
      totalBeadCount,
      options: {
        showGrid: true,
        gridInterval: 10,
        showCoordinates: true,
        showCellNumbers: true,
        gridLineColor: "#555555",
        includeStats: true,
        exportCsv: false,
      },
      activeBeadPalette: activePalette,
      selectedColorSystem,
      boardPlan: null,
      inventoryPresetId,
    });
  };

  const handleMakerPackDownload = async () => {
    if (!mappedPixelData || !gridDimensions || !colorCounts || !boardPlan) {
      alert("无法导出制作包，图纸尚未生成。");
      return;
    }

    const issues = validateExportConsistency({
      mappedPixelData,
      allowedMardCodes: new Set(activePalette.map((color) => color.key)),
      boardPlan,
    });

    if (issues.length > 0) {
      alert(`${issues[0]}\n\n请先重新生成图纸后再导出。`);
      return;
    }

    const printChart = createPrintChartPngBlob({
      mappedPixelData,
      gridDimensions,
      colorCounts,
      totalBeadCount,
      selectedColorSystem,
    });
    if (!printChart) return;

    const files: MakerPackFile[] = [
      {
        path: "print-chart.png",
        bytes: new Uint8Array(await printChart.arrayBuffer()),
      },
      {
        path: "pattern.csv",
        bytes: new TextEncoder().encode(
          serializeCsvText({ mappedPixelData, gridDimensions }),
        ),
      },
      {
        path: "manifest.json",
        bytes: new TextEncoder().encode(
          JSON.stringify(
            buildMakerPackManifest({
              mappedPixelData,
              gridDimensions,
              inventoryPresetId,
              boardPlan,
              activeBeadPalette: activePalette,
            }),
            null,
            2,
          ),
        ),
      },
    ];

    for (const board of boardPlan.boards) {
      const boardBlob = createBoardSheetPngBlob({
        mappedPixelData,
        board,
        selectedColorSystem,
        boardSize: boardPlan.boardSize,
      });
      if (!boardBlob) return;
      files.push({
        path: `boards/${board.id}.png`,
        bytes: new Uint8Array(await boardBlob.arrayBuffer()),
      });
    }

    downloadBlob(buildStoredZipBlob(files), `maker-pack-${gridDimensions.N}x${gridDimensions.M}.zip`);
    showToast("制作包已生成");
  };

  // ++ Re-introduce the combined interaction handler ++
  const handleCanvasInteraction = (
    clientX: number,
    clientY: number,
    pageX: number,
    pageY: number,
    isClick: boolean = false,
    isTouchEnd: boolean = false,
  ) => {
    // 如果是触摸结束或鼠标离开事件，隐藏提示
    if (isTouchEnd) {
      setTooltipData(null);
      return;
    }

    const canvas = pixelatedCanvasRef.current;
    if (!canvas || !mappedPixelData || !gridDimensions) {
      setTooltipData(null);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;

    const { N, M } = gridDimensions;
    const cellWidthOutput = canvas.width / N;
    const cellHeightOutput = canvas.height / M;

    const i = Math.floor(canvasX / cellWidthOutput);
    const j = Math.floor(canvasY / cellHeightOutput);

    if (i >= 0 && i < N && j >= 0 && j < M) {
      const cellData = mappedPixelData[j][i];

      // Manual Coloring Logic - 保持原有的上色逻辑
      if (
        isClick &&
        isManualColoringMode &&
        editorTool === "paint" &&
        selectedColor
      ) {
        // 手动上色模式逻辑保持不变
        // ...现有代码...
        const newPixelData = mappedPixelData.map((row) =>
          row.map((cell) => ({ ...cell })),
        );
        const currentCell = newPixelData[j]?.[i];

        if (!currentCell) return;

        const previousKey = currentCell.key;
        const wasExternal = currentCell.isExternal;

        let newCellData: MappedPixel;

        if (selectedColor.key === TRANSPARENT_KEY) {
          newCellData = { ...transparentColorData };
        } else {
          newCellData = { ...selectedColor, isExternal: false };
        }

        // Only update if state changes
        if (
          newCellData.key !== previousKey ||
          newCellData.isExternal !== wasExternal
        ) {
          saveEditSnapshot();
          newPixelData[j][i] = newCellData;
          setMappedPixelData(newPixelData);

          // Update color counts
          if (colorCounts) {
            const newColorCounts = { ...colorCounts };
            let newTotalCount = totalBeadCount;

            // 处理之前颜色的减少（使用hex值）
            if (!wasExternal && previousKey !== TRANSPARENT_KEY) {
              const previousCell = mappedPixelData[j][i];
              const previousHex = previousCell?.color?.toUpperCase();
              if (previousHex && newColorCounts[previousHex]) {
                newColorCounts[previousHex].count--;
                if (newColorCounts[previousHex].count <= 0) {
                  delete newColorCounts[previousHex];
                }
                newTotalCount--;
              }
            }

            // 处理新颜色的增加（使用hex值）
            if (
              !newCellData.isExternal &&
              newCellData.key !== TRANSPARENT_KEY
            ) {
              const newHex = newCellData.color.toUpperCase();
              if (!newColorCounts[newHex]) {
                newColorCounts[newHex] = {
                  count: 0,
                  color: newHex,
                };
              }
              newColorCounts[newHex].count++;
              newTotalCount++;
            }

            setColorCounts(newColorCounts);
            setTotalBeadCount(newTotalCount);
          }
        }

        // 上色操作后隐藏提示
        setTooltipData(null);
      }
      // Tooltip Logic (非手动上色模式点击或悬停)
      else if (!isManualColoringMode) {
        // 只有单元格实际有内容（非背景/外部区域）才会显示提示
        if (cellData && !cellData.isExternal && cellData.key) {
          // 检查是否已经显示了提示框，并且是否点击的是同一个位置
          // 对于移动设备，位置可能有细微偏差，所以我们检查单元格索引而不是具体坐标
          if (tooltipData) {
            // 如果已经有提示框，计算当前提示框对应的格子的索引
            const tooltipRect = canvas.getBoundingClientRect();

            // 还原提示框位置为相对于canvas的坐标
            const prevX = tooltipData.x; // 页面X坐标
            const prevY = tooltipData.y; // 页面Y坐标

            // 转换为相对于canvas的坐标
            const prevCanvasX = (prevX - tooltipRect.left) * scaleX;
            const prevCanvasY = (prevY - tooltipRect.top) * scaleY;

            // 计算之前显示提示框位置对应的网格索引
            const prevCellI = Math.floor(prevCanvasX / cellWidthOutput);
            const prevCellJ = Math.floor(prevCanvasY / cellHeightOutput);

            // 如果点击的是同一个格子，则切换tooltip的显示/隐藏状态
            if (i === prevCellI && j === prevCellJ) {
              setTooltipData(null); // 隐藏提示
              return;
            }
          }

          // 计算相对于main元素的位置
          const mainElement = mainRef.current;
          if (mainElement) {
            const mainRect = mainElement.getBoundingClientRect();
            // 计算相对于main元素的坐标
            const relativeX = pageX - mainRect.left - window.scrollX;
            const relativeY = pageY - mainRect.top - window.scrollY;

            // 如果是移动/悬停到一个新的有效格子，或者点击了不同的格子，则显示提示
            setTooltipData({
              x: relativeX,
              y: relativeY,
              key: cellData.key,
              color: cellData.color,
            });
          } else {
            // 如果没有找到main元素，使用原始坐标
            setTooltipData({
              x: pageX,
              y: pageY,
              key: cellData.key,
              color: cellData.color,
            });
          }
        } else {
          // 如果点击/悬停在外部区域或背景上，隐藏提示
          setTooltipData(null);
        }
      }
    } else {
      // 如果点击/悬停在画布外部，隐藏提示
      setTooltipData(null);
    }
  };

  // 处理自定义色板中单个颜色的选择变化
  const handleSelectionChange = (hexValue: string, isSelected: boolean) => {
    const normalizedHex = hexValue.toUpperCase();
    setCustomPaletteSelections((prev) => ({
      ...prev,
      [normalizedHex]: isSelected,
    }));
    setIsCustomPalette(true);
  };

  // 保存自定义色板并应用
  const handleSaveCustomPalette = () => {
    if (
      hasLocalEdits &&
      !window.confirm(
        "保存并应用自定义色板会重新生成图纸，并丢失当前局部编辑、撤回记录和重做记录。\n\n是否继续？",
      )
    ) {
      showToast("已取消应用自定义色板，当前图纸未改变");
      return;
    }

    savePaletteSelections(customPaletteSelections);
    setIsCustomPalette(true);
    setIsCustomPaletteEditorOpen(false);
    // 触发图像重新处理
    setRemapTrigger((prev) => prev + 1);
    // 退出手动上色模式
    setIsManualColoringMode(false);
    setSelectedColor(null);
  };

  // ++ 新增：导出自定义色板配置 ++
  const handleExportCustomPalette = () => {
    const selectedHexValues = Object.entries(customPaletteSelections)
      .filter(([, isSelected]) => isSelected)
      .map(([hexValue]) => hexValue);

    if (selectedHexValues.length === 0) {
      alert("当前没有选中的颜色，无法导出。");
      return;
    }

    // 导出格式：仅基于hex值
    const exportData = {
      version: "3.0", // 新版本号
      selectedHexValues: selectedHexValues,
      exportDate: new Date().toISOString(),
      totalColors: selectedHexValues.length,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "custom-perler-palette.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ++ 新增：处理导入的色板文件 ++
  const handleImportPaletteFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        // 检查文件格式
        if (!Array.isArray(data.selectedHexValues)) {
          throw new Error(
            "无效的文件格式：文件必须包含 'selectedHexValues' 数组。",
          );
        }

        console.log("检测到基于hex值的色板文件");

        const importedHexValues = data.selectedHexValues as string[];
        const validHexValues: string[] = [];
        const invalidHexValues: string[] = [];

        // 验证hex值
        importedHexValues.forEach((hex) => {
          const normalizedHex = hex.toUpperCase();
          const colorData = fullBeadPalette.find(
            (color) => color.hex.toUpperCase() === normalizedHex,
          );
          if (colorData) {
            validHexValues.push(normalizedHex);
          } else {
            invalidHexValues.push(hex);
          }
        });

        if (invalidHexValues.length > 0) {
          console.warn("导入时发现无效的hex值:", invalidHexValues);
          alert(
            `导入完成，但以下颜色无效已被忽略：\n${invalidHexValues.join(", ")}`,
          );
        }

        if (validHexValues.length === 0) {
          alert("导入的文件中不包含任何有效的颜色。");
          return;
        }

        console.log(`成功验证 ${validHexValues.length} 个有效的hex值`);

        // 基于有效的hex值创建新的selections对象
        const allHexValues = fullBeadPalette.map((color) =>
          color.hex.toUpperCase(),
        );
        const newSelections = presetToSelections(allHexValues, validHexValues);
        setCustomPaletteSelections(newSelections);
        setIsCustomPalette(true); // 标记为自定义
        alert(`成功导入 ${validHexValues.length} 个颜色！`);
      } catch (error) {
        console.error("导入色板配置失败:", error);
        alert(
          `导入失败: ${error instanceof Error ? error.message : "未知错误"}`,
        );
      } finally {
        // 重置文件输入，以便可以再次导入相同的文件
        if (event.target) {
          event.target.value = "";
        }
      }
    };
    reader.onerror = () => {
      alert("读取文件失败。");
      // 重置文件输入
      if (event.target) {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  // ++ 新增：触发导入文件选择 ++
  const triggerImportPalette = () => {
    importPaletteInputRef.current?.click();
  };

  // 新增：处理颜色高亮
  const handleHighlightColor = (colorHex: string) => {
    setHighlightColorKey(colorHex);
  };

  // 新增：高亮完成回调
  const handleHighlightComplete = () => {
    setHighlightColorKey(null);
  };

  // 新增：切换完整色板显示
  const handleToggleFullPalette = () => {
    setShowFullPalette(!showFullPalette);
  };

  // 新增：处理颜色选择，同时管理模式切换
  const handleColorSelect = (colorData: {
    key: string;
    color: string;
    isExternal?: boolean;
  }) => {
    setSelectedColor(colorData);
  };

  // 生成完整色板数据（用户自定义色板中选中的所有颜色）
  const fullPaletteColors = useMemo(() => {
    const selectedColors: { key: string; color: string }[] = [];

    Object.entries(customPaletteSelections).forEach(
      ([hexValue, isSelected]) => {
        if (isSelected) {
          // 根据选择的色号系统获取显示的色号
          const displayKey = getColorKeyByHex(hexValue, selectedColorSystem);
          selectedColors.push({
            key: displayKey,
            color: hexValue,
          });
        }
      },
    );

    // 使用色相排序而不是色号排序
    return sortColorsByHue(selectedColors);
  }, [customPaletteSelections, selectedColorSystem]);

  const selectedPaletteCount = Object.values(customPaletteSelections).filter(
    Boolean,
  ).length;
  const colorCountEntries = colorCounts
    ? Object.entries(colorCounts).sort(([a], [b]) =>
        sortColorKeys(
          getColorKeyByHex(a, selectedColorSystem),
          getColorKeyByHex(b, selectedColorSystem),
        ),
      )
    : [];
  const chartReady = Boolean(mappedPixelData && gridDimensions);
  const selectedColorLabel = selectedColor
    ? getColorKeyByHex(selectedColor.color.toUpperCase(), selectedColorSystem)
    : "未选择";

  return (
    <div
      data-workbench-shell
      className="min-h-screen bg-[#f5f7f8] text-[#17201f] font-[family-name:var(--font-geist-sans)]"
    >
      <style
        dangerouslySetInnerHTML={{
          __html:
            "@keyframes toastFadeInOut{0%{opacity:0;transform:translate(-50%,10px)}15%{opacity:1;transform:translate(-50%,0)}85%{opacity:1;transform:translate(-50%,0)}100%{opacity:0;transform:translate(-50%,-10px)}}",
        }}
      />

      <header className="sticky top-0 z-40 border-b border-[#dce5e2] bg-white/92 backdrop-blur">
        <div className="mx-auto flex max-w-[1520px] items-center justify-between gap-4 px-5 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 grid-cols-3 gap-0.5 rounded-md border border-[#b9d8d3] bg-[#e7f3f0] p-1 shadow-sm">
              {[
                "#22a78f",
                "#f2cf5b",
                "#f27f57",
                "#ffffff",
                "#17201f",
                "#8ec9bd",
                "#f5f7f8",
                "#d95d78",
                "#66a5b6",
              ].map((color, index) => (
                <span
                  key={color + "-" + index}
                  className="rounded-[2px] border border-black/5"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold tracking-normal text-[#17201f] sm:text-lg">
                Juice拼豆
              </h1>
              <p className="hidden text-xs text-[#697775] sm:block">
                图片转拼豆图纸 · 网格校准 · 色板整理 · 导出制作文件
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={isMounted ? triggerFileInput : undefined}
              disabled={!isMounted}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-[#b9d8d3] bg-white px-3 text-sm font-medium text-[#24524b] shadow-sm transition hover:bg-[#edf7f5] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span aria-hidden="true">+</span>导入
            </button>
            <button
              type="button"
              onClick={() => setIsDownloadSettingsOpen(true)}
              disabled={!chartReady}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-[#1f9d8a] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#188775] disabled:cursor-not-allowed disabled:bg-[#a7c9c3]"
            >
              导出
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1520px] gap-4 px-5 py-4 md:grid-cols-[240px_minmax(0,1fr)_260px] lg:grid-cols-[300px_minmax(0,1fr)_320px]">
        <aside className="space-y-4 md:sticky md:top-[72px] md:h-[calc(100vh-88px)] md:overflow-auto">
          <section className="rounded-lg border border-[#dce5e2] bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-[#17201f]">源图</h2>
                <p className="mt-1 text-xs text-[#6f7d7b]">
                  导入照片、像素图或 CSV 文件
                </p>
              </div>
              {originalImageSrc ? (
                <span className="rounded-full bg-[#e7f3f0] px-2 py-1 text-[11px] font-medium text-[#1c6f62]">
                  已导入
                </span>
              ) : null}
            </div>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onClick={isMounted ? triggerFileInput : undefined}
              className="group flex min-h-[172px] cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-[#aacdc7] bg-[#f7fbfa] px-4 py-5 text-center transition hover:border-[#1f9d8a] hover:bg-[#eef8f6]"
            >
              {originalImageSrc &&
              originalImageSrc !== "data:text/csv;base64,imported" ? (
                <img
                  src={originalImageSrc}
                  alt="已导入的源图"
                  className="max-h-36 max-w-full rounded border border-[#dce5e2] object-contain"
                />
              ) : (
                <>
                  <div className="mb-3 grid h-12 w-12 grid-cols-4 gap-0.5 rounded-md border border-[#dce5e2] bg-white p-1 shadow-sm">
                    {Array.from({ length: 16 }).map((_, index) => (
                      <span
                        key={index}
                        className="rounded-[1px]"
                        style={{
                          backgroundColor:
                            index % 3 === 0
                              ? "#1f9d8a"
                              : index % 3 === 1
                                ? "#f2cf5b"
                                : "#d9e6e3",
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-sm font-medium text-[#24524b]">
                    点击或拖拽导入
                  </p>
                  <p className="mt-1 text-xs text-[#7a8785]">
                    JPG / PNG / CSV
                  </p>
                </>
              )}
            </div>
            <input
              type="file"
              accept="image/jpeg, image/png, .csv, text/csv, application/csv, text/plain"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="hidden"
            />
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleImportPaletteFile}
              ref={importPaletteInputRef}
              className="hidden"
            />
          </section>

          <section
            data-transform-panel
            className="rounded-lg border border-[#dce5e2] bg-white p-4 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-[#17201f]">
                  转换参数
                </h2>
                <p className="mt-1 text-xs text-[#6f7d7b]">
                  控制图纸尺寸、取色方式和颜色合并
                </p>
              </div>
              <span className="rounded-full bg-[#f1f4f3] px-2 py-1 text-[11px] text-[#697775]">
                {pixelationMode === PixelationMode.Dominant
                  ? "主色模式"
                  : "平均模式"}
              </span>
            </div>
            <div className="space-y-4">
              <label className="block">
                <div className="mb-2 flex items-center justify-between text-xs font-medium text-[#3b4947]">
                  <span>宽度颗粒</span>
                  <span className="font-mono text-[#1f7669]">
                    {granularityInput}
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="200"
                  value={granularity}
                  onChange={(event) => {
                    setGranularity(Number(event.target.value));
                    setGranularityInput(event.target.value);
                  }}
                  className="w-full accent-[#1f9d8a]"
                />
                <input
                  type="number"
                  min="10"
                  max="200"
                  value={granularityInput}
                  onChange={(event) => setGranularityInput(event.target.value)}
                  onBlur={() => {
                    const nextValue = Math.max(
                      10,
                      Math.min(200, Number(granularityInput) || 50),
                    );
                    setGranularity(nextValue);
                    setGranularityInput(String(nextValue));
                  }}
                  className="mt-2 h-9 w-full rounded-md border border-[#d2dedb] bg-white px-3 text-sm outline-none focus:border-[#1f9d8a] focus:ring-2 focus:ring-[#1f9d8a]/15"
                />
              </label>
              <label className="block">
                <div className="mb-2 flex items-center justify-between text-xs font-medium text-[#3b4947]">
                  <span>近似颜色合并</span>
                  <span className="font-mono text-[#1f7669]">
                    {similarityThresholdInput}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={similarityThreshold}
                  onChange={(event) => {
                    setSimilarityThreshold(Number(event.target.value));
                    setSimilarityThresholdInput(event.target.value);
                  }}
                  className="w-full accent-[#1f9d8a]"
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={similarityThresholdInput}
                  onChange={(event) =>
                    setSimilarityThresholdInput(event.target.value)
                  }
                  onBlur={() => {
                    const nextValue = Math.max(
                      0,
                      Math.min(100, Number(similarityThresholdInput) || 0),
                    );
                    setSimilarityThreshold(nextValue);
                    setSimilarityThresholdInput(String(nextValue));
                  }}
                  className="mt-2 h-9 w-full rounded-md border border-[#d2dedb] bg-white px-3 text-sm outline-none focus:border-[#1f9d8a] focus:ring-2 focus:ring-[#1f9d8a]/15"
                />
              </label>
              <div>
                <p className="mb-2 text-xs font-medium text-[#3b4947]">
                  取色方式
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPixelationMode(PixelationMode.Dominant)}
                    className={
                      "h-9 rounded-md border text-xs font-medium transition " +
                      (pixelationMode === PixelationMode.Dominant
                        ? "border-[#1f9d8a] bg-[#e7f3f0] text-[#176b5f]"
                        : "border-[#d2dedb] bg-white text-[#5d6b69] hover:bg-[#f7fbfa]")
                    }
                  >
                    主色
                  </button>
                  <button
                    type="button"
                    onClick={() => setPixelationMode(PixelationMode.Average)}
                    className={
                      "h-9 rounded-md border text-xs font-medium transition " +
                      (pixelationMode === PixelationMode.Average
                        ? "border-[#1f9d8a] bg-[#e7f3f0] text-[#176b5f]"
                        : "border-[#d2dedb] bg-white text-[#5d6b69] hover:bg-[#f7fbfa]")
                    }
                  >
                    平均
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={handleConfirmParameters}
                disabled={!originalImageSrc}
                className="h-10 w-full rounded-md bg-[#1f9d8a] text-sm font-semibold text-white shadow-sm transition hover:bg-[#188775] disabled:cursor-not-allowed disabled:bg-[#a7c9c3]"
              >
                生成图纸
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-[#dce5e2] bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-[#17201f]">可用色域</h2>
                <p className="mt-1 text-xs text-[#6f7d7b]">
                  当前启用 {selectedPaletteCount || activePalette.length} 色
                </p>
              </div>
              {isCustomPalette ? (
                <span className="rounded-full bg-[#fff7dd] px-2 py-1 text-[11px] text-[#8a6414]">
                  我的库存
                </span>
              ) : null}
            </div>
            <div className="rounded-md border border-[#dce5e2] bg-[#fbfdfc] p-3 text-xs leading-5 text-[#6f7d7b]">
              MARD 是当前工作台唯一色号体系。切换可用色域后，点击“生成图纸”才会应用到当前图纸。
            </div>
            <div className="mt-3">
              <button
                type="button"
                onClick={() => {
                  setInventoryPresetId("mard-custom");
                  setIsCustomPaletteEditorOpen(true);
                }}
                className="h-9 w-full rounded-md border border-[#d2dedb] bg-white text-xs font-medium text-[#3b4947] hover:bg-[#f7fbfa]"
              >
                管理我的库存
              </button>
            </div>
          </section>
          <InventoryPresetSelector
            value={inventoryPresetId}
            onChange={(value) => {
              setInventoryPresetId(value);
              showToast("色包已更新，重新生成后生效");
            }}
            activeColorCount={activePalette.length}
          />
        </aside>

        <section
          data-canvas-stage
          className="min-h-[calc(100vh-104px)] rounded-lg border border-[#dce5e2] bg-white shadow-sm"
        >
          <div className="flex min-h-full flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e4ece9] px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-[#17201f]">
                  图纸画布
                </h2>
                <p className="mt-1 text-xs text-[#6f7d7b]">
                  {gridDimensions
                    ? gridDimensions.N +
                      " x " +
                      gridDimensions.M +
                      " 格 · " +
                      totalBeadCount +
                      " 颗 · " +
                      colorCountEntries.length +
                      " 色"
                    : "导入源图后在这里查看拼豆图纸"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setCanvasZoom(Math.max(0.5, canvasZoom - 0.25))
                    }
                    disabled={!chartReady}
                    className="h-8 w-8 rounded-md border border-[#d2dedb] bg-white text-xs font-semibold text-[#3b4947] hover:bg-[#f7fbfa] disabled:cursor-not-allowed disabled:opacity-45"
                    title="缩小"
                  >
                    −
                  </button>
                  <span className="w-12 text-center text-xs font-mono text-[#1f7669]">
                    {Math.round(canvasZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setCanvasZoom(Math.min(3, canvasZoom + 0.25))
                    }
                    disabled={!chartReady}
                    className="h-8 w-8 rounded-md border border-[#d2dedb] bg-white text-xs font-semibold text-[#3b4947] hover:bg-[#f7fbfa] disabled:cursor-not-allowed disabled:opacity-45"
                    title="放大"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => setCanvasZoom(1)}
                    disabled={!chartReady || canvasZoom === 1}
                    className="h-8 rounded-md border border-[#d2dedb] bg-white px-2 text-[11px] font-medium text-[#3b4947] hover:bg-[#f7fbfa] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    1:1
                  </button>
                </div>
              </div>
            </div>
            <div className="relative flex flex-1 items-center justify-center overflow-auto bg-[linear-gradient(90deg,#edf2f1_1px,transparent_1px),linear-gradient(#edf2f1_1px,transparent_1px)] bg-[length:24px_24px] p-4 sm:p-6">
              <canvas ref={originalCanvasRef} className="hidden" />
              {chartReady ? (
                <div className="relative rounded-md border border-[#cfdedb] bg-white p-2 shadow-sm">
                  <PixelatedPreviewCanvas
                    mappedPixelData={mappedPixelData}
                    gridDimensions={gridDimensions}
                    isManualColoringMode={isManualColoringMode}
                    canvasRef={pixelatedCanvasRef}
                    canvasWidth={pixelatedCanvasSize?.width}
                    canvasHeight={pixelatedCanvasSize?.height}
                    zoom={canvasZoom}
                    onInteraction={handleCanvasInteraction}
                    highlightColorKey={highlightColorKey}
                    onHighlightComplete={handleHighlightComplete}
                    editorTool={editorTool}
                    selection={selection}
                    draftSelection={draftSelection}
                    onSelectionPreview={setDraftSelection}
                    onSelectionClear={clearSelection}
                    onSelectionCommit={(nextSelection, append) => {
                      setSelection((prev) => {
                        if (!append) return nextSelection;
                        const merged = new Set(prev);
                        nextSelection.forEach((key) => merged.add(key));
                        return merged;
                      });
                    }}
                  />
                  {tooltipData ? (
                    <div
                      className="pointer-events-none absolute z-10 rounded-md border border-[#cfdedb] bg-white px-2 py-1 text-xs font-medium text-[#17201f] shadow-sm"
                      style={{ left: tooltipData.x, top: tooltipData.y }}
                    >
                      {getColorKeyByHex(tooltipData.color, selectedColorSystem)}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex max-w-md flex-col items-center text-center">
                  <div className="mb-5 grid h-28 w-28 grid-cols-7 gap-1 rounded-lg border border-[#dce5e2] bg-white p-3 shadow-sm">
                    {Array.from({ length: 49 }).map((_, index) => (
                      <span
                        key={index}
                        className="rounded-[2px]"
                        style={{
                          backgroundColor:
                            index % 7 === 0
                              ? "#1f9d8a"
                              : index % 5 === 0
                                ? "#f2cf5b"
                                : index % 4 === 0
                                  ? "#ef7b67"
                                  : "#e5ecea",
                        }}
                      />
                    ))}
                  </div>
                  <h3 className="text-lg font-semibold text-[#17201f]">
                    从一张图片开始生成拼豆图纸
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#6f7d7b]">
                    左侧导入源图，设定颗粒宽度和色板后，画布会显示可编辑的拼豆网格。
                  </p>
                  <button
                    type="button"
                    onClick={isMounted ? triggerFileInput : undefined}
                    disabled={!isMounted}
                    className="mt-5 h-10 rounded-md bg-[#1f9d8a] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#188775] disabled:cursor-not-allowed disabled:bg-[#a7c9c3]"
                  >
                    导入图片
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        <aside
          data-palette-panel
          className="space-y-4 md:sticky md:top-[72px] md:h-[calc(100vh-88px)] md:overflow-auto"
        >
          <section className="rounded-lg border border-[#dce5e2] bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-[#17201f]">
                  图纸检查
                </h2>
                <p className="mt-1 text-xs text-[#6f7d7b]">
                  尺寸、豆数和当前图中颜色
                </p>
              </div>
              <span className="rounded-full bg-[#f1f4f3] px-2 py-1 text-[11px] text-[#697775]">
                {colorCountEntries.length} 色
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-[#f5f7f8] p-3">
                <div className="text-lg font-semibold text-[#17201f]">
                  {gridDimensions?.N || 0}
                </div>
                <div className="mt-1 text-[11px] text-[#6f7d7b]">宽</div>
              </div>
              <div className="rounded-md bg-[#f5f7f8] p-3">
                <div className="text-lg font-semibold text-[#17201f]">
                  {gridDimensions?.M || 0}
                </div>
                <div className="mt-1 text-[11px] text-[#6f7d7b]">高</div>
              </div>
              <div className="rounded-md bg-[#f5f7f8] p-3">
                <div className="text-lg font-semibold text-[#17201f]">
                  {totalBeadCount}
                </div>
                <div className="mt-1 text-[11px] text-[#6f7d7b]">颗</div>
              </div>
            </div>
            <div className="mt-4 max-h-[390px] space-y-2 overflow-auto pr-1">
              {colorCountEntries.length > 0 ? (
                colorCountEntries.map(([hexKey, data]) => {
                  const displayKey = getColorKeyByHex(
                    hexKey,
                    selectedColorSystem,
                  );
                  return (
                    <div
                      key={hexKey}
                      className="flex items-center gap-3 rounded-md border border-[#e4ece9] bg-[#fbfdfc] p-2"
                    >
                      <button
                        type="button"
                        onClick={() => handleHighlightColor(hexKey)}
                        className="h-8 w-8 shrink-0 rounded border border-black/10 shadow-inner"
                        style={{ backgroundColor: data.color }}
                        aria-label={"高亮 " + displayKey}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-semibold text-[#17201f]">
                            {displayKey}
                          </span>
                          <span className="text-xs text-[#6f7d7b]">
                            {data.count} 颗
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-md border border-dashed border-[#d2dedb] bg-[#fbfdfc] px-4 py-8 text-center text-sm text-[#7a8785]">
                  生成图纸后显示颜色用量
                </div>
              )}
            </div>
          </section>
          <section className="rounded-lg border border-[#dce5e2] bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-[#17201f]">
                  局部编辑
                </h2>
                <p className="mt-1 text-xs text-[#6f7d7b]">
                  当前颜色：{selectedColorLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsManualColoringMode(!isManualColoringMode);
                  if (isManualColoringMode) {
                    clearSelection();
                    setSelectedColor(null);
                  }
                }}
                disabled={!chartReady}
                className={
                  "h-8 rounded-md px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:bg-[#a7c9c3] " +
                  (isManualColoringMode
                    ? "bg-[#17201f] text-white hover:bg-[#2c3836]"
                    : "bg-[#1f9d8a] text-white hover:bg-[#188775]")
                }
              >
                {isManualColoringMode ? "完成编辑" : "编辑图纸"}
              </button>
            </div>
            {isManualColoringMode ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["paint", "单格上色"],
                    ["select", "框选"],
                  ].map(([tool, label]) => (
                    <button
                      key={tool}
                      type="button"
                      onClick={() => {
                        setEditorTool(tool as "paint" | "select");
                        if (tool !== "select") clearSelection();
                      }}
                      disabled={!chartReady}
                      className={
                        "h-9 rounded-md border text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-45 " +
                        (editorTool === tool
                          ? "border-[#1f9d8a] bg-[#e7f3f0] text-[#176b5f]"
                          : "border-[#d2dedb] bg-white text-[#3b4947] hover:bg-[#f7fbfa]")
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleUndoEdit}
                    disabled={editHistory.length === 0}
                    className="h-9 rounded-md border border-[#d2dedb] bg-white text-xs font-medium text-[#3b4947] hover:bg-[#f7fbfa] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    撤回
                  </button>
                  <button
                    type="button"
                    onClick={handleRedoEdit}
                    disabled={editFuture.length === 0}
                    className="h-9 rounded-md border border-[#d2dedb] bg-white text-xs font-medium text-[#3b4947] hover:bg-[#f7fbfa] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    重做
                  </button>
                </div>
              <button
                type="button"
                onClick={handleToggleFullPalette}
                disabled={!chartReady}
                className="h-9 rounded-md border border-[#d2dedb] bg-white text-xs font-medium text-[#3b4947] hover:bg-[#f7fbfa] disabled:cursor-not-allowed disabled:opacity-45"
              >
                  {showFullPalette ? "只看图中颜色" : "切换可用色域"}
              </button>
                <div className="max-h-52 overflow-auto rounded-md border border-[#dce5e2] bg-[#fbfdfc] p-2">
                  <div className="grid grid-cols-6 gap-1.5">
                    {(showFullPalette ? fullPaletteColors : currentGridColors).map(
                      (colorData) => {
                        const isSelected =
                          selectedColor?.color.toUpperCase() ===
                          colorData.color.toUpperCase();
                        return (
                          <button
                            key={`${colorData.key}-${colorData.color}`}
                            type="button"
                            onClick={() => handleColorSelect(colorData)}
                            className={
                              "h-7 w-7 rounded border shadow-inner transition " +
                              (isSelected
                                ? "border-[#17201f] ring-2 ring-[#1f9d8a]"
                                : "border-black/10 hover:scale-105")
                            }
                            style={{ backgroundColor: colorData.color }}
                            title={colorData.key}
                            aria-label={`选择 ${colorData.key}`}
                          />
                        );
                      },
                    )}
                  </div>
                </div>
              </div>
            ) : null}
            {isManualColoringMode && selection.size > 0 && (
              <div className="mt-3 rounded-md border border-[#d2dedb] bg-[#fbfdfc] p-3">
                <div className="mb-2 text-xs font-medium text-[#3b4947]">
                  已选 {selection.size} 格
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={handleReplaceSelection}
                    disabled={!selectedColor}
                    className="h-8 rounded-md border border-[#d2dedb] bg-white text-[11px] font-medium text-[#3b4947] hover:bg-[#f7fbfa] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    替换为当前色
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteSelection}
                    className="h-8 rounded-md border border-[#f0c9b9] bg-[#fff1eb] text-[11px] font-medium text-[#9c4324] hover:bg-[#ffe7dc]"
                  >
                    删除为空
                  </button>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="h-8 rounded-md border border-[#d2dedb] bg-white text-[11px] font-medium text-[#3b4947] hover:bg-[#f7fbfa]"
                  >
                    取消选择
                  </button>
                </div>
              </div>
            )}
          </section>
        </aside>
      </main>

      {isCustomPaletteEditorOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="h-[90vh] w-full max-w-5xl overflow-hidden rounded-lg bg-white p-4 shadow-xl">
            <CustomPaletteEditor
              allColors={fullBeadPalette}
              currentSelections={customPaletteSelections}
              onSelectionChange={handleSelectionChange}
              onSaveCustomPalette={handleSaveCustomPalette}
              onClose={() => setIsCustomPaletteEditorOpen(false)}
              onExportCustomPalette={handleExportCustomPalette}
              onImportCustomPalette={triggerImportPalette}
              selectedColorSystem={selectedColorSystem}
            />
          </div>
        </div>
      )}
      <ExportDialog
        isOpen={isDownloadSettingsOpen}
        onClose={() => setIsDownloadSettingsOpen(false)}
        canExport={chartReady}
        boardPreference={boardPreference}
        onBoardPreferenceChange={setBoardPreference}
        boardPlan={boardPlan}
        onPrintChart={handlePrintChartDownload}
        onMakerPack={handleMakerPackDownload}
      />
      {toastMessage && (
        <div
          className="fixed bottom-20 left-1/2 z-[200] -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#17201f] px-4 py-2 text-sm text-white shadow-lg"
          style={{ animation: "toastFadeInOut 2s ease-in-out" }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
