
import { scheduleService, leavesService } from './firestoreService';
import { ScheduleItem, LeaveRequest } from '../types';
import { format } from 'date-fns';
import { db } from './firebaseConfig';
import { collection, query, where, getDocs, writeBatch, doc, orderBy } from 'firebase/firestore';

export const cleanupService = {
    /**
     * Scan for duplicate Compensatory Leave items (Both Schedule AND Leaves)
     */
    scanDuplicates: async (): Promise<{ duplicates: any[], keep: any[], remove: any[] }> => {
        const [allSchedule, allLeaves] = await Promise.all([
            scheduleService.load(),
            leavesService.load()
        ]);

        const duplicates: any[] = [];
        const toKeep: any[] = [];
        const toRemove: any[] = [];

        // 1. Scan Schedule (JOB_NGHI_BU)
        const compensatorySchedule = allSchedule.filter(s => s.jobId === 'JOB_NGHI_BU');
        const schedGroups = new Map<string, ScheduleItem[]>();

        compensatorySchedule.forEach(item => {
            if (!item.employeeIds || item.employeeIds.length === 0) return;
            const empId = item.employeeIds[0];
            const dateStr = format(new Date(item.date), 'yyyy-MM-dd');
            const key = `${empId}_${dateStr}_${item.shift}`;

            if (!schedGroups.has(key)) schedGroups.set(key, []);
            schedGroups.get(key)!.push(item);
        });

        schedGroups.forEach((items) => {
            if (items.length > 1) {
                let keeper = items.find(i => i.id.startsWith('rest_'));
                if (!keeper) keeper = items[0];

                toKeep.push({ ...keeper, type: 'SCHEDULE' });
                items.forEach(i => {
                    if (i.id !== keeper!.id) {
                        duplicates.push({ ...i, type: 'SCHEDULE' });
                        toRemove.push({ ...i, type: 'SCHEDULE', collection: 'schedule' });
                    }
                });
            }
        });

        // 2. Scan Leaves (Focus on duplicates with same Emp, Date, Shift)
        // Especially those related to "Nghỉ bù"
        const leaveGroups = new Map<string, LeaveRequest[]>();

        allLeaves.forEach(leave => {
            const dateStr = format(new Date(leave.date), 'yyyy-MM-dd');
            const key = `${leave.employeeId}_${dateStr}_${leave.shift}`;

            if (!leaveGroups.has(key)) leaveGroups.set(key, []);
            leaveGroups.get(key)!.push(leave);
        });

        leaveGroups.forEach((items) => {
            if (items.length > 1) {
                // Determine keeper: prefer the one NOT marked as auto if possible, or just the first one
                // If all are "[Đã đổi]...", keep the first one.

                // Sort by ID is not reliable for "created first" as IDs are random/timestamp strings.
                // But generally preserving one is enough.
                const keeper = items[0];

                toKeep.push({ ...keeper, type: 'LEAVE' });

                for (let i = 1; i < items.length; i++) {
                    const itemToRemove = items[i];
                    duplicates.push({ ...itemToRemove, type: 'LEAVE' });
                    toRemove.push({ ...itemToRemove, type: 'LEAVE', collection: 'leaves' });
                }
            }
        });

        return { duplicates, keep: toKeep, remove: toRemove };
    },

    /**
     * Inspect schedule items AND leaves for a specific employee
     */
    inspectEmployee: async (employeeId: string): Promise<any[]> => {
        // Load Schedule
        const { scheduleService, leavesService } = await import('./firestoreService');
        const allSchedule = await scheduleService.load();
        const scheduleItems = allSchedule.filter(s =>
            s.jobId === 'JOB_NGHI_BU' && s.employeeIds && s.employeeIds.includes(employeeId)
        ).map(s => ({ ...s, type: 'SCHEDULE (JOB_NGHI_BU)' }));

        // Load Leaves
        const allLeaves = await leavesService.load();
        const leaveItems = allLeaves.filter(l =>
            l.employeeId === employeeId
        ).map(l => ({
            id: l.id,
            date: l.date,
            shift: l.shift,
            note: l.reason,
            status: l.status,
            type: 'LEAVE_REQUEST'
        }));

        const combined = [...scheduleItems, ...leaveItems];
        return combined.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    },

    /**
     * Scan for "Stale" Schedule Items
     * Scenario: A Schedule Item (JOB_NGHI_BU) exists at Date A, but there is a Leave Request at Date B with "[Đã đổi]" (Moved).
     * This implies the Schedule Item at Date A should have been moved/deleted but wasn't.
     */
    scanStaleSchedule: async (): Promise<{ stale: any[], reasons: string[] }> => {
        const { scheduleService, leavesService } = await import('./firestoreService');
        const [allSchedule, allLeaves] = await Promise.all([
            scheduleService.load(),
            leavesService.load()
        ]);

        const staleItems: any[] = [];
        const reasons: string[] = [];

        // 1. Get all "Moved" leaves
        const movedLeaves = allLeaves.filter(l =>
            l.reason && (l.reason.includes('[Đã đổi]') || l.reason.includes('[Tự động]'))
        );

        // Group moved leaves by Employee
        const empMovedLeaves = new Map<string, LeaveRequest[]>();
        movedLeaves.forEach(l => {
            if (!empMovedLeaves.has(l.employeeId)) empMovedLeaves.set(l.employeeId, []);
            empMovedLeaves.get(l.employeeId)!.push(l);
        });

        // 2. Check Schedule Items (JOB_NGHI_BU)
        const restSchedule = allSchedule.filter(s => s.jobId === 'JOB_NGHI_BU');

        restSchedule.forEach(s => {
            if (!s.employeeIds || s.employeeIds.length === 0) return;
            const empId = s.employeeIds[0];

            // Check if this employee has ANY moved leaves
            const leaves = empMovedLeaves.get(empId);
            if (leaves) {
                // If we have a schedule item at Date A
                // And a leave at Date B
                // And they are NOT the same date (if they were same date, the duplicate scanner would have caught them, or useMyTasks handles strictly)
                // Actually, if we have a Leave with "[Đã đổi]", it essentially supersedes any auto-generated Schedule Item for that "slot".
                // The difficulty is matching the "slot". 
                // Heuristic: If we have a "[Đã đổi]" leave, and a Schedule Item exists within +/- 3 days? 
                // Or just simplistic: One employee usually has limited rest items. 

                // Let's flag it if we find a Leave that is NOT on the same day.
                const sDate = new Date(s.date);

                const potentiallyMatchingLeave = leaves.find(l => {
                    const lDate = new Date(l.date);
                    // Match if DIFFERENT date (suggesting a move happened)
                    // And reasonably close? (e.g. within 7 days)
                    const diffTime = Math.abs(lDate.getTime() - sDate.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return diffDays > 0 && diffDays < 7;
                });

                if (potentiallyMatchingLeave) {
                    staleItems.push({ ...s, type: 'SCHEDULE', collection: 'schedule' });
                    reasons.push(`Nghi vấn dư thừa: Lịch ${format(sDate, 'dd/MM')} trùng đợt với Đơn nghỉ ${format(new Date(potentiallyMatchingLeave.date), 'dd/MM')} (${potentiallyMatchingLeave.reason})`);
                }
            }
        });

        return { stale: staleItems, reasons };
    },

    /**
     * Execute cleanup
     */
    performCleanup: async (itemsToRemove: any[]) => {
        const { deleteBatch, COLLECTIONS } = await import('./firestoreService');

        const scheduleIds = itemsToRemove.filter(i => i.collection === 'schedule' || !i.collection).map(i => i.id);
        const leaveIds = itemsToRemove.filter(i => i.collection === 'leaves').map(i => i.id);

        if (scheduleIds.length > 0) {
            await deleteBatch(COLLECTIONS.SCHEDULE, scheduleIds);
        }

        if (leaveIds.length > 0) {
            await deleteBatch(COLLECTIONS.LEAVES, leaveIds);
        }
    },

    // --- NEW: ADVANCED CLEANUP ---

    queryForCleanup: async (
        collectionName: string,
        filters: { fromDate: string; toDate: string; employeeId?: string; keyword?: string; jobId?: string }
    ) => {
        const { fromDate, toDate, employeeId, keyword, jobId } = filters;
        const colRef = collection(db, collectionName);

        // Base Query: Date Range
        let q = query(colRef,
            where('date', '>=', fromDate),
            where('date', '<=', toDate + 'T23:59:59')
        );

        const snap = await getDocs(q);
        let data = snap.docs.map(d => ({ ...d.data(), id: d.id } as any));

        // Client-side Filter
        if (employeeId && employeeId !== 'all') {
            data = data.filter(item => {
                if (item.employeeId) return item.employeeId === employeeId;
                if (item.employeeIds) return item.employeeIds.includes(employeeId); // Schedule
                if (item.requesterId) return item.requesterId === employeeId; // Swap
                return false;
            });
        }

        // Job Filter (Exact Match) - only apply if jobId is provided
        if (jobId) {
            data = data.filter(item => {
                // Schedule/Allocation uses jobId
                if (item.jobId === jobId) return true;
                // Swap Request uses requestJobId or targetJobId
                if (item.requestJobId === jobId) return true;
                if (item.targetJobId === jobId) return true;
                return false;
            });
        }

        if (keyword) {
            const k = keyword.toLowerCase();
            data = data.filter(item => {
                const searchStr = (item.reason || item.note || item.status || '').toLowerCase();
                return searchStr.includes(k);
            });
        }

        return data;
    },

    deleteBatch: async (collectionName: string, ids: string[], adminId: string) => {
        const batch = writeBatch(db);

        ids.forEach(id => {
            const ref = doc(db, collectionName, id);
            batch.delete(ref);
        });

        // Audit Log for the Batch
        const auditRef = doc(collection(db, 'audits'));
        batch.set(auditRef, {
            action: 'BATCH_DELETE',
            entity: collectionName,
            entityId: `${ids.length}_ITEMS`,
            details: { count: ids.length, deletedIds: ids },
            userId: adminId,
            timestamp: new Date().toISOString()
        });

        await batch.commit();
    }
};
