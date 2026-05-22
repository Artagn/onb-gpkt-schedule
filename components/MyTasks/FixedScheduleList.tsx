
import React from 'react';
import { Calendar, AlertCircle, ListTodo, ExternalLink, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { ScheduleItem, Job, Employee, SubJob } from '../../types';
import EmptyState from '../common/EmptyState';

interface Props {
    displayedFixedSchedule: ScheduleItem[];
    currentEmployeeId: string;
    filterShift: string;
    jobs: Job[];
    employees: Employee[];
    subJobs: SubJob[];
    fullWidth?: boolean;
    setSelectedTask: (item: ScheduleItem) => void;
    setActionNote: (note: string) => void;
    setTrainingMetrics: (metrics: any) => void;
    handleQuickComplete: (e: React.MouseEvent, item: ScheduleItem) => void;
    setEditingRestItem: (item: ScheduleItem) => void;
    onRequestSwap?: (item: ScheduleItem) => void;
}

const FixedScheduleList: React.FC<Props> = ({
    displayedFixedSchedule, currentEmployeeId, filterShift,
    jobs, employees, subJobs, fullWidth = false,
    setSelectedTask, setActionNote, setTrainingMetrics, handleQuickComplete, setEditingRestItem, onRequestSwap
}) => {

    const getJob = (id: string) => jobs.find(j => j.id === id);

    const getSubJobs = (jobId: string, day: Date, shift: string) => {
        const dayIndex = day.getDay();
        const map: Record<number, string> = { 1: 'Thứ 2', 2: 'Thứ 3', 3: 'Thứ 4', 4: 'Thứ 5', 5: 'Thứ 6', 6: 'Thứ 7', 0: 'Chủ nhật' };
        const dayName = map[dayIndex];
        const subs = subJobs.filter(s => s.jobId === jobId && s.day === dayName && s.shift === shift);
        return subs.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    };

    const sortedSchedule = displayedFixedSchedule.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        if (a.shift === b.shift) return 0;
        return a.shift === 'Sáng' ? -1 : 1;
    });

    return (
        <div className={`bg-white rounded-lg shadow-sm flex flex-col ${fullWidth ? '' : ''}`}>
            <div className="p-4 border-b bg-indigo-50 flex items-center justify-between">
                <h3 className="font-bold text-indigo-900 flex items-center">
                    <Calendar className="w-4 h-4 mr-2" /> Lịch đào tạo
                </h3>
                <span className="text-xs bg-white px-2 py-1 rounded text-indigo-600 border border-indigo-100 font-bold">
                    {filterShift === 'All' ? 'Tất cả buổi' : `Buổi ${filterShift}`}
                </span>
            </div>
            <div className="p-4 space-y-3">
                {sortedSchedule.length === 0 ? (
                    <EmptyState
                        icon={Calendar}
                        title="Không có lịch đào tạo"
                        description="Không có lịch đào tạo trong khoảng thời gian này."
                    />
                ) : (
                    sortedSchedule.map(item => {
                        const job = item.jobId === 'JOB_NGHI_BU' ? { name: 'Nghỉ bù', standardPoint: 0, durationMinutes: 0 } as Job : getJob(item.jobId);
                        const subs = item.jobId !== 'JOB_NGHI_BU' ? getSubJobs(item.jobId, new Date(item.date), item.shift) : [];
                        const isCancelled = item.status === 'Cancelled';
                        const isCompleted = item.status === 'Completed';

                        // If viewing 'All', show who is assigned
                        const assigneeNames = currentEmployeeId === 'all'
                            ? item.employeeIds.map(id => employees.find(e => e.id === id)?.fullName.split(' ').pop()).join(', ')
                            : null;

                        // Allow Quick Action for logged-in user's own tasks (pending only)
                        const canQuickComplete = currentEmployeeId !== 'all' && item.status === 'Pending' && !isCancelled && !isCompleted;

                        if (item.jobId === 'JOB_NGHI_BU') {
                            return (
                                <div key={item.id} className="border border-gray-300 rounded-lg p-3 bg-gray-100 flex justify-between items-center">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                                {format(new Date(item.date), 'dd/MM/yyyy')}
                                            </span>
                                            <span className="text-xs font-bold text-gray-500 uppercase">{item.shift}</span>
                                            {assigneeNames && <span className="text-[10px] bg-slate-200 px-1 rounded text-slate-700">{assigneeNames}</span>}
                                        </div>
                                        <div className="font-bold text-gray-700">NGHỈ BÙ</div>
                                        <div className="text-xs text-gray-500">{item.note}</div>
                                    </div>
                                    {/* Only allow edit if specific user selected or it's their own */}
                                    {currentEmployeeId !== 'all' && (
                                        <button onClick={() => setEditingRestItem(item)} className="text-blue-600 text-xs font-bold hover:underline">Sửa</button>
                                    )}
                                </div>
                            );
                        }

                        return (
                            <div
                                key={item.id}
                                className={`border rounded-lg p-4 relative overflow-hidden group cursor-pointer hover:shadow-md transition-shadow
                                    ${isCancelled ? 'bg-red-50 border-red-200' : isCompleted ? 'bg-green-50 border-green-200' : 'bg-indigo-50 border-indigo-100'}
                                `}
                                onClick={() => {
                                    setSelectedTask(item);
                                    setActionNote(item.note || '');
                                    // Load existing metrics if any, or default to 0
                                    setTrainingMetrics({
                                        participants: item.customerParticipants || 0,
                                        surveys: item.customerSurveys || 0,
                                        capable: item.customerCapable || 0
                                    });
                                }}
                            >
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${isCancelled ? 'bg-red-400' : isCompleted ? 'bg-green-500' : 'bg-indigo-400'}`}></div>
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <div className="text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-2 flex-wrap">
                                            <span className="bg-white border px-1.5 py-0.5 rounded text-gray-700">
                                                {format(new Date(item.date), 'dd/MM/yyyy')}
                                            </span>
                                            {item.shift}
                                            {isCompleted && <span className="text-green-600 bg-green-100 px-1 rounded">Hoàn thành</span>}
                                            {isCancelled && <span className="text-red-600 bg-red-100 px-1 rounded">Đã hủy</span>}
                                            {assigneeNames && <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded border border-blue-200" title="Người thực hiện">{assigneeNames}</span>}
                                        </div>
                                        <div className={`font-bold text-lg ${isCancelled ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{job?.name}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-bold text-indigo-700">{job?.standardPoint} điểm</div>
                                        <div className="text-xs text-gray-500">{job?.durationMinutes} phút</div>
                                    </div>
                                </div>

                                {subs.length > 0 && (
                                    <div className="mt-3 bg-white/60 rounded-lg p-2 border border-indigo-100">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center">
                                            <ListTodo className="w-3 h-3 mr-1" /> Chi tiết hạng mục ({subs.length})
                                        </div>
                                        <div className="space-y-2">
                                            {subs.map(sub => (
                                                <div key={sub.id} className="flex flex-col gap-1 text-xs border-b border-dashed border-gray-200 last:border-0 pb-2 last:pb-0">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-center gap-2 font-bold text-indigo-900">
                                                            <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">
                                                                {sub.startTime} - {sub.endTime}
                                                            </span>
                                                            <span className="line-clamp-1" title={sub.name}>{sub.name}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 pl-1">
                                                        {sub.product && (
                                                            <span className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded border">
                                                                SP: {sub.product}
                                                            </span>
                                                        )}
                                                        {sub.link && (
                                                            <a
                                                                href={sub.link}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="flex items-center text-[10px] text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 transition-colors"
                                                            >
                                                                <ExternalLink className="w-3 h-3 mr-1" />
                                                                Link họp
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="text-xs text-gray-500 mt-2">
                                    {item.note && <span className="text-blue-600 italic">Ghi chú: {item.note}</span>}
                                </div>

                                {/* Quick Actions Overlay */}
                                <div className="absolute bottom-2 right-2 flex gap-3 z-20">
                                    {/* Swap Button - Only for Pending & Self */}
                                    {currentEmployeeId !== 'all' && item.status === 'Pending' && onRequestSwap && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onRequestSwap(item); }}
                                            className="p-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-full shadow-sm transition-colors ring-1 ring-white"
                                            title="Đổi lịch"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3 4 7l4 4" /><path d="M4 7h16" /><path d="m16 21 4-4-4-4" /><path d="M20 17H4" /></svg>
                                        </button>
                                    )}

                                    {canQuickComplete && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleQuickComplete(e, item); }}
                                            className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-full shadow-sm transition-colors ring-1 ring-white"
                                            title="Hoàn thành nhanh"
                                        >
                                            <CheckCircle2 className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    );
};

export default FixedScheduleList;
