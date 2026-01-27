const fs = require("fs");
const path = require("path");
const pngToIcoModule = require("png-to-ico");
const pngToIco = pngToIcoModule.default || pngToIcoModule.imagesToIco;

async function main() {
  const root = path.join(__dirname, "..");
  const publicDir = path.join(root, "public");
  const buildDir = path.join(root, "build");

  if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });

  // 优先使用已有的多尺寸 png（越多尺寸，Windows 显示越清晰）
  const candidates = [
    "icon-16x16.png",
    "icon-24x24.png",
    "icon-32x32.png",
    "icon-48x48.png",
    "icon-64x64.png",
    "icon-128x128.png",
    "icon-192x192.png",
    "icon-256x256.png",
    "icon-384x384.png",
    "icon-512x512.png",
  ]
    .map((f) => path.join(publicDir, f))
    .filter((p) => fs.existsSync(p));

  if (candidates.length === 0) {
    throw new Error(
      "未找到 public/icon-*.png，请先确保 public 目录下有图标 PNG（例如 icon-512x512.png）"
    );
  }

  const buffers = candidates.map((p) => fs.readFileSync(p));
  const icoBuffer = await pngToIco(buffers);

  const outPath = path.join(buildDir, "icon.ico");
  fs.writeFileSync(outPath, icoBuffer);

  console.log(`ICO 已生成: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

