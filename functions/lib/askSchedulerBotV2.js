"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.askSchedulerBotV2 = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const generative_ai_1 = require("@google/generative-ai");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
// Cấu hình Model
const GEMINI_API_KEY = functions.config().gemini.key;
const genAI = new generative_ai_1.GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
const buildSystemPrompt = (userEmail, userRole = "Staff") => `
Bạn là Trợ lý Lịch ONB.
Người hỏi: "${userEmail}" (${userRole}).

NHIỆM VỤ:
1. Tra cứu lịch làm việc dựa trên Context.
2. Nếu có thông tin chi tiết về lớp học (SubJob), BẮT BUỘC phải trả lời dưới dạng bảng với các cột sau:
| Ca | Job | Mô tả | Thời gian | Sp | Meet |
|---|---|---|---|---|---|
(Nếu cột nào không có dữ liệu thì để trống hoặc ghi "-")

3. QUY TẮC TRÌNH BÀY:
- Cột "Mô tả": Tự động viết tắt hoặc tóm tắt nội dung cho ngắn gọn, dễ đọc.
- Cột "Thời gian": Chỉ ghi giờ (Ví dụ: 08:30-10:00).
- **QUAN TRỌNG:** Chỉ trả lời đúng thời gian người dùng hỏi (Ví dụ: Hỏi "ngày mai" chỉ trả lời ngày mai). KHÔNG liệt kê các ngày khác nếu không được hỏi.
- **TÌM KIẾM TÊN:** Nếu người dùng hỏi về người khác (Ví dụ: "Khải làm gì", "Lịch của Lan"), hãy tìm kỹ tên đó (hoặc tên gần đúng nhất) đóng vai trò là "NV" (Nhân viên) trong dữ liệu Context.
- **FORMAT:** Khi hướng dẫn tính năng, hãy dùng **in đậm** (Markdown **text**) cho tên Menu, Nút bấm, Tab thay vì dùng dấu ngoặc kép.

4. HƯỚNG DẪN TÍNH NĂNG (Dùng khi người dùng hỏi cách sử dụng/làm thế nào):
   - **Đổi Lịch (Shift Swap):**
     + Cách 1: Vào menu **Việc của tôi** > Nhấn nút **Đổi** trên ca muốn đổi > Chọn người nhận.
     + Cách 2: Vào menu **Đổi lịch** > Xem tab **Cần duyệt** > Nhấn **Chấp nhận**.
     *Lưu ý: Đổi Ca Tối sẽ tự động đổi luôn nghỉ bù.*
   - **Xin Nghỉ Phép:**
     + Vào menu **Việc của tôi** > Tab **Xin nghỉ phép** > Chọn ngày, buổi, lý do > Nhấn **Gửi**.
   - **Báo cáo KPI:**
     + Vào **Lịch cố định** > Click vào đầu việc > Chọn trạng thái **Hoàn thành**.
     + Vào **Chỉ tiêu hàng ngày** > Nhập số lượng hồ sơ đã làm.
   - **Xem Báo Cáo:**
     + Truy cập menu **Báo cáo & KPI** để xem điểm tích lũy và tiến độ.
   - **(Admin/Coord) Xếp Lịch:** Vào menu **Điều phối** > **Lịch cố định** > Chọn tuần > Nhấn **Xếp lịch tự động**.

5. Nếu không có thông tin chi tiết lớp học, trả lời dạng danh sách ngắn gọn.

QUY TẮC DEBUG:
Nếu người dùng hỏi về kiểm tra/debug, hãy báo cáo số lượng bản ghi tìm thấy.
`;
exports.askSchedulerBotV2 = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Cần đăng nhập.");
    }
    const userMessage = data.message || "";
    const userEmail = context.auth.token.email || "Unknown";
    const userRole = (userEmail.includes("admin") || userEmail.includes("quanly")) ? "Admin" : "Staff";
    try {
        // 1. GET DATA
        // 0. DATE RANGE CALCULATION (OPTIMIZATION)
        const now = new Date();
        const pastDate = new Date(now);
        pastDate.setDate(now.getDate() - 30); // -30 days
        const startDateStr = pastDate.toISOString().split('T')[0];
        const futureDate = new Date(now);
        futureDate.setDate(now.getDate() + 30); // +30 days
        const endDateStr = futureDate.toISOString().split('T')[0];
        // 1. GET DATA (FILTERED)
        const [schedulesSnap, employeesSnap, jobsSnap, subJobsSnap, leavesSnap] = await Promise.all([
            db.collection("schedule")
                .where("date", ">=", startDateStr)
                .where("date", "<=", endDateStr)
                .get(),
            db.collection("employees").get(),
            db.collection("jobs").get(),
            db.collection("subJobs").get(),
            db.collection("leaves")
                .where("date", ">=", startDateStr)
                .where("date", "<=", endDateStr)
                .get()
        ]);
        // 2. CREATE MAPS (ID -> Name) & FIND CURRENT USER
        const empMap = {};
        let currentUserName = userEmail; // Default to email if name not found
        employeesSnap.forEach(doc => {
            const d = doc.data();
            const name = d.fullName || d.name || d.displayName || doc.id;
            empMap[doc.id] = name;
            // Check if this employee matches the current user's email
            if (d.email === userEmail || d.gmail === userEmail) {
                currentUserName = name;
            }
        });
        // ... (jobMap and subJobMap omitted for brevity - no changes needed there)
        const jobMap = {};
        jobsSnap.forEach(doc => {
            const d = doc.data();
            jobMap[doc.id] = d.title || d.name || d.jobName || doc.id;
        });
        // SubJob Map (Key: jobId_day_shift => Array of SubJob Details)
        const subJobMap = {};
        subJobsSnap.forEach(doc => {
            const d = doc.data();
            // Key format: JobID + DayString (Thứ 2) + Shift
            const key = `${d.jobId}_${d.day}_${d.shift}`;
            if (!subJobMap[key]) {
                subJobMap[key] = [];
            }
            subJobMap[key].push(d); // Store full object in array
        });
        // Helper: Convert Date to VN Day String (Thứ 2...)
        const getVNDayName = (vnDate) => {
            const dayIdx = vnDate.getDay(); // 0 (Sun) - 6 (Sat)
            if (dayIdx === 0)
                return "Chủ nhật";
            return `Thứ ${dayIdx + 1}`;
        };
        // 3. PROCESS DATA (FIXED FOR ARRAY)
        let schedulesData = "Không có dữ liệu lịch làm việc.";
        let leavesData = "Không có dữ liệu nghỉ phép.";
        let debugPreview = "Trống";
        // --- PROCESS LEAVES ---
        if (!leavesSnap.empty) {
            const leaveRows = leavesSnap.docs.map(doc => {
                const l = doc.data();
                const empName = empMap[l.employeeId] || l.employeeId;
                // Format Date: l.date (YYYY-MM-DD or ISO)
                let dateStr = l.date || "N/A";
                if (dateStr.includes("T")) {
                    dateStr = dateStr.split('T')[0];
                }
                // Status Filter (Optional: Only show Approved?) -> Showing ALL for now, let Bot decide based on status
                const status = l.status === 'Approved' ? 'Đã duyệt' : (l.status === 'Pending' ? 'Chờ duyệt' : l.status);
                return `- Ngày: ${dateStr} | NV: ${empName} | Buổi: ${l.shift} | Lý do: ${l.reason || "N/A"} | Trạng thái: ${status}`;
            });
            leavesData = leaveRows.join("\n");
        }
        if (!schedulesSnap.empty) {
            // Dùng flatMap vì 1 dòng lịch có thể có nhiều nhân viên (hoặc xử lý gộp)
            const allRows = schedulesSnap.docs.flatMap(doc => {
                const s = doc.data();
                // 1. Get Date (VN Time)
                let dateStr = "N/A";
                if (s.date) {
                    if (s.date.includes("T")) {
                        const d = new Date(s.date);
                        const vnTime = new Date(d.getTime() + 7 * 60 * 60 * 1000);
                        dateStr = vnTime.toISOString().split('T')[0];
                    }
                    else {
                        dateStr = s.date;
                    }
                }
                // 2. Get Employee Names
                let empIds = [];
                if (Array.isArray(s.employeeIds)) {
                    empIds = s.employeeIds;
                }
                else if (s.employeeId) {
                    empIds = [s.employeeId];
                }
                const empNames = empIds.map(id => empMap[id] || id).join(", ");
                // 3. Get Job Name
                let jobName = jobMap[s.jobId] || s.jobName || s.jobId;
                // 4. Enrich with SubJob Details (Handle Multiple)
                if (dateStr !== "N/A" && s.jobId) {
                    const d = new Date(dateStr);
                    const dayName = getVNDayName(d);
                    const subJobKey = `${s.jobId}_${dayName}_${s.shift}`;
                    const subJobs = subJobMap[subJobKey] || [];
                    if (subJobs.length > 0) {
                        // SORT BY START TIME
                        subJobs.sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
                        // Return multiple lines, one for each sub-job
                        return subJobs.map(sub => {
                            const subJobInfo = ` | SubName: ${sub.name || "-"} | Time: ${sub.startTime || ""}-${sub.endTime || ""} | Product: ${sub.product || "-"} | Link: ${sub.link || "-"}`;
                            return `- Ngày: ${dateStr} | NV: ${empNames || "Chưa gán"} | Ca: ${s.shift} | Job: ${jobName}${subJobInfo}`;
                        });
                    }
                }
                // Default if no sub-jobs found or invalid date
                return [`- Ngày: ${dateStr} | NV: ${empNames || "Chưa gán"} | Ca: ${s.shift} | Job: ${jobName}`];
            });
            // Lọc bỏ các dòng không có nhân viên để tiết kiệm Token (tuỳ chọn)
            const validRows = allRows.filter(row => !row.includes("Chưa gán"));
            schedulesData = validRows.join("\n");
            debugPreview = validRows.slice(0, 5).join("\n");
        }
        // 4. BUILD PROMPT
        // Fix: Use vi-VN locale to avoid MM/DD/YYYY confusion (Gemini might think 2/11 is Nov 2nd)
        const today = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
        const fullPrompt = `
Hôm nay là: ${today}.
${buildSystemPrompt(currentUserName, userRole)}

--- 🔍 DEBUG REPORT ---
Total Docs: ${schedulesSnap.size}
Total Employees: ${employeesSnap.size}
Total Leaves: ${leavesSnap.size}

[SAMPLE DATA PREVIEW]
${debugPreview}
-----------------------

--- FULL CONTEXT (LỊCH LÀM VIỆC) ---
${schedulesData}
------------------------------------

--- FULL CONTEXT (NGHỈ PHÉP) ---
${leavesData}
--------------------------------

Câu hỏi: "${userMessage}"
    `;
        const result = await model.generateContent(fullPrompt);
        return { text: result.response.text() };
    }
    catch (error) {
        console.error("Error:", error);
        throw new functions.https.HttpsError("internal", "Lỗi: " + error);
    }
});
//# sourceMappingURL=askSchedulerBotV2.js.map