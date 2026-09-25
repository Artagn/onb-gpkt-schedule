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

## 19. Tích hợp Link Tài liệu vào Hạng mục chi tiết (Sub-Jobs) (v3.22.5)
- **Vấn đề:** Nhân viên khi xem lịch cá nhân hoặc ca làm việc trên Dashboard cần truy cập nhanh vào tài liệu hướng dẫn nghiệp vụ tương ứng của hạng mục đó (tương tự như link phòng họp Meet).
- **Quyết định:**
    - Bổ sung trường `documentLink` (optional string, mặc định là rỗng) vào cấu trúc dữ liệu `SubJob`.
    - Thêm ô nhập liệu "Link Tài liệu" trên giao diện quản lý hạng mục và hiển thị cột tương ứng trong bảng cấu hình Sub-Jobs.
    - Cập nhật định dạng Excel Import mẫu (cột thứ 10) để hỗ trợ import hàng loạt link tài liệu.
    - Hiển thị nút **Link tài liệu** (emerald theme) trên Lịch cá nhân (`FixedScheduleList`), Dashboard (`ScheduleCard`), và modal chi tiết ca làm việc (`SubJobDetailModal`).
    - **Không** trả về trường này trong API chia sẻ lịch công khai dành cho Khách hàng (`getPublicTrainingSchedule`).
- **Lý do:** Giúp nhân viên chủ động tiếp cận tài liệu hướng dẫn trực tiếp từ lịch làm việc của mình, tối ưu hóa quy trình làm việc. Việc ẩn link tài liệu ở API public nhằm đảm bảo an toàn bảo mật thông tin nội bộ của MISA/ONB đối với khách hàng bên ngoài.

## 20. Migrate Tailwind CSS sang Local Build-time (v3.22.5)
- **Vấn đề:** Sử dụng Tailwind CDN runtime tải file `public/tailwindcss.js` (407KB) gây nặng bundle tải, compile CSS ở runtime làm lag CPU và tạo hiện tượng nhấp nháy FOUC khi load trang, mâu thuẫn trực tiếp với mục tiêu PWA offline-first.
- **Quyết định:**
    - Cài đặt `tailwindcss@3`, `postcss`, và `autoprefixer` làm devDependencies cục bộ.
    - Thiết lập file cấu hình `tailwind.config.js` quét toàn bộ thư mục components ở root và `postcss.config.js`.
    - Xóa file runtime `public/tailwindcss.js` và script liên kết trong `index.html`.
- **Lý do:** Đưa quá trình biên dịch CSS về build-time, nén và tự động purge sạch các class thừa $\rightarrow$ CSS bundle siêu gọn chỉ còn 78.85KB (gzip 12.02KB). Tiết kiệm hơn 330KB JS tải về, triệt tiêu FOUC, tối ưu hiệu năng PWA offline mượt mà.

## 21. React 19 Context Splitting & Re-render Optimization (v4.0.0)
- **Vấn đề:** Thay đổi lịch/leave real-time trong God Context `DataContext` gây ra cascade re-renders trên toàn bộ khung layout chính (Sidebar, BottomNav) và các trang cấu hình tĩnh, làm giảm nghiêm trọng tính mượt mà của giao diện.
- **Quyết định:**
    - Phân tách God Context thành **4 Context độc lập** chuyên biệt: `ConfigContext`, `RealtimeContext`, `SyncContext`, và `SessionContext`.
    - Di chuyển auth listener `onAuthStateChanged` trực tiếp vào Provider để gộp chung nguồn cấp dữ liệu login.
    - Cập nhật các component Layout tiêu dùng hooks chuyên biệt (`useSession()`, `useSyncStatus()`, v.v.) thay vì hook gộp `useData()`.
- **Lý do:** Cách ly hoàn toàn re-render rò rỉ khi nhận Firestore updates. Lịch cập nhật real-time chỉ phân phối về các bảng phân phối ca trực, đưa re-render tại thanh điều hướng và menu chính về con số 0 tuyệt đối.

## 22. Firestore Service & Bulk Sync Optimizations (v4.0.0)
- **Vấn đề:**
    1. Auto-schedule Apply ghi đè toàn bộ lịch sử lịch trực (`~1200` items) về Firestore trên mỗi lần chạy gây cạn kiệt free writes quota và mất tính nguyên tử (atomicity) do parallel chunking `Promise.all` khi có batch lỗi.
    2. Real-time stream Zod parsing `safeParse` chạy lại toàn bộ mảng tài liệu trên mỗi update làm block main thread trên mobile.
    3. Firebase Hosting CDN cache bị bỏ qua hoàn toàn do frontend gọi trực tiếp URL GCF.
    4. Factory Reset bỏ sót 3 collections quan trọng.
