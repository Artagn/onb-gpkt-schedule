// src/hooks/useConfigQuery.ts
// Static Config Data Queries - Loaded once per session, no real-time subscriptions
// These collections rarely change (once a year), so we use staleTime: Infinity

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    workPeriodsService,
    holidaysService,
    patternsService
} from '../services/firestoreService';
import { SchedulePattern } from '../types';
import toast from 'react-hot-toast';

// Shared config for static data - "Load Once" pattern
const STATIC_DATA_CONFIG = {
    staleTime: Infinity,       // Never considered stale
    gcTime: Infinity,          // Keep in cache forever during session
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,                  // Only retry once on failure
};

export const CONFIG_KEYS = {
    workPeriods: ['workPeriods'] as const,
    holidays: ['holidays'] as const,
    patterns: ['patterns'] as const,
};

export const PATTERN_KEYS = {
    all: ['patterns'] as const,
};

export const useWorkPeriodsQuery = (enabled: boolean = true, options: { staleTime?: number } = {}) => useQuery({
    queryKey: CONFIG_KEYS.workPeriods,
    queryFn: () => workPeriodsService.load(),
    enabled,
    staleTime: options.staleTime ?? STATIC_DATA_CONFIG.staleTime,
    ...STATIC_DATA_CONFIG
});

export const useHolidaysQuery = (enabled: boolean = true, options: { staleTime?: number } = {}) => useQuery({
    queryKey: CONFIG_KEYS.holidays,
    queryFn: () => holidaysService.load(),
    enabled,
    staleTime: options.staleTime ?? STATIC_DATA_CONFIG.staleTime,
    ...STATIC_DATA_CONFIG
});

export const usePatternsQuery = (enabled: boolean = true, options: { staleTime?: number } = {}) => useQuery({
    queryKey: CONFIG_KEYS.patterns,
    queryFn: () => patternsService.load(),
    enabled,
    staleTime: options.staleTime ?? STATIC_DATA_CONFIG.staleTime,
    ...STATIC_DATA_CONFIG
});

export const usePatternMutations = () => {
    const queryClient = useQueryClient();
    const QUERY_KEY = PATTERN_KEYS.all;

    const add = useMutation({
        mutationFn: (item: SchedulePattern) => patternsService.save(item),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            toast.success('Lưu mẫu lịch thành công!');
        },
        onError: (err) => {
            console.error(err);
            toast.error('Lỗi khi lưu mẫu lịch.');
        }
    });

    const update = useMutation({
        mutationFn: (item: SchedulePattern) => patternsService.save(item),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            toast.success('Cập nhật mẫu lịch thành công!');
        },
        onError: (err) => {
            console.error(err);
            toast.error('Lỗi cập nhật mẫu lịch.');
        }
    });

    const remove = useMutation({
        mutationFn: (id: string) => patternsService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            toast.success('Xóa mẫu lịch thành công');
        },
        onError: (err) => {
            console.error(err);
            toast.error('Lỗi xóa mẫu lịch.');
        }
    });

    // Bulk Delete
    const removeBatch = useMutation({
        mutationFn: (ids: string[]) => Promise.all(ids.map(id => patternsService.delete(id))),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        }
    });

    return { add, update, remove, removeBatch };
};
