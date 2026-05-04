
import React from 'react';
import { ScheduleItem, Job, SubJob, Employee } from '../../types';
import { Clock, Video, Check, ArrowLeftRight } from 'lucide-react';

interface ScheduleCardProps {
    item: ScheduleItem;
    isFaded?: boolean;
    job?: Job;
    subs: SubJob[];
    assignedEmps: (Employee | undefined)[];
    isStaff: boolean;
    onConfirmRest?: (item: ScheduleItem) => void;
    onSwapRest?: (item: ScheduleItem) => void;
}

const ScheduleCard: React.FC<ScheduleCardProps> = ({
    item,
    isFaded = false,
    job,
    subs,
    assignedEmps,
    isStaff,
    onConfirmRest,
    onSwapRest
}) => {
    // Special handling for Nghỉ bù items
    const isRestItem = item.jobId === 'JOB_NGHI_BU';
    const isRestPending = isRestItem && item.status !== 'Approved';
    const isRestApproved = isRestItem && item.status === 'Approved';

    // Nghỉ bù color scheme
    if (isRestItem) {
        return (
            <div className={`rounded-lg border overflow-hidden transition-all hover:shadow-md ${isRestApproved
                    ? 'bg-green-50 border-green-300'
                    : 'bg-amber-50 border-amber-300'
                }`}>
                {/* Header */}
                <div className={`px-3 py-2 flex justify-between items-center border-b ${isRestApproved
                        ? 'bg-green-100 border-green-200'
                        : 'bg-amber-100 border-amber-200'
                    }`}>
                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${isRestApproved
                                ? 'bg-green-600 text-white'
                                : 'bg-amber-500 text-white'
                            }`}>
                            🎫 Nghỉ Bù
                        </span>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${isRestApproved
                            ? 'bg-green-200 text-green-800'
                            : 'bg-amber-200 text-amber-800'
                        }`}>
                        {isRestApproved ? '✓ Đã xác nhận' : '⏳ Chờ xác nhận'}
                    </span>
                </div>

                {/* Body */}
                <div className="p-3">
                    <div className="text-sm text-gray-600 mb-2">
                        {item.note || 'Nghỉ bù ca tối hôm trước'}
                    </div>

                    {/* Actions - Only show if Pending */}
                    {isRestPending && (
                        <div className="flex gap-2 mt-3">
                            {onConfirmRest && (
                                <button
                                    onClick={() => onConfirmRest(item)}
                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                                >
                                    <Check className="w-3 h-3" />
                                    Xác nhận nghỉ
                                </button>
                            )}
                            {onSwapRest && (
                                <button
                                    onClick={() => onSwapRest(item)}
                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-amber-500 text-white text-xs font-medium rounded hover:bg-amber-600 transition-colors"
                                >
                                    <ArrowLeftRight className="w-3 h-3" />
                                    Đổi ngày
                                </button>
                            )}
                        </div>
                    )}

                    {/* Assigned People */}
                    {assignedEmps.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-dashed border-gray-200">
                            {assignedEmps.map(emp => emp && (
                                <div key={emp.id} className="flex items-center gap-1 bg-white pr-2 rounded-full border border-gray-200" title={emp.fullName}>
                                    <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[9px] font-bold flex items-center justify-center">
                                        {emp.fullName.charAt(0)}
                                    </div>
                                    <span className="text-[10px] font-medium text-gray-600 max-w-[60px] truncate">{emp.fullName.split(' ').pop()}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Normal schedule card
    return (
        <div className={`bg-white rounded-lg border overflow-hidden group transition-all ${isFaded ? 'opacity-60 grayscale-[0.5] hover:opacity-100 hover:grayscale-0' : 'hover:shadow-md border-gray-200'}`}>
            {/* Header */}
            <div className={`px-3 py-2 flex justify-between items-center border-b ${item.shift === 'Sáng' ? 'bg-orange-50 border-orange-100' : item.shift === 'Chiều' ? 'bg-blue-50 border-blue-100' : 'bg-purple-50 border-purple-100'}`}>
                <div className="flex items-center gap-2 overflow-hidden">
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${item.shift === 'Sáng' ? 'bg-white text-orange-700 border-orange-200' : item.shift === 'Chiều' ? 'bg-white text-blue-700 border-blue-200' : 'bg-white text-purple-700 border-purple-200'}`}>
                        {item.shift}
                    </span>
                    <span className="font-bold text-sm text-gray-800 truncate" title={job?.name}>{job?.name}</span>
                </div>
                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded whitespace-nowrap ${item.status === 'Completed' ? 'bg-green-100 text-green-700' : item.status === 'Cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                    {item.status === 'Completed' ? 'Đã xong' : item.status === 'Cancelled' ? 'Hủy' : 'Đang chờ'}
                </span>
            </div>

            {/* Body */}
            <div className="p-3">
                {/* Details - Loop through all subs */}
                <div className="space-y-2 mb-3">
                    {subs.length > 0 ? (
                        subs.map((sub, idx) => (
                            <div key={sub.id} className={`space-y-0.5 ${idx > 0 ? 'pt-2 border-t border-dashed border-gray-100' : ''}`}>
                                <div className="text-xs font-bold text-blue-700 leading-tight line-clamp-2" title={sub.name}>{sub.name}</div>
                                <div className="flex items-center justify-between text-[10px] text-gray-500">
                                    <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {sub.startTime} - {sub.endTime}</span>
                                    {sub.link && (
                                        <a href={sub.link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center bg-blue-50 px-1.5 py-0.5 rounded-full">
                                            <Video className="w-3 h-3 mr-1" /> Meet
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <span className="text-xs text-gray-400 italic">Chưa có hạng mục chi tiết.</span>
                    )}
                </div>

                {/* Assigned People */}
                {(!isStaff || item.employeeIds.length > 1) && (
                    <div className="flex flex-col border-t pt-2 border-dashed border-gray-100">
                        <div className="flex flex-wrap gap-1">
                            {assignedEmps.map(emp => emp && (
                                <div key={emp.id} className="flex items-center gap-1 bg-gray-50 pr-2 rounded-full border border-gray-200" title={emp.fullName}>
                                    <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[9px] font-bold flex items-center justify-center">
                                        {emp.fullName.charAt(0)}
                                    </div>
                                    <span className="text-[10px] font-medium text-gray-600 max-w-[60px] truncate">{emp.fullName.split(' ').pop()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScheduleCard;

