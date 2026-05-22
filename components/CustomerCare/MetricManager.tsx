/**
 * MetricManager.tsx - Quản lý chỉ tiêu chăm sóc KH
 * 
 * Admin/Coordinator/KS employees:
 * - CRUD chỉ tiêu: Thêm, Sửa, Toggle Active/Inactive, Xóa
 * - Seed 4 chỉ tiêu mặc định
 */

import React, { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Power, PowerOff, Loader2, Sparkles, Save, X, GripVertical, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { CareMetric } from '../../types';
import { useCareMetricMutation } from '../../hooks/useCareQuery';

interface MetricManagerProps {
    metrics: CareMetric[];
    loading: boolean;
}

const MetricManager: React.FC<MetricManagerProps> = ({ metrics, loading }) => {
    const { saveMutation, deleteMutation, seedMutation } = useCareMetricMutation();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    // Form state
    const [formName, setFormName] = useState('');
    const [formCode, setFormCode] = useState('');
    const [formUnit, setFormUnit] = useState('');

    const sortedMetrics = useMemo(() => {
        return [...metrics].sort((a, b) => a.order - b.order);
    }, [metrics]);

    // Seed defaults
    const handleSeed = async () => {
        try {
            const seeded = await seedMutation.mutateAsync();
            if (seeded) {
                toast.success('Đã tạo 4 chỉ tiêu mặc định!');
            } else {
                toast('Tất cả chỉ tiêu mặc định đã tồn tại.', { icon: 'ℹ️' });
            }
        } catch (error) {
            toast.error('Lỗi khi tạo chỉ tiêu mặc định.');
        }
    };

    // Start editing
    const startEdit = (metric: CareMetric) => {
        setEditingId(metric.id);
        setFormName(metric.name);
        setFormCode(metric.code);
        setFormUnit(metric.unit || '');
    };

    // Cancel editing
    const cancelEdit = () => {
        setEditingId(null);
        setShowAddForm(false);
        setFormName('');
        setFormCode('');
        setFormUnit('');
    };

    // Save metric
    const handleSave = async (existingMetric?: CareMetric) => {
        if (!formName.trim() || !formCode.trim()) {
            toast.error('Tên và Mã chỉ tiêu không được trống.');
            return;
        }

        const metric: CareMetric = {
            id: existingMetric?.id || formCode.trim().toLowerCase().replace(/\s+/g, '_'),
            name: formName.trim(),
            code: formCode.trim().toLowerCase(),
            unit: formUnit.trim() || undefined,
            isActive: existingMetric?.isActive ?? true,
            order: existingMetric?.order ?? (sortedMetrics.length + 1),
            createdAt: existingMetric?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        try {
            await saveMutation.mutateAsync(metric);
            toast.success(existingMetric ? 'Đã cập nhật chỉ tiêu!' : 'Đã thêm chỉ tiêu mới!');
            cancelEdit();
        } catch (error) {
            toast.error('Lỗi khi lưu chỉ tiêu.');
        }
    };

    // Toggle active
    const handleToggle = async (metric: CareMetric) => {
        try {
            await saveMutation.mutateAsync({ ...metric, isActive: !metric.isActive, updatedAt: new Date().toISOString() });
            toast.success(metric.isActive ? 'Đã ngừng chỉ tiêu.' : 'Đã kích hoạt chỉ tiêu.');
        } catch (error) {
            toast.error('Lỗi khi thay đổi trạng thái.');
        }
    };

    // Delete
    const handleDelete = async (id: string) => {
        try {
            await deleteMutation.mutateAsync(id);
            toast.success('Đã xóa chỉ tiêu.');
            setDeleteConfirm(null);
        } catch (error) {
            toast.error('Lỗi khi xóa chỉ tiêu.');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                <span className="text-slate-500">Đang tải danh sách chỉ tiêu...</span>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-bold text-slate-800">Quản lý chỉ tiêu chăm sóc KH</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Thêm, sửa, xóa hoặc ngừng sử dụng các chỉ tiêu</p>
                </div>
                <div className="flex gap-2">
                    {sortedMetrics.length === 0 && (
                        <button
                            onClick={handleSeed}
                            disabled={seedMutation.isPending}
                            className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-medium hover:bg-amber-100 transition-colors disabled:opacity-50"
                        >
                            {seedMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                            Tạo mặc định
                        </button>
                    )}
                    <button
                        onClick={() => { cancelEdit(); setShowAddForm(true); }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Thêm mới
                    </button>
                </div>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                    <h4 className="text-sm font-bold text-blue-800">Thêm chỉ tiêu mới</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className="text-xs font-medium text-slate-600 block mb-1">Tên hiển thị *</label>
                            <input
                                type="text"
                                value={formName}
                                onChange={e => setFormName(e.target.value)}
                                placeholder="VD: Số cuộc gọi"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-600 block mb-1">Mã chỉ tiêu *</label>
                            <input
                                type="text"
                                value={formCode}
                                onChange={e => setFormCode(e.target.value)}
                                placeholder="VD: call_count"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-600 block mb-1">Đơn vị (tùy chọn)</label>
                            <input
                                type="text"
                                value={formUnit}
                                onChange={e => setFormUnit(e.target.value)}
                                placeholder="VD: cuộc, phút..."
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleSave()}
                            disabled={saveMutation.isPending}
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                        >
                            {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            Lưu
                        </button>
                        <button onClick={cancelEdit} className="flex items-center gap-1.5 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-300">
                            <X className="w-3.5 h-3.5" /> Hủy
                        </button>
                    </div>
                </div>
            )}

            {/* Metric List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {sortedMetrics.length === 0 ? (
                    <div className="py-12 text-center">
                        <div className="text-4xl mb-3">📋</div>
                        <p className="text-sm text-slate-500">Chưa có chỉ tiêu nào.</p>
                        <p className="text-xs text-slate-400 mt-1">Nhấn "Tạo mặc định" để khởi tạo 4 chỉ tiêu ban đầu.</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 w-8">#</th>
                                <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500">Tên</th>
                                <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 hidden md:table-cell">Mã</th>
                                <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 w-24">Đơn vị</th>
                                <th className="text-center py-2.5 px-3 text-xs font-semibold text-slate-500 w-24">Trạng thái</th>
                                <th className="text-center py-2.5 px-3 text-xs font-semibold text-slate-500 w-32">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedMetrics.map((metric, idx) => (
                                <tr key={metric.id} className={`border-b border-slate-100 ${!metric.isActive ? 'opacity-50' : ''} hover:bg-slate-50 transition-colors`}>
                                    <td className="py-2.5 px-3 text-xs text-slate-400 font-medium">{metric.order}</td>
                                    <td className="py-2.5 px-3">
                                        {editingId === metric.id ? (
                                            <input
                                                type="text"
                                                value={formName}
                                                onChange={e => setFormName(e.target.value)}
                                                className="w-full px-2 py-1 border border-blue-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                                            />
                                        ) : (
                                            <div className="font-medium text-slate-700">{metric.name}</div>
                                        )}
                                    </td>
                                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 hidden md:table-cell">
                                        {editingId === metric.id ? (
                                            <input
                                                type="text"
                                                value={formCode}
                                                onChange={e => setFormCode(e.target.value)}
                                                className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-mono focus:ring-2 focus:ring-blue-500"
                                            />
                                        ) : (
                                            metric.code
                                        )}
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-500">
                                        {editingId === metric.id ? (
                                            <input
                                                type="text"
                                                value={formUnit}
                                                onChange={e => setFormUnit(e.target.value)}
                                                className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                                            />
                                        ) : (
                                            metric.unit || '-'
                                        )}
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${metric.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {metric.isActive ? 'Hoạt động' : 'Ngừng'}
                                        </span>
                                    </td>
                                    <td className="py-2.5 px-3">
                                        {editingId === metric.id ? (
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => handleSave(metric)}
                                                    disabled={saveMutation.isPending}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                                                    title="Lưu"
                                                >
                                                    <Save className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={cancelEdit} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg" title="Hủy">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ) : deleteConfirm === metric.id ? (
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => handleDelete(metric.id)}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold"
                                                    title="Xác nhận xóa"
                                                >
                                                    ✓
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(null)}
                                                    className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg text-xs"
                                                    title="Hủy xóa"
                                                >
                                                    ✗
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center gap-0.5">
                                                <button onClick={() => startEdit(metric)} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg" title="Sửa">
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => handleToggle(metric)} className="p-1.5 hover:bg-slate-100 rounded-lg" title={metric.isActive ? 'Ngừng' : 'Kích hoạt'}>
                                                    {metric.isActive ? <PowerOff className="w-3.5 h-3.5 text-amber-500" /> : <Power className="w-3.5 h-3.5 text-emerald-500" />}
                                                </button>
                                                <button onClick={() => setDeleteConfirm(metric.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg" title="Xóa">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default MetricManager;
