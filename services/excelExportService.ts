import * as XLSX from 'xlsx';
import { Employee, Job, ScheduleItem } from '../types';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';

export const exportWeeklySchedule = (
    schedule: ScheduleItem[],
    jobs: Job[],
    employees: Employee[],
    startDate: Date
) => {
    // 1. Prepare Days Column Headers
    const weekStart = startOfWeek(startDate, { weekStartsOn: 1 }); // Monday
    const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
    const dayHeaders = days.map(d => format(d, 'EEEE (dd/MM)')); // e.g. "Monday (23/01)"

    // 2. Group Jobs by Shift (Manual grouping logic based on Job Group or Name for now)
    // In FixedSchedule, we usually group by "Job Group". 
    // Let's list all active jobs, grouped by their Group.
    const activeJobs = jobs.filter(j => j.isActive).sort((a, b) => {
        if (a.group !== b.group) return a.group.localeCompare(b.group);
        return a.name.localeCompare(b.name);
    });

    // 3. Prepare Grid Data
    // Row 1: Headers
    const headers = ['Nhóm', 'Công việc', ...dayHeaders];
    const dataRows: any[][] = [];

    activeJobs.forEach(job => {
        const row = [job.group, job.name];

        days.forEach(day => {
            // Find items for this job on this day
            const items = schedule.filter(s =>
                s.jobId === job.id &&
                isSameDay(new Date(s.date), day) &&
                s.status !== 'Cancelled'
            );

            if (items.length === 0) {
                row.push('');
            } else {
                // Combine names from all items in this slot (usually just 1 item, but supports multiple)
                const names = items.flatMap(item =>
                    item.employeeIds.map(empId => {
                        const emp = employees.find(e => e.id === empId);
                        return emp ? emp.fullName : 'Unknown';
                    })
                );
                row.push(names.join(', '));
            }
        });

        dataRows.push(row);
    });

    // 4. Create Sheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

    // 5. Formatting (Basic Column Widths)
    ws['!cols'] = [
        { wch: 15 }, // Group
        { wch: 30 }, // Job Name
        { wch: 20 }, // Mon
        { wch: 20 }, // Tue
        { wch: 20 }, // Wed
        { wch: 20 }, // Thu
        { wch: 20 }, // Fri
        { wch: 20 }, // Sat
        { wch: 20 }, // Sun
    ];

    // 6. Save File
    const fileName = `Lich_Tuan_${format(weekStart, 'yyyy-MM-dd')}.xlsx`;
    XLSX.utils.book_append_sheet(wb, ws, 'Lịch Tuần');
    XLSX.writeFile(wb, fileName);
};

export const exportScheduleData = (
    schedule: ScheduleItem[],
    jobs: Job[],
    employees: Employee[],
    startDate: string,
    endDate: string
) => {
    // 1. Prepare Data Rows
    const dataRows = schedule.map(item => {
        const job = jobs.find(j => j.id === item.jobId);
        const jobName = job ? job.name : 'Không xác định';

        const employeeNames = item.employeeIds.map(empId => {
            const emp = employees.find(e => e.id === empId);
            return emp ? emp.fullName : 'Unknown';
        }).join(', ');

        return {
            'Ngày': format(new Date(item.date), 'dd/MM/yyyy'),
            'Buổi': item.shift,
            'Tên công việc': jobName,
            'Người thực hiện': employeeNames
        };
    });

    // Sort by Date, then Shift, then JobName
    const shiftOrder = { 'Sáng': 1, 'Chiều': 2, 'Tối': 3 };
    dataRows.sort((a, b) => {
        const dateA = new Date(a['Ngày'].split('/').reverse().join('-')).getTime();
        const dateB = new Date(b['Ngày'].split('/').reverse().join('-')).getTime();
        if (dateA !== dateB) return dateA - dateB;
        
        const shiftA = shiftOrder[a['Buổi'] as keyof typeof shiftOrder] || 4;
        const shiftB = shiftOrder[b['Buổi'] as keyof typeof shiftOrder] || 4;
        if (shiftA !== shiftB) return shiftA - shiftB;

        return a['Tên công việc'].localeCompare(b['Tên công việc']);
    });

    // 2. Create Sheet
    const ws = XLSX.utils.json_to_sheet(dataRows);

    // 3. Formatting
    ws['!cols'] = [
        { wch: 15 }, // Ngày
        { wch: 10 }, // Buổi
        { wch: 40 }, // Tên công việc
        { wch: 50 }, // Người thực hiện
    ];

    // 4. Create Workbook & Save
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    
    const startStr = format(new Date(startDate), 'ddMMyy');
    const endStr = format(new Date(endDate), 'ddMMyy');
    const fileName = `Lich_Dieu_Phoi_${startStr}_${endStr}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
};
