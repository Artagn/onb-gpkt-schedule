/**
 * SummaryTable - Overall results table for DT (Chuyển giao) evaluation
 * Shows synced data from KpiTable and WorkPointsTable
 * Role-based display: Staff sees only their row, Coordinator sees all
 */

import React, { useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { auth } from '../../services/firebaseConfig';
import { Role, EvaluationPeriod } from '../../types';
import { useEvaluationsQuery } from '../../hooks/useEvaluationQuery';
import { isDTGroup } from '../../utils/permissions';
import { BarChart3, Info } from 'lucide-react';
import { startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { getDifficultyConfig, calcDifficultyConverted, getLivechatJobDefaultStandard } from '../../utils/evaluationHelpers';

interface SummaryTableProps {
    openPeriod: EvaluationPeriod;
    employeeId?: string; // For review mode - show only this employee
}

const SummaryTable: React.FC<SummaryTableProps> = ({ openPeriod, employeeId }) => {
    const { employees, schedule, jobs } = useData();
    const { data: allEvaluations = [], isLoading } = useEvaluationsQuery(openPeriod.id);

    const currentUser = auth.currentUser;
    const currentEmployee = useMemo(() =>
        employees.find(e => e.email?.toLowerCase() === currentUser?.email?.toLowerCase()),
        [employees, currentUser]
    );

    const isCoordinator = currentEmployee?.role === Role.Coordinator || currentEmployee?.role === Role.Admin;

    // Filter DT employees
    // Priority: If employeeId prop passed (review mode), show only that employee
    const dtEmployees = useMemo(() => {
        const filtered = employees.filter(e => isDTGroup(e.evaluationGroup));
        // Review mode: show only the specific employee
        if (employeeId) {
            return filtered.filter(e => e.id === employeeId);
        }
        // Normal mode: Coordinator sees all, Staff sees only themselves
        if (isCoordinator) return filtered;
        return filtered.filter(e => e.id === currentEmployee?.id);
    }, [employees, isCoordinator, currentEmployee, employeeId]);

    // Calculate training points for an employee
    const calcTrainingPoints = (employeeId: string): number => {
        const periodStart = startOfMonth(new Date(openPeriod.year, openPeriod.month - 1));
        const periodEnd = endOfMonth(periodStart);

        const myItems = schedule.filter(s => {
            const scheduleDate = parseISO(s.date);
            return s.employeeIds?.includes(employeeId) &&
                isWithinInterval(scheduleDate, { start: periodStart, end: periodEnd }) &&
                (s.status === 'Completed' || s.status === 'Approved');
        });

        let points = 0;
        myItems.forEach(item => {
            const job = jobs.find(j => j.id === item.jobId);
            if (job?.group === 'Đào tạo') {
                points += (job.standardPoint || 0) * (item.coefficient || 1);
            }
        });
        return points;
    };

    // Calculate livechat points - USING NEW difficulty system (synced with WorkPointsTable)
    const calcLivechatPoints = (employeeId: string, existingEval: any): number => {
        const periodStart = startOfMonth(new Date(openPeriod.year, openPeriod.month - 1));
        const periodEnd = endOfMonth(periodStart);

        // 1. Calculate TÌNH HÌNH THỰC HIỆN (auto from schedule)
        const myScheduleItems = schedule.filter(s => {
            const scheduleDate = parseISO(s.date);
            return s.employeeIds?.includes(employeeId) &&
                isWithinInterval(scheduleDate, { start: periodStart, end: periodEnd });
        });

        const jobStats: { [jobId: string]: { total: number; completed: number; offHours: number; points: number } } = {};

        myScheduleItems.forEach(item => {
            const job = jobs.find(j => j.id === item.jobId);
            if (job?.group !== 'Livechat') return;

            if (!jobStats[job.id]) {
                jobStats[job.id] = { total: 0, completed: 0, offHours: 0, points: 0 };
            }

            jobStats[job.id].total++;

            if (item.status === 'Completed' || item.status === 'Approved') {
                jobStats[job.id].completed++;
                jobStats[job.id].points += (job.standardPoint || 0);
            }

            if (item.shift === 'Tối') {
                jobStats[job.id].offHours++;
            }
        });

        const livechatJobs = jobs.filter(j => j.group === 'Livechat' && j.isActive);
        let totalFixedPoints = 0;
        let totalRequests = 0;

        // NEW FORMAT SUPPORT
        if (existingEval?.livechatData && Object.keys(existingEval.livechatData).length > 0) {
            let totalPerformancePoints = 0;
            livechatJobs.forEach(job => {
                const stats = jobStats[job.id] || { total: 0, completed: 0, offHours: 0, points: 0 };
                totalFixedPoints += stats.points;
                
                const lcData = existingEval.livechatData[job.id] || { standardPerSession: undefined, actual: undefined };
                const standardPerSession = lcData.standardPerSession ?? (openPeriod?.dtConfig?.livechatStandards?.[job.id] || getLivechatJobDefaultStandard(job.name));
                const actual = lcData.actual ?? 0;

                const rowRequests = stats.total * standardPerSession;
                const rowCompletionRate = rowRequests > 0 ? actual / rowRequests : 0;
                totalPerformancePoints += stats.points * rowCompletionRate;
            });
            return totalFixedPoints + totalPerformancePoints;
        }

        // OLD FORMAT SUPPORT (fallback)
        livechatJobs.forEach(job => {
            const stats = jobStats[job.id] || { total: 0, completed: 0, offHours: 0, points: 0 };
            totalFixedPoints += stats.points;

            // Calculate total requests - using period config
            const standardPerSession = openPeriod?.dtConfig?.livechatStandards?.[job.id] || getLivechatJobDefaultStandard(job.name);
            const sessionsForCalc = stats.total - stats.offHours;
            totalRequests += sessionsForCalc * standardPerSession;
        });

        const diffConfig = getDifficultyConfig(openPeriod);
        const difficultyStats = existingEval?.livechatDifficulty || {};
        const totalConverted = calcDifficultyConverted(difficultyStats, diffConfig);
        const completionRate = totalRequests > 0 ? totalConverted / totalRequests : 0;
        const performancePoints = totalFixedPoints * completionRate;

        return totalFixedPoints + performancePoints;
    };

    // Build summary rows
    const summaryRows = useMemo(() => {
        return dtEmployees.map(emp => {
            const existingEval = allEvaluations.find(ev => ev.employeeId === emp.id && isDTGroup(ev.evaluationGroup));
            const dtKpiData = existingEval?.dtKpiData;
            const trainingPoints = calcTrainingPoints(emp.id);
            const livechatPoints = calcLivechatPoints(emp.id, existingEval);

            // Calculate work metrics points
            let metricPoints = 0;
            if (existingEval?.metricData) {
                Object.values(existingEval.metricData).forEach((m: any) => {
                    metricPoints += m.points || 0;
                });
            }

            const totalWorkPoints = trainingPoints + livechatPoints + metricPoints;
            const kpiTarget = emp.monthlyKpiTarget || 100;
            const kpiPlanRate = openPeriod.dtConfig.kpiPlanRate || 95;

            // KPI completion
            const kpiActualRate = dtKpiData?.actualRate || 0;
            const kpiCompletionRate = dtKpiData?.completionRate || 0;

            // Work completion
            const workCompletionRate = kpiTarget > 0 ? (totalWorkPoints / kpiTarget) * 100 : 0;

            // Overall rate (DT: 80% KPI + 20% Work)
            const kpiWeight = openPeriod.dtConfig.kpiWeight || 80;
            const workWeight = openPeriod.dtConfig.workWeight || 20;
            const overallRate = (kpiCompletionRate * kpiWeight / 100) + (workCompletionRate * workWeight / 100);

            // Rating logic based on criteria (using kpiCompletionRate = "Hoàn thành" column)
            // Vượt mong đợi: TL HT chung >= 105% VÀ TL KH sử dụng (Hoàn thành) > 103%
            // Đạt: TL HT chung >= 100% VÀ TL KH sử dụng (Hoàn thành) >= 100%
            // Cần cố gắng: TL HT chung < 100% HOẶC TL KH sử dụng (Hoàn thành) < 100%
            let rating: 'Vượt mong đợi' | 'Đạt' | 'Cần cố gắng';
            if (overallRate >= 105 && kpiCompletionRate > 103) {
                rating = 'Vượt mong đợi';
            } else if (overallRate >= 100 && kpiCompletionRate >= 100) {
                rating = 'Đạt';
            } else {
                rating = 'Cần cố gắng';
            }

            return {
                employeeId: emp.id,
                employeeName: emp.fullName,
                isCurrentUser: emp.id === currentEmployee?.id,
                // KPI Usage
                kpiPlanRate,
                kpiActualRate,
                kpiCompletionRate,
                // Work Points
                workPlanPoints: kpiTarget,
                workActualPoints: totalWorkPoints,
                workCompletionRate,
                // Overall
                overallRate,
                rating,
            };
        });
    }, [dtEmployees, allEvaluations, schedule, jobs, openPeriod]);

    // Totals
    const totals = useMemo(() => {
        if (summaryRows.length === 0) return null;
        const count = summaryRows.length;
        return {
            kpiPlanRate: summaryRows.reduce((s, r) => s + r.kpiPlanRate, 0) / count,
            kpiActualRate: summaryRows.reduce((s, r) => s + r.kpiActualRate, 0) / count,
            kpiCompletionRate: summaryRows.reduce((s, r) => s + r.kpiCompletionRate, 0) / count,
            workPlanPoints: summaryRows.reduce((s, r) => s + r.workPlanPoints, 0),
            workActualPoints: summaryRows.reduce((s, r) => s + r.workActualPoints, 0),
            workCompletionRate: summaryRows.reduce((s, r) => s + r.workCompletionRate, 0) / count,
            overallRate: summaryRows.reduce((s, r) => s + r.overallRate, 0) / count,
        };
    }, [summaryRows]);

    const getRatingColor = (rating: string) => {
        switch (rating) {
            case 'Vượt mong đợi': return 'text-green-700 bg-green-100';
            case 'Đạt': return 'text-blue-700 bg-blue-100';
            default: return 'text-yellow-700 bg-yellow-100';
        }
    };

    if (isLoading) {
        return <div className="p-4 text-center text-gray-500">Đang tải...</div>;
    }

    return (
        <div className="space-y-6">
            <h4 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                Kết quả chung - Đánh giá tháng {openPeriod.month}/{openPeriod.year}
            </h4>

            {/* Main Summary Table */}
            <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse min-w-[900px]">
                        <thead>
                            <tr className="bg-gray-100">
                                <th rowSpan={2} className="border p-2 text-left font-bold text-gray-700 min-w-[120px]">Nhân viên</th>
                                <th colSpan={3} className="border p-2 text-center font-bold text-blue-800 bg-blue-50">Tỷ lệ sử dụng (%)</th>
                                <th colSpan={3} className="border p-2 text-center font-bold text-orange-800 bg-orange-50">Công việc (điểm)</th>
                                <th rowSpan={2} className="border p-2 text-center font-bold text-indigo-800 bg-indigo-50 min-w-[80px]">TL HT chung</th>
                                <th rowSpan={2} className="border p-2 text-center font-bold text-purple-800 bg-purple-50 min-w-[100px]">Xếp hạng</th>
                            </tr>
                            <tr className="bg-gray-50">
                                <th className="border p-1 text-center text-blue-700 text-[10px]">Kế hoạch</th>
                                <th className="border p-1 text-center text-blue-700 text-[10px]">Thực hiện</th>
                                <th className="border p-1 text-center text-blue-700 text-[10px]">Hoàn thành</th>
                                <th className="border p-1 text-center text-orange-700 text-[10px]">Kế hoạch</th>
                                <th className="border p-1 text-center text-orange-700 text-[10px]">Thực hiện</th>
                                <th className="border p-1 text-center text-orange-700 text-[10px]">Hoàn thành</th>
                            </tr>
                        </thead>
                        <tbody>
                            {summaryRows.map(row => (
                                <tr key={row.employeeId} className={`hover:bg-gray-50 ${row.isCurrentUser ? 'bg-yellow-50' : ''}`}>
                                    <td className="border p-2 font-medium">
                                        {row.employeeName}
                                        {row.isCurrentUser && <span className="ml-1 text-xs text-yellow-600">(Bạn)</span>}
                                    </td>
                                    <td className="border p-1 text-center">{row.kpiPlanRate.toFixed(0)}%</td>
                                    <td className="border p-1 text-center">{row.kpiActualRate.toFixed(1)}%</td>
                                    <td className={`border p-1 text-center font-medium ${row.kpiCompletionRate >= 100 ? 'text-green-700' : 'text-red-700'}`}>
                                        {row.kpiCompletionRate.toFixed(1)}%
                                    </td>
                                    <td className="border p-1 text-center">{row.workPlanPoints}</td>
                                    <td className="border p-1 text-center">{row.workActualPoints.toFixed(1)}</td>
                                    <td className={`border p-1 text-center font-medium ${row.workCompletionRate >= 100 ? 'text-green-700' : 'text-red-700'}`}>
                                        {row.workCompletionRate.toFixed(1)}%
                                    </td>
                                    <td className={`border p-1 text-center font-bold ${row.overallRate >= 100 ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                                        {row.overallRate.toFixed(1)}%
                                    </td>
                                    <td className={`border p-1 text-center font-bold ${getRatingColor(row.rating)}`}>
                                        {row.rating}
                                    </td>
                                </tr>
                            ))}
                            {summaryRows.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="border p-4 text-center text-gray-500">
                                        Không có dữ liệu
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {totals && isCoordinator && summaryRows.length > 1 && (
                            <tfoot>
                                <tr className="bg-gray-200 font-bold">
                                    <td className="border p-2">Trung bình</td>
                                    <td className="border p-1 text-center">{totals.kpiPlanRate.toFixed(0)}%</td>
                                    <td className="border p-1 text-center">{totals.kpiActualRate.toFixed(1)}%</td>
                                    <td className="border p-1 text-center">{totals.kpiCompletionRate.toFixed(1)}%</td>
                                    <td className="border p-1 text-center">{totals.workPlanPoints}</td>
                                    <td className="border p-1 text-center">{totals.workActualPoints.toFixed(1)}</td>
                                    <td className="border p-1 text-center">{totals.workCompletionRate.toFixed(1)}%</td>
                                    <td className="border p-1 text-center">{totals.overallRate.toFixed(1)}%</td>
                                    <td className="border p-1 text-center">-</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* Rating Criteria Table */}
            <div className="bg-gray-50 border rounded-lg p-4">
                <h5 className="font-bold text-sm text-gray-700 flex items-center gap-2 mb-3">
                    <Info className="w-4 h-4" />
                    Xếp hạng theo nguyên tắc
                </h5>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse max-w-lg">
                        <thead>
                            <tr className="bg-white">
                                <th className="border p-2 text-left font-bold text-gray-700">Tiêu chí đánh giá</th>
                                <th className="border p-2 text-center font-bold text-yellow-700 bg-yellow-50">Cần cố gắng</th>
                                <th className="border p-2 text-center font-bold text-blue-700 bg-blue-50">Đạt</th>
                                <th className="border p-2 text-center font-bold text-green-700 bg-green-50">Vượt mong đợi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="border p-2 font-medium">Tỷ lệ hoàn thành chung</td>
                                <td className="border p-2 text-center text-yellow-700">&lt; 100%</td>
                                <td className="border p-2 text-center text-blue-700">100% - 105%</td>
                                <td className="border p-2 text-center text-green-700">≥ 105%</td>
                            </tr>
                            <tr>
                                <td className="border p-2 font-medium">Tỷ lệ KH sử dụng</td>
                                <td className="border p-2 text-center text-yellow-700">&lt; 100%</td>
                                <td className="border p-2 text-center text-blue-700">≥ 100%</td>
                                <td className="border p-2 text-center text-green-700">&gt; 103%</td>
                            </tr>
                            <tr className="bg-gray-100">
                                <td className="border p-2 font-bold">Điều kiện</td>
                                <td className="border p-2 text-center font-bold text-yellow-700">Hoặc</td>
                                <td className="border p-2 text-center font-bold text-blue-700">Và</td>
                                <td className="border p-2 text-center font-bold text-green-700">Và</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SummaryTable;
