/**
 * EmployeeFormDT - Self-evaluation form for ONB_DT (Chuyển giao) group
 * Includes: KPI Data, Training Points (auto), Livechat Details Table, Work Metrics
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Save, Calculator, Loader2, BookOpen, MessageSquare, Briefcase, AlertTriangle } from 'lucide-react';
import { useOpenPeriodQuery, useEvaluationMetricsQuery, useEmployeeEvaluationQuery, useEvaluationMutation, useEvaluationsQuery } from '../../hooks/useEvaluationQuery';
import { useData } from '../../context/DataContext';
import { auth } from '../../services/firebaseConfig';
import { EmployeeEvaluation, EvaluationMetric,  Job, Role } from '../../types';
import { isDTGroup } from '../../utils/permissions';
import toast from 'react-hot-toast';
import { startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { getDifficultyConfig, calcDifficultyConverted } from '../../utils/evaluationHelpers';
import KpiTable from './KpiTable';
import WorkPointsTable from './WorkPointsTable';
import SummaryTable from './SummaryTable';

// Type for Livechat job row data - TÌNH HÌNH THỰC HIỆN
interface LivechatJobRow {
    jobId: string;
    jobName: string;
    totalSessions: number;          // Số buổi (auto from schedule)
    standardPointPerSession: number; // Định mức điểm/buổi (from job.standardPoint)
    fixedPoints: number;            // Điểm cố định = standardPointPerSession * totalSessions
    standardPerSession: number;     // TC/buổi (tự điền, default từ period config)
    actual: number;                 // Thực hiện (tự điền)
    totalRequests: number;          // Tổng số lượng YC = totalSessions * TC/buổi
    completionRate: number;         // Tỷ lệ hoàn thành = actual / totalRequests
    performancePoints: number;      // Điểm hoàn thành KPI = fixedPoints * completionRate
    totalRecognized: number;        // Tổng điểm = fixedPoints + performancePoints
}

interface Props {
    readOnly?: boolean;
    employeeId?: string;  // For review mode - override currentEmployee
    periodId?: string;    // For review mode - override openPeriod
}

export default function EmployeeFormDT({ readOnly = false, employeeId, periodId }: Props) {
    const { employees, schedule, jobs } = useData();
    const currentUser = auth.currentUser;
    const currentEmployee = employees.find(e => e.email?.toLowerCase() === currentUser?.email?.toLowerCase());

    // Coordinator role check (moved up for query dependency)
    const isCoordinator = currentEmployee?.role === Role.Coordinator || currentEmployee?.role === Role.Admin;

    // DT Employees list for coordinator selector
    const dtEmployees = useMemo(() => {
        return employees.filter(e => isDTGroup(e.evaluationGroup));
    }, [employees]);

    // Selected employee for viewing (Coordinator only)
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

    // Initialize selected employee for coordinators
    // Priority: If employeeId prop is passed (review mode), use that
    useEffect(() => {
        if (employeeId) {
            // Review mode: set to the passed employeeId
            setSelectedEmployeeId(employeeId);
        } else if (isCoordinator && dtEmployees.length > 0 && !selectedEmployeeId) {
            setSelectedEmployeeId(currentEmployee?.id || dtEmployees[0].id);
        }
    }, [employeeId, isCoordinator, dtEmployees, selectedEmployeeId, currentEmployee]);

    // Target employee to show data for (must be before evaluation query)
    // Priority: 1) employeeId prop (review mode), 2) coordinator selection, 3) current user
    const targetEmployee = useMemo(() => {
        // If employeeId prop is passed (review mode), use that
        if (employeeId) {
            return employees.find(e => e.id === employeeId);
        }
        // Coordinator can select any employee
        if (isCoordinator && selectedEmployeeId) {
            return employees.find(e => e.id === selectedEmployeeId);
        }
        return currentEmployee;
    }, [employeeId, isCoordinator, selectedEmployeeId, employees, currentEmployee]);

    // Queries - using targetEmployee to load correct evaluation
    const { data: openPeriod, isLoading: loadingPeriod } = useOpenPeriodQuery();
    const { data: metrics = [] } = useEvaluationMetricsQuery();
    const { data: existingEval, isLoading: loadingEval } = useEmployeeEvaluationQuery(
        targetEmployee?.id || '',  // Fixed: use targetEmployee instead of currentEmployee
        openPeriod?.id || ''
    );
    const { saveMutation } = useEvaluationMutation();

    // Get all evaluations for coordinator statistics
    const { data: allEvaluations = [] } = useEvaluationsQuery(openPeriod?.id);

    const [activeSection, setActiveSection] = useState<'summary' | 'kpi' | 'training' | 'livechat' | 'work'>('summary');

    // KPI Data State
    const [kpiData, setKpiData] = useState({
        received: 0,
        notUsedExcluded: 0,
        stoppedExcluded: 0,
        active: 0,
    });

    // Work metrics state
    const [metricData, setMetricData] = useState<{ [id: string]: number }>({});

    // Livechat data state (editable TC/buổi and Thực hiện)
    const [livechatData, setLivechatData] = useState<{ [id: string]: { standardPerSession: number, actual: number } }>({});

    // Livechat difficulty stats state (keep for backward compatibility)
    const [difficultyStats, setDifficultyStats] = useState<{ [id: string]: number }>({});

    // ========== GET LIVECHAT JOBS ==========
    const livechatJobs = useMemo(() => {
        return jobs.filter(j => j.group === 'Livechat' && j.isActive);
    }, [jobs]);

    // ========== AUTO CALCULATE TRAINING DETAILS BY CLASSIFICATION ==========
    // Structure: { classification: { sessions, points } }
    const trainingByClassification = useMemo(() => {
        if (!openPeriod || !targetEmployee) return { nghiepVu: { sessions: 0, points: 0 }, linhVuc: { sessions: 0, points: 0 }, noiBo: { sessions: 0, points: 0 }, trucTiep: { sessions: 0, points: 0 } };

        const periodStart = startOfMonth(new Date(openPeriod.year, openPeriod.month - 1));
        const periodEnd = endOfMonth(periodStart);

        // Get completed schedule items
        const myScheduleItems = schedule.filter(s => {
            const scheduleDate = parseISO(s.date);
            return s.employeeIds?.includes(targetEmployee.id) &&
                isWithinInterval(scheduleDate, { start: periodStart, end: periodEnd }) &&
                (s.status === 'Completed' || s.status === 'Approved');
        });

        // Group by classification
        const result = {
            nghiepVu: { sessions: 0, points: 0 },
            linhVuc: { sessions: 0, points: 0 },
            noiBo: { sessions: 0, points: 0 },
            trucTiep: { sessions: 0, points: 0 },
        };

        myScheduleItems.forEach(item => {
            const job = jobs.find(j => j.id === item.jobId);
            if (job?.group !== 'Đào tạo') return;

            const coefficient = item.coefficient || 1;
            const points = (job.standardPoint || 0) * coefficient;
            const classification = job.classification || '';

            if (classification === 'Nghiệp vụ') {
                result.nghiepVu.sessions++;
                result.nghiepVu.points += points;
            } else if (classification === 'Lĩnh vực') {
                result.linhVuc.sessions++;
                result.linhVuc.points += points;
            } else if (classification === 'Nội bộ') {
                result.noiBo.sessions++;
                result.noiBo.points += points;
            } else if (classification === 'Trực tiếp') {
                result.trucTiep.sessions++;
                result.trucTiep.points += points;
            }
        });

        return result;
    }, [openPeriod, targetEmployee, schedule, jobs]);

    // Calculate totals for "Thực tế" (need conversion: Nghiệp vụ, Lĩnh vực, Nội bộ)
    const actualTotal = useMemo(() => ({
        sessions: trainingByClassification.nghiepVu.sessions + trainingByClassification.linhVuc.sessions + trainingByClassification.noiBo.sessions,
        points: trainingByClassification.nghiepVu.points + trainingByClassification.linhVuc.points + trainingByClassification.noiBo.points,
    }), [trainingByClassification]);

    // ========== CONVERSION ALGORITHM ==========
    // Standard conversion rates
    const CONVERSION_RATES = { '60p': 0.5, '120p': 1.1, '210p': 2.4 };

    // Calculate balance score (lower is more balanced)
    const calcBalanceScore = (q60: number, q120: number, q210: number): number => {
        const values = [q60, q120, q210];
        const avg = (q60 + q120 + q210) / 3;
        // Variance as balance measure
        return values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0);
    };

    // Auto-convert to minimize difference (converted >= actual, difference minimized)
    // When difference is equal, prefer more balanced distribution
    const conversionResult = useMemo(() => {
        const targetPoints = actualTotal.points;
        if (targetPoints === 0) return { qty60: 0, qty120: 0, qty210: 0, total: 0, difference: 0 };

        const rate210 = CONVERSION_RATES['210p'];
        const rate120 = CONVERSION_RATES['120p'];
        const rate60 = CONVERSION_RATES['60p'];

        let bestResult = { qty60: 0, qty120: 0, qty210: 0, total: Infinity, difference: Infinity };
        let bestBalanceScore = Infinity;

        // Try different combinations of 210p (0 to max needed)
        const max210 = Math.ceil(targetPoints / rate210) + 1;

        for (let n210 = 0; n210 <= max210; n210++) {
            const points210 = n210 * rate210;
            const remaining = targetPoints - points210;

            if (remaining <= 0) {
                // 210p alone is enough
                const total = points210;
                const diff = total - targetPoints;
                const balanceScore = calcBalanceScore(0, 0, n210);

                if (diff >= 0 && (diff < bestResult.difference ||
                    (diff === bestResult.difference && balanceScore < bestBalanceScore))) {
                    bestResult = { qty60: 0, qty120: 0, qty210: n210, total, difference: diff };
                    bestBalanceScore = balanceScore;
                }
                continue;
            }

            // Try to fill remaining with 120p and 60p
            const max120 = Math.ceil(remaining / rate120) + 1;

            for (let n120 = 0; n120 <= max120; n120++) {
                const points120 = n120 * rate120;
                const stillRemaining = remaining - points120;

                if (stillRemaining <= 0) {
                    // 210p + 120p is enough
                    const total = points210 + points120;
                    const diff = total - targetPoints;
                    const balanceScore = calcBalanceScore(0, n120, n210);

                    if (diff >= 0 && (diff < bestResult.difference ||
                        (diff === bestResult.difference && balanceScore < bestBalanceScore))) {
                        bestResult = { qty60: 0, qty120: n120, qty210: n210, total, difference: diff };
                        bestBalanceScore = balanceScore;
                    }
                    break;
                }

                // Need 60p to cover the rest
                const n60 = Math.ceil(stillRemaining / rate60);
                const points60 = n60 * rate60;
                const total = points210 + points120 + points60;
                const diff = total - targetPoints;
                const balanceScore = calcBalanceScore(n60, n120, n210);

                if (diff >= 0 && (diff < bestResult.difference ||
                    (diff === bestResult.difference && balanceScore < bestBalanceScore))) {
                    bestResult = { qty60: n60, qty120: n120, qty210: n210, total, difference: diff };
                    bestBalanceScore = balanceScore;
                }
            }
        }

        // Fallback: if no result found, calculate minimum needed with 210p only
        if (bestResult.difference === Infinity) {
            const n210 = Math.ceil(targetPoints / rate210);
            bestResult = { qty60: 0, qty120: 0, qty210: n210, total: n210 * rate210, difference: n210 * rate210 - targetPoints };
        }

        return bestResult;
    }, [actualTotal.points]);

    // Total training points = converted points + trực tiếp points
    const trainingPoints = useMemo(() => {
        return conversionResult.total + trainingByClassification.trucTiep.points;
    }, [conversionResult, trainingByClassification]);

    // ========== LIVECHAT DETAILED STATS ==========
    const livechatDetails = useMemo((): LivechatJobRow[] => {
        if (!openPeriod || !targetEmployee) return [];

        const periodStart = startOfMonth(new Date(openPeriod.year, openPeriod.month - 1));
        const periodEnd = endOfMonth(periodStart);

        // Get all my schedule items in this period
        const myScheduleItems = schedule.filter(s => {
            const scheduleDate = parseISO(s.date);
            return s.employeeIds?.includes(targetEmployee.id) &&
                isWithinInterval(scheduleDate, { start: periodStart, end: periodEnd });
        });

        const jobStats: { [jobId: string]: { total: number; points: number } } = {};

        myScheduleItems.forEach(item => {
            const job = jobs.find(j => j.id === item.jobId);
            if (job?.group !== 'Livechat') return;

            if (!jobStats[job.id]) {
                jobStats[job.id] = { total: 0, points: 0 };
            }

            jobStats[job.id].total++;

            // Only count points for COMPLETED sessions
            if (item.status === 'Completed' || item.status === 'Approved') {
                jobStats[job.id].points += job.standardPoint || 0;
            }
        });

        // Build rows for each Livechat job
        return livechatJobs.map(job => {
            const stats = jobStats[job.id] || { total: 0, points: 0 };

            // Use livechatData if user edited, otherwise fallback to period config / 0
            const lcData = livechatData[job.id] || { standardPerSession: undefined, actual: undefined };
            const standardPerSession = lcData.standardPerSession ?? (openPeriod?.dtConfig.livechatStandards?.[job.id] || 35);
            const actual = lcData.actual ?? 0;

            const totalRequests = stats.total * standardPerSession;
            const completionRate = totalRequests > 0 ? actual / totalRequests : 0;
            const fixedPoints = stats.points;
            const performancePoints = fixedPoints * completionRate;
            const totalRecognized = fixedPoints + performancePoints;

            return {
                jobId: job.id,
                jobName: job.name,
                totalSessions: stats.total,
                standardPointPerSession: job.standardPoint || 0,
                fixedPoints,
                standardPerSession,
                actual,
                totalRequests,
                completionRate,
                performancePoints,
                totalRecognized,
            };
        });
    }, [openPeriod, targetEmployee, schedule, jobs, livechatJobs, livechatData]);

    // Sum totals from TÌNH HÌNH THỰC HIỆN
    const livechatTotals = useMemo(() => {
        const totalRequestsAll = livechatDetails.reduce((sum, row) => sum + row.totalRequests, 0);
        const fixedPointsAll = livechatDetails.reduce((sum, row) => sum + row.fixedPoints, 0);
        return { totalRequests: totalRequestsAll, fixedPoints: fixedPointsAll };
    }, [livechatDetails]);

    // Total Livechat points for summary
    const totalLivechatPoints = useMemo(() => {
        return livechatDetails.reduce((sum, row) => sum + row.totalRecognized, 0);
    }, [livechatDetails]);

    // ========== CALCULATED VALUES ==========
    const excluded = kpiData.notUsedExcluded + kpiData.stoppedExcluded;
    const calculated = kpiData.received - excluded;
    const actualRate = calculated > 0 ? (kpiData.active / calculated * 100) : 0;
    const planRate = openPeriod?.dtConfig.kpiPlanRate || 95;
    const completionRate = planRate > 0 ? (actualRate / planRate * 100) : 0;

    // Work metrics
    const workMetrics = metrics.filter(m => m.category === 'work' || m.category === 'crm_card');
    const violationMetrics = metrics.filter(m => m.category === 'violation');

    const getPointsForMetric = (m: EvaluationMetric): number => {
        return openPeriod?.metricOverrides?.[m.id] ?? m.defaultPoints;
    };

    const manualWorkPoints = [...workMetrics, ...violationMetrics].reduce((sum, m) => {
        const qty = metricData[m.id] || 0;
        return sum + (qty * getPointsForMetric(m));
    }, 0);

    // Total work points = Training + Livechat + Manual
    const totalWorkPoints = trainingPoints + totalLivechatPoints + manualWorkPoints;

    // KPI Target
    const kpiTarget = currentEmployee?.monthlyKpiTarget || 100;

    // Overall calculation (DT: 80% KPI + 20% Work)
    const kpiWeight = openPeriod?.dtConfig.kpiWeight || 80;
    const workWeight = openPeriod?.dtConfig.workWeight || 20;
    const workCompletionRate = kpiTarget > 0 ? (totalWorkPoints / kpiTarget * 100) : 0;
    const overallRate = (completionRate * kpiWeight / 100) + (workCompletionRate * workWeight / 100);

    // Rating
    const excellent = openPeriod?.ratingThresholds.excellent || 105;
    const good = openPeriod?.ratingThresholds.good || 100;
    const result = overallRate >= excellent ? 'Vượt mong đợi' : overallRate >= good ? 'Đạt' : 'Cần cố gắng';

    // ========== COORDINATOR STATISTICS ==========
    const ratingStats = useMemo(() => {
        if (!isCoordinator) return { total: 0, notEvaluated: 0, needsImprovement: 0, achieved: 0, exceeded: 0 };

        // Filter evaluations for DT employees only
        const dtEvaluations = allEvaluations.filter(evaluation => {
            const emp = employees.find(e => e.id === evaluation.employeeId);
            return isDTGroup(emp?.evaluationGroup);
        });

        // Get set of evaluated employee IDs
        const evaluatedIds = new Set(dtEvaluations.map(e => e.employeeId));

        let notEvaluated = 0;
        let needsImprovement = 0;
        let achieved = 0;
        let exceeded = 0;

        // Count not evaluated
        dtEmployees.forEach(emp => {
            if (!evaluatedIds.has(emp.id)) {
                notEvaluated++;
            }
        });

        dtEvaluations.forEach(evaluation => {
            const overallRateValue = evaluation.summary?.overallRate || 0;
            if (overallRateValue >= excellent) {
                exceeded++;
            } else if (overallRateValue >= good) {
                achieved++;
            } else {
                needsImprovement++;
            }
        });

        return {
            total: dtEmployees.length,
            notEvaluated,
            needsImprovement,
            achieved,
            exceeded,
        };
    }, [isCoordinator, allEvaluations, employees, dtEmployees, excellent, good]);

    // ========== TOP PERFORMER (ALL ROLES CAN SEE) ==========
    const topPerformer = useMemo(() => {
        // Get all APPROVED evaluations (both DT and KS)
        const approvedEvals = allEvaluations.filter(e => e.status === 'approved');
        if (approvedEvals.length === 0) return null;

        // Find the one with highest overallRate
        let best = approvedEvals[0];
        approvedEvals.forEach(evaluation => {
            if ((evaluation.summary?.overallRate || 0) > (best.summary?.overallRate || 0)) {
                best = evaluation;
            }
        });

        const employee = employees.find(e => e.id === best.employeeId);
        return {
            name: employee?.fullName || 'Unknown',
            rate: best.summary?.overallRate || 0,
            result: best.summary?.result || '-',
            group: isDTGroup(best.evaluationGroup) ? 'Chuyển giao' : 'Kiểm soát'
        };
    }, [allEvaluations, employees]);

    // Load existing data - reset when targetEmployee changes
    useEffect(() => {
        // Reset to default values first
        setKpiData({
            received: 0,
            notUsedExcluded: 0,
            stoppedExcluded: 0,
            active: 0,
        });
        setMetricData({});
        setDifficultyStats({});

        // Then load existing data if available
        if (existingEval?.dtKpiData) {
            setKpiData({
                received: existingEval.dtKpiData.received,
                notUsedExcluded: existingEval.dtKpiData.notUsedExcluded,
                stoppedExcluded: existingEval.dtKpiData.stoppedExcluded,
                active: existingEval.dtKpiData.active,
            });
        }
        if (existingEval?.metricData) {
            const data: { [id: string]: number } = {};
            Object.entries(existingEval.metricData).forEach(([id, val]) => {
                data[id] = val.quantity;
            });
            setMetricData(data);
        }
        // Load livechat difficulty stats if saved (backward compatible)
        if (existingEval?.livechatDifficulty) {
            setDifficultyStats(existingEval.livechatDifficulty);
        }
        // Load livechat data
        if (existingEval?.livechatData) {
            setLivechatData(existingEval.livechatData);
        }
    }, [existingEval, targetEmployee?.id]);

    const handleSave = async (submit: boolean = false) => {
        if (!targetEmployee || !openPeriod) return;

        const evaluation: EmployeeEvaluation = {
            id: `${openPeriod.id}_${targetEmployee.id}`,
            periodId: openPeriod.id,
            employeeId: targetEmployee.id,
            evaluationGroup: 'ONB_DT',
            status: submit ? 'submitted' : 'pending',
            dtKpiData: {
                received: kpiData.received,
                calculated,
                excluded,
                active: kpiData.active,
                notUsedExcluded: kpiData.notUsedExcluded,
                stoppedExcluded: kpiData.stoppedExcluded,
                actualRate,
                planRate,
                completionRate,
            },
            metricData: Object.fromEntries(
                [...workMetrics, ...violationMetrics].map(m => [
                    m.id,
                    { quantity: metricData[m.id] || 0, points: (metricData[m.id] || 0) * getPointsForMetric(m) }
                ])
            ),
            livechatData,
            livechatDifficulty: difficultyStats,
            summary: {
                totalWorkPoints,
                kpiCompletionRate: completionRate,
                workCompletionRate,
                overallRate,
                result: result as any,
            },
            ...(submit ? { submittedAt: new Date().toISOString() } : {}),
        };

        try {
            await saveMutation.mutateAsync(evaluation);
            toast.success(submit ? 'Đã gửi đánh giá!' : 'Đã lưu nháp!');
        } catch (e) {
            console.error('Save error:', e);
            toast.error('Lỗi khi lưu đánh giá');
        }
    };


    if (loadingPeriod || loadingEval) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2">Đang tải...</span>
            </div>
        );
    }

    if (!openPeriod) {
        return (
            <div className="text-center py-8 text-gray-500">
                <p className="text-lg font-medium">Chưa có đợt đánh giá nào đang mở</p>
                <p className="text-sm">Vui lòng chờ Admin/Coordinator mở đợt đánh giá mới.</p>
            </div>
        );
    }

    // Check evaluation group - Admin/Coordinator can bypass
    if (!isCoordinator && (!currentEmployee?.evaluationGroup || !isDTGroup(currentEmployee.evaluationGroup))) {
        return (
            <div className="text-center py-8 text-yellow-600">
                <p className="text-lg font-medium">Form này dành cho nhóm ONB_DT</p>
                <p className="text-sm">Bạn chưa được phân loại vào nhóm đánh giá hoặc thuộc nhóm khác.</p>
            </div>
        );
    }

    const isSubmitted = existingEval?.status === 'submitted' || existingEval?.status === 'approved';
    const isEditable = !readOnly && !isSubmitted;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-xl font-bold text-blue-800">{openPeriod.name}</h3>
                <div className="flex flex-wrap gap-4 mt-2 text-sm">
                    <span className="text-blue-600">📋 Nhóm: <strong>ONB_DT (Chuyển giao)</strong></span>
                    <span className="text-blue-600">🎯 KPI Đánh giá: <strong>{kpiTarget} điểm</strong></span>
                </div>
                {isSubmitted && (
                    <p className="text-sm text-green-600 font-medium mt-2">✅ Đã gửi đánh giá</p>
                )}
            </div>

            {/* Section Tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg overflow-x-auto">
                {[
                    { id: 'summary', label: 'Kết quả chung', icon: Calculator },
                    { id: 'kpi', label: 'Tính tỷ lệ sử dụng', icon: Calculator },
                    { id: 'work', label: 'Điểm công việc', icon: Briefcase },
                    { id: 'training', label: 'Điểm Đào tạo', icon: BookOpen },
                    { id: 'livechat', label: 'Điểm Livechat', icon: MessageSquare },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSection(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeSection === tab.id
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                            }`}
                        role="tab"
                        aria-selected={activeSection === tab.id}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Section Content */}
            <div className="border rounded-lg p-4 bg-white">
                {/* Summary Section */}
                {activeSection === 'summary' && openPeriod && (
                    <SummaryTable openPeriod={openPeriod} employeeId={employeeId} />
                )}

                {/* KPI Section - SHARED TABLE */}
                {activeSection === 'kpi' && openPeriod && (
                    <KpiTable openPeriod={openPeriod} employeeId={employeeId} />
                )}

                {/* Work Points Section - SHARED TABLE */}
                {activeSection === 'work' && openPeriod && (
                    <WorkPointsTable openPeriod={openPeriod} employeeId={employeeId} />
                )}

                {/* Training Section - TABLE FORMAT */}
                {activeSection === 'training' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <h4 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-green-600" />
                                Điểm Đào tạo
                            </h4>
                            {/* Coordinator Employee Selector - hidden in review mode */}
                            {isCoordinator && !employeeId && (
                                <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium text-gray-600">Xem nhân viên:</label>
                                    <select
                                        value={selectedEmployeeId}
                                        onChange={e => setSelectedEmployeeId(e.target.value)}
                                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    >
                                        {dtEmployees.map(emp => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.fullName} {emp.id === currentEmployee?.id ? '(Bạn)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                        {/* THỰC TẾ - Actual Training Data */}
                        <div className="space-y-2">
                            <h5 className="font-bold text-sm text-blue-800 bg-blue-50 p-2 rounded">
                                📊 THỰC TẾ
                                <span className="font-normal text-xs text-gray-600 ml-2">
                                    (Tự động lấy từ công việc đã hoàn thành - Phân loại: Nghiệp vụ, Lĩnh vực, Nội bộ)
                                </span>
                            </h5>
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-blue-100">
                                        <tr>
                                            <th className="text-left p-2 font-bold text-blue-800">Phân loại</th>
                                            <th className="text-center p-2 font-bold text-blue-800 w-24">Số buổi</th>
                                            <th className="text-center p-2 font-bold text-blue-800 w-24">Điểm</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-t hover:bg-blue-50">
                                            <td className="p-2">Nghiệp vụ</td>
                                            <td className="p-2 text-center font-medium">{trainingByClassification.nghiepVu.sessions}</td>
                                            <td className="p-2 text-center font-bold text-blue-700">{trainingByClassification.nghiepVu.points.toFixed(1)}</td>
                                        </tr>
                                        <tr className="border-t hover:bg-blue-50">
                                            <td className="p-2">Lĩnh vực</td>
                                            <td className="p-2 text-center font-medium">{trainingByClassification.linhVuc.sessions}</td>
                                            <td className="p-2 text-center font-bold text-blue-700">{trainingByClassification.linhVuc.points.toFixed(1)}</td>
                                        </tr>
                                        <tr className="border-t hover:bg-blue-50">
                                            <td className="p-2">Nội bộ</td>
                                            <td className="p-2 text-center font-medium">{trainingByClassification.noiBo.sessions}</td>
                                            <td className="p-2 text-center font-bold text-blue-700">{trainingByClassification.noiBo.points.toFixed(1)}</td>
                                        </tr>
                                    </tbody>
                                    <tfoot className="bg-blue-200">
                                        <tr className="font-bold">
                                            <td className="p-2">TỔNG</td>
                                            <td className="p-2 text-center">{actualTotal.sessions}</td>
                                            <td className="p-2 text-center text-blue-800">{actualTotal.points.toFixed(1)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        {/* QUY ĐỔI - Conversion Table */}
                        <div className="space-y-2">
                            <h5 className="font-bold text-sm text-orange-800 bg-orange-50 p-2 rounded">
                                🔄 QUY ĐỔI
                                <span className="font-normal text-xs text-gray-600 ml-2">
                                    (Tự động quy đổi: Lĩnh vực/Nội bộ → 210p, Nghiệp vụ → 60p/120p, đảm bảo chênh lệch ≥ 0 và nhỏ nhất)
                                </span>
                            </h5>
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-orange-100">
                                        <tr>
                                            <th className="text-left p-2 font-bold text-orange-800">Chỉ tiêu</th>
                                            <th className="text-center p-2 font-bold text-orange-800 w-32">Điểm TC/CV</th>
                                            <th className="text-center p-2 font-bold text-orange-800 w-24">Số lượng</th>
                                            <th className="text-center p-2 font-bold text-orange-800 w-24">Điểm</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-t hover:bg-orange-50">
                                            <td className="p-2">Đào tạo tập trung: 60p</td>
                                            <td className="p-2 text-center text-gray-600">0.5</td>
                                            <td className="p-2 text-center font-medium">{conversionResult.qty60}</td>
                                            <td className="p-2 text-center font-bold text-orange-700">{(conversionResult.qty60 * 0.5).toFixed(1)}</td>
                                        </tr>
                                        <tr className="border-t hover:bg-orange-50">
                                            <td className="p-2">Đào tạo tập trung: 120p</td>
                                            <td className="p-2 text-center text-gray-600">1.1</td>
                                            <td className="p-2 text-center font-medium">{conversionResult.qty120}</td>
                                            <td className="p-2 text-center font-bold text-orange-700">{(conversionResult.qty120 * 1.1).toFixed(1)}</td>
                                        </tr>
                                        <tr className="border-t hover:bg-orange-50">
                                            <td className="p-2">Đào tạo tập trung: 210p</td>
                                            <td className="p-2 text-center text-gray-600">2.4</td>
                                            <td className="p-2 text-center font-medium">{conversionResult.qty210}</td>
                                            <td className="p-2 text-center font-bold text-orange-700">{(conversionResult.qty210 * 2.4).toFixed(1)}</td>
                                        </tr>
                                    </tbody>
                                    <tfoot>
                                        <tr className="font-bold bg-orange-200">
                                            <td className="p-2" colSpan={2}>TỔNG QUY ĐỔI</td>
                                            <td className="p-2 text-center">{conversionResult.qty60 + conversionResult.qty120 + conversionResult.qty210}</td>
                                            <td className="p-2 text-center text-orange-800">{conversionResult.total.toFixed(1)}</td>
                                        </tr>
                                        <tr className={`font-bold ${conversionResult.difference >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            <td className="p-2" colSpan={3}>CHÊNH LỆCH (Quy đổi - Thực tế)</td>
                                            <td className="p-2 text-center">{conversionResult.difference >= 0 ? '+' : ''}{conversionResult.difference.toFixed(1)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        {/* KHÔNG CẦN QUY ĐỔI - Direct Training */}
                        <div className="space-y-2">
                            <h5 className="font-bold text-sm text-green-800 bg-green-50 p-2 rounded">
                                ✅ KHÔNG CẦN QUY ĐỔI
                                <span className="font-normal text-xs text-gray-600 ml-2">
                                    (Phân loại: Trực tiếp - Tính điểm trực tiếp từ công việc hoàn thành)
                                </span>
                            </h5>
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-green-100">
                                        <tr>
                                            <th className="text-left p-2 font-bold text-green-800">Phân loại</th>
                                            <th className="text-center p-2 font-bold text-green-800 w-24">Số buổi</th>
                                            <th className="text-center p-2 font-bold text-green-800 w-24">Điểm</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-t hover:bg-green-50">
                                            <td className="p-2">Trực tiếp</td>
                                            <td className="p-2 text-center font-medium">{trainingByClassification.trucTiep.sessions}</td>
                                            <td className="p-2 text-center font-bold text-green-700">{trainingByClassification.trucTiep.points.toFixed(1)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Total Summary */}
                        <div className="bg-indigo-100 border border-indigo-300 rounded-lg p-3 flex justify-between items-center">
                            <span className="font-bold text-indigo-800">📋 TỔNG ĐIỂM ĐÀO TẠO (Quy đổi + Trực tiếp)</span>
                            <span className="text-xl font-bold text-indigo-800">{trainingPoints.toFixed(1)} điểm</span>
                        </div>

                        <p className="text-xs text-gray-500">
                            💡 Điểm quy đổi tự động để tổng quy đổi ≥ tổng thực tế với chênh lệch nhỏ nhất. Phân loại Trực tiếp không cần quy đổi.
                        </p>
                    </div>
                )}

                {/* Livechat Section - NEW TWO-TABLE FORMAT */}
                {activeSection === 'livechat' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <h4 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-purple-600" />
                                Điểm Livechat - Đánh giá theo độ khó
                            </h4>
                            {/* Coordinator Employee Selector - hidden in review mode */}
                            {isCoordinator && !employeeId && (
                                <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium text-gray-600">Xem nhân viên:</label>
                                    <select
                                        value={selectedEmployeeId}
                                        onChange={e => setSelectedEmployeeId(e.target.value)}
                                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    >
                                        {dtEmployees.map(emp => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.fullName} {emp.id === currentEmployee?.id ? '(Bạn)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* SECTION 1: TÌNH HÌNH THỰC HIỆN (Editable) */}
                        <div className="space-y-2">
                            <h5 className="font-bold text-sm text-blue-800 bg-blue-50 p-2 rounded flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" />
                                📊 TÌNH HÌNH THỰC HIỆN VÀ ĐIỂM LIVECHAT
                            </h5>
                            <p className="text-xs text-gray-600 italic">
                                Dữ liệu số buổi tính tự động. Vui lòng điền Thực hiện và TC/buổi để tính điểm.
                            </p>

                            <div className="border rounded-lg overflow-hidden">
                                <div className="max-h-64 overflow-y-auto overflow-x-auto">
                                    <table className="w-full text-xs border-collapse min-w-[800px]">
                                        <thead>
                                            <tr className="bg-blue-100">
                                                <th className="border p-2 text-left font-semibold">Công việc</th>
                                                <th className="border p-2 text-center font-semibold">Số buổi</th>
                                                <th className="border p-2 text-center font-semibold">Định mức/buổi</th>
                                                <th className="border p-2 text-center font-semibold">Điểm cố định</th>
                                                <th className="border p-2 text-center font-semibold bg-yellow-100">TC/buổi</th>
                                                <th className="border p-2 text-center font-semibold">Tổng YC</th>
                                                <th className="border p-2 text-center font-semibold bg-yellow-100">Thực hiện</th>
                                                <th className="border p-2 text-center font-semibold">TL Hoàn thành</th>
                                                <th className="border p-2 text-center font-semibold">Điểm KPI</th>
                                                <th className="border p-2 text-center font-semibold bg-blue-200">Tổng điểm</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {livechatDetails.map(row => (
                                                <tr key={row.jobId} className="hover:bg-gray-50">
                                                    <td className="border p-2 font-medium">{row.jobName}</td>
                                                    <td className="border p-2 text-center">{row.totalSessions}</td>
                                                    <td className="border p-2 text-center">{row.standardPointPerSession.toFixed(1)}</td>
                                                    <td className="border p-2 text-center font-medium">{row.fixedPoints.toFixed(1)}</td>
                                                    <td className="border p-1 text-center bg-yellow-50">
                                                        <input
                                                            type="number"
                                                            value={row.standardPerSession}
                                                            onChange={e => setLivechatData(prev => ({
                                                                ...prev,
                                                                [row.jobId]: { ...prev[row.jobId], standardPerSession: parseInt(e.target.value) || 0, actual: prev[row.jobId]?.actual ?? row.actual }
                                                            }))}
                                                            className="w-16 px-1 py-1 border rounded text-center focus:ring-1 focus:ring-blue-500"
                                                            disabled={!isEditable}
                                                        />
                                                    </td>
                                                    <td className="border p-2 text-center bg-gray-50">{row.totalRequests}</td>
                                                    <td className="border p-1 text-center bg-yellow-50">
                                                        <input
                                                            type="number"
                                                            value={row.actual}
                                                            onChange={e => setLivechatData(prev => ({
                                                                ...prev,
                                                                [row.jobId]: { ...prev[row.jobId], actual: parseInt(e.target.value) || 0, standardPerSession: prev[row.jobId]?.standardPerSession ?? row.standardPerSession }
                                                            }))}
                                                            className="w-20 px-1 py-1 border rounded text-center focus:ring-1 focus:ring-blue-500 font-bold text-blue-700"
                                                            disabled={!isEditable}
                                                        />
                                                    </td>
                                                    <td className="border p-2 text-center font-medium">{(row.completionRate * 100).toFixed(1)}%</td>
                                                    <td className="border p-2 text-center text-indigo-700 font-medium">{row.performancePoints.toFixed(1)}</td>
                                                    <td className="border p-2 text-center font-bold text-blue-800 bg-blue-50">{row.totalRecognized.toFixed(1)}</td>
                                                </tr>
                                            ))}
                                            {livechatDetails.length === 0 && (
                                                <tr>
                                                    <td colSpan={10} className="border p-4 text-center text-gray-500">
                                                        Chưa có phân công Livechat trong tháng này
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-blue-100 font-bold border-t-2">
                                                <td className="border p-2 text-right" colSpan={3}>TỔNG CỘNG</td>
                                                <td className="border p-2 text-center">{livechatTotals.fixedPoints.toFixed(1)}</td>
                                                <td className="border p-2"></td>
                                                <td className="border p-2 text-center">{livechatTotals.totalRequests}</td>
                                                <td className="border p-2 text-center">{livechatDetails.reduce((s, r) => s + r.actual, 0)}</td>
                                                <td className="border p-2"></td>
                                                <td className="border p-2 text-center text-indigo-800">{livechatDetails.reduce((s, r) => s + r.performancePoints, 0).toFixed(1)}</td>
                                                <td className="border p-2 text-center bg-blue-200 text-blue-900 text-lg">{totalLivechatPoints.toFixed(1)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                            <p className="text-sm font-bold text-blue-800">
                                Số ngày quy đổi (Định mức 6đ/ngày): {(totalLivechatPoints / 6).toFixed(1)} ngày
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                💡 Công thức = Tổng cộng ở bảng TÌNH HÌNH THỰC HIỆN VÀ ĐIỂM LIVECHAT điểm/6
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Summary - Role-based display */}
            <div className={`rounded-lg p-4 ${isCoordinator ? 'bg-gradient-to-r from-teal-100 to-cyan-100 border-teal-300' : result === 'Vượt mong đợi' ? 'bg-gradient-to-r from-green-100 to-emerald-100 border-green-300' : result === 'Đạt' ? 'bg-gradient-to-r from-blue-100 to-indigo-100 border-blue-300' : 'bg-gradient-to-r from-yellow-100 to-orange-100 border-yellow-300'} border-2`}>
                <h4 className="font-bold text-lg mb-4">📊 Tổng kết</h4>

                {isCoordinator ? (
                    // Coordinator view: Rating statistics with 5 columns
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                        <div className="bg-white/50 p-3 rounded">
                            <div className="text-gray-600 text-xs">Tổng nhân viên</div>
                            <div className="font-bold text-2xl text-teal-700">{ratingStats.total}</div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded border border-gray-200">
                            <div className="text-gray-600 text-xs font-medium">Chưa đánh giá</div>
                            <div className="font-bold text-2xl text-gray-500">{ratingStats.notEvaluated}</div>
                        </div>
                        <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                            <div className="text-yellow-700 text-xs font-medium">Cần cố gắng</div>
                            <div className="font-bold text-2xl text-yellow-700">{ratingStats.needsImprovement}</div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded border border-blue-200">
                            <div className="text-blue-700 text-xs font-medium">Đạt</div>
                            <div className="font-bold text-2xl text-blue-700">{ratingStats.achieved}</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded border border-green-200">
                            <div className="text-green-700 text-xs font-medium">Vượt mong đợi</div>
                            <div className="font-bold text-2xl text-green-700">{ratingStats.exceeded}</div>
                        </div>
                    </div>
                ) : (
                    // Staff view: 3 columns - % KH sử dụng, % CV, % chung (xếp hạng)
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div className="bg-white/50 p-3 rounded">
                            <div className="text-gray-600 text-xs">% Hoàn thành tỷ lệ KH sử dụng</div>
                            <div className="font-bold text-xl text-blue-700">{completionRate.toFixed(1)}%</div>
                        </div>
                        <div className="bg-white/50 p-3 rounded">
                            <div className="text-gray-600 text-xs">% Hoàn thành công việc</div>
                            <div className="font-bold text-xl text-purple-700">{workCompletionRate.toFixed(1)}%</div>
                        </div>
                        <div className="bg-white p-3 rounded border-2">
                            <div className="text-gray-600 text-xs">% Hoàn thành chung</div>
                            <div className={`font-bold text-xl ${result === 'Vượt mong đợi' ? 'text-green-700' : result === 'Đạt' ? 'text-blue-700' : 'text-yellow-700'}`}>
                                {overallRate.toFixed(1)}%
                            </div>
                            <div className={`text-xs font-semibold ${result === 'Vượt mong đợi' ? 'text-green-600' : result === 'Đạt' ? 'text-blue-600' : 'text-yellow-600'}`}>
                                {result}
                            </div>
                        </div>
                    </div>
                )}

                {/* Top Performer - Visible to ALL roles */}
                {topPerformer && (
                    <div className="mt-4 p-3 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center gap-2 text-amber-700 text-sm">
                            <span className="text-lg">🏆</span>
                            <span className="font-medium">Top hoàn thành (đã duyệt):</span>
                            <span className="font-bold">{topPerformer.name}</span>
                            <span className="text-xs bg-amber-200 px-2 py-0.5 rounded">{topPerformer.group}</span>
                            <span className="ml-auto font-bold text-lg text-amber-800">{topPerformer.rate.toFixed(1)}%</span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${topPerformer.result === 'Vượt mong đợi' ? 'bg-green-100 text-green-700' : topPerformer.result === 'Đạt' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {topPerformer.result}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Actions */}
            {isEditable && (
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={() => handleSave(false)}
                        className="btn-secondary flex items-center gap-2"
                        disabled={saveMutation.isPending}
                    >
                        <Save className="w-4 h-4" /> Lưu nháp
                    </button>
                    <button
                        onClick={() => {
                            if (confirm('Bạn có chắc chắn muốn gửi đánh giá? Sau khi gửi sẽ không thể chỉnh sửa.')) {
                                handleSave(true);
                            }
                        }}
                        className="btn-primary flex items-center gap-2"
                        disabled={saveMutation.isPending}
                    >
                        <Save className="w-4 h-4" /> Gửi đánh giá
                    </button>
                </div>
            )}
        </div>
    );
}
