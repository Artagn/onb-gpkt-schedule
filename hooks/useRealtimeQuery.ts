/**
 * useRealtimeQuery - Generic hook for real-time Firestore subscriptions
 * Wraps onSnapshot → TanStack Query cache for seamless integration
 * 
 * Usage: Components consume data via TanStack Query as before,
 * but data is pushed via onSnapshot instead of pulled via getDocs.
 * 
 * v3.17.1: Fixed reactivity - useQuery subscribes to cache changes,
 * ensuring React re-renders when onSnapshot pushes new data.
 */

import { useEffect, useRef } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { ZodSchema } from 'zod';
import { subscribeToCollectionWithDateRange, COLLECTIONS, scheduleService, leavesService, allocationsService } from '../services/firestoreService';
import { format, subMonths, addWeeks, startOfMonth, addDays, subDays } from 'date-fns';
import { ScheduleItem, LeaveRequest, DailyAllocation } from '../types';
import { ScheduleItemSchema, LeaveRequestSchema, DailyAllocationSchema } from '../schemas';

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
 * Generic realtime subscription hook
 * Sets up onSnapshot listener and feeds data into TanStack Query cache
 */
function useRealtimeSubscription<T>(
    enabled: boolean,
    collectionName: string,
    queryKey: readonly unknown[],
    schema: ZodSchema<T>,
    options: RealtimeQueryOptions = {}
) {
    const queryClient = useQueryClient();
    const unsubRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (!enabled) {
            // Cleanup if disabled
            unsubRef.current?.();
            unsubRef.current = null;
            return;
        }

        const { start, end } = getDefaultDateRange();
        const finalStart = options.startDate || start;
        const finalEnd = options.endDate || end;

        // Unsubscribe from previous listener if date range changed
        unsubRef.current?.();

        unsubRef.current = subscribeToCollectionWithDateRange<T>(
            collectionName,
            finalStart,
            finalEnd,
            (items) => {
                // Push data directly into TanStack Query cache
                // useQuery subscribers will re-render automatically
                queryClient.setQueryData(queryKey, items);
            },
            (error) => {
                console.error(`❌ Realtime [${collectionName}]:`, error);
            },
            'date',
            schema
        );

        return () => {
            unsubRef.current?.();
            unsubRef.current = null;
        };
    }, [enabled, collectionName, options.startDate, options.endDate]);
}

// ========== TYPED REALTIME HOOKS ==========

/**
 * Real-time schedule subscription
 * Data is pushed to ['schedule'] query key via onSnapshot
 * useQuery subscribes to cache changes → React re-renders on update
 */
export const useSchedulesRealtimeQuery = (
    enabled: boolean = true,
    options: RealtimeQueryOptions = {}
) => {
    const queryKey = ['schedule'] as const;

    useRealtimeSubscription<ScheduleItem>(
        enabled,
        COLLECTIONS.SCHEDULE,
        queryKey,
        ScheduleItemSchema,
        options
    );

    // useQuery subscribes to cache → re-renders when setQueryData is called
    const { data = [], isLoading } = useQuery<ScheduleItem[]>({
        queryKey,
        queryFn: async () => {
            // Fallback: load via getDocs if onSnapshot hasn't fired yet
            const { start, end } = getDefaultDateRange();
            return scheduleService.loadWithDateRange(
                options.startDate || start,
                options.endDate || end
            );
        },
        enabled,
        staleTime: Infinity, // onSnapshot manages freshness, no polling needed
        refetchOnWindowFocus: false,
        refetchOnMount: false,
    });

    return { data, isLoading };
};

/**
 * Real-time leaves subscription
 */
export const useLeavesRealtimeQuery = (
    enabled: boolean = true,
    options: RealtimeQueryOptions = {}
) => {
    const queryKey = ['leaves'] as const;

    useRealtimeSubscription<LeaveRequest>(
        enabled,
        COLLECTIONS.LEAVES,
        queryKey,
        LeaveRequestSchema,
        options
    );

    const { data = [], isLoading } = useQuery<LeaveRequest[]>({
        queryKey,
        queryFn: async () => {
            const { start, end } = getDefaultDateRange();
            return leavesService.loadWithDateRange(
                options.startDate || start,
                options.endDate || end
            );
        },
        enabled,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
    });

    return { data, isLoading };
};

/**
 * Real-time allocations subscription
 */
export const useAllocationsRealtimeQuery = (
    enabled: boolean = true,
    options: RealtimeQueryOptions = {}
) => {
    const queryKey = ['allocations'] as const;

    useRealtimeSubscription<DailyAllocation>(
        enabled,
        COLLECTIONS.ALLOCATIONS,
        queryKey,
        DailyAllocationSchema,
        options
    );

    const { data = [], isLoading } = useQuery<DailyAllocation[]>({
        queryKey,
        queryFn: async () => {
            const { start, end } = getDefaultDateRange();
            return allocationsService.loadWithDateRange(
                options.startDate || start,
                options.endDate || end
            );
        },
        enabled,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
    });

    return { data, isLoading };
};
