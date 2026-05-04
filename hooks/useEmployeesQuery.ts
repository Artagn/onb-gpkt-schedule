import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesService } from '../services/firestoreService';
import { Employee } from '../types';
import toast from 'react-hot-toast';

export const EMPLOYEE_KEYS = {
    all: ['employees'] as const,
};

export const useEmployeesQuery = (enabled: boolean = true, options: { staleTime?: number } = {}) => {
    return useQuery({
        queryKey: EMPLOYEE_KEYS.all,
        queryFn: () => employeesService.load(),
        enabled,
        staleTime: options.staleTime ?? 1000 * 60 * 10,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
    });
};

export const useAddEmployeeMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (newEmployee: Employee) => employeesService.save(newEmployee),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: EMPLOYEE_KEYS.all });
            toast.success('Thêm nhân viên thành công!');
        },
        onError: (error) => {
            console.error(error);
            toast.error('Lỗi khi thêm nhân viên.');
        }
    });
};

export const useUpdateEmployeeMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (updatedEmployee: Employee) => employeesService.save(updatedEmployee),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: EMPLOYEE_KEYS.all });
            toast.success('Cập nhật nhân viên thành công!');
        },
        onError: (error) => {
            console.error(error);
            toast.error('Lỗi khi cập nhật nhân viên.');
        }
    });
};

export const useDeleteEmployeeMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => employeesService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: EMPLOYEE_KEYS.all });
            toast.success('Xóa nhân viên thành công!');
        },
        onError: (error) => {
            console.error(error);
            toast.error('Lỗi khi xóa nhân viên.');
        }
    });
};
