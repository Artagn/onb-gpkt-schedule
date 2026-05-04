
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leavesService } from '../services/firestoreService';
import { LeaveRequest } from '../types';
import toast from 'react-hot-toast';
import { format, subMonths, addWeeks, startOfMonth } from 'date-fns';

export const LEAVE_KEYS = {
    all: ['leaves'] as const,
    range: (start: string, end: string) => ['leaves', start, end] as const,
};

export const useLeavesQuery = (
    enabled: boolean = true,
    options: { staleTime?: number; startDate?: string; endDate?: string } = {}
) => {
    const { startDate, endDate, staleTime } = options;

    return useQuery({
        queryKey: startDate && endDate ? LEAVE_KEYS.range(startDate, endDate) : LEAVE_KEYS.all,
        queryFn: async () => {
            let finalStart = startDate;
            let finalEnd = endDate;

            if (!finalStart || !finalEnd) {
                const now = new Date();
                finalStart = finalStart || format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');
                finalEnd = finalEnd || format(addWeeks(now, 3), 'yyyy-MM-dd');
            }

            return leavesService.loadWithDateRange(finalStart, finalEnd);
        },
        enabled,
        staleTime: staleTime ?? 1000 * 60 * 5,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: true,
    });
};

export const useLeaveMutations = () => {
    const queryClient = useQueryClient();
    const QUERY_KEY = LEAVE_KEYS.all;

    const add = useMutation({
        mutationFn: (item: LeaveRequest) => leavesService.save(item),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            // Invalidate leave balance if added with Approved status
            if (variables.status === 'Approved') {
                setTimeout(() => {
                    queryClient.invalidateQueries({ queryKey: ['leave_balance'] });
                }, 1500);
            }
            toast.success('Gửi đơn nghỉ thành công!');
        },
        onError: (err) => {
            console.error(err);
            toast.error('Lỗi khi gửi đơn nghỉ.');
        }
    });

    const update = useMutation({
        mutationFn: (item: LeaveRequest) => leavesService.save(item),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            // Invalidate leave balance when leave is approved (triggers Cloud Function update)
            if (variables.status === 'Approved') {
                // Small delay to allow Cloud Function to process
                setTimeout(() => {
                    queryClient.invalidateQueries({ queryKey: ['leave_balance'] });
                }, 1500);
            }
            // Custom messages based on status
            if (variables.status === 'Approved') toast.success('Đã duyệt đơn nghỉ');
            else if (variables.status === 'Rejected') toast.success('Đã từ chối đơn nghỉ');
            else if (variables.status === 'Pending') toast.success('Đã cập nhật trạng thái');
            else toast.success('Cập nhật thành công');
        },
        onError: (err) => {
            console.error(err);
            toast.error('Lỗi cập nhật đơn nghỉ.');
        }
    });

    const remove = useMutation({
        mutationFn: (id: string) => leavesService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            toast.success('Hủy đơn nghỉ thành công');
        },
        onError: (err) => {
            console.error(err);
            toast.error('Lỗi hủy đơn nghỉ.');
        }
    });

    return { add, update, remove };
};
