# ONB GPKT Schedule - System Overview

> **📚 START HERE** - Quick reference for new AI agents and developers  
> **Last Updated:** 2026-09-21  
> **Version:** v4.5.0  
> **Status:** ✅ Production

---

## 🎯 TL;DR (30-Second Summary)

ONB GPKT Schedule là hệ thống quản lý lịch làm việc, phân công nhân sự tự động và báo cáo KPI cho bộ phận ONB/GPKT (~30 nhân viên).

- ✅ **Auto-Scheduling** - Phân công tự động với scoring engine 8 tiêu chí, preview mode, diff 3 chiều nguyên tử v4.0.0
- ✅ **Smart Swap & RBAC Security** - Marketplace đổi ca qua Cloud Function giao dịch an toàn (v4.1.0) và siết chặt 100% Rules bảo mật dữ liệu
- ✅ **Leave Balance Wallet** - Tính điểm nghỉ bù T7/CN/Lễ qua Cloud Functions
- ✅ **Monthly Evaluation** - Đánh giá KPI theo nhóm DT/KS với workflow duyệt
- ✅ **Public Share** - Chia sẻ lịch đào tạo công khai qua link cố định, tự động lọc ngày lễ, tối ưu CDN Cache thực tế chi phí $0
- ✅ **Survey Short Links** - Link khảo sát rút gọn (TinyURL) tích hợp vào lịch đào tạo, điền sẵn Tên lớp + Ngày, cache Firestore 1 lần/ngày/lớp
- ✅ **PWA Mobile** - Installable app với offline support

---

## 📊 Quick Stats

| Metric | Value |
|--------|-------|
| **Tech Stack** | React 19 + TypeScript + Vite |
| **State Management** | TanStack Query v5 + 4-Context Splitting |
| **UI Framework** | Tailwind CSS v3 (Local build-time) + Lucide Icons + Inter Font |
| **Database** | Cloud Firestore (Real-time sync + docChanges parsing cache) |
| **Auth** | Firebase Authentication (Google Sign-in) |
| **Deployment** | Firebase Hosting |
| **Mobile** | PWA (Progressive Web App) |
| **Production URL** | https://onb.io.vn |
| **Components** | 15 modules + 7 standalone files |
| **Hooks** | 19 custom hooks |
| **Services** | 11 service files |
| **Utils** | 4 utility files |

---

## 🧠 Key Decisions & Rationale

### 1. TanStack Query & 4-Context Splitting
**Problem:** Monolithic "God Context" gây re-render liên hoàn toàn bộ Layout (Sidebar, BottomNav) khi có cập nhật lịch trực real-time.  
**Solution:** Phân rã thành 4 Context cô lập (Config, Realtime, Sync, Session) và gọi hook chuyên dụng directly.  
**Why:** Giảm thiểu re-render rò rỉ tại Layout về con số 0 tuyệt đối khi nhận Firestore snapshots.

### 2. Modular Component Architecture
**Problem:** Giant components (400-700 lines)  
**Solution:** Folder-based modules với index.tsx + useFeature.ts hooks  
**Why:** Single Responsibility, easier testing, consistent patterns

### 3. Hybrid Leave Model
**Problem:** 2 loại nghỉ bù khác nhau (Ca Tối vs T7/CN)  
**Solution:** Ticket-based cho Ca Tối, Balance-based cho T7/CN qua Cloud Function  
**Why:** Business logic phức tạp cần server-side validation

### 4. PWA với Service Worker
**Problem:** Employees cần xem lịch offline, trên mobile  
**Solution:** PWA installable với workbox caching  
**Why:** No app store approval, instant updates, responsive UI

### 5. Scoring Engine Auto-Schedule
**Problem:** Manual scheduling tốn 2-3h/tuần  
**Solution:** 8-criteria scoring với preview mode  
**Why:** Balance fairness (KPI, rest days, variety) + human override

---