- **Quyết định:**
    - **Diff 3 chiều client-side:** Chỉ tính toán lưu các bản ghi mới/sửa đổi (`toUpsert`) và xóa bản ghi rác lệch tuần (`toDelete`), giúp giảm >95% lượng Firestore writes và gộp trọn vẹn trong 1 batch nguyên tử (< 500).
    - **Sequential Chunking Fallback:** Chuyển `saveCollection` và `deleteBatch` sang chạy batch tuần tự (`for-of` loop await) để đảm bảo fail-fast kiểm soát lỗi.
    - **Zod parsedCache & docChanges:** Dùng `snapshot.docChanges()` để chỉ validate Zod tài liệu thay đổi, map trả dữ liệu đầy đủ tốc độ $O(1)$.
    - **Hosting CDN Rewrite:** Khai báo rewrite trong `firebase.json` và gọi API tương đối từ frontend để kích hoạt CDN thực tế.
    - **Factory Reset Expansion:** Bổ sung `leave_balances`, `swapRequests`, và `jobGroups` vào `wipeAllCollections`.
- **Lý do:** Tối ưu hóa triệt để chi phí Firestore reads/writes, tăng tốc độ xử lý client-side lên $O(1)$, và bảo vệ tuyệt đối tính nguyên tử dữ liệu.

## 23. Cloud Function approveSwapRequest & Secure firestore.rules RBAC Overhaul (v4.1.0)
- **Vấn đề:**
    1. Firestore Rules mở toang `allow write: if isAuthenticated()`, tạo ra lỗ hổng bảo mật P0 lớn.
    2. Giao dịch đổi ca (Shift Swap Marketplace) chạy hoàn toàn ở phía client, dẫn đến nguy cơ xung đột dữ liệu (race condition) và lỗi phân quyền.
    3. Định dạng ngày bất nhất (lúc ghi `.toISOString()`, lúc ghi `'yyyy-MM-dd'`) khiến thuật toán Smart Swap hoạt động bất nhất, trả về 0 kết quả một cách âm thầm (silent failure).
- **Quyết định:**
    - **Siết chặt Rules RBAC:** Sử dụng collection `/user_roles` làm bảng tra cứu trung gian (lowercased email làm Document ID) để gán vai trò (`employeeId`, `role`). Siết Rules chặt chẽ cho tất cả các collections.
    - **Thiết lập Super Admin Bypass:** Hardcode cơ chế short-circuit `isSuperAdmin() || (...)` tại Rules. Khi Super Admin `khainguyendang@gmail.com` truy cập, Rules sẽ ngắt sớm và bỏ qua truy vấn cơ sở dữ liệu `getUserRole()`, tránh bị lock out hoàn toàn nếu mapping rỗng hoặc bị lỗi.
    - **Server-Side Transaction Swap:** Di chuyển toàn bộ logic hoán đổi ca trực lên HTTPS Callable Cloud Function `approveSwapRequest` chạy trong transaction an toàn, phân quyền đồng nhất bằng cách tra cứu `/user_roles`.
    - **Chuẩn hóa định dạng ngày:** Thay thế toàn bộ `.toISOString()` ở phía frontend thành `'yyyy-MM-dd'` để đảm bảo 100% tính nhất quán.
    - **Idempotent Migration Panel:** Tạo Cloud Function `runDataMigration` (được bảo vệ chỉ cho Super Admin gọi, timeout 540 giây) để đồng bộ hóa tài khoản hàng loạt và chuyển đổi các ngày ISO cũ sang định dạng mới. Tích hợp nút bấm trong Cleanup Manager.
- **Lý do:** Đóng hoàn toàn lỗ hổng bảo mật P0, đảm bảo tính nguyên tử tuyệt đối cho các giao dịch hoán đổi lịch trực, và loại bỏ triệt để lỗi logic so sánh ngày.

## 24. React Rules of Hooks & Dependency Optimizations (v4.4.6)
- **Vấn đề:** 
    1. Hàm `useCountUp` trong `StatCard.tsx` được gọi sau điều kiện ternary, vi phạm nghiêm trọng Rules of Hooks của React (gây crash nếu thuộc tính thay đổi động).
    2. Hàm helper `getSubJobs` trong Dashboard được khởi tạo lại ở mỗi render do phụ thuộc vào đối tượng `now` Date cập nhật liên tục theo từng phút, làm mất hiệu năng cache `useMemo` của `categorizedSchedule`.
- **Quyết định:**
    - **Gọi Unconditional Hook:** Chuyển `useCountUp` lên gọi vô điều kiện ở mức top-level của StatCard, sau đó áp dụng ternary gán giá trị sau.
    - **Tách Biến Primitive cho Dependency:** Trích xuất `now.getDay()` thành biến nguyên thủy `currentDayOfWeek` và gán làm dependency duy nhất của `getSubJobs`.
- **Lý do:** Đảm bảo tuân thủ 100% đặc tả kỹ thuật của React Hooks và triệt tiêu hoàn toàn re-render/re-compute thừa thãi theo phút của Dashboard.

