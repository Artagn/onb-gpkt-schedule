import React from 'react';
import { Inbox, LucideIcon } from 'lucide-react';

interface EmptyStateProps {
    /** Lucide icon component to display */
    icon?: LucideIcon;
    /** Main title text */
    title: string;
    /** Optional description text */
    description?: string;
    /** Optional call-to-action */
    action?: {
        label: string;
        onClick: () => void;
    };
    /** Size variant */
    size?: 'sm' | 'md';
    /** Use inside a table <tr> — wraps in <td colSpan> */
    colSpan?: number;
}

/**
 * Reusable empty state component for lists, tables, and panels.
 * Provides consistent visual treatment across the app.
 *
 * @example
 * // Standalone
 * <EmptyState icon={Calendar} title="Không có lịch hôm nay" />
 *
 * // With CTA
 * <EmptyState
 *   icon={ClipboardList}
 *   title="Chưa có đánh giá"
 *   description="Tạo đợt đánh giá mới để bắt đầu."
 *   action={{ label: "Tạo đợt mới", onClick: handleCreate }}
 * />
 *
 * // Inside a table
 * <tr><EmptyState title="Không có dữ liệu" colSpan={6} size="sm" /></tr>
 */
const EmptyState: React.FC<EmptyStateProps> = ({
    icon: Icon = Inbox,
    title,
    description,
    action,
    size = 'md',
    colSpan,
}) => {
    const isSm = size === 'sm';

    const content = (
        <div className={`flex flex-col items-center justify-center text-center ${isSm ? 'py-6' : 'py-10'}`}>
            <div className={`
                rounded-2xl flex items-center justify-center mb-3
                ${isSm ? 'w-10 h-10 bg-gray-50' : 'w-14 h-14 bg-gradient-to-br from-gray-50 to-gray-100 shadow-sm'}
            `}>
                <Icon className={`text-gray-300 ${isSm ? 'w-5 h-5' : 'w-7 h-7'}`} />
            </div>
            <p className={`font-medium text-gray-500 ${isSm ? 'text-xs' : 'text-sm'}`}>
                {title}
            </p>
            {description && (
                <p className={`text-gray-400 mt-1 max-w-xs ${isSm ? 'text-[10px]' : 'text-xs'}`}>
                    {description}
                </p>
            )}
            {action && (
                <button
                    onClick={action.onClick}
                    className={`mt-3 font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors
                        ${isSm ? 'text-xs px-3 py-1.5' : 'text-sm px-4 py-2'}
                    `}
                >
                    {action.label} →
                </button>
            )}
        </div>
    );

    // If colSpan is set, wrap in <td> for table usage
    if (colSpan) {
        return <td colSpan={colSpan}>{content}</td>;
    }

    return content;
};

export default EmptyState;
