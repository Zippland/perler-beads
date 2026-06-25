export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CompileConfig {
  gridWidth: number;
  similarityThreshold: number;
  pixelationMode: string;
  inventoryPresetId: string;
  cropRect: CropRect | null;
}

export type CompileConfigChange = keyof CompileConfig;

function stableStringify(value: unknown): string {
  return JSON.stringify(value);
}

export function getCompileConfigChanges(appliedConfig: CompileConfig, draftConfig: CompileConfig): CompileConfigChange[] {
  const changes: CompileConfigChange[] = [];
  const keys: CompileConfigChange[] = [
    'gridWidth',
    'similarityThreshold',
    'pixelationMode',
    'inventoryPresetId',
    'cropRect',
  ];

  for (const key of keys) {
    if (stableStringify(appliedConfig[key]) !== stableStringify(draftConfig[key])) {
      changes.push(key);
    }
  }

  return changes;
}

export function shouldConfirmRecompile(input: {
  appliedConfig: CompileConfig;
  draftConfig: CompileConfig;
  hasLocalEdits: boolean;
}): boolean {
  return input.hasLocalEdits && getCompileConfigChanges(input.appliedConfig, input.draftConfig).length > 0;
}

export function resolveRecompileIntent(input: {
  appliedConfig: CompileConfig;
  draftConfig: CompileConfig;
  hasLocalEdits: boolean;
  userConfirmed: boolean;
}): { status: 'ready' | 'needs-confirmation'; changes: CompileConfigChange[] } {
  const changes = getCompileConfigChanges(input.appliedConfig, input.draftConfig);
  if (input.hasLocalEdits && changes.length > 0 && !input.userConfirmed) {
    return { status: 'needs-confirmation', changes };
  }

  return { status: 'ready', changes };
}