## 25. Timezone Solidification, Atomic Rollbacks & O(1) busyMap Set (v4.4.7)
- **Vấn đề:**
    1. Lỗi dịch múi giờ P0 do sử dụng `new Date(yyyy-MM-dd)` (UTC midnight) trong vòng lặp so sánh tuần (`isSameWeek`) và ngày khiến toDelete/clearWeek chọn sai ngày hoặc xóa nhầm/sót lịch ở biên Thứ Hai/Chủ Nhật.
    2. `applySchedule` chạy `Promise.all` song song giữa xóa và ghi mới, đồng thời cập nhật cache TanStack Query trước khi DB hoàn tất. Nếu ghi lỗi hoặc timeout, cache sẽ hiển thị lịch ảo lệch DB, hoặc tệ hơn, tuần trực bị xóa trắng hoàn toàn.
    3. Bộ lọc bận `checkBusy` trong DailyAllocation lặp quét mảng $O(N \times (S+L))$ liên tục gây nghẽn CPU trên mobile.
- **Quyết định:**
    - **Chuẩn hóa parseISO:** Thay thế 10+ vị trí parse ngày-tháng sang `parseISO` địa phương.
    - **Sequentially Atomic Writes (Upsert-first):** Thiết lập tiến trình ghi tuần tự: Ghi lịch mới (`saveAll`) thành công mới tiến hành dọn lịch cũ (`deleteBatch`).
    - **Selective Cache Rollback:** Nếu ghi thất bại, tự động khôi phục cache về trạng thái snapshot cũ. Nếu ghi mới thành công nhưng dọn lịch cũ lỗi, giữ nguyên cache và kích hoạt Toast yêu cầu tải lại để real-time listener tự động stream hợp nhất mới+cũ.
    - **Gộp SaveAll cho pasteCell:** Thay vì lặp ghi đơn lẻ, gộp toàn bộ ca paste và ca nghỉ bù tự sinh vào 1 batch ghi duy nhất (`saveAll`).
    - **Set-based busyMap O(1):** So khớp chuỗi `'yyyy-MM-dd'` trực tiếp và lưu các cặp `empId_shift` bận vào một `Set` duy nhất qua `useMemo`, đưa tốc độ kiểm tra bận về $O(1)$.
- **Lý do:** Bảo vệ tuyệt đối tính nguyên thủy và an toàn dữ liệu, chống thất thoát hoặc trống lịch, và tối ưu hóa hiệu năng tối đa cho phân hệ Điều phối.

## 26. UX Route Protection, Validated Excel Batch Imports & Unbiased Timezones (v4.4.8)
- **Vấn đề:**
    1. Rò rỉ route ở mức UX khi Staff gõ trực tiếp URL `/config` hoặc `/admin` vì các route này chưa được bảo vệ ở cấp độ React Router, dẫn đến việc load các component/chunk nhạy cảm trước khi kiểm tra quyền truy cập.
    2. Import Excel nhân sự ghi N+1 writes bằng `Promise.all` từng document riêng lẻ, không có tính giao dịch (nếu lỗi giữa chừng sẽ bị import một phần bẩn). Đồng thời email không lowercase tạo ra casing discrepancy gây lỗi map RBAC trong `user_roles`. Dữ liệu dòng Excel không được validate đầu vào dẫn đến ghi data bẩn vào Firestore.
    3. Lệch ngày hiển thị ở GMT-8 tại CleanupManager và ScheduleExportTool do sử dụng `new Date(item.date)`.
- **Quyết định:**
    - **Route-level Guard:** Bọc `/config` và `/admin` tại `App.tsx` bằng bộ kiểm tra vai trò người dùng động (`Role.Admin` và `Role.Coordinator`) và redirect về trang chủ (`<Navigate to={ROUTES.DASHBOARD} replace />`).
    - **Import Excel Atomic Batch:** Thay thế `Promise.all` bằng `employeesService.saveAll` (Firestore writeBatch sequential chunked).
    - **Validate từng dòng + lowercase email:** Toàn bộ dữ liệu email của nhân viên import qua Excel được lowercase và trim. Chạy `validateEmployee` cho từng dòng trước khi tiến hành batch ghi. Nếu phát hiện bất kỳ dòng nào lỗi, hủy toàn bộ tiến trình ghi (atomic rollback) và xuất Toast báo lỗi chi tiết theo số dòng Excel.
    - **parseISO & localeCompare:** Thay thế hiển thị ngày bằng `parseISO` địa phương và tối ưu hóa việc sắp xếp ca trực bằng so sánh chuỗi trực tiếp (`localeCompare`), loại bỏ `new Date` anti-pattern.
- **Lý do:** Tăng cường an toàn bảo mật route-level, bảo vệ chất lượng dữ liệu sạch trên Firestore, tránh xung đột casing RBAC, và hiển thị nhất quán đa múi giờ.

