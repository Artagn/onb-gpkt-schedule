import { Employee, Job, ScheduleItem, SchedulePattern, LeaveRequest,  TimeFrame, EmployeeRank, Status, Holiday, WorkPeriod } from '../types';
import { format, addDays, isSameDay, isSameWeek, isSameMonth, startOfMonth, endOfMonth, isWithinInterval, startOfWeek } from 'date-fns';

export interface SchedulerInput {
    employees: Employee[];
    jobs: Job[];
    schedule: ScheduleItem[]; // Current full schedule (or significant portion)
    patterns: SchedulePattern[];
    leaves: LeaveRequest[];
    targetDate: Date; // Any date within the target week
    // v3.9.11: Holiday-aware scheduling
    holidays: Holiday[];
    workPeriods: WorkPeriod[];
}

export interface SchedulerResult {
    newSchedule: ScheduleItem[];
    itemsToDeleteIds: string[];
    stats: {
        totalSlots: number;
        filledSlots: number;
        unfilledSlots: number;
        eveningCount: number;
        livechatCount: number;
    };
}

// --- CONSTANTS ---
const SHIFTS = ['Sáng', 'Chiều', 'Tối'];

// --- HOLIDAY/WORK PERIOD CHECK (v3.9.11) ---
const isWorkDay = (day: Date, shift: string, holidays: Holiday[], workPeriods: WorkPeriod[]): boolean => {
    // Check if it's a holiday
    if (holidays.some(h => isSameDay(new Date(h.date), day))) return false;

    // Find current work period
    const currentPeriod = workPeriods.find(wp =>
        isWithinInterval(day, { start: new Date(wp.startDate), end: new Date(wp.endDate) })
    );

    if (!currentPeriod) return true; // No period defined = assume work day

    // Get day index (0 = Mon, 6 = Sun for our config)
    const dayOfWeek = day.getDay();
    const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert JS Sunday=0 to our Mon=0

    const dayConfig = currentPeriod.days[dayIndex as keyof typeof currentPeriod.days];

    // Check if shift is enabled for this day
    if (shift === 'Sáng' && !dayConfig.morning) return false;
    if (shift === 'Chiều' && !dayConfig.afternoon) return false;
    if (shift === 'Tối' && !dayConfig.evening) return false;

    return true;
};

// --- HELPER FUNCTIONS (Pure) ---

const createRestItem = (empId: string, eveningDate: Date): ScheduleItem => {
    const nextDay = addDays(eveningDate, 1);
    return {
        id: `rest_${empId}_${nextDay.getTime()}_${Math.random()}`,
        date: format(nextDay, 'yyyy-MM-dd'),
        shift: 'Sáng', // Always Morning after Evening
        jobId: 'JOB_NGHI_BU',
        employeeIds: [empId],
        isFixed: true,
        requiredCount: 1,
        status: 'Pending', // Allow swap/confirm before use
        note: 'Nghỉ bù ca tối hôm trước'
    };
};

const isBusy = (empId: string, day: Date, shift: string, schedule: ScheduleItem[]) => {
    return schedule.some(s => isSameDay(new Date(s.date), day) && s.shift === shift && s.employeeIds.includes(empId));
};

const onLeave = (empId: string, day: Date, shift: string, leaves: LeaveRequest[]) => {
    return leaves.some(l => l.employeeId === empId && isSameDay(new Date(l.date), day) && l.shift === shift && (l.status === 'Approved' || l.status === 'Pending'));
};

const countWorkingDaysInWeek = (empId: string, schedule: ScheduleItem[], targetDate: Date) => {
    const days = new Set<string>();
    schedule.forEach(s => {
        if (isSameWeek(new Date(s.date), targetDate, { weekStartsOn: 1 }) && s.employeeIds.includes(empId)) {
            days.add(format(new Date(s.date), 'yyyy-MM-dd'));
        }
    });
    return days.size;
};

const countLinhVucInWeek = (empId: string, schedule: ScheduleItem[], targetDate: Date, jobs: Job[]) => {
    return schedule.filter(s => {
        if (!isSameWeek(new Date(s.date), targetDate, { weekStartsOn: 1 })) return false;
        if (!s.employeeIds.includes(empId)) return false;
        const j = jobs.find(job => job.id === s.jobId);
        return j?.group === 'Đào tạo' && j?.classification === 'Lĩnh vực';
    }).length;
};

