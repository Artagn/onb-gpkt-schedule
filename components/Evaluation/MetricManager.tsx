/**
 * MetricManager - Admin only: Manage evaluation metrics
 * CRUD for các chỉ tiêu đánh giá (Thẻ Tự học, Đi muộn, etc.)
 */

import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Save, X, Loader2, RefreshCw, Power } from 'lucide-react';
import { useEvaluationMetricsQuery, useEvaluationMetricMutation } from '../../hooks/useEvaluationQuery';
import { EvaluationMetric, MetricCategory } from '../../types';
import toast from 'react-hot-toast';

const CATEGORY_LABELS: Record<MetricCategory, { label: string; color: string }> = {
    crm_card: { label: 'Thẻ CRM', color: 'bg-blue-100 text-blue-800' },
    work: { label: 'Công việc', color: 'bg-green-100 text-green-800' },
    violation: { label: 'Vi phạm', color: 'bg-red-100 text-red-800' },
    livechat_difficulty: { label: 'Độ khó Livechat', color: 'bg-purple-100 text-purple-800' },
};

export default function MetricManager() {
    const { data: metrics = [], isLoading, refetch } = useEvaluationMetricsQuery();
    const { saveMutation, deleteMutation, seedMutation } = useEvaluationMetricMutation();

    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<EvaluationMetric>>({});
    const [isAdding, setIsAdding] = useState(false);

    // Group by category
    const grouped = {
        crm_card: metrics.filter(m => m.category === 'crm_card').sort((a, b) => a.order - b.order),
        work: metrics.filter(m => m.category === 'work').sort((a, b) => a.order - b.order),
        violation: metrics.filter(m => m.category === 'violation').sort((a, b) => a.order - b.order),
        livechat_difficulty: metrics.filter(m => m.category === 'livechat_difficulty').sort((a, b) => a.order - b.order),
    };

    const handleSeed = async () => {
        if (!confirm('Tạo các chỉ tiêu mặc định? (Chỉ hoạt động nếu chưa có dữ liệu)')) return;
        try {
            const seeded = await seedMutation.mutateAsync();
            if (seeded) {
                toast.success('Đã tạo chỉ tiêu mặc định!');
            } else {
                toast.error('Đã có dữ liệu, không cần tạo mới');
            }
        } catch (e) {
            toast.error('Lỗi khi tạo dữ liệu mặc định');
        }
    };

    const handleEdit = (metric: EvaluationMetric) => {
        setEditingId(metric.id);
        setFormData(metric);
        setIsAdding(false);
    };

    const handleAdd = () => {
        setIsAdding(true);
        setEditingId(null);
        setFormData({
            name: '',
            category: 'crm_card',
            defaultPoints: 1,
            isActive: true,
            order: metrics.length + 1,
        });
    };

    const handleCancel = () => {
        setEditingId(null);
        setIsAdding(false);
        setFormData({});
    };

    const handleSave = async () => {
        if (!formData.name) {
            toast.error('Vui lòng nhập tên chỉ tiêu');
            return;
        }

        const metric: EvaluationMetric = {
            id: editingId || (formData.category === 'livechat_difficulty' && formData.id ? formData.id : `metric_${Date.now()}`),
            name: formData.name!,
            category: formData.category as MetricCategory,
            defaultPoints: formData.defaultPoints || 0,
            isActive: formData.isActive ?? true,
            order: formData.order || 0,
        };

        try {
            await saveMutation.mutateAsync(metric);
            toast.success(editingId ? 'Đã cập nhật!' : 'Đã thêm mới!');
            handleCancel();
        } catch (e) {
            toast.error('Lỗi khi lưu');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Xóa chỉ tiêu này?')) return;
        try {
            await deleteMutation.mutateAsync(id);
            toast.success('Đã xóa!');
        } catch (e) {
            toast.error('Lỗi khi xóa');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2">Đang tải...</span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Quản lý Chỉ tiêu Đánh giá</h3>
                <div className="flex gap-2">
                    <button
                        onClick={handleSeed}
                        className="btn-secondary text-xs flex items-center gap-1"
                        disabled={seedMutation.isPending}
                    >
                        <RefreshCw className="w-4 h-4" />
                        Tạo mặc định
                    </button>
                    <button
                        onClick={handleAdd}
                        className="btn-primary text-xs flex items-center gap-1"
                    >
                        <Plus className="w-4 h-4" />
                        Thêm mới
                    </button>
                </div>
            </div>

            {/* Add/Edit Form */}
            {(isAdding || editingId) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                            <label className="text-xs font-medium text-gray-600">Tên chỉ tiêu</label>
                            <input
                                type="text"
                                value={formData.name || ''}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="input-text text-sm w-full"
                                placeholder="VD: Thẻ Tự học"
                            />
                        </div>
                        {formData.category === 'livechat_difficulty' && isAdding && (
                            <div>
                                <label className="text-xs font-medium text-gray-600">ID (cho backward compatible)</label>
                                <input
                                    type="text"
                                    value={formData.id || ''}
                                    onChange={e => setFormData({ ...formData, id: e.target.value })}
                                    className="input-text text-sm w-full"
                                    placeholder="VD: easy, medium, hard"
                                />
                            </div>
                        )}
                        <div>
                            <label className="text-xs font-medium text-gray-600">Nhóm</label>
                            <select
                                value={formData.category || 'crm_card'}
                                onChange={e => setFormData({ ...formData, category: e.target.value as MetricCategory })}
                                className="input-text text-sm w-full"
                            >
                                <option value="crm_card">Thẻ CRM</option>
                                <option value="work">Công việc</option>
                                <option value="violation">Vi phạm</option>
                                <option value="livechat_difficulty">Độ khó Livechat</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600">Điểm mặc định</label>
                            <input
                                type="number"
                                step="0.1"
                                value={formData.defaultPoints || 0}
                                onChange={e => setFormData({ ...formData, defaultPoints: parseFloat(e.target.value) })}
                                className="input-text text-sm w-full"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600">Thứ tự</label>
                            <input
                                type="number"
                                value={formData.order || 0}
                                onChange={e => setFormData({ ...formData, order: parseInt(e.target.value) })}
                                className="input-text text-sm w-full"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button onClick={handleCancel} className="btn-secondary text-xs flex items-center gap-1">
                            <X className="w-4 h-4" /> Hủy
                        </button>
                        <button
                            onClick={handleSave}
                            className="btn-primary text-xs flex items-center gap-1"
                            disabled={saveMutation.isPending}
                        >
                            <Save className="w-4 h-4" /> Lưu
                        </button>
                    </div>
                </div>
            )}

            {/* Metrics Table by Category */}
            {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat} className="border rounded-lg overflow-hidden">
                    <div className={`px-3 py-2 ${CATEGORY_LABELS[cat as MetricCategory].color} font-medium text-sm`}>
                        {CATEGORY_LABELS[cat as MetricCategory].label} ({items.length})
                    </div>
                    {items.length === 0 ? (
                        <div className="p-3 text-sm text-gray-500 italic">Chưa có chỉ tiêu</div>
                    ) : (
                        <table className="w-full text-xs">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-left px-3 py-2">Tên</th>
                                    <th className="text-right px-3 py-2 w-24">
                                        {cat === 'livechat_difficulty' ? 'Hệ số' : 'Điểm MĐ'}
                                    </th>
                                    <th className="text-center px-3 py-2 w-16">TT</th>
                                    <th className="text-center px-3 py-2 w-24">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(m => (
                                    <tr key={m.id} className="border-t hover:bg-gray-50">
                                        <td className="px-3 py-2">{m.name}</td>
                                        <td className="px-3 py-2 text-right font-mono">
                                            {m.defaultPoints > 0 ? `+${m.defaultPoints}` : m.defaultPoints}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            {m.isActive ? (
                                                <span className="text-green-600">✓</span>
                                            ) : (
                                                <span className="text-gray-400">–</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="flex justify-center gap-1">
                                                <button
                                                    onClick={() => handleEdit(m)}
                                                    className="p-1 hover:bg-blue-100 rounded"
                                                    title="Sửa"
                                                >
                                                    <Edit2 className="w-4 h-4 text-blue-600" />
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        const updated = { ...m, isActive: !m.isActive };
                                                        await saveMutation.mutateAsync(updated);
                                                        toast.success(m.isActive ? 'Đã ngừng sử dụng' : 'Đã kích hoạt lại');
                                                    }}
                                                    className={`p-1 rounded ${m.isActive ? 'hover:bg-orange-100' : 'hover:bg-green-100'}`}
                                                    title={m.isActive ? 'Ngừng sử dụng' : 'Kích hoạt lại'}
                                                >
                                                    <Power className={`w-4 h-4 ${m.isActive ? 'text-orange-500' : 'text-green-600'}`} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(m.id)}
                                                    className="p-1 hover:bg-red-100 rounded"
                                                    title="Xóa"
                                                >
                                                    <Trash2 className="w-4 h-4 text-red-600" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            ))}
        </div>
    );
}
