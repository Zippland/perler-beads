import { describe, expect, test } from 'vitest';
import { getCompileConfigChanges, resolveRecompileIntent, shouldConfirmRecompile } from './recompilePolicy';

const applied = {
  gridWidth: 100,
  similarityThreshold: 30,
  pixelationMode: 'dominant',
  inventoryPresetId: 'mard-full',
  excludedColorKeys: [],
  cropRect: null,
};

describe('recompile policy', () => {
  test('detects draft changes that require recompilation', () => {
    expect(getCompileConfigChanges(applied, { ...applied, gridWidth: 120 })).toEqual(['gridWidth']);
    expect(getCompileConfigChanges(applied, { ...applied, inventoryPresetId: 'mard-48' })).toEqual(['inventoryPresetId']);
    expect(getCompileConfigChanges(applied, { ...applied, excludedColorKeys: ['#FF0000'] })).toEqual(['excludedColorKeys']);
  });

  test('requires confirmation only when changed config would overwrite local edits', () => {
    expect(shouldConfirmRecompile({ appliedConfig: applied, draftConfig: applied, hasLocalEdits: true })).toBe(false);
    expect(shouldConfirmRecompile({ appliedConfig: applied, draftConfig: { ...applied, gridWidth: 80 }, hasLocalEdits: false })).toBe(false);
    expect(shouldConfirmRecompile({ appliedConfig: applied, draftConfig: { ...applied, gridWidth: 80 }, hasLocalEdits: true })).toBe(true);
  });

  test('separates confirmed recompiles from edits that need user confirmation', () => {
    expect(resolveRecompileIntent({
      appliedConfig: applied,
      draftConfig: { ...applied, inventoryPresetId: 'mard-core' },
      hasLocalEdits: true,
      userConfirmed: false,
    })).toEqual({
      status: 'needs-confirmation',
      changes: ['inventoryPresetId'],
    });

    expect(resolveRecompileIntent({
      appliedConfig: applied,
      draftConfig: { ...applied, inventoryPresetId: 'mard-core' },
      hasLocalEdits: true,
      userConfirmed: true,
    })).toEqual({
      status: 'ready',
      changes: ['inventoryPresetId'],
    });
  });
});
