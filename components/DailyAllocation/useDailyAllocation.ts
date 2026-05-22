/**
 * useDailyAllocation - Custom hook for Daily Allocation business logic
 * Extracted from DailyAllocation.tsx for better maintainability
 */

import { useState, useEffect, useMemo } from 'react';
import { Employee, Job, DailyAllocation, Status, ScheduleItem, LeaveRequest, Role } from '../../types';
import { format, isSameDay, startOfDay, endOfDay, isWithinInterval, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, addWeeks, subMonths, addMonths } from 'date-fns';
import toast from 'react-hot-toast';
import { allocationsService, auditService } from '../../services/firestoreService';
import { auth } from '../../services/firebaseConfig';
import { useQueryClient } from '@tanstack/react-query';
import { ALLOCATION_KEYS } from '../../hooks/useAllocationsQuery';

export type DatePreset = 'today' | 'yesterday' | 'tomorrow' | 'thisWeek' | 'lastWeek' | 'nextWeek' | 'thisMonth' | 'lastMonth' | 'nextMonth' | 'custom';

interface UseDailyAllocationProps {
    employees: Employee[];
    jobs: Job[];
    schedule: ScheduleItem[];
    allocations: DailyAllocation[];
    leaves: LeaveRequest[];
    currentUserRole: Role;
}