## 📂 Navigation Guide

| Need | Read |
|------|------|
| **Architecture & Implementation** | → [CONTINUITY.md](./CONTINUITY.md) |
| **Development Roadmap** | → [ROADMAP.md](./ROADMAP.md) |
| **Version History** | → [CHANGELOG.md](./CHANGELOG.md) |
| **Deployment Protocol** | → [DEPLOYMENT.md](./DEPLOYMENT.md) |
| **Code Patterns & Examples** | → [CODE_EXAMPLES.md](./CODE_EXAMPLES.md) |
| **Project Structure** | → [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) |

---

## 🚀 Recent Major Changes

| Date | Version | Change | Impact |
|------|---------|--------|--------|
| 2026-09-21 | v4.5.1 | Job Mặc định & Lọc Phân công theo Lịch cố định | Gộp job "1-1" + "Chuyển đổi" thành "Chuyển đổi & 1-1" (job_27), khóa Sửa/Xóa job này trong JobManager (`DEFAULT_JOB_IDS`). Daily Allocation lọc nhân viên cho job này theo Lịch cố định (`schedule`) thay vì cả nhóm "Chia hàng ngày". Sửa lỗi xung đột với bộ lọc "đang rảnh theo buổi" khiến danh sách rỗng. |
| 2026-08-31 | v4.5.0 hotfix | Bảo mật hoá Token TinyURL & Deploy chính thức | Chuyển token TinyURL từ hardcode sang Firebase Secret Manager (`defineSecret`), gỡ bỏ `getSurveyForm`/`submitSurveyResponse`/`sheetsService.ts`/`googleapis` (tính năng khảo sát tự viết chưa dùng tới, ngoài phạm vi Survey Short Links). Deploy chính thức `batchSurveyShortLinks` + Firestore rules lên production. |
| 2026-07-15 | v4.5.0 | Survey Short Links | Tích hợp link khảo sát rút gọn (TinyURL API) vào lịch đào tạo. Cloud Function `batchSurveyShortLinks` tạo/cache link trong Firestore collection `surveyShortLinks`. Frontend hook `useSurveyLinks` batch-fetch với TanStack Query cache 24h. Nút "📋 Khảo sát" trên mỗi SubJob, click = copy link rút gọn. |
| 2026-06-17 | v4.4.18 | Sửa lỗi CORS Đổi lịch (Region Mismatch) | Khởi tạo functions instance trỏ chính xác về vùng `asia-southeast1` (Singapore) trùng khớp với GCF, giải quyết triệt để lỗi CORS khi duyệt đổi ca. |
| 2026-06-11 | v4.4.17 | Phân công Hàng ngày & Sửa đổi Nghỉ bù | Cho phép chỉnh sửa trực tiếp số phân công lũy kế trong ô nhập liệu Daily Allocation, loại bỏ text "Đã chia: X" rác. Sửa dứt điểm lỗi tự phục hồi/trùng lặp vé nghỉ bù khi đổi lịch (Nguyễn Thị Ngân) qua useMyTasks & schedulerEngine guards. |
| 2026-06-08 | v4.4.16 | Shared Allocation Merge & Staff Save Hardening | Trích xuất utility dùng chung `utils/allocationMerge.ts`. Bảo mật hóa Firestore Rules cấm Staff sửa assigned/newAssigned. Chuyển Staff Save sang batch write kèm rollback snapshot khi lưu tiến độ. |
| 2026-06-08 | v4.4.15 | Fix Firestore Update Permission | Sửa lỗi `Missing or insufficient permissions` khi nhân viên cập nhật trạng thái công việc (status = Completed) hoặc lưu tiến độ. Cho phép các trường id, isFixed, requiredCount, coefficient đi kèm trong payload cập nhật nhưng cấm thay đổi giá trị. |
| 2026-06-05 | v4.4.14 | Optimize Column Width Proportions | Set Daily view table columns layout: Tên lớp (50%), Buổi (10%), Bắt đầu (12%), Kết thúc (12%), Link (16%). |
| 2026-06-05 | v4.4.13 | Split Public Daily Time Column | Split the "Thời gian" column in Daily view table into "Bắt đầu" and "Kết thúc" columns for a cleaner layout. |
| 2026-06-05 | v4.4.12 | API Cache Busting | Append query parameter `?v=4.4.12` to `/api/public-schedule` to bypass old misrouted HTML cache. |
| 2026-06-05 | v4.4.11 | Fix Public Share Link Route | Change Hosting rewrite key from `id` to `functionId` for getPublicTrainingSchedule rewrite, preventing HTML fallback and SyntaxError. |
| 2026-06-03 | v4.4.10 | Daily Allocation Rollover & Batch Save | Roll over newAssigned into assigned on save, reset input to 0, show cumulative "Đã chia: X" label, save via batch writes, and add logic rollback on failure. |
| 2026-06-03 | v4.4.9 | Fix Coordination Cache Wiping Regression | Fix manual coordination cache wiping by refactoring real-time queryFn to return existing cache data (safe net Hướng A) and removing redundant invalidateQueries in Modals.tsx and useFixedSchedule.ts (clean net Hướng B). |
| 2026-06-03 | v4.4.8 | Route Guard, Excel Batch Import & Timezones | Guard route-level, validate Excel row-by-row & lowercase emails, parseISO & localeCompare in Admin tools |
| 2026-06-02 | v4.4.7 | Dashboard & Coordination Solidification | Đồng bộ hóa múi giờ an toàn toàn diện (parseISO), khắc phục vi phạm React Rules of Hooks, củng cố tính atomicity cho các tác vụ lưu và copy-paste lịch trực, tối ưu hiệu năng O(1) busyMap và nâng cấp số phiên bản đồng bộ sang v4.4.7. |
| 2026-06-02 | v4.1.0 | Cloud Function approveSwapRequest & Secure firestore.rules RBAC Overhaul | Chuyển đổi logic duyệt Đổi lịch sang Cloud Function (transaction atomic), siết chặt 100% Rules bảo mật Firestore qua bảng tra cứu user_roles có lối thoát Super Admin, tích hợp Panel chạy migration, và chuẩn hóa date format operational. |
| 2026-06-02 | v4.0.0 | React 19 Context Splitting & Bulk Sync Optimization | Phân tách God Context thành 4-Context cô lập hoàn toàn re-render thừa. Tối ưu hóa cầu nối dữ liệu Real-time (Zod parsedCache & docChanges). Tối ưu ghi đè Auto-Schedule (diff 3 chiều) giúp giảm >95% Firestore writes và đạt atomicity 100%. Kích hoạt thực sự Firebase Hosting CDN Edge Cache cho API công khai. |
| 2026-05-26 | v3.22.5 | Add Document Link to Sub-Jobs | Bổ sung trường Link tài liệu vào cấu hình Hạng mục chi tiết (Sub-Jobs) và hiển thị cho nhân viên khi xem lịch cá nhân, dashboard, và chi tiết lịch làm việc. |
| 2026-05-22 | v3.22.4 | Customer Care Stats Fixes | Sửa lỗi NV ngưng hoạt động hiển thị trong bảng. Sửa công thức mẫu số Tiến độ chiến dịch lấy tổng targets toàn phòng thay vì max. Cải thiện UX bảng Thống kê với sticky columns và color-coded groups. |
| 2026-05-14 | v3.22.3 | Customer Care Input Form Fixes | Sửa lỗi không hiển thị đúng target tuần ở các ngày giữa tuần và sửa lỗi khó xóa số liệu trong ô nhập Lũy kế cuối ngày. |
| 2026-05-12 | v3.22.2 | Customer Care Input Fix | Thêm dòng tổng cộng vào bảng chi tiết chiến dịch trong form nhập liệu hàng ngày. |
| 2026-05-12 | v3.22.1 | Customer Care Report Enhancements | Thêm dòng tổng cộng chiến dịch hàng ngày và cột tổng cộng (% HT) cho bảng thống kê nhân viên. |
| 2026-05-11 | v3.22.0 | Dynamic Metrics for Customer Care | Chuyển đổi 4 chỉ tiêu cố định thành danh sách động quản lý từ giao diện. Gộp tab Chiến dịch và Chỉ tiêu vào tab Cấu hình. |
| 2026-05-11 | v3.21.0 | Customer Care Module | Ra mắt module Báo cáo Chăm sóc KH dành riêng cho nhóm ONB_KS. Hỗ trợ nhập liệu hàng ngày, quản lý chiến dịch động, thống kê tuần/tháng và phân quyền full access cho nhóm KS. |
| 2026-05-08 | v3.20.0 | Public Schedule Share V2 | Ra mắt tính năng chia sẻ lịch Đào tạo công khai. Lịch ngày/tuần cố định, không cần đăng nhập. Tự động nhận diện Nghỉ Lễ, loại trừ Livechat. Áp dụng Firebase CDN Cache (max-age 10p) đưa chi phí vận hành về $0. |
| 2026-05-05 | v3.19.6 | Hotfix: JobManager Crash & Classification | Fix React #300 crash (duplicate `useJobManager()` calls), restore `classification` field bị mất ở Job interface/schema/form, thêm Firestore rules cho `jobGroups` collection |
| 2026-05-05 | v3.19.5 | Dynamic JobGroup Migration | Xóa triệt để `JobGroup` enum cũ, chuyển 17 file sang dùng dynamic `JobGroupDef` từ Firestore. Fix build errors, deploy thành công |
| 2026-05-05 | v3.19.4 | Extended Date Range | Mở rộng phạm vi fetch dữ liệu ±10 ngày (5 hooks) để đảm bảo hiển thị lịch sử phân công cũ hơn |
| 2026-04-24 | v3.19.3 | Typography & UI Polish | Thêm font Inter, EmptyState component, xóa dead CDN code, cập nhật PWA theme |
| 2026-03-27 | v3.19.2 | Livechat Hotfix & UI | Sửa lỗi toán học khi gom nhóm Report, điều chỉnh công thức tính số ngày quy đổi thay cho % Hoàn thành |
| 2026-03-27 | v3.19.0 | Cập nhật Tính Điểm Livechat | Thay đổi logic sang nhập số liệu Thực Hiện và TC/buổi thay vì xếp loại theo độ khó. Cải tiến giao diện và tương thích dữ liệu cũ. |
| 2026-03-27 | v3.18.0 | Bổ sung Tính năng Xuất lịch | Thêm công cụ xuất file Excel lịch điều phối cho Admin |
| 2026-03-09 | v3.17.1 | Fix Instant UI Updates | Sửa lỗi UI không cập nhật ngay khi phân công lịch hoặc đánh giá hoàn thành — không cần F5. |
| 2026-03-05 | v3.17.0 | Real-Time Optimization | Tối ưu hệ thống real-time, dọn dẹp polling queries dư thừa. |
| 2026-03-01 | v3.14.0 | Read Optimization (Tiered) | Bật Firestore Persistence, áp dụng staleTime phân tầng (2m - 4h) giúp giảm ~80% lượt đọc. |
| 2026-02-25 | v3.13.0 | Remove Bot & Optimize Range | Gỡ bỏ hoàn toàn AI Bot, tối ưu khoảng thời gian fetch dữ liệu (Tháng trước -> +3 Tuần sau) |
| 2026-02-23 | v3.12.0 | Expanded Window | Mở rộng range thành: Tháng trước -> Tháng sau (3 tháng) |
| 2026-02-12 | v3.11.4 | Extended Window | Điều chỉnh range thành: Tuần trước -> +3 Tuần sau (5 tuần) |
| 2026-02-11 | v3.11.3 | Extreme Read Optimization | Giới hạn 3 tuần (-1/+1 tuần) cho toàn bộ app, kể cả lịch sử nghỉ bù |
| 2026-02-11 | v3.11.1 | Firebase Read Optimization | Giảm 70%+ reads: date range 9→3 tháng, staleTime tối ưu, fix wasteful patterns |
| 2026-02-10 | v3.11.0 | Code Cleanup & Dead Code Removal | Xóa ~200 dòng dead code, gộp usePatternsQuery, loại bỏ subscribe methods |
| 2026-02-10 | v3.10.2 | Firebase Cost Optimization Phase 4 | Loại bỏ real-time subscriptions cho leaves/allocations, tối ưu staleTime |
| 2026-02-07 | v3.10.0 | Configurable Livechat Difficulty | Hệ số độ khó DỄ/TB/KHÓ cấu hình động thay vì hardcode, multi-month per-period conversion |
| 2026-02-07 | v3.9.30 | Evaluation Data Locking | Khóa đợt ĐG sau khi duyệt hết, snapshot config |
| 2026-02-04 | v3.9.26 | Shared Filter for Monthly Reports | Bộ lọc thời gian chung cho 3 tab Báo cáo tháng |

