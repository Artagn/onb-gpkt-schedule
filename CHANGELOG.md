# Changelog - ONB GPKT Schedule

> All notable changes to this project are documented in this file.  
> Format follows [Keep a Changelog](https://keepachangelog.com/).

## [4.4.18] - 2026-06-17 🛡️ Sửa lỗi CORS Đổi lịch (Region Mismatch)
**Summary:** Sửa lỗi CORS (ERR_FAILED / preflight check block) khi nhân viên phê duyệt yêu cầu đổi ca trực do lệch vùng gọi Firebase Functions (us-central1 vs asia-southeast1).

### Fixed
- **`firebaseConfig.ts`:** Khởi tạo instance `functions` dùng chung ở client-side trỏ chính xác về vùng `asia-southeast1` (Singapore) trùng khớp với cấu hình deployed của function `approveSwapRequest`. Nhờ đó giải quyết dứt điểm lỗi CORS chặn duyệt đổi ca.

## [4.4.17] - 2026-06-11 🚀 Phân công Hàng ngày & Sửa đổi Nghỉ bù
**Summary:** Chuyển đổi tính năng Phân công Hàng ngày sang mô hình cập nhật trực tiếp số lượng phân công lũy kế và dứt điểm lỗi hiển thị nghỉ bù trùng lặp của Nguyễn Thị Ngân.


### Added
- **Tích hợp Số lũy kế Phân công:** Ô nhập liệu cột "Phân công" (trước đây là "Chia mới") trong DailyAllocation hiển thị trực tiếp và cho phép điều chỉnh (tăng/giảm) số lượng lũy kế phân công của ngày hôm nay.

### Changed
- **Ẩn Label "Đã chia":** Xóa dòng chữ phụ hiển thị `Đã chia: X` bên dưới ô nhập để tối ưu hóa không gian hiển thị bảng phân công.
- **Cơ chế lưu trữ:** Bỏ cơ chế rollover tự động cộng dồn đợt phân công khi lưu. `handleSave` cập nhật trực tiếp giá trị `assigned` lên database và gán `newAssigned = 0`.
- **Tương thích ngược báo cáo:** Báo cáo năng suất (`useReports.ts`) tự động cộng gộp `assigned + newAssigned` để hiển thị đúng số liệu cho cả dữ liệu lịch sử và dữ liệu mới.

### Fixed
- **Trùng lặp nghỉ bù khi đổi lịch:** Cập nhật `useMyTasks.ts` tự động tìm và xóa sạch vé `JOB_NGHI_BU` cũ khi dời lịch nghỉ bù. Cập nhật `schedulerEngine.ts` kiểm tra chặt chẽ các vé nghỉ bù đã đổi lịch để ngăn auto-scheduler tự phục hồi ca nghỉ cũ.
- **Dọn dẹp dữ liệu:** Quét và loại bỏ hoàn toàn các tài liệu nghỉ bù lỗi bị trùng lặp của Nguyễn Thị Ngân (`emp_2`) và nhân sự `emp_8` trên database live.

## [4.4.16] - 2026-06-08 🔧 Daily Allocation Stability & Security Fixes
**Summary:** Bốn bản sửa lỗi từ kết quả self-review tính năng Phân công hàng ngày: loại bỏ code trùng lặp, vá lỗ hổng bảo mật Firestore Rules, thêm rollback cho staff save, và sửa lỗi array mutation.

### Refactored
- **[NEW] `utils/allocationMerge.ts`:** Trích xuất ~120 dòng logic merge/dedup allocation trùng lặp giữa `useDailyAllocation.ts` và `useMyTasks.ts` thành shared utility `mergeAllocationsWithLocal()`, ngăn ngừa rủi ro sửa bug 1 chỗ mà quên chỗ kia.
- **`useDailyAllocation.ts`:** Thay thế inline merge logic bằng lệnh gọi `mergeAllocationsWithLocal()` từ shared utility.
- **`useMyTasks.ts`:** Thay thế inline merge logic tương tự, đồng bộ với coordinator hook.

### Fixed (Security)
- **`firestore.rules` (Allocation Update):** Thêm equality check cho `assigned` và `newAssigned` — chặn nhân viên sửa số lượng phân công qua DevTools. Trước đây whitelist cho phép thay đổi các trường này.

### Fixed (Data Integrity)
- **`useMyTasks.ts` (`handleSaveProgress`):** Chuyển từ `Promise.all(save())` (non-atomic) sang `saveAll()` (writeBatch, atomic). Thêm snapshot-based rollback khi save thất bại — trước đây dirty state bị clear bất kể thành công hay thất bại.
- **`DailyTasksList.tsx`:** Sửa `Array.sort()` mutate mảng gốc — dùng `[...arr].sort()` để đảm bảo immutability.

## [4.4.15] - 2026-06-08 🐛 Fix Firestore Update Permission for Staff
**Summary:** Sửa lỗi phân quyền `FirebaseError: Missing or insufficient permissions` khi nhân viên bấm "Hoàn thành công việc" (status = Completed) hoặc lưu tiến độ. Hỗ trợ gửi các trường tùy chọn/mặc định (id, isFixed, requiredCount, coefficient) trong payload cập nhật của nhân viên khi các trường này không thay đổi hoặc được khởi tạo.

### Fixed
- **firestore.rules (Schedule Update):** Cho phép các trường `id`, `isFixed`, `requiredCount`, và `coefficient` có trong danh sách affected keys của bản ghi schedule đối với nhân viên (Staff), đồng thời bổ sung các ràng buộc bảo mật để đảm bảo nhân viên không thể thay đổi giá trị của các trường này.
- **firestore.rules (Allocation Update):** Cho phép trường `id` trong danh sách affected keys của bản ghi allocation, đảm bảo nhân viên có thể lưu tiến độ công việc một cách bình thường khi client gửi kèm trường `id`.

## [4.4.14] - 2026-06-05 ⚡ Optimize Column Width Proportions
**Summary:** Điều chỉnh tỷ lệ cột bảng Lịch Đào Tạo Hàng Ngày giúp "Tên lớp" chiếm 50% chiều rộng bảng, các cột còn lại (Buổi, Bắt đầu, Kết thúc, Link) phân bổ đều phần 50% còn lại.

### Changed
- **PublicDailySchedule Header Widths:** Đặt tỷ lệ cột: Tên lớp (50%), Buổi (10%), Bắt đầu (12%), Kết thúc (12%), Link (16%).
- **Cache Buster:** Nâng cấp tham số cache buster thành `?v=4.4.14` để trình duyệt áp dụng giao diện mới.

## [4.4.13] - 2026-06-05 ⚡ Split Public Daily Time Column
**Summary:** Phân tách cột "Thời gian" trong bảng Lịch Đào Tạo Hàng Ngày thành hai cột riêng biệt "Bắt đầu" và "Kết thúc" giúp cân đối tỷ lệ hiển thị và dễ nhìn hơn.

### Changed
- **PublicDailySchedule Table Layout:** Thay thế cột "Thời gian" hiển thị dạng `HH:MM - HH:MM` bằng 2 cột "Bắt đầu" và "Kết thúc" hiển thị giờ riêng biệt.
- **Cache Buster:** Nâng cấp tham số cache buster thành `?v=4.4.13` để đảm bảo trình duyệt cập nhật layout mới tức thì.

## [4.4.12] - 2026-06-05 ⚡ API Cache Busting & Versioning
**Summary:** Bổ sung tham số phiên bản `?v=4.4.12` vào API URL `/api/public-schedule` ở frontend nhằm phá cache trình duyệt/CDN chứa phản hồi lỗi HTML cũ.

### Changed
- **API Cache Buster:** Thay đổi URL gọi dữ liệu lịch công khai thành `/api/public-schedule?v=4.4.12` giúp trình duyệt và CDN bỏ qua các bản ghi cache lỗi trước đó, đồng thời vẫn bảo đảm khả năng cache CDN bình thường đối với phiên bản hiện tại.

## [4.4.11] - 2026-06-05 🐛 Fix Public Share Link API Route
**Summary:** Sửa lỗi cấu hình rewrite Firebase Hosting của API công khai `/api/public-schedule` (thay `id` bằng `functionId`), khắc phục lỗi "Unexpected token <" do route bị fall back về `index.html`.

### Fixed
- **Firebase Hosting Rewrite:** Đổi trường `id` thành `functionId` trong cấu hình `hosting.rewrites` của `firebase.json` giúp Hosting định tuyến chính xác tới Cloud Function `getPublicTrainingSchedule` ở vùng `asia-southeast1`.

## [4.4.10] - 2026-06-03 ⚡ Daily Allocation Multi-Batch Rollover & Batch Save
**Summary:** Hỗ trợ quy trình phân công việc hàng ngày chia làm nhiều đợt trong ngày, tự động chuyển lượng chia mới thành tích lũy sau khi lưu và reset ô gõ về 0, tối ưu hóa lưu lượng ghi DB và khắc phục sai lệch tính tồn.

### Added
- **Đã chia Helper Label:** Hiển thị số lượng đã giao trước đó (`Đã chia: X`) bên dưới ô nhập Chia mới trong từng dòng và summary cell.
- **Rollback Safeguard:** Cơ chế khôi phục trạng thái local (rollback) khi lưu xuống DB thất bại.

### Fixed
- **Input reset kẹt số:** Tự động cộng dồn `newAssigned` vào `assigned` và reset `newAssigned = 0` khi lưu thành công $\rightarrow$ giải phóng ô nhập để Coordinator gõ số mới bắt đầu từ 0 cho đợt tiếp theo.
- **Tồn calculation:** Sửa công thức tính Tồn cộng thêm cả `assigned` cũ: `(assigned + newAssigned) - (HT + Trả KD + Trả TP)`.
- **Database Write Optimization:** Thay thế N+1 saves bằng batch write duy nhất `allocationsService.saveAll`, đồng thời dọn dẹp `invalidateQueries` thừa tương ứng với real-time stream.

---

## [4.4.9] - 2026-06-03 ⚡ Coordination Cache Wiping Regression Fix
**Summary:** Sửa lỗi nghiêm trọng mất hiển thị lịch và đơn nghỉ trên bảng điều phối bằng cách tối ưu hóa queryFn (Hướng A) và làm sạch cơ chế invalidation của React Query (Hướng B).

### Added
- **Global queryFn Safeguard:** Refactored `useSchedulesRealtimeQuery`, `useLeavesRealtimeQuery`, và `useAllocationsRealtimeQuery` để `queryFn` trả về dữ liệu cache hiện tại (`getQueryData || []`) thay vì mảng rỗng `[]`, tạo lưới an toàn khi bị stale/invalidation.

### Fixed
- **Cache Wiping Bug:** Loại bỏ triệt để các lệnh `invalidateQueries` cho `SCHEDULE_KEYS.all` và `LEAVE_KEYS.all` tại các handler gán thủ công (`Modals.tsx`) và thao tác bảng (`useFixedSchedule.ts`) để tránh refetch thừa, giúp giao diện tự động đồng bộ tức thì thông qua luồng `onSnapshot` Firestore mà không bị nhấp nháy hoặc mất dữ liệu.
- **Leave Balance Sync:** Giữ nguyên invalidations cho `LEAVE_BALANCE_KEYS` và `LEAVE_BALANCE_HISTORY_KEYS` để Cloud Functions cộng/trừ ví nghỉ bù vẫn tự động cập nhật số dư hiển thị mà không bị mất đồng bộ.

---

## [4.4.8] - 2026-06-03 🛠️ Timezone Solidification & Excel Import Atomicity
**Summary:** Đồng bộ hóa múi giờ an toàn cho WorkCalendarConfig và PublicDailySchedule, nâng cấp quy trình import Excel JobManager với validation toàn diện và atomic batch writes (saveAll), đồng thời loại bỏ lỗi logic `|| true` ở isActive.

### Added
- **Validation on Job Imports:** Tích hợp `validateJob` và kiểm tra trùng tên Excel cho luồng import Jobs.
- **SubJob Parent Verification:** Nâng cấp báo lỗi dòng rõ ràng khi parent job không tồn tại thay vì bỏ qua âm thầm.
- **validateSubJob Helper:** Thiết lập hàm `validateSubJob` chung cho cả luồng lưu đơn lẻ và import.
- **EmptyState:** Tái sử dụng component EmptyState đồng bộ cho 3 bảng của JobManager và 2 bảng của WorkCalendarConfig.

### Fixed
- **isActive Bug:** Sửa lỗi logic `|| true` khiến mọi Job/SubJob import đều ở trạng thái hoạt động.
- **WorkCalendarConfig Timezone:** Sửa timezone offset hiển thị lịch làm việc và ngày lễ qua `parseISO`.
- **PublicDaily Date Picker:** Sửa timezone lùi ngày khi khách chọn ngày hiển thị lịch qua `parseISO`.

---

## [4.4.7] - 2026-06-02 🧭 Dashboard & Coordination Solidification
**Summary:** Đồng bộ hóa múi giờ an toàn toàn diện (parseISO), khắc phục vi phạm React Rules of Hooks, củng cố tính atomicity cho các tác vụ lưu và copy-paste lịch, tối ưu hiệu năng O(1) busyMap và làm sạch giao diện hiển thị phiên bản.

### Added
- **O(1) busyMap:** Tối ưu hóa bộ lọc bận `checkBusy` trong DailyAllocation sang Set-based O(1) lookup dùng so khớp chuỗi trực tiếp, loại bỏ hàng trăm Date parsing và scan mảng dư thừa.
- **Optimistic Cache Rollback:** Bổ sung cơ chế rollback cache an toàn cho `applySchedule` tránh cache-DB drift khi ghi lỗi, kết hợp real-time listener tự động stream đồng bộ.

### Fixed
- **Timezone Solidification:** Thay thế toàn bộ `new Date` parse date-only thành `parseISO` ở 10+ vị trí, dứt điểm lỗi tính sai logic tuần (`isSameWeek`) ở biên Chủ Nhật/Thứ Hai.
- **Rules of Hooks:** Sửa lỗi gọi hook có điều kiện `useCountUp` trong `StatCard` gây nguy cơ crash.
- **Atomic Writes:** Tái cấu hình `applySchedule` tuần tự (Upsert trước, Delete sau) và chuyển đổi `pasteCell` sang `saveAll` batch ghi nguyên tử duy nhất, ngăn ngừa rủi ro mất lịch.
- **Version Bump:** Nâng cấp đồng bộ số phiên bản hiển thị sang v4.4.7 ở Sidebar, package.json và vite.config.ts.

---

## [4.1.0] - 2026-06-02 🛡️ Cloud Function approveSwapRequest & Secure firestore.rules RBAC Overhaul
**Summary:** Chuyển đổi logic duyệt Đổi lịch sang Cloud Function (asia-southeast1) an toàn qua giao dịch atomic, đồng thời siết chặt 100% Rules bảo mật Firestore qua bảng tra cứu user_roles có lối thoát Super Admin và chuẩn hóa date format operational.

### Added
- **Cloud Functions:** Tạo HTTPS Callable Cloud Function `approveSwapRequest` sử dụng giao dịch transaction reads-before-writes đồng nhất phân quyền với Rules.
- **Cloud Functions:** Tạo trigger `onEmployeeWrite` tự động đồng bộ hóa vai trò của nhân sự sang `/user_roles` và callable function `runDataMigration` để đồng bộ / chuẩn hóa dữ liệu hàng loạt.
- **Firestore Rules:** Siết chặt Rules bảo mật RBAC null-safe với hardcoded Super Admin short-circuit bypass (`isSuperAdmin()`) đảm bảo an toàn tuyệt đối.
- **Admin Panel:** Tích hợp nút bấm "Chạy Migration v4.1.0" trong Cleanup Manager dành riêng cho Super Admin.

### Fixed
- **Smart Swap Date Inconsistency:** Chuẩn hóa toàn bộ ngày ghi thủ công ở frontend từ `.toISOString()` sang định dạng chuỗi `'yyyy-MM-dd'` sạch sẽ, giải quyết triệt để lỗi logic Smart Swap.
- **App Entry Bug:** Sửa lỗi undeclared call của `setUser` trong `App.tsx`.

---

## [3.22.5] - 2026-05-26 🚀 Add Document Link to Sub-Jobs
**Summary:** Bổ sung trường nhập Link tài liệu vào cấu hình Hạng mục chi tiết (Sub-Jobs) và hiển thị cho nhân viên khi xem lịch cá nhân, dashboard, và chi tiết lịch làm việc.

### Added
- **SubJob Models:** Thêm trường `documentLink` vào `SubJob` interface và validation Zod schema.
- **Job Configuration:** Bổ sung ô nhập liệu "Link Tài liệu" vào form sửa SubJob, hiển thị cột trong bảng hạng mục chi tiết.
- **Excel Template:** Thêm cột "Link Tài liệu" (cột 10) trong file import mẫu Excel và hỗ trợ import.
- **Employee Views:** Hiển thị nút "Link tài liệu" (emerald) trên lịch cá nhân (`FixedScheduleList`), modal chi tiết (`SubJobDetailModal`) và Dashboard (`ScheduleCard`).

---

## [3.22.4] - 2026-05-22 📊 Customer Care Stats Fixes
**Summary:** Sửa lỗi NV ngưng hoạt động hiển thị trong bảng. Sửa công thức mẫu số Tiến độ chiến dịch lấy tổng targets toàn phòng thay vì max. Cải thiện UX bảng Thống kê với sticky columns và color-coded groups.

### Fixed
- **Customer Care Reports:** Loại bỏ nhân viên ngưng hoạt động khỏi bảng thống kê và tính tổng.
- **Customer Care Campaigns:** Sửa công thức tính tổng targets theo tuần.
- **Customer Care Dashboard:** Thêm sticky columns và màu phân nhóm cho các bảng thống kê.

---

## [3.22.3] - 2026-05-14 🐛 Customer Care Input Form Fixes
**Summary:** Sửa lỗi không hiển thị đúng target tuần ở các ngày giữa tuần và sửa lỗi khó xóa số liệu trong ô nhập Lũy kế cuối ngày.

### Fixed
- **DailyReportForm:** Cập nhật logic để tự động lấy `weeklyTarget` từ các ngày khác trong tuần nếu bản ghi hiện tại có target = 0.
- **DailyReportForm:** Cho phép ô nhập Lũy kế cuối ngày phản hồi chính xác thao tác xóa phím bằng cách không ép `dailyCompleted` lớn hơn 0 ngay lập tức khi đang gõ (`onChange`), chỉ chuẩn hóa lại khi hoàn tất (`onBlur` hoặc `Save`).

---

## [3.22.2] - 2026-05-12 📊 Customer Care Input Fix
**Summary:** Thêm dòng tổng cộng vào bảng chi tiết chiến dịch trong form nhập liệu hàng ngày.

---

## [3.22.1] - 2026-05-12 📊 Customer Care Report Enhancements
**Summary:** Bổ sung dòng tổng cộng cho bảng chiến dịch hàng ngày và cột tổng cộng kèm % hoàn thành cho bảng thống kê nhân viên.

### Added
- **ReportDashboard:** Thêm dòng "Σ Tổng số các chiến dịch" vào bảng chi tiết từng ngày.
- **ReportDashboard:** Thêm cột "Tổng cộng (% HT)" vào bảng chi tiết theo nhân viên, tính toán dựa trên tổng Target của tất cả chiến dịch.
- **ReportDashboard:** Cập nhật dòng "Tổng cộng toàn phòng" hiển thị grand total cho toàn bộ chiến dịch.

---

## [3.22.0] - 2026-05-11 ⚙️ Dynamic Metrics for Customer Care
**Summary:** Chuyển đổi 4 chỉ tiêu cố định thành danh sách động quản lý từ giao diện. Gộp tab Chiến dịch và Chỉ tiêu vào tab Cấu hình.

---

## [3.21.0] - 2026-05-11 🎧 Customer Care Module
**Summary:** Ra mắt module Báo cáo Chăm sóc KH dành riêng cho nhóm ONB_KS. Hỗ trợ nhập liệu hàng ngày, quản lý chiến dịch động, thống kê tuần/tháng.

---

## [3.20.0] - 2026-05-08 🔗 Public Schedule Share V2
**Summary:** Ra mắt tính năng chia sẻ lịch Đào tạo công khai. Lịch ngày/tuần cố định, không cần đăng nhập. Áp dụng Firebase CDN Cache chi phí $0.

---

## [3.19.6] - 2026-05-05 🐛 Hotfix: JobManager & Classification
**Summary:** Fix React #300 crash, restore `classification` field bị mất, thêm Firestore rules cho `jobGroups`.

---

## [3.19.5] - 2026-05-05 🏗️ Dynamic JobGroup Migration
**Summary:** Xóa triệt để `JobGroup` enum cũ, chuyển sang dùng dynamic `JobGroupDef` từ Firestore.

---

## [3.19.4] - 2026-05-05 🗓️ Extended Date Range
**Summary:** Mở rộng phạm vi fetch dữ liệu ±10 ngày để đảm bảo hiển thị lịch sử phân công cũ hơn.

---

## [3.19.3] - 2026-04-24 🎨 Typography & UI Polish
**Summary:** Nâng cấp typography (Inter font), thêm EmptyState component thống nhất, dọn dẹp HTML và cập nhật PWA theme.

### Added
- **Inter Font:** Thêm Google Font Inter (400-700) với `font-smoothing` và `tabular-nums` cho bảng KPI.
- **EmptyState Component:** `components/common/EmptyState.tsx` — component tái sử dụng cho empty states với icon, title, description, CTA, hỗ trợ table `colSpan`.
- **SEO:** Thêm `<meta name="description">` vào `index.html`.

### Changed
- **Dashboard:** Empty states (Schedule, Leaves, Tasks) sử dụng EmptyState component mới.
- **MyTasks:** FixedScheduleList và DailyTasksList sử dụng EmptyState component.
- **PWA:** `theme_color` đổi từ `#ffffff` → `#0f172a` (match sidebar) cho brand consistency trên mobile.

### Removed
- **index.html:** Xóa CDN Tailwind (`cdn.tailwindcss.com`) gây conflict với Vite-bundled Tailwind.
- **index.html:** Xóa dead importmap block và stale `build-time` meta tag.

---

## [3.19.2] - 2026-03-27 🖌️ UI Update: Livechat Formula Text
**Summary:** Cập nhật hiển thị công thức và số ngày quy đổi trong tab Điểm Livechat.

### Changed
- **EmployeeFormDT:** Thay thế hiển thị công thức Tỷ lệ hoàn thành bằng "Số ngày quy đổi (Định mức 6đ/ngày): X ngày" với X = Tổng điểm Livechat / 6.

---

## [3.19.1] - 2026-03-27 🐛 Hotfix Livechat Logic
**Summary:** Fix lỗi tính điểm sai từ Livechat kết hợp trong Tổng điểm công việc tại Báo cáo chung.

### Fixed
- **WorkPointsTable & SummaryTable:** Sửa lỗi math (tổng hợp điểm bằng cách chia rate tổng hợp sai lệch toán học). Cập nhật sum(performance points per-row) phân rã theo từng job tương tự như `EmployeeFormDT`.

---

## [3.19.0] - 2026-03-27 📉 Refactoring Livechat Point Calculation
**Summary:** Thay đổi logic tính điểm Livechat từ phân loại cấu hình độ khó (Dễ/TB/Khó) sang nhập số lượng Thực hiện thực tế trên giao diện.

### Changed
- **EmployeeFormDT:** Cập nhật bảng TÌNH HÌNH THỰC HIỆN thành giao diện form sửa số Thực hiện/buổi trực tiếp; loại bỏ form Điền độ khó thủ công cũ.
- **Evaluation Logic:** Áp dụng công thức (Thực hiện / Tổng YC) * Điểm cố định để tính năng suất.
- **Báo cáo & Tương thích:** Sửa `LivechatMonthlyReport`, `WorkPointsTable`, `SummaryTable` để tự tương thích với các evaluation cũ, đổi label Báo cáo sang Thực hiện/QĐ.

---

## [3.18.0] - 2026-03-27 📊 Cập nhật Công cụ Xuất lịch
**Summary:** Bổ sung tính năng Xuất dữ liệu Điều phối Lịch ra Excel cho Admin, kèm module UI lọc theo Ngày và Công việc tại trang Quản trị.

### Added
- **ScheduleExportTool.tsx:** Component giao diện export dành cho Admin.
- **excelExportService.ts:** Thêm hàm `exportScheduleData` xuất file .xlsx theo format chuẩn.

---

## [3.17.1] - 2026-03-09 ⚡ Fix Instant UI Updates (No F5 Required)
**Summary:** Sửa lỗi UI không cập nhật ngay khi phân công lịch mới hoặc đánh giá hoàn thành công việc — phải F5 để thấy thay đổi.

### Fixed
- **useRealtimeQuery.ts:** Thay `getQueryData()` (đọc 1 lần, không re-render) bằng `useQuery()` (subscribe cache changes) → Component tự động re-render khi onSnapshot push dữ liệu mới.
- **Modals.tsx:** 8 lời gọi `setSchedule`/`setLeaves` (đã bị deprecate thành no-op) → `queryClient.setQueryData()` cho optimistic update tức thì.
- **useFixedSchedule.ts:** 2 lời gọi `setSchedule` (no-op) → `queryClient.setQueryData()` tại `applySchedule` (tự động xếp lịch) và `pasteCell` (copy-paste).

---

## [3.17.0] - 2026-03-05 🚀 Real-Time Optimization & Consistency
**Summary:** Tối ưu hóa hệ thống real-time, dọn dẹp các polling queries dư thừa và đảm bảo tính nhất quán dữ liệu tức thì trên toàn bộ ứng dụng.

### Fixed
- **Conflict Resolution:** Sửa lỗi xung đột giữa `onSnapshot` (real-time) và `getDocs` (polling) tại `useMyTasks.ts` và `CoordinationManager.tsx`.
- **Read Optimization:** Loại bỏ ~15-20% Firestore reads không cần thiết bằng cách xóa polling queries chạy ngầm khi dữ liệu đã có trong cache real-time.
- **Coordination UI:** Xóa nút "Lấy dữ liệu lịch" tại tab Điều phối vì dữ liệu hiện đã tự động cập nhật ngay khi có thay đổi.

### Changed
- **useMyTasks.ts:** Chuyển sang sử dụng hoàn toàn dữ liệu từ `DataContext` (real-time).
- **CoordinationManager.tsx:** Chuyển sang sử dụng dữ liệu từ `DataContext`, dọn dẹp state `fetchEnabled`.
- **DataContext.tsx:** Dọn dẹp unused imports và tối ưu hóa logic khởi tạo data.

---

## [3.16.2] - 2026-03-05 🐛 Fix KPI Reports Data Loading
**Summary:** Sửa lỗi KPI & Năng suất không hiển thị số liệu khi chọn các tháng trước (hoặc bất kỳ khoảng thời gian nào).

### Fixed
- **useReports.ts:** Xóa cơ chế `fetchEnabled` chặn queries không bao giờ fire. Nguyên nhân: `handleFetchData()` không được return từ hook, nút "Lấy dữ liệu" (`ReportsHeader.tsx`) không được sử dụng trong `index.tsx`. Queries giờ tự động fetch khi authenticated và tự refetch khi thay đổi date range.

---

## [3.16.1] - 2026-03-04 🧹 Cleanup & Documentation Sync
**Summary:** Dọn dẹp tàn dư AI Bot (dependencies, env vars), cập nhật deprecated Firestore API, đồng bộ tài liệu với codebase thực tế.

### Removed
- **Dependencies:** Gỡ `react-markdown` + `remark-gfm` (97 packages, ~65KB bundle) — không còn dùng từ khi xóa AI Bot v3.13.0.
- **vite.config.ts:** Xóa `define` block chứa Gemini API env vars và import `loadEnv` không dùng.

### Changed
- **firebaseConfig.ts:** Thay `enableMultiTabIndexedDbPersistence` (deprecated) bằng `initializeFirestore` + `persistentLocalCache` API hiện đại (Firebase v10+).

### Updated
- **OVERVIEW.md:** Sửa đúng số liệu (19 hooks, 11 services, 15 modules, 364 dòng types).
- **CONTINUITY.md:** Cập nhật cây thư mục chính xác (thêm Leaves module, services đầy đủ 11 files, Reports 16 files, hooks 19 files).

---

## [3.16.0] - 2026-03-04 🔴 Hybrid Real-Time (onSnapshot)
**Summary:** Chuyển 3 collection quan trọng (schedule, leaves, allocations) sang real-time `onSnapshot` để user thấy thay đổi tức thì trên mọi tab/thiết bị. Các collection khác giữ nguyên polling.

### Added
- **hooks/useRealtimeQuery.ts:** Generic `useRealtimeSubscription` hook wrap `onSnapshot` → TanStack Query cache. 3 typed variants: `useSchedulesRealtimeQuery`, `useLeavesRealtimeQuery`, `useAllocationsRealtimeQuery`.
- **firestoreService.ts:** `subscribeToCollectionWithDateRange()` — real-time listener với date filter + Zod validation.

### Changed
- **DataContext.tsx:** Schedule/Leaves/Allocations dùng real-time queries thay vì polling 4h staleTime.

---

## [3.15.1] - 2026-03-04 🐛 Fix NaN in SummaryTable
**Summary:** Sửa lỗi hiển thị NaN ở cột "Công việc (điểm) - Thực hiện" và "TL HT chung" trong bảng Kết quả chung khi nhân viên có dữ liệu Livechat Difficulty dạng dynamic keys.

### Fixed
- **SummaryTable.tsx:** `calcLivechatPoints` dùng hardcode `easy/medium/hard` keys thay vì dynamic config → `undefined * number = NaN`. Chuyển sang dùng `getDifficultyConfig()` + `calcDifficultyConverted()` từ `evaluationHelpers.ts` (đồng bộ với `WorkPointsTable.tsx`).

---

## [3.15.0] - 2026-03-03 📉 Firebase Read Optimization & On-Demand Fetching
**Summary:** Triển khai cơ chế tải dữ liệu theo nhu cầu (On-Demand) và tối ưu hóa cache cực độ để giảm chi phí Firestore, đồng thời mở rộng khả năng xem dữ liệu lịch sử.

### Added
- **On-Demand Fetching (Báo cáo):** Thêm nút "Lấy dữ liệu" và quản lý trạng thái fetch thủ công trong module Báo cáo.
- **On-Demand Fetching (Điều phối):** Thêm cơ chế tải lịch theo yêu cầu trong CoordinationManager, giữ phần Phân công hàng ngày realtime.
- **useEvaluationsByPeriodsQuery:** Hook mới hỗ trợ tải dữ liệu đánh giá theo danh sách Period IDs cụ thể, tiết kiệm lượt đọc.

### Changed
- **useSchedulesQuery / useLeavesQuery / useAllocationsQuery:** Refactor hỗ trợ `startDate`/`endDate` linh hoạt và độc lập cache Key, giúp xem lại dữ liệu lịch sử không giới hạn.
- **Global Cache Policy:** Tăng `staleTime` cho dữ liệu Master (NV, Công việc, Cấu hình) lên `Infinity` và Dashboard lên 4h.
- **EvaluationReport:** Chuyển sang sử dụng `useEvaluationsByPeriodsQuery` để chỉ tải dữ liệu của các tháng đang hiển thị.

---

## [3.14.0] - 2026-03-01 📈 Persistence & Tiered Refetching
**Summary:** Triển khai Firestore Persistence và chiến lược Tiered staleTime giúp giảm ~80% lượt đọc Firebase, tăng tốc độ load tức thì từ bộ nhớ đệm.

### Added
- **Firestore Persistence:** Bật IndexedDB multi-tab persistence trong `firebaseConfig.ts`. App load dữ liệu tức thì từ máy, chỉ tải thêm phần thay đổi (delta) từ server.

### Changed
- **Tiered staleTime Strategy:** Tối ưu tần suất tải lại dữ liệu theo mức độ ưu tiên:
  - **High (2m):** Coordination (Điều phối) và MyTasks (Lịch cá nhân) để đảm bảo tính thời gian thực khi làm việc.
  - **Medium (15m-1h):** Evaluation và Reports.
  - **Passsive (4h):** Dashboard và các view xem lịch chung để giảm tiêu thụ ngầm.
- **Global QueryClient Tuning:** Nâng `staleTime` mặc định lên 30p và `gcTime` lên 1h trong `index.tsx`.
- **Query Optimizations:** Tăng `staleTime` cho các query Evaluation và Master data.

---

## [3.13.0] - 2026-02-25 🧹 Bot Removal & Read Optimization
**Summary:** Gỡ bỏ hoàn toàn AI Bot (frontend & backend) và tối ưu hóa phạm vi tải dữ liệu (Tháng trước -> +3 Tuần sau) để giảm chi phí Firestore.

### Removed
- **AI Chatbot:** Xóa `ChatWidget` component, folder `components/ChatBot` và Cloud Function `askSchedulerBotV2`.

### Changed
- **Queries:** Thu hẹp cửa sổ dữ liệu từ 3 tháng xuống còn: Đầu tháng trước -> Hiện tại + 3 tuần sau.
- **Hooks:** Cập nhật `useSchedulesQuery`, `useLeavesQuery`, `useAllocationsQuery`, `useLeaveBalanceHistory` đồng bộ logic lọc ngày mới.

### Updated
- **Documentation:** Cập nhật `OVERVIEW.md` và `CONTINUITY.md` phản ánh các thay đổi kiến trúc.

---

## [3.12.0] - 2026-02-23 🗓️ Expanded Data Window
**Summary:** Mở rộng phạm vi tải dữ liệu thành 3 tháng (tháng trước, tháng này, tháng sau) để tối ưu trải nghiệm người dùng trong việc tra cứu lịch sử và kế hoạch gần.

### Changed
- **Queries:** Cửa sổ dữ liệu 5 tuần -> 3 tháng cho Schedule, Leaves, Allocations, History.
- **Hooks:** Cập nhật `useSchedulesQuery`, `useLeavesQuery`, `useAllocationsQuery`, `useLeaveBalanceHistory` sử dụng cửa sổ 3 tháng đồng bộ.

---

## [3.11.4] - 2026-02-12 🗓️ Extended Data Window
**Summary:** Điều chỉnh phạm vi tải dữ liệu thành: 1 tuần trước - Tuần hiện tại - 3 tuần sau (Tổng 5 tuần) để thuận tiện hơn cho việc tra cứu sắp tới.

### Changed
- **Queries:** Mở rộng window từ [Sub 1 - Add 1] thành [Sub 1 - Add 3] weeks cho Schedule, Leaves, Allocations, History.

---

## [3.11.3] - 2026-02-11 📉 Firebase Read Optimization (Extreme)
**Summary:** Giới hạn phạm vi tải dữ liệu xuống còn 3 tuần (Tuần trước, Tuần này, Tuần sau) cho toàn bộ ứng dụng để tối ưu chi phí triệt để.

### Changed
- **useLeaveBalanceHistory.ts:** Chỉ lấy lịch sử biến động số dư trong 3 tuần gần nhất (thay vì toàn bộ lịch sử)
- **useSchedulesQuery.ts:** Phạm vi tải: -1 tháng/+2 tháng -> -1 tuần/+1 tuần
- **useLeavesQuery.ts:** Phạm vi tải: -1 tháng/+2 tháng -> -1 tuần/+1 tuần
- **useAllocationsQuery.ts:** Phạm vi tải: -1 tháng/+2 tháng -> -1 tuần/+1 tuần

---

## [3.11.2] - 2026-02-11 🤖 Chatbot Optimization
**Summary:** Tối ưu hóa Chatbot (v2.3) lọc dữ liệu theo thời gian thực (-30/+30 ngày), giảm 90% chi phí đọc Firestore.

### Changed
- **functions/askSchedulerBotV2.ts:** Thêm logic lọc `date` field (-30 ngày đến +30 ngày) cho queries Schedule và Leaves
- **CONTINUITY.md:** Cập nhật tài liệu kỹ thuật Chatbot section 5.1

---

## [3.11.1] - 2026-02-11 📉 Firebase Read Optimization (95K → <30K reads/day)
**Summary:** Giảm 70%+ Firestore reads bằng cách thu hẹp date range, tối ưu staleTime, và sửa các pattern lãng phí.

### Changed
- **useSchedulesQuery/useLeavesQuery/useAllocationsQuery:** Date range -3m/+6m → -1m/+2m (~70% fewer docs per query)
- **useLeavesQuery:** staleTime 2 phút → 5 phút
- **useOpenPeriodQuery:** staleTime 1 phút → 10 phút, thêm `refetchOnWindowFocus: false`
- **useEmployeeEvaluationQuery:** staleTime 1 phút → 5 phút, thêm `refetchOnWindowFocus: false`
- **evaluationService.ts:** `getByEmployeeAndPeriod` dùng `getDoc` (1 read) thay vì load all (N reads)
- **useLeaveBalanceHistory.ts:** Reuse TanStack Query cache cho workPeriods/holidays thay vì gọi trực tiếp Firestore

---

## [3.11.0] - 2026-02-10 🧹 Code Cleanup & Dead Code Removal
**Summary:** Dọn dẹp codebase - xóa ~200 dòng dead code, gộp file trùng, loại bỏ prop drilling không dùng.

### Removed
- **hooks/usePatternsQuery.ts:** Xóa file standalone, merge `usePatternMutations` + `PATTERN_KEYS` vào `useConfigQuery.ts`
- **firestoreService.ts:** Xóa `subscribeToCollection`, `subscribeToCollectionWithQuery`, `syncCollection`, `loadAllData`, `loadTransactionalData`
- **firestoreService.ts:** Xóa tất cả `subscribe()` methods từ 8 typed services (TanStack Query thay thế)
- **firestoreService.ts:** Xóa unused imports: `onSnapshot`, `Unsubscribe`, `QueryConstraint`
- **App.tsx, CoordinationManager.tsx, DailyAllocation/index.tsx:** Xóa `setAllocations` no-op prop drilling
- **13 `console.log`** debug statements xóa khỏi `firestoreService.ts` (8), `evaluationService.ts` (4), `googleSheets.ts` (1)

### Changed
- **useFixedSchedule.ts:** Import `usePatternMutations` từ `useConfigQuery.ts` thay vì `usePatternsQuery.ts`

---

## [3.10.2] - 2026-02-10 📉 Firebase Cost Optimization Phase 4
**Summary:** Giảm chi phí Firestore bằng cách loại bỏ real-time subscriptions cho leaves/allocations, tối ưu staleTime và invalidation.

### Changed
- **DataContext.tsx:** Loại bỏ `onSnapshot` cho leaves + allocations → TanStack Query (eliminates ~60 concurrent listeners)
- **useLeavesQuery.ts:** Date-range loading (-3m/+6m), `staleTime: 2min`, `refetchOnWindowFocus: false`
- **useAllocationsQuery.ts:** Date-range loading, `staleTime: 5min`, `refetchOnWindowFocus: false`
- **firestoreService.ts:** Thêm `loadWithDateRange()` cho `leavesService` và `allocationsService`
- **useEvaluationQuery.ts:** `staleTime` 0 → 2 phút, `refetchOnWindowFocus: false`
- **useWorkPeriodsQuery.ts / useHolidaysQuery.ts:** `staleTime` → `Infinity`, thêm `gcTime: Infinity`
- **ReviewManager.tsx:** `invalidateQueries(['evaluations'])` → `invalidateQueries(['evaluations', periodId])`

---

## [3.10.1] - 2026-02-07 🎨 Highlight Ngày Hiện Tại
**Summary:** Đổi màu nền ô chi tiết nhân viên ngày hiện tại trong Điều phối Lịch từ xanh lá nhạt sang vàng tươi (#d8e500).

### Changed
- **ScheduleCell.tsx:** Background today từ `bg-green-50/60` → inline `#d8e500`, giữ logic override cho Leave

---

## [3.10.0] - 2026-02-07 ⚙️ Cấu hình Độ khó Livechat
**Summary:** Chuyển hệ số độ khó Livechat (DỄ/TB/KHÓ) từ hardcode sang cấu hình động theo đợt đánh giá. Admin có thể thêm/sửa/tắt chỉ tiêu độ khó, tự động copy vào đợt mới.

### Added
- **utils/evaluationHelpers.ts:** Helper chia sẻ `getDifficultyConfig()`, `calcDifficultyConverted()`, `DEFAULT_DIFFICULTY_CONFIG`
- **MetricManager.tsx:** Category mới "Độ khó Livechat" (purple) với cột "Hệ số"
- **evaluationService.ts:** 3 seed metrics mặc định (DỄ×1, TB×1.2, KHÓ×1.5), `createPeriod` tự copy config

### Changed
- **types.ts:** `livechatDifficulty` → dynamic `{ [metricId]: number }`, thêm `livechatDifficultyConfig` vào `dtConfig`
- **schemas.ts:** Cập nhật Zod schemas + lockedSnapshot
- **EmployeeFormDT.tsx:** Bảng nhập liệu render động theo config period
- **WorkPointsTable.tsx:** Tính điểm dùng helper thay hardcode
- **LivechatMonthlyReport.tsx:** Cột động (union configs), tính conversion per-period cho multi-month

### Backward Compatibility
- Đợt cũ không có config → fallback hardcoded DỄ=1, TB=1.2, KHÓ=1.5
- Data cũ `{ easy, medium, hard }` vẫn hoạt động với dynamic key lookup

---

## [3.9.30] - 2026-02-07 🔒 Khóa Đợt Đánh Giá
**Summary:** Thêm chức năng khóa đợt đánh giá sau khi duyệt hết - snapshot config vào mỗi evaluation để bảo toàn dữ liệu.

### Added
- **evaluationService.ts:** `lockPeriod()` - snapshot toàn bộ config (metrics, dtConfig, ksConfig, ratingThresholds, metricOverrides) vào mỗi evaluation record
- **ReviewManager.tsx:** Nút "🔒 Khóa đợt ĐG" xuất hiện khi tất cả evaluations đã approved + badge "Đã khóa"
- **PeriodManager.tsx:** Badge "🔒 Đã khóa" + ẩn nút chỉnh sửa/mở lại cho period đã khóa
- **types.ts:** `lockedSnapshot` trên `EmployeeEvaluation`, `lockedAt`/`lockedBy` trên `EvaluationPeriod`
- **schemas.ts:** Zod schemas cho các fields mới

---

## [3.9.29] - 2026-02-06 🔧 Hủy lịch → Phân công Hàng ngày
**Summary:** Nhân viên có lịch đã hủy giờ xuất hiện trong danh sách Phân công Hàng ngày.

### Fixed
- **useDailyAllocation.ts:** `checkBusy()` loại trừ schedule có `status === 'Cancelled'`

---

## [3.9.28] - 2026-02-06 ⚡ Phase 3: Config Real-time Removal
**Summary:** Loại bỏ hoàn toàn real-time subscriptions cho config data (workPeriods, holidays, patterns) - chỉ load 1 lần/session.

### Added
- **hooks/useConfigQuery.ts:** 3 hooks mới với `staleTime: Infinity` cho static config data

### Changed
- **DataContext.tsx:** Chuyển workPeriods, holidays, patterns từ useState + onSnapshot sang TanStack Query
- **firestoreService.ts:** `loadTransactionalData` giờ chỉ load leaves và allocations

### Removed
- 3 real-time subscriptions trong DataContext (eliminates 90 concurrent listeners: 3 × 30 users)

### Notes
- Config data chỉ load 1 lần khi login, không refetch tự động
- Nếu Admin sửa holidays/workPeriods, users cần refresh page để thấy data mới

---

## [3.9.27] - 2026-02-06 📉 Firestore Read Optimization
**Summary:** Giảm số lượng Firestore reads ~50% bằng cách tăng staleTime và tắt refetch không cần thiết.

### Changed
- **useSchedulesQuery.ts:** `staleTime` 1 phút → 5 phút (giảm polling frequency)
- **useEmployeesQuery.ts:** `staleTime` 30 giây → 10 phút, `refetchOnWindowFocus: false`

### Notes
- Staff chủ yếu chỉ xem lịch, không cần refresh quá thường xuyên
- Mutation vẫn invalidate cache ngay lập tức, đảm bảo dữ liệu mới nhất khi có thay đổi

---

## [3.9.26] - 2026-02-04 🔗 Shared Filter cho Báo cáo tháng
**Summary:** Gộp bộ lọc thời gian chung cho 3 tab Báo cáo tháng.

### Changed
- **Reports/index.tsx:** Thêm shared date filter state ở parent level, hiển thị ở ROW 4B
- **EvaluationReport, LivechatMonthlyReport, TrainingMonthlyReport:** Nhận `sharedFilter` props từ parent
- Chuyển sub-tab giữ nguyên filter selection (không reset như trước)

---

## [3.9.25] - 2026-02-04 🧹 UI Cleanup
**Summary:** Dọn dẹp UI cho Báo cáo tháng.

### Changed
- Bỏ dòng thông báo "Báo cáo tháng tự quản lý bộ lọc thời gian riêng"
- Bỏ giới hạn chiều cao bảng (`max-h-96`) cho 3 tab Tổng hợp ĐG, Điểm Livechat, Tổng hợp ĐT

---

## [3.9.24] - 2026-02-04 🗂️ Reports Module Refactor
**Summary:** Tái cấu trúc Reports module với 2-level tabs và đồng bộ date picker style.

### Changed
- **Reports/index.tsx:** Gộp 8 tabs thành 3 nhóm chính với sub-tabs
  - KPI & Năng suất: Điểm KPI, Chỉ tiêu ngày, Thống kê ĐT
  - Đổi lịch: Đổi ca, Đổi nghỉ bù
  - Báo cáo tháng: Tổng hợp ĐG, Điểm Livechat, Tổng hợp ĐT
- **Layout:** Title → Main Tabs → Sub Tabs → Filters → Content
- **Date Picker:** Đồng bộ style cho 3 tab Báo cáo tháng (1 tháng / Nhiều tháng / Tùy chọn)
- **EvaluationReport.tsx:** Unified date picker, nút Xuất Excel luôn hiển thị
- **LivechatMonthlyReport.tsx:** Unified date picker với 3 mode selection

---

## [3.9.23] - 2026-02-04 📚 Báo cáo Tổng hợp Đào tạo
**Summary:** Thêm tab "Tổng hợp ĐT" - báo cáo thống kê đào tạo theo nhân viên với phân loại công việc.

### Added
- **TrainingMonthlyReport.tsx:** Báo cáo tổng hợp đào tạo theo tháng
- Bảng thống kê: Nghiệp vụ, Lĩnh vực, Nội bộ, Trực tiếp, Tổng buổi, KH Tham gia, KH Khảo sát, KH Biết SD
- Date selector: 1 tháng / nhiều tháng / tùy chọn thời gian
- Export Excel với đầy đủ dữ liệu

---

## [3.9.22] - 2026-02-04 📊 Livechat Monthly Report
**Summary:** Thêm tab "Điểm Livechat" vào module Báo cáo & KPI - tổng hợp thống kê điểm Livechat theo tháng cho nhóm ONB_DT.

### Added
- **LivechatMonthlyReport.tsx:** Component báo cáo với period selector, summary cards, data table và export Excel
- **Reports/index.tsx:** Tab "Điểm Livechat" với icon MessageCircle
- Bảng thống kê các cột: Điểm cố định, Tổng YC, Mã DỄ/TB/KHÓ, Tổng QĐ, TL HT, Điểm NS, TỔNG GHI NHẬN

---

## [3.9.21] - 2026-02-03 🏆 Top 3 Completion Rate & Group Filter
**Summary:** Thêm Top 3 performers widget trong tab Duyệt và loại bỏ nhân viên chưa chọn nhóm đánh giá.

### Added
- **ReviewManager:** Top 3 Tỷ Lệ Hoàn Thành card với medal icons (🥇🥈🥉)
- Hiển thị tên nhân viên, tỷ lệ %, nhóm (DT/KS)

### Changed
- **ReviewManager:** Loại bỏ nhân viên có nhóm "-- Chưa chọn --" khỏi danh sách duyệt và Top 3

---

## [3.9.20] - 2026-02-03 🔧 ONB KS Submit Button & Review Mode Fix
**Summary:** Thêm nút "Gửi đánh giá" cho nhóm ONB KS, sửa tab label động theo group, và fix review mode hiển thị đúng nhân viên được chọn.

### Added
- **EmployeeFormKS:** Thêm nút "Gửi đánh giá" với confirmation dialog
- **EmployeeFormKS:** Hiển thị trạng thái "✅ Đã gửi đánh giá" sau khi submit
- **EmployeeFormKS:** Thêm `submittedAt` timestamp khi gửi đánh giá
- **Evaluation/index.tsx:** Tab label động: "ONB KS tự đánh giá" / "ONB CG tự đánh giá" theo group của user

### Fixed
- **Review Mode:** Detail drawer giờ chỉ hiển thị data của nhân viên được chọn (không phải tất cả)
  - `SummaryTable`, `KpiTable`, `WorkPointsTable`: Thêm prop `employeeId` để filter
  - `EmployeeFormDT`: Truyền `employeeId` xuống các bảng con
  - `EmployeeFormDT`: Khởi tạo `selectedEmployeeId` với `employeeId` prop trong review mode
  - `EmployeeFormDT`: Ẩn employee selector trong Training/Livechat tabs khi ở review mode

### Changed
- **EmployeeFormKS:** Di chuyển nút "Lưu thay đổi" và "Gửi đánh giá" xuống cuối form (luôn hiện)
- **ReviewManager:** Truyền `employeeId` và `periodId` vào EmployeeFormDT khi mở detail drawer

---

## [3.9.19] - 2026-02-03 🔧 Entity Context Bug Fix & Calculation Sync
**Summary:** Sửa lỗi "Entity Context" nghiêm trọng: Coordinator xem đánh giá nhân viên nhưng load nhầm data của chính mình. Đồng bộ logic tính Livechat giữa WorkPointsTable và SummaryTable.

### Fixed
- **Critical:** `EmployeeFormDT.useEmployeeEvaluationQuery` dùng `currentEmployee.id` thay vì `targetEmployee.id` → Load nhầm data
- **Critical:** `SummaryTable.calcLivechatPoints` dùng logic CŨ (`livechatData`) thay vì logic MỚI (`livechatDifficulty`) → Chênh lệch ~30 điểm

### Changed
- `EmployeeFormDT.tsx` - Refactor để xác định `targetEmployee` TRƯỚC khi gọi query, thêm reset state khi đổi employee
- `SummaryTable.tsx` - Sync `calcLivechatPoints()` với `WorkPointsTable` (dùng `livechatDifficulty`)
- `WorkPointsTable.tsx` - Tăng độ rộng cột "Công việc khác" và "Vi phạm" lên 1.5x (82px, 112px, 60px)

### Added
- Admin/Coordinator bypass for `EmployeeFormDT` group check (không cần thuộc ONB_DT để xem form)

---

## [3.9.18] - 2026-02-02 🎨 UI/UX Synchronization
**Summary:** Đồng bộ giao diện Đánh giá tháng với pill-style tabs và thống nhất font size trong các bảng.

### Changed
- `Evaluation/index.tsx` - Main tabs chuyển sang pill-style (rounded, shadow active)
- `Evaluation/EmployeeFormDT.tsx` - Sub-tabs đồng bộ pill-style với main tabs
- `Evaluation/WorkPointsTable.tsx` - Font size từ `text-sm` → `text-xs` (đồng bộ với KpiTable, SummaryTable)

### Added
- ARIA attributes `role="tab"` và `aria-selected` cho sub-tabs

---

## [3.9.16] - 2026-02-02 🎯 Livechat Difficulty Scoring
**Summary:** Implemented Livechat Difficulty Scoring feature that replaces simple completion rate with weighted difficulty classification. Fixed critical bug where Coordinator saves were writing to wrong employee.

### Added
- Livechat Difficulty Scoring: Đánh giá theo độ khó (DỄ/TRUNG BÌNH/KHÓ)
- Formula: Tổng quy đổi = (DỄ × 1.0) + (TB × 1.2) + (KHÓ × 1.5)
- `livechatDifficulty` interface in `types.ts`

### Fixed
- **Critical:** Coordinator reviewing employee evaluations were saving data to their own evaluation instead of the employee being viewed

### Changed
- `EmployeeFormDT.tsx` - New Livechat difficulty UI + save fix
- `WorkPointsTable.tsx` - Updated Livechat column calculation

---

## [3.9.15] - 2026-02-02 📊 Livechat Standard Per-Job
**Summary:** [PHIÊN BẢN SỬA LỖI] Cấu hình tiêu chuẩn Livechat theo từng công việc.

### Changed
- `types.ts`: Đổi `livechatStandardPerSession: number` → `livechatStandards?: { [jobId]: number }`
- `PeriodManager.tsx`: Thêm bảng "Điểm chỉ tiêu nhóm Livechat"
- `EmployeeFormDT.tsx`: Per-job default lookup

---

## [3.9.14] - 2026-02-02 ⚠️ DEPRECATED
> **Warning:** Replaced by v3.9.15 after 16 minutes - incorrect implementation.

---

## [3.9.13] - 2026-02-01 🛡️ Stability & UX Improvements
### Added
- `ColorLegend.tsx` - Reusable legend component with ARIA support
- `useCountUp.ts` - Animated counting hook with visibility API
- Preset legends: SHIFT_LEGEND, STATUS_LEGEND, KPI_LEGEND

### Changed
- `firebase.json` - Enhanced cache-control headers (Pragma, Expires)

---

## [3.9.12] - 2026-02-01 🧹 Clean Code
### Removed
- Unused `date-fns` import in `useAllocationsQuery.ts`
- Debug `console.log` in `App.tsx`

### Changed
- PWA manifest version synced to v3.9.11

---

## [3.9.11] - 2026-01-31 ⚡ Holiday-aware Scheduler
### Added
- `isWorkDay()` helper - Skips holidays and non-working shifts
- Visibility-aware timer in Dashboard

### Changed
- `schedulerEngine.ts` - Holiday/WorkPeriod support + Map pre-compute
- Livechat sorting: O(n² log n) → O(n log n)

---

## [3.9.10] - 2026-01-31 🏗️ EmployeeManager Refactoring
### Changed
Refactored `EmployeeManager.tsx` (446 lines) → modular folder:
- `components/Employees/index.tsx` (~85 lines)
- `components/Employees/useEmployeeManager.ts` (~260 lines)
- `components/Employees/EmployeeTable.tsx` (~155 lines)
- `components/Employees/EmployeeModals.tsx` (~270 lines)

---

## [3.9.9] - 2026-01-31 🛡️ PWA Optimization
### Changed
- PWA manifest version: v3.17.0  → v3.9.8
- Service Worker cache: 4MB → 3MB
- Theme color: #ffffff → #3b82f6

### Added
- `GlobalErrorBoundary.tsx` - Centralized error boundary

---

## [3.9.8] - 2026-01-31 🔄 Dynamic Metrics Sync
### Fixed
- WorkPointsTable now reads from `evaluation_metrics` collection
- Admin changes in MetricManager reflected instantly

---

## [3.9.7] - 2026-01-31 📋 Review Manager
### Added
- `ReviewManager.tsx` - Coordinator approval workflow
- Top Performer Widget - Displays highest-rated approved employee
- `useEvaluationDT.ts` - O(n) greedy algorithm for training points
- `evaluationValidation.ts` - Zod schemas for form validation
- `EvaluationErrorBoundary.tsx` - Error boundary with retry
- `ConfirmModal.tsx` - Reusable modal component

### Changed
- Added `readOnly` prop to EmployeeFormDT and EmployeeFormKS
- Added ARIA attributes to tabs

---

## [3.6.0] - 2026-01-31 📊 ONB_KS Evaluation Form
### Added
- `EmployeeFormKS.tsx` - Controller group evaluation form
- Dual Plan Rates: Current 95%, Previous 93%
- Weighted Scoring: (Current × 70%) + (Previous × 30%)
- Rating System: Vượt mong đợi (≥105%), Đạt (≥100%), Cần cố gắng (<100%)

---

## [3.4.8] - 2026-01-30 🎨 Low-Priority Improvements
### Fixed
- Typo: "THứ 7" → "THỨ 7" in WeeklyScheduleView
- Cloud Function error handling with try-catch blocks

### Added
- `.input-date` CSS classes with hover effects

---

## [3.4.7] - 2026-01-30 🐛 Timezone & Auto-Refresh
### Fixed
- UTC timezone offset in Cloud Functions (+7 hours for Vietnam)
- Proxy leave bug - LeaveManager fetches balance directly

### Changed
- Auto-refresh balance ~1.5s after leave approval

---

## [3.4.6] - 2026-01-30 🔧 Recalculate Balance Tool
### Added
- `recalculateAllBalances` Cloud Function
- Admin UI in CleanupManager

---

## [3.4.5] - 2026-01-30 ⚙️ Leave Balance Exclusion
### Changed
- Employees with approved leave excluded from +1 balance credit

---

## [3.4.4] - 2026-01-30 🐛 Leave Approval Fix
### Fixed
- Approve/Reject buttons for auto-generated nghỉ bù items
- Compensatory leave option showing "(Không có)"

---

## [3.4.3] - 2026-01-30 🧹 Cleanup Tool Enhancement
### Changed
- Merged Job Filter into Data Type dropdown
- Added "Nghỉ bù T7/CN" quick filter option

---

## [3.3.6] - 2026-01-30 🎨 Reports UI Unification
### Added
- `DailySummaryCards.tsx` - Animated metric cards
- Click-to-Highlight in Daily chart
- Colored value badges across all report tables

---

## [3.3.4] - 2026-01-30 ✨ KPI Reports UX Upgrade
### Added
- Count-Up animation on summary cards
- Hover Scale effect (1.05x)
- Ranking Badges (🥇🥈🥉)
- Gradient bar fills
- Quick Date Presets (Tuần trước / Tháng trước)

---

## [3.3.3] - 2026-01-30 📊 KPI Chart Optimization
### Changed
- Merged KPI Chart - Single overlaid bar per employee
- Zero-value employees excluded from charts

---

## [3.3.2] - 2026-01-28 🏗️ Architecture Refactoring
### Changed
- JobManager → modular folder (4 files)
- DailyAllocation → modular folder (2 files)
- useMyTasks → extracted useDateFilter + useLeaveHandlers

---

## [3.3.1] - 2026-01-28 ⚡ Performance & UX
### Added
- Date Range Loading (-3m to +6m) in schedules query
- Skeleton loading components
- Design tokens in index.css

### Changed
- PWA query options: disabled refetchOnWindowFocus

---

## [3.3.0] - 2026-01-28 🏖️ Compensatory Leave System
### Added
- Leave Balance Wallet via Cloud Function
- Undo Complete toggle
- Leave Balance History view
- WorkPeriod-aware eligibility

---

## [3.2.2] - 2026-01-28 📊 Dashboard Refactor
### Changed
- Separated Pending Leaves and Incomplete Tasks into tabbed widget
- Smart Leave Categorization (User vs Auto-generated)

---

## [3.2.1] - 2026-01-28 ⚡ Optimization
### Added
- Code Splitting for Admin, Reports, ScheduleViewer

---

## [3.2.0] - 2026-01-28 🏗️ Refactoring & Performance
### Changed
- Extracted permissions engine to `usePermissions` hook
- Removed double fetching in DataContext
- Audit service now async/await

---

## [3.1.x] - 2026-01-27 to 2026-01-28
Various stability fixes, chatbot improvements, and UI refinements.

---

## [3.0.0] - 2026-01-26 🚀 Enterprise Architecture
### Added
- TanStack Query migration
- Optimistic UI for schedules
- View Transitions
- Zod Schemas for validation

---

## [2.8.x] - 2026-01-26
- Detailed Weekly Schedule with Livechat section
- Today highlight in Fixed Schedule
- Availability color coding (Teal/Blue/Orange)
- Data Cleanup Tool

---

## [2.7.x] - 2026-01-26
- Daily Allocation UI improvements
- Smart Filters
- Color-coded employee rows

---

## [2.6.x] - 2026-01-26
- Shift Swap Feature (Full marketplace)
- Swap Reporting with Excel export
- Security Rules update

---

## [2.5.x] - 2026-01-25
- Complete Architecture Refactor
- Modular component decomposition
- Camera "Copy as Image" feature
- Security hardening (Active/Inactive filter)

---

## [2.4.x] - 2026-01-25
- Sidebar refactor
- Compact views for Admin/Reports

---

## [2.3.0] - 2026-01-24 🚀 Architecture Overhaul
- React Router migration
- DataContext implementation
- Date Range filtered subscriptions

---

## [2.2.x] - 2026-01-24
- Weekly View
- Advanced Audit Logs

---

## [2.1.0] - 2026-01-23
- Background Sync
- QUOTA_EXCEEDED handler

---

## [1.8.0] - 2026-01-23
- Service Layer pattern

---

*For implementation details, see [CONTINUITY.md](./CONTINUITY.md).*
