import { app, BrowserWindow, ipcMain, dialog, Menu, shell, protocol, net } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { pathToFileURL } from 'url';

// 判断是否是开发模式
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

// 获取静态资源的基础路径
function getOutPath(): string {
  if (app.isPackaged) {
    // 打包后的路径
    return path.join(process.resourcesPath, 'out');
  }
  // 开发时的路径 (从 electron/dist/ 到项目根目录的 out/)
  return path.join(__dirname, '../../out');
}

// 注册自定义协议来处理本地资源
function registerLocalProtocol() {
  // 使用 app 协议来加载本地资源
  protocol.handle('app', (request) => {
    const url = new URL(request.url);
    // 将 app://./path 转换为本地文件路径
    let filePath = decodeURIComponent(url.pathname);

    // Windows 路径修复：移除开头的 /
    if (process.platform === 'win32' && filePath.startsWith('/')) {
      filePath = filePath.slice(1);
    }

    const fullPath = path.join(getOutPath(), filePath);

    // 使用 net.fetch 加载本地文件
    return net.fetch(pathToFileURL(fullPath).toString());
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    icon: path.join(__dirname, '../../public/icon-512x512.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false, // 先隐藏，加载完成后再显示
    titleBarStyle: 'default',
    backgroundColor: '#ffffff',
  });

  // 加载应用
  if (isDev) {
    // 开发模式：连接 Next.js 开发服务器
    mainWindow.loadURL('http://localhost:3000');
    // 打开开发者工具
    mainWindow.webContents.openDevTools();
  } else {
    // 生产模式：使用自定义协议加载，以正确处理绝对路径资源
    mainWindow.loadURL('app://./index.html');
  }

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // 处理外部链接
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 创建菜单
  createMenu();
}

function createMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        {
          label: '打开图片',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow?.webContents.send('menu-open-file');
          },
        },
        {
          label: '保存项目',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow?.webContents.send('menu-save-project');
          },
        },
        {
          label: '导出图纸',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow?.webContents.send('menu-export');
          },
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: '编辑',
      submenu: [
        {
          label: '撤销',
          accelerator: 'CmdOrCtrl+Z',
          click: () => {
            mainWindow?.webContents.send('menu-undo');
          },
        },
        {
          label: '重做',
          accelerator: 'CmdOrCtrl+Y',
          click: () => {
            mainWindow?.webContents.send('menu-redo');
          },
        },
        { type: 'separator' },
        { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
      ],
    },
    {
      label: '视图',
      submenu: [
        {
          label: '放大',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => {
            mainWindow?.webContents.send('menu-zoom-in');
          },
        },
        {
          label: '缩小',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            mainWindow?.webContents.send('menu-zoom-out');
          },
        },
        {
          label: '重置缩放',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            mainWindow?.webContents.send('menu-zoom-reset');
          },
        },
        { type: 'separator' },
        {
          label: '全屏',
          accelerator: 'F11',
          click: () => {
            if (mainWindow) {
              mainWindow.setFullScreen(!mainWindow.isFullScreen());
            }
          },
        },
        { type: 'separator' },
        {
          label: '开发者工具',
          accelerator: 'F12',
          click: () => {
            mainWindow?.webContents.toggleDevTools();
          },
        },
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: '关于',
              message: '七卡瓦拼豆底稿生成器',
              detail: `版本: ${app.getVersion()}\n\n让你轻松制作精美的像素画作品`,
            });
          },
        },
        {
          label: '访问官网',
          click: () => {
            shell.openExternal('https://perler.qikawa.fun');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC 处理器

// 打开文件对话框
ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [
      { name: '图片文件', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'] },
      { name: '所有文件', extensions: ['*'] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const fileBuffer = fs.readFileSync(filePath);
  const base64 = fileBuffer.toString('base64');
  const ext = path.extname(filePath).toLowerCase().slice(1);
  const mimeType = ext === 'jpg' ? 'jpeg' : ext;

  return {
    path: filePath,
    name: path.basename(filePath),
    dataUrl: `data:image/${mimeType};base64,${base64}`,
  };
});

// 保存文件对话框
ipcMain.handle('dialog:saveFile', async (_, options: { 
  defaultName?: string; 
  filters?: { name: string; extensions: string[] }[];
  data: string;
}) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: options.defaultName || 'export.png',
    filters: options.filters || [
      { name: 'PNG 图片', extensions: ['png'] },
      { name: 'JPEG 图片', extensions: ['jpg', 'jpeg'] },
    ],
  });

  if (result.canceled || !result.filePath) {
    return { success: false, path: null };
  }

  try {
    // 处理 base64 数据
    const base64Data = options.data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(result.filePath, buffer);
    return { success: true, path: result.filePath };
  } catch (error) {
    console.error('保存文件失败:', error);
    return { success: false, path: null, error: String(error) };
  }
});

// 保存 CSV 文件
ipcMain.handle('dialog:saveCsv', async (_, options: {
  defaultName?: string;
  data: string;
}) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: options.defaultName || 'export.csv',
    filters: [
      { name: 'CSV 文件', extensions: ['csv'] },
    ],
  });

  if (result.canceled || !result.filePath) {
    return { success: false, path: null };
  }

  try {
    fs.writeFileSync(result.filePath, options.data, 'utf-8');
    return { success: true, path: result.filePath };
  } catch (error) {
    console.error('保存 CSV 失败:', error);
    return { success: false, path: null, error: String(error) };
  }
});

// 获取应用版本
ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

// 注册自定义协议为特权协议（必须在 app ready 之前）
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

// 应用生命周期
app.whenReady().then(() => {
  // 注册本地资源协议（生产模式）
  if (!isDev) {
    registerLocalProtocol();
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 处理证书错误（开发模式）
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (isDev) {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});
