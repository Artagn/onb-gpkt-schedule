/**
 * EvaluationReport.tsx - Multi-period evaluation reports with comparison and Excel export
 * Part of Reports module - Tab "Đánh giá tháng"
 * Uses shared filter from parent component
 */

import React, { useMemo } from 'react';
import { ClipboardList, TrendingUp, TrendingDown, Minus, Users, Award, Download } from 'lucide-react';
import { useEvaluationPeriodsQuery, useEvaluationsByPeriodsQuery } from '../../hooks/useEvaluationQuery';
import { useData } from '../../context/DataContext';
import { isDTGroup } from '../../utils/permissions';
import { exportMultiPeriodEvaluations } from '../../services/evaluationExportService';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import toast from 'react-hot-toast';

interface SharedFilter {
    dateMode: 'single' | 'range' | 'custom';
    selectedMonth: string;
    selectedMonths: string[];
    fromDate: string;
    toDate: string;
    dateRange: { start: Date; end: Date };
}

interface EvaluationReportProps {
    hideExportButtons?: boolean;
    sharedFilter?: SharedFilter;
}

interface PeriodData {
    periodId: string;
    periodName: string;
    month: number;
    year: number;
    overallRate: number;
    rating: string;
}

interface EmployeeRow {
    employeeId: string;
    employeeName: string;
    periodData: Map<string, PeriodData>;
    avgOverallRate: number;
    trend: 'up' | 'down' | 'stable';
    trendValue: number;
}

