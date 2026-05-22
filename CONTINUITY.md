# Continuity Ledger - ONB GPKT Schedule

> **Mục đích:** Tài liệu kỹ thuật chi tiết về cấu hình và triển khai.  
> **Cấu trúc:** Sắp xếp theo chức năng (không theo thời gian) để dễ tra cứu.  
> **Version:** 3.22.0 | **Last Updated:** 2026-05-11

---

## Documentation Structure

| File | Purpose | Read When |
|------|---------|-----------|
| [OVERVIEW.md](./OVERVIEW.md) | Quick reference (80% context trong 30s) | Every new conversation |
| **CONTINUITY.md** | Implementation details | Deep work |
| [ROADMAP.md](./ROADMAP.md) | Development strategy | Planning |
| [CHANGELOG.md](./CHANGELOG.md) | Version history | Researching past changes |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Release protocol | Deploying |
| [CODE_EXAMPLES.md](./CODE_EXAMPLES.md) | Code patterns | Implementation |

### Update Guidelines

> **Quy tắc:** Cập nhật ĐÚNG SECTION tương ứng, KHÔNG thêm entry mới theo ngày.

| Loại thay đổi | Cập nhật section nào |
|---------------|----------------------|
| Architecture changes | **2. ARCHITECTURE** |
| Feature changes | **3. FEATURES & LOGIC** |
| Deployment changes | **4. DEPLOYMENT** |
| New version release | **CHANGELOG.md** |
| Future plans | **ROADMAP.md** |

---

## 1. PROJECT OVERVIEW

### 1.1 Goal
Hệ thống quản lý lịch làm việc, phân công nhân sự tự động và báo cáo KPI cho bộ phận ONB/GPKT (~30 nhân viên).

### 1.2 Tech Stack
| Layer | Technology |
|-------|------------|
| **Framework** | React 19 + TypeScript + Vite |
| **Performance** | React.lazy (Code Splitting) + Gzip |
| **Routing** | React Router DOM v7 |
| **State** | TanStack Query (v5) + React Context |
| **UI/Styling** | Tailwind CSS (CDN runtime) + Lucide React (Icons) + Inter Font |
| **Auth** | Firebase Authentication (Google Sign-in) |
| **Database** | Cloud Firestore (Persistence Enabled) |
| **Hosting** | Firebase Hosting |
| **Mobile** | PWA (Progressive Web App) |
| **UX** | Optimistic UI + View Transitions |

> [!IMPORTANT]
> **Firebase Plan:** Blaze (Pay-as-you-go) required. Auto-schedule ~1200 ops/run exceeds Spark free tier (20k writes/day).

> [!WARNING]
> **Tailwind CSS:** Dự án dùng CDN runtime (`cdn.tailwindcss.com`) trong `index.html`, KHÔNG cài local. Không được xóa dòng `<script src="https://cdn.tailwindcss.com">` — sẽ phá vỡ toàn bộ styling.

### 1.3 URLs
| Environment | URL |
|-------------|-----|
| Production | https://onb.io.vn |
| Firebase Default | https://onb-gpkt-schedule.web.app |
| Console | https://console.firebase.google.com/project/onb-gpkt-schedule |

---

## 2. ARCHITECTURE

### 2.1 Component Structure (Refactored v2.5)
Modular folder structure with `index.tsx` as entry point and `use[Feature].ts` hooks for logic.

