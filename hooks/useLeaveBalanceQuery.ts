import { useQuery } from '@tanstack/react-query';
import { leaveBalanceService } from '../services/firestoreService';

export const LEAVE_BALANCE_KEYS = {
    byEmployee: (id: string) => ['leave_balance', id] as const,
};

export const useLeaveBalanceQuery = (employeeId: string) => {
    return useQuery({
        queryKey: LEAVE_BALANCE_KEYS.byEmployee(employeeId),
        queryFn: () => leaveBalanceService.load(employeeId),
        enabled: !!employeeId && employeeId !== 'all',
        staleTime: 1000 * 60 * 5, // 5 minutes cache
    });
};
