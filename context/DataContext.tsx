import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    Employee, Job, SubJob, ScheduleItem, SchedulePattern, WorkPeriod,
    Holiday, DailyAllocation, LeaveRequest, Role, JobGroupDef
} from '../types';
import { auth } from '../services/firebaseConfig';
import { useEmployeesQuery } from '../hooks/useEmployeesQuery';
import { useJobsQuery } from '../hooks/useJobsQuery';
import { useJobGroupsQuery } from '../hooks/useJobGroupsQuery';
import { useSubJobsQuery } from '../hooks/useSubJobsQuery';
import { useWorkPeriodsQuery, useHolidaysQuery, usePatternsQuery } from '../hooks/useConfigQuery';
import { useSchedulesRealtimeQuery, useLeavesRealtimeQuery, useAllocationsRealtimeQuery } from '../hooks/useRealtimeQuery';

interface DataContextType {
    // Master Data (Read-only from TanStack Query - use mutations to modify)
    jobGroups: JobGroupDef[];
    employees: Employee[];
    setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>; // no-op for compatibility
    jobs: Job[];
    subJobs: SubJob[];
    schedule: ScheduleItem[];
    // Legacy setSchedule for compatibility (no-op, components should invalidate queries after saving)
    setSchedule: React.Dispatch<React.SetStateAction<ScheduleItem[]>>;

    // Transactional Data (now also via TanStack Query - no more real-time subscriptions)
    leaves: LeaveRequest[];
    setLeaves: React.Dispatch<React.SetStateAction<LeaveRequest[]>>; // no-op for compatibility
    dailyAllocations: DailyAllocation[];
    setAllocations: React.Dispatch<React.SetStateAction<DailyAllocation[]>>; // no-op for compatibility

    // Config Data (Static - loaded once via TanStack Query, no real-time subscriptions)
    workPeriods: WorkPeriod[];
    setWorkPeriods: React.Dispatch<React.SetStateAction<WorkPeriod[]>>; // no-op for compatibility
    holidays: Holiday[];
    setHolidays: React.Dispatch<React.SetStateAction<Holiday[]>>; // no-op for compatibility
    patterns: SchedulePattern[];
    setPatterns: React.Dispatch<React.SetStateAction<SchedulePattern[]>>; // no-op for compatibility

    // Status
    dataLoaded: boolean;
    lastSynced: Date | null;
    isOnline: boolean;

    // View Mode
    viewRole: Role | null;
    setViewRole: (role: Role | null) => void;

    // Actions
    reloadData: () => Promise<void>;
    resetData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Auth State Tracking
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // 1. TanStack Query - ONLY run when authenticated
    // v3.15.0: Highly optimized staleTime for master data (Infinity - only reload on mutation or restart)
    const { data: jobGroups = [], isLoading: loadingJobGroups } = useJobGroupsQuery(isAuthenticated, { staleTime: Infinity });
    const { data: employees = [], isLoading: loadingEmployees } = useEmployeesQuery(isAuthenticated, { staleTime: Infinity });
    const { data: jobs = [], isLoading: loadingJobs } = useJobsQuery(isAuthenticated, { staleTime: Infinity });
    const { data: subJobs = [], isLoading: loadingSubJobs } = useSubJobsQuery(isAuthenticated, { staleTime: Infinity });

    // v3.16.0: Real-time subscriptions for core operational data
    // onSnapshot pushes data directly to TanStack Query cache — instant updates across all tabs
    const { data: schedule, isLoading: loadingSchedule } = useSchedulesRealtimeQuery(isAuthenticated);
    const { data: leaves, isLoading: loadingLeaves } = useLeavesRealtimeQuery(isAuthenticated);
    const { data: dailyAllocations, isLoading: loadingAllocations } = useAllocationsRealtimeQuery(isAuthenticated);

    // 2. Static Config Data - Loaded once (Infinity)
    const { data: workPeriods = [], isLoading: loadingWorkPeriods } = useWorkPeriodsQuery(isAuthenticated, { staleTime: Infinity });
    const { data: holidays = [], isLoading: loadingHolidays } = useHolidaysQuery(isAuthenticated, { staleTime: Infinity });
    const { data: patterns = [], isLoading: loadingPatterns } = usePatternsQuery(isAuthenticated, { staleTime: Infinity });

    const [lastSynced, setLastSynced] = useState<Date | null>(null);
    const [isOnline, setIsOnline] = useState(true);

    // Derived DataLoaded state - all data sources now via TanStack Query
    const dataLoaded = !loadingJobGroups && !loadingEmployees && !loadingJobs && !loadingSubJobs && !loadingSchedule
        && !loadingWorkPeriods && !loadingHolidays && !loadingPatterns
        && !loadingLeaves && !loadingAllocations;

    // View Mode State
    const [viewRole, setViewRole] = useState<Role | null>(null);

    // Auth listener
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                setIsAuthenticated(true);
                setIsOnline(true);
                setLastSynced(new Date());
            } else {
                setIsAuthenticated(false);
                setIsOnline(false);
            }
        });

        return () => unsubscribe();
    }, []);

    // Update lastSynced when data loads successfully
    useEffect(() => {
        if (dataLoaded && isAuthenticated) {
            setLastSynced(new Date());
        }
    }, [dataLoaded, isAuthenticated]);

    // NOTE: Real-time subscriptions REMOVED in Phase 4 Optimization
    // Leaves and Allocations now use TanStack Query with staleTime caching
    // This eliminates ~60 concurrent Firestore listeners (2 × 30 users)
    // Data freshness is maintained via mutation-triggered invalidation

    const resetData = async () => {
        // ... (Logic from App.tsx handleResetData can be moved here or kept in Admin)
    };

    // Deprecated setters - data managed by TanStack Query, components should use mutations + invalidation
    const noopWarn = (name: string) => () => {
        console.warn(`${name} is deprecated. Data is managed by TanStack Query. Use mutations + invalidateQueries.`);
    };

    const value: DataContextType = {
        // Master Data (Read-only)
        jobGroups,
        employees,
        setEmployees: noopWarn('setEmployees') as any,
        jobs,
        subJobs,
        schedule,
        setSchedule: noopWarn('setSchedule') as any,
        // Transactional Data (Read-only from TanStack Query)
        leaves,
        setLeaves: noopWarn('setLeaves') as any,
        dailyAllocations,
        setAllocations: noopWarn('setAllocations') as any,
        // Config Data (from TanStack Query, setters are no-ops)
        workPeriods, setWorkPeriods: noopWarn('setWorkPeriods') as any,
        holidays, setHolidays: noopWarn('setHolidays') as any,
        patterns, setPatterns: noopWarn('setPatterns') as any,
        // Status
        dataLoaded, lastSynced, isOnline,
        // View Mode
        viewRole, setViewRole,
        // Actions
        reloadData: async () => {
            // TanStack Query handles refetching via staleTime + invalidation
            // This is a no-op now but kept for backward compatibility
            setLastSynced(new Date());
        },
        resetData
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
