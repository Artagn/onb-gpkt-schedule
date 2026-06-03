
import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { cleanupService } from '../../services/cleanupService';
import { COLLECTIONS } from '../../constants';
import { Trash2, Search, CheckSquare, Square, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { SCHEDULE_KEYS } from '../../hooks/useSchedulesQuery';
import { LEAVE_KEYS } from '../../hooks/useLeavesQuery';
import { ALLOCATION_KEYS } from '../../hooks/useAllocationsQuery';
import { LEAVE_BALANCE_KEYS } from '../../hooks/useLeaveBalanceQuery';
import { getFunctions, httpsCallable } from 'firebase/functions';

import toast from 'react-hot-toast';

interface Props {
    currentUserRole: string; // Ensure only Admin
}

const CleanupManager: React.FC<Props> = ({ currentUserRole }) => {
    // --- STATE ---
    const queryClient = useQueryClient();
    const { employees, jobs } = useData();

    // Filters - Separate dropdowns
    const [dataType, setDataType] = useState<string>(COLLECTIONS.SCHEDULE);
    const [jobId, setJobId] = useState<string>('all');
    const [selectedEmpId, setSelectedEmpId] = useState<string>('all');
    const [fromDate, setFromDate] = useState(format(new Date(), 'yyyy-MM-01'));
    const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [keyword, setKeyword] = useState('');

    // Data
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [recalculating, setRecalculating] = useState(false);
    const [recalcResult, setRecalcResult] = useState<any>(null);
    const [migrating, setMigrating] = useState(false);
    const [migrationResult, setMigrationResult] = useState<any>(null);

    // Show job filter only for schedule collection
    const showJobFilter = dataType === COLLECTIONS.SCHEDULE;

    // --- HANDLERS ---
    const handleSearch = async () => {
        setLoading(true);
        setSelectedIds(new Set()); // Reset selection
        try {
            const data = await cleanupService.queryForCleanup(dataType, {
                fromDate,
                toDate,
                employeeId: selectedEmpId,
                keyword,
                jobId: showJobFilter && jobId !== 'all' ? jobId : undefined
            });

            setItems(data);
            if (data.length === 0) toast("Không tìm thấy dữ liệu phù hợp.");
        } catch (error) {
            console.error(error);
            toast.error("Lỗi khi tải dữ liệu.");
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

    const toggleSelectAll = () => {
        if (selectedIds.size === items.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(items.map(i => i.id)));
        }
    };

    const handleDelete = async () => {
        if (selectedIds.size === 0) return;

        const confirmKey = prompt(`CẢNH BÁO: Bạn sắp xóa vĩnh viễn ${selectedIds.size} bản ghi.\nNhập "DELETE" để xác nhận:`);
        if (confirmKey !== 'DELETE') return;

        setLoading(true);
        try {
            await cleanupService.deleteBatch(dataType, Array.from(selectedIds), 'ADMIN_TOOL');
            toast.success(`Đã xóa ${selectedIds.size} bản ghi!`);

            // Invalidate Queries
            if (dataType === COLLECTIONS.SCHEDULE) {
                queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.all });
            } else if (dataType === COLLECTIONS.LEAVES) {
                queryClient.invalidateQueries({ queryKey: LEAVE_KEYS.all });
            } else if (dataType === COLLECTIONS.ALLOCATIONS) {
                queryClient.invalidateQueries({ queryKey: ALLOCATION_KEYS.all });
            }

            handleSearch(); // Refresh
        } catch (error) {
            console.error(error);
            toast.error("Lỗi khi xóa dữ liệu.");
        } finally {
            setLoading(false);
        }
    };

    const handleRecalculateBalance = async () => {
        if (!window.confirm('Bạn có chắc muốn tính lại số ngày nghỉ bù cho TẤT CẢ nhân viên?\n\nQuá trình này sẽ:\n- Quét tất cả lịch làm việc T7/CN/Lễ đã hoàn thành\n- Trừ đi số ngày nghỉ bù đã sử dụng\n- Cập nhật lại balance chính xác')) {
            return;
        }

        setRecalculating(true);
        setRecalcResult(null);
        try {
            const functions = getFunctions();
            const recalcFn = httpsCallable(functions, 'recalculateAllBalances');
            const result = await recalcFn();

            setRecalcResult(result.data);
            toast.success('Đã tính lại balance thành công!');

            // Invalidate all leave balance queries
            queryClient.invalidateQueries({ queryKey: ['leave_balance'] });
        } catch (error) {
            console.error(error);
            toast.error('Lỗi khi tính lại balance. Xem console để biết chi tiết.');
        } finally {
            setRecalculating(false);
        }
    };

    const handleRunMigration = async () => {
        if (!window.confirm('CẢNH BÁO: Bạn có chắc chắn muốn chạy script Migration v4.1.0?\n\nQuá trình này sẽ:\n1. Đồng bộ hóa vai trò của tất cả nhân sự sang bảng tra cứu user_roles.\n2. Quét và chuẩn hóa toàn bộ ngày dạng ISO (chứa chữ "T") trong schedule, leaves, allocations thành định dạng "yyyy-MM-dd".\n\nĐây là bước bắt buộc chuẩn bị cho việc siết Rules bảo mật.')) {
            return;
        }

        setMigrating(true);
        setMigrationResult(null);
        try {
            const functions = getFunctions();
            const migrationFn = httpsCallable(functions, 'runDataMigration');
            const result = await migrationFn();

            setMigrationResult(result.data as any);
            toast.success('Đã chạy Migration v4.1.0 thành công!');
            
            // Invalidate relevant queries
            queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.all });
            queryClient.invalidateQueries({ queryKey: LEAVE_KEYS.all });
            queryClient.invalidateQueries({ queryKey: ALLOCATION_KEYS.all });
        } catch (error: any) {
            console.error(error);
            toast.error(`Lỗi chạy Migration: ${error.message || error}`);
        } finally {
            setMigrating(false);
        }
    };

    return (
        <div className="bg-white rounded shadow p-4 space-y-4">
            <h2 className="text-xl font-bold flex items-center text-gray-800">
                <Trash2 className="w-6 h-6 mr-2 text-red-600" />
                Công cụ Dọn dẹp Dữ liệu
            </h2>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 text-sm text-yellow-800">
                <strong>Cảnh báo:</strong> Công cụ này cho phép xóa vĩnh viễn dữ liệu. Hãy cẩn trọng kiểm tra trước khi xóa.
            </div>

            {/* RECALCULATE BALANCE SECTION */}
            <div className="bg-blue-50 border rounded p-4">
                <h3 className="text-lg font-bold text-blue-800 flex items-center mb-2">
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Tính lại Số ngày Nghỉ bù
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                    Công cụ này sẽ tính lại balance nghỉ bù T7/CN cho tất cả nhân viên dựa trên:
                    <br />• Số buổi làm việc T7/CN/Lễ đã hoàn thành (Completed)
                    <br />• Trừ đi số đơn nghỉ bù đã duyệt (Approved + leaveType=Compensatory)
                </p>
                <button
                    onClick={handleRecalculateBalance}
                    disabled={recalculating}
                    className="btn-primary disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
                    {recalculating ? 'Đang tính...' : 'Tính lại Balance'}
                </button>

                {recalcResult && (
                    <div className="mt-4 bg-green-50 border border-green-200 rounded p-3">
                        <div className="font-bold text-green-800 mb-2">✅ {recalcResult.message}</div>
                        <div className="max-h-48 overflow-y-auto text-xs">
                            <table className="w-full">
                                <thead className="bg-green-100">
                                    <tr>
                                        <th className="px-2 py-1 text-left">Nhân viên</th>
                                        <th className="px-2 py-1 text-center">Tích lũy</th>
                                        <th className="px-2 py-1 text-center">Đã dùng</th>
                                        <th className="px-2 py-1 text-center">Khả dụng</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recalcResult.results?.map((r: any) => {
                                        const emp = employees.find(e => e.id === r.employeeId);
                                        return (
                                            <tr key={r.employeeId} className="border-t">
                                                <td className="px-2 py-1">{emp?.fullName || r.employeeId}</td>
                                                <td className="px-2 py-1 text-center text-blue-600">{r.earned}</td>
                                                <td className="px-2 py-1 text-center text-orange-600">{r.used}</td>
                                                <td className="px-2 py-1 text-center font-bold text-green-600">{r.available}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
            )}
        </div>

        {/* RUN MIGRATION SECTION */}
        <div className="bg-amber-50 border border-amber-200 rounded p-4">
            <h3 className="text-lg font-bold text-amber-800 flex items-center mb-2">
                <RefreshCw className="w-5 h-5 mr-2" />
                Chạy Migration & Đồng bộ RBAC v4.1.0
            </h3>
            <p className="text-sm text-gray-600 mb-3">
                Đồng bộ hóa vai trò nhân sự sang bộ tra cứu `user_roles` (lowercase email Doc IDs) để kích hoạt Firestore Rules mới và chuẩn hóa triệt để định dạng ngày operational về `yyyy-MM-dd` để sửa lỗi Đổi ca.
            </p>
            <button
                onClick={handleRunMigration}
                disabled={migrating}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded text-sm flex items-center gap-2 shadow disabled:opacity-50 transition-colors"
            >
                <RefreshCw className={`w-4 h-4 ${migrating ? 'animate-spin' : ''}`} />
                {migrating ? 'Đang chạy Migration...' : 'Chạy Migration v4.1.0'}
            </button>

            {migrationResult && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded p-3">
                    <div className="font-bold text-green-800 mb-2">🎉 {migrationResult.message}</div>
                    <div className="text-xs text-gray-700 space-y-1">
                        <p>• Đồng bộ thành công mapping: <strong className="text-green-700">{migrationResult.userRolesSynced} nhân viên</strong> sang `user_roles`</p>
                        <p>• Chuẩn hóa ngày ca trực (schedule): <strong className="text-blue-700">{migrationResult.migrationResults?.schedule} tài liệu</strong></p>
                        <p>• Chuẩn hóa ngày nghỉ phép (leaves): <strong className="text-purple-700">{migrationResult.migrationResults?.leaves} tài liệu</strong></p>
                        <p>• Chuẩn hóa ngày chia việc (allocations): <strong className="text-orange-700">{migrationResult.migrationResults?.allocations} tài liệu</strong></p>
                    </div>
                </div>
            )}
        </div>

        <hr className="my-4" />

            {/* FILTERS */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 border p-4 rounded bg-gray-50">
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Loại dữ liệu</label>
                    <select
                        className="w-full border rounded p-2"
                        value={dataType}
                        onChange={e => { setDataType(e.target.value); setJobId('all'); }}
                    >
                        <option value={COLLECTIONS.SCHEDULE}>Lịch tuần (Schedule)</option>
                        <option value={COLLECTIONS.LEAVES}>Đơn nghỉ phép (Leaves)</option>
                        <option value={COLLECTIONS.ALLOCATIONS}>Phân công ngày (Allocations)</option>
                        <option value={COLLECTIONS.SWAP_REQUESTS}>Yêu cầu đổi ca (Swaps)</option>
                        <option value={COLLECTIONS.AUDIT_LOGS}>Nhật ký hoạt động (Audits)</option>
                    </select>
                </div>

                {showJobFilter && (
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Công việc</label>
                        <select
                            className="w-full border rounded p-2"
                            value={jobId}
                            onChange={e => setJobId(e.target.value)}
                        >
                            <option value="all">-- Tất cả --</option>
                            {jobs.map(j => (
                                <option key={j.id} value={j.id}>{j.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Nhân viên</label>
                    <select
                        className="w-full border rounded p-2"
                        value={selectedEmpId}
                        onChange={e => setSelectedEmpId(e.target.value)}
                    >
                        <option value="all">-- Tất cả --</option>
                        {employees.map(e => (
                            <option key={e.id} value={e.id}>{e.fullName}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Từ ngày</label>
                    <input
                        type="date"
                        className="input-date w-full"
                        value={fromDate}
                        onChange={e => setFromDate(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Đến ngày</label>
                    <input
                        type="date"
                        className="input-date w-full"
                        value={toDate}
                        onChange={e => setToDate(e.target.value)}
                    />
                </div>

                <div className="md:col-span-4 flex gap-2">
                    <input
                        type="text"
                        className="flex-1 border rounded p-2"
                        placeholder="Từ khóa (Ghi chú, Lý do...)"
                        value={keyword}
                        onChange={e => setKeyword(e.target.value)}
                    />
                    <button
                        onClick={handleSearch}
                        disabled={loading}
                        className="btn-primary"
                    >
                        {loading ? '...' : <><Search className="w-4 h-4" /> Tìm kiếm</>}
                    </button>
                </div>
            </div>

            {/* RESULTS TABLE */}
            {items.length > 0 && (
                <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                        <div className="text-sm text-gray-600">
                            Tìm thấy <strong>{items.length}</strong> kết quả. Đã chọn: <strong>{selectedIds.size}</strong>
                        </div>
                        <button
                            onClick={handleDelete}
                            disabled={selectedIds.size === 0 || loading}
                            className="btn-danger disabled:opacity-50"
                        >
                            <Trash2 className="w-4 h-4" /> Xóa {selectedIds.size} mục
                        </button>
                    </div>

                    <div className="border rounded overflow-x-auto max-h-96">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-100 sticky top-0 bg-white shadow-sm z-10">
                                <tr>
                                    <th className="px-4 py-2 text-center w-12">
                                        <button onClick={toggleSelectAll}>
                                            {selectedIds.size === items.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                        </button>
                                    </th>
                                    <th className="px-4 py-2 text-left">Ngày</th>
                                    <th className="px-4 py-2 text-left">Tên Nhân viên</th>
                                    <th className="px-4 py-2 text-left">Công việc</th>
                                    <th className="px-4 py-2 text-left">Chi tiết (ID)</th>
                                    <th className="px-4 py-2 text-left">Ghi chú / Lý do</th>
                                    <th className="px-4 py-2 text-left text-xs text-gray-400">ID</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {items.map(item => {
                                    // Resolve Name
                                    const empId = item.employeeId || (item.employeeIds ? item.employeeIds[0] : item.requesterId);
                                    const empName = employees.find(e => e.id === empId)?.fullName || 'Không xác định';
                                    const jobName = jobs.find(j => j.id === (item.jobId || item.requestJobId))?.name || '-';

                                    return (
                                        <tr key={item.id} className={selectedIds.has(item.id) ? 'bg-red-50' : 'hover:bg-gray-50'}>
                                            <td className="px-4 py-2 text-center">
                                                <button onClick={() => toggleSelect(item.id)}>
                                                    {selectedIds.has(item.id) ? <CheckSquare className="w-4 h-4 text-red-600" /> : <Square className="w-4 h-4 text-gray-400" />}
                                                </button>
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap">
                                                {item.date ? format(new Date(item.date), 'dd/MM/yyyy') : '-'}
                                                <div className="text-xs text-gray-500">{item.shift}</div>
                                            </td>
                                            <td className="px-4 py-2 font-medium text-blue-700">
                                                {empName}
                                            </td>
                                            <td className="px-4 py-2 text-gray-700 font-medium">
                                                {jobName}
                                            </td>
                                            <td className="px-4 py-2">
                                                {item.employeeId || (item.employeeIds ? item.employeeIds.join(', ') : '-')}
                                            </td>
                                            <td className="px-4 py-2 text-gray-600">
                                                {item.note || item.reason || item.status || '-'}
                                            </td>
                                            <td className="px-4 py-2 text-xs text-gray-400 font-mono">
                                                {item.id}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CleanupManager;