```
App.tsx                    # Root + Provider + Router
├── context/
|   └── DataContext.tsx    # [CORE] Global State & Auth-gated Subscriptions
├── components/
|   ├── Sidebar.tsx        # Navigation + User Info
|   ├── Dashboard/         # [MODULE] Stats + Widgets
|   |   ├── index.tsx      # Container + Stats
|   |   ├── CombinedWidget.tsx # Tabbed Leaves/Tasks
|   |   ├── ScheduleCard.tsx   # Schedule summary
|   |   ├── StatCard.tsx       # Reusable stat card
|   |   └── useDashboardStats.ts # Logic (visibility-aware timer)
|   ├── ScheduleViewer.tsx # [CONTAINER] Daily & Weekly Views
|   ├── CoordinationManager.tsx # [CONTAINER] Fixed + Allocation
|   |   ├── FixedSchedule/ # [MODULE] Auto-Schedule & Matrix
|   |   └── DailyAllocation.tsx
|   ├── Employees/         # [MODULE] Employee Management
|   ├── SwapMarket/        # [MODULE] Shift Swap Marketplace
|   ├── Leaves/            # [MODULE] LeaveBalanceHistory + Widget
|   ├── MyTasks/           # [MODULE] Personal Schedule + KPI
|   ├── Reports/           # [MODULE] Reports & KPI Charts (16 files)
|   ├── Admin/             # [MODULE] Admin Tools
|   |   ├── AdminDashboard.tsx     # Admin container
|   |   ├── AuditLogViewer.tsx     # Audit logs
|   |   ├── CleanupManager.tsx     # Data maintenance
|   |   ├── DataIntegrityChecker.tsx # Data validation
|   |   └── ScheduleExportTool.tsx # Schedule Excel export (v3.18.0)
|   ├── common/            # ColorLegend, ConfirmModal, GlobalErrorBoundary, EmptyState
|   ├── ui/                # Skeleton loading components
|   └── Evaluation/        # [MODULE] 10 components:
|       ├── index.tsx      # Tab navigation + routing
|       ├── EmployeeFormDT.tsx  # DT group (61KB)
|       ├── EmployeeFormKS.tsx  # KS group (36KB)
|       ├── ReviewManager.tsx   # Approval workflow
|       ├── WorkPointsTable.tsx # Điểm công việc
|       ├── KpiTable.tsx        # KPI table
|       ├── SummaryTable.tsx    # Summary
|       ├── MetricManager.tsx   # Admin metrics
|       ├── PeriodManager.tsx   # Admin periods
|       └── EvaluationErrorBoundary.tsx
|   └── CustomerCare/      # [MODULE] 5 components:
|       ├── index.tsx      # Tab navigation + routing
|       ├── DailyReportForm.tsx # Input form
|       ├── ReportDashboard.tsx # Statistics & Charts
|       ├── CampaignManager.tsx # Admin campaigns
|       └── useCustomerCare.ts  # Logic hook
├── services/              # Service Layer (12 files)
|   ├── firestoreService.ts # [CORE] CRUD operations + real-time subscriptions
|   ├── schedulerEngine.ts  # [CORE] Auto-Allocation (535 lines)
|   ├── careService.ts      # Customer Care CRUD
|   ├── evaluationService.ts # Evaluation CRUD (15KB)
|   ├── evaluationExportService.ts # Evaluation Excel export (9KB)
|   ├── swapService.ts      # Shift swap logic
|   ├── cleanupService.ts   # Maintenance (11KB)
|   ├── excelExportService.ts # General Excel export
|   ├── googleSheets.ts     # Google Sheets integration
|   ├── appConfigService.ts # App config service
|   ├── mockData.ts         # Development seed data (50KB)
|   └── firebaseConfig.ts   # Firebase init + Persistence
├── hooks/                 # Custom Hooks (20 files)
|   ├── useRealtimeQuery.ts # [CORE] onSnapshot → TanStack Query (v3.16.0)
|   ├── useSchedulesQuery.ts # Date-range filtered schedules (polling)
|   ├── useEmployeesQuery.ts # Employee data
|   ├── useEvaluationDT.ts   # DT calculation logic (13KB)
|   ├── useLeaveHandlers.ts  # Leave management
|   ├── useDateFilter.ts     # Date presets
|   ├── useLeaveBalanceQuery.ts # Single employee balance
|   ├── useLeaveBalanceHistory.ts # Balance history
|   ├── useCareQuery.ts     # Customer Care queries
|   └── ...                  # 5 more hooks (useCountUp, usePermissions, useSmoothNavigate, etc.)
└── utils/                 # Utilities
    ├── evaluationHelpers.ts  # Shared difficulty config helpers
    ├── evaluationValidation.ts # Zod schemas for forms
    └── permissions.ts       # Permission helpers
```

