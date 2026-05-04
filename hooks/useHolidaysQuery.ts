import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { holidaysService } from '../services/firestoreService';
import { Holiday } from '../types';
import toast from 'react-hot-toast';

export const HOLIDAY_KEYS = {
    all: ['holidays'] as const,
};

export const useHolidaysQuery = () => {
    return useQuery({
        queryKey: HOLIDAY_KEYS.all,
        queryFn: async () => {
            return holidaysService.load();
        },
        staleTime: Infinity, // Annual config - rarely changes, refetch on mutation
        gcTime: Infinity,
    });
};

export const useHolidayMutations = () => {
    const queryClient = useQueryClient();
    const QUERY_KEY = HOLIDAY_KEYS.all;

    const save = useMutation({
        mutationFn: (item: Holiday) => holidaysService.save(item),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            toast.success('Đã lưu ngày lễ');
        },
        onError: (err) => {
            console.error(err);
            toast.error('Lỗi khi lưu ngày lễ');
        }
    });

    const remove = useMutation({
        mutationFn: (id: string) => holidaysService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            toast.success('Đã xóa ngày lễ');
        },
        onError: (err) => {
            console.error(err);
            toast.error('Lỗi khi xóa ngày lễ');
        }
    });

    return { save, remove };
};
