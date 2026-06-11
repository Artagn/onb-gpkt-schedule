
import { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Role, ScheduleItem, DailyAllocation, Status, LeaveRequest } from '../../types';
import { isSameDay, format, parseISO } from 'date-fns';
import { allocationsService, auditService } from '../../services/firestoreService';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useScheduleMutations } from '../../hooks/useSchedulesQuery';
import { ALLOCATION_KEYS, useAllocationMutations } from '../../hooks/useAllocationsQuery';
import { useLeaveMutations } from '../../hooks/useLeavesQuery';
import { useLeaveBalanceQuery } from '../../hooks/useLeaveBalanceQuery';
import { useDateFilter, DatePreset } from '../../hooks/useDateFilter';
import { useLeaveHandlers } from '../../hooks/useLeaveHandlers';
import { mergeAllocationsWithLocal } from '../../utils/allocationMerge';

export type { DatePreset } from '../../hooks/useDateFilter';
export type TabType = 'overview' | 'fixed' | 'daily' | 'leave' | 'kpi' | 'market';

export const useMyTasks = (user: any, initialTab?: TabType) => {
    // v3.16.0+: Real-time data from DataContext (onSnapshot), no polling needed
    const {
        employees, jobs, subJobs,
        schedule, leaves, dailyAllocations: allocations
    } = useData();

    const queryClient = useQueryClient();
    const scheduleMutations = useScheduleMutations();
    const allocationMutations = useAllocationMutations();
    const leaveMutations = useLeaveMutations();

    // --- 1. IDENTIFY USER & ROLE ---
    const currentLoggedEmp = useMemo(() => {
        return employees.find(e => e.email.toLowerCase() === user?.email?.toLowerCase());
    }, [employees, user]);



    const isManager = currentLoggedEmp?.role === Role.Coordinator || currentLoggedEmp?.role === Role.Admin;

    // --- 2. STATE ---
    const [currentEmployeeId, setCurrentEmployeeId] = useState<string>(() => {
        if (currentLoggedEmp) return currentLoggedEmp.id;
        return employees[0]?.id || '';
    });

    useEffect(() => {
        if (currentLoggedEmp && !isManager) {
            setCurrentEmployeeId(currentLoggedEmp.id);
        }
    }, [currentLoggedEmp, isManager]);

    // Leave Balance Query - query by selected employee, not logged-in user
    const { data: leaveBalance } = useLeaveBalanceQuery(currentEmployeeId !== 'all' ? currentEmployeeId : '');

    // Filter State (Range) - Using extracted hook
    const {
        fromDate, setFromDate, toDate, setToDate,
        datePreset, setDatePreset, handlePresetChange, isDateInRange
    } = useDateFilter({ initialPreset: 'today' });

    const [filterShift, setFilterShift] = useState<string>('All');

    const [filterStatus, setFilterStatus] = useState<'All' | 'Completed' | 'Pending' | 'Cancelled'>('All');

    const [activeTab, setActiveTab] = useState<TabType>(initialTab || 'overview');

    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    // Local Allocation State
    const [localAllocations, setLocalAllocations] = useState<DailyAllocation[]>([]);
    const [dirtyAllocationIds, setDirtyAllocationIds] = useState<Set<string>>(new Set());
    const [isDirty, setIsDirty] = useState(false);

    // Sync local state with Firestore allocations
    // Uses shared mergeAllocationsWithLocal utility to prevent code duplication with useDailyAllocation
    useEffect(() => {
        setLocalAllocations(prev => mergeAllocationsWithLocal(allocations, prev));
    }, [allocations]);

    // Job Filter for Daily Tab
    const [filterJobIds, setFilterJobIds] = useState<string[]>([]);
    const [showJobFilter, setShowJobFilter] = useState(false);

    useEffect(() => {
        const dailyJobs = jobs.filter(j => j.group === 'Chia hàng ngày' && j.isActive).map(j => j.id);
        if (dailyJobs.length > 0 && filterJobIds.length === 0) {
            setFilterJobIds(dailyJobs);
        }
    }, [jobs]);

    // Modal States
    const [selectedTask, setSelectedTask] = useState<ScheduleItem | null>(null);
    const [actionNote, setActionNote] = useState('');
    const [editingRestItem, setEditingRestItem] = useState<ScheduleItem | null>(null);
    const [editingAutoLeave, setEditingAutoLeave] = useState<LeaveRequest | null>(null);
    const [newLeave, setNewLeave] = useState<Partial<LeaveRequest>>({ shift: 'Sáng', reason: '' });
    const [viewingDetailItem, setViewingDetailItem] = useState<ScheduleItem | null>(null);

    // Weekly View State
    const [weeklyViewDate, setWeeklyViewDate] = useState(new Date());
    const [showWeeklyTable, setShowWeeklyTable] = useState(true);

    const [trainingMetrics, setTrainingMetrics] = useState({
        participants: 0,
        surveys: 0,
        capable: 0
    });

    const activeEmployees = employees.filter(e => e.status === Status.Active).sort((a, b) => (a.stt || 9999) - (b.stt || 9999));

    // Helpers
    const getJob = (id: string) => jobs.find(j => j.id === id);

    const getSubJobs = (jobId: string, day: Date, shift: string) => {
        const dayIndex = day.getDay();
        const map: Record<number, string> = { 1: 'Thứ 2', 2: 'Thứ 3', 3: 'Thứ 4', 4: 'Thứ 5', 5: 'Thứ 6', 6: 'Thứ 7', 0: 'Chủ nhật' };
        const dayName = map[dayIndex];
        const subs = subJobs.filter(s => s.jobId === jobId && s.day === dayName && s.shift === shift);
        return subs.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    };

    // Leave Handlers - Using extracted hook
    const {
        handleAddLeave: addLeaveHandler,
        handleDeleteLeave,
        handleApproveLeave,
        handleRejectLeave,
        handleUnapproveLeave,
    } = useLeaveHandlers({ leaves, schedule, jobs, currentEmployeeId });

    // Filter Logic
    const myFixedSchedule = useMemo(() => schedule.filter(s =>
        isDateInRange(s.date) &&
        (currentEmployeeId === 'all' || s.employeeIds.includes(currentEmployeeId)) &&
        (filterShift === 'All' || s.shift === filterShift) &&
        s.jobId !== 'JOB_NGHI_BU'
    ), [schedule, fromDate, toDate, currentEmployeeId, filterShift]);

    const displayedFixedSchedule = useMemo(() => {
        if (filterStatus === 'All') return myFixedSchedule;
        return myFixedSchedule.filter(s => s.status === filterStatus);
    }, [myFixedSchedule, filterStatus]);

    const myDailyAllocations = useMemo(() => localAllocations.filter(a =>
        (currentEmployeeId === 'all' || a.employeeId === currentEmployeeId) &&
        isDateInRange(a.date) &&
        filterJobIds.includes(a.jobId) &&
        (a.newAssigned > 0 || a.assigned > 0 || a.completed > 0)
    ), [localAllocations, currentEmployeeId, fromDate, toDate, filterJobIds]);

    const unifiedLeaves = useMemo(() => {
        // Step 3a: Get auto-generated rest items from schedule (JOB_NGHI_BU)
        const autoRestScheduleItems = schedule.filter(s =>
            s.jobId === 'JOB_NGHI_BU' &&
            (currentEmployeeId === 'all' || s.employeeIds.includes(currentEmployeeId)) &&
            isDateInRange(s.date) &&
            (filterShift === 'All' || s.shift === filterShift)
        );

        // Step 3b: Convert schedule items to LeaveRequest format
        const autoRestLeaves: (LeaveRequest & { isAuto: boolean })[] = autoRestScheduleItems.flatMap(s =>
            s.employeeIds.map(empId => {
                const existingLeave = leaves.find(l =>
                    l.employeeId === empId &&
                    isSameDay(parseISO(l.date), parseISO(s.date)) &&
                    l.shift === s.shift &&
                    (l.reason.includes('[Tự động]') || l.reason.includes('[Đã đổi]'))
                );

                if (existingLeave) {
                    return { ...existingLeave, isAuto: true };
                }

                return {
                    id: `auto_${s.id}_${empId}`,
                    employeeId: empId,
                    date: s.date,
                    shift: s.shift,
                    reason: '[Tự động] Nghỉ bù sau ca tối',
                    status: 'Pending' as const,
                    isAuto: true
                };
            })
        );

        // Step 3c: Get regular leaves (non-auto)
        const regularLeaves = leaves.filter(l =>
            (currentEmployeeId === 'all' || l.employeeId === currentEmployeeId) &&
            isDateInRange(l.date) &&
            (filterShift === 'All' || l.shift === filterShift) &&
            !l.reason.includes('[Tự động]') &&
            !l.reason.includes('[Đã đổi]')
        ).map(l => ({ ...l, isAuto: false }));

        // Step 3d: Get edited auto-leaves
        const editedAutoLeaves = leaves.filter(l =>
            (currentEmployeeId === 'all' || l.employeeId === currentEmployeeId) &&
            isDateInRange(l.date) &&
            (filterShift === 'All' || l.shift === filterShift) &&
            (l.reason.includes('[Tự động]') || l.reason.includes('[Đã đổi]'))
        ).map(l => ({ ...l, isAuto: true }));

        // Step 3e: Merge all leaves
        const seenIds = new Set<string>();
        const result: (LeaveRequest & { isAuto: boolean })[] = [];

        editedAutoLeaves.forEach(l => {
            if (!seenIds.has(l.id)) {
                seenIds.add(l.id);
                result.push(l);
            }
        });

        autoRestLeaves.forEach(l => {
            const isDuplicate = result.some(existing =>
                existing.employeeId === l.employeeId &&
                isSameDay(parseISO(existing.date), parseISO(l.date)) &&
                existing.shift === l.shift &&
                existing.isAuto
            );
            if (!isDuplicate && !seenIds.has(l.id)) {
                seenIds.add(l.id);
                result.push(l);
            }
        });

        regularLeaves.forEach(l => {
            if (!seenIds.has(l.id)) {
                seenIds.add(l.id);
                result.push(l);
            }
        });

        return result;
    }, [schedule, leaves, currentEmployeeId, fromDate, toDate, filterShift]);

    // Handlers - handlePresetChange is now from useDateFilter hook

    const handleUpdateProgress = (allocationDate: string, jobId: string, field: 'completed' | 'returnedKD' | 'returnedTP', value: number, targetEmpId?: string) => {
        const empToUpdate = targetEmpId || currentEmployeeId;
        if (empToUpdate === 'all') return;

        setLocalAllocations(prev => {
            const existingIndex = prev.findIndex(a => a.employeeId === empToUpdate && a.jobId === jobId && a.date === allocationDate);
            if (existingIndex > -1) {
                const updated = [...prev];
                updated[existingIndex] = { ...updated[existingIndex], [field]: value };
                setDirtyAllocationIds(ids => new Set(ids).add(updated[existingIndex].id));
                return updated;
            }
            return prev;
        });
        setIsDirty(true);
    };

    const handleSaveProgress = async () => {
        const itemsToSave = localAllocations.filter(a => dirtyAllocationIds.has(a.id));
        if (itemsToSave.length === 0) {
            setIsDirty(false);
            return;
        }

        // Snapshot state for rollback on failure
        const previousAllocations = [...localAllocations];
        const previousDirtyIds = new Set(dirtyAllocationIds);

        // Identify duplicate document IDs in the original Firestore allocations that need to be deleted
        const duplicateIdsToDelete: string[] = [];
        itemsToSave.forEach(item => {
            const deterministicId = `${item.employeeId}_${item.jobId}_${item.date}`;
            allocations.forEach(a => {
                if (a.employeeId === item.employeeId && a.jobId === item.jobId && a.date === item.date && a.id !== deterministicId) {
                    duplicateIdsToDelete.push(a.id);
                }
            });
        });

        // Optimistically clear dirty state to prevent double-clicks
        setDirtyAllocationIds(new Set());
        setIsDirty(false);

        // Save progress using batch write (atomic) instead of Promise.all (non-atomic)
        try {
            // 1. Save new/merged progress documents via batch write
            await allocationsService.saveAll(itemsToSave);

            // 2. Delete duplicate/old documents
            if (duplicateIdsToDelete.length > 0) {
                await Promise.all(duplicateIdsToDelete.map(id => allocationsService.delete(id)));
            }

            toast.success('Đã lưu tiến độ!');
            queryClient.invalidateQueries({ queryKey: ALLOCATION_KEYS.all });
        } catch (error) {
            console.error("Failed to save progress:", error);
            toast.error('Lỗi lưu dữ liệu. Dữ liệu chưa lưu vẫn được giữ nguyên.');

            // Rollback to previous state
            setLocalAllocations(previousAllocations);
            setDirtyAllocationIds(previousDirtyIds);
            setIsDirty(true);
        }
    };

    const handleTaskAction = (status: 'Completed' | 'Cancelled') => {
        if (!selectedTask) return;

        const updatedItem = { ...selectedTask, status, note: actionNote };
        const job = jobs.find(j => j.id === selectedTask.jobId);

        if (status === 'Completed' && job?.group === 'Đào tạo') {
            updatedItem.customerParticipants = trainingMetrics.participants;
            updatedItem.customerSurveys = trainingMetrics.surveys;
            updatedItem.customerCapable = trainingMetrics.capable;
        }

        scheduleMutations.update.mutate(updatedItem);
        toast.success("Đã cập nhật trạng thái!");

        setSelectedTask(null);
        setActionNote('');
    };

    const handleQuickComplete = (e: React.MouseEvent, item: ScheduleItem) => {
        e.stopPropagation();
        if (item.status === 'Completed') return;
        const updatedItem = { ...item, status: 'Completed' as const };

        scheduleMutations.update.mutate(updatedItem, {
            onSuccess: () => {
                auditService.log('TASK_QUICK_COMPLETE', 'ScheduleItem', item.id, { jobId: item.jobId, date: item.date }, user?.email || 'Unknown');
                toast.success("Đã hoàn thành công việc!");
            }
        });
    };

    const handleSaveRestItem = () => {
        if (!editingRestItem) return;
        scheduleMutations.update.mutate(editingRestItem);
        setEditingRestItem(null);
        toast.success("Đã cập nhật lịch nghỉ bù!");
    };

    const handleSaveAutoLeave = async () => {
        if (!editingAutoLeave) return;

        const isFromSchedule = editingAutoLeave.id.startsWith('auto_');
        const existingLeave = leaves.find(l => l.id === editingAutoLeave.id);

        if (isFromSchedule && !existingLeave) {
            // Case 1: Convert Auto-Schedule Item to Leave Request

            // 1.1 Identify the original item to be deleted/referenced
            const prefix = 'auto_';
            const suffix = `_${editingAutoLeave.employeeId}`;
            let scheduleId = '';
            if (editingAutoLeave.id.startsWith(prefix) && editingAutoLeave.id.endsWith(suffix)) {
                scheduleId = editingAutoLeave.id.substring(prefix.length, editingAutoLeave.id.length - suffix.length);
            }
            const itemToDelete = schedule.find(s => s.id === scheduleId);

            // 1.2 Determine Old Date
            const oldDateStr = itemToDelete ? format(parseISO(itemToDelete.date), 'dd/MM/yyyy') : '??';

            // 1.3 Create NEW Leave Request
            const newLeaveRequest: LeaveRequest = {
                id: `leave_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                employeeId: editingAutoLeave.employeeId,
                date: editingAutoLeave.date,
                shift: editingAutoLeave.shift,
                reason: `[Đã đổi] Nghỉ bù từ ${oldDateStr}`, // STORE OLD DATE
                status: 'Pending'
            };

            // 1.4 Commit Changes (Delete Old Item + Add New Leave)
            if (itemToDelete) {
                scheduleMutations.remove.mutate(scheduleId);
                console.log(`Deleted original schedule item ${scheduleId}`);
            }

            leaveMutations.add.mutate(newLeaveRequest);

        } else if (existingLeave) {
            // Case 2: Editing an existing Leave Request (already converted)
            const oldDateStr = format(parseISO(existingLeave.date), 'dd/MM/yyyy');
            let updatedLeave: LeaveRequest | undefined;

            // If the reason already has "[Đã đổi]", keep it exactly as is to preserve the original date.
            // Otherwise, if it has "[Tự động]", convert it to "[Đã đổi] Nghỉ bù từ DD/MM/YYYY".
            const reason = existingLeave.reason.includes('[Đã đổi]')
                ? existingLeave.reason
                : existingLeave.reason.includes('[Tự động]')
                    ? `[Đã đổi] Nghỉ bù từ ${oldDateStr}`
                    : existingLeave.reason;

            // Find and construct updated leave
            updatedLeave = {
                ...existingLeave,
                date: editingAutoLeave.date,
                shift: editingAutoLeave.shift,
                status: 'Pending',
                reason
            };

            if (updatedLeave) leaveMutations.update.mutate(updatedLeave);

            // 2.2 Delete linked Schedule Item if it exists (for the OLD date)
            // Parse original date from reason "[Đã đổi] Nghỉ bù từ DD/MM/YYYY"
            let originalDate: string | null = null;
            const dateMatch = existingLeave.reason.match(/từ (\d{2})\/(\d{2})\/(\d{4})/);
            if (dateMatch) {
                originalDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
            }

            const restItem = schedule.find(s =>
                s.jobId === 'JOB_NGHI_BU' &&
                s.employeeIds.includes(existingLeave.employeeId) &&
                (
                    (originalDate && s.date === originalDate) ||
                    (isSameDay(parseISO(s.date), parseISO(existingLeave.date)) && s.shift === existingLeave.shift)
                )
            );

            if (restItem) {
                // Delete old rest item instead of updating — leave request already handles the new date
                scheduleMutations.remove.mutate(restItem.id);
            }
        }
        setEditingAutoLeave(null);
        toast.success("Đã cập nhật ngày/buổi nghỉ bù.");
    };

    // handleAddLeave wrapper to reset form after adding
    const handleAddLeave = async () => {
        const success = await addLeaveHandler(newLeave);
        if (success) {
            setNewLeave({ shift: 'Sáng', reason: '', date: '', leaveType: 'Regular' });
        }
    };

    // Leave handlers (handleDeleteLeave, handleApproveLeave, handleRejectLeave, handleUnapproveLeave) 
    // are now provided by useLeaveHandlers hook

    return {
        // State
        employees, jobs, subJobs, schedule, allocations, leaves,
        currentEmployeeId, setCurrentEmployeeId,
        isManager,
        activeEmployees,
        fromDate, setFromDate, toDate, setToDate, datePreset, setDatePreset,
        filterShift, setFilterShift,
        filterStatus, setFilterStatus,
        activeTab, setActiveTab,
        localAllocations, isDirty,
        filterJobIds, setFilterJobIds, showJobFilter, setShowJobFilter,
        selectedTask, setSelectedTask,
        actionNote, setActionNote,
        editingRestItem, setEditingRestItem,
        editingAutoLeave, setEditingAutoLeave,
        newLeave, setNewLeave,
        viewingDetailItem, setViewingDetailItem,
        weeklyViewDate, setWeeklyViewDate,
        showWeeklyTable, setShowWeeklyTable,
        trainingMetrics, setTrainingMetrics,
        // Computed
        myFixedSchedule,
        displayedFixedSchedule,
        myDailyAllocations,
        unifiedLeaves,
        leaveBalance,
        // Helpers
        getJob, getSubJobs, isDateInRange,
        // Handlers
        handlePresetChange,
        handleUpdateProgress, handleSaveProgress,
        handleTaskAction, handleQuickComplete,
        handleSaveRestItem, handleSaveAutoLeave,
        handleAddLeave, handleDeleteLeave,
        handleApproveLeave, handleRejectLeave, handleUnapproveLeave
    };
};
