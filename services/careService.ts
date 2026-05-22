/**
 * Customer Care Service - Chăm sóc KH Module (ONB_KS)
 * Handles CRUD operations for care_campaigns and care_reports
 */

import { db } from './firebaseConfig';
import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    deleteDoc,
    writeBatch,
    query,
    where,
    orderBy
} from 'firebase/firestore';
import { CareCampaign, CareReport, CareMetric } from '../types';
import { CareCampaignSchema, CareReportSchema, CareMetricSchema } from '../schemas';
import { ZodSchema } from 'zod';

// Collection names
export const CARE_COLLECTIONS = {
    CAMPAIGNS: 'care_campaigns',
    REPORTS: 'care_reports',
    METRICS: 'care_metrics'
};

// ========== GENERIC HELPERS ==========

async function loadCareCollection<T>(collectionName: string, schema?: ZodSchema<T>): Promise<T[]> {
    try {
        const snapshot = await getDocs(collection(db, collectionName));
        return snapshot.docs.map(d => {
            const data = { id: d.id, ...d.data() };
            if (schema) {
                const result = schema.safeParse(data);
                if (!result.success) {
                    console.error(`❌ Care Data Check Failed [${collectionName}/${d.id}]:`, result.error);
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

async function saveCareDocument<T extends { id: string }>(
    collectionName: string,
    data: T
): Promise<void> {
    try {
        const docRef = doc(db, collectionName, data.id);
        await setDoc(docRef, data, { merge: true });
    } catch (error) {
        console.error(`Error saving to ${collectionName}:`, error);
        throw error;
    }
}

async function deleteCareDocument(collectionName: string, docId: string): Promise<void> {
    try {
        await deleteDoc(doc(db, collectionName, docId));
    } catch (error) {
        console.error(`Error deleting from ${collectionName}:`, error);
        throw error;
    }
}

// ========== CARE CAMPAIGNS SERVICE ==========

export const careCampaignsService = {
    load: () => loadCareCollection<CareCampaign>(CARE_COLLECTIONS.CAMPAIGNS, CareCampaignSchema),
    save: (campaign: CareCampaign) => saveCareDocument(CARE_COLLECTIONS.CAMPAIGNS, campaign),
    delete: (id: string) => deleteCareDocument(CARE_COLLECTIONS.CAMPAIGNS, id),

    saveAll: async (campaigns: CareCampaign[]): Promise<void> => {
        const batch = writeBatch(db);
        campaigns.forEach(campaign => {
            const docRef = doc(db, CARE_COLLECTIONS.CAMPAIGNS, campaign.id);
            batch.set(docRef, campaign, { merge: true });
        });
        await batch.commit();
    },

    // Seed default campaigns
    seedDefaults: async (): Promise<boolean> => {
        const existing = await careCampaignsService.load();
        const existingIds = new Set(existing.map(c => c.id));
        const missing = DEFAULT_CAMPAIGNS.filter(c => !existingIds.has(c.id));
        if (missing.length === 0) return false;
        await careCampaignsService.saveAll(missing);
        return true;
    }
};

// ========== CARE METRICS SERVICE ==========

export const careMetricsService = {
    load: () => loadCareCollection<CareMetric>(CARE_COLLECTIONS.METRICS, CareMetricSchema),
    save: (metric: CareMetric) => saveCareDocument(CARE_COLLECTIONS.METRICS, metric),
    delete: (id: string) => deleteCareDocument(CARE_COLLECTIONS.METRICS, id),

    saveAll: async (metrics: CareMetric[]): Promise<void> => {
        const batch = writeBatch(db);
        metrics.forEach(metric => {
            const docRef = doc(db, CARE_COLLECTIONS.METRICS, metric.id);
            batch.set(docRef, metric, { merge: true });
        });
        await batch.commit();
    },

    seedDefaults: async (): Promise<boolean> => {
        const existing = await careMetricsService.load();
        const existingIds = new Set(existing.map(m => m.id));
        const missing = DEFAULT_METRICS.filter(m => !existingIds.has(m.id));
        if (missing.length === 0) return false;
        await careMetricsService.saveAll(missing);
        return true;
    }
};

// ========== CARE REPORTS SERVICE ==========

export const careReportsService = {
    save: (report: CareReport) => saveCareDocument(CARE_COLLECTIONS.REPORTS, report),
    delete: (id: string) => deleteCareDocument(CARE_COLLECTIONS.REPORTS, id),

    // Get report for a specific employee on a specific date
    getByEmployeeAndDate: async (employeeId: string, date: string): Promise<CareReport | null> => {
        const id = `${employeeId}_${date}`;
        try {
            const docRef = doc(db, CARE_COLLECTIONS.REPORTS, id);
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) return null;
            return { id: docSnap.id, ...docSnap.data() } as CareReport;
        } catch (error) {
            console.error('Error getting care report:', error);
            return null;
        }
    },

    // Load all reports for an employee in a specific ISO week
    loadByEmployeeAndWeek: async (employeeId: string, weekId: string): Promise<CareReport[]> => {
        try {
            const q = query(
                collection(db, CARE_COLLECTIONS.REPORTS),
                where('employeeId', '==', employeeId),
                where('weekId', '==', weekId)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CareReport));
        } catch (error) {
            console.error('Error loading weekly reports:', error);
            return [];
        }
    },

    // Load all reports for ALL employees in a specific ISO week
    loadByWeek: async (weekId: string): Promise<CareReport[]> => {
        try {
            const q = query(
                collection(db, CARE_COLLECTIONS.REPORTS),
                where('weekId', '==', weekId)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CareReport));
        } catch (error) {
            console.error('Error loading all weekly reports:', error);
            return [];
        }
    },

    // Load reports for an employee in a specific month
    loadByEmployeeAndMonth: async (employeeId: string, year: number, month: number): Promise<CareReport[]> => {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
        try {
            const q = query(
                collection(db, CARE_COLLECTIONS.REPORTS),
                where('employeeId', '==', employeeId),
                where('date', '>=', startDate),
                where('date', '<=', endDate)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CareReport));
        } catch (error) {
            console.error('Error loading monthly reports:', error);
            return [];
        }
    },

    // Load reports for ALL employees in a specific month
    loadByMonth: async (year: number, month: number): Promise<CareReport[]> => {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
        try {
            const q = query(
                collection(db, CARE_COLLECTIONS.REPORTS),
                where('date', '>=', startDate),
                where('date', '<=', endDate)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CareReport));
        } catch (error) {
            console.error('Error loading all monthly reports:', error);
            return [];
        }
    },
};

// ========== DEFAULT SEED DATA ==========

export const DEFAULT_METRICS: CareMetric[] = [
    {
        id: 'call_count',
        name: 'Số cuộc gọi',
        code: 'call_count',
        unit: 'cuộc',
        isActive: true,
        order: 1,
        createdAt: new Date().toISOString(),
    },
    {
        id: 'duration',
        name: 'Thời lượng',
        code: 'duration',
        unit: 'phút',
        isActive: true,
        order: 2,
        createdAt: new Date().toISOString(),
    },
    {
        id: 'reached',
        name: 'KH tiếp cận',
        code: 'reached',
        unit: 'KH',
        isActive: true,
        order: 3,
        createdAt: new Date().toISOString(),
    },
    {
        id: 'ultraview',
        name: 'Ultraview',
        code: 'ultraview',
        unit: 'lượt',
        isActive: true,
        order: 4,
        createdAt: new Date().toISOString(),
    },
];

export const DEFAULT_CAMPAIGNS: CareCampaign[] = [
    {
        id: 'TTCG_ONBGPKT_NGUNG_CHUACS',
        name: 'Ngưng - Chưa CS',
        code: 'TTCG_ONBGPKT_NGUNG_CHUACS',
        description: 'KH ngưng sử dụng, chưa được chăm sóc',
        isActive: true,
        order: 1,
        createdAt: new Date().toISOString(),
    },
    {
        id: 'TTCG_ONBGPKT_NGUNG_CSLAI',
        name: 'Ngưng - CS lại',
        code: 'TTCG_ONBGPKT_NGUNG_CSLAI',
        description: 'KH ngưng sử dụng, cần chăm sóc lại',
        isActive: true,
        order: 2,
        createdAt: new Date().toISOString(),
    },
    {
        id: 'TTCG_ONBGPKT_ROIBO_CHUACS',
        name: 'Rời bỏ - Chưa CS',
        code: 'TTCG_ONBGPKT_ROIBO_CHUACS',
        description: 'KH rời bỏ, chưa được chăm sóc',
        isActive: true,
        order: 3,
        createdAt: new Date().toISOString(),
    },
    {
        id: 'TTCG_ONBGPKT_CHUADAUKY_CHUACS',
        name: 'Chưa đầu kỳ - Chưa CS',
        code: 'TTCG_ONBGPKT_CHUADAUKY_CHUACS',
        description: 'KH chưa sử dụng đầu kỳ, chưa được chăm sóc',
        isActive: true,
        order: 4,
        createdAt: new Date().toISOString(),
    },
    {
        id: 'TTCG_ONBGPKT_NGUNGDAUKY_CHUACS',
        name: 'Ngưng đầu kỳ - Chưa CS',
        code: 'TTCG_ONBGPKT_NGUNGDAUKY_CHUACS',
        description: 'KH ngưng sử dụng đầu kỳ, chưa được chăm sóc',
        isActive: true,
        order: 5,
        createdAt: new Date().toISOString(),
    },
    {
        id: 'TTCG_ONBGPKT_HETHANSAU2TH',
        name: 'Hết hạn sau 2 tháng',
        code: 'TTCG_ONBGPKT_HETHANSAU2TH',
        description: 'KH hết hạn sau 2 tháng',
        isActive: true,
        order: 6,
        createdAt: new Date().toISOString(),
    },
];

// ========== UTILITY: ISO Week ==========

/**
 * Get ISO week ID from a date string (YYYY-MM-DD)
 * Returns format: 'YYYY-Wxx'
 */
export function getISOWeekId(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    // ISO week: Monday is first day of week
    const thursday = new Date(date);
    thursday.setDate(date.getDate() + (3 - ((date.getDay() + 6) % 7)));
    const yearStart = new Date(thursday.getFullYear(), 0, 1);
    const weekNumber = Math.ceil((((thursday.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${thursday.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

/**
 * Get Monday (start) of the ISO week for a given date
 */
export function getWeekStart(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday offset
    const monday = new Date(date);
    monday.setDate(date.getDate() + diff);
    return monday.toISOString().split('T')[0];
}

/**
 * Get Sunday (end) of the ISO week for a given date
 */
export function getWeekEnd(dateStr: string): string {
    const monday = getWeekStart(dateStr);
    const sunday = new Date(monday + 'T00:00:00');
    sunday.setDate(sunday.getDate() + 6);
    return sunday.toISOString().split('T')[0];
}

/**
 * Check if a date is Monday (start of ISO week)
 */
export function isMonday(dateStr: string): boolean {
    const date = new Date(dateStr + 'T00:00:00');
    return date.getDay() === 1;
}

/**
 * Get all dates in the ISO week of a given date (Mon-Sun)
 */
export function getWeekDates(dateStr: string): string[] {
    const monday = getWeekStart(dateStr);
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday + 'T00:00:00');
        d.setDate(d.getDate() + i);
        dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
}
