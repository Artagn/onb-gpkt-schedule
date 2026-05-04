import { db } from './firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { AppConfig } from '../types';

const COLLECTION_NAME = 'appConfig';

export const appConfigService = {
    get: async (): Promise<AppConfig> => {
        try {
            const docRef = doc(db, COLLECTION_NAME, 'default');
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                return snap.data() as AppConfig;
            } else {
                return { id: 'default', autoScheduleCode: '123' };
            }
        } catch (error) {
            console.error("Error getting app config:", error);
            return { id: 'default', autoScheduleCode: '123' };
        }
    },
    save: async (config: AppConfig) => {
        const docRef = doc(db, COLLECTION_NAME, 'default');
        await setDoc(docRef, { ...config, id: 'default' }, { merge: true });
    }
};
