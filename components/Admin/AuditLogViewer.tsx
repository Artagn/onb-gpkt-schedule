import React, { useState, useEffect } from 'react';
import { AuditLog } from '../../types';
import { auditService } from '../../services/firestoreService';
import { Clock, Search, ShieldAlert, User, Activity, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const ACTION_NAMES: Record<string, string> = {
    // Leave Actions
    'REGISTER_LEAVE': 'Đăng ký nghỉ',
    'APPROVE_LEAVE': 'Duyệt đơn nghỉ',
    'REJECT_LEAVE': 'Từ chối đơn nghỉ',
    'UNAPPROVE_LEAVE': 'Gỡ duyệt đơn nghỉ',
    'UPDATE_REST_LEAVE': 'Sửa nghỉ bù',
    'LEAVE_APPROVE': 'Duyệt đơn nghỉ',
    'LEAVE_REJECT': 'Từ chối đơn nghỉ',

    // Schedule Actions
    'AUTO_SCHEDULE': 'Tự động xếp lịch',
    'AUTO_SCHEDULE_RUN': 'Chạy tự động xếp lịch',
    'UPDATE_SCHEDULE_MANUAL': 'Sửa lịch tuần',
    'TASK_QUICK_COMPLETE': 'Hoàn thành công việc',
    'TASK_STATUS_TOGGLE': 'Đổi trạng thái công việc',

    // Allocation Actions
    'UPDATE_ALLOCATION': 'Cập nhật phân công',
    'CREATE_ALLOCATION': 'Tạo phân công',
    'DELETE_ALLOCATION': 'Xóa phân công',

    // Admin Actions
    'DELETE_PATTERN': 'Xóa mẫu lịch',
    'SYSTEM_RESTORE': 'Khôi phục dữ liệu',
    'SYSTEM_RESET': 'Khôi phục gốc',
    'BATCH_DELETE': 'Xóa hàng loạt',

    // Job Actions
    'CREATE_JOB': 'Tạo công việc',
    'UPDATE_JOB': 'Sửa công việc',
    'DELETE_JOB': 'Xóa công việc',

    // Employee Actions
    'CREATE_EMPLOYEE': 'Tạo nhân viên',
    'UPDATE_EMPLOYEE': 'Sửa nhân viên',
    'DELETE_EMPLOYEE': 'Xóa nhân viên'
};

const ENTITY_NAMES: Record<string, string> = {
    // Core Entities
    'LEAVE': 'Đơn nghỉ phép',
    'LeaveRequest': 'Đơn nghỉ phép',
    'leaves': 'Đơn nghỉ phép',

    'SCHEDULE': 'Lịch làm việc',
    'Schedule': 'Lịch tuần',
    'schedule': 'Lịch tuần',
    'ScheduleItem': 'Công việc',

    'ALLOCATION': 'Phân công',
    'DailyAllocation': 'Phân công ngày',
    'dailyAllocations': 'Phân công ngày',

    'AUTO_SCHEDULE': 'Lịch tự động',
    'USER': 'Nhân viên',
    'Employee': 'Nhân viên',
    'employees': 'Nhân viên',

    'JOB': 'Công việc',
    'Job': 'Công việc',
    'jobs': 'Công việc',

    'SUBJOB': 'Hạng mục',
    'SubJob': 'Hạng mục',
    'subJobs': 'Hạng mục',

    'CONFIG': 'Cấu hình',
    'PATTERN': 'Mẫu lịch',
    'Pattern': 'Mẫu lịch',
    'patterns': 'Mẫu lịch',

    'SYSTEM': 'Hệ thống',
    'ALL': 'Toàn bộ dữ liệu'
};

const AuditLogViewer: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterAction, setFilterAction] = useState('all');

    // NEW FILTERS
    const [filterUser, setFilterUser] = useState('all');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            // Fetch last 500 logs for better filtering context
            const data = await auditService.getAll(500);
            setLogs(data);
        } catch (error) {
            console.error("Failed to load audit logs", error);
        } finally {
            setLoading(false);
        }
    };

    const handleClearLogs = async () => {
        if (window.confirm("CẢNH BÁO: Bạn có chắc chắn muốn XÓA TOÀN BỘ nhật ký?\n\nHành động này không thể hoàn tác! Hãy đảm bảo bạn đã Backup dữ liệu nếu cần.")) {
            if (window.confirm("Xác nhận lần 2: Xóa tất cả nhật ký hoạt động?")) {
                try {
                    setLoading(true);
                    await auditService.clearAll();
                    setLogs([]);
                    alert("Đã xóa toàn bộ nhật ký.");
                } catch (error) {
                    console.error(error);
                    alert("Lỗi khi xóa nhật ký.");
                } finally {
                    setLoading(false);
                }
            }
        }
    };

    const filteredLogs = logs.filter(log => {
        const matchAction = filterAction === 'all' || log.action === filterAction;
        const matchUser = filterUser === 'all' || log.userId === filterUser;

        let matchDate = true;
        if (fromDate) {
            matchDate = matchDate && new Date(log.timestamp) >= new Date(fromDate);
        }
        if (toDate) {
            // End of day
            const end = new Date(toDate);
            end.setHours(23, 59, 59, 999);
            matchDate = matchDate && new Date(log.timestamp) <= end;
        }

        return matchAction && matchUser && matchDate;
    });

    // Get unique actions and users for filter
    const uniqueActions = Array.from(new Set(logs.map(l => l.action))) as string[];
    const uniqueUsers = Array.from(new Set(logs.map(l => l.userId))).filter(Boolean) as string[];

    return (
        <div className="bg-white rounded-lg shadow h-full flex flex-col overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center">
                        <ShieldAlert className="w-5 h-5 mr-2 text-indigo-600" />
                        Nhật ký hoạt động (Audit Log)
                    </h3>

                    <button
                        onClick={handleClearLogs}
                        className="text-red-600 hover:bg-red-50 px-3 py-1.5 rounded text-xs font-bold border border-red-200 flex items-center transition-colors"
                        title="Xóa toàn bộ nhật ký để giải phóng dung lượng"
                    >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Xóa tất cả Log
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded border shadow-sm">
                    {/* Action Filter */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500">Hành động:</span>
                        <select
                            className="text-sm border rounded px-2 py-1 outline-none focus:border-indigo-500 max-w-[150px]"
                            value={filterAction}
                            onChange={e => setFilterAction(e.target.value)}
                        >
                            <option value="all">Tất cả</option>
                            {uniqueActions.map(action => (
                                <option key={action} value={action}>{ACTION_NAMES[action] || action}</option>
                            ))}
                        </select>
                    </div>

                    {/* User Filter */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500">Người dùng:</span>
                        <select
                            className="text-sm border rounded px-2 py-1 outline-none focus:border-indigo-500 max-w-[150px]"
                            value={filterUser}
                            onChange={e => setFilterUser(e.target.value)}
                        >
                            <option value="all">Tất cả</option>
                            {uniqueUsers.map(user => (
                                <option key={user} value={user}>{user}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date Range */}
                    <div className="flex items-center gap-2 border-l pl-3 ml-1">
                        <span className="text-xs font-bold text-gray-500">Từ:</span>
                        <input
                            type="date"
                            className="input-date-sm"
                            value={fromDate}
                            onChange={e => setFromDate(e.target.value)}
                        />
                        <span className="text-xs font-bold text-gray-500">Đến:</span>
                        <input
                            type="date"
                            className="input-date-sm"
                            value={toDate}
                            onChange={e => setToDate(e.target.value)}
                        />
                    </div>

                    {/* Reset Filter */}
                    {(filterAction !== 'all' || filterUser !== 'all' || fromDate !== '' || toDate !== '') && (
                        <button
                            onClick={() => {
                                setFilterAction('all');
                                setFilterUser('all');
                                setFromDate('');
                                setToDate('');
                            }}
                            className="ml-auto text-xs text-blue-600 hover:underline px-2"
                        >
                            Xóa lọc
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-auto p-0">
                {loading ? (
                    <div className="p-10 text-center text-gray-500">Đang tải nhật ký...</div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-3 py-2 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Thời gian</th>
                                <th className="px-3 py-2 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Người dùng</th>
                                <th className="px-3 py-2 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Hành động</th>
                                <th className="px-3 py-2 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Đối tượng</th>
                                <th className="px-3 py-2 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Chi tiết</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 align-top">
                                        <div className="flex items-center">
                                            {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm', { locale: vi })}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-xs font-medium text-gray-900 align-top max-w-[150px] break-words">
                                        {log.userId}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-blue-600 font-bold align-top">
                                        {ACTION_NAMES[log.action] || log.action}
                                    </td>
                                    <td className="px-3 py-2 text-xs text-gray-700 align-top">
                                        <div className="font-medium">{ENTITY_NAMES[log.entity] || log.entity}</div>
                                        {log.entityId && <div className="text-[10px] text-gray-400">#{log.entityId.substring(0, 8)}...</div>}
                                    </td>
                                    <td className="px-3 py-2 text-xs text-gray-500 align-top">
                                        <details className="cursor-pointer group">
                                            <summary className="text-[11px] text-indigo-500 font-medium group-hover:underline focus:outline-none">Xem chi tiết</summary>
                                            <pre className="mt-1 bg-gray-100 p-1.5 rounded text-[10px] overflow-auto max-w-[200px] max-h-24 shadow-inner border font-mono">
                                                {JSON.stringify(log.details, null, 2)}
                                            </pre>
                                        </details>
                                    </td>
                                </tr>
                            ))}
                            {filteredLogs.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500 italic">
                                        Không tìm thấy nhật ký nào phù hợp với bộ lọc.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
            <div className="bg-gray-50 p-2 text-xs text-gray-400 text-center border-t">
                Hiển thị tối đa 500 bản ghi mới nhất.
            </div>
        </div>
    );
};

export default AuditLogViewer;
