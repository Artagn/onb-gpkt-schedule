/**
 * LivechatMonthlyReport.tsx - Báo cáo thống kê điểm Livechat theo tháng
 * Uses shared filter from parent component
 * Supports dynamic livechat difficulty config (per-period) with multi-month aggregation
 */

import React, { useMemo } from 'react';
import { MessageCircle, Download, Loader2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useEvaluationPeriodsQuery, useEvaluationsQuery } from '../../hooks/useEvaluationQuery';
import { JobGroup } from '../../types';
import { isDTGroup } from '../../utils/permissions';
import { startOfMonth, endOfMonth, parseISO, isWithinInterval, format } from 'date-fns';
import { getDifficultyConfig, calcDifficultyConverted } from '../../utils/evaluationHelpers';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

interface SharedFilter {
    dateMode: 'single' | 'range' | 'custom';
    selectedMonth: string;
    selectedMonths: string[];
    fromDate: string;
    toDate: string;
    dateRange: { start: Date; end: Date };
}

interface LivechatMonthlyReportProps {
    hideExportButtons?: boolean;
    sharedFilter?: SharedFilter;
}

interface EmployeeRow {
    employeeId: string;
    employeeName: string;
    fixedPoints: number;
    totalRequests: number;
    difficultyBreakdown: { [metricId: string]: number }; // raw counts per difficulty
    totalConverted: number; // For new evaluations, this represents 'Thực hiện'
    completionRate: number;
    performancePoints: number;
    totalRecognized: number;
}