## 27. Fix Reactivity Cache Wiping during Manual Coordination (v4.4.9)
- **Vấn đề:** Khi gán lịch thủ công hoặc duyệt phép, màn hình biến mất toàn bộ lịch phân công và đơn nghỉ của tất cả mọi người, chỉ khôi phục sau khi bấm Ctrl + F5. Đây là do mutation gọi `invalidateQueries` cho `SCHEDULE_KEYS.all` và `LEAVE_KEYS.all`, kích hoạt `queryFn` rỗng (trả về `[]` vì dữ liệu được stream qua `onSnapshot`). Việc giải quyết `queryFn` về `[]` tạm thời ghi đè cache đang hoạt động.
- **Quyết định:** Triển khai **Option 1 (Hướng A + B)**:
    - **Hướng A**: Thay đổi `queryFn` trong 3 hook real-time (`useSchedulesRealtimeQuery`, `useLeavesRealtimeQuery`, `useAllocationsRealtimeQuery`) để trả về dữ liệu cache hiện tại (`queryClient.getQueryData(queryKey) || []`) thay vì `[]`, tạo lưới an toàn toàn cục. Vẫn giữ logic throw `snapshotError` ở đầu để không nuốt lỗi.
    - **Hướng B**: Loại bỏ hoàn toàn các dòng `invalidateQueries` cho `SCHEDULE` và `LEAVE` tại các handler gán/xóa thủ công trong `Modals.tsx` và `useFixedSchedule.ts` để tránh refetch chu kỳ thừa (Firestore `onSnapshot` đã tự động đồng bộ hóa các thay đổi).
    - **Giữ lại**: Giữ nguyên `invalidateQueries` cho các key non-real-time như `LEAVE_BALANCE_KEYS` và `LEAVE_BALANCE_HISTORY_KEYS` vì các chỉ tiêu này được tính toán bất đồng bộ qua Cloud Function và cần refetch chủ động.
- **Lý do:** Khắc phục triệt để lỗi mất dữ liệu tức thời khi điều phối thủ công, tối ưu hóa lưu lượng mạng bằng cách loại bỏ các refetch thừa, và bảo toàn hoạt động chính xác của Cloud Functions cập nhật ví nghỉ phép.

## 28. Daily Allocation Multi-Batch Rollover Support (v4.4.10)
- **Vấn đề:** Trong phân hệ Phân công hàng ngày (DailyAllocation), khi Coordinator chia việc xong bấm Lưu thay đổi, ô nhập liệu cột "Chia mới" (`newAssigned`) vẫn giữ nguyên giá trị cũ mà không reset về 0, làm kẹt số và không thể nhập đợt mới từ đầu. Thêm vào đó, công thức tính Tồn (`calculatePending`) bỏ qua hoàn toàn số đã chia từ các đợt trước (`assigned`).
- **Quyết định:**
    - **Rollover khi lưu:** Khi lưu phân công, tự động cộng dồn `newAssigned` vào `assigned` và đặt `newAssigned = 0`.
    - **Optimistic Sync & Rollback:** Trong `handleSave`, cập nhật local state và xóa `dirtyIds` đồng bộ ngay lập tức để tắt nút lưu và tránh double-click. Chụp lại snapshot trước khi ghi DB; nếu ghi lỗi thì tự động rollback về state trước đó và mở lại trạng thái sửa.
    - **UI Indicators:** Wrap cột "Chia mới" trong `index.tsx` và thêm nhãn nhỏ `Đã chia: X` bên dưới ô input và summary cell để Coordinator theo dõi số lượng đã phân công trước đó.
    - **Sửa công thức Tồn:** Đổi công thức thành `Tồn = (Đã chia + Chia mới) - (HT + Trả KD + Trả TP)` giúp phản ánh đúng số liệu thực tế do `completed` và `returned` là dữ liệu tích lũy chạy liên tục trong ngày.
    - **DB Batch Write & Invalidation Cleanup:** Sử dụng `allocationsService.saveAll` thay cho vòng lặp lưu lẻ tẻ, đồng thời xóa lệnh `invalidateQueries` thừa vì dữ liệu real-time qua `onSnapshot`.
- **Lý do:** Khắc phục lỗi kẹt ô nhập liệu khi chia nhiều đợt trong ngày, tăng tính nguyên tử dữ liệu, tối ưu hóa tốc độ ghi và đồng bộ hóa cache chính xác.

## 29. Public Share Routing Fix (v4.4.11)
- **Vấn đề:** Trang share link cho khách hàng truy cập `/shared/training` bị báo lỗi "Không thể tải dữ liệu lịch. Vui lòng thử lại sau" và console log xuất hiện `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`. Nguyên nhân là Firebase Hosting rewrite rule cho `/api/public-schedule` sử dụng sai khóa `"id"` thay vì `"functionId"` bên trong object `"function"`. Hosting không khớp được quy tắc này nên fall back về rewrite rule mặc định `"**" -> "/index.html"`, trả về mã HTML thay vì gọi Cloud Function.
- **Quyết định:** Sửa `"id"` thành `"functionId"` trong file `firebase.json` cho cấu hình rewrite của function `getPublicTrainingSchedule` tại region `asia-southeast1`.
- **Lý do:** Đảm bảo Firebase Hosting định tuyến chính xác request `/api/public-schedule` tới Cloud Function vùng `asia-southeast1`, trả về JSON data hợp lệ thay vì trang HTML.

