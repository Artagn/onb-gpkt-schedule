/**
 * Evaluation Validation Schemas using Zod
 * Provides runtime validation for evaluation form data
 */

import { z } from 'zod';

// ========== BASIC SCHEMAS ==========

export const kpiDataSchema = z.object({
    received: z.number().min(0, 'SLKH tiếp nhận phải >= 0'),
    notUsedExcluded: z.number().min(0, 'Chưa SD loại trừ phải >= 0'),
    stoppedExcluded: z.number().min(0, 'Ngưng SD loại trừ phải >= 0'),
    active: z.number().min(0, 'SLKH đang SD phải >= 0'),
});

export const livechatInputSchema = z.record(
    z.string(),
    z.object({
        standardPerSession: z.number().min(1, 'Tiêu chuẩn/buổi phải >= 1'),
        actual: z.number().min(0, 'Thực hiện phải >= 0'),
    })
);

export const metricDataSchema = z.record(
    z.string(),
    z.number().min(0, 'Số lượng phải >= 0')
);

// ========== DT EVALUATION SCHEMA ==========

export const dtEvaluationFormSchema = z.object({
    kpiData: kpiDataSchema,
    livechatInput: livechatInputSchema,
    metricData: metricDataSchema,
}).refine(
    (data) => {
        // Validate: received >= active
        return data.kpiData.received >= data.kpiData.active;
    },
    {
        message: 'SLKH đang sử dụng không thể lớn hơn SLKH tiếp nhận',
        path: ['kpiData', 'active'],
    }
).refine(
    (data) => {
        // Validate: received >= excluded
        const excluded = data.kpiData.notUsedExcluded + data.kpiData.stoppedExcluded;
        return data.kpiData.received >= excluded;
    },
    {
        message: 'Tổng loại trừ không thể lớn hơn SLKH tiếp nhận',
        path: ['kpiData', 'notUsedExcluded'],
    }
);

// ========== KS EVALUATION SCHEMA ==========

export const ksYearDataSchema = z.object({
    active: z.number().min(0, 'SLKH đang SD phải >= 0'),
    stoppedExcluded: z.number().min(0, 'Ngưng SD loại trừ phải >= 0'),
    received: z.number().min(0, 'Tổng tiếp nhận phải >= 0'),
});

export const ksEvaluationFormSchema = z.object({
    currentYear: ksYearDataSchema,
    previousYear: ksYearDataSchema.extend({
        returnedBonus: z.number().min(0, 'KH quay lại phải >= 0'),
    }),
}).refine(
    (data) => data.currentYear.received >= data.currentYear.active,
    {
        message: 'SLKH đang sử dụng không thể lớn hơn SLKH tiếp nhận (Năm nay)',
        path: ['currentYear', 'active'],
    }
).refine(
    (data) => data.previousYear.received >= data.previousYear.active,
    {
        message: 'SLKH đang sử dụng không thể lớn hơn SLKH tiếp nhận (Năm trước)',
        path: ['previousYear', 'active'],
    }
);

// ========== HELPER FUNCTIONS ==========

export type DTEvaluationForm = z.infer<typeof dtEvaluationFormSchema>;
export type KSEvaluationForm = z.infer<typeof ksEvaluationFormSchema>;

/**
 * Validate DT evaluation form data
 * Returns { success: true, data } or { success: false, errors }
 */
export function validateDTForm(data: unknown): {
    success: boolean;
    data?: DTEvaluationForm;
    errors?: { field: string; message: string }[];
} {
    const result = dtEvaluationFormSchema.safeParse(data);

    if (result.success) {
        return { success: true, data: result.data };
    }

    const errors = result.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
    }));

    return { success: false, errors };
}

/**
 * Validate KS evaluation form data
 * Returns { success: true, data } or { success: false, errors }
 */
export function validateKSForm(data: unknown): {
    success: boolean;
    data?: KSEvaluationForm;
    errors?: { field: string; message: string }[];
} {
    const result = ksEvaluationFormSchema.safeParse(data);

    if (result.success) {
        return { success: true, data: result.data };
    }

    const errors = result.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
    }));

    return { success: false, errors };
}