export const LivechatMonthlyReport: React.FC<LivechatMonthlyReportProps> = ({ hideExportButtons, sharedFilter }) => {
    const { employees, jobs, schedule } = useData();
    const { data: periods = [], isLoading: loadingPeriods } = useEvaluationPeriodsQuery();

    // Use shared filter date range
    const dateRange = sharedFilter?.dateRange || {
        start: startOfMonth(new Date()),
        end: endOfMonth(new Date())
    };

    // Find matching periods for the selected date range
    const matchingPeriods = useMemo(() => {
        return periods.filter(p => {
            const periodStart = startOfMonth(new Date(p.year, p.month - 1));
            return periodStart >= dateRange.start && periodStart <= dateRange.end;
        });
    }, [periods, dateRange]);

    // Load evaluations for matching periods
    const { data: allEvaluations = [], isLoading: loadingEvals } = useEvaluationsQuery();

    // Filter DT employees
    const dtEmployees = useMemo(() =>
        employees.filter(e => isDTGroup(e.evaluationGroup)),
        [employees]
    );

    // Livechat jobs
    const livechatJobs = useMemo(() =>
        jobs.filter(j => j.group === JobGroup.Livechat && j.isActive),
        [jobs]
    );

    // Collect UNION of all difficulty configs across matching periods
    const allDifficultyColumns = useMemo(() => {
        const configMap = new Map<string, { id: string; name: string; multiplier: number }>();
        matchingPeriods.forEach(period => {
            const config = getDifficultyConfig(period);
            config.forEach(item => {
                if (!configMap.has(item.id)) {
                    configMap.set(item.id, item);
                }
            });
        });
        return Array.from(configMap.values());
    }, [matchingPeriods]);

    // Calculate row data for each employee
    const rowData: EmployeeRow[] = useMemo(() => {
        if (matchingPeriods.length === 0) return [];

        return dtEmployees.map(emp => {
            // Aggregate across all matching periods
            let totalFixedPoints = 0;
            let totalRequests = 0;
            let totalConverted = 0;
            const difficultyBreakdown: { [metricId: string]: number } = {};

            matchingPeriods.forEach(period => {
                const periodStart = startOfMonth(new Date(period.year, period.month - 1));
                const periodEnd = endOfMonth(periodStart);

                const existingEval = allEvaluations.find(ev =>
                    ev.employeeId === emp.id &&
                    ev.periodId === period.id &&
                    isDTGroup(ev.evaluationGroup)
                );

                // Calculate from schedule
                const myScheduleItems = schedule.filter(s => {
                    const scheduleDate = parseISO(s.date);
                    return s.employeeIds?.includes(emp.id) &&
                        isWithinInterval(scheduleDate, { start: periodStart, end: periodEnd });
                });

                // Use new format if available
                if (existingEval?.livechatData && Object.keys(existingEval.livechatData).length > 0) {
                    livechatJobs.forEach(job => {
                        let jobStats = { total: 0, completed: 0, offHours: 0, points: 0 };

                        myScheduleItems.forEach(item => {
                            if (item.jobId !== job.id) return;
                            const itemJob = jobs.find(j => j.id === item.jobId);
                            if (itemJob?.group !== JobGroup.Livechat) return;

                            jobStats.total++;
                            if (item.status === 'Completed' || item.status === 'Approved') {
                                jobStats.completed++;
                                jobStats.points += job.standardPoint || 0;
                            }
                            if (item.shift === 'Tối') {
                                jobStats.offHours++;
                            }
                        });

                        totalFixedPoints += jobStats.points;
                        const lcData = existingEval.livechatData![job.id] || { standardPerSession: undefined, actual: undefined };
                        const standardPerSession = lcData.standardPerSession ?? (period?.dtConfig?.livechatStandards?.[job.id] || 35);
                        
                        totalRequests += jobStats.total * standardPerSession;
                        totalConverted += (lcData.actual ?? 0); // "Actual" serves as totalConverted
                    });
                } else {
                    // Fallback to old format
                    livechatJobs.forEach(job => {
                        let jobStats = { total: 0, completed: 0, offHours: 0, points: 0 };

                        myScheduleItems.forEach(item => {
                            if (item.jobId !== job.id) return;
                            const itemJob = jobs.find(j => j.id === item.jobId);
                            if (itemJob?.group !== JobGroup.Livechat) return;

                            jobStats.total++;
                            if (item.status === 'Completed' || item.status === 'Approved') {
                                jobStats.completed++;
                                jobStats.points += job.standardPoint || 0;
                            }
                            if (item.shift === 'Tối') {
                                jobStats.offHours++;
                            }
                        });

                        totalFixedPoints += jobStats.points;
                        const standardPerSession = period?.dtConfig?.livechatStandards?.[job.id] || 35;
                        const sessionsForCalc = jobStats.total - jobStats.offHours;
                        totalRequests += sessionsForCalc * standardPerSession;
                    });

                    const difficultyStats = existingEval?.livechatDifficulty || {};
                    const periodConfig = getDifficultyConfig(period);

                    Object.keys(difficultyStats).forEach(metricId => {
                        difficultyBreakdown[metricId] = (difficultyBreakdown[metricId] || 0) + (difficultyStats[metricId] || 0);
                    });

                    totalConverted += calcDifficultyConverted(difficultyStats, periodConfig);
                }
            });

            // Calculate completion rate and points
            const completionRate = totalRequests > 0 ? totalConverted / totalRequests : 0;
            const performancePoints = totalFixedPoints * completionRate;
            const totalRecognized = totalFixedPoints + performancePoints;

            return {
                employeeId: emp.id,
                employeeName: emp.fullName,
                fixedPoints: totalFixedPoints,
                totalRequests,
                difficultyBreakdown,
                totalConverted,
                completionRate,
                performancePoints,
                totalRecognized,
            };
        }).filter(r => {
            const hasAnyDifficulty = Object.values(r.difficultyBreakdown).some(v => v > 0);
            return r.fixedPoints > 0 || hasAnyDifficulty;
        }).sort((a, b) => b.totalRecognized - a.totalRecognized);
    }, [matchingPeriods, dtEmployees, allEvaluations, schedule, jobs, livechatJobs]);

    // Summary stats
    const summaryStats = useMemo(() => {
        const total = rowData.length;
        const evaluated = rowData.filter(r => Object.values(r.difficultyBreakdown).some(v => v > 0)).length;
        const avgCompletion = rowData.length > 0
            ? rowData.reduce((sum, r) => sum + r.completionRate, 0) / rowData.length
            : 0;
        const totalPoints = rowData.reduce((sum, r) => sum + r.totalRecognized, 0);

        return { total, evaluated, avgCompletion, totalPoints };
    }, [rowData]);

    // Export to Excel
    const handleExport = () => {
        if (rowData.length === 0) {
            toast.error('Không có dữ liệu để xuất');
            return;
        }

        const exportData = rowData.map((row, idx) => {
            const base: any = {
                'STT': idx + 1,
                'Nhân viên': row.employeeName,
                'Điểm cố định': row.fixedPoints.toFixed(1),
                'Tổng số lượng YC': row.totalRequests,
            };
            // Dynamic difficulty columns
            allDifficultyColumns.forEach(col => {
                base[col.name] = row.difficultyBreakdown[col.id] || 0;
            });
            base['Thực hiện / Quy đổi'] = row.totalConverted.toFixed(1);
            base['TL Hoàn thành (%)'] = (row.completionRate * 100).toFixed(2) + '%';
            base['Điểm năng suất'] = row.performancePoints.toFixed(1);
            base['TỔNG ĐIỂM GHI NHẬN'] = row.totalRecognized.toFixed(1);
            return base;
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Livechat');

        const dateLabel = sharedFilter?.dateMode === 'single'
            ? sharedFilter.selectedMonth
            : format(dateRange.start, 'MM-yyyy') + '_' + format(dateRange.end, 'MM-yyyy');
        const fileName = `Livechat_${dateLabel}.xlsx`;
        XLSX.writeFile(wb, fileName);
        toast.success(`Đã xuất ${fileName}`);
    };

    // Colors for difficulty columns (cycle through these)
    const DIFF_COLORS = [
        { text: 'text-green-700', bg: 'bg-green-50' },
        { text: 'text-yellow-700', bg: 'bg-yellow-50' },
        { text: 'text-red-700', bg: 'bg-red-50' },
        { text: 'text-pink-700', bg: 'bg-pink-50' },
        { text: 'text-rose-700', bg: 'bg-rose-50' },
    ];

    if (loadingPeriods) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                <span className="ml-2">Đang tải...</span>
            </div>
        );
    }

    // Dynamic column count for colSpan
    const totalCols = 5 + allDifficultyColumns.length; // employee + fixedPoints + totalYC + ...diff columns + totalQD + TLHT + NS + total

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-bold text-gray-800">Thống kê điểm Livechat theo tháng</h3>
                </div>

                {/* Export Button */}
                {!hideExportButtons && (
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                    >
                        <Download className="w-4 h-4" />
                        Xuất Excel
                    </button>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <div className="text-sm font-semibold text-purple-800 uppercase">Tổng NV DT</div>
                    <div className="text-3xl font-bold text-gray-800 mt-1">{summaryStats.total}</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-sm font-semibold text-blue-800 uppercase">Đã có data</div>
                    <div className="text-3xl font-bold text-gray-800 mt-1">{summaryStats.evaluated}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="text-sm font-semibold text-green-800 uppercase">TL HT TB</div>
                    <div className="text-3xl font-bold text-gray-800 mt-1">{(summaryStats.avgCompletion * 100).toFixed(1)}%</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <div className="text-sm font-semibold text-orange-800 uppercase">Tổng điểm</div>
                    <div className="text-3xl font-bold text-gray-800 mt-1">{summaryStats.totalPoints.toFixed(1)}</div>
                </div>
            </div>

            {/* Table */}
            {loadingEvals ? (
                <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                    <span className="ml-2">Đang tải dữ liệu...</span>
                </div>
            ) : (
                <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-y-auto overflow-x-auto">
                        <table className="w-full text-xs border-collapse min-w-[900px]">
                            <thead className="bg-purple-100 sticky top-0 z-10">
                                <tr>
                                    <th className="border p-2 text-left font-bold text-purple-800 sticky left-0 bg-purple-100 z-20 min-w-[150px]">Nhân viên</th>
                                    <th className="border p-2 text-center font-bold text-blue-700 bg-blue-50 w-20">Điểm cố định</th>
                                    <th className="border p-2 text-center font-bold text-blue-700 bg-blue-50 w-24">Tổng SL YC</th>
                                    {allDifficultyColumns.map((col, i) => {
                                        const color = DIFF_COLORS[i % DIFF_COLORS.length];
                                        return (
                                            <th key={col.id} className={`border p-2 text-center font-bold ${color.text} ${color.bg} w-16`}>
                                                {col.name.replace('Tổng số mã ', '')}
                                                <div className="text-[10px] font-normal opacity-75">×{col.multiplier}</div>
                                            </th>
                                        );
                                    })}
                                    <th className="border p-2 text-center font-bold text-indigo-700 bg-indigo-50 w-24">Thực hiện / QĐ</th>
                                    <th className="border p-2 text-center font-bold text-purple-700 bg-purple-50 w-20">TL HT (%)</th>
                                    <th className="border p-2 text-center font-bold text-teal-700 bg-teal-50 w-20">Điểm NS</th>
                                    <th className="border p-2 text-center font-bold text-orange-800 bg-orange-100 w-24">TỔNG GHI NHẬN</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rowData.map((row, idx) => (
                                    <tr key={row.employeeId} className={`hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                        <td className={`border p-2 font-medium sticky left-0 z-10 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-400 text-[10px]">{idx + 1}</span>
                                                {row.employeeName}
                                            </div>
                                        </td>
                                        <td className="border p-2 text-center font-medium text-blue-700">{row.fixedPoints.toFixed(1)}</td>
                                        <td className="border p-2 text-center">{row.totalRequests}</td>
                                        {allDifficultyColumns.map((col, i) => {
                                            const color = DIFF_COLORS[i % DIFF_COLORS.length];
                                            return (
                                                <td key={col.id} className={`border p-2 text-center ${color.text}`}>
                                                    {row.difficultyBreakdown[col.id] || 0}
                                                </td>
                                            );
                                        })}
                                        <td className="border p-2 text-center font-medium text-indigo-700">{row.totalConverted.toFixed(1)}</td>
                                        <td className={`border p-2 text-center font-bold ${row.completionRate >= 1 ? 'text-green-700 bg-green-50' : row.completionRate >= 0.8 ? 'text-blue-700 bg-blue-50' : 'text-orange-700 bg-orange-50'}`}>
                                            {(row.completionRate * 100).toFixed(1)}%
                                        </td>
                                        <td className="border p-2 text-center font-medium text-teal-700">{row.performancePoints.toFixed(1)}</td>
                                        <td className="border p-2 text-center font-bold text-orange-800 bg-orange-50">{row.totalRecognized.toFixed(1)}</td>
                                    </tr>
                                ))}
                                {rowData.length === 0 && (
                                    <tr>
                                        <td colSpan={totalCols} className="border p-8 text-center text-gray-500">
                                            Không có dữ liệu Livechat cho khoảng thời gian này
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            {rowData.length > 0 && (
                                <tfoot className="bg-purple-200 font-bold">
                                    <tr>
                                        <td className="border p-2 sticky left-0 bg-purple-200 z-10">TỔNG / TB</td>
                                        <td className="border p-2 text-center">{rowData.reduce((s, r) => s + r.fixedPoints, 0).toFixed(1)}</td>
                                        <td className="border p-2 text-center">{rowData.reduce((s, r) => s + r.totalRequests, 0)}</td>
                                        {allDifficultyColumns.map(col => (
                                            <td key={col.id} className="border p-2 text-center">
                                                {rowData.reduce((s, r) => s + (r.difficultyBreakdown[col.id] || 0), 0)}
                                            </td>
                                        ))}
                                        <td className="border p-2 text-center">{rowData.reduce((s, r) => s + r.totalConverted, 0).toFixed(1)}</td>
                                        <td className="border p-2 text-center">{(summaryStats.avgCompletion * 100).toFixed(1)}%</td>
                                        <td className="border p-2 text-center">{rowData.reduce((s, r) => s + r.performancePoints, 0).toFixed(1)}</td>
                                        <td className="border p-2 text-center text-orange-800">{summaryStats.totalPoints.toFixed(1)}</td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            )}

            {/* Formula Legend - dynamic */}
            <p className="text-xs text-gray-500">
                💡 <strong>Formula:</strong> TỔNG QĐ = Σ(Số lượng × Hệ số) | TL HT = TỔNG QĐ / Tổng YC | Điểm NS = Điểm cố định × TL HT | TỔNG = Điểm cố định + Điểm NS
            </p>
        </div>
    );
};

export default LivechatMonthlyReport;
