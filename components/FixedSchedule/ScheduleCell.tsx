import React, { memo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Job, ScheduleItem, LeaveRequest } from '../../types';

interface ScheduleCellProps {
    day: Date;
    shift: string;
    empId: string;
    items: ScheduleItem[];
    leaveRequest?: LeaveRequest;
    isToday: boolean;
    isWeekEditable: boolean;
    isSelected?: boolean;
    onCellClick: (day: Date, shift: string, empId: string) => void;
    onCellSelect?: (day: Date, shift: string, empId: string) => void;
    getJobStyle: (group: string | null | undefined) => string;
    jobs: Job[];
}

const ScheduleCell: React.FC<ScheduleCellProps> = ({
    day, shift, empId, items, leaveRequest,
    isToday, isWeekEditable, isSelected, onCellClick, onCellSelect, getJobStyle, jobs
}) => {
    const pendingLeave = leaveRequest?.status === 'Pending';
    const approvedLeave = leaveRequest?.status === 'Approved';

    // Base color logic
    let cellBgInfo = 'bg-white';
    if (isToday) cellBgInfo = ''; // Today uses inline style
    if (isWeekEditable) cellBgInfo += ' hover:bg-blue-50'; // Hover effect

    // Override if Leave
    if (pendingLeave) cellBgInfo = 'bg-yellow-50';
    if (approvedLeave) cellBgInfo = 'bg-gray-100';

    // Today inline style (only when no leave override)
    const isTodayHighlight = isToday && !pendingLeave && !approvedLeave;
    const todayStyle = isTodayHighlight ? {
        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%)',
        boxShadow: 'inset 0 0 8px rgba(34, 197, 94, 0.15)',
    } : undefined;

    return (
        <td
            style={todayStyle}
            className={`p-0.5 border-b border-r align-top min-h-[35px] w-[90px] max-w-[90px] relative ${isWeekEditable ? 'cursor-pointer group' : 'cursor-not-allowed'} transition-colors ${cellBgInfo} ${isSelected ? 'ring-2 ring-indigo-500 ring-inset z-10' : ''}`}
            onClick={(e) => {
                if (!isWeekEditable) return;
                if (e.detail === 1 && onCellSelect) {
                    // Single click = select
                    onCellSelect(day, shift, empId);
                }
            }}
            onDoubleClick={() => isWeekEditable && onCellClick(day, shift, empId)}
        >
            {approvedLeave && (() => {
                const isAutoLeave = leaveRequest?.reason?.includes('[Tự động]') || leaveRequest?.reason?.includes('[Đã đổi]');
                return (
                    <div className={`w-full h-full flex items-center justify-center ${isAutoLeave ? 'bg-purple-50' : 'bg-red-50'}`}>
                        <span className={`text-[10px] italic font-medium transform -rotate-12 border px-1 rounded ${isAutoLeave ? 'text-purple-500 border-purple-200' : 'text-red-500 border-red-200'}`}>
                            {isAutoLeave ? 'Nghỉ bù' : 'Nghỉ phép'}
                        </span>
                    </div>
                );
            })()}
            {!approvedLeave && pendingLeave && (<div className="absolute top-0 right-0 z-20"><AlertTriangle className="w-3 h-3 text-white fill-yellow-500" /></div>)}
            {!approvedLeave && (
                <>
                    {items.length > 0 ? (
                        <div className={`flex flex-col gap-0.5 min-h-[35px] ${pendingLeave ? 'opacity-50' : ''}`}>
                            {items.map(item => {
                                const job = item.jobId === 'JOB_NGHI_BU' ? { name: 'Nghỉ bù', group: null } : jobs.find(j => j.id === item.jobId);
                                const styleClass = getJobStyle(job?.group);
                                return (
                                    <div key={item.id} className={`px-1 py-0.5 rounded text-[10px] border break-words whitespace-normal leading-tight ${styleClass}`}>
                                        {job?.name}
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        pendingLeave && (
                            <div className="w-full h-full flex items-center justify-center"><span className="text-[9px] text-yellow-600 font-medium">Xin nghỉ</span></div>
                        )
                    )}
                </>
            )}
        </td>
    );
};

export default memo(ScheduleCell);
