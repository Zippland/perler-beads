import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const page = readFileSync(join(root, 'src/app/page.tsx'), 'utf8');
const layout = readFileSync(join(root, 'src/app/layout.tsx'), 'utf8');
const imageDownloader = readFileSync(join(root, 'src/utils/imageDownloader.ts'), 'utf8');
const exportDialog = readFileSync(join(root, 'src/features/workbench/ExportDialog.tsx'), 'utf8');

const combined = `${page}\n${layout}\n${imageDownloader}\n${exportDialog}`;

const forbidden = [
  '七卡瓦',
  'Perler Beads Generator',
  '专业工作台',
  '小红书',
  'GitHub',
  '请作者喝一杯奶茶',
  'donation-qr',
  'busuanzi',
  'perlerbeads.zippland.com',
  'xiaohongshu.com',
  'github.com/Zippland/perler-beads',
  '专心拼豆',
  '放大镜',
  '浮动工具',
  '浮动调色',
  '去背景',
  '背景去除',
  '显示排除',
  '排除颜色',
  '导出文件',
  'image/gif',
  'MARD 色包',
  'MARD 全 291 色',
  'MARD 核心 221 色',
];

for (const term of forbidden) {
  assert.equal(
    combined.includes(term),
    false,
    `Forbidden legacy/external term remains: ${term}`,
  );
}

assert.equal(combined.includes('Juice拼豆'), true, 'Product name Juice拼豆 is missing.');
assert.equal(page.includes('data-workbench-shell'), true, 'Workbench shell marker is missing.');
assert.equal(page.includes('data-canvas-stage'), true, 'Canvas stage marker is missing.');
assert.equal(page.includes('data-transform-panel'), true, 'Transform panel marker is missing.');
assert.equal(page.includes('data-palette-panel'), true, 'Palette cleanup panel marker is missing.');
assert.equal(page.includes('data-action-bar'), false, 'Retired bottom action bar marker remains.');
assert.equal(exportDialog.includes('下载打印图纸 PNG'), true, 'Print chart export action is missing.');
assert.equal(exportDialog.includes('下载制作包'), true, 'Maker pack export action is missing.');

console.log('UI contract passed.');
