
import React from 'react';
import { Palmtree, Plus, Trash2, Edit2, Save, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Employee, LeaveRequest, Job } from '../../types';
import LeaveBalanceWidget from '../Leaves/LeaveBalanceWidget';
import LeaveBalanceHistory from '../Leaves/LeaveBalanceHistory';
import { useLeaveBalanceQuery } from '../../hooks/useLeaveBalanceQuery';

interface Props {
    currentEmployeeId: string;
    isManager: boolean;
    employees: Employee[];
    jobs: Job[];
    unifiedLeaves: (LeaveRequest & { isAuto: boolean })[];
    newLeave: Partial<LeaveRequest>;
    setNewLeave: (val: Partial<LeaveRequest>) => void;
    fromDate: Date;
    toDate: Date;
    filterShift: string;
    editingAutoLeave: LeaveRequest | null;
    setEditingAutoLeave: (val: LeaveRequest | null) => void;
    handleAddLeave: () => void;
    handleDeleteLeave: (id: string) => void;
    handleApproveLeave: (id: string, employeeId?: string, date?: string, shift?: string) => void;
    handleRejectLeave: (id: string, employeeId?: string, date?: string, shift?: string) => void;
    handleUnapproveLeave: (id: string) => void;
    handleSaveAutoLeave: () => void;
    leaveBalance?: { compLeaveAvailable: number; compLeaveUsed: number } | null;
}

