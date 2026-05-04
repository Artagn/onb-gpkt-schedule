# ONB GPKT Schedule - Project Structure

> **Last Updated:** 2026-04-24 | **Version:** v3.19.2

## 1. Directory Structure

```
d:\ONB App\Calender\
├── components/                     # UI Components (Feature-based)
│   ├── Admin/                      # Admin-only modules
│   │   ├── AdminDashboard.tsx      # Main Admin container
│   │   ├── AuditLogViewer.tsx      # View System Logs
│   │   ├── CleanupManager.tsx      # Data maintenance tool
│   │   ├── DataIntegrityChecker.tsx # Data integrity validation
│   │   └── ScheduleExportTool.tsx  # Export schedule to Excel
│   │
│   ├── Dashboard/                  # Main Dashboard (Widgets)
│   │   ├── index.tsx               # Container + Stats
│   │   ├── CombinedWidget.tsx      # Tabbed Leaves/Tasks widget
│   │   ├── ScheduleCard.tsx        # Schedule summary card
│   │   ├── StatCard.tsx            # Reusable stat card
│   │   └── useDashboardStats.ts    # Logic (visibility-aware timer)
│   │
│   ├── DailyAllocation/            # [MODULE] Daily task assignment
│   │   ├── index.tsx               # Container
│   │   └── useDailyAllocation.ts   # Logic hook
│   │
│   ├── Employees/                  # [MODULE] Employee Management
│   │   ├── index.tsx               # Container
│   │   ├── EmployeeTable.tsx       # Employee data table
│   │   ├── EmployeeModals.tsx      # Add/Edit modals
│   │   └── useEmployeeManager.ts   # CRUD logic
│   │
│   ├── Evaluation/                 # [MODULE] Monthly Evaluation (10 files)
│   │   ├── index.tsx               # Tab navigation + routing
│   │   ├── EmployeeFormDT.tsx      # DT group form (58KB)
│   │   ├── EmployeeFormKS.tsx      # KS group form (38KB)
│   │   ├── ReviewManager.tsx       # Approval workflow (37KB)
│   │   ├── PeriodManager.tsx       # Admin period config (33KB)
│   │   ├── WorkPointsTable.tsx     # Điểm công việc (31KB)
│   │   ├── SummaryTable.tsx        # Summary table (20KB)
│   │   ├── KpiTable.tsx            # KPI table (16KB)
│   │   ├── MetricManager.tsx       # Admin metrics config
│   │   └── EvaluationErrorBoundary.tsx # Error boundary
│   │
│   ├── FixedSchedule/              # [MODULE] Auto-Schedule & Matrix
│   │   ├── index.tsx               # Container
│   │   ├── ScheduleMatrix.tsx      # Schedule grid
│   │   ├── ScheduleRow.tsx         # Row component
│   │   ├── ScheduleCell.tsx        # Cell component
│   │   ├── ConfigPatternManager.tsx # Pattern configuration
│   │   ├── Modals.tsx              # Schedule modals
│   │   ├── PreviewModal.tsx        # Auto-schedule preview
│   │   └── useFixedSchedule.ts     # Logic hook
│   │
│   ├── JobManager/                 # [MODULE] Job Management
│   │   ├── index.tsx               # Container
│   │   ├── Modals.tsx              # Add/Edit modals
│   │   ├── MultiSelect.tsx         # Multi-select component
│   │   └── useJobManager.ts        # CRUD logic
│   │
│   ├── Leaves/                     # [MODULE] Leave Balance
│   │   ├── LeaveBalanceHistory.tsx  # Balance history view
│   │   └── LeaveBalanceWidget.tsx   # Balance widget
│   │
│   ├── MyTasks/                    # [MODULE] Personal Employee Portal
│   │   ├── index.tsx               # Container
│   │   ├── FixedScheduleList.tsx   # Assigned shifts
│   │   ├── DailyTasksList.tsx      # Daily tasks
│   │   ├── WeeklyTrainingTable.tsx # Weekly training view
│   │   ├── LeaveManager.tsx        # Leave requests
│   │   ├── Modals.tsx              # Task modals
│   │   └── useMyTasks.ts           # Logic hook
│   │
│   ├── Reports/                    # [MODULE] Reports & KPI (16 files)
│   │   ├── index.tsx               # Container + tab routing
│   │   ├── ReportsHeader.tsx       # Header with date filter
│   │   ├── PointsTable.tsx         # KPI points table
│   │   ├── PointsChart.tsx         # KPI chart visualization
│   │   ├── PointsSummaryCards.tsx   # KPI summary cards
│   │   ├── DailyTable.tsx          # Daily progress table
│   │   ├── DailyProgressChart.tsx  # Daily progress chart
│   │   ├── DailySummaryCards.tsx    # Daily summary cards
│   │   ├── TrainingTable.tsx       # Training details
│   │   ├── TrainingSummaryCards.tsx # Training summary cards
│   │   ├── SwapReport.tsx          # Shift swap stats
│   │   ├── LeaveSwapReport.tsx     # Leave swap stats
│   │   ├── EvaluationReport.tsx    # Monthly evaluation report
│   │   ├── LivechatMonthlyReport.tsx # Livechat monthly report
│   │   ├── TrainingMonthlyReport.tsx # Training monthly report
│   │   └── useReports.ts          # Reports logic hook
│   │
│   ├── SwapMarket/                 # [MODULE] Shift Swap Marketplace
│   │   ├── index.tsx               # Market UI
│   │   ├── SwapRequestModal.tsx    # Request form
│   │   └── SwapHistory.tsx         # Transaction log
│   │
│   ├── common/                     # Shared Components
│   │   ├── ColorLegend.tsx         # Reusable legend with ARIA
│   │   ├── ConfirmModal.tsx        # Confirmation dialog
│   │   └── GlobalErrorBoundary.tsx # Error boundary
│   │
│   ├── ui/                         # UI Primitives
│   │   ├── Skeleton.tsx            # Skeleton loading
│   │   └── index.ts               # Barrel export
│   │
│   ├── BottomNav.tsx               # Mobile bottom navigation
│   ├── Config.tsx                  # System configuration UI
│   ├── CoordinationManager.tsx     # Coordinator container
│   ├── DailyViewTab.tsx            # Daily view tab
│   ├── Login.tsx                   # Login page
│   ├── ScheduleViewer.tsx          # View-only Calendar (Daily/Weekly)
│   ├── Sidebar.tsx                 # Navigation + User Info
│   ├── WeeklyScheduleView.tsx      # Weekly schedule view
│   └── WorkCalendarConfig.tsx      # Work calendar configuration
│
├── context/
│   └── DataContext.tsx             # [CORE] Global State & Auth-gated Real-Time Subscriptions
│
├── hooks/                          # Custom Hooks (19 files)
│   ├── useRealtimeQuery.ts         # [CORE] onSnapshot → TanStack Query cache
│   ├── useSchedulesQuery.ts        # Date-range filtered schedules
│   ├── useEmployeesQuery.ts        # Employee data
│   ├── useLeavesQuery.ts           # Leave data with date range
│   ├── useAllocationsQuery.ts      # Allocation data with date range
│   ├── useConfigQuery.ts           # Config + pattern queries (staleTime: Infinity)
│   ├── useWorkPeriodsQuery.ts      # Work period config
│   ├── useHolidaysQuery.ts         # Holiday config
│   ├── useJobsQuery.ts             # Job definitions
│   ├── useSubJobsQuery.ts          # Sub-job definitions
│   ├── useEvaluationQuery.ts       # Evaluation queries
│   ├── useEvaluationDT.ts          # DT calculation logic
│   ├── useLeaveHandlers.ts         # Leave management handlers
│   ├── useLeaveBalanceQuery.ts     # Single employee balance
│   ├── useLeaveBalanceHistory.ts   # Balance history
│   ├── useDateFilter.ts           # Date presets & filtering
│   ├── usePermissions.ts          # Permission helpers
│   ├── useCountUp.ts              # Animated counting hook
│   └── useSmoothNavigate.ts       # Smooth page transitions
│
├── services/                       # Business Logic & API Layer (11 files)
│   ├── firebaseConfig.ts          # Firebase init + Persistence
│   ├── firestoreService.ts        # [CORE] CRUD + real-time subscriptions
│   ├── schedulerEngine.ts         # [CORE] Auto-scheduling (8-criteria scoring)
│   ├── evaluationService.ts       # Evaluation CRUD
│   ├── evaluationExportService.ts # Evaluation Excel export
│   ├── excelExportService.ts      # General Excel export
│   ├── swapService.ts             # Shift swap logic
│   ├── cleanupService.ts          # Data maintenance
│   ├── appConfigService.ts        # App config service
│   ├── googleSheets.ts            # Google Sheets integration
│   └── mockData.ts                # Development seed data
│
├── utils/                          # Utilities (3 files)
│   ├── evaluationHelpers.ts       # Shared evaluation helpers
│   ├── evaluationValidation.ts    # Zod validation schemas
│   └── permissions.ts             # Permission logic
│
├── functions/                      # Cloud Functions (Backend)
│   └── src/
│       ├── index.ts               # Function exports
│       ├── onLeaveBalanceUpdate.ts # Leave balance trigger
│       ├── recalculateBalances.ts  # Balance recalculation
│       ├── scheduleContext.ts      # Schedule context helpers
│       └── types.ts               # Shared types
│
├── types.ts                        # TypeScript definitions (28 interfaces)
├── schemas.ts                      # Zod validation schemas
├── constants.ts                    # App constants
├── routes.tsx                      # URL routing configuration
├── App.tsx                         # Root component
├── index.tsx                       # App entry point
├── index.css                       # Global styles
├── index.html                      # HTML template
├── vite.config.ts                  # Vite config + PWA
├── tsconfig.json                   # TypeScript config
├── firebase.json                   # Firebase hosting config
├── firestore.rules                 # Firestore security rules
└── firestore.indexes.json          # Firestore composite indexes
```

