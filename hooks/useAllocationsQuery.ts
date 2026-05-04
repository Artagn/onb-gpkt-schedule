
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { allocationsService } from '../services/firestoreService';
import { DailyAllocation } from '../types';
import toast from 'react-hot-toast';
import { format, subMonths, addWeeks, startOfMonth } from 'date-fns';

export const ALLOCATION_KEYS = {
    all: ['allocations'] as const,
    range: (start: string, end: string) => ['allocations', start, end] as const,
};

export const useAllocationsQuery = (
    enabled: boolean = true,
    options: { staleTime?: number; startDate?: string; endDate?: string } = {}
) => {
    const { startDate, endDate, staleTime } = options;

    return useQuery({
        queryKey: startDate && endDate ? ALLOCATION_KEYS.range(startDate, endDate) : ALLOCATION_KEYS.all,
        queryFn: async () => {
            let finalStart = startDate;
            let finalEnd = endDate;

            if (!finalStart || !finalEnd) {
                const now = new Date();
                finalStart = finalStart || format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');
                finalEnd = finalEnd || format(addWeeks(now, 3), 'yyyy-MM-dd');
            }

            return allocationsService.loadWithDateRange(finalStart, finalEnd);
        },
        enabled,
        staleTime: staleTime ?? 1000 * 60 * 5,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: true,
    });
};

export const useAllocationMutations = () => {
    const queryClient = useQueryClient();
    const QUERY_KEY = ALLOCATION_KEYS.all;

    const add = useMutation({
        mutationFn: (item: DailyAllocation) => allocationsService.save(item),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            toast.success('Đã lưu phân bổ!');
        },
        onError: (err) => {
            console.error(err);
            toast.error('Lỗi khi lưu phân bổ.');
        }
    });

    const update = useMutation({
        mutationFn: (item: DailyAllocation) => allocationsService.save(item),
        onSuccess: () => {
            // Invalidate immediately
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        },
        onError: (err) => {
            console.error(err);
            toast.error('Lỗi cập nhật tiến độ.');
        }
    });

    const remove = useMutation({
        mutationFn: (id: string) => allocationsService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            toast.success('Xóa phân bổ thành công');
        },
        onError: (err) => {
            console.error(err);
            toast.error('Lỗi xóa phân bổ.');
        }
    });

    return { add, update, remove };
};
