# Handoff — perler-beads-workbench

> 2026-06-23 · Claude Code

## 本次变更

### 1. 去掉导出图纸中的七卡瓦二维码
- `src/utils/imageDownloader.ts` 行 253-256：删除 QR 图片加载
- `src/utils/imageDownloader.ts` 行 442-469：删除标题栏 QR 渲染（~30 行）
- `src/utils/imageDownloader.ts` 行 840-850：删除 QR 加载回调，改为直接 `processDownload()`
- 标题栏右侧改为显示网址文字 `perlerbeads.zippland.com`
- `public/website_qrcode.png`：删除
- `public/manifest.json`：name/short_name/description 改为 Juice拼豆

### 2. 优化色号统计区排版
- `src/utils/imageDownloader.ts` 行 620-772 重写统计区：
  - 引入 `scaleFactor = max(1.0, availableStatsWidth / 800)` 统一缩放
  - `swatchSize = 18 * scaleFactor`, `itemFontSize = 13 * scaleFactor`, `countFontSize = 12 * scaleFactor`
  - 布局改为 `[圆角色块] 色号  数量颗` 三者左对齐
  - 色号：`600 weight #1F2937`；数量：`400 weight #6B7280`（略小灰色）
  - 色块改用 `ctx.roundRect()` 圆角
  - 标题：「色号与用量」；总量：「合计 · N 颗」+ 分隔线
  - 预估高度计算简化（`statsHeight = 36 + rows * rowH + 60 + ...`）

### 3. 修复响应式布局
- `src/app/page.tsx` 行 1950：三栏 grid 断点从 `lg:` 降到 `md:`
  - `md:grid-cols-[240px_minmax(0,1fr)_260px]`
  - `lg:grid-cols-[300px_minmax(0,1fr)_320px]`
- 左右侧边栏 sticky 定位同步：`md:sticky md:top-[72px] md:h-[...] md:overflow-auto`

### 附：预存改动（七卡瓦→Juice 品牌统一）
- `src/app/layout.tsx`：title "七卡瓦拼豆底稿生成器" → "Juice拼豆 | 拼豆图纸工作台"
- `src/components/CompletionCard.tsx`：水印文字改名
- `src/app/page.tsx`：UI 重构为三栏工作台（左：源图/参数/色板，中：画布，右：颜色/编辑工具）
- `src/components/PixelatedPreviewCanvas.tsx`：新增 canvasWidth/canvasHeight/zoom props
- `src/components/DonationModal.tsx`：已移除
- `package.json`：小改动

## 项目信息

| 项 | 值 |
|----|-----|
| 目录 | `/Users/lvxiaolin/workspace/perler-beads-workbench/` |
| 框架 | Next.js 15 + TypeScript + Tailwind CSS |
| 线上 | perlerbeads.zippland.com / perlerbeadsold.zippland.com |
| 本地 | `npm run dev` → http://127.0.0.1:3100 |
| 构建 | `npm run build` ✅ |
| 类型检查 | `npx tsc --noEmit` ✅ |

## 关键文件

```
src/
├── app/page.tsx              # 主页面（三栏布局）
├── app/layout.tsx            # 根布局
├── app/colorSystemMapping.json  # 291色 × 5品牌色号映射
├── utils/imageDownloader.ts    # 导出下载（本次主要修改）
├── components/PixelatedPreviewCanvas.tsx  # 画布渲染
├── components/CompletionCard.tsx          # 完成卡片
└── public/manifest.json      # PWA 配置
```

## 暂存文件

- `public/website_qrcode.png` 已删除（不再需要）
- `src/components/DonationModal.tsx` 已删除（预存改动）

## 未提交的 git 变更

```
9 files, +374 −1276
  M package.json
  M public/manifest.json
  D public/website_qrcode.png
  M src/app/layout.tsx
  M src/app/page.tsx
  M src/components/CompletionCard.tsx
  D src/components/DonationModal.tsx
  M src/components/PixelatedPreviewCanvas.tsx
  M src/utils/imageDownloader.ts
```

建议：确认 UI 正常后提交。
