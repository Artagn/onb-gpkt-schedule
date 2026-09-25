import * as XLSX from 'xlsx';
import { Employee, Job, ScheduleItem, LeaveRequest, Status } from '../types';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { sanitizeExcelValue } from '../utils/evaluationHelpers';
import { JOB_IDS } from '../constants';

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
        const row = [sanitizeExcelValue(job.group), sanitizeExcelValue(job.name)];

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
                row.push(sanitizeExcelValue(names.join(', ')));
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
            'Buổi': sanitizeExcelValue(item.shift),
            'Tên công việc': sanitizeExcelValue(jobName),
            'Người thực hiện': sanitizeExcelValue(employeeNames)
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

/**
 * Xuất danh sách nhân viên đang hoạt động có ít nhất 1 buổi trống lịch trong ngày được chọn.
 * Buổi trống hiện "Rảnh"; buổi đã có việc/nghỉ phép hiện đúng tên công việc hoặc "Nghỉ phép"
 * thay vì chỉ ghi chung chung "Bận".
 */
export const exportFreeEmployeesByDate = (
    employees: Employee[],
    jobs: Job[],
    schedule: ScheduleItem[],
    leaves: LeaveRequest[],
    dateStr: string
): number => {
    const shifts: Array<'Sáng' | 'Chiều' | 'Tối'> = ['Sáng', 'Chiều', 'Tối'];

    // Gom tên công việc theo "empId_shift" từ lịch cố định trong ngày được chọn
    const jobNamesMap = new Map<string, string[]>();
    schedule.forEach(s => {
        if (s.status !== 'Cancelled' && s.date === dateStr) {
            const jobName = s.jobId === JOB_IDS.COMPENSATORY_LEAVE
                ? 'Nghỉ bù'
                : (jobs.find(j => j.id === s.jobId)?.name || 'Không xác định');
            s.employeeIds.forEach(empId => {
                const key = `${empId}_${s.shift}`;
                const list = jobNamesMap.get(key) || [];
                list.push(jobName);
                jobNamesMap.set(key, list);
            });
        }
    });

    // Set các cặp "empId_shift" đang nghỉ phép trong ngày được chọn
    const leaveSet = new Set<string>();
    leaves.forEach(l => {
        if ((l.status === 'Approved' || l.status === 'Pending') && l.date === dateStr) {
            leaveSet.add(`${l.employeeId}_${l.shift}`);
        }
    });

    const getShiftLabel = (empId: string, shift: string): string => {
        const key = `${empId}_${shift}`;
        const jobNames = jobNamesMap.get(key);
        if (jobNames && jobNames.length > 0) return jobNames.join(', ');
        if (leaveSet.has(key)) return 'Nghỉ phép';
        return 'Rảnh';
    };

    const activeEmployees = employees
        .filter(e => e.status === Status.Active)
        .sort((a, b) => (a.stt || 9999) - (b.stt || 9999));

    const dataRows = activeEmployees
        .map(emp => {
            const shiftStatus = shifts.map(shift => getShiftLabel(emp.id, shift));
            const freeCount = shiftStatus.filter(s => s === 'Rảnh').length;
            return { emp, shiftStatus, freeCount };
        })
        // Chỉ giữ nhân viên có ít nhất 1 buổi trống - "trống lịch" nghĩa là còn buổi để nhận việc
        .filter(({ freeCount }) => freeCount > 0)
        .map(({ emp, shiftStatus }) => ({
            'STT': emp.stt,
            'Họ và tên': sanitizeExcelValue(emp.fullName),
            'Email': sanitizeExcelValue(emp.email),
            'Hạng': sanitizeExcelValue(emp.rank),
            'Nhóm công việc': sanitizeExcelValue(emp.jobGroups.join(', ')),
            'Sáng': shiftStatus[0],
            'Chiều': shiftStatus[1],
            'Tối': shiftStatus[2],
        }));

    if (dataRows.length === 0) return 0;

    const ws = XLSX.utils.json_to_sheet(dataRows);
    ws['!cols'] = [
        { wch: 6 },  // STT
        { wch: 25 }, // Họ và tên
        { wch: 28 }, // Email
        { wch: 12 }, // Hạng
        { wch: 30 }, // Nhóm công việc
        { wch: 22 }, // Sáng
        { wch: 22 }, // Chiều
        { wch: 22 }, // Tối
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Trống lịch');

    const dateFileStr = format(parseISO(dateStr), 'ddMMyyyy');
    const fileName = `Trong_Lich_${dateFileStr}.xlsx`;
    XLSX.writeFile(wb, fileName);

    return dataRows.length;
};
