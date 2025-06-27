import React from 'react';

interface ColorInfo {
  color: string;
  name: string;
  total: number;
  completed: number;
}

interface EditToolbarProps {
  selectedColor: string;
  availableColors: ColorInfo[];
  onRemoveNoise: () => void;
  onManualColoring: () => void;
  onColorSelect: (color: string) => void;
  onShowColorPanel: () => void;
}

const EditToolbar: React.FC<EditToolbarProps> = ({
  selectedColor,
  availableColors,
  onRemoveNoise,
  onManualColoring,
  onColorSelect,
  onShowColorPanel
}) => {
  return (
    <div className="bg-white/90 backdrop-blur-lg px-4 py-3">
      <div className="flex items-center justify-center gap-4 max-w-sm mx-auto">
        {/* 去杂色功能 */}
        <button
          onClick={onRemoveNoise}
          className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 hover:bg-blue-50/50 active:bg-blue-100/60 active:shadow-inner active:shadow-blue-200/40"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="text-sm font-medium text-gray-700">去杂色</span>
        </button>

        {/* 手动上色功能 */}
        <button
          onClick={onManualColoring}
          className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 hover:bg-purple-50/50 active:bg-purple-100/60 active:shadow-inner active:shadow-purple-200/40"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          <span className="text-sm font-medium text-gray-700">手动上色</span>
        </button>
      </div>
    </div>
  );
};

export default EditToolbar;