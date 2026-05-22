import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobGroupsService } from '../services/firestoreService';
import { JobGroupDef } from '../types';
import toast from 'react-hot-toast';

export const JOB_GROUP_KEYS = {
    all: ['jobGroups'] as const,
};

// Default job groups matching the old JobGroup enum — used as fallback when Firestore collection doesn't exist
const DEFAULT_JOB_GROUPS: JobGroupDef[] = [
    { id: 'dao-tao', name: 'Đào tạo', colorClass: 'bg-green-100 text-green-800', isActive: true, order: 1 },
    { id: 'livechat', name: 'Livechat', colorClass: 'bg-purple-100 text-purple-800', isActive: true, order: 2 },
    { id: 'chia-hang-ngay', name: 'Chia hàng ngày', colorClass: 'bg-blue-100 text-blue-800', isActive: true, order: 3 },
    { id: 'cham-soc-kh', name: 'Chăm sóc KH', colorClass: 'bg-yellow-100 text-yellow-800', isActive: true, order: 4 },
    { id: 'khac', name: 'Khác', colorClass: 'bg-gray-100 text-gray-800', isActive: true, order: 99 },
];

export const useJobGroupsQuery = (enabled: boolean = true, options: { staleTime?: number } = {}) => {
    return useQuery({
        queryKey: JOB_GROUP_KEYS.all,
        queryFn: async () => {
            const result = await jobGroupsService.load();
            // If Firestore collection is empty or doesn't exist, return defaults
            return result.length > 0 ? result : DEFAULT_JOB_GROUPS;
        },
        enabled,
        staleTime: options.staleTime ?? 1000 * 60 * 30, // 30 mins
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        retry: false, // Don't retry on permission errors
    });
};

export const useAddJobGroupMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (newGroup: JobGroupDef) => jobGroupsService.save(newGroup),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: JOB_GROUP_KEYS.all });
            toast.success('Thêm nhóm công việc thành công!');
        },
        onError: (error) => {
            console.error(error);
            toast.error('Lỗi khi thêm nhóm công việc.');
        }
    });
};

export const useUpdateJobGroupMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (updatedGroup: JobGroupDef) => jobGroupsService.save(updatedGroup),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: JOB_GROUP_KEYS.all });
            toast.success('Cập nhật nhóm công việc thành công!');
        },
        onError: (error) => {
            console.error(error);
            toast.error('Lỗi khi cập nhật nhóm công việc.');
        }
    });
};

export const useDeleteJobGroupMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => jobGroupsService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: JOB_GROUP_KEYS.all });
            toast.success('Xóa nhóm công việc thành công!');
        },
        onError: (error) => {
            console.error(error);
            toast.error('Lỗi khi xóa nhóm công việc.');
        }
    });
};