export const EvaluationReport: React.FC<EvaluationReportProps> = ({ hideExportButtons, sharedFilter }) => {
    const { employees } = useData();
    const { data: allPeriods = [], isLoading: loadingPeriods } = useEvaluationPeriodsQuery();

    // Use shared filter date range
    const dateRange = sharedFilter?.dateRange || {
        start: startOfMonth(new Date()),
        end: endOfMonth(new Date())
    };

    // Filter periods matching date range
    const matchingPeriods = useMemo(() => {
        return allPeriods
            .filter(p => {
                const periodStart = startOfMonth(new Date(p.year, p.month - 1));
                return periodStart >= dateRange.start && periodStart <= dateRange.end &&
                    (p.status === 'closed' || p.status === 'open' || p.status === 'reviewing');
            })
            .sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month));
    }, [allPeriods, dateRange]);

    // 3. Fetch Evaluations only for visible periods (On-demand optimization)
    // v3.15.0: Using useEvaluationsByPeriodsQuery to save reads
    const periodIds = useMemo(() => matchingPeriods.map(p => p.id), [matchingPeriods]);
    const { data: allEvaluations = [], isLoading: loadingEvals } = useEvaluationsByPeriodsQuery(periodIds);

    // Filter evaluations for matching periods
    const filteredEvaluations = useMemo(() => {
        const periodIds = new Set(matchingPeriods.map(p => p.id));
        return allEvaluations.filter(ev =>
            periodIds.has(ev.periodId) && isDTGroup(ev.evaluationGroup)
        );
    }, [allEvaluations, matchingPeriods]);

    // Build comparison table data
    const tableData = useMemo(() => {
        const employeeMap = new Map<string, EmployeeRow>();

        filteredEvaluations.forEach(ev => {
            const emp = employees.find(e => e.id === ev.employeeId);
            if (!emp) return;

            const period = matchingPeriods.find(p => p.id === ev.periodId);
            if (!period) return;

            if (!employeeMap.has(ev.employeeId)) {
                employeeMap.set(ev.employeeId, {
                    employeeId: ev.employeeId,
                    employeeName: emp.fullName,
                    periodData: new Map(),
                    avgOverallRate: 0,
                    trend: 'stable',
                    trendValue: 0
                });
            }

            const row = employeeMap.get(ev.employeeId)!;
            row.periodData.set(ev.periodId, {
                periodId: ev.periodId,
                periodName: `T${period.month}/${period.year}`,
                month: period.month,
                year: period.year,
                overallRate: ev.summary?.overallRate || 0,
                rating: ev.summary?.result || '-'
            });
        });

        // Calculate avg and trend for each employee
        const result: EmployeeRow[] = [];
        employeeMap.forEach(row => {
            const rates = Array.from(row.periodData.values())
                .sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month))
                .map(p => p.overallRate);

            if (rates.length > 0) {
                row.avgOverallRate = rates.reduce((s, r) => s + r, 0) / rates.length;

                if (rates.length >= 2) {
                    const diff = rates[rates.length - 1] - rates[rates.length - 2];
                    row.trendValue = diff;
                    row.trend = diff > 0.5 ? 'up' : diff < -0.5 ? 'down' : 'stable';
                }
            }
            result.push(row);
        });

        return result.sort((a, b) => b.avgOverallRate - a.avgOverallRate);
    }, [filteredEvaluations, employees, matchingPeriods]);

    // Summary stats
    const summaryStats = useMemo(() => {
        const totalEmployees = tableData.length;
        const avgRate = totalEmployees > 0
            ? tableData.reduce((s, r) => s + r.avgOverallRate, 0) / totalEmployees
            : 0;
        const improved = tableData.filter(r => r.trend === 'up').length;
        const declined = tableData.filter(r => r.trend === 'down').length;

        return { totalEmployees, avgRate, improved, declined };
    }, [tableData]);

    // Handle export
    const handleExport = () => {
        if (matchingPeriods.length === 0) {
            toast.error('Không có dữ liệu để xuất');
            return;
        }

        exportMultiPeriodEvaluations({
            periods: matchingPeriods,
            evaluations: filteredEvaluations,
            employees
        });
        toast.success('Đã xuất file Excel!');
    };

    // Loading state
    if (loadingPeriods || loadingEvals) {
        return (
            <div className="flex items-center justify-center p-8 text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                Đang tải dữ liệu...
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-bold text-gray-800">Tổng hợp Đánh giá theo tháng</h3>
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
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-content gap-2 text-blue-600 mb-1">
                        <Users className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase">Tổng NV</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-800">{summaryStats.totalEmployees}</div>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                    <div className="flex items-center gap-2 text-indigo-600 mb-1">
                        <Award className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase">TB Hoàn thành</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-800">{summaryStats.avgRate.toFixed(1)}%</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 text-green-600 mb-1">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase">Tiến bộ</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-800">{summaryStats.improved}</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <div className="flex items-center gap-2 text-red-600 mb-1">
                        <TrendingDown className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase">Giảm sút</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-800">{summaryStats.declined}</div>
                </div>
            </div>

            {/* Comparison Table */}
            {matchingPeriods.length > 0 && tableData.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100 sticky top-0 z-10">
                                <tr>
                                    <th className="p-3 text-left font-semibold text-gray-700 sticky left-0 bg-gray-100 z-20">Nhân viên</th>
                                    {matchingPeriods.map(period => (
                                        <th key={period.id} className="p-3 text-center font-semibold text-gray-700 min-w-[100px]">
                                            T{period.month}/{period.year}
                                        </th>
                                    ))}
                                    <th className="p-3 text-center font-semibold text-indigo-700 bg-indigo-50 min-w-[80px]">TB</th>
                                    <th className="p-3 text-center font-semibold text-gray-700 min-w-[100px]">Xu hướng</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tableData.map((row, idx) => (
                                    <tr key={row.employeeId} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="p-3 font-medium text-gray-800 sticky left-0 bg-inherit z-10 border-r">
                                            {row.employeeName}
                                        </td>
                                        {matchingPeriods.map(period => {
                                            const data = row.periodData.get(period.id);
                                            return (
                                                <td key={period.id} className="p-3 text-center">
                                                    {data ? (
                                                        <div>
                                                            <div className="font-semibold">{data.overallRate.toFixed(1)}%</div>
                                                            <div className={`text-xs mt-0.5 ${data.rating === 'Vượt mong đợi' ? 'text-green-600' :
                                                                data.rating === 'Đạt' ? 'text-blue-600' : 'text-yellow-600'
                                                                }`}>
                                                                {data.rating}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-300">-</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td className="p-3 text-center font-bold text-indigo-700 bg-indigo-50">
                                            {row.avgOverallRate.toFixed(1)}%
                                        </td>
                                        <td className="p-3 text-center">
                                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${row.trend === 'up' ? 'bg-green-100 text-green-700' :
                                                row.trend === 'down' ? 'bg-red-100 text-red-700' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                {row.trend === 'up' ? <TrendingUp className="w-3 h-3" /> :
                                                    row.trend === 'down' ? <TrendingDown className="w-3 h-3" /> :
                                                        <Minus className="w-3 h-3" />}
                                                {row.trendValue > 0 ? '+' : ''}{row.trendValue.toFixed(1)}%
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {matchingPeriods.length === 0 && (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    <ClipboardList className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>Không có kỳ đánh giá nào trong khoảng thời gian đã chọn</p>
                </div>
            )}

            {/* Legend */}
            <p className="text-xs text-gray-500">
                📊 So sánh kết quả đánh giá qua các kỳ. Xu hướng = điểm kỳ gần nhất - điểm kỳ trước đó.
            </p>
        </div>
    );
};

export default EvaluationReport;
