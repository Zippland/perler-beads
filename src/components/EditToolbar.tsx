import React from 'react';

interface ColorInfo {
  color: string;
  name: string;
  total: number;
  completed: number;
}

interface EditToolbarProps {
  editTool: 'select' | 'wand';
  hasSelection: boolean;
  canUndo: boolean;
  canRedo: boolean;
  selectedColor: string;
  availableColors: ColorInfo[];
  selectedCells: Set<string>;
  onEditToolChange: (tool: 'select' | 'wand') => void;
  onEditOperation: (operation: 'fill' | 'clear' | 'invert') => void;
  onUndo: () => void;
  onRedo: () => void;
  onColorSelect: (color: string) => void;
  onShowColorPanel: () => void;
}

const EditToolbar: React.FC<EditToolbarProps> = ({
  editTool,
  hasSelection,
  canUndo,
  canRedo,
  selectedColor,
  availableColors,
  selectedCells,
  onEditToolChange,
  onEditOperation,
  onUndo,
  onRedo,
  onColorSelect,
  onShowColorPanel
}) => {
  return (
    <div className="bg-white border-t border-gray-200 px-3 py-2">
      <div className="flex items-center gap-3">
        {/* 选择工具区域 */}
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[9px] text-gray-400">选择</span>
          <div className="flex bg-gray-100 rounded p-0.5">
            <button
              onClick={() => onEditToolChange('select')}
              className={`p-1 rounded ${editTool === 'select' ? 'bg-white shadow-sm' : ''}`}
              title="矩形选择"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </button>
            <button
              onClick={() => onEditToolChange('wand')}
              className={`p-1 rounded ${editTool === 'wand' ? 'bg-white shadow-sm' : ''}`}
              title="魔棒选择"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* 编辑操作区域 */}
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[9px] text-gray-400">操作</span>
          <div className="flex gap-0.5">
            <button
              onClick={() => onEditOperation('fill')}
              className={`p-1 rounded ${!hasSelection ? 'opacity-50' : 'active:bg-gray-100'}`}
              disabled={!hasSelection}
              title="填充"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21V5a2 2 0 012-2h11l-5 7h4l-5.5 8" />
              </svg>
            </button>
            <button
              onClick={() => onEditOperation('clear')}
              className={`p-1 rounded ${!hasSelection ? 'opacity-50' : 'active:bg-gray-100'}`}
              disabled={!hasSelection}
              title="清除"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <button
              onClick={() => onEditOperation('invert')}
              className="p-1 rounded active:bg-gray-100"
              title="反选"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* 历史记录区域 */}
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[9px] text-gray-400">历史</span>
          <div className="flex gap-0.5">
            <button
              onClick={onUndo}
              className={`p-1 rounded ${!canUndo ? 'opacity-50' : 'active:bg-gray-100'}`}
              disabled={!canUndo}
              title="撤销"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            <button
              onClick={onRedo}
              className={`p-1 rounded ${!canRedo ? 'opacity-50' : 'active:bg-gray-100'}`}
              disabled={!canRedo}
              title="重做"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
              </svg>
            </button>
          </div>
        </div>

        <div className="h-6 w-px bg-gray-200"></div>
        
        {/* 颜色选择区域 */}
        <div className="flex flex-col gap-0.5 flex-1">
          <span className="text-[9px] text-gray-400">颜色</span>
          <div className="flex gap-0.5 overflow-x-auto">
            {availableColors.slice(0, 10).map(color => (
              <button
                key={color.color}
                onClick={() => onColorSelect(color.color)}
                className={`w-5 h-5 rounded border flex-shrink-0 ${
                  selectedColor === color.color ? 'border-blue-500 border-2' : 'border-gray-300'
                }`}
                style={{ backgroundColor: color.color }}
              />
            ))}
            {availableColors.length > 10 && (
              <button 
                onClick={onShowColorPanel}
                className="w-5 h-5 rounded border border-gray-300 flex items-center justify-center text-gray-500"
                style={{ fontSize: '10px' }}
              >
                +
              </button>
            )}
          </div>
        </div>
        
        {/* 选择状态区域 */}
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[9px] text-gray-400">状态</span>
          <div className="text-[10px] text-gray-600">
            {hasSelection ? `${selectedCells.size}格` : '未选'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditToolbar;