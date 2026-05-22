/**
 * Customer Care Query Hooks - TanStack Query v5
 * Hooks for care_campaigns and care_reports data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { careCampaignsService, careReportsService, careMetricsService } from '../services/careService';
import { CareCampaign, CareReport, CareMetric } from '../types';

// ========== CARE CAMPAIGNS QUERIES ==========

export function useCareCampaignsQuery() {
    return useQuery({
        queryKey: ['care_campaigns'],
        queryFn: () => careCampaignsService.load(),
        staleTime: Infinity, // Master data, load once per session
    });
}

export function useCareCampaignMutation() {
    const queryClient = useQueryClient();

    const saveMutation = useMutation({
        mutationFn: (campaign: CareCampaign) => careCampaignsService.save(campaign),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['care_campaigns'] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => careCampaignsService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['care_campaigns'] });
        },
    });

    const seedMutation = useMutation({
        mutationFn: () => careCampaignsService.seedDefaults(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['care_campaigns'] });
        },
    });

    return { saveMutation, deleteMutation, seedMutation };
}

// ========== CARE METRICS QUERIES ==========

export function useCareMetricsQuery() {
    return useQuery({
        queryKey: ['care_metrics'],
        queryFn: () => careMetricsService.load(),
        staleTime: Infinity, // Master data, load once per session
    });
}

export function useCareMetricMutation() {
    const queryClient = useQueryClient();

    const saveMutation = useMutation({
        mutationFn: (metric: CareMetric) => careMetricsService.save(metric),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['care_metrics'] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => careMetricsService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['care_metrics'] });
        },
    });

    const seedMutation = useMutation({
        mutationFn: () => careMetricsService.seedDefaults(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['care_metrics'] });
        },
    });

    return { saveMutation, deleteMutation, seedMutation };
}

// ========== CARE REPORTS QUERIES ==========

/**
 * Fetch a single care report for an employee on a specific date
 */
export function useCareReportQuery(employeeId: string, date: string) {
    return useQuery({
        queryKey: ['care_reports', employeeId, date],
        queryFn: () => careReportsService.getByEmployeeAndDate(employeeId, date),
        staleTime: 5 * 60 * 1000, // 5 minutes
        enabled: !!employeeId && !!date,
    });
}

/**
 * Fetch all care reports for an employee in a specific ISO week
 */
export function useCareReportsWeekQuery(employeeId: string, weekId: string) {
    return useQuery({
        queryKey: ['care_reports', 'week', employeeId, weekId],
        queryFn: () => careReportsService.loadByEmployeeAndWeek(employeeId, weekId),
        staleTime: 5 * 60 * 1000,
        enabled: !!employeeId && !!weekId,
    });
}

/**
 * Fetch all care reports for ALL employees in a specific ISO week
 */
export function useCareReportsAllWeekQuery(weekId: string) {
    return useQuery({
        queryKey: ['care_reports', 'week', 'all', weekId],
        queryFn: () => careReportsService.loadByWeek(weekId),
        staleTime: 5 * 60 * 1000,
        enabled: !!weekId,
    });
}

/**
 * Fetch care reports for an employee in a specific month
 */
export function useCareReportsMonthQuery(employeeId: string, year: number, month: number) {
    return useQuery({
        queryKey: ['care_reports', 'month', employeeId, year, month],
        queryFn: () => careReportsService.loadByEmployeeAndMonth(employeeId, year, month),
        staleTime: 10 * 60 * 1000, // 10 minutes
        enabled: !!employeeId && !!year && !!month,
    });
}

/**
 * Fetch care reports for ALL employees in a specific month
 */
export function useCareReportsAllMonthQuery(year: number, month: number) {
    return useQuery({
        queryKey: ['care_reports', 'month', 'all', year, month],
        queryFn: () => careReportsService.loadByMonth(year, month),
        staleTime: 10 * 60 * 1000,
        enabled: !!year && !!month,
    });
}

/**
 * Mutation to save a care report
 */
export function useCareReportMutation() {
    const queryClient = useQueryClient();

    const saveMutation = useMutation({
        mutationFn: (report: CareReport) => careReportsService.save(report),
        onSuccess: (_, report) => {
            // Invalidate specific date query
            queryClient.invalidateQueries({ queryKey: ['care_reports', report.employeeId, report.date] });
            // Invalidate weekly queries
            queryClient.invalidateQueries({ queryKey: ['care_reports', 'week', report.employeeId, report.weekId] });
            queryClient.invalidateQueries({ queryKey: ['care_reports', 'week', 'all', report.weekId] });
            // Invalidate monthly queries
            const [year, month] = report.date.split('-');
            queryClient.invalidateQueries({ queryKey: ['care_reports', 'month', report.employeeId, parseInt(year), parseInt(month)] });
            queryClient.invalidateQueries({ queryKey: ['care_reports', 'month', 'all', parseInt(year), parseInt(month)] });
        },
    });

    return { saveMutation };
}
