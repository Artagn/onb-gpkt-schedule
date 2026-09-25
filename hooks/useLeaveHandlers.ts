/**
 * useLeaveHandlers - Leave request management handlers
 * Extracted from useMyTasks.ts for separation of concerns
 */

import { useCallback } from 'react';
import { LeaveRequest, ScheduleItem, Job } from '../types';
import { isSameDay, addDays } from 'date-fns';
import toast from 'react-hot-toast';
import { useLeaveMutations } from './useLeavesQuery';
import { useScheduleMutations } from './useSchedulesQuery';

interface UseLeaveHandlersProps {
    leaves: LeaveRequest[];
    schedule: ScheduleItem[];
    jobs: Job[];
    currentEmployeeId: string;
}

export const useLeaveHandlers = ({
    leaves,
    schedule,
    jobs,
    currentEmployeeId
}: UseLeaveHandlersProps) => {
    const leaveMutations = useLeaveMutations();
    const scheduleMutations = useScheduleMutations();

    const handleAddLeave = useCallback(async (newLeave: Partial<LeaveRequest>) => {
        if (currentEmployeeId === 'all') {
            toast.error("Vui lòng chọn một nhân viên cụ thể.");
            return false;
        }
        if (!newLeave.date || !newLeave.reason) {
            toast.error("Vui lòng nhập ngày và lý do nghỉ.");
            return false;
        }

        const selectedDate = new Date(newLeave.date);
        const today = new Date();
        if (selectedDate > addDays(today, 365)) {
            toast.error("Ngày nghỉ quá xa.");
            return false;
        }

        const conflictingTask = schedule.find(s =>
            isSameDay(new Date(s.date), new Date(newLeave.date!)) &&
            s.shift === newLeave.shift &&
            s.employeeIds.includes(currentEmployeeId) &&
            s.jobId !== 'JOB_NGHI_BU'
        );

        if (conflictingTask) {
            const job = jobs.find(j => j.id === conflictingTask.jobId);
            if (!window.confirm(`CẢNH BÁO: Đang có lịch "${job?.name}". Xác nhận gửi đơn?`)) {
                return false;
            }
        }

        const req: LeaveRequest = {
            id: `leave_${Date.now()}`,
            employeeId: currentEmployeeId,
            date: newLeave.date,
            shift: newLeave.shift || 'Sáng',
            reason: newLeave.reason,
            status: 'Pending',
            leaveType: newLeave.leaveType || 'Regular'
        };

        leaveMutations.add.mutate(req);
        return true;
    }, [currentEmployeeId, schedule, jobs, leaveMutations]);

    const handleDeleteLeave = useCallback(async (id: string) => {
        if (window.confirm("Hủy đơn nghỉ này?")) {
            leaveMutations.remove.mutate(id);
            return true;
        }
        return false;
    }, [leaveMutations]);

    const handleApproveLeave = useCallback((id: string, targetEmployeeId?: string, targetDate?: string, targetShift?: string) => {
        // Check if this is an auto-generated item from schedule (id starts with 'auto_')
        if (id.startsWith('auto_')) {
            // For auto items, we need employeeId, date, shift to find the schedule item
            // These should be passed from the calling component
            if (!targetEmployeeId || !targetDate || !targetShift) {
                toast.error("Thiếu thông tin để duyệt nghỉ bù.");
                return;
            }

            // Find the schedule item by date, shift, employeeId and jobId
            const scheduleItem = schedule.find(s =>
                s.jobId === 'JOB_NGHI_BU' &&
                s.date === targetDate &&
                s.shift === targetShift &&
                s.employeeIds.includes(targetEmployeeId)
            );

            if (!scheduleItem) {
                toast.error("Không tìm thấy lịch nghỉ bù.");
                return;
            }

            // Create a new LeaveRequest with Approved status
            const newLeave: LeaveRequest = {
                id: `leave_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                employeeId: targetEmployeeId,
                date: scheduleItem.date,
                shift: scheduleItem.shift,
                reason: '[Tự động] Nghỉ bù sau ca tối',
                status: 'Approved',
                leaveType: 'Regular'
            };

            leaveMutations.add.mutate(newLeave);
            toast.success("Đã duyệt nghỉ bù!");
            return;
        }

        // Regular leave - find and update
        const targetLeave = leaves.find(l => l.id === id);
        if (!targetLeave) return;
        const updated = { ...targetLeave, status: 'Approved' as const };
        leaveMutations.update.mutate(updated);

        // Check if it's a rescheduled compensatory leave
        if (targetLeave.reason.includes('[Đã đổi]')) {
            let originalDate: string | null = null;
            const dateMatch = targetLeave.reason.match(/từ (\d{2})\/(\d{2})\/(\d{4})/);
            if (dateMatch) {
                originalDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
            }

            if (originalDate) {
                const restItem = schedule.find(s =>
                    s.jobId === 'JOB_NGHI_BU' &&
                    s.employeeIds.includes(targetLeave.employeeId) &&
                    s.date === originalDate
                );

                if (restItem) {
                    const updatedEmployees = restItem.employeeIds.filter(empId => empId !== targetLeave.employeeId);
                    if (updatedEmployees.length === 0) {
                        scheduleMutations.remove.mutate(restItem.id);
                    } else {
                        scheduleMutations.update.mutate({ ...restItem, employeeIds: updatedEmployees });
                    }
                }
            }
        }
    }, [leaves, schedule, leaveMutations, scheduleMutations]);

    const handleRejectLeave = useCallback((id: string, targetEmployeeId?: string, targetDate?: string, targetShift?: string) => {
        if (!window.confirm("Từ chối đơn này?")) return;

        // Check if this is an auto-generated item from schedule (id starts with 'auto_')
        if (id.startsWith('auto_')) {
            // For auto items, we need employeeId, date, shift to find the schedule item
            if (!targetEmployeeId || !targetDate || !targetShift) {
                toast.error("Thiếu thông tin để từ chối nghỉ bù.");
                return;
            }

            // Find the schedule item by date, shift, employeeId and jobId
            const scheduleItem = schedule.find(s =>
                s.jobId === 'JOB_NGHI_BU' &&
                s.date === targetDate &&
                s.shift === targetShift &&
                s.employeeIds.includes(targetEmployeeId)
            );

            if (!scheduleItem) {
                toast.error("Không tìm thấy lịch nghỉ bù.");
                return;
            }

            // Create a new LeaveRequest with Rejected status
            const newLeave: LeaveRequest = {
                id: `leave_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                employeeId: targetEmployeeId,
                date: scheduleItem.date,
                shift: scheduleItem.shift,
                reason: '[Tự động] Nghỉ bù sau ca tối',
                status: 'Rejected',
                leaveType: 'Regular'
            };

            leaveMutations.add.mutate(newLeave);
            toast.success("Đã từ chối nghỉ bù!");
            return;
        }

        // Regular leave - find and update
        const targetLeave = leaves.find(l => l.id === id);
        if (!targetLeave) return;
        const updated = { ...targetLeave, status: 'Rejected' as const };
        leaveMutations.update.mutate(updated);
    }, [leaves, schedule, leaveMutations]);

    const handleUnapproveLeave = useCallback((id: string) => {
        if (window.confirm("Gỡ duyệt đơn này?")) {
            const target = leaves.find(l => l.id === id);
            if (!target) return;
            const updated = { ...target, status: 'Pending' as const };
            leaveMutations.update.mutate(updated);
        }
    }, [leaves, leaveMutations]);

    return {
        handleAddLeave,
        handleDeleteLeave,
        handleApproveLeave,
        handleRejectLeave,
        handleUnapproveLeave,
    };
};
