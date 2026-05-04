"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const generative_ai_1 = require("@google/generative-ai");
// 1. CONFIG
const API_KEY = "AIzaSyCW5B_PqlQFdSQB70HAlR6IOp796Dhwx0Y";
const genAI = new generative_ai_1.GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
// 2. MOCK DATA
const MOCK_EMPLOYEES = {
    "emp_uyen": "Trần Thị Phương Uyên",
    "emp_huy": "Nguyễn Văn Huy"
};
const MOCK_JOBS = {
    "job_kpi": "Trực Livechat",
    "job_train": "Đào tạo Hội nhập"
};
// Calculate "Tomorrow" for dynamic testing
const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().split('T')[0];
const MOCK_SCHEDULE = [
    {
        date: tomorrowStr,
        employeeIds: ["emp_uyen"],
        jobId: "job_kpi",
        shift: "Sáng (08:00 - 12:00)"
    },
    {
        date: tomorrowStr,
        employeeIds: ["emp_uyen"],
        jobId: "job_kpi",
        shift: "Chiều (13:30 - 17:30)"
    },
    {
        date: tomorrowStr,
        employeeIds: ["emp_huy"],
        jobId: "job_train",
        shift: "Sáng"
    }
];
// 3. LOGIC REPLICATION (From askSchedulerBotV2.ts)
async function testBot() {
    console.log("--- 🕵️ SIMULATING CHATBOT LOGIC ---");
    console.log(`User Question: "Ngày mai Trần Thị Phương Uyên làm gì"`);
    console.log(`Mock Date (Tomorrow): ${tomorrowStr}`);
    // Data Processing Logic
    const contextRows = MOCK_SCHEDULE.map(s => {
        const names = s.employeeIds.map(id => MOCK_EMPLOYEES[id]).join(", ");
        const job = MOCK_JOBS[s.jobId];
        return `- Ngày: ${s.date} | NV: ${names} | Ca: ${s.shift} | Job: ${job}`;
    });
    const contextData = contextRows.join("\n");
    console.log("\n--- GENERATED CONTEXT ---");
    console.log(contextData);
    // Prompt Construction
    const fullPrompt = `
    Hôm nay là: ${today.toLocaleString("vi-VN")}.
    Bạn là Trợ lý Lịch ONB.
    Người hỏi: "admin@onb.vn" (Admin).

    NHIỆM VỤ:
    1. Tra cứu lịch làm việc dựa trên Context.
    2. Trả lời ngắn gọn, dùng bảng Markdown nếu liệt kê danh sách.

    --- FULL CONTEXT ---
    ${contextData}
    --------------------

    Câu hỏi: "Ngày mai Trần Thị Phương Uyên làm gì"
    `;
    console.log("\n--- SENDING TO GEMINI 2.0 FLASH ---");
    try {
        const result = await model.generateContent(fullPrompt);
        const response = result.response.text();
        console.log("\n✅ --- BOT RESPONSE ---");
        console.log(response);
        console.log("-----------------------");
    }
    catch (error) {
        console.error("❌ Error:", error);
    }
}
testBot();
//# sourceMappingURL=test-chatbot-logic.js.map