
import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { cleanupService } from '../../services/cleanupService';
import { COLLECTIONS } from '../../constants';
import { AlertTriangle, Search, Trash2, CheckCircle, Database, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { SCHEDULE_KEYS } from '../../hooks/useSchedulesQuery';
import { LEAVE_KEYS } from '../../hooks/useLeavesQuery';
import { ALLOCATION_KEYS } from '../../hooks/useAllocationsQuery';

interface OrphanedItem {
    id: string;
    collection: string;
    reason: string;
    date?: string;
    details?: string;
}

interface IntegrityReport {
    orphanedSchedules: OrphanedItem[];
    orphanedAllocations: OrphanedItem[];
    orphanedLeaves: OrphanedItem[];
    totalOrphaned: number;
    scannedAt: Date;
}

const DataIntegrityChecker: React.FC = () => {
    const queryClient = useQueryClient();
    const { employees, jobs, schedule, dailyAllocations, leaves } = useData();

    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<IntegrityReport | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [deleting, setDeleting] = useState(false);

    // Build lookup sets for quick checking
    const employeeIds = new Set(employees.map(e => e.id));
    const jobIds = new Set(jobs.map(j => j.id));

    const runIntegrityCheck = () => {
        setLoading(true);
        setReport(null);
        setSelectedIds(new Set());

        try {
            const orphanedSchedules: OrphanedItem[] = [];
            const orphanedAllocations: OrphanedItem[] = [];
            const orphanedLeaves: OrphanedItem[] = [];

            // Check Schedule items
            schedule.forEach(item => {
                const reasons: string[] = [];
                // ScheduleItem has employeeIds (array)
                if (item.employeeIds) {
                    const invalidEmps = item.employeeIds.filter((id: string) => !employeeIds.has(id));
                    if (invalidEmps.length > 0) {
                        reasons.push(`Nhân viên không tồn tại: ${invalidEmps.join(', ')}`);
                    }
                }
                if (item.jobId && !jobIds.has(item.jobId)) {
                    reasons.push(`Công việc không tồn tại: ${item.jobId}`);
                }
                if (reasons.length > 0) {
                    orphanedSchedules.push({
                        id: item.id,
                        collection: COLLECTIONS.SCHEDULE,
                        reason: reasons.join('; '),
                        date: item.date,
                        details: `Ca: ${item.shift}`
                    });
                }
            });

            // Check Allocations
            dailyAllocations.forEach(alloc => {
                const reasons: string[] = [];
                // DailyAllocation has employeeId (single string)
                if (alloc.employeeId && !employeeIds.has(alloc.employeeId)) {
                    reasons.push(`NV không tồn tại: ${alloc.employeeId}`);
                }
                if (alloc.jobId && !jobIds.has(alloc.jobId)) {
                    reasons.push(`Công việc không tồn tại: ${alloc.jobId}`);
                }
                if (reasons.length > 0) {
                    orphanedAllocations.push({
                        id: alloc.id,
                        collection: COLLECTIONS.ALLOCATIONS,
                        reason: reasons.join('; '),
                        date: alloc.date,
                        details: `NV: ${alloc.employeeId}`
                    });
                }
            });

            // Check Leaves
            leaves.forEach(leave => {
                const reasons: string[] = [];
                // LeaveRequest has employeeId
                if (leave.employeeId && !employeeIds.has(leave.employeeId)) {
                    reasons.push(`Nhân viên không tồn tại: ${leave.employeeId}`);
                }
                if (reasons.length > 0) {
                    orphanedLeaves.push({
                        id: leave.id,
                        collection: COLLECTIONS.LEAVES,
                        reason: reasons.join('; '),
                        date: leave.date,
                        details: `Trạng thái: ${leave.status}`
                    });
                }
            });

            const totalOrphaned = orphanedSchedules.length + orphanedAllocations.length + orphanedLeaves.length;

            setReport({
                orphanedSchedules,
                orphanedAllocations,
                orphanedLeaves,
                totalOrphaned,
                scannedAt: new Date()
            });

            if (totalOrphaned === 0) {
                toast.success('Dữ liệu hoàn toàn sạch! Không có bản ghi mồ côi.');
            } else {
                toast(`Tìm thấy ${totalOrphaned} bản ghi mồ côi.`, { icon: '⚠️' });
            }
        } catch (error) {
            console.error(error);
            toast.error('Lỗi khi kiểm tra dữ liệu.');
        } finally {
            setLoading(false);
        }
    };

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const selectAll = () => {
        if (!report) return;
        const allIds = [
            ...report.orphanedSchedules.map(i => i.id),
            ...report.orphanedAllocations.map(i => i.id),
            ...report.orphanedLeaves.map(i => i.id)
        ];
        setSelectedIds(new Set(allIds));
    };

    const handleDelete = async () => {
        if (selectedIds.size === 0) return;

        const confirmKey = prompt(`CẢNH BÁO: Bạn sắp xóa ${selectedIds.size} bản ghi mồ côi.\nNhập "XOA" để xác nhận:`);
        if (confirmKey !== 'XOA') return;

        setDeleting(true);
        try {
            // Group by collection
            const scheduleIds = report?.orphanedSchedules.filter(i => selectedIds.has(i.id)).map(i => i.id) || [];
            const allocIds = report?.orphanedAllocations.filter(i => selectedIds.has(i.id)).map(i => i.id) || [];
            const leaveIds = report?.orphanedLeaves.filter(i => selectedIds.has(i.id)).map(i => i.id) || [];

            if (scheduleIds.length > 0) {
                await cleanupService.deleteBatch(COLLECTIONS.SCHEDULE, scheduleIds, 'INTEGRITY_CLEANUP');
                queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.all });
            }
            if (allocIds.length > 0) {
                await cleanupService.deleteBatch(COLLECTIONS.ALLOCATIONS, allocIds, 'INTEGRITY_CLEANUP');
                queryClient.invalidateQueries({ queryKey: ALLOCATION_KEYS.all });
            }
            if (leaveIds.length > 0) {
                await cleanupService.deleteBatch(COLLECTIONS.LEAVES, leaveIds, 'INTEGRITY_CLEANUP');
                queryClient.invalidateQueries({ queryKey: LEAVE_KEYS.all });
            }

            toast.success(`Đã xóa ${selectedIds.size} bản ghi mồ côi!`);
            setSelectedIds(new Set());
            // Re-run check
            setTimeout(() => runIntegrityCheck(), 1000);
        } catch (error) {
            console.error(error);
            toast.error('Lỗi khi xóa dữ liệu.');
        } finally {
            setDeleting(false);
        }
    };

    const renderOrphanedTable = (items: OrphanedItem[], title: string) => {
        if (items.length === 0) return null;
        return (
            <div className="mb-4">
                <h4 className="font-bold text-sm text-gray-700 mb-2 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-1 text-amber-500" />
                    {title} ({items.length})
                </h4>
                <div className="border rounded overflow-auto max-h-48">
                    <table className="min-w-full text-xs">
                        <thead className="bg-gray-100 sticky top-0">
                            <tr>
                                <th className="px-2 py-1 w-8"></th>
                                <th className="px-2 py-1 text-left">Ngày</th>
                                <th className="px-2 py-1 text-left">Chi tiết</th>
                                <th className="px-2 py-1 text-left">Lý do mồ côi</th>
                                <th className="px-2 py-1 text-left text-gray-400">ID</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {items.map(item => (
                                <tr key={item.id} className={selectedIds.has(item.id) ? 'bg-red-50' : 'hover:bg-gray-50'}>
                                    <td className="px-2 py-1 text-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(item.id)}
                                            onChange={() => toggleSelect(item.id)}
                                        />
                                    </td>
                                    <td className="px-2 py-1">{item.date || '-'}</td>
                                    <td className="px-2 py-1">{item.details || '-'}</td>
                                    <td className="px-2 py-1 text-amber-700">{item.reason}</td>
                                    <td className="px-2 py-1 text-gray-400 font-mono">{item.id.substring(0, 12)}...</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white rounded shadow p-4 space-y-4">
            <h2 className="text-xl font-bold flex items-center text-gray-800">
                <Database className="w-6 h-6 mr-2 text-indigo-600" />
                Kiểm tra Toàn vẹn Dữ liệu
            </h2>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-3 text-sm text-blue-800">
                <strong>Công cụ này sẽ:</strong> Tìm các bản ghi tham chiếu đến nhân viên hoặc công việc đã bị xóa (dữ liệu mồ côi).
                <br />
                <span className="text-xs text-blue-600">Lưu ý: Mỗi lần chạy sẽ đọc ~2000-4000 documents. Nên chạy tối đa 1 lần/tuần.</span>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={runIntegrityCheck}
                    disabled={loading}
                    className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 font-bold flex items-center disabled:opacity-50"
                >
                    {loading ? (
                        <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Đang quét...</>
                    ) : (
                        <><Search className="w-4 h-4 mr-2" /> Kiểm tra Toàn bộ</>
                    )}
                </button>

                {report && report.totalOrphaned > 0 && (
                    <>
                        <button
                            onClick={selectAll}
                            className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 font-medium text-sm"
                        >
                            Chọn tất cả ({report.totalOrphaned})
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={selectedIds.size === 0 || deleting}
                            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 font-bold flex items-center disabled:opacity-50"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {deleting ? 'Đang xóa...' : `Xóa ${selectedIds.size} mục`}
                        </button>
                    </>
                )}
            </div>

            {/* Results */}
            {report && (
                <div className="mt-4">
                    {report.totalOrphaned === 0 ? (
                        <div className="bg-green-50 border border-green-200 rounded p-6 text-center">
                            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                            <div className="text-lg font-bold text-green-700">Dữ liệu hoàn toàn sạch!</div>
                            <div className="text-sm text-green-600">Không tìm thấy bản ghi mồ côi nào.</div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="text-sm text-gray-600 mb-2">
                                Quét lúc: {report.scannedAt.toLocaleTimeString('vi-VN')} —
                                Tổng: <strong className="text-red-600">{report.totalOrphaned}</strong> bản ghi mồ côi
                            </div>
                            {renderOrphanedTable(report.orphanedSchedules, 'Lịch tuần mồ côi')}
                            {renderOrphanedTable(report.orphanedAllocations, 'Phân công ngày mồ côi')}
                            {renderOrphanedTable(report.orphanedLeaves, 'Đơn nghỉ phép mồ côi')}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DataIntegrityChecker;
