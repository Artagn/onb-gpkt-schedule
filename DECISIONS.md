# Architectural Decisions Log (ADR)

> **Mục đích:** Ghi lại các quyết định kỹ thuật quan trọng, lý do lựa chọn và bối cảnh để đảm bảo tính nhất quán của dự án theo thời gian.
> **Trạng thái:** Được tổng hợp từ OVERVIEW.md và CONTINUITY.md (v3.20.0).

---

## 1. State Management: TanStack Query & Context
- **Vấn đề:** Việc truyền props (prop drilling) quá sâu và fetch dữ liệu trùng lặp (double fetching) khi chỉ dùng React Context thuần túy.
- **Quyết định:** Sử dụng **TanStack Query v5** để quản lý Server State, kết hợp với React Context cho Client State cục bộ.
- **Lý do:**
    - Caching tự động, deduping requests.
    - Hỗ trợ Optimistic Updates cho trải nghiệm người dùng mượt mà.
    - Giảm 60% độ phức tạp của code so với việc tự quản lý useEffect.

## 2. Component Architecture: Feature-based Modules
- **Vấn đề:** Các component cũ quá lớn (God components, 400-700 dòng), khó bảo trì và tái sử dụng.
- **Quyết định:** Chuyển sang cấu trúc thư mục theo tính năng (Feature-based).
    - Mỗi feature là một thư mục (e.g., `components/MyTasks/`).
    - Có `index.tsx` làm entry point và các hooks riêng (`useMyTasks.ts`).
- **Lý do:** Tuân thủ nguyên tắc Single Responsibility, dễ dàng testing và isolation.

## 3. Deployment: Progressive Web App (PWA)
- **Vấn đề:** Nhân viên cần xem lịch khi offline hoặc mạng yếu, và cần trải nghiệm giống app native trên mobile.
- **Quyết định:** Triển khai dưới dạng PWA với Service Worker (Workbox).
- **Lý do:**
    - Không cần duyệt qua Apple/Google Store.
    - Cập nhật tức thì (Instant updates).
    - Hỗ trợ caching offline (giới hạn 3MB).

## 4. Business Logic: Scoring Engine cho Auto-Schedule
- **Vấn đề:** Việc xếp lịch thủ công tốn 2-3h/tuần và dễ gây tranh cãi về sự công bằng.
- **Quyết định:** Xây dựng Engine chấm điểm tự động với 8 tiêu chí (KPI, cân bằng ngày nghỉ, đa dạng công việc...).
- **Lý do:** Đảm bảo sự công bằng (fairness) khách quan, nhưng vẫn cho phép con người can thiệp (Human override) qua chế độ Preview.

## 5. Data Integrity: Hybrid Leave Model (Mô hình nghỉ phép lai)
- **Vấn đề:** Sự khác biệt nghiệp vụ giữa nghỉ bù Ca Tối (cụ thể ngày hôm sau) và nghỉ bù T7/CN/Lễ (tích lũy).
- **Quyết định:**
    - **Ticket-based:** Cho Ca Tối (Tạo `JOB_NGHI_BU` cụ thể).
    - **Balance-based:** Cho T7/CN/Lễ (Tích điểm vào ví `leave_balances` qua Cloud Function).
- **Lý do:** Cần validation chặt chẽ từ phía server (Cloud Function) để tránh gian lận hoặc sai sót khi tính toán tích lũy.

## 6. Performance: Optimized Read Window (v3.13.0)
- **Vấn đề:** Chi phí Firebase Reads vẫn cao nếu load 3 tháng dữ liệu, cần thu hẹp tối đa mà vẫn đảm bảo nhu cầu sử dụng.
- **Quyết định:** Giới hạn phạm vi load dữ liệu (Schedule/Leaves/Allocations) trong khoảng: **Đầu tháng trước đến Hiện tại + 3 tuần sau**.
- **Lý do:**
    - Giảm thêm ~40% chi phí đọc so với cửa sổ 3 tháng cũ.
    - Cải thiện tốc độ phản hồi của ứng dụng.
    - Duy trì khả năng xem lịch sử gần và kế hoạch sắp tới.

