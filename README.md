# Juice 拼豆工作台

一个浏览器端拼豆图纸编译工作台：

```text
导入 JPG / PNG 或 CSV 图纸
→ 选择成品宽度与可用色域
→ 生成确定性的 MARD bead grid
→ 做有限局部修正
→ 导出打印图纸或制作包
```

V1 的产品边界很窄：Owner 已在线下选好中间图，网页只负责导入、编译、检查、局部编辑和导出。所有图像处理都在浏览器本地完成，不上传用户图片。

## 功能

- 图片导入：JPG / PNG。
- CSV 图纸恢复：导出的 HEX CSV 可重新导入并恢复内部 MARD key。
- 图纸编译：按成品宽度、取色方式、近似颜色合并阈值和可用色域生成 bead grid。
- 可用色域：MARD 全色、MARD 核心色、我的库存。
- 我的库存：用户维护自己的 MARD 颜色集合，数据保存在 localStorage。
- 图纸检查：宽高、颜色数、总豆数、图中颜色列表和颜色高亮。
- 局部编辑：单格上色、框选、替换为当前色、删除为空白、撤回、重做。
- 打印图纸导出：固定包含网格、10 格分组线、四侧坐标、格内 MARD 色号和 BOM。
- 制作包导出：单个 ZIP，包含总图、CSV、manifest 和按 52 / 104 钉板切分的 PNG。

## 非目标

V1 不做 AI 生图、提示词、素材库、自动评价、账号系统或服务器端图片处理。默认工作台也不保留独立制作模式、放大镜、浮动工具、自动背景处理、颜色排除后重编译、全图替色或导出外观微调。

## 快速开始

```bash
npm install
npm run dev
```

浏览器打开 `http://localhost:3000`。

## 验证

```bash
npm run check
```

`check` 会依次执行 typecheck、unit tests、lint、UI contract 和 production build。

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js + React + TypeScript |
| 样式 | Tailwind CSS |
| 图像处理 | Canvas API |
| 测试 | Vitest, Playwright |
| 部署 | Vercel |

## 许可证

[AGPL-3.0](./LICENSE)
