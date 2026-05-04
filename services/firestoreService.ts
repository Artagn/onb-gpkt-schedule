/**
 * Firestore Service - Real-time Database for ONB GPKT Schedule
 * Replaces LocalStorage with Firestore for multi-user sync
 */

import { db } from './firebaseConfig';
import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    writeBatch,
    query,
    orderBy,
    limit,
    where,
    onSnapshot,
    Unsubscribe
} from 'firebase/firestore';

import { ZodSchema } from 'zod';
import { Employee, Job, SubJob, ScheduleItem, LeaveRequest, DailyAllocation, WorkPeriod, Holiday, SchedulePattern, AppConfig, AuditLog, LeaveBalance } from '../types';
import {
    EmployeeSchema, JobSchema, SubJobSchema, ScheduleItemSchema,
    LeaveRequestSchema, DailyAllocationSchema, WorkPeriodSchema,
    HolidaySchema, SchedulePatternSchema, LeaveBalanceSchema
} from '../schemas';

// Collection names
const COLLECTIONS = {
    EMPLOYEES: 'employees',
    JOBS: 'jobs',
    SUBJOBS: 'subJobs',
    SCHEDULE: 'schedule',
    LEAVES: 'leaves',
    ALLOCATIONS: 'allocations',
    AUDITS: 'audits',
    WORK_PERIODS: 'workPeriods',
    HOLIDAYS: 'holidays',
    PATTERNS: 'patterns',
    APP_CONFIG: 'appConfig',
    SWAP_REQUESTS: 'swapRequests',
    LEAVE_BALANCES: 'leave_balances'
};

// ========== GENERIC CRUD OPERATIONS ==========

/**
 * Helper to remove undefined/NaN values (Firestore rejects these)
 * recursively converts undefined/NaN -> null
 */
function sanitizeData(data: any): any {
    if (data === undefined) return null;
    if (data === null) return null;
    if (typeof data === 'number' && (Number.isNaN(data) || !Number.isFinite(data))) return null;
    if (Array.isArray(data)) {
        return data.map(item => sanitizeData(item));
    }
    if (typeof data === 'object' && !(data instanceof Date)) {
        const result: any = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                result[key] = sanitizeData(data[key]);
            }
        }
        return result;
    }
    return data;
}

/**
 * Load all documents from a collection with optional Zod validation
 */
export async function loadCollection<T>(collectionName: string, schema?: ZodSchema<T>): Promise<T[]> {
    try {
        const snapshot = await getDocs(collection(db, collectionName));
        return snapshot.docs.map(doc => {
            const data = { id: doc.id, ...doc.data() };
            if (schema) {
                const result = schema.safeParse(data);
                if (!result.success) {
                    console.error(`❌ Data Check Failed [${collectionName}/${doc.id}]:`, result.error);
                    return null;
                }
                return result.data;
            }
            return data as T;
        }).filter((item): item is T => item !== null);
    } catch (error) {
        console.error(`Error loading ${collectionName}:`, error);
        return [];
    }
}

/**
 * Load documents from a collection within a date range with optional Zod validation
 * @param dateField defaults to 'date'
 */
export async function loadCollectionWithDateRange<T>(
    collectionName: string,
    startDate: string,
    endDate: string,
    dateField: string = 'date',
    schema?: ZodSchema<T>
): Promise<T[]> {
    try {
        const q = query(
            collection(db, collectionName),
            where(dateField, '>=', startDate),
            where(dateField, '<=', endDate)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = { id: doc.id, ...doc.data() };
            if (schema) {
                const result = schema.safeParse(data);
                if (!result.success) {
                    console.error(`❌ Data Check Failed [${collectionName}/${doc.id}]:`, result.error);
                    return null;
                }
                return result.data;
            }
            return data as T;
        }).filter((item): item is T => item !== null);
    } catch (error) {
        console.error(`Error loading ${collectionName} with range:`, error);
        return [];
    }
}

/**
 * Save a single document (creates or updates)
 */
export async function saveDocument<T extends { id: string }>(
    collectionName: string,
    data: T
): Promise<void> {
    try {
        const docRef = doc(db, collectionName, data.id);
        const cleanData = sanitizeData(data); // Using the helper from same file
        await setDoc(docRef, cleanData, { merge: true });
    } catch (error) {
        console.error(`Error saving to ${collectionName}:`, error);
        throw error;
    }
}

/**
 * Delete a document
 */
export async function deleteDocument(
    collectionName: string,
    docId: string
): Promise<void> {
    try {
        await deleteDoc(doc(db, collectionName, docId));
    } catch (error) {
        console.error(`Error deleting from ${collectionName}:`, error);
        throw error;
    }
}

/**
 * Batch save entire collection (replaces all data)
 * Handles auto-chunking for batches > 500 items
 */
