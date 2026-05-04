
import React, { useState, useMemo } from 'react';
import { PieChart, CalendarDays, GraduationCap, ArrowLeftRight, ClipboardList, MessageCircle, TrendingUp, RefreshCcw, BookOpen, FileText, Download, FileSpreadsheet, Filter, Calendar } from 'lucide-react';
import { Role, JobGroup } from '../../types';
import { useReports, MainTabOption, SubTabOption, SUB_TABS, TimeRangeOption } from './useReports';
import { PointsChart } from './PointsChart';
import { PointsTable } from './PointsTable';
import { PointsSummaryCards } from './PointsSummaryCards';
import { DailyProgressChart } from './DailyProgressChart';
import { DailyTable } from './DailyTable';
import { DailySummaryCards } from './DailySummaryCards';
import { TrainingTable } from './TrainingTable';
import { TrainingSummaryCards } from './TrainingSummaryCards';
import { SwapSummaryCards, SwapTable } from './SwapReport';
import { LeaveSwapTable } from './LeaveSwapReport';
import { EvaluationReport } from './EvaluationReport';
import { LivechatMonthlyReport } from './LivechatMonthlyReport';
import { TrainingMonthlyReport } from './TrainingMonthlyReport';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';

interface Props {
    currentUserRole?: Role;
    user?: any;
    fixedEmployeeId?: string;
    hideHeader?: boolean;
    hideExportButtons?: boolean;
}

// Main tab definitions
const MAIN_TABS: { id: MainTabOption; label: string; icon: React.ReactNode; activeColor: string }[] = [
    { id: 'kpi', label: 'KPI & Năng suất', icon: <TrendingUp className="w-4 h-4" />, activeColor: '#2563eb' },
    { id: 'swap', label: 'Đổi lịch', icon: <ArrowLeftRight className="w-4 h-4" />, activeColor: '#d97706' },
    { id: 'monthly', label: 'Báo cáo tháng', icon: <FileText className="w-4 h-4" />, activeColor: '#9333ea' },
];

// Sub tab definitions with icons
const SUB_TAB_CONFIG: Record<SubTabOption, { label: string; icon: React.ReactNode }> = {
    points: { label: 'Điểm KPI', icon: <PieChart className="w-3.5 h-3.5" /> },
    daily: { label: 'Chỉ tiêu ngày', icon: <CalendarDays className="w-3.5 h-3.5" /> },
    training: { label: 'Đào tạo (buổi)', icon: <GraduationCap className="w-3.5 h-3.5" /> },
    swap_shift: { label: 'Đổi ca', icon: <ArrowLeftRight className="w-3.5 h-3.5" /> },
    swap_leave: { label: 'Đổi nghỉ bù', icon: <RefreshCcw className="w-3.5 h-3.5" /> },
    evaluation: { label: 'Tổng hợp ĐG', icon: <ClipboardList className="w-3.5 h-3.5" /> },
    livechat: { label: 'Điểm Livechat', icon: <MessageCircle className="w-3.5 h-3.5" /> },
    training_summary: { label: 'Tổng hợp ĐT', icon: <BookOpen className="w-3.5 h-3.5" /> },
};

// Date mode type for monthly reports
type MonthlyDateMode = 'single' | 'range' | 'custom';

