"use client";

import { BoardPlan, BoardPreference } from "../../domain/boards/boardPlan";

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  canExport: boolean;
  boardPreference: BoardPreference;
  onBoardPreferenceChange: (preference: BoardPreference) => void;
  boardPlan: BoardPlan | null;
  onPrintChart: () => void;
  onMakerPack: () => void;
}

const boardOptions: { label: string; value: BoardPreference }[] = [
  { label: "自动", value: "auto" },
  { label: "52 钉", value: 52 },
  { label: "104 钉", value: 104 },
];

export default function ExportDialog({
  isOpen,
  onClose,
  canExport,
  boardPreference,
  onBoardPreferenceChange,
  boardPlan,
  onPrintChart,
  onMakerPack,
}: ExportDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#e4ece9] px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-[#17201f]">导出</h2>
            <p className="mt-1 text-xs text-[#6f7d7b]">
              打印图纸或制作包
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-md border border-[#d2dedb] bg-white text-sm text-[#3b4947] hover:bg-[#f7fbfa]"
            aria-label="关闭导出弹窗"
          >
            ×
          </button>
        </div>
        <div className="space-y-4 p-5">
          <section className="rounded-md border border-[#dce5e2] bg-[#fbfdfc] p-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-[#17201f]">打印图纸</h3>
              <p className="mt-1 text-xs leading-5 text-[#6f7d7b]">
                固定包含总图、格线、10 格分组线、四侧坐标、格内 MARD 色号和 BOM。
              </p>
            </div>
            <button
              type="button"
              onClick={onPrintChart}
              disabled={!canExport}
              className="h-10 w-full rounded-md bg-[#1f9d8a] text-sm font-semibold text-white hover:bg-[#188775] disabled:cursor-not-allowed disabled:bg-[#a7c9c3]"
            >
              下载打印图纸 PNG
            </button>
          </section>

          <section className="rounded-md border border-[#dce5e2] bg-[#fbfdfc] p-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-[#17201f]">制作包</h3>
              <p className="mt-1 text-xs leading-5 text-[#6f7d7b]">
                包含总图、CSV、manifest 和按钉板切分的 PNG。
              </p>
            </div>
            <div className="mb-3 grid grid-cols-3 gap-2">
              {boardOptions.map((option) => (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => onBoardPreferenceChange(option.value)}
                  className={
                    "h-9 rounded-md border text-xs font-medium transition " +
                    (boardPreference === option.value
                      ? "border-[#1f9d8a] bg-[#e7f3f0] text-[#176b5f]"
                      : "border-[#d2dedb] bg-white text-[#3b4947] hover:bg-[#f7fbfa]")
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
            {boardPlan ? (
              <div className="mb-3 grid grid-cols-2 gap-2 rounded-md bg-white p-3 text-xs text-[#3b4947]">
                <span>总板数：{boardPlan.totalBoards}</span>
                <span>
                  横向 × 纵向：{boardPlan.columns} × {boardPlan.rows}
                </span>
                <span>
                  承载尺寸：{boardPlan.capacityWidth} × {boardPlan.capacityHeight}
                </span>
                <span>空余格：{boardPlan.wasteCells}</span>
              </div>
            ) : null}
            <button
              type="button"
              onClick={onMakerPack}
              disabled={!canExport}
              className="h-10 w-full rounded-md bg-[#17201f] text-sm font-semibold text-white hover:bg-[#2c3836] disabled:cursor-not-allowed disabled:bg-[#a9b5b2]"
            >
              下载制作包
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
