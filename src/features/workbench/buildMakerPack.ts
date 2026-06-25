import { BoardPlan } from '../../domain/boards/boardPlan';
import { deriveChartStats } from '../../domain/chart/chartStats';
import { MappedPixel, PaletteColor } from '../../utils/pixelation';

export interface MakerPackBomItem {
  mardCode: string;
  hex: string;
  count: number;
  percentage: number;
}

export interface MakerPackManifest {
  version: 1;
  generatedAt: string;
  grid: { N: number; M: number };
  inventoryPresetId: string;
  boardPlan: BoardPlan;
  bom: MakerPackBomItem[];
}

export interface MakerPackFile {
  path: string;
  bytes: Uint8Array;
}

export function listMakerPackPaths(boardPlan: BoardPlan): string[] {
  return [
    'print-chart.png',
    'pattern.csv',
    'manifest.json',
    ...boardPlan.boards.map((board) => `boards/${board.id}.png`),
  ];
}

export function buildMakerPackManifest(input: {
  mappedPixelData: MappedPixel[][];
  gridDimensions: { N: number; M: number };
  inventoryPresetId: string;
  boardPlan: BoardPlan;
  activeBeadPalette: PaletteColor[];
  generatedAt?: string;
}): MakerPackManifest {
  const stats = deriveChartStats(input.mappedPixelData);
  const paletteKeyByHex = new Map(
    input.activeBeadPalette.map((color) => [color.hex.toUpperCase(), color.key]),
  );

  return {
    version: 1,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    grid: input.gridDimensions,
    inventoryPresetId: input.inventoryPresetId,
    boardPlan: input.boardPlan,
    bom: stats.colorUsage
      .map((usage) => ({
        mardCode: paletteKeyByHex.get(usage.hex.toUpperCase()) ?? usage.key,
        hex: usage.hex,
        count: usage.count,
        percentage: stats.totalBeadCount === 0 ? 0 : usage.count / stats.totalBeadCount,
      }))
      .sort((a, b) => a.mardCode.localeCompare(b.mardCode)),
  };
}

function makeCrc32Table(): Uint32Array {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index++) {
    let value = index;
    for (let bit = 0; bit < 8; bit++) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
}

const CRC32_TABLE = makeCrc32Table();

function crc32(bytes: Uint8Array): number {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value = CRC32_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function writeUint16(output: number[], value: number): void {
  output.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeUint32(output: number[], value: number): void {
  output.push(
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  );
}

function appendBytes(output: number[], bytes: Uint8Array): void {
  for (const byte of bytes) output.push(byte);
}

export function buildStoredZipBlob(files: MakerPackFile[]): Blob {
  const encoder = new TextEncoder();
  const output: number[] = [];
  const centralDirectory: number[] = [];

  for (const file of files) {
    const nameBytes = encoder.encode(file.path);
    const checksum = crc32(file.bytes);
    const localHeaderOffset = output.length;

    writeUint32(output, 0x04034b50);
    writeUint16(output, 20);
    writeUint16(output, 0);
    writeUint16(output, 0);
    writeUint16(output, 0);
    writeUint16(output, 0);
    writeUint32(output, checksum);
    writeUint32(output, file.bytes.length);
    writeUint32(output, file.bytes.length);
    writeUint16(output, nameBytes.length);
    writeUint16(output, 0);
    appendBytes(output, nameBytes);
    appendBytes(output, file.bytes);

    writeUint32(centralDirectory, 0x02014b50);
    writeUint16(centralDirectory, 20);
    writeUint16(centralDirectory, 20);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint32(centralDirectory, checksum);
    writeUint32(centralDirectory, file.bytes.length);
    writeUint32(centralDirectory, file.bytes.length);
    writeUint16(centralDirectory, nameBytes.length);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint32(centralDirectory, 0);
    writeUint32(centralDirectory, localHeaderOffset);
    appendBytes(centralDirectory, nameBytes);
  }

  const centralDirectoryOffset = output.length;
  appendBytes(output, new Uint8Array(centralDirectory));
  writeUint32(output, 0x06054b50);
  writeUint16(output, 0);
  writeUint16(output, 0);
  writeUint16(output, files.length);
  writeUint16(output, files.length);
  writeUint32(output, centralDirectory.length);
  writeUint32(output, centralDirectoryOffset);
  writeUint16(output, 0);

  return new Blob([new Uint8Array(output)], { type: 'application/zip' });
}
