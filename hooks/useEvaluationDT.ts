/**
 * useEvaluationDT - Custom hook for DT Evaluation calculations
 * Extracts heavy calculation logic from EmployeeFormDT component
 */

import { useMemo } from 'react';
import { startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { Employee, Job,  ScheduleItem, EvaluationPeriod, EvaluationMetric, EmployeeEvaluation } from '../types';

// ========== TYPES ==========

export interface TrainingByClassification {
    nghiepVu: { sessions: number; points: number };
    linhVuc: { sessions: number; points: number };
    noiBo: { sessions: number; points: number };
    trucTiep: { sessions: number; points: number };
}

export interface ConversionResult {
    qty60: number;
    qty120: number;
    qty210: number;
    total: number;
    difference: number;
}

export interface LivechatJobRow {
    jobId: string;
    jobName: string;
    totalSessions: number;
    fixedPoints: number;
    offHoursSessions: number;
    sessionsForCalc: number;
    standardPerSession: number;
    planned: number;
    actual: number;
    completionRate: number;
    performancePoints: number;
    totalPoints: number;
}

export interface RatingStats {
    total: number;
    notEvaluated: number;
    needsImprovement: number;
    achieved: number;
    exceeded: number;
}

// ========== CONVERSION ALGORITHM (OPTIMIZED GREEDY) ==========

const CONVERSION_RATES = { '60p': 0.5, '120p': 1.1, '210p': 2.4 };

/**
 * Greedy algorithm for training points conversion
 * O(n) complexity - much faster than O(n²) brute force
 */
export function convertTrainingPoints(targetPoints: number): ConversionResult {
    if (targetPoints === 0) return { qty60: 0, qty120: 0, qty210: 0, total: 0, difference: 0 };

    const rate210 = CONVERSION_RATES['210p'];
    const rate120 = CONVERSION_RATES['120p'];
    const rate60 = CONVERSION_RATES['60p'];

    // Greedy: use as many 210p as possible without exceeding
    let n210 = Math.floor(targetPoints / rate210);
    let remaining = targetPoints - (n210 * rate210);

    // Use 120p for remaining
    let n120 = Math.floor(remaining / rate120);
    remaining = remaining - (n120 * rate120);

    // Use 60p for final remaining
    let n60 = Math.ceil(remaining / rate60);

    // Calculate total
    let total = n210 * rate210 + n120 * rate120 + n60 * rate60;

    // If total < target (shouldn't happen but fallback), add one 60p
    if (total < targetPoints) {
        n60++;
        total = n210 * rate210 + n120 * rate120 + n60 * rate60;
    }

    return {
        qty60: n60,
        qty120: n120,
        qty210: n210,
        total,
        difference: total - targetPoints,
    };
}

// ========== CUSTOM HOOK ==========

interface UseEvaluationDTProps {
    targetEmployee: Employee | undefined;
    openPeriod: EvaluationPeriod | undefined;
    schedule: ScheduleItem[];
    jobs: Job[];
    metrics: EvaluationMetric[];
    metricData: { [id: string]: number };
    livechatInput: { [jobId: string]: { standardPerSession: number; actual: number } };
    allEvaluations: EmployeeEvaluation[];
    employees: Employee[];
    dtEmployees: Employee[];
    isCoordinator: boolean;
}

export function useEvaluationDT({
    targetEmployee,
    openPeriod,
    schedule,
    jobs,
    metrics,
    metricData,
    livechatInput,
    allEvaluations,
    employees,
    dtEmployees,
    isCoordinator,
}: UseEvaluationDTProps) {
    // ========== LIVECHAT JOBS ==========
    const livechatJobs = useMemo(() => {
        return jobs.filter(j => j.group === 'Livechat' && j.isActive);
    }, [jobs]);

    // ========== TRAINING BY CLASSIFICATION ==========
    const trainingByClassification = useMemo((): TrainingByClassification => {
        if (!openPeriod || !targetEmployee) {
            return {
                nghiepVu: { sessions: 0, points: 0 },
                linhVuc: { sessions: 0, points: 0 },
                noiBo: { sessions: 0, points: 0 },
                trucTiep: { sessions: 0, points: 0 },
            };
        }

        const periodStart = startOfMonth(new Date(openPeriod.year, openPeriod.month - 1));
        const periodEnd = endOfMonth(periodStart);

        const myScheduleItems = schedule.filter(s => {
            const scheduleDate = parseISO(s.date);
            return s.employeeIds?.includes(targetEmployee.id) &&
                isWithinInterval(scheduleDate, { start: periodStart, end: periodEnd }) &&
                (s.status === 'Completed' || s.status === 'Approved');
        });

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

    // ========== ACTUAL TOTAL (needs conversion) ==========
    const actualTotal = useMemo(() => ({
        sessions: trainingByClassification.nghiepVu.sessions +
            trainingByClassification.linhVuc.sessions +
            trainingByClassification.noiBo.sessions,
        points: trainingByClassification.nghiepVu.points +
            trainingByClassification.linhVuc.points +
            trainingByClassification.noiBo.points,
    }), [trainingByClassification]);

    // ========== CONVERSION RESULT (Optimized Greedy) ==========
    const conversionResult = useMemo(() => {
        return convertTrainingPoints(actualTotal.points);
    }, [actualTotal.points]);

    // ========== TRAINING POINTS ==========
    const trainingPoints = useMemo(() => {
        return conversionResult.total + trainingByClassification.trucTiep.points;
    }, [conversionResult, trainingByClassification]);

    // ========== LIVECHAT DETAILS ==========
    const livechatDetails = useMemo((): LivechatJobRow[] => {
        if (!openPeriod || !targetEmployee) return [];

        const periodStart = startOfMonth(new Date(openPeriod.year, openPeriod.month - 1));
        const periodEnd = endOfMonth(periodStart);

        const myScheduleItems = schedule.filter(s => {
            const scheduleDate = parseISO(s.date);
            return s.employeeIds?.includes(targetEmployee.id) &&
                isWithinInterval(scheduleDate, { start: periodStart, end: periodEnd });
        });

        const jobStats: { [jobId: string]: { total: number; completed: number; offHours: number; points: number } } = {};
        livechatJobs.forEach(j => {
            jobStats[j.id] = { total: 0, completed: 0, offHours: 0, points: 0 };
        });

        myScheduleItems.forEach(item => {
            const job = jobs.find(j => j.id === item.jobId);
            if (job?.group !== 'Livechat') return;

            if (!jobStats[job.id]) return;
            jobStats[job.id].total++;

            if (item.status === 'Completed' || item.status === 'Approved') {
                jobStats[job.id].completed++;
                const coefficient = item.coefficient || 1;
                jobStats[job.id].points += (job.standardPoint || 0) * coefficient;
            }

            if (item.shift === 'Tối') {
                jobStats[job.id].offHours++;
            }
        });

        return livechatJobs.map(job => {
            const stats = jobStats[job.id] || { total: 0, completed: 0, offHours: 0, points: 0 };
            const input = livechatInput[job.id] || { standardPerSession: 35, actual: 0 };

            const sessionsForCalc = stats.total - stats.offHours;
            const planned = input.standardPerSession * sessionsForCalc;
            const completionRate = planned > 0 ? (input.actual / planned) : 0;

            const basePointsForCalc = (job.standardPoint || 0) * sessionsForCalc;
            const performancePoints = completionRate * basePointsForCalc;
            const totalPoints = performancePoints + stats.points;

            return {
                jobId: job.id,
                jobName: job.name,
                totalSessions: stats.total,
                fixedPoints: stats.points,
                offHoursSessions: stats.offHours,
                sessionsForCalc,
                standardPerSession: input.standardPerSession,
                planned,
                actual: input.actual,
                completionRate,
                performancePoints,
                totalPoints,
            };
        });
    }, [openPeriod, targetEmployee, schedule, jobs, livechatJobs, livechatInput]);

    // ========== TOTAL LIVECHAT POINTS ==========
    const totalLivechatPoints = useMemo(() => {
        return livechatDetails.reduce((sum, row) => sum + row.totalPoints, 0);
    }, [livechatDetails]);

    // ========== WORK METRICS ==========
    const workMetrics = useMemo(() =>
        metrics.filter(m => m.category === 'work' || m.category === 'crm_card'),
        [metrics]
    );

    const violationMetrics = useMemo(() =>
        metrics.filter(m => m.category === 'violation'),
        [metrics]
    );

    const getPointsForMetric = (m: EvaluationMetric): number => {
        return openPeriod?.metricOverrides?.[m.id] ?? m.defaultPoints;
    };

    const manualWorkPoints = useMemo(() => {
        return [...workMetrics, ...violationMetrics].reduce((sum, m) => {
            const qty = metricData[m.id] || 0;
            return sum + (qty * getPointsForMetric(m));
        }, 0);
    }, [workMetrics, violationMetrics, metricData, openPeriod]);

    // ========== TOTAL WORK POINTS ==========
    const totalWorkPoints = useMemo(() => {
        return trainingPoints + totalLivechatPoints + manualWorkPoints;
    }, [trainingPoints, totalLivechatPoints, manualWorkPoints]);

    // ========== RATING STATS (Coordinator only) ==========
    const ratingStats = useMemo((): RatingStats => {
        if (!isCoordinator) return { total: 0, notEvaluated: 0, needsImprovement: 0, achieved: 0, exceeded: 0 };

        const excellent = openPeriod?.ratingThresholds?.excellent || 105;
        const good = openPeriod?.ratingThresholds?.good || 100;

        const dtEvaluations = allEvaluations.filter(evaluation => {
            const emp = employees.find(e => e.id === evaluation.employeeId);
            return emp?.evaluationGroup === 'ONB_DT';
        });

        const evaluatedIds = new Set(dtEvaluations.map(e => e.employeeId));

        let notEvaluated = 0;
        let needsImprovement = 0;
        let achieved = 0;
        let exceeded = 0;

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
    }, [isCoordinator, allEvaluations, employees, dtEmployees, openPeriod]);

    return {
        // Training
        trainingByClassification,
        actualTotal,
        conversionResult,
        trainingPoints,
        // Livechat
        livechatJobs,
        livechatDetails,
        totalLivechatPoints,
        // Work
        workMetrics,
        violationMetrics,
        getPointsForMetric,
        manualWorkPoints,
        totalWorkPoints,
        // Stats
        ratingStats,
    };
}
