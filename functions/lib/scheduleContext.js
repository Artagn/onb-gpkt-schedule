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
exports.getScheduleContext = void 0;
const admin = __importStar(require("firebase-admin"));
const getScheduleContext = async (startDate, endDate) => {
    const db = admin.firestore();
    try {
        // 1. Fetch Basic Metadata (Cached in memory in production, but here we fetch)
        const empsSnap = await db.collection('employees').where('status', '==', 'Đang hoạt động').get();
        const jobsSnap = await db.collection('jobs').where('isActive', '==', true).get();
        const employees = empsSnap.docs.map(d => (Object.assign({ id: d.id }, d.data())));
        const jobs = jobsSnap.docs.map(d => (Object.assign({ id: d.id }, d.data())));
        const empMap = new Map(employees.map(e => [e.id, e.fullName])); // Fallback for name variants
        const jobMap = new Map(jobs.map(j => [j.id, j.name]));
        // 2. Fetch Schedule Range
        const scheduleSnap = await db.collection('schedule')
            .where('date', '>=', startDate)
            .where('date', '<=', endDate)
            .get();
        const items = scheduleSnap.docs.map(d => d.data());
        // 3. Format as Text for LLM
        let contextText = `Danh sách nhân viên: ${employees.map(e => e.fullName).join(', ')}\n\n`;
        // Add Job Metadata (Descriptions and Links)
        contextText += `DANH SÁCH CÔNG VIỆC VÀ LINK:\n`;
        jobs.forEach(j => {
            if (j.googleMeetLink) {
                contextText += `- ${j.name}: ${j.description || ''} (Link Meet: ${j.googleMeetLink})\n`;
            }
            else {
                contextText += `- ${j.name}: ${j.description || ''}\n`;
            }
        });
        contextText += `\n`;
        contextText += `Lịch làm việc từ ${startDate} đến ${endDate}:\n`;
        if (items.length === 0)
            return contextText + "(Không có lịch nào trong tuần này)";
        // Sort by date/shift
        items.sort((a, b) => {
            if (a.date !== b.date)
                return a.date.localeCompare(b.date);
            const shifts = { 'Sáng': 0, 'Chiều': 1, 'Tối': 2 };
            return (shifts[a.shift] || 0) - (shifts[b.shift] || 0);
        });
        items.forEach(item => {
            const jobName = jobMap.get(item.jobId) || item.jobId;
            const assignedNames = item.employeeIds.map(id => empMap.get(id) || id).join(', ');
            if (assignedNames) {
                contextText += `- ${item.date} (${item.shift}): ${jobName} -> ${assignedNames}\n`;
            }
        });
        return contextText;
    }
    catch (error) {
        console.error("Error building context:", error);
        return "Lỗi: Không thể lấy dữ liệu lịch làm việc.";
    }
};
exports.getScheduleContext = getScheduleContext;
//# sourceMappingURL=scheduleContext.js.map