### 2.2 Data Flow (TanStack Query v5 + Hybrid Real-Time)
- **Real-Time (v3.16.0 + v3.17.1 fix):** Schedule, Leaves, Allocations dùng `onSnapshot` → `setQueryData()` → `useQuery` subscribers tự re-render
- **Polling:** Tất cả collection khác dùng `useQuery` + `getDocs` với staleTime phân tầng
- **Caching:** In-memory with tailored `staleTime` defaults:
  - **Schedule/Leaves/Allocations (DataContext):** Real-time via onSnapshot + `useQuery` (staleTime: Infinity)
  - **Schedule/Leaves/Allocations (On-demand/Reports):** Polling with getDocs (custom date ranges)
  - **Jobs/Employees/SubJobs/JobGroups:** Infinity (master data, load once per session)
  - **Evaluations:** 15-30 minutes (v3.13.0 optimization)
  - **Config (WorkPeriods, Holidays, Patterns):** Infinity (v3.9.28 - load once per session)
- **Local Persistence:** `initializeFirestore` + `persistentLocalCache` giúp truy xuất từ IndexedDB trước khi delta (v3.14.0, API updated v3.16.1).
- **Date Range:** Schedule/Leaves/Allocations filtered to Start of Previous Month - 10 Days to Current Date + 3 Weeks + 10 Days (v3.19.4)
- **Mutations:** Direct `scheduleService.save()` + `queryClient.setQueryData()` (optimistic) → onSnapshot auto-confirms
- **Context:** `DataContext` exposes real-time data to all components (including dynamic `jobGroups: JobGroupDef[]`)

> [!IMPORTANT]
> **JobGroup Enum Removed (v3.19.5):** `JobGroup` enum đã bị xóa hoàn toàn khỏi `types.ts`. Tất cả references sử dụng string literal (`'Đào tạo'`, `'Livechat'`) hoặc dynamic `jobGroups` từ `DataContext`. KHÔNG import `JobGroup` từ `types.ts` — nó không tồn tại. Sử dụng `JobGroupDef` interface cho type definition.

> [!WARNING]
> **Job.classification Field (v3.19.6):** Trường `classification?: 'Nghiệp vụ' | 'Lĩnh vực' | 'Nội bộ' | 'Trực tiếp'` đã được khôi phục vào cả `Job` interface (`types.ts`) và `JobSchema` (`schemas.ts`). Trường này chỉ áp dụng cho jobs thuộc nhóm 'Đào tạo' và là căn cứ tính điểm đào tạo trong Evaluation module. Thiếu field này sẽ khiến điểm đào tạo về 0.

> [!IMPORTANT]
> **jobGroups Firestore Rules (v3.19.6):** Collection `jobGroups` đã được thêm vào `firestore.rules`. `useJobGroupsQuery` có default fallback (Đào tạo, Livechat, Chia hàng ngày, Chăm sóc KH, Khác) nếu collection chưa tồn tại trong Firestore.

### 2.3 Performance Optimization
- **v3.17.1 Instant UI Updates:**
    - `useRealtimeQuery.ts` sử dụng `useQuery` (subscribe cache) thay vì `getQueryData` (one-shot read) → re-render tức thì.
    - Optimistic updates qua `queryClient.setQueryData()` thay vì no-op `setSchedule`/`setLeaves` → UI phản hồi ngay trước khi Firestore confirm.
- **v3.16.0 Hybrid Real-Time:**
    - Schedule/Leaves/Allocations dùng `onSnapshot` → cập nhật tức thì, không cần polling.
    - Các collection khác giữ nguyên polling với staleTime tối ưu.
    - Chi phí ước tính tăng ~$0.30/tháng (từ $0.08 → $0.38).
- **Firestore Read Reduction (v3.9.27-28):**
  - Tăng staleTime cho schedule/employees giảm ~50% reads
  - Config data dùng staleTime: Infinity, loại bỏ 90 concurrent listeners
- **v3.11.0 Cleanup:** Xóa toàn bộ dead code (subscribe, syncCollection, loadAllData)
- **v3.11.1 Read Optimization (95K→<30K reads/day):**
  - Thu hẹp date range từ 9 tháng → 3 tháng cho schedule/leaves/allocations (~70% reduction)
