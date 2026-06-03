"use strict";
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
exports.approveSwapRequest = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
/**
 * Cloud Function: approveSwapRequest
 * Region: asia-southeast1
 * Enforces reads-before-writes under a strict Firestore transaction.
 */
exports.approveSwapRequest = functions
    .region("asia-southeast1")
    .https.onCall(async (data, context) => {
    // 1. Auth Check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }
    const { requestId } = data;
    if (!requestId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing requestId parameter.');
    }
    try {
        const result = await db.runTransaction(async (transaction) => {
            const requestRef = db.collection('swapRequests').doc(requestId);
            const requestSnap = await transaction.get(requestRef);
            if (!requestSnap.exists) {
                throw new Error("Request not found");
            }
            const request = requestSnap.data();
            if (request.status !== 'Pending') {
                throw new Error("Request is no longer Pending");
            }
            // Fetch caller user_role to verify they can approve
            const callerEmail = context.auth.token.email ? context.auth.token.email.toLowerCase().trim() : undefined;
            // Super admin bypass
            let isManager = callerEmail === 'khainguyendang@gmail.com';
            let callerEmpId = "";
            if (!isManager && callerEmail) {
                const callerRolesSnap = await transaction.get(db.collection('user_roles').doc(callerEmail));
                if (!callerRolesSnap.exists) {
                    throw new Error("Caller profile not found in user_roles mapping.");
                }
                const callerData = callerRolesSnap.data();
                callerEmpId = (callerData === null || callerData === void 0 ? void 0 : callerData.employeeId) || "";
                const callerRole = (callerData === null || callerData === void 0 ? void 0 : callerData.role) || "";
                isManager = callerRole === 'Điều phối' || callerRole === 'Quản trị';
            }
            const isTargetUser = request.targetId === callerEmpId;
            // Only the target user B or a Coordinator/Admin can approve the request
            if (!isTargetUser && !isManager) {
                throw new Error("Unauthorized to approve this swap request.");
            }
            // ===== READ ALL RELEVANT DOCUMENTS FIRST (reads-before-writes) =====
            // 1. Swap Shift (Date N) query docs
            const scheduleRef = db.collection('schedule');
            const swapItemsQuery = scheduleRef
                .where('date', '==', request.requestDate)
                .where('shift', '==', request.requestShift);
            const swapItemsSnap = await transaction.get(swapItemsQuery);
            const swapItems = swapItemsSnap.docs.map(d => (Object.assign(Object.assign({}, d.data()), { id: d.id, ref: d.ref })));
            // Find A's Item (Requester)
            const itemA = swapItems.find(i => i.employeeIds.includes(request.requesterId) && i.jobId === request.requestJobId);
            if (!itemA) {
                throw new Error("Schedule item for Requester not found (Maybe deleted?)");
            }
            // Find B's Item (Target) if B has a job to swap
            let itemB = null;
            if (request.targetJobId) {
                itemB = swapItems.find(i => i.employeeIds.includes(request.targetId) && i.jobId === request.targetJobId);
                if (!itemB) {
                    throw new Error("Schedule item for Target not found (Maybe deleted?)");
                }
            }
            // 2. Evening shift Smart Swap references
            let restItemA = null;
            let itemsB_Next = [];
            if (request.requestShift === 'Tối') {
                // Compute next day YYYY-MM-DD string
                const [year, month, day] = request.requestDate.split('-').map(Number);
                const dateNext = new Date(Date.UTC(year, month - 1, day + 1));
                const dateNextStr = dateNext.toISOString().substring(0, 10); // YYYY-MM-DD
                const nextItemsQuery = scheduleRef
                    .where('date', '==', dateNextStr)
                    .where('shift', '==', 'Sáng');
                const nextItemsSnap = await transaction.get(nextItemsQuery);
                const nextItems = nextItemsSnap.docs.map(d => (Object.assign(Object.assign({}, d.data()), { id: d.id, ref: d.ref })));
                // Find A's Rest Item (Nghỉ bù)
                restItemA = nextItems.find(i => {
                    var _a;
                    return i.employeeIds.includes(request.requesterId) &&
                        (i.jobId === 'JOB_NGHI_BU' || ((_a = i.note) === null || _a === void 0 ? void 0 : _a.includes('Nghỉ bù')));
                });
                // Find B's Morning items
                itemsB_Next = nextItems.filter(i => i.employeeIds.includes(request.targetId));
            }
            // ===== EXECUTE ALL WRITES (PHASE 2) =====
            const now = new Date().toISOString();
            // 1. Update Request Status to Approved
            transaction.update(requestRef, {
                status: 'Approved',
                updatedAt: now
            });
            // 2. Perform Swap (Date N)
            // Remove A from Item A, add B
            const newIdsA = itemA.employeeIds.filter((id) => id !== request.requesterId);
            newIdsA.push(request.targetId);
            transaction.update(db.collection('schedule').doc(itemA.id), { employeeIds: newIdsA });
            // If B has an item, remove B from Item B, add A
            if (itemB) {
                const newIdsB = itemB.employeeIds.filter((id) => id !== request.targetId);
                newIdsB.push(request.requesterId);
                transaction.update(db.collection('schedule').doc(itemB.id), { employeeIds: newIdsB });
            }
            // 3. Smart Swap Morning N+1 (Nghỉ bù)
            if (request.requestShift === 'Tối') {
                if (restItemA) {
                    const newRestIds = restItemA.employeeIds.filter((id) => id !== request.requesterId);
                    newRestIds.push(request.targetId);
                    transaction.update(db.collection('schedule').doc(restItemA.id), { employeeIds: newRestIds });
                }
                for (const item of itemsB_Next) {
                    const newJobIds = item.employeeIds.filter((id) => id !== request.targetId);
                    newJobIds.push(request.requesterId);
                    transaction.update(db.collection('schedule').doc(item.id), { employeeIds: newJobIds });
                }
            }
            return { success: true };
        });
        return result;
    }
    catch (error) {
        console.error("Error executing approveSwapRequest transaction:", error);
        throw new functions.https.HttpsError('internal', error.message || 'Error occurred during transaction.');
    }
});
//# sourceMappingURL=executeSwap.js.map