export async function saveCollection<T extends { id: string }>(
    collectionName: string,
    items: T[]
): Promise<void> {
    const CHUNK_SIZE = 450; // Firestore limit is 500, keep safety margin
    const chunks = [];

    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
        chunks.push(items.slice(i, i + CHUNK_SIZE));
    }

    try {
        await Promise.all(chunks.map(async (chunk) => {
            const batch = writeBatch(db);
            chunk.forEach(item => {
                const docRef = doc(db, collectionName, item.id);
                // Use { merge: true } to be safe and consistent with saveDocument
                batch.set(docRef, item, { merge: true });
            });
            await batch.commit().catch(err => {
                if (err.code === 'resource-exhausted') {
                    throw new Error("QUOTA_EXCEEDED");
                }
                throw err;
            });
        }));
    } catch (error) {
        console.error(`Error batch saving ${collectionName}:`, error);
        throw error;
    }
}


// ========== REAL-TIME SUBSCRIPTIONS ==========

/**
 * Subscribe to a collection with date range filter (real-time)
 * Returns unsubscribe function for cleanup
 */
export function subscribeToCollectionWithDateRange<T>(
    collectionName: string,
    startDate: string,
    endDate: string,
    onData: (items: T[]) => void,
    onError?: (error: Error) => void,
    dateField: string = 'date',
    schema?: ZodSchema<T>
): Unsubscribe {
    const q = query(
        collection(db, collectionName),
        where(dateField, '>=', startDate),
        where(dateField, '<=', endDate)
    );

    return onSnapshot(q,
        (snapshot) => {
            const items = snapshot.docs.map(doc => {
                const data = { id: doc.id, ...doc.data() };
                if (schema) {
                    const result = schema.safeParse(data);
                    if (!result.success) {
                        console.error(`❌ RT Data Check Failed [${collectionName}/${doc.id}]:`, result.error);
                        return null;
                    }
                    return result.data;
                }
                return data as T;
            }).filter((item): item is T => item !== null);
            onData(items);
        },
        (error) => {
            console.error(`❌ RT Error [${collectionName}]:`, error);
            onError?.(error);
        }
    );
}

// ========== TYPED OPERATIONS FOR EACH COLLECTION ==========

// --- EMPLOYEES ---
export const employeesService = {
    load: () => loadCollection<Employee>(COLLECTIONS.EMPLOYEES, EmployeeSchema),
    save: (employee: Employee) => saveDocument(COLLECTIONS.EMPLOYEES, employee),
    delete: (id: string) => deleteDocument(COLLECTIONS.EMPLOYEES, id),
    saveAll: (employees: Employee[]) => saveCollection(COLLECTIONS.EMPLOYEES, employees),
};

// --- JOBS ---
export const jobsService = {
    load: () => loadCollection<Job>(COLLECTIONS.JOBS, JobSchema),
    save: (job: Job) => saveDocument(COLLECTIONS.JOBS, job),
    delete: (id: string) => deleteDocument(COLLECTIONS.JOBS, id),
    saveAll: (jobs: Job[]) => saveCollection(COLLECTIONS.JOBS, jobs),
};

// --- SUBJOBS ---
export const subJobsService = {
    load: () => loadCollection<SubJob>(COLLECTIONS.SUBJOBS, SubJobSchema),
    save: (subJob: SubJob) => saveDocument(COLLECTIONS.SUBJOBS, subJob),
    delete: (id: string) => deleteDocument(COLLECTIONS.SUBJOBS, id),
    saveAll: (subJobs: SubJob[]) => saveCollection(COLLECTIONS.SUBJOBS, subJobs),
};

// --- SCHEDULE ---
export const scheduleService = {
    load: () => loadCollection<ScheduleItem>(COLLECTIONS.SCHEDULE, ScheduleItemSchema),
    loadWithDateRange: (startDate: string, endDate: string) =>
        loadCollectionWithDateRange<ScheduleItem>(COLLECTIONS.SCHEDULE, startDate, endDate, 'date', ScheduleItemSchema),
    save: (item: ScheduleItem) => saveDocument(COLLECTIONS.SCHEDULE, item),
    delete: (id: string) => deleteDocument(COLLECTIONS.SCHEDULE, id),
    saveAll: (items: ScheduleItem[]) => saveCollection(COLLECTIONS.SCHEDULE, items),
};

// --- LEAVES ---
export const leavesService = {
    load: () => loadCollection<LeaveRequest>(COLLECTIONS.LEAVES, LeaveRequestSchema),
    loadWithDateRange: (startDate: string, endDate: string) =>
        loadCollectionWithDateRange<LeaveRequest>(COLLECTIONS.LEAVES, startDate, endDate, 'date', LeaveRequestSchema),
    save: (leave: LeaveRequest) => saveDocument(COLLECTIONS.LEAVES, leave),
    delete: (id: string) => deleteDocument(COLLECTIONS.LEAVES, id),
    saveAll: (leaves: LeaveRequest[]) => saveCollection(COLLECTIONS.LEAVES, leaves),
};

