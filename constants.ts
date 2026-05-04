
// COLLECTION NAMES
export const COLLECTIONS = {
    EMPLOYEES: 'employees',
    JOBS: 'jobs',
    SUB_JOBS: 'subJobs',
    SCHEDULE: 'schedule',
    ALLOCATIONS: 'allocations',
    LEAVES: 'leaves',
    AUDIT_LOGS: 'audits',
    WORK_PERIODS: 'workPeriods',
    HOLIDAYS: 'holidays',
    PATTERNS: 'patterns',
    APP_CONFIG: 'appConfig',
    SWAP_REQUESTS: 'swapRequests'
};

// SHIFT NAMES
export const SHIFTS = {
    MORNING: 'Sáng',
    AFTERNOON: 'Chiều',
    EVENING: 'Tối',
    WEEKEND: 'Cuối tuần'
};

// JOB IDs (Specific hardcoded jobs)
export const JOB_IDS = {
    COMPENSATORY_LEAVE: 'JOB_NGHI_BU',
    // Add others as needed if they become hardcoded dependencies
};

// DATE FORMATS
export const DATE_FORMATS = {
    DB_DATE: 'yyyy-MM-dd',
    DISPLAY_DATE: 'dd/MM/yyyy',
    DISPLAY_DATETIME: 'dd/MM/yyyy HH:mm'
};

// STATUS
export const STATUS = {
    ACTIVE: 'Đang hoạt động',
    INACTIVE: 'Ngưng hoạt động',
    DEACTIVATED: 'Dừng kích hoạt'
};
