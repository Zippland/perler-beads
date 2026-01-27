/**
 * Electron 环境检测和 API 封装工具
 */

// 检测是否在 Electron 环境中运行
export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && 
         (window as Window & { electronAPI?: unknown }).electronAPI !== undefined;
};

// 获取 Electron API（如果可用）
export const getElectronAPI = () => {
  if (isElectron()) {
    return (window as Window & { electronAPI: ElectronAPI }).electronAPI;
  }
  return null;
};

// Electron API 类型定义
export interface ElectronAPI {
  // 文件操作
  openFile: () => Promise<{
    path: string;
    name: string;
    dataUrl: string;
  } | null>;
  
  saveFile: (options: {
    defaultName?: string;
    filters?: { name: string; extensions: string[] }[];
    data: string;
  }) => Promise<{ success: boolean; path: string | null; error?: string }>;
  
  saveCsv: (options: {
    defaultName?: string;
    data: string;
  }) => Promise<{ success: boolean; path: string | null; error?: string }>;
  
  // 应用信息
  getVersion: () => Promise<string>;
  
  // 菜单事件监听
  onMenuOpenFile: (callback: () => void) => void;
  onMenuSaveProject: (callback: () => void) => void;
  onMenuExport: (callback: () => void) => void;
  onMenuUndo: (callback: () => void) => void;
  onMenuRedo: (callback: () => void) => void;
  onMenuZoomIn: (callback: () => void) => void;
  onMenuZoomOut: (callback: () => void) => void;
  onMenuZoomReset: (callback: () => void) => void;
  
  // 移除监听器
  removeAllListeners: (channel: string) => void;
}

// 扩展 Window 类型
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

/**
 * 使用 Electron 原生文件对话框打开图片
 * 如果不在 Electron 环境中，返回 null
 */
export const openFileWithElectron = async (): Promise<{
  path: string;
  name: string;
  dataUrl: string;
} | null> => {
  const api = getElectronAPI();
  if (!api) return null;
  
  try {
    return await api.openFile();
  } catch (error) {
    console.error('Electron openFile error:', error);
    return null;
  }
};

/**
 * 使用 Electron 原生文件对话框保存图片
 * @param dataUrl 图片的 base64 数据
 * @param defaultName 默认文件名
 * @returns 保存结果
 */
export const saveFileWithElectron = async (
  dataUrl: string,
  defaultName: string = 'export.png'
): Promise<{ success: boolean; path: string | null; error?: string }> => {
  const api = getElectronAPI();
  if (!api) {
    return { success: false, path: null, error: 'Not in Electron environment' };
  }
  
  try {
    return await api.saveFile({
      defaultName,
      data: dataUrl,
    });
  } catch (error) {
    console.error('Electron saveFile error:', error);
    return { success: false, path: null, error: String(error) };
  }
};

/**
 * 使用 Electron 原生文件对话框保存 CSV
 * @param csvData CSV 数据字符串
 * @param defaultName 默认文件名
 * @returns 保存结果
 */
export const saveCsvWithElectron = async (
  csvData: string,
  defaultName: string = 'export.csv'
): Promise<{ success: boolean; path: string | null; error?: string }> => {
  const api = getElectronAPI();
  if (!api) {
    return { success: false, path: null, error: 'Not in Electron environment' };
  }
  
  try {
    return await api.saveCsv({
      defaultName,
      data: csvData,
    });
  } catch (error) {
    console.error('Electron saveCsv error:', error);
    return { success: false, path: null, error: String(error) };
  }
};

/**
 * 获取应用版本号
 */
export const getAppVersion = async (): Promise<string | null> => {
  const api = getElectronAPI();
  if (!api) return null;
  
  try {
    return await api.getVersion();
  } catch (error) {
    console.error('Electron getVersion error:', error);
    return null;
  }
};
