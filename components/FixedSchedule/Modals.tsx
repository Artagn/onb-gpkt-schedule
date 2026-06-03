
import React, { useState, useEffect, useMemo } from 'react';
import { format, isSameDay, addDays, getDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { AlertOctagon, AlertTriangle, CheckSquare, Plus, Settings, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';
import { scheduleService, leavesService } from '../../services/firestoreService';
import { ScheduleItem, LeaveRequest, Job,  Employee, SchedulePattern } from '../../types';
import { useQueryClient } from '@tanstack/react-query';
import { SCHEDULE_KEYS } from '../../hooks/useSchedulesQuery';
import { LEAVE_KEYS } from '../../hooks/useLeavesQuery';
import { LEAVE_BALANCE_KEYS } from '../../hooks/useLeaveBalanceQuery';
import { LEAVE_BALANCE_HISTORY_KEYS } from '../../hooks/useLeaveBalanceHistory';

// ===================== SECURITY MODAL =====================

export const SecurityModal = ({ show, onClose, onConfirm, codeInput, setCodeInput, error }: any) => {
    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm m-4 shadow-2xl border-2 border-indigo-100">
                <div className="flex flex-col items-center mb-4">
                    <div className="bg-indigo-100 p-3 rounded-full mb-3">
                        <span className="text-3xl">🔒</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">Xác thực Bảo mật</h3>
                    <p className="text-sm text-gray-500 text-center mt-1">Tính năng này sẽ thay đổi lớn dữ liệu.<br />Vui lòng nhập mã xác nhận để tiếp tục.</p>
                </div>

                <div className="mb-4">
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Mã xác nhận</label>
                    <input
                        type="password"
                        autoFocus
                        className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 text-center text-lg font-bold tracking-widest focus:border-indigo-500 focus:ring-0 outline-none"
                        placeholder="• • •"
                        value={codeInput}
                        onChange={e => setCodeInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && onConfirm()}
                    />
                    {error && <div className="text-red-500 text-sm mt-2 text-center font-medium animate-pulse">{error}</div>}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors"
                    >
                        Hủy bỏ
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-lg shadow-indigo-200 transition-all active:scale-95"
                    >
                        Xác nhận
                    </button>
                </div>
            </div>
        </div>
    );
};

// ===================== ASSIGN MODAL =====================

interface AssignModalProps {
    showModal: { day: Date, shift: string, empId: string } | null;
    onClose: () => void;
    activeEmployees: Employee[];
    schedule: ScheduleItem[];
    setSchedule: (val: ScheduleItem[]) => void;
    leaves: LeaveRequest[];
    setLeaves: React.Dispatch<React.SetStateAction<LeaveRequest[]>>;
    jobs: Job[];
    patterns: SchedulePattern[];
    canEdit: boolean;
    getJobStyle: (g: string | null | undefined) => string;
    isWorkShiftActive: (d: Date, s: string) => { isActive: boolean, reason?: string };
    createRestItem: (id: string, d: Date) => ScheduleItem;
}

export const AssignModal: React.FC<AssignModalProps> = ({
    showModal, onClose, activeEmployees, schedule, setSchedule, leaves, setLeaves, jobs, patterns, canEdit, getJobStyle, isWorkShiftActive, createRestItem
}) => {
    const queryClient = useQueryClient();
    const [adHocJobId, setAdHocJobId] = useState('');
    const [manualCoefficient, setManualCoefficient] = useState(1);

    // Reset state when modal opens for a new cell
    useEffect(() => {
        if (showModal) {
            setAdHocJobId('');
            setManualCoefficient(1);
        }
    }, [showModal]);

    if (!showModal) return null;
    const { day, shift, empId } = showModal;
    const emp = activeEmployees.find(e => e.id === empId);
    const slotItems = schedule.filter(s => isSameDay(new Date(s.date), day) && s.shift === shift);
    const assignedToMe = slotItems.filter(s => s.employeeIds.includes(empId));

    // Available slots: exclude empty ad-hoc items (no pattern, no employees assigned)
    const dayIndex = getDay(day) === 0 ? 6 : getDay(day) - 1;
    const available = slotItems.filter(s => {
        if (s.employeeIds.includes(empId)) return false;
        if (s.employeeIds.length >= (s.requiredCount || 1)) return false;

        // If item has employees, it's still a valid slot
        if (s.employeeIds.length > 0) return true;

        // If empty, check if has a matching pattern (from Cấu hình mẫu)
        const hasPattern = patterns.some(p =>
            p.dayIndex === dayIndex &&
            p.shift === shift &&
            p.jobId === s.jobId
        );
        return hasPattern;
    });
    const pendingLeave = leaves.find(l => l.employeeId === empId && isSameDay(new Date(l.date), day) && l.shift === shift && l.status === 'Pending');
    const workStatus = isWorkShiftActive(day, shift);

    // Unfulfilled Patterns (dayIndex already computed above)
    const relevantPatterns = patterns.filter(p => p.dayIndex === dayIndex && p.shift === shift);
    const unfulfilledPatterns = relevantPatterns.map(p => {
        const job = jobs.find(j => j.id === p.jobId);
        const existingItems = schedule.filter(s => isSameDay(new Date(s.date), day) && s.shift === shift && s.jobId === p.jobId);
        const totalAssignedCount = existingItems.reduce((acc, item) => acc + item.employeeIds.length, 0);
        const remainingNeeded = p.requiredCount - totalAssignedCount;
        return { pattern: p, job, remaining: remainingNeeded > 0 ? remainingNeeded : 0, existingItems };
    }).filter(item => item.remaining > 0);

    // --- CONFLICT DETECTION (computed, not a hook) ---
    const conflicts = (() => {
        const warnings: { type: 'same_day' | 'nghi_bu', message: string, severity: 'warning' | 'info' }[] = [];

        // Check if busy in other shifts today
        const otherShifts = ['Sáng', 'Chiều', 'Tối'].filter(s => s !== shift);
        otherShifts.forEach(s => {
            const busyItem = schedule.find(item =>
                isSameDay(new Date(item.date), day) &&
                item.shift === s &&
                item.employeeIds.includes(empId) &&
                item.jobId !== 'JOB_NGHI_BU'
            );
            if (busyItem) {
                const job = jobs.find(j => j.id === busyItem.jobId);
                warnings.push({
                    type: 'same_day',
                    message: `Đã có lịch ca ${s} cùng ngày (${job?.name || 'Công việc'})`,
                    severity: 'warning'
                });
            }
        });

        // Check evening→morning conflict (nghỉ bù)
        if (shift === 'Sáng') {
            const yesterday = addDays(day, -1);
            const hadEvening = schedule.some(item =>
                isSameDay(new Date(item.date), yesterday) &&
                item.shift === 'Tối' &&
                item.employeeIds.includes(empId) &&
                item.jobId !== 'JOB_NGHI_BU'
            );
            if (hadEvening) {
                warnings.push({
                    type: 'nghi_bu',
                    message: 'Có ca tối hôm trước → Nên được nghỉ bù sáng hôm nay',
                    severity: 'info'
                });
            }
        }

        // Check if assigning evening will conflict with existing morning next day
        if (shift === 'Tối') {
            const tomorrow = addDays(day, 1);
            const hasMorningNext = schedule.some(item =>
                isSameDay(new Date(item.date), tomorrow) &&
                item.shift === 'Sáng' &&
                item.employeeIds.includes(empId) &&
                item.jobId !== 'JOB_NGHI_BU'
            );
            if (hasMorningNext) {
                warnings.push({
                    type: 'nghi_bu',
                    message: 'Đã có lịch sáng ngày mai → Gán ca tối sẽ xung đột nghỉ bù',
                    severity: 'warning'
                });
            }
        }

        return warnings;
    })();


    // --- HANDLERS ---

    const toggleAssignment = async (itemId: string, jobId: string, isAdding: boolean) => {
        let nextSchedule = [...schedule];
        const updates: Promise<void>[] = [];
        const itemIndex = nextSchedule.findIndex(s => s.id === itemId);

        if (itemIndex > -1) {
            const s = nextSchedule[itemIndex];
            let updated: ScheduleItem;
            if (isAdding) {
                updated = { ...s, employeeIds: [...s.employeeIds, empId], status: 'Pending', note: '' };
            } else {
                updated = { ...s, employeeIds: s.employeeIds.filter(id => id !== empId) };
            }
            nextSchedule[itemIndex] = updated;
            updates.push(scheduleService.save(updated));
        }

        // Logic handled in useFixedSchedule usually, but here reproduced or called? 
        // For simplicity, we are duplicating the "Add/Remove Rest Day" logic here because it's tightly coupled with this Modal's action.
        // Ideally this should be a helper in the hook passed down, but let's keep it here to avoid passing 10 functions.

        if (isAdding && shift === 'Tối') {
            const restItem = createRestItem(empId, day);
            const alreadyHasRest = nextSchedule.some(s => isSameDay(new Date(s.date), new Date(restItem.date)) && s.shift === 'Sáng' && s.employeeIds.includes(empId));
            if (!alreadyHasRest) {
                nextSchedule.push(restItem);
                updates.push(scheduleService.save(restItem));
                const nextDay = addDays(day, 1);
                const leaveId = `leave_auto_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                const autoLeaveRequest: LeaveRequest = {
                    id: leaveId,
                    employeeId: empId,
                    date: format(nextDay, 'yyyy-MM-dd'),
                    shift: 'Sáng',
                    reason: '[Tự động] Nghỉ bù sau ca tối',
                    status: 'Pending'
                };
                queryClient.setQueryData<LeaveRequest[]>(LEAVE_KEYS.all, (old = []) => [...old, autoLeaveRequest]);
                updates.push(leavesService.save(autoLeaveRequest));
            }
        }

        if (!isAdding && shift === 'Tối') {
            const nextDay = addDays(day, 1);
            const restDayIndex = nextSchedule.findIndex(s => isSameDay(new Date(s.date), nextDay) && s.shift === 'Sáng' && s.employeeIds.includes(empId) && s.jobId === 'JOB_NGHI_BU');
            if (restDayIndex > -1) {
                const s = nextSchedule[restDayIndex];
                const updatedEmployees = s.employeeIds.filter(id => id !== empId);
                if (updatedEmployees.length === 0) {
                    nextSchedule = nextSchedule.filter((_, idx) => idx !== restDayIndex);
                    updates.push(scheduleService.delete(s.id));
                } else {
                    const updated = { ...s, employeeIds: updatedEmployees };
                    nextSchedule[restDayIndex] = updated;
                    updates.push(scheduleService.save(updated));
                }
                const leaveToDelete = leaves.find(leave => leave.employeeId === empId && isSameDay(new Date(leave.date), nextDay) && leave.shift === 'Sáng' && leave.reason.includes('[Tự động]'));
                if (leaveToDelete) {
                    queryClient.setQueryData<LeaveRequest[]>(LEAVE_KEYS.all, (old = []) => old.filter(l => l.id !== leaveToDelete.id));
                    updates.push(leavesService.delete(leaveToDelete.id));
                }
            }
        }

        queryClient.setQueryData<ScheduleItem[]>(SCHEDULE_KEYS.all, nextSchedule);
        await Promise.all(updates);
        queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.all });
        queryClient.invalidateQueries({ queryKey: LEAVE_KEYS.all });
    };

    // Toggle status between Pending and Completed
    const toggleStatus = async (itemId: string) => {
        const nextSchedule = [...schedule];
        const itemIndex = nextSchedule.findIndex(s => s.id === itemId);
        if (itemIndex === -1) return;

        const item = nextSchedule[itemIndex];
        const newStatus = item.status === 'Completed' ? 'Pending' : 'Completed';
        const updated = { ...item, status: newStatus as 'Pending' | 'Completed' };
        nextSchedule[itemIndex] = updated;

        queryClient.setQueryData<ScheduleItem[]>(SCHEDULE_KEYS.all, nextSchedule);
        await scheduleService.save(updated);
        queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.all });

        // Invalidate leave balance caches (Cloud Function will update balance)
        item.employeeIds.forEach(empId => {
            queryClient.invalidateQueries({ queryKey: LEAVE_BALANCE_KEYS.byEmployee(empId) });
            queryClient.invalidateQueries({ queryKey: LEAVE_BALANCE_HISTORY_KEYS.byEmployee(empId) });
        });

        toast.success(newStatus === 'Completed' ? 'Đã đánh dấu hoàn thành' : 'Đã gỡ trạng thái hoàn thành');
    };

    const handleAssignPattern = async (jobId: string, requiredCount: number) => {
        const nextSchedule = [...schedule];
        const updates: Promise<void>[] = [];
        const existingItemIndex = nextSchedule.findIndex(s => isSameDay(new Date(s.date), day) && s.shift === shift && s.jobId === jobId && s.employeeIds.length < (s.requiredCount || 1));

        if (existingItemIndex > -1) {
            const existingItem = nextSchedule[existingItemIndex];
            const updated = { ...existingItem, employeeIds: [...existingItem.employeeIds, empId], status: 'Pending' as const };
            nextSchedule[existingItemIndex] = updated;
            updates.push(scheduleService.save(updated));
        } else {
            const newItem: ScheduleItem = {
                id: `manual_pat_${day.getTime()}_${jobId}_${Math.random()}`,
                date: format(day, 'yyyy-MM-dd'),
                shift: shift as any,
                jobId: jobId,
                employeeIds: [empId],
                isFixed: true,
                requiredCount: requiredCount,
                status: 'Pending'
            };
            nextSchedule.push(newItem);
            updates.push(scheduleService.save(newItem));
        }

        if (shift === 'Tối') {
            const restItem = createRestItem(empId, day);
            const alreadyHasRest = nextSchedule.some(s => isSameDay(new Date(s.date), new Date(restItem.date)) && s.shift === 'Sáng' && s.employeeIds.includes(empId));
            if (!alreadyHasRest) {
                nextSchedule.push(restItem);
                updates.push(scheduleService.save(restItem));
            }
        }
        queryClient.setQueryData<ScheduleItem[]>(SCHEDULE_KEYS.all, nextSchedule);
        await Promise.all(updates);
        queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.all });
    };

    const handleManualAdd = async () => {
        if (!adHocJobId) return;
        const validCoefficient = Math.max(1.0, Math.min(20.0, manualCoefficient));
        if (validCoefficient !== manualCoefficient) toast(` Hệ số điểm phải trong khoảng 1.0 - 20.0. Đã điều chỉnh: ${validCoefficient}`, { icon: '⚠️' });

        const nextSchedule = [...schedule];
        const updates: Promise<void>[] = [];
        const newId = `manual_${day.getTime()}_${adHocJobId}_${shift}_${Date.now()}`;
        const newItem: ScheduleItem = {
            id: newId, date: format(day, 'yyyy-MM-dd'), shift: shift as any, jobId: adHocJobId, employeeIds: [empId], isFixed: true, requiredCount: 1, coefficient: validCoefficient, status: 'Pending'
        };
        nextSchedule.push(newItem);
        updates.push(scheduleService.save(newItem));

        if (shift === 'Tối') {
            const restItem = createRestItem(empId, day);
            const alreadyHasRest = nextSchedule.some(s => isSameDay(new Date(s.date), new Date(restItem.date)) && s.shift === 'Sáng' && s.employeeIds.includes(empId));
            if (!alreadyHasRest) {
                nextSchedule.push(restItem);
                updates.push(scheduleService.save(restItem));
            }
        }
        queryClient.setQueryData<ScheduleItem[]>(SCHEDULE_KEYS.all, nextSchedule);
        setAdHocJobId('');
        setManualCoefficient(1);
        await Promise.all(updates);
        queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.all });
        queryClient.invalidateQueries({ queryKey: LEAVE_KEYS.all });
    };

    const handleApproveLeave = async () => {
        if (!pendingLeave) return;
        const nextSchedule = schedule.map(s => {
            if (isSameDay(new Date(s.date), day) && s.shift === shift && s.employeeIds.includes(empId)) {
                return { ...s, employeeIds: s.employeeIds.filter(id => id !== empId) };
            }
            return s;
        });
        queryClient.setQueryData<ScheduleItem[]>(SCHEDULE_KEYS.all, nextSchedule);
        const modifiedItems = nextSchedule.filter(s => isSameDay(new Date(s.date), day) && s.shift === shift);
        const updates = modifiedItems.map(s => scheduleService.save(s));
        const updatedLeave = { ...pendingLeave, status: 'Approved' as const };
        queryClient.setQueryData<LeaveRequest[]>(LEAVE_KEYS.all, (old = []) => old.map(l => l.id === pendingLeave.id ? updatedLeave : l));
        updates.push(leavesService.save(updatedLeave));
        await Promise.all(updates);
        queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.all });
        queryClient.invalidateQueries({ queryKey: LEAVE_KEYS.all });
        toast.success(`Đã duyệt đơn nghỉ. ${emp?.fullName} đã được gỡ khỏi các công việc.`);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <h3 className="font-bold text-lg mb-1">{emp?.fullName}</h3>
                <p className="text-sm text-gray-500 mb-4">{format(day, 'EEEE dd/MM', { locale: vi })} - Buổi {shift}</p>

                {!workStatus.isActive && (<div className="mb-4 bg-red-50 border border-red-200 p-3 rounded flex items-start"><AlertOctagon className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" /><div><h4 className="text-sm font-bold text-red-800">Lịch năm: Không làm việc</h4><p className="text-xs text-red-600 mt-1">{workStatus.reason}</p></div></div>)}
                {pendingLeave && (<div className="mb-4 bg-yellow-50 border border-yellow-200 p-3 rounded"><h4 className="text-sm font-bold text-yellow-800 flex items-center mb-1"><AlertTriangle className="w-4 h-4 mr-1" /> Đơn xin nghỉ đang chờ duyệt</h4><p className="text-xs text-yellow-700 mb-2">Lý do: {pendingLeave.reason}</p><button onClick={handleApproveLeave} className="w-full py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-sm font-medium transition-colors">Duyệt nghỉ & Gỡ lịch làm việc</button></div>)}

                {/* CONFLICT WARNING BANNER */}
                {conflicts.length > 0 && (
                    <div className="mb-4 bg-amber-50 border border-amber-300 p-3 rounded-lg shadow-sm">
                        <h4 className="text-sm font-bold text-amber-800 flex items-center mb-2">
                            <AlertTriangle className="w-4 h-4 mr-1.5" />
                            Cảnh báo xung đột ({conflicts.length})
                        </h4>
                        <ul className="space-y-1">
                            {conflicts.map((c, i) => (
                                <li key={i} className={`text-xs flex items-start gap-1.5 ${c.severity === 'warning' ? 'text-amber-700' : 'text-amber-600'}`}>
                                    <span className="mt-0.5">{c.severity === 'warning' ? '⚠️' : 'ℹ️'}</span>
                                    <span>{c.message}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-[10px] text-amber-600 mt-2 italic">Bạn vẫn có thể gán, nhưng hãy cân nhắc lịch làm việc hợp lý.</p>
                    </div>
                )}

                <div className="space-y-4 overflow-y-auto pr-2 flex-1">
                    {/* 1. ASSIGNED TO ME */}
                    <div>
                        <h4 className="text-xs font-bold uppercase text-green-600 mb-2 flex items-center"><CheckSquare className="w-3 h-3 mr-1" /> Đang phân công</h4>
                        <div className="space-y-2">
                            {assignedToMe.length === 0 && <p className="text-xs text-gray-400 italic">Chưa được phân công công việc nào.</p>}
                            {assignedToMe.map(item => {
                                const j = item.jobId === 'JOB_NGHI_BU' ? { name: 'Nghỉ bù', group: null } : jobs.find(job => job.id === item.jobId);
                                const styleClass = getJobStyle(j?.group as string);
                                const isCompleted = item.status === 'Completed';
                                return (
                                    <div key={item.id} className={`flex flex-col gap-1 border p-2 rounded text-sm ${styleClass}`}>
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium">{j?.name}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isCompleted ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                {isCompleted ? '✓ HT' : '⏳ Chờ'}
                                            </span>
                                        </div>
                                        <div className="flex gap-1 justify-end">
                                            {isCompleted && (
                                                <button
                                                    onClick={() => toggleStatus(item.id)}
                                                    className="text-orange-600 text-xs bg-orange-50 hover:bg-orange-100 px-2 py-0.5 rounded border border-orange-200"
                                                >
                                                    Gỡ HT
                                                </button>
                                            )}
                                            {!isCompleted && (
                                                <button
                                                    onClick={() => toggleStatus(item.id)}
                                                    className="text-green-600 text-xs bg-green-50 hover:bg-green-100 px-2 py-0.5 rounded border border-green-200"
                                                >
                                                    ✓ HT
                                                </button>
                                            )}
                                            <button onClick={() => toggleAssignment(item.id, item.jobId, false)} className="text-red-500 text-xs hover:bg-red-50 bg-white px-2 py-0.5 rounded border border-red-200">Gỡ</button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* 2. UNFULFILLED PATTERNS */}
                    {unfulfilledPatterns.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold uppercase text-purple-600 mb-2 flex items-center"><Briefcase className="w-3 h-3 mr-1" /> Nhiệm vụ cần phân công (Theo mẫu)</h4>
                            <div className="space-y-2">
                                {unfulfilledPatterns.map((item, idx) => {
                                    return (
                                        <div key={`pat_${idx}`} className={`flex justify-between items-center border border-purple-200 bg-purple-50 p-2 rounded text-sm cursor-pointer hover:bg-purple-100 transition-colors`} onClick={() => handleAssignPattern(item.pattern.jobId, item.pattern.requiredCount)}>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-purple-900">{item.job?.name}</span>
                                                <span className="text-[10px] text-purple-600">Thiếu: {item.remaining} người</span>
                                            </div>
                                            <div className="flex items-center text-purple-600 text-xs bg-white px-2 py-1 rounded border border-purple-200 shadow-sm font-medium">
                                                <Plus className="w-3 h-3 mr-1" /> Gán
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* 3. AVAILABLE */}
                    <div>
                        <h4 className="text-xs font-bold uppercase text-blue-600 mb-2 flex items-center"><Settings className="w-3 h-3 mr-1" /> Slot khả dụng khác</h4>
                        <div className="space-y-2">
                            {available.length === 0 && <p className="text-xs text-gray-400 italic">Không có slot trống nào khác.</p>}
                            {available.map(item => {
                                if (item.jobId === 'JOB_NGHI_BU') return null;
                                const j = jobs.find(job => job.id === item.jobId);
                                const styleClass = getJobStyle(j?.group);
                                return (
                                    <div key={item.id} className={`flex justify-between items-center border border-gray-200 p-2 rounded text-sm hover:opacity-80 cursor-pointer ${styleClass}`} onClick={() => toggleAssignment(item.id, item.jobId, true)}>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{j?.name}</span>
                                            <span className="text-[10px] opacity-70">Đã gán: {item.employeeIds.length}/{item.requiredCount || 1}</span>
                                        </div>
                                        <Plus className="w-4 h-4" />
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* 4. MANUAL ADD */}
                    {canEdit && (
                        <div className="pt-4 border-t border-gray-100">
                            <h4 className="text-xs font-bold uppercase text-orange-600 mb-2">Thêm công việc ngoài lịch</h4>
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-2">
                                    <select className="flex-1 border rounded text-sm p-1.5 outline-none focus:ring-1 focus:ring-orange-300" value={adHocJobId} onChange={e => setAdHocJobId(e.target.value)}>
                                        <option value="">-- Chọn công việc --</option>
                                        {jobs.filter(j => j.isActive).map(j => (<option key={j.id} value={j.id}>{j.name}</option>))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center border rounded px-2 py-1 bg-gray-50" title="Hệ số điểm (1.0 - 20.0)">
                                        <span className="text-xs font-bold text-gray-500 mr-1">Hệ số:</span>
                                        <input
                                            type="number" min="1" max="20" step="0.1"
                                            className="w-14 text-sm p-0.5 text-center font-bold text-orange-600 outline-none bg-transparent"
                                            value={manualCoefficient}
                                            onChange={(e) => setManualCoefficient(parseFloat(e.target.value) || 1)}
                                        />
                                    </div>
                                    <button disabled={!adHocJobId} onClick={handleManualAdd} className="flex-1 bg-orange-500 text-white px-3 py-1.5 rounded text-sm hover:bg-orange-600 disabled:bg-gray-300 transition-colors font-medium">Thêm</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="mt-4 flex justify-end"><button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded text-sm">Đóng</button></div>
            </div>
        </div>
    );
};