const hasLivechatYesterday = (empId: string, day: Date, schedule: ScheduleItem[], jobs: Job[]) => {
    const yesterday = addDays(day, -1);
    return schedule.some(s =>
        isSameDay(new Date(s.date), yesterday) &&
        s.employeeIds.includes(empId) &&
        jobs.find(j => j.id === s.jobId)?.group === 'Livechat'
    );
};

const hasLivechatOnDay = (empId: string, day: Date, schedule: ScheduleItem[], jobs: Job[]) => {
    return schedule.some(s => isSameDay(new Date(s.date), day) && s.employeeIds.includes(empId) && jobs.find(j => j.id === s.jobId)?.group === 'Livechat');
};

const getWeeklyKpiPoints = (empId: string, schedule: ScheduleItem[], targetDate: Date, jobs: Job[]): number => {
    let total = 0;
    schedule.forEach(s => {
        if (isSameWeek(new Date(s.date), targetDate, { weekStartsOn: 1 }) &&
            s.employeeIds.includes(empId) && s.jobId !== 'JOB_NGHI_BU') {
            const job = jobs.find(j => j.id === s.jobId);
            if (job) total += job.standardPoint * (s.coefficient || 1);
        }
    });
    return total;
};

const countJobRepetition = (empId: string, jobId: string, schedule: ScheduleItem[], targetDate: Date): number => {
    return schedule.filter(s =>
        isSameWeek(new Date(s.date), targetDate, { weekStartsOn: 1 }) &&
        s.employeeIds.includes(empId) &&
        s.jobId === jobId
    ).length;
};

const hasPairShift = (empId: string, day: Date, shift: string, schedule: ScheduleItem[]): boolean => {
    const pairShift = shift === 'Sáng' ? 'Chiều' : shift === 'Chiều' ? 'Sáng' : null;
    if (!pairShift) return true;
    return schedule.some(s =>
        isSameDay(new Date(s.date), day) &&
        s.shift === pairShift &&
        s.employeeIds.includes(empId)
    );
};

const getEmployeeTier = (emp: Employee): number => {
    if (emp.kpiStandard < 80) return 1;
    if (emp.kpiStandard <= 120) return 2;
    return 3;
};

const countSaturdaysWorked = (empId: string, schedule: ScheduleItem[], targetDate: Date): number => {
    const monthStart = startOfMonth(targetDate);
    const monthEnd = endOfMonth(targetDate);

    return schedule.filter(s => {
        const d = new Date(s.date);
        return d.getDay() === 6 &&
            isWithinInterval(d, { start: monthStart, end: monthEnd }) &&
            s.employeeIds.includes(empId) &&
            s.jobId !== 'JOB_NGHI_BU';
    }).length;
};

const getAverageWeeklyShiftsInTier = (tier: number, activeEmployees: Employee[], schedule: ScheduleItem[], targetDate: Date): number => {
    const tierEmployees = activeEmployees.filter(e => getEmployeeTier(e) === tier);
    if (tierEmployees.length === 0) return 0;

    const totalShifts = tierEmployees.reduce((sum, emp) => {
        return sum + countWorkingDaysInWeek(emp.id, schedule, targetDate);
    }, 0);

    return totalShifts / tierEmployees.length;
};

const workedEveningYesterday = (empId: string, day: Date, tempSchedule: ScheduleItem[]): boolean => {
    const yesterday = addDays(day, -1);
    return tempSchedule.some(s =>
        isSameDay(new Date(s.date), yesterday) &&
        s.shift === 'Tối' &&
        s.employeeIds.includes(empId)
    );
};

// --- MAIN ENGINE ---

