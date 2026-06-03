/**
 * Firestore Trigger: Leave Balance Update
 * Phase 5: Staff Experience Upgrade - HYBRID MODEL V4 (Production-Grade Complete)
 * 
 * ONLY handles T7/CN (Weekend) work → Balance accumulation
 * Ca Tối is handled by schedulerEngine.ts (generates "Nghỉ bù" schedule items)
 * 
 * v4.1.0: Added onLeaveDelete trigger to safeguard wallet integrity against direct document deletions.
 * Synchronized full employee schema fields {id, employeeId} inside all wallet creation paths of onLeaveApproved.
 * Preserves strict reads-before-writes constraint and robust idempotency utilizing 'deductedFor' target markers.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

// ========== HELPER: Timezone conversion constants ==========
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000; // +7 hours in milliseconds

/**
 * Normalizes any ISO or standard string date to Vietnam YYYY-MM-DD
 */
const normalizeDateString = (dateInput: string): string => {
    if (dateInput.includes('T')) {
        const utcDate = new Date(dateInput);
        const vietnamDate = new Date(utcDate.getTime() + VIETNAM_OFFSET_MS);
        const year = vietnamDate.getUTCFullYear();
        const month = String(vietnamDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(vietnamDate.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    return dateInput; // Already YYYY-MM-DD
};

/**
 * Get day of week from normalized string (0 = Sunday, 6 = Saturday)
 */
const getDayOfWeek = (dateStr: string): number => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(Date.UTC(year, month - 1, day));
    return d.getUTCDay();
};

/**
 * Chunk an array into smaller sub-arrays of a specified size
 */
const chunkArray = <T>(array: T[], size: number): T[][] => {
    return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
        array.slice(i * size, i * size + size)
    );
};

/**
 * Evaluate if weekend/holiday shift qualifies for leave accumulation
 */
const isWorkEligibleForBalance = async (
    dateStr: string,
    shift: string,
    holidays: string[],
    workPeriods: any[]
): Promise<boolean> => {
    const dayOfWeek = getDayOfWeek(dateStr);

    // 1. Holiday work always qualifies
    if (holidays.includes(dateStr)) {
        return true;
    }

    // 2. Weekdays never qualify
    if (dayOfWeek !== 0 && dayOfWeek !== 6) return false;

    // 3. Weekends qualify if shift is outside standard work period config
    const applicable = workPeriods.find(
        (wp) => normalizeDateString(wp.startDate) <= dateStr && normalizeDateString(wp.endDate) >= dateStr
    );

    if (applicable) {
        const wpDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const dayConfig = applicable.days[wpDayIndex];
        const shiftKey =
            shift === "Sáng"
                ? "morning"
                : shift === "Chiều"
                    ? "afternoon"
                    : "evening";

        if (!dayConfig[shiftKey]) return true;
    } else {
        return true; // Weekend qualifies if no work period configured
    }

    return false;
};

// ==================== TRIGGER 1: onScheduleUpdate ====================
export const onScheduleUpdate = functions.firestore
    .document("schedule/{scheduleId}")
    .onUpdate(async (change, context) => {
        const scheduleId = context.params.scheduleId;
        try {
            const before = change.before.data();
            const after = change.after.data();

            // Validate fields to prevent runtime exceptions & infinite retry loops
            const beforeJobId = before?.jobId;
            const afterJobId = after?.jobId;
            if (beforeJobId === "JOB_NGHI_BU" || afterJobId === "JOB_NGHI_BU") {
                functions.logger.info(`[onScheduleUpdate] Skipping Rest shift item ${scheduleId}`);
                return;
            }

            const rawDate = after?.date || before?.date;
            const shift = after?.shift || before?.shift;
            if (!rawDate || !shift) {
                functions.logger.warn(`[onScheduleUpdate] Missing date or shift for item ${scheduleId}. Skipping.`);
                return;
            }

            const dateStr = normalizeDateString(rawDate);
            const beforeEmployeeIds: string[] = before?.employeeIds || [];
            const afterEmployeeIds: string[] = after?.employeeIds || [];

            // Return early if both lists are empty (no personnel assigned previously or currently)
            if (beforeEmployeeIds.length === 0 && afterEmployeeIds.length === 0) {
                functions.logger.info(`[onScheduleUpdate] No employees assigned for item ${scheduleId}. Skipping.`);
                return;
            }

            // 1. Fetch config collections ONCE to eliminate N+1 database reads
            const holidaysSnap = await db.collection("holidays").get();
            const holidays = holidaysSnap.docs.map((d) => normalizeDateString(d.data().date));

            const workPeriodsSnap = await db.collection("workPeriods").get();
            const workPeriods = workPeriodsSnap.docs.map((d) => d.data());

            // 2. Evaluate balance eligibility
            const isEligible = await isWorkEligibleForBalance(dateStr, shift, holidays, workPeriods);

            const beforeCompleted = before?.status === "Completed" && isEligible;
            const afterCompleted = after?.status === "Completed" && isEligible;

            // 3. Compute Employee Diff (Grant List vs Revert List)
            const grantList: string[] = [];
            const revertList: string[] = [];

            if (!beforeCompleted && afterCompleted) {
                // Schedule changed to Completed -> Grant to all current employees
                grantList.push(...afterEmployeeIds);
            } else if (beforeCompleted && !afterCompleted) {
                // Schedule reverted from Completed -> Revoke from all previous employees
                revertList.push(...beforeEmployeeIds);
            } else if (beforeCompleted && afterCompleted) {
                // Remains Completed -> Grant to added, Revoke from removed employees
                afterEmployeeIds.forEach((id) => {
                    if (!beforeEmployeeIds.includes(id)) grantList.push(id);
                });
                beforeEmployeeIds.forEach((id) => {
                    if (!afterEmployeeIds.includes(id)) revertList.push(id);
                });
            }

            if (grantList.length === 0 && revertList.length === 0) {
                functions.logger.info(`[onScheduleUpdate] No balance change needed for item ${scheduleId}.`);
                return;
            }

            // 4. Batch fetch approved leaves with chunking mechanism to bypass Firestore 10-element limit
            const allRelatedEmployees = Array.from(new Set([...grantList, ...revertList]));
            const approvedLeavesMap = new Map<string, boolean>();

            if (allRelatedEmployees.length > 0) {
                // Chunk size of 10 guarantees safety on all Firestore SDK environments
                const employeeChunks = chunkArray(allRelatedEmployees, 10);
                const leavesPromises = employeeChunks.map((chunk) =>
                    db.collection("leaves")
                        .where("date", "==", dateStr)
                        .where("shift", "==", shift)
                        .where("status", "==", "Approved")
                        .where("employeeId", "in", chunk)
                        .get()
                );
                
                const leavesResults = await Promise.all(leavesPromises);
                leavesResults.forEach((snap) => {
                    snap.docs.forEach((doc) => {
                        approvedLeavesMap.set(doc.data().employeeId, true);
                    });
                });
            }

            // 5. UNIFIED FIRESTORE TRANSACTION: Strict adherence to reads-before-writes constraint
            const scheduleRef = db.collection("schedule").doc(scheduleId);

            await db.runTransaction(async (transaction) => {
                // ==================== PHASE 1: ALL READS ====================
                // Read latest schedule doc inside transaction to prevent write-skew
                const scheduleSnap = await transaction.get(scheduleRef);
                if (!scheduleSnap.exists) {
                    throw new Error(`Schedule document ${scheduleId} not found.`);
                }
                const scheduleData = scheduleSnap.data()!;

                // Get or initialize idempotency map balanceGranted: { [empId]: boolean }
                const balanceGranted = scheduleData.balanceGranted || {};

                // Filter lists using idempotency cờ
                const finalGrantList = grantList.filter((empId) => {
                    const hasLeave = approvedLeavesMap.has(empId);
                    const alreadyGranted = balanceGranted[empId] === true;
                    return !hasLeave && !alreadyGranted;
                });

                const finalRevertList = revertList.filter((empId) => {
                    return balanceGranted[empId] === true;
                });

                if (finalGrantList.length === 0 && finalRevertList.length === 0) {
                    functions.logger.info(`[onScheduleUpdate] No balance modifications required after idempotency check for item ${scheduleId}.`);
                    return;
                }

                // Batch fetch all leave balances inside transaction PRIOR to writing
                const allTransactionEmps = Array.from(new Set([...finalGrantList, ...finalRevertList]));
                const balanceDocPromises = allTransactionEmps.map((empId) =>
                    transaction.get(db.collection("leave_balances").doc(empId))
                );
                const balanceDocSnaps = await Promise.all(balanceDocPromises);
                const balanceSnapMap = new Map(allTransactionEmps.map((id, i) => [id, balanceDocSnaps[i]]));

                // ==================== PHASE 2: ALL WRITES ====================
                // Grant balances (+1)
                for (const empId of finalGrantList) {
                    const balanceSnap = balanceSnapMap.get(empId)!;
                    const current = balanceSnap.exists ? balanceSnap.data()!.compLeaveAvailable || 0 : 0;
                    const used = balanceSnap.exists ? balanceSnap.data()!.compLeaveUsed || 0 : 0;

                    transaction.set(
                        db.collection("leave_balances").doc(empId),
                        {
                            id: empId,
                            employeeId: empId,
                            compLeaveAvailable: current + 1,
                            compLeaveUsed: used,
                            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                        },
                        { merge: true }
                    );

                    balanceGranted[empId] = true;
                }

                // Revoke balances (-1)
                for (const empId of finalRevertList) {
                    const balanceSnap = balanceSnapMap.get(empId)!;
                    const current = balanceSnap.exists ? balanceSnap.data()!.compLeaveAvailable || 0 : 0;
                    const used = balanceSnap.exists ? balanceSnap.data()!.compLeaveUsed || 0 : 0;

                    transaction.set(
                        db.collection("leave_balances").doc(empId),
                        {
                            id: empId,
                            employeeId: empId,
                            compLeaveAvailable: Math.max(0, current - 1),
                            compLeaveUsed: used,
                            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                        },
                        { merge: true }
                    );

                    balanceGranted[empId] = false;
                }

                // Persist the updated idempotency map back to schedule
                transaction.update(scheduleRef, { balanceGranted });

                functions.logger.info(
                    `[onScheduleUpdate][Transaction Success] schedule/${scheduleId}: ` +
                    `Granted to [${finalGrantList.join(",") || "none"}], Reverted from [${finalRevertList.join(",") || "none"}]`
                );
            });

        } catch (error) {
            functions.logger.error(`[onScheduleUpdate] Error in schedule/${scheduleId}:`, error);
            throw error;
        }
    });

// ==================== TRIGGER 2: onLeaveApproved ====================
export const onLeaveApproved = functions.firestore
    .document("leaves/{leaveId}")
    .onUpdate(async (change, context) => {
        const leaveId = context.params.leaveId;
        try {
            const before = change.before.data();
            const after = change.after.data();

            const beforeEmpId = before?.employeeId;
            const afterEmpId = after?.employeeId;
            const leaveType = after?.leaveType || before?.leaveType || "Compensatory";

            // Only process Compensatory leave type
            if (leaveType !== "Compensatory") return;

            const beforeApproved = before?.status === "Approved";
            const afterApproved = after?.status === "Approved";

            // Check if approval status changed OR employee changed on an approved leave (edge case)
            const empIdChanged = beforeApproved && afterApproved && beforeEmpId !== afterEmpId;
            const statusChanged = beforeApproved !== afterApproved;

            if (!statusChanged && !empIdChanged) {
                // No relevant change detected
                return;
            }

            const leaveRef = db.collection("leaves").doc(leaveId);

            // UNIFIED TRANSACTION: Strict reads-before-writes with robust employeeId shift handling
            await db.runTransaction(async (transaction) => {
                // ==================== PHASE 1: ALL READS ====================
                // Get latest leave doc inside transaction to prevent skew
                const leaveSnap = await transaction.get(leaveRef);
                if (!leaveSnap.exists) {
                    throw new Error(`Leave document ${leaveId} not found.`);
                }
                const leaveData = leaveSnap.data()!;
                
                // deductedFor stores the employeeId of the person whose balance was actually deducted
                const deductedFor = leaveData.deductedFor || null;

                let empIdToDeduct: string | null = null;
                let empIdToRestore: string | null = null;

                if (afterApproved) {
                    if (!deductedFor) {
                        // Case A: Just approved and not yet deducted
                        empIdToDeduct = afterEmpId;
                    } else if (deductedFor !== afterEmpId) {
                        // Case B: Approved but employee changed -> Restore old employee, deduct new
                        empIdToRestore = deductedFor;
                        empIdToDeduct = afterEmpId;
                    }
                    // If deductedFor === afterEmpId, it's already processed (idempotent no-op)
                } else {
                    // Case C: Unapproved
                    if (deductedFor) {
                        // If previously deducted, restore balance to that specific person
                        empIdToRestore = deductedFor;
                    }
                }

                if (!empIdToDeduct && !empIdToRestore) {
                    functions.logger.info(`[onLeaveApproved] No balance changes required due to idempotency for leave ${leaveId}`);
                    return;
                }

                // Fetch balance snapshots PRIOR to writes
                let deductSnap: admin.firestore.DocumentSnapshot | null = null;
                let restoreSnap: admin.firestore.DocumentSnapshot | null = null;

                if (empIdToDeduct) {
                    deductSnap = await transaction.get(db.collection("leave_balances").doc(empIdToDeduct));
                }
                if (empIdToRestore) {
                    restoreSnap = await transaction.get(db.collection("leave_balances").doc(empIdToRestore));
                }

                // ==================== PHASE 2: ALL WRITES ====================
                if (empIdToRestore && restoreSnap) {
                    const current = restoreSnap.exists ? restoreSnap.data()!.compLeaveAvailable || 0 : 0;
                    const used = restoreSnap.exists ? restoreSnap.data()!.compLeaveUsed || 0 : 0;

                    transaction.set(
                        db.collection("leave_balances").doc(empIdToRestore),
                        {
                            id: empIdToRestore,
                            employeeId: empIdToRestore,
                            compLeaveAvailable: current + 1,
                            compLeaveUsed: Math.max(0, used - 1),
                            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                        },
                        { merge: true }
                    );
                    functions.logger.info(`[onLeaveApproved][Transaction Success] Restored 1 balance to ${empIdToRestore} for leave ${leaveId}`);
                }

                if (empIdToDeduct && deductSnap) {
                    const current = deductSnap.exists ? deductSnap.data()!.compLeaveAvailable || 0 : 0;
                    const used = deductSnap.exists ? deductSnap.data()!.compLeaveUsed || 0 : 0;

                    transaction.set(
                        db.collection("leave_balances").doc(empIdToDeduct),
                        {
                            id: empIdToDeduct,
                            employeeId: empIdToDeduct,
                            compLeaveAvailable: Math.max(0, current - 1),
                            compLeaveUsed: used + 1,
                            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                        },
                        { merge: true }
                    );
                    functions.logger.info(`[onLeaveApproved][Transaction Success] Deducted 1 balance from ${empIdToDeduct} for leave ${leaveId}`);
                }

                // Update idempotency state with the employee who actually got deducted
                transaction.update(leaveRef, { 
                    deductedFor: afterApproved ? afterEmpId : null
                });
            });

        } catch (error) {
            functions.logger.error(`[onLeaveApproved] Error in leave/${leaveId}:`, error);
            throw error;
        }
    });

// ==================== TRIGGER 3: onLeaveDelete ====================
export const onLeaveDelete = functions.firestore
    .document("leaves/{leaveId}")
    .onDelete(async (snapshot, context) => {
        const leaveId = context.params.leaveId;
        try {
            const leaveData = snapshot.data();
            const leaveType = leaveData?.leaveType || "Compensatory";

            // Only process Compensatory leave type
            if (leaveType !== "Compensatory") return;

            // Only restore if the leave was actually Approved and deducted previously
            const deductedFor = leaveData?.deductedFor;
            if (!deductedFor) {
                functions.logger.info(`[onLeaveDelete] Deleted leave ${leaveId} was not deducted. No balance restoration needed.`);
                return;
            }

            const balanceRef = db.collection("leave_balances").doc(deductedFor);

            // UNIFIED TRANSACTION: Strict reads-before-writes to restore deducted balance
            await db.runTransaction(async (transaction) => {
                // ==================== PHASE 1: ALL READS ====================
                const balanceSnap = await transaction.get(balanceRef);
                const current = balanceSnap.exists ? balanceSnap.data()!.compLeaveAvailable || 0 : 0;
                const used = balanceSnap.exists ? balanceSnap.data()!.compLeaveUsed || 0 : 0;

                // ==================== PHASE 2: ALL WRITES ====================
                transaction.set(
                    balanceRef,
                    {
                        id: deductedFor,
                        employeeId: deductedFor,
                        compLeaveAvailable: current + 1,
                        compLeaveUsed: Math.max(0, used - 1),
                        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                    },
                    { merge: true }
                );
                
                functions.logger.info(`[onLeaveDelete][Transaction Success] Restored 1 balance to ${deductedFor} due to deletion of approved leave ${leaveId}`);
            });

        } catch (error) {
            functions.logger.error(`[onLeaveDelete] Error processing deletion of leave ${leaveId}:`, error);
            throw error;
        }
    });