## 30. API Cache Busting with Version Parameter (v4.4.12)
- **Vấn đề:** Mặc dù Hosting rewrite rule đã được sửa ở v4.4.11 và API live đã hoạt động đúng, nhưng trình duyệt của một số người dùng vẫn tải bản ghi cache lỗi trước đó của URL `/api/public-schedule` (trả về trang HTML fallback `/index.html`), dẫn đến lỗi `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`.
- **Quyết định:** Bổ sung tham số phiên bản tĩnh vào URL gọi API tại frontend thành `/api/public-schedule?v=4.4.12`.
- **Lý do:** Tham số tĩnh `?v=4.4.12` đóng vai trò là cache-buster đối với các yêu cầu đã cache cũ ở phía trình duyệt và CDN edge, giải quyết triệt để lỗi cache bẩn mà không làm mất đi khả năng tối ưu hóa CDN caching cho toàn bộ người dùng đang sử dụng phiên bản mới này.

## 31. Split Public Daily Time Column (v4.4.13)
- **Vấn đề:** Trong giao diện Lịch Đào Tạo Hàng Ngày của Khách hàng, tỷ lệ hiển thị giữa các cột (Tên lớp, Buổi, Thời gian, Link) chưa thực sự cân đối. Cột Thời gian hiển thị gộp `HH:MM - HH:MM` chiếm diện tích nhưng tỷ lệ bố cục chưa đẹp.
- **Quyết định:** Tách cột "Thời gian" thành hai cột riêng biệt "Bắt đầu" và "Kết thúc" trong `PublicDailySchedule.tsx`. Nâng cấp phiên bản cache buster tương ứng lên `?v=4.4.13`.
- **Lý do:** Tối ưu hóa UI/UX, giúp bảng lịch trực quan, cân đối và dễ đọc hơn đối với Khách hàng xem lịch đào tạo hàng ngày. Bump cache buster để trình duyệt áp dụng layout mới ngay lập tức.

## 32. Optimize Column Width Proportions (v4.4.14)
- **Vấn đề:** Sau khi tách cột thời gian ở v4.4.13, tỷ lệ hiển thị giữa các cột (Tên lớp, Buổi, Bắt đầu, Kết thúc, Link) vẫn chưa thực sự cân đối. Cột Tên lớp cần chiếm 50% diện tích chiều rộng bảng để thông tin tên lớp hiển thị đầy đủ và đẹp mắt hơn.
- **Quyết định:** Thiết lập thuộc tính chiều rộng cột chi tiết trong `PublicDailySchedule.tsx` theo tỷ lệ: Tên lớp (50%), Buổi (10%), Bắt đầu (12%), Kết thúc (12%), và Link (16%). Nâng cấp tham số cache buster tương ứng lên `?v=4.4.14`.
- **Lý do:** Đảm bảo bố cục hiển thị cột cân đối, chuyên nghiệp và tối ưu hóa tối đa diện tích bảng cho thông tin Tên lớp. Bump cache buster để trình duyệt cập nhật layout mới tức thì.

## 33. Fix Firestore Update Permission for Staff (v4.4.15)
- **Vấn đề:** Khi nhân viên bấm "Hoàn thành công việc" hoặc lưu tiến độ, hệ thống báo lỗi `FirebaseError: Missing or insufficient permissions`. Nguyên nhân là do client-side schema (Zod) tự động chèn các giá trị mặc định cho các trường tùy chọn/read-only (như `id`, `isFixed`, `requiredCount`, `coefficient`). Khi gửi cập nhật, Firestore rules coi các trường này là các trường bị thay đổi/thêm mới (affected keys) và chặn cập nhật vì chúng không nằm trong danh sách các trường được phép thay đổi.
- **Quyết định:** Cập nhật `firestore.rules` để cho phép `id`, `isFixed`, `requiredCount`, và `coefficient` có trong danh sách `affectedKeys()` đối với cập nhật Schedule và Allocation từ phía nhân viên. Tuy nhiên, bổ sung các điều kiện kiểm tra nghiêm ngặt: nếu các trường này đã tồn tại trong database, giá trị cập nhật gửi lên bắt buộc phải trùng khớp với giá trị cũ (`request.resource.data.coefficient == resource.data.coefficient`, v.v.), đảm bảo nhân viên không thể thay đổi giá trị của chúng.
- **Lý do:** Sửa dứt điểm lỗi chặn quyền viết khi nhân viên hoàn thành công việc hoặc lưu tiến độ mà không hạ thấp tính bảo mật của hệ thống.

