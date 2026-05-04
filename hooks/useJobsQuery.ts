import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsService } from '../services/firestoreService';
import { Job } from '../types';
import toast from 'react-hot-toast';

export const JOB_KEYS = {
    all: ['jobs'] as const,
};

export const useJobsQuery = (enabled: boolean = true, options: { staleTime?: number } = {}) => {
    return useQuery({
        queryKey: JOB_KEYS.all,
        queryFn: () => jobsService.load(),
        enabled,
        staleTime: options.staleTime ?? 1000 * 60 * 30,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
    });
};

export const useAddJobMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (newJob: Job) => jobsService.save(newJob),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: JOB_KEYS.all });
            toast.success('Thêm công việc thành công!');
        },
        onError: (error) => {
            console.error(error);
            toast.error('Lỗi khi thêm công việc.');
        }
    });
};

export const useUpdateJobMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (updatedJob: Job) => jobsService.save(updatedJob),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: JOB_KEYS.all });
            toast.success('Cập nhật công việc thành công!');
        },
        onError: (error) => {
            console.error(error);
            toast.error('Lỗi khi cập nhật công việc.');
        }
    });
};

export const useDeleteJobMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => jobsService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: JOB_KEYS.all });
            toast.success('Xóa công việc thành công!');
        },
        onError: (error) => {
            console.error(error);
            toast.error('Lỗi khi xóa công việc.');
        }
    });
};