- **v3.14.0 Firebase Read Optimization (Extreme Savings):**
    - **Firestore Persistence:** Phục vụ ~3,000 docs từ cache thay vì tải toàn bộ khi refresh/reopen app.
    - **QueryClient tuning:** Nâng `gcTime` lên 1h, giới hạn `retry` để tránh lãng phí reads khi lỗi mạng.
- **v3.13.0 Optimized Window:**
    - Thu hẹp thành **Last Month to +3 Weeks:** Tháng trước + 3 tuần tương lai
- **Code Splitting:** Major routes lazy loaded via `React.lazy` + `Suspense`
- **Date Range Loading:** Schedules query filtered to Start of Last Month - 10 Days to Current Date + 3 Weeks + 10 Days (v3.13.0 + v3.19.4 extension)
- **PWA Caching:** Service Worker with 3MB cache limit
- **Visibility API:** Dashboard timer pauses when tab hidden
- **Zod Validation:** Runtime + compile-time type safety

---

## 3. FEATURES & LOGIC

### 3.1 Role-Based Access Control (RBAC)
| Role | Access Level |
|------|--------------|
| **Admin** | Full Access - Config, Employees, Audit Logs |
| **Coordinator** | Manager - Auto-schedule, Approve Leaves |
| **Staff** | Self-Service - View schedule, My Tasks, Personal Reports |

### 3.2 Auto-Scheduling
- **3-Phase Engine:**
  1. Evening Shifts → Priority allocation, auto-create Nghỉ bù
  2. Livechat → Pair Sáng+Chiều, balance Rank A/B
  3. Remaining → 8-criteria Scoring Engine
- **Holiday-aware:** Checks `holidays` and `workPeriods` before generating slots
- **Preview Mode:** Stats modal (filled/unfilled, conflicts) before applying
- **Turbo Sync:** Parallel batching for 2x faster writes

### 3.3 Smart Shift Swap (Đổi lịch thông minh)
- **Marketplace:** Request, Approve, Reject, Cancel workflow
- **Smart Logic:** Evening shift swap auto-includes associated Nghỉ bù + next morning
- **Validation:** Prevents swap if target already busy

### 3.4 Compensatory Leave System (Nghỉ bù)
> **Hybrid Model:** Ticket-based (Ca Tối) + Balance-based (T7/CN/Lễ)

| Type | Trigger | Mechanism |
|------|---------|-----------|
| **Evening Shift** | Auto-scheduler assigns ca tối | Creates `JOB_NGHI_BU` ticket (next morning) |
| **Weekend/Holiday** | Coordinator marks Completed | +1 to `leave_balances` via Cloud Function |

**Cloud Function Logic (`onScheduleUpdate`):**
- Trigger: `schedule.status` changes to/from `Completed`
- Checks: Is it Holiday? Is it T7/CN outside WorkPeriod?
- Actions: +1 balance on Complete, -1 on Undo

**Collections:**
| Collection | Purpose |
|------------|---------|
| `leave_balances` | Per-employee wallet (compLeaveAvailable, compLeaveUsed) |
| `workPeriods` | Season config (date range + daily shifts) |
| `holidays` | List of holidays (date + name) |

### 3.5 Monthly Evaluation System (Đánh giá tháng)

#### Evaluation Groups
| Group | Component | Description |
|-------|-----------|-------------|
| **ONB_DT** | `EmployeeFormDT.tsx` | Đào tạo - Livechat, Daily KPI |
| **ONB_KS / KS** | `EmployeeFormKS.tsx` | Kiểm soát - Customer usage rates |

#### ONB_KS Calculation Formulas
```
Tính KPI = Tổng TN - Ngưng SD LT
TL SD = Đang SD / Tính KPI × 100%
TL HT Năm nay = TL SD / planRate (95%) × 100%
TL HT Năm trước = TL SD / planRatePrevYear (93%) × 100%
TL HT Chung = (TL HT Năm nay × 70%) + (TL HT Năm trước × 30%)
```