## 34. Shared Allocation Merge Utility, Staff Save Hardening & Firestore Allocation Guards (v4.4.16)
- **Vấn đề:** 
    1. Logic gộp allocations (lịch phân công) giữa dữ liệu real-time Firestore và local state bị lặp lại hoàn toàn (~60 dòng code) ở cả `useDailyAllocation.ts` (Coordinator) và `useMyTasks.ts` (Staff). Việc lặp này dễ gây lệch logic và bất nhất khi bảo trì.
    2. Hàm lưu tiến độ của Staff (`handleSaveProgress` trong `useMyTasks.ts`) chạy lưu đơn lẻ từng document song song bằng `Promise.all` không có tính giao dịch, đồng thời không có rollback state khi gặp lỗi ghi DB.
    3. Việc sắp xếp trực tiếp trên mảng reactive `myDailyAllocations.sort(...)` trong `DailyTasksList.tsx` gây đột biến dữ liệu reactive (mutation side-effect), vi phạm nguyên tắc của React/TanStack Query.
    4. Firestore Rules ở phiên bản v4.4.15 cho phép Staff gửi lên payload có kèm một số trường nhưng chưa bảo vệ nghiêm ngặt các cột phân công của allocation như `assigned` và `newAssigned`. Staff có thể lợi dụng điều này để tự thay đổi lượng việc được giao.
