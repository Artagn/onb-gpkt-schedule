/**
 * Evaluation Service - Monthly Evaluation Module
 * Handles CRUD operations for evaluation_metrics, evaluation_periods, and evaluations
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
    where
} from 'firebase/firestore';
import { EvaluationMetric, EvaluationPeriod, EmployeeEvaluation } from '../types';
import { EvaluationMetricSchema, EvaluationPeriodSchema, EmployeeEvaluationSchema } from '../schemas';
import { ZodSchema } from 'zod';
import { getLivechatJobDefaultStandard } from '../utils/evaluationHelpers';

// Collection names
export const EVAL_COLLECTIONS = {
    METRICS: 'evaluation_metrics',
    PERIODS: 'evaluation_periods',
    EVALUATIONS: 'evaluations'
};

// ========== GENERIC HELPERS ==========

async function loadEvalCollection<T>(collectionName: string, schema?: ZodSchema<T>): Promise<T[]> {
    try {
        const snapshot = await getDocs(collection(db, collectionName));
        return snapshot.docs.map(doc => {
            const data = { id: doc.id, ...doc.data() };
            if (schema) {
                const result = schema.safeParse(data);
                if (!result.success) {
                    console.error(`❌ Eval Data Check Failed [${collectionName}/${doc.id}]:`, result.error);
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

async function saveEvalDocument<T extends { id: string }>(
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

async function deleteEvalDocument(collectionName: string, docId: string): Promise<void> {
    try {
        await deleteDoc(doc(db, collectionName, docId));
    } catch (error) {
        console.error(`Error deleting from ${collectionName}:`, error);
        throw error;
    }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

// ========== EVALUATION METRICS SERVICE ==========

export const evaluationMetricsService = {
    load: () => loadEvalCollection<EvaluationMetric>(EVAL_COLLECTIONS.METRICS, EvaluationMetricSchema),
    save: (metric: EvaluationMetric) => saveEvalDocument(EVAL_COLLECTIONS.METRICS, metric),
    delete: (id: string) => deleteEvalDocument(EVAL_COLLECTIONS.METRICS, id),

    saveAll: async (metrics: EvaluationMetric[]): Promise<void> => {
        const chunks = chunkArray(metrics, 400);
        for (const chunk of chunks) {
            const batch = writeBatch(db);
            chunk.forEach(metric => {
                const docRef = doc(db, EVAL_COLLECTIONS.METRICS, metric.id);
                batch.set(docRef, metric, { merge: true });
            });
            await batch.commit();
        }
    },

    // Seed default metrics - supports partial seeding (adds missing categories)
    seedDefaults: async (): Promise<boolean> => {
        const existing = await evaluationMetricsService.load();
        const existingIds = new Set(existing.map(m => m.id));

        // Find metrics that don't exist yet
        const missing = DEFAULT_METRICS.filter(m => !existingIds.has(m.id));

        if (missing.length === 0) {
            return false;
        }

        await evaluationMetricsService.saveAll(missing);
        return true;
    }
};

// ========== EVALUATION PERIODS SERVICE ==========

export const evaluationPeriodsService = {
    load: () => loadEvalCollection<EvaluationPeriod>(EVAL_COLLECTIONS.PERIODS, EvaluationPeriodSchema),
    save: (period: EvaluationPeriod) => saveEvalDocument(EVAL_COLLECTIONS.PERIODS, period),
    delete: (id: string) => deleteEvalDocument(EVAL_COLLECTIONS.PERIODS, id),

    // Get open period (for employees to submit)
    getOpenPeriod: async (): Promise<EvaluationPeriod | null> => {
        try {
            const q = query(
                collection(db, EVAL_COLLECTIONS.PERIODS),
                where('status', '==', 'open')
            );
            const snapshot = await getDocs(q);
            if (snapshot.empty) return null;
            return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as EvaluationPeriod;
        } catch (error) {
            console.error('Error getting open period:', error);
            return null;
        }
    },

    // Create new period with default config
    createPeriod: async (month: number, year: number, createdBy: string): Promise<EvaluationPeriod> => {
        const id = `eval_${year}_${String(month).padStart(2, '0')}`;
        const now = new Date().toISOString();

        // Load metrics to pre-populate overrides with defaults
        const metrics = await evaluationMetricsService.load();
        const metricOverrides: { [key: string]: number } = {};
        metrics.forEach(m => {
            metricOverrides[m.id] = m.defaultPoints;
        });

        // Pre-populate livechat standards based on active jobs in 'jobs' collection
        const livechatStandards: { [jobId: string]: number } = {};
        try {
            const jobsSnapshot = await getDocs(collection(db, 'jobs'));
            jobsSnapshot.docs.forEach(doc => {
                const job = doc.data();
                if (job.group === 'Livechat' && job.isActive) {
                    livechatStandards[doc.id] = getLivechatJobDefaultStandard(job.name || '');
                }
            });
        } catch (e) {
            console.error('Error pre-populating livechat standards:', e);
        }

        const period: EvaluationPeriod = {
            id,
            name: `Đánh giá tháng ${String(month).padStart(2, '0')}/${year}`,
            month,
            year,
            status: 'draft',
            metricOverrides,
            dtConfig: {
                kpiPlanRate: 95,
                kpiWeight: 80,
                workWeight: 20,
                // Copy active livechat difficulty metrics as period config
                livechatDifficultyConfig: metrics
                    .filter(m => m.category === 'livechat_difficulty' && m.isActive)
                    .sort((a, b) => a.order - b.order)
                    .map(m => ({ id: m.id, name: m.name, multiplier: m.defaultPoints })),
                livechatStandards,
            },
            ksConfig: {
                kpiPlanRate: 95,
                kpiPlanRatePrevYear: 93,
                currentYearWeight: 70,
                previousYearWeight: 30,
            },
            ratingThresholds: {
                excellent: 105,
                good: 100,
            },
            createdBy,
            createdAt: now,
            updatedAt: now,
        };

        await evaluationPeriodsService.save(period);
        return period;
    }
};

// ========== EMPLOYEE EVALUATIONS SERVICE ==========

export const evaluationsService = {
    load: () => loadEvalCollection<EmployeeEvaluation>(EVAL_COLLECTIONS.EVALUATIONS, EmployeeEvaluationSchema),
    save: (evaluation: EmployeeEvaluation) => saveEvalDocument(EVAL_COLLECTIONS.EVALUATIONS, evaluation),
    delete: (id: string) => deleteEvalDocument(EVAL_COLLECTIONS.EVALUATIONS, id),

    // Get evaluations for a specific period
    loadByPeriod: async (periodId: string): Promise<EmployeeEvaluation[]> => {
        try {
            const q = query(
                collection(db, EVAL_COLLECTIONS.EVALUATIONS),
                where('periodId', '==', periodId)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmployeeEvaluation));
        } catch (error) {
            console.error('Error loading evaluations by period:', error);
            return [];
        }
    },

    // Get employee's evaluation for a period
    getByEmployeeAndPeriod: async (employeeId: string, periodId: string): Promise<EmployeeEvaluation | null> => {
        const id = `${periodId}_${employeeId}`;
        try {
            const docRef = doc(db, EVAL_COLLECTIONS.EVALUATIONS, id);
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) return null;
            return { id: docSnap.id, ...docSnap.data() } as EmployeeEvaluation;
        } catch (error) {
            console.error('Error getting employee evaluation:', error);
            return null;
        }
    },

    // Approve an evaluation
    approve: async (id: string, approvedBy: string): Promise<void> => {
        try {
            const docRef = doc(db, EVAL_COLLECTIONS.EVALUATIONS, id);
            await setDoc(docRef, {
                status: 'approved',
                approvedBy,
                approvedAt: new Date().toISOString()
            }, { merge: true });
        } catch (error) {
            console.error('Error approving evaluation:', error);
            throw error;
        }
    },

    // Reject an evaluation with required reason
    reject: async (id: string, reason: string): Promise<void> => {
        if (!reason.trim()) {
            throw new Error('Reason is required for rejection');
        }
        try {
            const docRef = doc(db, EVAL_COLLECTIONS.EVALUATIONS, id);
            await setDoc(docRef, {
                status: 'rejected',
                notes: reason
            }, { merge: true });
        } catch (error) {
            console.error('Error rejecting evaluation:', error);
            throw error;
        }
    },

    // Bulk approve multiple evaluations
    bulkApprove: async (ids: string[], approvedBy: string): Promise<void> => {
        try {
            const now = new Date().toISOString();
            const chunks = chunkArray(ids, 400);
            for (const chunk of chunks) {
                const batch = writeBatch(db);
                chunk.forEach(id => {
                    const docRef = doc(db, EVAL_COLLECTIONS.EVALUATIONS, id);
                    batch.set(docRef, {
                        status: 'approved',
                        approvedBy,
                        approvedAt: now
                    }, { merge: true });
                });
                await batch.commit();
            }
        } catch (error) {
            console.error('Error bulk approving evaluations:', error);
            throw error;
        }
    },

    // Delete multiple evaluations (cleanup stale records)
    deleteMany: async (ids: string[]): Promise<void> => {
        try {
            const chunks = chunkArray(ids, 400);
            for (const chunk of chunks) {
                const batch = writeBatch(db);
                chunk.forEach(id => {
                    const docRef = doc(db, EVAL_COLLECTIONS.EVALUATIONS, id);
                    batch.delete(docRef);
                });
                await batch.commit();
            }
        } catch (error) {
            console.error('Error deleting evaluations:', error);
            throw error;
        }
    },

    // Lock a period: snapshot config into each evaluation so future config changes don't affect data
    lockPeriod: async (periodId: string, lockedBy: string): Promise<void> => {
        try {
            // 1. Load period config
            const periods = await evaluationPeriodsService.load();
            const period = periods.find(p => p.id === periodId);
            if (!period) throw new Error('Period not found');

            // 2. Load all metrics
            const metrics = await evaluationMetricsService.load();

            // 3. Load all evaluations for this period
            const evaluations = await evaluationsService.loadByPeriod(periodId);
            if (evaluations.length === 0) throw new Error('No evaluations found for this period');

            // 4. Verify ALL evaluations are approved
            const unapproved = evaluations.filter(e => e.status !== 'approved');
            if (unapproved.length > 0) {
                throw new Error(`Còn ${unapproved.length} đánh giá chưa được duyệt`);
            }

            const now = new Date().toISOString();

            // 5. Build snapshot
            const snapshot = {
                periodConfig: {
                    dtConfig: period.dtConfig,
                    ksConfig: period.ksConfig,
                    ratingThresholds: period.ratingThresholds,
                    metricOverrides: period.metricOverrides,
                },
                metrics: metrics.filter(m => m.isActive),
                lockedAt: now,
                lockedBy,
            };

            // 6. Batch write: snapshot into each evaluation
            const chunks = chunkArray(evaluations, 400);
            for (const chunk of chunks) {
                const batch = writeBatch(db);
                chunk.forEach(ev => {
                    const docRef = doc(db, EVAL_COLLECTIONS.EVALUATIONS, ev.id);
                    batch.set(docRef, { lockedSnapshot: snapshot }, { merge: true });
                });
                await batch.commit();
            }

            // Update period status to closed + lock fields
            const periodRef = doc(db, EVAL_COLLECTIONS.PERIODS, periodId);
            await setDoc(periodRef, {
                status: 'closed',
                lockedAt: now,
                lockedBy,
                updatedAt: now,
            }, { merge: true });

        } catch (error) {
            console.error('Error locking period:', error);
            throw error;
        }
    }
};

// ========== DEFAULT SEED DATA ==========

export const DEFAULT_METRICS: EvaluationMetric[] = [
    // === CRM Card Metrics (Thống kê thẻ trên CRM) ===
    { id: 'THE_TU_HOC', name: 'Thẻ Tự học', category: 'crm_card', defaultPoints: 0.3, isActive: true, order: 1 },
    { id: 'THE_CDDL', name: 'Thẻ CĐDL', category: 'crm_card', defaultPoints: 0.5, isActive: true, order: 2 },
    { id: 'THE_HO_TRO_11', name: 'Thẻ Hỗ trợ 1-1', category: 'crm_card', defaultPoints: 0.3, isActive: true, order: 3 },
    { id: 'THE_DAO_TAO_ONLINE_11', name: 'Thẻ Đào tạo online 1-1', category: 'crm_card', defaultPoints: 2.5, isActive: true, order: 4 },
    { id: 'THE_DUNG_THU', name: 'Thẻ Dùng thử', category: 'crm_card', defaultPoints: 8.5, isActive: true, order: 5 },
    { id: 'THE_SUA_MAU', name: 'Thẻ sửa mẫu', category: 'crm_card', defaultPoints: 2.5, isActive: true, order: 6 },
    { id: 'THE_KHAC', name: 'Thẻ khác', category: 'crm_card', defaultPoints: 0.1, isActive: true, order: 7 },

    // === Work Metrics (Công việc khác) ===
    { id: 'LAM_TAI_LIEU', name: 'Làm tài liệu', category: 'work', defaultPoints: 6, isActive: true, order: 10 },
    { id: 'CONG_VIEC_KHAC', name: 'Công việc khác', category: 'work', defaultPoints: 2, isActive: true, order: 11 },

    // === Violation Metrics (Vi phạm - điểm trừ) ===
    { id: 'THE_CHUA_CHAM_SOC', name: 'Thẻ chưa chăm sóc', category: 'violation', defaultPoints: -5, isActive: true, order: 20 },
    { id: 'DI_MUON', name: 'Đi muộn', category: 'violation', defaultPoints: -5, isActive: true, order: 21 },

    // === Livechat Difficulty (Độ khó Livechat - hệ số) ===
    { id: 'easy', name: 'Tổng số mã DỄ', category: 'livechat_difficulty', defaultPoints: 1, isActive: true, order: 30 },
    { id: 'medium', name: 'Tổng số mã TRUNG BÌNH', category: 'livechat_difficulty', defaultPoints: 1.2, isActive: true, order: 31 },
    { id: 'hard', name: 'Tổng số mã KHÓ', category: 'livechat_difficulty', defaultPoints: 1.5, isActive: true, order: 32 },
];