## 7. Security: Entity Context Pattern cho Đánh giá (Evaluations)
- **Vấn đề:** Rủi ro hiển thị sai dữ liệu khi Coordinator xem đánh giá của nhân viên khác.
- **Quyết định:** Tách biệt rõ `currentEmployee` (người đăng nhập) và `targetEmployee` (người được xem).
- **Lý do:** Đảm bảo data fetching luôn query theo ID của `targetEmployee` khi ở trong chế độ ReviewManager.
## 8. Feature: Removing AI Chatbot (v3.13.0)
- **Vấn đề:** Tính năng AI Chatbot (Gemini) tiêu tốn tài nguyên bảo trì và đọc Firestore nhưng không còn được sử dụng thường xuyên.
- **Quyết định:** Gỡ bỏ hoàn toàn Chatbot khỏi frontend và Cloud Functions.
- **Lý do:** Giảm độ phức tạp của codebase và tiết kiệm chi phí vận hành (Firestore reads/Gemini API).

## 9. Evaluation: Thay đổi Mô hình Tính Điểm Livechat (v3.19.0)
- **Vấn đề:** Logic cấu hình độ khó (Dễ/TB/Khó) bằng tay ở Module Đánh giá tháng phức tạp và không phản ánh chuẩn xác năng suất làm việc thực tế do tính chất định tính.
- **Quyết định:** Chuyển sang tính năng "Năng suất Performance" điền trực tiếp sản lượng. Tỷ lệ hoàn thành được tính bằng `Thực hiện / Tổng số lượng yêu cầu`. Điểm KPI = Điểm cố định × Tỷ lệ hoàn thành.
- **Lý do:** Đơn giản hóa quá trình đánh giá, định lượng rõ ràng minh bạch năng suất làm việc của nhân viên thay vì cảm tính. Giao diện trở thành dạng editable trực tiếp. Giảm load logic quản lý Master Configuration.

## 10. UI: Tailwind CSS via CDN (Lưu ý quan trọng)
- **Hiện trạng:** Dự án sử dụng Tailwind CSS qua CDN runtime (`<script src="https://cdn.tailwindcss.com">`), KHÔNG cài đặt local (không có `tailwindcss` trong `package.json` hay `tailwind.config.js`).
- **Hệ quả:** Directives `@tailwind base/components/utilities` trong `index.css` được xử lý bởi CDN script tại runtime, KHÔNG phải bởi Vite/PostCSS tại build time.
- **⚠️ Lưu ý:** KHÔNG ĐƯỢC xóa dòng CDN script khỏi `index.html` — sẽ phá vỡ toàn bộ styling. Nếu muốn migrate sang local Tailwind, cần cài `tailwindcss` + `postcss` + `autoprefixer` và tạo config files trước.

## 11. Typography: Inter Font (v3.19.3)
- **Vấn đề:** App dùng font mặc định trình duyệt, thiếu tính chuyên nghiệp cho enterprise PWA.
- **Quyết định:** Thêm Google Font **Inter** (400-700) với `font-smoothing` và `tabular-nums` cho bảng số liệu KPI.
- **Lý do:** Inter được thiết kế cho UI, tối ưu readability ở kích thước nhỏ (10-14px) phổ biến trong app. Feature `tabular-nums` giúp các cột số trong bảng KPI thẳng hàng.

## 12. Data Model: Dynamic Job Groups thay thế Static Enum (v3.19.5)
- **Vấn đề:** `JobGroup` enum cũ (hardcode `Đào tạo`, `Livechat`, `Chia hàng ngày`, `Khác`) bị xóa khỏi `types.ts` khi chuyển sang `JobGroupDef` interface (dynamic từ Firestore), nhưng 17 file vẫn import enum cũ → build thất bại.
- **Quyết định:**
    - Xóa tất cả `import { JobGroup }` references.
    - Thay `JobGroup.Training` → `'Đào tạo'` (string literal), `JobGroup.Livechat` → `'Livechat'`.
    - Thay `Object.values(JobGroup)` → `jobGroups.map(g => g.name)` hoặc `Array.from(new Set(jobs.map(j => j.group)))` (dynamic từ data).
    - Filter dropdowns (Dashboard, Reports) lấy danh sách nhóm từ `DataContext.jobGroups` thay vì enum.
