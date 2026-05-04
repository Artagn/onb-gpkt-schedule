import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workPeriodsService } from '../services/firestoreService';
import { WorkPeriod } from '../types';
import toast from 'react-hot-toast';

export const WORK_PERIOD_KEYS = {
    all: ['workPeriods'] as const,
};

export const useWorkPeriodsQuery = () => {
    return useQuery({
        queryKey: WORK_PERIOD_KEYS.all,
        queryFn: async () => {
            return workPeriodsService.load();
        },
        staleTime: Infinity, // Seasonal config - rarely changes, refetch on mutation
        gcTime: Infinity,
    });
};

export const useWorkPeriodMutations = () => {
    const queryClient = useQueryClient();
    const QUERY_KEY = WORK_PERIOD_KEYS.all;

    const save = useMutation({
        mutationFn: (item: WorkPeriod) => workPeriodsService.save(item),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            toast.success('Đã lưu lịch làm việc');
        },
        onError: (err) => {
            console.error(err);
            toast.error('Lỗi khi lưu lịch làm việc');
        }
    });

    const remove = useMutation({
        mutationFn: (id: string) => workPeriodsService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            toast.success('Đã xóa lịch làm việc');
        },
        onError: (err) => {
            console.error(err);
            toast.error('Lỗi khi xóa lịch làm việc');
        }
    });

    return { save, remove };
};
