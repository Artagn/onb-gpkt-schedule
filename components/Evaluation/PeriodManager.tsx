/**
 * PeriodManager - Admin/Coordinator: Manage evaluation periods
 * Tạo và quản lý các đợt đánh giá hàng tháng
 */

import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Save, X, Loader2, Calendar, Play, Lock, CheckCircle } from 'lucide-react';
import { useEvaluationPeriodsQuery, useEvaluationPeriodMutation, useEvaluationMetricsQuery } from '../../hooks/useEvaluationQuery';
import { EvaluationPeriod } from '../../types';
import { useData } from '../../context/DataContext';
import { auth } from '../../services/firebaseConfig';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
    draft: { label: 'Nháp', color: 'bg-gray-100 text-gray-600', icon: Edit2 },
    open: { label: 'Đang mở', color: 'bg-green-100 text-green-700', icon: Play },
    reviewing: { label: 'Đang duyệt', color: 'bg-yellow-100 text-yellow-700', icon: CheckCircle },
    closed: { label: 'Đã đóng', color: 'bg-red-100 text-red-700', icon: Lock },
};

const isLocked = (period: EvaluationPeriod) => !!period.lockedAt;

export default function PeriodManager() {
    const { employees, jobs } = useData();
    const currentUser = auth.currentUser;
    const { data: periods = [], isLoading } = useEvaluationPeriodsQuery();
    const { data: metrics = [] } = useEvaluationMetricsQuery();
    const { saveMutation, deleteMutation, createMutation } = useEvaluationPeriodMutation();

    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newMonth, setNewMonth] = useState(new Date().getMonth() + 1);
    const [newYear, setNewYear] = useState(new Date().getFullYear());
    const [editData, setEditData] = useState<Partial<EvaluationPeriod>>({});

    // Filter active Livechat jobs
    const livechatJobs = jobs.filter(j => j.group === 'Livechat' && j.isActive);

    const sortedPeriods = [...periods].sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
    });

    const handleCreate = async () => {
        // Check if period already exists
        const exists = periods.some(p => p.month === newMonth && p.year === newYear);
        if (exists) {
            toast.error(`Đợt đánh giá tháng ${newMonth}/${newYear} đã tồn tại!`);
            return;
        }

        try {
            await createMutation.mutateAsync({
                month: newMonth,
                year: newYear,
                createdBy: currentUser?.email || 'unknown',
            });
            toast.success('Đã tạo đợt đánh giá mới!');
            setIsCreating(false);
        } catch (e) {
            toast.error('Lỗi khi tạo đợt đánh giá');
        }
    };

    const handleEdit = (period: EvaluationPeriod) => {
        setEditingId(period.id);
        setEditData(period);
    };

    const handleSave = async () => {
        if (!editData.id) return;

        const updated: EvaluationPeriod = {
            ...editData as EvaluationPeriod,
            updatedAt: new Date().toISOString(),
        };

        try {
            await saveMutation.mutateAsync(updated);
            toast.success('Đã cập nhật!');
            setEditingId(null);
            setEditData({});
        } catch (e) {
            toast.error('Lỗi khi lưu');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Xóa đợt đánh giá này? Tất cả dữ liệu đánh giá liên quan sẽ bị mất!')) return;
        try {
            await deleteMutation.mutateAsync(id);
            toast.success('Đã xóa!');
        } catch (e) {
            toast.error('Lỗi khi xóa');
        }
    };

    const handleStatusChange = async (period: EvaluationPeriod, newStatus: EvaluationPeriod['status']) => {
        const updated = { ...period, status: newStatus, updatedAt: new Date().toISOString() };
        try {
            await saveMutation.mutateAsync(updated);
            toast.success(`Đã chuyển sang trạng thái: ${STATUS_CONFIG[newStatus].label}`);
        } catch (e) {
            toast.error('Lỗi khi cập nhật trạng thái');
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
                <h3 className="text-lg font-semibold">Quản lý Đợt Đánh giá</h3>
                <button
                    onClick={() => setIsCreating(true)}
                    className="btn-primary text-xs flex items-center gap-1"
                >
                    <Plus className="w-4 h-4" />
                    Tạo đợt mới
                </button>
            </div>

            {/* Create Form */}
            {isCreating && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                    <h4 className="font-medium text-sm">Tạo đợt đánh giá mới</h4>
                    <div className="flex gap-3 items-end">
                        <div>
                            <label className="text-xs font-medium text-gray-600">Tháng</label>
                            <select
                                value={newMonth}
                                onChange={e => setNewMonth(parseInt(e.target.value))}
                                className="input-text text-sm"
                            >
                                {Array.from({ length: 12 }, (_, i) => (
                                    <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600">Năm</label>
                            <select
                                value={newYear}
                                onChange={e => setNewYear(parseInt(e.target.value))}
                                className="input-text text-sm"
                            >
                                {Array.from({ length: 5 }, (_, i) => (
                                    <option key={newYear - 2 + i} value={newYear - 2 + i}>{newYear - 2 + i}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={handleCreate}
                            className="btn-primary text-xs flex items-center gap-1"
                            disabled={createMutation.isPending}
                        >
                            <Save className="w-4 h-4" /> Tạo
                        </button>
                        <button
                            onClick={() => setIsCreating(false)}
                            className="btn-secondary text-xs"
                        >
                            Hủy
                        </button>
                    </div>
                </div>
            )}

            {/* Periods List */}
            {sortedPeriods.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>Chưa có đợt đánh giá nào</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {sortedPeriods.map(period => {
                        const StatusIcon = STATUS_CONFIG[period.status].icon;
                        const isEditing = editingId === period.id;

                        return (
                            <div
                                key={period.id}
                                className={`border rounded-lg p-4 ${isEditing ? 'bg-yellow-50 border-yellow-300' : 'bg-white'}`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${STATUS_CONFIG[period.status].color}`}>
                                            <StatusIcon className="w-3 h-3" />
                                            {STATUS_CONFIG[period.status].label}
                                        </span>
                                        <span className="font-semibold">{period.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {/* Status Actions - Forward */}
                                        {period.status === 'draft' && (
                                            <button
                                                onClick={() => handleStatusChange(period, 'open')}
                                                className="text-xs text-green-600 hover:underline"
                                            >
                                                Mở đánh giá
                                            </button>
                                        )}
                                        {period.status === 'open' && (
                                            <>
                                                <button
                                                    onClick={() => handleStatusChange(period, 'reviewing')}
                                                    className="text-xs text-yellow-600 hover:underline"
                                                >
                                                    Chuyển duyệt
                                                </button>
                                                <span className="text-gray-300">|</span>
                                                <button
                                                    onClick={() => {
                                                        if (confirm('Chuyển về Nháp? Nhân viên sẽ không thể đánh giá.')) {
                                                            handleStatusChange(period, 'draft');
                                                        }
                                                    }}
                                                    className="text-xs text-gray-500 hover:underline"
                                                >
                                                    ← Về nháp
                                                </button>
                                            </>
                                        )}
                                        {period.status === 'reviewing' && (
                                            <>
                                                <button
                                                    onClick={() => handleStatusChange(period, 'closed')}
                                                    className="text-xs text-red-600 hover:underline"
                                                >
                                                    Đóng
                                                </button>
                                                <span className="text-gray-300">|</span>
                                                <button
                                                    onClick={() => handleStatusChange(period, 'open')}
                                                    className="text-xs text-gray-500 hover:underline"
                                                >
                                                    ← Mở lại
                                                </button>
                                            </>
                                        )}
                                        {period.status === 'closed' && !isLocked(period) && (
                                            <button
                                                onClick={() => {
                                                    if (confirm('Mở lại đợt đánh giá này?')) {
                                                        handleStatusChange(period, 'reviewing');
                                                    }
                                                }}
                                                className="text-xs text-blue-600 hover:underline"
                                            >
                                                ↺ Mở lại duyệt
                                            </button>
                                        )}
                                        {period.status === 'closed' && isLocked(period) && (
                                            <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-medium border border-amber-300">
                                                <Lock className="w-3 h-3" />
                                                Đã khóa
                                            </span>
                                        )}
                                        {!isLocked(period) && (
                                            <button
                                                onClick={() => handleEdit(period)}
                                                className="p-1 hover:bg-blue-100 rounded"
                                                title="Chỉnh sửa cấu hình"
                                            >
                                                <Edit2 className="w-4 h-4 text-blue-600" />
                                            </button>
                                        )}
                                        {period.status === 'draft' && (
                                            <button
                                                onClick={() => handleDelete(period.id)}
                                                className="p-1 hover:bg-red-100 rounded"
                                                title="Xóa"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-600" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Config Summary */}
                                <div className="mt-2 text-xs text-gray-500 grid grid-cols-2 md:grid-cols-4 gap-2">
                                    <span>DT KPI Plan: {period.dtConfig.kpiPlanRate}%</span>
                                    <span>DT: {period.dtConfig.kpiWeight}/{period.dtConfig.workWeight}</span>
                                    <span>DT LC: {Object.keys(period.dtConfig.livechatStandards || {}).length} job(s)</span>
                                    <span>KS TL KH: {period.ksConfig.kpiPlanRate || 95}/{period.ksConfig.kpiPlanRatePrevYear || 93}%</span>
                                </div>

                                {/* Edit Form */}
                                {isEditing && (
                                    <div className="mt-4 pt-4 border-t space-y-3">
                                        <h5 className="text-sm font-medium">Chỉnh sửa cấu hình</h5>

                                        {/* DT Config - Chuyển giao */}
                                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                            <h6 className="text-xs font-bold text-blue-700 mb-2 flex items-center gap-1">
                                                📘 Cấu hình Chuyển giao (DT)
                                            </h6>
                                            <div className="grid grid-cols-2 gap-3 text-xs">
                                                <div>
                                                    <label className="text-gray-600">Tỷ lệ KPI kế hoạch (%)</label>
                                                    <input
                                                        type="number"
                                                        value={editData.dtConfig?.kpiPlanRate || 95}
                                                        onChange={e => setEditData({
                                                            ...editData,
                                                            dtConfig: { ...editData.dtConfig!, kpiPlanRate: parseFloat(e.target.value) }
                                                        })}
                                                        className="input-text text-xs w-full"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-gray-600">Trọng số KPI (%)</label>
                                                    <input
                                                        type="number"
                                                        value={editData.dtConfig?.kpiWeight || 80}
                                                        onChange={e => setEditData({
                                                            ...editData,
                                                            dtConfig: { ...editData.dtConfig!, kpiWeight: parseFloat(e.target.value) }
                                                        })}
                                                        className="input-text text-xs w-full"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-gray-600">Trọng số Công việc (%)</label>
                                                    <input
                                                        type="number"
                                                        value={editData.dtConfig?.workWeight || 20}
                                                        onChange={e => setEditData({
                                                            ...editData,
                                                            dtConfig: { ...editData.dtConfig!, workWeight: parseFloat(e.target.value) }
                                                        })}
                                                        className="input-text text-xs w-full"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Livechat Standards Config */}
                                        <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                                            <h6 className="text-xs font-bold text-purple-700 mb-2 flex items-center gap-1">
                                                📊 Điểm chỉ tiêu nhóm Livechat
                                            </h6>
                                            <div className="space-y-2">
                                                {livechatJobs.length === 0 ? (
                                                    <p className="text-xs text-gray-500 italic">Không có công việc Livechat nào</p>
                                                ) : (
                                                    livechatJobs.map(job => (
                                                        <div key={job.id} className="flex items-center gap-2 text-xs">
                                                            <span className="flex-1 text-gray-700">{job.name}</span>
                                                            <input
                                                                type="number"
                                                                placeholder="35"
                                                                value={editData.dtConfig?.livechatStandards?.[job.id] || ''}
                                                                onChange={e => setEditData({
                                                                    ...editData,
                                                                    dtConfig: {
                                                                        ...editData.dtConfig!,
                                                                        livechatStandards: {
                                                                            ...(editData.dtConfig?.livechatStandards || {}),
                                                                            [job.id]: parseFloat(e.target.value) || 0
                                                                        }
                                                                    }
                                                                })}
                                                                className="input-text text-xs w-20 text-right"
                                                            />
                                                            <span className="text-gray-500 w-16">điểm/buổi</span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>

                                        {/* KS Config - Kiểm soát */}
                                        <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                                            <h6 className="text-xs font-bold text-orange-700 mb-2 flex items-center gap-1">
                                                📙 Cấu hình Kiểm soát (KS)
                                            </h6>
                                            <div className="grid grid-cols-2 gap-3 text-xs">
                                                <div>
                                                    <label className="text-gray-600">TL kế hoạch năm nay (%)</label>
                                                    <input
                                                        type="number"
                                                        value={editData.ksConfig?.kpiPlanRate || 95}
                                                        onChange={e => setEditData({
                                                            ...editData,
                                                            ksConfig: { ...editData.ksConfig!, kpiPlanRate: parseFloat(e.target.value) }
                                                        })}
                                                        className="input-text text-xs w-full"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-gray-600">TL kế hoạch năm trước (%)</label>
                                                    <input
                                                        type="number"
                                                        value={editData.ksConfig?.kpiPlanRatePrevYear || 93}
                                                        onChange={e => setEditData({
                                                            ...editData,
                                                            ksConfig: { ...editData.ksConfig!, kpiPlanRatePrevYear: parseFloat(e.target.value) }
                                                        })}
                                                        className="input-text text-xs w-full"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-gray-600">Trọng số năm nay (%)</label>
                                                    <input
                                                        type="number"
                                                        value={editData.ksConfig?.currentYearWeight || 70}
                                                        onChange={e => setEditData({
                                                            ...editData,
                                                            ksConfig: { ...editData.ksConfig!, currentYearWeight: parseFloat(e.target.value) }
                                                        })}
                                                        className="input-text text-xs w-full"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-gray-600">Trọng số năm trước (%)</label>
                                                    <input
                                                        type="number"
                                                        value={editData.ksConfig?.previousYearWeight || 30}
                                                        onChange={e => setEditData({
                                                            ...editData,
                                                            ksConfig: { ...editData.ksConfig!, previousYearWeight: parseFloat(e.target.value) }
                                                        })}
                                                        className="input-text text-xs w-full"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Ngưỡng xếp hạng */}
                                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                            <h6 className="text-xs font-bold text-gray-700 mb-2">⚙️ Ngưỡng xếp hạng chung</h6>
                                            <div className="grid grid-cols-2 gap-3 text-xs">
                                                <div>
                                                    <label className="text-gray-600">Ngưỡng Đạt (%)</label>
                                                    <input
                                                        type="number"
                                                        value={editData.ratingThresholds?.good || 100}
                                                        onChange={e => setEditData({
                                                            ...editData,
                                                            ratingThresholds: { ...editData.ratingThresholds!, good: parseFloat(e.target.value) }
                                                        })}
                                                        className="input-text text-xs w-full"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-gray-600">Ngưỡng Vượt mong đợi (%)</label>
                                                    <input
                                                        type="number"
                                                        value={editData.ratingThresholds?.excellent || 105}
                                                        onChange={e => setEditData({
                                                            ...editData,
                                                            ratingThresholds: { ...editData.ratingThresholds!, excellent: parseFloat(e.target.value) }
                                                        })}
                                                        className="input-text text-xs w-full"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Metric Overrides */}
                                        <div>
                                            <label className="text-xs font-medium text-gray-600 mb-2 block">
                                                Điểm chỉ tiêu (Override mặc định)
                                            </label>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                                {metrics.map(m => (
                                                    <div key={m.id} className="flex items-center gap-1">
                                                        <span className="truncate flex-1" title={m.name}>{m.name}</span>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            value={editData.metricOverrides?.[m.id] ?? m.defaultPoints}
                                                            onChange={e => setEditData({
                                                                ...editData,
                                                                metricOverrides: {
                                                                    ...editData.metricOverrides,
                                                                    [m.id]: parseFloat(e.target.value)
                                                                }
                                                            })}
                                                            className="input-text text-xs w-16"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex gap-2 justify-end">
                                            <button
                                                onClick={() => { setEditingId(null); setEditData({}); }}
                                                className="btn-secondary text-xs"
                                            >
                                                Hủy
                                            </button>
                                            <button
                                                onClick={handleSave}
                                                className="btn-primary text-xs"
                                                disabled={saveMutation.isPending}
                                            >
                                                Lưu
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