- **Lý do:** Job Groups cần quản lý động từ UI (Admin có thể thêm/sửa/xóa nhóm qua JobManager). Hardcode enum vi phạm nguyên tắc Open-Closed và gây maintenance burden khi business thay đổi cấu trúc nhóm việc.
- **Impact:** 17 files across Dashboard, Employees, MyTasks, Evaluation, Reports, JobManager, DailyViewTab, googleSheets.

## 13. Performance: Extended Date Range Window (v3.19.4)
- **Vấn đề:** Lịch phân công từ đầu tháng trước (01/04) không còn hiển thị khi xem vào ngày 05/05 do cửa sổ fetch chỉ bắt đầu từ `startOfMonth(subMonths(now, 1))`.
- **Quyết định:** Mở rộng thêm **±10 ngày** ở cả hai đầu của cửa sổ fetch dữ liệu.
    - **Start:** `startOfMonth(lastMonth) - 10 days` (≈ 22/03 khi ở tháng 05)
    - **End:** `currentDate + 3 weeks + 10 days` (≈ 05/06)
- **Lý do:** Đảm bảo dữ liệu lịch sử gần luôn hiển thị đầy đủ mà không tăng đáng kể chi phí Firestore reads (thêm ~20 ngày trong tổng ~75 ngày window).

## 14. Hotfix: Classification Restoration & Hook Safety (v3.19.6)
- **Vấn đề (Crash):** `JobManager/index.tsx` gọi `useJobManager()` **4 lần** trong cùng component (1 lần destructure + 3 lần inline trong JSX). Khi user switch tab, React phát hiện số hooks thay đổi → crash Error #300.
- **Vấn đề (Dữ liệu):** Trường `classification` bị xóa khỏi `Job` interface và Zod `JobSchema` trong lần refactor v3.19.5 (Dynamic JobGroup Migration). Zod `safeParse` tự strip field khi load từ Firestore → mất dữ liệu phân loại → điểm đào tạo = 0.
- **Vấn đề (Permission):** Collection `jobGroups` chưa có entry trong `firestore.rules` → lỗi `Missing or insufficient permissions` khi query.
- **Quyết định:**
    - Fix hook: Gộp về 1 `useJobManager()` call duy nhất, destructure `jobGroups` từ kết quả.
    - Restore `classification?: 'Nghiệp vụ' | 'Lĩnh vực' | 'Nội bộ' | 'Trực tiếp'` vào cả `Job` interface và `JobSchema`.
    - Thêm dropdown "Phân loại" vào `JobEditModal` (conditional khi group = 'Đào tạo').
    - Thêm Firestore rules cho `jobGroups` collection + default fallback trong `useJobGroupsQuery`.
- **Lý do:** Custom hooks KHÔNG ĐƯỢC gọi inline trong JSX — vi phạm Rules of Hooks. Zod schema phải mirror chính xác Firestore document structure để tránh silent data loss.

## 15. Security & Cost Optimization: Public Share Data Strategy (v3.20.0)
- **Vấn đề:** Muốn cho khách hàng (không có tài khoản) xem lịch Đào tạo, nhưng `firestore.rules` đang block read access để bảo mật. Mở rules sẽ tạo lỗ hổng rò rỉ toàn bộ database. Nếu nhiều KH truy cập, Firebase reads sẽ tăng vọt gây tốn kém.
- **Quyết định:**
    - KHÔNG cấp quyền public ở Firestore.
    - Tạo `getPublicTrainingSchedule` HTTP Cloud Function đóng vai trò làm proxy an toàn (chỉ trả về `jobs` nhóm Đào tạo và `subJobs` đang active).
    - Đặt `Cache-Control: public, max-age=600, s-maxage=600` trên API response.
