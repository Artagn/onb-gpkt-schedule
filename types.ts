import { User } from 'firebase/auth';

export type { User };

export enum EmployeeRank {
    A = 'Hạng A',
    B = 'Hạng B',
    None = 'Không phân hạng'
}

export interface JobGroupDef {
    id: string; // Tên nhóm (khóa chính), ví dụ: 'Đào tạo', 'Livechat'
    name: string; // Tên hiển thị
    colorClass: string; // Mã màu Tailwind CSS
    isActive: boolean;
    order: number;
}

export enum TimeFrame {
    Morning = 'Sáng',
    Afternoon = 'Chiều',
    Evening = 'Tối',
    Weekend = 'Cuối tuần'
}

export enum Role {
    Staff = 'Nhân viên', // Xem & Báo cáo
    Coordinator = 'Điều phối', // Toàn quyền
    Admin = 'Quản trị' // Toàn quyền + Phân quyền
}

export enum Status {
    Active = 'Đang hoạt động',
    Inactive = 'Ngưng hoạt động',
    Deactivated = 'Dừng kích hoạt'
}

// Evaluation Group (ONB_DT = Đào tạo/Chuyển giao, ONB_KS = Kiểm soát)
export type EvaluationGroup = 'ONB_DT' | 'ONB_KS' | 'KS';

export interface Employee {
    id: string;
    stt: number; // Số thứ tự hiển thị
    fullName: string;
    email: string;
    rank: EmployeeRank;
    jobGroups: string[];
    timeFrames: TimeFrame[];
    role: Role;
    status: Status;
    kpiStandard: number;
    weeklyScore: number;
    monthlyScore: number;
    // NEW: Monthly Evaluation
    evaluationGroup?: EvaluationGroup;
    monthlyKpiTarget?: number; // KPI đánh giá tháng (khác kpiStandard)
}

export interface Job {
    id: string;
    name: string;
    group: string;
    classification?: 'Nghiệp vụ' | 'Lĩnh vực' | 'Nội bộ' | 'Trực tiếp'; // Phân loại đào tạo
    standardPoint: number;
    difficulty: number;
    durationMinutes: number;
    isActive: boolean;
}

export interface SubJob {
    id: string;
    jobId: string; // Foreign key to Job
    name: string; // Tên hạng mục
    product: string; // Sản phẩm
    day: string; // Thứ 2, Thứ 3...
    shift: 'Sáng' | 'Chiều' | 'Tối';
    duration: number; // minutes
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    link: string; // Google Meet
    documentLink?: string; // Link tài liệu hướng dẫn
    isActive: boolean;
}

export interface SchedulePattern {
    id: string;
    dayIndex: number; // 0 = Monday, 1 = Tuesday, ... 6 = Sunday
    shift: 'Sáng' | 'Chiều' | 'Tối';
    jobId: string;
    requiredCount: number;
}

export interface ScheduleItem {
    id: string;
    date: string; // ISO Date
    shift: 'Sáng' | 'Chiều' | 'Tối';
    jobId: string;
    employeeIds: string[];
    isFixed: boolean; // True if from Fixed Schedule, False if ad-hoc
    requiredCount: number; // How many people needed for this slot
    coefficient?: number; // Hệ số điểm (Mặc định là 1)
    status?: 'Pending' | 'Completed' | 'Cancelled' | 'Approved'; // New status field
    note?: string; // Reason for cancel or extra notes

    // Training Results (Optional)
    customerParticipants?: number; // Số lượng KH tham gia
    customerSurveys?: number; // Số lượng KH làm khảo sát
    customerCapable?: number; // Số lượng KH biết sử dụng
}

export interface DailyAllocation {
    id: string;
    date: string;
    employeeId: string;
    jobId: string;
    assigned: number; // Đã chia
    newAssigned: number; // Chia mới
    completed: number; // HT
    returnedKD: number; // Trả KD
    returnedTP: number; // Trả TP
    // Pending (Chưa TH) is calculated: (assigned + newAssigned) - (completed + returnedKD + returnedTP)
}

export interface AuditLog {
    id: string;
    action: string;      // e.g., 'SCHEDULE_UPDATE', 'LEAVE_APPROVE'
    entity: string;      // e.g., 'Schedule', 'Leave'
    entityId: string;
    details: any;        // JSON object with before/after or specific details
    userId: string;      // Who performed the action
    timestamp: string;   // ISO string
}

export interface LeaveRequest {
    id: string;
    employeeId: string;
    date: string;
    shift: 'Sáng' | 'Chiều' | 'Tối';
    reason: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    leaveType?: 'Regular' | 'Compensatory' | 'Other'; // Default: 'Regular'
}

// --- LEAVE BALANCE (Phase 5) ---
export interface LeaveBalance {
    id: string; // = employeeId
    employeeId: string;
    compLeaveAvailable: number;    // Nghỉ bù khả dụng (auto từ Ca Tối/Weekend completed)
    compLeaveUsed: number;         // Nghỉ bù đã dùng
    lastUpdated: string;           // ISO timestamp
}

