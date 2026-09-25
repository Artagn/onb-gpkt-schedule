/**
 * useDailyAllocation - Custom hook for Daily Allocation business logic
 * Extracted from DailyAllocation.tsx for better maintainability
 */

import { useState, useEffect, useMemo } from 'react';
import { Employee, Job, DailyAllocation, Status, ScheduleItem, LeaveRequest, Role } from '../../types';
import { format, isSameDay, startOfDay, endOfDay, isWithinInterval, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, addWeeks, subMonths, addMonths, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { allocationsService, auditService } from '../../services/firestoreService';
import { auth } from '../../services/firebaseConfig';
import { useQueryClient } from '@tanstack/react-query';
import { ALLOCATION_KEYS } from '../../hooks/useAllocationsQuery';
import { mergeAllocationsWithLocal } from '../../utils/allocationMerge';
import { DEFAULT_JOB_IDS } from '../../constants';

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

    // Sync local state with real-time allocations from database
    // Uses shared mergeAllocationsWithLocal utility to prevent code duplication with useMyTasks
    useEffect(() => {
        setLocalAllocations(prev => mergeAllocationsWithLocal(allocations, prev));
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

    // ========== BUSY MAP OPTIMIZED LOOKUP (O(1)) ==========
    const busyMap = useMemo(() => {
        const map = new Set<string>();

        schedule.forEach(s => {
            if (s.status !== 'Cancelled' && s.date === fromDateStr) {
                s.employeeIds.forEach(empId => {
                    map.add(`${empId}_${s.shift}`);
                });
            }
        });

        leaves.forEach(l => {
            if ((l.status === 'Approved' || l.status === 'Pending') && l.date === fromDateStr) {
                map.add(`${l.employeeId}_${l.shift}`);
            }
        });

        return map;
    }, [schedule, leaves, fromDateStr]);

    // ========== BUSY CHECK HELPER ==========
    const checkBusy = (empId: string, targetShift: string) => {
        return busyMap.has(`${empId}_${targetShift}`);
    };

    // ========== SCHEDULE-RESTRICTED JOB CHECK ==========
    // Default jobs (vd. "Chuyển đổi") giới hạn phân công chỉ cho nhân viên đã được
    // gán qua Lịch cố định trong ngày, thay vì toàn bộ nhân viên thuộc nhóm "Chia hàng ngày".
    const isScheduledForJob = (empId: string, jobId: string) => {
        return schedule.some(s =>
            s.jobId === jobId &&
            s.date === fromDateStr &&
            s.status !== 'Cancelled' &&
            s.employeeIds.includes(empId)
        );
    };

    const isEligibleForJob = (empId: string, jobId: string) => {
        // Chỉ áp dụng khi xem đúng 1 ngày cụ thể - ở chế độ xem tổng hợp theo khoảng
        // thời gian, fromDateStr chỉ là ngày bắt đầu nên không đủ để xác định lịch từng ngày.
        if (DEFAULT_JOB_IDS.includes(jobId) && isSingleDay) {
            return isScheduledForJob(empId, jobId);
        }
        return true;
    };

    // Nhân viên có "phù hợp" để hiện hàng cho 1 job cụ thể hay không:
    // - Job mặc định (vd. "Chuyển đổi & 1-1"): phải ĐÃ được gán lịch cố định cho job này
    //   (không áp dụng bộ lọc "rảnh theo buổi" vì chính lịch đó khiến họ "bận").
    // - Job thường: chỉ cần đang rảnh theo buổi đang chọn (như logic gốc trước đây).
    const isSuitableForJob = (empId: string, jobId: string) => {
        if (DEFAULT_JOB_IDS.includes(jobId)) {
            return isScheduledForJob(empId, jobId);
        }
        if (isSingleDay) {
            const busyMorning = checkBusy(empId, 'Sáng');
            const busyAfternoon = checkBusy(empId, 'Chiều');
            if (shift === 'All') return !(busyMorning && busyAfternoon);
            if (shift === 'Sáng') return !busyMorning;
            if (shift === 'Chiều') return !busyAfternoon;
        }
        return true;
    };

    // ========== AVAILABLE EMPLOYEES ==========
    const availableEmployees = useMemo(() => {
        return activeEmployees.filter(emp => {
            if (!emp.jobGroups.includes('Chia hàng daily') && !emp.jobGroups.includes('Chia hàng ngày')) return false;

            // Phải phù hợp (theo lịch cố định hoặc theo rảnh/bận tùy loại job) với ít nhất
            // 1 trong các công việc đang hiển thị.
            if (displayedJobs.length > 0 && !displayedJobs.some(job => isSuitableForJob(emp.id, job.id))) return false;

            return true;
        }).sort((a, b) => (a.stt || 9999) - (b.stt || 9999));
    }, [activeEmployees, busyMap, isSingleDay, shift, displayedJobs, schedule, fromDateStr]);

    // ========== ALLOCATION HANDLERS ==========
    const handleAllocationChange = (empId: string, jobId: string, field: keyof DailyAllocation, value: number) => {
        if (!isSingleDay) return;

        // Find existing or generate deterministic ID to prevent ID drift and StrictMode mismatch
        const existingItem = localAllocations.find(a => a.employeeId === empId && a.jobId === jobId && a.date === fromDateStr);
        const itemId = existingItem ? existingItem.id : `${empId}_${jobId}_${fromDateStr}`;

        setLocalAllocations(prev => {
            const existingIndex = prev.findIndex(a => a.id === itemId);
            if (existingIndex > -1) {
                const updated = [...prev];
                updated[existingIndex] = { ...updated[existingIndex], [field]: value };
                return updated;
            } else {
                const newItem: DailyAllocation = {
                    id: itemId,
                    date: fromDateStr,
                    employeeId: empId,
                    jobId,
                    assigned: field === 'assigned' ? value : 0,
                    newAssigned: 0,
                    completed: 0,
                    returnedKD: field === 'returnedKD' ? value : 0,
                    returnedTP: field === 'returnedTP' ? value : 0
                };
                return [...prev, newItem];
            }
        });

        setDirtyIds(ids => {
            const next = new Set(ids);
            next.add(itemId);
            return next;
        });
        setIsDirty(true);
    };

    const handleSave = async () => {
        const itemsToSave = localAllocations.filter(a => dirtyIds.has(a.id));

        if (itemsToSave.length === 0) {
            setIsDirty(false);
            return;
        }

        // Keep snapshot of the original local allocations and dirtyIds for rollback if fail
        const previousAllocations = [...localAllocations];
        const previousDirtyIds = new Set(dirtyIds);

        // Identify duplicate document IDs in the original Firestore allocations that need to be deleted.
        // We delete any documents that have matching {employeeId, jobId, date} but a different ID
        // than the target deterministic ID (which is `${employeeId}_${jobId}_${date}`).
        const duplicateIdsToDelete: string[] = [];
        itemsToSave.forEach(item => {
            const deterministicId = `${item.employeeId}_${item.jobId}_${item.date}`;
            allocations.forEach(a => {
                if (a.employeeId === item.employeeId && a.jobId === item.jobId && a.date === item.date && a.id !== deterministicId) {
                    duplicateIdsToDelete.push(a.id);
                }
            });
        });

        // Enforce deterministic ID format and ensure newAssigned remains 0
        const itemsWithUpdates = itemsToSave.map(item => {
            const deterministicId = `${item.employeeId}_${item.jobId}_${item.date}`;
            return {
                ...item,
                id: deterministicId,
                newAssigned: 0
            };
        });

        // Sync local state buffer and reset dirty state synchronously to disable double-clicks
        setLocalAllocations(prev => {
            return prev.map(a => {
                const isItemToSave = itemsToSave.some(item => item.id === a.id);
                if (isItemToSave) {
                    const deterministicId = `${a.employeeId}_${a.jobId}_${a.date}`;
                    return {
                        ...a,
                        id: deterministicId,
                        newAssigned: 0
                    };
                }
                return a;
            });
        });
        setDirtyIds(new Set());
        setIsDirty(false);

        // Save via batch writes (saveAll) first (upsert-first)
        // If it succeeds, delete the old duplicate documents in Firestore (delete-second)
        try {
            // 1. Save new/merged documents using deterministic IDs
            await allocationsService.saveAll(itemsWithUpdates);

            // 2. Delete duplicate/old documents
            if (duplicateIdsToDelete.length > 0) {
                await Promise.all(duplicateIdsToDelete.map(id => allocationsService.delete(id)));
            }

            toast.success('Đã lưu phân công thành công!');

            if (auth.currentUser) {
                auditService.log(
                    'UPDATE_ALLOCATION',
                    'ALLOCATION',
                    'DAILY',
                    { date: fromDateStr, count: itemsToSave.length, docIds: itemsWithUpdates.map(i => i.id) },
                    auth.currentUser.email || 'unknown'
                );
            }
        } catch (error) {
            console.error("Failed to save allocations:", error);
            toast.error('Lỗi khi lưu dữ liệu. Đã hoàn tác phân công.');
            
            // Rollback states
            setLocalAllocations(previousAllocations);
            setDirtyIds(previousDirtyIds);
            setIsDirty(true);
        }
    };

    // ========== DATA HELPERS ==========
    const getAllocationData = (empId: string, jobId: string) => {
        const relevantAllocations = localAllocations.filter(a => {
            const aDate = parseISO(a.date);
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

    const calculatePending = (alloc: { assigned: number; newAssigned: number; completed: number; returnedKD: number; returnedTP: number }) => {
        return (alloc.assigned + alloc.newAssigned) - (alloc.completed + alloc.returnedKD + alloc.returnedTP);
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
        isEligibleForJob,
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