#### Rating Thresholds
- ≥105% = "Vượt mong đợi"
- ≥100% = "Đạt"
- <100% = "Cần cố gắng"

#### Review Manager (ReviewManager.tsx)
| Feature | Description |
|---------|-------------|
| Filter | By group (DT/KS), status (submitted/approved/rejected) |
| Detail Drawer | Readonly EmployeeFormDT/KS với `employeeId` prop filtering |
| Actions | Approve (confirm), Reject (requires reason), Bulk Approve |

> **Review Mode Filtering (v3.9.20):** Khi mở Detail Drawer, `employeeId` được truyền xuống các bảng con (SummaryTable, KpiTable, WorkPointsTable) để chỉ hiển thị data của nhân viên được chọn, không phải toàn bộ. Employee selector dropdown ẩn trong review mode.

#### Livechat Performance Scoring (v3.19.0 - Performance-based)
- **Purpose:** Đánh giá điểm Livechat trực tiếp dựa trên số lượng công việc hoàn thành thực tế thay vì cấu hình độ khó thủ công cũ (tính chất định tính dễ/tb/khó không còn phù hợp).
- **Data Format:** `livechatData: { [jobId: string]: { standardPerSession: number, actual: number } }`
- **Formula:**
  - Tổng số lượng YC = Số buổi (trừ ca tối) × Tiêu chuẩn/buổi
  - Tỷ lệ HT = Thực hiện / Tổng số lượng YC
  - Điểm KPI (Điểm năng suất) = Điểm cố định × Tỷ lệ HT
  - Số ngày quy đổi (Định mức 6đ/ngày): Tổng điểm Livechat / 6
- **Customization:** Cho phép chỉnh sửa tham số `Tiêu chuẩn/buổi` (lấy default từ Config) và giá trị `Thực hiện` trực tiếp trên UI (EmployeeFormDT).
- **Tổng hợp Cụm (v3.19.1 Hotfix):** Trọng số toán học được gom riêng biệt từng Job để tính tổng, ngăn ngừa sai số Weighted Average trong Report và WorkPoints.
- **Backward Compatible:** Dữ liệu lịch sử (trước v3.19.0) không có dữ liệu `livechatData` sẽ ngầm tự tương thích về tính điểm dựa trên độ khó `livechatDifficulty` thông qua helper `calcLivechatPoints`.

#### WorkPointsTable - Dynamic Metrics
Reads from `evaluation_metrics` collection with fallback to defaults:
```typescript
const crmMetricsDef = useMemo(() => {
    const fromDb = allMetrics.filter(m => m.category === 'crm_card' && m.isActive);
    return fromDb.length > 0 ? fromDb : DEFAULT_CRM_METRICS;
}, [allMetrics]);
```

**Collections:**
| Collection | Purpose |
|------------|---------|
| `evaluation_metrics` | Configurable metrics (points, thresholds) |
| `evaluation_periods` | Period config (dates, weights) |
| `evaluations` | Per-employee evaluation data |

#### Entity Context Pattern (v3.9.19)
> [!IMPORTANT]
> **Critical Architecture:** Khi Coordinator xem đánh giá của nhân viên khác, PHẢI phân biệt rõ:
> - `currentEmployee` = Người đang đăng nhập (Coordinator)
> - `targetEmployee` = Người đang được xem/đánh giá (có thể khác currentEmployee)

**Pattern Implementation:**
```typescript
// ĐÚNG: Xác định targetEmployee TRƯỚC khi gọi query
const targetEmployee = isCoordinator && selectedEmployeeId
    ? dtEmployees.find(e => e.id === selectedEmployeeId)
    : currentEmployee;

// Query data cho targetEmployee, KHÔNG phải currentEmployee
const { data: existingEval } = useEmployeeEvaluationQuery(
    targetEmployee?.id || '', // ← Critical!
    openPeriod?.id || ''
);
```

**Applied in:**
- `EmployeeFormDT.tsx` - Query + save logic
- `EmployeeFormKS.tsx` - Query + save logic  
- `SummaryTable.tsx` - Calculation sync with WorkPointsTable

### 3.6 Audit Logging
- **Scope:** Schedule changes, Leave Approval/Rejection, System Reset
- **Storage:** `audits` collection in Firestore