export function generateWeeklySchedule({
    employees,
    jobs,
    schedule,
    patterns,
    leaves,
    targetDate,
    holidays,
    workPeriods
}: SchedulerInput): SchedulerResult {

    const startOfCurrentWeek = startOfWeek(targetDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfCurrentWeek, i));
    const activeEmployees = employees.filter(e => e.status === Status.Active).sort((a, b) => (a.stt || 9999) - (b.stt || 9999));

    // Calculate deterministic week index since epoch for dynamic rotation tie-breaker
    const weekIndex = Math.floor(startOfCurrentWeek.getTime() / (7 * 24 * 60 * 60 * 1000));

    // 1. PREPARE NEW SCHEDULE (Remove current week's auto-generated items)
    const itemsToDelete = schedule.filter(s => isSameWeek(new Date(s.date), targetDate, { weekStartsOn: 1 }));
    const itemsToDeleteIds = itemsToDelete.map(s => s.id);

    // Start with a clean slate for this week, keeping existing manual items if we logic-ed that way, 
    // BUT the original code removed *everything* in the week that matches (implicit in original filter logic).
    // Original: `schedule.filter(s => !itemsToDeleteIds.includes(s.id))`
    let newSchedule = schedule.filter(s => !itemsToDeleteIds.includes(s.id));

    // We also need to remove auto-generated leaves if we are re-scheduling? 
    // The original logic didn't explicitly delete leaves here, but it handled them in `clearWeekSchedule`.
    // For auto-schedule, we assume we just overwrite schedule items. 

    const filledSlotIds = new Set<string>();

    // --- SCORING ENGINE ---
    const scoreCandidate = (emp: Employee, job: Job, day: Date, shift: string, tempSchedule: ScheduleItem[]): number => {
        // Rest Rule: Block Morning or Afternoon shifts if worked Evening shift last night
        if (workedEveningYesterday(emp.id, day, tempSchedule) && (shift === 'Sáng' || shift === 'Chiều')) {
            return -9999;
        }

        let score = 100;

        // 1. KPI Balance - Monthly
        const completionRate = emp.kpiStandard > 0 ? (emp.monthlyScore / emp.kpiStandard) : 1;
        score -= (completionRate * 50);

        // 2. Weekly KPI Cap
        const weeklyKpi = getWeeklyKpiPoints(emp.id, tempSchedule, targetDate, jobs);
        const weeklyKpiStandard = (emp.kpiStandard || 100) / 4;
        if (weeklyKpi > weeklyKpiStandard * 1.2) score -= 100;
        else if (weeklyKpi > weeklyKpiStandard) score -= 30;

        // 3. Rest Days Balance
        const daysWorked = countWorkingDaysInWeek(emp.id, tempSchedule, targetDate);
        const restDays = 7 - daysWorked;
        if (restDays < 1) score -= 1000;
        else if (restDays < 2) score -= 50;
        else if (restDays >= 2) score += 20;

        // 4. "Lĩnh vực" Limit
        if (job.group === 'Đào tạo' && job.classification === 'Lĩnh vực') {
            const lvCount = countLinhVucInWeek(emp.id, tempSchedule, targetDate, jobs);
            if (lvCount >= 2) return -9999;
            score -= (lvCount * 30);
        }

        // 5. Task Variety
        const repetition = countJobRepetition(emp.id, job.id, tempSchedule, targetDate);
        if (repetition >= 3) score -= 80;
        else if (repetition >= 2) score -= 40;
        else if (repetition >= 1) score -= 15;

        // 6. Split-Shift Penalty
        if (job.group !== 'Livechat' && (shift === 'Sáng' || shift === 'Chiều')) {
            if (!hasPairShift(emp.id, day, shift, tempSchedule)) {
                score -= 25;
            }
        }

        // 7. Saturday Balance
        if (day.getDay() === 6) {
            const tier = getEmployeeTier(emp);
            const saturdaysWorked = countSaturdaysWorked(emp.id, tempSchedule, targetDate);

            const tierEmps = activeEmployees.filter(e => getEmployeeTier(e) === tier && e.timeFrames.includes(TimeFrame.Weekend));
            const avgSaturdays = tierEmps.length > 0
                ? tierEmps.reduce((s, e) => s + countSaturdaysWorked(e.id, tempSchedule, targetDate), 0) / tierEmps.length
                : 0;

            if (saturdaysWorked > avgSaturdays) {
                score -= (saturdaysWorked - avgSaturdays) * 50;
            }
        }

        // 8. Weekly Load Tier Balance
        const tier = getEmployeeTier(emp);
        const avgShifts = getAverageWeeklyShiftsInTier(tier, activeEmployees, tempSchedule, targetDate);
        const empShifts = countWorkingDaysInWeek(emp.id, tempSchedule, targetDate);

        if (empShifts < avgShifts) {
            score += 15;
        } else if (empShifts > avgShifts + 1) {
            score -= 30;
        }



        return score;
    };


    // --- GENERATE SLOTS (v3.9.11: Holiday-aware) ---
    const slotsToFill: ScheduleItem[] = [];
    weekDays.forEach((day, dayIndex) => {
        const dayPatterns = patterns.filter(p => p.dayIndex === dayIndex);
        dayPatterns.forEach(pattern => {
            // v3.9.11: Check if this day/shift is a work day
            if (!isWorkDay(day, pattern.shift, holidays, workPeriods)) {
                return; // Skip holidays and non-working shifts
            }

            for (let i = 0; i < pattern.requiredCount; i++) {
                slotsToFill.push({
                    id: `auto_${day.getTime()}_${pattern.jobId}_${pattern.shift}_${i}_${Math.random()}`,
                    date: format(day, 'yyyy-MM-dd'),
                    shift: pattern.shift,
                    jobId: pattern.jobId,
                    employeeIds: [],
                    isFixed: true,
                    requiredCount: 1,
                    status: 'Pending'
                });
            }
        });
    });


    // ================= PHASE 1: EVENING SHIFTS =================
    const eveningSlots = slotsToFill.filter(s => s.shift === 'Tối');

    eveningSlots.forEach(slot => {
        const job = jobs.find(j => j.id === slot.jobId);
        if (!job) return;
        const day = new Date(slot.date);
        const isWeekend = day.getDay() === 6 || day.getDay() === 0;

        const candidates = activeEmployees.filter(emp => {
            if (!emp.jobGroups.includes(job.group)) return false;
            if (!emp.timeFrames.includes(TimeFrame.Evening)) return false;
            if (isWeekend && !emp.timeFrames.includes(TimeFrame.Weekend)) return false;
            if (onLeave(emp.id, day, 'Tối', leaves)) return false;
            if (isBusy(emp.id, day, 'Tối', newSchedule)) return false;
            return true;
        }).sort((a, b) => {
            const evA = newSchedule.filter(s => s.employeeIds.includes(a.id) && s.shift === 'Tối' && isSameWeek(new Date(s.date), day, { weekStartsOn: 1 })).length;
            const evB = newSchedule.filter(s => s.employeeIds.includes(b.id) && s.shift === 'Tối' && isSameWeek(new Date(s.date), day, { weekStartsOn: 1 })).length;
            if (evA !== evB) return evA - evB;

            // Tie-break dynamically based on weekIndex
            const rotA = ((a.stt || 0) + weekIndex) % activeEmployees.length;
            const rotB = ((b.stt || 0) + weekIndex) % activeEmployees.length;
            return rotA - rotB;
        });


        if (candidates.length > 0) {
            const winner = candidates[0];
            slot.employeeIds.push(winner.id);
            newSchedule.push(slot);
            filledSlotIds.add(slot.id);

            const restItem = createRestItem(winner.id, day);
            if (!isBusy(winner.id, new Date(restItem.date), 'Sáng', newSchedule)) {
                newSchedule.push(restItem);
            }
        }
    });

    // ================= PHASE 2: LIVECHAT =================
    const livechatSlots = slotsToFill.filter(s => {
        const j = jobs.find(job => job.id === s.jobId);
        return j?.group === 'Livechat' && !filledSlotIds.has(s.id);
    });

    const livechatMap = new Map<string, Map<string, { morning: ScheduleItem[], afternoon: ScheduleItem[] }>>();
    livechatSlots.forEach(slot => {
        const dKey = format(new Date(slot.date), 'yyyy-MM-dd');
        if (!livechatMap.has(dKey)) livechatMap.set(dKey, new Map());
        const dayMap = livechatMap.get(dKey)!;
        if (!dayMap.has(slot.jobId)) dayMap.set(slot.jobId, { morning: [], afternoon: [] });
        const groups = dayMap.get(slot.jobId)!;
        if (slot.shift === 'Sáng') groups.morning.push(slot);
        else if (slot.shift === 'Chiều') groups.afternoon.push(slot);
    });

    livechatMap.forEach((jobMap, dayStr) => {
        const day = new Date(dayStr);
        jobMap.forEach((groups, jobId) => {
            const jobName = jobs.find(j => j.id === jobId)?.name || '';
            const isTN = jobName === 'TN_LIVECHAT';
            const isTRUC = jobName === 'TRUC_LIVECHAT';

            while (groups.morning.length > 0 && groups.afternoon.length > 0) {
                const mSlot = groups.morning[0];
                const aSlot = groups.afternoon[0];
                const isWeekend = day.getDay() === 6 || day.getDay() === 0;

                let candidates = activeEmployees.filter(emp => {
                    if (!emp.jobGroups.includes('Livechat')) return false;
                    if (!emp.timeFrames.includes(TimeFrame.Morning) || !emp.timeFrames.includes(TimeFrame.Afternoon)) return false;
                    if (isWeekend && !emp.timeFrames.includes(TimeFrame.Weekend)) return false;
                    if (onLeave(emp.id, day, 'Sáng', leaves) || onLeave(emp.id, day, 'Chiều', leaves)) return false;
                    if (isBusy(emp.id, day, 'Sáng', newSchedule) || isBusy(emp.id, day, 'Chiều', newSchedule)) return false;
                    if (hasLivechatYesterday(emp.id, day, newSchedule, jobs)) return false;
                    if (hasLivechatOnDay(emp.id, day, newSchedule, jobs)) return false;

                    // Block from Livechat if worked Evening shift last night
                    if (workedEveningYesterday(emp.id, day, newSchedule)) return false;

                    return true;
                });

                // Rank Logic
                const currentAssignees = newSchedule
                    .filter(s => isSameDay(new Date(s.date), day) && s.jobId === jobId)
                    .flatMap(s => s.employeeIds)
                    .map(id => activeEmployees.find(e => e.id === id));
                const countA = currentAssignees.filter(e => e?.rank === EmployeeRank.A).length;
                const countB = currentAssignees.filter(e => e?.rank === EmployeeRank.B).length;

                let preferRank: EmployeeRank | null = null;
                if (isTN) {
                    if (countA <= countB) preferRank = EmployeeRank.A;
                } else if (isTRUC) {
                    if (countA < countB) preferRank = EmployeeRank.A;
                }

                // v3.9.11: Pre-compute livechat loads for O(n log n) instead of O(n² log n)
                const livechatLoadMap = new Map<string, number>();
                candidates.forEach(emp => {
                    const load = newSchedule.filter(s =>
                        isSameMonth(new Date(s.date), targetDate) &&
                        s.employeeIds.includes(emp.id) &&
                        jobs.find(j => j.id === s.jobId)?.group === 'Livechat'
                    ).length;
                    livechatLoadMap.set(emp.id, load);
                });

                candidates.sort((a, b) => {
                    if (preferRank) {
                        if (a.rank === preferRank && b.rank !== preferRank) return -1;
                        if (b.rank === preferRank && a.rank !== preferRank) return 1;
                    }
                    const loadA = livechatLoadMap.get(a.id) || 0;
                    const loadB = livechatLoadMap.get(b.id) || 0;
                    if (loadA !== loadB) return loadA - loadB;

                    // Tie-break dynamically based on weekIndex
                    const rotA = ((a.stt || 0) + weekIndex) % activeEmployees.length;
                    const rotB = ((b.stt || 0) + weekIndex) % activeEmployees.length;
                    return rotA - rotB;
                });

                if (candidates.length > 0) {
                    const winner = candidates[0];
                    mSlot.employeeIds.push(winner.id);
                    aSlot.employeeIds.push(winner.id);
                    newSchedule.push(mSlot); filledSlotIds.add(mSlot.id);
                    newSchedule.push(aSlot); filledSlotIds.add(aSlot.id);
                    groups.morning.shift();
                    groups.afternoon.shift();
                } else {
                    break;
                }
            }
        });
    });

    // ================= PHASE 3: REMAINING =================
    const remainingSlots = slotsToFill.filter(s => !filledSlotIds.has(s.id));
    const remainingMap = new Map<string, Map<string, { morning: ScheduleItem[], afternoon: ScheduleItem[] }>>();
    const singleSlots: ScheduleItem[] = [];

    remainingSlots.forEach(slot => {
        if (slot.shift === 'Tối') {
            singleSlots.push(slot);
            return;
        }
        const dKey = format(new Date(slot.date), 'yyyy-MM-dd');
        if (!remainingMap.has(dKey)) remainingMap.set(dKey, new Map());
        const jMap = remainingMap.get(dKey)!;
        if (!jMap.has(slot.jobId)) jMap.set(slot.jobId, { morning: [], afternoon: [] });
        if (slot.shift === 'Sáng') jMap.get(slot.jobId)!.morning.push(slot);
        else jMap.get(slot.jobId)!.afternoon.push(slot);
    });

    remainingMap.forEach((jMap, dKey) => {
        const day = new Date(dKey);
        jMap.forEach((groups, jobId) => {
            const job = jobs.find(j => j.id === jobId);
            if (!job) return;

            while (groups.morning.length > 0 && groups.afternoon.length > 0) {
                const mSlot = groups.morning[0];
                const aSlot = groups.afternoon[0];
                const isWeekend = day.getDay() === 6 || day.getDay() === 0;

                const candidates = activeEmployees.filter(emp => {
                    if (!emp.jobGroups.includes(job.group)) return false;
                    if (!emp.timeFrames.includes(TimeFrame.Morning) || !emp.timeFrames.includes(TimeFrame.Afternoon)) return false;
                    if (isWeekend && !emp.timeFrames.includes(TimeFrame.Weekend)) return false;
                    if (onLeave(emp.id, day, 'Sáng', leaves) || onLeave(emp.id, day, 'Chiều', leaves)) return false;
                    if (isBusy(emp.id, day, 'Sáng', newSchedule) || isBusy(emp.id, day, 'Chiều', newSchedule)) return false;
                    return true;
                }).map(emp => ({ emp, score: scoreCandidate(emp, job, day, 'Sáng', newSchedule) }))
                    .filter(c => c.score > -9000)
                    .sort((a, b) => {
                        if (b.score !== a.score) return b.score - a.score;

                        // Tie-break dynamically based on weekIndex
                        const rotA = ((a.emp.stt || 0) + weekIndex) % activeEmployees.length;
                        const rotB = ((b.emp.stt || 0) + weekIndex) % activeEmployees.length;
                        return rotA - rotB;
                    });

                if (candidates.length > 0) {
                    const winner = candidates[0].emp;
                    mSlot.employeeIds.push(winner.id);
                    aSlot.employeeIds.push(winner.id);
                    newSchedule.push(mSlot); filledSlotIds.add(mSlot.id);
                    newSchedule.push(aSlot); filledSlotIds.add(aSlot.id);
                    groups.morning.shift();
                    groups.afternoon.shift();
                } else {
                    break;
                }
            }
            singleSlots.push(...groups.morning);
            singleSlots.push(...groups.afternoon);
        });
    });

    singleSlots.forEach(slot => {
        if (filledSlotIds.has(slot.id)) return;
        const job = jobs.find(j => j.id === slot.jobId);
        if (!job) return;
        const day = new Date(slot.date);
        const isWeekend = day.getDay() === 6 || day.getDay() === 0;

        const candidates = activeEmployees.filter(emp => {
            if (!emp.jobGroups.includes(job.group)) return false;
            if (!emp.timeFrames.includes(slot.shift as any)) return false;
            if (isWeekend && !emp.timeFrames.includes(TimeFrame.Weekend)) return false;
            if (onLeave(emp.id, day, slot.shift, leaves)) return false;
            if (isBusy(emp.id, day, slot.shift, newSchedule)) return false;
            return true;
        }).map(emp => ({ emp, score: scoreCandidate(emp, job, day, slot.shift, newSchedule) }))
            .filter(c => c.score > -9000)
            .sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;

                // Tie-break dynamically based on weekIndex
                const rotA = ((a.emp.stt || 0) + weekIndex) % activeEmployees.length;
                const rotB = ((b.emp.stt || 0) + weekIndex) % activeEmployees.length;
                return rotA - rotB;
            });

        if (candidates.length > 0) {
            slot.employeeIds.push(candidates[0].emp.id);
            newSchedule.push(slot);
            filledSlotIds.add(slot.id);
        }
    });

    // --- STATS ---
    const eveningCount = newSchedule.filter(s => s.shift === 'Tối' && isSameWeek(new Date(s.date), targetDate, { weekStartsOn: 1 })).length;
    const livechatCount = newSchedule.filter(s => {
        const job = jobs.find(j => j.id === s.jobId);
        return job?.group === 'Livechat' && isSameWeek(new Date(s.date), targetDate, { weekStartsOn: 1 });
    }).length;

    return {
        newSchedule,
        itemsToDeleteIds,
        stats: {
            totalSlots: slotsToFill.length,
            filledSlots: filledSlotIds.size,
            unfilledSlots: slotsToFill.length - filledSlotIds.size,
            eveningCount,
            livechatCount
        }
    };
}
