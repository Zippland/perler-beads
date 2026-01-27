import { contextBridge, ipcRenderer } from 'electron';

// 定义暴露给渲染进程的 API 类型
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

// 安全地暴露 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件操作
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (options: Parameters<ElectronAPI['saveFile']>[0]) => 
    ipcRenderer.invoke('dialog:saveFile', options),
  saveCsv: (options: Parameters<ElectronAPI['saveCsv']>[0]) => 
    ipcRenderer.invoke('dialog:saveCsv', options),
  
  // 应用信息
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  
  // 菜单事件监听
  onMenuOpenFile: (callback: () => void) => {
    ipcRenderer.on('menu-open-file', callback);
  },
  onMenuSaveProject: (callback: () => void) => {
    ipcRenderer.on('menu-save-project', callback);
  },
  onMenuExport: (callback: () => void) => {
    ipcRenderer.on('menu-export', callback);
  },
  onMenuUndo: (callback: () => void) => {
    ipcRenderer.on('menu-undo', callback);
  },
  onMenuRedo: (callback: () => void) => {
    ipcRenderer.on('menu-redo', callback);
  },
  onMenuZoomIn: (callback: () => void) => {
    ipcRenderer.on('menu-zoom-in', callback);
  },
  onMenuZoomOut: (callback: () => void) => {
    ipcRenderer.on('menu-zoom-out', callback);
  },
  onMenuZoomReset: (callback: () => void) => {
    ipcRenderer.on('menu-zoom-reset', callback);
  },
  
  // 移除监听器
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
} as ElectronAPI);
