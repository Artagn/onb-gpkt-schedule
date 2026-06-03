import { z } from 'zod';
import { Role, Status, TimeFrame, EmployeeRank } from './types';

// Enums
export const JobGroupSchema = z.string();
export const RoleSchema = z.nativeEnum(Role);
export const StatusSchema = z.nativeEnum(Status);
export const TimeFrameSchema = z.nativeEnum(TimeFrame);
export const EmployeeRankSchema = z.nativeEnum(EmployeeRank);

export const JobGroupDefSchema = z.object({
    id: z.string(),
    name: z.string(),
    colorClass: z.string(),
    isActive: z.boolean().default(true),
    order: z.number().default(0),
});

// --- 1. Employee Schema ---
export const EvaluationGroupSchema = z.enum(['ONB_DT', 'ONB_KS', 'KS']);

export const EmployeeSchema = z.object({
    id: z.string(),
    stt: z.number().optional().default(9999),
    fullName: z.string().min(1, "Name is required"),
    email: z.string().email(),
    rank: EmployeeRankSchema.default(EmployeeRank.None),
    jobGroups: z.array(JobGroupSchema).default([]),
    timeFrames: z.array(TimeFrameSchema).default([]),
    role: RoleSchema.default(Role.Staff),
    status: StatusSchema.default(Status.Active),
    kpiStandard: z.number().default(0),
    weeklyScore: z.number().default(0),
    monthlyScore: z.number().default(0),
    // NEW: Monthly Evaluation
    evaluationGroup: EvaluationGroupSchema.optional().nullable(),
    monthlyKpiTarget: z.number().optional(),
});

// --- 2. Job Schemas ---
export const JobSchema = z.object({
    id: z.string(),
    name: z.string(),
    group: JobGroupSchema,
    classification: z.enum(['Nghiệp vụ', 'Lĩnh vực', 'Nội bộ', 'Trực tiếp']).optional().nullable(),
    standardPoint: z.number().default(0),
    difficulty: z.number().default(1),
    durationMinutes: z.number().default(60),
    isActive: z.boolean().default(true),
});

export const SubJobSchema = z.object({
    id: z.string(),
    jobId: z.string(),
    name: z.string(),
    product: z.string(),
    day: z.string(), // "Thứ 2", etc.
    shift: z.enum(['Sáng', 'Chiều', 'Tối']),
    duration: z.number().default(0),
    startTime: z.string().default(''),
    endTime: z.string().default(''),
    link: z.string().default(''),
    documentLink: z.string().optional().default(''),
    isActive: z.boolean().default(true),
});

// --- 3. Schedule Schema ---
export const ScheduleItemSchema = z.object({
    id: z.string(),
    date: z.string(), // ISO date string
    shift: z.enum(['Sáng', 'Chiều', 'Tối']),
    jobId: z.string(),
    employeeIds: z.array(z.string()).default([]),
    isFixed: z.boolean().default(false),
    requiredCount: z.number().default(1),
    coefficient: z.number().optional().default(1),
    status: z.enum(['Pending', 'Completed', 'Cancelled', 'Approved']).optional().default('Pending'),
    note: z.string().optional(),
    customerParticipants: z.number().optional(),
    customerSurveys: z.number().optional(),
    customerCapable: z.number().optional(),
});

// --- 4. Leave Request Schema ---
export const LeaveRequestSchema = z.object({
    id: z.string(),
    employeeId: z.string(),
    date: z.string(),
    shift: z.enum(['Sáng', 'Chiều', 'Tối']),
    reason: z.string().default(''),
    status: z.enum(['Pending', 'Approved', 'Rejected']).default('Pending'),
    leaveType: z.enum(['Regular', 'Compensatory', 'Other']).default('Regular'),
});

// --- 4.1 Leave Balance Schema (Phase 5) ---
export const LeaveBalanceSchema = z.object({
    id: z.string(),
    employeeId: z.string(),
    compLeaveAvailable: z.number().default(0),
    compLeaveUsed: z.number().default(0),
    lastUpdated: z.string(),
});

// --- 5. Daily Allocation Schema ---
export const DailyAllocationSchema = z.object({
    id: z.string(),
    date: z.string(),
    employeeId: z.string(),
    jobId: z.string(),
    assigned: z.number().default(0),
    newAssigned: z.number().default(0),
    completed: z.number().default(0),
    returnedKD: z.number().default(0),
    returnedTP: z.number().default(0),
});

// --- 6. Config Schemas ---
const WorkShiftConfigSchema = z.object({
    morning: z.boolean(),
    afternoon: z.boolean(),
    evening: z.boolean(),
});

export const WorkPeriodSchema = z.object({
    id: z.string(),
    name: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    days: z.object({
        0: WorkShiftConfigSchema,
        1: WorkShiftConfigSchema,
        2: WorkShiftConfigSchema,
        3: WorkShiftConfigSchema,
        4: WorkShiftConfigSchema,
        5: WorkShiftConfigSchema,
        6: WorkShiftConfigSchema,
    })
});

export const HolidaySchema = z.object({
    id: z.string(),
    date: z.string(),
    name: z.string(),
});

export const SchedulePatternSchema = z.object({
    id: z.string(),
    dayIndex: z.number(),
    shift: z.enum(['Sáng', 'Chiều', 'Tối']),
    jobId: z.string(),
    requiredCount: z.number().default(1),
});

// --- 7. Evaluation Schemas (Đánh giá tháng) ---
export const MetricCategorySchema = z.enum(['crm_card', 'work', 'violation', 'livechat_difficulty']);

