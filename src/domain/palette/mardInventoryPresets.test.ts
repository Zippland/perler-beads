import { describe, expect, test } from 'vitest';
import colorSystemMapping from '../../app/colorSystemMapping.json';
import {
  getMardInventoryPreset,
  MARD_INVENTORY_PRESETS,
  RETAIL_TIER_WARNING,
  validateMardInventoryPresets,
} from './mardInventoryPresets';

const catalogCodes = new Set(Object.values(colorSystemMapping).map((entry) => entry.MARD));

describe('MARD inventory presets', () => {
  test('declares only dataset-backed stock profiles in display order', () => {
    expect(MARD_INVENTORY_PRESETS.map((preset) => preset.id)).toEqual([
      'mard-full',
      'mard-core',
      'mard-custom',
    ]);
  });

  test('validates expected counts, duplicates, catalog presence, and core subset relation', () => {
    expect(validateMardInventoryPresets(catalogCodes)).toEqual([]);
  });

  test('uses the dataset-backed full and core MARD memberships', () => {
    const full = getMardInventoryPreset('mard-full');
    const core = getMardInventoryPreset('mard-core');

    expect(full.mardCodes).toHaveLength(291);
    expect(core.mardCodes).toHaveLength(221);
    expect(core.mardCodes.every((code) => ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'M'].includes(/^[A-Z]+/.exec(code)?.[0] ?? ''))).toBe(true);
    for (const code of ['A01', 'M15', 'P01', 'Q05', 'R28', 'T01', 'Y05', 'ZG8']) {
      expect(full.mardCodes).toContain(code);
    }
  });

  test('documents why retail pack counts are not universal stock profiles', () => {
    expect(RETAIL_TIER_WARNING).toContain('24/48/72/96/120/144');
    expect(MARD_INVENTORY_PRESETS.some((preset) => preset.label.includes('72'))).toBe(false);
  });
});
