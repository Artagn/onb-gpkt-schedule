/**
 * Firestore Trigger: Leave Balance Update
 * Phase 5: Staff Experience Upgrade - HYBRID MODEL
 * 
 * ONLY handles T7/CN (Weekend) work → Balance accumulation
 * Ca Tối is handled by schedulerEngine.ts (generates "Nghỉ bù" schedule items)
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

/**
 * Helper: Normalize date string to YYYY-MM-DD format (Vietnam timezone)
 * Handles both "2026-01-10" and "2026-01-09T17:00:00.000Z" formats
 * 
 * IMPORTANT: Cloud Functions run in UTC. For "2026-01-09T17:00:00.000Z":
 * - UTC: Jan 9, 17:00
 * - Vietnam (UTC+7): Jan 10, 00:00
 * We need to add 7 hours to get the correct Vietnam date.
 */
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000; // +7 hours in milliseconds

const normalizeDateString = (dateInput: string): string => {
    if (dateInput.includes('T')) {
        // ISO format with time - convert to Vietnam timezone
        const utcDate = new Date(dateInput);
        const vietnamDate = new Date(utcDate.getTime() + VIETNAM_OFFSET_MS);
        const year = vietnamDate.getUTCFullYear();
        const month = String(vietnamDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(vietnamDate.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    return dateInput; // Already in YYYY-MM-DD format
};

// ========== HELPER: Get day of week from YYYY-MM-DD string (0=Sun, 6=Sat) ==========
const getDayOfWeek = (dateStr: string): number => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(Date.UTC(year, month - 1, day));
    return d.getUTCDay();
};

// ========== HELPER: Check if work qualifies for balance (Weekend or Holiday) ==========
const isWorkEligibleForBalance = async (scheduleData: any): Promise<boolean> => {
    const rawDate = scheduleData.date;
    const dateStr = normalizeDateString(rawDate);
    const dayOfWeek = getDayOfWeek(dateStr);
    const shift = scheduleData.shift;

    // Check if it's a holiday first
    const holidaysSnap = await db.collection("holidays").get();
    const holidays = holidaysSnap.docs.map((d) => normalizeDateString(d.data().date));
    if (holidays.includes(dateStr)) {
        // Any work on holiday = eligible for balance
        return true;
    }

    // NOT a weekend → No balance
    if (dayOfWeek !== 0 && dayOfWeek !== 6) return false;

    // Is a weekend → Check against WorkPeriod standard config
    const workPeriodsSnap = await db.collection("workPeriods").get();
    const workPeriods = workPeriodsSnap.docs.map((d) => d.data());

    const applicable = workPeriods.find(
        (wp) => normalizeDateString(wp.startDate) <= dateStr && normalizeDateString(wp.endDate) >= dateStr
    );

    if (applicable) {
        // Map JS dayOfWeek (0=Sun) to WorkPeriod days index (0=Mon, 6=Sun)
        const wpDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const dayConfig = applicable.days[wpDayIndex];

        const shiftKey =
            shift === "Sáng"
                ? "morning"
                : shift === "Chiều"
                    ? "afternoon"
                    : "evening";

        // If standard config does NOT have this shift → Eligible for balance
        if (!dayConfig[shiftKey]) return true;
    } else {
        // No WorkPeriod config → Weekend work grants balance by default
        return true;
    }

    return false;
};

// ========== HELPER: Update balance in Firestore ==========
const updateBalances = async (empIds: string[], amount: number) => {
    for (const empId of empIds) {
        const ref = db.collection("leave_balances").doc(empId);
        await db.runTransaction(async (t) => {
            const doc = await t.get(ref);
            const current = doc.exists ? doc.data()!.compLeaveAvailable || 0 : 0;
            const used = doc.exists ? doc.data()!.compLeaveUsed || 0 : 0;

            t.set(
                ref,
                {
                    id: empId,
                    employeeId: empId,
                    compLeaveAvailable: Math.max(0, current + amount),
                    compLeaveUsed: used,
                    lastUpdated: new Date().toISOString(),
                },
                { merge: true }
            );
        });
    }
};

// ========== HELPER: Check if employee has approved leave on date/shift ==========
const hasApprovedLeave = async (
    empId: string,
    date: string,
    shift: string
): Promise<boolean> => {
    const leavesSnap = await db.collection("leaves")
        .where("employeeId", "==", empId)
        .where("date", "==", date)
        .where("shift", "==", shift)
        .where("status", "==", "Approved")
        .get();

    return !leavesSnap.empty;
};

// ========== TRIGGER: onScheduleUpdate (T7/CN/Holiday) ==========
export const onScheduleUpdate = functions.firestore
    .document("schedule/{scheduleId}")
    .onUpdate(async (change, context) => {
        try {
            const before = change.before.data();
            const after = change.after.data();
            const employeeIds: string[] = after.employeeIds || [];

            // Skip if no employees assigned or if it's a Nghỉ bù item
            if (employeeIds.length === 0 || after.jobId === "JOB_NGHI_BU") return;

            // CASE A: Pending → Completed → Check if eligible (weekend/holiday)
            if (before.status !== "Completed" && after.status === "Completed") {
                const isEligible = await isWorkEligibleForBalance(after);
                if (isEligible) {
                    // Filter employees who DON'T have approved leave on this date/shift
                    const eligibleEmps: string[] = [];
                    for (const empId of employeeIds) {
                        const hasLeave = await hasApprovedLeave(empId, after.date, after.shift);
                        if (!hasLeave) {
                            eligibleEmps.push(empId);
                        } else {
                            console.log(
                                `⏭️ Skipping ${empId} for balance - has approved leave on ${after.date} ${after.shift}`
                            );
                        }
                    }

                    if (eligibleEmps.length > 0) {
                        await updateBalances(eligibleEmps, 1);
                        console.log(
                            `✅ Weekend/Holiday: Granted +1 balance to ${eligibleEmps.length} employees for ${context.params.scheduleId}`
                        );
                    }
                }
            }

            // CASE B: Completed → Other (Revert) → Check if was eligible
            if (before.status === "Completed" && after.status !== "Completed") {
                const wasEligible = await isWorkEligibleForBalance(before);
                if (wasEligible) {
                    // Also check for leaves when reverting (only revert for those who got the bonus)
                    const eligibleEmps: string[] = [];
                    for (const empId of employeeIds) {
                        const hasLeave = await hasApprovedLeave(empId, before.date, before.shift);
                        if (!hasLeave) {
                            eligibleEmps.push(empId);
                        }
                    }

                    if (eligibleEmps.length > 0) {
                        await updateBalances(eligibleEmps, -1);
                        console.log(
                            `⚠️ Weekend/Holiday: Reverted -1 balance from ${eligibleEmps.length} employees for ${context.params.scheduleId}`
                        );
                    }
                }
            }
        } catch (error) {
            console.error(`❌ Error in onScheduleUpdate for schedule/${context.params.scheduleId}:`, error);
            throw error; // Re-throw to mark function as failed in Firebase Console
        }
    });

// ========== TRIGGER: onLeaveApproved (Balance Deduction) ==========
export const onLeaveApproved = functions.firestore
    .document("leaves/{leaveId}")
    .onUpdate(async (change, context) => {
        try {
            const before = change.before.data();
            const after = change.after.data();

            const empId = after.employeeId;
            const leaveType = after.leaveType || "Compensatory";

            // Only process Compensatory leave type
            if (leaveType !== "Compensatory") return;

            // CASE A: Approve → Deduct balance
            if (before.status !== "Approved" && after.status === "Approved") {
                const ref = db.collection("leave_balances").doc(empId);
                await db.runTransaction(async (t) => {
                    const doc = await t.get(ref);
                    if (doc.exists) {
                        const available = doc.data()!.compLeaveAvailable || 0;
                        const used = doc.data()!.compLeaveUsed || 0;
                        t.update(ref, {
                            compLeaveAvailable: Math.max(0, available - 1),
                            compLeaveUsed: used + 1,
                            lastUpdated: new Date().toISOString(),
                        });
                        console.log(
                            `📝 Deducted 1 balance from ${empId} for leave ${context.params.leaveId}`
                        );
                    }
                });
            }

            // CASE B: Unapprove → Restore balance
            if (before.status === "Approved" && after.status !== "Approved") {
                const ref = db.collection("leave_balances").doc(empId);
                await db.runTransaction(async (t) => {
                    const doc = await t.get(ref);
                    if (doc.exists) {
                        const available = doc.data()!.compLeaveAvailable || 0;
                        const used = doc.data()!.compLeaveUsed || 0;
                        t.update(ref, {
                            compLeaveAvailable: available + 1,
                            compLeaveUsed: Math.max(0, used - 1),
                            lastUpdated: new Date().toISOString(),
                        });
                        console.log(
                            `🔄 Restored 1 balance to ${empId} after unapprove ${context.params.leaveId}`
                        );
                    }
                });
            }
        } catch (error) {
            console.error(`❌ Error in onLeaveApproved for leaves/${context.params.leaveId}:`, error);
            throw error; // Re-throw to mark function as failed in Firebase Console
        }
    });