// --- NEW TYPES FOR WORK CALENDAR ---
export interface WorkShiftConfig {
    morning: boolean;
    afternoon: boolean;
    evening: boolean;
}

export interface WorkPeriod {
    id: string;
    name: string;
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
    // Config for Mon(0) to Sun(6)
    days: {
        0: WorkShiftConfig; // Mon
        1: WorkShiftConfig; // Tue
        2: WorkShiftConfig; // Wed
        3: WorkShiftConfig; // Thu
        4: WorkShiftConfig; // Fri
        5: WorkShiftConfig; // Sat
        6: WorkShiftConfig; // Sun
    }
}


export interface Holiday {
    id: string;
    date: string; // YYYY-MM-DD
    name: string;
}

export interface AppConfig {
    id: string; // usually 'default'
    autoScheduleCode: string; // Mã xác nhận cho auto-schedule
}

// --- SWAP REQUEST TYPES ---
export type SwapStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface SwapRequest {
    id: string;
    requesterId: string;    // Employee A
    targetId: string;       // Employee B

    // Original Slot (A's slot to give away)
    requestDate: string;    // YYYY-MM-DD
    requestShift: 'Sáng' | 'Chiều' | 'Tối';
    requestJobId: string;   // The job A is currently assigned

    // Target Slot (B's slot to take, optional if B is OFF)
    targetDate: string;     // YYYY-MM-DD (Same as requestDate for same-day swap)
    targetShift: 'Sáng' | 'Chiều' | 'Tối';
    targetJobId?: string;   // Job B is assigned (or null if B is Rest/Off)

    reason: string;
    status: SwapStatus;
    createdAt: string;      // ISO String
    updatedAt: string;      // ISO String
}

// ========== EVALUATION MODULE (Phase: Đánh giá tháng) ==========

// Category for evaluation metrics
export type MetricCategory = 'crm_card' | 'work' | 'violation' | 'livechat_difficulty';

// Evaluation Metric (Chỉ tiêu đánh giá)
export interface EvaluationMetric {
    id: string;
    name: string;                   // "Thẻ Tự học", "Đi muộn"
    category: MetricCategory;
    defaultPoints: number;          // Điểm mặc định / đơn vị
    isActive: boolean;
    order: number;                  // Thứ tự hiển thị
}

// Evaluation Period (Đợt đánh giá hàng tháng)
export interface EvaluationPeriod {
    id: string;
    name: string;                   // "Đánh giá tháng 01/2026"
    month: number;                  // 1-12
    year: number;
    status: 'draft' | 'open' | 'reviewing' | 'closed';

    // Metric overrides per period (metricId → points)
    metricOverrides: { [metricId: string]: number };

    // ONB_DT Config (Chuyển giao)
    dtConfig: {
        kpiPlanRate: number;        // Mặc định 95%
        kpiWeight: number;          // Mặc định 80%
        workWeight: number;         // Mặc định 20%
        livechatStandards?: { [jobId: string]: number }; // Tiêu chuẩn Livechat/buổi theo từng công việc
        livechatDifficultyConfig?: Array<{
            id: string;        // metric id (e.g. 'easy', 'medium', 'hard', or custom)
            name: string;      // display name (e.g. 'Tổng số mã DỄ')
            multiplier: number; // hệ số (e.g. 1, 1.2, 1.5)
        }>;
    };

    // ONB_KS Config (Kiểm soát)
    ksConfig: {
        kpiPlanRate: number;        // Tỷ lệ kế hoạch năm nay (default 95%)
        kpiPlanRatePrevYear: number; // Tỷ lệ kế hoạch năm trước (default 93%)
        currentYearWeight: number;  // Mặc định 70%
        previousYearWeight: number; // Mặc định 30%
    };

    // Rating thresholds
    ratingThresholds: {
        excellent: number;          // Mặc định 105%
        good: number;               // Mặc định 100%
    };

    createdBy: string;
    createdAt: string;
    updatedAt: string;

    // Lock fields (set when period is locked after all approvals)
    lockedAt?: string;    // ISO timestamp
    lockedBy?: string;    // Employee ID
}

// Employee Evaluation (Kết quả đánh giá từng NV)
export interface EmployeeEvaluation {
    id: string;                     // periodId_employeeId
    periodId: string;
    employeeId: string;
    evaluationGroup: EvaluationGroup;
    status: 'pending' | 'submitted' | 'approved' | 'rejected';

    // === ONB_DT Data (Chuyển giao) ===
    dtKpiData?: {
        received: number;           // (1) SLKH tiếp nhận
        calculated: number;         // (2) = (1) - (3)
        excluded: number;           // (3) = (5) + (6)
        active: number;             // (4) SLKH đang sử dụng
        notUsedExcluded: number;    // (5) Chưa SD được loại trừ
        stoppedExcluded: number;    // (6) Ngưng SD được loại trừ
        actualRate: number;         // (7) = (4)/(2)
        planRate: number;           // (8) Mặc định 95%
        completionRate: number;     // (9) = (7)/(8)
    };

