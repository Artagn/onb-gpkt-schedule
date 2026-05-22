/**
 * JobManager Modal Components
 * Delete confirmation, Job edit, SubJob edit, Import modals
 */

import React from 'react';
import { Job,  SubJob, JobGroupDef } from '../../types';
import { AlertCircle, Upload } from 'lucide-react';
import { DeleteConfirmState, ImportMode } from './useJobManager';

// ========== DELETE CONFIRMATION MODAL ==========
interface DeleteModalProps {
    deleteConfirm: DeleteConfirmState;
    onCancel: () => void;
    onConfirm: () => void;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({ deleteConfirm, onCancel, onConfirm }) => {
    if (!deleteConfirm) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl transform transition-all scale-100">
                <div className="flex items-center justify-center mb-4 text-red-600">
                    <AlertCircle className="w-12 h-12" />
                </div>
                <h3 className="text-lg font-bold text-center mb-2 text-gray-800">Xác nhận xóa</h3>
                <p className="text-center text-gray-600 mb-6">
                    Bạn có chắc chắn muốn xóa {deleteConfirm.type === 'job' ? 'công việc' : 'hạng mục'}: <br />
                    <strong>{deleteConfirm.name}</strong>?
                </p>
                <div className="flex justify-center gap-3">
                    <button onClick={onCancel} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 font-medium">Hủy bỏ</button>
                    <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-md">Đồng ý Xóa</button>
                </div>
            </div>
        </div>
    );
};

// ========== JOB EDIT MODAL ==========
interface JobEditModalProps {
    isEditing: string | null;
    editForm: Partial<Job>;
    setEditForm: (form: Partial<Job>) => void;
    jobGroups: JobGroupDef[];
    onSave: () => void;
    onCancel: () => void;
}

