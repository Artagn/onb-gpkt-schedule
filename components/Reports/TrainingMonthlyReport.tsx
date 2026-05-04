/**
 * TrainingMonthlyReport.tsx - Báo cáo Tổng hợp Đào tạo theo tháng
 * Uses shared filter from parent component
 */

import React, { useMemo } from 'react';
import { GraduationCap, Download, Loader2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { JobGroup } from '../../types';
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

interface SharedFilter {
    dateMode: 'single' | 'range' | 'custom';
    selectedMonth: string;
    selectedMonths: string[];
    fromDate: string;
    toDate: string;
    dateRange: { start: Date; end: Date };
}

interface TrainingMonthlyReportProps {
    hideExportButtons?: boolean;
    sharedFilter?: SharedFilter;
}

interface EmployeeRow {
    employeeId: string;
    employeeName: string;
    nghiepVu: number;
    linhVuc: number;
    noiBo: number;
    trucTiep: number;
    totalSessions: number;
    totalParticipants: number;
    totalSurveys: number;
    totalCapable: number;
}

export const TrainingMonthlyReport: React.FC<TrainingMonthlyReportProps> = ({ hideExportButtons, sharedFilter }) => {
    const { employees, jobs, schedule } = useData();

    // Use shared filter date range
    const dateRange = sharedFilter?.dateRange || {
        start: startOfMonth(new Date()),
        end: endOfMonth(new Date())
    };

    // Training jobs map
    const trainingJobs = useMemo(() => {
        const map = new Map<string, { name: string; classification: string | null }>();
        jobs.filter(j => j.group === JobGroup.Training && j.isActive)
            .forEach(j => map.set(j.id, { name: j.name, classification: j.classification || null }));
        return map;
    }, [jobs]);

    // Calculate row data for each employee
    const rowData: EmployeeRow[] = useMemo(() => {
        const empStats = new Map<string, EmployeeRow>();

        // Initialize stats for all employees
        employees.forEach(emp => {
            empStats.set(emp.id, {
                employeeId: emp.id,
                employeeName: emp.fullName,
                nghiepVu: 0,
                linhVuc: 0,
                noiBo: 0,
                trucTiep: 0,
                totalSessions: 0,
                totalParticipants: 0,
                totalSurveys: 0,
                totalCapable: 0,
            });
        });

        // Filter and aggregate training schedule items
        schedule.forEach(item => {
            const job = trainingJobs.get(item.jobId);
            if (!job) return; // Not a training job

            const itemDate = parseISO(item.date);
            if (!isWithinInterval(itemDate, dateRange)) return;

            // Only count completed/approved items
            if (item.status !== 'Completed' && item.status !== 'Approved') return;

            // Aggregate per employee
            item.employeeIds?.forEach(empId => {
                const stats = empStats.get(empId);
                if (!stats) return;

                stats.totalSessions++;
                stats.totalParticipants += item.customerParticipants || 0;
                stats.totalSurveys += item.customerSurveys || 0;
                stats.totalCapable += item.customerCapable || 0;

                // Count by classification
                switch (job.classification) {
                    case 'Nghiệp vụ': stats.nghiepVu++; break;
                    case 'Lĩnh vực': stats.linhVuc++; break;
                    case 'Nội bộ': stats.noiBo++; break;
                    case 'Trực tiếp': stats.trucTiep++; break;
                }
            });
        });

        // Filter employees with any training activity
        return Array.from(empStats.values())
            .filter(r => r.totalSessions > 0)
            .sort((a, b) => b.totalSessions - a.totalSessions);
    }, [employees, schedule, trainingJobs, dateRange]);

    // Summary stats
    const summaryStats = useMemo(() => ({
        totalEmployees: rowData.length,
        totalSessions: rowData.reduce((s, r) => s + r.totalSessions, 0),
        totalParticipants: rowData.reduce((s, r) => s + r.totalParticipants, 0),
        totalCapable: rowData.reduce((s, r) => s + r.totalCapable, 0),
        avgRatio: rowData.reduce((s, r) => s + r.totalParticipants, 0) > 0
            ? (rowData.reduce((s, r) => s + r.totalCapable, 0) / rowData.reduce((s, r) => s + r.totalParticipants, 0) * 100)
            : 0
    }), [rowData]);

    // Export to Excel
    const handleExport = () => {
        if (rowData.length === 0) {
            toast.error('Không có dữ liệu để xuất');
            return;
        }

        const exportData = rowData.map((row, idx) => ({
            'STT': idx + 1,
            'Nhân viên': row.employeeName,
            'Nghiệp vụ': row.nghiepVu,
            'Lĩnh vực': row.linhVuc,
            'Nội bộ': row.noiBo,
            'Trực tiếp': row.trucTiep,
            'Tổng buổi': row.totalSessions,
            'Tổng KH Tham gia': row.totalParticipants,
            'Tổng KH Khảo sát': row.totalSurveys,
            'Tổng KH Biết SD': row.totalCapable,
            'Tỷ lệ (%)': row.totalParticipants > 0
                ? ((row.totalCapable / row.totalParticipants) * 100).toFixed(1) + '%'
                : '0%',
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'TongHopDaoTao');

        const dateLabel = sharedFilter?.dateMode === 'single'
            ? sharedFilter.selectedMonth
            : format(dateRange.start, 'MM-yyyy') + '_' + format(dateRange.end, 'MM-yyyy');
        const fileName = `TongHop_DaoTao_${dateLabel}.xlsx`;
        XLSX.writeFile(wb, fileName);
        toast.success(`Đã xuất ${fileName}`);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-teal-600" />
                    <h3 className="text-lg font-bold text-gray-800">Tổng hợp Đào tạo theo tháng</h3>
                </div>

                {/* Export Button */}
                {!hideExportButtons && (
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                    >
                        <Download className="w-4 h-4" />
                        Xuất Excel
                    </button>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
                    <div className="text-sm font-semibold text-teal-800 uppercase">NV đào tạo</div>
                    <div className="text-3xl font-bold text-gray-800 mt-1">{summaryStats.totalEmployees}</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-sm font-semibold text-blue-800 uppercase">Tổng buổi</div>
                    <div className="text-3xl font-bold text-gray-800 mt-1">{summaryStats.totalSessions}</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <div className="text-sm font-semibold text-purple-800 uppercase">KH Tham gia</div>
                    <div className="text-3xl font-bold text-gray-800 mt-1">{summaryStats.totalParticipants}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="text-sm font-semibold text-green-800 uppercase">KH Biết SD</div>
                    <div className="text-3xl font-bold text-gray-800 mt-1">{summaryStats.totalCapable}</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <div className="text-sm font-semibold text-orange-800 uppercase">Tỷ lệ TB</div>
                    <div className="text-3xl font-bold text-gray-800 mt-1">{summaryStats.avgRatio.toFixed(1)}%</div>
                </div>
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-hidden">
                <div className="overflow-y-auto overflow-x-auto">
                    <table className="w-full text-xs border-collapse min-w-[900px]">
                        <thead className="bg-teal-100 sticky top-0 z-10">
                            <tr>
                                <th className="border p-2 text-left font-bold text-teal-800 sticky left-0 bg-teal-100 z-20 min-w-[150px]">Nhân viên</th>
                                <th className="border p-2 text-center font-bold text-blue-700 bg-blue-50 w-20">Nghiệp vụ</th>
                                <th className="border p-2 text-center font-bold text-purple-700 bg-purple-50 w-20">Lĩnh vực</th>
                                <th className="border p-2 text-center font-bold text-amber-700 bg-amber-50 w-20">Nội bộ</th>
                                <th className="border p-2 text-center font-bold text-pink-700 bg-pink-50 w-20">Trực tiếp</th>
                                <th className="border p-2 text-center font-bold text-gray-800 bg-gray-100 w-20">Tổng buổi</th>
                                <th className="border p-2 text-center font-bold text-indigo-700 bg-indigo-50 w-24">KH Tham gia</th>
                                <th className="border p-2 text-center font-bold text-orange-700 bg-orange-50 w-24">KH Khảo sát</th>
                                <th className="border p-2 text-center font-bold text-green-700 bg-green-50 w-24">KH Biết SD</th>
                                <th className="border p-2 text-center font-bold text-teal-800 bg-teal-100 w-20">Tỷ lệ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rowData.map((row, idx) => {
                                const ratio = row.totalParticipants > 0
                                    ? (row.totalCapable / row.totalParticipants * 100)
                                    : 0;
                                return (
                                    <tr key={row.employeeId} className={`hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                        <td className={`border p-2 font-medium sticky left-0 z-10 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-400 text-[10px]">{idx + 1}</span>
                                                {row.employeeName}
                                            </div>
                                        </td>
                                        <td className="border p-2 text-center">{row.nghiepVu || <span className="text-gray-300">-</span>}</td>
                                        <td className="border p-2 text-center">{row.linhVuc || <span className="text-gray-300">-</span>}</td>
                                        <td className="border p-2 text-center">{row.noiBo || <span className="text-gray-300">-</span>}</td>
                                        <td className="border p-2 text-center">{row.trucTiep || <span className="text-gray-300">-</span>}</td>
                                        <td className="border p-2 text-center font-bold text-gray-800">{row.totalSessions}</td>
                                        <td className="border p-2 text-center text-indigo-700">{row.totalParticipants}</td>
                                        <td className="border p-2 text-center text-orange-700">{row.totalSurveys}</td>
                                        <td className="border p-2 text-center text-green-700 font-medium">{row.totalCapable}</td>
                                        <td className={`border p-2 text-center font-bold ${ratio >= 80 ? 'text-green-700 bg-green-50' : ratio >= 50 ? 'text-yellow-700 bg-yellow-50' : 'text-red-700 bg-red-50'}`}>
                                            {ratio.toFixed(1)}%
                                        </td>
                                    </tr>
                                );
                            })}
                            {rowData.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="border p-8 text-center text-gray-500">
                                        Không có dữ liệu đào tạo trong khoảng thời gian này
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {rowData.length > 0 && (
                            <tfoot className="bg-teal-200 font-bold">
                                <tr>
                                    <td className="border p-2 sticky left-0 bg-teal-200 z-10">TỔNG</td>
                                    <td className="border p-2 text-center">{rowData.reduce((s, r) => s + r.nghiepVu, 0)}</td>
                                    <td className="border p-2 text-center">{rowData.reduce((s, r) => s + r.linhVuc, 0)}</td>
                                    <td className="border p-2 text-center">{rowData.reduce((s, r) => s + r.noiBo, 0)}</td>
                                    <td className="border p-2 text-center">{rowData.reduce((s, r) => s + r.trucTiep, 0)}</td>
                                    <td className="border p-2 text-center">{summaryStats.totalSessions}</td>
                                    <td className="border p-2 text-center">{summaryStats.totalParticipants}</td>
                                    <td className="border p-2 text-center">{rowData.reduce((s, r) => s + r.totalSurveys, 0)}</td>
                                    <td className="border p-2 text-center">{summaryStats.totalCapable}</td>
                                    <td className="border p-2 text-center">{summaryStats.avgRatio.toFixed(1)}%</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* Legend */}
            <p className="text-xs text-gray-500">
                📊 Thống kê số buổi đào tạo theo phân loại công việc. Tỷ lệ = KH Biết sử dụng / KH Tham gia × 100%
            </p>
        </div>
    );
};

export default TrainingMonthlyReport;