export const useDailyAllocation = ({
    employees,
    jobs,
    schedule,
    allocations,
    leaves,
    currentUserRole
}: UseDailyAllocationProps) => {
    const queryClient = useQueryClient();

    // ========== DATE STATE ==========
    const [fromDate, setFromDate] = useState(new Date());
    const [toDate, setToDate] = useState(new Date());
    const [datePreset, setDatePreset] = useState<DatePreset>('today');

    // ========== SHIFT STATE ==========
    const [shift, setShift] = useState<string>(() => {
        const h = new Date().getHours();
        if (h < 12) return 'Sáng';
        if (h < 18) return 'Chiều';
        return 'Tối';
    });

    // ========== LOCAL BUFFER STATE ==========
    const [localAllocations, setLocalAllocations] = useState<DailyAllocation[]>([]);
    const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
    const [isDirty, setIsDirty] = useState(false);

    // ========== UI STATE ==========
    const [showFilter, setShowFilter] = useState(false);
    const [visibleJobIds, setVisibleJobIds] = useState<string[]>([]);

    // Sync local state
    useEffect(() => {
        setLocalAllocations(allocations);
    }, [allocations]);

    // Daily jobs only
    const allDailyJobs = useMemo(() =>
        jobs.filter(j => j.group === 'Chia hàng ngày' && j.isActive),
        [jobs]
    );

    // Initialize visible jobs
    useEffect(() => {
        if (allDailyJobs.length > 0 && visibleJobIds.length === 0) {
            setVisibleJobIds(allDailyJobs.map(j => j.id));
        }
    }, [allDailyJobs.length]);

    // ========== COMPUTED VALUES ==========
    const canEdit = currentUserRole === Role.Admin || currentUserRole === Role.Coordinator;
    const activeEmployees = useMemo(() =>
        employees.filter(e => e.status === Status.Active),
        [employees]
    );
    const isSingleDay = isSameDay(fromDate, toDate);
    const fromDateStr = format(fromDate, 'yyyy-MM-dd');
    const displayedJobs = useMemo(() =>
        allDailyJobs.filter(j => visibleJobIds.includes(j.id)),
        [allDailyJobs, visibleJobIds]
    );

    // ========== DATE PRESET HANDLER ==========
    const handlePresetChange = (preset: DatePreset) => {
        setDatePreset(preset);
        const today = new Date();

        switch (preset) {
            case 'today':
                setFromDate(today);
                setToDate(today);
                break;
            case 'yesterday':
                const yesterday = subDays(today, 1);
                setFromDate(yesterday);
                setToDate(yesterday);
                break;
            case 'tomorrow':
                const tomorrow = addDays(today, 1);
                setFromDate(tomorrow);
                setToDate(tomorrow);
                break;
            case 'thisWeek':
                setFromDate(startOfWeek(today, { weekStartsOn: 1 }));
                setToDate(endOfWeek(today, { weekStartsOn: 1 }));
                break;
            case 'lastWeek':
                const lastWeek = subWeeks(today, 1);
                setFromDate(startOfWeek(lastWeek, { weekStartsOn: 1 }));
                setToDate(endOfWeek(lastWeek, { weekStartsOn: 1 }));
                break;
            case 'nextWeek':
                const nextWeek = addWeeks(today, 1);
                setFromDate(startOfWeek(nextWeek, { weekStartsOn: 1 }));
                setToDate(endOfWeek(nextWeek, { weekStartsOn: 1 }));
                break;
            case 'thisMonth':
                setFromDate(startOfMonth(today));
                setToDate(endOfMonth(today));
                break;
            case 'lastMonth':
                const lastMonth = subMonths(today, 1);
                setFromDate(startOfMonth(lastMonth));
                setToDate(endOfMonth(lastMonth));
                break;
            case 'nextMonth':
                const nextMonth = addMonths(today, 1);
                setFromDate(startOfMonth(nextMonth));
                setToDate(endOfMonth(nextMonth));
                break;
            case 'custom':
                break;
        }
    };

    // ========== BUSY CHECK HELPER ==========
    const checkBusy = (empId: string, targetShift: string) => {
        const hasSchedule = schedule.some(s =>
            isSameDay(new Date(s.date), fromDate) &&
            s.shift === targetShift &&
            s.employeeIds.includes(empId) &&
            s.status !== 'Cancelled' // Loại trừ lịch đã hủy
        );
        if (hasSchedule) return true;

        const hasLeave = leaves.some(l =>
            l.employeeId === empId &&
            isSameDay(new Date(l.date), fromDate) &&
            l.shift === targetShift &&
            (l.status === 'Approved' || l.status === 'Pending')
        );
        return hasLeave;
    };

    // ========== AVAILABLE EMPLOYEES ==========
    const availableEmployees = useMemo(() => {
        return activeEmployees.filter(emp => {
            if (!emp.jobGroups.includes('Chia hàng ngày')) return false;

            if (isSingleDay) {
                const busyMorning = checkBusy(emp.id, 'Sáng');
                const busyAfternoon = checkBusy(emp.id, 'Chiều');

                if (shift === 'All') {
                    if (busyMorning && busyAfternoon) return false;
                } else if (shift === 'Sáng') {
                    if (busyMorning) return false;
                } else if (shift === 'Chiều') {
                    if (busyAfternoon) return false;
                }
            }
            return true;
        }).sort((a, b) => (a.stt || 9999) - (b.stt || 9999));
    }, [activeEmployees, schedule, leaves, fromDate, isSingleDay, shift]);

    // ========== ALLOCATION HANDLERS ==========
    const handleAllocationChange = (empId: string, jobId: string, field: keyof DailyAllocation, value: number) => {
        if (!isSingleDay) return;

        setLocalAllocations(prev => {
            const existingIndex = prev.findIndex(a => a.employeeId === empId && a.jobId === jobId && a.date === fromDateStr);
            if (existingIndex > -1) {
                const updated = [...prev];
                updated[existingIndex] = { ...updated[existingIndex], [field]: value };
                setDirtyIds(ids => new Set(ids).add(updated[existingIndex].id));
                return updated;
            } else {
                const newId = `alloc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                const newItem: DailyAllocation = {
                    id: newId,
                    date: fromDateStr,
                    employeeId: empId,
                    jobId,
                    assigned: 0,
                    newAssigned: field === 'newAssigned' ? value : 0,
                    completed: 0,
                    returnedKD: field === 'returnedKD' ? value : 0,
                    returnedTP: field === 'returnedTP' ? value : 0
                };
                setDirtyIds(ids => new Set(ids).add(newId));
                return [...prev, newItem];
            }
        });
        setIsDirty(true);
    };

    const handleSave = async () => {
        const itemsToSave = localAllocations.filter(a => dirtyIds.has(a.id));

        if (itemsToSave.length === 0) {
            setIsDirty(false);
            return;
        }

        toast.promise(
            Promise.all(itemsToSave.map(item => allocationsService.save(item))).then(() => {
                queryClient.invalidateQueries({ queryKey: ALLOCATION_KEYS.all });
            }),
            {
                loading: 'Đang lưu phân công...',
                success: 'Đã lưu phân công thành công!',
                error: 'Lỗi khi lưu dữ liệu'
            }
        );

        if (auth.currentUser) {
            auditService.log(
                'UPDATE_ALLOCATION',
                'ALLOCATION',
                'DAILY',
                { date: fromDateStr, count: itemsToSave.length, docIds: itemsToSave.map(i => i.id) },
                auth.currentUser.email || 'unknown'
            );
        }

        setDirtyIds(new Set());
        setIsDirty(false);
    };

    // ========== DATA HELPERS ==========
    const getAllocationData = (empId: string, jobId: string) => {
        const relevantAllocations = localAllocations.filter(a => {
            const aDate = new Date(a.date);
            const isInRange = isWithinInterval(aDate, { start: startOfDay(fromDate), end: endOfDay(toDate) });
            return a.employeeId === empId && a.jobId === jobId && isInRange;
        });

        return relevantAllocations.reduce((acc, curr) => ({
            assigned: acc.assigned + (curr.assigned || 0),
            newAssigned: acc.newAssigned + (curr.newAssigned || 0),
            completed: acc.completed + (curr.completed || 0),
            returnedKD: acc.returnedKD + (curr.returnedKD || 0),
            returnedTP: acc.returnedTP + (curr.returnedTP || 0)
        }), { assigned: 0, newAssigned: 0, completed: 0, returnedKD: 0, returnedTP: 0 });
    };

    const calculatePending = (alloc: { newAssigned: number; completed: number; returnedKD: number; returnedTP: number }) => {
        return alloc.newAssigned - (alloc.completed + alloc.returnedKD + alloc.returnedTP);
    };

    const getEmployeeRowClass = (empId: string) => {
        if (!isSingleDay) return 'bg-white';

        const busyMorning = checkBusy(empId, 'Sáng');
        const busyAfternoon = checkBusy(empId, 'Chiều');
        const freeMorning = !busyMorning;
        const freeAfternoon = !busyAfternoon;

        if (freeMorning && freeAfternoon) {
            return 'bg-teal-100 hover:bg-teal-200 border-l-4 border-l-teal-600 shadow-sm';
        } else if (freeMorning) {
            return 'bg-blue-100 hover:bg-blue-200 border-l-4 border-l-blue-600 shadow-sm';
        } else if (freeAfternoon) {
            return 'bg-orange-100 hover:bg-orange-200 border-l-4 border-l-orange-600 shadow-sm';
        }
        return 'bg-white';
    };

    return {
        // Date state
        fromDate,
        setFromDate,
        toDate,
        setToDate,
        datePreset,
        handlePresetChange,
        isSingleDay,
        fromDateStr,

        // Shift
        shift,
        setShift,

        // Filter UI
        showFilter,
        setShowFilter,
        visibleJobIds,
        setVisibleJobIds,

        // Data
        allDailyJobs,
        displayedJobs,
        availableEmployees,
        canEdit,
        isDirty,

        // Handlers
        handleAllocationChange,
        handleSave,

        // Helpers
        getAllocationData,
        calculatePending,
        getEmployeeRowClass,
    };
};
