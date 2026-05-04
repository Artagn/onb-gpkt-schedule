# Implementation Plan: Monthly Evaluation Feature (Đánh Giá Tháng)

> **Status:** PENDING - Chờ implement trong conversation riêng để test kỹ và rollback
> **Created:** 2026-01-30
> **Version:** v3.4.8

---

## 1. Tổng quan

Xây dựng module **Đánh giá tháng** với tính năng:
- Admin/Coordinator tạo **đợt đánh giá** với **chỉ tiêu tùy chỉnh**
- Nhân viên **tự nhập điểm** công việc
- Coordinator **duyệt** và **lưu kết quả**
- Tự động tính điểm từ dữ liệu app

---

## 2. Phân tích Hệ thống Hiện tại

### 2.1. Các khai báo đã có

| Collection | Entity | Thuộc tính liên quan | Nơi quản lý |
|------------|--------|---------------------|-------------|
| `jobs` | `Job` | `name`, `group`, `standardPoint`, `classification` | **JobManager** (Admin) |
| `employees` | `Employee` | `jobGroups`, `kpiStandard`, `weeklyScore`, `monthlyScore` | **EmployeeManager** |
| `schedule` | `ScheduleItem` | `jobId`, `coefficient`, `status` | **FixedSchedule** |
| `dailyAllocations` | `DailyAllocation` | `jobId`, `assigned`, `completed` | **DailyAllocation** |

### 2.2. JobGroup (Nhóm công việc)
```typescript
// Đã có trong types.ts
export enum JobGroup {
    Training = 'Đào tạo',      // → Thẻ đào tạo
    Livechat = 'Livechat',     // → Điểm Livechat
    Daily = 'Chia hàng ngày',  // → Điểm thẻ hỗ trợ
    Other = 'Khác'             // → Công việc khác
}
```

### 2.3. Job đã có standardPoint
```
TRUC_LIVECHAT  → standardPoint: 2
TN_LIVECHAT    → standardPoint: 2
ĐT TRUC TIEP   → standardPoint: 8
1-1            → standardPoint: 0 (cần cập nhật)
Chuyển đổi     → standardPoint: 0 (cần cập nhật)
```

---

## 3. Đề xuất: Phương án Hybrid (Khuyến nghị)

### 3.1. Mở rộng `Job` entity

```typescript
interface Job {
    // ... existing fields ...
    standardPoint: number;           // ĐÃ CÓ - dùng luôn
    
    // NEW: Dành cho đánh giá
    evaluationCategory?: 'training_card' | 'livechat' | 'work' | 'kpi' | 'other';
    pointsPerUnit?: number;          // Điểm / đơn vị (nếu khác standardPoint)
    standardPerShift?: number;       // Tiêu chuẩn / buổi (cho Livechat)
    isEvaluationMetric?: boolean;    // Có dùng trong đánh giá ko?
    evaluationOrder?: number;        // Thứ tự hiển thị trong form đánh giá
}
```

### 3.2. Collection mới cho chỉ tiêu riêng

```typescript
// Cho những metrics không phải Job: "Làm tài liệu", "Công việc khác", "Trừ đi muộn"
interface EvaluationExtra {
    id: string;
    name: string;
    type: 'points' | 'deduction';  // Cộng điểm / Trừ điểm
    defaultPoints: number;
    isActive: boolean;
    order: number;
}
```

### 3.3. Đợt đánh giá

```typescript
interface EvaluationPeriod {
    id: string;
    name: string;                    // "Đánh giá tháng 12/2026"
    month: number;
    year: number;
    status: 'draft' | 'open' | 'reviewing' | 'closed';
    selectedMetrics: string[];       // IDs của Jobs/Extras được chọn
    kpiTarget: number;               // KPI kế hoạch (95%)
    workPointTarget: number;         // Điểm công việc kế hoạch (110)
    createdBy: string;
    createdAt: Timestamp;
}
```

### 3.4. Đánh giá nhân viên

```typescript
interface EmployeeEvaluation {
    id: string;
    periodId: string;
    employeeId: string;
    status: 'pending' | 'submitted' | 'approved' | 'rejected';
    
    // KPI Khách hàng (nhập tay)
    kpiData: { ... };
    
    // Điểm thẻ (nhập số lượng, tự tính điểm)
    trainingData: { [metricId: string]: { quantity: number; points: number; } };
    
    // Điểm công việc (nhập tay)
    workData: { ... };
    
    // Tổng hợp (tự động)
    summary: {
        totalPoints: number;
        achievementRate: number;
        result: 'Vượt mong đợi' | 'Đạt' | 'Cần cố gắng';
    };
}
```

---

## 4. Workflow

```
0. ADMIN CẤU HÌNH (1 lần)
   - JobManager: Đánh dấu job nào dùng cho đánh giá
   - EvaluationExtras: Thêm chỉ tiêu riêng
   - EmployeeManager: Gán nhóm đánh giá cho NV
         ↓
1. ADMIN TẠO ĐỢT ĐÁNH GIÁ (hàng tháng)
   - Chọn tháng/năm + chỉ tiêu áp dụng
   - Override điểm nếu cần
         ↓
2. NHÂN VIÊN TỰ NHẬP
   - Form tự động hiển thị các chỉ tiêu
   - Tự động điền: Số ca Livechat từ schedule
         ↓
3. COORDINATOR DUYỆT & ĐÓNG
   - Export Excel theo mẫu
```

---

## 5. Phân chia giai đoạn

### Phase 1: Core (MVP) - ~3-4 ngày
- [ ] Mở rộng `Job` type + JobManager UI
- [ ] `evaluation_extras` collection + UI quản lý
- [ ] `evaluation_periods` + Admin tạo đợt
- [ ] `evaluations` + Nhân viên nhập
- [ ] Coordinator duyệt

### Phase 2: Advanced - ~2-3 ngày
- [ ] Tự động lấy điểm Livechat từ schedule
- [ ] Export Excel theo mẫu hiện tại
- [ ] Lịch sử đánh giá

### Phase 3: Polish - ~1-2 ngày
- [ ] UI/UX improvements
- [ ] Dashboard widget
- [ ] Notifications

---

## 6. Câu hỏi chưa trả lời

> ⚠️ **Cần xác nhận trước khi implement:**
>
> 1. **Nhóm NV**: `Employee.jobGroups` có phân được ONB ĐT vs ONB KS không? Hay cần thêm field?
>
> 2. **Điểm thẻ đào tạo**: Các loại thẻ (Tự học, CĐDL, Hỗ trợ 1-1...) có tương ứng với Job nào? Hay hoàn toàn mới?
>
> 3. **Hệ số điểm**: Mỗi loại thẻ có hệ số bao nhiêu điểm/thẻ?
>
> 4. **Điểm Livechat**: Tiêu chuẩn/buổi? Điểm cố định/buổi?
>
> 5. **Trừ đi muộn**: Công thức trừ điểm?

---

## 7. Reference: Bảng Excel gốc

Xem file Excel mẫu để hiểu cấu trúc dữ liệu đầy đủ với các cột:
- KPI THÁNG: SLKH tiếp nhận, tính KPIs, đang sử dụng, loại trừ...
- ĐIỂM ĐÀO TẠO: Tự học, CĐDL, Hỗ trợ 1-1, Đào tạo online, Dùng thử...
- ĐIỂM CÔNG VIỆC: Làm tài liệu, Livechat, Công việc khác, Trừ đi muộn...
- TỔNG HỢP: Tổng điểm, KPI điểm CV, Tỷ lệ hoàn thành, Kết quả
