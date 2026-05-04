/**
 * MultiSelect - Reusable multi-select dropdown component
 * Extracted from JobManager.tsx
 */

import React, { useState } from 'react';

interface MultiSelectProps {
    label: string;
    options: string[];
    selected: string[];
    onChange: (val: string[]) => void;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({ label, options, selected, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleOption = (opt: string) => {
        if (selected.includes(opt)) {
            onChange(selected.filter(s => s !== opt));
        } else {
            onChange([...selected, opt]);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center text-xs border rounded px-2 py-1.5 min-w-[100px] justify-between ${selected.length > 0 ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-300'}`}
            >
                <span className="truncate max-w-[120px]">
                    {selected.length === 0 ? `${label}: Tất cả` : `${label}: ${selected.length}`}
                </span>
                <span className="ml-1 text-[10px]">▼</span>
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full mt-1 bg-white border rounded shadow-lg z-20 w-48 max-h-60 overflow-y-auto p-1">
                        <div className="px-2 py-1 text-[10px] text-gray-400 uppercase font-bold">{label}</div>
                        {options.map(opt => (
                            <label key={opt} className="flex items-center px-2 py-1.5 hover:bg-gray-50 cursor-pointer text-xs">
                                <input
                                    type="checkbox"
                                    className="w-3.5 h-3.5 mr-2"
                                    checked={selected.includes(opt)}
                                    onChange={() => toggleOption(opt)}
                                />
                                {opt}
                            </label>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};