### 3.7 Admin Tools & Data Maintenance
- **Cleanup Tool:** Admin-only, filters by collection/employee/date
- **Schedule Export Tool:** Form cho phép Admin chọn bộ lọc theo Ngày, Công việc để xuất toàn bộ danh sách phân công lịch cố định từ hệ thống ra định dạng danh sách Excel. (v3.18.0)
- **Safety:** Requires "DELETE" keyword confirmation
- **Audit:** Batch deletions logged as single event

### 3.8 Reports Module (v3.9.23)

**Component:** `components/Reports/` (13+ files)

| Tab | Component | Description |
|-----|-----------|-------------|
| **Điểm hàng tuần** | `PointsTable` | Thống kê điểm theo tuần/tháng |
| **Tiến độ hàng ngày** | `DailyTable` | Theo dõi tiến độ công việc |
| **Đào tạo** | `TrainingTable` | Chi tiết theo buổi đào tạo |
| **Đổi ca** | `SwapReport` | Lịch sử đổi ca |
| **Đổi nghỉ** | `LeaveSwapTable` | Lịch sử đổi nghỉ |
| **Đánh giá tháng** | `EvaluationReport` | Tổng hợp đánh giá |
| **Điểm Livechat** | `LivechatMonthlyReport` | Thống kê điểm Livechat theo tháng (ONB_DT) |
| **Tổng hợp ĐT** | `TrainingMonthlyReport` | Thống kê đào tạo theo nhân viên |

#### LivechatMonthlyReport (v3.10.0)
- **Scope:** Employees in `ONB_DT` group
- **Columns:** Dynamic - union of all period configs across selected months
- **Multi-month:** Per-period conversion (each month uses its own config multipliers)
- **Backward Compatible:** Old periods fall back to DỄ=1, TB=1.2, KHÓ=1.5
- **Export:** Excel (.xlsx) with dynamic columns

#### TrainingMonthlyReport (v3.9.23)
- **Scope:** All employees with training sessions
- **Metrics:** Nghiệp vụ, Lĩnh vực, Nội bộ, Trực tiếp, Tổng KH Tham gia/Khảo sát/Biết SD
- **Classification:** Based on `Job.classification` field
- **Date Selector:** Single month / Multi-month / Custom range
- **Export:** Excel (.xlsx)

### 3.9 Public Schedule Share (v3.20.0)

**Mục đích:** Cung cấp đường dẫn chia sẻ cố định cho Khách hàng xem lịch đào tạo mà không cần đăng nhập, đồng thời bảo mật dữ liệu nội bộ.

**Kiến trúc Backend (Cloud Function `getPublicTrainingSchedule`):**
- **Bảo mật:** Dùng Service Account lấy data `jobs` (chỉ nhóm Đào tạo), `subJobs` (đang active), `holidays`, `workPeriods`. Frontend nhận dữ liệu sạch, không thể đọc collection nội bộ bằng Firestore SDK (do bị chặn bởi Security Rules).
- **Tối ưu chi phí:** Cấu hình `res.set('Cache-Control', 'public, max-age=600, s-maxage=600');`. Firestore reads cho toàn bộ traffic Khách hàng được gói gọn trong 1 lần truy vấn mỗi 10 phút (~150 reads). Chi phí vận hành = $0.

**Kiến trúc Frontend (`components/PublicShare/`):**
- Bỏ qua Auth/Role Check tại `App.tsx` bằng đường dẫn `/shared/training`.
- `PublicScheduleContainer`: Fetches data 1 lần từ Cloud Function, quản lý selectedDate, bộ lọc Sản phẩm (AMIS Kế toán / MISA SME).
- `PublicDailySchedule`: Hiển thị ma trận lịch theo ngày, phân nhóm Lĩnh vực/Nghiệp vụ. Tự check `holidayName` để render banner Nghỉ lễ thay vì bảng rỗng.
- `PublicWeeklySchedule`: Hiển thị lịch từ T2 -> CN. Nếu một cột trúng vào Nghỉ lễ, hiển thị chữ "Nghỉ lễ" với nền vàng nhạt, các cột khác vẫn hoạt động bình thường. Loại trừ hoàn toàn dữ liệu Livechat (theo yêu cầu KH).
### 3.10 Báo cáo Chăm sóc KH (Customer Care) (v3.21.0 & v3.22.0)
**Mục đích:** Cung cấp module chuyên biệt cho nhóm Kiểm soát (ONB_KS) để báo cáo công việc chăm sóc khách hàng hàng ngày và xem thống kê tổng hợp.

