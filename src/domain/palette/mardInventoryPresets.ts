import colorSystemMapping from '../../app/colorSystemMapping.json';

export type MardInventoryPresetId =
  | 'mard-full'
  | 'mard-core'
  | 'mard-custom';

export interface MardInventoryPreset {
  id: MardInventoryPresetId;
  label: string;
  expectedColorCount: number;
  mardCodes: readonly string[];
  source: 'mard_palette_dataset_2026-06-24' | 'user-defined';
  notes: string;
}

const MARD_CATALOG_CODES = Object.values(colorSystemMapping).map((entry) => entry.MARD);
const CORE_SERIES = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'M']);

function getSeries(code: string): string {
  return /^[A-Z]+/.exec(code)?.[0] ?? '';
}

const MARD_CORE_221_CODES = MARD_CATALOG_CODES.filter((code) => CORE_SERIES.has(getSeries(code)));

export const RETAIL_TIER_WARNING =
  '24/48/72/96/120/144 色不是可脱离店铺 SKU 的 MARD 通用固定色盘；需要 seller + SKU + dated colour-card + exact_mard_codes 才能作为库存 profile。';

export const MARD_INVENTORY_PRESETS: readonly MardInventoryPreset[] = [
  {
    id: 'mard-full',
    label: 'MARD 全 291 色',
    expectedColorCount: 291,
    mardCodes: MARD_CATALOG_CODES,
    source: 'mard_palette_dataset_2026-06-24',
    notes: 'MARD_FULL_291: 221 core + P/Q/R/T/Y/ZG extensions.',
  },
  {
    id: 'mard-core',
    label: 'MARD 核心 221 色',
    expectedColorCount: 221,
    mardCodes: MARD_CORE_221_CODES,
    source: 'mard_palette_dataset_2026-06-24',
    notes: 'MARD_CORE_221: A, B, C, D, E, F, G, H, M series.',
  },
  {
    id: 'mard-custom',
    label: '自定义',
    expectedColorCount: 0,
    mardCodes: [],
    source: 'user-defined',
    notes: '用户手工选择的实际库存集合。',
  },
];

export function getMardInventoryPreset(id: MardInventoryPresetId): MardInventoryPreset {
  const preset = MARD_INVENTORY_PRESETS.find((candidate) => candidate.id === id);
  if (!preset) throw new Error(`Unknown MARD inventory preset: ${id}`);
  return preset;
}

function validatePreset(preset: MardInventoryPreset, catalogCodes: Set<string>): string[] {
  const errors: string[] = [];
  const uniqueCodes = new Set(preset.mardCodes);

  if (preset.id !== 'mard-custom' && preset.mardCodes.length !== preset.expectedColorCount) {
    errors.push(`${preset.id} expected ${preset.expectedColorCount} codes, got ${preset.mardCodes.length}`);
  }

  if (uniqueCodes.size !== preset.mardCodes.length) {
    errors.push(`${preset.id} contains duplicate MARD codes`);
  }

  for (const code of preset.mardCodes) {
    if (!catalogCodes.has(code)) errors.push(`${preset.id} contains unknown MARD code ${code}`);
  }

  return errors;
}

export function validateMardInventoryPresets(catalogCodes = new Set(MARD_CATALOG_CODES)): string[] {
  const errors = MARD_INVENTORY_PRESETS.flatMap((preset) => validatePreset(preset, catalogCodes));
  const fullCodes = new Set(getMardInventoryPreset('mard-full').mardCodes);
  const coreCodes = getMardInventoryPreset('mard-core').mardCodes;
  const missingFromFull = coreCodes.filter((code) => !fullCodes.has(code));

  if (missingFromFull.length > 0) {
    errors.push(`mard-core is not a subset of mard-full: ${missingFromFull.join(', ')}`);
  }

  return errors;
}
