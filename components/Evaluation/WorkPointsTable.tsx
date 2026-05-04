/**
 * WorkPointsTable.tsx - Shared Work Points Table for ONB_DT Evaluation
 * Shows: Điểm Đào tạo (auto), Điểm Livechat (auto), plus 3 metric groups:
 * - Nhóm Thẻ CRM: Thẻ Tự học, CĐDL, Hỗ trợ 1-1, etc.
 * - Nhóm Công việc khác: Làm tài liệu, Công việc khác
 * - Nhóm Vi phạm: Thẻ chưa chăm sóc, Đi muộn
 * Staff: sees only their row
 * Coordinator: sees all employees
 * 
 * V3.9.7: Now reads metrics from DB (evaluation_metrics collection)
 */

import React, { useMemo, useState, useEffect } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useEvaluationsQuery, useEvaluationMutation, useEvaluationMetricsQuery } from '../../hooks/useEvaluationQuery';
import { EvaluationPeriod, EmployeeEvaluation, Role, JobGroup, EvaluationMetric } from '../../types';
import { auth } from '../../services/firebaseConfig';
import { isDTGroup } from '../../utils/permissions';
import toast from 'react-hot-toast';
import { startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { getDifficultyConfig, calcDifficultyConverted } from '../../utils/evaluationHelpers';

interface WorkPointsTableProps {
    openPeriod: EvaluationPeriod;
    employeeId?: string; // For review mode - show only this employee
}

// Fallback defaults if DB is empty (for backward compatibility)
const DEFAULT_CRM_METRICS = [
    { id: 'the_tu_hoc', name: 'Thẻ Tự học', defaultPoints: 0.3 },
    { id: 'the_cddl', name: 'Thẻ CĐDL', defaultPoints: 0.5 },
    { id: 'the_ho_tro_1_1', name: 'Thẻ HT 1-1', defaultPoints: 0.3 },
    { id: 'the_dao_tao_online_1_1', name: 'Thẻ ĐT online 1-1', defaultPoints: 2.5 },
    { id: 'the_dung_thu', name: 'Thẻ Dùng thử', defaultPoints: 8.5 },
    { id: 'the_sua_mau', name: 'Thẻ sửa mẫu', defaultPoints: 2.5 },
    { id: 'the_khac', name: 'Thẻ khác', defaultPoints: 0.1 },
];

const DEFAULT_WORK_METRICS = [
    { id: 'lam_tai_lieu', name: 'Làm tài liệu', defaultPoints: 6 },
    { id: 'cong_viec_khac', name: 'CV khác', defaultPoints: 2 },
];

const DEFAULT_VIOLATION_METRICS = [
    { id: 'the_chua_cham_soc', name: 'Thẻ chưa CS', defaultPoints: -5 },
    { id: 'di_muon', name: 'Đi muộn', defaultPoints: -5 },
];

interface RowData {
    employeeId: string;
    employeeName: string;
    trainingPoints: number;
    livechatPoints: number;
    crmMetrics: { [key: string]: { quantity: number; points: number } };
    otherMetrics: { [key: string]: { quantity: number; points: number } };
    violationMetrics: { [key: string]: { quantity: number; points: number } };
    totalCrmPoints: number;
    totalOtherPoints: number;
    totalViolationPoints: number;
    totalWorkPoints: number;
    kpiTarget: number;
    completionRate: number;
    isDirty: boolean;
    existingEval?: EmployeeEvaluation;
}

const WorkPointsTable: React.FC<WorkPointsTableProps> = ({ openPeriod, employeeId }) => {
    const { employees, jobs, schedule } = useData();
    const { data: allEvaluations = [], isLoading: loadingEvals } = useEvaluationsQuery(openPeriod.id);
    const { data: allMetrics = [], isLoading: loadingMetrics } = useEvaluationMetricsQuery();
    const { saveMutation } = useEvaluationMutation();

    const currentUser = auth.currentUser;
    const currentEmployee = useMemo(() =>
        employees.find(e => e.email?.toLowerCase() === currentUser?.email?.toLowerCase()),
        [employees, currentUser]
    );

    const isCoordinator = currentEmployee?.role === Role.Coordinator || currentEmployee?.role === Role.Admin;
    const kpiTarget = currentEmployee?.monthlyKpiTarget || 100;

    // Filter employees in ONB_DT group
    // Priority: If employeeId prop passed (review mode), show only that employee
    const dtEmployees = useMemo(() => {
        const filtered = employees.filter(e => isDTGroup(e.evaluationGroup));
        // Review mode: show only the specific employee
        if (employeeId) {
            return filtered.filter(e => e.id === employeeId);
        }
        if (isCoordinator) {
            return filtered;
        }
        return filtered.filter(e => e.id === currentEmployee?.id);
    }, [employees, isCoordinator, currentEmployee, employeeId]);

    // ========== DYNAMIC METRICS FROM DB ==========
    const crmMetricsDef = useMemo(() => {
        const fromDb = allMetrics.filter(m => m.category === 'crm_card' && m.isActive).sort((a, b) => a.order - b.order);
        if (fromDb.length > 0) {
            return fromDb.map(m => ({ id: m.id, name: m.name, points: m.defaultPoints }));
        }
        return DEFAULT_CRM_METRICS.map(m => ({ id: m.id, name: m.name, points: m.defaultPoints }));
    }, [allMetrics]);

    const otherMetricsDef = useMemo(() => {
        const fromDb = allMetrics.filter(m => m.category === 'work' && m.isActive).sort((a, b) => a.order - b.order);
        if (fromDb.length > 0) {
            return fromDb.map(m => ({ id: m.id, name: m.name, points: m.defaultPoints }));
        }
        return DEFAULT_WORK_METRICS.map(m => ({ id: m.id, name: m.name, points: m.defaultPoints }));
    }, [allMetrics]);

    const violationMetricsDef = useMemo(() => {
        const fromDb = allMetrics.filter(m => m.category === 'violation' && m.isActive).sort((a, b) => a.order - b.order);
        if (fromDb.length > 0) {
            return fromDb.map(m => ({ id: m.id, name: m.name, points: m.defaultPoints }));
        }
        return DEFAULT_VIOLATION_METRICS.map(m => ({ id: m.id, name: m.name, points: m.defaultPoints }));
    }, [allMetrics]);

    // Calculate training points for an employee
    const calcTrainingPoints = (empId: string): number => {
        const periodStart = startOfMonth(new Date(openPeriod.year, openPeriod.month - 1));
        const periodEnd = endOfMonth(periodStart);

        const myScheduleItems = schedule.filter(s => {
            const scheduleDate = parseISO(s.date);
            return s.employeeIds?.includes(empId) &&
                isWithinInterval(scheduleDate, { start: periodStart, end: periodEnd }) &&
                (s.status === 'Completed' || s.status === 'Approved');
        });

        let totalPoints = 0;
        myScheduleItems.forEach(item => {
            const job = jobs.find(j => j.id === item.jobId);
            if (job?.group === JobGroup.Training) {
                const coefficient = item.coefficient || 1;
                totalPoints += (job.standardPoint || 0) * coefficient;
            }
        });
        return totalPoints;
    };

    // Calculate livechat points for an employee based on NEW difficulty system (with fallback)
    const calcLivechatPoints = (empId: string, existingEval?: EmployeeEvaluation): number => {
        const periodStart = startOfMonth(new Date(openPeriod.year, openPeriod.month - 1));
        const periodEnd = endOfMonth(periodStart);

        // 1. Calculate TÌNH HÌNH THỰC HIỆN (auto from schedule)
        const myScheduleItems = schedule.filter(s => {
            const scheduleDate = parseISO(s.date);
            return s.employeeIds?.includes(empId) &&
                isWithinInterval(scheduleDate, { start: periodStart, end: periodEnd });
        });

        const jobStats: { [jobId: string]: { total: number; completed: number; offHours: number; points: number } } = {};

        myScheduleItems.forEach(item => {
            const job = jobs.find(j => j.id === item.jobId);
            if (job?.group !== JobGroup.Livechat) return;

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

        const livechatJobs = jobs.filter(j => j.group === JobGroup.Livechat && j.isActive);
        let totalFixedPoints = 0;
        let totalRequests = 0;

        // NEW FORMAT SUPPORT
        if (existingEval?.livechatData && Object.keys(existingEval.livechatData).length > 0) {
            let totalPerformancePoints = 0;
            livechatJobs.forEach(job => {
                const stats = jobStats[job.id] || { total: 0, completed: 0, offHours: 0, points: 0 };
                totalFixedPoints += stats.points;
                
                const lcData = existingEval.livechatData[job.id] || { standardPerSession: undefined, actual: undefined };
                const standardPerSession = lcData.standardPerSession ?? (openPeriod?.dtConfig.livechatStandards?.[job.id] || 35);
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

            // Calculate total requests
            const standardPerSession = openPeriod?.dtConfig.livechatStandards?.[job.id] || 35;
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

    // Build row data with metric inputs
    const [rowData, setRowData] = useState<RowData[]>([]);

    useEffect(() => {
        const rows: RowData[] = dtEmployees.map(emp => {
            const existingEval = allEvaluations.find(ev => ev.employeeId === emp.id && isDTGroup(ev.evaluationGroup));
            const metricData = existingEval?.metricData || {};

            const trainingPoints = calcTrainingPoints(emp.id);
            const livechatPoints = calcLivechatPoints(emp.id, existingEval);

            // Build metric values - using dynamic definitions
            const crmMetrics: { [key: string]: { quantity: number; points: number } } = {};
            crmMetricsDef.forEach(m => {
                const data = metricData[m.id];
                crmMetrics[m.id] = data || { quantity: 0, points: 0 };
            });

            const otherMetrics: { [key: string]: { quantity: number; points: number } } = {};
            otherMetricsDef.forEach(m => {
                const data = metricData[m.id];
                otherMetrics[m.id] = data || { quantity: 0, points: 0 };
            });

            const violationMetrics: { [key: string]: { quantity: number; points: number } } = {};
            violationMetricsDef.forEach(m => {
                const data = metricData[m.id];
                violationMetrics[m.id] = data || { quantity: 0, points: 0 };
            });

            const totalCrmPoints = crmMetricsDef.reduce((sum, m) => sum + (crmMetrics[m.id]?.points || 0), 0);
            const totalOtherPoints = otherMetricsDef.reduce((sum, m) => sum + (otherMetrics[m.id]?.points || 0), 0);
            const totalViolationPoints = violationMetricsDef.reduce((sum, m) => sum + (violationMetrics[m.id]?.points || 0), 0);
            const totalWorkPoints = trainingPoints + livechatPoints + totalCrmPoints + totalOtherPoints + totalViolationPoints;

            const empKpiTarget = emp.monthlyKpiTarget || 100;
            const completionRate = empKpiTarget > 0 ? (totalWorkPoints / empKpiTarget) * 100 : 0;

            return {
                employeeId: emp.id,
                employeeName: emp.fullName,
                trainingPoints,
                livechatPoints,
                crmMetrics,
                otherMetrics,
                violationMetrics,
                totalCrmPoints,
                totalOtherPoints,
                totalViolationPoints,
                totalWorkPoints,
                kpiTarget: empKpiTarget,
                completionRate,
                isDirty: false,
                existingEval,
            };
        });
        setRowData(rows);
    }, [dtEmployees, allEvaluations, schedule, jobs, allMetrics, openPeriod]);

    // Update metric quantity
    const updateMetric = (employeeId: string, metricId: string, quantity: number, group: 'crm' | 'other' | 'violation') => {
        setRowData(prev => prev.map(row => {
            if (row.employeeId !== employeeId) return row;

            const metric = group === 'crm' ? crmMetricsDef.find(m => m.id === metricId) :
                group === 'other' ? otherMetricsDef.find(m => m.id === metricId) :
                    violationMetricsDef.find(m => m.id === metricId);

            if (!metric) return row;

            const points = quantity * metric.points;
            const updated = { ...row, isDirty: true };

            if (group === 'crm') {
                updated.crmMetrics = { ...row.crmMetrics, [metricId]: { quantity, points } };
                updated.totalCrmPoints = crmMetricsDef.reduce((sum, m) => sum + (updated.crmMetrics[m.id]?.points || 0), 0);
            } else if (group === 'other') {
                updated.otherMetrics = { ...row.otherMetrics, [metricId]: { quantity, points } };
                updated.totalOtherPoints = otherMetricsDef.reduce((sum, m) => sum + (updated.otherMetrics[m.id]?.points || 0), 0);
            } else {
                updated.violationMetrics = { ...row.violationMetrics, [metricId]: { quantity, points } };
                updated.totalViolationPoints = violationMetricsDef.reduce((sum, m) => sum + (updated.violationMetrics[m.id]?.points || 0), 0);
            }

            updated.totalWorkPoints = updated.trainingPoints + updated.livechatPoints + updated.totalCrmPoints + updated.totalOtherPoints + updated.totalViolationPoints;
            updated.completionRate = updated.kpiTarget > 0 ? (updated.totalWorkPoints / updated.kpiTarget) * 100 : 0;
            return updated;
        }));
    };

    // Save row
    const saveRow = async (row: RowData) => {
        const emp = dtEmployees.find(e => e.id === row.employeeId);
        if (!emp) return;

        // Merge all metrics
        const allMetricData: { [key: string]: { quantity: number; points: number } } = {};
        crmMetricsDef.forEach(m => { allMetricData[m.id] = row.crmMetrics[m.id]; });
        otherMetricsDef.forEach(m => { allMetricData[m.id] = row.otherMetrics[m.id]; });
        violationMetricsDef.forEach(m => { allMetricData[m.id] = row.violationMetrics[m.id]; });

        const evaluation: EmployeeEvaluation = {
            id: `${openPeriod.id}_${row.employeeId}`,
            periodId: openPeriod.id,
            employeeId: row.employeeId,
            evaluationGroup: 'ONB_DT',
            status: row.existingEval?.status || 'pending',
            dtKpiData: row.existingEval?.dtKpiData || {
                received: 0,
                calculated: 0,
                excluded: 0,
                active: 0,
                notUsedExcluded: 0,
                stoppedExcluded: 0,
                actualRate: 0,
                planRate: 95,
                completionRate: 0,
            },
            livechatDifficulty: row.existingEval?.livechatDifficulty || { easy: 0, medium: 0, hard: 0 },
            metricData: allMetricData,
            summary: row.existingEval?.summary || {
                totalWorkPoints: row.totalWorkPoints,
                kpiCompletionRate: 0,
                workCompletionRate: 0,
                overallRate: 0,
                result: 'Cần cố gắng',
            },
        };

        try {
            await saveMutation.mutateAsync(evaluation);
            setRowData(prev => prev.map(r => r.employeeId === row.employeeId ? { ...r, isDirty: false, existingEval: evaluation } : r));
            toast.success(`Đã lưu điểm cho ${emp.fullName}`);
        } catch (e) {
            console.error('Save error:', e);
            toast.error('Lỗi khi lưu');
        }
    };

    // Save all dirty rows
    const saveAllDirty = async () => {
        const dirtyRows = rowData.filter(r => r.isDirty);
        for (const row of dirtyRows) {
            await saveRow(row);
        }
    };

    const hasDirtyRows = rowData.some(r => r.isDirty);

    if (loadingEvals || loadingMetrics) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2">Đang tải...</span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 italic">
                    Tổng hợp điểm công việc. Kéo ngang để xem đầy đủ các cột.
                </p>
                {hasDirtyRows && (
                    <button
                        onClick={saveAllDirty}
                        disabled={saveMutation.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                    >
                        {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Lưu thay đổi
                    </button>
                )}
            </div>

            <div className="border rounded-lg overflow-hidden">
                <div className="max-h-80 overflow-y-auto overflow-x-auto">
                    <table className="text-xs border-collapse min-w-max">
                        <thead className="bg-orange-100 sticky top-0 z-20">
                            {/* Group Headers */}
                            <tr>
                                <th rowSpan={2} className="border p-2 text-left font-bold text-orange-800 sticky left-0 bg-orange-100 z-30 min-w-[150px]">Nhân viên</th>
                                <th rowSpan={2} className="border p-2 text-center font-bold text-green-700 bg-green-100 min-w-[60px]">
                                    <div className="whitespace-normal">Đào tạo</div>
                                </th>
                                <th rowSpan={2} className="border p-2 text-center font-bold text-purple-700 bg-purple-100 min-w-[60px]">
                                    <div className="whitespace-normal">Livechat</div>
                                </th>
                                <th colSpan={crmMetricsDef.length + 1} className="border p-1 text-center font-bold text-blue-800 bg-blue-100">
                                    Thống kê thẻ CRM
                                </th>
                                <th colSpan={otherMetricsDef.length + 1} className="border p-1 text-center font-bold text-orange-800 bg-orange-100">
                                    Công việc khác
                                </th>
                                <th colSpan={violationMetricsDef.length + 1} className="border p-1 text-center font-bold text-red-800 bg-red-100">
                                    Vi phạm
                                </th>
                                <th rowSpan={2} className="border p-2 text-center font-bold text-orange-800 bg-orange-200 min-w-[60px]">
                                    <div className="whitespace-normal">TỔNG</div>
                                </th>
                                <th rowSpan={2} className="border p-2 text-center font-bold text-teal-700 bg-teal-100 min-w-[50px]">
                                    <div className="whitespace-normal text-[10px]">KPI</div>
                                </th>
                                <th rowSpan={2} className="border p-2 text-center font-bold text-indigo-700 bg-indigo-100 min-w-[60px]">
                                    <div className="whitespace-normal text-[10px]">TL HT</div>
                                </th>
                            </tr>
                            {/* Sub Headers */}
                            <tr>
                                {crmMetricsDef.map(m => (
                                    <th key={m.id} className="border p-1 text-center font-medium text-blue-700 bg-blue-50 w-[55px] max-w-[75px]" title={`${m.points} đ/thẻ`}>
                                        <div className="whitespace-normal text-[10px] break-words leading-tight">{m.name}</div>
                                    </th>
                                ))}
                                <th className="border p-1 text-center font-bold text-blue-800 bg-blue-100 w-[40px]">Σ</th>

                                {otherMetricsDef.map(m => (
                                    <th key={m.id} className="border p-1 text-center font-medium text-orange-700 bg-orange-50 w-[82px] max-w-[112px]" title={`${m.points} đ/cv`}>
                                        <div className="whitespace-normal text-[10px] break-words leading-tight">{m.name}</div>
                                    </th>
                                ))}
                                <th className="border p-1 text-center font-bold text-orange-800 bg-orange-100 w-[60px]">Σ</th>

                                {violationMetricsDef.map(m => (
                                    <th key={m.id} className="border p-1 text-center font-medium text-red-700 bg-red-50 w-[82px] max-w-[112px]" title={`${m.points} đ/lần`}>
                                        <div className="whitespace-normal text-[10px] break-words leading-tight">{m.name}</div>
                                    </th>
                                ))}
                                <th className="border p-1 text-center font-bold text-red-800 bg-red-100 w-[60px]">Σ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rowData.map(row => {
                                const isMe = currentEmployee?.id === row.employeeId;
                                const canEdit = isMe || isCoordinator;

                                return (
                                    <tr key={row.employeeId} className={`hover:bg-gray-50 ${isMe ? 'bg-orange-50' : ''} ${row.isDirty ? 'bg-yellow-50' : ''}`}>
                                        <td className={`border p-2 font-medium sticky left-0 z-10 ${isMe ? 'bg-orange-50' : 'bg-white'} ${row.isDirty ? 'bg-yellow-50' : ''}`}>
                                            <div className="truncate max-w-[150px]" title={row.employeeName}>
                                                {row.employeeName}
                                                {isMe && <span className="ml-1 text-xs text-orange-600">(Bạn)</span>}
                                            </div>
                                        </td>
                                        <td className="border p-1 text-center text-green-700 font-medium bg-green-50">
                                            {row.trainingPoints.toFixed(1)}
                                        </td>
                                        <td className="border p-1 text-center text-purple-700 font-medium bg-purple-50">
                                            {row.livechatPoints.toFixed(1)}
                                        </td>

                                        {/* CRM Metrics */}
                                        {crmMetricsDef.map(m => (
                                            <td key={m.id} className="border p-0.5 text-center bg-blue-50">
                                                <input
                                                    type="number"
                                                    value={row.crmMetrics[m.id]?.quantity || 0}
                                                    onChange={e => updateMetric(row.employeeId, m.id, parseInt(e.target.value) || 0, 'crm')}
                                                    disabled={!canEdit}
                                                    className="w-10 px-0.5 py-0.5 border rounded text-center text-[10px] disabled:bg-gray-100"
                                                />
                                            </td>
                                        ))}
                                        <td className="border p-1 text-center font-bold text-blue-700 bg-blue-100">
                                            {row.totalCrmPoints.toFixed(1)}
                                        </td>

                                        {/* Other Work Metrics */}
                                        {otherMetricsDef.map(m => (
                                            <td key={m.id} className="border p-0.5 text-center bg-orange-50">
                                                <input
                                                    type="number"
                                                    value={row.otherMetrics[m.id]?.quantity || 0}
                                                    onChange={e => updateMetric(row.employeeId, m.id, parseInt(e.target.value) || 0, 'other')}
                                                    disabled={!canEdit}
                                                    className="w-16 px-0.5 py-0.5 border rounded text-center text-[10px] disabled:bg-gray-100"
                                                />
                                            </td>
                                        ))}
                                        <td className="border p-1 text-center font-bold text-orange-700 bg-orange-100">
                                            {row.totalOtherPoints.toFixed(1)}
                                        </td>

                                        {/* Violation Metrics */}
                                        {violationMetricsDef.map(m => (
                                            <td key={m.id} className="border p-0.5 text-center bg-red-50">
                                                <input
                                                    type="number"
                                                    value={row.violationMetrics[m.id]?.quantity || 0}
                                                    onChange={e => updateMetric(row.employeeId, m.id, parseInt(e.target.value) || 0, 'violation')}
                                                    disabled={!canEdit}
                                                    className="w-16 px-0.5 py-0.5 border rounded text-center text-[10px] disabled:bg-gray-100"
                                                />
                                            </td>
                                        ))}
                                        <td className="border p-1 text-center font-bold text-red-700 bg-red-100">
                                            {row.totalViolationPoints !== 0 ? row.totalViolationPoints.toFixed(1) : '0'}
                                        </td>

                                        {/* Total */}
                                        <td className={`border p-1 text-center font-bold ${row.totalWorkPoints >= row.kpiTarget ? 'text-green-700 bg-green-100' : 'text-orange-700 bg-orange-100'}`}>
                                            {row.totalWorkPoints.toFixed(1)}
                                        </td>
                                        {/* KPI Target */}
                                        <td className="border p-1 text-center font-medium text-teal-700 bg-teal-50">
                                            {row.kpiTarget}
                                        </td>
                                        {/* Completion Rate */}
                                        <td className={`border p-1 text-center font-bold ${row.completionRate >= 100 ? 'text-green-700 bg-green-100' : row.completionRate >= 80 ? 'text-blue-700 bg-blue-100' : 'text-red-700 bg-red-100'}`}>
                                            {row.completionRate.toFixed(1)}%
                                        </td>
                                    </tr>
                                );
                            })}
                            {rowData.length === 0 && (
                                <tr>
                                    <td colSpan={4 + crmMetricsDef.length + otherMetricsDef.length + violationMetricsDef.length + 6} className="border p-4 text-center text-gray-500">
                                        Không có nhân viên ONB_DT
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="text-[10px] text-gray-500 grid grid-cols-3 gap-2">
                <div>
                    <strong className="text-blue-700">Thẻ CRM:</strong>
                    {crmMetricsDef.map(m => <span key={m.id} className="ml-1">{m.name}={m.points}đ</span>)}
                </div>
                <div>
                    <strong className="text-orange-700">CV khác:</strong>
                    {otherMetricsDef.map(m => <span key={m.id} className="ml-1">{m.name}={m.points}đ</span>)}
                </div>
                <div>
                    <strong className="text-red-700">Vi phạm:</strong>
                    {violationMetricsDef.map(m => <span key={m.id} className="ml-1">{m.name}={m.points}đ</span>)}
                </div>
            </div>
        </div>
    );
};

export default WorkPointsTable;
