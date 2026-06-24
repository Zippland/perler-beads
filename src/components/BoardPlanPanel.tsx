"use client";

import { BoardPlan, BoardPreference } from "../domain/boards/boardPlan";

interface BoardPlanPanelProps {
  boardPlan: BoardPlan | null;
  preference: BoardPreference;
  onPreferenceChange: (preference: BoardPreference) => void;
  selectedBoardId: string | null;
  onSelectedBoardChange: (boardId: string | null) => void;
}

export default function BoardPlanPanel({
  boardPlan,
  preference,
  onPreferenceChange,
  selectedBoardId,
  onSelectedBoardChange,
}: BoardPlanPanelProps) {
  if (!boardPlan) return null;

  return (
    <section className="rounded-lg border border-[#dce5e2] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[#17201f]">实体画板</h2>
          <p className="mt-1 text-xs text-[#6f7d7b]">
            {boardPlan.boardSize} 钉板 × {boardPlan.totalBoards}（横向{" "}
            {boardPlan.columns} × 纵向 {boardPlan.rows}）
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md bg-[#f5f7f8] p-2">
          <div className="text-sm font-semibold text-[#17201f]">
            {boardPlan.usedWidth}×{boardPlan.usedHeight}
          </div>
          <div className="mt-1 text-[11px] text-[#6f7d7b]">图纸</div>
        </div>
        <div className="rounded-md bg-[#f5f7f8] p-2">
          <div className="text-sm font-semibold text-[#17201f]">
            {boardPlan.capacityWidth}×{boardPlan.capacityHeight}
          </div>
          <div className="mt-1 text-[11px] text-[#6f7d7b]">承载</div>
        </div>
        <div className="rounded-md bg-[#f5f7f8] p-2">
          <div className="text-sm font-semibold text-[#17201f]">
            {boardPlan.wasteCells}
          </div>
          <div className="mt-1 text-[11px] text-[#6f7d7b]">空余</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          ["auto", "自动"],
          [52, "52 钉"],
          [104, "104 钉"],
        ].map(([value, label]) => (
          <button
            key={String(value)}
            type="button"
            onClick={() => onPreferenceChange(value as BoardPreference)}
            className={
              "h-8 rounded-md border text-xs font-medium transition " +
              (preference === value
                ? "border-[#1f9d8a] bg-[#e7f3f0] text-[#176b5f]"
                : "border-[#d2dedb] bg-white text-[#3b4947] hover:bg-[#f7fbfa]")
            }
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-3 max-h-36 space-y-2 overflow-auto pr-1">
        {boardPlan.boards.map((board) => (
          <button
            key={board.id}
            type="button"
            onClick={() =>
              onSelectedBoardChange(
                selectedBoardId === board.id ? null : board.id,
              )
            }
            className={
              "flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-xs transition " +
              (selectedBoardId === board.id
                ? "border-[#f3b24d] bg-[#fff8e8] text-[#8a5a0a]"
                : "border-[#e4ece9] bg-[#fbfdfc] text-[#3b4947] hover:bg-[#f7fbfa]")
            }
          >
            <span className="font-semibold">{board.id}</span>
            <span>
              C{board.gridStartColumn + 1}-C{board.gridEndColumnExclusive}, R
              {board.gridStartRow + 1}-R{board.gridEndRowExclusive}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
