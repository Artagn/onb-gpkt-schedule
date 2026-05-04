import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subJobsService } from '../services/firestoreService';
import { SubJob } from '../types';
import toast from 'react-hot-toast';

export const SUBJOB_KEYS = {
    all: ['subJobs'] as const,
};

export const useSubJobsQuery = (enabled: boolean = true, options: { staleTime?: number } = {}) => {
    return useQuery({
        queryKey: SUBJOB_KEYS.all,
        queryFn: async () => {
            return await subJobsService.load();
        },
        enabled,
        staleTime: options.staleTime ?? 1000 * 60 * 30,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
    });
};

export const useAddSubJobMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (newSubJob: SubJob) => subJobsService.save(newSubJob),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: SUBJOB_KEYS.all });
            toast.success('Thêm chi tiết công việc thành công!');
        },
        onError: (error) => {
            console.error(error);
            toast.error('Lỗi khi thêm chi tiết công việc.');
        }
    });
};

export const useUpdateSubJobMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (updatedSubJob: SubJob) => subJobsService.save(updatedSubJob),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: SUBJOB_KEYS.all });
            toast.success('Cập nhật chi tiết công việc thành công!');
        },
        onError: (error) => {
            console.error(error);
            toast.error('Lỗi khi cập nhật chi tiết công việc.');
        }
    });
};

export const useDeleteSubJobMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => subJobsService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: SUBJOB_KEYS.all });
            toast.success('Xóa chi tiết công việc thành công!');
        },
        onError: (error) => {
            console.error(error);
            toast.error('Lỗi khi xóa chi tiết công việc.');
        }
    });
};
