/**
 * useRealtimeQuery - Generic hook for real-time Firestore subscriptions
 * Wraps onSnapshot → TanStack Query cache for seamless integration
 * 
 * v4.0.0: Fully optimized React Query v5 state machine error boundaries (Option A1),
 *         hoisted static query keys, primitive-only deps,
 *         zero-dependency callbacks, and eliminated startup double-read.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { ZodSchema } from 'zod';
import { subscribeToCollectionWithDateRange, COLLECTIONS } from '../services/firestoreService';
import { format, subMonths, addWeeks, startOfMonth, addDays, subDays } from 'date-fns';
import { ScheduleItem, LeaveRequest, DailyAllocation } from '../types';
import { ScheduleItemSchema, LeaveRequestSchema, DailyAllocationSchema } from '../schemas';

// ========== HOISTED STATIC QUERY KEYS (stable references) ==========
export const SCHEDULE_QUERY_KEY = ['schedule'] as const;
export const LEAVES_QUERY_KEY = ['leaves'] as const;
export const ALLOCATIONS_QUERY_KEY = ['allocations'] as const;

interface RealtimeQueryOptions {
    startDate?: string;
    endDate?: string;
}

/**
 * Get default date range: Start of Last Month to +3 Weeks from today
 */
function getDefaultDateRange() {
    const now = new Date();
    return {
        start: format(subDays(startOfMonth(subMonths(now, 1)), 10), 'yyyy-MM-dd'),
        end: format(addDays(addWeeks(now, 3), 10), 'yyyy-MM-dd'),
    };
}

/**
 * Generic realtime subscription hook feeding TanStack Query cache
 */
function useRealtimeSubscription<T>(
    enabled: boolean,
    collectionName: string,
    queryKey: readonly unknown[],
    schema: ZodSchema<T>,
    onSuccess: () => void,
    onError: (err: Error) => void,
    startDate?: string,
    endDate?: string
) {
    const queryClient = useQueryClient();
    const unsubRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (!enabled) {
            unsubRef.current?.();
            unsubRef.current = null;
            return;
        }

        const { start, end } = getDefaultDateRange();
        const finalStart = startDate || start;
        const finalEnd = endDate || end;

        unsubRef.current?.();

        unsubRef.current = subscribeToCollectionWithDateRange<T>(
            collectionName,
            finalStart,
            finalEnd,
            (items) => {
                queryClient.setQueryData(queryKey, items);
                onSuccess(); // Reset error state on a successful snapshot push
            },
            (error) => {
                console.error(`❌ Realtime [${collectionName}]:`, error);
                onError(error as Error); // Propagate error callback reactively
            },
            'date',
            schema
        );

        return () => {
            unsubRef.current?.();
            unsubRef.current = null;
        };
    }, [enabled, collectionName, queryKey, schema, queryClient, onSuccess, onError, startDate, endDate]);
}

// ========== TYPED REALTIME HOOKS ==========

/**
 * Real-time schedule subscription
 */
export const useSchedulesRealtimeQuery = (
    enabled: boolean = true,
    options: RealtimeQueryOptions = {}
) => {
    const queryClient = useQueryClient();
    const [snapshotError, setSnapshotError] = useState<Error | null>(null);

    const handleSuccess = useCallback(() => {
        setSnapshotError(prev => prev !== null ? null : prev);
    }, []);

    const handleError = useCallback((err: Error) => {
        setSnapshotError(err);
    }, []);

    useRealtimeSubscription<ScheduleItem>(
        enabled,
        COLLECTIONS.SCHEDULE,
        SCHEDULE_QUERY_KEY,
        ScheduleItemSchema,
        handleSuccess,
        handleError,
        options.startDate,
        options.endDate
    );

    // Invalidate query when snapshotError transitions to an Error to force throw in queryFn
    useEffect(() => {
        if (snapshotError) {
            queryClient.invalidateQueries({ queryKey: SCHEDULE_QUERY_KEY });
        }
    }, [snapshotError, queryClient]);

    const { data = [], isLoading, isError, error } = useQuery<ScheduleItem[]>({
        queryKey: SCHEDULE_QUERY_KEY,
        queryFn: async () => {
            if (snapshotError) throw snapshotError;
            return [] as ScheduleItem[]; // optimized startup reads: onSnapshot is sole source
        },
        enabled,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
    });

    return { data, isLoading, isError, error };
};

/**
 * Real-time leaves subscription
 */
export const useLeavesRealtimeQuery = (
    enabled: boolean = true,
    options: RealtimeQueryOptions = {}
) => {
    const queryClient = useQueryClient();
    const [snapshotError, setSnapshotError] = useState<Error | null>(null);

    const handleSuccess = useCallback(() => {
        setSnapshotError(prev => prev !== null ? null : prev);
    }, []);

    const handleError = useCallback((err: Error) => {
        setSnapshotError(err);
    }, []);

    useRealtimeSubscription<LeaveRequest>(
        enabled,
        COLLECTIONS.LEAVES,
        LEAVES_QUERY_KEY,
        LeaveRequestSchema,
        handleSuccess,
        handleError,
        options.startDate,
        options.endDate
    );

    useEffect(() => {
        if (snapshotError) {
            queryClient.invalidateQueries({ queryKey: LEAVES_QUERY_KEY });
        }
    }, [snapshotError, queryClient]);

    const { data = [], isLoading, isError, error } = useQuery<LeaveRequest[]>({
        queryKey: LEAVES_QUERY_KEY,
        queryFn: async () => {
            if (snapshotError) throw snapshotError;
            return [] as LeaveRequest[];
        },
        enabled,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
    });

    return { data, isLoading, isError, error };
};

/**
 * Real-time allocations subscription
 */
export const useAllocationsRealtimeQuery = (
    enabled: boolean = true,
    options: RealtimeQueryOptions = {}
) => {
    const queryClient = useQueryClient();
    const [snapshotError, setSnapshotError] = useState<Error | null>(null);

    const handleSuccess = useCallback(() => {
        setSnapshotError(prev => prev !== null ? null : prev);
    }, []);

    const handleError = useCallback((err: Error) => {
        setSnapshotError(err);
    }, []);

    useRealtimeSubscription<DailyAllocation>(
        enabled,
        COLLECTIONS.ALLOCATIONS,
        ALLOCATIONS_QUERY_KEY,
        DailyAllocationSchema,
        handleSuccess,
        handleError,
        options.startDate,
        options.endDate
    );

    useEffect(() => {
        if (snapshotError) {
            queryClient.invalidateQueries({ queryKey: ALLOCATIONS_QUERY_KEY });
        }
    }, [snapshotError, queryClient]);

    const { data = [], isLoading, isError, error } = useQuery<DailyAllocation[]>({
        queryKey: ALLOCATIONS_QUERY_KEY,
        queryFn: async () => {
            if (snapshotError) throw snapshotError;
            return [] as DailyAllocation[];
        },
        enabled,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
    });

    return { data, isLoading, isError, error };
};
