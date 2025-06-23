const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [192, 256, 384, 512];

const generateIcon = async (size) => {
  const svg = `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8B5CF6;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#3B82F6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#10B981;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#000000"/>
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="url(#grad1)" opacity="0.1"/>
  
  <!-- 拼豆图案 -->
  <g transform="translate(${size * 0.2}, ${size * 0.2})">
    ${generatePixelPattern(size * 0.6)}
  </g>
  
  <!-- 文字 -->
  <text x="${size / 2}" y="${size * 0.85}" font-family="Arial, sans-serif" font-size="${size * 0.1}" font-weight="bold" text-anchor="middle" fill="white">拼豆</text>
</svg>
  `;

  const outputPath = path.join(__dirname, '..', 'public', `icon-${size}x${size}.png`);
  
  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);
    
  console.log(`生成图标: ${outputPath}`);
};

function generatePixelPattern(size) {
  const pixelSize = size / 8;
  const colors = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];
  let pattern = '';
  
  for (let y = 0; y < 6; y++) {
    for (let x = 0; x < 6; x++) {
      if (Math.random() > 0.3) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        pattern += `<rect x="${x * pixelSize}" y="${y * pixelSize}" width="${pixelSize * 0.9}" height="${pixelSize * 0.9}" rx="${pixelSize * 0.1}" fill="${color}" opacity="0.8"/>`;
      }
    }
  }
  
  return pattern;
}

async function generateAllIcons() {
  for (const size of sizes) {
    await generateIcon(size);
  }
}

generateAllIcons().catch(console.error);