- **Lý do:** Cloud Function giúp giấu kín cấu trúc database và query logic, bảo đảm an toàn tuyệt đối 100%. Firebase CDN Cache sẽ bắt (intercept) mọi traffic và trả file cached cho các truy cập trong vòng 10 phút. Hàng vạn KH có thể mở link mỗi buổi sáng, nhưng hệ thống chỉ tính là 1 lượt gọi API và 0 Firestore reads (sau lượt gọi đầu). Giải quyết triệt để bài toán bảo mật lẫn chi phí.

## 16. Báo cáo Chăm sóc KH (Customer Care) cho nhóm ONB_KS (v3.21.0)
- **Vấn đề:** Cần một module chuyên biệt cho nhóm Kiểm soát (ONB_KS) để báo cáo công việc chăm sóc khách hàng hàng ngày và tuần, với các chiến dịch có thể thay đổi linh hoạt.
- **Quyết định:** 
    - Lưu trữ dữ liệu tách biệt trong 2 collection mới: `care_campaigns` (quản lý danh mục chiến dịch) và `care_reports` (lưu trữ báo cáo ngày).
    - Sử dụng ISO week ID (format `YYYY-Wxx`) làm khóa chính để query dữ liệu theo tuần nhanh chóng mà không cần tính toán range date phức tạp trên Firestore.
    - Cấp toàn quyền (Full Access) cho nhân viên thuộc nhóm `ONB_KS` trong riêng module này (tương đương Admin/Coordinator) để họ tự quản lý chiến dịch và xem báo cáo toàn phòng.
- **Lý do:** 
    - ISO week ID giúp tối ưu hóa việc query và gom nhóm dữ liệu trên NoSQL.
    - Việc trao quyền cho nhóm KS tự quản lý chiến dịch giúp giảm tải cho Admin hệ thống, đồng thời đảm bảo tính linh hoạt cho quy trình nghiệp vụ đặc thù của họ.

## 17. Chỉ tiêu động trong Báo cáo Chăm sóc KH (v3.22.0)
- **Vấn đề:** 4 chỉ tiêu lũy kế chung (Số cuộc gọi, Thời lượng, KH tiếp cận, Ultraview) bị fix cứng trong code, không thể thêm/sửa/xóa hoặc ngừng sử dụng theo nhu cầu thực tế.
- **Quyết định:**
    - Chuyển 4 chỉ tiêu cố định thành dữ liệu động trong collection `care_metrics`.
    - Cập nhật `CareReport` để lưu `dailyMetrics` dưới dạng map `[metricId: string]: number` thay vì các trường cố định.
    - Hỗ trợ fallback tự động đọc dữ liệu cũ (chuyển đổi từ `callCount` sang `call_count`, v.v.) để không làm mất dữ liệu lịch sử.
    - Gộp 2 tab "Chiến dịch" và "Chỉ tiêu" vào chung một tab "Cấu hình" (có menu con) để làm gọn giao diện.
- **Lý do:** Đảm bảo tính linh hoạt tối đa cho nghiệp vụ Chăm sóc KH. Việc hỗ trợ fallback giúp hệ thống hoạt động liên tục mà không cần migration dữ liệu cũ phức tạp.

## 18. UI/UX: Cải tiến Báo cáo Chăm sóc KH (v3.22.1 - v3.22.3)
- **Vấn đề:** Các bảng thống kê chiến dịch và nhân viên thiếu dòng/cột tổng hợp. Quản lý khó nắm bắt xu hướng (trend) và so sánh hiệu suất giữa các nhân viên hoặc với kỳ trước.
- **Quyết định:**
    - Thêm dòng **Σ Tổng cộng** và cột **% HT**.
    - **v3.22.3:** Triển khai Summary Cards cho mọi view mode, tích hợp trend indicators (delta %), mở rộng Employee Breakdown cho view Ngày, và tự động xếp hạng (ranking) nhân viên.
- **Lý do:** Tăng khả năng quan sát (visibility) và hỗ trợ ra quyết định nhanh. Trend indicators giúp nhận diện sớm sự sụt giảm năng suất. Ranking tạo động lực cạnh tranh lành mạnh và giúp quản lý focus vào đúng đối tượng.
