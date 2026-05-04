
import { useMemo, useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { Role, ScheduleItem, JobGroup, Status, SchedulePattern, Job } from '../../types';
import { isSameDay, setHours, setMinutes } from 'date-fns';

export const useDashboardStats = (user: any) => {
    const {
        employees, jobs, subJobs, schedule, dailyAllocations: allocations,
        setLeaves, setSchedule, patterns, leaves,
        viewRole // Get viewRole
    } = useData();

    // State for current time
    const [now, setNow] = useState(new Date());

    // Filter States (For Admin/Coordinator)
    const [filterEmployeeId, setFilterEmployeeId] = useState<string>('all');
    const [filterJobGroup, setFilterJobGroup] = useState<string>('all');

    // v3.9.11: Timer pauses when tab is hidden
    useEffect(() => {
        let timer: ReturnType<typeof setInterval>;

        const startTimer = () => {
            timer = setInterval(() => setNow(new Date()), 60000);
        };

        const handleVisibility = () => {
            if (document.hidden) {
                clearInterval(timer);
            } else {
                setNow(new Date()); // Sync immediately when visible
                startTimer();
            }
        };

        startTimer();
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            clearInterval(timer);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, []);

    // Identify current user employee object
    const currentEmp = useMemo(() => {
        return employees.find(e => e.email.toLowerCase() === user.email?.toLowerCase());
    }, [employees, user]);

    // Role Logic (Enhanced with viewRole)
    // If viewRole is set, override the actual role checks
    const actualRole = currentEmp?.role;
    const activeRole = viewRole || actualRole;

    const isStaff = activeRole === Role.Staff;
    const isManager = activeRole === Role.Coordinator || activeRole === Role.Admin;
    const isAdmin = activeRole === Role.Admin;

    // Display Name shows "Viewing as..." if simulating
    const displayName = viewRole
        ? `${currentEmp?.fullName} (View Staff)`
        : (currentEmp ? currentEmp.fullName : (user.displayName || 'Người dùng'));

    const displayRole = activeRole || (user.isAnonymous ? 'Khách' : 'Chưa xác định');

    // Stats
    const activeEmployees = employees.filter(e => e.status === Status.Active).length;
    const totalJobs = jobs.filter(j => j.isActive).length;

    // 1. FILTER SCHEDULE BASED ON ROLE & UI FILTERS
    const rawTodaySchedule = useMemo(() =>
        schedule.filter(s => isSameDay(new Date(s.date), now) && s.jobId !== 'JOB_NGHI_BU'),
        [schedule, now]
    );

    const pendingLeaves = useMemo(() =>
        leaves.filter(l => l.status === 'Pending' && (isStaff ? l.employeeId === currentEmp?.id : true)),
        [leaves, isStaff, currentEmp?.id]
    );

    const incompleteTasks = useMemo(() => {
        return schedule.filter(s => {
            // 1. Basic Status Check
            if (s.status === 'Completed' || s.status === 'Cancelled' || s.jobId === 'JOB_NGHI_BU') return false;

            // 2. Role Check
            if (isStaff && !s.employeeIds.includes(currentEmp?.id || '')) return false;

            // 3. Time Check (Only show PAST unmatched tasks)
            const sDate = new Date(s.date);
            const today = new Date();
            sDate.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);

            // If date is in the past, it's definitely incomplete
            if (sDate < today) return true;

            // If date is in the future, it's NOT incomplete yet
            if (sDate > today) return false;

            // If date is TODAY, check shift end time
            const currentMinutes = now.getHours() * 60 + now.getMinutes();

            if (s.shift === 'Sáng') return currentMinutes > (12 * 60); // After 12:00
            if (s.shift === 'Chiều') return currentMinutes > (17 * 60 + 30); // After 17:30
            if (s.shift === 'Tối') return currentMinutes > (22 * 60 + 30); // After 22:30

            return false;
        });
    }, [schedule, isStaff, currentEmp?.id, now]);

    const displaySchedule = useMemo(() => {
        let filtered = rawTodaySchedule;

        // Role restriction
        if (isStaff && currentEmp) {
            filtered = filtered.filter(s => s.employeeIds.includes(currentEmp.id));
        } else {
            // Admin/Coordinator Filters
            if (filterEmployeeId !== 'all') {
                filtered = filtered.filter(s => s.employeeIds.includes(filterEmployeeId));
            }
            if (filterJobGroup !== 'all') {
                filtered = filtered.filter(s => {
                    const job = jobs.find(j => j.id === s.jobId);
                    return job?.group === filterJobGroup;
                });
            }
        }
        return filtered;
    }, [rawTodaySchedule, isStaff, currentEmp, filterEmployeeId, filterJobGroup, jobs]);

    const todayShifts = rawTodaySchedule.length;
    const peopleWorkingToday = new Set(rawTodaySchedule.flatMap(s => s.employeeIds)).size;

    // Allocation Status
    const relevantAllocations = isStaff && currentEmp
        ? allocations.filter(a => a.employeeId === currentEmp.id)
        : allocations;

    const todayAllocations = relevantAllocations.filter(a => isSameDay(new Date(a.date), now));

    const pendingAllocations = useMemo(() => {
        return todayAllocations.reduce((acc, curr) => {
            return acc + ((curr.newAssigned || 0) + (curr.assigned || 0) - (curr.completed || 0) - (curr.returnedKD || 0) - (curr.returnedTP || 0));
        }, 0);
    }, [todayAllocations]);

    // Helpers
    const getSubJobs = (jobId: string, shift: string) => {
        const dayIndex = now.getDay();
        const map: Record<number, string> = { 1: 'Thứ 2', 2: 'Thứ 3', 3: 'Thứ 4', 4: 'Thứ 5', 5: 'Thứ 6', 6: 'Thứ 7', 0: 'Chủ nhật' };
        const dayName = map[dayIndex];
        const subs = subJobs.filter(s => s.jobId === jobId && s.day === dayName && s.shift === shift);
        return subs.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    };

    // --- LOGIC: UNASSIGNED TASKS (Patterns vs Actual) ---
    const unassignedTasks = useMemo(() => {
        if (isStaff) return [];

        const dayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1; // Convert to 0=Mon, 6=Sun
        const relevantPatterns = patterns.filter(p => p.dayIndex === dayIndex);

        const results: { pattern: SchedulePattern, job: Job, missing: number }[] = [];

        relevantPatterns.forEach(p => {
            const job = jobs.find(j => j.id === p.jobId);
            if (!job) return;

            // Count how many assigned in schedule today for this job & shift
            const assignedCount = rawTodaySchedule.filter(s =>
                s.jobId === p.jobId &&
                s.shift === p.shift
            ).reduce((acc, item) => acc + item.employeeIds.length, 0);

            const missing = p.requiredCount - assignedCount;
            if (missing > 0) {
                results.push({ pattern: p, job, missing });
            }
        });

        return results.sort((a, b) => {
            const shiftOrder = { 'Sáng': 0, 'Chiều': 1, 'Tối': 2 };
            return shiftOrder[a.pattern.shift] - shiftOrder[b.pattern.shift];
        });
    }, [patterns, rawTodaySchedule, now, jobs, isStaff]);

    // --- TIME CATEGORIZATION LOGIC ---
    const categorizedSchedule = useMemo(() => {
        const ongoing: ScheduleItem[] = [];
        const upcoming: ScheduleItem[] = [];
        const finished: ScheduleItem[] = [];

        displaySchedule.forEach(item => {
            if (item.status === 'Completed' || item.status === 'Cancelled') {
                finished.push(item);
                return;
            }

            const subs = getSubJobs(item.jobId, item.shift);
            let startTime: Date, endTime: Date;

            if (subs.length > 0) {
                const firstSub = subs[0];
                const lastSub = subs[subs.length - 1];
                const [startH, startM] = (firstSub.startTime || '00:00').split(':').map(Number);
                const [endH, endM] = (lastSub.endTime || '23:59').split(':').map(Number);
                startTime = setMinutes(setHours(now, startH), startM);
                endTime = setMinutes(setHours(now, endH), endM);
            } else {
                if (item.shift === 'Sáng') {
                    startTime = setMinutes(setHours(now, 8), 0);
                    endTime = setMinutes(setHours(now, 12), 0);
                } else if (item.shift === 'Chiều') {
                    startTime = setMinutes(setHours(now, 13), 30);
                    endTime = setMinutes(setHours(now, 17), 30);
                } else {
                    startTime = setMinutes(setHours(now, 19), 30);
                    endTime = setMinutes(setHours(now, 22), 30);
                }
            }

            if (now > endTime) {
                finished.push(item);
            } else if (now >= startTime && now <= endTime) {
                ongoing.push(item);
            } else {
                upcoming.push(item);
            }
        });

        const sorter = (a: ScheduleItem, b: ScheduleItem) => {
            const subsA = getSubJobs(a.jobId, a.shift);
            const subsB = getSubJobs(b.jobId, b.shift);
            const timeA = subsA.length > 0 ? subsA[0].startTime : (a.shift === 'Sáng' ? '08:00' : a.shift === 'Chiều' ? '13:30' : '19:30');
            const timeB = subsB.length > 0 ? subsB[0].startTime : (b.shift === 'Sáng' ? '08:00' : b.shift === 'Chiều' ? '13:30' : '19:30');
            return (timeA || '').localeCompare(timeB || '');
        };

        return {
            ongoing: ongoing.sort(sorter),
            upcoming: upcoming.sort(sorter),
            finished: finished.sort(sorter)
        };
    }, [displaySchedule, now, subJobs]);

    return {
        // Data
        employees, jobs, subJobs, schedule, allocations, leaves, patterns,
        // Derived State
        currentEmp, isStaff, isManager, isAdmin, displayName, displayRole,
        activeEmployees, totalJobs,
        todayShifts, peopleWorkingToday, pendingAllocations,
        unassignedTasks,
        categorizedSchedule,
        pendingLeaves, incompleteTasks, displaySchedule,
        // Actions/State Setters
        now,
        filterEmployeeId, setFilterEmployeeId,
        filterJobGroup, setFilterJobGroup,
        // setLeaves, setSchedule, // REMOVED
        // Helpers
        getSubJobs
    };
};
