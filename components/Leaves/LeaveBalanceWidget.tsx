import React from 'react';
import { Wallet, Calendar, TrendingUp } from 'lucide-react';
import { useLeaveBalanceQuery } from '../../hooks/useLeaveBalanceQuery';

interface LeaveBalanceWidgetProps {
    employeeId: string;
    compact?: boolean;
}

const LeaveBalanceWidget: React.FC<LeaveBalanceWidgetProps> = ({ employeeId, compact = false }) => {
    const { data: balance, isLoading, error } = useLeaveBalanceQuery(employeeId);

    if (isLoading) {
        return (
            <div className={`${compact ? 'p-3' : 'p-4'} bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 animate-pulse`}>
                <div className="h-4 bg-blue-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-blue-200 rounded w-1/3"></div>
            </div>
        );
    }

    if (error || !balance) {
        // No balance yet - show zero state
        const available = 0;
        const used = 0;

        return (
            <div className={`${compact ? 'p-3' : 'p-4'} bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg border border-gray-200`}>
                <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-4 h-4 text-gray-500" />
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Nghỉ bù T7/CN</span>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-700">{available}</span>
                    <span className="text-xs text-gray-500">ngày khả dụng</span>
                </div>
                <div className="mt-2 text-[10px] text-gray-400 italic">
                    Chưa có dữ liệu tích lũy
                </div>
            </div>
        );
    }

    const available = balance.compLeaveAvailable || 0;
    const used = balance.compLeaveUsed || 0;

    return (
        <div className={`${compact ? 'p-3' : 'p-4'} bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-200 shadow-sm`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Wallet className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Ví Nghỉ Bù</span>
                        <p className="text-[10px] text-emerald-500">Từ làm việc T7/CN</p>
                    </div>
                </div>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>

            {/* Main Balance */}
            <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-bold text-emerald-700">{available}</span>
                <span className="text-sm text-emerald-600">ngày khả dụng</span>
            </div>

            {/* Stats Row */}
            <div className="flex gap-4 pt-2 border-t border-emerald-100">
                <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500">Đã dùng: <strong className="text-gray-700">{used}</strong></span>
                </div>
            </div>

            {/* Action Hint */}
            {available > 0 && (
                <div className="mt-3 text-[10px] text-emerald-600 bg-emerald-100 px-2 py-1 rounded text-center">
                    💡 Bạn có thể xin nghỉ bù từ số ngày này
                </div>
            )}
        </div>
    );
};

export default LeaveBalanceWidget;
