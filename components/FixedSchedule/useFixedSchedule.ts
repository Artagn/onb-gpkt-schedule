
import { useState, useEffect, useMemo } from 'react';
import { startOfWeek, addDays, isSameDay, isSameWeek, isSameMonth, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval, startOfDay, endOfDay, getDay, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { scheduleService, patternsService, leavesService, saveCollection, deleteBatch, COLLECTIONS, auditService } from '../../services/firestoreService';
import { appConfigService } from '../../services/appConfigService';
import { generateWeeklySchedule } from '../../services/schedulerEngine';
import { useQueryClient } from '@tanstack/react-query';
import { useScheduleMutations, SCHEDULE_KEYS } from '../../hooks/useSchedulesQuery';
import { usePatternMutations, PATTERN_KEYS } from '../../hooks/useConfigQuery';
import { useLeaveMutations, LEAVE_KEYS } from '../../hooks/useLeavesQuery';
import { Employee, Job, ScheduleItem, SchedulePattern, JobGroup, Status, WorkPeriod, Holiday, LeaveRequest, Role } from '../../types';

export const useFixedSchedule = (
    employees: Employee[],
    setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>,
    jobs: Job[],
    schedule: ScheduleItem[],
    setSchedule: React.Dispatch<React.SetStateAction<ScheduleItem[]>>,
    patterns: SchedulePattern[],
    setPatterns: React.Dispatch<React.SetStateAction<SchedulePattern[]>>,
    workPeriods: WorkPeriod[],
    holidays: Holiday[],
    leaves: LeaveRequest[],
    setLeaves: React.Dispatch<React.SetStateAction<LeaveRequest[]>>,
    currentUserRole: Role,
    user: any
) => {
    const queryClient = useQueryClient();
    const scheduleMutations = useScheduleMutations();
    const patternMutations = usePatternMutations();
    const leaveMutations = useLeaveMutations();
    // --- STATE ---
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isConfigMode, setIsConfigMode] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState<{ day: Date, shift: string, empId: string } | null>(null);
    const [isScheduling, setIsScheduling] = useState(false);

    // Preview Mode State
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewResult, setPreviewResult] = useState<ReturnType<typeof generateWeeklySchedule> | null>(null);

    // Copy-Paste State
    const [selectedCell, setSelectedCell] = useState<{ empId: string, day: Date, shift: string } | null>(null);
    const [clipboard, setClipboard] = useState<{ empId: string, day: Date, shift: string, items: ScheduleItem[] } | null>(null);

    // Config Mode State
    const [editingPattern, setEditingPattern] = useState<Partial<SchedulePattern> | null>(null);
    const [showImport, setShowImport] = useState(false);
    const [importText, setImportText] = useState('');
    const [configFilterDay, setConfigFilterDay] = useState('All');
    const [configFilterShift, setConfigFilterShift] = useState('All');
    const [patternSearchQuery, setPatternSearchQuery] = useState('');
    const [selectedPatternIds, setSelectedPatternIds] = useState<string[]>([]);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean, type: 'single' | 'bulk', id?: string } | null>(null);

    // Security Modal (Auto Schedule)
    const [showSecurityModal, setShowSecurityModal] = useState(false);
    const [securityCodeInput, setSecurityCodeInput] = useState('');
    const [securityError, setSecurityError] = useState('');

    // Week Lock
    const [unlockedWeeks, setUnlockedWeeks] = useState<string[]>(() => {
        try {
            return JSON.parse(localStorage.getItem('unlockedWeeks') || '[]');
        } catch (e) {
            console.error("Error parsing unlockedWeeks:", e);
            return [];
        }
    });

    // --- DERIVED STATE ---
    const startOfCurrentWeek = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(startOfCurrentWeek, i)), [startOfCurrentWeek]);

    // Compute Scored Employees (Memoized)
    const scoredEmployees = useMemo(() => {
        const scoreMap = new Map<string, { weekly: number, monthly: number }>();
        employees.forEach(emp => scoreMap.set(emp.id, { weekly: 0, monthly: 0 }));

        schedule.forEach(item => {
            if (item.jobId === 'JOB_NGHI_BU') return;
            const itemDate = new Date(item.date);
            const job = jobs.find(j => j.id === item.jobId);
            if (!job) return;

            const isCurrentWeek = isSameWeek(itemDate, selectedDate, { weekStartsOn: 1 });
            const isCurrentMonth = isSameMonth(itemDate, selectedDate);
            const points = job.standardPoint * (item.coefficient || 1);

            item.employeeIds.forEach(empId => {
                if (scoreMap.has(empId)) {
                    const current = scoreMap.get(empId)!;
                    if (isCurrentWeek) current.weekly += points;
                    if (isCurrentMonth) current.monthly += points;
                }
            });
        });

        return employees.map(emp => {
            const scores = scoreMap.get(emp.id);
            if (!scores) return emp;
            return {
                ...emp,
                weeklyScore: parseFloat(scores.weekly.toFixed(2)),
                monthlyScore: parseFloat(scores.monthly.toFixed(2))
            };
        });
    }, [employees, schedule, selectedDate, jobs]);

    const activeEmployees = useMemo(() => scoredEmployees.filter(e => e.status === Status.Active).sort((a, b) => (a.stt || 9999) - (b.stt || 9999)), [scoredEmployees]);
    const canEdit = currentUserRole === Role.Admin || currentUserRole === Role.Coordinator;

    const getWeekKey = (date: Date) => format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const currentWeekKey = getWeekKey(selectedDate);
    const todayWeekKey = getWeekKey(new Date());
    const isPastWeek = currentWeekKey < todayWeekKey;
    const isWeekUnlocked = unlockedWeeks.includes(currentWeekKey);
    const isWeekEditable = canEdit && (!isPastWeek || isWeekUnlocked);

    // --- HELPERS ---
    const getJobStyle = (group: JobGroup | null | undefined) => {
        if (!group) return 'bg-gray-200 text-gray-600 italic border-gray-300';
        switch (group) {
            case JobGroup.Training: return 'bg-blue-100 border-blue-200 text-blue-800';
            case JobGroup.Livechat: return 'bg-purple-100 border-purple-200 text-purple-800';
            case JobGroup.Daily: return 'bg-emerald-100 border-emerald-200 text-emerald-800';
            case JobGroup.Other: return 'bg-orange-100 border-orange-200 text-orange-800';
            default: return 'bg-slate-100 border-slate-200 text-slate-800';
        }
    };

    const isWorkShiftActive = (date: Date, shift: string): { isActive: boolean, reason?: string } => {
        const holiday = holidays.find(h => isSameDay(new Date(h.date), date));
        if (holiday) return { isActive: false, reason: `Nghỉ lễ: ${holiday.name}` };
        const period = workPeriods.find(p => isWithinInterval(date, { start: startOfDay(new Date(p.startDate)), end: endOfDay(new Date(p.endDate)) }));
        if (!period) return { isActive: true };
        let dayIndex = date.getDay() - 1;
        if (dayIndex === -1) dayIndex = 6;
        const dayConfig = period.days[dayIndex as 0 | 1 | 2 | 3 | 4 | 5 | 6];
        if (!dayConfig) return { isActive: true };
        const shiftKey = shift === 'Sáng' ? 'morning' : shift === 'Chiều' ? 'afternoon' : 'evening';
        if (!dayConfig[shiftKey]) return { isActive: false, reason: `Lịch năm: ${period.name} (Nghỉ)` };
        return { isActive: true };
    };

    const createRestItem = (empId: string, eveningDate: Date): ScheduleItem => {
        const nextDay = addDays(eveningDate, 1);
        return {
            id: `rest_${empId}_${nextDay.getTime()}_${Math.random()}`,
            date: nextDay.toISOString(),
            shift: 'Sáng',
            jobId: 'JOB_NGHI_BU',
            employeeIds: [empId],
            isFixed: true,
            requiredCount: 1,
            status: 'Pending',
            note: 'Nghỉ bù ca tối hôm trước'
        };
    };

    // --- OPTIMIZED LOOKUPS ---
    const scheduleMap = useMemo(() => {
        const map = new Map<string, ScheduleItem[]>();
        const weekStart = startOfCurrentWeek;
        const weekEnd = addDays(weekStart, 6);

        schedule.forEach(item => {
            const itemDate = new Date(item.date);
            if (isWithinInterval(itemDate, { start: weekStart, end: weekEnd })) {
                const dateKey = format(itemDate, 'yyyy-MM-dd');
                item.employeeIds.forEach(empId => {
                    const key = `${dateKey}_${item.shift}_${empId}`;
                    if (!map.has(key)) map.set(key, []);
                    map.get(key)!.push(item);
                });
            }
        });
        return map;
    }, [schedule, startOfCurrentWeek]);

    const leaveMap = useMemo(() => {
        const map = new Map<string, LeaveRequest>();
        leaves.forEach(l => {
            const key = `${format(new Date(l.date), 'yyyy-MM-dd')}_${l.shift}_${l.employeeId}`;
            if (l.status === 'Approved' || l.status === 'Pending') {
                map.set(key, l);
            }
        });
        return map;
    }, [leaves]);


    // --- HANDLERS (WEEK LOCK) ---
    const toggleWeekLock = () => {
        setUnlockedWeeks(prev => {
            const newUnlocked = prev.includes(currentWeekKey) ? prev.filter(w => w !== currentWeekKey) : [...prev, currentWeekKey];
            localStorage.setItem('unlockedWeeks', JSON.stringify(newUnlocked));
            toast.success(newUnlocked.includes(currentWeekKey) ? 'Đã mở khóa tuần này' : 'Đã khóa tuần này');
            return newUnlocked;
        });
    };

    const clearWeekSchedule = async () => {
        const weekStart = format(startOfCurrentWeek, 'dd/MM');
        const weekEnd = format(addDays(startOfCurrentWeek, 6), 'dd/MM');

        if (!window.confirm(`Bạn có chắc chắn muốn XÓA TẤT CẢ lịch đã phân công trong tuần ${weekStart} - ${weekEnd}?\n\n⚠️ Hành động này KHÔNG THỂ hoàn tác!`)) {
            return;
        }

        const scheduleToDelete = schedule.filter(s => isSameWeek(new Date(s.date), selectedDate, { weekStartsOn: 1 }));
        const scheduleIds = scheduleToDelete.map(s => s.id);
        const leavesToDelete = leaves.filter(l => {
            const leaveDate = new Date(l.date);
            const isThisWeek = isSameWeek(leaveDate, selectedDate, { weekStartsOn: 1 });
            const isAutoLeave = l.reason?.includes('[Tự động]');
            return isThisWeek && isAutoLeave;
        });
        const leaveIds = leavesToDelete.map(l => l.id);

        const promises = [];
        if (scheduleIds.length > 0) promises.push(deleteBatch(COLLECTIONS.SCHEDULE, scheduleIds));
        if (leaveIds.length > 0) promises.push(deleteBatch(COLLECTIONS.LEAVES, leaveIds));

        await Promise.all(promises);

        // Invalidate Queries
        queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.all });
        queryClient.invalidateQueries({ queryKey: LEAVE_KEYS.all });

        toast.success(`Đã xóa ${scheduleIds.length} mục lịch và ${leaveIds.length} đơn nghỉ tự động.`);
    };

    // --- HANDLERS (AUTO SCHEDULE) ---

    // Step 1: Preview - Calculate schedule without saving
    const runPreview = () => {
        console.time("AutoSchedule-Preview");
        const result = generateWeeklySchedule({
            employees: activeEmployees,
            jobs,
            schedule,
            patterns,
            leaves,
            targetDate: selectedDate,
            holidays,
            workPeriods
        });
        console.timeEnd("AutoSchedule-Preview");
        setPreviewResult(result);
        setShowPreviewModal(true);
    };

    // Step 2: Apply - Save preview result to Firestore
    const applySchedule = async () => {
        if (!previewResult) return;

        setIsScheduling(true);
        const toastId = toast.loading('Đang lưu dữ liệu vào hệ thống...');

        try {
            queryClient.setQueryData<ScheduleItem[]>(SCHEDULE_KEYS.all, previewResult.newSchedule);

            // FIREBASE SYNC with Timeout Logic
            const itemsToSave = previewResult.newSchedule;
            const syncTask = async () => {
                const syncPromises = [];
                if (previewResult.itemsToDeleteIds.length > 0) {
                    syncPromises.push(deleteBatch(COLLECTIONS.SCHEDULE, previewResult.itemsToDeleteIds));
                }
                if (itemsToSave.length > 0) {
                    syncPromises.push(scheduleService.saveAll(itemsToSave));
                }
                await Promise.all(syncPromises);
                return 'SUCCESS';
            };

            const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve('TIMEOUT'), 10000));
            const raceResult = await Promise.race([syncTask(), timeoutPromise]);

            if (raceResult === 'TIMEOUT') {
                toast.success(`Đang tiếp tục lưu ngầm! Bạn có thể thao tác tiếp.`, { id: toastId, duration: 5000 });
            }

            // Audit Log
            auditService.log(
                'AUTO_SCHEDULE_RUN', 'Schedule', format(selectedDate, 'yyyy-MM-dd'),
                { targetDate: format(selectedDate, 'yyyy-MM-dd'), totalSlots: previewResult.stats.totalSlots, filledSlots: previewResult.stats.filledSlots },
                user?.email || 'Unknown'
            );

            toast.success(`Xếp lịch hoàn tất! ${previewResult.stats.filledSlots}/${previewResult.stats.totalSlots} slot.`, { id: toastId });

            // Invalidate after massive auto-schedule
            queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.all });

            // Close preview modal
            setShowPreviewModal(false);
            setPreviewResult(null);

        } catch (error) {
            console.error("Auto-schedule apply error:", error);
            const err = error as Error;
            if (err.message?.includes("QUOTA_EXCEEDED") || err.message?.includes("resource-exhausted")) {
                toast.error(`⚠️ ĐÃ HẾT HẠN NGẠCH MIỄN PHÍ CAO ĐIỂM!`, { id: toastId, duration: 10000 });
            } else {
                toast.error(`Lỗi lưu dữ liệu: ${err.message}`, { id: toastId });
            }
        } finally {
            setIsScheduling(false);
        }
    };

    // Legacy function for backward compatibility (if needed)
    const runAutoScheduleLogic = async () => {
        runPreview();
    };

    const confirmAutoSchedule = async () => {
        try {
            const config = await appConfigService.get();
            if (securityCodeInput !== config.autoScheduleCode) {
                setSecurityError('Mã xác nhận không đúng!');
                return;
            }
            setShowSecurityModal(false);
            runAutoScheduleLogic();
        } catch (error) {
            console.error(error);
            setSecurityError('Lỗi kiểm tra mã xác nhận.');
        }
    };

    // --- HANDLERS (PATTERNS) ---
    const handleSavePattern = async () => {
        if (!editingPattern || !editingPattern.shift || !editingPattern.jobId) {
            toast.error('Vui lòng điền đầy đủ.');
            return;
        }

        if (editingPattern.id) {
            patternMutations.update.mutate({ ...editingPattern } as SchedulePattern);
        } else {
            const newPattern = { ...editingPattern, id: `pat_${Date.now()}`, requiredCount: editingPattern.requiredCount || 1 } as SchedulePattern;
            patternMutations.add.mutate(newPattern);
        }
        setEditingPattern(null);
    };

    const confirmDelete = async () => {
        if (!deleteConfirmation) return;
        if (deleteConfirmation.type === 'single' && deleteConfirmation.id) {
            patternMutations.remove.mutate(deleteConfirmation.id);
            setSelectedPatternIds(prev => prev.filter(id => id !== deleteConfirmation.id));
        } else if (deleteConfirmation.type === 'bulk') {
            const ids = [...selectedPatternIds];
            // patternMutations.removeBatch.mutate(ids); // Assumed implementation
            // Fallback since removeBatch wasn't in list above explicitly or complicated:
            await deleteBatch(COLLECTIONS.PATTERNS, ids);
            queryClient.invalidateQueries({ queryKey: PATTERN_KEYS.all });
            setSelectedPatternIds([]);
            toast.success(`Đã xóa ${ids.length} mẫu lịch`);
        }
        setDeleteConfirmation(null);
    };

    const handleImportPatterns = () => {
        if (!importText.trim()) return;
        const lines = importText.trim().split('\n');
        const newPatterns: SchedulePattern[] = [];
        const dayMap: Record<string, number> = { 'Thứ 2': 0, 'Thứ 3': 1, 'Thứ 4': 2, 'Thứ 5': 3, 'Thứ 6': 4, 'Thứ 7': 5, 'Chủ nhật': 6 };

        lines.forEach(line => {
            let parts = line.split('\t');
            if (parts.length < 2) parts = line.split(',');
            if (parts.length >= 3) {
                const dayStr = parts[0].trim();
                const shiftStr = parts[1].trim();
                const jobName = parts[2].trim();
                const count = parseInt(parts[3]?.trim()) || 1;
                const dayIndex = dayMap[dayStr];
                const job = jobs.find(j => j.name === jobName);
                if (dayIndex !== undefined && job) {
                    newPatterns.push({ id: `pat_imp_${Date.now()}_${Math.random()}`, dayIndex, shift: shiftStr as any, jobId: job.id, requiredCount: count });
                }
            }
        });

        if (newPatterns.length > 0) {
            // Import logic for patterns - manual saveAll usually
            // We can rely on refetch
            const promises = newPatterns.map(p => patternsService.save(p));
            Promise.all(promises).then(() => {
                queryClient.invalidateQueries({ queryKey: PATTERN_KEYS.all });
                toast.success(`Đã nhập thành công ${newPatterns.length} mẫu lịch.`);
            });
            setImportText('');
            setShowImport(false);
        } else {
            toast.error('Không tìm thấy dữ liệu hợp lệ.');
        }
    };

    // ===================== COPY-PASTE HANDLERS =====================
    const copyCell = () => {
        if (!selectedCell) {
            toast.error('Chưa chọn ô để copy');
            return;
        }
        const { empId, day, shift } = selectedCell;
        const dateKey = format(day, 'yyyy-MM-dd');
        const items = schedule.filter(s =>
            format(new Date(s.date), 'yyyy-MM-dd') === dateKey &&
            s.shift === shift &&
            s.employeeIds.includes(empId)
        );
        if (items.length === 0) {
            toast.error('Ô trống, không có gì để copy');
            return;
        }
        setClipboard({ empId, day, shift, items });
        toast.success(`Đã copy ${items.length} công việc`);
    };

    const pasteCell = async () => {
        if (!selectedCell || !clipboard) {
            toast.error('Chưa có dữ liệu để paste');
            return;
        }
        const { empId: targetEmpId, day: targetDay, shift: targetShift } = selectedCell;
        const targetDateKey = format(targetDay, 'yyyy-MM-dd');

        // Check existing items at target
        const existingItems = schedule.filter(s =>
            format(new Date(s.date), 'yyyy-MM-dd') === targetDateKey &&
            s.shift === targetShift &&
            s.employeeIds.includes(targetEmpId)
        );
        if (existingItems.length > 0) {
            toast.error('Ô đích đã có lịch. Hãy xóa trước khi paste.');
            return;
        }

        const newItems: ScheduleItem[] = [];
        const updates: Promise<void>[] = [];

        for (const srcItem of clipboard.items) {
            // Skip nghỉ bù items - they are auto-created
            if (srcItem.jobId === 'JOB_NGHI_BU') continue;

            const newItem: ScheduleItem = {
                id: `paste_${targetDateKey}_${srcItem.jobId}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                date: targetDay.toISOString(),
                shift: targetShift as 'Sáng' | 'Chiều' | 'Tối',
                jobId: srcItem.jobId,
                employeeIds: [targetEmpId],
                isFixed: true,
                requiredCount: srcItem.requiredCount || 1,
                status: 'Pending'
            };
            newItems.push(newItem);
            updates.push(scheduleService.save(newItem));
        }

        // Handle ca Tối → create nghỉ bù next morning
        if (targetShift === 'Tối') {
            const restItem = createRestItem(targetEmpId, targetDay);
            const alreadyHasRest = schedule.some(s =>
                isSameDay(new Date(s.date), new Date(restItem.date)) &&
                s.shift === 'Sáng' &&
                s.employeeIds.includes(targetEmpId) &&
                s.jobId === 'JOB_NGHI_BU'
            );
            if (!alreadyHasRest) {
                newItems.push(restItem);
                updates.push(scheduleService.save(restItem));
            }
        }

        queryClient.setQueryData<ScheduleItem[]>(SCHEDULE_KEYS.all, (old = []) => [...old, ...newItems]);
        await Promise.all(updates);
        queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.all });
        toast.success(`Đã paste ${newItems.length} công việc`);
    };

    return {
        // State
        selectedDate, setSelectedDate,
        isConfigMode, setIsConfigMode,
        showAssignModal, setShowAssignModal,
        isScheduling,
        editingPattern, setEditingPattern,
        showImport, setShowImport,
        importText, setImportText,
        configFilterDay, setConfigFilterDay,
        configFilterShift, setConfigFilterShift,
        patternSearchQuery, setPatternSearchQuery,
        selectedPatternIds, setSelectedPatternIds,
        deleteConfirmation, setDeleteConfirmation,
        showSecurityModal, setShowSecurityModal,
        securityCodeInput, setSecurityCodeInput,
        securityError, setSecurityError,
        unlockedWeeks,
        // Preview Mode State
        showPreviewModal, setShowPreviewModal,
        previewResult,
        // Computed
        startOfCurrentWeek, weekDays, activeEmployees, canEdit,
        isPastWeek, isWeekUnlocked, isWeekEditable,
        scheduleMap, leaveMap,
        // Helpers
        getJobStyle, isWorkShiftActive, createRestItem,
        // Handlers
        toggleWeekLock, clearWeekSchedule,
        runPreview, applySchedule, runAutoScheduleLogic, confirmAutoSchedule,
        handleSavePattern, confirmDelete, handleImportPatterns,
        // Copy-Paste
        selectedCell, setSelectedCell, clipboard,
        copyCell, pasteCell
    };
};
