/**
 * CampaignManager.tsx - Quản lý chiến dịch chăm sóc KH
 * 
 * Admin/Coordinator only:
 * - CRUD chiến dịch: Thêm, Sửa, Toggle Active/Inactive, Xóa
 * - Seed 6 chiến dịch mặc định
 * - Reorder (order field)
 */

import React, { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Power, PowerOff, Loader2, Sparkles, Save, X, GripVertical, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { CareCampaign } from '../../types';
import { useCareCampaignMutation } from '../../hooks/useCareQuery';

interface CampaignManagerProps {
    campaigns: CareCampaign[];
    loading: boolean;
}

const CampaignManager: React.FC<CampaignManagerProps> = ({ campaigns, loading }) => {
    const { saveMutation, deleteMutation, seedMutation } = useCareCampaignMutation();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    // Form state
    const [formName, setFormName] = useState('');
    const [formCode, setFormCode] = useState('');
    const [formDesc, setFormDesc] = useState('');

    const sortedCampaigns = useMemo(() => {
        return [...campaigns].sort((a, b) => a.order - b.order);
    }, [campaigns]);

    // Seed defaults
    const handleSeed = async () => {
        try {
            const seeded = await seedMutation.mutateAsync();
            if (seeded) {
                toast.success('Đã tạo 6 chiến dịch mặc định!');
            } else {
                toast('Tất cả chiến dịch mặc định đã tồn tại.', { icon: 'ℹ️' });
            }
        } catch (error) {
            toast.error('Lỗi khi tạo chiến dịch mặc định.');
        }
    };

    // Start editing
    const startEdit = (campaign: CareCampaign) => {
        setEditingId(campaign.id);
        setFormName(campaign.name);
        setFormCode(campaign.code);
        setFormDesc(campaign.description || '');
    };

    // Cancel editing
    const cancelEdit = () => {
        setEditingId(null);
        setShowAddForm(false);
        setFormName('');
        setFormCode('');
        setFormDesc('');
    };

    // Save campaign
    const handleSave = async (existingCampaign?: CareCampaign) => {
        if (!formName.trim() || !formCode.trim()) {
            toast.error('Tên và Mã chiến dịch không được trống.');
            return;
        }

        const safeId = existingCampaign?.id ||
            formCode.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') ||
            `CAMP_${Date.now()}`;

        if (!existingCampaign && campaigns.some(c => c.id === safeId)) {
            toast.error(`Mã chiến dịch "${safeId}" đã tồn tại. Vui lòng chọn mã khác.`);
            return;
        }

        const campaign: CareCampaign = {
            id: safeId,
            name: formName.trim(),
            code: formCode.trim(),
            description: formDesc.trim() || undefined,
            isActive: existingCampaign?.isActive ?? true,
            order: existingCampaign?.order ?? (sortedCampaigns.length + 1),
            createdAt: existingCampaign?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        try {
            await saveMutation.mutateAsync(campaign);
            toast.success(existingCampaign ? 'Đã cập nhật chiến dịch!' : 'Đã thêm chiến dịch mới!');
            cancelEdit();
        } catch (error: any) {
            console.error('Error saving campaign:', error);
            toast.error(`Lỗi khi lưu chiến dịch: ${error?.message || 'Không xác định'}`);
        }
    };

    // Toggle active
    const handleToggle = async (campaign: CareCampaign) => {
        try {
            await saveMutation.mutateAsync({ ...campaign, isActive: !campaign.isActive });
            toast.success(campaign.isActive ? 'Đã ngừng chiến dịch.' : 'Đã kích hoạt chiến dịch.');
        } catch (error) {
            toast.error('Lỗi khi thay đổi trạng thái.');
        }
    };

    // Delete
    const handleDelete = async (id: string) => {
        try {
            await deleteMutation.mutateAsync(id);
            toast.success('Đã xóa chiến dịch.');
            setDeleteConfirm(null);
        } catch (error) {
            toast.error('Lỗi khi xóa chiến dịch.');
        }
    };

    // Move order
    const handleMoveOrder = async (campaign: CareCampaign, delta: number) => {
        const newOrder = campaign.order + delta;
        if (newOrder < 1) return;
        // Swap with adjacent
        const swapTarget = sortedCampaigns.find(c => c.order === newOrder);
        try {
            await saveMutation.mutateAsync({ ...campaign, order: newOrder });
            if (swapTarget) {
                await saveMutation.mutateAsync({ ...swapTarget, order: campaign.order });
            }
        } catch (error) {
            toast.error('Lỗi khi thay đổi thứ tự.');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                <span className="text-slate-500">Đang tải danh sách chiến dịch...</span>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-bold text-slate-800">Quản lý chiến dịch chăm sóc KH</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Thêm, sửa, xóa hoặc ngừng sử dụng các chiến dịch</p>
                </div>
                <div className="flex gap-2">
                    {sortedCampaigns.length === 0 && (
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
                    <h4 className="text-sm font-bold text-blue-800">Thêm chiến dịch mới</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium text-slate-600 block mb-1">Tên hiển thị *</label>
                            <input
                                type="text"
                                value={formName}
                                onChange={e => setFormName(e.target.value)}
                                placeholder="VD: Ngưng - Chưa CS"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-600 block mb-1">Mã chiến dịch *</label>
                            <input
                                type="text"
                                value={formCode}
                                onChange={e => setFormCode(e.target.value)}
                                placeholder="VD: TTCG_ONBGPKT_NGUNG_CHUACS"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-600 block mb-1">Mô tả (tùy chọn)</label>
                        <input
                            type="text"
                            value={formDesc}
                            onChange={e => setFormDesc(e.target.value)}
                            placeholder="Mô tả ngắn..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        />
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

            {/* Campaign List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {sortedCampaigns.length === 0 ? (
                    <div className="py-12 text-center">
                        <div className="text-4xl mb-3">📋</div>
                        <p className="text-sm text-slate-500">Chưa có chiến dịch nào.</p>
                        <p className="text-xs text-slate-400 mt-1">Nhấn "Tạo mặc định" để khởi tạo 6 chiến dịch ban đầu.</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 w-8">#</th>
                                <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500">Tên</th>
                                <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 hidden md:table-cell">Mã</th>
                                <th className="text-center py-2.5 px-3 text-xs font-semibold text-slate-500 w-24">Trạng thái</th>
                                <th className="text-center py-2.5 px-3 text-xs font-semibold text-slate-500 w-32">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedCampaigns.map((campaign, idx) => (
                                <tr key={campaign.id} className={`border-b border-slate-100 ${!campaign.isActive ? 'opacity-50' : ''} hover:bg-slate-50 transition-colors`}>
                                    <td className="py-2.5 px-3 text-xs text-slate-400 font-medium">{campaign.order}</td>
                                    <td className="py-2.5 px-3">
                                        {editingId === campaign.id ? (
                                            <div className="space-y-1">
                                                <input
                                                    type="text"
                                                    value={formName}
                                                    onChange={e => setFormName(e.target.value)}
                                                    className="w-full px-2 py-1 border border-blue-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                                                />
                                                <input
                                                    type="text"
                                                    value={formCode}
                                                    onChange={e => setFormCode(e.target.value)}
                                                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-mono focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="font-medium text-slate-700">{campaign.name}</div>
                                                {campaign.description && <div className="text-[10px] text-slate-400 mt-0.5">{campaign.description}</div>}
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 hidden md:table-cell">
                                        {editingId !== campaign.id && campaign.code}
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${campaign.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {campaign.isActive ? 'Hoạt động' : 'Ngừng'}
                                        </span>
                                    </td>
                                    <td className="py-2.5 px-3">
                                        {editingId === campaign.id ? (
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => handleSave(campaign)}
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
                                        ) : deleteConfirm === campaign.id ? (
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => handleDelete(campaign.id)}
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
                                                <button onClick={() => startEdit(campaign)} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg" title="Sửa">
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => handleToggle(campaign)} className="p-1.5 hover:bg-slate-100 rounded-lg" title={campaign.isActive ? 'Ngừng' : 'Kích hoạt'}>
                                                    {campaign.isActive ? <PowerOff className="w-3.5 h-3.5 text-amber-500" /> : <Power className="w-3.5 h-3.5 text-emerald-500" />}
                                                </button>
                                                <button onClick={() => setDeleteConfirm(campaign.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg" title="Xóa">
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

export default CampaignManager;