const LeaveManager: React.FC<Props> = ({
    currentEmployeeId, isManager, employees, jobs, unifiedLeaves,
    newLeave, setNewLeave, fromDate, toDate, filterShift,
    editingAutoLeave, setEditingAutoLeave,
    handleAddLeave, handleDeleteLeave, handleApproveLeave, handleRejectLeave, handleUnapproveLeave, handleSaveAutoLeave,
    leaveBalance
}) => {

    const renderEditAutoLeaveModal = () => {
        if (!editingAutoLeave) return null;
        const emp = employees.find(e => e.id === editingAutoLeave.employeeId);

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md m-4 shadow-xl">
                    <h3 className="text-lg font-bold mb-2 text-gray-800">Đổi ngày/buổi nghỉ bù</h3>
                    <p className="text-sm text-gray-500 mb-4">
                        Nhân viên: <strong>{emp?.fullName}</strong>
                    </p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-4">
                        <p className="text-xs text-yellow-800">
                            ⚠️ Sau khi đổi, lịch nghỉ sẽ cần được Điều phối viên duyệt lại.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày nghỉ mới</label>
                            <input
                                type="date"
                                className="w-full border rounded p-2"
                                value={format(new Date(editingAutoLeave.date), 'yyyy-MM-dd')}
                                onChange={e => {
                                    if (e.target.value) {
                                        setEditingAutoLeave({
                                            ...editingAutoLeave,
                                            date: new Date(e.target.value).toISOString()
                                        });
                                    }
                                }}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Buổi nghỉ</label>
                            <select
                                className="w-full border rounded p-2"
                                value={editingAutoLeave.shift}
                                onChange={e => setEditingAutoLeave({
                                    ...editingAutoLeave,
                                    shift: e.target.value as 'Sáng' | 'Chiều' | 'Tối'
                                })}
                            >
                                <option value="Sáng">Sáng</option>
                                <option value="Chiều">Chiều</option>
                                <option value="Tối">Tối</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-2">
                        <button
                            onClick={() => setEditingAutoLeave(null)}
                            className="btn-secondary"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleSaveAutoLeave}
                            className="btn-primary"
                        >
                            <Save className="w-4 h-4" />
                            Gửi yêu cầu đổi
                        </button>
                    </div>
                </div>
            </div>
        );
    };
    // Fetch balance directly instead of relying on parent prop (ensures fresh data)
    const { data: fetchedBalance } = useLeaveBalanceQuery(currentEmployeeId !== 'all' ? currentEmployeeId : '');

    // Check if Compensatory leave is selected but no balance
    const isCompensatorySelected = newLeave.leaveType === 'Compensatory';
    const compLeaveAvailable = fetchedBalance?.compLeaveAvailable || 0;
    const canSubmitCompensatory = !isCompensatorySelected || compLeaveAvailable > 0;

    return (
        <div className="bg-white rounded-lg shadow-sm flex flex-col md:flex-row">
            {/* Left: Form */}
            <div className={`w-full md:w-1/3 p-6 border-r bg-gray-50 ${currentEmployeeId === 'all' ? 'opacity-50 pointer-events-none' : ''}`}>
                <h3 className="font-bold text-slate-800 mb-4 flex items-center">
                    <Palmtree className="w-5 h-5 mr-2 text-orange-600" /> Đăng ký nghỉ
                </h3>

                {/* Leave Balance Widget */}
                {currentEmployeeId !== 'all' && (
                    <div className="mb-4">
                        <LeaveBalanceWidget employeeId={currentEmployeeId} compact />
                        <LeaveBalanceHistory employeeId={currentEmployeeId} jobs={jobs} />
                    </div>
                )}

                <div className="space-y-4">
                    {/* Leave Type Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Loại nghỉ</label>
                        <select
                            className="w-full border rounded p-2 text-sm"
                            value={newLeave.leaveType || 'Regular'}
                            onChange={e => setNewLeave({ ...newLeave, leaveType: e.target.value as any })}
                        >
                            <option value="Regular">Nghỉ phép thông thường</option>
                            <option value="Compensatory" disabled={compLeaveAvailable === 0}>
                                Nghỉ bù T7/CN {compLeaveAvailable > 0 ? `(${compLeaveAvailable} ngày khả dụng)` : '(Không có)'}
                            </option>
                        </select>
                        {isCompensatorySelected && compLeaveAvailable === 0 && (
                            <p className="text-xs text-red-500 mt-1">⚠️ Bạn không có ngày nghỉ bù T7/CN khả dụng</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ngày nghỉ</label>
                        <input
                            type="date"
                            className="w-full border rounded p-2 text-sm"
                            value={newLeave.date || ''}
                            onChange={e => setNewLeave({ ...newLeave, date: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Buổi</label>
                        <select
                            className="w-full border rounded p-2 text-sm"
                            value={newLeave.shift || 'Sáng'}
                            onChange={e => setNewLeave({ ...newLeave, shift: e.target.value as any })}
                        >
                            <option value="Sáng">Sáng</option>
                            <option value="Chiều">Chiều</option>
                            <option value="Tối">Tối</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Lý do</label>
                        <textarea
                            className="w-full border rounded p-2 text-sm"
                            rows={3}
                            value={newLeave.reason || ''}
                            onChange={e => setNewLeave({ ...newLeave, reason: e.target.value })}
                            placeholder="VD: Việc gia đình, Ốm..."
                        />
                    </div>
                    <button
                        onClick={handleAddLeave}
                        disabled={!canSubmitCompensatory}
                        className={`w-full py-2 rounded font-medium flex justify-center items-center ${canSubmitCompensatory
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        <Plus className="w-4 h-4 mr-2" /> Gửi đơn
                    </button>
                </div>
                {currentEmployeeId === 'all' && <div className="text-xs text-red-500 mt-2 font-bold text-center">Vui lòng chọn 1 nhân viên cụ thể để tạo đơn nghỉ</div>}
            </div>

            {/* Right: List */}
            <div className="w-full md:w-2/3 p-6 flex flex-col">
                <div className="flex gap-4 mb-4">
                    <div className="flex-1 bg-orange-50 p-3 rounded-lg border border-orange-200">
                        <div className="text-xs text-orange-600 font-medium">Nghỉ phép</div>
                        <div className="text-2xl font-bold text-orange-700">
                            {unifiedLeaves.filter(l => !l.isAuto).length}
                        </div>
                    </div>
                    <div className="flex-1 bg-purple-50 p-3 rounded-lg border border-purple-200">
                        <div className="text-xs text-purple-600 font-medium">Nghỉ bù</div>
                        <div className="text-2xl font-bold text-purple-700">
                            {unifiedLeaves.filter(l => l.isAuto).length}
                        </div>
                    </div>
                </div>

                {/* Section 1: Regular Leaves */}
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-slate-800 flex items-center">
                            <Palmtree className="w-4 h-4 mr-2 text-orange-600" />
                            Nghỉ phép ({format(fromDate, 'dd/MM')} - {format(toDate, 'dd/MM')})
                        </h3>
                        {filterShift !== 'All' && <span className="text-xs text-orange-600 font-medium bg-orange-50 px-2 py-1 rounded">Đang lọc: {filterShift}</span>}
                    </div>
                    <div className="overflow-x-auto border rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-orange-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ngày</th>
                                    {currentEmployeeId === 'all' && <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nhân viên</th>}
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Buổi</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Lý do</th>
                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                                    <th className="px-4 py-2 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {unifiedLeaves.filter(l => !l.isAuto).length === 0 ? (
                                    <tr><td colSpan={6} className="p-4 text-center text-gray-400 italic text-sm">Không có lịch nghỉ phép</td></tr>
                                ) : (
                                    unifiedLeaves.filter(l => !l.isAuto).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(l => {
                                        const empName = employees.find(e => e.id === l.employeeId)?.fullName;
                                        return (
                                            <tr key={l.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-2 whitespace-nowrap text-sm">{format(new Date(l.date), 'dd/MM/yyyy')}</td>
                                                {currentEmployeeId === 'all' && <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">{empName}</td>}
                                                <td className="px-4 py-2 whitespace-nowrap text-sm">{l.shift}</td>
                                                <td className="px-4 py-2 text-sm text-gray-600">{l.reason}</td>
                                                <td className="px-4 py-2 whitespace-nowrap text-center">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                        ${l.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                                            l.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                                                'bg-yellow-100 text-yellow-800'}`}>
                                                        {l.status === 'Pending' ? 'Chờ duyệt' : l.status === 'Approved' ? 'Đã duyệt' : 'Từ chối'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex gap-2 justify-end">
                                                        {l.status === 'Pending' && (l.employeeId === currentEmployeeId || isManager) && (
                                                            <button onClick={() => handleDeleteLeave(l.id)} className="text-red-600 hover:text-red-900 bg-red-50 px-2 py-1 rounded text-xs">
                                                                <Trash2 className="w-3 h-3 inline mr-1" />Hủy
                                                            </button>
                                                        )}
                                                        {isManager && l.status === 'Pending' && (
                                                            <>
                                                                <button onClick={() => handleApproveLeave(l.id, l.employeeId, l.date, l.shift)} className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-medium">✓ Duyệt</button>
                                                                <button onClick={() => handleRejectLeave(l.id, l.employeeId, l.date, l.shift)} className="text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-medium">✗ Từ chối</button>
                                                            </>
                                                        )}
                                                        {isManager && l.status === 'Approved' && (
                                                            <button onClick={() => handleUnapproveLeave(l.id)} className="text-orange-600 bg-orange-50 px-2 py-1 rounded text-xs font-medium">↻ Gỡ duyệt</button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Section 2: Rest Day Leaves */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-slate-800 flex items-center">
                            <Clock className="w-4 h-4 mr-2 text-purple-600" />
                            Nghỉ bù (sau ca tối)
                        </h3>
                    </div>

                    <div className="overflow-x-auto border rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-purple-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ngày</th>
                                    {currentEmployeeId === 'all' && <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nhân viên</th>}
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Buổi</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ghi chú</th>
                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                                    <th className="px-4 py-2 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {unifiedLeaves.filter(l => l.isAuto).length === 0 ? (
                                    <tr><td colSpan={6} className="p-4 text-center text-gray-400 italic text-sm">Không có lịch nghỉ bù</td></tr>
                                ) : (
                                    unifiedLeaves.filter(l => l.isAuto).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(l => {
                                        const empName = employees.find(e => e.id === l.employeeId)?.fullName;
                                        return (
                                            <tr key={l.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-2 whitespace-nowrap text-sm">{format(new Date(l.date), 'dd/MM/yyyy')}</td>
                                                {currentEmployeeId === 'all' && <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">{empName}</td>}
                                                <td className="px-4 py-2 whitespace-nowrap text-sm">{l.shift}</td>
                                                <td className="px-4 py-2 text-sm text-gray-600">
                                                    {l.reason.replace('[Tự động] ', '').replace('[Đã đổi] ', '')}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-center">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                        ${l.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                                            l.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                                                'bg-yellow-100 text-yellow-800'}`}>
                                                        {l.status === 'Pending' ? 'Chờ duyệt' : l.status === 'Approved' ? 'Đã duyệt' : 'Từ chối'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex gap-2 justify-end">
                                                        {l.status === 'Pending' && (l.employeeId === currentEmployeeId || isManager) && (
                                                            <button onClick={() => setEditingAutoLeave(l)} className="text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs font-medium">
                                                                <Edit2 className="w-3 h-3 inline mr-1" />Đổi ngày
                                                            </button>
                                                        )}
                                                        {isManager && l.status === 'Pending' && (
                                                            <>
                                                                <button onClick={() => handleApproveLeave(l.id, l.employeeId, l.date, l.shift)} className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-medium">✓ Duyệt</button>
                                                                <button onClick={() => handleRejectLeave(l.id, l.employeeId, l.date, l.shift)} className="text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-medium">✗ Từ chối</button>
                                                            </>
                                                        )}
                                                        {isManager && l.status === 'Approved' && (
                                                            <button onClick={() => handleUnapproveLeave(l.id)} className="text-orange-600 bg-orange-50 px-2 py-1 rounded text-xs font-medium">↻ Gỡ duyệt</button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            {renderEditAutoLeaveModal()}
        </div>
    );
};

export default LeaveManager;
