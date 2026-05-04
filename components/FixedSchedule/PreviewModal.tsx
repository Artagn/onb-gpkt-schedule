/**
 * PreviewModal - Displays auto-schedule preview before committing to Firestore
 */

import React from 'react';
import { Eye, CheckCircle2, AlertTriangle, Moon, MessageSquare, X } from 'lucide-react';

interface PreviewStats {
    totalSlots: number;
    filledSlots: number;
    unfilledSlots: number;
    eveningCount: number;
    livechatCount: number;
}

interface PreviewModalProps {
    show: boolean;
    stats: PreviewStats | null;
    onClose: () => void;
    onApply: () => void;
    isApplying: boolean;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ show, stats, onClose, onApply, isApplying }) => {
    if (!show || !stats) return null;

    const fillRate = stats.totalSlots > 0 ? Math.round((stats.filledSlots / stats.totalSlots) * 100) : 0;
    const hasUnfilled = stats.unfilledSlots > 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl border-2 border-indigo-100 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 p-2.5 rounded-full">
                            <Eye className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">Xem trước kết quả</h3>
                            <p className="text-xs text-gray-500">Kiểm tra trước khi lưu vào hệ thống</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    {/* Main Stat: Fill Rate */}
                    <div className={`col-span-2 p-4 rounded-xl border-2 ${hasUnfilled ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-xs font-bold uppercase text-gray-500 mb-1">Tỷ lệ phân công</div>
                                <div className={`text-3xl font-black ${hasUnfilled ? 'text-amber-600' : 'text-green-600'}`}>
                                    {stats.filledSlots}/{stats.totalSlots}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">slot đã được giao</div>
                            </div>
                            <div className={`text-5xl font-black ${hasUnfilled ? 'text-amber-300' : 'text-green-300'}`}>
                                {fillRate}%
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 ${hasUnfilled ? 'bg-amber-500' : 'bg-green-500'}`}
                                style={{ width: `${fillRate}%` }}
                            />
                        </div>
                    </div>

                    {/* Unfilled Warning */}
                    {hasUnfilled && (
                        <div className="col-span-2 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                            <div>
                                <div className="text-sm font-bold text-red-700">
                                    {stats.unfilledSlots} slot chưa có người
                                </div>
                                <div className="text-xs text-red-600">Cần phân công thủ công sau khi áp dụng</div>
                            </div>
                        </div>
                    )}

                    {/* Evening Count */}
                    <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                        <div className="flex items-center gap-2 mb-1">
                            <Moon className="w-4 h-4 text-purple-600" />
                            <span className="text-xs font-bold uppercase text-purple-600">Ca tối</span>
                        </div>
                        <div className="text-2xl font-black text-purple-700">{stats.eveningCount}</div>
                    </div>

                    {/* Livechat Count */}
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                        <div className="flex items-center gap-2 mb-1">
                            <MessageSquare className="w-4 h-4 text-blue-600" />
                            <span className="text-xs font-bold uppercase text-blue-600">Livechat</span>
                        </div>
                        <div className="text-2xl font-black text-blue-700">{stats.livechatCount}</div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={isApplying}
                        className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors disabled:opacity-50"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={onApply}
                        disabled={isApplying}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isApplying ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Đang lưu...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-4 h-4" />
                                Áp dụng lịch
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PreviewModal;
