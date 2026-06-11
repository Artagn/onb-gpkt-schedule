/**
 * allocationMerge.ts - Shared utility for merging Firestore allocations with local state
 * 
 * Extracted from useDailyAllocation.ts and useMyTasks.ts to eliminate code duplication.
 * Both hooks had identical ~60-line merge logic that could diverge during maintenance.
 * 
 * @see useDailyAllocation.ts - Coordinator view
 * @see useMyTasks.ts - Staff view
 */

import { DailyAllocation } from '../types';

/**
 * Deduplicates incoming Firestore allocations by deterministic key ({employeeId}_{jobId}_{date}).
 * When multiple documents share the same key (legacy migration), their numeric fields are summed.
 */
export function deduplicateAllocations(allocations: DailyAllocation[]): DailyAllocation[] {
    const keyToAllocations = new Map<string, DailyAllocation[]>();
    allocations.forEach(a => {
        const key = `${a.employeeId}_${a.jobId}_${a.date}`;
        if (!keyToAllocations.has(key)) {
            keyToAllocations.set(key, []);
        }
        keyToAllocations.get(key)!.push(a);
    });

    const uniqueAllocations: DailyAllocation[] = [];
    keyToAllocations.forEach((list) => {
        const deterministicId = `${list[0].employeeId}_${list[0].jobId}_${list[0].date}`;
        if (list.length === 1) {
            uniqueAllocations.push({
                ...list[0],
                id: deterministicId
            });
        } else {
            const merged: DailyAllocation = {
                ...list[0],
                id: deterministicId,
                assigned: list.reduce((sum, item) => sum + (item.assigned || 0), 0),
                newAssigned: list.reduce((sum, item) => sum + (item.newAssigned || 0), 0),
                completed: list.reduce((sum, item) => sum + (item.completed || 0), 0),
                returnedKD: list.reduce((sum, item) => sum + (item.returnedKD || 0), 0),
                returnedTP: list.reduce((sum, item) => sum + (item.returnedTP || 0), 0),
            };
            uniqueAllocations.push(merged);
        }
    });

    return uniqueAllocations;
}

/**
 * Merges deduplicated Firestore allocations with local state, preserving unsaved edits.
 * 
 * Strategy:
 * 1. Deduplicate incoming Firestore data
 * 2. Identify locally-modified items by comparing field values
 * 3. Keep local versions for dirty items, use Firestore versions for clean items
 * 4. Append any new items that only exist locally
 * 
 * @param incomingAllocations - Raw allocations from Firestore onSnapshot
 * @param localAllocations - Current local state (may contain unsaved edits)
 * @returns Merged allocations array preserving unsaved local changes
 */
export function mergeAllocationsWithLocal(
    incomingAllocations: DailyAllocation[],
    localAllocations: DailyAllocation[]
): DailyAllocation[] {
    const uniqueAllocations = deduplicateAllocations(incomingAllocations);

    // Identify items in local state that are dirty/unsaved based on values
    const unsavedItems = localAllocations.filter(p => {
        const dbItem = uniqueAllocations.find(a => a.employeeId === p.employeeId && a.jobId === p.jobId && a.date === p.date);
        if (!dbItem) {
            // New item: it is unsaved if it has any non-zero modifications
            return p.assigned !== 0 || p.newAssigned !== 0 || p.returnedKD !== 0 || p.returnedTP !== 0;
        }
        // Existing item: check if local properties differ from merged Firestore values
        return p.newAssigned !== dbItem.newAssigned ||
               p.assigned !== dbItem.assigned ||
               p.completed !== dbItem.completed ||
               p.returnedKD !== dbItem.returnedKD ||
               p.returnedTP !== dbItem.returnedTP;
    });

    if (unsavedItems.length === 0) return uniqueAllocations;

    // Merge uniqueAllocations from Firestore, keeping the unsaved local versions
    const merged = uniqueAllocations.map(a => {
        const unsaved = unsavedItems.find(u => u.employeeId === a.employeeId && u.jobId === a.jobId && u.date === a.date);
        return unsaved ? unsaved : a;
    });

    // Append any unsaved new items that don't exist in Firestore yet
    const unsavedNew = unsavedItems.filter(u => !uniqueAllocations.some(a => a.employeeId === u.employeeId && a.jobId === u.jobId && a.date === u.date));

    return [...merged, ...unsavedNew];
}