---

## 🔑 Critical Files Quick Reference

| Component | File | Purpose |
|-----------|------|---------|
| **App Entry** | `App.tsx` | Root + Provider + Router (263 lines) |
| **Global State** | `context/DataContext.tsx` | TanStack Query + Context bridge |
| **Firestore CRUD** | `services/firestoreService.ts` | Data access + real-time subscriptions |
| **Real-Time Hook** | `hooks/useRealtimeQuery.ts` | onSnapshot → useQuery cache subscription (v3.17.1) |
| **Auto-Scheduler** | `services/schedulerEngine.ts` | 8-criteria scoring (535 lines) |
| **Monthly Eval** | `components/Evaluation/` | 10 components incl. DT/KS forms |
| **Types** | `types.ts` | 28 TypeScript interfaces (364 lines) |
| **Schemas** | `schemas.ts` | Zod validation schemas |
| **Common** | `components/common/` | ColorLegend, ConfirmModal, GlobalErrorBoundary, EmptyState |
| **Survey Links** | `hooks/useSurveyLinks.ts` | Batch-fetch link khảo sát rút gọn (TanStack Query 24h cache) |
| **Utils** | `utils/` | evaluationHelpers.ts, evaluationValidation.ts, permissions.ts, allocationMerge.ts |

---

