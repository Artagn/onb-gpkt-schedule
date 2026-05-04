# Hướng Dẫn Sử Dụng - ONB GPKT Schedule

Tài liệu hướng dẫn chi tiết các tính năng cho từng vai trò người dùng trong hệ thống.

---

## 🏗️ 1. Vai trò: Admin (Quản trị viên)

**Quyền hạn:** Toàn quyền hệ thống.

### 1.1 Quản lý Nhân sự
- Truy cập Dashboard > Tab **Nhân viên**.
- **Thêm mới:** Nhập Email, Tên, Chức vụ, Nhóm việc.
- **Sửa/Xóa:** Cập nhật thông tin hoặc Dừng kích hoạt nhân viên nghỉ việc.
- **Phân loại:** Đặt Hạng (A/B) để ưu tiên xếp lịch.

### 1.2 Cấu hình Hệ thống
- Truy cập Dashboard > Tab **Jobs (Công việc)**: Định nghĩa các đầu việc, điểm số KPI, và nhóm (Đào tạo/Trực/...).
- Truy cập Dashboard > Tab **Cấu hình**: Reset dữ liệu, Sao lưu, hoặc thiết lập các tham số chạy tự động.

### 1.3 Kiểm tra Nhật ký (Audit)
- Truy cập Dashboard > Tab **Audit Log**.
- Xem lịch sử ai đã sửa lịch, duyệt đơn nghỉ vào thời gian nào.
- Sử dụng bộ lọc để tìm kiếm hành động nghi vấn.

---

## 🗓️ 2. Vai trò: Coordinator (Điều phối viên)

**Quyền hạn:** Quản lý lịch, Phân công, Duyệt đơn.

### 2.1 Xếp Lịch Tự Động (Auto-Schedule)
1. Vào menu **Điều phối** > Tab **Lịch cố định**.
2. Chọn khoảng thời gian (Tuần/Tháng).
3. Nhấn **Xếp Lịch Tự Động**.
4. Hệ thống sẽ tính toán dựa trên số lượng nhân sự cần thiết và quy tắc công bằng.

### 2.2 Điều chỉnh Lịch (Thủ công)
- Tại màn hình **Lịch cố định**, nhấn vào ô trống để thêm việc.
- Kéo thả (Drag & Drop) để chuyển việc từ người này sang người khác.
- Nhấn chuột phải (hoặc click) vào việc đã gán để Xóa hoặc Đổi trạng thái.

### 2.3 Duyệt Đơn Nghỉ Phép
1. Vào menu **Điều phối** > Tab **Duyệt nghỉ phép**.
2. Xem danh sách các đơn đang chờ (Pending).
3. Nhấn **Duyệt (Approve)** hoặc **Từ chối (Reject)**.
4. *Lưu ý:* Hệ thống sẽ cảnh báo nếu ngày nghỉ trùng với lịch làm việc.

### 2.4 Chia Chỉ Tiêu (Daily Allocation)
1. Vào menu **Điều phối** > **Chia chỉ tiêu**.
2. Chọn ngày và Loại hình (VD: Chia hồ sơ).
3. Nhập số liệu giao cho từng nhân viên (Đã chia/Chia mới).

---

## 👤 3. Vai trò: Staff (Nhân viên)

**Quyền hạn:** Xem lịch cá nhân, Báo cáo tiến độ, Đổi lịch.

### 3.1 Xem Lịch & Việc Cần Làm
- Truy cập menu **Việc của tôi (My Tasks)**.
- **Tab Tổng quan:** Xem lịch làm việc trong tuần.
- **Tab Lịch cố định:** Danh sách chi tiết các ca trực/đào tạo được giao.

### 3.2 Báo cáo Kết quả (KPI)
1. Tại **Lịch cố định**, click vào đầu việc.
2. Cập nhật trạng thái: **Hoàn thành**.
3. (Nếu là đào tạo) Nhập số lượng khách tham gia, khảo sát...
4. Tại **Chỉ tiêu hàng ngày**, nhập số lượng hồ sơ đã xử lý.

### 3.3 Xin Nghỉ Phép
1. Vào **Việc của tôi** > Tab **Xin nghỉ phép**.
2. Điền Ngày, Buổi và Lý do.
3. Nhấn Gửi. Theo dõi trạng thái đơn tại danh sách bên dưới.

### 3.4 Đổi Lịch (Shift Swap)
**Cách 1: Gửi yêu cầu đổi**
1. Tại lịch cá nhân, nhấn nút **Đổi (Swap)** trên ca muốn đổi.
2. Chọn người muốn đổi cùng.
3. Hệ thống gửi thông báo cho người đó.

**Cách 2: Chấp nhận yêu cầu**
1. Vào Tab **Đổi lịch (Market)**.
2. Xem mục "Cần duyệt".
3. Nhấn **Chấp nhận** để thực hiện đổi (Hệ thống tự động cập nhật lịch cả 2 người).
*Lưu ý:* Nếu đổi Ca Tối, hệ thống sẽ tự động đổi luôn lịch nghỉ bù sáng hôm sau.

---

## 📊 4. Xem Báo Cáo (Chung)

Truy cập menu **Báo cáo & KPI**:
- **KPI Điểm:** Xem tổng điểm tích lũy theo trọng số công việc.
- **Hàng ngày:** Xem tiến độ xử lý hồ sơ (Giao/Hoàn thành/Tồn).
- **Đào tạo:** Kết quả đào tạo (Tỷ lệ người dùng biết sử dụng).
- **Đổi lịch:** Thống kê lịch sử đổi ca và thay đổi nghỉ bù.
- Nhấn nút **Xuất Excel** để tải báo cáo về máy.
