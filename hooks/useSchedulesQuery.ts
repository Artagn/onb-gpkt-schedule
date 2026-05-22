import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scheduleService } from '../services/firestoreService';
import { ScheduleItem } from '../types';
import toast from 'react-hot-toast';
import { format, subMonths, addWeeks, startOfMonth, addDays, subDays } from 'date-fns';

export const SCHEDULE_KEYS = {
    all: ['schedule'] as const,
    range: (start: string, end: string) => ['schedule', start, end] as const,
};

export const useSchedulesQuery = (
    enabled: boolean = true,
    options: { staleTime?: number; startDate?: string; endDate?: string } = {}
) => {
    const { startDate, endDate, staleTime } = options;

    return useQuery({
        queryKey: startDate && endDate ? SCHEDULE_KEYS.range(startDate, endDate) : SCHEDULE_KEYS.all,
        queryFn: async () => {
            // Use provided range or default to: Start of Last Month to +3 Weeks from today
            let finalStart = startDate;
            let finalEnd = endDate;

            if (!finalStart || !finalEnd) {
                const now = new Date();
                finalStart = finalStart || format(subDays(startOfMonth(subMonths(now, 1)), 10), 'yyyy-MM-dd');
                finalEnd = finalEnd || format(addDays(addWeeks(now, 3), 10), 'yyyy-MM-dd');
            }

            return scheduleService.loadWithDateRange(finalStart, finalEnd);
        },
        enabled,
        staleTime: staleTime ?? 1000 * 60 * 5,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: true,
    });
};

// ... imports

export const useScheduleMutations = () => {
    const queryClient = useQueryClient();
    const QUERY_KEY = SCHEDULE_KEYS.all;

    // 1. Optimistic UPDATE
    const update = useMutation({
        mutationFn: (item: ScheduleItem) => scheduleService.save(item),
        onMutate: async (newSchedule) => {
            // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
            await queryClient.cancelQueries({ queryKey: QUERY_KEY });

            // Snapshot the previous value
            const previousSchedules = queryClient.getQueryData<ScheduleItem[]>(QUERY_KEY);

            // Optimistically update to the new value
            queryClient.setQueryData<ScheduleItem[]>(QUERY_KEY, (old = []) => {
                return old.map((s) => (s.id === newSchedule.id ? { ...s, ...newSchedule } : s));
            });

            // Return a context object with the snapshotted value
            return { previousSchedules };
        },
        onError: (err, newSchedule, context) => {
            if (context?.previousSchedules) {
                queryClient.setQueryData(QUERY_KEY, context.previousSchedules);
            }
            console.error("Optimistic Update Failed:", err);
            toast.error('Lỗi cập nhật lịch. Đã hoàn tác.');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        },
    });

    // 2. Optimistic DELETE
    const remove = useMutation({
        mutationFn: (id: string) => scheduleService.delete(id),
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: QUERY_KEY });
            const previousSchedules = queryClient.getQueryData<ScheduleItem[]>(QUERY_KEY);

            queryClient.setQueryData<ScheduleItem[]>(QUERY_KEY, (old = []) => {
                return old.filter((s) => s.id !== id);
            });

            return { previousSchedules };
        },
        onError: (err, id, context) => {
            if (context?.previousSchedules) {
                queryClient.setQueryData(QUERY_KEY, context.previousSchedules);
            }
            toast.error('Lỗi xóa lịch. Đã hoàn tác.');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        },
    });

    // 3. Regular ADD (Optimistic Add is complex without real ID)
    const add = useMutation({
        mutationFn: (item: ScheduleItem) => scheduleService.save(item),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            toast.success('Thêm lịch thành công!');
        },
        onError: (error) => {
            console.error(error);
            toast.error('Lỗi khi thêm lịch.');
        }
    });

    return { add, update, remove };
};
