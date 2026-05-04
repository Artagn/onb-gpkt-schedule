"use strict";
/**
 * Cloud Function: Recalculate Leave Balances
 *
 * HTTP callable function that recalculates compensatory leave balance
 * for all employees based on actual completed schedule data.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recalculateAllBalances = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
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
const normalizeDateString = (dateInput) => {
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
/**
 * Helper: Get day of week from YYYY-MM-DD string (0=Sun, 6=Sat)
 * Uses UTC to avoid timezone issues
 */
const getDayOfWeek = (dateStr) => {
    // Parse YYYY-MM-DD as UTC to get consistent day of week
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(Date.UTC(year, month - 1, day));
    return d.getUTCDay();
};
/**
 * Check if a schedule item qualifies for balance (Weekend or Holiday)
 */
const isWorkEligibleForBalance = (scheduleData, holidays, workPeriods) => {
    const rawDate = scheduleData.date;
    const dateStr = normalizeDateString(rawDate);
    const dayOfWeek = getDayOfWeek(dateStr);
    const shift = scheduleData.shift;
    // Check if it's a holiday first (normalize holiday dates too for comparison)
    const normalizedHolidays = holidays.map(h => normalizeDateString(h));
    if (normalizedHolidays.includes(dateStr)) {
        return true;
    }
    // NOT a weekend (Sat=6, Sun=0) → No balance
    if (dayOfWeek !== 0 && dayOfWeek !== 6)
        return false;
    // Is a weekend → Check against WorkPeriod standard config
    const applicable = workPeriods.find((wp) => normalizeDateString(wp.startDate) <= dateStr && normalizeDateString(wp.endDate) >= dateStr);
    if (applicable) {
        // Map JS dayOfWeek (0=Sun) to WorkPeriod days index (0=Mon, 6=Sun)
        const wpDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const dayConfig = applicable.days[wpDayIndex];
        const shiftKey = shift === "Sáng"
            ? "morning"
            : shift === "Chiều"
                ? "afternoon"
                : "evening";
        // If standard config does NOT have this shift → Eligible for balance
        if (!dayConfig[shiftKey])
            return true;
    }
    else {
        // No WorkPeriod config → Weekend work grants balance by default
        return true;
    }
    return false;
};
/**
 * Recalculate balance for all employees
 */
exports.recalculateAllBalances = functions.https.onCall(async (data, context) => {
    var _a;
    console.log("🔄 Starting balance recalculation for all employees...");
    // Load all reference data once
    const [employeesSnap, schedulesSnap, leavesSnap, holidaysSnap, workPeriodsSnap] = await Promise.all([
        db.collection("employees").where("status", "==", "Đang hoạt động").get(),
        db.collection("schedule").where("status", "==", "Completed").get(),
        db.collection("leaves").where("status", "==", "Approved").get(),
        db.collection("holidays").get(),
        db.collection("workPeriods").get(),
    ]);
    const holidays = holidaysSnap.docs.map((d) => d.data().date);
    const workPeriods = workPeriodsSnap.docs.map((d) => d.data());
    const employees = employeesSnap.docs.map((d) => (Object.assign({ id: d.id }, d.data())));
    // Build map of approved compensatory leaves (leaveType = "Compensatory")
    const compLeavesUsed = {};
    leavesSnap.docs.forEach((doc) => {
        const leave = doc.data();
        if (leave.leaveType === "Compensatory") {
            const empId = leave.employeeId;
            compLeavesUsed[empId] = (compLeavesUsed[empId] || 0) + 1;
        }
    });
    // Build map of approved leaves by date/shift (for exclusion)
    const approvedLeaveMap = {};
    leavesSnap.docs.forEach((doc) => {
        const leave = doc.data();
        if (!approvedLeaveMap[leave.employeeId]) {
            approvedLeaveMap[leave.employeeId] = new Set();
        }
        // Normalize date for consistent matching
        const normalizedDate = normalizeDateString(leave.date);
        approvedLeaveMap[leave.employeeId].add(`${normalizedDate}|${leave.shift}`);
    });
    // Calculate earned balance from completed schedule items
    const earnedBalance = {};
    for (const sDoc of schedulesSnap.docs) {
        const sched = sDoc.data();
        // Skip Nghỉ bù items
        if (sched.jobId === "JOB_NGHI_BU")
            continue;
        // Check if eligible for balance
        const isEligible = isWorkEligibleForBalance(sched, holidays, workPeriods);
        if (!isEligible)
            continue;
        // Credit each employee (excluding those with approved leave on that date/shift)
        const empIds = sched.employeeIds || [];
        const normalizedSchedDate = normalizeDateString(sched.date);
        for (const empId of empIds) {
            const leaveKey = `${normalizedSchedDate}|${sched.shift}`;
            const hasLeave = (_a = approvedLeaveMap[empId]) === null || _a === void 0 ? void 0 : _a.has(leaveKey);
            if (!hasLeave) {
                earnedBalance[empId] = (earnedBalance[empId] || 0) + 1;
            }
        }
    }
    // Update leave_balances collection
    const batch = db.batch();
    const results = [];
    for (const emp of employees) {
        const empId = emp.id;
        const earned = earnedBalance[empId] || 0;
        const used = compLeavesUsed[empId] || 0;
        const available = Math.max(0, earned - used);
        const ref = db.collection("leave_balances").doc(empId);
        batch.set(ref, {
            id: empId,
            employeeId: empId,
            compLeaveAvailable: available,
            compLeaveUsed: used,
            compLeaveEarned: earned,
            lastUpdated: new Date().toISOString(),
            recalculatedAt: new Date().toISOString(),
        }, { merge: true });
        results.push({
            employeeId: empId,
            earned,
            used,
            available,
        });
    }
    await batch.commit();
    console.log(`✅ Recalculated balance for ${employees.length} employees`);
    return {
        success: true,
        message: `Đã tính lại balance cho ${employees.length} nhân viên`,
        results,
    };
});
//# sourceMappingURL=recalculateBalances.js.map