export const JobEditModal: React.FC<JobEditModalProps> = ({
    isEditing,
    editForm,
    setEditForm,
    jobGroups,
    onSave,
    onCancel
}) => {
    if (!isEditing) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                <h3 className="text-lg font-bold mb-4">{isEditing === 'new' ? 'Thêm mới' : 'Chỉnh sửa'} Công việc</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Tên công việc</label>
                        <input className="mt-1 block w-full border rounded p-2" value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nhóm</label>
                        <select className="mt-1 block w-full border rounded p-2" value={editForm.group || ''} onChange={e => setEditForm({ ...editForm, group: e.target.value as string, classification: e.target.value === 'Đào tạo' ? editForm.classification : undefined })}>
                            <option value="">-- Chọn nhóm --</option>
                            {jobGroups.filter(g => g.isActive).map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                        </select>
                    </div>
                    {editForm.group === 'Đào tạo' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Phân loại</label>
                            <select className="mt-1 block w-full border rounded p-2" value={editForm.classification || ''} onChange={e => setEditForm({ ...editForm, classification: (e.target.value || undefined) as any })}>
                                <option value="">-- Chọn phân loại --</option>
                                <option value="Nghiệp vụ">Nghiệp vụ</option>
                                <option value="Lĩnh vực">Lĩnh vực</option>
                                <option value="Nội bộ">Nội bộ</option>
                                <option value="Trực tiếp">Trực tiếp</option>
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Điểm chuẩn</label>
                        <input type="number" step="0.1" className="mt-1 block w-full border rounded p-2" value={editForm.standardPoint || 0} onChange={e => setEditForm({ ...editForm, standardPoint: parseFloat(e.target.value) })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Thời lượng (phút)</label>
                        <input type="number" className="mt-1 block w-full border rounded p-2" value={editForm.durationMinutes || 0} onChange={e => setEditForm({ ...editForm, durationMinutes: parseInt(e.target.value) })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Độ khó</label>
                        <input type="number" step="0.5" className="mt-1 block w-full border rounded p-2" value={editForm.difficulty || 1} onChange={e => setEditForm({ ...editForm, difficulty: parseFloat(e.target.value) })} />
                    </div>
                    <div className="flex items-center mt-6">
                        <label className="flex items-center">
                            <input type="checkbox" className="w-4 h-4" checked={editForm.isActive} onChange={e => setEditForm({ ...editForm, isActive: e.target.checked })} />
                            <span className="ml-2 text-sm font-medium text-gray-700">Đang hoạt động</span>
                        </label>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onCancel} className="px-4 py-2 border rounded hover:bg-gray-50">Hủy</button>
                    <button onClick={onSave} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Lưu</button>
                </div>
            </div>
        </div>
    );
};

// ========== JOB GROUP EDIT MODAL ==========
interface JobGroupEditModalProps {
    isEditingGroup: string | null;
    editGroupForm: Partial<JobGroupDef>;
    setEditGroupForm: (form: Partial<JobGroupDef>) => void;
    onSave: () => void;
    onCancel: () => void;
}

export const JobGroupEditModal: React.FC<JobGroupEditModalProps> = ({
    isEditingGroup,
    editGroupForm,
    setEditGroupForm,
    onSave,
    onCancel
}) => {
    if (!isEditingGroup) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl transform transition-all scale-100">
                <h3 className="text-lg font-bold mb-4">{isEditingGroup === 'new' ? 'Thêm mới' : 'Chỉnh sửa'} Nhóm Công Việc</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Tên nhóm</label>
                        <input className="mt-1 block w-full border rounded p-2" value={editGroupForm.name || ''} onChange={e => setEditGroupForm({ ...editGroupForm, name: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Màu sắc hiển thị</label>
                        <select className={`mt-1 block w-full border rounded p-2 ${editGroupForm.colorClass}`} value={editGroupForm.colorClass || 'bg-gray-100 text-gray-800'} onChange={e => setEditGroupForm({ ...editGroupForm, colorClass: e.target.value })}>
                            <option value="bg-blue-100 text-blue-800" className="bg-blue-100 text-blue-800">Xanh dương</option>
                            <option value="bg-green-100 text-green-800" className="bg-green-100 text-green-800">Xanh lá</option>
                            <option value="bg-purple-100 text-purple-800" className="bg-purple-100 text-purple-800">Tím</option>
                            <option value="bg-orange-100 text-orange-800" className="bg-orange-100 text-orange-800">Cam</option>
                            <option value="bg-pink-100 text-pink-800" className="bg-pink-100 text-pink-800">Hồng</option>
                            <option value="bg-yellow-100 text-yellow-800" className="bg-yellow-100 text-yellow-800">Vàng</option>
                            <option value="bg-gray-100 text-gray-800" className="bg-gray-100 text-gray-800">Xám</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Thứ tự ưu tiên</label>
                        <input type="number" className="mt-1 block w-full border rounded p-2" value={editGroupForm.order || 0} onChange={e => setEditGroupForm({ ...editGroupForm, order: parseInt(e.target.value) })} />
                    </div>
                    <div className="flex items-center">
                        <label className="flex items-center">
                            <input type="checkbox" className="w-4 h-4" checked={editGroupForm.isActive !== false} onChange={e => setEditGroupForm({ ...editGroupForm, isActive: e.target.checked })} />
                            <span className="ml-2 text-sm font-medium text-gray-700">Đang sử dụng</span>
                        </label>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onCancel} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 font-medium">Hủy</button>
                    <button onClick={onSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md">Lưu</button>
                </div>
            </div>
        </div>
    );
};

// ========== SUBJOB EDIT MODAL ==========
interface SubJobEditModalProps {
    isEditingSub: string | null;
    editSubForm: Partial<SubJob>;
    setEditSubForm: (form: Partial<SubJob>) => void;
    jobs: Job[];
    onSave: () => void;
    onCancel: () => void;
}

export const SubJobEditModal: React.FC<SubJobEditModalProps> = ({
    isEditingSub,
    editSubForm,
    setEditSubForm,
    jobs,
    onSave,
    onCancel
}) => {
    if (!isEditingSub) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold mb-4">{isEditingSub === 'new' ? 'Thêm mới' : 'Chỉnh sửa'} Hạng mục</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Thuộc Công việc (Cha)</label>
                        <select className="mt-1 block w-full border rounded p-2" value={editSubForm.jobId || ''} onChange={e => setEditSubForm({ ...editSubForm, jobId: e.target.value })}>
                            <option value="">-- Chọn công việc --</option>
                            {jobs.filter(j => j.isActive).map(j => (<option key={j.id} value={j.id}>{j.name}</option>))}
                        </select>
                    </div>
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Tên hạng mục</label>
                        <input className="mt-1 block w-full border rounded p-2" value={editSubForm.name || ''} onChange={e => setEditSubForm({ ...editSubForm, name: e.target.value })} placeholder="VD: Hướng dẫn nghiệp vụ X" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Sản phẩm</label>
                        <input className="mt-1 block w-full border rounded p-2" value={editSubForm.product || ''} onChange={e => setEditSubForm({ ...editSubForm, product: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Link Meet</label>
                        <input className="mt-1 block w-full border rounded p-2" value={editSubForm.link || ''} onChange={e => setEditSubForm({ ...editSubForm, link: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Thứ</label>
                        <select className="mt-1 block w-full border rounded p-2" value={editSubForm.day || 'Thứ 2'} onChange={e => setEditSubForm({ ...editSubForm, day: e.target.value })}>
                            {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'].map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Buổi</label>
                        <select className="mt-1 block w-full border rounded p-2" value={editSubForm.shift || 'Sáng'} onChange={e => setEditSubForm({ ...editSubForm, shift: e.target.value as any })}>
                            <option value="Sáng">Sáng</option>
                            <option value="Chiều">Chiều</option>
                            <option value="Tối">Tối</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Bắt đầu</label>
                        <input type="time" className="mt-1 block w-full border rounded p-2" value={editSubForm.startTime || ''} onChange={e => setEditSubForm({ ...editSubForm, startTime: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Kết thúc</label>
                        <input type="time" className="mt-1 block w-full border rounded p-2" value={editSubForm.endTime || ''} onChange={e => setEditSubForm({ ...editSubForm, endTime: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Thời lượng (phút)</label>
                        <input type="number" className="mt-1 block w-full border rounded p-2" value={editSubForm.duration || 0} onChange={e => setEditSubForm({ ...editSubForm, duration: parseInt(e.target.value) })} />
                    </div>
                    <div className="flex items-center mt-6">
                        <label className="flex items-center">
                            <input type="checkbox" className="w-4 h-4" checked={editSubForm.isActive} onChange={e => setEditSubForm({ ...editSubForm, isActive: e.target.checked })} />
                            <span className="ml-2 text-sm font-medium text-gray-700">Đang hoạt động</span>
                        </label>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onCancel} className="px-4 py-2 border rounded hover:bg-gray-50">Hủy</button>
                    <button onClick={onSave} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Lưu</button>
                </div>
            </div>
        </div>
    );
};

// ========== IMPORT MODAL ==========
interface ImportModalProps {
    importMode: ImportMode;
    onClose: () => void;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDownloadTemplate: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
    importMode,
    onClose,
    onFileUpload,
    onDownloadTemplate
}) => {
    if (importMode === 'none') return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                <h3 className="text-lg font-bold mb-2 text-slate-800">Nhập khẩu {importMode === 'jobs' ? 'Công việc' : 'Hạng mục'} từ Excel</h3>

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
                    <button onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-50">Đóng</button>
                </div>
            </div>
        </div>
    );
};
