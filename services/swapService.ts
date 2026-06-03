import { db, functions } from './firebaseConfig';
import {
    collection, doc, getDocs, setDoc, query, where, orderBy, getDoc
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { COLLECTIONS } from './firestoreService';
import { SwapRequest, SwapStatus } from '../types';

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
        // Relocate approval logic entirely to Server-Side Cloud Function for security & atomicity
        const approveSwap = httpsCallable(functions, 'approveSwapRequest');
        await approveSwap({ requestId });
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