export const EvaluationMetricSchema = z.object({
    id: z.string(),
    name: z.string(),
    category: MetricCategorySchema,
    defaultPoints: z.number(),
    isActive: z.boolean().default(true),
    order: z.number().default(0),
});

export const EvaluationPeriodSchema = z.object({
    id: z.string(),
    name: z.string(),
    month: z.number().min(1).max(12),
    year: z.number(),
    status: z.enum(['draft', 'open', 'reviewing', 'closed']).default('draft'),
    metricOverrides: z.record(z.string(), z.number()).default({}),
    dtConfig: z.object({
        kpiPlanRate: z.number().default(95),
        kpiWeight: z.number().default(80),
        workWeight: z.number().default(20),
        livechatStandards: z.record(z.string(), z.number()).optional(),
        livechatDifficultyConfig: z.array(z.object({
            id: z.string(),
            name: z.string(),
            multiplier: z.number(),
        })).optional(),
    }),
    ksConfig: z.object({
        kpiPlanRate: z.number().default(95),
        kpiPlanRatePrevYear: z.number().default(93),
        currentYearWeight: z.number().default(70),
        previousYearWeight: z.number().default(30),
    }),
    ratingThresholds: z.object({
        excellent: z.number().default(105),
        good: z.number().default(100),
    }),
    createdBy: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    lockedAt: z.string().optional(),
    lockedBy: z.string().optional(),
});

export const EmployeeEvaluationSchema = z.object({
    id: z.string(),
    periodId: z.string(),
    employeeId: z.string(),
    evaluationGroup: EvaluationGroupSchema,
    status: z.enum(['pending', 'submitted', 'approved', 'rejected']).default('pending'),
    dtKpiData: z.object({
        received: z.number(),
        calculated: z.number(),
        excluded: z.number(),
        active: z.number(),
        notUsedExcluded: z.number(),
        stoppedExcluded: z.number(),
        actualRate: z.number(),
        planRate: z.number(),
        completionRate: z.number(),
    }).optional(),
    ksKpiData: z.object({
        currentYear: z.object({
            active: z.number(),
            stoppedExcluded: z.number(),
            received: z.number(),
            calculated: z.number(),
            usageRate: z.number(),
            completionRate: z.number(),
        }),
        previousYear: z.object({
            returnedBonus: z.number(),
            active: z.number(),
            stoppedExcluded: z.number(),
            received: z.number(),
            calculated: z.number(),
            usageRate: z.number(),
            completionRate: z.number(),
        }),
        overallCompletionRate: z.number(),
    }).optional(),
    metricData: z.record(z.string(), z.object({
        quantity: z.number(),
        points: z.number(),
    })).default({}),
    livechatData: z.record(z.string(), z.object({
        standardPerSession: z.number(),
        actual: z.number(),
    })).optional(),
    livechatDifficulty: z.record(z.string(), z.number()).optional(),
    summary: z.object({
        totalWorkPoints: z.number(),
        kpiCompletionRate: z.number(),
        workCompletionRate: z.number(),
        overallRate: z.number(),
        result: z.enum(['Vượt mong đợi', 'Đạt', 'Cần cố gắng']),
    }),
    submittedAt: z.string().optional(),
    approvedBy: z.string().optional(),
    approvedAt: z.string().optional(),
    notes: z.string().optional(),
    lockedSnapshot: z.object({
        periodConfig: z.object({
            dtConfig: z.object({
                kpiPlanRate: z.number(),
                kpiWeight: z.number(),
                workWeight: z.number(),
                livechatStandards: z.record(z.string(), z.number()).optional(),
                livechatDifficultyConfig: z.array(z.object({
                    id: z.string(),
                    name: z.string(),
                    multiplier: z.number(),
                })).optional(),
            }),
            ksConfig: z.object({
                kpiPlanRate: z.number(),
                kpiPlanRatePrevYear: z.number(),
                currentYearWeight: z.number(),
                previousYearWeight: z.number(),
            }),
            ratingThresholds: z.object({
                excellent: z.number(),
                good: z.number(),
            }),
            metricOverrides: z.record(z.string(), z.number()),
        }),
        metrics: z.array(EvaluationMetricSchema),
        lockedAt: z.string(),
        lockedBy: z.string(),
    }).optional(),
});

// --- 8. Customer Care Schemas (Chăm sóc KH - ONB_KS) ---

export const CareMetricSchema = z.object({
    id: z.string(),
    name: z.string().min(1, 'Tên chỉ tiêu không được trống'),
    code: z.string().min(1, 'Mã chỉ tiêu không được trống'),
    unit: z.string().optional(),
    isActive: z.boolean().default(true),
    order: z.number().default(0),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
});

export const CareCampaignSchema = z.object({
    id: z.string(),
    name: z.string().min(1, 'Tên chiến dịch không được trống'),
    code: z.string().min(1, 'Mã chiến dịch không được trống'),
    description: z.string().optional(),
    isActive: z.boolean().default(true),
    order: z.number().default(0),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
});

export const CareReportSchema = z.object({
    id: z.string(),
    employeeId: z.string(),
    date: z.string(),
    weekId: z.string(),
    dailyMetrics: z.record(z.string(), z.number()).default({}),
    campaignDetails: z.record(z.string(), z.object({
        weeklyTarget: z.number().optional(),
        dailyCompleted: z.number().default(0),
    })).default({}),
    createdAt: z.string(),
    updatedAt: z.string(),
});
