# Handoff — perler-beads-workbench

> 2026-06-23 · 两轮评审 + Vercel 部署

## 上线

Vercel Dashboard: https://vercel.com/dashboard → 项目 `perler-beads`
源码: https://github.com/kylanlyu-art/perler-beads

## 4 个 commit

| Commit | 内容 |
|--------|------|
| `b9b3067` | chore: vercel.json |
| `bece6d7` | fix: P0 二审（输入门禁、CSV 校验、GIF 检查） |
| `2173c85` | fix: P0 一审（生产入口、色板一致性、安全头、资源上限） |
| `292c130` | feat: 去二维码 + 色号排版 + 响应式断点 |

## 功能变更

### 导出图纸
- 去掉标题栏二维码，改为 "Juice拼豆"
- 色号统计区: `[圆角色块] 色号  数量颗` 左对齐，字号统一缩放
- 旧域名 `perlerbeads.zippland.com` 全部移除

### UI
- 三栏响应式: `md:` 断点 768px+，侧边栏 sticky
- 七卡瓦→Juice 品牌统一

### 色板状态
- 两个 effect 合并为单一 `useMemo` → `activePalette`
- 删除重复 `activeBeadPalette` state

### 安全 & 运维
- 安全 headers (X-Content-Type-Options 等)
- PWA 缓存收紧 + skipWaiting: false
- `/api/healthz` + `/api/version`
- `output: "standalone"` + Dockerfile
- `check` pipeline: typecheck + lint + verify + build

### 资源上限
| 限制 | 值 |
|------|-----|
| 文件大小 | 12MB |
| 源图像素 | 24MP |
| 网格 | 300×300, 90k cells |
| CSV | 4MB + 色板校验 |
| 导出画布 | 32MP |
| Oklab 缓存 | 5000 LRU |

## 后续建议

| 优先级 | 项目 |
|--------|------|
| P1 | Web Worker 编译 |
| P1 | 测试套件 (vitest + Playwright) |
| P1 | SW 更新提示 UI |
| P2 | AGPL 合规声明 |
| P2 | 错误监控 |

## 命令

```bash
npm run dev       # http://127.0.0.1:3100
npm run check     # typecheck + lint + verify + build
npm run build     # 生产构建
docker build -t perler-beads .
```
