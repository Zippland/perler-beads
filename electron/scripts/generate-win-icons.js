const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

async function main() {
  const root = path.join(__dirname, "..");
  const publicDir = path.join(root, "public");
  const src = path.join(publicDir, "icon-512x512.png");

  if (!fs.existsSync(src)) {
    throw new Error(`未找到源图标: ${src}`);
  }

  const sizes = [16, 24, 32, 48, 64, 128, 256];

  for (const size of sizes) {
    const out = path.join(publicDir, `icon-${size}x${size}.png`);
    await sharp(src).resize(size, size).png().toFile(out);
    console.log(`生成: ${out}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

