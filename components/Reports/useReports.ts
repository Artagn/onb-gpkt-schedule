import { useState, useMemo, useEffect } from 'react';
import {
    startOfMonth, endOfMonth, subWeeks, addWeeks, format, parse,
    differenceInDays, eachDayOfInterval, isWithinInterval, startOfDay,
    subMonths, isSameMonth, startOfWeek, endOfWeek
} from 'date-fns';
import { useData } from '../../context/DataContext';
import { useSchedulesQuery } from '../../hooks/useSchedulesQuery';
import { useLeavesQuery } from '../../hooks/useLeavesQuery';
import { useAllocationsQuery } from '../../hooks/useAllocationsQuery';
import { Employee, Job, ScheduleItem, DailyAllocation, LeaveRequest, Role, SwapRequest } from '../../types';
import { swapService } from '../../services/swapService';
import * as XLSX from 'xlsx';
import { exportWeeklySchedule } from '../../services/excelExportService';

export type TimeRangeOption = 'week' | 'month' | 'prev_week' | 'prev_month' | 'custom';

// New 2-level tab structure
export type MainTabOption = 'kpi' | 'swap' | 'monthly';
export type SubTabOption =
    | 'points' | 'daily' | 'training'  // KPI & Năng suất
    | 'swap_shift' | 'swap_leave'       // Đổi lịch
    | 'evaluation' | 'livechat' | 'training_summary';  // Báo cáo tháng

// Mapping main tabs to sub tabs
export const SUB_TABS: Record<MainTabOption, SubTabOption[]> = {
    kpi: ['points', 'daily', 'training'],
    swap: ['swap_shift', 'swap_leave'],
    monthly: ['evaluation', 'livechat', 'training_summary']
};

// Default sub tab for each main tab
export const DEFAULT_SUB_TAB: Record<MainTabOption, SubTabOption> = {
    kpi: 'points',
    swap: 'swap_shift',
    monthly: 'evaluation'
};

interface UseReportsProps {
    currentUserRole?: Role;
    user?: any;
    fixedEmployeeId?: string;
}