    // === ONB_KS Data (Kiểm soát) ===
    ksKpiData?: {
        currentYear: {
            active: number;           // SLKH đang sử dụng
            stoppedExcluded: number;  // SLKH ngưng SD được loại trừ
            received: number;         // Tổng SLKH tiếp nhận
            calculated: number;       // Tổng SLKH tính KPIs (auto)
            usageRate: number;        // Tỷ lệ sử dụng (auto)
            completionRate: number;   // Tỷ lệ hoàn thành (auto)
        };
        previousYear: {
            returnedBonus: number;    // KH quay lại dùng được cộng thêm
            active: number;           // SLKH đang sử dụng
            stoppedExcluded: number;  // SLKH ngưng SD được loại trừ
            received: number;         // Tổng SLKH tiếp nhận
            calculated: number;       // Tổng SLKH tính KPIs (auto)
            usageRate: number;        // Tỷ lệ sử dụng (auto)
            completionRate: number;   // Tỷ lệ hoàn thành (auto)
        };
        overallCompletionRate: number; // Tỷ lệ HT chung
    };

    // === Livechat Details (for detailed calculation) ===
    livechatData?: {
        [jobId: string]: {
            standardPerSession: number;  // Tiêu chuẩn/buổi
            actual: number;              // Thực hiện
        }
    };

    // Livechat difficulty breakdown (manual input - dynamic keys from config)
    livechatDifficulty?: {
        [metricId: string]: number;  // e.g. { easy: 10, medium: 5, hard: 3 } or custom ids
    };

    // === Common: Work Points ===
    metricData: {
        [metricId: string]: {
            quantity: number;
            points: number;         // Auto-calc = quantity * pointsPerUnit
        }
    };

    // === Summary (Auto-calc) ===
    summary: {
        totalWorkPoints: number;
        kpiCompletionRate: number;
        workCompletionRate: number;
        overallRate: number;
        result: 'Vượt mong đợi' | 'Đạt' | 'Cần cố gắng';
    };

    submittedAt?: string;
    approvedBy?: string;
    approvedAt?: string;
    notes?: string;

    // Locked snapshot - config frozen at lock time
    lockedSnapshot?: {
        periodConfig: {
            dtConfig: EvaluationPeriod['dtConfig'];
            ksConfig: EvaluationPeriod['ksConfig'];
            ratingThresholds: EvaluationPeriod['ratingThresholds'];
            metricOverrides: EvaluationPeriod['metricOverrides'];
        };
        metrics: EvaluationMetric[];
        lockedAt: string;
        lockedBy: string;
    };
}

// ========== CUSTOMER CARE MODULE (Chăm sóc KH - ONB_KS) ==========

// Care Metric (Chỉ tiêu chăm sóc KH)
export interface CareMetric {
    id: string;           // e.g. 'call_count'
    name: string;         // Tên hiển thị (e.g. 'Số cuộc gọi')
    code: string;         // Mã chỉ tiêu
    unit?: string;        // Đơn vị (e.g. 'cuộc', 'phút')
    isActive: boolean;    // true = đang sử dụng, false = ngừng
    order: number;        // Thứ tự hiển thị
    createdAt: string;
    updatedAt?: string;
}

// Care Campaign (Chiến dịch chăm sóc KH)
export interface CareCampaign {
    id: string;           // e.g. 'TTCG_ONBGPKT_NGUNG_CHUACS'
    name: string;         // Tên hiển thị ngắn (e.g. 'Ngưng - Chưa CS')
    code: string;         // Mã chiến dịch đầy đủ
    description?: string; // Mô tả chi tiết
    isActive: boolean;    // true = đang sử dụng, false = ngừng
    order: number;        // Thứ tự hiển thị
    createdAt: string;
    updatedAt?: string;
}

// Daily Care Report (Báo cáo chăm sóc KH hàng ngày)
export interface CareReport {
    id: string;              // Format: '{employeeId}_{date}' (e.g. 'emp1_2026-05-12')
    employeeId: string;
    date: string;            // YYYY-MM-DD
    weekId: string;          // ISO week identifier: 'YYYY-Wxx' (e.g. '2026-W20')
 
    // Lũy kế chung (nhập hàng ngày) - Chuyển sang dạng map động
    dailyMetrics: {
        [metricId: string]: number; // Map từ ID chỉ tiêu sang giá trị
    };
 
    // Chi tiết theo từng chiến dịch (nhập hàng ngày)
    campaignDetails: {
        [campaignId: string]: {
            weeklyTarget?: number;   // Target đầu tuần (chỉ nhập 1 lần/tuần, copy sang các ngày khác)
            dailyCompleted: number;  // Số KH đã chăm sóc xong trong ngày
        };
    };
 
    createdAt: string;
    updatedAt: string;
}
