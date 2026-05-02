import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export interface SelectedElementData {
  tagName: string;
  className: string;
  text: string;
  styles: {
    padding: string;
    margin: string;
    backgroundColor: string;
    color: string;
    fontSize: string;
  };
}

interface EditorPanelProps {
  selectedElement: SelectedElementData | null;
  onUpdate: (updates: any) => void;
  onClose: () => void;
}

const EditorPanel: React.FC<EditorPanelProps> = ({ selectedElement, onUpdate, onClose }) => {
  const [values, setValues] = useState<SelectedElementData | null>(selectedElement);

  // Update local state whenever a new element is clicked in the iframe
  useEffect(() => {
    setValues(selectedElement);
  }, [selectedElement]);

  if (!selectedElement || !values) return null;

  // Handle standard property changes (classes, text)
  const handleChange = (field: string, value: string) => {
    const newValues = { ...values, [field]: value };
    setValues(newValues);
    onUpdate({ field, value }); // Send message back to iframe
  };

  // Handle CSS style changes
  const handleStyleChange = (styleName: string, value: string) => {
    const newStyles = { ...values.styles, [styleName]: value };
    setValues({ ...values, styles: newStyles });
    onUpdate({ field: 'styles', styleName, value }); // Send message back to iframe
  };

  return (
    <div className="absolute right-6 top-20 w-80 bg-white text-black rounded-xl shadow-2xl border border-gray-200 z-50 animate-in fade-in slide-in-from-right-4 duration-200">
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded text-xs uppercase tracking-wider font-mono">
            {values.tagName}
          </span>
          Edit Element
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Settings Form */}
      <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
        
        {/* Text Content */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Text Content</label>
          <textarea
            value={values.text}
            onChange={(e) => handleChange('text', e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-md p-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
            rows={3}
          />
        </div>

        {/* Tailwind Classes */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Tailwind Classes</label>
          <input
            type="text"
            value={values.className}
            onChange={(e) => handleChange('className', e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-md p-2 text-sm font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Padding */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Padding</label>
            <input
              type="text"
              value={values.styles.padding}
              onChange={(e) => handleStyleChange('padding', e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-md p-2 text-sm focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>
          {/* Margin */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Margin</label>
            <input
              type="text"
              value={values.styles.margin}
              onChange={(e) => handleStyleChange('margin', e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-md p-2 text-sm focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
           {/* Background Color */}
           <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Background</label>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-md p-1 pl-2">
              <span className="text-xs text-gray-500 font-mono truncate w-16">{values.styles.backgroundColor || 'none'}</span>
              <input
                type="color"
                value={values.styles.backgroundColor !== 'rgba(0, 0, 0, 0)' ? values.styles.backgroundColor : '#ffffff'}
                onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                className="w-6 h-6 rounded cursor-pointer border-none p-0 ml-auto"
              />
            </div>
          </div>
          {/* Text Color */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Text Color</label>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-md p-1 pl-2">
              <span className="text-xs text-gray-500 font-mono truncate w-16">{values.styles.color || 'none'}</span>
              <input
                type="color"
                value={values.styles.color}
                onChange={(e) => handleStyleChange('color', e.target.value)}
                className="w-6 h-6 rounded cursor-pointer border-none p-0 ml-auto"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default EditorPanel;