// --- LEAVE BALANCES (Phase 5) ---
export const leaveBalanceService = {
    load: async (employeeId: string): Promise<LeaveBalance | null> => {
        try {
            const docRef = doc(db, COLLECTIONS.LEAVE_BALANCES, employeeId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = { id: docSnap.id, ...docSnap.data() };
                const result = LeaveBalanceSchema.safeParse(data);
                if (result.success) return result.data;
                console.error('❌ LeaveBalance validation failed:', result.error);
                return null;
            }
            return null;
        } catch (error) {
            console.error('Error loading leave balance:', error);
            return null;
        }
    },
    save: async (data: LeaveBalance): Promise<void> => {
        await setDoc(doc(db, COLLECTIONS.LEAVE_BALANCES, data.id), data, { merge: true });
    }
};

export const auditService = {
    log: async (action: string, entity: string, entityId: string, details: any, userId: string) => {
        try {
            const audit: AuditLog = {
                id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                action,
                entity,
                entityId,
                details, // details can remain any as it varies widely
                userId,
                timestamp: new Date().toISOString()
            };

            // Return the promise so callers can await if critical
            await saveDocument(COLLECTIONS.AUDITS, audit);
        } catch (err) {
            console.error("❌ Audit log failed:", err);
            // We do NOT throw here to prevent blocking the main flow if logging fails
        }
    },
    getAll: async (limitCount = 100) => {
        try {
            const q = query(
                collection(db, COLLECTIONS.AUDITS),
                orderBy('timestamp', 'desc'),
                limit(limitCount)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
        } catch (error) {
            console.error("Error fetching audits:", error);
            return [];
        }
    },
    clearAll: async () => {
        try {
            const snapshot = await getDocs(collection(db, COLLECTIONS.AUDITS));
            const ids = snapshot.docs.map(doc => doc.id);
            if (ids.length > 0) {
                await deleteBatch(COLLECTIONS.AUDITS, ids);
            }
        } catch (error) {
            console.error("Error clearing logs:", error);
            throw error;
        }
    }
};

// --- DAILY ALLOCATIONS ---
export const allocationsService = {
    load: () => loadCollection<DailyAllocation>(COLLECTIONS.ALLOCATIONS, DailyAllocationSchema),
    loadWithDateRange: (startDate: string, endDate: string) =>
        loadCollectionWithDateRange<DailyAllocation>(COLLECTIONS.ALLOCATIONS, startDate, endDate, 'date', DailyAllocationSchema),
    save: (allocation: DailyAllocation) => saveDocument(COLLECTIONS.ALLOCATIONS, allocation),
    delete: (id: string) => deleteDocument(COLLECTIONS.ALLOCATIONS, id),
    saveAll: (allocations: DailyAllocation[]) => saveCollection(COLLECTIONS.ALLOCATIONS, allocations),
};

// --- WORK PERIODS ---
export const workPeriodsService = {
    load: () => loadCollection<WorkPeriod>(COLLECTIONS.WORK_PERIODS, WorkPeriodSchema),
    save: (period: WorkPeriod) => saveDocument(COLLECTIONS.WORK_PERIODS, period),
    delete: (id: string) => deleteDocument(COLLECTIONS.WORK_PERIODS, id),
    saveAll: (periods: WorkPeriod[]) => saveCollection(COLLECTIONS.WORK_PERIODS, periods),
};

// --- HOLIDAYS ---
export const holidaysService = {
    load: () => loadCollection<Holiday>(COLLECTIONS.HOLIDAYS, HolidaySchema),
    save: (holiday: Holiday) => saveDocument(COLLECTIONS.HOLIDAYS, holiday),
    delete: (id: string) => deleteDocument(COLLECTIONS.HOLIDAYS, id),
    saveAll: (holidays: Holiday[]) => saveCollection(COLLECTIONS.HOLIDAYS, holidays),
};

// --- PATTERNS ---
export const patternsService = {
    load: () => loadCollection<SchedulePattern>(COLLECTIONS.PATTERNS, SchedulePatternSchema),
    save: (pattern: SchedulePattern) => saveDocument(COLLECTIONS.PATTERNS, pattern),
    delete: (id: string) => deleteDocument(COLLECTIONS.PATTERNS, id),
    saveAll: (patterns: SchedulePattern[]) => saveCollection(COLLECTIONS.PATTERNS, patterns),
};

// ========== MIGRATION HELPERS ==========

/**
 * Initialize Firestore with default data (run once)
 * Call this when migrating from LocalStorage to Firestore
 */
export async function initializeFirestoreWithDefaults(data: {
    employees: Employee[];
    jobs: Job[];
    subJobs: SubJob[];
    schedule: ScheduleItem[];
    leaves: LeaveRequest[];
    allocations: DailyAllocation[];
    workPeriods: WorkPeriod[];
    holidays: Holiday[];
    patterns: SchedulePattern[];
}): Promise<void> {


    try {
        await Promise.all([
            employeesService.saveAll(data.employees),
            jobsService.saveAll(data.jobs),
            subJobsService.saveAll(data.subJobs),
            scheduleService.saveAll(data.schedule),
            leavesService.saveAll(data.leaves),
            allocationsService.saveAll(data.allocations),
            workPeriodsService.saveAll(data.workPeriods),
            holidaysService.saveAll(data.holidays),
            patternsService.saveAll(data.patterns)
        ]);


    } catch (error) {
        console.error('❌ Error initializing Firestore:', error);
        throw error;
    }
}



// ========== BATCH OPERATIONS ==========

/**
 * Batch delete documents by ID
 * Handles auto-chunking for batches > 500 items
 */
export async function deleteBatch(
    collectionName: string,
    docIds: string[]
): Promise<void> {
    const CHUNK_SIZE = 450;
    const chunks = [];

    for (let i = 0; i < docIds.length; i += CHUNK_SIZE) {
        chunks.push(docIds.slice(i, i + CHUNK_SIZE));
    }

    try {
        await Promise.all(chunks.map(async (chunk) => {
            const batch = writeBatch(db);
            chunk.forEach(id => {
                const docRef = doc(db, collectionName, id);
                batch.delete(docRef);
            });
            await batch.commit().catch(err => {
                if (err.code === 'resource-exhausted') {
                    throw new Error("QUOTA_EXCEEDED");
                }
                throw err;
            });
        }));
    } catch (error) {
        console.error(`Error batch deleting from ${collectionName}:`, error);
        throw error;
    }
}


// ========== ADVANCED MIGRATION (WIPE & RESTORE) ==========

/**
 * Wipe ALL data from ALL collections
 * CAUTION: Destructive!
 */
export async function wipeAllCollections(): Promise<void> {
    const allCollections = [
        COLLECTIONS.EMPLOYEES,
        COLLECTIONS.JOBS,
        COLLECTIONS.SUBJOBS,
        COLLECTIONS.SCHEDULE,
        COLLECTIONS.LEAVES,
        COLLECTIONS.ALLOCATIONS,
        COLLECTIONS.WORK_PERIODS,
        COLLECTIONS.HOLIDAYS,
        COLLECTIONS.PATTERNS,
        COLLECTIONS.AUDITS,
        COLLECTIONS.APP_CONFIG
    ];



    for (const colName of allCollections) {
        const snapshot = await getDocs(collection(db, colName));
        const ids = snapshot.docs.map(d => d.id);
        if (ids.length > 0) {

            await deleteBatch(colName, ids);
        }
    }

}

/**
 * RESET Cloud Data to Default Mock Data
 * 1. Wipe all data
 * 2. Seed default data
 */
export async function resetFirestoreToDefaults(defaultData: any): Promise<void> {
    try {
        await wipeAllCollections();
        await initializeFirestoreWithDefaults(defaultData);

    } catch (error) {
        console.error('Factory Reset Failed:', error);
        throw error;
    }
}

/**
 * RESTORE Cloud Data from Backup JSON
 * 1. Wipe all data
 * 2. Seed from JSON
 */
export async function importDataToFirestore(importedData: any): Promise<void> {
    try {
        await wipeAllCollections();

        // Validate and save each collection if present
        const promises = [];
        if (importedData.employees) promises.push(employeesService.saveAll(importedData.employees));
        if (importedData.jobs) promises.push(jobsService.saveAll(importedData.jobs));
        if (importedData.subJobs) promises.push(subJobsService.saveAll(importedData.subJobs));
        if (importedData.schedule) promises.push(scheduleService.saveAll(importedData.schedule));
        if (importedData.leaves) promises.push(leavesService.saveAll(importedData.leaves));
        if (importedData.allocations) promises.push(allocationsService.saveAll(importedData.allocations));
        if (importedData.workPeriods) promises.push(workPeriodsService.saveAll(importedData.workPeriods));
        if (importedData.holidays) promises.push(holidaysService.saveAll(importedData.holidays));
        if (importedData.patterns) promises.push(patternsService.saveAll(importedData.patterns));

        await Promise.all(promises);

    } catch (error) {
        console.error('Restore Failed:', error);
        throw error;
    }
}

// Export collection names for external use
export { COLLECTIONS };
