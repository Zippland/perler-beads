"use client";

import {
  MARD_INVENTORY_PRESETS,
  MardInventoryPresetId,
} from "../domain/palette/mardInventoryPresets";

interface InventoryPresetSelectorProps {
  value: MardInventoryPresetId;
  onChange: (value: MardInventoryPresetId) => void;
  activeColorCount: number;
}

export default function InventoryPresetSelector({
  value,
  onChange,
  activeColorCount,
}: InventoryPresetSelectorProps) {
  return (
    <section className="rounded-lg border border-[#dce5e2] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[#17201f]">可用色域</h2>
          <p className="mt-1 text-xs text-[#6f7d7b]">
            当前允许 {activeColorCount} 色
          </p>
        </div>
      </div>
      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value as MardInventoryPresetId)
        }
        className="h-9 w-full rounded-md border border-[#d2dedb] bg-white px-3 text-sm text-[#17201f] outline-none focus:border-[#1f9d8a] focus:ring-2 focus:ring-[#1f9d8a]/15"
      >
        {MARD_INVENTORY_PRESETS.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.label}
          </option>
        ))}
      </select>
    </section>
  );
}
