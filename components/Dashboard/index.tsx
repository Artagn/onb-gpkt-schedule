
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Users, Calendar, CheckSquare, Clock, CalendarDays, AlertTriangle, CheckCircle2, Timer, Filter, Briefcase, Palmtree, ChevronRight, BarChart, BarChart2, ArrowRight, X } from 'lucide-react';
import toast from 'react-hot-toast';

import { useDashboardStats } from './useDashboardStats';
import ScheduleCard from './ScheduleCard';
import StatCard from './StatCard';
import CombinedWidget from './CombinedWidget';
import EmptyState from '../common/EmptyState';
import { ROUTES } from '../../routes';
import { JobGroup, Status } from '../../types';
import { useLeaveMutations } from '../../hooks/useLeavesQuery';
import { useScheduleMutations } from '../../hooks/useSchedulesQuery';

interface Props {
    user: any;
}

const Dashboard: React.FC<Props> = ({ user }) => {
    const navigate = useNavigate();

    // Use custom hook for logic
    const {
        employees, jobs,
        currentEmp, isStaff, isManager, isAdmin, displayName, displayRole,
        activeEmployees, totalJobs,
        todayShifts, peopleWorkingToday, pendingAllocations,
        unassignedTasks,
        categorizedSchedule,
        pendingLeaves, incompleteTasks, displaySchedule,
        now,
        filterEmployeeId, setFilterEmployeeId,
        filterJobGroup, setFilterJobGroup,
        getSubJobs
    } = useDashboardStats(user);

    // Mutations
    const leaveMutations = useLeaveMutations();
    const scheduleMutations = useScheduleMutations();

    // Handlers for Nghỉ bù items
    const handleConfirmRest = async (item: any) => {
        try {
            await scheduleMutations.update.mutateAsync({ ...item, status: 'Approved' });
            toast.success('Đã xác nhận nghỉ bù!');
        } catch (error) {
            toast.error('Lỗi khi xác nhận nghỉ bù');
        }
    };

    const handleSwapRest = (item: any) => {
        // Navigate to swap market with this item selected
        navigate(`${ROUTES.MY_TASKS}?swap=${item.id}`);
    };

    // Helper for legacy navigation calls
    const setCurrentTab = (tab: string) => {
        if (tab === 'employees') navigate(ROUTES.EMPLOYEES);
        else if (tab === 'schedule') navigate(ROUTES.COORDINATION);
        else if (tab === 'mytasks') navigate(ROUTES.MY_TASKS);
        else if (tab.startsWith('mytasks:')) navigate(`${ROUTES.MY_TASKS}/${tab.split(':')[1]}`);
        else if (tab === 'reports') navigate(ROUTES.REPORTS);
        else if (tab === 'jobs') navigate(ROUTES.ADMIN);
        else if (tab === 'admin') navigate(ROUTES.ADMIN);
        else if (tab === 'daily') navigate(ROUTES.DAILY_ALLOCATION);
        else if (tab === 'config') navigate(ROUTES.CONFIG);
    };

    return (
        <div className="p-6 bg-slate-50 min-h-full">
            {/* 1. Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Xin chào, {displayName}! 👋</h1>
                    <p className="text-slate-500 mt-1 text-sm flex items-center gap-2">
                        <span>Hôm nay: {format(now, 'EEEE, dd/MM/yyyy', { locale: vi })}</span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                        <span className="font-bold text-blue-600">{format(now, 'HH:mm')}</span>
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
                    <span className="bg-slate-100 px-3 py-1.5 rounded text-xs font-bold uppercase text-slate-600">{displayRole}</span>
                </div>
            </div>

            {/* 2. Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                {isStaff ? (
                    /* STAFF STATS: Focus on Personal KPI & Tasks */
                    <>
                        <StatCard
                            title="Điểm Tuần này"
                            value={currentEmp?.weeklyScore || 0}
                            icon={BarChart}
                            color={{ bg: 'bg-green-50', text: 'text-green-600' }}
                            subText="KPI tuần hiện tại"
                            onClick={() => setCurrentTab('reports')}
                        />
                        <StatCard
                            title="Điểm Tháng này"
                            value={currentEmp?.monthlyScore || 0}
                            icon={BarChart2}
                            color={{ bg: 'bg-emerald-50', text: 'text-emerald-600' }}
                            subText="KPI tháng hiện tại"
                            onClick={() => setCurrentTab('reports')}
                        />
                        <StatCard
                            title="Lịch hôm nay"
                            value={todayShifts}
                            icon={Calendar}
                            color={{ bg: 'bg-indigo-50', text: 'text-indigo-600' }}
                            subText="Ca làm việc"
                            onClick={() => setCurrentTab('schedule')}
                        />
                        <StatCard
                            title="Tồn đọng"
                            value={incompleteTasks.length}
                            icon={CheckSquare}
                            color={{ bg: 'bg-orange-50', text: 'text-orange-600' }}
                            subText={incompleteTasks.length > 0 ? "Cần hoàn thành" : "Đã hoàn thành"}
                            onClick={() => setCurrentTab('mytasks')}
                        />
                    </>
                ) : (
                    /* MANAGER STATS: Focus on Operations */
                    <>
                        <StatCard
                            title="Nhân sự"
                            value={activeEmployees}
                            icon={Users}
                            color={{ bg: 'bg-blue-50', text: 'text-blue-600' }}
                            subText={`${employees.length - activeEmployees} nhân sự ngưng hoạt động`}
                            onClick={isAdmin ? () => setCurrentTab('employees') : undefined}
                        />
                        <StatCard
                            title="Việc chưa phân công"
                            value={unassignedTasks.length}
                            icon={AlertTriangle}
                            color={unassignedTasks.length > 0 ? { bg: 'bg-red-50', text: 'text-red-600' } : { bg: 'bg-green-50', text: 'text-green-600' }}
                            subText={unassignedTasks.length > 0 ? "Cần xử lý ngay" : "Đã tối ưu"}
                            onClick={() => setCurrentTab('schedule')}
                        />
                        <StatCard
                            title="Tồn đọng duyệt/chia"
                            value={pendingAllocations + pendingLeaves.length}
                            icon={CheckSquare}
                            color={pendingAllocations + pendingLeaves.length > 0 ? { bg: 'bg-orange-50', text: 'text-orange-600' } : { bg: 'bg-gray-50', text: 'text-gray-600' }}
                            subText={pendingAllocations > 0 ? "Cần chia lịch bổ sung" : "Giám sát tốt"}
                            onClick={() => setCurrentTab('daily')} // Link to Daily Allocation for quick fix
                        />
                        <StatCard
                            title="Lịch hôm nay"
                            value={todayShifts}
                            icon={Calendar}
                            color={{ bg: 'bg-indigo-50', text: 'text-indigo-600' }}
                            subText={`${peopleWorkingToday} nhân viên có lịch`}
                            onClick={() => setCurrentTab('schedule')}
                        />
                    </>
                )}
            </div>

            {/* 3. Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

                {/* LEFT COLUMN: Quick Actions & Unassigned Tasks (Visible to Admin/Coordinator) */}
                <div className="xl:col-span-1 space-y-6">
                    {/* Quick Actions */}
                    <div className="bg-white rounded-xl shadow-sm border p-5">
                        <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wide">Truy cập nhanh</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {isStaff ? (
                                <>
                                    <button onClick={() => setCurrentTab('mytasks')} className="p-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors text-center group">
                                        <Calendar className="w-5 h-5 mx-auto mb-1 text-indigo-600" />
                                        <span className="text-xs font-bold text-indigo-800">Lịch của tôi</span>
                                    </button>
                                    <button onClick={() => setCurrentTab('reports')} className="p-3 rounded-lg bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-sm transition-all text-center group">
                                        <BarChart className="w-5 h-5 mx-auto mb-1 text-gray-500 group-hover:text-blue-600" />
                                        <span className="text-xs font-medium text-gray-700">Báo cáo</span>
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => setCurrentTab('schedule')} className="p-3 rounded-lg bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-sm transition-all text-center group">
                                        <Calendar className="w-5 h-5 mx-auto mb-1 text-gray-500 group-hover:text-blue-600" />
                                        <span className="text-xs font-medium text-gray-700">Điều phối</span>
                                    </button>
                                    <button onClick={() => setCurrentTab('daily')} className="p-3 rounded-lg bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-sm transition-all text-center group">
                                        <CheckSquare className="w-5 h-5 mx-auto mb-1 text-gray-500 group-hover:text-blue-600" />
                                        <span className="text-xs font-medium text-gray-700">Phân công</span>
                                    </button>
                                    <button onClick={() => setCurrentTab('reports')} className="p-3 rounded-lg bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-sm transition-all text-center group">
                                        <BarChart className="w-5 h-5 mx-auto mb-1 text-gray-500 group-hover:text-blue-600" />
                                        <span className="text-xs font-medium text-gray-700">Báo cáo</span>
                                    </button>
                                    {isAdmin ? (
                                        <button onClick={() => setCurrentTab('config')} className="p-3 rounded-lg bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-sm transition-all text-center group">
                                            <Users className="w-5 h-5 mx-auto mb-1 text-gray-500 group-hover:text-blue-600" />
                                            <span className="text-xs font-medium text-gray-700">Cấu hình</span>
                                        </button>
                                    ) : (
                                        <button onClick={() => setCurrentTab('mytasks')} className="p-3 rounded-lg bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-sm transition-all text-center group">
                                            <Calendar className="w-5 h-5 mx-auto mb-1 text-gray-500 group-hover:text-blue-600" />
                                            <span className="text-xs font-medium text-gray-700">Lịch của tôi</span>
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* UNASSIGNED TASKS (Admin Only) */}
                    {!isStaff && (
                        <div className={`rounded-xl shadow-sm border overflow-hidden ${unassignedTasks.length > 0 ? 'bg-white border-orange-200' : 'bg-white border-gray-100'}`}>
                            <div className={`px-5 py-3 border-b flex justify-between items-center ${unassignedTasks.length > 0 ? 'bg-orange-50 border-orange-100' : 'bg-gray-50'}`}>
                                <h3 className={`font-bold text-sm uppercase flex items-center ${unassignedTasks.length > 0 ? 'text-orange-700' : 'text-gray-600'}`}>
                                    <AlertTriangle className={`w-4 h-4 mr-2 ${unassignedTasks.length > 0 ? 'text-orange-600' : 'text-gray-400'}`} />
                                    Việc chưa phân công
                                </h3>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${unassignedTasks.length > 0 ? 'bg-orange-200 text-orange-800' : 'bg-gray-200 text-gray-600'}`}>
                                    {unassignedTasks.length}
                                </span>
                            </div>

                            <div className="p-0 max-h-[400px] overflow-y-auto">
                                {unassignedTasks.length === 0 ? (
                                    <div className="p-6 text-center text-gray-400 text-xs italic">
                                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500 opacity-50" />
                                        Tuyệt vời! Tất cả lịch mẫu hôm nay đã được phân công.
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100">
                                        {unassignedTasks.map((item, idx) => (
                                            <div key={idx} className="p-3 hover:bg-gray-50 transition-colors flex justify-between items-center">
                                                <div>
                                                    <div className="font-bold text-sm text-gray-800">{item.job.name}</div>
                                                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                                                        <span className={`px-1.5 rounded font-bold text-[10px] uppercase border ${item.pattern.shift === 'Sáng' ? 'bg-orange-50 text-orange-600 border-orange-100' : item.pattern.shift === 'Chiều' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-purple-50 text-purple-600 border-purple-100'}`}>
                                                            {item.pattern.shift}
                                                        </span>
                                                        <span>Thiếu: <strong className="text-red-600">{item.missing}</strong> người</span>
                                                    </div>
                                                </div>
                                                <button onClick={() => setCurrentTab('schedule')} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-full" title="Đi tới điều phối">
                                                    <ArrowRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {unassignedTasks.length > 0 && (
                                <div className="p-2 bg-orange-50 border-t border-orange-100 text-center">
                                    <button onClick={() => setCurrentTab('schedule')} className="text-xs font-bold text-orange-700 hover:underline">
                                        Xử lý ngay trong Điều phối &rarr;
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* COMBINED WIDGET: PENDING LEAVES & INCOMPLETE TASKS */}
                    <CombinedWidget
                        pendingLeaves={pendingLeaves}
                        incompleteTasks={incompleteTasks}
                        employees={employees}
                        jobs={jobs}
                        isManager={isManager}
                        isStaff={isStaff}
                        leaveMutations={leaveMutations}
                        scheduleMutations={scheduleMutations}
                        navigate={navigate}
                        setCurrentTab={setCurrentTab}
                    />
                </div>

                {/* RIGHT COLUMN: Today's Schedule */}
                <div className="xl:col-span-3 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border min-h-[600px] flex flex-col">

                        {/* Header & Filters */}
                        <div className="p-5 border-b space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <h3 className="font-bold text-lg text-slate-800 flex items-center">
                                    <CalendarDays className="w-5 h-5 mr-2 text-blue-600" />
                                    {isStaff ? 'Lịch trình của bạn hôm nay' : 'Lịch làm việc chi tiết hôm nay'}
                                    <span className="ml-3 text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                        {displaySchedule.length} ca
                                    </span>
                                </h3>

                                {/* Filters for Admin */}
                                {!isStaff && (
                                    <div className="flex flex-wrap gap-2">
                                        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5 border">
                                            <Filter className="w-3.5 h-3.5 text-gray-500" />
                                            <select
                                                className="bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer max-w-[150px]"
                                                value={filterEmployeeId}
                                                onChange={(e) => setFilterEmployeeId(e.target.value)}
                                            >
                                                <option value="all">Tất cả nhân viên</option>
                                                {employees.filter(e => e.status === Status.Active).map(e => (
                                                    <option key={e.id} value={e.id}>{e.fullName}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5 border">
                                            <Briefcase className="w-3.5 h-3.5 text-gray-500" />
                                            <select
                                                className="bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer"
                                                value={filterJobGroup}
                                                onChange={(e) => setFilterJobGroup(e.target.value)}
                                            >
                                                <option value="all">Tất cả nhóm việc</option>
                                                {Object.values(JobGroup).map(g => (
                                                    <option key={g} value={g}>{g}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-5 flex-1 bg-gray-50/50">
                            {displaySchedule.length === 0 ? (
                                <div className="h-full flex items-center justify-center py-8">
                                    <EmptyState
                                        icon={Calendar}
                                        title={isStaff ? 'Bạn không có lịch làm việc hôm nay' : 'Không tìm thấy lịch phù hợp với bộ lọc'}
                                        description={isStaff ? 'Hãy xem lịch tuần tới hoặc đăng ký đổi ca.' : 'Thử thay đổi bộ lọc nhân viên hoặc nhóm việc.'}
                                    />
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {/* 1. ONGOING */}
                                    {categorizedSchedule.ongoing.length > 0 && (
                                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="relative flex h-3 w-3">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                                </span>
                                                <h4 className="font-bold text-green-700 uppercase text-sm tracking-wide">Đang diễn ra</h4>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {categorizedSchedule.ongoing.map(s => {
                                                    const job = jobs.find(j => j.id === s.jobId);
                                                    const subs = getSubJobs(s.jobId, s.shift);
                                                    const assignedEmps = s.employeeIds.map(id => employees.find(e => e.id === id));
                                                    return <ScheduleCard key={s.id} item={s} job={job} subs={subs} assignedEmps={assignedEmps} isStaff={isStaff} onConfirmRest={handleConfirmRest} onSwapRest={handleSwapRest} />;
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* 2. UPCOMING */}
                                    {categorizedSchedule.upcoming.length > 0 && (
                                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-700 delay-100">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Timer className="w-4 h-4 text-blue-600" />
                                                <h4 className="font-bold text-blue-700 uppercase text-sm tracking-wide">Sắp diễn ra</h4>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {categorizedSchedule.upcoming.map(s => {
                                                    const job = jobs.find(j => j.id === s.jobId);
                                                    const subs = getSubJobs(s.jobId, s.shift);
                                                    const assignedEmps = s.employeeIds.map(id => employees.find(e => e.id === id));
                                                    return <ScheduleCard key={s.id} item={s} job={job} subs={subs} assignedEmps={assignedEmps} isStaff={isStaff} onConfirmRest={handleConfirmRest} onSwapRest={handleSwapRest} />;
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* 3. COMPLETED */}
                                    {categorizedSchedule.finished.length > 0 && (
                                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-700 delay-200">
                                            <div className="flex items-center gap-2 mb-3">
                                                <CheckCircle2 className="w-4 h-4 text-gray-400" />
                                                <h4 className="font-bold text-gray-500 uppercase text-sm tracking-wide">Đã hoàn thành / Kết thúc</h4>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {categorizedSchedule.finished.map(s => {
                                                    const job = jobs.find(j => j.id === s.jobId);
                                                    const subs = getSubJobs(s.jobId, s.shift);
                                                    const assignedEmps = s.employeeIds.map(id => employees.find(e => e.id === id));
                                                    return <ScheduleCard key={s.id} item={s} job={job} subs={subs} assignedEmps={assignedEmps} isStaff={isStaff} isFaded onConfirmRest={handleConfirmRest} onSwapRest={handleSwapRest} />;
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {displaySchedule.length > 0 && isStaff && (
                            <div className="p-4 border-t bg-white rounded-b-xl text-center">
                                <button onClick={() => setCurrentTab('mytasks')} className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-bold flex items-center justify-center">
                                    Xem chi tiết & Báo cáo trong Lịch của tôi <ChevronRight className="w-3 h-3 ml-1" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
