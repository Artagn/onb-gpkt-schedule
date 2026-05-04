import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, subMonths, addWeeks, startOfMonth } from 'date-fns';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { ScheduleItem, WorkPeriod, Holiday } from '../types';
import { workPeriodsService, holidaysService } from '../services/firestoreService';

export const LEAVE_BALANCE_HISTORY_KEYS = {
    byEmployee: (id: string) => ['leave_balance_history', id] as const,
};

interface BalanceWorkItem {
    id: string;
    date: string;
    shift: string;
    jobId: string;
    dayOfWeek: number; // 0=Sun, 6=Sat
    isHoliday: boolean; // True if work date is a holiday
    isWeekend: boolean; // True if work date is T7/CN
}

/**
 * Helper to check if a shift is eligible for balance
 * Returns true if: (1) holiday, OR (2) weekend with shift NOT in standard config
 */
const checkEligibility = (
    dateStr: string,
    shift: string,
    dayOfWeek: number,
    workPeriods: WorkPeriod[],
    holidays: string[]
): { isEligible: boolean; isHoliday: boolean } => {
    // Check holiday first
    if (holidays.includes(dateStr)) {
        return { isEligible: true, isHoliday: true };
    }

    // Not a weekend → not eligible
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        return { isEligible: false, isHoliday: false };
    }

    // Find applicable work period for weekend check
    const applicable = workPeriods.find(
        wp => wp.startDate <= dateStr && wp.endDate >= dateStr
    );

    if (applicable) {
        // Map JS dayOfWeek (0=Sun, 6=Sat) to WorkPeriod days index (0=Mon, 6=Sun)
        const wpDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const dayConfig = applicable.days[wpDayIndex as keyof typeof applicable.days];

        const shiftKey = shift === 'Sáng' ? 'morning'
            : shift === 'Chiều' ? 'afternoon'
                : 'evening';

        // Eligible if standard config does NOT have this shift (overtime work)
        return { isEligible: !dayConfig[shiftKey], isHoliday: false };
    }

    // No WorkPeriod config → Weekend work is eligible by default
    return { isEligible: true, isHoliday: false };
};

/**
 * Fetches all schedule items where employee worked on T7/CN or Holiday
 * and status is 'Completed'. Checks against WorkPeriod and Holiday config.
 * 
 * v3.13.0: Optimized window: Start of Last Month to +3 Weeks from today
 */
export const useLeaveBalanceHistory = (employeeId: string) => {
    const queryClient = useQueryClient();

    return useQuery({
        queryKey: LEAVE_BALANCE_HISTORY_KEYS.byEmployee(employeeId),
        queryFn: async (): Promise<BalanceWorkItem[]> => {
            if (!employeeId) return [];

            // OPTIMIZATION: Reuse TanStack Query cache for config data
            // These are cached with staleTime: Infinity, so we try cache first
            let workPeriods: WorkPeriod[] = queryClient.getQueryData(['workPeriods']) || [];
            let holidays: Holiday[] = queryClient.getQueryData(['holidays']) || [];

            // Fallback: If cache is empty (e.g., first load), fetch directly
            if (workPeriods.length === 0) {
                workPeriods = await queryClient.fetchQuery({
                    queryKey: ['workPeriods'],
                    queryFn: () => workPeriodsService.load(),
                    staleTime: Infinity,
                });
            }
            if (holidays.length === 0) {
                holidays = await queryClient.fetchQuery({
                    queryKey: ['holidays'],
                    queryFn: () => holidaysService.load(),
                    staleTime: Infinity,
                });
            }

            const holidayDates: string[] = holidays.map(h => h.date);

            // Range: Start of Last Month to +3 Weeks from today
            const now = new Date();
            const startDate = format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');
            const endDate = format(addWeeks(now, 3), 'yyyy-MM-dd');

            // Get all completed schedule items for this employee
            const scheduleRef = collection(db, 'schedule');
            const q = query(
                scheduleRef,
                where('status', '==', 'Completed'),
                where('employeeIds', 'array-contains', employeeId),
                where('date', '>=', startDate),
                where('date', '<=', endDate)
            );

            const snapshot = await getDocs(q);
            const items: BalanceWorkItem[] = [];

            snapshot.forEach(doc => {
                const data = doc.data() as ScheduleItem;
                const dateObj = new Date(data.date);
                const dayOfWeek = dateObj.getDay();

                // Skip JOB_NGHI_BU items
                if (data.jobId === 'JOB_NGHI_BU') return;

                const { isEligible, isHoliday } = checkEligibility(
                    data.date, data.shift, dayOfWeek, workPeriods, holidayDates
                );

                // Only add if eligible for balance
                if (isEligible) {
                    items.push({
                        id: doc.id,
                        date: data.date,
                        shift: data.shift,
                        jobId: data.jobId,
                        dayOfWeek,
                        isHoliday,
                        isWeekend: dayOfWeek === 0 || dayOfWeek === 6
                    });
                }
            });

            // Sort by date descending (newest first)
            items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            return items;
        },
        enabled: !!employeeId && employeeId !== 'all',
        staleTime: 1000 * 60 * 5, // 5 minutes cache
        refetchOnWindowFocus: false,
    });
};
