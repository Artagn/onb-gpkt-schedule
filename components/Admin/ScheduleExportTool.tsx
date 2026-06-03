import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useSchedulesQuery } from '../../hooks/useSchedulesQuery';
import { exportScheduleData } from '../../services/excelExportService';
import { Download, Filter, Calendar, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';

const ScheduleExportTool: React.FC = () => {
    const { jobs, employees } = useData();
    const [fromDate, setFromDate] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [toDate, setToDate] = useState(() => format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
    const [showJobDropdown, setShowJobDropdown] = useState(false);

    // Fetch schedules based on date range
    const { data: scheduleData = [], isFetching } = useSchedulesQuery(true, { 
        startDate: fromDate, 
        endDate: toDate 
    });

    const activeJobs = useMemo(() => jobs.filter(j => j.isActive), [jobs]);

    const toggleAllJobs = (select: boolean) => {
        if (select) {
            setSelectedJobIds(activeJobs.map(j => j.id));
        } else {
            setSelectedJobIds([]);
        }
    };

    const toggleJob = (id: string) => {
        setSelectedJobIds(prev =>
            prev.includes(id) ? prev.filter(jobId => jobId !== id) : [...prev, id]
        );
    };

    const filteredSchedule = useMemo(() => {
        if (!scheduleData.length) return [];
        if (selectedJobIds.length === 0) return []; // Require at least one job selected to show data

        return scheduleData.filter(s => 
            selectedJobIds.includes(s.jobId) && 
            s.status !== 'Cancelled'
        );
    }, [scheduleData, selectedJobIds]);

    const handleExport = () => {
        if (filteredSchedule.length === 0) return;
        exportScheduleData(filteredSchedule, jobs, employees, fromDate, toDate);
    };

    // Sort matching data for display
    const displayData = useMemo(() => {
        const sorted = [...filteredSchedule];
        const shiftOrder = { 'Sáng': 1, 'Chiều': 2, 'Tối': 3 };
        return sorted.sort((a, b) => {
            const comp = a.date.localeCompare(b.date);
            if (comp !== 0) return comp;
            
            const shiftA = shiftOrder[a.shift as keyof typeof shiftOrder] || 4;
            const shiftB = shiftOrder[b.shift as keyof typeof shiftOrder] || 4;
            if (shiftA !== shiftB) return shiftA - shiftB;

            return a.jobId.localeCompare(b.jobId);
        });
    }, [filteredSchedule]);

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b">
                <h3 className="text-lg font-semibold text-gray-800">Xuất Dữ Liệu Lịch Điều Phối</h3>
                <p className="text-sm text-gray-500 mt-1">Lọc và xuất dữ liệu phân công công việc chi tiết theo từng nhân viên.</p>
            </div>

            <div className="p-4 flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Date Filters */}
                    <div className="flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-1.5">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-600">Từ</span>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="text-sm bg-transparent outline-none cursor-pointer"
                        />
                        <span className="text-sm font-medium text-gray-600 px-1">-</span>
                        <span className="text-sm font-medium text-gray-600">Đến</span>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="text-sm bg-transparent outline-none cursor-pointer"
                        />
                    </div>

                    {/* Job Multi-Select */}
                    <div className="relative">
                        <button
                            onClick={() => setShowJobDropdown(!showJobDropdown)}
                            className="flex items-center gap-2 border rounded-lg px-3 py-2 text-sm bg-white hover:bg-gray-50 transition-colors"
                        >
                            <Filter className="w-4 h-4 text-gray-500" />
                            <span className="font-medium text-gray-700">
                                {selectedJobIds.length === 0 
                                    ? 'Chọn công việc' 
                                    : selectedJobIds.length === activeJobs.length 
                                        ? 'Tất cả công việc' 
                                        : `${selectedJobIds.length} công việc`}
                            </span>
                        </button>

                        {showJobDropdown && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowJobDropdown(false)}></div>
                                <div className="absolute top-full left-0 mt-1 w-72 bg-white border rounded-lg shadow-xl z-50 p-2 max-h-80 flex flex-col">
                                    <div className="text-xs font-bold text-gray-500 uppercase px-2 mb-2">Lọc Công Việc</div>
                                    <div className="flex gap-2 mb-2 border-b pb-2">
                                        <button onClick={() => toggleAllJobs(true)} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 flex-1">Chọn tất cả</button>
                                        <button onClick={() => toggleAllJobs(false)} className="text-xs bg-gray-50 text-gray-700 px-2 py-1 rounded hover:bg-gray-100 flex-1">Bỏ chọn</button>
                                    </div>
                                    <div className="overflow-y-auto space-y-0.5 pr-1">
                                        {activeJobs.map(job => (
                                            <label key={job.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300 text-blue-600 flex-shrink-0"
                                                    checked={selectedJobIds.includes(job.id)}
                                                    onChange={() => toggleJob(job.id)}
                                                />
                                                <span className="text-sm text-gray-700 leading-tight">{job.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex-1"></div>

                    {/* Export Button */}
                    <button
                        onClick={handleExport}
                        disabled={filteredSchedule.length === 0 || isFetching}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                        {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Xuất Excel
                    </button>
                </div>
            </div>

            {/* Preview Table */}
            <div className="p-4 border-t bg-gray-50">
                <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-semibold text-gray-600 uppercase">Xem trước dữ liệu</h4>
                    <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                        {displayData.length} kết quả
                    </span>
                </div>

                {isFetching ? (
                    <div className="flex justify-center items-center py-10 bg-white rounded-lg border border-dashed">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
                        <span className="text-sm text-gray-500">Đang tải dữ liệu lịch...</span>
                    </div>
                ) : displayData.length > 0 ? (
                    <div className="bg-white border rounded-lg max-h-96 overflow-y-auto w-full shadow-inner">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-slate-700 border-b w-32">Ngày</th>
                                    <th className="px-4 py-3 font-semibold text-slate-700 border-b w-24">Buổi</th>
                                    <th className="px-4 py-3 font-semibold text-slate-700 border-b">Tên công việc</th>
                                    <th className="px-4 py-3 font-semibold text-slate-700 border-b">Người thực hiện</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y text-slate-600">
                                {displayData.slice(0, 100).map((item) => {
                                    const job = jobs.find(j => j.id === item.jobId);
                                    const employeeNames = item.employeeIds.map(empId => {
                                        return employees.find(e => e.id === empId)?.fullName || 'N/A';
                                    }).join(', ');
                                    
                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-2">{format(parseISO(item.date), 'dd/MM/yyyy')}</td>
                                            <td className="px-4 py-2">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                    item.shift === 'Sáng' ? 'bg-amber-100 text-amber-800' :
                                                    item.shift === 'Chiều' ? 'bg-sky-100 text-sky-800' : 
                                                    'bg-indigo-100 text-indigo-800'
                                                }`}>
                                                    {item.shift}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 whitespace-normal">{job?.name || item.jobId}</td>
                                            <td className="px-4 py-2 whitespace-normal">{employeeNames}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {displayData.length > 100 && (
                            <div className="text-center py-2 text-xs text-gray-500 bg-gray-50 border-t sticky bottom-0">
                                Hiển thị 100/{displayData.length} kết quả. Tải xuống Excel để xem toàn bộ.
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                            <Filter className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium">Không có dữ liệu</p>
                        <p className="text-gray-400 text-sm mt-1">Vui lòng chọn công việc hoặc thay đổi thời gian</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScheduleExportTool;
