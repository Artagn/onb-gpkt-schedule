import React from 'react';
import { Employee, EmployeeRank, JobGroup, Role, Status, TimeFrame } from '../../types';
import { AlertCircle, Upload } from 'lucide-react';

interface EmployeeModalsProps {
    currentUserRole: Role;
    // Edit Modal
    isEditing: string | null;
    editForm: Partial<Employee>;
    setEditForm: (form: Partial<Employee>) => void;
    onSave: () => void;
    onCancelEdit: () => void;
    // Delete Modal
    deleteId: string | null;
    onConfirmDelete: () => void;
    onCancelDelete: () => void;
    // Import Modal
    showImport: boolean;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDownloadTemplate: () => void;
    onCloseImport: () => void;
}

const EmployeeModals: React.FC<EmployeeModalsProps> = ({
    currentUserRole,
    isEditing,
    editForm,
    setEditForm,
    onSave,
    onCancelEdit,
    deleteId,
    onConfirmDelete,
    onCancelDelete,
    showImport,
    onFileUpload,
    onDownloadTemplate,
    onCloseImport,
}) => {
    return (
        <>
            {/* Delete Confirmation Modal */}
            {deleteId && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl transform transition-all scale-100">
                        <div className="flex items-center justify-center mb-4 text-red-600">
                            <AlertCircle className="w-12 h-12" />
                        </div>
                        <h3 className="text-lg font-bold text-center mb-2 text-gray-800">Xác nhận xóa nhân viên</h3>
                        <p className="text-center text-gray-600 mb-6">
                            Bạn có chắc chắn muốn xóa nhân viên này khỏi hệ thống không? Hành động này không thể hoàn tác.
                        </p>
                        <div className="flex justify-center gap-3">
                            <button
                                onClick={onCancelDelete}
                                className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={onConfirmDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-md"
                            >
                                Đồng ý Xóa
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit/Add Modal */}
            {isEditing && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-bold mb-4">
                            {isEditing === 'new' ? 'Thêm mới' : 'Chỉnh sửa'} Nhân viên
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            {/* Full Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Họ tên</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full border rounded p-2"
                                    value={editForm.fullName || ''}
                                    onChange={e => setEditForm({ ...editForm, fullName: e.target.value })}
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input
                                    type="email"
                                    className="mt-1 block w-full border rounded p-2"
                                    value={editForm.email || ''}
                                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                />
                            </div>

                            {/* STT */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">STT</label>
                                <input
                                    type="number"
                                    className="mt-1 block w-full border rounded p-2"
                                    value={editForm.stt || 0}
                                    onChange={e => setEditForm({ ...editForm, stt: parseInt(e.target.value) })}
                                />
                            </div>

                            {/* Rank */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Phân hạng</label>
                                <select
                                    className="mt-1 block w-full border rounded p-2"
                                    value={editForm.rank || EmployeeRank.None}
                                    onChange={e => setEditForm({ ...editForm, rank: e.target.value as EmployeeRank })}
                                >
                                    {Object.values(EmployeeRank).map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </div>

                            {/* Role */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Vai trò</label>
                                <select
                                    className="mt-1 block w-full border rounded p-2"
                                    value={editForm.role || Role.Staff}
                                    onChange={e => setEditForm({ ...editForm, role: e.target.value as Role })}
                                >
                                    {currentUserRole === Role.Admin ? (
                                        Object.values(Role).map(v => <option key={v} value={v}>{v}</option>)
                                    ) : (
                                        [Role.Staff, Role.Coordinator].map(v => <option key={v} value={v}>{v}</option>)
                                    )}
                                </select>
                                {currentUserRole !== Role.Admin && (
                                    <p className="text-xs text-gray-500 mt-1">💡 Chỉ Admin mới có thể gán vai trò Admin</p>
                                )}
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Trạng thái</label>
                                <select
                                    className="mt-1 block w-full border rounded p-2"
                                    value={editForm.status || Status.Active}
                                    onChange={e => setEditForm({ ...editForm, status: e.target.value as Status })}
                                >
                                    {Object.values(Status).map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </div>

                            {/* Evaluation Group */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nhóm đánh giá</label>
                                <select
                                    className="mt-1 block w-full border rounded p-2"
                                    value={editForm.evaluationGroup || ''}
                                    onChange={e => setEditForm({
                                        ...editForm,
                                        evaluationGroup: e.target.value as 'ONB_DT' | 'ONB_KS' | undefined || undefined
                                    })}
                                >
                                    <option value="">-- Chưa chọn --</option>
                                    <option value="ONB_DT">ONB_DT (Chuyển giao)</option>
                                    <option value="ONB_KS">ONB_KS (Kiểm soát)</option>
                                </select>
                                <p className="text-xs text-gray-500 mt-1">💡 Dùng cho phân loại đánh giá tháng</p>
                            </div>

                            {/* KPI Standard */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">KPI Chuẩn (Phân công)</label>
                                <input
                                    type="number"
                                    className="mt-1 block w-full border rounded p-2"
                                    value={editForm.kpiStandard || 100}
                                    onChange={e => setEditForm({ ...editForm, kpiStandard: parseInt(e.target.value) })}
                                />
                                <p className="text-xs text-gray-500 mt-1">📊 Dùng cho tự động phân công</p>
                            </div>

                            {/* Monthly KPI Target */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">KPI Đánh giá tháng</label>
                                <input
                                    type="number"
                                    className="mt-1 block w-full border rounded p-2"
                                    value={editForm.monthlyKpiTarget || 100}
                                    onChange={e => setEditForm({ ...editForm, monthlyKpiTarget: parseInt(e.target.value) })}
                                />
                                <p className="text-xs text-gray-500 mt-1">📈 Dùng cho đánh giá hàng tháng</p>
                            </div>

                            {/* Job Groups */}
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nhóm công việc</label>
                                <div className="flex flex-wrap gap-2">
                                    {Object.values(JobGroup).map(group => (
                                        <label key={group} className="inline-flex items-center bg-gray-100 px-3 py-1 rounded cursor-pointer hover:bg-gray-200">
                                            <input
                                                type="checkbox"
                                                className="mr-2"
                                                checked={editForm.jobGroups?.includes(group)}
                                                onChange={e => {
                                                    const current = editForm.jobGroups || [];
                                                    const next = e.target.checked ? [...current, group] : current.filter(g => g !== group);
                                                    setEditForm({ ...editForm, jobGroups: next });
                                                }}
                                            />
                                            {group}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Time Frames */}
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Khung thời gian</label>
                                <div className="flex flex-wrap gap-2">
                                    {Object.values(TimeFrame).map(tf => (
                                        <label key={tf} className="inline-flex items-center bg-gray-100 px-3 py-1 rounded cursor-pointer hover:bg-gray-200">
                                            <input
                                                type="checkbox"
                                                className="mr-2"
                                                checked={editForm.timeFrames?.includes(tf)}
                                                onChange={e => {
                                                    const current = editForm.timeFrames || [];
                                                    const next = e.target.checked ? [...current, tf] : current.filter(t => t !== tf);
                                                    setEditForm({ ...editForm, timeFrames: next });
                                                }}
                                            />
                                            {tf}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={onCancelEdit} className="px-4 py-2 border rounded hover:bg-gray-50">
                                Hủy
                            </button>
                            <button onClick={onSave} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                                Lưu
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImport && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                        <h3 className="text-lg font-bold mb-2 text-slate-800">Nhập khẩu Nhân viên từ Excel</h3>

                        <div className="mb-6 space-y-4">
                            <div className="bg-blue-50 p-3 rounded border border-blue-100 text-sm text-blue-800">
                                <strong>Bước 1:</strong> Tải file mẫu về để điền thông tin đúng định dạng.
                                <div className="mt-2">
                                    <button onClick={onDownloadTemplate} className="text-blue-600 underline hover:text-blue-800 font-bold">
                                        Tải file mẫu (.xlsx)
                                    </button>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded border-2 border-dashed border-gray-300 text-center">
                                <strong>Bước 2:</strong> Upload file đã điền.
                                <div className="mt-4 flex justify-center">
                                    <label className="cursor-pointer bg-white border border-gray-300 rounded px-4 py-2 hover:bg-gray-50 shadow-sm flex items-center">
                                        <Upload className="w-4 h-4 mr-2 text-gray-500" />
                                        <span>Chọn file Excel</span>
                                        <input type="file" accept=".xlsx, .xls" className="hidden" onChange={onFileUpload} />
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 flex justify-end gap-3">
                            <button onClick={onCloseImport} className="px-4 py-2 border rounded hover:bg-gray-50">
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default EmployeeModals;
