export const LIMITS = {
  maxUploadBytes: 12 * 1024 * 1024,       // 12MB
  maxSourcePixels: 24_000_000,            // 24MP
  maxGridWidth: 300,
  maxGridHeight: 300,
  maxGridCells: 90_000,                   // 300 × 300
  maxCsvBytes: 4 * 1024 * 1024,          // 4MB
  maxExportPixels: 80_000_000,            // 80MP
} as const;

export type LimitCheck = {
  ok: boolean;
  message?: string;
};

export function checkFileSize(bytes: number): LimitCheck {
  if (bytes > LIMITS.maxUploadBytes) {
    return { ok: false, message: `文件过大（${(bytes / 1024 / 1024).toFixed(1)}MB），上限 ${LIMITS.maxUploadBytes / 1024 / 1024}MB` };
  }
  return { ok: true };
}

export function checkImagePixels(width: number, height: number): LimitCheck {
  const pixels = width * height;
  if (pixels > LIMITS.maxSourcePixels) {
    return {
      ok: false,
      message: `图片像素过多（${(pixels / 1e6).toFixed(1)}MP），上限 ${LIMITS.maxSourcePixels / 1e6}MP`,
    };
  }
  return { ok: true };
}

export function checkGridSize(N: number, M: number): LimitCheck {
  if (N > LIMITS.maxGridWidth) {
    return { ok: false, message: `网格宽度 ${N} 超出上限 ${LIMITS.maxGridWidth}` };
  }
  if (M > LIMITS.maxGridHeight) {
    return { ok: false, message: `网格高度 ${M} 超出上限 ${LIMITS.maxGridHeight}` };
  }
  if (N * M > LIMITS.maxGridCells) {
    return { ok: false, message: `总格数 ${N * M} 超出上限 ${LIMITS.maxGridCells}` };
  }
  return { ok: true };
}

export function checkCsvSize(bytes: number): LimitCheck {
  if (bytes > LIMITS.maxCsvBytes) {
    return { ok: false, message: `CSV 文件过大（${(bytes / 1024 / 1024).toFixed(1)}MB），上限 ${LIMITS.maxCsvBytes / 1024 / 1024}MB` };
  }
  return { ok: true };
}

export function checkExportPixels(width: number, height: number): LimitCheck {
  const pixels = width * height;
  if (pixels > LIMITS.maxExportPixels) {
    return {
      ok: false,
      message: `导出画布过大（${(pixels / 1e6).toFixed(1)}MP），上限 ${LIMITS.maxExportPixels / 1e6}MP`,
    };
  }
  return { ok: true };
}
