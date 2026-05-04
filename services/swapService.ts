import { db } from './firebaseConfig';
import {
    collection, doc, getDocs, setDoc, query, where, orderBy, writeBatch, getDoc
} from 'firebase/firestore';
import { COLLECTIONS } from './firestoreService';
import { SwapRequest, SwapStatus, Employee, ScheduleItem } from '../types';
import { addDays, isSameDay, parseISO, format } from 'date-fns';

export const swapService = {
    // --- CRUD ---

    createRequest: async (request: Omit<SwapRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
        const newId = `swap_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const now = new Date().toISOString();

        const newRequest: SwapRequest = {
            ...request,
            targetJobId: request.targetJobId ?? null,
            id: newId,
            status: 'Pending',
            createdAt: now,
            updatedAt: now
        };

        await setDoc(doc(db, COLLECTIONS.SWAP_REQUESTS, newId), newRequest);
        return newId;
    },

    getMyRequests: async (userId: string) => {
        const q = query(
            collection(db, COLLECTIONS.SWAP_REQUESTS),
            where('requesterId', '==', userId),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data() as SwapRequest);
    },

    getIncomingRequests: async (userId: string) => {
        const q = query(
            collection(db, COLLECTIONS.SWAP_REQUESTS),
            where('targetId', '==', userId),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data() as SwapRequest);
    },

    getAllRequests: async () => {
        const q = query(
            collection(db, COLLECTIONS.SWAP_REQUESTS),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data() as SwapRequest);
    },

    // --- ACTIONS ---

    approveRequest: async (requestId: string) => {
        const requestRef = doc(db, COLLECTIONS.SWAP_REQUESTS, requestId);
        const requestSnap = await getDoc(requestRef);

        if (!requestSnap.exists()) throw new Error("Request not found");
        const request = requestSnap.data() as SwapRequest;

        if (request.status !== 'Pending') throw new Error("Request is not Pending");

        // EXECUTE SMART SWAP LOGIC
        await executeSwap(request);
    },

    rejectRequest: async (requestId: string) => {
        const requestRef = doc(db, COLLECTIONS.SWAP_REQUESTS, requestId);
        await setDoc(requestRef, {
            status: 'Rejected',
            updatedAt: new Date().toISOString()
        }, { merge: true });
    },

    cancelRequest: async (requestId: string) => {
        const requestRef = doc(db, COLLECTIONS.SWAP_REQUESTS, requestId);
        await setDoc(requestRef, {
            status: 'Cancelled',
            updatedAt: new Date().toISOString()
        }, { merge: true });
    }
};

// --- CORE LOGIC: SMART SWAP ---

async function executeSwap(request: SwapRequest) {
    const batch = writeBatch(db);
    const now = new Date().toISOString();

    // 1. Update Request Status
    const requestRef = doc(db, COLLECTIONS.SWAP_REQUESTS, request.id);
    batch.update(requestRef, { status: 'Approved', updatedAt: now });

    // 2. Fetch Relevant Schedules
    // Rule: We need to find the specific Schedule Items for A and B on the Request Date/Shift
    // fetching all items provided we don't know the exact Schedule IDs is tricky without a query, 
    // but we can query by Date/Shift.

    const scheduleRef = collection(db, COLLECTIONS.SCHEDULE);

    // Query items for the SWAP SHIFT (Date N)
    const qSwap = query(
        scheduleRef,
        where('date', '==', request.requestDate),
        where('shift', '==', request.requestShift)
    );
    const snapSwap = await getDocs(qSwap);
    const swapItems = snapSwap.docs.map(d => ({ ...d.data(), id: d.id } as ScheduleItem));

    // Find A's Item (Requester)
    const itemA = swapItems.find(i => i.employeeIds.includes(request.requesterId) && i.jobId === request.requestJobId);

    // Find B's Item (Target) - Might not exist if B is OFF
    // Note: B might have multiple items if assigned multiple jobs (rare but possible), OR B might have 0 items (OFF).
    // If request.targetJobId is provided, we look for that specific job.
    let itemB: ScheduleItem | undefined;
    if (request.targetJobId) {
        itemB = swapItems.find(i => i.employeeIds.includes(request.targetId) && i.jobId === request.targetJobId);
    }

    if (!itemA) throw new Error("Schedule item for Requester not found (Maybe deleted?)");

    // PERFORM SWAP 1 (Shift N)

    // Remove A from Item A, Add B
    const newIdsA = itemA.employeeIds.filter(id => id !== request.requesterId);
    newIdsA.push(request.targetId);
    batch.update(doc(db, COLLECTIONS.SCHEDULE, itemA.id), { employeeIds: newIdsA });

    // If B has an item, Remove B from Item B, Add A
    if (itemB) {
        const newIdsB = itemB.employeeIds.filter(id => id !== request.targetId);
        newIdsB.push(request.requesterId);
        batch.update(doc(db, COLLECTIONS.SCHEDULE, itemB.id), { employeeIds: newIdsB });
    }

    // 3. SMART SWAP CHECK (Evening Shift -> Swap Next Morning)
    if (request.requestShift === 'Tối') {
        const dateN = parseISO(request.requestDate);
        const dateNext = addDays(dateN, 1);
        const dateNextStr = format(dateNext, "yyyy-MM-dd'T'00:00:00.000'Z'").substring(0, 10); // Simple date check logic
        // Actually, existing system uses ISO string for date. 
        // We need to query range or exact string match if we know the format.
        // The safest way is to fetch All items for Next Morning and filter in memory since batch ops depend on IDs.

        // Wait, 'date' field in Firestore is stored as full ISO string usually? 
        // Let's check 'types.ts' -> date: string; // ISO Date.
        // In 'useFixedSchedule', we see 'nextDay.toISOString()'.
        // Queries usually use >= startOfDay, <= endOfDay.

        // Let's use string prefix matching for date if we can, or just query next day range.
        // dateNextStr (yyyy-mm-dd) might match prefix.

        // Query Next Morning Items
        // Since we can't easily do prefix query without index issues sometimes, let's load collection with range if possible?
        // Or just load all items for next day (it's small, < 50 items).

        const nextDayStart = format(dateNext, 'yyyy-MM-dd') + 'T00:00:00';
        const nextDayEnd = format(dateNext, 'yyyy-MM-dd') + 'T23:59:59';

        const qNext = query(
            scheduleRef,
            where('date', '>=', nextDayStart),
            where('date', '<=', nextDayEnd),
            where('shift', '==', 'Sáng')
        );
        const snapNext = await getDocs(qNext);
        const nextItems = snapNext.docs.map(d => ({ ...d.data(), id: d.id } as ScheduleItem));

        // Find A's Rest Item (Nghỉ bù)
        const restItemA = nextItems.find(i =>
            i.employeeIds.includes(request.requesterId) &&
            (i.jobId === 'JOB_NGHI_BU' || i.note?.includes('Nghỉ bù'))
        );

        // Find B's Item (Job)
        // B might have a job, or be OFF, or have Rest (if B also worked Evening N-1?? Unlikely if B taking Evening N).
        // We find ANY item B is assigned to in Morning N+1.
        const itemsB_Next = nextItems.filter(i => i.employeeIds.includes(request.targetId));

        // LOGIC:
        // A (Rest) -> B.
        // B (Job) -> A.

        if (restItemA) {
            // Give Rest to B
            const newRestIds = restItemA.employeeIds.filter(id => id !== request.requesterId);
            newRestIds.push(request.targetId);
            batch.update(doc(db, COLLECTIONS.SCHEDULE, restItemA.id), { employeeIds: newRestIds });
        }

        // Give B's jobs to A
        for (const item of itemsB_Next) {
            // Note: If B has multiple jobs (rare), A takes all.
            const newJobIds = item.employeeIds.filter(id => id !== request.targetId);
            newJobIds.push(request.requesterId);
            batch.update(doc(db, COLLECTIONS.SCHEDULE, item.id), { employeeIds: newJobIds });
        }
    }

    // Commit Transaction
    await batch.commit();
}
