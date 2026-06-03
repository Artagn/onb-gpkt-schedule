import React, { useState, useMemo } from 'react';
import { Palmtree, Clock, CheckCircle2, Calendar, X, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { LeaveRequest, ScheduleItem, Employee, Job } from '../../types';
import { useLeaveMutations } from '../../hooks/useLeavesQuery';
import { useScheduleMutations } from '../../hooks/useSchedulesQuery';
import EmptyState from '../common/EmptyState';

interface CombinedWidgetProps {
    pendingLeaves: LeaveRequest[];
    incompleteTasks: ScheduleItem[];
    employees: Employee[];
    jobs: Job[];
    isManager: boolean;
    isStaff: boolean;
    leaveMutations: ReturnType<typeof useLeaveMutations>;
    scheduleMutations: ReturnType<typeof useScheduleMutations>;
    navigate: (path: string) => void;
    setCurrentTab: (tab: string) => void;
}

const CombinedWidget: React.FC<CombinedWidgetProps> = ({
    pendingLeaves,
    incompleteTasks,
    employees,
    jobs,
    isManager,
    isStaff,
    leaveMutations,
    scheduleMutations,
    navigate,
    setCurrentTab
}) => {
    const [activeTab, setActiveTab] = useState<'leaves' | 'tasks'>('leaves');

    const autoLeaves = useMemo(() => pendingLeaves.filter(l => /auto|tự động|system/i.test(l.reason || '')), [pendingLeaves]);
    const manualLeaves = useMemo(() => pendingLeaves.filter(l => !/auto|tự động|system/i.test(l.reason || '')), [pendingLeaves]);

    return (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col h-[400px] md:h-[500px]">
            {/* Tabs Header - ARIA accessible */}
            <div className="flex border-b" role="tablist" aria-label="Dashboard tabs">
                <button
                    onClick={() => setActiveTab('leaves')}
                    role="tab"
                    id="leaves-tab"
                    aria-selected={activeTab === 'leaves'}
                    aria-controls="leaves-panel"
                    className={`flex-1 py-3 min-h-[48px] text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'leaves' ? 'border-yellow-500 text-yellow-700 bg-yellow-50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
                >
                    <Palmtree className="w-4 h-4" />
                    <span className="hidden sm:inline">Lịch nghỉ</span>
                    <span className="sm:hidden">Nghỉ</span>
                    {pendingLeaves.length > 0 && <span className="ml-1 bg-yellow-500 text-white text-[10px] px-1.5 rounded-full">{pendingLeaves.length}</span>}
                </button>
                <button
                    onClick={() => setActiveTab('tasks')}
                    role="tab"
                    id="tasks-tab"
                    aria-selected={activeTab === 'tasks'}
                    aria-controls="tasks-panel"
                    className={`flex-1 py-3 min-h-[48px] text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'tasks' ? 'border-red-500 text-red-700 bg-red-50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
                >
                    <Clock className="w-4 h-4" />
                    <span className="hidden sm:inline">Tồn đọng</span>
                    <span className="sm:hidden">Việc</span>
                    {incompleteTasks.length > 0 && <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 rounded-full">{incompleteTasks.length}</span>}
                </button>
            </div>

            {/* Content Panels - ARIA accessible */}
            <div className="flex-1 overflow-y-auto p-0 bg-gray-50/50">
                {activeTab === 'leaves' && (
                    <div className="space-y-4 p-3">
                        {pendingLeaves.length === 0 && (
                            <EmptyState
                                icon={Palmtree}
                                title="Không có đơn nghỉ chờ duyệt"
                                description="Tất cả đơn nghỉ đã được xử lý."
                                size="sm"
                            />
                        )}

                        {/* Manual Section */}
                        {manualLeaves.length > 0 && (
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Người dùng gửi ({manualLeaves.length})</h4>
                                <div className="space-y-2">
                                    {manualLeaves.map(leave => (
                                        <LeaveItem
                                            key={leave.id}
                                            leave={leave}
                                            employees={employees}
                                            isManager={isManager}
                                            leaveMutations={leaveMutations}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Auto Section */}
                        {autoLeaves.length > 0 && (
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 ml-1 mt-2">Tự động sinh ({autoLeaves.length})</h4>
                                <div className="space-y-2">
                                    {autoLeaves.map(leave => (
                                        <LeaveItem
                                            key={leave.id}
                                            leave={leave}
                                            employees={employees}
                                            isManager={isManager}
                                            leaveMutations={leaveMutations}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="pt-2 text-center">
                            <button onClick={() => setCurrentTab('mytasks:leave')} className="text-xs text-blue-600 hover:underline">Xem tất cả trong Quản lý &rarr;</button>
                        </div>
                    </div>
                )}

                {activeTab === 'tasks' && (
                    <div className="space-y-2 p-3">
                        {incompleteTasks.length === 0 ? (
                            <EmptyState
                                icon={CheckCircle2}
                                title="Tất cả công việc đã hoàn thành"
                                description="Tuyệt vời! Không còn việc tồn đọng."
                                size="sm"
                            />
                        ) : (
                            <>
                                {incompleteTasks.slice(0, 15).map(item => {
                                    const job = jobs.find(j => j.id === item.jobId);
                                    const assignedEmps = item.employeeIds.map((id: string) => employees.find(e => e.id === id)).filter(Boolean);
                                    return (
                                        <div key={item.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="text-sm font-bold text-gray-800">{job?.name}</div>
                                                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                        <Calendar className="w-3 h-3" />
                                                        {format(parseISO(item.date), 'dd/MM/yyyy')} • <span className={`font-medium ${item.shift === 'Tối' ? 'text-indigo-600' : 'text-orange-600'}`}>{item.shift}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {!isStaff && (
                                                <div className="text-xs text-slate-500 mt-2 bg-slate-50 p-1.5 rounded">
                                                    Người làm: {assignedEmps.map((e: any) => e?.fullName).join(', ')}
                                                </div>
                                            )}

                                            {isManager && (
                                                <div className="flex gap-2 mt-3 pt-2 border-t border-gray-50">
                                                    <button
                                                        onClick={() => {
                                                            scheduleMutations.update.mutate({ ...item, status: 'Completed' });
                                                            toast.success("Đã hoàn thành công việc");
                                                        }}
                                                        aria-label="Đánh dấu hoàn thành"
                                                        className="flex-1 bg-green-50 text-green-700 px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-bold hover:bg-green-100 active:bg-green-200 transition-colors border border-green-200"
                                                    >
                                                        ✓ Xong
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (confirm('Đánh dấu hủy công việc này?')) {
                                                                scheduleMutations.update.mutate({ ...item, status: 'Cancelled' });
                                                                toast.success("Đã hủy công việc");
                                                            }
                                                        }}
                                                        aria-label="Hủy công việc"
                                                        className="flex-1 bg-gray-50 text-gray-700 px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-bold hover:bg-gray-100 active:bg-gray-200 transition-colors border border-gray-200"
                                                    >
                                                        Hủy
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {incompleteTasks.length > 15 && (
                                    <div className="text-center py-2 text-xs text-gray-500 italic">...còn {incompleteTasks.length - 15} việc nữa</div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const LeaveItem = ({ leave, employees, isManager, leaveMutations }: any) => {
    const emp = employees.find((e: any) => e.id === leave.employeeId);
    return (
        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm relative group">
            <div className="flex justify-between items-start mb-1">
                <div className="text-xs font-bold text-gray-800">{emp?.fullName}</div>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{leave.shift}</span>
            </div>
            <div className="text-xs text-gray-600 mb-1">
                {format(parseISO(leave.date), 'dd/MM/yyyy')}
            </div>
            <div className="text-xs text-gray-500 italic bg-slate-50 p-1.5 rounded">
                "{leave.reason}"
            </div>
            {isManager && (
                <div className="flex gap-2 mt-2 pt-2 border-t border-gray-50 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => leaveMutations.update.mutate({ ...leave, status: 'Approved' })}
                        className="flex-1 bg-green-50 text-green-700 px-2 py-1 rounded text-xs font-medium hover:bg-green-100 border border-green-200"
                    >
                        ✓ Duyệt
                    </button>
                    <button
                        onClick={() => {
                            if (confirm('Từ chối đơn này?')) {
                                leaveMutations.update.mutate({ ...leave, status: 'Rejected' });
                            }
                        }}
                        className="flex-1 bg-red-50 text-red-700 px-2 py-1 rounded text-xs font-medium hover:bg-red-100 border border-red-200"
                    >
                        ✗ Từ chối
                    </button>
                </div>
            )}
        </div>
    );
};

export default CombinedWidget;