- **Quyết định:**
    - **Trích xuất shared helper:** Tạo utility [allocationMerge.ts](file:///d:/ONB%20App/Calender/utils/allocationMerge.ts) chứa `deduplicateAllocations` và `mergeAllocationsWithLocal`, thay thế hoàn toàn code inline ở cả hai hook trên.
    - **Staff Batch Save & Snapshot Rollback:** Chuyển hàm lưu tiến độ của Staff sang dùng `writeBatch` thông qua `allocationsService.saveAll`, chụp snapshot local state trước khi mutate và tự động khôi phục (rollback) nếu thất bại.
    - **Sắp xếp an toàn:** Sử dụng cú pháp spread `[...myDailyAllocations].sort(...)` để clone mảng trước khi sắp xếp, loại bỏ đột biến dữ liệu.
    - **Siết Rules Allocation:** Bổ sung điều kiện kiểm tra equality `request.resource.data.assigned == resource.data.assigned` và tương tự với `newAssigned` đối với quyền cập nhật của Staff trong `firestore.rules`.
- **Lý do:** Tăng tính tái sử dụng code (DRY), đảm bảo tính nguyên tử (atomicity) khi nhân viên lưu tiến độ, tránh lỗi runtime do mutation side-effect, và bịt kín lỗ hổng bảo mật cho phép Staff tự ý sửa đổi số lượng phân công công việc.

## 35. Phân công hàng ngày: Cho phép sửa trực tiếp lũy kế đã chia (v4.4.17)
- **Vấn đề:** Giao diện phân công hàng ngày trước đây dùng cơ chế nhập số lượng "Chia mới" rồi bấm lưu để cộng dồn vào "Đã chia" và reset ô nhập về 0. Cơ chế này gây khó khăn khi người điều phối nhập nhầm (không thể giảm số lượng đã chia) và làm giao diện rườm rã vì có thêm dòng chữ "Đã chia: X" bên dưới ô nhập.
- **Quyết định:**
    - Loại bỏ dòng chữ "Đã chia: X" rác.
    - Cho phép điều phối viên chỉnh sửa trực tiếp số phân công lũy kế (`assigned`) ngay trong ô nhập liệu.
    - Khi bấm lưu, hệ thống sẽ lưu trực tiếp giá trị mới này lên Firestore, đồng thời đặt `newAssigned = 0`.
    - Tính toán gộp `assigned + newAssigned` trong logic báo cáo để giữ tính tương thích ngược cho dữ liệu lịch sử.
- **Lý do:** Giúp người điều phối dễ dàng sửa sai (tăng/giảm số lượng phân công tùy ý), đồng thời tinh gọn giao diện làm việc tối đa theo đúng yêu cầu trải nghiệm người dùng.

## 36. Sửa lỗi CORS duyệt Đổi ca trực (v4.4.18)
- **Vấn đề:** Khi nhân sự bấm duyệt đổi lịch, hệ thống báo lỗi CORS (`Preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present`) và cuộc gọi tới Cloud Function `approveSwapRequest` bị thất bại. Lỗi này do frontend gọi nhầm API endpoint mặc định tại vùng `us-central1` (`https://us-central1-onb-gpkt-schedule.cloudfunctions.net`), trong khi function này thực tế được deploy ở Singapore (`asia-southeast1`).
- **Quyết định:** Khởi tạo instance `functions` dùng chung ở client-side trong [firebaseConfig.ts](file:///d:/ONB%20App/Calender/services/firebaseConfig.ts) với tham số chỉ định cụ thể vùng `asia-southeast1`: `getFunctions(app, 'asia-southeast1')`.
- **Lý do:** Đảm bảo các cuộc gọi HTTPS Callable Cloud Function trỏ chính xác về vùng Singapore, giải quyết triệt để lỗi CORS do lệch vùng, cải thiện tốc độ phản hồi đáng kể nhờ máy chủ gần khu vực người dùng hơn.

## 37. Tích hợp Link Khảo sát Đào tạo rút gọn (v4.5.0)
- **Vấn đề:** Nhân viên đào tạo cần gửi link khảo sát điền sẵn Tên lớp + Ngày thông qua chat cho khách hàng. Link nguyên bản của Google Form quá dài, gửi qua chat mất thẩm mỹ và không tiện lợi. Cần tích hợp TinyURL API để tự động rút gọn link nhưng phải tối ưu số lượng gọi API (TinyURL có giới hạn) và tốc độ tải trang cho nhân viên.
- **Quyết định:**
    - Triển khai Cloud Function `batchSurveyShortLinks` để xử lý rút gọn server-side.
    - Thiết lập hệ thống cache 3 tầng: 
      1. Client cache bằng TanStack Query (24 giờ stale time) để hạn chế tối đa gọi network.
      2. Server cache bằng Firestore collection `surveyShortLinks` với định dạng ID `{date}_{normalizedClassName}` để dùng chung cho mọi nhân viên cùng phụ trách lớp đó trong ngày.
      3. Gọi TinyURL API chỉ khi cả 2 tầng cache trên đều bỏ lỡ (cache miss), giới hạn batch tối đa 50 lớp/lần.
    - Thay đổi UX nút "Khảo sát" trên UI: Click vào nút sẽ copy link khảo sát rút gọn trực tiếp vào clipboard kèm thông báo toast, thay vì mở tab mới để nhân viên tiện gửi chat luôn.
- **Lý do:** Đảm bảo link khảo sát ngắn gọn, chuyên nghiệp khi gửi cho khách hàng, tối ưu hóa chi phí API thông qua cơ chế cache thông minh dùng chung, và nâng cao trải nghiệm người dùng bằng cách giản lược thao tác copy link.

## 38. Bảo mật hoá Token TinyURL & Thu gọn phạm vi Survey Module (v4.5.0 hotfix)
- **Vấn đề:**
    1. Trong lúc phát triển `batchSurveyShortLinks` (ADR #37), token TinyURL bị hardcode dạng plaintext trực tiếp trong `functions/src/survey.ts` thay vì lưu trong cấu hình bảo mật như tài liệu ban đầu mô tả — rủi ro rò rỉ vĩnh viễn nếu file này được commit vào Git history.
    2. Cùng file còn chứa 2 Cloud Function `getSurveyForm` và `submitSurveyResponse` cùng file phụ trợ `sheetsService.ts` (dùng package `googleapis`) — một tính năng khảo sát tự viết (đọc/ghi collection `surveys`, `surveyResponses`, ghi Google Sheets) hoàn toàn tách biệt khỏi tính năng Link Khảo sát Rút gọn đã mô tả, chưa có frontend nào gọi tới, chưa có Firestore Rules tương ứng, và chưa từng được deploy.
- **Quyết định:**
    - Chuyển token TinyURL sang Firebase Secret Manager qua `defineSecret('TINYURL_API_TOKEN')`, bind bằng `.runWith({ secrets: [...] })`. Đổi giá trị chỉ qua `firebase functions:secrets:set TINYURL_API_TOKEN`, không còn nằm trong source code hay Firestore.
    - Xóa hoàn toàn `getSurveyForm`, `submitSurveyResponse`, `sheetsService.ts` và dependency `googleapis` khỏi `functions/` vì chưa dùng tới và mở rộng bề mặt tấn công không cần thiết. `functions/src/index.ts` chỉ còn export `batchSurveyShortLinks` từ module `survey`.
- **Lý do:** Một secret từng nằm plaintext trên đĩa nên được coi là đã lộ và cần xoay vòng qua kênh bảo mật chính thức thay vì tiếp tục tin tưởng file nguồn. Code chưa dùng tới, không khớp tài liệu đặc tả, và không có Rules bảo vệ là rủi ro bảo mật/bảo trì nên loại bỏ ngay khi phát hiện thay vì để tồn tại "phòng khi cần".

## 39. Bài học vận hành: Không sửa `functions/package.json` bằng Node khác `engines.node` (2026-08-31)
- **Vấn đề:** Khi thử dọn 4 dependency không dùng tới (`@google/generative-ai`, `markdown-it`, `@types/markdown-it`, `cors` — tàn dư từ AI Chatbot đã gỡ, xem ADR #8), `npm install`/`npm uninstall`/`npm ci` chạy ở máy dev (Node v24, ngoài quy định `engines.node: "22"` của `functions/package.json`) tính toán lại nhánh phụ thuộc optional sâu (`firebase-admin` → `@google-cloud/firestore` [optional] → `google-gax` → `protobufjs-cli` [optional] → `jsdoc` → `markdown-it`) khác với npm mà Cloud Build (Node 22) sử dụng khi deploy. Kết quả: `npm ci` pass ở local nhưng fail ngay trên Cloud Build với lỗi "Missing package from lock file", khiến 2 lần deploy `batchSurveyShortLinks` thất bại liên tiếp trước khi phải revert lại dependency cũ để deploy thành công.
- **Quyết định:** Giữ nguyên 4 dependency "chết" đó (vô hại, chỉ nằm sâu trong optional chain, không ảnh hưởng runtime hay bảo mật, chênh lệch kích thước gói deploy không đáng kể ~0.4KB). Không chạy `npm install`/`npm uninstall` trong thư mục `functions/` bằng Node khác phiên bản `22` cho tới khi máy dev có Node 22 (qua nvm) để tái tạo đúng môi trường Cloud Build.
- **Lý do:** Rủi ro làm deploy production thất bại lớn hơn nhiều so với lợi ích dọn dẹp vài KB code không dùng tới. Bài học chung: mọi thay đổi `package-lock.json` trong `functions/` cần chạy đúng Node version ghi trong `engines` trước khi tin tưởng kết quả `npm ci` cục bộ phản ánh đúng hành vi deploy thật.

## 40. Job Mặc định (Protected Job) & Lọc nhân viên Phân công hàng ngày theo Lịch cố định (v4.5.x)
- **Vấn đề:** Sau khi gộp 2 job "Chia hàng ngày" trùng lặp mục đích ("1-1" và "Chuyển đổi") thành một job duy nhất "Chuyển đổi & 1-1", cần:
    1. Ngăn Coordinator vô tình Sửa/Xóa job này qua JobManager (vì đây giờ là job "lõi" duy nhất còn lại của nhóm, xóa/đổi tên nhầm sẽ ảnh hưởng toàn bộ luồng Phân công hàng ngày).
    2. Trước đây, bảng Phân công hàng ngày hiển thị TẤT CẢ nhân viên thuộc nhóm "Chia hàng ngày" (theo `employee.jobGroups`) làm hàng, bất kể họ có thực sự được phân công job đó trong ngày hay không — với job "Chuyển đổi & 1-1", danh sách này cần thu hẹp lại chỉ còn đúng những người đã được Coordinator gán qua Lịch cố định (`schedule`) cho job này trong ngày cụ thể, vì đây là công việc cần chỉ định thủ công theo khách hàng (MST/hồ sơ chuyển đổi cụ thể), không phải việc "ai rảnh thì làm".
- **Quyết định:**
    - Thêm mảng hằng `DEFAULT_JOB_IDS` trong `constants.ts` (hiện chỉ chứa `job_27`).
    - **JobManager:** ẩn nút Sửa/Xóa và thay bằng icon khóa cho job nằm trong `DEFAULT_JOB_IDS`; chặn tương ứng ở tầng logic (`useJobManager.ts`) để không thể bypass qua thao tác khác.
    - **Daily Allocation:** với job thuộc `DEFAULT_JOB_IDS`, nhân viên chỉ "phù hợp" (hiện hàng + được nhập liệu) nếu có bản ghi `schedule` khớp `jobId` + đúng ngày + chưa hủy + có tên trong `employeeIds` (`isScheduledForJob`). Nhân viên đủ điều kiện cho job khác (vd. do đang rảnh) nhưng chưa được gán job mặc định vẫn hiện hàng (nếu đang xem nhiều job cùng lúc) nhưng ô nhập của job mặc định sẽ hiện "Chưa phân công" thay vì input.
    - **Bug phát sinh & đã sửa cùng đợt:** logic gốc lọc hàng theo "đang rảnh trong buổi" (`checkBusy`, dùng `busyMap` không phân biệt job) áp dụng vô điều kiện lên MỌI job. Vì được gán lịch cố định cho job mặc định cũng khiến nhân viên bị đánh dấu "bận" trong `busyMap`, 2 điều kiện AND với nhau triệt tiêu toàn bộ danh sách (0 nhân viên hiện lên). Sửa bằng cách tách tiêu chí "phù hợp" theo loại job (`isSuitableForJob`): job mặc định chỉ xét theo lịch cố định (bỏ qua busy-check), job thường vẫn xét rảnh/bận như cũ, rồi OR kết quả theo từng job đang hiển thị thay vì AND chung một điều kiện busy cho cả bảng.
- **Lý do:** Cho phép 2 mô hình job cùng tồn tại trong 1 bảng Phân công hàng ngày mà không cần tách giao diện riêng: job "mở" (ai thuộc nhóm và đang rảnh đều có thể nhận việc) và job "đóng" (danh sách do Coordinator chỉ định thủ công qua Lịch cố định). `DEFAULT_JOB_IDS` là điểm mở rộng chung — thêm job mặc định khác trong tương lai chỉ cần thêm 1 dòng vào mảng này.