## 2. Key Technology Stack

- **Frontend**: React 19, TypeScript, Vite 6
- **UI Framework**: Tailwind CSS, Lucide React (Icons)
- **State Management**: TanStack Query v5 + React Context
- **Backend**: Firebase (Auth, Firestore, Hosting, Cloud Functions)
- **Routing**: React Router DOM v7
- **Validation**: Zod v4
- **Build**: Vite (PWA via vite-plugin-pwa)

## 3. Data Flow Architecture

1.  **Authentication**: `App.tsx` listens to Firebase Auth.
2.  **Data Loading**: `DataContext.tsx` subscribes to Firestore collections *only* after Auth is confirmed.
3.  **Real-Time**: Schedule/Leaves/Allocations use `onSnapshot` → TanStack Query cache (v3.16.0).
4.  **Polling**: All other collections use `useQuery` + `getDocs` with tiered `staleTime`.
5.  **Mutations**: UI calls services → Firestore update + `queryClient.setQueryData()` (optimistic).
6.  **Reactivity**: `onSnapshot` listeners push changes to TanStack Query cache → auto re-render.

## 4. Firestore Collections (Database)

| Collection | Purpose |
|------------|---------|
| `employees` | User profiles and Roles |
| `jobs` | Definition of tasks/shifts |
| `sub_jobs` | Sub-task definitions |
| `schedule` | Core Schedule Items (Who does What, When) |
| `allocations` | Daily progress tracking (KPIs) |
| `leaves` | Leave requests (Off/Late) |
| `leave_balances` | Per-employee compensatory leave wallet |
| `swapRequests` | Marketplace for trading shifts |
| `evaluations` | Per-employee monthly evaluation data |
| `evaluation_metrics` | Configurable evaluation metrics |
| `evaluation_periods` | Evaluation period config |
| `workPeriods` | Season config (date ranges + shifts) |
| `holidays` | Holiday calendar |
| `patterns` | Schedule patterns |
| `audits` | System logs for security and tracking |
| `appConfig` | Global settings |
