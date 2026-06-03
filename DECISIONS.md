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
