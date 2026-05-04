import * as admin from 'firebase-admin';
import { Employee, Job, ScheduleItem } from './types';

export const getScheduleContext = async (startDate: string, endDate: string): Promise<string> => {
    const db = admin.firestore();
    try {
        // 1. Fetch Basic Metadata (Cached in memory in production, but here we fetch)
        const empsSnap = await db.collection('employees').where('status', '==', 'Đang hoạt động').get();
        const jobsSnap = await db.collection('jobs').where('isActive', '==', true).get();

        const employees = empsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Employee));
        const jobs = jobsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Job));

        const empMap = new Map(employees.map(e => [e.id, e.fullName])); // Fallback for name variants
        const jobMap = new Map(jobs.map(j => [j.id, j.name]));

        // 2. Fetch Schedule Range
        const scheduleSnap = await db.collection('schedule')
            .where('date', '>=', startDate)
            .where('date', '<=', endDate)
            .get();

        const items = scheduleSnap.docs.map(d => d.data() as ScheduleItem);

        // 3. Format as Text for LLM
        let contextText = `Danh sách nhân viên: ${employees.map(e => e.fullName).join(', ')}\n\n`;

        // Add Job Metadata (Descriptions and Links)
        contextText += `DANH SÁCH CÔNG VIỆC VÀ LINK:\n`;
        jobs.forEach(j => {
            if (j.googleMeetLink) {
                contextText += `- ${j.name}: ${j.description || ''} (Link Meet: ${j.googleMeetLink})\n`;
            } else {
                contextText += `- ${j.name}: ${j.description || ''}\n`;
            }
        });
        contextText += `\n`;

        contextText += `Lịch làm việc từ ${startDate} đến ${endDate}:\n`;

        if (items.length === 0) return contextText + "(Không có lịch nào trong tuần này)";

        // Sort by date/shift
        items.sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
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
    } catch (error) {
        console.error("Error building context:", error);
        return "Lỗi: Không thể lấy dữ liệu lịch làm việc.";
    }
};
