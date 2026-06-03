import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
    Employee, Job, SubJob, ScheduleItem, SchedulePattern, WorkPeriod,
    Holiday, DailyAllocation, LeaveRequest, Role, JobGroupDef, User
} from '../types';
import { auth } from '../services/firebaseConfig';
import { useEmployeesQuery } from '../hooks/useEmployeesQuery';
import { useJobsQuery } from '../hooks/useJobsQuery';
import { useJobGroupsQuery } from '../hooks/useJobGroupsQuery';
import { useSubJobsQuery } from '../hooks/useSubJobsQuery';
import { useWorkPeriodsQuery, useHolidaysQuery, usePatternsQuery } from '../hooks/useConfigQuery';
import { useSchedulesRealtimeQuery, useLeavesRealtimeQuery, useAllocationsRealtimeQuery } from '../hooks/useRealtimeQuery';

export interface ConfigContextType {
    jobGroups: JobGroupDef[];
    employees: Employee[];
    setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>; // no-op warning
    jobs: Job[];
    subJobs: SubJob[];
    workPeriods: WorkPeriod[];
    setWorkPeriods: React.Dispatch<React.SetStateAction<WorkPeriod[]>>; // no-op warning
    holidays: Holiday[];
    setHolidays: React.Dispatch<React.SetStateAction<Holiday[]>>; // no-op warning
    patterns: SchedulePattern[];
    setPatterns: React.Dispatch<React.SetStateAction<SchedulePattern[]>>; // no-op warning
}

export interface RealtimeContextType {
    schedule: ScheduleItem[];
    setSchedule: React.Dispatch<React.SetStateAction<ScheduleItem[]>>; // no-op warning
    leaves: LeaveRequest[];
    setLeaves: React.Dispatch<React.SetStateAction<LeaveRequest[]>>; // no-op warning
    dailyAllocations: DailyAllocation[];
    setAllocations: React.Dispatch<React.SetStateAction<DailyAllocation[]>>; // no-op warning
}

export interface SyncContextType {
    isOnline: boolean;
    lastSynced: Date | null;
}

export interface SessionContextType {
    user: User | null;
    authLoading: boolean;
    viewRole: Role | null;
    setViewRole: (role: Role | null) => void;
    dataLoaded: boolean;
    reloadData: () => Promise<void>;
    resetData: () => Promise<void>;
}

// Composite type for backward compatibility
export interface DataContextType extends ConfigContextType, RealtimeContextType, SyncContextType, SessionContextType {}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);
const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);
const SyncContext = createContext<SyncContextType | undefined>(undefined);
const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const useConfigData = () => {
    const context = useContext(ConfigContext);
    if (!context) {
        throw new Error('useConfigData must be used within a DataProvider');
    }
    return context;
};

export const useRealtimeData = () => {
    const context = useContext(RealtimeContext);
    if (!context) {
        throw new Error('useRealtimeData must be used within a DataProvider');
    }
    return context;
};

export const useSyncStatus = () => {
    const context = useContext(SyncContext);
    if (!context) {
        throw new Error('useSyncStatus must be used within a DataProvider');
    }
    return context;
};

export const useSession = () => {
    const context = useContext(SessionContext);
    if (!context) {
        throw new Error('useSession must be used within a DataProvider');
    }
    return context;
};

// Composite hook for backward compatibility
export const useData = () => {
    const config = useContext(ConfigContext);
    const realtime = useContext(RealtimeContext);
    const sync = useContext(SyncContext);
    const session = useContext(SessionContext);
    if (!config || !realtime || !sync || !session) {
        throw new Error('useData must be used within a DataProvider');
    }
    return { ...config, ...realtime, ...sync, ...session };
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        // Auth State Tracking - unified single source of truth
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);

    // 1. TanStack Query - ONLY run when authenticated
    const { data: jobGroups = [], isLoading: loadingJobGroups } = useJobGroupsQuery(isAuthenticated, { staleTime: Infinity });
    const { data: employees = [], isLoading: loadingEmployees } = useEmployeesQuery(isAuthenticated, { staleTime: Infinity });
    const { data: jobs = [], isLoading: loadingJobs } = useJobsQuery(isAuthenticated, { staleTime: Infinity });
    const { data: subJobs = [], isLoading: loadingSubJobs } = useSubJobsQuery(isAuthenticated, { staleTime: Infinity });

    // Real-time operational data subscriptions
    const { data: schedule = [], isLoading: loadingSchedule } = useSchedulesRealtimeQuery(isAuthenticated);
    const { data: leaves = [], isLoading: loadingLeaves } = useLeavesRealtimeQuery(isAuthenticated);
    const { data: dailyAllocations = [], isLoading: loadingAllocations } = useAllocationsRealtimeQuery(isAuthenticated);

    // Static Config Data - Loaded once (Infinity)
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

    // Auth listener (unified single listener)
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                setIsAuthenticated(true);
                setIsOnline(true);
                setLastSynced(new Date());
            } else {
                setUser(null);
                setIsAuthenticated(false);
                setIsOnline(false);
            }
            setAuthLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Update lastSynced when data loads successfully
    useEffect(() => {
        if (dataLoaded && isAuthenticated) {
            setLastSynced(new Date());
        }
    }, [dataLoaded, isAuthenticated]);

    const resetData = useCallback(async () => {
        // Kept for backward compatibility
    }, []);

    const reloadData = useCallback(async () => {
        setLastSynced(new Date());
    }, []);

    const noopWarn = (name: string) => () => {
        console.warn(`${name} is deprecated. Data is managed by TanStack Query. Use mutations + invalidateQueries.`);
    };

    // 4 Distinct useMemo blocks ensuring ZERO key/field overlaps

    const configValue = useMemo<ConfigContextType>(() => ({
        jobGroups,
        employees,
        setEmployees: noopWarn('setEmployees') as any,
        jobs,
        subJobs,
        workPeriods,
        setWorkPeriods: noopWarn('setWorkPeriods') as any,
        holidays,
        setHolidays: noopWarn('setHolidays') as any,
        patterns,
        setPatterns: noopWarn('setPatterns') as any,
    }), [jobGroups, employees, jobs, subJobs, workPeriods, holidays, patterns]);

    const realtimeValue = useMemo<RealtimeContextType>(() => ({
        schedule,
        setSchedule: noopWarn('setSchedule') as any,
        leaves,
        setLeaves: noopWarn('setLeaves') as any,
        dailyAllocations,
        setAllocations: noopWarn('setAllocations') as any,
    }), [schedule, leaves, dailyAllocations]);

    const syncValue = useMemo<SyncContextType>(() => ({
        isOnline,
        lastSynced,
    }), [isOnline, lastSynced]);

    const sessionValue = useMemo<SessionContextType>(() => ({
        user,
        authLoading,
        viewRole,
        setViewRole,
        dataLoaded,
        reloadData,
        resetData
    }), [user, authLoading, viewRole, dataLoaded, reloadData, resetData]);

    return (
        <ConfigContext.Provider value={configValue}>
            <RealtimeContext.Provider value={realtimeValue}>
                <SyncContext.Provider value={syncValue}>
                    <SessionContext.Provider value={sessionValue}>
                        {children}
                    </SessionContext.Provider>
                </SyncContext.Provider>
            </RealtimeContext.Provider>
        </ConfigContext.Provider>
    );
};

