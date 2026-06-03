
import React from 'react';
import { LayoutGrid, CalendarRange, ListTodo, Palmtree, Award, CheckCircle2, Filter, Zap, X, Plus, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { Role, Status } from '../../types';
import Reports from '../Reports/index';

import { useMyTasks, TabType, DatePreset } from './useMyTasks';
import FixedScheduleList from './FixedScheduleList';
import DailyTasksList from './DailyTasksList';
import WeeklyTrainingTable from './WeeklyTrainingTable';
import LeaveManager from './LeaveManager';
import { TaskModal, EditRestModal, SubJobDetailModal } from './Modals';
import { addDays } from 'date-fns';
import SwapMarket from '../SwapMarket';
import SwapRequestModal from '../SwapMarket/SwapRequestModal';
import { ArrowLeftRight } from 'lucide-react';

interface Props {
    user: any;
    initialTab?: TabType;
}

const MyTasks: React.FC<Props> = ({ user, initialTab }) => {
    const {
        employees, jobs, subJobs, schedule, allocations, leaves,
        currentEmployeeId, setCurrentEmployeeId,
        isManager, activeEmployees,
        fromDate, setFromDate, toDate, setToDate, datePreset, handlePresetChange,
        filterShift, setFilterShift,
        filterStatus, setFilterStatus,
        activeTab, setActiveTab,
        myFixedSchedule, displayedFixedSchedule, myDailyAllocations, unifiedLeaves, leaveBalance,
        handleUpdateProgress, handleSaveProgress, isDirty,
        filterJobIds, setFilterJobIds, showJobFilter, setShowJobFilter,
        selectedTask, setSelectedTask, actionNote, setActionNote, trainingMetrics, setTrainingMetrics, handleTaskAction, handleQuickComplete,
        editingRestItem, setEditingRestItem, handleSaveRestItem,
        editingAutoLeave, setEditingAutoLeave, handleSaveAutoLeave,
        newLeave, setNewLeave, handleAddLeave, handleDeleteLeave, handleApproveLeave, handleRejectLeave, handleUnapproveLeave,
        weeklyViewDate, setWeeklyViewDate, showWeeklyTable, setShowWeeklyTable, viewingDetailItem, setViewingDetailItem,
        getSubJobs
    } = useMyTasks(user, initialTab);

    // --- SWAP MODAL STATE ---
    const [showSwapModal, setShowSwapModal] = React.useState(false);
    const [swapSourceItem, setSwapSourceItem] = React.useState<any>(null);

    const handleRequestSwap = (item: any) => {
        setSwapSourceItem(item);
        setShowSwapModal(true);
    };

    // --- RENDER HELPERS ---
    const currentLoggedEmp = employees.find(e => e.email.toLowerCase() === user?.email?.toLowerCase());

    const renderStatisticalCards = () => (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* 1. Total Assigned */}
            <div
                onClick={() => setFilterStatus('All')}
                className={`bg-white p-3 rounded-lg shadow-sm border cursor-pointer transition-all hover:shadow-md flex items-center justify-between ${filterStatus === 'All' ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50' : 'border-blue-100'}`}
            >
                <div>
                    <div className="text-xs font-bold text-blue-500 uppercase mb-1">Tổng việc</div>
                    <div className="text-2xl font-bold text-gray-800">{myFixedSchedule.length}</div>
                </div>
                <div className={`p-2 rounded-full ${filterStatus === 'All' ? 'bg-blue-200 text-blue-700' : 'bg-blue-50 text-blue-600'}`}>
                    <CalendarRange className="w-5 h-5" />
                </div>
            </div>

            {/* 2. Completed */}
            <div
                onClick={() => setFilterStatus('Completed')}
                className={`bg-white p-3 rounded-lg shadow-sm border cursor-pointer transition-all hover:shadow-md flex items-center justify-between ${filterStatus === 'Completed' ? 'border-green-500 ring-1 ring-green-500 bg-green-50' : 'border-green-100'}`}
            >
                <div>
                    <div className="text-xs font-bold text-green-500 uppercase mb-1">Hoàn thành</div>
                    <div className="text-2xl font-bold text-gray-800">
                        {myFixedSchedule.filter(s => s.status === 'Completed').length}
                    </div>
                </div>
                <div className={`p-2 rounded-full ${filterStatus === 'Completed' ? 'bg-green-200 text-green-700' : 'bg-green-50 text-green-600'}`}>
                    <CheckCircle2 className="w-5 h-5" />
                </div>
            </div>

            {/* 3. Pending / To Do */}
            <div
                onClick={() => setFilterStatus('Pending')}
                className={`bg-white p-3 rounded-lg shadow-sm border cursor-pointer transition-all hover:shadow-md flex items-center justify-between ${filterStatus === 'Pending' ? 'border-orange-500 ring-1 ring-orange-500 bg-orange-50' : 'border-orange-100'}`}
            >
                <div>
                    <div className="text-xs font-bold text-orange-500 uppercase mb-1">Chưa thực hiện</div>
                    <div className="text-2xl font-bold text-gray-800">
                        {myFixedSchedule.filter(s => s.status === 'Pending').length}
                    </div>
                </div>
                <div className={`p-2 rounded-full ${filterStatus === 'Pending' ? 'bg-orange-200 text-orange-700' : 'bg-orange-50 text-orange-600'}`}>
                    <Zap className="w-5 h-5" />
                </div>
            </div>

            {/* 4. Cancelled */}
            <div
                onClick={() => setFilterStatus('Cancelled')}
                className={`bg-white p-3 rounded-lg shadow-sm border cursor-pointer transition-all hover:shadow-md flex items-center justify-between ${filterStatus === 'Cancelled' ? 'border-red-500 ring-1 ring-red-500 bg-red-50' : 'border-red-100'}`}
            >
                <div>
                    <div className="text-xs font-bold text-red-500 uppercase mb-1">Đã hủy</div>
                    <div className="text-2xl font-bold text-gray-800">
                        {myFixedSchedule.filter(s => s.status === 'Cancelled').length}
                    </div>
                </div>
                <div className={`p-2 rounded-full ${filterStatus === 'Cancelled' ? 'bg-red-200 text-red-700' : 'bg-red-50 text-red-600'}`}>
                    <X className="w-5 h-5" />
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col space-y-4 pb-20">
            {/* --- TOP BAR (Employee & Unified Filter) --- */}
            <div className="bg-white p-4 rounded-lg shadow-sm flex flex-col xl:flex-row justify-between items-center gap-4">
                {/* Employee Selector */}
                <div className="flex items-center gap-3 w-full xl:w-auto">
                    <div className="bg-blue-100 p-2 rounded-full">
                        <CheckCircle2 className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Nhân viên</label>
                        {isManager ? (
                            <select
                                className="font-bold text-gray-800 bg-transparent border-none focus:ring-0 p-0 cursor-pointer text-lg outline-none"
                                value={currentEmployeeId}
                                onChange={(e) => setCurrentEmployeeId(e.target.value)}
                            >
                                <option value="all">-- Tất cả nhân viên --</option>
                                {activeEmployees.map(e => (
                                    <option key={e.id} value={e.id}>{e.fullName}</option>
                                ))}
                            </select>
                        ) : (
                            <span className="font-bold text-gray-800 text-lg">
                                {currentLoggedEmp ? currentLoggedEmp.fullName : "Khách"}
                            </span>
                        )}
                    </div>
                </div>

                {/* UNIFIED FILTER BAR */}
                <div className="flex flex-col sm:flex-row items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-100 w-full xl:w-auto">

                    {/* Date Preset Selector */}
                    <div className="flex items-center bg-white rounded shadow-sm border px-2 py-1 h-[38px]">
                        <span className="text-xs text-gray-500 font-medium mr-2">Thời gian:</span>
                        <select
                            value={datePreset}
                            onChange={(e) => handlePresetChange(e.target.value as DatePreset)}
                            className="text-sm font-bold text-blue-700 bg-transparent border-none focus:ring-0 p-0 cursor-pointer outline-none"
                        >
                            <option value="today">Hôm nay</option>
                            <option value="yesterday">Hôm qua</option>
                            <option value="tomorrow">Ngày mai</option>
                            <option value="thisWeek">Tuần này</option>
                            <option value="lastWeek">Tuần trước</option>
                            <option value="nextWeek">Tuần sau</option>
                            <option value="thisMonth">Tháng này</option>
                            <option value="lastMonth">Tháng trước</option>
                            <option value="nextMonth">Tháng sau</option>
                            <option value="custom">Tùy chọn</option>
                        </select>
                    </div>

                    {/* Custom Date Range (only shown when preset is 'custom') */}
                    {datePreset === 'custom' && (
                        <div className="flex items-center bg-white rounded shadow-sm border px-2 py-1 gap-2">
                            <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500 font-medium">Từ:</span>
                                <input
                                    type="date"
                                    className="border-none text-sm font-bold text-gray-700 focus:ring-0 p-1 bg-transparent cursor-pointer outline-none"
                                    value={format(fromDate, 'yyyy-MM-dd')}
                                    onChange={(e) => {
                                        if (e.target.value) setFromDate(parseISO(e.target.value));
                                    }}
                                />
                            </div>
                            <span className="text-gray-400">-</span>
                            <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500 font-medium">Đến:</span>
                                <input
                                    type="date"
                                    className="border-none text-sm font-bold text-gray-700 focus:ring-0 p-1 bg-transparent cursor-pointer outline-none"
                                    value={format(toDate, 'yyyy-MM-dd')}
                                    onChange={(e) => {
                                        if (e.target.value) setToDate(parseISO(e.target.value));
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Date Range Display (for non-custom multi-day presets) */}
                    {datePreset !== 'custom' && fromDate.getTime() !== toDate.getTime() && (
                        <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {format(fromDate, 'dd/MM')} - {format(toDate, 'dd/MM/yyyy')}
                        </div>
                    )}

                    {/* Shift Selector */}
                    <div className="flex items-center bg-white rounded shadow-sm border px-3 py-1.5 h-[38px]">
                        <Filter className="w-3.5 h-3.5 text-gray-500 mr-2" />
                        <span className="text-xs text-gray-500 font-medium mr-2">Buổi:</span>
                        <select
                            value={filterShift}
                            onChange={(e) => setFilterShift(e.target.value)}
                            className="text-sm font-bold text-indigo-700 bg-transparent border-none focus:ring-0 p-0 cursor-pointer outline-none"
                        >
                            <option value="All">Tất cả</option>
                            <option value="Sáng">Sáng</option>
                            <option value="Chiều">Chiều</option>
                            <option value="Tối">Tối</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* --- STATISTICS DASHBOARD --- */}
            {renderStatisticalCards()}

            {/* --- TABS --- */}
            <div className="bg-white rounded-lg shadow-sm border-b px-4 overflow-x-auto">
                <div className="flex border-b mb-4">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`flex items-center px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'overview' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <LayoutGrid className="w-4 h-4 mr-2" /> Tổng quan
                    </button>
                    <button
                        onClick={() => setActiveTab('fixed')}
                        className={`flex items-center px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'fixed' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <CalendarRange className="w-4 h-4 mr-2" /> Lịch cố định
                    </button>
                    <button
                        onClick={() => setActiveTab('daily')}
                        className={`flex items-center px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'daily' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <ListTodo className="w-4 h-4 mr-2" /> Việc hàng ngày
                    </button>
                    <button
                        onClick={() => setActiveTab('leave')}
                        className={`flex items-center px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'leave' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <Palmtree className="w-4 h-4 mr-2" /> Nghỉ phép / Nghỉ bù
                    </button>
                    <button
                        onClick={() => setActiveTab('kpi')}
                        className={`flex items-center px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'kpi' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <Award className="w-4 h-4 mr-2" /> KPI Cá nhân
                    </button>
                    <button
                        onClick={() => setActiveTab('market')}
                        className={`flex items-center px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'market' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <ArrowLeftRight className="w-4 h-4 mr-2" /> Đổi lịch
                    </button>
                </div>
            </div>

            {/* --- CONTENT AREA --- */}
            <div className="">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <FixedScheduleList
                            displayedFixedSchedule={displayedFixedSchedule}
                            currentEmployeeId={currentEmployeeId}
                            filterShift={filterShift}
                            jobs={jobs}
                            employees={employees}
                            subJobs={subJobs}
                            setSelectedTask={setSelectedTask}
                            setActionNote={setActionNote}
                            setTrainingMetrics={setTrainingMetrics}
                            handleQuickComplete={handleQuickComplete}
                            setEditingRestItem={setEditingRestItem}
                            onRequestSwap={handleRequestSwap}
                        />
                        <DailyTasksList
                            myDailyAllocations={myDailyAllocations}
                            jobs={jobs}
                            employees={employees}
                            currentEmployeeId={currentEmployeeId}
                            showJobFilter={showJobFilter}
                            setShowJobFilter={setShowJobFilter}
                            handleSaveProgress={handleSaveProgress}
                            isDirty={isDirty}
                            filterJobIds={filterJobIds}
                            setFilterJobIds={setFilterJobIds}
                            handleUpdateProgress={handleUpdateProgress}
                        />
                    </div>
                )}

                {activeTab === 'fixed' && (
                    <div className="flex flex-col gap-4">
                        {/* Weekly Table Section */}
                        <div className="flex-none px-1 pt-1">
                            <WeeklyTrainingTable
                                weeklyViewDate={weeklyViewDate}
                                setWeeklyViewDate={setWeeklyViewDate}
                                showWeeklyTable={showWeeklyTable}
                                setShowWeeklyTable={setShowWeeklyTable}
                                schedule={schedule}
                                currentEmployeeId={currentEmployeeId}
                                jobs={jobs}
                                setViewingDetailItem={setViewingDetailItem}
                            />
                        </div>
                        {/* Detail List Section */}
                        <div className="">
                            <FixedScheduleList
                                displayedFixedSchedule={displayedFixedSchedule}
                                currentEmployeeId={currentEmployeeId}
                                filterShift={filterShift}
                                jobs={jobs}
                                employees={employees}
                                subJobs={subJobs}
                                fullWidth={true}
                                setSelectedTask={setSelectedTask}
                                setActionNote={setActionNote}
                                setTrainingMetrics={setTrainingMetrics}
                                handleQuickComplete={handleQuickComplete}
                                setEditingRestItem={setEditingRestItem}
                                onRequestSwap={handleRequestSwap}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'daily' && (
                    <div className="">
                        <DailyTasksList
                            myDailyAllocations={myDailyAllocations}
                            jobs={jobs}
                            employees={employees}
                            fullWidth={true}
                            currentEmployeeId={currentEmployeeId}
                            showJobFilter={showJobFilter}
                            setShowJobFilter={setShowJobFilter}
                            handleSaveProgress={handleSaveProgress}
                            isDirty={isDirty}
                            filterJobIds={filterJobIds}
                            setFilterJobIds={setFilterJobIds}
                            handleUpdateProgress={handleUpdateProgress}
                        />
                    </div>
                )}

                {activeTab === 'leave' && (
                    <div className="flex flex-col">
                        <div className="p-1">
                            <LeaveManager
                                currentEmployeeId={currentEmployeeId}
                                isManager={isManager}
                                employees={employees}
                                jobs={jobs}
                                unifiedLeaves={unifiedLeaves}
                                newLeave={newLeave}
                                setNewLeave={setNewLeave}
                                fromDate={fromDate}
                                toDate={toDate}
                                filterShift={filterShift}
                                editingAutoLeave={editingAutoLeave}
                                setEditingAutoLeave={setEditingAutoLeave}
                                handleAddLeave={handleAddLeave}
                                handleDeleteLeave={handleDeleteLeave}
                                handleApproveLeave={handleApproveLeave}
                                handleRejectLeave={handleRejectLeave}
                                handleUnapproveLeave={handleUnapproveLeave}
                                handleSaveAutoLeave={handleSaveAutoLeave}
                                leaveBalance={leaveBalance}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'kpi' && currentEmployeeId !== 'all' && (
                    <div className="border rounded-lg">
                        <Reports
                            currentUserRole={Role.Staff} // Simulate Staff view to lock filters
                            fixedEmployeeId={currentEmployeeId} // Force this employee
                            hideHeader={true}
                            hideExportButtons={true}
                        />
                    </div>
                )}

                {activeTab === 'kpi' && currentEmployeeId === 'all' && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <AlertCircle className="w-12 h-12 mb-2 opacity-50" />
                        <p>Vui lòng chọn một nhân viên cụ thể để xem KPI cá nhân.</p>
                    </div>
                )}
                {activeTab === 'market' && (
                    <div className="h-[600px] border rounded-lg overflow-hidden">
                        {currentLoggedEmp ? (
                            <SwapMarket currentUser={currentLoggedEmp} />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full bg-white text-slate-500 p-8">
                                <AlertCircle className="w-12 h-12 text-slate-400 mb-2" />
                                <p className="font-medium text-slate-600">Không tìm thấy thông tin nhân sự</p>
                                <p className="text-xs text-slate-400 mt-1">Vui lòng kiểm tra email tài khoản đã được khai báo chính xác trong cấu hình.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modals */}
            {currentLoggedEmp && (
                <SwapRequestModal
                    isOpen={showSwapModal}
                    onClose={() => setShowSwapModal(false)}
                    currentUser={currentLoggedEmp}
                    sourceItem={swapSourceItem}
                    employees={employees}
                    schedule={schedule}
                    jobs={jobs}
                />
            )}
            <TaskModal
                selectedTask={selectedTask}
                setSelectedTask={setSelectedTask}
                actionNote={actionNote}
                setActionNote={setActionNote}
                trainingMetrics={trainingMetrics}
                setTrainingMetrics={setTrainingMetrics}
                handleTaskAction={handleTaskAction}
                jobs={jobs}
            />

            <EditRestModal
                editingRestItem={editingRestItem}
                setEditingRestItem={setEditingRestItem}
                handleSaveRestItem={handleSaveRestItem}
                isManager={isManager}
            />

            <SubJobDetailModal
                viewingDetailItem={viewingDetailItem}
                setViewingDetailItem={setViewingDetailItem}
                jobs={jobs}
                getSubJobs={getSubJobs}
            />

            {/* FLOATING ACTION BUTTON (FAB) FOR MOBILE - QUICK LEAVE */}
            {currentEmployeeId !== 'all' && (
                <button
                    onClick={() => {
                        const tmr = addDays(new Date(), 1);
                        setNewLeave({
                            date: format(tmr, 'yyyy-MM-dd'),
                            shift: 'Sáng',
                            reason: ''
                        });
                        setActiveTab('leave');
                        toast("Đã chuyển sang tab Nghỉ phép", { icon: '✈️' });
                    }}
                    className="fixed bottom-6 right-6 md:hidden bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 active:scale-95 transition-all z-50 flex items-center justify-center"
                    title="Xin nghỉ phép"
                >
                    <Plus className="w-6 h-6" />
                </button>
            )}
        </div>
    );
};

export default MyTasks;
