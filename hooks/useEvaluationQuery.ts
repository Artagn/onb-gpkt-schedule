import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { evaluationMetricsService, evaluationPeriodsService, evaluationsService } from '../services/evaluationService';
import { EvaluationMetric, EvaluationPeriod, EmployeeEvaluation } from '../types';

// ========== EVALUATION METRICS QUERIES ==========

export function useEvaluationMetricsQuery() {
    return useQuery({
        queryKey: ['evaluation_metrics'],
        queryFn: () => evaluationMetricsService.load(),
        staleTime: 30 * 60 * 1000, // 30 minutes
    });
}

export function useEvaluationMetricMutation() {
    const queryClient = useQueryClient();

    const saveMutation = useMutation({
        mutationFn: (metric: EvaluationMetric) => evaluationMetricsService.save(metric),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['evaluation_metrics'] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => evaluationMetricsService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['evaluation_metrics'] });
        },
    });

    const seedMutation = useMutation({
        mutationFn: () => evaluationMetricsService.seedDefaults(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['evaluation_metrics'] });
        },
    });

    return { saveMutation, deleteMutation, seedMutation };
}

// ========== EVALUATION PERIODS QUERIES ==========

export function useEvaluationPeriodsQuery() {
    return useQuery({
        queryKey: ['evaluation_periods'],
        queryFn: () => evaluationPeriodsService.load(),
        staleTime: 60 * 60 * 1000, // 1 hour - period definitions rarely change
    });
}

export function useOpenPeriodQuery() {
    return useQuery({
        queryKey: ['evaluation_periods', 'open'],
        queryFn: () => evaluationPeriodsService.getOpenPeriod(),
        staleTime: 30 * 60 * 1000, // 30 minutes - period status rarely changes mid-session
        refetchOnWindowFocus: false,
        refetchOnMount: false,
    });
}

export function useEvaluationPeriodMutation() {
    const queryClient = useQueryClient();

    const saveMutation = useMutation({
        mutationFn: (period: EvaluationPeriod) => evaluationPeriodsService.save(period),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['evaluation_periods'] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => evaluationPeriodsService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['evaluation_periods'] });
        },
    });

    const createMutation = useMutation({
        mutationFn: ({ month, year, createdBy }: { month: number; year: number; createdBy: string }) =>
            evaluationPeriodsService.createPeriod(month, year, createdBy),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['evaluation_periods'] });
        },
    });

    return { saveMutation, deleteMutation, createMutation };
}

// ========== EMPLOYEE EVALUATIONS QUERIES ==========

export function useEvaluationsQuery(periodId?: string) {
    return useQuery({
        queryKey: ['evaluations', periodId],
        queryFn: () => periodId ? evaluationsService.loadByPeriod(periodId) : Promise.resolve([]), // REMOVED load all to save reads
        staleTime: 15 * 60 * 1000,
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        enabled: !!periodId, // Only enabled if periodId is provided
    });
}

/**
 * NEW: Fetch evaluations for multiple specific periods
 * Used in multi-month reports to avoid loading ALL evaluations
 */
export function useEvaluationsByPeriodsQuery(periodIds: string[]) {
    return useQuery({
        queryKey: ['evaluations', 'multi', periodIds.sort().join(',')],
        queryFn: async () => {
            if (periodIds.length === 0) return [];
            const results = await Promise.all(
                periodIds.map(pid => evaluationsService.loadByPeriod(pid))
            );
            return results.flat();
        },
        staleTime: 15 * 60 * 1000,
        refetchOnWindowFocus: false,
        enabled: periodIds.length > 0,
    });
}

export function useEmployeeEvaluationQuery(employeeId: string, periodId: string) {
    return useQuery({
        queryKey: ['evaluations', periodId, employeeId],
        queryFn: () => evaluationsService.getByEmployeeAndPeriod(employeeId, periodId),
        staleTime: 15 * 60 * 1000, // 15 minutes - mutations trigger invalidation
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        enabled: !!employeeId && !!periodId,
    });
}

export function useEvaluationMutation() {
    const queryClient = useQueryClient();

    const saveMutation = useMutation({
        mutationFn: (evaluation: EmployeeEvaluation) => evaluationsService.save(evaluation),
        onSuccess: (_, evaluation) => {
            // Precise invalidation: only the affected period list + individual entry
            queryClient.invalidateQueries({ queryKey: ['evaluations', evaluation.periodId] });
            queryClient.invalidateQueries({ queryKey: ['evaluations', evaluation.periodId, evaluation.employeeId] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: ({ id, periodId }: { id: string; periodId?: string }) => evaluationsService.delete(id),
        onSuccess: (_, { periodId }) => {
            // Invalidate specific period if known, otherwise all evaluations
            if (periodId) {
                queryClient.invalidateQueries({ queryKey: ['evaluations', periodId] });
            } else {
                queryClient.invalidateQueries({ queryKey: ['evaluations'] });
            }
        },
    });

    return { saveMutation, deleteMutation };
}
