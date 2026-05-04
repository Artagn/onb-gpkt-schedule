// ColorLegend.tsx - Reusable color legend component for tables and charts
import React from 'react';

export interface LegendItem {
    color: string;
    label: string;
}

interface ColorLegendProps {
    items: LegendItem[];
    className?: string;
}

/**
 * Unified color legend component for consistent UX across all tables/charts
 * Usage: <ColorLegend items={[{ color: '#60a5fa', label: 'Sáng' }]} />
 */
export const ColorLegend: React.FC<ColorLegendProps> = ({ items, className = '' }) => {
    return (
        <div className={`flex flex-wrap gap-3 text-xs items-center ${className}`} role="list" aria-label="Chú thích màu sắc">
            {items.map((item) => (
                <div key={item.label} className="flex items-center gap-1.5" role="listitem">
                    <span
                        className="inline-block w-3 h-3 rounded border border-slate-300"
                        style={{ backgroundColor: item.color }}
                        aria-hidden="true"
                    />
                    <span>{item.label}</span>
                </div>
            ))}
        </div>
    );
};

// Common preset legends for reuse
export const SHIFT_LEGEND: LegendItem[] = [
    { color: '#60a5fa', label: 'Sáng' },      // blue-400
    { color: '#fb923c', label: 'Chiều' },     // orange-400
    { color: '#a78bfa', label: 'Tối' },       // violet-400
    { color: '#14b8a6', label: 'Cả ngày' },   // teal-500
];

export const STATUS_LEGEND: LegendItem[] = [
    { color: '#22c55e', label: 'Hoàn thành' },  // green-500
    { color: '#eab308', label: 'Đang chờ' },    // yellow-500
    { color: '#ef4444', label: 'Từ chối' },     // red-500
    { color: '#6b7280', label: 'Hủy' },         // gray-500
];

export const KPI_LEGEND: LegendItem[] = [
    { color: '#22c55e', label: 'Đạt KPI' },     // green-500
    { color: '#eab308', label: 'Cần cải thiện' }, // yellow-500
    { color: '#ef4444', label: 'Chưa đạt' },    // red-500
];

export default ColorLegend;
