/**
 * useCustomerCare.ts - Hook tổng hợp logic cho Customer Care module
 */

// ========== OLD DATA FALLBACK MAP ==========
const OLD_METRIC_KEY_MAP: Record<string, string> = {
    call_count: 'callCount',
    duration: 'totalCallDuration',
    reached: 'reachedCustomers',
    ultraview: 'ultraviewCount',
};

/**
 * Get metric value from a CareReport with automatic fallback for old data format.
 * Old reports stored metrics as direct keys (callCount, totalCallDuration, etc.)
 * while new reports use dynamic metric IDs (call_count, duration, etc.).
 */
export function getMetricValue(dailyMetrics: { [key: string]: number }, metricId: string): number {
    let val = dailyMetrics[metricId];
    if (val === undefined && OLD_METRIC_KEY_MAP[metricId]) {
        val = (dailyMetrics as any)[OLD_METRIC_KEY_MAP[metricId]];
    }
    return val ?? 0;
}

import { useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useCareCampaignsQuery, useCareMetricsQuery } from '../../hooks/useCareQuery';
import { CareCampaign, CareReport, CareMetric } from '../../types';
import { getISOWeekId, getWeekStart, getWeekEnd, getWeekDates } from '../../services/careService';
import { auth } from '../../services/firebaseConfig';

export function useCustomerCare() {
    const { employees } = useData();
    const user = auth.currentUser;
    const { role, isSuperAdmin } = usePermissions(user);
    const { data: campaignsData, isLoading: loadingCampaigns } = useCareCampaignsQuery();
    const campaigns = useMemo(() => campaignsData || [], [campaignsData]);

    const { data: metricsData, isLoading: loadingMetrics } = useCareMetricsQuery();
    const metrics = useMemo(() => metricsData || [], [metricsData]);

    // Current employee
    const currentEmployee = useMemo(() => {
        if (!user?.email) return null;
        return employees.find(e => e.email.toLowerCase() === user.email!.toLowerCase()) || null;
    }, [employees, user]);

    // KS employees (for Coordinator/Admin views)
    const ksEmployees = useMemo(() => {
        return employees.filter(e =>
            (e.evaluationGroup === 'ONB_KS' || e.evaluationGroup === 'KS')
            && e.status !== 'Ngưng hoạt động'
        ).sort((a, b) => a.stt - b.stt);
    }, [employees]);

    // Active campaigns only (sorted by order)
    const activeCampaigns = useMemo(() => {
        return campaigns
            .filter(c => c.isActive)
            .sort((a, b) => a.order - b.order);
    }, [campaigns]);

    // Active metrics only (sorted by order)
    const activeMetrics = useMemo(() => {
        return metrics
            .filter(m => m.isActive)
            .sort((a, b) => a.order - b.order);
    }, [metrics]);

    // Check if current user is KS group
    const isKSEmployee = useMemo(() => {
        return currentEmployee?.evaluationGroup === 'ONB_KS' || currentEmployee?.evaluationGroup === 'KS';
    }, [currentEmployee]);

    // Check if user can manage campaigns (Admin/Coordinator or KS Employee for this tab)
    const canManageCampaigns = role === 'Quản trị' || role === 'Điều phối' || isKSEmployee;

    // Check if user can view all employees' reports
    const canViewAllReports = canManageCampaigns || isSuperAdmin;

    return {
        currentEmployee,
        ksEmployees,
        campaigns,
        activeCampaigns,
        loadingCampaigns,
        metrics,
        activeMetrics,
        loadingMetrics,
        isKSEmployee,
        canManageCampaigns,
        canViewAllReports,
        role,
        user,
    };
}

// ========== AGGREGATION HELPERS ==========

export interface AggregatedMetrics {
    metricTotals: {
        [metricId: string]: number; // Map từ ID chỉ tiêu sang tổng
    };
    campaignTotals: {
        [campaignId: string]: {
            weeklyTarget: number;
            totalCompleted: number;
            progressPercent: number;
        };
    };
}

/**
 * Aggregate multiple care reports into summary metrics
 */
export function aggregateReports(
    reports: CareReport[],
    activeCampaigns: CareCampaign[],
    activeMetrics: CareMetric[]
): AggregatedMetrics {
    const result: AggregatedMetrics = {
        metricTotals: {},
        campaignTotals: {},
    };

    // Init metric totals
    activeMetrics.forEach(m => {
        result.metricTotals[m.id] = 0;
    });

    // Init campaign totals
    activeCampaigns.forEach(c => {
        result.campaignTotals[c.id] = { weeklyTarget: 0, totalCompleted: 0, progressPercent: 0 };
    });

    // Step 1: Group targets by employee → campaign → max target per employee
    // This ensures when viewing "all employees", we SUM each employee's target
    // instead of taking a single max across all reports.
    const targetByEmployee: Record<string, Record<string, number>> = {};

    reports.forEach(report => {
        // Metric totals with fallback for old data
        activeMetrics.forEach(m => {
            result.metricTotals[m.id] += getMetricValue(report.dailyMetrics, m.id);
        });

        // Campaign completed totals
        Object.entries(report.campaignDetails).forEach(([campaignId, detail]) => {
            if (!result.campaignTotals[campaignId]) {
                result.campaignTotals[campaignId] = { weeklyTarget: 0, totalCompleted: 0, progressPercent: 0 };
            }
            result.campaignTotals[campaignId].totalCompleted += detail.dailyCompleted;

            // Track max target per employee per campaign
            if (detail.weeklyTarget && detail.weeklyTarget > 0) {
                if (!targetByEmployee[report.employeeId]) targetByEmployee[report.employeeId] = {};
                const current = targetByEmployee[report.employeeId][campaignId] || 0;
                if (detail.weeklyTarget > current) {
                    targetByEmployee[report.employeeId][campaignId] = detail.weeklyTarget;
                }
            }
        });
    });

    // Step 2: Sum max targets across employees
    Object.values(targetByEmployee).forEach(empTargets => {
        Object.entries(empTargets).forEach(([cid, target]) => {
            if (!result.campaignTotals[cid]) {
                result.campaignTotals[cid] = { weeklyTarget: 0, totalCompleted: 0, progressPercent: 0 };
            }
            result.campaignTotals[cid].weeklyTarget += target;
        });
    });

    // Calculate progress
    Object.keys(result.campaignTotals).forEach(cid => {
        const ct = result.campaignTotals[cid];
        ct.progressPercent = ct.weeklyTarget > 0 ? Math.round((ct.totalCompleted / ct.weeklyTarget) * 100) : 0;
    });

    return result;
}

/**
 * Format minutes to hours:minutes string (e.g. 125 → "2h 05'")
 */
export function formatDuration(minutes: number): string {
    if (minutes <= 0) return "0'";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}'`;
    return `${h}h ${String(m).padStart(2, '0')}'`;
}

/**
 * Get Vietnamese day name
 */
export function getVietnameseDayName(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return dayNames[date.getDay()];
}

/**
 * Format date for display (DD/MM)
 */
export function formatShortDate(dateStr: string): string {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}`;
}

// Re-export utility functions
export { getISOWeekId, getWeekStart, getWeekEnd, getWeekDates };