## 🎯 Current Production Status

| Feature | Status | Notes |
|---------|--------|-------|
| **Schedule Management** | ✅ Stable | Daily/Weekly views, Auto-schedule |
| **Leave Management** | ✅ Stable | Balance wallet, approval workflow |
| **Swap Market** | ✅ Stable | Smart swap with nghỉ bù auto-link |
| **Monthly Evaluation** | ✅ Stable | DT/KS forms, Review Manager |
| **Reports & KPI** | ✅ Stable | Charts, Excel export, Livechat/Training summaries |
| **Public Share** | ✅ Deployed | v3.20.0 | Caching API, Lịch tuần/ngày |
| **Survey Short Links** | ✅ Deployed | v4.5.0 | TinyURL + Firestore cache, copy to clipboard |
| **PWA Mobile** | ✅ Deployed | v3.18.0 |

---

## 👤 Role-Based Access

| Role | Access |
|------|--------|
| **Admin** | Full access - Config, Employees, Audit Logs |
| **Coordinator** | Manager - Auto-schedule, Approve Leaves |
| **Staff** | Self-Service - My Tasks, Personal Reports |

---

*This overview is updated with each major release. For detailed implementation, see [CONTINUITY.md](file:///d:/ONB%20App/Calender/CONTINUITY.md).*