const Reports: React.FC<Props> = (props) => {
    const logic = useReports(props);

    // Local state for dropdown visibility
    const [showEmpDropdown, setShowEmpDropdown] = useState(false);
    const [showGroupDropdown, setShowGroupDropdown] = useState(false);

    // === SHARED MONTHLY DATE FILTER STATE ===
    const [monthlyDateMode, setMonthlyDateMode] = useState<MonthlyDateMode>('single');
    const [monthlySelectedMonth, setMonthlySelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
    const [monthlyFromDate, setMonthlyFromDate] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [monthlyToDate, setMonthlyToDate] = useState(() => format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [monthlySelectedMonths, setMonthlySelectedMonths] = useState<string[]>([format(new Date(), 'yyyy-MM')]);

    // Available months for selection (last 12 months)
    const availableMonths = useMemo(() => {
        const months: string[] = [];
        for (let i = 0; i < 12; i++) {
            const d = subMonths(new Date(), i);
            months.push(format(d, 'yyyy-MM'));
        }
        return months;
    }, []);

    // Toggle month in multi-select
    const toggleMonth = (month: string) => {
        setMonthlySelectedMonths(prev =>
            prev.includes(month)
                ? prev.filter(m => m !== month)
                : [...prev, month]
        );
    };

    // Calculate date range based on mode
    const monthlyDateRange = useMemo(() => {
        if (monthlyDateMode === 'single') {
            const [year, month] = monthlySelectedMonth.split('-').map(Number);
            return {
                start: startOfMonth(new Date(year, month - 1)),
                end: endOfMonth(new Date(year, month - 1))
            };
        } else if (monthlyDateMode === 'range' && monthlySelectedMonths.length > 0) {
            const sorted = [...monthlySelectedMonths].sort();
            const [startYear, startMonth] = sorted[0].split('-').map(Number);
            const [endYear, endMonth] = sorted[sorted.length - 1].split('-').map(Number);
            return {
                start: startOfMonth(new Date(startYear, startMonth - 1)),
                end: endOfMonth(new Date(endYear, endMonth - 1))
            };
        } else {
            return {
                start: new Date(monthlyFromDate + 'T00:00:00'),
                end: new Date(monthlyToDate + 'T23:59:59')
            };
        }
    }, [monthlyDateMode, monthlySelectedMonth, monthlySelectedMonths, monthlyFromDate, monthlyToDate]);

    // Shared props for monthly reports
    const monthlyFilterProps = {
        dateMode: monthlyDateMode,
        selectedMonth: monthlySelectedMonth,
        selectedMonths: monthlySelectedMonths,
        fromDate: monthlyFromDate,
        toDate: monthlyToDate,
        dateRange: monthlyDateRange,
    };

    // Conditional display
    const isMonthlyTab = logic.mainTab === 'monthly';
    const showJobGroupFilter = logic.mainTab === 'kpi';
    const showExportGrid = logic.mainTab === 'kpi';

    // Time button helper
    const TimeButton = ({ type, label }: { type: TimeRangeOption; label: string }) => (
        <button
            onClick={() => logic.handleTimeRangeChange(type)}
            className={`px-2.5 py-1 text-xs rounded-md transition-all ${logic.timeRangeType === type
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
        >
            {label}
        </button>
    );

    return (
        <div className="p-6 flex flex-col bg-gray-50 pb-20">
            {/* ===== ROW 1: TITLE + EXPORTS ===== */}
            {!props.hideHeader && (
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-blue-600" />
                        Báo cáo & KPI
                    </h2>

                    {!props.hideExportButtons && !isMonthlyTab && (
                        <div className="flex gap-2">
                            {showExportGrid && (
                                <button onClick={logic.handleExportWeeklySchedule} className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 text-xs font-medium shadow-sm">
                                    <FileSpreadsheet className="w-3.5 h-3.5" /> Xuất Lịch Grid
                                </button>
                            )}
                            <button onClick={logic.handleExportExcel} className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 text-xs font-medium shadow-sm">
                                <Download className="w-3.5 h-3.5" /> Xuất Data
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ===== ROW 2: MAIN TABS (3 big buttons) ===== */}
            <div className="flex gap-2 mb-3">
                {MAIN_TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => logic.setMainTab(tab.id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${logic.mainTab === tab.id
                            ? 'text-white shadow-lg'
                            : 'bg-white border text-gray-600 hover:bg-gray-50'
                            }`}
                        style={logic.mainTab === tab.id ? { backgroundColor: tab.activeColor } : {}}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ===== ROW 3: SUB TABS (pill buttons) ===== */}
            <div className="flex gap-1 mb-3 bg-gray-100 p-1 rounded-lg w-fit">
                {SUB_TABS[logic.mainTab].map(subTabId => {
                    const config = SUB_TAB_CONFIG[subTabId];
                    return (
                        <button
                            key={subTabId}
                            onClick={() => logic.setSubTab(subTabId)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium transition-all ${logic.subTab === subTabId
                                ? 'bg-white text-gray-800 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            {config.icon}
                            {config.label}
                        </button>
                    );
                })}
            </div>

            {/* ===== ROW 4A: FILTERS FOR KPI/SWAP TABS ===== */}
            {!isMonthlyTab && (
                <div className="flex flex-wrap items-center gap-3 mb-4 bg-white rounded-lg border px-4 py-2.5">
                    {/* Time Presets */}
                    <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg">
                        <TimeButton type="prev_week" label="Tuần trước" />
                        <TimeButton type="week" label="Tuần này" />
                        <div className="w-px h-4 bg-gray-300 mx-1"></div>
                        <TimeButton type="prev_month" label="Tháng trước" />
                        <TimeButton type="month" label="Tháng này" />
                    </div>

                    {/* Date Range */}
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <input type="date" className="input-date-sm" value={logic.fromDate} onChange={e => logic.setFromDate(e.target.value)} />
                        <span className="text-gray-400 text-sm">→</span>
                        <input type="date" className="input-date-sm" value={logic.toDate} onChange={e => logic.setToDate(e.target.value)} />
                    </div>

                    {/* Spacer */}
                    <div className="flex-1"></div>

                    {/* Employee Filter */}
                    {!props.fixedEmployeeId && (
                        <div className="relative">
                            <button
                                onClick={() => { if (props.currentUserRole !== Role.Staff) setShowEmpDropdown(!showEmpDropdown) }}
                                disabled={props.currentUserRole === Role.Staff}
                                className={`flex items-center gap-2 border rounded-lg px-3 py-1.5 text-sm bg-white transition-colors ${props.currentUserRole === Role.Staff ? 'bg-gray-100 text-gray-500' : 'hover:border-blue-400'
                                    }`}
                            >
                                <Filter className="w-3.5 h-3.5 text-gray-400" />
                                <span className="font-medium text-gray-700">
                                    {logic.selectedEmployeeIds.length === logic.employees.length ? 'Tất cả NV' : `${logic.selectedEmployeeIds.length} NV`}
                                </span>
                            </button>
                            {showEmpDropdown && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowEmpDropdown(false)}></div>
                                    <div className="absolute top-full right-0 mt-1 w-64 max-h-80 bg-white border rounded-lg shadow-xl z-50 flex flex-col p-2">
                                        <div className="text-xs font-bold text-gray-500 uppercase px-2 mb-2">Nhân viên</div>
                                        <div className="flex gap-2 mb-2 border-b pb-2">
                                            <button onClick={() => logic.toggleAllEmployees(true)} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 flex-1">Chọn tất cả</button>
                                            <button onClick={() => logic.toggleAllEmployees(false)} className="text-xs bg-gray-50 text-gray-700 px-2 py-1 rounded hover:bg-gray-100 flex-1">Bỏ chọn</button>
                                        </div>
                                        <div className="overflow-y-auto flex-1 space-y-0.5">
                                            {logic.employees.map(emp => (
                                                <label key={emp.id} className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer">
                                                    <input type="checkbox" checked={logic.selectedEmployeeIds.includes(emp.id)} onChange={() => logic.toggleEmployee(emp.id)} className="rounded border-gray-300 text-blue-600" />
                                                    <span className="text-sm text-gray-700 truncate">{emp.fullName}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Job Group Filter */}
                    {showJobGroupFilter && (
                        <div className="relative">
                            <button onClick={() => setShowGroupDropdown(!showGroupDropdown)} className="flex items-center gap-2 border rounded-lg px-3 py-1.5 text-sm bg-white hover:border-blue-400 transition-colors">
                                <Filter className="w-3.5 h-3.5 text-gray-400" />
                                <span className="font-medium text-gray-700">
                                    {logic.selectedJobGroups.length === 0 ? 'Tất cả nhóm' : `${logic.selectedJobGroups.length} nhóm`}
                                </span>
                            </button>
                            {showGroupDropdown && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowGroupDropdown(false)}></div>
                                    <div className="absolute top-full right-0 mt-1 w-56 bg-white border rounded-lg shadow-xl z-50 p-2">
                                        <div className="text-xs font-bold text-gray-500 uppercase px-2 mb-2">Nhóm công việc</div>
                                        <div className="flex gap-2 mb-2 border-b pb-2">
                                            <button onClick={() => logic.toggleAllJobGroups(true)} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 flex-1">Chọn tất cả</button>
                                            <button onClick={() => logic.toggleAllJobGroups(false)} className="text-xs bg-gray-50 text-gray-700 px-2 py-1 rounded hover:bg-gray-100 flex-1">Bỏ chọn</button>
                                        </div>
                                        <div className="space-y-0.5">
                                            {Object.values(JobGroup).map(group => (
                                                <label key={group} className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer">
                                                    <input type="checkbox" checked={logic.selectedJobGroups.includes(group)} onChange={() => logic.toggleJobGroup(group)} className="rounded border-gray-300 text-blue-600" />
                                                    <span className="text-sm text-gray-700">{group}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ===== ROW 4B: SHARED DATE FILTER FOR MONTHLY TABS ===== */}
            {isMonthlyTab && (
                <div className="flex flex-wrap items-center gap-3 mb-4 bg-white rounded-lg border px-4 py-2.5">
                    {/* Date Mode Selector */}
                    <div className="flex border rounded-lg overflow-hidden text-xs">
                        <button
                            onClick={() => setMonthlyDateMode('single')}
                            className={`px-3 py-1.5 ${monthlyDateMode === 'single' ? 'bg-purple-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                        >
                            1 tháng
                        </button>
                        <button
                            onClick={() => setMonthlyDateMode('range')}
                            className={`px-3 py-1.5 ${monthlyDateMode === 'range' ? 'bg-purple-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                        >
                            Nhiều tháng
                        </button>
                        <button
                            onClick={() => setMonthlyDateMode('custom')}
                            className={`px-3 py-1.5 ${monthlyDateMode === 'custom' ? 'bg-purple-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                        >
                            Tùy chọn
                        </button>
                    </div>

                    {/* Single Month Selector */}
                    {monthlyDateMode === 'single' && (
                        <input
                            type="month"
                            value={monthlySelectedMonth}
                            onChange={e => setMonthlySelectedMonth(e.target.value)}
                            className="border rounded-lg px-3 py-1.5 text-sm"
                        />
                    )}

                    {/* Custom Date Range */}
                    {monthlyDateMode === 'custom' && (
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={monthlyFromDate}
                                onChange={e => setMonthlyFromDate(e.target.value)}
                                className="border rounded-lg px-2 py-1.5 text-sm"
                            />
                            <span className="text-gray-400">→</span>
                            <input
                                type="date"
                                value={monthlyToDate}
                                onChange={e => setMonthlyToDate(e.target.value)}
                                className="border rounded-lg px-2 py-1.5 text-sm"
                            />
                        </div>
                    )}

                    {/* Multi-month chips for range mode */}
                    {monthlyDateMode === 'range' && (
                        <div className="flex flex-wrap gap-1">
                            {availableMonths.slice(0, 6).map(month => (
                                <button
                                    key={month}
                                    onClick={() => toggleMonth(month)}
                                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${monthlySelectedMonths.includes(month)
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                        }`}
                                >
                                    {format(parseISO(month + '-01'), 'MM/yy')}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ===== ROW 5: CONTENT ===== */}
            <div className="bg-white rounded-lg shadow border p-4">
                {/* KPI & Năng suất */}
                {logic.subTab === 'points' && (
                    <div className="flex flex-col">
                        <PointsSummaryCards stats={logic.summaryStats} />
                        <PointsChart data={logic.processedPointsData} />
                        <PointsTable data={logic.processedPointsData} />
                    </div>
                )}
                {logic.subTab === 'daily' && (
                    <div className="flex flex-col">
                        <DailySummaryCards stats={logic.dailySummaryStats} />
                        <DailyProgressChart data={logic.processedDailyData} selectedEmployeeId={logic.selectedDailyEmployeeId} onBarClick={logic.setSelectedDailyEmployeeId} />
                        <DailyTable data={logic.processedDailyData} selectedEmployeeId={logic.selectedDailyEmployeeId} />
                    </div>
                )}
                {logic.subTab === 'training' && (
                    <div className="flex flex-col">
                        <TrainingSummaryCards data={logic.processedTrainingData} />
                        <TrainingTable data={logic.processedTrainingData} />
                    </div>
                )}

                {/* Đổi lịch */}
                {logic.subTab === 'swap_shift' && (
                    <div className="flex flex-col">
                        <SwapSummaryCards stats={logic.swapSummary} />
                        <SwapTable data={logic.processedSwapData} />
                    </div>
                )}
                {logic.subTab === 'swap_leave' && (
                    <div className="flex flex-col">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                                <div className="text-sm font-semibold text-purple-800 uppercase">Tổng số thay đổi</div>
                                <div className="text-3xl font-bold text-gray-800 mt-1">{logic.processedLeaveSwapData.length}</div>
                            </div>
                        </div>
                        <LeaveSwapTable data={logic.processedLeaveSwapData} />
                    </div>
                )}

                {/* Báo cáo tháng - pass shared filter props */}
                {logic.subTab === 'evaluation' && <EvaluationReport hideExportButtons={props.hideExportButtons} sharedFilter={monthlyFilterProps} />}
                {logic.subTab === 'livechat' && <LivechatMonthlyReport hideExportButtons={props.hideExportButtons} sharedFilter={monthlyFilterProps} />}
                {logic.subTab === 'training_summary' && <TrainingMonthlyReport hideExportButtons={props.hideExportButtons} sharedFilter={monthlyFilterProps} />}
            </div>
        </div>
    );
};

export default Reports;