**Đặc điểm kỹ thuật:**
- **Data Model:**
    - `care_campaigns`: Lưu danh mục chiến dịch (id, name, code, isActive...).
    - `care_metrics`: Lưu danh mục chỉ tiêu (id, name, unit, isActive...). 4 chỉ tiêu mặc định: `call_count`, `duration`, `reached`, `ultraview`.
    - `care_reports`: Lưu báo cáo ngày. Khóa chính `{employeeId}_{date}`. Chứa `dailyMetrics` (map từ metric ID sang giá trị) và `campaignDetails` (map từ campaign ID sang object chứa `dailyCompleted` và `weeklyTarget`).
- **ISO Week ID:** Sử dụng format `YYYY-Wxx` làm khóa phụ để query nhanh dữ liệu theo tuần mà không cần tính toán range date phức tạp trên Firestore.
- **Tính năng Thống kê (v3.22.1 - v3.22.3):**
    - Bổ sung dòng **Σ Tổng cộng** cho bảng chi tiết chiến dịch (trong cả View Ngày và Form Nhập liệu).
    - Bổ sung cột **Tổng cộng (% HT)** cho bảng thống kê theo nhân viên.
    - **Dashboard Upgrades (v3.22.4):**
        - Sửa lỗi lọc NV ngưng hoạt động khỏi bảng thống kê và tính tổng.
        - Cải thiện công thức tổng hợp mục tiêu tuần (`weeklyTarget`) theo từng nhân viên (group by employee, sum max targets), sửa lỗi sai mẫu số.
        - Thêm UX bảng phân nhóm màu rõ ràng (Chỉ tiêu / Chiến dịch / Tổng hợp), sticky column hiển thị tên.
    - **Dashboard Upgrades (v3.22.3):**
        - Summary Cards hiển thị ở tất cả view modes (bao gồm Ngày).
        - Trend indicators (↑↓ %) so sánh với kỳ trước (hôm qua, tuần trước, tháng trước).
        - Employee Breakdown Table khả dụng ở cả View Ngày (chi tiết đóng góp theo ngày).
        - Ranking nhân viên: Tự động sort theo sản lượng và hiển thị Rank Badge (#1 Trophy, #2-3 Medal).
- **Tương thích ngược:** Hỗ trợ fallback tự động đọc dữ liệu cũ (từ các trường fix cứng như `callCount`) sang cấu trúc map mới. Logic fallback được tập trung vào helper `getMetricValue(dailyMetrics, metricId)` trong `useCustomerCare.ts` — tất cả components PHẢI dùng helper này thay vì tự viết inline fallback.
- **Phân quyền:** Cấp full quyền cho nhóm `ONB_KS` trong riêng module này để tự quản lý chiến dịch, chỉ tiêu và xem báo cáo toàn phòng.

---

## 4. DEPLOYMENT

### 4.1 Commands
> **⚠️ See [DEPLOYMENT.md](./DEPLOYMENT.md) for official Release Protocol.**

```bash
# Development
npm run dev

# Production Deploy (includes build)
npm run deploy
# Or manually: npm run build && firebase deploy --only hosting
```

### 4.2 Caching Strategy

**Resolution Checklist** (if users see old version):
1. Check `firebase.json` has `no-cache` for `index.html` and `sw.js`
2. Increment PWA version in `vite.config.ts` manifest
3. Always run `npm run build` before deploy

**Configuration:** See `CODE_EXAMPLES.md` Section 15.

---

---

*For quick reference, see [OVERVIEW.md](./OVERVIEW.md). For version history, see [CHANGELOG.md](./CHANGELOG.md).*
