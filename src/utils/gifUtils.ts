/**
 * GIF 工具函数 - 提取 GIF 第一帧
 * 
 * GIF 文件格式解析，提取第一帧并转换为 PNG DataURL
 */

interface GifFrame {
  width: number;
  height: number;
  imageData: ImageData;
  delay: number; // 帧延迟（毫秒）
}

interface GifInfo {
  width: number;
  height: number;
  frames: GifFrame[];
  loopCount: number;
}

/**
 * 从 GIF 文件中提取第一帧
 * @param file GIF 文件
 * @returns PNG DataURL（第一帧）
 */
export async function extractFirstFrameFromGif(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const gifInfo = await parseGif(arrayBuffer);
        
        if (gifInfo.frames.length === 0) {
          throw new Error('GIF 文件中没有有效的帧');
        }
        
        // 获取第一帧
        const firstFrame = gifInfo.frames[0];
        
        // 转换为 Canvas 然后导出为 PNG
        const canvas = document.createElement('canvas');
        canvas.width = firstFrame.width;
        canvas.height = firstFrame.height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('无法创建 Canvas 上下文');
        }
        
        ctx.putImageData(firstFrame.imageData, 0, 0);
        
        // 导出为 PNG DataURL
        const pngDataUrl = canvas.toDataURL('image/png');
        resolve(pngDataUrl);
        
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('读取 GIF 文件失败'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 解析 GIF 文件
 */
async function parseGif(arrayBuffer: ArrayBuffer): Promise<GifInfo> {
  const data = new Uint8Array(arrayBuffer);
  let offset = 0;
  
  // 验证 GIF 文件头
  const header = String.fromCharCode(...data.slice(0, 6));
  if (header !== 'GIF87a' && header !== 'GIF89a') {
    throw new Error('不是有效的 GIF 文件');
  }
  offset = 6;
  
  // 读取逻辑屏幕描述符
  const width = data[offset] | (data[offset + 1] << 8);
  const height = data[offset + 2] | (data[offset + 3] << 8);
  const packed = data[offset + 4];
  const hasGlobalColorTable = (packed & 0x80) !== 0;
  const globalColorTableSize = 1 << ((packed & 0x07) + 1);
  
  offset = 13;
  
  // 读取全局颜色表
  let globalColorTable: number[][] = [];
  if (hasGlobalColorTable) {
    globalColorTable = [];
    for (let i = 0; i < globalColorTableSize; i++) {
      const r = data[offset + i * 3];
      const g = data[offset + i * 3 + 1];
      const b = data[offset + i * 3 + 2];
      globalColorTable.push([r, g, b]);
    }
    offset += globalColorTableSize * 3;
  }
  
  // 解析帧
  const frames: GifFrame[] = [];
  let graphicsControlExtension: {
    disposalMethod: number;
    userInput: boolean;
    transparentColor: boolean;
    delayTime: number;
    transparentColorIndex: number;
  } | null = null;
  
  const loopCount = 0;
  let frameWidth = width;
  let frameHeight = height;
  let frameX = 0;
  let frameY = 0;
  
  // eslint-disable-next-line no-constant-condition
  while (offset < data.length) {
    const blockType = data[offset];
    
    switch (blockType) {
      case 0x21: // 扩展块
        offset++;
        const extensionLabel = data[offset];
        offset++;
        
        switch (extensionLabel) {
          case 0xF9: // 图形控制扩展
            const blockSize = data[offset];
            offset++;
            const gcePacked = data[offset];
            const disposalMethod = (gcePacked >> 2) & 0x07;
            const userInput = (gcePacked & 0x02) !== 0;
            const transparentColor = (gcePacked & 0x01) !== 0;
            const delayTime = (data[offset + 1] | (data[offset + 2] << 8)) * 10; // 转换为毫秒
            const transparentColorIndex = data[offset + 3];
            offset += blockSize;
            offset++; // 块终止符
            
            graphicsControlExtension = {
              disposalMethod,
              userInput,
              transparentColor,
              delayTime,
              transparentColorIndex
            };
            break;
            
          case 0xFF: // 应用扩展
            const appBlockSize = data[offset];
            offset++;
            offset += appBlockSize;
            
            // 跳过子块
            while (data[offset] !== 0) {
              offset += data[offset] + 1;
            }
            offset++; // 块终止符
            break;
            
          case 0xFE: // 注释扩展
          case 0x01: // 纯文本扩展
            // 跳过子块
            while (data[offset] !== 0) {
              offset += data[offset] + 1;
            }
            offset++; // 块终止符
            break;
            
          default:
            // 跳过未知扩展
            while (data[offset] !== 0) {
              offset += data[offset] + 1;
            }
            offset++; // 块终止符
        }
        break;
        
      case 0x2C: // 图像描述符
        offset++;
        frameX = data[offset] | (data[offset + 1] << 8);
        frameY = data[offset + 2] | (data[offset + 3] << 8);
        frameWidth = data[offset + 4] | (data[offset + 5] << 8);
        frameHeight = data[offset + 6] | (data[offset + 7] << 8);
        const imgPacked = data[offset + 8];
        const hasLocalColorTable = (imgPacked & 0x80) !== 0;
        const interlaced = (imgPacked & 0x40) !== 0;
        const localColorTableSize = 1 << ((imgPacked & 0x07) + 1);
        offset += 9;
        
        // 读取局部颜色表（如果有）
        let colorTable = globalColorTable;
        if (hasLocalColorTable) {
          colorTable = [];
          for (let i = 0; i < localColorTableSize; i++) {
            const r = data[offset + i * 3];
            const g = data[offset + i * 3 + 1];
            const b = data[offset + i * 3 + 2];
            colorTable.push([r, g, b]);
          }
          offset += localColorTableSize * 3;
        }
        
        // 读取 LZW 最小代码大小
        const lzwMinCodeSize = data[offset];
        offset++;
        
        // 收集图像数据
        const subBlocks: number[] = [];
        while (data[offset] !== 0) {
          const blockSize = data[offset];
          offset++;
          for (let i = 0; i < blockSize; i++) {
            subBlocks.push(data[offset + i]);
          }
          offset += blockSize;
        }
        offset++; // 块终止符
        
        // 解码 LZW 压缩数据
        const decodedIndices = decodeLZW(new Uint8Array(subBlocks), lzwMinCodeSize);
        
        // 创建 ImageData
        const imgData = new Uint8ClampedArray(width * height * 4);
        
        // 如果是第一帧，初始化为透明
        if (frames.length === 0) {
          for (let i = 0; i < imgData.length; i += 4) {
            imgData[i] = 0;     // R
            imgData[i + 1] = 0; // G
            imgData[i + 2] = 0; // B
            imgData[i + 3] = 0; // A (透明)
          }
        } else {
          // 复制上一帧
          const prevFrame = frames[frames.length - 1];
          const prevData = prevFrame.imageData.data;
          for (let i = 0; i < prevData.length; i++) {
            imgData[i] = prevData[i];
          }
        }
        
        // 处理隔行扫描
        const passOffsets = [0, 4, 2, 1];
        const passSteps = [8, 8, 4, 2];
        let pixelIndex = 0;
        
        if (interlaced) {
          for (let pass = 0; pass < 4; pass++) {
            for (let y = passOffsets[pass]; y < frameHeight; y += passSteps[pass]) {
              for (let x = 0; x < frameWidth; x++) {
                const index = decodedIndices[pixelIndex++];
                const px = frameX + x;
                const py = frameY + y;
                
                if (px < width && py < height) {
                  const pos = (py * width + px) * 4;
                  
                  if (graphicsControlExtension?.transparentColor && 
                      index === graphicsControlExtension.transparentColorIndex) {
                    // 透明像素，保持不变
                  } else if (index < colorTable.length) {
                    imgData[pos] = colorTable[index][0];
                    imgData[pos + 1] = colorTable[index][1];
                    imgData[pos + 2] = colorTable[index][2];
                    imgData[pos + 3] = 255;
                  }
                }
              }
            }
          }
        } else {
          for (let y = 0; y < frameHeight; y++) {
            for (let x = 0; x < frameWidth; x++) {
              const index = decodedIndices[pixelIndex++];
              const px = frameX + x;
              const py = frameY + y;
              
              if (px < width && py < height) {
                const pos = (py * width + px) * 4;
                
                if (graphicsControlExtension?.transparentColor && 
                    index === graphicsControlExtension.transparentColorIndex) {
                  // 透明像素，保持不变
                } else if (index < colorTable.length) {
                  imgData[pos] = colorTable[index][0];
                  imgData[pos + 1] = colorTable[index][1];
                  imgData[pos + 2] = colorTable[index][2];
                  imgData[pos + 3] = 255;
                }
              }
            }
          }
        }
        
        // 创建帧
        frames.push({
          width,
          height,
          imageData: new ImageData(imgData, width, height),
          delay: graphicsControlExtension?.delayTime || 100
        });
        
        // 重置图形控制扩展
        graphicsControlExtension = null;
        
        // 只提取第一帧
        if (frames.length === 1) {
          return {
            width,
            height,
            frames,
            loopCount
          };
        }
        break;
        
      case 0x3B: // GIF 结束符
        return {
          width,
          height,
          frames,
          loopCount
        };
        
      default:
        // 跳过未知块
        offset++;
    }
  }
  
  return {
    width,
    height,
    frames,
    loopCount
  };
}

// LZW 解码最大输出像素数，防止恶意构造的 GIF 导致内存溢出
const MAX_LZW_OUTPUT_SIZE = 10000000;

/**
 * LZW 解码器
 */
function decodeLZW(data: Uint8Array, minCodeSize: number): number[] {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  
  let codeSize = minCodeSize + 1;
  let nextCode = endCode + 1;
  
  // 初始化代码表
  const codeTable: number[][] = [];
  for (let i = 0; i < clearCode; i++) {
    codeTable[i] = [i];
  }
  codeTable[clearCode] = [];
  codeTable[endCode] = [];
  
  const output: number[] = [];
  let bitBuffer = 0;
  let bitCount = 0;
  let byteIndex = 0;
  
  function readBits(bits: number): number {
    while (bitCount < bits) {
      if (byteIndex >= data.length) return -1;
      bitBuffer |= data[byteIndex++] << bitCount;
      bitCount += 8;
    }
    const value = bitBuffer & ((1 << bits) - 1);
    bitBuffer >>>= bits;
    bitCount -= bits;
    return value;
  }
  
  function resetDecoder(): void {
    codeSize = minCodeSize + 1;
    nextCode = endCode + 1;
    codeTable.length = endCode + 1;
  }
  
  let prevCode = -1;
  
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const code = readBits(codeSize);
    if (code === -1 || code === endCode) break;
    
    if (code === clearCode) {
      resetDecoder();
      prevCode = -1;
      continue;
    }
    
    if (prevCode === -1) {
      if (code < codeTable.length) {
        output.push(...codeTable[code]);
      }
      prevCode = code;
      continue;
    }
    
    let entry: number[];
    
    if (code < codeTable.length) {
      entry = codeTable[code];
    } else if (code === nextCode) {
      entry = [...codeTable[prevCode], codeTable[prevCode][0]];
    } else {
      throw new Error(`无效的 LZW 代码: ${code}`);
    }
    
    output.push(...entry);
    
    // 防止恶意 GIF 导致输出过大
    if (output.length > MAX_LZW_OUTPUT_SIZE) {
      throw new Error('GIF 图像数据过大');
    }
    
    // 添加新代码到表
    if (nextCode < 4096) {
      codeTable[nextCode] = [...codeTable[prevCode], entry[0]];
      nextCode++;
      
      if (nextCode >= (1 << codeSize) && codeSize < 12) {
        codeSize++;
      }
    }
    
    prevCode = code;
  }
  
  return output;
}

/**
 * 检查文件是否为 GIF
 */
export function isGifFile(file: File): boolean {
  return file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
}