export const useReports = ({ currentUserRole, user, fixedEmployeeId }: UseReportsProps) => {
    const { employees, jobs } = useData();

    // 1. Time Range State
    const [timeRangeType, setTimeRangeType] = useState<TimeRangeOption>('month');
    const [fromDate, setFromDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [toDate, setToDate] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

    // 2. Authentication check
    const isAuthenticated = !!user;

    // 3. Data Queries (auto-fetch based on auth + date range via queryKey)
    const { data: schedule = [], isLoading: isLoadSchedule } = useSchedulesQuery(isAuthenticated, {
        startDate: fromDate,
        endDate: toDate,
        staleTime: 1000 * 60 * 30 // Keep cache for 30m during reporting
    });

    const { data: leaves = [], isLoading: isLoadLeaves } = useLeavesQuery(isAuthenticated, {
        startDate: fromDate,
        endDate: toDate,
        staleTime: 1000 * 60 * 30
    });

    const { data: allocations = [], isLoading: isLoadAllocations } = useAllocationsQuery(isAuthenticated, {
        startDate: fromDate,
        endDate: toDate,
        staleTime: 1000 * 60 * 30
    });

    const isLoading = isLoadSchedule || isLoadLeaves || isLoadAllocations;

    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
    const [selectedJobGroups, setSelectedJobGroups] = useState<string[]>([]);

    // NEW: 2-level tabs
    const [mainTab, setMainTab] = useState<MainTabOption>('kpi');
    const [subTab, setSubTab] = useState<SubTabOption>('points');

    // When main tab changes, reset to default sub tab
    const handleMainTabChange = (tab: MainTabOption) => {
        setMainTab(tab);
        setSubTab(DEFAULT_SUB_TAB[tab]);
    };

    const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
    const [selectedDailyEmployeeId, setSelectedDailyEmployeeId] = useState<string | null>(null);

    useEffect(() => {
        const fetchSwaps = async () => {
            try {
                const data = await swapService.getAllRequests();
                setSwapRequests(data);
            } catch (error) {
                console.error("Failed to load swap requests", error);
            }
        };
        fetchSwaps();
    }, []);

    // Initialize Employee Selection
    useEffect(() => {
        if (fixedEmployeeId) {
            setSelectedEmployeeIds([fixedEmployeeId]);
        } else if (currentUserRole === Role.Staff && user?.email) {
            const currentEmp = employees.find(e => e.email === user.email);
            if (currentEmp) {
                setSelectedEmployeeIds([currentEmp.id]);
            }
        } else if (selectedEmployeeIds.length === 0 && employees.length > 0) {
            setSelectedEmployeeIds(employees.map(e => e.id));
        }
    }, [fixedEmployeeId, currentUserRole, user, employees]);

    // Initialize Job Groups selection from dynamic data
    useEffect(() => {
        if (selectedJobGroups.length === 0 && jobs.length > 0) {
            const uniqueGroups = Array.from(new Set(jobs.map(j => j.group)));
            setSelectedJobGroups(uniqueGroups);
        }
    }, [jobs]);

    // --- HANDLERS ---
    const handleTimeRangeChange = (type: TimeRangeOption) => {
        setTimeRangeType(type);
        const now = new Date();
        if (type === 'week') {
            setFromDate(format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
            setToDate(format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
        } else if (type === 'month') {
            setFromDate(format(startOfMonth(now), 'yyyy-MM-dd'));
            setToDate(format(endOfMonth(now), 'yyyy-MM-dd'));
        } else if (type === 'prev_week') {
            const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            setFromDate(format(startOfWeek(lastWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
            setToDate(format(endOfWeek(lastWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
        } else if (type === 'prev_month') {
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            setFromDate(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
            setToDate(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
        }
    };

    const toggleEmployee = (id: string) => {
        setSelectedEmployeeIds(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);
    };

    const toggleAllEmployees = (select: boolean) => {
        setSelectedEmployeeIds(select ? employees.map(e => e.id) : []);
    };

    const toggleJobGroup = (group: string) => {
        setSelectedJobGroups(prev => prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]);
    };

    const toggleAllJobGroups = (select: boolean) => {
        const allGroups = Array.from(new Set(jobs.map(j => j.group)));
        setSelectedJobGroups(select ? allGroups : []);
    };

    // --- DATA PROCESSING ---

    // TAB 1: POINTS REPORT
    const processedPointsData = useMemo(() => {
        const employeeStats = new Map<string, { assigned: number, actual: number, count: number }>();

        employees.forEach(e => {
            if (selectedEmployeeIds.includes(e.id)) {
                employeeStats.set(e.id, { assigned: 0, actual: 0, count: 0 });
            }
        });

        const filterStart = new Date(fromDate + 'T00:00:00');
        const filterEnd = new Date(toDate + 'T23:59:59');

        schedule.forEach(item => {
            if (item.jobId === 'JOB_NGHI_BU') return;
            const job = jobs.find(j => j.id === item.jobId);
            if (!job) return;

            if (!isWithinInterval(new Date(item.date), { start: filterStart, end: filterEnd })) return;
            if (!selectedJobGroups.includes(job.group)) return;

            item.employeeIds.forEach(empId => {
                if (!selectedEmployeeIds.includes(empId)) return;

                if (employeeStats.has(empId)) {
                    const stats = employeeStats.get(empId)!;
                    const points = job.standardPoint * (item.coefficient || 1);

                    stats.assigned += points;
                    stats.count += 1;

                    if (item.status === 'Completed' || item.status === 'Approved') {
                        stats.actual += points;
                    } else if (item.status === 'Cancelled') {
                        stats.actual += points * 0.5;
                    }
                }
            });
        });

        return Array.from(employeeStats.entries())
            .map(([id, stats]) => {
                const emp = employees.find(e => e.id === id);
                return {
                    id,
                    name: emp?.fullName || 'Unknown',
                    taskCount: stats.count,
                    assignedPoints: parseFloat(stats.assigned.toFixed(2)),
                    actualPoints: parseFloat(stats.actual.toFixed(2)),
                    rate: stats.assigned > 0 ? parseFloat(((stats.actual / stats.assigned) * 100).toFixed(1)) : 0
                };
            })
            // Filter: Exclude employees where BOTH assignedPoints AND actualPoints are 0
            .filter(row => row.assignedPoints > 0 || row.actualPoints > 0)
            .sort((a, b) => b.actualPoints - a.actualPoints);
    }, [schedule, fromDate, toDate, selectedEmployeeIds, selectedJobGroups, employees, jobs]);

    // TAB 1 SUMMARY
    const summaryStats = useMemo(() => {
        const totalEmployees = processedPointsData.length;
        const totalAssigned = processedPointsData.reduce((sum, r) => sum + r.assignedPoints, 0);
        const totalActual = processedPointsData.reduce((sum, r) => sum + r.actualPoints, 0);
        const avgRate = totalAssigned > 0 ? (totalActual / totalAssigned) * 100 : 0;

        return {
            totalEmployees,
            totalAssigned: totalAssigned.toFixed(1),
            totalActual: totalActual.toFixed(1),
            avgRate: avgRate.toFixed(1)
        };
    }, [processedPointsData]);


    // TAB 2: DAILY ALLOCATION
    const processedDailyData = useMemo(() => {
        const statsMap = new Map<string, { newAssigned: number, completed: number, returnedKD: number, returnedTP: number }>();

        employees.forEach(e => {
            if (selectedEmployeeIds.includes(e.id)) {
                statsMap.set(e.id, { newAssigned: 0, completed: 0, returnedKD: 0, returnedTP: 0 });
            }
        });

        const filterStart = new Date(fromDate + 'T00:00:00');
        const filterEnd = new Date(toDate + 'T23:59:59');

        allocations.forEach(alloc => {
            const d = new Date(alloc.date);
            const isInRange = isWithinInterval(d, { start: filterStart, end: filterEnd });
            if (!isInRange) return;

            if (!selectedEmployeeIds.includes(alloc.employeeId)) return;

            const job = jobs.find(j => j.id === alloc.jobId);
            if (!job || !selectedJobGroups.includes(job.group)) return;

            if (statsMap.has(alloc.employeeId)) {
                const current = statsMap.get(alloc.employeeId)!;
                current.newAssigned += (alloc.newAssigned || 0);
                current.completed += (alloc.completed || 0);
                current.returnedKD += (alloc.returnedKD || 0);
                current.returnedTP += (alloc.returnedTP || 0);
            }
        });

        return Array.from(statsMap.entries())
            .map(([id, s]) => {
                const emp = employees.find(e => e.id === id);
                const pending = s.newAssigned - (s.completed + s.returnedKD + s.returnedTP);
                const total = s.newAssigned + s.completed + s.returnedKD + s.returnedTP;
                return {
                    id, // Add employee id for selection
                    name: emp?.fullName || 'Unknown',
                    newAssigned: s.newAssigned,
                    completed: s.completed,
                    returnedKD: s.returnedKD,
                    returnedTP: s.returnedTP,
                    pending: pending > 0 ? pending : 0,
                    total // Used for filtering
                };
            })
            // Filter: Exclude employees with total quantity = 0
            .filter(row => row.total > 0)
            .sort((a, b) => b.completed - a.completed);

    }, [allocations, fromDate, toDate, selectedEmployeeIds, selectedJobGroups, employees, jobs]);

    // TAB 2 SUMMARY (Daily)
    const dailySummaryStats = useMemo(() => {
        return {
            totalEmployees: processedDailyData.length,
            totalNewAssigned: processedDailyData.reduce((sum, r) => sum + r.newAssigned, 0),
            totalCompleted: processedDailyData.reduce((sum, r) => sum + r.completed, 0),
            totalReturnedKD: processedDailyData.reduce((sum, r) => sum + r.returnedKD, 0),
            totalReturnedTP: processedDailyData.reduce((sum, r) => sum + r.returnedTP, 0),
            totalPending: processedDailyData.reduce((sum, r) => sum + r.pending, 0),
        };
    }, [processedDailyData]);


    // TAB 3: TRAINING
    const processedTrainingData = useMemo(() => {
        const result: any[] = [];
        const filterStart = new Date(fromDate + 'T00:00:00');
        const filterEnd = new Date(toDate + 'T23:59:59');

        schedule.forEach(item => {
            const job = jobs.find(j => j.id === item.jobId);
            if (!job || job.group !== 'Đào tạo' || item.status !== 'Completed') return;
            if (!isWithinInterval(new Date(item.date), { start: filterStart, end: filterEnd })) return;
            if (!selectedJobGroups.includes(job.group)) return;

            const hasSelectedEmp = item.employeeIds.some(id => selectedEmployeeIds.includes(id));
            if (!hasSelectedEmp) return;

            const participants = item.customerParticipants || 0;
            const capable = item.customerCapable || 0;
            const ratio = participants > 0 ? ((capable / participants) * 100).toFixed(1) : '0.0';

            const assignees = item.employeeIds.map(id => {
                const e = employees.find(emp => emp.id === id);
                return e ? e.fullName : 'Unknown';
            }).join(', ');

            result.push({
                id: item.id,
                date: new Date(item.date),
                dateStr: format(new Date(item.date), 'dd/MM/yyyy'),
                jobName: job.name,
                assignees,
                participants,
                surveys: item.customerSurveys || 0,
                capable,
                ratio
            });
        });
        return result.sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [schedule, fromDate, toDate, selectedEmployeeIds, selectedJobGroups, employees, jobs]);


    // TAB 4: SWAP REPORT
    const processedSwapData = useMemo(() => {
        const filterStart = new Date(fromDate + 'T00:00:00');
        const filterEnd = new Date(toDate + 'T23:59:59');

        return swapRequests.filter(req => {
            // Filter by Date (Creation Date)
            const created = new Date(req.createdAt);
            if (!isWithinInterval(created, { start: filterStart, end: filterEnd })) return false;

            // Filter by Employee (Requester OR Target)
            const isRequesterSelected = selectedEmployeeIds.includes(req.requesterId);
            const isTargetSelected = selectedEmployeeIds.includes(req.targetId);
            if (!isRequesterSelected && !isTargetSelected) return false;

            return true;
        }).map(req => {
            const requester = employees.find(e => e.id === req.requesterId)?.fullName || req.requesterId;
            const target = employees.find(e => e.id === req.targetId)?.fullName || req.targetId;
            const reqJob = jobs.find(j => j.id === req.requestJobId)?.name || req.requestJobId;
            const targetJob = req.targetJobId ? (jobs.find(j => j.id === req.targetJobId)?.name || req.targetJobId) : 'Nghỉ/Không có việc';

            return {
                ...req,
                requesterName: requester,
                targetName: target,
                requestJobName: reqJob,
                targetJobName: targetJob,
                createdAtStr: format(new Date(req.createdAt), 'dd/MM/yyyy HH:mm'),
                requestDateStr: format(new Date(req.requestDate), 'dd/MM')
            };
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [swapRequests, fromDate, toDate, selectedEmployeeIds, employees, jobs]);

    const swapSummary = useMemo(() => {
        return {
            total: processedSwapData.length,
            approved: processedSwapData.filter(s => s.status === 'Approved').length,
            rejected: processedSwapData.filter(s => s.status === 'Rejected').length,
            cancelled: processedSwapData.filter(s => s.status === 'Cancelled').length,
            pending: processedSwapData.filter(s => s.status === 'Pending').length,
        };
    }, [processedSwapData]);

    // TAB 5: LEAVE SWAP REPORT (Compensatory Leave Changes)
    const processedLeaveSwapData = useMemo(() => {
        const filterStart = new Date(fromDate + 'T00:00:00');
        const filterEnd = new Date(toDate + 'T23:59:59');

        return leaves.filter(l => {
            // Filter by Date (The new date of the leave)
            const date = new Date(l.date);
            if (!isWithinInterval(date, { start: filterStart, end: filterEnd })) return false;

            // Filter for "Changed" leaves OR Auto leaves (since they are essentially compensatory swaps)
            if (!l.reason.includes('[Đã đổi]') && !l.reason.includes('[Tự động]')) return false;

            // Filter by Selected Employees
            if (!selectedEmployeeIds.includes(l.employeeId)) return false;

            return true;
        }).map(l => {
            const emp = employees.find(e => e.id === l.employeeId);

            // Extract Old Date from Reason if available
            // Format: "[Đã đổi] Nghỉ bù từ 20/01/2026..."
            const match = l.reason.match(/từ (\d{2}\/\d{2}\/\d{4})/);
            const originalDateStr = match ? match[1] : '-';

            return {
                id: l.id,
                employeeName: emp?.fullName || l.employeeId,
                dateStr: format(new Date(l.date), 'dd/MM/yyyy'),
                originalDateStr, // New Field
                shift: l.shift,
                reason: l.reason,
                status: l.status
            };
        }).sort((a, b) => b.id.localeCompare(a.id));
    }, [leaves, fromDate, toDate, selectedEmployeeIds, employees]);


    // --- EXPORT HANDLERS ---
    const handleExportExcel = () => {
        const wb = XLSX.utils.book_new();
        const fileName = subTab === 'points' ? 'BaoCao_Diem_KPI.xlsx' : 'BaoCao_SanLuong_HangNgay.xlsx';

        if (subTab === 'points') {
            const headers = ['STT', 'Nhân viên', 'Tổng ca', 'Điểm được giao', 'Điểm thực tế (KPI)', 'Tỷ lệ (%)'];
            const data = processedPointsData.map((item, idx) => [
                idx + 1, item.name, item.taskCount, item.assignedPoints, item.actualPoints, item.rate
            ]);
            const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
            ws['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 10 }, { wch: 15 }, { wch: 18 }, { wch: 10 }];
            XLSX.utils.book_append_sheet(wb, ws, 'KPI Điểm');
        } else if (subTab === 'daily') {
            const headers = ['STT', 'Nhân viên', 'Chia mới', 'Hoàn thành', 'Trả KD', 'Trả TP', 'Tồn đọng'];
            const data = processedDailyData.map((item, idx) => [
                idx + 1, item.name, item.newAssigned, item.completed, item.returnedKD, item.returnedTP, item.pending
            ]);
            const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
            ws['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }];
            XLSX.utils.book_append_sheet(wb, ws, 'Chỉ tiêu Hàng ngày');
        } else if (subTab === 'training') {
            const headers = ['Ngày', 'Nội dung đào tạo', 'Người thực hiện', 'Tham gia', 'Khảo sát', 'Biết sử dụng', 'Tỷ lệ (%)'];
            const data = processedTrainingData.map(item => [
                item.dateStr, item.jobName, item.assignees, item.participants, item.surveys, item.capable, item.ratio + '%'
            ]);
            const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
            ws['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 }];
            XLSX.utils.book_append_sheet(wb, ws, 'Thống kê Đào tạo');
        } else if (subTab === 'swap_shift') {
            // SWAP EXPORT
            const headers = ['Ngày tạo', 'Người yêu cầu', 'Người nhận', 'Ngày đổi', 'Ca', 'Việc đổi', 'Việc nhận', 'Trạng thái', 'Lý do'];
            const data = processedSwapData.map(item => [
                item.createdAtStr, item.requesterName, item.targetName, item.requestDateStr, item.requestShift, item.requestJobName, item.targetJobName, item.status, item.reason
            ]);
            const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
            ws['!cols'] = [{ wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 8 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 30 }];
            XLSX.utils.book_append_sheet(wb, ws, 'Thống kê Đổi lịch');
        } else {
            // LEAVE SWAP EXPORT
            const headers = ['Nhân viên', 'Ngày nghỉ cũ', 'Ngày nghỉ bù (Mới)', 'Buổi', 'Lý do', 'Trạng thái'];
            const data = processedLeaveSwapData.map(item => [
                item.employeeName, item.originalDateStr, item.dateStr, item.shift, item.reason, item.status
            ]);
            const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
            ws['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 30 }, { wch: 15 }];
            XLSX.utils.book_append_sheet(wb, ws, 'Đổi nghỉ bù');
        }
        XLSX.writeFile(wb, fileName);
    };

    const handleExportWeeklySchedule = () => {
        exportWeeklySchedule(schedule, jobs, employees, new Date(fromDate));
    };

    return {
        // State - 2-level tabs
        mainTab, setMainTab: handleMainTabChange,
        subTab, setSubTab,
        timeRangeType,
        fromDate, setFromDate,
        toDate, setToDate,
        selectedEmployeeIds, setSelectedEmployeeIds,
        selectedJobGroups, setSelectedJobGroups,
        employees, jobs,

        // Computed Data
        processedPointsData,
        summaryStats,
        processedDailyData,
        dailySummaryStats,
        processedTrainingData,
        processedSwapData,
        swapSummary,
        processedLeaveSwapData,

        // Daily Tab Selection
        selectedDailyEmployeeId, setSelectedDailyEmployeeId,

        // Handlers
        handleTimeRangeChange,
        toggleEmployee, toggleAllEmployees,
        toggleJobGroup, toggleAllJobGroups,
        handleExportExcel,
        handleExportWeeklySchedule
    };
};
