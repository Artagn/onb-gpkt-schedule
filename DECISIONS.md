# Architectural Decisions Log (ADR)

> **Mục đích:** Ghi lại các quyết định kỹ thuật quan trọng, lý do lựa chọn và bối cảnh để đảm bảo tính nhất quán của dự án theo thời gian.
> **Trạng thái:** Được tổng hợp từ OVERVIEW.md và CONTINUITY.md (v3.19.3).

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
